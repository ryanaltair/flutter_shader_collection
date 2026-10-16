// ORB-10 — "A lattice of light woven into the sphere's surface"
//
// Flutter (FragmentShader) port of the shadercn ORB-10 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-10/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_10.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/scroll phases these uniforms
// carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_alpha_gain;
uniform float u_cam_dist;
uniform float u_cell;
uniform float u_climb;
uniform float u_contrast;
uniform float u_edge;
uniform float u_edge_fade;
uniform float u_env_core;
uniform float u_env_radius;
uniform float u_exposure;
uniform float u_fill;
uniform float u_focal;
uniform float u_hue_step;
uniform float u_layer;
uniform float u_saturation;
uniform float u_scatter;
uniform float u_scroll;     // integrated climb phase (NOT a rate)
uniform float u_shell_r;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_spread;
uniform float u_step_clamp;
uniform float u_step_scale;
uniform float u_turb;
uniform float u_wrap;
uniform vec3 u_c_tint;

out vec4 frag_color;

#define STEPS 40
#define TURB 6

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

vec3 weaveRender(vec2 fragCoord, float weaveTurb, float weaveCell) {
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec3 ro = vec3(0.0, 0.0, u_cam_dist);
  vec3 rd = normalize(vec3(uv, -u_focal));

  // integrated clock: the warp
  float animTime = u_speed;
  // integrated clock: the skin climbs
  float scroll = u_scroll;

  vec3 acc = vec3(0.0);

  // transmittance carried front-to-back — the near skin veils the far one
  float T = 1.0;

  // march only the span the envelope can light, as in orb-01
  float z = max(u_cam_dist - u_env_radius * 1.3, 0.0);
  float zEnd = u_cam_dist + u_env_radius * 1.3;

  for (int it = 0; it < STEPS; it++) {
    float fi = float(it) + 1.0;
    vec3 world = ro + rd * z;

    // The unwrap: angle about the axis, height, and distance from the
    // CENTRE less the shell radius. u_wrap wants to stay a whole number.
    float rl = length(world);
    vec3 p = vec3(
      atan(world.z, world.x) * u_wrap,
      world.y * u_climb + scroll,
      rl - u_shell_r
    );

    // six octaves of feedback warp, each march step on its own phase
    for (int j = 0; j < TURB; j++) {
      float dj = float(j) + 1.0;
      p += sin(p.yzx * dj + vec3(animTime + u_layer * fi)) * weaveTurb / dj;
    }

    // The lattice. Small only where all three cosines sit at one and the
    // sample is on the shell — so the cells of a 3D lattice in unwrapped
    // space are cut by the ball's surface, and what is left is a knitted
    // skin. u_cell is the amplitude of the cosine terms against the shell
    // term, and therefore how much the lattice matters relative to simply
    // being on the surface.
    float dist = u_step_scale * length(vec4(cos(p) * weaveCell - vec3(weaveCell), p.z));
    dist = max(dist, u_env_radius * 0.004);

    // colour by unwrapped height, with each step offset again
    vec3 w = cos(vec3(6.0, 1.0, 2.0) * u_spread + vec3(p.y + fi * u_hue_step)) + 1.0;
    w /= dist;
    w = min(w, vec3(u_step_clamp));

    // envelope: plateau through the ball, cut 12% past the radius so the
    // analytic silhouette in main() still has emission left to cut
    float env = sstep(u_env_radius * 1.12, u_env_radius * u_env_core, rl);
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

  float weaveTurb = u_turb * (1.0 + 0.4 * u_input_vol);
  float weaveCell = u_cell * (1.0 + 0.3 * u_input_vol);
  float weaveExposure = u_exposure * (1.0 - 0.3 * u_output_vol);

  vec3 acc = weaveRender(fragCoord, weaveTurb, weaveCell);

  // The knee: tanh(v*v/exposure) over an unnormalized sum of forty steps,
  // divided by the step count first. The square is a contrast squarer,
  // not a tone map.
  vec3 v = acc / float(STEPS);
  vec3 col = tanh(v * v / max(weaveExposure, 0.0001));
  col = pow(clamp(col, 0.0, 1.0), vec3(u_contrast));

  // saturation about luminance, then the tint
  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation) * u_c_tint;

  // alpha from the brightest channel, not luminance — a deep blue thread
  // has low luminance but must not go transparent
  float peak = max(col.x, max(col.y, col.z));
  float alpha = clamp(peak * u_alpha_gain, 0.0, 1.0);

  // Analytic silhouette — identical construction to orb-01: exact
  // ray-to-centre distance against the radius, colour AND alpha.
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec3 mrd = normalize(vec3(orbUv, -u_focal));
  float closest = length(cross(vec3(0.0, 0.0, u_cam_dist), mrd));
  float band = mix(0.35, 0.012, clamp(u_edge, 0.0, 1.0));
  float mask = 1.0 - sstep(u_env_radius * (1.0 - band), u_env_radius * 1.005, closest);
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
