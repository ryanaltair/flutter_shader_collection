/// ORB-07 — a twist wave travelling out through the ball around a lit column.
///
/// Flutter port of the shadercn ORB-07 component. The fragment shader
/// (`shaders/orb_07.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-07 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb07Variant = OrbVariant(
  key: 'orb-07',
  label: 'ORB-07',
  note: 'a twist wave travelling out through the ball around a lit column',
  shaderAsset: 'shaders/orb_07.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Cell shimmer', 0.5, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('wave', 'Wave speed', 0.7, 0, 8, step: 0.03, integrate: true),
    OrbParamDef('twist', 'Twist', 1, 0, 8, step: 0.02),
    OrbParamDef('spin', 'Roll', 0.1, 0, 3, step: 0.015, integrate: true),
    OrbParamDef('tilt', 'Axis lean', 0.3, -1.5, 1.5, step: 0.015),
    OrbParamDef('camDist', 'Camera distance', 7, 1, 50, step: 0.3),
    OrbParamDef('focal', 'Lens', 2.25, 0.15, 15, step: 0.1),
    OrbParamDef('turb', 'Cell turbulence', 1, 0, 5, step: 0.03),
    OrbParamDef('column', 'Column release', 0, 0, 1, step: 0.01),
    OrbParamDef('stepScale', 'Step scale', 0.1, 0.005, 1.5, step: 0.005),
    OrbParamDef('hueDepth', 'Depth hue', 0.75, 0, 10, step: 0.03),
    OrbParamDef('hueStep', 'Step hue', 0.45, 0, 10, step: 0.03),
    OrbParamDef('envRadius', 'Envelope radius', 2.6, 0.15, 15, step: 0.1),
    OrbParamDef('envCore', 'Envelope core', 0.88, 0.3, 1.02, step: 0.01),
    OrbParamDef('fill', 'Body fill', 0.15, 0, 100, step: 0.3),
    OrbParamDef('stepClamp', 'Step clamp', 400, 3, 5000, step: 10),
    OrbParamDef('scatter', 'Diffusion', 0.01, 0, 0.5, step: 0.003),
    OrbParamDef('exposure', 'Exposure', 60, 1.5, 5000, step: 5),
    OrbParamDef('contrast', 'Contrast', 1.3, 0.15, 15, step: 0.1),
    OrbParamDef('saturation', 'Saturation', 1.15, 0, 4, step: 0.02),
    OrbParamDef('alphaGain', 'Alpha gain', 2, 0.05, 15, step: 0.1),
    OrbParamDef('edge', 'Edge sharpness', 1, 0, 1, step: 0.01),
    OrbParamDef('edgeFade', 'Halo falloff', 0.98, 0.1, 0.985, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('tint', 'Tint', '#ffffff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'alphaGain': 2, 'column': 0, 'exposure': 60, 'scatter': 0.01, 'speed': 0.5, 'turb': 1, 'twist': 1, 'wave': 0.7},
    OrbState.thinking: <String, double>{'alphaGain': 2, 'column': 0, 'exposure': 88, 'scatter': 0.011, 'speed': 1.5, 'turb': 1.35, 'twist': 3.6, 'wave': 0.15},
    OrbState.speaking: <String, double>{'alphaGain': 2.7, 'column': 0.45, 'exposure': 26, 'scatter': 0.006, 'speed': 0.9, 'turb': 0.85, 'twist': 0.35, 'wave': 3.2},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'tint': '#ffffff'},
    OrbState.thinking: <String, String>{'tint': '#9db8ff'},
    OrbState.speaking: <String, String>{'tint': '#ffc492'},
  },
);

/// Renders a twist wave travelling out through the ball around a lit column. Thin wrapper over [ShaderOrb].
class Orb07 extends ShaderOrb {
  const Orb07({
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
  }) : super(variant: orb07Variant);
}
