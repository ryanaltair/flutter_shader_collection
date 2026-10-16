/// ORB-27 — a weather-radar mosaic, fronts of coloured pixels sweeping the ball.
///
/// Flutter port of the shadercn ORB-27 component. The fragment shader
/// (`shaders/orb_27.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-27 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb27Variant = OrbVariant(
  key: 'orb-27',
  label: 'ORB-27',
  note: 'a weather-radar mosaic, fronts of coloured pixels sweeping the ball',
  shaderAsset: 'shaders/orb_27.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Front speed', 0.6, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('spin', 'Roll', 0.04, 0, 5, step: 0.03, integrate: true),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('scale', 'Grid zoom', 2.4, 0.3, 8, step: 0.05),
    OrbParamDef('cells', 'Grid', 34, 8, 120, step: 1),
    OrbParamDef('dot', 'Dot size', 0.36, 0.1, 0.5, step: 0.01),
    OrbParamDef('swirl', 'Swirl', 1.5, 0, 8, step: 0.05),
    OrbParamDef('vortex', 'Vortex size', 0.45, 0.1, 2, step: 0.01),
    OrbParamDef('freq', 'Storm scale', 1.6, 0.2, 8, step: 0.05),
    OrbParamDef('warp', 'Bend', 0.5, 0, 3, step: 0.02),
    OrbParamDef('lo', 'Quiet threshold', 0.12, 0, 1, step: 0.005),
    OrbParamDef('hi', 'Peak threshold', 0.82, 0, 1, step: 0.005),
    OrbParamDef('curve', 'Response curve', 1.4, 0.5, 4, step: 0.05),
    OrbParamDef('dither', 'Class dither', 0.12, 0, 0.6, step: 0.005),
    OrbParamDef('sparse', 'Quiet density', 0.16, 0, 1, step: 0.01),
    OrbParamDef('density', 'Fill', 1, 0, 1.5, step: 0.01),
    OrbParamDef('twinkle', 'Twinkle rate', 3, 0, 30, step: 0.5),
    OrbParamDef('grain', 'Paper grain', 0.1, 0, 1, step: 0.01),
    OrbParamDef('light', 'Key light', 0.18, 0, 1, step: 0.01),
    OrbParamDef('rim', 'Rim', 0.35, 0, 1, step: 0.01),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('paper', 'Paper', '#efe9dc'),
    OrbColorDef('c0', 'Quiet', '#a9a9a6'),
    OrbColorDef('c1', 'Class 1', '#2e5df0'),
    OrbColorDef('c2', 'Class 2', '#38d9ec'),
    OrbColorDef('c3', 'Class 3', '#22c35c'),
    OrbColorDef('c4', 'Class 4', '#e8322a'),
    OrbColorDef('c5', 'Class 5', '#f5d020'),
    OrbColorDef('c6', 'Peak', '#e030c0'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'curve': 1.4, 'density': 1, 'dither': 0.12, 'hi': 0.82, 'lo': 0.12, 'sparse': 0.16, 'speed': 1, 'spin': 0.27, 'swirl': 1.5, 'twinkle': 3, 'warp': 0.5},
    OrbState.thinking: <String, double>{'curve': 1.7, 'density': 0.9, 'dither': 0.18, 'freq': 5.2, 'hi': 0.545, 'lo': 0, 'sparse': 0.22, 'speed': 2.4, 'spin': 0.51, 'swirl': 4, 'twinkle': 12, 'warp': 1.06},
    OrbState.speaking: <String, double>{'curve': 1.3, 'density': 1.15, 'dither': 0.1, 'grain': 0.35, 'hi': 0.8, 'lo': 0, 'sparse': 0.22, 'speed': 6.5, 'spin': 0.51, 'swirl': 2, 'twinkle': 5, 'warp': 0.45},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'paper': '#efe9dc'},
    OrbState.thinking: <String, String>{'paper': '#e6e9ee'},
    OrbState.speaking: <String, String>{'paper': '#f5e6d0'},
  },
);

/// Renders a weather-radar mosaic, fronts of coloured pixels sweeping the ball. Thin wrapper over [ShaderOrb].
class Orb27 extends ShaderOrb {
  const Orb27({
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
  }) : super(variant: orb27Variant);
}
