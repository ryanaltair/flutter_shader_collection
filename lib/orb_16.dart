/// ORB-16 — sunlight through water — a caustic net crawling over the ball, fringing into colour where it moves.
///
/// Flutter port of the shadercn ORB-16 component. The fragment shader
/// (`shaders/orb_16.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-16 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb16Variant = OrbVariant(
  key: 'orb-16',
  label: 'ORB-16',
  note: 'sunlight through water — a caustic net crawling over the ball, fringing into colour where it moves',
  shaderAsset: 'shaders/orb_16.frag',
  params: <OrbParamDef>[
    OrbParamDef('flow', 'Water flow', 0.9, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('spin', 'Turn', 0.08, 0, 5, step: 0.03, integrate: true),
    OrbParamDef('swellRate', 'Surge rate', 0.6, 0, 8, step: 0.05, integrate: true),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('scale', 'Net scale', 9, 3, 30, step: 0.1),
    OrbParamDef('warp', 'Ripple depth', 0.8, 0, 3, step: 0.02),
    OrbParamDef('edge', 'Line sharpness', 2.2, 0.5, 10, step: 0.05),
    OrbParamDef('split', 'Colour fringe', 0.6, 0, 3, step: 0.02),
    OrbParamDef('swell', 'Surge depth', 0.15, 0, 1, step: 0.01),
    OrbParamDef('gain', 'Sun power', 1.6, 0.05, 6, step: 0.05),
    OrbParamDef('contrast', 'Tone knee', 1.1, 0.15, 6, step: 0.05),
    OrbParamDef('light', 'Floor light', 0.9, 0, 3, step: 0.015),
    OrbParamDef('rim', 'Rim sheen', 0.6, 0, 3, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('deep', 'Water', '#0b2f6e'),
    OrbColorDef('sun', 'Caustic light', '#7ff6ff'),
    OrbColorDef('sheen', 'Sheen', '#bfe8ff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'contrast': 1.3, 'edge': 3, 'flow': 0.92, 'gain': 6, 'light': 0.9, 'rim': 0.6, 'spin': 0.09, 'split': 0.6, 'swell': 0.15, 'swellRate': 0.6, 'warp': 0.8},
    OrbState.thinking: <String, double>{'contrast': 1.15, 'edge': 2.8, 'flow': 3.22, 'gain': 3.35, 'light': 0.525, 'rim': 0.21, 'spin': 0.03, 'split': 0.36, 'swell': 0.26, 'swellRate': 2.4, 'warp': 1.52},
    OrbState.speaking: <String, double>{'contrast': 0.85, 'edge': 1.7, 'flow': 1.8, 'gain': 3.6, 'light': 0.96, 'rim': 0.18, 'spin': 0.7, 'split': 1.1, 'swell': 1, 'swellRate': 5.4, 'warp': 1.7},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'deep': '#6f0b0b', 'sheen': '#bfe8ff', 'sun': '#7ff6ff'},
    OrbState.thinking: <String, String>{'deep': '#3a0808', 'sheen': '#ffffff', 'sun': '#ffffff'},
    OrbState.speaking: <String, String>{'deep': '#8d2525', 'sheen': '#ffb3c6', 'sun': '#ffb914'},
  },
);

/// Renders sunlight through water — a caustic net crawling over the ball, fringing into colour where it moves. Thin wrapper over [ShaderOrb].
class Orb16 extends ShaderOrb {
  const Orb16({
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
  }) : super(variant: orb16Variant);
}
