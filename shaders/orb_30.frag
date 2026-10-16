// ORB-30 — "A meadow folding toward a blue vanishing point"
//
// Flutter (FragmentShader) port of the shadercn ORB-30 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-30/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_30.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated fall/drift phases these uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_bulge;
uniform float u_cloud_cover;
uniform float u_cloud_scale;
uniform float u_contrast;
uniform float u_drift;      // integrated weather phase (NOT a rate)
uniform float u_fall;       // integrated flight phase (NOT a rate)
uniform float u_flower_density;
uniform float u_flower_scale;
uniform float u_flower_size;
uniform float u_frame_shade;
uniform float u_gain;
uniform float u_haze;
uniform float u_haze_range;
uniform float u_horizon;
uniform float u_light;
uniform float u_radius;
uniform float u_ratio;
uniform float u_rim;
uniform float u_saturation;
uniform float u_scale;
uniform float u_streak_freq;
uniform float u_streak_rad;
uniform float u_tilt;
uniform float u_water;
uniform vec3 u_c_bloom;
uniform vec3 u_c_canopy;
uniform vec3 u_c_cloud;
uniform vec3 u_c_meadow;
uniform vec3 u_c_sheen;
uniform vec3 u_c_sky;
uniform vec3 u_c_water;

out vec4 frag_color;

// BT.601 luminance — the axis saturation works about it.
float luma(vec3 col) {
  return dot(col, vec3(0.299, 0.587, 0.114));
}

// 2D rotation matrix — tilts the picture. Matches the original rot2():
// WGSL mat2x2f(vec2(c, -s), vec2(s, c)).
mat2 rot2(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

// WGSL leaves smoothstep indeterminate once edge0 >= edge1; several ramps
// below are descending, so evaluate them with the explicit hermite form for
// deterministic cross-GPU behaviour.
float sstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 ff = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), ff.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), ff.x),
    ff.y
  );
}

float fbm(vec2 pIn) {
  vec2 p = pIn;
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(11.7, 7.3);
    a *= 0.5;
  }
  return v;
}

// Arc length around the unit square, in [0,8), counter-clockwise from the
// bottom-right corner — two units per face. Continuous everywhere except
// its single wrap, which lands on a corner.
float squareArc(vec2 q) {
  if (abs(q.x) >= abs(q.y)) {
    if (q.x > 0.0) {
      return q.y + 1.0;
    }
    return 5.0 - q.y;
  }
  if (q.y > 0.0) {
    return 3.0 - q.x;
  }
  return 7.0 + q.x;
}

// Flower colour by hash: mostly white daisies, then the planted warm, then
// the cornflower blues — which reuse the SKY colour rather than adding a
// sixth stop, because that is what keeps them reading as part of the same
// picture instead of as confetti thrown over it.
vec3 drosteFlower(float h) {
  vec3 c = u_c_cloud;
  c = mix(c, u_c_bloom, step(0.52, h));
  c = mix(c, u_c_sky, step(0.86, h));
  return c;
}

