/// ORB-18 — a crystal folded out of one eighth of space, tumbling.
///
/// Flutter port of the shadercn ORB-18 component. The fragment shader
/// (`shaders/orb_18.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-18 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb18Variant = OrbVariant(
  key: 'orb-18',
  label: 'ORB-18',
  note: 'a crystal folded out of one eighth of space, tumbling',
  shaderAsset: 'shaders/orb_18.frag',
  params: <OrbParamDef>[
    OrbParamDef('wander', 'Tumble', 0.5, 0, 5, step: 0.02, integrate: true),
    OrbParamDef('camDist', 'Camera distance', 4, 1, 50, step: 0.3),
    OrbParamDef('focal', 'Lens', 1.5, 0.15, 15, step: 0.05),
    OrbParamDef('fold', 'Octant fold', 1, 0, 1, step: 0.01),
    OrbParamDef('crease', 'Diagonal crease', 1, 0, 1, step: 0.01),
    OrbParamDef('freq', 'Crystal frequency', 5, 0.1, 20, step: 0.05),
    OrbParamDef('stepScale', 'Step scale', 0.3, 0.02, 2, step: 0.01),
    OrbParamDef('hue', 'Depth hue', 1.5, 0, 4, step: 0.01),
    OrbParamDef('spread', 'Colour spread', 1, 0, 3, step: 0.02),
    OrbParamDef('envRadius', 'Envelope radius', 2.1, 0.15, 15, step: 0.1),
    OrbParamDef('envCore', 'Envelope core', 0.9, 0.3, 1.02, step: 0.01),
    OrbParamDef('fill', 'Body fill', 0.02, 0, 20, step: 0.01),
    OrbParamDef('stepClamp', 'Step clamp', 40, 1, 2000, step: 1),
    OrbParamDef('scatter', 'Diffusion', 0.004, 0, 0.2, step: 0.001),
    OrbParamDef('exposure', 'Exposure', 18, 0.2, 500, step: 0.5),
    OrbParamDef('contrast', 'Contrast', 1.2, 0.15, 15, step: 0.05),
    OrbParamDef('saturation', 'Saturation', 1.25, 0, 4, step: 0.02),
    OrbParamDef('alphaGain', 'Alpha gain', 2, 0.05, 15, step: 0.1),
    OrbParamDef('edge', 'Edge sharpness', 1, 0, 1, step: 0.01),
    OrbParamDef('edgeFade', 'Halo falloff', 0.98, 0.1, 0.985, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('tint', 'Tint', '#ffffff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'alphaGain': 2, 'crease': 1, 'exposure': 18, 'fold': 1, 'freq': 5, 'scatter': 0.004, 'wander': 0.5},
    OrbState.thinking: <String, double>{'alphaGain': 2, 'crease': 1, 'exposure': 26, 'focal': 2.7, 'fold': 0.91, 'freq': 4.1, 'scatter': 0.02, 'stepClamp': 1200, 'wander': 1.08},
    OrbState.speaking: <String, double>{'alphaGain': 2.7, 'crease': 1, 'envCore': 0.49, 'exposure': 8, 'fold': 1, 'freq': 6.05, 'hue': 2, 'saturation': 2, 'scatter': 0.002, 'stepScale': 0.51, 'wander': 0.7},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'tint': '#ffffff'},
    OrbState.thinking: <String, String>{'tint': '#9db8ff'},
    OrbState.speaking: <String, String>{'tint': '#ffc492'},
  },
);

/// Renders a crystal folded out of one eighth of space, tumbling. Thin wrapper over [ShaderOrb].
class Orb18 extends ShaderOrb {
  const Orb18({
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
  }) : super(variant: orb18Variant);
}
