// ORB-23 — "CRT-green ASCII glyph matrix"
//
// Flutter (FragmentShader) port of the shadercn ORB-23 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-23/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_23.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated spin/speed/drift/scroll phases these
// uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_cells;
uniform float u_contrast;
uniform float u_density;
uniform float u_drift;      // integrated drift phase (NOT a rate)
uniform float u_dropout;
uniform float u_gain;
uniform float u_light;
uniform float u_pulse;
uniform float u_radius;
uniform float u_rim;
uniform float u_scale;
uniform float u_scroll;     // integrated scroll phase (NOT a rate)
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_spin;       // integrated spin phase (NOT a rate)
uniform vec3 u_c_deep;
uniform vec3 u_c_glow;

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

  // Volume coupling: user input densifies the glyphs, agent output turns
  // the phosphor up — the matrix visibly burns brighter while it speaks.
  float densBias = u_density + 0.2 * u_input_vol;
  float gainNow = u_gain * (0.85 + 0.5 * u_output_vol);

  // resolution-relative glyph grid — same character count at every size
  float cellPx = max(min(u_res.x, u_res.y) / max(u_cells, 8.0), 4.0);
  vec2 cellIdx = floor(fragCoord / cellPx);
  vec2 cellCentre = (cellIdx + 0.5) * cellPx;
  vec2 g = fract(fragCoord / cellPx);

  vec2 suv = (cellCentre * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec2 nuv = suv / u_radius;
  float r2 = dot(nuv, nuv);

  // blocky silhouette, cut on the cell grid like the rest of the matrix
  float mask = 1.0 - step(1.0, r2);

  float z = sqrt(max(1.0 - r2, 0.0));
  vec3 n = vec3(nuv, z);

  // rotating dome, stereographic projection — the weave compresses toward
  // the rim and rolls around the ball as the dome turns
  float rot = u_spin;
  float cr = cos(rot);
  float sr = sin(rot);
  vec3 sp = vec3(n.x * cr - n.z * sr, n.y, n.x * sr + n.z * cr);
  vec2 p2 = sp.xy / (abs(sp.z) + 1.2) * (u_scale * 3.0);

  // Three motions, one per state, each on its OWN integrated clock so a
  // state change morphs the movement instead of jumping it:
  //
  //   DRIFT   diagonal lava-flow streaming        (idle)
  //   SCROLL  vertical paging, terminal-style     (thinking)
  //   PULSE   radial waves radiating from centre  (speaking)
  //
  // The clocks are rates in the presets — a rate gliding to zero freezes
  // that motion in place, phase intact.
  float driftT = u_drift;
  float scrollT = u_scroll;
  float t = u_speed;
  vec2 flow = vec2(driftT * 0.6, -driftT * 0.45 - scrollT);

  float field = fbm(p2 + flow);
  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0, 1.0);
  float dens = clamp(
    (field - 0.5) * 1.8 + densBias + 0.4 * u_light * lambert + u_pulse * 0.35 * sin(length(nuv) * 5.5 - t * 2.4),
    0.0,
    1.0
  );

  // The glyph: four dash rows split by three stripe gaps. Rows light from
  // the bottom as density rises — the step() against the row index IS the
  // ASCII quantizer, so a cell is always a whole character.
  float rowI = floor(g.y * 4.0);
  float fy = fract(g.y * 4.0);
  float bar = step(0.22, fy) * step(fy, 0.9);
  float stripe = step(0.18, fract(g.x * 3.0));
  float lit = step(rowI + 0.5, dens * 4.0 * gainNow);
  float glyph = bar * stripe * lit;

  // Blocky dropouts: the same field, resampled on a 2x2 super-grid and
  // thresholded. Because whole super-cells fail together, the dark zones
  // become hard rectangular holes instead of dim characters.
  vec2 superCentre = (floor(cellIdx / 2.0) * 2.0 + 1.0) * cellPx;
  vec2 sSuv = (superCentre * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec2 sUv2 = sSuv / u_radius;
  float sz = sqrt(max(1.0 - dot(sUv2, sUv2), 0.0));
  vec3 ssp = vec3(sUv2.x * cr - sz * sr, sUv2.y, sUv2.x * sr + sz * cr);
  float superField = fbm(ssp.xy / (abs(ssp.z) + 1.2) * (u_scale * 3.0) + flow);
  float keep = step(u_dropout, superField + 0.15 * u_output_vol);
  glyph *= keep;

  // phosphor ramp: deep green floor to hot glow, whitening at the top end
  vec3 glyphCol = mix(u_c_deep, u_c_glow, dens);
  glyphCol += vec3(0.7, 1.0, 0.9) * (pow(dens, 3.0) * 0.35);

  // a dark body under the matrix plus a glow-coloured fresnel rim
  float fres = pow(1.0 - z, 2.2);
  vec3 col = u_c_deep * 0.22 + glyphCol * glyph + u_c_glow * (fres * u_rim);

  col = pow(max(col, vec3(0.0)), vec3(u_contrast));

  // Surface-lit orb bounded by a mask: alpha IS coverage, so premultiply
  float a = mask;
  frag_color = vec4(col * a, a);
}
