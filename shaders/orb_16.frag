// ORB-16 — "An underwater sunlit caustic net, fringed at the edges"
//
// Flutter (FragmentShader) port of the shadercn ORB-16 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-16/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_16.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated spin/flow/swellRate phases these
// uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_contrast;
uniform float u_edge;
uniform float u_flow;       // integrated flow phase (NOT a rate)
uniform float u_gain;
uniform float u_light;
uniform float u_radius;
uniform float u_rim;
uniform float u_scale;
uniform float u_spin;       // integrated spin phase (NOT a rate)
uniform float u_split;
uniform float u_swell;
uniform float u_swell_rate; // integrated swell phase (NOT a rate)
uniform float u_warp;
uniform vec3 u_c_deep;
uniform vec3 u_c_sheen;
uniform vec3 u_c_sun;

out vec4 frag_color;

// The water. The plane is folded on its own sines three times, each octave
// at a literal frequency, so the ripples refract the net rather than scroll it.
vec2 fold(vec2 p, float t, float warp) {
  vec2 q = p;
  q += sin(q.yx * 1.31 + vec2(t * 0.9, -t * 0.7)) * warp;
  q += sin(q.yx * 2.17 + vec2(-t * 1.3, t * 1.1)) * warp * 0.6;
  q += sin(q.yx * 3.73 + vec2(t * 1.9, t * 1.6)) * warp * 0.35;
  return q;
}

// The light. Two crossed families of crest lines, sharpened by the edge
// exponent. Their product is added back so crossings burn hotter.
float net(vec2 p, float t, float warp) {
  vec2 q = fold(p, t, warp);
  vec2 s = vec2(1.0) - abs(sin(q));
  vec2 l = pow(s, vec2(u_edge));
  // Normalised to [0, 1]: the sum peaks at four on a crossing; bounded so
  // the sun colour survives the knee at the foci.
  return (l.x + l.y + 2.0 * l.x * l.y) * 0.25;
}

// Triplanar: the plane field read on the three axis planes of the surface
// direction and blended by the fourth power of each component. No pole, no seam.
float netOn(vec3 sp, float t, float warp) {
  vec3 w = sp * sp;
  w *= w;
  w /= (w.x + w.y + w.z);
  float k = u_scale;
  return w.x * net(sp.yz * k, t, warp) +
      w.y * net(sp.zx * k, t, warp) +
      w.z * net(sp.xy * k, t, warp);
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  float rd = length(uv);
  float R = u_radius;
  float t = clamp((rd - R - 0.012) / -0.024, 0.0, 1.0);
  float mask = t * t * (3.0 - 2.0 * t);
  if (mask <= 0.0) {
    frag_color = vec4(0.0);
    return;
  }

  vec2 pl = uv / R;
  float z = sqrt(max(1.0 - dot(pl, pl), 0.0));
  vec3 n = vec3(pl, z);

  float cr = cos(u_spin);
  float sr = sin(u_spin);
  vec3 sp = vec3(n.x * cr - n.z * sr, n.y, n.x * sr + n.z * cr);

  float t2 = u_flow;

  // The surge: a round trip on an integrated clock through cos, so it eases
  // through both ends and never wraps. It lifts the gain and deepens the
  // ripple together. Agent voice brightens the light; user input deepens water.
  float surge = 0.5 - 0.5 * cos(u_swell_rate);
  float gainNow = u_gain * mix(1.0, 0.55 + 0.9 * surge, u_swell) * (0.8 + 0.5 * u_output_vol);
  float causticWarp = u_warp * mix(1.0, 0.8 + 0.4 * surge, u_swell) * (1.0 + 0.35 * u_input_vol);

  // Three moments of the fold, one per channel. The LIGHT is the net's
  // luminance under the sun colour; per-channel disagreement is split off
  // as a zero-mean residual scaled by u_split — rainbow as a fringe.
  float ds = 0.09;
  vec3 c = vec3(
    netOn(sp, t2 + ds, causticWarp),
    netOn(sp, t2, causticWarp),
    netOn(sp, t2 - ds, causticWarp)
  );
  float cLum = dot(c, vec3(1.0 / 3.0));
  vec3 fringe = (c - cLum) * u_split;

  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0, 1.0);
  float fres = pow(1.0 - z, 2.5);

  vec3 col = u_c_deep * (0.35 + 0.65 * u_light * lambert);
  col += (u_c_sun * cLum + fringe) * (gainNow * (0.55 + 0.45 * lambert));
  col += u_c_sheen * (u_rim * fres);

  col = pow(max(col, vec3(0.0)), vec3(u_contrast));
  col = tanh(col);

  float alpha = mask;
  // Surface orb bounded by a mask: alpha IS coverage, so premultiply.
  frag_color = vec4(max(col, vec3(0.0)) * alpha, alpha);
}
