// ORB-27 — "Weather radar mosaic, coloured pixel fronts"
//
// Flutter (FragmentShader) port of the shadercn ORB-27 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-27/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_27.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated time/speed/spin phases these uniforms
// carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_time;       // seconds since start, halved
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_cells;
uniform float u_curve;
uniform float u_density;
uniform float u_dither;
uniform float u_dot;
uniform float u_freq;
uniform float u_grain;
uniform float u_hi;
uniform float u_light;
uniform float u_lo;
uniform float u_radius;
uniform float u_rim;
uniform float u_scale;
uniform float u_sparse;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_spin;       // integrated spin phase (NOT a rate)
uniform float u_swirl;
uniform float u_twinkle;
uniform float u_vortex;
uniform float u_warp;
uniform vec3 u_c_c0;
uniform vec3 u_c_c1;
uniform vec3 u_c_c2;
uniform vec3 u_c_c3;
uniform vec3 u_c_c4;
uniform vec3 u_c_c5;
uniform vec3 u_c_c6;
uniform vec3 u_c_paper;

out vec4 frag_color;

#define VORTICES 6
#define FBM3_OCT 4

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// 3D value noise. The prelude's noise is 2D, and a 2D field wrapped onto
// the ball has to be projected — and every projection either distorts
// somewhere or seams somewhere, which is exactly what the roll dragged
// into view. Evaluating the field ON the sphere's own points needs
// nothing projected: the roll is just a rotation of the sample point.
float hash3(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash3(i);
  float n100 = hash3(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash3(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash3(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash3(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash3(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash3(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash3(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

float fbm3(vec3 p) {
  vec3 q = p;
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < FBM3_OCT; i++) {
    v += a * noise3(q);
    q = q * 2.03 + vec3(11.7, 7.3, 3.1);
    a *= 0.5;
  }
  return v;
}

// rotate v about the unit axis k by angle a (Rodrigues)
vec3 rotateAbout(vec3 v, vec3 k, float a) {
  float c = cos(a);
  float s = sin(a);
  return v * c + cross(k, v) * s + k * (dot(k, v) * (1.0 - c));
}

// the precipitation intensity, 0..1, at a point of the unit sphere
float intensity(vec3 sp, float t, float radarLoNow) {
  vec3 q = sp;
  // The vortices: hashed points on the sphere, each twisting the space
  // around itself — a rotation about the axis through it, by an angle
  // that falls off with the angular distance, alternating in sense. The
  // centres wander slowly so no spiral sits still.
  for (int k = 0; k < VORTICES; k++) {
    float fk = float(k);
    vec3 c = normalize(vec3(
      hash(vec2(fk * 3.7, 1.1)) - 0.5,
      hash(vec2(fk * 5.9, 2.3)) - 0.5,
      hash(vec2(fk * 7.1, 4.9)) - 0.5
    ));
    c = rotateAbout(c, vec3(0.0, 1.0, 0.0), sin(t * 0.09 + fk * 1.7) * 0.25);
    float ang = acos(clamp(dot(q, c), -1.0, 1.0));
    float fall = exp((-ang * ang) / (u_vortex * u_vortex));
    float a = u_swirl * fall * (mod(fk, 2.0) < 0.5 ? 1.0 : -1.0);
    q = rotateAbout(q, c, a);
  }

  // bend, then drift the noise through the twisted space
  vec3 w = vec3(
    noise3(q * 1.3 + vec3(2.1)),
    noise3(q * 1.3 + vec3(7.3)),
    noise3(q * 1.3 + vec3(4.4))
  ) - 0.5;
  q += w * u_warp;
  vec3 pq = q * u_freq + vec3(t * 0.22, -t * 0.13, t * 0.07);

  // Two scales multiplied, not added: a broad mask decides WHERE the storms
  // are, a finer field gives each one a core and ragged edges.
  float big = clamp((fbm3(pq) - 0.5) * 3.0 + 0.5, 0.0, 1.0);
  float fine = clamp((fbm3(pq * 2.6 + vec3(4.7)) - 0.5) * 2.4 + 0.5, 0.0, 1.0);
  float f = big * (0.55 + 0.45 * fine);

  f = clamp((f - radarLoNow) / max(u_hi - radarLoNow, 0.01), 0.0, 1.0);
  // a response curve: the top classes are the rare peaks of a real map
  return pow(f, u_curve);
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  // input lowers the window (more of the field reads as weather), output
  // fills the dots in
  float radarLoNow = u_lo - 0.08 * u_input_vol;
  float radarDensityNow = u_density * (1.0 + 0.5 * u_output_vol);

  float rd = length(orbUv);
  float R = u_radius;
  float t = clamp((rd - R - 0.012) / -0.024, 0.0, 1.0);
  float mask = t * t * (3.0 - 2.0 * t);

  if (mask <= 0.0) {
    frag_color = vec4(0.0);
    return;
  }

  vec2 pl = orbUv / R;
  float r2 = dot(pl, pl);
  float z = sqrt(max(1.0 - r2, 0.0));
  vec3 n = vec3(pl, z);

  // integrated clock: the weather drifts
  float t2 = u_speed;

  // The pixel grid lives on the UNROLLED dome: a stereographic wrap of the
  // front hemisphere as it faces the viewer, which compresses gently toward
  // the limb and never changes. The picture rolls underneath it — the
  // pixels are the screen, the weather is what is on it.
  vec2 st = n.xy / (1.3 + n.z) * u_scale;
  vec2 g = st * u_cells;
  vec2 cell = floor(g);
  vec2 fr = fract(g) - 0.5;

  // the cell centre, back on the dome: invert the wrap, then roll it and
  // read the field there — once per cell, so every dot is one flat colour
  vec2 v = (cell + 0.5) / u_cells / u_scale;
  float vv = dot(v, v);
  float A = vv + 1.0;
  float B = 2.6 * vv;
  float C = 1.69 * vv - 1.0;
  float zc = (-B + sqrt(max(B * B - 4.0 * A * C, 0.0))) / (2.0 * A);
  vec3 nc = vec3(v * (1.3 + zc), zc);
  float cr = cos(u_spin);
  float sr = sin(u_spin);
  vec3 spc = vec3(nc.x * cr - nc.z * sr, nc.y, nc.x * sr + nc.z * cr);

  float f = intensity(spc, t2, radarLoNow);

  // dither the class boundaries with a per-cell hash, then quantize into
  // the legend's seven classes. The bands are NOT even: red is broad and
  // green thin, as on the reference, and magenta is the rare peak.
  float h = hash(cell + vec2(11.7));
  float fd = clamp(f + (h - 0.5) * u_dither, 0.0, 1.0);
  float cls = 0.0;
  cls += step(0.1, fd);
  cls += step(0.26, fd);
  cls += step(0.38, fd);
  cls += step(0.46, fd);
  cls += step(0.78, fd);
  cls += step(0.94, fd);

  // dropout: density rises with the intensity; the hash re-rolls slowly
  float frame = floor(u_time * u_twinkle);
  float roll = hash(cell + vec2(frame * 3.7, -frame * 1.3));
  float density = mix(u_sparse, 1.0, smoothstep(0.0, 0.6, f)) * radarDensityNow;
  float keep = step(roll, density);

  // the dot: a square inset in its cell
  float dsq = max(abs(fr.x), abs(fr.y));
  float dotMask = 1.0 - smoothstep(u_dot - 0.06, u_dot + 0.06, dsq);

  // the class palette
  vec3 ink = u_c_c0;
  ink = (cls > 0.5 && cls < 1.5) ? u_c_c1 : ink;
  ink = (cls > 1.5 && cls < 2.5) ? u_c_c2 : ink;
  ink = (cls > 2.5 && cls < 3.5) ? u_c_c3 : ink;
  ink = (cls > 3.5 && cls < 4.5) ? u_c_c4 : ink;
  ink = (cls > 4.5 && cls < 5.5) ? u_c_c5 : ink;
  ink = (cls > 5.5) ? u_c_c6 : ink;

  vec3 col = mix(u_c_paper, ink, dotMask * keep);

  // paper grain, so the flats are not dead
  col *= 1.0 + (hash(floor(fragCoord / 2.0) + vec2(frame)) - 0.5) * u_grain;

  // dome shading keeps the ball a ball under the mosaic
  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0, 1.0);
  col *= 1.0 - u_light * (1.0 - lambert);
  float fres = pow(1.0 - z, 3.0);
  col = mix(col, u_c_c0, fres * u_rim);

  // Surface orb bounded by a mask: alpha IS coverage, so premultiply — the
  // opposite convention from the emissive orbs (see orb-31).
  float a = mask;
  frag_color = vec4(max(col, vec3(0.0)) * a, a);
}
