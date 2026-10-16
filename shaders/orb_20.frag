// ORB-20 — "Fountain water films pouring down the sphere"
//
// Flutter (FragmentShader) port of the shadercn ORB-20 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-20/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_20.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/flow phases these uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_alpha_gain;
uniform float u_cam_dist;
uniform float u_contrast;
uniform float u_edge;
uniform float u_edge_fade;
uniform float u_env_core;
uniform float u_env_radius;
uniform float u_exposure;
uniform float u_fill;
uniform float u_flow;       // integrated flow phase (NOT a rate)
uniform float u_foam;
uniform float u_focal;
uniform float u_hue_scale;
uniform float u_saturation;
uniform float u_scatter;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_step_clamp;
uniform float u_step_scale;
uniform float u_stretch;
uniform float u_tilt;
uniform float u_wall;
uniform vec3 u_c_tint;

out vec4 frag_color;

#define STEPS 50
#define TURB 5

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

// 2D rotation matrix — tilts the flow axis. Matches the original rot2():
// WGSL mat2x2f(vec2(c, -s), vec2(s, c)).
mat2 rot2(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

vec3 fallsRender(vec2 fragCoord, float fallsFoam) {
  float animTime = u_speed;
  float flow = u_flow;

  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec3 ro = vec3(0.0, 0.0, u_cam_dist);
  vec3 rd = normalize(vec3(uv, -u_focal));

  float rShell = u_env_radius * 0.92;

  vec3 acc = vec3(0.0);

  // transmittance carried front-to-back — near foam veils far foam
  float T = 1.0;

  // march only the span the envelope can light, as in orb-01
  float z = max(u_cam_dist - u_env_radius * 1.3, 0.0);
  float zEnd = u_cam_dist + u_env_radius * 1.3;

  // the tilt is static for the whole march: build the matrix once
  mat2 tiltMat = rot2(u_tilt);

  for (int it = 0; it < STEPS; it++) {
    vec3 c = ro + rd * z;

    // a slight static tilt of the flow axis
    vec2 cTilt = tiltMat * vec2(c.y, c.z);
    c = vec3(c.x, cTilt);

    // The fall grain: squash the vertical axis, then the five octaves with
    // the rush phase on the first component — cos(p.yzx*f + ...) writes
    // that component to x, so height and time drive the sideways waves.
    vec3 p = vec3(c.x, c.y * u_stretch, c.z);
    for (int j = 0; j < TURB; j++) {
      float fj = float(j) + 1.3;
      p += cos(vec3(p.y, p.z, p.x) * fj + vec3(float(it) + z + flow, 0.0, 0.0)) / fj;
    }

    // the foam blend — most of the displacement is thrown away, leaving a
    // film of detail over a coherent surface
    vec3 pm = mix(c, p, fallsFoam);

    // The surface: distance to the sphere (sharpened by u_wall) plus the
    // original's traveling ripple. f can still reach zero exactly — the
    // guard feeds both the division and the march step.
    float dist = u_step_scale * (abs(length(pm) - rShell) * u_wall + sin(pm.x - pm.z + animTime * 2.0) + 1.0);
    dist = max(dist, 1e-3);
    z += dist;

    // Vertical hue sheets, bright where the march grazes the film. The
    // CLAMP is load-bearing — one f-null step would own the whole
    // 50-step sum.
    vec3 w = (cos(vec3(pm.x * u_hue_scale + dist) + vec3(6.0, 1.0, 2.0)) + 2.0) / dist / max(z, 1.0);
    w = min(w, vec3(u_step_clamp));

    // envelope: plateau through the ball, cut 12% past the radius so the
    // analytic silhouette in main() still has emission left to cut
    float env = sstep(u_env_radius * 1.12, u_env_radius * u_env_core, length(ro + rd * z));
    w = (w + u_fill) * env;

    acc += w * T;
    T *= exp(-luma(w) * u_scatter);

    if (T < 0.004 || z > zEnd) {
      break;
    }
  }

  return acc;
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  float fallsFoam = u_foam * (1.0 + 0.5 * u_input_vol);
  float fallsExposure = u_exposure * (1.0 - 0.35 * u_output_vol);

  vec3 acc = fallsRender(fragCoord, fallsFoam);

  // tanh tone map per channel
  vec3 col = tanh(acc / max(fallsExposure, 1.0));
  col = pow(clamp(col, 0.0, 1.0), vec3(u_contrast));

  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation) * u_c_tint;

  // alpha from the brightest channel, not luminance — a deep blue sheet
  // has low luminance but must not go transparent
  float peak = max(col.x, max(col.y, col.z));
  float a = clamp(peak * u_alpha_gain, 0.0, 1.0);

  // Analytic silhouette — identical construction to orb-01
  vec3 mrd = normalize(vec3(orbUv, -u_focal));
  float closest = length(cross(vec3(0.0, 0.0, u_cam_dist), mrd));
  float band = mix(0.35, 0.012, clamp(u_edge, 0.0, 1.0));
  float mask = 1.0 - sstep(u_env_radius * (1.0 - band), u_env_radius * 1.005, closest);
  col *= mask;
  a *= mask;

  float r2d = length(orbUv);
  float fade = edgeFade(u_edge_fade, r2d);
  col *= fade;
  a *= fade;

  // Emitted light, so rgb is already premultiplied — do NOT scale by alpha
  // again (see the same note in orb-31).
  frag_color = vec4(col, a);
}
