// ORB-31 — "Raymarched shell with volumetric light godrays"
//
// Flutter (FragmentShader) port of the shadercn ORB-31 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-31/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_31.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/sweepRate phases these uniforms
// carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_alpha_gain;
uniform float u_ambient;
uniform float u_cam_dist;
uniform float u_edge_fade;
uniform float u_fov;
uniform float u_freq_swing;
uniform float u_max_dist;
uniform float u_radius;
uniform float u_ray_falloff;
uniform float u_ray_gain;
uniform float u_smooth_k;
uniform float u_smooth_swing;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_step_scale;
uniform float u_surface_lit;
uniform float u_sweep_rate; // integrated sweep phase (NOT a rate)
uniform float u_swell;
uniform float u_warp;
uniform float u_warp_freq;
uniform float u_warp_swing;

out vec4 frag_color;

#define MAX_STEPS 256

// WGSL leaves smoothstep indeterminate once edge0 >= edge1; the edge fade
// below is descending, so evaluate it with the explicit hermite form for
// deterministic cross-GPU behaviour.
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

// An artistic tumble, not an orthonormal rotation — the axes shear against each
// other so the shell never repeats a clean spin. Column-major, matching the
// original mat3x3f construction.
mat3 coronaRot(float a) {
  return mat3(
    cos(a), sin(a * 0.5) * sin(a), sin(a) * cos(a * 0.5),
    0.0, cos(a * 0.5), -sin(a * 0.5),
    -sin(a), sin(a * 0.5) * cos(a), cos(a * 0.5) * cos(a)
  );
}

