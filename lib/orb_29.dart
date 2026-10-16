/// ORB-29 — an LED tile wall lighting up in flowing blobs, wrapped on the ball.
///
/// Flutter port of the shadercn ORB-29 component. The fragment shader
/// (`shaders/orb_29.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-29 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb29Variant = OrbVariant(
  key: 'orb-29',
  label: 'ORB-29',
  note: 'an LED tile wall lighting up in flowing blobs, wrapped on the ball',
  shaderAsset: 'shaders/orb_29.frag',
  params: <OrbParamDef>[
    OrbParamDef('drift', 'Drift', 0.45, 0, 10, step: 0.05, integrate: true),
    OrbParamDef('churn', 'Churn', 0.5, 0, 10, step: 0.05, integrate: true),
    OrbParamDef('swirl', 'Fluidity', 1.2, 0, 3, step: 0.015),
    OrbParamDef('shuffle', 'Shuffle', 0.6, 0, 20, step: 0.1, integrate: true),
    OrbParamDef('pulse', 'Pulse depth', 0, 0, 2, step: 0.01),
    OrbParamDef('spin', 'Roll', 0.1, 0, 5, step: 0.03, integrate: true),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('cells', 'Tile grid', 48, 16, 160, step: 2),
    OrbParamDef('scale', 'Blob scale', 1.3, 0.3, 10, step: 0.1),
    OrbParamDef('coverage', 'Coverage', 0.52, 0, 1.2, step: 0.01),
    OrbParamDef('confetti', 'Confetti', 0.22, 0, 1, step: 0.01),
    OrbParamDef('light', 'Key light', 0.6, 0, 3, step: 0.015),
    OrbParamDef('gain', 'Panel gain', 1, 0.05, 5, step: 0.05),
    OrbParamDef('contrast', 'Contrast', 1, 0.15, 10, step: 0.05),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('lit', 'Lit tile', '#fff2dd'),
    OrbColorDef('wall', 'Wall', '#161616'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'churn': 0.5, 'coverage': 0.52, 'drift': 0.45, 'gain': 1, 'pulse': 0, 'shuffle': 0.6, 'spin': 0.1},
    OrbState.thinking: <String, double>{'churn': 1.9, 'coverage': 0.42, 'drift': 0.1, 'gain': 0.95, 'pulse': 0, 'shuffle': 5, 'spin': 0.03},
    OrbState.speaking: <String, double>{'churn': 0.9, 'coverage': 0.44, 'drift': 0.5, 'gain': 1.15, 'pulse': 0.55, 'shuffle': 1.2, 'spin': 0.45},
  },
);

/// Renders an LED tile wall lighting up in flowing blobs, wrapped on the ball. Thin wrapper over [ShaderOrb].
class Orb29 extends ShaderOrb {
  const Orb29({
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
  }) : super(variant: orb29Variant);
}
