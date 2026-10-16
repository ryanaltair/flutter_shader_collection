/// ORB-10 — a lattice of light knitted into the ball's own skin.
///
/// Flutter port of the shadercn ORB-10 component. The fragment shader
/// (`shaders/orb_10.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-10 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb10Variant = OrbVariant(
  key: 'orb-10',
  label: 'ORB-10',
  note: 'a lattice of light knitted into the ball\'s own skin',
  shaderAsset: 'shaders/orb_10.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Anim speed', 0.6, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('scroll', 'Climb', 1.2, 0, 8, step: 0.03, integrate: true),
    OrbParamDef('camDist', 'Camera distance', 7, 1, 50, step: 0.3),
    OrbParamDef('focal', 'Lens', 2, 0.15, 15, step: 0.05),
    OrbParamDef('shellR', 'Shell radius', 2.6, 0.2, 20, step: 0.1),
    OrbParamDef('wrap', 'Wraps around', 8, 1, 14, step: 1),
    OrbParamDef('climb', 'Band spacing', 4, 0.05, 12, step: 0.05),
    OrbParamDef('turb', 'Warp', 0.35, 0, 3, step: 0.02),
    OrbParamDef('layer', 'Layer offset', 0.5, 0, 2, step: 0.01),
    OrbParamDef('cell', 'Lattice weight', 0.45, 0, 2, step: 0.01),
    OrbParamDef('stepScale', 'Step scale', 0.15, 0.02, 3, step: 0.005),
    OrbParamDef('hueStep', 'Layer hue', 0.4, 0, 3, step: 0.01),
    OrbParamDef('spread', 'Colour spread', 1, 0, 3, step: 0.02),
    OrbParamDef('envRadius', 'Envelope radius', 2.9, 0.15, 20, step: 0.1),
    OrbParamDef('envCore', 'Envelope core', 0.92, 0.3, 1.02, step: 0.01),
    OrbParamDef('fill', 'Body fill', 0.1, 0, 40, step: 0.05),
    OrbParamDef('stepClamp', 'Step clamp', 300, 5, 5000, step: 5),
    OrbParamDef('scatter', 'Diffusion', 0.004, 0, 0.2, step: 0.0005),
    OrbParamDef('exposure', 'Exposure', 30, 0.05, 500, step: 0.5),
    OrbParamDef('contrast', 'Contrast', 1.15, 0.15, 15, step: 0.05),
    OrbParamDef('saturation', 'Saturation', 1.2, 0, 4, step: 0.02),
    OrbParamDef('alphaGain', 'Alpha gain', 2, 0.05, 15, step: 0.1),
    OrbParamDef('edge', 'Edge sharpness', 1, 0, 1, step: 0.01),
    OrbParamDef('edgeFade', 'Halo falloff', 0.98, 0.1, 0.985, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('tint', 'Tint', '#ffffff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'alphaGain': 2, 'cell': 0.45, 'exposure': 30, 'scatter': 0.004, 'scroll': 1.2, 'speed': 0.6, 'turb': 0.35},
    OrbState.thinking: <String, double>{'alphaGain': 2.6, 'cell': 0.3, 'contrast': 1.05, 'exposure': 13, 'fill': 0.12, 'layer': 0.65, 'saturation': 1.7, 'scatter': 0.006, 'scroll': 0.5, 'speed': 1.9, 'spread': 1.55, 'stepScale': 0.09, 'turb': 0.85},
    OrbState.speaking: <String, double>{'alphaGain': 2.8, 'cell': 0.95, 'contrast': 0.9, 'exposure': 11, 'saturation': 1.45, 'scatter': 0.0015, 'scroll': 4.2, 'speed': 1, 'turb': 0.18},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'tint': '#ffffff'},
    OrbState.thinking: <String, String>{'tint': '#e8f4ff'},
    OrbState.speaking: <String, String>{'tint': '#ffc492'},
  },
);

/// Renders a lattice of light knitted into the ball's own skin. Thin wrapper over [ShaderOrb].
class Orb10 extends ShaderOrb {
  const Orb10({
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
  }) : super(variant: orb10Variant);
}
