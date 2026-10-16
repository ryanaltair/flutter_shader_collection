/// ORB-20 — a water film rushing down the ball, fountain-style.
///
/// Flutter port of the shadercn ORB-20 component. The fragment shader
/// (`shaders/orb_20.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-20 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb20Variant = OrbVariant(
  key: 'orb-20',
  label: 'ORB-20',
  note: 'a water film rushing down the ball, fountain-style',
  shaderAsset: 'shaders/orb_20.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Ripple speed', 0.5, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('flow', 'Fall rush', 3, 0, 20, step: 0.1, integrate: true),
    OrbParamDef('camDist', 'Camera distance', 7, 1, 50, step: 0.3),
    OrbParamDef('focal', 'Lens', 2.25, 0.15, 15, step: 0.1),
    OrbParamDef('tilt', 'Flow tilt', 0.15, 0, 4, step: 0.02),
    OrbParamDef('stretch', 'Fall stretch', 0.3, 0.03, 3, step: 0.015),
    OrbParamDef('foam', 'Foam', 0.3, 0, 3, step: 0.015),
    OrbParamDef('wall', 'Film sharpness', 3, 0.15, 20, step: 0.1),
    OrbParamDef('stepScale', 'Step scale', 0.2, 0.015, 1.5, step: 0.01),
    OrbParamDef('hueScale', 'Hue banding', 0.85, 0, 3, step: 0.015),
    OrbParamDef('envRadius', 'Envelope radius', 2.6, 0.15, 15, step: 0.1),
    OrbParamDef('envCore', 'Envelope core', 1, 0.3, 1.02, step: 0.01),
    OrbParamDef('fill', 'Body fill', 0.4, 0, 100, step: 0.3),
    OrbParamDef('stepClamp', 'Step clamp', 20, 0.3, 300, step: 1.5),
    OrbParamDef('scatter', 'Diffusion', 0.01, 0, 0.5, step: 0.003),
    OrbParamDef('exposure', 'Exposure', 22, 1.5, 1500, step: 10),
    OrbParamDef('contrast', 'Contrast', 1.15, 0.15, 15, step: 0.1),
    OrbParamDef('saturation', 'Saturation', 1.55, 0, 4, step: 0.02),
    OrbParamDef('alphaGain', 'Alpha gain', 2, 0.05, 15, step: 0.1),
    OrbParamDef('edge', 'Edge sharpness', 1, 0, 1, step: 0.01),
    OrbParamDef('edgeFade', 'Halo falloff', 0.98, 0.1, 0.985, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('tint', 'Tint', '#ffffff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'alphaGain': 2, 'exposure': 22, 'flow': 3, 'foam': 0.3, 'scatter': 0.01, 'speed': 0.5},
    OrbState.thinking: <String, double>{'alphaGain': 2.1, 'exposure': 21, 'flow': 3.3, 'foam': 0.33, 'scatter': 0.0095, 'speed': 0.6},
    OrbState.speaking: <String, double>{'alphaGain': 2.5, 'exposure': 16, 'flow': 5.5, 'foam': 0.45, 'scatter': 0.0075, 'speed': 1},
  },
);

/// Renders a water film rushing down the ball, fountain-style. Thin wrapper over [ShaderOrb].
class Orb20 extends ShaderOrb {
  const Orb20({
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
  }) : super(variant: orb20Variant);
}
