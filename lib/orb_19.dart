/// ORB-19 — beads swelling and shrinking in their cells, packed over the ball.
///
/// Flutter port of the shadercn ORB-19 component. The fragment shader
/// (`shaders/orb_19.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-19 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb19Variant = OrbVariant(
  key: 'orb-19',
  label: 'ORB-19',
  note: 'beads swelling and shrinking in their cells, packed over the ball',
  shaderAsset: 'shaders/orb_19.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Anim speed', 0.5, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('swirl', 'Swirl', 0.05, 0, 3, step: 0.015, integrate: true),
    OrbParamDef('slide', 'Drift', 0.1, 0, 4, step: 0.02, integrate: true),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('scale', 'Packing scale', 10, 0.3, 30, step: 0.1),
    OrbParamDef('bulge', 'Dome bulge', 0.3, 0, 4, step: 0.02),
    OrbParamDef('grow', 'Dot size', 0.185, -0.2, 1.2, step: 0.005),
    OrbParamDef('vary', 'Size variation', 0.13, 0, 0.4, step: 0.005),
    OrbParamDef('skew', 'Generator detune', 0.62, 0, 3, step: 0.01),
    OrbParamDef('jitter', 'Dot wander', 0.1, 0, 1.5, step: 0.01),
    OrbParamDef('edge', 'Rim hardness', 50, 1, 200, step: 1),
    OrbParamDef('bead', 'Bead shading', 0, 0, 1, step: 0.01),
    OrbParamDef('gain', 'Brightness', 1, 0.05, 4, step: 0.02),
    OrbParamDef('contrast', 'Contrast', 1, 0.15, 6, step: 0.05),
    OrbParamDef('saturation', 'Saturation', 1.1, 0, 4, step: 0.02),
    OrbParamDef('floorLevel', 'Body fill', 0.06, 0, 2, step: 0.01),
    OrbParamDef('light', 'Key light', 0.3, 0, 3, step: 0.015),
    OrbParamDef('rim', 'Rim sheen', 0.35, 0, 3, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('low', 'Dot', '#ffffff'),
    OrbColorDef('high', 'Dot accent', '#eef5ff'),
    OrbColorDef('body', 'Body', '#05070c'),
    OrbColorDef('sheen', 'Sheen', '#9dbfe4'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.idle: <String, double>{'bulge': 0.08, 'contrast': 2.6, 'edge': 51, 'gain': 2.28, 'grow': 0.12, 'jitter': 0.74, 'rim': 0.345, 'skew': 0.63, 'slide': 0.1, 'speed': 0.52, 'swirl': 0.045, 'vary': 0.19},
    OrbState.thinking: <String, double>{'bulge': 0.14, 'contrast': 0.55, 'gain': 1.04, 'grow': 0.19, 'jitter': 0.37, 'light': 0.585, 'rim': 0.24, 'skew': 1.13, 'slide': 0.84, 'speed': 2.55, 'swirl': 0.57, 'vary': 0.165},
    OrbState.speaking: <String, double>{'bulge': 0.28, 'contrast': 3.2, 'edge': 141, 'floorLevel': 0, 'gain': 1.35, 'grow': 0.22, 'jitter': 0.17, 'saturation': 2.04, 'skew': 0, 'slide': 0.55, 'speed': 2.85, 'swirl': 0.585, 'vary': 0.365},
  },
  stateColors: <OrbState, Map<String, String>>{
    OrbState.idle: <String, String>{'body': '#05070c', 'high': '#eef5ff', 'low': '#ffffff', 'sheen': '#9dbfe4'},
    OrbState.thinking: <String, String>{'body': '#000000', 'high': '#ffffff', 'low': '#dae6ff', 'sheen': '#ffffff'},
    OrbState.speaking: <String, String>{'body': '#140a06', 'high': '#ffffff', 'low': '#ffffff', 'sheen': '#ffffff'},
  },
);

/// Renders beads swelling and shrinking in their cells, packed over the ball. Thin wrapper over [ShaderOrb].
class Orb19 extends ShaderOrb {
  const Orb19({
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
  }) : super(variant: orb19Variant);
}
