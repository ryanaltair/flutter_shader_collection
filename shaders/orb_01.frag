// ORB-01 — "Cut-glass orb with a dispersive, turbulent interior"
//
// Flutter (FragmentShader) port of the shadercn ORB-01 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-01/gpu.ts).
//
// Based on original work by XorDev (https://x.com/XorDev), ported for Orbkit
// with the author's permission. Non-commercial use only, with attribution to
// XorDev; keep this notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_01.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/spin phases these uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_spin;       // integrated spin phase (NOT a rate)
uniform float u_cam_dist;
uniform float u_focal;
uniform float u_tilt;
uniform float u_turb;
uniform float u_sheets;
uniform float u_disperse;
uniform float u_stria;
uniform float u_env_radius;
uniform float u_env_core;
uniform float u_fill;
uniform float u_step_clamp;
uniform float u_scatter;
uniform float u_exposure;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_alpha_gain;
uniform float u_edge;
uniform float u_edge_fade;
uniform vec3 u_tint;

out vec4 frag_color;

#define STEPS 60
#define TURB 5

// WGSL leaves smoothstep indeterminate once edge0 >= edge1; the envelope ramp
// below is descending (edge0 = radius*1.12 > edge1 = radius*core), so evaluate
// it with the explicit hermite form for deterministic cross-GPU behaviour.
float sstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// 2D rotation matrix — spins and tilts a ray before marching it.
// Matches WGSL mat2x2f(vec2(c, -s), vec2(s, c)).
mat2 rot2(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

// BT.601 luminance — the axis saturation and scatter extinction work about.
float luma(vec3 col) {
  return dot(col, vec3(0.299, 0.587, 0.114));
}

// Safety taper at the frame boundary: 1 inside `fadeStart`, 0 by the time the
// orb-space radius reaches 1. `fadeStart` is clamped below 1 because the ramp
// degenerates (and silently inverts) at the crossover.
float edgeFade(float fadeStart, float radius) {
  return 1.0 - sstep(min(fadeStart, 0.985), 1.0, radius);
}

vec3 dispersionRender(vec2 fragCoord, float turb) {
  // `speed`/`spin` arrive as integrated phases advanced by the Dart runtime.
  float animTime = u_speed;
  float spinAng = u_spin;

  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec3 ro = vec3(0.0, 0.0, u_cam_dist);
  vec3 rd = normalize(vec3(uv, -u_focal));

  vec3 acc = vec3(0.0);
  float T = 1.0;
  float z = max(u_cam_dist - u_env_radius * 1.3, 0.0);
  float zEnd = u_cam_dist + u_env_radius * 1.3;

  // Both rotations are constant for the whole march: build them once.
  mat2 spinMat = rot2(spinAng);
  mat2 tiltMat = rot2(u_tilt);

  for (int it = 0; it < STEPS; it++) {
    vec3 p = ro + rd * z;

    vec3 q = p;
    vec2 spun = spinMat * vec2(q.x, q.z);
    q = vec3(spun.x, q.y, spun.y);
    vec2 tilted = tiltMat * vec2(q.y, q.z);
    q = vec3(q.x, tilted.x, tilted.y);

    vec3 a = q;
    for (int j = 0; j < TURB; j++) {
      float dj = float(j) + 3.0;
      vec3 wave = sin(a * dj + animTime + float(it));
      a -= wave.yzx * (turb / dj);
    }

    float wall = abs(length(a) - u_env_radius);
    float s = a.z + a.y - animTime;
    float dist = max(wall + abs(cos(s)) / u_sheets, 1e-4);

    vec3 w = (cos(vec3(s) - z * u_stria + vec3(0.0, 1.0, 8.0) * u_disperse) + 1.0) / dist;
    w = min(w, vec3(u_step_clamp));

    float env = sstep(u_env_radius * 1.12, u_env_radius * u_env_core, length(p));
    w = (w + u_fill) * env;

    acc += w * T;
    T *= exp(-luma(w) * u_scatter);

    z += dist;
    if (T < 0.004 || z > zEnd) {
      break;
    }
  }

  return acc;
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;

  float turb = u_turb * (1.0 + 0.5 * u_input_vol);
  float exposure = u_exposure * (1.0 - 0.35 * u_output_vol);

  vec3 col = tanh(dispersionRender(fragCoord, turb) / max(exposure, 1.0));
  col = pow(clamp(col, 0.0, 1.0), vec3(u_contrast));

  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation) * u_tint;

  float peak = max(col.x, max(col.y, col.z));
  float alpha = clamp(peak * u_alpha_gain, 0.0, 1.0);

  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec3 mrd = normalize(vec3(orbUv, -u_focal));
  float closest = length(cross(vec3(0.0, 0.0, u_cam_dist), mrd));
  float band = mix(0.35, 0.012, clamp(u_edge, 0.0, 1.0));
  float mask = 1.0 - sstep(u_env_radius * (1.0 - band), u_env_radius * 1.005, closest);
  col *= mask;
  alpha *= mask;

  float fade = edgeFade(u_edge_fade, length(orbUv));
  col *= fade;
  alpha *= fade;

  // Same output contract as the original: raw colour plus a separate alpha.
  // Flutter runtime effects expect premultiplied output (see ink_sparkle.frag),
  // and the original likewise feeds unpremultiplied values into its
  // premultiplied WebGPU canvas — which is what gives the halo its
  // characteristic over-bright rim. Keep the behaviour, not just the maths.
  frag_color = vec4(col, alpha);
}
