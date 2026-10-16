/// ORB-09 — torn rings of rainbow light worn as the ball's latitudes.
///
/// Flutter port of the shadercn ORB-09 component. The fragment shader
/// (`shaders/orb_09.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-09 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb09Variant = OrbVariant(
  key: 'orb-09',
  label: 'ORB-09',
  note: 'torn rings of rainbow light worn as the ball\'s latitudes',
  shaderAsset: 'shaders/orb_09.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Anim speed', 0.6, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('spin', 'Roll', 0.12, 0, 3, step: 0.015, integrate: true),
    OrbParamDef('tilt', 'Tilt', 0.4, -1.5, 1.5, step: 0.015),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('scale', 'Ring spacing', 3.5, 0.3, 20, step: 0.1),
    OrbParamDef('warp', 'Tear', 0.45, 0, 3, step: 0.02),
    OrbParamDef('seed', 'Ring seed', 0.9, 0, 3, step: 0.01),
    OrbParamDef('glow', 'Ring glow', 0.05, 0, 1, step: 0.002),
    OrbParamDef('lineSoft', 'Ring width', 0.05, 0.002, 1, step: 0.002),
    OrbParamDef('inner', 'Inner falloff', 3, 0.2, 12, step: 0.05),
    OrbParamDef('fringe', 'Rainbow fringe', 0.1, 0, 2, step: 0.005),
    OrbParamDef('fringeSoft', 'Fringe width', 0.003, 0.001, 1, step: 0.001),
    OrbParamDef('ringPhase', 'Ring hue step', 0.8, 0, 3, step: 0.01),
    OrbParamDef('exposure', 'Exposure', 1.1, 0.05, 20, step: 0.05),
    OrbParamDef('contrast', 'Contrast', 1.1, 0.15, 10, step: 0.05),
    OrbParamDef('saturation', 'Saturation', 1.2, 0, 4, step: 0.02),
    OrbParamDef('light', 'Key light', 0.5, 0, 3, step: 0.015),
    OrbParamDef('rim', 'Rim sheen', 0.4, 0, 3, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('tint', 'Tint', '#ffffff'),
    OrbColorDef('sheen', 'Sheen', '#b9d6ff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'contrast': 1.15, 'exposure': 1.1, 'fringe': 0.1, 'glow': 0.05, 'lineSoft': 0.05, 'speed': 0.6, 'spin': 0.12, 'warp': 0.45},
    OrbState.thinking: <String, double>{'contrast': 1.15, 'exposure': 1.75, 'fringe': 0.96, 'fringeSoft': 0.854, 'glow': 0.2, 'light': 1.035, 'lineSoft': 0.152, 'rim': 0.66, 'ringPhase': 2.53, 'saturation': 2.22, 'warp': 2.54},
    OrbState.speaking: <String, double>{'contrast': 0.85, 'exposure': 0.68, 'fringe': 0.81, 'fringeSoft': 0.058, 'glow': 0.04, 'light': 0.99, 'lineSoft': 0.22, 'rim': 0.015, 'ringPhase': 1.03, 'seed': 1.02, 'speed': 4.7, 'spin': 0.34, 'warp': 0.22},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'sheen': '#b9d6ff', 'tint': '#ffffff'},
    OrbState.thinking: <String, String>{'sheen': '#7ba6ff', 'tint': '#9db8ff'},
    OrbState.speaking: <String, String>{'sheen': '#ffb277', 'tint': '#ffc492'},
  },
);

/// Renders torn rings of rainbow light worn as the ball's latitudes. Thin wrapper over [ShaderOrb].
class Orb09 extends ShaderOrb {
  const Orb09({
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
  }) : super(variant: orb09Variant);
}
