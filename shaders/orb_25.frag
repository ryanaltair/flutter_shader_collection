// ORB-25 — "A warped field drawn with its own steepness as creases"
//
// Flutter (FragmentShader) port of the shadercn ORB-25 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-25/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_25.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/drift/swirl phases these uniforms
// carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_blur;
uniform float u_bulge;
uniform float u_contrast;
uniform float u_drift;      // integrated drift phase (NOT a rate)
uniform float u_edge_gain;
uniform float u_exposure;
uniform float u_floor_level;
uniform float u_fringe;
uniform float u_light;
uniform float u_radius;
uniform float u_rim;
uniform float u_ripple;
uniform float u_saturation;
uniform float u_scale;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_swirl;      // integrated swirl phase (NOT a rate)
uniform float u_warp;
uniform float u_zoom;
uniform vec3 u_c_body;
uniform vec3 u_c_sheen;
uniform vec3 u_c_tint;

out vec4 frag_color;

#define OCTAVES 8

// BT.601 luminance — the axis saturation works about it.
float luma(vec3 col) {
  return dot(col, vec3(0.299, 0.587, 0.114));
}

// 2D rotation matrix — turns the wrapped plane. Matches the original rot2():
// WGSL mat2x2f(vec2(c, -s), vec2(s, c)).
mat2 rot2(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

// The whole chain for one pixel centre: dome, stereographic wrap, then the
// eight-octave warp. Called three times per sample so the derivative below
// can be differenced — fwidth is unavailable.
vec2 creaseField(vec2 fragCoord, float t, float drift, float sw, float creaseWarp) {
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec2 pl = uv / max(u_radius, 0.001);
  float z = sqrt(max(1.0 - dot(pl, pl), 0.0));

  vec2 p = pl / (z + 1.0 + u_bulge) * u_scale;
  p = rot2(sw) * p;
  p += vec2(drift);

  // The listing's matrix, decomposed. mat2x2(vec2(6,-8), vec2(8,6))/9 is
  // (10/9) * mat2x2(vec2(.6,-.8), vec2(.8,.6)), and that second factor is a
  // true rotation because 6-8-10 is a Pythagorean triple — so the octave
  // transform is a rotation through the 3-4-5 angle times a clean zoom.
  mat2 octaveRot = mat2(0.6, -0.8, 0.8, 0.6);
  for (int i = 0; i < OCTAVES; i++) {
    float fi = float(i) + 1.0;
    p += sin(p + vec2(t + fi)) * creaseWarp;
    p = (octaveRot * p) * u_zoom;
  }

  return p;
}

vec3 creaseRender(vec2 fragCoord, float creaseWarp, float creaseGain) {
  float t = u_speed;
  float drift = u_drift;
  float sw = u_swirl;

  // The three taps the difference needs. u_blur is how far apart they sit:
  // at one pixel this is fwidth exactly, and wider is a deliberate blur —
  // the derivative of a folded field is a hairline, and a rim wants width.
  vec2 p0 = creaseField(fragCoord, t, drift, sw, creaseWarp);
  vec2 px = creaseField(fragCoord + vec2(u_blur, 0.0), t, drift, sw, creaseWarp);
  vec2 py = creaseField(fragCoord + vec2(0.0, u_blur), t, drift, sw, creaseWarp);

  // fwidth, by hand and once per channel. The sum of the absolute
  // differences on each axis is exactly what the built-in returns — but
  // taking it three times at slightly offset ripple phases puts each
  // channel's rim in a slightly different place, which is where the warm
  // and cool fringes on the edges come from.
  float m0;
  float m1;
  float m2;
  {
    float ph = 0.0;
    vec2 v0 = sin(p0 * u_ripple + vec2(ph));
    vec2 delta = abs(sin(px * u_ripple + vec2(ph)) - v0) + abs(sin(py * u_ripple + vec2(ph)) - v0);
    m0 = tanh((length(delta) * creaseGain) / max(u_exposure, 0.001));
  }
  {
    float ph = u_fringe;
    vec2 v0 = sin(p0 * u_ripple + vec2(ph));
    vec2 delta = abs(sin(px * u_ripple + vec2(ph)) - v0) + abs(sin(py * u_ripple + vec2(ph)) - v0);
    m1 = tanh((length(delta) * creaseGain) / max(u_exposure, 0.001));
  }
  {
    float ph = 2.0 * u_fringe;
    vec2 v0 = sin(p0 * u_ripple + vec2(ph));
    vec2 delta = abs(sin(px * u_ripple + vec2(ph)) - v0) + abs(sin(py * u_ripple + vec2(ph)) - v0);
    m2 = tanh((length(delta) * creaseGain) / max(u_exposure, 0.001));
  }
  vec3 e = vec3(m0, m1, m2);

  e = pow(clamp(e, 0.0, 1.0), vec3(u_contrast));

  vec3 col = u_c_tint * e;

  // a dark body under the filigree, so the flat regions read as the ball
  col += u_c_body * u_floor_level;

  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation);

  // dome shading keeps the ball a ball under the folds
  vec2 pl = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y) / max(u_radius, 0.001);
  float z = sqrt(max(1.0 - dot(pl, pl), 0.0));
  vec3 n = vec3(pl, z);
  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.72))), 0.0, 1.0);
  col *= 0.62 + u_light * lambert;

  float fres = 1.0 - z;
  float fresCubed = fres * fres * fres;
  col += u_c_sheen * (u_rim * fresCubed);

  return col;
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  // Volume coupling: the user's voice folds the field harder, the agent's
  // steepens what counts as a crease.
  float creaseWarp = u_warp * (1.0 + 0.4 * u_input_vol);
  float creaseGain = u_edge_gain * (1.0 + 0.5 * u_output_vol);

  float t = clamp((length(orbUv) - max(u_radius, 0.001) - 0.012) / -0.024, 0.0, 1.0);
  float mask = t * t * (3.0 - 2.0 * t);

  // Twenty-four warp steps per sample — none of them worth paying for
  // outside the silhouette.
  if (mask <= 0.0) {
    frag_color = vec4(0.0);
    return;
  }

  vec3 col = creaseRender(fragCoord, creaseWarp, creaseGain);

  // Surface orb bounded by a mask: alpha IS coverage, so premultiply
  float a = mask;
  frag_color = vec4(max(col, vec3(0.0)) * a, a);
}
