// ORB-22 — "Field lines swirling around a wandering axis"
//
// Flutter (FragmentShader) port of the shadercn ORB-22 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-22/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_22.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/wander phases these uniforms
// carry).

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
uniform float u_focal;
uniform float u_glow;
uniform float u_glow_few;
uniform float u_hue_depth;
uniform float u_hue_step;
uniform float u_hug;
uniform float u_saturation;
uniform float u_scatter;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_step_clamp;
uniform float u_step_scale;
uniform float u_turb;
uniform float u_wander;     // integrated wander phase (NOT a rate)
uniform vec3 u_c_tint;

out vec4 frag_color;

#define STEPS 70
#define TURB 7

// WGSL leaves smoothstep indeterminate once edge0 >= edge1; both the envelope
// ramp and the glow selector below run descending, so evaluate them with the
// explicit hermite form for deterministic cross-GPU behaviour.
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

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec3 vectorsRender(vec2 fragCoord, float vectorsTurb, float vectorsGlow) {
  float animTime = u_speed;
  float wander = u_wander;

  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec3 ro = vec3(0.0, 0.0, u_cam_dist);
  vec3 rd = normalize(vec3(uv, -u_focal));

  // the wandering rotation axis — unit by construction, which is what
  // makes the 90-degree Rodrigues below exact
  vec3 axis = normalize(sin(vec3(0.0, 2.0, 4.0) + vec3(wander)));

  vec3 acc = vec3(0.0);

  // transmittance carried front-to-back — near streaks veil far ones
  float T = 1.0;

  float z = max(u_cam_dist - u_env_radius * 1.3, 0.0);
  float zEnd = u_cam_dist + u_env_radius * 1.3;

  for (int it = 0; it < STEPS; it++) {
    vec3 p = ro + rd * z;

    // THE ORB IS THE OBJECT — pull the sample toward the sphere's shell
    // before the field ever sees it. At u_hug 0 this is the raw 3D tangle;
    // at 1 the field is purely angular, painted on the ball's skin. The
    // guard keeps normalize() defined through the centre.
    float rl = max(length(p), 1e-3);
    vec3 q = mix(p, p / rl * u_env_radius, u_hug);

    // the exact 90-degree rotation about the wandering axis; v stays
    // clean, a takes the turbulence
    vec3 v = axis * dot(axis, q) + cross(axis, q);
    vec3 a = v;

    // cell-quantized turbulence: every ceil() lattice cell flickers on
    // its own phase
    for (int j = 0; j < TURB; j++) {
      float dj = float(j) + 3.0;
      vec3 wave = sin(ceil(a * dj) - vec3(animTime));
      a += wave.yzx * vectorsTurb / dj;
    }

    // the density product — turbulent detail times clean streak surfaces
    float dens = u_step_scale * length(sin(a * a)) * sqrt(length(v * sin(v.yzx)));
    dens = max(dens, 1e-4);

    // The march's own colour code: red constant, green by step index, blue
    // by depth into the ball. Green gets twice the clamp headroom: its ramp
    // runs to STEPS (70) where red is fixed at 9.
    vec3 w = vec3(9.0, float(it) * u_hue_step, (z - u_cam_dist + u_env_radius) * u_hue_depth) / dens;
    w = min(w, vec3(u_step_clamp) * vec3(1.0, 2.0, 1.0));

    // Normalize the clamped weight back to family units (a ceiling of ~20).
    // This orb's raw weights run in the hundreds — without this the clamp
    // value leaks into total energy.
    w *= 20.0 / max(u_step_clamp, 1.0);

    // A few vectors GLOW. Cells of the clean rotated frame are hashed, and
    // each cell's hash cycles against the clock so only a small fraction
    // (u_glow_few of the cycle) are hot at any moment. Where a hot cell
    // meets a streak null, the same 1/d spike is re-read on a far higher
    // ceiling than the step clamp.
    float few = max(u_glow_few, 1e-3);
    vec3 vc = ceil(v * 2.0);
    float hcell = hash(vc.xy + vec2(7.31, 3.17) * vc.z);
    float cyc = fract(hcell + animTime * 0.05);
    float sel = smoothstep(1.0 - few, 1.0 - 0.5 * few, cyc) * sstep(1.0, 1.0 - 0.5 * few, cyc);
    // QUADRATIC in 1/d — the glow hugs the filament core
    w += vec3(1.0, 0.96, 0.88) * (min(0.08 / (dens * dens), 500.0) * sel * vectorsGlow);

    float env = sstep(u_env_radius * 1.12, u_env_radius * u_env_core, length(p));
    w = (w + u_fill) * env;

    acc += w * T;
    T *= exp(-luma(w) * u_scatter);

    z += dens;
    if (T < 0.004 || z > zEnd) {
      break;
    }
  }

  return acc;
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  float vectorsTurb = u_turb * (1.0 + 0.5 * u_input_vol);
  float vectorsExposure = u_exposure * (1.0 - 0.35 * u_output_vol);
  // the glows flare when the agent speaks
  float vectorsGlow = u_glow * (1.0 + 0.8 * u_output_vol);

  vec3 acc = vectorsRender(fragCoord, vectorsTurb, vectorsGlow);

  vec3 col = tanh(acc / max(vectorsExposure, 1.0));
  col = pow(clamp(col, 0.0, 1.0), vec3(u_contrast));

  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation) * u_c_tint;

  float peak = max(col.x, max(col.y, col.z));
  float a = clamp(peak * u_alpha_gain, 0.0, 1.0);

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

  frag_color = vec4(col, a);
}
