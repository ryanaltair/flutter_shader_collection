// ORB-19 — "Beads swelling and shrinking inside their cells"
//
// Flutter (FragmentShader) port of the shadercn ORB-19 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-19/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_19.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/swirl/slide phases these uniforms
// carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_bead;
uniform float u_bulge;
uniform float u_contrast;
uniform float u_edge;
uniform float u_floor_level;
uniform float u_gain;
uniform float u_grow;
uniform float u_jitter;
uniform float u_light;
uniform float u_radius;
uniform float u_rim;
uniform float u_saturation;
uniform float u_scale;
uniform float u_skew;
uniform float u_slide;      // integrated slide phase (NOT a rate)
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_swirl;      // integrated swirl phase (NOT a rate)
uniform float u_vary;
uniform vec3 u_c_body;
uniform vec3 u_c_high;
uniform vec3 u_c_low;
uniform vec3 u_c_sheen;

out vec4 frag_color;

// BT.601 luminance — the axis saturation works about it.
float luma(vec3 col) {
  return dot(col, vec3(0.299, 0.587, 0.114));
}

// 2D rotation matrix — turns the packing. Matches the original rot2():
// WGSL mat2x2f(vec2(c, -s), vec2(s, c)).
mat2 rot2(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec3 foamRender(vec2 fragCoord, float foamGrow, float foamJitter, float foamGain) {
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  float R = max(u_radius, 0.001);

  // the dome: the front hemisphere of a unit ball, in screen space
  vec2 pl = uv / R;
  float z = sqrt(max(1.0 - dot(pl, pl), 0.0));

  float t = u_speed;

  // stereographic wrap of the unrotated dome, as in orb-08
  vec2 p = pl / (z + 1.0 + u_bulge) * u_scale;

  // projection-safe 2D motion: the packing turns and drifts
  float sw = u_swirl;
  p = rot2(sw) * p;
  p += vec2(u_slide, u_slide * 0.7);

  vec2 cell = ceil(p);
  vec2 f = p - cell;

  // The 3x3 walk, keyed on the ABSOLUTE cell index so a bead is one bead.
  // Tracking the winner as well as the max is what makes the shading below
  // possible.
  float cover = 0.0;
  float bestRel = 1e9;
  vec2 bestDelta = vec2(0.0);
  float bestRad = 1.0;
  vec2 bestId = vec2(0.0);

  for (int gy = 0; gy < 3; gy++) {
    for (int gx = 0; gx < 3; gx++) {
      vec2 g = vec2(float(gx) - 1.0, float(gy) - 1.0);
      vec2 id = cell + g;

      // The generator: a dot of a cosine against a detuned, swizzled sine
      // of the cell index, both carrying the clock. A dot of two 2-vectors
      // of unit-bounded components spans four, so /6 puts radii within a
      // third of a cell of the mean. Half that and the largest discs
      // overlap their neighbours — a litter of merged blobs.
      float rad = dot(cos(id - vec2(t)), sin(id.yx * u_skew + vec2(t))) * u_vary + foamGrow;

      // Fragment to feature point. The disc labelled id sits at id + jitter,
      // so delta = p - (id + jitter) = f - g - jitter.
      vec2 jit = cos(id.yx + vec2(t)) * foamJitter;
      vec2 delta = f - g - jit;
      float dist = length(delta);

      // Union over COVERAGE, not signed distance. Max of clamped coverage
      // keeps every disc whole. The x50 ramp is an edge width: a signed
      // distance scaled that hard and clamped is a hard-edged disc with
      // about a pixel of feather.
      cover = max(cover, clamp((rad - dist) * u_edge, 0.0, 1.0));

      // Winner by RELATIVE depth — furthest inside in units of that disc's
      // own radius — so a small disc is not shaded as the large one beside it.
      float rel = dist / max(rad, 1e-4);
      if (rel < bestRel) {
        bestRel = rel;
        bestDelta = delta;
        bestRad = rad;
        bestId = id;
      }
    }
  }

  // The bead. The winning cell's distance and radius give the height of a
  // hemisphere over the disc, and that is a normal — so the flat decal
  // becomes a lit piece of glass without a second field being evaluated.
  float rr = max(bestRad, 1e-4);
  float dome = clamp(1.0 - dot(bestDelta, bestDelta) / (rr * rr), 0.0, 1.0);
  vec3 bn = normalize(vec3(bestDelta / rr, sqrt(dome) + 0.001));

  vec3 key = normalize(vec3(-0.45, 0.55, 0.72));
  float beadLam = clamp(dot(bn, key), 0.0, 1.0);

  // per-disc colour, hashed on the cell index — near-flat at the defaults
  vec3 beadCol = mix(u_c_low, u_c_high, hash(bestId + 0.5));

  // u_bead at 0 leaves the listing's flat disc
  float shade = mix(1.0, 0.45 + 0.85 * beadLam, u_bead);
  vec3 col = beadCol * (shade * foamGain * cover);

  // a dark body under the packing, so the gaps read as the ball
  col += u_c_body * u_floor_level;

  col = pow(max(col, vec3(0.0)), vec3(u_contrast));

  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation);

  // dome shading keeps the ball a ball under the packing
  vec3 n = vec3(pl, z);
  float lambert = clamp(dot(n, key), 0.0, 1.0);
  col *= 0.55 + u_light * lambert;

  float fres = 1.0 - z;
  float fresCubed = fres * fres * fres;
  col += u_c_sheen * (u_rim * fresCubed);

  return col;
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  // Volume coupling: the user's voice shakes the beads off their centres,
  // the agent's swells them and brightens the packing.
  float foamGrow = u_grow * (1.0 + 0.35 * u_output_vol);
  float foamJitter = u_jitter * (1.0 + 0.5 * u_input_vol);
  float foamGain = u_gain * (0.85 + 0.4 * u_output_vol);

  float t = clamp((length(orbUv) - max(u_radius, 0.001) - 0.012) / -0.024, 0.0, 1.0);
  float mask = t * t * (3.0 - 2.0 * t);

  if (mask <= 0.0) {
    frag_color = vec4(0.0);
    return;
  }

  vec3 col = foamRender(fragCoord, foamGrow, foamJitter, foamGain);

  // Surface orb bounded by a mask: alpha IS coverage, so premultiply — the
  // opposite convention from the emissive orbs (see orb-31).
  float a = mask;
  frag_color = vec4(max(col, vec3(0.0)) * a, a);
}
