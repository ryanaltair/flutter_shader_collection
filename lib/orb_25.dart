/// ORB-25 — the folds of a warped field, drawn by their own steepness.
///
/// Flutter port of the shadercn ORB-25 component. The fragment shader
/// (`shaders/orb_25.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-25 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb25Variant = OrbVariant(
  key: 'orb-25',
  label: 'ORB-25',
  note: 'the folds of a warped field, drawn by their own steepness',
  shaderAsset: 'shaders/orb_25.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Boil', 3, 0.015, 20, step: 0.05, integrate: true),
    OrbParamDef('drift', 'Drift', 0.6, 0, 8, step: 0.02, integrate: true),
    OrbParamDef('swirl', 'Swirl', 0.05, 0, 3, step: 0.015, integrate: true),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('scale', 'Cell scale', 7.5, 0.3, 60, step: 0.1),
    OrbParamDef('bulge', 'Dome bulge', 0.3, 0, 4, step: 0.02),
    OrbParamDef('warp', 'Fold', 0.4, 0, 2, step: 0.01),
    OrbParamDef('zoom', 'Octave zoom', 1.111, 0.6, 2, step: 0.005),
    OrbParamDef('ripple', 'Ripple', 0.3, 0.02, 3, step: 0.01),
    OrbParamDef('edgeGain', 'Edge gain', 10, 0.5, 60, step: 0.5),
    OrbParamDef('blur', 'Rim width', 2.5, 0.5, 12, step: 0.25),
    OrbParamDef('fringe', 'Chromatic fringe', 0.09, 0, 1.5, step: 0.005),
    OrbParamDef('exposure', 'Exposure', 0.8, 0.05, 40, step: 0.05),
    OrbParamDef('contrast', 'Contrast', 1.15, 0.15, 8, step: 0.05),
    OrbParamDef('saturation', 'Saturation', 1.5, 0, 4, step: 0.02),
    OrbParamDef('floorLevel', 'Body fill', 0.16, 0, 2, step: 0.01),
    OrbParamDef('light', 'Key light', 0.35, 0, 3, step: 0.015),
    OrbParamDef('rim', 'Rim sheen', 0.45, 0, 3, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('tint', 'Rim', '#dbe8f7'),
    OrbColorDef('body', 'Body', '#0d1118'),
    OrbColorDef('sheen', 'Sheen', '#a8c8f0'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'contrast': 1.15, 'drift': 0.6, 'edgeGain': 12.5, 'exposure': 0.8, 'speed': 3, 'swirl': 0.05, 'warp': 0.4, 'zoom': 1.07},
    OrbState.thinking: <String, double>{'blur': 2.75, 'bulge': 0.38, 'contrast': 1.5, 'drift': 0.15, 'edgeGain': 33, 'exposure': 0.55, 'fringe': 0.2, 'light': 0.525, 'rim': 0.69, 'ripple': 0.18, 'saturation': 2, 'speed': 4.7, 'swirl': 0.02, 'warp': 0.34, 'zoom': 1.12},
    OrbState.speaking: <String, double>{'blur': 2, 'bulge': 2.22, 'contrast': 1.35, 'drift': 0.8, 'edgeGain': 5, 'exposure': 2.35, 'fringe': 0.23, 'ripple': 1.18, 'scale': 11.5, 'speed': 1.4, 'swirl': 0.6, 'warp': 1.55, 'zoom': 0.945},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'body': '#0d1118', 'sheen': '#a8c8f0', 'tint': '#dbe8f7'},
    OrbState.thinking: <String, String>{'body': '#090d1c', 'sheen': '#8fb4f2', 'tint': '#c2d6f5'},
    OrbState.speaking: <String, String>{'body': '#090d1c', 'sheen': '#8fb4f2', 'tint': '#c2d6f5'},
  },
);

/// Renders the folds of a warped field, drawn by their own steepness. Thin wrapper over [ShaderOrb].
class Orb25 extends ShaderOrb {
  const Orb25({
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
  }) : super(variant: orb25Variant);
}
