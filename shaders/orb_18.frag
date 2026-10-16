// ORB-18 — "Tumbling crystal folded out of an eighth of space"
//
// Flutter (FragmentShader) port of the shadercn ORB-18 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-18/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_18.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated wander phase these uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_alpha_gain;
uniform float u_cam_dist;
uniform float u_contrast;
uniform float u_crease;
uniform float u_edge;
uniform float u_edge_fade;
uniform float u_env_core;
uniform float u_env_radius;
uniform float u_exposure;
uniform float u_fill;
uniform float u_focal;
uniform float u_fold;
uniform float u_freq;
uniform float u_hue;
uniform float u_saturation;
uniform float u_scatter;
uniform float u_spread;
uniform float u_step_clamp;
uniform float u_step_scale;
uniform float u_wander;     // integrated wander phase (NOT a rate)
uniform vec3 u_c_tint;

out vec4 frag_color;

#define STEPS 50

// WGSL leaves smoothstep indeterminate once edge0 >= edge1; the envelope ramp
// below is descending (edge0 = radius*1.12 > edge1 = radius*core), so evaluate
// it with the explicit hermite form for deterministic cross-GPU behaviour.
float sstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
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

vec3 octantRender(vec2 fragCoord, float octantFold, float octantFreq) {
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec3 ro = vec3(0.0, 0.0, u_cam_dist);
  vec3 rd = normalize(vec3(uv, -u_focal));

  float wander = u_wander;

  // The wandering axis. Unit by construction — the three phases are far
  // enough apart that the cosines can never null together.
  vec3 axis = normalize(cos(vec3(0.0, 2.0, 4.0) + vec3(wander)));

  vec3 acc = vec3(0.0);
  float T = 1.0;

  float z = max(u_cam_dist - u_env_radius * 1.3, 0.0);
  float zEnd = u_cam_dist + u_env_radius * 1.3;

  for (int it = 0; it < STEPS; it++) {
    vec3 p = ro + rd * z;

    // the exact minus-90-degree rotation about the wandering axis
    vec3 a = axis * dot(axis, p) - cross(axis, p);

    // Two blendable folds. u_fold reflects the octants together and u_crease
    // creases the diagonals; at zero the crystal dissolves into an ordinary
    // periodic field.
    a = mix(a, abs(a), octantFold);
    a = mix(a, max(a, a.yzx), u_crease);

    float dist = u_step_scale * length(cos(a * octantFreq));
    dist = max(dist, u_env_radius * 0.004);

    // Depth as hue, near as bright. Hue is keyed to depth measured from
    // where the envelope BEGINS, not from the camera, so moving the camera
    // no longer repaints the crystal. No step-length weighting — 1/dist IS
    // this shader's density.
    float zRel = z - (u_cam_dist - u_env_radius);
    vec3 w = cos(vec3(0.0, 2.0, 3.0) * u_spread + vec3(u_hue * zRel)) + 1.0;
    w /= dist * max(z, 0.05);
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
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  float octantFold = clamp(u_fold * (1.0 + 0.3 * u_input_vol), 0.0, 1.0);
  float octantFreq = u_freq * (1.0 + 0.25 * u_input_vol);
  float octantExposure = u_exposure * (1.0 - 0.35 * u_output_vol);

  vec3 acc = octantRender(fragCoord, octantFold, octantFreq);

  vec3 col = tanh(acc / max(octantExposure, 0.01));
  col = pow(clamp(col, 0.0, 1.0), vec3(u_contrast));

  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation) * u_c_tint;

  float peak = max(col.x, max(col.y, col.z));
  float alpha = clamp(peak * u_alpha_gain, 0.0, 1.0);

  vec3 mrd = normalize(vec3(orbUv, -u_focal));
  float closest = length(cross(vec3(0.0, 0.0, u_cam_dist), mrd));
  float band = mix(0.35, 0.012, clamp(u_edge, 0.0, 1.0));
  float mask = 1.0 - sstep(u_env_radius * (1.0 - band), u_env_radius * 1.005, closest);
  col *= mask;
  alpha *= mask;

  float fade = edgeFade(u_edge_fade, length(orbUv));
  col *= fade;
  alpha *= fade;

  // Emitted light, so rgb is already premultiplied — do NOT scale by alpha again.
  frag_color = vec4(col, alpha);
}