// Manual transpose — impellerc's SkSL path has no transpose() (spirv-cross
// emits spvTranspose, which the SkSL validator rejects).
mat3 transpose3(mat3 m) {
  return mat3(
    m[0][0], m[1][0], m[2][0],
    m[0][1], m[1][1], m[2][1],
    m[0][2], m[1][2], m[2][2]
  );
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + (0.5 * (b - a)) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float coronaSDF(vec3 p, float shellRadius, float warpAmount, float warpFreqNow, float smoothKNow) {
  vec3 p1 = p;
  vec3 w = sin(p.xzy * warpFreqNow) / max(warpAmount, 0.001);
  p1 = vec3(p1.x + w.z, p1.y + w.y, p1.z + w.x);
  return -smin(length(p1) - shellRadius, shellRadius - length(p), smoothKNow);
}

vec3 shellColor(vec3 p, mat3 globalInvRot, float shellRadius, float warpAmount, float warpFreqNow, float smoothKNow) {
  float eps = 0.001;
  vec3 normal = globalInvRot * normalize(vec3(
    coronaSDF(p + vec3(eps, 0.0, 0.0), shellRadius, warpAmount, warpFreqNow, smoothKNow) -
        coronaSDF(p - vec3(eps, 0.0, 0.0), shellRadius, warpAmount, warpFreqNow, smoothKNow),
    coronaSDF(p + vec3(0.0, eps, 0.0), shellRadius, warpAmount, warpFreqNow, smoothKNow) -
        coronaSDF(p - vec3(0.0, eps, 0.0), shellRadius, warpAmount, warpFreqNow, smoothKNow),
    coronaSDF(p + vec3(0.0, 0.0, eps), shellRadius, warpAmount, warpFreqNow, smoothKNow) -
        coronaSDF(p - vec3(0.0, 0.0, eps), shellRadius, warpAmount, warpFreqNow, smoothKNow)
  ));

  vec3 next = vec3(1.0) - (normal * 0.5 + 0.5);
  next = vec3(dot(next, vec3(1.0)) / 3.0);
  return vec3(1.025) - next * next;
}

vec4 coronaRender(vec2 fragCoord, mat3 globalRot, mat3 globalInvRot, float shellRadius, float warpAmount, float warpFreqNow, float smoothKNow, float rayGain) {
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  vec3 ro = vec3(0.0, 0.0, -u_cam_dist);
  vec3 rd = normalize(vec3(uv, u_fov));

  ro = globalRot * ro;
  rd = globalRot * rd;

  vec3 p = ro;
  float dist = 1.0;
  float t = 0.0;
  float godrays = 0.0;

  for (int i = 0; i < MAX_STEPS; i++) {
    if (dist <= 0.005 || t >= u_max_dist) {
      break;
    }
    p = ro + rd * t;
    dist = coronaSDF(p, shellRadius, warpAmount, warpFreqNow, smoothKNow) / max(u_step_scale, 0.5);

    // Gate the accumulation on the shell so light bleeds out of the hollow
    // instead of glowing uniformly through empty space.
    float fog = length(p) > shellRadius
        ? 1.0
        : smoothstep(0.0, 0.5, coronaSDF(normalize(p) * shellRadius, shellRadius, warpAmount, warpFreqNow, smoothKNow));
    godrays += (rayGain / (1.0 + dot(p, p) * u_ray_falloff)) * fog;

    t += dist;
  }

  vec3 col = vec3(u_ambient);
  if (t < u_max_dist) {
    col = shellColor(p, globalInvRot, shellRadius, warpAmount, warpFreqNow, smoothKNow) * u_surface_lit;
  }
  col += godrays;

  return vec4(col, 1.0);
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  // integrated clock
  float animTime = u_speed;
  mat3 globalRot = coronaRot(animTime);
  mat3 globalInvRot = transpose3(coronaRot(animTime));

  // One shared BACK-AND-FORTH phase for the swept values. sin() of an
  // integrated clock is a true round trip — it eases through both ends
  // instead of snapping at a wrap.
  //
  // Every swept value is resolved HERE, once per fragment, and never read
  // straight from its uniform inside coronaSDF: the normal estimate calls
  // that SDF six more times, and a value that moved between those calls
  // would corrupt the finite difference and pit the shading.
  //
  // u_sweep_rate is its own integrated clock, so the breathing rate tunes
  // without jumping the phase, and it only ever enters through sin() —
  // safe for an unbounded clock. All three swings share the phase, so the
  // shell breathes as one motion rather than three unrelated wobbles.
  float sweepPhase = sin(u_sweep_rate);

  // Louder agent output pushes the godrays; user input roughens the shell and
  // swells it slightly, so the silhouette breathes with speech.
  float shellRadius = u_radius + u_swell * u_input_vol;
  float warpAmount = (u_warp + u_warp_swing * sweepPhase) * (1.0 - 0.25 * u_input_vol - 0.15 * u_output_vol);
  warpAmount = max(warpAmount, 0.05);
  float rayGain = u_ray_gain * (0.7 + 0.8 * u_output_vol + 0.3 * u_input_vol);

  float warpFreqNow = max(u_warp_freq + u_freq_swing * sweepPhase, 0.05);

  // smoothK reaches EXACTLY zero at the bottom of the speaking sweep
  // (0.25 +/- 0.25), and smin() divides by it — an unguarded zero is a
  // NaN across the whole SDF. The floor keeps the blend hard but finite.
  float smoothKNow = max(u_smooth_k + u_smooth_swing * sweepPhase, 0.005);

  vec4 acc = coronaRender(fragCoord, globalRot, globalInvRot, shellRadius, warpAmount, warpFreqNow, smoothKNow, rayGain);

  // Luminance becomes alpha so the orb composites onto the page instead of
  // painting an opaque square.
  //
  // The colour is emitted light, so it is already premultiplied: rgb is what
  // the orb adds, alpha is only how much background it hides. Multiplying rgb
  // by alpha again (the usual move for a lit surface) would darken the glow
  // quadratically and wash the godrays out.
  vec3 col = clamp(acc.xyz, 0.0, 1.0);
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float a = clamp(lum * u_alpha_gain, 0.0, 1.0);

  // The godrays are volumetric, so they reach the frame boundary and would
  // otherwise show the canvas as a hard-edged glowing square. Taper radially to
  // let the halo fall off into the page instead — colour as well as alpha,
  // since premultiplied output would otherwise keep emitting at full brightness
  // right up to the cutoff and leave a visible rim.
  float fade = edgeFade(u_edge_fade, length(orbUv));
  col *= fade;
  a *= fade;

  frag_color = vec4(col, a);
}
