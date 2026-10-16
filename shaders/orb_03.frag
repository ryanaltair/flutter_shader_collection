// ORB-03 — "Rainbow-outlined bands of light turbulence"
//
// Flutter (FragmentShader) port of the shadercn ORB-03 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-03/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_03.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/anim phases these uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_anim;       // integrated animation phase (NOT a rate)
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
uniform float u_feedback;
uniform float u_fill;
uniform float u_focal;
uniform float u_hue;
uniform float u_plane;
uniform float u_pulse;
uniform float u_saturation;
uniform float u_scatter;
uniform float u_shell_r;
uniform float u_shell_w;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_spread;
uniform float u_step_clamp;
uniform float u_surge;
uniform float u_turb;
uniform float u_wander;
uniform float u_width;
uniform vec3 u_c_tint;

out vec4 frag_color;

#define STEPS 80
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

vec3 eclipticRender(vec2 fragCoord, float eclipticTurb, float eclipticPlane, float eclipticWidth) {
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec3 ro = vec3(0.0, 0.0, u_cam_dist);
  vec3 rd = normalize(vec3(uv, -u_focal));

  // integrated clock: the warp
  float animTime = u_speed;
  // integrated clock: the belt's tilt
  float wander = u_wander;

  vec3 acc = vec3(0.0);

  // transmittance carried front-to-back — the near belt veils the far one
  float T = 1.0;

  // march only the span the envelope can light, as in orb-01
  float z = max(u_cam_dist - u_env_radius * 1.3, 0.0);
  float zEnd = u_cam_dist + u_env_radius * 1.3;

  // The listing's feedback variable, explicit. On the first iteration the
  // axis below reads this before anything has written it — zero is what the
  // golfed version gets, so zero is what it gets here.
  float dist = 0.0;

  for (int it = 0; it < STEPS; it++) {
    vec3 p = ro + rd * z;

    // The axis, steered by the PREVIOUS step's density: the belt's tilt
    // settles as the ray closes on the surface and swings away from it out
    // in the open. The three phases are far enough apart that the cosines
    // can never null together, so the normalize is safe without a guard.
    vec3 axis = normalize(cos(vec3(4.0, 2.0, 0.0) - dist * u_feedback + wander));

    // the exact minus-90-degree rotation about that axis
    vec3 a = axis * dot(axis, p) - cross(axis, p);

    // eight octaves of plain feedback warp — no lattice quantizer here,
    // unlike its cousins orb-22 and orb-04
    for (int j = 0; j < TURB; j++) {
      float f = float(j) + 2.0;
      a += sin(a * f + animTime).yzx * eclipticTurb / f;
    }

    // Sphere plus plane. The shell reads the RAW point so the ball stays a
    // ball; the plane reads the WARPED one so the belt writhes across it.
    // u_plane at zero drops the belt and lights the whole shell.
    dist = u_shell_w * abs(length(p) - u_shell_r) + eclipticPlane * abs(a.y);
    dist = max(dist, eclipticWidth);

    // Hue from the DENSITY — the belt contoured in rainbow along its own
    // distance field — and the listing's z in the numerator, which burns
    // the far limb hotter than the near one.
    vec3 w = cos(vec3(0.0, 2.0, 4.0) * u_spread + dist * u_hue) + 1.0;
    w *= z / dist;
    w = min(w, vec3(u_step_clamp));

    // envelope: plateau through the ball, cut 12% past the radius so the
    // analytic silhouette in main() still has emission left to cut
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

  // The SURGE: tightness and warp swept together on one phase, so the belt
  // gathers into a hard warped girdle and then opens back into a smooth
  // shell. Two params, one gesture. At surge zero those terms are all that
  // is left, so a state that does not ask for this is untouched.
  float surge = 0.5 - 0.5 * cos(u_anim * 4.0);

  float eclipticTurb = mix(u_turb * (1.0 + 0.4 * u_input_vol), mix(0.5, 1.6, surge), u_surge);
  // the belt broadens toward a full shell while the agent speaks
  float eclipticPlane = mix(u_plane * (1.0 - 0.35 * u_output_vol), mix(0.1, 0.3, surge), u_surge);
  float eclipticExposure = u_exposure * (1.0 - 0.3 * u_output_vol);

  // The belt BREATHES. At pulse zero the width is exactly what was dialled;
  // at one it sweeps the whole way from nothing to that width and back, once
  // every few seconds. It cannot truly reach zero: belt width is the march's
  // step floor, and a zero step stalls the ray on one point.
  float eclipticWidth = max(u_width * (1.0 - u_pulse * (0.5 + 0.5 * cos(u_anim * 3.0))), 5e-4);

  vec3 acc = eclipticRender(fragCoord, eclipticTurb, eclipticPlane, eclipticWidth);

  // tanh tone map per channel
  vec3 col = tanh(acc / max(eclipticExposure, 1.0));
  col = pow(clamp(col, 0.0, 1.0), vec3(u_contrast));

  // saturation about luminance, then the tint
  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation) * u_c_tint;

  // alpha from the brightest channel, not luminance — a deep blue contour
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
