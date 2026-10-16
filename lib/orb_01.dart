/// ORB-01 — "Cut-glass orb with a dispersive, turbulent interior".
///
/// Flutter port of the shadercn ORB-01 component. The fragment shader
/// (`shaders/orb_01.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
///
/// Usage:
/// ```dart
/// const Orb01(size: 280, state: OrbState.idle);
/// ```
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// Default value of every shader parameter.
///
/// Keys map to the uniforms declared in `shaders/orb_01.frag`; ranges match
/// the original component's declared `[min, max]` bounds.
const Map<String, double> orb01DefaultParams = <String, double>{
  'speed': 0.5,
  'spin': 0.25,
  'camDist': 7,
  'focal': 2.25,
  'tilt': 0.5,
  'turb': 0.3,
  'sheets': 7,
  'disperse': 1,
  'stria': 1,
  'envRadius': 2.6,
  'envCore': 1,
  'fill': 1.5,
  'stepClamp': 20,
  'scatter': 0.02,
  'exposure': 60,
  'contrast': 1,
  'saturation': 1,
  'alphaGain': 2,
  'edge': 1,
  'edgeFade': 0.98,
};

/// Per-state parameter presets the orb eases towards.
const Map<OrbState, Map<String, double>> orb01StatePresets =
    <OrbState, Map<String, double>>{
  OrbState.idle: <String, double>{
    'speed': 0.5,
    'spin': 0.25,
    'turb': 0.3,
    'sheets': 7,
    'disperse': 1,
    'scatter': 0.02,
    'exposure': 60,
    'alphaGain': 2,
  },
  OrbState.speaking: <String, double>{
    'speed': 1.2,
    'spin': 0.7,
    'turb': 0.55,
    'sheets': 5.5,
    'disperse': 1.5,
    'scatter': 0.015,
    'exposure': 45,
    'alphaGain': 2.5,
  },
  OrbState.thinking: <String, double>{
    'speed': 0.6,
    'spin': 0.5,
    'turb': 0.35,
    'sheets': 7,
    'disperse': 1.1,
    'scatter': 0.019,
    'exposure': 57,
    'alphaGain': 2.1,
  },
};

/// Default tint colour, as a hex string.
const String orb01DefaultTint = '#ffffff';

/// The ORB-01 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb01Variant = OrbVariant(
  key: 'orb-01',
  label: 'ORB-01',
  note: 'cut-glass orb with a dispersive, turbulent interior',
  shaderAsset: 'shaders/orb_01.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Anim speed', 0.5, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('spin', 'Spin rate', 0.25, 0, 5, step: 0.03, integrate: true),
    OrbParamDef('camDist', 'Camera distance', 7, 1, 50, step: 0.3),
    OrbParamDef('focal', 'Lens', 2.25, 0.15, 15, step: 0.1),
    OrbParamDef('tilt', 'Field tilt', 0.5, 0, 4, step: 0.02),
    OrbParamDef('turb', 'Turbulence', 0.3, 0, 5, step: 0.03),
    OrbParamDef('sheets', 'Sheet density', 7, 1, 60, step: 0.5),
    OrbParamDef('disperse', 'Dispersion', 1, 0, 5, step: 0.03),
    OrbParamDef('stria', 'Striation depth', 1, 0, 10, step: 0.05),
    OrbParamDef('envRadius', 'Envelope radius', 2.6, 0.15, 15, step: 0.1),
    OrbParamDef('envCore', 'Envelope core', 1, 0.3, 1.02, step: 0.01),
    OrbParamDef('fill', 'Body fill', 1.5, 0, 100, step: 0.3),
    OrbParamDef('stepClamp', 'Step clamp', 20, 0.3, 300, step: 1.5),
    OrbParamDef('scatter', 'Diffusion', 0.02, 0, 0.5, step: 0.003),
    OrbParamDef('exposure', 'Exposure', 60, 1.5, 1500, step: 10),
    OrbParamDef('contrast', 'Contrast', 1, 0.15, 15, step: 0.1),
    OrbParamDef('saturation', 'Saturation', 1, 0, 4, step: 0.02),
    OrbParamDef('alphaGain', 'Alpha gain', 2, 0.05, 15, step: 0.1),
    OrbParamDef('edge', 'Edge sharpness', 1, 0, 1, step: 0.01),
    OrbParamDef('edgeFade', 'Halo falloff', 0.98, 0.1, 0.985, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('tint', 'Tint', '#ffffff', uniform: 'u_tint'),
  ],
  statePresets: orb01StatePresets,
);

/// Renders the animated cut-glass orb. Thin wrapper over [ShaderOrb].
class Orb01 extends ShaderOrb {
  const Orb01({
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
  }) : super(variant: orb01Variant);
}
