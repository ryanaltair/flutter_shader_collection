// ORB-13 — "Plasma ball: crawling lightning filaments"
//
// Flutter (FragmentShader) port of the shadercn ORB-13 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-13/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_13.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/spin phases these uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_alpha_gain;
uniform float u_cam_dist;
uniform float u_contrast;
uniform float u_core_gain;
uniform float u_edge;
uniform float u_env_radius;
uniform float u_exposure;
uniform float u_fill;
uniform float u_fils;
uniform float u_focal;
uniform float u_saturation;
uniform float u_scatter;
uniform float u_sharp;
uniform float u_soft;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_spin;       // integrated spin phase (NOT a rate)
uniform float u_step_clamp;
uniform float u_swell;
uniform float u_tilt;
uniform float u_tip_gain;
uniform float u_whiten;
uniform float u_writhe;
uniform float u_writhe_freq;
uniform vec3 u_c_arc;
uniform vec3 u_c_inner;
uniform vec3 u_c_tint;

out vec4 frag_color;

#define STEPS 64

// BT.601 luminance — the scatter extinction works about it.
float luma(vec3 col) {
  return dot(col, vec3(0.299, 0.587, 0.114));
}

// 2D rotation matrix — precesses the filament array. Matches the original
// rot2(): WGSL mat2x2f(vec2(c, -s), vec2(s, c)).
mat2 rot2(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec3 ionRender(vec2 fragCoord, float ionSharp, float ionWrithe, float ionCore, float ionRadius) {
  float t = u_speed;
  float spinAng = u_spin;

  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec3 ro = vec3(0.0, 0.0, u_cam_dist);
  vec3 rd = normalize(vec3(uv, -u_focal));

  // exact ray/sphere chord — the march never leaves the globe
  float proj = dot(-ro, rd);
  float b2 = dot(ro, ro) - proj * proj;
  float halfChord = sqrt(max(ionRadius * ionRadius - b2, 0.0));
  float zNear = proj - halfChord;
  float stepLen = (2.0 * halfChord) / float(STEPS);
  // per-pixel jitter of the march start melts dotted filaments into plasma grain
  zNear += (hash(fragCoord) - 0.5) * stepLen;

  vec3 acc = vec3(0.0);
  float T = 1.0;

  // Both rotations are constant for the whole march: build them once.
  mat2 spinMat = rot2(spinAng);
  mat2 tiltMat = rot2(u_tilt);

  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rd * (zNear + (float(i) + 0.5) * stepLen);

    // precess the whole filament array; a static tilt keeps the spin axis
    // off-vertical so the motion reads in 3D
    vec3 pr = p;
    vec2 prSpun = spinMat * vec2(pr.x, pr.z);
    pr = vec3(prSpun.x, pr.y, prSpun.y);
    vec2 prTilt = tiltMat * vec2(pr.y, pr.z);
    pr = vec3(pr.x, prTilt);

    float rad = length(pr);
    vec3 dir = pr / max(rad, 1e-4);
    float rr = rad / max(ionRadius, 1e-3);

    // writhe: bend the sampling direction with radius and time, rooted at
    // the nucleus by the smoothstep so filaments stay attached
    float wr = ionWrithe * smoothstep(0.0, ionRadius * 0.35, rad);
    vec3 q = dir * u_fils;
    q += vec3(
      sin(rad * u_writhe_freq - t * 1.2 + q.y * 1.8),
      sin(rad * u_writhe_freq * 0.83 + t * 1.0 + q.z * 1.8),
      sin(rad * u_writhe_freq * 1.19 - t * 0.7 + q.x * 1.8)
    ) * wr;

    // two independent fields; their joint zero set is the filament curves
    float f1 = sin(q.x + t * 0.7) + sin(q.y * 1.31 - t * 0.5) + sin(q.z * 1.13 + t * 0.9);
    float f2 = sin(q.y * 1.21 + t * 0.6 + 1.7) + sin(q.z * 1.43 - t * 0.8 + 3.1) + sin(q.x * 0.87 + t * 0.4 + 5.0);
    float d2 = f1 * f1 + f2 * f2;
    float g = 1.0 / (d2 * ionSharp + u_soft);

    // flare where a streamer lands on the glass, and the hot nucleus
    g *= 1.0 + u_tip_gain * smoothstep(0.55, 0.95, rr);
    float core = ionCore / (rad * rad * 8.0 + 0.05);

    // pink near the nucleus, violet-blue at the glass
    vec3 fCol = mix(u_c_inner, u_c_arc, smoothstep(0.1, 0.75, rr));
    vec3 w = (fCol + vec3(u_whiten) * g) * g + u_c_inner * core + vec3(u_fill);
    w = min(w, vec3(u_step_clamp));
    w *= stepLen;

    acc += w * T;
    T *= exp(-luma(w) * u_scatter);
    if (T < 0.004) {
      break;
    }
  }

  return acc;
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  // Louder agent output softens and thickens the arcs; user input flares
  // the nucleus — the globe answers being spoken to.
  float ionSharp = u_sharp * (1.0 - 0.25 * u_output_vol);
  float ionWrithe = u_writhe * (1.0 + 0.6 * u_output_vol);
  float ionCore = u_core_gain * (1.0 + 1.6 * u_input_vol + 0.4 * u_output_vol);
  float ionExposure = u_exposure * (1.0 - 0.35 * u_output_vol);
  float ionRadius = u_env_radius + u_swell * u_input_vol;

  vec3 acc = ionRender(fragCoord, ionSharp, ionWrithe, ionCore, ionRadius);

  vec3 col = tanh(acc / max(ionExposure, 0.01));
  col = pow(clamp(col, 0.0, 1.0), vec3(u_contrast));

  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation) * u_c_tint;

  float peak = max(col.x, max(col.y, col.z));
  float alpha = clamp(peak * u_alpha_gain, 0.0, 1.0);

  vec3 mrd = normalize(vec3(orbUv, -u_focal));
  float closest = length(cross(vec3(0.0, 0.0, u_cam_dist), mrd));
  float band = mix(0.35, 0.012, clamp(u_edge, 0.0, 1.0));
  float mask = 1.0 - smoothstep(ionRadius * (1.0 - band), ionRadius * 1.005, closest);
  col *= mask;
  alpha *= mask;

  // Emitted light, so rgb is already premultiplied — do NOT scale by alpha again.
  frag_color = vec4(col, alpha);
}
