// ORB-33 — "Risograph printed heatmap on the sphere"
//
// Flutter (FragmentShader) port of the shadercn ORB-33 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-33/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_33.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated time/speed/spin phases these uniforms
// carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_time;       // seconds since start, halved
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_banding;
uniform float u_bands;
uniform float u_contrast;
uniform float u_dither;
uniform float u_dot_gain;
uniform float u_dot_soft;
uniform float u_dots;
uniform float u_freq;
uniform float u_gain;
uniform float u_grain;
uniform float u_grain_size;
uniform float u_hi;
uniform float u_ink;
uniform float u_jitter;
uniform float u_light;
uniform float u_lo;
uniform float u_misregister;
uniform float u_print_mix;
uniform float u_radius;
uniform float u_rim;
uniform float u_scale;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_spin;       // integrated spin phase (NOT a rate)
uniform float u_warp;
uniform vec3 u_c_cold;
uniform vec3 u_c_cool;
uniform vec3 u_c_core;
uniform vec3 u_c_hot;
uniform vec3 u_c_paper;
uniform vec3 u_c_warm;

out vec4 frag_color;

// 2D rotation matrix — angles each ink screen. Matches the original rot2():
// WGSL mat2x2f(vec2(c, -s), vec2(s, c)).
mat2 rot2(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
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

float grainNoise(vec2 gpix, float frame, float seed) {
  return hash(gpix + vec2(frame * 13.71 + seed, frame * 7.37 - seed));
}

// One ink screen. Square dots on a grid at angle a, offset o (the
// misregistration), sized by the coverage: coverage 0 is paper, coverage 1
// is a solid. Returns how much of this pixel the ink covers.
//
// The grid is laid in SCREEN space, not on the wrapped plane: a print is
// flat, and it is the picture that curves round the ball. A screen on the
// wrapped coordinates changes pitch toward the limb and beats against the
// other two into moire rings.
float screen(vec2 uv, float a, vec2 o, float coverage, float soft) {
  vec2 cell = (rot2(a) * uv) * u_dots + o;
  vec2 f = fract(cell) - 0.5;
  // a round dot: reads as tone, not as a grid
  float dist = length(f);
  // dot half-size from coverage; sqrt so mid-tones read as mid-tones the
  // way a real screen's area does
  float size = 0.5 * sqrt(clamp(coverage * u_dot_gain, 0.0, 1.0));
  return 1.0 - smoothstep(size - soft, size + soft, dist);
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  float heatGainNow = u_gain * (1.0 + 0.6 * u_output_vol);
  float heatJitterNow = u_jitter * (1.0 + 1.5 * u_input_vol);

  float rd = length(orbUv);
  float R = u_radius;
  float t = clamp((rd - R - 0.012) / -0.024, 0.0, 1.0);
  float mask = t * t * (3.0 - 2.0 * t);

  if (mask <= 0.0) {
    frag_color = vec4(0.0);
    return;
  }

  vec2 pl = orbUv / R;
  float r2 = dot(pl, pl);
  float z = sqrt(max(1.0 - r2, 0.0));
  vec3 n = vec3(pl, z);

  // roll the dome about Y on its own integrated clock
  float cr = cos(u_spin);
  float sr = sin(u_spin);
  vec3 sp = vec3(n.x * cr - n.z * sr, n.y, n.x * sr + n.z * cr);

  // integrated clock: the sources drift
  float t2 = u_speed;

  // stereographic wrap of the plane onto the ball
  vec2 st = sp.xy / (1.3 + sp.z) * u_scale;

  // The heat: a drifting, domain-warped noise field with a threshold window
  // cut out of it. Two drifts at different rates so the pools travel and
  // change shape rather than slide as one sheet; the input jitter is a fast
  // wobble on top.
  vec2 p = st * u_freq + vec2(t2 * 0.11, -t2 * 0.07);
  vec2 wp = st * (u_freq * 0.55) + vec2(-t2 * 0.05, t2 * 0.08);
  vec2 warp = vec2(noise(wp + vec2(3.1)), noise(wp + vec2(9.4))) - 0.5;
  p += warp * u_warp;
  p += vec2(sin(t2 * 3.7), cos(t2 * 4.3)) * heatJitterNow;
  float field = noise(p) * 0.62 + noise(p * 2.1 + vec2(5.3)) * 0.26 + noise(p * 4.2 + vec2(1.7)) * 0.12;
  float heat = clamp(((field - u_lo) * heatGainNow) / max(u_hi - u_lo, 0.01), 0.0, 1.0);

  // grain tap 1: dither the field before it is banded, so the contour
  // edges break up into speckle instead of clean steps
  vec2 gpix = floor(fragCoord / max(u_grain_size, 1.0));
  float frame = floor(u_time * 48.0);
  heat += (grainNoise(gpix, frame, 3.1) - 0.5) * u_dither;

  // the contours: quantize into bands, blend back with the smooth field
  float banded = floor(heat * u_bands + 0.5) / u_bands;
  heat = clamp(mix(heat, banded, u_banding), 0.0, 1.0);
  heat = pow(heat, u_contrast);

  // the thermal ramp
  vec3 base = mix(u_c_cold, u_c_cool, smoothstep(0.0, 0.3, heat));
  base = mix(base, u_c_warm, smoothstep(0.3, 0.55, heat));
  base = mix(base, u_c_hot, smoothstep(0.55, 0.78, heat));
  base = mix(base, u_c_core, smoothstep(0.78, 0.97, heat));

  // The print. Separate the palette into CMY coverage and lay each ink down
  // as its own screen; the paper shows through the gaps. The angles are the
  // classic offsets, scaled by the misregistration, plus a per-ink shift.
  float soft = u_dot_soft;
  float mis = u_misregister;
  float cC = screen(orbUv, 0.035 * mis, vec2(0.22, 0.12) * mis, 1.0 - base.x, soft);
  float cM = screen(orbUv, -0.03 * mis, vec2(-0.14, 0.2) * mis, 1.0 - base.y, soft);
  float cY = screen(orbUv, 0.0, vec2(0.0), 1.0 - base.z, soft);

  vec3 print = vec3(u_c_paper);
  print *= mix(vec3(1.0), vec3(0.05, 0.62, 0.92), cC * u_ink);
  print *= mix(vec3(1.0), vec3(0.92, 0.08, 0.48), cM * u_ink);
  print *= mix(vec3(1.0), vec3(0.98, 0.86, 0.02), cY * u_ink);

  // the unprinted palette is mixed back a little so the blacks stay black
  // and the screens never wash the whole ball to paper
  vec3 col = mix(base, print, u_print_mix);

  // grain tap 2: paper
  col *= 1.0 + (grainNoise(gpix, frame, 27.9) - 0.5) * u_grain;

  // dome shading keeps the ball a ball under the print
  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0, 1.0);
  col *= 1.0 - u_light * (1.0 - lambert);
  float fres = pow(1.0 - z, 2.5);
  col += u_c_paper * (u_rim * fres * 0.5);

  // Surface orb bounded by a mask: alpha IS coverage, so premultiply — the
  // opposite convention from the emissive orbs (see orb-31).
  float a = mask;
  frag_color = vec4(max(col, vec3(0.0)) * a, a);
}
