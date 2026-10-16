// ORB-04 — "Hollow light shell, faceted by a voxel lattice"
//
// Flutter (FragmentShader) port of the shadercn ORB-04 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-04/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_04.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed phase these uniforms carry).

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
uniform float u_env_scale;
uniform float u_exposure;
uniform float u_floor_level;
uniform float u_focal;
uniform float u_hue_gain;
uniform float u_pitch;
uniform float u_saturation;
uniform float u_shell_r;
uniform float u_slack;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_turb;
uniform float u_width;
uniform vec3 u_c_tint;

out vec4 frag_color;

#define STEPS 50
#define TURB 6

// BT.601 luminance — the axis saturation works about it.
float luma(vec3 col) {
  return dot(col, vec3(0.299, 0.587, 0.114));
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

// GLSL ES 1.0 has no round() — it arrived in ES 3.0. The listing quantizes
// with it, so it ships here. Halves round up rather than to even.
vec3 roundv(vec3 x) {
  return floor(x + 0.5);
}

vec3 geodeRender(vec2 fragCoord, float geodeTurb, float geodeWidth) {
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec3 ro = vec3(0.0, 0.0, u_cam_dist);
  vec3 rd = normalize(vec3(uv, -u_focal));

  // integrated clock
  float animTime = u_speed;
  float shellR = u_shell_r;
  float pitch = max(u_pitch, 0.002);

  // the run-away bound for rays that miss the shell entirely
  float zEnd = u_cam_dist + shellR * 2.5;

  vec3 acc = vec3(0.0);

  // The listing starts its march at the camera and lets the trace do the
  // travelling. z is the distance already walked.
  float z = 0.0;

  for (int it = 0; it < STEPS; it++) {
    vec3 p = ro + rd * z;

    // Six octaves on ONE lattice. The pitch never changes; only the phase
    // multiplier does, so the displacement is piecewise constant on a
    // single grid and the shell facets at one scale.
    for (int j = 0; j < TURB; j++) {
      float f = float(j) + 2.0;
      p += sin(roundv(p.zxy / pitch) * (pitch * f) - animTime) * geodeTurb / f;
    }

    // Sphere trace toward the shell, on the WARPED point — so the facets
    // are what the ray is chasing, not a smooth ball underneath them. The
    // slack is the listing's tenth, and the floor is the surface width.
    float dist = geodeWidth + u_slack * abs(length(p) - shellR);

    z += dist;

    // Position as colour, washing toward white with depth.
    acc += (p * u_hue_gain / max(z, 1e-3) + u_floor_level) / dist;

    if (z > zEnd) {
      break;
    }
  }

  return acc;
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;

  float geodeTurb = u_turb * (1.0 + 0.5 * u_input_vol);
  float geodeWidth = max(u_width * (1.0 - 0.4 * u_output_vol), 0.0002);
  float geodeExposure = u_exposure * (1.0 - 0.3 * u_output_vol);

  vec3 acc = geodeRender(fragCoord, geodeTurb, geodeWidth);

  // tanh tone map per channel
  vec3 col = tanh(acc / max(geodeExposure, 1.0));
  col = pow(clamp(col, 0.0, 1.0), vec3(u_contrast));

  // saturation about luminance, then the tint
  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation) * u_c_tint;

  // alpha from the brightest channel, not luminance — a deep blue facet
  // has low luminance but must not go transparent
  float peak = max(col.x, max(col.y, col.z));
  float alpha = clamp(peak * u_alpha_gain, 0.0, 1.0);

  // Analytic silhouette against the shell, widened by u_env_scale because
  // the turbulence pushes the visible surface OUT past the nominal radius.
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec3 mrd = normalize(vec3(orbUv, -u_focal));
  float closest = length(cross(vec3(0.0, 0.0, u_cam_dist), mrd));
  float sil = u_shell_r * u_env_scale;
  float band = mix(0.35, 0.012, clamp(u_edge, 0.0, 1.0));
  float mask = 1.0 - smoothstep(sil * (1.0 - band), sil * 1.005, closest);
  col *= mask;
  alpha *= mask;

  // safety taper at the frame boundary — colour as well as alpha
  float fade = edgeFade(u_edge_fade, length(orbUv));
  col *= fade;
  alpha *= fade;

  // Emitted light, so rgb is already premultiplied — do NOT scale by alpha
  // again (see the same note in orb-31).
  frag_color = vec4(col, alpha);
}
