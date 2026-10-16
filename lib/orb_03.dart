/// ORB-03 — a turbulent belt of light girdling the ball, contoured in rainbow.
///
/// Flutter port of the shadercn ORB-03 component. The fragment shader
/// (`shaders/orb_03.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-03 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb03Variant = OrbVariant(
  key: 'orb-03',
  label: 'ORB-03',
  note: 'a turbulent belt of light girdling the ball, contoured in rainbow',
  shaderAsset: 'shaders/orb_03.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Anim speed', 0.6, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('wander', 'Belt tilt drift', 0.3, 0, 5, step: 0.02, integrate: true),
    OrbParamDef('feedback', 'Tilt feedback', 1.5, 0, 40, step: 0.1),
    OrbParamDef('camDist', 'Camera distance', 5, 1, 50, step: 0.3),
    OrbParamDef('focal', 'Lens', 1.05, 0.15, 15, step: 0.05),
    OrbParamDef('shellR', 'Shell radius', 3, 0.2, 20, step: 0.1),
    OrbParamDef('shellW', 'Shell weight', 0.12, 0.005, 1, step: 0.005),
    OrbParamDef('plane', 'Belt tightness', 0.15, 0, 1, step: 0.005),
    OrbParamDef('turb', 'Warp', 0.55, 0, 4, step: 0.02),
    OrbParamDef('width', 'Belt width', 0.004, 0.0005, 0.4, step: 0.0005),
    OrbParamDef('pulse', 'Belt breathing', 0, 0, 1, step: 0.01),
    OrbParamDef('surge', 'Belt surge', 0, 0, 1, step: 0.01),
    OrbParamDef('hue', 'Contour hue', 25, 0, 60, step: 0.1),
    OrbParamDef('spread', 'Colour spread', 1, 0, 3, step: 0.02),
    OrbParamDef('envRadius', 'Envelope radius', 3.3, 0.15, 20, step: 0.1),
    OrbParamDef('envCore', 'Envelope core', 0.92, 0.3, 1.02, step: 0.01),
    OrbParamDef('fill', 'Body fill', 0.1, 0, 40, step: 0.05),
    OrbParamDef('stepClamp', 'Step clamp', 1500, 5, 20000, step: 25),
    OrbParamDef('scatter', 'Diffusion', 0.0006, 0, 0.1, step: 0.0002),
    OrbParamDef('exposure', 'Exposure', 1500, 20, 100000, step: 50),
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
    OrbState.idle: <String, double>{'alphaGain': 2, 'envCore': 1.02, 'exposure': 1450, 'feedback': 2, 'hue': 39.8, 'plane': 0.085, 'scatter': 0.0006, 'shellR': 2, 'shellW': 0.085, 'speed': 0.6, 'spread': 0.94, 'stepClamp': 1475, 'turb': 1.54, 'wander': 0.3, 'width': 0.001},
    OrbState.thinking: <String, double>{'alphaGain': 2, 'envCore': 0.84, 'envRadius': 7.4, 'exposure': 2300, 'feedback': 7.5, 'focal': 1.9, 'hue': 28.3, 'plane': 0.345, 'pulse': 1, 'scatter': 0, 'shellR': 1.9, 'shellW': 0.005, 'speed': 2, 'spread': 1.02, 'turb': 0.7, 'wander': 1.1, 'width': 0.048},
    OrbState.speaking: <String, double>{'alphaGain': 2.7, 'envRadius': 3.4, 'exposure': 650, 'feedback': 0.3, 'plane': 0.1, 'scatter': 0.0003, 'shellR': 1.8, 'shellW': 0.19, 'speed': 0.9, 'spread': 1.04, 'surge': 1, 'turb': 0.14, 'wander': 0.84, 'width': 0.018},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'tint': '#ffffff'},
    OrbState.thinking: <String, String>{'tint': '#9db8ff'},
    OrbState.speaking: <String, String>{'tint': '#ffc492'},
  },
);

/// Renders a turbulent belt of light girdling the ball, contoured in rainbow. Thin wrapper over [ShaderOrb].
class Orb03 extends ShaderOrb {
  const Orb03({
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
  }) : super(variant: orb03Variant);
}
