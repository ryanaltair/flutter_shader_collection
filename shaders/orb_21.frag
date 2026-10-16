// ORB-21 — "Light diffusing through a cloud"
//
// Flutter (FragmentShader) port of the shadercn ORB-21 component, whose shader
// is written in TypeGPU/WGSL (registry/components/orbs/orb-21/gpu.ts).
//
// Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
// permission. Non-commercial use only, with attribution to XorDev; keep this
// notice with the file.
//
// The port is a statement-by-statement translation of the WGSL source; see
// lib/orb_21.dart for the matching Dart runtime (springs, state presets,
// volume synthesis and the integrated speed/lightSpin phases these uniforms
// carry).

#version 300 es

precision highp float;

#include <flutter/runtime_effect.glsl>

uniform vec2 u_res;         // drawing area size in device pixels
uniform float u_input_vol;  // synthesized input volume, 0..1
uniform float u_output_vol; // synthesized output volume, 0..1
uniform float u_absorb;
uniform float u_alpha_gain;
uniform float u_ambient;
uniform float u_aniso;
uniform float u_cam_dist;
uniform float u_churn;
uniform float u_density;
uniform float u_edge_soft;
uniform float u_exposure;
uniform float u_focal;
uniform float u_light_spin; // integrated light-orbit phase (NOT a rate)
uniform float u_power;
uniform float u_radius;
uniform float u_scale;
uniform float u_shadow_absorb;
uniform float u_shadow_lift;
uniform float u_speed;      // integrated animation phase (NOT a rate)
uniform float u_threshold;
uniform vec3 u_c_light;
uniform vec3 u_c_shadow;

out vec4 frag_color;

#define STEPS 56
#define LIGHT_STEPS 4
#define DENSITY_OCT 4

// Density inside the sphere.
//
// The radial term falls to zero at the boundary, which both bounds the volume
// and gives the soft edge for free. The cos-warp folds the sample point a few
// times — the same cheap turbulence the other orbs use — and the threshold
// carves that into clumps rather than an even fog.
float density(vec3 p, float animTime, float nimbusDensity) {
  float shell = 1.0 - length(p) / u_radius;
  if (shell <= 0.0) {
    return 0.0;
  }

  vec3 q = p * u_scale;
  float f = 1.0;
  for (int k = 0; k < DENSITY_OCT; k++) {
    q += cos(vec3(q.y, q.z, q.x) * f + vec3(animTime * u_churn)) / f;
    f *= 1.8;
  }

  float n = ((sin(q.x) + sin(q.y) + sin(q.z)) / 3.0) * 0.5 + 0.5;
  // smoothstep against the threshold is the clump control: high threshold
  // leaves sparse wisps, low fills the sphere with even fog
  float clump = smoothstep(u_threshold, 1.0, n);
  return clump * pow(shell, u_edge_soft) * nimbusDensity;
}

// Henyey-Greenstein: g > 0 biases scattering forward, which is what gives the
// bloom on the limb facing the light.
//
// The physical form carries a 1/(4*PI) normalisation. It is dropped here and
// folded into u_power instead — kept in, the whole term sits around 0.02 and
// the orb renders black unless power is pushed into the hundreds.
float phaseHG(float c, float g) {
  float g2 = g * g;
  return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 0.0001), 1.5);
}

vec4 nimbusRender(vec2 fragCoord, float nimbusPower, float nimbusDensity) {
  float animTime = u_speed;

  vec2 uv = (fragCoord * 2.0 - u_res) / min(u_res.x, u_res.y);
  vec3 ro = vec3(0.0, 0.0, -u_cam_dist);
  vec3 rd = normalize(vec3(uv, u_focal));

  // Light direction, slowly orbiting so the shading is never static.
  //
  // The z term is kept POSITIVE — the camera looks along +z, so a light also
  // pointing along +z sits behind the cloud. That is the back-lit case, where
  // dot(rd, L) approaches 1 and the forward-scattering phase blooms.
  vec3 L = normalize(vec3(
    cos(animTime * u_light_spin) * 0.7,
    0.45,
    sin(animTime * u_light_spin) * 0.35 + 0.65
  ));

  float phase = phaseHG(dot(rd, L), u_aniso);

  // Start the march at the sphere's front face instead of the camera
  float toCentre = u_cam_dist;
  float tStart = max(toCentre - u_radius, 0.0);
  float span = 2.0 * u_radius;
  float dt = span / float(STEPS);

  float T = 1.0;
  vec3 scattered = vec3(0.0);

  for (int i = 0; i < STEPS; i++) {
    float t = tStart + (float(i) + 0.5) * dt;
    vec3 p = ro + rd * t;

    float dn = density(p, animTime, nimbusDensity);
    if (dn > 0.001) {
      // short march toward the light for self-shadowing
      float shadow = 1.0;
      float lstep = u_radius / float(LIGHT_STEPS);
      for (int k = 0; k < LIGHT_STEPS; k++) {
        float fk = float(k) + 1.0;
        vec3 lp = p + L * ((fk - 0.5) * lstep);
        shadow *= exp(-density(lp, animTime, nimbusDensity) * lstep * u_shadow_absorb);
      }

      // In-scattered light: warm where lit, cool where the volume shadows
      // itself.
      //
      // The shadow term appears ONCE, inside the mix. Multiplying by it again
      // as a factor scales the shadowed end of the mix toward zero, so the
      // cool colour is always multiplied away. u_shadow_lift is how much light
      // still reaches the shadowed side.
      vec3 lit = mix(u_c_shadow * u_shadow_lift, u_c_light, shadow);
      scattered += lit * (T * dn * dt * phase * nimbusPower);

      T *= exp(-dn * dt * u_absorb);
      if (T < 0.01) {
        break;
      }
    }
  }

  // a soft ambient body so the unlit side is not pure black
  float body = 1.0 - T;
  scattered += u_c_shadow * (body * u_ambient);

  return vec4(scattered, body);
}

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;

  // Agent output turns the light up; user input thickens the cloud. Both are
  // AMPLITUDES. Churn is deliberately NOT volume-scaled: it multiplies the
  // accumulated clock into a phase (animTime * churn), so scaling it by the
  // live volume would turn every volume wobble into a phase jump.
  float nimbusPower = u_power * (0.7 + 0.9 * u_output_vol);
  float nimbusDensity = u_density * (1.0 + 0.35 * u_input_vol);

  vec4 acc = nimbusRender(fragCoord, nimbusPower, nimbusDensity);

  vec3 col = tanh(acc.xyz * u_exposure);
  float a = clamp(acc.w * u_alpha_gain, 0.0, 1.0);

  // Emitted/scattered light, so rgb is already premultiplied — do NOT multiply
  // by alpha again (see the same note in orb-31).
  frag_color = vec4(col, a);
}
