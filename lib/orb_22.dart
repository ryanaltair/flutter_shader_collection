/// ORB-22 — field lines swirling around the ball about a wandering axis.
///
/// Flutter port of the shadercn ORB-22 component. The fragment shader
/// (`shaders/orb_22.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-22 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb22Variant = OrbVariant(
  key: 'orb-22',
  label: 'ORB-22',
  note: 'field lines swirling around the ball about a wandering axis',
  shaderAsset: 'shaders/orb_22.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Anim speed', 0.5, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('wander', 'Axis wander', 0.12, 0, 3, step: 0.015, integrate: true),
    OrbParamDef('camDist', 'Camera distance', 7, 1, 50, step: 0.3),
    OrbParamDef('focal', 'Lens', 2.25, 0.15, 15, step: 0.1),
    OrbParamDef('hug', 'Surface hug', 0.8, 0, 3, step: 0.015),
    OrbParamDef('turb', 'Cell shimmer', 0.6, 0, 5, step: 0.03),
    OrbParamDef('stepScale', 'Step scale', 0.07, 0.005, 1.5, step: 0.01),
    OrbParamDef('hueStep', 'Step hue', 0.12, 0, 10, step: 0.03),
    OrbParamDef('hueDepth', 'Depth hue', 1.4, 0, 10, step: 0.03),
    OrbParamDef('glow', 'Vector glow', 1.4, 0, 10, step: 0.05),
    OrbParamDef('glowFew', 'Glow density', 0.12, 0, 1.5, step: 0.01),
    OrbParamDef('envRadius', 'Envelope radius', 2.6, 0.15, 15, step: 0.1),
    OrbParamDef('envCore', 'Envelope core', 0.88, 0.3, 1.02, step: 0.01),
    OrbParamDef('fill', 'Body fill', 0.15, 0, 100, step: 0.3),
    OrbParamDef('stepClamp', 'Step clamp', 800, 3, 5000, step: 30),
    OrbParamDef('scatter', 'Diffusion', 0.01, 0, 0.5, step: 0.003),
    OrbParamDef('exposure', 'Exposure', 260, 1.5, 5000, step: 15),
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
    OrbState.idle: <String, double>{'alphaGain': 2, 'exposure': 260, 'glow': 1.3, 'glowFew': 0.12, 'scatter': 0.01, 'speed': 0.4, 'turb': 0.55, 'wander': 0.1},
    OrbState.thinking: <String, double>{'alphaGain': 2.1, 'exposure': 230, 'glow': 1.7, 'glowFew': 0.07, 'scatter': 0.0095, 'speed': 1.2, 'turb': 0.7, 'wander': 0.6},
    OrbState.speaking: <String, double>{'alphaGain': 2.5, 'exposure': 170, 'glow': 2.4, 'glowFew': 0.22, 'scatter': 0.0075, 'speed': 2.2, 'turb': 0.85, 'wander': 0.3},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'tint': '#ffffff'},
    OrbState.thinking: <String, String>{'tint': '#c3d2ff'},
    OrbState.speaking: <String, String>{'tint': '#ffd9c4'},
  },
);

/// Renders field lines swirling around the ball about a wandering axis. Thin wrapper over [ShaderOrb].
class Orb22 extends ShaderOrb {
  const Orb22({
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
  }) : super(variant: orb22Variant);
}
