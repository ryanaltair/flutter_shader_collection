// ORB-28 — "Nested binary grid shutters on a tumbling bit-sphere"
//
// Flutter (FragmentShader) port of the shadercn ORB-28 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-28/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_28.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated spin/speed phases these uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_body;
uniform float u_contrast;
uniform float u_edge;
uniform float u_edge_fade;
uniform float u_gain;
uniform float u_grid_scale;
uniform float u_levels;
uniform float u_line_w;
uniform float u_radius;
uniform float u_rim;
uniform float u_rim_pow;
uniform float u_shutter;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_spin;       // integrated spin phase (NOT a rate)
uniform float u_tilt;
uniform vec3 u_c_base;
uniform vec3 u_c_line_a;
uniform vec3 u_c_line_b;
uniform vec3 u_c_rim;

out vec4 frag_color;

#define LEVELS 20

// 2D rotation matrix — tumbles the sphere point. Matches the original rot2():
// WGSL mat2x2f(vec2(c, -s), vec2(s, c)).
mat2 rot2(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

// WGSL leaves smoothstep indeterminate once edge0 >= edge1; the safety taper
// below is descending past the crossover, so evaluate the ramp with the
// explicit hermite form for deterministic cross-GPU behaviour.
float sstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// Safety taper at the frame boundary: 1 inside `fadeStart`, 0 by the time the
// orb-space radius reaches 1. `fadeStart` is clamped below 1 because the ramp
// degenerates (and silently inverts) at the crossover.
float edgeFade(float fadeStart, float radius) {
  return 1.0 - sstep(min(fadeStart, 0.985), 1.0, radius);
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  float bitdumbGain = u_gain * (1.0 + 0.6 * u_input_vol);
  float bitdumbBody = u_body * (1.0 + 0.8 * u_output_vol);

  vec2 duv = orbUv / u_radius;
  float r2 = dot(duv, duv);

  // analytic disc silhouette — this orb is parameterised on the dome, so
  // the exact edge is just the unit circle, with the same tunable band as
  // the raymarched orbs
  float band = mix(0.35, 0.012, clamp(u_edge, 0.0, 1.0));
  float mask = 1.0 - smoothstep(1.0 - band, 1.005, length(duv));

  // front dome point and its normal (view space)
  float zc = sqrt(max(1.0 - r2, 0.0));
  vec3 n = vec3(duv, zc);

  // tumble the sphere point with real rotations, then project. abs() on z
  // mirror-wraps the hemisphere the tumble turns away, avoiding the
  // stereographic pole blow-up.
  vec3 sp = n;
  vec2 tilted = rot2(u_tilt) * vec2(sp.y, sp.z);
  sp = vec3(sp.x, tilted);
  // integrated clock
  vec2 spun = rot2(u_spin) * vec2(sp.x, sp.z);
  sp = vec3(spun.x, sp.y, spun.y);
  vec2 p = sp.xy / (abs(sp.z) + 1.0) * u_grid_scale;

  // Analytic pixel footprint in grid space, in place of fwidth(): one
  // screen pixel in uv units, through the radius scale, the dome stretch
  // (grids compress toward the rim, so a pixel covers more of them there),
  // and the grid scale. Doubled alongside p every level.
  float px = (2.0 / min(u_res.x, u_res.y) / u_radius / max(zc, 0.2)) * u_grid_scale;

  vec4 acc = vec4(0.0);
  // integrated clock, additive phase
  float phase = u_speed * 0.2;

  for (int i = 0; i < LEVELS; i++) {
    float fi = float(i) + 1.0;
    if (fi > u_levels) {
      break;
    }

    // the listing's engine, kept verbatim: binary zoom
    p += p;
    px += px;

    vec2 v = ceil(p);
    vec2 f = fract(p);

    // distance to the nearest cell line, against this level's footprint —
    // the extension-free fwidth. Deep levels saturate to solid planes,
    // exactly like the original's aliasing.
    vec2 e2 = vec2(1.0) - smoothstep(vec2(0.0), vec2(px * u_line_w), min(f, vec2(1.0) - f));

    // x-lines and y-lines separately tintable — the original's .xyy
    vec3 edgeCol = u_c_line_a * e2.x + u_c_line_b * e2.y;

    // the per-cell shutter value, and the under-compositing that makes
    // level i occlude level i+1 — both straight from the listing
    float aBit = fract(length(v) / fi - phase) * u_shutter;
    acc += vec4(edgeCol, aBit) * (1.0 - acc.w);

    if (acc.w > 0.996) {
      break;
    }
  }

  vec3 col = acc.xyz * bitdumbGain;

  // the ball body: a lambert-shaded base under the lattice, so the orb
  // reads as a solid object rather than lines floating on nothing
  vec3 L = normalize(vec3(-0.4, 0.5, 0.75));
  float shade = 0.25 + 0.75 * clamp(dot(n, L), 0.0, 1.0);
  col += u_c_base * (shade * bitdumbBody);

  // fresnel rim to sell the sphere
  col += u_c_rim * (pow(1.0 - zc, u_rim_pow) * u_rim);

  col = pow(max(col, vec3(0.0)), vec3(u_contrast));

  // coverage alpha; safety taper fades colour AND alpha, as always
  float fade = edgeFade(u_edge_fade, length(orbUv));
  float a = mask * fade;

  // Surface-lit orb bounded by a mask: alpha IS coverage, so premultiply —
  // the opposite of the emissive orbs (see the note in orb-31).
  frag_color = vec4(col * a, a);
}
