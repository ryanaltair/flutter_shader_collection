/// ORB-05 — rainbow rings travelling through a lattice of lenses.
///
/// Flutter port of the shadercn ORB-05 component. The fragment shader
/// (`shaders/orb_05.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-05 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb05Variant = OrbVariant(
  key: 'orb-05',
  label: 'ORB-05',
  note: 'rainbow rings travelling through a lattice of lenses',
  shaderAsset: 'shaders/orb_05.frag',
  params: <OrbParamDef>[
    OrbParamDef('ring', 'Ring speed', 0.9, 0, 8, step: 0.03, integrate: true),
    OrbParamDef('swirl', 'Swirl', 0.05, 0, 3, step: 0.015, integrate: true),
    OrbParamDef('slide', 'Lattice slide', 0.12, 0, 4, step: 0.02, integrate: true),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('scale', 'Lattice scale', 5, 0.3, 20, step: 0.1),
    OrbParamDef('bulge', 'Dome bulge', 0.3, 0, 4, step: 0.02),
    OrbParamDef('lens', 'Lens strength', 1, 0, 4, step: 0.02),
    OrbParamDef('poleSoft', 'Wall softness', 0.02, 0.0008, 0.5, step: 0.0008),
    OrbParamDef('freq', 'Ring frequency', 1, 0.05, 8, step: 0.05),
    OrbParamDef('spread', 'Colour split', 1, 0, 4, step: 0.02),
    OrbParamDef('gain', 'Brightness', 1.1, 0.05, 4, step: 0.02),
    OrbParamDef('contrast', 'Contrast', 1, 0.15, 6, step: 0.05),
    OrbParamDef('saturation', 'Saturation', 1.15, 0, 4, step: 0.02),
    OrbParamDef('floorLevel', 'Body fill', 0.12, 0, 2, step: 0.01),
    OrbParamDef('light', 'Key light', 0.4, 0, 3, step: 0.015),
    OrbParamDef('rim', 'Rim sheen', 0.45, 0, 3, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('tint', 'Tint', '#ffffff'),
    OrbColorDef('body', 'Body', '#141a30'),
    OrbColorDef('sheen', 'Sheen', '#bcd8ff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'bulge': 0, 'contrast': 1, 'freq': 1.05, 'gain': 1.1, 'lens': 0.38, 'light': 0.66, 'poleSoft': 0.012, 'ring': 0.9, 'saturation': 1.14, 'slide': 0.26, 'spread': 0.7, 'swirl': 0.195},
    OrbState.thinking: <String, double>{'bulge': 0.36, 'contrast': 3.2, 'floorLevel': 0.4, 'freq': 1.3, 'gain': 0.88, 'lens': 1.28, 'poleSoft': 0.042, 'rim': 0, 'ring': 3, 'saturation': 2.36, 'slide': 0.88, 'spread': 1.82, 'swirl': 0.57},
    OrbState.speaking: <String, double>{'bulge': 0.96, 'contrast': 0.75, 'freq': 4.8, 'gain': 1.6, 'lens': 1.2, 'poleSoft': 0.064, 'ring': 1.4, 'slide': 1, 'spread': 0.68, 'swirl': 0.6},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'body': '#141a30', 'sheen': '#bcd8ff', 'tint': '#ffffff'},
    OrbState.thinking: <String, String>{'body': '#080c26', 'sheen': '#7ea9ff', 'tint': '#a6c0ff'},
    OrbState.speaking: <String, String>{'body': '#2e1408', 'sheen': '#ffb277', 'tint': '#ffc492'},
  },
);

/// Renders rainbow rings travelling through a lattice of lenses. Thin wrapper over [ShaderOrb].
class Orb05 extends ShaderOrb {
  const Orb05({
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
  }) : super(variant: orb05Variant);
}
