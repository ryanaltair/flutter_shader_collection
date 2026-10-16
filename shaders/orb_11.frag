// ORB-11 — "Quantum orbits in iridescent chroma"
//
// Flutter (FragmentShader) port of the shadercn ORB-11 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-11/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_11.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/flowSpeed phases these uniforms
// carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_base_vis;
uniform float u_chroma_spread;
uniform float u_flow_amp;
uniform float u_flow_scale;
uniform float u_flow_speed;  // integrated flow phase (NOT a rate)
uniform float u_glow;
uniform float u_metal_dark;
uniform float u_pos_scale;
uniform float u_precess;
uniform float u_prob_gain;
uniform float u_prob_pow;
uniform float u_radial_decay;
uniform float u_radial_pow;
uniform float u_radius;
uniform float u_rot_speed;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_swell;
uniform float u_wave_freq;

out vec4 frag_color;

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

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  float r2d = length(uv);
  float R = u_radius + u_swell * u_input_vol;
  float t = clamp((r2d - R - 0.012) / -0.024, 0.0, 1.0);
  float mask = t * t * (3.0 - 2.0 * t);
  float nr = clamp(r2d / max(R, 0.001), 0.0, 1.0);
  float z = sqrt(max(1.0 - nr * nr, 0.0));

  // u_speed and u_flow_speed arrive pre-integrated as clocks, so state
  // transitions stay phase-continuous. Input/output excitement bends zoom,
  // radial form, probability and chroma into a different interference pattern.
  float posScale = u_pos_scale * (0.8 + 0.45 * u_output_vol + 0.2 * u_input_vol);
  float radialPow = u_radial_pow * (0.7 + 0.8 * u_output_vol);
  float radialDecay = u_radial_decay * (1.25 - 0.5 * u_output_vol);
  float probPow = u_prob_pow * (1.3 - 0.55 * u_output_vol);
  float probGain = u_prob_gain * (0.7 + 0.6 * u_output_vol + 0.5 * u_input_vol);
  float waveFreq = u_wave_freq * (0.6 + 1.0 * u_output_vol);
  float chromaSpread = u_chroma_spread * (0.6 + 0.9 * u_output_vol + 0.5 * u_input_vol);

  // dome point rotated around Y — the fake 3D of the flat disc
  float animTime = u_speed;
  float cosT = cos(animTime * u_rot_speed);
  float sinT = sin(animTime * u_rot_speed);
  vec2 nxy = uv / max(R, 0.001);
  vec3 sp = vec3(nxy, z) * posScale;
  vec3 pos = vec3(
    sp.x * cosT - sp.z * sinT,
    sp.y,
    sp.x * sinT + sp.z * cosT
  );

  // precession: the rotation axis itself drifts, so the pattern never
  // settles into a repeating spin
  float tilt = sin(animTime * 0.21 + 1.7) * u_precess;
  float cx = cos(tilt);
  float sx = sin(tilt);
  pos = vec3(pos.x, pos.y * cx - pos.z * sx, pos.y * sx + pos.z * cx);

  // liquid flow: drifting fbm warps the 3D domain so the wave function
  // smears around the sphere instead of wobbling in place
  float flowT = u_flow_speed;
  float fAmp = u_flow_amp * (0.7 + 0.6 * u_output_vol + 0.4 * u_input_vol);
  vec3 w = vec3(
    fbm(pos.yz * u_flow_scale + vec2(flowT * 0.7, -flowT * 0.4)),
    fbm(pos.zx * u_flow_scale + (vec2(-flowT * 0.55, flowT * 0.62) + vec2(3.7))),
    fbm(pos.xy * u_flow_scale + (vec2(flowT * 0.5, flowT * 0.85) + vec2(7.1)))
  );
  pos += (w - 0.5) * fAmp;

  float r = length(pos) + 0.001;
  float theta = acos(clamp(pos.y / r, -1.0, 1.0));
  float phi = atan(pos.z, pos.x);

  float a0 = 0.5;
  float rho = (2.0 * r) / (5.0 * a0);
  float radial = pow(rho, radialPow) * exp(-rho / radialDecay);
  float angular = pow(sin(theta), 3.0) * cos(phi + animTime * 0.2);

  float psi = radial * angular;
  float probability = psi * psi;

  // travelling spiral wave — snap the azimuthal harmonic to a whole number
  // so sin(phi * f) lines up across the +/-PI wrap
  float waveN = max(1.0, floor(waveFreq + 0.5));
  float wavePhase = phi * waveN + theta * 2.5 - animTime * 2.0;
  probability *= 0.85 + 0.15 * sin(wavePhase);

  // drifting bright patches, like convection cells wandering the surface
  float patches = fbm(pos.xy * 1.6 + vec2(flowT * 0.4, -flowT * 0.3));
  probability *= 0.65 + 0.7 * patches;

  probability = pow(probability, probPow) * probGain;
  probability = clamp(probability, 0.0, 1.0);

  float fresnel = pow(1.0 - z, 1.5);

  float chromaOffset = phi * 2.0 + theta * 1.5 + animTime * 0.3 + probability * 3.0;
  vec3 rainbowRaw = vec3(
    sin(chromaOffset) * 0.5 + 0.5,
    sin(chromaOffset + chromaSpread) * 0.5 + 0.5,
    sin(chromaOffset + chromaSpread * 2.0) * 0.5 + 0.5
  );
  vec3 rainbow = normalize(rainbowRaw + 0.01) * length(rainbowRaw);

  float bandFreq = chromaOffset * 3.0 + fresnel * 2.4;
  vec3 chromaticBands = vec3(
    sin(bandFreq) * 0.5 + 0.5,
    sin(bandFreq + 2.094) * 0.5 + 0.5,
    sin(bandFreq + 4.189) * 0.5 + 0.5
  );

  vec3 glowColor = mix(rainbow, chromaticBands, 0.12);
  glowColor = pow(glowColor, vec3(0.8));

  vec3 darkMetal = vec3(u_metal_dark);
  vec3 lightMetal = mix(vec3(0.9, 0.92, 0.95), glowColor, 0.7);

  float metalGradient = smoothstep(0.0, 1.0, probability * 0.7 + fresnel * 0.3);
  vec3 metalColor = mix(darkMetal, lightMetal, metalGradient);

  float orbGlow = u_glow + 0.6 * u_output_vol;
  float totalGlow = (0.25 + fresnel * 0.6 + probability * 0.8) * orbGlow;
  float glowAmount = clamp(pow(totalGlow, 0.7), 0.0, 1.0);

  vec3 surfaceColor = mix(metalColor, glowColor, glowAmount);

  vec3 normal = vec3(nxy, z);
  float specular = pow(max(dot(normal, normalize(vec3(1.0, 1.0, 2.0))), 0.0), 32.0);
  surfaceColor += mix(vec3(1.0), glowColor, 0.6) * (specular * 0.4);

  float visibility = clamp(
    probability * 1.2 + fresnel * 0.3 + u_base_vis + u_input_vol * 0.15,
    0.0,
    1.0
  );

  float alpha = mask * visibility;
  // Surface orb bounded by a mask: alpha IS coverage, so premultiply.
  frag_color = vec4(surfaceColor * alpha, alpha);
}
