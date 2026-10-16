// ORB-26 — "Coloured threads knotted in a mad mesh across a grid"
//
// Flutter (FragmentShader) port of the shadercn ORB-26 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-26/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_26.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/swirl/drift phases these uniforms
// carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_bulge;
uniform float u_contrast;
uniform float u_core;
uniform float u_drift;      // integrated drift phase (NOT a rate)
uniform float u_floor;
uniform float u_gain;
uniform float u_light;
uniform float u_pole;
uniform float u_pole_soft;
uniform float u_pulse;
uniform float u_radius;
uniform float u_rim;
uniform float u_scale;
uniform float u_sharp;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_split;
uniform float u_swirl;      // integrated swirl phase (NOT a rate)
uniform float u_warp;
uniform vec3 u_c_deep;
uniform vec3 u_c_hot;
uniform vec3 u_c_line;
uniform vec3 u_c_sheen;

out vec4 frag_color;

#define OCTAVES 9
#define TAU 6.28318530718

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// 2D rotation matrix — turns the wrapped plane. Matches the original rot2():
// WGSL mat2x2f(vec2(c, -s), vec2(s, c)).
mat2 rot2(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

vec3 latticeRender(vec2 fragCoord, float latticePole, float latticeSharp, float latticeGain) {
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  float R = max(u_radius, 0.001);

  // the dome: the front hemisphere of a unit ball, in screen space
  vec2 pl = uv / R;
  float z = sqrt(max(1.0 - dot(pl, pl), 0.0));
  vec3 n = vec3(pl, z);

  float t = u_speed;

  // Stereographic projection of the UNROTATED dome — all the motion below is
  // projection-safe 2D.
  vec2 p = n.xy / (n.z + 1.0 + u_bulge) * u_scale;

  // the plane turns while the lattice drifts across it, so the crazing
  // migrates over the glaze instead of sitting welded to it
  float sw = u_swirl;
  p = rot2(sw) * p;
  p = vec2(p.x + u_drift, p.y);

  // A fractional offset off the pattern origin. The listing carries the
  // resolution here; it cancels out of the pole term exactly but it does
  // keep the lattice off centre, and without something in its place a cell
  // corner sits pinned at the dead middle of the ball.
  p += vec2(0.37, 0.21);

  // the cell the sample starts in, fixed before the warp — everything the
  // pole term does is relative to THIS corner, not to wherever c wanders
  vec2 cell = floor(p);

  // Each cell knots on its own hashed phase, so the grid breathes instead
  // of pulsing as one sheet. The rate is a constant, not a slider: this
  // multiplies the integrated clock, and a slider there would jump the
  // phase of every cell on a state change.
  float breathe = 1.0 + u_pulse * sin(TAU * hash(cell) + t * 0.35);

  vec2 c = p;
  for (int j = 0; j < OCTAVES; j++) {
    float i = float(j) + 1.0;

    // The lattice pole, softened. d/(d*d+g) tracks 1/d away from the cell
    // corner and rolls over to a finite peak at it, so the phase stays
    // band-limited and the knot has a SIZE — u_pole_soft is that size.
    vec2 delta = cell - c;
    vec2 pole = delta / (delta * delta + vec2(u_pole_soft)) * (latticePole * breathe);

    c += cos(c.yx * i + pole + vec2(t)) * u_warp / i;
  }

  // The listing's tone map: a thin ridge every PI with an exponential
  // falloff. The per-channel offsets are kept as their original ratio
  // (0, 2, 1) so one slider widens the whole split.
  vec3 x = vec3(c.y) + vec3(0.0, 2.0, 1.0) * u_split;
  vec3 thread = exp(abs(sin(x)) * (-latticeSharp));

  float lev = dot(thread, vec3(1.0 / 3.0));

  // The exp() floor never reaches zero, so the shell is lit between the
  // threads by construction — the body colour is added under it rather
  // than filling a hole. The thread term stays PER-CHANNEL through the
  // palette multiply; collapsing it to lev first would throw away the
  // filament split.
  vec3 col = u_c_deep * u_floor;
  // The ramp between the two thread colours runs nearly the whole range of
  // lev deliberately.
  col += thread * mix(u_c_line, u_c_hot, smoothstep(0.12, 1.0, lev)) * latticeGain;

  // A tight second read of the same ridge, added on top: raising a value
  // that is already exp(-k*|sin|) to a high power is the same ridge at a
  // fraction of the width, which lands as a hot core inside each thread.
  // Taken from lev — the MEAN of the three channels — deliberately, so the
  // core is achromatic and lands only where all three filaments coincide.
  float core = lev * lev;
  core *= core;
  col += u_c_hot * (core * u_core);

  col = pow(max(col, vec3(0.0)), vec3(u_contrast));

  // dome shading keeps the ball a ball under the web
  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.72))), 0.0, 1.0);
  col *= 0.35 + u_light * lambert;

  // fresnel sheen: the glaze the threads are crazed into
  float fres = 1.0 - z;
  float fresCubed = fres * fres * fres;
  col += u_c_sheen * (u_rim * fresCubed);

  return col;
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  // Volume coupling: the user's voice tightens the knots, the agent's
  // thickens the threads and brightens them.
  float latticePole = u_pole * (1.0 + 0.8 * u_input_vol);
  float latticeSharp = u_sharp * (1.0 - 0.25 * u_output_vol);
  float latticeGain = u_gain * (0.85 + 0.4 * u_output_vol);

  float t = clamp((length(orbUv) - max(u_radius, 0.001) - 0.012) / -0.024, 0.0, 1.0);
  float mask = t * t * (3.0 - 2.0 * t);

  // Nothing outside the silhouette is ever visible, so skip the warps
  if (mask <= 0.0) {
    frag_color = vec4(0.0);
    return;
  }

  vec3 col = latticeRender(fragCoord, latticePole, latticeSharp, latticeGain);

  // Surface orb bounded by a mask: alpha IS coverage, so premultiply
  float a = mask;
  frag_color = vec4(max(col, vec3(0.0)) * a, a);
}
