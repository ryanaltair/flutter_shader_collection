/// ORB-31 — raymarched shell, volumetric godrays.
///
/// Flutter port of the shadercn ORB-31 component. The fragment shader
/// (`shaders/orb_31.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-31 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb31Variant = OrbVariant(
  key: 'orb-31',
  label: 'ORB-31',
  note: 'raymarched shell, volumetric godrays',
  shaderAsset: 'shaders/orb_31.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Anim speed', 1, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('sweepRate', 'Sweep rate', 0.5, 0, 6, step: 0.02, integrate: true),
    OrbParamDef('radius', 'Shell radius', 2.6, 0.4, 10, step: 0.05),
    OrbParamDef('swell', 'Input swell', 0.18, 0, 3, step: 0.015),
    OrbParamDef('warp', 'Warp divisor', 0.9, 0.3, 10, step: 0.05),
    OrbParamDef('warpFreq', 'Warp frequency', 5.25, 0.15, 30, step: 0.15),
    OrbParamDef('warpSwing', 'Warp swing', 0, 0, 8, step: 0.05),
    OrbParamDef('freqSwing', 'Frequency swing', 0, 0, 15, step: 0.05),
    OrbParamDef('smoothSwing', 'Softness swing', 0, 0, 2, step: 0.005),
    OrbParamDef('smoothK', 'Blend softness', 0.42, 0.015, 4, step: 0.02),
    OrbParamDef('rayGain', 'Godray gain', 0.8, 0, 4, step: 0.02),
    OrbParamDef('rayFalloff', 'Godray falloff', 10.5, 0.3, 100, step: 0.5),
    OrbParamDef('surfaceLit', 'Surface light', 0.105, 0, 3, step: 0.015),
    OrbParamDef('ambient', 'Ambient', 0, 0, 1, step: 0.005),
    OrbParamDef('alphaGain', 'Alpha gain', 3, 0.05, 15, step: 0.1),
    OrbParamDef('edgeFade', 'Halo falloff', 0.45, 0.1, 0.985, step: 0.015),
    OrbParamDef('camDist', 'Camera distance', 12, 1.5, 100, step: 0.5),
    OrbParamDef('fov', 'Lens', 3.5, 0.3, 20, step: 0.1),
    OrbParamDef('stepScale', 'Step safety', 9, 0.3, 30, step: 0.5),
    OrbParamDef('maxDist', 'Max distance', 22, 3, 100, step: 1),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'alphaGain': 3, 'freqSwing': 0, 'rayFalloff': 10.5, 'rayGain': 0.8, 'smoothK': 0.42, 'smoothSwing': 0, 'speed': 1, 'swell': 0.18, 'warp': 0.9, 'warpFreq': 5.25, 'warpSwing': 0},
    OrbState.thinking: <String, double>{'alphaGain': 1.8, 'freqSwing': 2, 'rayFalloff': 8, 'rayGain': 0.52, 'smoothK': 0.58, 'smoothSwing': 0, 'speed': 0.9, 'sweepRate': 0.5, 'swell': 0.66, 'warp': 1, 'warpFreq': 7, 'warpSwing': 0},
    OrbState.speaking: <String, double>{'alphaGain': 1.8, 'freqSwing': 4.5, 'rayFalloff': 8, 'rayGain': 0.52, 'smoothK': 0.25, 'smoothSwing': 0.25, 'speed': 0.9, 'sweepRate': 0.8, 'swell': 0.66, 'warp': 3.75, 'warpFreq': 19.5, 'warpSwing': 2.25},
  },
);

/// Renders raymarched shell, volumetric godrays. Thin wrapper over [ShaderOrb].
class Orb31 extends ShaderOrb {
  const Orb31({
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
  }) : super(variant: orb31Variant);
}
