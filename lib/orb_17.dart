/// ORB-17 — a grainy many-coloured storm with band shear and lightning.
///
/// Flutter port of the shadercn ORB-17 component. The fragment shader
/// (`shaders/orb_17.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-17 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb17Variant = OrbVariant(
  key: 'orb-17',
  label: 'ORB-17',
  note: 'a grainy many-coloured storm with band shear and lightning',
  shaderAsset: 'shaders/orb_17.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Storm speed', 0.9, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('spin', 'Roll', 0.12, 0, 5, step: 0.03, integrate: true),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('scale', 'Weather scale', 2.4, 0.3, 12, step: 0.1),
    OrbParamDef('bands', 'Band count', 6, 0, 20, step: 0.1),
    OrbParamDef('shear', 'Band shear', 1.1, 0, 5, step: 0.03),
    OrbParamDef('warp', 'Warp', 2.2, 0, 8, step: 0.05),
    OrbParamDef('churn', 'Churn', 1.4, 0, 8, step: 0.05),
    OrbParamDef('gain', 'Brightness', 1.15, 0.05, 5, step: 0.05),
    OrbParamDef('contrast', 'Contrast', 1.35, 0.15, 10, step: 0.05),
    OrbParamDef('grain', 'Field grain', 0.4, 0, 2, step: 0.01),
    OrbParamDef('filmGrain', 'Film grain', 0.35, 0, 2, step: 0.01),
    OrbParamDef('grainSize', 'Grain size', 2, 1, 8, step: 1),
    OrbParamDef('rainbow', 'Iridescence', 0.65, 0, 2, step: 0.01),
    OrbParamDef('flashRate', 'Flash rate', 1.6, 0, 10, step: 0.05),
    OrbParamDef('flash', 'Flash power', 1.2, 0, 5, step: 0.03),
    OrbParamDef('light', 'Key light', 0.85, 0, 3, step: 0.015),
    OrbParamDef('rim', 'Rim light', 0.5, 0, 3, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('deep', 'Deep', '#2a0f4e'),
    OrbColorDef('low', 'Low pressure', '#0fd0c3'),
    OrbColorDef('mid', 'Mid pressure', '#ff5e9d'),
    OrbColorDef('hot', 'High pressure', '#ffd166'),
    OrbColorDef('flash', 'Lightning', '#eaf4ff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'churn': 1.4, 'contrast': 1.35, 'flash': 0.7, 'gain': 1.15, 'shear': 1.1, 'speed': 0.9, 'warp': 2.2},
    OrbState.thinking: <String, double>{'churn': 2.1, 'contrast': 1.5, 'flash': 0.6, 'gain': 1.05, 'shear': 0.6, 'speed': 2.2, 'warp': 3.4},
    OrbState.speaking: <String, double>{'churn': 1.6, 'contrast': 1.2, 'flash': 2.6, 'gain': 1.45, 'shear': 2.2, 'speed': 1.6, 'warp': 2.6},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'deep': '#2a0f4e', 'flash': '#eaf4ff', 'hot': '#ffd166', 'low': '#0fd0c3', 'mid': '#ff5e9d'},
    OrbState.thinking: <String, String>{'deep': '#0d1440', 'flash': '#d5e5ff', 'hot': '#4ce0ff', 'low': '#4c4cf0', 'mid': '#9d4ce0'},
    OrbState.speaking: <String, String>{'deep': '#3a0f1e', 'flash': '#fff3e0', 'hot': '#ffd23f', 'low': '#ff6a3d', 'mid': '#ff2e88'},
  },
);

/// Renders a grainy many-coloured storm with band shear and lightning. Thin wrapper over [ShaderOrb].
class Orb17 extends ShaderOrb {
  const Orb17({
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
  }) : super(variant: orb17Variant);
}
