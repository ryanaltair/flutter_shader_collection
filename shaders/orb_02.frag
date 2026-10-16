// ORB-02 — "Ornate scrollwork on a rolling dome"
//
// Flutter (FragmentShader) port of the shadercn ORB-02 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-02/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_02.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed phase these uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_alpha_gain;
uniform float u_base_vis;
uniform float u_bulge;
uniform float u_core_clamp;
uniform float u_falloff;
uniform float u_gain;
uniform float u_hue_shift;
uniform float u_radius;
uniform float u_rim;
uniform float u_rim_pow;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_swell;
uniform float u_swirl;
uniform float u_warp_freq;
uniform float u_zoom;

out vec4 frag_color;

#define LAYERS 10
#define WARP 9

// WGSL leaves smoothstep indeterminate once edge0 >= edge1; the rim mask
// below is descending (edge0 = 0.012 > edge1 = -0.012), so evaluate it with
// the explicit hermite form for deterministic cross-GPU behaviour.
float sstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// 2D rotation matrix — spins the scrollwork. Matches the original rot2():
// WGSL mat2x2f(vec2(c, -s), vec2(s, c)).
mat2 rot2(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  float R = u_radius + u_swell * u_input_vol;
  float r2d = length(orbUv);
  float mask = sstep(0.012, -0.012, r2d - R);
  float nr = clamp(r2d / max(R, 0.001), 0.0, 1.0);
  float z = sqrt(max(1.0 - nr * nr, 0.0));

  // `speed` arrives as an integrated phase advanced by the Dart runtime.
  float animTime = u_speed;

  vec3 sp = vec3(orbUv / max(R, 0.001), z);

  // Stereographic projection: sphere → plane. Equal steps in screen space map
  // to ever-larger steps in pattern space as the rim is approached. u_bulge
  // softens the divisor — higher flattens it back toward a disc.
  vec2 p = sp.xy / (sp.z + 1.0 + u_bulge) * u_zoom;

  p = rot2(animTime * u_swirl) * p;

  float warpFreq = u_warp_freq * (1.0 + 0.35 * u_input_vol);
  float gain = u_gain * (0.75 + 0.7 * u_output_vol);

  vec4 acc = vec4(0.0);
  for (int i = 0; i < LAYERS; i++) {
    float fi = float(i) + 1.0;
    vec2 v = p;
    for (int j = 0; j < WARP; j++) {
      float f = float(j) + 1.0;
      v += sin(v.yx * (f * warpFreq) + vec2(fi + animTime)) / f;
    }
    float rad = pow(max(length(v), u_core_clamp), u_falloff);
    acc += (cos(vec4(0.0, 1.0, 2.0, 3.0) + (fi + u_hue_shift)) + 1.0) / 6.0 / rad;
  }

  vec3 col = tanh(acc.xyz * acc.xyz * gain);

  float fresnel = pow(1.0 - z, u_rim_pow);
  col += vec3(fresnel) * u_rim;

  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float visibility = clamp(lum * u_alpha_gain + u_base_vis + fresnel * 0.25, 0.0, 1.0);

  float a = mask * visibility;
  // Same output contract as the original: premultiplied colour plus alpha.
  frag_color = vec4(col * a, a);
}
