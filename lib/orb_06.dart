/// ORB-06 — a hundred glowing lattices stacked through the ball, interfering.
///
/// Flutter port of the shadercn ORB-06 component. The fragment shader
/// (`shaders/orb_06.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-06 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb06Variant = OrbVariant(
  key: 'orb-06',
  label: 'ORB-06',
  note: 'a hundred glowing lattices stacked through the ball, interfering',
  shaderAsset: 'shaders/orb_06.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Anim speed', 0.5, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('drift', 'Layer walk', 0.02, 0, 0.3, step: 0.002),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('scale', 'Pattern scale', 4, 0.3, 20, step: 0.1),
    OrbParamDef('bulge', 'Dome bulge', 0.3, 0, 4, step: 0.02),
    OrbParamDef('depth', 'Stack depth', 0.7, 0, 1.6, step: 0.01),
    OrbParamDef('freq', 'Lattice spacing', 0.7, 0.05, 5, step: 0.01),
    OrbParamDef('glowSize', 'Glow size', 0.05, 0.002, 1, step: 0.002),
    OrbParamDef('hueRate', 'Hue per layer', 0.037, 0, 0.5, step: 0.002),
    OrbParamDef('exposure', 'Exposure', 4, 0.05, 200, step: 0.05),
    OrbParamDef('contrast', 'Contrast', 1.1, 0.15, 10, step: 0.05),
    OrbParamDef('saturation', 'Saturation', 1.2, 0, 4, step: 0.02),
    OrbParamDef('light', 'Key light', 0.45, 0, 3, step: 0.015),
    OrbParamDef('rim', 'Rim sheen', 0.4, 0, 3, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('tint', 'Tint', '#ffffff'),
    OrbColorDef('sheen', 'Sheen', '#bcd8ff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'contrast': 1.1, 'depth': 0.7, 'drift': 0.02, 'exposure': 4, 'glowSize': 0.05, 'hueRate': 0.037, 'speed': 0.5},
    OrbState.thinking: <String, double>{'bulge': 2.18, 'contrast': 1.55, 'depth': 1.25, 'drift': 0.105, 'exposure': 6.5, 'glowSize': 0.016, 'hueRate': 0.095, 'speed': 2.6},
    OrbState.speaking: <String, double>{'contrast': 0.9, 'depth': 0.26, 'drift': 0.13, 'exposure': 2.7, 'glowSize': 0.062, 'hueRate': 0.045, 'light': 1.11, 'speed': 4.5},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'sheen': '#bcd8ff', 'tint': '#ffffff'},
    OrbState.thinking: <String, String>{'sheen': '#7ea9ff', 'tint': '#9db8ff'},
    OrbState.speaking: <String, String>{'sheen': '#ffb277', 'tint': '#ffc492'},
  },
);

/// Renders a hundred glowing lattices stacked through the ball, interfering. Thin wrapper over [ShaderOrb].
class Orb06 extends ShaderOrb {
  const Orb06({
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
  }) : super(variant: orb06Variant);
}
