/// ORB-21 — light diffusing through a cloud.
///
/// Flutter port of the shadercn ORB-21 component. The fragment shader
/// (`shaders/orb_21.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-21 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb21Variant = OrbVariant(
  key: 'orb-21',
  label: 'ORB-21',
  note: 'light diffusing through a cloud',
  shaderAsset: 'shaders/orb_21.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Anim speed', 10, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('camDist', 'Camera distance', 4.4, 0.5, 40, step: 0.2),
    OrbParamDef('focal', 'Lens', 1.8, 0.3, 15, step: 0.1),
    OrbParamDef('radius', 'Cloud radius', 2, 0.15, 10, step: 0.05),
    OrbParamDef('scale', 'Cloud scale', 0.8, 0.1, 15, step: 0.1),
    OrbParamDef('churn', 'Churn', 0.3, 0, 5, step: 0.03),
    OrbParamDef('threshold', 'Clumping', 0.075, 0, 3, step: 0.015),
    OrbParamDef('edgeSoft', 'Edge softness', 0.8, 0.1, 10, step: 0.05),
    OrbParamDef('density', 'Density', 3.2, 0.03, 20, step: 0.1),
    OrbParamDef('absorb', 'Absorption', 1.4, 0.03, 15, step: 0.1),
    OrbParamDef('shadowAbsorb', 'Shadow depth', 2.4, 0, 20, step: 0.1),
    OrbParamDef('shadowLift', 'Shadow lift', 0.55, 0, 5, step: 0.03),
    OrbParamDef('aniso', 'Forward scatter', 0.45, -0.9, 0.9, step: 0.01),
    OrbParamDef('lightSpin', 'Light orbit', 0.12, 0, 3, step: 0.015),
    OrbParamDef('power', 'Light power', 1.9, 0.03, 40, step: 0.2),
    OrbParamDef('ambient', 'Ambient', 0.12, 0, 3, step: 0.015),
    OrbParamDef('exposure', 'Exposure', 1, 0.03, 10, step: 0.05),
    OrbParamDef('alphaGain', 'Alpha gain', 1.5, 0.05, 10, step: 0.05),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('light', 'Light', '#ffd7a3'),
    OrbColorDef('shadow', 'Shadow', '#3a4a8c'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'ambient': 0.12, 'power': 1.9, 'shadowLift': 0.55},
    OrbState.thinking: <String, double>{'ambient': 0.22, 'power': 2.15, 'shadowLift': 0.65},
    OrbState.speaking: <String, double>{'ambient': 0.46, 'power': 3.1, 'shadowLift': 0.95},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'light': '#ffd7a3', 'shadow': '#3a4a8c'},
    OrbState.thinking: <String, String>{'light': '#e6d4ff', 'shadow': '#3b3f96'},
    OrbState.speaking: <String, String>{'light': '#ffb066', 'shadow': '#7a2f6e'},
  },
);

/// Renders light diffusing through a cloud. Thin wrapper over [ShaderOrb].
class Orb21 extends ShaderOrb {
  const Orb21({
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
  }) : super(variant: orb21Variant);
}
