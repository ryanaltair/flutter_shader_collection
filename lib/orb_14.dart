/// ORB-14 — a lit plasma dome quantized to chunky two-tone pixels.
///
/// Flutter port of the shadercn ORB-14 component. The fragment shader
/// (`shaders/orb_14.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-14 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb14Variant = OrbVariant(
  key: 'orb-14',
  label: 'ORB-14',
  note: 'a lit plasma dome quantized to chunky two-tone pixels',
  shaderAsset: 'shaders/orb_14.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Wave speed', 0.5, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('spin', 'Roll', 0.15, 0, 5, step: 0.03, integrate: true),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('cells', 'Grid cells', 140, 32, 320, step: 2),
    OrbParamDef('levels', 'Tone steps', 3, 2, 8, step: 1),
    OrbParamDef('scale', 'Wave scale', 1.5, 0.3, 12, step: 0.1),
    OrbParamDef('plasma', 'Wave amount', 0.9, 0, 3, step: 0.015),
    OrbParamDef('light', 'Key light', 0.9, 0, 3, step: 0.015),
    OrbParamDef('rim', 'Rim light', 0.35, 0, 3, step: 0.015),
    OrbParamDef('gain', 'Brightness', 1, 0.05, 5, step: 0.05),
    OrbParamDef('contrast', 'Contrast', 1.1, 0.15, 10, step: 0.05),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('ink', 'Ink', '#101426'),
    OrbColorDef('paper', 'Paper', '#cfe6ff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'contrast': 1.1, 'gain': 1, 'plasma': 0.9, 'speed': 0.5, 'spin': 0.15},
    OrbState.thinking: <String, double>{'contrast': 1.15, 'gain': 0.95, 'plasma': 1.15, 'speed': 1.6, 'spin': 0.05},
    OrbState.speaking: <String, double>{'contrast': 1.05, 'gain': 1.3, 'plasma': 1, 'speed': 1.3, 'spin': 0.8},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'ink': '#101426', 'paper': '#cfe6ff'},
    OrbState.thinking: <String, String>{'ink': '#140f38', 'paper': '#a9b9ff'},
    OrbState.speaking: <String, String>{'ink': '#2a1410', 'paper': '#ffd9a4'},
  },
);

/// Renders a lit plasma dome quantized to chunky two-tone pixels. Thin wrapper over [ShaderOrb].
class Orb14 extends ShaderOrb {
  const Orb14({
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
  }) : super(variant: orb14Variant);
}
