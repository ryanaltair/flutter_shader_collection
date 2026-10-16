/// ORB-26 — a crazed web of coloured threads knotted to a cell grid.
///
/// Flutter port of the shadercn ORB-26 component. The fragment shader
/// (`shaders/orb_26.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); the runtime is the shared
/// [ShaderOrb] engine from `orb_runtime.dart`.
library;

import 'orb_runtime.dart';

export 'orb_runtime.dart' show OrbState, OrbVolumes, orbStates;

/// The ORB-26 variant: shader asset plus its parameter/colour tables.
const OrbVariant orb26Variant = OrbVariant(
  key: 'orb-26',
  label: 'ORB-26',
  note: 'a crazed web of coloured threads knotted to a cell grid',
  shaderAsset: 'shaders/orb_26.frag',
  params: <OrbParamDef>[
    OrbParamDef('speed', 'Boil', 0.4, 0.015, 10, step: 0.05, integrate: true),
    OrbParamDef('swirl', 'Swirl', 0.07, 0, 3, step: 0.015, integrate: true),
    OrbParamDef('drift', 'Crazing drift', 0.18, 0, 5, step: 0.03, integrate: true),
    OrbParamDef('radius', 'Radius', 0.9, 0.15, 3, step: 0.015),
    OrbParamDef('scale', 'Cell scale', 9, 0.3, 20, step: 0.1),
    OrbParamDef('bulge', 'Dome bulge', 0.25, 0, 4, step: 0.02),
    OrbParamDef('warp', 'Warp', 0.85, 0, 3, step: 0.02),
    OrbParamDef('pole', 'Knot strength', 0.25, 0, 2, step: 0.005),
    OrbParamDef('poleSoft', 'Knot size', 0.012, 0.001, 1, step: 0.001),
    OrbParamDef('pulse', 'Cell breathing', 0.35, 0, 2, step: 0.01),
    OrbParamDef('sharp', 'Thread width', 4.5, 0.3, 20, step: 0.05),
    OrbParamDef('split', 'Chromatic split', 0.045, 0, 1, step: 0.005),
    OrbParamDef('core', 'Hot core', 0.45, 0, 3, step: 0.015),
    OrbParamDef('floor', 'Body fill', 0.9, 0, 3, step: 0.01),
    OrbParamDef('gain', 'Brightness', 1, 0.05, 5, step: 0.05),
    OrbParamDef('contrast', 'Contrast', 1.35, 0.15, 10, step: 0.05),
    OrbParamDef('light', 'Key light', 0.7, 0, 3, step: 0.015),
    OrbParamDef('rim', 'Rim sheen', 0.45, 0, 3, step: 0.015),
  ],
  colors: <OrbColorDef>[
    OrbColorDef('deep', 'Glaze', '#111a2e'),
    OrbColorDef('line', 'Thread', '#3fd2ff'),
    OrbColorDef('hot', 'Hot thread', '#fff4d6'),
    OrbColorDef('sheen', 'Sheen', '#a9d8ff'),
  ],
  statePresets: <OrbState, Map<String, double>>{
    OrbState.thinking: <String, double>{'contrast': 1.6, 'drift': 0.51, 'floor': 0.28, 'pole': 0.18, 'pulse': 0.22, 'sharp': 3.6, 'speed': 1, 'split': 0.03, 'swirl': 0.3},
    OrbState.speaking: <String, double>{'bulge': 0.78, 'contrast': 1.95, 'core': 1.08, 'drift': 1.74, 'floor': 0.48, 'gain': 1.3, 'pole': 0.195, 'poleSoft': 0.001, 'pulse': 1.39, 'scale': 11, 'sharp': 2.1, 'speed': 6.45, 'split': 0.045, 'swirl': 0.555, 'warp': 0.76},
  },
);

/// Renders a crazed web of coloured threads knotted to a cell grid. Thin wrapper over [ShaderOrb].
class Orb26 extends ShaderOrb {
  const Orb26({
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
  }) : super(variant: orb26Variant);
}
