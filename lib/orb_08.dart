/// ORB-08 — mother-of-pearl contour bands, each layer its own hue.
///
/// Flutter port of the shadercn ORB-08 component. The fragment shader
/// (`shaders/orb_08.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-08 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb08Variant = OrbVariant(
  key: 'orb-08',
  label: 'ORB-08',
  note: 'mother-of-pearl contour bands, each layer its own hue',
  shaderAsset: 'shaders/orb_08.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Boil', 0.35, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('flow', 'Band drift', 0.25, 0, 5, step: 0.03, integrate: true),
    OrbParamDef('swirl', 'Swirl', 0.06, 0, 3, step: 0.015, integrate: true),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('scale', 'Pattern scale', 5.5, 0.3, 20, step: 0.1),
    OrbParamDef('bulge', 'Dome bulge', 0.3, 0, 4, step: 0.02),
    OrbParamDef('warp', 'Warp', 1, 0, 3, step: 0.02),
    OrbParamDef('beat', 'Warp beat', 0, 0, 1, step: 0.01),
    OrbParamDef('thick', 'Band width', 0.2, 0.02, 2, step: 0.01),
    OrbParamDef('split', 'Chromatic split', 0.1, 0, 1, step: 0.005),
    OrbParamDef('iris', 'Iridescence', 0.7, 0, 2, step: 0.01),
    OrbParamDef('irisScale', 'Iridescence scale', 0.315, 0, 2, step: 0.005),
    OrbParamDef('view', 'Angle shift', 1.34, 0, 3, step: 0.01),
    OrbParamDef('floor', 'Body fill', 0.8, 0, 3, step: 0.01),
    OrbParamDef('gain', 'Brightness', 1.1, 0.05, 5, step: 0.05),
    OrbParamDef('contrast', 'Contrast', 1.15, 0.15, 10, step: 0.05),
    OrbParamDef('light', 'Key light', 0.75, 0, 3, step: 0.015),
    OrbParamDef('rim', 'Rim sheen', 0.5, 0, 3, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('deep', 'Shell body', '#0d1430'),
    OrbColorDef('low', 'Dim layer', '#2fb8c6'),
    OrbColorDef('crest', 'Bright layer', '#fff1de'),
    OrbColorDef('sheen', 'Sheen', '#bfe4ff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'bulge': 0.8, 'contrast': 1.65, 'floor': 0.57, 'flow': 0.24, 'gain': 2.45, 'iris': 1.02, 'rim': 0.495, 'speed': 0.37, 'split': 0.1, 'swirl': 0.06, 'thick': 0.54, 'warp': 0.96},
    OrbState.thinking: <String, double>{'contrast': 1.65, 'floor': 0.77, 'flow': 0.06, 'gain': 0.85, 'iris': 1.89, 'irisScale': 0.26, 'rim': 0.495, 'speed': 1.61, 'split': 0.3, 'swirl': 0.015, 'thick': 0.54, 'view': 1.21, 'warp': 1.56},
    OrbState.speaking: <String, double>{'beat': 1, 'contrast': 0.78, 'flow': 2.49, 'gain': 1.75, 'iris': 0.45, 'speed': 2, 'split': 0.3, 'swirl': 0.18, 'thick': 0.27, 'warp': 1.84},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'crest': '#fff1de', 'deep': '#0d1430', 'low': '#2fb8c6', 'sheen': '#bfe4ff'},
    OrbState.thinking: <String, String>{'crest': '#dfe8ff', 'deep': '#0a0f2c', 'low': '#6f7cff', 'sheen': '#9fd0ff'},
    OrbState.speaking: <String, String>{'crest': '#fff0c9', 'deep': '#2a0f22', 'low': '#ff7a4d', 'sheen': '#ffc9a8'},
  },
);

/// Renders mother-of-pearl contour bands, each layer its own hue. Thin wrapper over [ShaderOrb].
class Orb08 extends ShaderOrb {
  const Orb08({
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
  }) : super(variant: orb08Variant);
}