vec3 drosteRender(vec2 fragCoord, float drosteCloud, float drosteHaze, float drosteBloom) {
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  float R = max(u_radius, 0.001);

  // the dome: the front hemisphere of a unit ball, in screen space
  vec2 pl = uv / R;
  float z = sqrt(max(1.0 - dot(pl, pl), 0.0));

  // integrated clock: the flight inward
  float fall = u_fall;
  // integrated clock: weather
  float drift = u_drift;

  // The frame tilt is a STATIC angle, not an integrated clock like the roll
  // every other orb here gets. This one has an up.
  float sw = u_tilt;

  // stereographic wrap — the tunnel is inside the ball, and compresses
  // toward the limb the way a texture on a sphere does
  vec2 p = pl / (z + 1.0 + u_bulge) * u_scale;
  p = rot2(sw) * p;

  // The Chebyshev norm makes the level sets SQUARES. The floor on it is
  // what keeps the logarithm finite at the dead centre; the haze below
  // covers that last pixel anyway.
  float m = max(max(abs(p.x), abs(p.y)), 0.002);

  float K = max(u_ratio, 1.05);
  float L = log2(m) / log2(K) + fall;

  // direction, on the unit square boundary
  vec2 q = p / m;
  // this fragment's radius in base-frame units
  float sm = pow(K, fract(L));
  // where it lands in the base picture
  vec2 P = q * sm;

  // picture height, about -1 at the bottom edge
  float Yn = P.y / K;
  // distance around the frame
  float arc = squareArc(q);

  // ---- sky -----------------------------------------------------------
  vec3 col = mix(u_c_sky * 0.72, u_c_sky, clamp(Yn * 1.3, 0.0, 1.0));

  // Cloud and land are both read in BASE-PICTURE coordinates, so every
  // frame carries the same weather at its own scale — which is the whole
  // point of a picture that contains itself.
  float skyMask = smoothstep(u_horizon - 0.3, u_horizon + 0.2, Yn);
  float cl = fbm(P * u_cloud_scale + vec2(drift, drift * 0.3));
  cl = smoothstep(drosteCloud, drosteCloud + 0.16, cl);
  col = mix(col, u_c_cloud, cl * (0.2 + 0.8 * skyMask));

  // ---- land ----------------------------------------------------------
  // The smear. Sampled on (distance around the frame, frame index) with a
  // low frequency on the second axis, so features run LONG in the
  // direction the recursion stretches them — the streaked walls of the
  // reference, straight out of the geometry.
  float streak = fbm(vec2(arc * u_streak_freq, L * u_streak_rad));

  vec3 land = mix(u_c_canopy, u_c_meadow, sstep(0.02, -0.62, Yn));
  land *= 0.42 + 1.25 * streak;

  // water: the low ground holds it where the streak field pools
  float water = sstep(0.42, 0.16, streak) * sstep(0.05, -0.3, Yn);
  land = mix(land, u_c_water, water * u_water);

  // Flowers, hashed one to a cell on the same (around, index) grid, jittered
  // inside it. Densest low in the picture and gone by the horizon.
  vec2 fg = vec2(arc * u_flower_scale, L * u_flower_scale * 0.3);
  vec2 fc = floor(fg);
  vec2 ff = fract(fg) - 0.5;
  vec2 dcv = ff - (vec2(hash(fc + vec2(3.7)), hash(fc + vec2(19.1))) - 0.5) * 0.6;
  float petal = sstep(u_flower_size, u_flower_size * 0.35, length(dcv));
  float present = step(1.0 - drosteBloom, hash(fc + vec2(51.3)));
  float meadow = sstep(0.13, -0.38, Yn);
  land = mix(land, drosteFlower(hash(fc + vec2(7.9))), petal * present * meadow);

  float landMask = 1.0 - smoothstep(u_horizon - 0.12, u_horizon + 0.16, Yn);
  col = mix(col, land, landMask);

  // The picture's own edge. Darkening across the frame and resetting hard
  // at its boundary is not an artefact to smooth away — it draws the
  // nested borders the reference is built out of.
  col *= mix(1.0, u_frame_shade, fract(L));

  // Aerial perspective, from the SCREEN radius. Every frame has the same
  // fractional part, so depth cannot come from inside a frame — it has to
  // come from how far in the fragment sits. This is what makes the middle
  // read as far away instead of merely small.
  float deep = 1.0 - smoothstep(0.0, u_haze_range, m);
  col = mix(col, u_c_sky, deep * drosteHaze);

  col = pow(max(col, vec3(0.0)), vec3(u_contrast)) * u_gain;

  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation);

  // dome shading, kept light — this is a window, not a lit surface
  vec3 n = vec3(pl, z);
  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.72))), 0.0, 1.0);
  col *= 0.72 + u_light * lambert;

  // the glass: a strong fresnel is what turns a picture into a sphere
  // with a world inside it
  float fres = 1.0 - z;
  float fresCubed = fres * fres * fres;
  col += u_c_sheen * (u_rim * fresCubed);

  return col;
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  // Volume coupling: the user's voice thickens the weather, the agent's
  // clears the haze and brings the meadow into flower.
  float drosteCloud = clamp(u_cloud_cover - 0.12 * u_input_vol, 0.02, 0.98);
  float drosteHaze = u_haze * (1.0 - 0.25 * u_output_vol);
  float drosteBloom = clamp(u_flower_density * (1.0 + 0.5 * u_output_vol), 0.0, 1.0);

  float t = clamp((length(orbUv) - max(u_radius, 0.001) - 0.012) / -0.024, 0.0, 1.0);
  float mask = t * t * (3.0 - 2.0 * t);

  // Two fbm evaluations and a flower grid per sample — none of it worth
  // paying for outside the silhouette.
  if (mask <= 0.0) {
    frag_color = vec4(0.0);
    return;
  }

  vec3 col = drosteRender(fragCoord, drosteCloud, drosteHaze, drosteBloom);

  // Surface orb bounded by a mask: alpha IS coverage, so premultiply — the
  // opposite convention from the emissive orbs (see orb-31).
  float a = mask;
  frag_color = vec4(max(col, vec3(0.0)) * a, a);
}
