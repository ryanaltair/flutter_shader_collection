// ORB-32 — "A galaxy of gas and dust travelling inside the sphere"
//
// Flutter (FragmentShader) port of the shadercn ORB-32 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-32/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_32.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated spin/churn/beat/twinkle phases these
// uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_absorb;
uniform float u_alpha_gain;
uniform float u_arm_sharp;
uniform float u_arms;
uniform float u_beat;       // integrated beat phase (NOT a rate)
uniform float u_breathe;
uniform float u_bulge;
uniform float u_cam_dist;
uniform float u_churn;      // integrated churn phase (NOT a rate)
uniform float u_contrast;
uniform float u_core;
uniform float u_density;
uniform float u_edge;
uniform float u_edge_fade;
uniform float u_env_radius;
uniform float u_exposure;
uniform float u_falloff;
uniform float u_fill;
uniform float u_focal;
uniform float u_hue_reach;
uniform float u_pulse;
uniform float u_ragged;
uniform float u_rim;
uniform float u_saturation;
uniform float u_spin;       // integrated spin phase (NOT a rate)
uniform float u_star_density;
uniform float u_star_scale;
uniform float u_stars;
uniform float u_thick;
uniform float u_threshold;
uniform float u_tilt;
uniform float u_turb_scale;
uniform float u_twinkle;    // integrated twinkle phase (NOT a rate)
uniform float u_wind;
uniform vec3 u_c_core;
uniform vec3 u_c_deep;
uniform vec3 u_c_inner;
uniform vec3 u_c_outer;
uniform vec3 u_c_rim;
uniform vec3 u_c_tint;

out vec4 frag_color;

#define STEPS 56
#define TURB_OCT 4

// WGSL leaves smoothstep indeterminate once edge0 >= edge1; the envelope ramp
// below is descending, so evaluate it with the explicit hermite form for
// deterministic cross-GPU behaviour.
float sstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// BT.601 luminance — the axis saturation works about it.
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

// The galactic density at a point in the galaxy's own frame: the disc lies
// in xz, the normal is y. Returns (dens, arm, rho).
vec3 galaxy(vec3 p, float t, float galDensity, float galCore, float galFalloff) {
  float rho = length(p.xz);
  float h = p.y;
  // atan(0, 0) is undefined; the exact axis is all bulge anyway
  float phi = rho > 1e-4 ? atan(p.z, p.x) : 0.0;
  float lr = log(max(rho, 0.02));
  float armPhase = phi * u_arms - u_wind * lr;

  // feedback curl turbulence, shared phase
  vec3 q = p * u_turb_scale;
  float f = 1.0;
  for (int k = 0; k < TURB_OCT; k++) {
    q += cos(q.yzx * f + vec3(t)) / f;
    f *= 1.9;
  }
  float n = ((sin(q.x) + sin(q.y) + sin(q.z)) / 3.0) * 0.5 + 0.5;
  float clump = smoothstep(u_threshold, 1.0, n);

  float arm = 0.5 + 0.5 * cos(armPhase + (n - 0.5) * u_ragged);
  arm = pow(arm, u_arm_sharp);

  float scaleH = u_thick * (0.12 + rho);
  float disc = exp(-rho * galFalloff) * exp(-abs(h) / scaleH);
  float bulge = exp(-dot(p, p) * u_bulge);

  float dens = disc * (0.08 + 1.6 * arm) * (0.25 + 0.75 * clump) + bulge * galCore;
  return vec3(dens * galDensity, arm, rho);
}

// One lattice of hashed stars. Each cell either carries a star or not, at a
// hashed position, with its own twinkle rate; the 3x3 neighbourhood is
// gathered so a star near a cell wall is not clipped.
float starField(vec2 p, float density, float size, float twinkleT) {
  vec2 id = floor(p);
  vec2 f = fract(p);
  float acc = 0.0;
  for (int j = 0; j < 3; j++) {
    for (int i = 0; i < 3; i++) {
      vec2 o = vec2(float(i) - 1.0, float(j) - 1.0);
      vec2 cid = id + o;
      float h = hash(cid);
      if (h <= density) {
        vec2 sp = o + vec2(hash(cid + vec2(1.3)), hash(cid + vec2(2.7)));
        float dd = length(f - sp);
        float tw = 0.55 + 0.45 * sin(twinkleT * (1.5 + 5.0 * hash(cid + vec2(5.1))) + h * 40.0);
        float sz = size * (0.5 + 1.2 * hash(cid + vec2(8.9)) * hash(cid + vec2(8.9)));
        acc += tw * exp((-dd * dd) / (sz * sz)) * (0.4 + (0.6 * h) / max(density, 0.001));
      }
    }
  }
  return acc;
}

