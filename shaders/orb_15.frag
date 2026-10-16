// ORB-15 — "An iridescent web of particle trails as the sphere's skin"
//
// Flutter (FragmentShader) port of the shadercn ORB-15 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-15/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_15.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/wander phases these uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_alpha_gain;
uniform float u_cam_dist;
uniform float u_contrast;
uniform float u_disperse;
uniform float u_edge;
uniform float u_edge_fade;
uniform float u_env_core;
uniform float u_env_radius;
uniform float u_exposure;
uniform float u_field_scale;
uniform float u_fill;
uniform float u_focal;
uniform float u_saturation;
uniform float u_scatter;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_step_clamp;
uniform float u_step_scale;
uniform float u_turb;
uniform float u_wander;     // integrated wander phase (NOT a rate)
uniform vec3 u_c_tint;

out vec4 frag_color;

#define STEPS 10
#define TURB 8

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

vec3 muonsRender(vec2 fragCoord, float muonsTurb) {
  float animTime = u_speed;
  float wander = u_wander;

  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec3 ro = vec3(0.0, 0.0, u_cam_dist);
  vec3 rd = normalize(vec3(uv, -u_focal));

  // Anchor the micro-slab to the ball: intersect the ray with the shell
  // analytically and start the ten steps AT the entry point. Rays that miss
  // fall back to their closest approach — the envelope and silhouette cut them.
  float proj = dot(-ro, rd);
  float b2 = dot(ro, ro) - proj * proj;
  float R = u_env_radius * 0.96;
  float entry = proj - sqrt(max(R * R - b2, 0.0));

  vec3 acc = vec3(0.0);
  float T = 1.0;
  float z = entry;
  float s = 0.0;

  for (int it = 0; it < STEPS; it++) {
    vec3 p = ro + rd * z;

    vec3 q = p * u_field_scale;

    // the per-layer axis, with the original's s feedback
    vec3 axis = normalize(cos(vec3(7.0, 1.0, 0.0) + vec3(wander - s)));

    // the minus-90-degree Rodrigues twin of orb-22
    vec3 a = axis * dot(axis, q) - cross(axis, q);

    for (int j = 0; j < TURB; j++) {
      float dj = float(j) + 2.0;
      vec3 wave = sin(a * dj + vec3(animTime));
      a += wave.yzx * muonsTurb / dj;
    }

    // the shells: the march sticks where the field magnitude sits on a
    // multiple of pi, and 1/dist blows up — that is the web
    s = length(a);
    float dist = u_step_scale * abs(sin(s));
    dist = max(dist, 1e-5);
    z += dist;

    // Layer-cycled palette, with depth measured from the ENTRY point so
    // the banding follows the ball's skin. Clamp then normalize to family units.
    vec3 w = (cos(vec3(0.0, 2.0, 3.0) * u_disperse + vec3((z - entry) / max(u_step_scale, 1e-3) + animTime)) + 1.0) / dist / max(s, 0.5);
    w = min(w, vec3(u_step_clamp));
    w *= 20.0 / max(u_step_clamp, 1.0);

    float env = sstep(u_env_radius * 1.12, u_env_radius * u_env_core, length(p));
    w = (w + u_fill) * env;

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

  float muonsTurb = u_turb * (1.0 + 0.5 * u_input_vol);
  float muonsExposure = u_exposure * (1.0 - 0.35 * u_output_vol);

  vec3 acc = muonsRender(fragCoord, muonsTurb);

  vec3 col = tanh(acc / max(muonsExposure, 1.0));
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
