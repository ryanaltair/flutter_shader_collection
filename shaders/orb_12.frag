// ORB-12 — "Glossy toy bricks in a ball, rebuilding itself while thinking"
//
// Flutter (FragmentShader) port of the shadercn ORB-12 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-12/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_12.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated spin/rebuild phases these uniforms
// carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_contrast;
uniform float u_gain;
uniform float u_gap;
uniform float u_gloss;
uniform float u_light;
uniform float u_patch;
uniform float u_radius;
uniform float u_rebuild;    // integrated rebuild phase (NOT a rate)
uniform float u_seam;
uniform float u_spin;       // integrated spin phase (NOT a rate)
uniform float u_stud;
uniform float u_studs;
uniform float u_tilt;
uniform vec3 u_c_brick_a;
uniform vec3 u_c_brick_b;
uniform vec3 u_c_brick_c;
uniform vec3 u_c_brick_d;
uniform vec3 u_c_brick_e;

out vec4 frag_color;

#define STEPS 96

// 2D rotation matrix — tumbles the ray into object space. Matches the
// original rot2(): WGSL mat2x2f(vec2(c, -s), vec2(s, c)).
mat2 rot2(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

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

struct BrickHit {
  vec3 bid;
  float off;
  float orient;
};

// Which 2x4 brick owns this stud cell? Layers alternate their long axis
// and every (layer, row) course staggers by a hashed offset — brickwork
// bonding, so vertical seams never stack.
BrickHit lgBrick(vec3 cellIdx) {
  BrickHit hit;
  hit.orient = cellIdx.y - 2.0 * floor(cellIdx.y / 2.0);
  float lc = hit.orient < 0.5 ? cellIdx.x : cellIdx.z;
  float sc = hit.orient < 0.5 ? cellIdx.z : cellIdx.x;
  float srow = floor(sc / 2.0);
  hit.off = floor(hash(vec2(cellIdx.y * 3.17, srow * 7.31)) * 4.0);
  hit.bid = vec3(
    floor((lc + hit.off) / 4.0),
    cellIdx.y,
    srow + hit.orient * 913.0
  );
  return hit;
}

// Inside the ball, minus bricks currently blinked out of the outer two
// courses. Interior cells skip the brick lookup.
float lgSolid(vec3 cc, vec3 cell, float gap) {
  float r = length(cc);
  if (r >= 1.0) {
    return 0.0;
  }
  if (r > 1.0 - 2.2 * cell.y) {
    BrickHit brick = lgBrick(floor(cc / cell));
    float blink = fract(
      hash(brick.bid.xy * 0.173 + vec2(brick.bid.z * 0.089)) + u_rebuild * 0.03
    );
    if (blink < gap) {
      return 0.0;
    }
  }
  return 1.0;
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  // Agent output stokes the sheen and the gain; user input brightens the key light.
  float glossNow = u_gloss * (0.7 + 0.9 * u_output_vol);
  float gainNow = u_gain * (0.92 + 0.25 * u_output_vol);
  float lightNow = u_light * (1.0 + 0.3 * u_input_vol);

  float pitch = 2.0 / clamp(u_studs, 8.0, 48.0);
  vec3 cell = vec3(pitch, pitch * 1.2, pitch);
  float gap = clamp(u_gap, 0.0, 0.9);

  float bound = 1.0 + length(cell) * 0.5 + 0.001;

  vec2 duv = uv / u_radius;
  vec3 ro = vec3(duv.x * bound, duv.y * bound, 2.6);
  vec3 rd = vec3(0.0, 0.0, -1.0);

  // rotate the RAY into object space (inverse tumble) — the lattice stays
  // axis-aligned and the studs stay up while the ball turns
  mat2 tiltM = rot2(u_tilt);
  mat2 spinM = rot2(-u_spin);
  vec2 roT = tiltM * vec2(ro.y, ro.z);
  ro = vec3(ro.x, roT);
  vec2 roS = spinM * vec2(ro.x, ro.z);
  ro = vec3(roS.x, ro.y, roS.y);
  vec2 rdT = tiltM * vec2(rd.y, rd.z);
  rd = vec3(rd.x, rdT);
  vec2 rdS = spinM * vec2(rd.x, rd.z);
  rd = vec3(rdS.x, rd.y, rdS.y);
  vec3 Lo = normalize(vec3(-0.5, 0.7, 0.55));
  vec2 loT = tiltM * vec2(Lo.y, Lo.z);
  Lo = vec3(Lo.x, loT);
  vec2 loS = spinM * vec2(Lo.x, Lo.z);
  Lo = vec3(loS.x, Lo.y, loS.y);
  vec3 Vo = vec3(0.0, 0.0, 1.0);
  vec2 voT = tiltM * vec2(Vo.y, Vo.z);
  Vo = vec3(Vo.x, voT);
  vec2 voS = spinM * vec2(Vo.x, Vo.z);
  Vo = vec3(voS.x, Vo.y, voS.y);

  vec3 sgn = vec3(
    rd.x >= 0.0 ? 1.0 : -1.0,
    rd.y >= 0.0 ? 1.0 : -1.0,
    rd.z >= 0.0 ? 1.0 : -1.0
  );
  rd = normalize(sgn * max(abs(rd), vec3(1e-4)));

  float b = dot(rd, ro);
  float c = dot(ro, ro) - bound * bound;
  float disc = b * b - c;
  if (disc < 0.0) {
    frag_color = vec4(0.0);
    return;
  }
  float sq = sqrt(disc);
  vec3 p0 = ro + rd * (-b - sq + pitch * 0.001);
  float tSpan = 2.0 * sq;

  vec3 vp = floor(p0 / cell);
  vec3 tDelta = cell / abs(rd);
  vec3 tMax = ((vp + step(vec3(0.0), rd)) * cell - p0) / rd;

  float hitF = 0.0;
  vec3 mask = vec3(0.0, 0.0, 1.0);
  float tCur = 0.0;

  for (int i = 0; i < STEPS; i++) {
    if (lgSolid((vp + 0.5) * cell, cell, gap) > 0.5) {
      hitF = 1.0;
      break;
    }
    if (tMax.x < tMax.y && tMax.x < tMax.z) {
      tCur = tMax.x;
      tMax = vec3(tMax.x + tDelta.x, tMax.y, tMax.z);
      vp = vec3(vp.x + sgn.x, vp.y, vp.z);
      mask = vec3(1.0, 0.0, 0.0);
    } else if (tMax.y < tMax.z) {
      tCur = tMax.y;
      tMax = vec3(tMax.x, tMax.y + tDelta.y, tMax.z);
      vp = vec3(vp.x, vp.y + sgn.y, vp.z);
      mask = vec3(0.0, 1.0, 0.0);
    } else {
      tCur = tMax.z;
      tMax = vec3(tMax.xy, tMax.z + tDelta.z);
      vp = vec3(vp.xy, vp.z + sgn.z);
      mask = vec3(0.0, 0.0, 1.0);
    }
    if (tCur > tSpan) {
      break;
    }
  }

  if (hitF < 0.5) {
    frag_color = vec4(0.0);
    return;
  }

  vec3 cc = (vp + 0.5) * cell;
  float r = length(cc);
  vec3 dir = cc / max(r, 1e-4);
  BrickHit brick = lgBrick(vp);
  vec3 n = mask * sgn * -1.0;
  vec3 hp = p0 + rd * tCur;

  // Per-brick hash picks one of five plastic colours. The patch parameter
  // slides the pick toward a smooth field over the sphere: 0 is confetti,
  // 1 is moulded colour regions.
  float cph = hash(brick.bid.xy * 1.37 + vec2(brick.bid.z * 0.91));
  float rn = noise(dir.xy * 2.6 + vec2(7.0)) * 0.5 + noise(dir.yz * 2.6 + vec2(13.0)) * 0.5;
  rn = clamp(0.5 + (rn - 0.5) * 2.2, 0.0, 0.999);
  float idx = floor(clamp(mix(cph, rn, clamp(u_patch, 0.0, 1.0)), 0.0, 0.999) * 5.0);
  vec3 albedo = idx < 3.5
      ? (idx < 2.5 ? (idx < 1.5 ? (idx < 0.5 ? u_c_brick_a : u_c_brick_b) : u_c_brick_c) : u_c_brick_d)
      : u_c_brick_e;
  albedo *= 0.93 + 0.14 * hash(brick.bid.xy * 0.53 + vec2(brick.bid.z * 1.7));

  // Seams: distance to the nearest BRICK boundary along each lattice axis.
  // Only the two axes tangent to the struck face draw.
  vec3 sp = hp / cell;
  float lcC = brick.orient < 0.5 ? sp.x : sp.z;
  float scC = brick.orient < 0.5 ? sp.z : sp.x;
  float u4 = fract((lcC + brick.off) / 4.0);
  float v2 = fract(scC / 2.0);
  float wY = fract(sp.y);
  float dL = min(u4, 1.0 - u4) * 4.0 * pitch;
  float dS = min(v2, 1.0 - v2) * 2.0 * pitch;
  float dY = min(wY, 1.0 - wY) * cell.y;
  float seamD = 0.0;
  if (mask.y > 0.5) {
    seamD = min(dL, dS);
  } else if (mask.x > 0.5) {
    seamD = min(dY, brick.orient < 0.5 ? dS : dL);
  } else {
    seamD = min(dY, brick.orient < 0.5 ? dL : dS);
  }
  float seam = (1.0 - smoothstep(0.0, 0.07 * pitch, seamD)) * clamp(u_seam, 0.0, 1.0);

  vec3 nEff = n;
  float studF = 0.0;
  float shadowF = 0.0;
  float engrave = 0.0;
  float studAmt = clamp(u_stud, 0.0, 1.0);
  if (mask.y > 0.5 && n.y > 0.5) {
    vec2 cuv = fract(hp.xz / pitch) - 0.5;
    float sd = length(cuv);
    float rim = smoothstep(0.14, 0.29, sd) * (1.0 - smoothstep(0.29, 0.335, sd));
    vec3 tiltN = normalize(vec3(cuv.x, 0.42, cuv.y));
    nEff = normalize(mix(n, tiltN, rim * studAmt));
    studF = 1.0 - smoothstep(0.285, 0.33, sd);
    vec2 lxz = normalize(Lo.xz + vec2(1e-5));
    float away = clamp(dot(normalize(cuv + vec2(1e-5)), -lxz), 0.0, 1.0);
    shadowF = smoothstep(0.47, 0.335, sd) * (1.0 - studF) * (0.35 + 0.65 * away);
    engrave = smoothstep(0.11, 0.135, sd) * (1.0 - smoothstep(0.155, 0.18, sd)) * studF;
  }

  float lam = clamp(dot(nEff, Lo), 0.0, 1.0);
  float wrap = clamp(dot(dir, Lo) * 0.5 + 0.5, 0.0, 1.0);
  float depthDim = mix(1.0, 0.55, clamp((1.0 - r) / (3.0 * cell.y), 0.0, 1.0));
  float shade = (0.34 + 0.42 * wrap * wrap + 0.8 * lam * lightNow) * depthDim;

  vec3 col = albedo * shade * (1.0 + 0.1 * studF);
  col *= 1.0 - shadowF * 0.38 * studAmt;
  col *= 1.0 - engrave * 0.14 * studAmt;

  float bevel = smoothstep(0.05 * pitch, 0.085 * pitch, seamD) * (1.0 - smoothstep(0.085 * pitch, 0.16 * pitch, seamD));
  col += albedo * (bevel * (0.18 + 0.5 * lam) * clamp(u_seam, 0.0, 1.0));
  col *= 1.0 - seam * 0.8;

  float ndh = clamp(dot(nEff, normalize(Lo + Vo)), 0.0, 1.0);
  float spec = pow(ndh, 48.0) + 0.22 * pow(ndh, 8.0);
  col += vec3(1.0) * (spec * glossNow * (1.0 - seam) * depthDim);

  col *= gainNow;
  col = pow(max(col, vec3(0.0)), vec3(u_contrast));

  // Solid surface orb: the hit writes opaque colour.
  frag_color = vec4(col, 1.0);
}
