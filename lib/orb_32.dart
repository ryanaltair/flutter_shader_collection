/// ORB-32 — a galaxy marched as gas and dust inside the ball.
///
/// Flutter port of the shadercn ORB-32 component. The fragment shader
/// (`shaders/orb_32.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-32 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb32Variant = OrbVariant(
  key: 'orb-32',
  label: 'ORB-32',
  note: 'a galaxy marched as gas and dust inside the ball',
  shaderAsset: 'shaders/orb_32.frag',
  params: <OrbParamDef>[
    OrbParamDef('spin', 'Disc turn', 0.06, 0, 3, step: 0.01, integrate: true),
    OrbParamDef('churn', 'Gas churn', 0.25, 0, 5, step: 0.02, integrate: true),
    OrbParamDef('beat', 'Core beat', 0.8, 0, 12, step: 0.05, integrate: true),
    OrbParamDef('twinkle', 'Twinkle rate', 1.2, 0, 12, step: 0.05, integrate: true),
    OrbParamDef('camDist', 'Camera distance', 7, 1, 50, step: 0.3),
    OrbParamDef('focal', 'Lens', 2.25, 0.15, 15, step: 0.05),
    OrbParamDef('envRadius', 'Envelope radius', 2.6, 0.15, 15, step: 0.1),
    OrbParamDef('tilt', 'Tilt (0 edge-on)', 0.85, 0, 1.5, step: 0.01),
    OrbParamDef('arms', 'Arm count', 2, 1, 6, step: 1),
    OrbParamDef('wind', 'Arm winding', 3.4, 0, 8, step: 0.05),
    OrbParamDef('ragged', 'Arm fray', 3, 0, 12, step: 0.05),
    OrbParamDef('armSharp', 'Arm sharpness', 2.2, 0.3, 8, step: 0.05),
    OrbParamDef('falloff', 'Disc falloff', 1.7, 0.3, 12, step: 0.05),
    OrbParamDef('thick', 'Disc thickness', 0.035, 0.01, 1, step: 0.005),
    OrbParamDef('bulge', 'Core tightness', 40, 2, 200, step: 1),
    OrbParamDef('core', 'Core density', 5, 0, 20, step: 0.1),
    OrbParamDef('turbScale', 'Turbulence scale', 9, 0.5, 30, step: 0.1),
    OrbParamDef('threshold', 'Clumping', 0.35, 0, 1, step: 0.01),
    OrbParamDef('density', 'Gas density', 14, 0.1, 40, step: 0.1),
    OrbParamDef('absorb', 'Dust absorption', 3.5, 0, 20, step: 0.1),
    OrbParamDef('stars', 'Stars', 1.2, 0, 10, step: 0.05),
    OrbParamDef('starDensity', 'Star density', 0.5, 0, 1, step: 0.01),
    OrbParamDef('starScale', 'Star scale', 48, 5, 200, step: 1),
    OrbParamDef('hueReach', 'Hue reach', 0.6, 0.15, 1.5, step: 0.01),
    OrbParamDef('pulse', 'Beat depth', 0.2, 0, 3, step: 0.01),
    OrbParamDef('breathe', 'Disc breathing', 0, 0, 2, step: 0.01),
    OrbParamDef('exposure', 'Exposure', 1.1, 0.05, 50, step: 0.05),
    OrbParamDef('contrast', 'Contrast', 1.15, 0.15, 6, step: 0.05),
    OrbParamDef('saturation', 'Saturation', 1.35, 0, 4, step: 0.02),
    OrbParamDef('alphaGain', 'Alpha gain', 2, 0.05, 15, step: 0.1),
    OrbParamDef('fill', 'Night fill', 0.85, 0, 1, step: 0.01),
    OrbParamDef('rim', 'Rim light', 0.35, 0, 3, step: 0.015),
    OrbParamDef('edge', 'Edge sharpness', 1, 0, 1, step: 0.01),
    OrbParamDef('edgeFade', 'Halo falloff', 0.98, 0.1, 0.985, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('tint', 'Tint', '#ffffff'),
    OrbColorDef('core', 'Core', '#fff3d6'),
    OrbColorDef('inner', 'Inner arms', '#7fb4ff'),
    OrbColorDef('outer', 'Outer arms', '#c46bff'),
    OrbColorDef('deep', 'Night', '#04050f'),
    OrbColorDef('rim', 'Rim', '#8fb0ff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'absorb': 3.5, 'armSharp': 2.2, 'beat': 0.8, 'breathe': 0, 'churn': 0.25, 'contrast': 1.15, 'core': 5, 'density': 14, 'exposure': 1.1, 'pulse': 0.2, 'ragged': 3, 'saturation': 1.35, 'spin': 0.06, 'stars': 1.2, 'thick': 0.035, 'threshold': 0.35, 'tilt': 0.85, 'twinkle': 1.2},
    OrbState.thinking: <String, double>{'absorb': 6, 'armSharp': 1, 'beat': 2.4, 'breathe': 0, 'churn': 1.6, 'contrast': 1.3, 'core': 3, 'density': 20, 'exposure': 1.05, 'pulse': 0.25, 'ragged': 8, 'saturation': 1.2, 'spin': 0.45, 'stars': 1.8, 'thick': 0.07, 'threshold': 0.5, 'tilt': 1.45, 'twinkle': 4.5},
    OrbState.speaking: <String, double>{'absorb': 1.6, 'armSharp': 1.8, 'beat': 4.8, 'breathe': 0.45, 'churn': 0.6, 'contrast': 1.05, 'core': 12, 'density': 18, 'exposure': 0.75, 'pulse': 1, 'ragged': 2, 'saturation': 1.6, 'spin': 0.2, 'stars': 2, 'thick': 0.04, 'threshold': 0.25, 'tilt': 1.3, 'twinkle': 2.4},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'core': '#fff3d6', 'deep': '#04050f', 'inner': '#7fb4ff', 'outer': '#c46bff', 'rim': '#8fb0ff', 'tint': '#ffffff'},
    OrbState.thinking: <String, String>{'core': '#e6f0ff', 'deep': '#030614', 'inner': '#6fb0ff', 'outer': '#4fe3ff', 'rim': '#7fa8ff', 'tint': '#ffffff'},
    OrbState.speaking: <String, String>{'core': '#fff4c8', 'deep': '#0a0508', 'inner': '#ffa63c', 'outer': '#ff3f8e', 'rim': '#ffb98a', 'tint': '#ffffff'},
  },
);

/// Renders a galaxy marched as gas and dust inside the ball. Thin wrapper over [ShaderOrb].
class Orb32 extends ShaderOrb {
  const Orb32({
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
  }) : super(variant: orb32Variant);
}
