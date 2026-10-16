/// ORB-12 — a ball of glossy toy bricks, studs up — it rebuilds itself while it thinks.
///
/// Flutter port of the shadercn ORB-12 component. The fragment shader
/// (`shaders/orb_12.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-12 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb12Variant = OrbVariant(
  key: 'orb-12',
  label: 'ORB-12',
  note: 'a ball of glossy toy bricks, studs up — it rebuilds itself while it thinks',
  shaderAsset: 'shaders/orb_12.frag',
  params: <OrbParamDef>[
    OrbParamDef('spin', 'Spin', 0.25, 0, 5, step: 0.03, integrate: true),
    OrbParamDef('tilt', 'Tilt', 0.55, 0, 4, step: 0.02),
    OrbParamDef('rebuild', 'Rebuild rate', 0.4, 0, 20, step: 0.1, integrate: true),
    OrbParamDef('gap', 'Missing bricks', 0.07, 0, 0.8, step: 0.01),
    OrbParamDef('studs', 'Studs', 18, 8, 48, step: 1),
    OrbParamDef('radius', 'Radius', 0.95, 0.15, 3, step: 0.015),
    OrbParamDef('patch', 'Colour patches', 0.35, 0, 1, step: 0.01),
    OrbParamDef('stud', 'Stud relief', 0.85, 0, 1, step: 0.01),
    OrbParamDef('seam', 'Seams', 0.6, 0, 1, step: 0.01),
    OrbParamDef('gloss', 'Gloss', 1, 0, 3, step: 0.02),
    OrbParamDef('light', 'Key light', 1, 0, 3, step: 0.015),
    OrbParamDef('gain', 'Gain', 1, 0.05, 5, step: 0.05),
    OrbParamDef('contrast', 'Contrast', 1, 0.15, 10, step: 0.05),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('brickA', 'Red', '#c4281c'),
    OrbColorDef('brickB', 'Yellow', '#f2cd37'),
    OrbColorDef('brickC', 'Blue', '#1e5aa8'),
    OrbColorDef('brickD', 'Green', '#00852b'),
    OrbColorDef('brickE', 'White', '#f4f4f4'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'gain': 1, 'gap': 0.07, 'gloss': 1, 'light': 1, 'rebuild': 0.4, 'spin': 0.25},
    OrbState.thinking: <String, double>{'contrast': 1.05, 'gain': 1.05, 'gap': 0.55, 'gloss': 0.55, 'light': 1.15, 'rebuild': 9, 'seam': 0.95, 'spin': 0.03, 'stud': 1, 'tilt': 0.9},
    OrbState.speaking: <String, double>{'contrast': 0.95, 'gain': 1.25, 'gap': 0, 'gloss': 2.4, 'light': 1.35, 'rebuild': 0.5, 'seam': 0.3, 'spin': 1.6, 'stud': 0.6, 'tilt': 0.42},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.speaking: <String, String>{'brickA': '#ff3b6b', 'brickB': '#ffc93c', 'brickC': '#21d4fd', 'brickD': '#7af5a0', 'brickE': '#ffffff'},
  },
);

/// Renders a ball of glossy toy bricks, studs up — it rebuilds itself while it thinks. Thin wrapper over [ShaderOrb].
class Orb12 extends ShaderOrb {
  const Orb12({
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
  }) : super(variant: orb12Variant);
}
