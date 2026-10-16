// ORB-09 — "Rainbow rings of light as the sphere's latitudes"
//
// Flutter (FragmentShader) port of the shadercn ORB-09 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-09/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_09.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/spin phases these uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_contrast;
uniform float u_exposure;
uniform float u_fringe;
uniform float u_fringe_soft;
uniform float u_glow;
uniform float u_inner;
uniform float u_light;
uniform float u_line_soft;
uniform float u_radius;
uniform float u_rim;
uniform float u_ring_phase;
uniform float u_saturation;
uniform float u_scale;
uniform float u_seed;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_spin;       // integrated spin phase (NOT a rate)
uniform float u_tilt;
uniform float u_warp;
uniform vec3 u_c_sheen;
uniform vec3 u_c_tint;

out vec4 frag_color;

#define RINGS 10
#define TURB 9

// BT.601 luminance — the axis saturation works about it.
float luma(vec3 col) {
  return dot(col, vec3(0.299, 0.587, 0.114));
}

vec3 irisRender(vec2 fragCoord, float irisWarp, float irisGlow, float irisFringe) {
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  float R = max(u_radius, 0.001);

  // the dome: the front hemisphere of a unit ball, in screen space
  vec2 pl = uv / R;
  float z = sqrt(max(1.0 - dot(pl, pl), 0.0));
  vec3 n = vec3(pl, z);

  // integrated clock
  float t = u_speed;

  // tilt about X, then roll about Y on its own integrated clock
  float ct = cos(u_tilt);
  float st = sin(u_tilt);
  vec3 sp = vec3(n.x, n.y * ct - n.z * st, n.y * st + n.z * ct);
  float cr = cos(u_spin);
  float sr = sin(u_spin);
  sp = vec3(sp.x * cr - sp.z * sr, sp.y, sp.x * sr + sp.z * cr);

  // Radius becomes the polar angle from the dome's axis, so ring i lands
  // on the latitude at angle i / u_scale and the rings crowd toward the
  // limb the way a globe's latitudes do. acos is defined on the whole
  // sphere, so the roll above can put the axis anywhere — including behind
  // the visible face, which sweeps the outer rings into view over the limb.
  float pol = acos(clamp(sp.z, -1.0, 1.0));
  vec2 dir = sp.xy / max(length(sp.xy), 1e-4);
  vec2 p = dir * (pol * u_scale);

  vec3 acc = vec3(0.0);

  for (int ri = 0; ri < RINGS; ri++) {
    float i = float(ri) + 1.0;

    // Each ring re-warps the ORIGINAL point with its own seed, exactly as
    // the listing does — this loop is why the rings tear differently
    // instead of nesting like tree rings.
    vec2 v = p;
    for (int j = 0; j < TURB; j++) {
      float f = float(j) + 1.0;
      v += sin(ceil(v * f + vec2(i * u_seed)) - vec2(t * 0.5)) * irisWarp / f;
    }

    float l = length(v) - i;

    // the asymmetric absolute value, with the floor doubling as the line
    // width — a wider floor is a fatter, softer wavefront
    float side = max(max(l, -u_inner * l), u_line_soft);

    // The hue sweep, softened. l/(l*l+g) tracks 1/l off the ring and rolls
    // over to a finite peak on it, so the rainbow compresses into a fringe
    // of finite width instead of an aliased band.
    float fr = (irisFringe * l) / (l * l + u_fringe_soft);
    vec3 hue = cos(vec3(0.0, 1.0, 2.0) + vec3(t - i * u_ring_phase + fr)) + 1.1;

    acc += hue * (irisGlow / side);
  }

  // the listing's tanh knee, with the divisor exposed
  vec3 col = tanh(acc / max(u_exposure, 0.001));
  col = pow(clamp(col, 0.0, 1.0), vec3(u_contrast));

  // saturation about luminance, then the tint
  float lum = luma(col);
  col = mix(vec3(lum), col, u_saturation) * u_c_tint;

  // dome shading keeps the ball a ball under the rings — gentler than the
  // sibling orbs use, because these rings are emission and a hard lambert
  // reads as a shadow thrown across a light source
  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.72))), 0.0, 1.0);
  col *= 0.55 + u_light * lambert;

  float fres = 1.0 - z;
  float fresCubed = fres * fres * fres;
  col += u_c_sheen * (u_rim * fresCubed);

  return col;
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  // Volume coupling: the user's voice tears the rings harder, the agent's
  // brightens them and opens the rainbow fringe.
  float irisWarp = u_warp * (1.0 + 0.5 * u_input_vol);
  float irisGlow = u_glow * (0.85 + 0.5 * u_output_vol);
  float irisFringe = u_fringe * (1.0 + 0.6 * u_output_vol);

  float t = clamp((length(orbUv) - max(u_radius, 0.001) - 0.012) / -0.024, 0.0, 1.0);
  float mask = t * t * (3.0 - 2.0 * t);

  // Ninety sines per sample — none of them worth paying for outside the
  // silhouette.
  if (mask <= 0.0) {
    frag_color = vec4(0.0);
    return;
  }

  vec3 col = irisRender(fragCoord, irisWarp, irisGlow, irisFringe);

  // Surface orb bounded by a mask: alpha IS coverage, so premultiply — the
  // opposite convention from the emissive orbs (see orb-31).
  frag_color = vec4(max(col, vec3(0.0)) * mask, mask);
}
