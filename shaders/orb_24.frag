// ORB-24 — "Minecraft earth: a voxel sphere cycling through seasons"
//
// Flutter (FragmentShader) port of the shadercn ORB-24 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-24/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_24.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated anim/season/spin/shuffle phases these
// uniforms carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_anim;       // integrated animation phase (NOT a rate)
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_blocks;
uniform float u_cave;
uniform float u_contrast;
uniform float u_core;
uniform float u_drift;
uniform float u_gain;
uniform float u_glow;
uniform float u_light;
uniform float u_ore;
uniform float u_radius;
uniform float u_rough;
uniform float u_scale;
uniform float u_sea;
uniform float u_season;     // integrated season phase (NOT a rate)
uniform float u_shuffle;    // integrated shuffle phase (NOT a rate)
uniform float u_spin;       // integrated spin phase (NOT a rate)
uniform float u_texture;
uniform float u_tilt;
uniform float u_trees;
uniform vec3 u_c_dirt;
uniform vec3 u_c_grass;
uniform vec3 u_c_lava;
uniform vec3 u_c_leaf;
uniform vec3 u_c_ore;
uniform vec3 u_c_sand;
uniform vec3 u_c_stone;
uniform vec3 u_c_water;

out vec4 frag_color;

#define STEPS 160

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

// Seam-free noise on the direction sphere: tri-planar sum of 2D value noise,
// range-stretched and clamped so the terrain bound stays a true bound.
float ckN3(vec3 p) {
  float v = (noise(p.xy) + noise(p.yz + vec2(19.1)) + noise(p.zx + vec2(47.3))) / 3.0;
  return clamp(0.5 + (v - 0.5) * 1.9, 0.0, 1.0);
}

