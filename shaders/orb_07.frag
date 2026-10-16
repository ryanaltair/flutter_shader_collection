// ORB-07 — "Torsion waves travelling outward around a column of light"
//
// Flutter (FragmentShader) port of the shadercn ORB-07 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-07/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_07.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/wave/spin phases these uniforms
// carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_alpha_gain;
uniform float u_cam_dist;
uniform float u_column;
uniform float u_contrast;
uniform float u_edge;
uniform float u_edge_fade;
uniform float u_env_core;
uniform float u_env_radius;
uniform float u_exposure;
uniform float u_fill;
uniform float u_focal;
uniform float u_hue_depth;
uniform float u_hue_step;
uniform float u_saturation;
uniform float u_scatter;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_spin;       // integrated spin phase (NOT a rate)
uniform float u_step_clamp;
uniform float u_step_scale;
uniform float u_tilt;
uniform float u_turb;
uniform float u_twist;
uniform float u_wave;       // integrated twist-travel phase (NOT a rate)
uniform vec3 u_c_tint;

out vec4 frag_color;

#define STEPS 50
#define TURB 9

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

// GLSL ES 1.0 has no round() — it arrived in ES 3.0. The listing quantizes
// with it, so it ships here. Halves round up rather than to even, which is
// what a lattice quantizer wants anyway.
vec3 roundv(vec3 x) {
  return floor(x + 0.5);
}

vec3 torsionRender(vec2 fragCoord, float torsionTurb, float torsionTwist) {
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec3 ro = vec3(0.0, 0.0, u_cam_dist);
  vec3 rd = normalize(vec3(uv, -u_focal));

  // integrated clock: cell flicker
  float shimmer = u_speed;
  // integrated clock: the travelling twist
  float wave = u_wave;
  // integrated clock: roll about the axis
  float spin = u_spin;

  // the axis lean and the roll, applied to the SAMPLE rather than to the
  // axis
  float ct = cos(u_tilt);
  float st = sin(u_tilt);
  float cs = cos(spin);
  float ss = sin(spin);

  // the twist axis, unit by construction, which is what makes the
  // Rodrigues rotation below exact
  vec3 axis = vec3(0.0, 1.0, 0.0);

  vec3 acc = vec3(0.0);

  // transmittance carried front-to-back — near shells veil far ones
  float T = 1.0;

  // march only the span the envelope can light, as in orb-01
  float z = max(u_cam_dist - u_env_radius * 1.3, 0.0);
  float zEnd = u_cam_dist + u_env_radius * 1.3;

  for (int it = 0; it < STEPS; it++) {
    vec3 world = ro + rd * z;

    // into the axis frame: lean about X, then roll about Y
    vec3 p = vec3(
      world.x,
      world.y * ct + world.z * st,
      -world.y * st + world.z * ct
    );
    p = vec3(p.x * cs - p.z * ss, p.y, p.x * ss + p.z * cs);

    // The travelling twist. h is the sample's radius (scaled by the twist
    // knob) minus the wave clock, and the line below is an exact rotation
    // about the axis by 90 degrees - h. Because h depends only on radius,
    // the winding is constant on spheres: the ball's own shells are the
    // structure, and raising u_twist puts more turns between the core and
    // the surface.
    float h = length(p) * torsionTwist - wave;
    vec3 a = mix(axis * dot(axis, p), p, sin(h)) + cross(axis, p) * cos(h);

    // cell-quantized turbulence: every lattice cell flickers on its own
    // phase, the same construction orb-22 uses
    for (int j = 0; j < TURB; j++) {
      float dj = float(j) + 1.0;
      a += sin(roundv(a * dj) - shimmer).zxy * torsionTurb / dj;
    }

    // The axial density. At u_column 0 this is the listing's length(a.xz) —
    // distance from the twist axis, so the step collapses along the pole and
    // the axis burns as a column. At 1 it is the plain radial length and the
    // column dissolves into shells.
    float dist = u_step_scale * mix(length(a.xz), length(a), u_column);
    dist = max(dist, u_env_radius * 0.003);

    // The march's own colour code, from the listing: red constant, green
    // by DEPTH into the ball, blue by STEP INDEX — the opposite assignment
    // from orb-22. Blue gets twice the clamp headroom: its ramp runs to
    // STEPS (50) where red is fixed at 3, and an equal clamp would crush
    // the step gradient first.
    vec3 w = vec3(3.0, (z - u_cam_dist + u_env_radius) * u_hue_depth, float(it) * u_hue_step) / dist;
    w = min(w, vec3(u_step_clamp) * vec3(1.0, 1.0, 2.0));

    // Normalize the clamped weight back to family units, exactly as in
    // orb-22: without this line the clamp value leaks into total energy.
    w *= 20.0 / max(u_step_clamp, 1.0);

    // envelope: plateau through the ball, cut 12% past the radius so the
    // analytic silhouette in main() still has emission left to cut
    float env = sstep(u_env_radius * 1.12, u_env_radius * u_env_core, length(world));
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

  float torsionTurb = u_turb * (1.0 + 0.5 * u_input_vol);
  float torsionExposure = u_exposure * (1.0 - 0.35 * u_output_vol);
  // the ball winds tighter while the agent speaks
  float torsionTwist = u_twist * (1.0 + 0.4 * u_output_vol);

  vec3 acc = torsionRender(fragCoord, torsionTurb, torsionTwist);

  // tanh tone map per channel
  vec3 col = tanh(acc / max(torsionExposure, 1.0));
  col = pow(clamp(col, 0.0, 1.0), vec3(u_contrast));

  // saturation about luminance, then the tint
  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation) * u_c_tint;

  // alpha from the brightest channel, not luminance — a deep blue tail
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
