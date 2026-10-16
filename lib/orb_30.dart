/// ORB-30 — a meadow folding into itself toward a blue vanishing point.
///
/// Flutter port of the shadercn ORB-30 component. The fragment shader
/// (`shaders/orb_30.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-30 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb30Variant = OrbVariant(
  key: 'orb-30',
  label: 'ORB-30',
  note: 'a meadow folding into itself toward a blue vanishing point',
  shaderAsset: 'shaders/orb_30.frag',
  params: <OrbParamDef>[
    OrbParamDef('fall', 'Fall speed', 0.12, 0, 4, step: 0.01, integrate: true),
    OrbParamDef('tilt', 'Frame tilt', 0, -1.6, 1.6, step: 0.01),
    OrbParamDef('drift', 'Weather drift', 0.2, 0, 4, step: 0.02, integrate: true),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('scale', 'Tunnel scale', 4.5, 0.3, 20, step: 0.1),
    OrbParamDef('bulge', 'Dome bulge', 0.25, 0, 4, step: 0.02),
    OrbParamDef('ratio', 'Frame ratio', 1.8, 1.1, 6, step: 0.02),
    OrbParamDef('horizon', 'Horizon', 0.14, -0.9, 0.9, step: 0.01),
    OrbParamDef('cloudScale', 'Cloud scale', 1.6, 0.1, 8, step: 0.05),
    OrbParamDef('cloudCover', 'Cloud cover', 0.46, 0.02, 0.98, step: 0.01),
    OrbParamDef('streakFreq', 'Wall detail', 5, 0.2, 20, step: 0.1),
    OrbParamDef('streakRad', 'Smear', 0.5, 0.02, 4, step: 0.02),
    OrbParamDef('water', 'Water', 0.7, 0, 1, step: 0.01),
    OrbParamDef('flowerScale', 'Flower scale', 44, 2, 120, step: 1),
    OrbParamDef('flowerDensity', 'Flower density', 0.55, 0, 1, step: 0.01),
    OrbParamDef('flowerSize', 'Flower size', 0.26, 0.05, 0.6, step: 0.01),
    OrbParamDef('frameShade', 'Frame shading', 0.62, 0.2, 1.4, step: 0.01),
    OrbParamDef('haze', 'Aerial haze', 0.85, 0, 1, step: 0.01),
    OrbParamDef('hazeRange', 'Haze reach', 0.09, 0.005, 1.5, step: 0.005),
    OrbParamDef('gain', 'Brightness', 1.05, 0.05, 4, step: 0.02),
    OrbParamDef('contrast', 'Contrast', 1.05, 0.15, 10, step: 0.05),
    OrbParamDef('saturation', 'Saturation', 1.1, 0, 4, step: 0.02),
    OrbParamDef('light', 'Key light', 0.35, 0, 3, step: 0.015),
    OrbParamDef('rim', 'Rim sheen', 0.55, 0, 3, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('sky', 'Sky', '#4a92e0'),
    OrbColorDef('cloud', 'Cloud', '#f7fbff'),
    OrbColorDef('canopy', 'Canopy', '#12401f'),
    OrbColorDef('meadow', 'Meadow', '#5aa63a'),
    OrbColorDef('water', 'Water', '#156f6a'),
    OrbColorDef('bloom', 'Bloom', '#ff6a3a'),
    OrbColorDef('sheen', 'Sheen', '#cfe6ff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'bulge': 0.2, 'cloudCover': 0.42, 'cloudScale': 1.2, 'drift': 0.2, 'fall': 0.12, 'flowerDensity': 0.27, 'flowerScale': 24, 'flowerSize': 0.43, 'gain': 1.38, 'haze': 0.8, 'hazeRange': 0.09, 'horizon': -0.11, 'light': 0.345, 'ratio': 3.06, 'rim': 0.555, 'saturation': 1.56, 'streakFreq': 2.9, 'streakRad': 0.54, 'water': 0},
    OrbState.thinking: <String, double>{'cloudCover': 0.3, 'contrast': 1.45, 'drift': 0.5, 'fall': 0.6, 'flowerDensity': 0.28, 'gain': 1.42, 'haze': 1, 'hazeRange': 0.3, 'light': 0.96, 'saturation': 2},
    OrbState.speaking: <String, double>{'cloudCover': 0.44, 'cloudScale': 3.65, 'contrast': 1.45, 'drift': 1.54, 'fall': 1.47, 'flowerDensity': 0.95, 'flowerScale': 32, 'gain': 1.36, 'haze': 0.38, 'hazeRange': 0.315, 'horizon': 0.03, 'light': 0.57, 'saturation': 2.32, 'scale': 8.7, 'streakFreq': 11, 'streakRad': 1.48, 'tilt': 0.03},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'bloom': '#ff6a3a', 'canopy': '#12401f', 'cloud': '#f7fbff', 'meadow': '#5aa63a', 'sheen': '#cfe6ff', 'sky': '#4a92e0', 'water': '#156f6a'},
    OrbState.thinking: <String, String>{'bloom': '#7d8cff', 'canopy': '#0e2c2e', 'cloud': '#dde8f4', 'meadow': '#3f7f5c', 'sheen': '#b6cdf0', 'sky': '#3f6fa8', 'water': '#12525f'},
    OrbState.speaking: <String, String>{'bloom': '#ffb02e', 'canopy': '#204a16', 'cloud': '#fff6e8', 'meadow': '#7cc23f', 'sheen': '#ffe3c4', 'sky': '#6fb0ec', 'water': '#1d8a76'},
  },
);

/// Renders a meadow folding into itself toward a blue vanishing point. Thin wrapper over [ShaderOrb].
class Orb30 extends ShaderOrb {
  const Orb30({
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
  }) : super(variant: orb30Variant);
}
