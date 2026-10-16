// ORB-05 — "Rainbow rings travelling through a lattice of lenses"
//
// Flutter (FragmentShader) port of the shadercn ORB-05 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-05/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_05.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated ring/swirl/slide phases these uniforms
// carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_bulge;
uniform float u_contrast;
uniform float u_floor_level;
uniform float u_freq;
uniform float u_gain;
uniform float u_lens;
uniform float u_light;
uniform float u_pole_soft;
uniform float u_radius;
uniform float u_rim;
uniform float u_ring;       // integrated ring-travel phase (NOT a rate)
uniform float u_saturation;
uniform float u_scale;
uniform float u_slide;      // integrated lattice-slide phase (NOT a rate)
uniform float u_spread;
uniform float u_swirl;      // integrated swirl phase (NOT a rate)
uniform vec3 u_c_tint;
uniform vec3 u_c_body;
uniform vec3 u_c_sheen;

out vec4 frag_color;

// BT.601 luminance — the axis saturation works about it.
float luma(vec3 col) {
  return dot(col, vec3(0.299, 0.587, 0.114));
}

// 2D rotation matrix — turns the lattice. Matches the original rot2():
// WGSL mat2x2f(vec2(c, -s), vec2(s, c)).
mat2 rot2(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

// Softened tangent. Equal to sin/cos wherever cos is not near zero, capped
// at 1/(2*sqrt(g)) where it is.
vec2 tanSoft(vec2 x, float g) {
  vec2 s = sin(x);
  vec2 c = cos(x);
  return s * c / (c * c + g);
}

vec3 causticRender(vec2 fragCoord, float causticSoft, float causticGain, float causticSpread) {
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  float R = max(u_radius, 0.001);

  // the dome: the front hemisphere of a unit ball, in screen space
  vec2 pl = uv / R;
  float z = sqrt(max(1.0 - dot(pl, pl), 0.0));

  // integrated clock: the rings travel
  float ring = u_ring;

  // stereographic wrap of the unrotated dome, as in orb-08 — the lens
  // lattice compresses toward the limb the way a texture on a sphere does
  vec2 p = pl / (z + 1.0 + u_bulge) * u_scale;

  // projection-safe 2D motion: the lattice turns and slides
  // integrated clock
  float sw = u_swirl;
  p = rot2(sw) * p;
  // integrated clock
  p += vec2(u_slide, u_slide * 0.6);

  // The lens lattice. Adding p back to its own tangent is what gives every
  // cell a different view instead of tiling one image.
  float L = length(tanSoft(p, causticSoft) * u_lens + p);

  // One cosine, three phases. The (0, .7, 1) sit well under a radian apart,
  // so the channels overlap through most of a band and only separate at its
  // shoulders — white cores with coloured edges.
  vec3 col = cos(vec3(0.0, 0.7, 1.0) * causticSpread + vec3(L * u_freq - ring));

  // the listing's clamp: half of every period is hard black, and that is
  // what makes these read as bands rather than as a gradient
  col = max(col, vec3(0.0)) * causticGain;

  col = pow(col, vec3(u_contrast));

  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation) * u_c_tint;

  // a dark body under the bands, so the black half of the cosine reads as
  // the ball rather than as a hole in it
  col += u_c_body * u_floor_level;

  // dome shading keeps the ball a ball under the lattice
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

  // Volume coupling: the user's voice lets the walls crowd tighter, the
  // agent's brightens the bands and opens the colour split.
  float causticSoft = max(u_pole_soft * (1.0 - 0.5 * u_input_vol), 0.0008);
  float causticGain = u_gain * (0.85 + 0.45 * u_output_vol);
  float causticSpread = u_spread * (1.0 + 0.5 * u_output_vol);

  float t = clamp((length(orbUv) - max(u_radius, 0.001) - 0.012) / -0.024, 0.0, 1.0);
  float mask = t * t * (3.0 - 2.0 * t);

  if (mask <= 0.0) {
    frag_color = vec4(0.0);
    return;
  }

  vec3 col = causticRender(fragCoord, causticSoft, causticGain, causticSpread);

  // Surface orb bounded by a mask: alpha IS coverage, so premultiply — the
  // opposite convention from the emissive orbs (see orb-31).
  frag_color = vec4(max(col, vec3(0.0)) * mask, mask);
}
