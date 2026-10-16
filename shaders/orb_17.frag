// ORB-17 — "A granular, many-coloured storm with shear and lightning"
//
// Flutter (FragmentShader) port of the shadercn ORB-17 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-17/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_17.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/spin phases these uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_time;       // seconds since start, halved
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_bands;
uniform float u_churn;
uniform float u_contrast;
uniform float u_film_grain;
uniform float u_flash;
uniform float u_flash_rate;
uniform float u_gain;
uniform float u_grain;
uniform float u_grain_size;
uniform float u_light;
uniform float u_radius;
uniform float u_rainbow;
uniform float u_rim;
uniform float u_scale;
uniform float u_shear;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_spin;       // integrated spin phase (NOT a rate)
uniform float u_warp;
uniform vec3 u_c_deep;
uniform vec3 u_c_flash;
uniform vec3 u_c_hot;
uniform vec3 u_c_low;
uniform vec3 u_c_mid;

out vec4 frag_color;

#define TAU 6.28318530718

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 ff = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), ff.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), ff.x),
    ff.y
  );
}

float fbm(vec2 pIn) {
  vec2 p = pIn;
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(11.7, 7.3);
    a *= 0.5;
  }
  return v;
}

// Animated white noise, one tap per grain cell per grain frame.
float grainNoise(vec2 gpix, float frame, float seed) {
  return hash(gpix + vec2(frame * 13.71 + seed, frame * 7.37 - seed));
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  // User input churns the warp harder, agent output brightens the field.
  float warpNow = u_warp * (1.0 + 0.55 * u_input_vol);
  float gainNow = u_gain * (0.85 + 0.45 * u_output_vol);

  float rd = length(uv);
  float R = u_radius;
  float t = clamp((rd - R - 0.012) / -0.024, 0.0, 1.0);
  float mask = t * t * (3.0 - 2.0 * t);

  // Skip the five fbm evaluations outside the silhouette.
  if (mask <= 0.0) {
    frag_color = vec4(0.0);
    return;
  }

  vec2 pl = uv / R;
  float r2 = dot(pl, pl);
  float z = sqrt(max(1.0 - r2, 0.0));
  vec3 n = vec3(pl, z);

  float cr = cos(u_spin);
  float sr = sin(u_spin);
  vec3 sp = vec3(n.x * cr - n.z * sr, n.y, n.x * sr + n.z * cr);

  float t2 = u_speed;

  // stereographic wrap: weather travels around the ball and compresses toward the limb
  vec2 st = sp.xy / (1.3 + sp.z) * u_scale;

  // Jovian band flow: a uniform stream plus a BOUNDED traveling wave of
  // shear, so latitude rings slip past each other without accumulating
  // into hairline streaks. sp.y is untouched by the Y-roll, so the bands
  // hold horizontal while the dome turns underneath them.
  st = vec2(st.x - t2 * 0.3, st.y);
  st = vec2(st.x + u_shear * sin(sp.y * u_bands - t2 * 0.45), st.y);

  vec2 q = vec2(
    fbm(st + vec2(0.0, t2 * 0.35)),
    fbm((st + vec2(5.2, 1.3)) - vec2(t2 * 0.28, 0.0))
  );
  vec2 w = vec2(
    fbm(st + q * warpNow + vec2(1.7, 9.2) + vec2(t2 * 0.12, 0.0)),
    fbm(st + q * warpNow + vec2(8.3, 2.8) - vec2(0.0, t2 * 0.1))
  );
  float f = fbm(st + w * u_churn);

  // Grain tap 1: speckle folded into the FIELD itself, before the gradient,
  // so colour stops dither into grain instead of smooth bands.
  vec2 gpix = floor(fragCoord / max(u_grain_size, 1.0));
  float frame = floor(u_time * 48.0);
  float g1 = grainNoise(gpix, frame, 3.1);
  f += (g1 - 0.5) * u_grain;

  f = pow(clamp(f * gainNow, 0.0, 1.0), u_contrast);

  vec3 col = mix(u_c_deep, u_c_low, smoothstep(0.05, 0.35, f));
  col = mix(col, u_c_mid, smoothstep(0.35, 0.62, f));
  col = mix(col, u_c_hot, smoothstep(0.62, 0.88, f));

  // iridescent shimmer keyed to the field AND the warp vector, so rainbow
  // lands as coherent weather cells instead of hue noise
  vec3 shimmer = vec3(0.5) + cos((vec3(0.0, 0.33, 0.67) + vec3(f * 0.9 + q.x * 1.1 + t2 * 0.06)) * TAU) * 0.5;
  col = mix(col, col * (shimmer * 1.9 + 0.35), u_rainbow);

  // Lightning: one hashed gate per flash interval with exponential decay.
  // Agent output opens the gate. Squared so the strike stays inside storm cells.
  float ft = t2 * u_flash_rate;
  float gate = step(1.0 - (0.1 + 0.5 * u_output_vol), hash(vec2(floor(ft), 7.7)));
  float flashEnv = gate * exp(-fract(ft) * 6.0);
  float high = smoothstep(0.55, 0.95, f);
  col += u_c_flash * (flashEnv * u_flash) * (0.06 + 0.94 * high * high);

  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0, 1.0);
  col *= 0.35 + u_light * lambert;
  float fres = pow(1.0 - z, 2.5);
  col += u_c_flash * (u_rim * fres * (0.4 + 0.35 * flashEnv));

  float g2 = grainNoise(gpix, frame, 27.9);
  col *= 1.0 + (g2 - 0.5) * u_film_grain;

  float alpha = mask;
  // Surface orb bounded by a mask: alpha IS coverage, so premultiply.
  frag_color = vec4(max(col, vec3(0.0)) * alpha, alpha);
}
