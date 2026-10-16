/// ORB-33 — a thermal image, risograph-printed on the ball.
///
/// Flutter port of the shadercn ORB-33 component. The fragment shader
/// (`shaders/orb_33.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-33 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb33Variant = OrbVariant(
  key: 'orb-33',
  label: 'ORB-33',
  note: 'a thermal image, risograph-printed on the ball',
  shaderAsset: 'shaders/orb_33.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Drift', 0.5, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('spin', 'Roll', 0.05, 0, 5, step: 0.03, integrate: true),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('scale', 'Zoom', 3, 0.3, 8, step: 0.05),
    OrbParamDef('freq', 'Pool scale', 1.4, 0.2, 6, step: 0.05),
    OrbParamDef('warp', 'Warp', 0.6, 0, 3, step: 0.02),
    OrbParamDef('lo', 'Cold threshold', 0.42, 0, 1, step: 0.005),
    OrbParamDef('hi', 'Hot threshold', 0.74, 0, 1, step: 0.005),
    OrbParamDef('gain', 'Heat gain', 1, 0.1, 6, step: 0.02),
    OrbParamDef('jitter', 'Heat jitter', 0.015, 0, 0.5, step: 0.005),
    OrbParamDef('bands', 'Contour bands', 7, 2, 24, step: 1),
    OrbParamDef('banding', 'Contour strength', 0.85, 0, 1, step: 0.01),
    OrbParamDef('contrast', 'Contrast', 1, 0.3, 3, step: 0.02),
    OrbParamDef('dither', 'Dither', 0.05, 0, 0.6, step: 0.005),
    OrbParamDef('dots', 'Screen pitch', 46, 4, 120, step: 1),
    OrbParamDef('dotGain', 'Dot gain', 1, 0.2, 2, step: 0.01),
    OrbParamDef('dotSoft', 'Dot softness', 0.12, 0.01, 0.3, step: 0.005),
    OrbParamDef('misregister', 'Misregistration', 0.5, 0, 3, step: 0.02),
    OrbParamDef('ink', 'Ink density', 0.92, 0, 1, step: 0.01),
    OrbParamDef('printMix', 'Print mix', 0.28, 0, 1, step: 0.01),
    OrbParamDef('grain', 'Paper grain', 0.35, 0, 2, step: 0.01),
    OrbParamDef('grainSize', 'Grain size', 2, 1, 8, step: 1),
    OrbParamDef('light', 'Key light', 0.25, 0, 1, step: 0.01),
    OrbParamDef('rim', 'Rim light', 0.25, 0, 3, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('cold', 'Cold', '#0b0a1e'),
    OrbColorDef('cool', 'Cool', '#3b2a9a'),
    OrbColorDef('warm', 'Warm', '#f05a28'),
    OrbColorDef('hot', 'Hot', '#f6b53a'),
    OrbColorDef('core', 'Core', '#fff1e6'),
    OrbColorDef('paper', 'Paper', '#f4ecdf'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.thinking: <String, double>{'banding': 0.75, 'bands': 6, 'dots': 42, 'freq': 3.1, 'hi': 0.66, 'jitter': 0, 'lo': 0.3, 'scale': 4.6, 'speed': 10, 'spin': 0.51, 'warp': 1.82},
    OrbState.speaking: <String, double>{'freq': 1.3, 'hi': 0.72, 'jitter': 0, 'lo': 0.345, 'speed': 8.8, 'spin': 2.01, 'warp': 1.42},
  },
);

/// Renders a thermal image, risograph-printed on the ball. Thin wrapper over [ShaderOrb].
class Orb33 extends ShaderOrb {
  const Orb33({
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
  }) : super(variant: orb33Variant);
}
