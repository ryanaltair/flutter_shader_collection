/// ORB-15 — an iridescent particle-track web worn as the ball's skin.
///
/// Flutter port of the shadercn ORB-15 component. The fragment shader
/// (`shaders/orb_15.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-15 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb15Variant = OrbVariant(
  key: 'orb-15',
  label: 'ORB-15',
  note: 'an iridescent particle-track web worn as the ball\'s skin',
  shaderAsset: 'shaders/orb_15.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Anim speed', 0.5, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('wander', 'Axis wander', 0.15, 0, 3, step: 0.015, integrate: true),
    OrbParamDef('camDist', 'Camera distance', 7, 1, 50, step: 0.3),
    OrbParamDef('focal', 'Lens', 2.25, 0.15, 15, step: 0.1),
    OrbParamDef('fieldScale', 'Web density', 2.4, 1, 20, step: 0.1),
    OrbParamDef('turb', 'Weave', 0.8, 0, 5, step: 0.03),
    OrbParamDef('stepScale', 'Skin depth', 0.015, 0.0015, 0.4, step: 0.005),
    OrbParamDef('disperse', 'Dispersion', 1, 0, 5, step: 0.03),
    OrbParamDef('envRadius', 'Envelope radius', 2.6, 0.15, 15, step: 0.1),
    OrbParamDef('envCore', 'Envelope core', 1, 0.3, 1.02, step: 0.01),
    OrbParamDef('fill', 'Body fill', 0.3, 0, 100, step: 0.3),
    OrbParamDef('stepClamp', 'Step clamp', 150, 3, 5000, step: 30),
    OrbParamDef('scatter', 'Diffusion', 0.01, 0, 0.5, step: 0.003),
    OrbParamDef('exposure', 'Exposure', 50, 1.5, 1500, step: 10),
    OrbParamDef('contrast', 'Contrast', 1.35, 0.15, 15, step: 0.1),
    OrbParamDef('saturation', 'Saturation', 1.35, 0, 4, step: 0.02),
    OrbParamDef('alphaGain', 'Alpha gain', 2, 0.05, 15, step: 0.1),
    OrbParamDef('edge', 'Edge sharpness', 1, 0, 1, step: 0.01),
    OrbParamDef('edgeFade', 'Halo falloff', 0.98, 0.1, 0.985, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('tint', 'Tint', '#ffffff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'alphaGain': 2, 'disperse': 1, 'exposure': 72, 'scatter': 0.01, 'speed': 0.4, 'turb': 0.75, 'wander': 0.12},
    OrbState.thinking: <String, double>{'alphaGain': 2.1, 'disperse': 0.8, 'exposure': 66, 'scatter': 0.0095, 'speed': 1, 'turb': 0.95, 'wander': 0.7},
    OrbState.speaking: <String, double>{'alphaGain': 2.5, 'disperse': 1.6, 'exposure': 46, 'scatter': 0.0075, 'speed': 2, 'turb': 1.1, 'wander': 0.3},
  },
);

/// Renders an iridescent particle-track web worn as the ball's skin. Thin wrapper over [ShaderOrb].
class Orb15 extends ShaderOrb {
  const Orb15({
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
  }) : super(variant: orb15Variant);
}
