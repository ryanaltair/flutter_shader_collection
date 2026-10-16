/// ORB-23 — an ASCII glyph matrix in CRT green, wrapped on the ball.
///
/// Flutter port of the shadercn ORB-23 component. The fragment shader
/// (`shaders/orb_23.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-23 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb23Variant = OrbVariant(
  key: 'orb-23',
  label: 'ORB-23',
  note: 'an ASCII glyph matrix in CRT green, wrapped on the ball',
  shaderAsset: 'shaders/orb_23.frag',
  params: <OrbParamDef>[
    OrbParamDef('drift', 'Drift', 0.55, 0, 10, step: 0.05, integrate: true),
    OrbParamDef('scroll', 'Scroll', 0.05, 0, 10, step: 0.05, integrate: true),
    OrbParamDef('speed', 'Pulse rate', 0.5, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('pulse', 'Pulse depth', 0, 0, 2, step: 0.01),
    OrbParamDef('spin', 'Roll', 0.12, 0, 5, step: 0.03, integrate: true),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('cells', 'Glyph grid', 40, 16, 120, step: 2),
    OrbParamDef('scale', 'Field scale', 1.6, 0.3, 10, step: 0.1),
    OrbParamDef('density', 'Glyph density', 0.48, 0, 2, step: 0.01),
    OrbParamDef('dropout', 'Dropout', 0.48, 0, 1, step: 0.01),
    OrbParamDef('light', 'Key light', 0.6, 0, 3, step: 0.015),
    OrbParamDef('rim', 'Rim glow', 0.45, 0, 3, step: 0.015),
    OrbParamDef('gain', 'Phosphor gain', 1, 0.05, 5, step: 0.05),
    OrbParamDef('contrast', 'Contrast', 1, 0.15, 10, step: 0.05),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('glow', 'Glow', '#57ffc9'),
    OrbColorDef('deep', 'Deep', '#0b3b2d'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'cells': 68, 'density': 0.31, 'drift': 0.55, 'dropout': 0.24, 'gain': 0.9, 'light': 1.11, 'pulse': 0, 'rim': 0.66, 'scale': 5.1, 'scroll': 0.05, 'speed': 0.52, 'spin': 0.12},
    OrbState.thinking: <String, double>{'cells': 86, 'contrast': 1.3, 'density': 0.33, 'drift': 3.05, 'dropout': 0.13, 'gain': 0.95, 'light': 0.855, 'pulse': 0.58, 'rim': 0.51, 'scroll': 0.65, 'speed': 0.45, 'spin': 0.04},
    OrbState.speaking: <String, double>{'cells': 120, 'density': 0.56, 'drift': 0.4, 'dropout': 0.59, 'gain': 2.95, 'light': 0.39, 'pulse': 1.27, 'rim': 0.51, 'scale': 7.2, 'scroll': 0.1, 'speed': 2.85, 'spin': 1.05},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'glow': '#6a57ff'},
    OrbState.thinking: <String, String>{'glow': '#57ffe3'},
    OrbState.speaking: <String, String>{'glow': '#ff5757'},
  },
);

/// Renders an ASCII glyph matrix in CRT green, wrapped on the ball. Thin wrapper over [ShaderOrb].
class Orb23 extends ShaderOrb {
  const Orb23({
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
  }) : super(variant: orb23Variant);
}
