/// ORB-24 — a Minecraft Earth — a perfect voxel sphere whose seasons cycle it through lush, cherry-grove, ice, mesa and desert worlds.
///
/// Flutter port of the shadercn ORB-24 component. The fragment shader
/// (`shaders/orb_24.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-24 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb24Variant = OrbVariant(
  key: 'orb-24',
  label: 'ORB-24',
  note: 'a Minecraft Earth — a perfect voxel sphere whose seasons cycle it through lush, cherry-grove, ice, mesa and desert worlds',
  shaderAsset: 'shaders/orb_24.frag',
  params: <OrbParamDef>[
    OrbParamDef('spin', 'Spin', 0.22, 0, 5, step: 0.03, integrate: true),
    OrbParamDef('tilt', 'Tilt', 0.45, 0, 4, step: 0.02),
    OrbParamDef('drift', 'Terrain drift', 0.12, 0, 10, step: 0.05, integrate: true),
    OrbParamDef('season', 'Season rate', 0.3, 0, 10, step: 0.05, integrate: true),
    OrbParamDef('shuffle', 'Ember rate', 0.8, 0, 20, step: 0.1, integrate: true),
    OrbParamDef('radius', 'Radius', 1.15, 0.15, 3, step: 0.015),
    OrbParamDef('blocks', 'Blocks', 64, 16, 96, step: 1),
    OrbParamDef('rough', 'Mountains', 0.45, 0, 0.8, step: 0.01),
    OrbParamDef('scale', 'Terrain scale', 2.4, 0.5, 8, step: 0.05),
    OrbParamDef('sea', 'Sea level', 0.5, 0, 1, step: 0.01),
    OrbParamDef('trees', 'Trees', 0.75, 0, 1, step: 0.01),
    OrbParamDef('cave', 'Caves', 0.4, 0, 1, step: 0.01),
    OrbParamDef('ore', 'Ore density', 0.12, 0, 0.6, step: 0.01),
    OrbParamDef('glow', 'Ore glow', 0.9, 0, 5, step: 0.03),
    OrbParamDef('core', 'Molten core', 0.5, 0, 1, step: 0.01),
    OrbParamDef('texture', 'Texture grain', 0.6, 0, 1, step: 0.01),
    OrbParamDef('light', 'Key light', 1, 0, 3, step: 0.015),
    OrbParamDef('gain', 'Gain', 1, 0.05, 5, step: 0.05),
    OrbParamDef('contrast', 'Contrast', 1, 0.15, 10, step: 0.05),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('grass', 'Grass', '#6abe30'),
    OrbColorDef('dirt', 'Mud', '#6f4a2f'),
    OrbColorDef('stone', 'Stone', '#8a8a90'),
    OrbColorDef('sand', 'Sand', '#dbcf9c'),
    OrbColorDef('water', 'Water', '#2f66d0'),
    OrbColorDef('leaf', 'Leaves', '#3e8f27'),
    OrbColorDef('ore', 'Ore', '#4de3ff'),
    OrbColorDef('lava', 'Lava', '#ff7b26'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'core': 0.5, 'drift': 0.12, 'gain': 1, 'glow': 0.9, 'light': 1, 'season': 0.3, 'shuffle': 0.8, 'spin': 0.22},
    OrbState.thinking: <String, double>{'core': 0.35, 'drift': 1.7, 'gain': 0.95, 'glow': 1.3, 'light': 0.9, 'season': 1.8, 'shuffle': 4.5, 'spin': 0.04},
    OrbState.speaking: <String, double>{'core': 1, 'drift': 0.35, 'gain': 1.1, 'glow': 1.6, 'light': 1.15, 'season': 0.6, 'shuffle': 1.6, 'spin': 0.85},
  },
);

/// Renders a Minecraft Earth — a perfect voxel sphere whose seasons cycle it through lush, cherry-grove, ice, mesa and desert worlds. Thin wrapper over [ShaderOrb].
class Orb24 extends ShaderOrb {
  const Orb24({
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
  }) : super(variant: orb24Variant);
}