// WGSL leaves smoothstep indeterminate once edge0 >= edge1; the cave width
// ramp and the core glow ramp below are descending, so evaluate them with
// the explicit hermite form for deterministic cross-GPU behaviour.
float sstepSafe(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

struct World {
  float cherry;
  vec4 clim;
  vec3 drift;
  float maxH;
  float seaN;
  float treeMul;
  float vs;
};

struct TreeCell {
  vec3 dir;
  float h1;
  float h2;
};

// The raw terrain field for a surface direction, 0..1. Two octaves only —
// the voxel grid quantizes away anything finer.
float ckField(vec3 dir, World world) {
  vec3 q = dir * u_scale + world.drift;
  return ckN3(q) * 0.65 + ckN3(q * 2.6 + vec3(31.7)) * 0.35;
}

// Local terrain radius. Relief is strictly ADDITIVE above the unit sphere:
// oceans and plains sit exactly on it, mountains climb from the shoreline.
float ckTerrain(vec3 dir, World world) {
  float h = 1.0 + u_rough * max(ckField(dir, world) - world.seaN, 0.0) * 1.2 * (1.0 + world.clim.w * 0.8);
  float stepH = 3.0 * world.vs;
  float hq = 1.0 + floor((h - 1.0) / stepH) * stepH;
  return mix(h, hq, world.clim.w * 0.85);
}

// Continent-scale biome field: below 0.3 desert, above 0.58 forest.
float ckBiome(vec3 dir, World world) {
  return ckN3(dir * 1.3 + world.drift + vec3(57.9));
}

// Which tree cell does this direction fall in? The direction is projected
// onto its dominant cube face and quantized there — every voxel along a
// radial line lands in the same cell, which is what keeps a tree's trunk
// and canopy agreeing across grid levels.
TreeCell ckTreeCell(vec3 dir) {
  TreeCell tc;
  vec3 ad = abs(dir);
  vec2 fuv = vec2(0.0);
  float face = 0.0;
  if (ad.x >= ad.y && ad.x >= ad.z) {
    fuv = dir.yz / ad.x;
    face = dir.x > 0.0 ? 0.0 : 1.0;
  } else if (ad.y >= ad.z) {
    fuv = dir.xz / ad.y;
    face = dir.y > 0.0 ? 2.0 : 3.0;
  } else {
    fuv = dir.xy / ad.z;
    face = dir.z > 0.0 ? 4.0 : 5.0;
  }
  float grid = max(u_blocks / 6.0, 2.0);
  vec2 cell = floor((fuv * 0.5 + 0.5) * grid);
  tc.h1 = hash(cell * 1.17 + vec2(face * 19.3));
  tc.h2 = hash(cell * 0.71 + vec2(face * 7.7 + 9.3));
  vec2 jit = vec2(hash(cell + vec2(7.1 + face)), hash(cell + vec2(13.7 + face))) - 0.5;
  vec2 auv = ((cell + 0.5 + jit * 0.3) / grid) * 2.0 - 1.0;
  vec3 cp = vec3(0.0);
  if (face < 1.5) {
    cp = vec3(face < 0.5 ? 1.0 : -1.0, auv.x, auv.y);
  } else if (face < 3.5) {
    cp = vec3(auv.x, face < 2.5 ? 1.0 : -1.0, auv.y);
  } else {
    cp = vec3(auv, face < 4.5 ? 1.0 : -1.0);
  }
  tc.dir = normalize(cp);
  return tc;
}

// Check tree material at a position based on climate type.
// Returns: 0 = no tree, 2 = trunk, 3 = leaves
float ckTreeMaterial(vec3 cc, vec3 treeDir, float h2, float r, float ha, float lat, World world) {
  if (world.clim.z > 0.5) {
    // ICE SPIKES: tapering packed-ice spires
    float spikeH = (2.0 + 6.0 * h2 * h2) * world.vs;
    float w = mix(1.15, 0.3, clamp((r - ha) / spikeH, 0.0, 1.0)) * world.vs;
    if (lat < w && r > ha - world.vs && r < ha + spikeH) {
      return 3.0;
    }
  } else if (world.clim.w > 0.5) {
    // CACTI: short green columns
    float cacH = (1.5 + 2.0 * h2) * world.vs;
    if (lat < 0.6 * world.vs && r > ha - world.vs && r < ha + cacH) {
      return 3.0;
    }
  } else if (world.cherry > 0.5) {
    // CHERRY GROVE: broad flat blossom puffs on short dark trunks
    float trunkTop = ha + (2.0 + 1.5 * h2) * world.vs;
    if (lat < 0.75 * world.vs && r > ha - world.vs && r < trunkTop) {
      return 2.0;
    }
    vec3 dd = cc - treeDir * (trunkTop + 0.6 * world.vs);
    dd += treeDir * (dot(dd, treeDir) * 0.8);
    vec3 lv = floor(cc / world.vs);
    float rag = hash(lv.xy * 0.61 + vec2(lv.z * 2.23));
    if (length(dd) < (2.2 + 0.5 * rag) * world.vs) {
      return 3.0;
    }
  } else {
    // DEFAULT: tall trees with trunks and canopies
    float trunkTop = ha + (2.5 + 2.0 * h2) * world.vs;
    if (lat < 0.75 * world.vs && r > ha - world.vs && r < trunkTop) {
      return 2.0;
    }
    vec3 dd = cc - treeDir * (trunkTop + 0.7 * world.vs);
    vec3 lv = floor(cc / world.vs);
    float rag = hash(lv.xy * 0.61 + vec2(lv.z * 2.23));
    if (length(dd) < (1.7 + 0.5 * rag) * world.vs) {
      return 3.0;
    }
  }

  return 0.0;
}

// The world function: what fills this voxel?
//   0 air   1 ground   2 trunk   3 leaves
// Ground is the terrain sphere; caves are carved ONLY where the ground has
// risen above the base sphere, so the smooth lowlands stay pristine.
float ckVoxel(vec3 cc, World world) {
  float r = length(cc);
  vec3 dir = cc / max(r, 1e-4);

  // ground: terrain sphere with caves
  if (r < world.maxH) {
    float h = ckTerrain(dir, world);
    if (r < h) {
      // carve caves into risen ground only
      if (h > 1.0 + 1.5 * world.vs) {
        float cv = ckN3(cc * (u_scale * 1.9) + vec3(71.3));
        float cw = u_cave * 0.16 * sstepSafe(world.maxH, world.maxH - 0.45, r);
        if (abs(cv - 0.5) < cw) {
          return 0.0;
        }
      }
      return 1.0;
    }
  }

  // trees: thin shell above terrain
  if (r >= world.maxH + 8.0 * world.vs || u_trees <= 0.001) {
    return 0.0;
  }

  TreeCell tree = ckTreeCell(dir);
  float thrMax = clamp(u_trees, 0.0, 1.0) * 0.8;
  if (tree.h1 <= 1.0 - thrMax) {
    return 0.0;
  }

  float bioA = ckBiome(tree.dir, world);
  float dens = bioA > 0.58 ? 1.0 : (bioA > 0.3 ? 0.25 : 0.0);
  dens *= world.treeMul;
  if (tree.h1 <= 1.0 - thrMax * dens) {
    return 0.0;
  }

  float fA = ckField(tree.dir, world);
  float ha = 1.0 + u_rough * max(fA - world.seaN, 0.0) * 1.2;
  // dry land only, below the stone tree line
  if (fA <= world.seaN + 0.015 || ha >= 1.0 + u_rough * 0.42) {
    return 0.0;
  }

  float lat = length(cc - tree.dir * dot(cc, tree.dir));
  return ckTreeMaterial(cc, tree.dir, tree.h2, r, ha, lat, world);
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  vec2 orbUv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);

  float glowNow = u_glow * (0.7 + 1.0 * u_output_vol);
  float gainNow = u_gain * (0.9 + 0.3 * u_output_vol);
  float lightNow = u_light * (1.0 + 0.3 * u_input_vol);

  vec3 drift = vec3(u_drift * 0.31, u_drift * 0.17, -u_drift * 0.23);

  // CLIMATE: the integrated season clock carries the planet through four
  // worlds — lush, desert, ice, mesa — on a cycle. The triangular weights
  // overlap so exactly two adjacent climates crossfade at any moment.
  // Five worlds in crossfade order: lush, cherry, ice, mesa, desert.
  float t5 = fract(u_season * 0.05) * 5.0;
  vec4 clim = vec4(
    clamp(1.0 - min(abs(t5), abs(t5 - 5.0)), 0.0, 1.0),
    clamp(1.0 - abs(t5 - 4.0), 0.0, 1.0),
    clamp(1.0 - abs(t5 - 2.0), 0.0, 1.0),
    clamp(1.0 - abs(t5 - 3.0), 0.0, 1.0)
  );
  float cherry = clamp(1.0 - abs(t5 - 1.0), 0.0, 1.0);
  float treeMul = dot(clim, vec4(1.0, 0.15, 0.9, 0.3)) + cherry * 0.9;

  float vs = 2.0 / clamp(u_blocks, 8.0, 96.0);
  float seaN = 0.25 + clamp(u_sea, 0.0, 1.0) * 0.5;
  float maxH = 1.0 + u_rough * (1.0 - seaN) * 1.2 * 1.8 + 0.001;
  float bound = maxH + 8.5 * vs;

  World world;
  world.cherry = cherry;
  world.clim = clim;
  world.drift = drift;
  world.maxH = maxH;
  world.seaN = seaN;
  world.treeMul = treeMul;
  world.vs = vs;

  vec2 duv = orbUv / u_radius;

  // orthographic camera, viewport sized to the bound so the treetops fit
  vec3 ro = vec3(duv.x * bound, duv.y * bound, 2.9);
  vec3 rd = vec3(0.0, 0.0, -1.0);

  // rotate the RAY into object space (inverse tumble) — the grid stays
  // axis-aligned, the planet appears to spin. The light rotates along.
  mat2 tiltM = rot2(u_tilt);
  mat2 spinM = rot2(-u_spin);
  vec2 roYZ = tiltM * vec2(ro.y, ro.z);
  ro = vec3(ro.x, roYZ);
  vec2 roXZ = spinM * vec2(ro.x, ro.z);
  ro = vec3(roXZ.x, ro.y, roXZ.y);
  vec2 rdYZ = tiltM * vec2(rd.y, rd.z);
  rd = vec3(rd.x, rdYZ);
  vec2 rdXZ = spinM * vec2(rd.x, rd.z);
  rd = vec3(rdXZ.x, rd.y, rdXZ.y);
  vec3 Lo = normalize(vec3(-0.5, 0.7, 0.55));
  vec2 loYZ = tiltM * vec2(Lo.y, Lo.z);
  Lo = vec3(Lo.x, loYZ);
  vec2 loXZ = spinM * vec2(Lo.x, Lo.z);
  Lo = vec3(loXZ.x, Lo.y, loXZ.y);

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
  vec3 p0 = ro + rd * (-b - sq + vs * 0.001);
  float tSpan = 2.0 * sq;

  // Amanatides & Woo init
  vec3 vp = floor(p0 / vs);
  vec3 tDelta = vec3(vs) / abs(rd);
  vec3 tMax = ((vp + step(vec3(0.0), rd)) * vs - p0) / rd;

  float mat = 0.0;
  vec3 mask = vec3(0.0, 0.0, 1.0);
  float tCur = 0.0;

  for (int i = 0; i < STEPS; i++) {
    float m = ckVoxel((vp + 0.5) * vs, world);
    if (m > 0.5) {
      mat = m;
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

  if (mat < 0.5) {
    frag_color = vec4(0.0);
    return;
  }

  vec3 cc = (vp + 0.5) * vs;
  float r = length(cc);
  vec3 dir = cc / max(r, 1e-4);
  vec3 n = mask * sgn * -1.0;
  vec3 hp = p0 + rd * tCur;

  vec2 vseed = vec2(dot(vp, vec3(1.0, 57.0, 113.0)), dot(vp, vec3(27.0, 7.0, 91.0)));
  float h1 = hash(vseed * 0.013);
  float h2 = hash(vseed * 0.029 + 5.7);

  vec2 uvFace = vec2(0.0);
  if (mask.x > 0.5) {
    uvFace = hp.yz;
  } else if (mask.y > 0.5) {
    uvFace = hp.xz;
  } else {
    uvFace = hp.xy;
  }
  float grain = hash(floor(fract(uvFace / vs) * 4.0) * 0.37 + vseed * 0.11);
  float texMul = mix(1.0, 0.72 + 0.55 * grain, u_texture);

  float lam = clamp(dot(n, Lo), 0.0, 1.0);
  float wrap = clamp(dot(dir, Lo) * 0.5 + 0.5, 0.0, 1.0);
  float ao = 0.55 + 0.45 * clamp(dot(n, dir) * 0.5 + 0.5, 0.0, 1.0);
  float shade = (0.32 + 0.5 * wrap * wrap + 0.85 * lam * lightNow) * ao;

  vec3 col = vec3(0.0);
  if (mat < 1.5) {
    float f = ckField(dir, world);
    float h = 1.0 + u_rough * max(f - seaN, 0.0) * 1.2;
    float depth = h - r;
    float topF = step(depth, vs * 1.15);

    vec3 snow = vec3(0.92, 0.95, 1.0);
    float layer = hash(vec2(floor(r / (vs * 2.0)) * 0.371, 5.3));
    vec3 mesaBand = layer < 0.9
        ? (layer < 0.8 ? (layer < 0.68 ? (layer < 0.5 ? vec3(0.74, 0.42, 0.21) : vec3(0.63, 0.26, 0.15)) : vec3(0.88, 0.79, 0.67)) : vec3(0.84, 0.65, 0.27))
        : vec3(0.4, 0.25, 0.18);
    vec3 mesaTop = mix(vec3(0.72, 0.38, 0.2), mesaBand, step(1.0 + u_rough * 0.1, h));
    vec3 climGrass = u_c_grass * clim.x + u_c_sand * clim.y + snow * clim.z + mesaTop * clim.w + mix(u_c_grass, vec3(0.62, 0.85, 0.3), 0.6) * cherry;
    vec3 climDirt = u_c_dirt * (clim.x + clim.y + cherry) + u_c_dirt * vec3(0.75, 0.85, 1.05) * clim.z + mesaBand * clim.w;
    vec3 climSand = u_c_sand * (clim.x + clim.y + cherry) + mix(u_c_sand, snow, 0.9) * clim.z + vec3(0.72, 0.35, 0.2) * clim.w;
    vec3 climWater = u_c_water * (clim.x + clim.y + cherry) + vec3(0.62, 0.82, 0.92) * clim.z + mix(u_c_water, vec3(0.42, 0.3, 0.22), 0.4) * clim.w;

    if (topF > 0.5 && f < seaN) {
      float deep = clamp((seaN - f) / 0.12, 0.0, 1.0) * (1.0 - 0.55 * clim.z);
      vec3 wc = climWater * mix(1.3, 0.55, deep);
      float shim = 0.85 + 0.25 * sin(u_anim * 2.5 + grain * 6.2831 + dir.x * 4.0);
      shim = mix(shim, 1.02, clim.z);
      col = wc * (0.45 + 0.55 * wrap) * shim + wc * (lam * 0.35);
    } else {
      float dirtF = step(depth, vs * 2.4);
      float up = clamp(dot(n, dir), 0.0, 1.0);

      vec3 albedo = mix(u_c_stone, climDirt, dirtF);
      albedo = mix(albedo, u_c_stone, dirtF * (1.0 - topF) * step(h2, 0.3));

      float bio = ckBiome(dir, world);
      float desertF = step(bio, 0.3);
      albedo = mix(albedo, climGrass, topF * step(0.45, up) * (1.0 - desertF));
      albedo = mix(albedo, climSand, desertF * dirtF);
      albedo = mix(albedo, climDirt, topF * step(1.0 + u_rough * 0.28, h) * 0.85 * (1.0 - 0.9 * clim.z));
      albedo = mix(albedo, u_c_stone, topF * step(1.0 + u_rough * 0.45, h) * (1.0 - 0.85 * clim.z));
      albedo = mix(albedo, climSand, topF * step(abs(f - seaN - 0.017), 0.018));

      vec3 oc = floor(cc / (2.5 * vs));
      vec2 oseed = vec2(dot(oc, vec3(1.0, 57.0, 113.0)), dot(oc, vec3(27.0, 7.0, 91.0)));
      float fleck = step(0.5, hash(floor(fract(uvFace / vs) * 4.0) * 0.53 + oseed * 0.19));

      float icePatch = clim.z * step(hash(oseed * 0.023 + 9.1), 0.5) * step(1.0 + u_rough * 0.06, h);
      albedo = mix(albedo, vec3(0.55, 0.7, 0.92), icePatch * (0.45 + 0.4 * fleck));

      float veinF = (1.0 - dirtF) * step(1.0 - u_ore, hash(oseed * 0.017)) * step(h1, 0.8);
      float oreType = hash(oseed * 0.041 + 2.9);
      vec3 oreHue = oreType < 0.75
          ? (oreType < 0.4 ? u_c_ore : u_c_ore * vec3(0.25, 0.45, 1.2))
          : vec3(0.16);
      float oreLit = oreType < 0.75 ? 1.0 : 0.0;
      albedo = mix(albedo, oreHue, veinF * (0.2 + 0.65 * fleck));
      float twinkle = 0.55 + 0.45 * sin(u_shuffle + hash(oseed * 0.013) * 37.0);

      float depthDim = mix(1.0, 0.62, clamp(depth / max(u_rough * 0.9, 0.05), 0.0, 1.0));

      float coreR = 1.0 - u_rough * 0.6;
      float coreF = u_core * sstepSafe(coreR + 0.15, coreR - 0.05, r);

      vec3 emis = oreHue * (veinF * fleck * oreLit * glowNow * twinkle) +
          u_c_lava * (coreF * (0.9 + 0.4 * sin(u_shuffle * 1.6 + h1 * 51.0))) * (0.6 + 1.4 * u_output_vol);

      col = albedo * (shade * depthDim) + emis;
    }
  } else if (mat < 2.5) {
    col = u_c_dirt * (0.5 * shade);
  } else {
    vec3 climLeaf = u_c_leaf * (clim.x + clim.y * 0.9) + vec3(0.62, 0.76, 0.95) * clim.z + mix(u_c_leaf, vec3(0.45, 0.62, 0.25), 0.5) * clim.w + vec3(0.93, 0.7, 0.82) * cherry;
    col = climLeaf * shade;
    float leafGrain = mix(0.5 + 0.9 * grain, 0.85 + 0.3 * grain, clim.z);
    texMul = mix(1.0, leafGrain, u_texture);
  }

  col *= texMul * gainNow;
  col = pow(max(col, vec3(0.0)), vec3(u_contrast));

  // Solid surface orb: the hit writes opaque colour.
  frag_color = vec4(col, 1.0);
}
