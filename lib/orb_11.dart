/// ORB-11 — quantum orbital, rainbow chroma.
///
/// Flutter port of the shadercn ORB-11 component. The fragment shader
/// (`shaders/orb_11.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-11 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb11Variant = OrbVariant(
  key: 'orb-11',
  label: 'ORB-11',
  note: 'quantum orbital, rainbow chroma',
  shaderAsset: 'shaders/orb_11.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Anim speed', 0.9, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('rotSpeed', 'Rotation speed', 0.5, 0, 5, step: 0.05),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('swell', 'Input swell', 0.07, 0, 1, step: 0.01),
    OrbParamDef('posScale', 'Orbital zoom', 0.5, 0.15, 10, step: 0.05),
    OrbParamDef('flowSpeed', 'Flow speed', 0.35, 0, 10, step: 0.05, integrate: true),
    OrbParamDef('flowAmp', 'Flow amount', 0.45, 0, 4, step: 0.05),
    OrbParamDef('flowScale', 'Flow scale', 0.3, 0.3, 10, step: 0.1),
    OrbParamDef('precess', 'Precession', 0.3, 0, 4, step: 0.05),
    OrbParamDef('radialPow', 'Radial power', 0.5, 0.5, 15, step: 0.1),
    OrbParamDef('radialDecay', 'Radial decay', 1, 0.3, 30, step: 0.15),
    OrbParamDef('probPow', 'Probability curve', 0.4, 0.1, 3, step: 0.015),
    OrbParamDef('probGain', 'Probability gain', 3, 0.15, 15, step: 0.1),
    OrbParamDef('waveFreq', 'Wave frequency', 4, 0, 20, step: 0.5),
    OrbParamDef('chromaSpread', 'Chroma spread', 0.18, 0, 1.5, step: 0.01),
    OrbParamDef('glow', 'Glow', 0.9, 0, 5, step: 0.05),
    OrbParamDef('metalDark', 'Metal darkness', 0, 0, 3, step: 0.015),
    OrbParamDef('baseVis', 'Base visibility', 0.12, 0, 1.5, step: 0.01),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'baseVis': 0.12, 'chromaSpread': 0.18, 'flowAmp': 0.45, 'flowScale': 0.3, 'flowSpeed': 0.35, 'glow': 0.9, 'metalDark': 0, 'posScale': 0.5, 'precess': 0.3, 'probGain': 3, 'probPow': 0.4, 'radialDecay': 1, 'radialPow': 0.5, 'radius': 0.9, 'rotSpeed': 0.5, 'speed': 0.9, 'swell': 0.07, 'waveFreq': 4},
    OrbState.thinking: <String, double>{'baseVis': 0.12, 'chromaSpread': 0.41, 'flowAmp': 1.1, 'flowScale': 0.3, 'flowSpeed': 0.35, 'glow': 0.9, 'metalDark': 0, 'posScale': 0.65, 'precess': 0, 'probGain': 3, 'probPow': 0.4, 'radialDecay': 1.9, 'radialPow': 0.5, 'radius': 0.9, 'rotSpeed': 0.5, 'speed': 0.9, 'swell': 0.07, 'waveFreq': 4},
    OrbState.speaking: <String, double>{'baseVis': 0.12, 'chromaSpread': 0.12, 'flowAmp': 0.8, 'flowScale': 2.2, 'flowSpeed': 2.75, 'glow': 0.9, 'metalDark': 0, 'posScale': 1, 'precess': 1.3, 'probGain': 4.3, 'probPow': 0.31, 'radialDecay': 1, 'radialPow': 0.5, 'radius': 0.9, 'rotSpeed': 0.5, 'speed': 2.45, 'swell': 0.07, 'waveFreq': 4},
  },
);

/// Renders quantum orbital, rainbow chroma. Thin wrapper over [ShaderOrb].
class Orb11 extends ShaderOrb {
  const Orb11({
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
  }) : super(variant: orb11Variant);
}
