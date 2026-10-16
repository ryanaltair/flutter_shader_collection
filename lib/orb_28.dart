/// ORB-28 — nested binary grids shuttering on a tumbling bit-sphere.
///
/// Flutter port of the shadercn ORB-28 component. The fragment shader
/// (`shaders/orb_28.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-28 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb28Variant = OrbVariant(
  key: 'orb-28',
  label: 'ORB-28',
  note: 'nested binary grids shuttering on a tumbling bit-sphere',
  shaderAsset: 'shaders/orb_28.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Shutter drift', 0.5, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('spin', 'Tumble rate', 0.15, 0, 5, step: 0.03, integrate: true),
    OrbParamDef('tilt', 'Tumble tilt', 0.5, 0, 4, step: 0.02),
    OrbParamDef('radius', 'Radius', 0.9, 0.1, 3, step: 0.015),
    OrbParamDef('gridScale', 'Grid scale', 2, 0.5, 20, step: 0.1),
    OrbParamDef('levels', 'Bit depth', 12, 4, 20, step: 1),
    OrbParamDef('lineW', 'Line width', 2, 0.5, 15, step: 0.1),
    OrbParamDef('shutter', 'Shutter', 1, 0, 4, step: 0.02),
    OrbParamDef('gain', 'Line gain', 1, 0.05, 10, step: 0.05),
    OrbParamDef('body', 'Body glow', 1, 0, 5, step: 0.03),
    OrbParamDef('rim', 'Rim light', 0.6, 0, 5, step: 0.03),
    OrbParamDef('rimPow', 'Rim tightness', 3, 0.3, 20, step: 0.1),
    OrbParamDef('contrast', 'Contrast', 1, 0.15, 10, step: 0.05),
    OrbParamDef('edge', 'Edge sharpness', 1, 0, 1, step: 0.01),
    OrbParamDef('edgeFade', 'Halo falloff', 0.98, 0.1, 0.985, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('lineA', 'X lines', '#ff5a4d'),
    OrbColorDef('lineB', 'Y lines', '#59d8ff'),
    OrbColorDef('base', 'Body', '#101528'),
    OrbColorDef('rim', 'Rim', '#bcd8ff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'body': 0.9, 'contrast': 1.2, 'gain': 1, 'levels': 10, 'lineW': 2.5, 'rim': 0.6, 'rimPow': 5.2, 'shutter': 1.02, 'speed': 1, 'spin': 0.1},
    OrbState.thinking: <String, double>{'body': 0.85, 'gain': 1.2, 'lineW': 2.9, 'rim': 0.7, 'shutter': 0.94, 'speed': 2.4, 'spin': 0.81},
    OrbState.speaking: <String, double>{'body': 0.27, 'contrast': 1.45, 'gain': 0.95, 'gridScale': 10.3, 'levels': 17, 'rim': 1.53, 'rimPow': 10, 'shutter': 1.2, 'speed': 3, 'spin': 1.1},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'base': '#000000', 'lineA': '#ff1100', 'lineB': '#ffffff', 'rim': '#000000'},
    OrbState.thinking: <String, String>{'base': '#000000', 'lineA': '#ff0000', 'lineB': '#ffffff', 'rim': '#000000'},
    OrbState.speaking: <String, String>{'base': '#000000', 'lineA': '#ff0000', 'lineB': '#ffffff', 'rim': '#000000'},
  },
);

/// Renders nested binary grids shuttering on a tumbling bit-sphere. Thin wrapper over [ShaderOrb].
class Orb28 extends ShaderOrb {
  const Orb28({
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
  }) : super(variant: orb28Variant);
}
