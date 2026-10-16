/// ORB-02 — ornate scrollwork on a rolling dome.
///
/// Flutter port of the shadercn ORB-02 component. The fragment shader
/// (`shaders/orb_02.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-02 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb02Variant = OrbVariant(
  key: 'orb-02',
  label: 'ORB-02',
  note: 'ornate scrollwork on a rolling dome',
  shaderAsset: 'shaders/orb_02.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Anim speed', 0.5, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('swirl', 'Swirl', 0.06, 0, 3, step: 0.015),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('swell', 'Input swell', 0.06, 0, 1, step: 0.01),
    OrbParamDef('zoom', 'Pattern zoom', 4.4, 0.15, 40, step: 0.2),
    OrbParamDef('bulge', 'Sphere bulge', 0.35, 0, 10, step: 0.05),
    OrbParamDef('warpFreq', 'Warp frequency', 1.5, 0.05, 10, step: 0.05),
    OrbParamDef('hueShift', 'Hue shift', 0, 0, 6.283, step: 0.05),
    OrbParamDef('coreClamp', 'Flare size', 0.12, 0.003, 3, step: 0.015),
    OrbParamDef('falloff', 'Fill', 1, 0.05, 4, step: 0.05),
    OrbParamDef('gain', 'Exposure', 0.55, 0.015, 10, step: 0.05),
    OrbParamDef('rim', 'Rim light', 0.12, 0, 3, step: 0.015),
    OrbParamDef('rimPow', 'Rim tightness', 2.2, 0.15, 15, step: 0.1),
    OrbParamDef('alphaGain', 'Alpha gain', 2.4, 0.05, 15, step: 0.1),
    OrbParamDef('baseVis', 'Base visibility', 0.08, 0, 1.5, step: 0.01),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'alphaGain': 2.4, 'coreClamp': 0.12, 'falloff': 1, 'gain': 0.55, 'rim': 0.12, 'speed': 0.5, 'warpFreq': 1.5, 'zoom': 4.4},
    OrbState.thinking: <String, double>{'alphaGain': 2.5, 'coreClamp': 0.11, 'falloff': 0.96, 'gain': 0.6, 'rim': 0.13, 'speed': 0.65, 'warpFreq': 1.6, 'zoom': 4.6},
    OrbState.speaking: <String, double>{'alphaGain': 3, 'coreClamp': 0.07, 'falloff': 1.1, 'gain': 0.85, 'rim': 0.2, 'speed': 3, 'warpFreq': 1.2, 'zoom': 4.4},
  },
);

/// Renders ornate scrollwork on a rolling dome. Thin wrapper over [ShaderOrb].
class Orb02 extends ShaderOrb {
  const Orb02({
    super.key,
    super.size = 280,
    super.state = OrbState.idle,
    super.params,
    super.colors,
    super.statePresets,
    super.stateColors,
    super.stateVolumes,
    super.volumes,
    super.paused,
    super.semanticsLabel,
  }) : super(variant: orb02Variant);
}
