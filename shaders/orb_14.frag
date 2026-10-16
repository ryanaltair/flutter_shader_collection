// ORB-14 — "Plasma dome quantized into chunky two-tone pixels"
//
// Flutter (FragmentShader) port of the shadercn ORB-14 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-14/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_14.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated spin/speed phases these uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_cells;
uniform float u_contrast;
uniform float u_gain;
uniform float u_levels;
uniform float u_light;
uniform float u_plasma;
uniform float u_radius;
uniform float u_rim;
uniform float u_scale;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_spin;       // integrated spin phase (NOT a rate)
uniform vec3 u_c_ink;
uniform vec3 u_c_paper;

out vec4 frag_color;

// 2x2 Bayer base: (0,0)=0, (1,0)=.5, (0,1)=.75, (1,1)=.25
float bayer2(vec2 a) {
  vec2 f = floor(a);
  return fract(f.x / 2.0 + f.y * f.y * 0.75);
}

// 8x8 by recursion: M8 = M2(a/4)/16 + M2(a/2)/4 + M2(a)
float bayer8(vec2 a) {
  return bayer2(a * 0.25) * 0.0625 + bayer2(a * 0.5) * 0.25 + bayer2(a);
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;

  // User input deepens the waves, agent output brightens the tone ladder.
  float plasmaAmt = u_plasma * (1.0 + 0.4 * u_input_vol);
  float gainNow = u_gain * (0.85 + 0.5 * u_output_vol);

  // Chunky pixel grid, RESOLUTION-RELATIVE: u_cells is how many cells span
  // the canvas, so a gallery card and a playground orb show the same
  // composition. Content samples at the cell centre so every dot is one
  // flat square.
  float cellPx = max(min(u_res.x, u_res.y) / max(u_cells, 8.0), 1.0);
  vec2 pix = floor(fragCoord / cellPx);
  vec2 cellCentre = (pix + 0.5) * cellPx;

  vec2 suv = (cellCentre * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec2 puv = suv / u_radius;
  float r2 = dot(puv, puv);

  // blocky silhouette — cut on the cell grid, deliberately not smoothed
  float mask = 1.0 - step(1.0, r2);

  float z = sqrt(max(1.0 - r2, 0.0));
  vec3 n = vec3(puv, z);

  // Plasma in a ROTATING frame: the dome point spins about Y so wavefronts
  // roll around the ball. Light stays screen-fixed.
  float rot = u_spin;
  float cr = cos(rot);
  float sr = sin(rot);
  vec3 sp = vec3(n.x * cr - n.z * sr, n.y, n.x * sr + n.z * cr);

  float t = u_speed;

  // classic demoscene plasma: three interfering sine waves
  float f = u_scale;
  float v = sin(sp.x * f * 3.1 + t) +
      sin((sp.y * 0.85 + sp.z * 0.4) * f * 3.6 - t * 1.3) +
      sin((sp.x + sp.y + sp.z) * f * 2.2 + t * 0.7);

  // a ripple source orbiting the dome — expanding rings through the interference
  vec2 src = vec2(cos(t * 0.5), sin(t * 0.5)) * 0.55;
  v += sin(length(puv - src) * f * 5.0 - t * 2.2);
  v *= 0.25;

  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0, 1.0);
  float fres = pow(1.0 - z, 2.0);

  float lum = (0.5 + 0.5 * v * plasmaAmt) * (0.3 + u_light * lambert) + u_rim * fres;
  lum = pow(clamp(lum * gainNow, 0.0, 1.0), u_contrast);

  float steps = max(u_levels - 1.0, 1.0);
  float q = clamp(floor(lum * steps + bayer8(pix)) / steps, 0.0, 1.0);

  vec3 col = mix(u_c_ink, u_c_paper, q);

  float alpha = mask;
  // Surface orb bounded by a mask: alpha IS coverage, so premultiply.
  frag_color = vec4(col * alpha, alpha);
}
