// ORB-29 — "An LED tile wall with flowing light spots wrapping the sphere"
//
// Flutter (FragmentShader) port of the shadercn ORB-29 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-29/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_29.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated spin/speed/drift/churn/shuffle phases
// these uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_cells;
uniform float u_churn;      // integrated churn phase (NOT a rate)
uniform float u_confetti;
uniform float u_contrast;
uniform float u_coverage;
uniform float u_drift;      // integrated drift phase (NOT a rate)
uniform float u_gain;
uniform float u_light;
uniform float u_pulse;
uniform float u_radius;
uniform float u_scale;
uniform float u_shuffle;    // integrated shuffle phase (NOT a rate)
uniform float u_spin;       // integrated spin phase (NOT a rate)
uniform float u_swirl;
uniform vec3 u_c_lit;
uniform vec3 u_c_wall;

out vec4 frag_color;

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

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;

  // Volume coupling: user input widens the lit coverage, agent output turns
  // the panel brightness up.
  float coverNow = u_coverage + 0.07 * u_input_vol;
  float gainNow = u_gain * (0.85 + 0.5 * u_output_vol);

  // resolution-relative tile grid — same wall at every size
  float cellPx = max(min(u_res.x, u_res.y) / max(u_cells, 8.0), 4.0);
  vec2 cellIdx = floor(fragCoord / cellPx);
  vec2 cellCentre = (cellIdx + 0.5) * cellPx;
  // 0..1 inside the tile
  vec2 g = fract(fragCoord / cellPx);

  vec2 suv = (cellCentre * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec2 duv = suv / u_radius;
  float r2 = dot(duv, duv);

  // blocky silhouette, cut on the tile grid like the wall itself
  float mask = 1.0 - step(1.0, r2);

  float z = sqrt(max(1.0 - r2, 0.0));
  vec3 n = vec3(duv, z);

  // rotating dome, stereographic projection — the blobs roll around the
  // ball as the dome turns
  // integrated clock
  float rot = u_spin;
  float cr = cos(rot);
  float sr = sin(rot);
  vec3 sp = vec3(n.x * cr - n.z * sr, n.y, n.x * sr + n.z * cr);
  vec2 p2 = sp.xy / (abs(sp.z) + 1.2) * (u_scale * 3.0);

  // Per-state motion, each on its own integrated clock:
  //   DRIFT    the blob field streams across the wall     (idle flows)
  //   CHURN    the fluid warp evolves in place            (thinking boils)
  //   SHUFFLE  the confetti promotion cycles              (thinking races it)
  //   PULSE    rings radiate from the centre              (speaking)
  // Rates glide; a rate at zero freezes that motion with its phase intact.
  // The pulse depth is an amplitude, so idle carries no static rings.
  // integrated clock: blob stream
  float driftT = u_drift;
  // integrated clock: warp evolution
  float churnT = u_churn;
  // integrated clock: confetti reshuffle
  float shuffleT = u_shuffle;
  vec2 f1 = vec2(driftT * 0.5, -driftT * 0.35);
  vec2 f2 = vec2(-churnT * 0.4, churnT * 0.6);

  // FLUID domain warp: two decorrelated fbm channels displace the sample
  // point before the blob field reads it, and the displacement itself
  // evolves on the churn clock. The blobs curl, stretch and merge like
  // liquid instead of sliding across the wall as one rigid sheet.
  vec2 warp = vec2(fbm(p2 * 0.9 + f2), fbm(p2 * 0.9 + f2.yx + vec2(13.7))) - 0.5;
  float field = fbm(p2 + f1 + warp * (u_swirl * 2.4));

  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0, 1.0);
  float lum = smoothstep(
    1.0 - coverNow,
    1.14 - coverNow,
    field + 0.25 * u_light * lambert + u_pulse * 0.3 * sin(length(duv) * 5.0 - driftT * 3.2)
  );
  lum *= gainNow;

  // The tile: a bevelled square face inside a frame. The face is the lit
  // part; the frame stays dark; an unlit tile keeps a faint presence so the
  // wall reads as hardware even where nothing is lit.
  vec2 d2 = abs(g - 0.5);
  float md = max(d2.x, d2.y);
  float face = 1.0 - smoothstep(0.26, 0.36, md);
  float tile = 1.0 - smoothstep(0.42, 0.48, md);
  // a soft centre hot-spot on the face, like an LED under a diffuser
  float hot = 1.0 - smoothstep(0.0, 0.34, length(d2));

  // Confetti: a per-tile hash cycles against the shuffle clock, and the top
  // u_confetti slice of the cycle is promoted from warm white to a fully
  // saturated hue drawn from a second hash. Which tiles are coloured
  // therefore reshuffles continuously — slowly at rest, fast in thought.
  float h1 = hash(cellIdx * 1.618 + vec2(7.3));
  float h2 = hash(cellIdx * 2.113 + vec2(41.7));
  float cyc = fract(h1 + shuffleT * 0.06);
  float promoted = step(1.0 - u_confetti, cyc);
  vec3 confetti = vec3(0.5) + cos((vec3(h2) + vec3(0.0, 0.33, 0.67)) * 6.2831) * 0.5;
  confetti = normalize(confetti + vec3(0.05)) * 1.2;
  vec3 litCol = mix(u_c_lit, confetti, promoted);

  // lit face over the dark wall; frames and off-tiles stay faintly present
  vec3 offCol = u_c_wall * tile;
  vec3 onCol = litCol * (face * 1.05 + hot * 0.5) * lum;
  vec3 col = offCol + onCol;

  col = pow(max(col, vec3(0.0)), vec3(u_contrast));

  // Surface-lit orb bounded by a mask: alpha IS coverage, so premultiply —
  // the opposite convention from the emissive orbs (see orb-31).
  float a = mask;
  frag_color = vec4(col * a, a);
}
