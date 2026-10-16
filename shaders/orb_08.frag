// ORB-08 — "Nacreous contour bands, one colour per layer"
//
// Flutter (FragmentShader) port of the shadercn ORB-08 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-08/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_08.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated anim/speed/swirl/flow phases these
// uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_anim;       // integrated animation phase (NOT a rate)
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_beat;
uniform float u_bulge;
uniform float u_contrast;
uniform float u_floor;
uniform float u_flow;       // integrated band-travel phase (NOT a rate)
uniform float u_gain;
uniform float u_iris;
uniform float u_iris_scale;
uniform float u_light;
uniform float u_radius;
uniform float u_rim;
uniform float u_scale;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_split;
uniform float u_swirl;      // integrated swirl phase (NOT a rate)
uniform float u_thick;
uniform float u_view;
uniform float u_warp;
uniform vec3 u_c_crest;
uniform vec3 u_c_deep;
uniform vec3 u_c_low;
uniform vec3 u_c_sheen;

out vec4 frag_color;

#define OCTAVES 10
#define TAU 6.28318530718

// 2D rotation matrix — turns the projected plane. Matches the original rot2():
// WGSL mat2x2f(vec2(c, -s), vec2(s, c)).
mat2 rot2(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

// The listing's entire tone map: b = tanh(cos(x) * k / max(abs(sin(x)), 1e-4));
// b *= b. The square folds the sign, so abs() on the denominator is not an
// approximation here — it is exact, and it removes the branch.
vec3 cotBands(vec3 x, float k) {
  vec3 b = tanh(cos(x) * k / max(abs(sin(x)), vec3(1e-4)));
  return b * b;
}

vec3 nacreRender(vec2 fragCoord, float nacreWarp, float nacreThick, float nacreGain) {
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  float R = max(u_radius, 0.001);

  // the dome: the front hemisphere of a unit ball, in screen space
  vec2 pl = uv / R;
  float z = sqrt(max(1.0 - dot(pl, pl), 0.0));
  vec3 n = vec3(pl, z);

  // integrated clock: the boil
  float t = u_speed;

  // Stereographic projection, on the UNROTATED dome. Equal steps in screen
  // space map to ever-larger steps in pattern space toward the rim, which
  // is the foreshortening that sells a flat field as wrapped geometry.
  // u_bulge softens the divisor — higher flattens the shell back toward a
  // disc, lower crowds the layers into the limb.
  vec2 p = n.xy / (n.z + 1.0 + u_bulge) * u_scale;

  // projection-safe 2D motion, in place of a dome spin: the plane turns,
  // and the bands travel across themselves
  // integrated clock
  float sw = u_swirl;
  p = rot2(sw) * p;
  // integrated clock
  p = vec2(p.x, p.y - u_flow);

  // The ten-octave feedback warp. q is fed back into itself with the
  // components swapped, so each octave curls what the last one drew.
  vec2 q = p;
  for (int j = 0; j < OCTAVES; j++) {
    float i = float(j) + 1.0;
    q += sin(q.yx * i + vec2(i * i + t * i) + vec2(4.7, 2.3)) * nacreWarp / i;
  }

  // the bands, with the listing's uneven per-channel phase kept as a ratio
  // so one slider widens the whole split
  vec3 band = cotBands(vec3(q.y) + vec3(0.0, 1.0, 3.0) * u_split, nacreThick);
  float lev = dot(band, vec3(1.0 / 3.0));

  // A dark body colour under the bands, so the valleys read as the shell
  // itself rather than as holes punched through the ball. The band term
  // stays PER-CHANNEL through the palette multiply — that is what carries
  // the colour fringing.
  vec3 col = u_c_deep * u_floor;
  col += band * mix(u_c_low, u_c_crest, smoothstep(0.1, 0.9, lev)) * nacreGain;

  // Thin-film interference. The cosine palette is keyed to the band
  // coordinate, so every layer carries its own hue — the inside of a shell
  // — and u_view rotates that hue with the viewing angle through 1 - z,
  // which means the sphere's curvature is doing the colouring. Multiplied
  // in rather than mixed to, so it bends hues without erasing the palette.
  vec3 irid = cos((vec3(0.0, 0.33, 0.67) + vec3(q.y * u_iris_scale + (1.0 - z) * u_view + t * 0.03)) * TAU) * 0.5 + 0.5;
  col = mix(col, col * (irid * 1.9 + 0.25), u_iris);

  col = pow(max(col, vec3(0.0)), vec3(u_contrast));

  // dome shading keeps the ball a ball under the pattern
  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.72))), 0.0, 1.0);
  col *= 0.35 + u_light * lambert;

  // fresnel sheen: the wet gloss of a shell, and the thing that keeps the
  // limb reading as a surface where the bands have compressed to a blur
  float fres = 1.0 - z;
  float fresCubed = fres * fres * fres;
  col += u_c_sheen * (u_rim * fresCubed);

  return col;
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  // The BEAT: warp driven between 0.6 and 1.8 on a slow, unbroken cycle —
  // one full swing every second and a third. Warp is the amplitude of the
  // octave loop that folds the bands, so sweeping it three to one makes
  // the whole field draw in and open again — a swell, not a flash. At beat
  // zero nothing here applies and the dialled warp stands.
  float beat = 0.5 - 0.5 * cos(u_anim * 5.0);

  // Volume coupling: the user's voice churns the warp harder, the agent's
  // widens the crests and brightens them.
  float nacreWarp = mix(u_warp * (1.0 + 0.45 * u_input_vol), mix(0.6, 1.8, beat), u_beat);
  float nacreThick = u_thick * (1.0 + 0.6 * u_output_vol);
  float nacreGain = u_gain * (0.85 + 0.4 * u_output_vol);

  float t = clamp((length(orbUv) - max(u_radius, 0.001) - 0.012) / -0.024, 0.0, 1.0);
  float mask = t * t * (3.0 - 2.0 * t);

  // Nothing outside the silhouette is ever visible, so skip the warps
  // for it rather than shading transparent sky.
  if (mask <= 0.0) {
    frag_color = vec4(0.0);
    return;
  }

  vec3 col = nacreRender(fragCoord, nacreWarp, nacreThick, nacreGain);

  // Surface orb bounded by a mask: alpha IS coverage, so premultiply — the
  // opposite convention from the emissive orbs (see orb-31).
  frag_color = vec4(max(col, vec3(0.0)) * mask, mask);
}
