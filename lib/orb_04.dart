/// ORB-04 — a hollow shell of light, faceted by a voxel lattice.
///
/// Flutter port of the shadercn ORB-04 component. The fragment shader
/// (`shaders/orb_04.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-04 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb04Variant = OrbVariant(
  key: 'orb-04',
  label: 'ORB-04',
  note: 'a hollow shell of light, faceted by a voxel lattice',
  shaderAsset: 'shaders/orb_04.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Anim speed', 0.6, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('camDist', 'Camera distance', 9, 1, 60, step: 0.3),
    OrbParamDef('focal', 'Lens', 1.35, 0.15, 15, step: 0.05),
    OrbParamDef('shellR', 'Shell radius', 5, 0.3, 20, step: 0.1),
    OrbParamDef('pitch', 'Facet size', 0.3, 0.005, 1.5, step: 0.005),
    OrbParamDef('turb', 'Displacement', 0.45, 0, 5, step: 0.02),
    OrbParamDef('slack', 'Trace slack', 0.1, 0.01, 0.9, step: 0.005),
    OrbParamDef('width', 'Surface width', 0.003, 0.0005, 0.3, step: 0.0005),
    OrbParamDef('hueGain', 'Position hue', 1, 0, 6, step: 0.02),
    OrbParamDef('floorLevel', 'White floor', 0.8, 0, 4, step: 0.02),
    OrbParamDef('envScale', 'Silhouette margin', 1.16, 1, 2, step: 0.01),
    OrbParamDef('exposure', 'Exposure', 3000, 20, 40000, step: 20),
    OrbParamDef('contrast', 'Contrast', 1.3, 0.15, 15, step: 0.1),
    OrbParamDef('saturation', 'Saturation', 1.3, 0, 4, step: 0.02),
    OrbParamDef('alphaGain', 'Alpha gain', 2, 0.05, 15, step: 0.1),
    OrbParamDef('edge', 'Edge sharpness', 1, 0, 1, step: 0.01),
    OrbParamDef('edgeFade', 'Halo falloff', 0.98, 0.1, 0.985, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('tint', 'Tint', '#ffffff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'contrast': 1.3, 'exposure': 3000, 'hueGain': 1, 'slack': 0.1, 'speed': 0.6, 'turb': 0.45, 'width': 0.003},
    OrbState.thinking: <String, double>{'contrast': 1.75, 'exposure': 4800, 'hueGain': 1.7, 'slack': 0.07, 'speed': 1.8, 'turb': 0.85, 'width': 0.0012},
    OrbState.speaking: <String, double>{'contrast': 0.92, 'envScale': 1.67, 'exposure': 1220, 'floorLevel': 0.82, 'hueGain': 0.5, 'pitch': 0.22, 'saturation': 1.66, 'slack': 0.165, 'speed': 2, 'turb': 0.8, 'width': 0.032},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'tint': '#ffffff'},
    OrbState.thinking: <String, String>{'tint': '#9db8ff'},
    OrbState.speaking: <String, String>{'tint': '#94f3ff'},
  },
);

/// Renders a hollow shell of light, faceted by a voxel lattice. Thin wrapper over [ShaderOrb].
class Orb04 extends ShaderOrb {
  const Orb04({
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
  }) : super(variant: orb04Variant);
}
