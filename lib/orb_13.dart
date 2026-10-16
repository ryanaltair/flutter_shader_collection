/// ORB-13 — plasma globe: crawling lightning filaments.
///
/// Flutter port of the shadercn ORB-13 component. The fragment shader
/// (`shaders/orb_13.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-13 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb13Variant = OrbVariant(
  key: 'orb-13',
  label: 'ORB-13',
  note: 'plasma globe: crawling lightning filaments',
  shaderAsset: 'shaders/orb_13.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Anim speed', 1, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('spin', 'Spin rate', 0.2, 0, 5, step: 0.03, integrate: true),
    OrbParamDef('camDist', 'Camera distance', 7, 1, 50, step: 0.3),
    OrbParamDef('focal', 'Lens', 2.25, 0.15, 15, step: 0.1),
    OrbParamDef('envRadius', 'Globe radius', 2.6, 0.15, 15, step: 0.1),
    OrbParamDef('swell', 'Input swell', 0.15, 0, 1, step: 0.01),
    OrbParamDef('tilt', 'Axis tilt', 0.4, 0, 4, step: 0.02),
    OrbParamDef('fils', 'Filament density', 6, 0.5, 12, step: 0.1),
    OrbParamDef('writhe', 'Writhe', 0.9, 0, 3, step: 0.02),
    OrbParamDef('writheFreq', 'Writhe frequency', 1.6, 0.2, 8, step: 0.05),
    OrbParamDef('sharp', 'Arc sharpness', 4, 0.5, 60, step: 0.5),
    OrbParamDef('soft', 'Arc core softness', 0.06, 0.002, 0.5, step: 0.002),
    OrbParamDef('whiten', 'Core whitening', 0.008, 0, 0.2, step: 0.002),
    OrbParamDef('coreGain', 'Nucleus glow', 1.6, 0, 5, step: 0.05),
    OrbParamDef('tipGain', 'Glass flare', 1.8, 0, 6, step: 0.05),
    OrbParamDef('fill', 'Body haze', 0.02, 0, 2, step: 0.01),
    OrbParamDef('stepClamp', 'Step clamp', 40, 0.3, 300, step: 1.5),
    OrbParamDef('scatter', 'Diffusion', 0.012, 0, 0.5, step: 0.003),
    OrbParamDef('exposure', 'Exposure', 11, 0.1, 200, step: 0.5),
    OrbParamDef('contrast', 'Contrast', 1, 0.15, 15, step: 0.1),
    OrbParamDef('saturation', 'Saturation', 1.2, 0, 4, step: 0.02),
    OrbParamDef('alphaGain', 'Alpha gain', 2.5, 0.05, 15, step: 0.1),
    OrbParamDef('edge', 'Edge sharpness', 1, 0, 1, step: 0.01),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('inner', 'Nucleus', '#ff70d8'),
    OrbColorDef('arc', 'Arc', '#5a5cff'),
    OrbColorDef('tint', 'Tint', '#ffffff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'coreGain': 1.6, 'exposure': 11, 'fils': 6, 'sharp': 4, 'soft': 0.06, 'speed': 1, 'spin': 0.2, 'tipGain': 1.8, 'whiten': 0.008, 'writhe': 0.9},
    OrbState.thinking: <String, double>{'coreGain': 1.2, 'exposure': 10, 'fils': 7, 'sharp': 3, 'soft': 0.08, 'speed': 1.8, 'spin': 0.45, 'tipGain': 1.5, 'whiten': 0.012, 'writhe': 1.2},
    OrbState.speaking: <String, double>{'coreGain': 2, 'exposure': 8.5, 'fils': 8, 'sharp': 3.5, 'soft': 0.05, 'speed': 2.6, 'spin': 0.3, 'tipGain': 2.4, 'whiten': 0.012, 'writhe': 1.3},
  },
);

/// Renders plasma globe: crawling lightning filaments. Thin wrapper over [ShaderOrb].
class Orb13 extends ShaderOrb {
  const Orb13({
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
  }) : super(variant: orb13Variant);
}