vec4 galaxyRender(vec2 fragCoord, float galDensity, float galCore, float galFalloff) {
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec3 ro = vec3(0.0, 0.0, u_cam_dist);
  vec3 rd = normalize(vec3(uv, -u_focal));

  // integrated clock: the turbulence boils
  float t = u_churn;
  // integrated clock: the disc turns
  float spin = u_spin;

  // the galaxy frame: tip about x by the tilt, then turn about the disc's
  // own normal
  float ct = cos(u_tilt);
  float st = sin(u_tilt);
  float cs = cos(spin);
  float sn = sin(spin);

  vec3 acc = vec3(0.0);
  vec3 trans = vec3(1.0);
  // extinction weighted to blue, so thick gas reddens what is behind it
  vec3 absorb = vec3(0.7, 1.0, 1.5) * u_absorb;

  // march only the span the envelope can light
  float z = max(u_cam_dist - u_env_radius * 1.05, 0.0);
  float zEnd = u_cam_dist + u_env_radius * 1.05;
  float dt = (zEnd - z) / float(STEPS);
  // a hashed start offset per pixel hides the step banding
  z += dt * hash(fragCoord * 0.37);

  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rd * z;

    // envelope: nothing outside the ball contributes
    float env = 1.0 - sstep(u_env_radius * 0.92, u_env_radius, length(p));
    if (env > 0.001) {
      // into the galaxy frame
      vec3 g = vec3(p.x, p.y * ct - p.z * st, p.y * st + p.z * ct);
      g = vec3(g.x * cs - g.z * sn, g.y, g.x * sn + g.z * cs);

      vec3 gs = galaxy(g / u_env_radius, t, galDensity, galCore, galFalloff);
      float arm = gs.y;
      float rho = gs.z;
      float dens = gs.x * env;

      // the colour ramp, keyed to radius from the core
      vec3 ramp = mix(u_c_inner, u_c_outer, smoothstep(0.12, u_hue_reach, rho));
      float coreW = exp(-rho * rho * u_bulge * 0.6);
      vec3 emit = mix(ramp, u_c_core, coreW) * (0.6 + 0.6 * arm);

      acc += trans * (dens * dt) * emit;
      trans *= exp(absorb * (-dens * dt));
    }

    z += dt;
    if (trans.y < 0.004 || z > zEnd) {
      break;
    }
  }

  return vec4(acc, 1.0 - trans.y);
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  // The beat: one wave on the core-beat clock, shared by the core flare and
  // the disc's breathing. Both depths are amplitudes, so they stage cleanly.
  float wave = 0.5 + 0.5 * cos(u_beat);
  float galDensity = u_density * (1.0 + 0.35 * u_input_vol);
  float galCore = u_core * (1.0 + 0.7 * u_output_vol) * (1.0 + u_pulse * wave);
  // breathing: the disc's falloff relaxes on the wave, so the whole disc
  // swells outward and draws back — a smooth exponential, safe to sweep
  float galFalloff = u_falloff / (1.0 + u_breathe * wave);

  vec4 acc = galaxyRender(fragCoord, galDensity, galCore, galFalloff);

  // Stars, at the ray's exact hit with the galactic plane. The plane is the
  // tilted xz-plane through the origin; its world normal is the tilted y.
  // The lattice lives in the disc's own turning frame, so the stars turn
  // with the gas, and the march's transmittance dims them through the dust.
  vec3 ro = vec3(0.0, 0.0, u_cam_dist);
  vec3 rd = normalize(vec3(orbUv, -u_focal));
  float ct = cos(u_tilt);
  float st = sin(u_tilt);
  vec3 N = vec3(0.0, ct, st);
  float denom = dot(N, rd);
  if (abs(denom) > 1e-4) {
    float th = -dot(N, ro) / denom;
    vec3 q = ro + rd * th;
    if (th > 0.0 && dot(q, q) < u_env_radius * u_env_radius * 0.9) {
      vec3 g = vec3(q.x, q.y * ct - q.z * st, q.y * st + q.z * ct) / u_env_radius;
      float cs = cos(u_spin);
      float sn = sin(u_spin);
      vec2 gp = vec2(g.x * cs - g.z * sn, g.x * sn + g.z * cs);
      float rho = length(gp);
      float phi = rho > 1e-4 ? atan(gp.y, gp.x) : 0.0;
      float armW = 0.5 + 0.5 * cos(phi * u_arms - u_wind * log(max(rho, 0.02)));
      float sf = starField(
        gp * u_star_scale,
        u_star_density * (0.3 + 0.7 * armW),
        0.12,
        u_twinkle
      );
      // what the march let through
      float veil = 1.0 - acc.w;
      vec3 starLight = vec3(1.0, 0.97, 0.9) * (sf * u_stars * exp(-rho * 1.5) * (0.25 + 0.75 * veil));
      acc = vec4(acc.xyz + starLight, acc.w);
    }
  }

  // tanh tone map per channel, tunable knee
  vec3 col = tanh(acc.xyz / max(u_exposure, 0.01));
  col = pow(clamp(col, 0.0, 1.0), vec3(u_contrast));

  // saturation about luminance, then the tint
  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation) * u_c_tint;

  // alpha from the brightest channel — emitted light (see orb-18)
  float peak = max(col.x, max(col.y, col.z));
  float a = clamp(peak * u_alpha_gain, 0.0, 1.0);

  // the night behind: a fill so the ball is a solid sphere, not a cut-out
  col += u_c_deep * u_fill;
  a = max(a, u_fill);

  // Analytic silhouette — identical construction to orb-01: exact
  // ray-to-centre distance against the radius, colour AND alpha.
  vec3 mrd = normalize(vec3(orbUv, -u_focal));
  float closest = length(cross(vec3(0.0, 0.0, u_cam_dist), mrd));
  float band = mix(0.35, 0.012, clamp(u_edge, 0.0, 1.0));
  float mask = 1.0 - sstep(u_env_radius * (1.0 - band), u_env_radius * 1.005, closest);
  col *= mask;
  a *= mask;

  // a fresnel rim on the glass, inside the mask
  float fres = smoothstep(u_env_radius * 0.7, u_env_radius, closest);
  col += u_c_rim * (u_rim * fres * fres * mask);

  // safety taper at the frame boundary — colour as well as alpha
  float r2d = length(orbUv);
  float fade = edgeFade(u_edge_fade, r2d);
  col *= fade;
  a *= fade;

  // Emitted light, so rgb is already premultiplied — do NOT scale by alpha
  // again (see the same note in orb-31).
  frag_color = vec4(col, a);
}
