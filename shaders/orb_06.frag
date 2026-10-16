// ORB-06 — "A hundred glowing lattices stacked through the ball, interfering"
//
// Flutter (FragmentShader) port of the shadercn ORB-06 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-06/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_06.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed phase these uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_bulge;
uniform float u_contrast;
uniform float u_depth;
uniform float u_drift;
uniform float u_exposure;
uniform float u_freq;
uniform float u_glow_size;
uniform float u_hue_rate;
uniform float u_light;
uniform float u_radius;
uniform float u_rim;
uniform float u_saturation;
uniform float u_scale;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform vec3 u_c_sheen;
uniform vec3 u_c_tint;

out vec4 frag_color;

#define LAYERS 100

// BT.601 luminance — the axis saturation works about it.
float luma(vec3 col) {
  return dot(col, vec3(0.299, 0.587, 0.114));
}

vec3 moireRender(vec2 fragCoord, float moireDrift, float moireGlow, float moireHue) {
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  float R = max(u_radius, 0.001);

  // the dome: the front hemisphere of a unit ball, in screen space
  vec2 pl = uv / R;
  float z = sqrt(max(1.0 - dot(pl, pl), 0.0));

  // integrated clock
  float t = u_speed;

  // The layer-zero projection: the plain stereographic wrap of the dome's
  // surface. Every deeper layer is this divided by its own denominator, so
  // the whole parallax below costs one ratio per layer.
  float bulge = 1.0 + u_bulge;
  float den0 = z + bulge;

  vec2 w = pl / den0 * u_scale;

  vec3 acc = vec3(0.0);

  for (int li = 0; li < LAYERS; li++) {
    float f = float(li) + 1.0;
    float layerT = f / float(LAYERS);

    // This layer's depth along the view ray, and the projection from the
    // point the ray has reached there. At depth 0 the denominator is den0
    // and the ratio is 1; deeper layers see the pattern from further
    // inside the ball, which spreads them at the limb and not at all
    // through the centre. That gradient is what shears the stack.
    float depth = layerT * u_depth;
    float denu = z - depth + bulge * sqrt(max(1.0 - 2.0 * depth * z + depth * depth, 0.0));
    vec2 q = w * (den0 / max(denu, 0.05));

    // One lattice. sin(q * k) vanishes on a rectangular grid of points and
    // the reciprocal of its length lights every one; the floor on that
    // length is the glow's radius, and without it the divide is by exactly
    // zero at every lattice point.
    vec2 k = sin(vec2(11.3, 12.87) + vec2(f)) / max(u_freq, 0.001);
    float g = max(length(sin(q * k)), moireGlow);

    // tint by layer index — depth through the stack reads as hue
    vec3 hue = cos(vec3(0.0, 1.0, 3.0) + vec3(f * moireHue)) + 1.1;

    acc += hue / g;

    // the listing's walk between layers: the stack is a hundred grids
    // each shifted a little further along a wandering path
    w += sin(w.yx + vec2(t)) * moireDrift;
  }

  // The knee: tanh(v*v/exposure) over an unnormalized sum of a hundred
  // layers, divided by the layer count first. The square is a contrast
  // squarer, not a tone map: it crushes the field between the glows.
  vec3 v = acc / float(LAYERS);
  vec3 col = tanh(v * v / max(u_exposure, 0.0001));
  col = pow(clamp(col, 0.0, 1.0), vec3(u_contrast));

  // saturation about luminance, then the tint
  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation) * u_c_tint;

  // Dome shading, kept gentle: the layers are emission seen THROUGH the
  // ball, so a hard lambert reads as a shadow thrown across the inside of
  // a lamp rather than as a lit surface.
  vec3 n = vec3(pl, z);
  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.72))), 0.0, 1.0);
  col *= 0.6 + u_light * lambert;

  float fres = 1.0 - z;
  float fresCubed = fres * fres * fres;
  col += u_c_sheen * (u_rim * fresCubed);

  return col;
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  // Volume coupling: the user's voice widens the walk between layers, the
  // agent's opens the glows and runs the hue through the stack faster.
  float moireDrift = u_drift * (1.0 + 0.6 * u_input_vol);
  float moireGlow = max(u_glow_size * (1.0 - 0.3 * u_output_vol), 0.002);
  float moireHue = u_hue_rate * (1.0 + 0.35 * u_output_vol);

  float t = clamp((length(orbUv) - max(u_radius, 0.001) - 0.012) / -0.024, 0.0, 1.0);
  float mask = t * t * (3.0 - 2.0 * t);

  // A hundred lattices per sample, none of them worth paying for outside
  // the silhouette.
  if (mask <= 0.0) {
    frag_color = vec4(0.0);
    return;
  }

  vec3 col = moireRender(fragCoord, moireDrift, moireGlow, moireHue);

  // Surface orb bounded by a mask: alpha IS coverage, so premultiply — the
  // opposite convention from the emissive orbs (see orb-31).
  frag_color = vec4(max(col, vec3(0.0)) * mask, mask);
}
