/// ORB-01 — "Cut-glass orb with a dispersive, turbulent interior".
///
/// Flutter port of the shadercn ORB-01 component. The fragment shader
/// (`shaders/orb_01.frag`) is a statement-by-statement translation of the
/// original TypeGPU/WGSL source (by XorDev); this file implements the matching
/// Dart runtime:
///
///  * a semi-implicit spring eases every shader parameter towards its target
///    (state preset or explicit override),
///  * `speed` and `spin` are *integrated* into phases the shader reads as
///    uniforms (they are not rates — integrating them is what animates the
///    orb),
///  * input/output "drive volumes" are synthesized per state (idle, thinking,
///    speaking) and eased towards their targets,
///  * the tint colour is eased per channel.
///
/// Usage:
/// ```dart
/// const Orb01(size: 280, state: OrbState.idle);
/// ```
///
/// The component renders at the device's native pixel ratio; the shader is
/// resolution-independent, so there is no DPR cap to configure.
library;

import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';

/// Drive preset the orb eases towards.
enum OrbState { idle, thinking, speaking }

/// Every state, in declaration order.
const List<OrbState> orbStates = <OrbState>[OrbState.idle, OrbState.thinking, OrbState.speaking];

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

/// Drive volumes, in the `[0, 1]` range, read straight into the shader.
typedef OrbVolumes = ({double input, double output});

/// Renders the animated cut-glass orb.
///
/// * [size] — rendered size in logical pixels (square).
/// * [state] — drive preset the orb eases towards.
/// * [params] — per-frame parameter overrides, keyed by parameter name
///   (see [orb01DefaultParams]); overrides win over the state preset.
/// * [colors] — colour overrides as hex strings; only `tint` is supported.
/// * [statePresets] / [stateColors] — replace the built-in per-state targets.
/// * [stateVolumes] / [volumes] — pin the drive volumes a state settles on, or
///   drive them directly (bypassing synthesis).
/// * [paused] — freeze the frame loop.
class Orb01 extends StatefulWidget {
  const Orb01({
    super.key,
    this.size = 280,
    this.state = OrbState.idle,
    this.params,
    this.colors,
    this.statePresets,
    this.stateColors,
    this.stateVolumes,
    this.volumes,
    this.paused = false,
    this.semanticsLabel,
  });

  final double size;
  final OrbState state;
  final Map<String, double>? params;
  final Map<String, String>? colors;
  final Map<OrbState, Map<String, double>>? statePresets;
  final Map<OrbState, Map<String, String>>? stateColors;
  final Map<OrbState, OrbVolumes>? stateVolumes;
  final OrbVolumes? volumes;
  final bool paused;
  final String? semanticsLabel;

  @override
  State<Orb01> createState() => _Orb01State();
}

class _Orb01State extends State<Orb01> with SingleTickerProviderStateMixin {
  static const String _shaderAssetKey = 'shaders/orb_01.frag';

  /// Key to the [CustomPaint] render object, so the ticker can request a
  /// repaint without rebuilding the widget tree.
  final GlobalKey _canvasKey = GlobalKey();

  _OrbRuntime? _runtime;
  Object? _loadError;
  late final Ticker _ticker;
  Duration _lastTick = Duration.zero;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker(_onTick);
    _loadShader();
  }

  Future<void> _loadShader() async {
    try {
      final program = await ui.FragmentProgram.fromAsset(_shaderAssetKey);
      if (!mounted) {
        return;
      }
      final runtime = _OrbRuntime(program.fragmentShader());
      runtime.applyDrive(
        state: widget.state,
        params: widget.params,
        colors: widget.colors,
        statePresets: widget.statePresets,
        stateColors: widget.stateColors,
        stateVolumes: widget.stateVolumes,
        volumes: widget.volumes,
      );
      setState(() => _runtime = runtime);
      if (!widget.paused) {
        _ticker.start();
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _loadError = error);
    }
  }

  @override
  void didUpdateWidget(Orb01 oldWidget) {
    super.didUpdateWidget(oldWidget);
    final runtime = _runtime;
    if (runtime == null) {
      return;
    }
    runtime.applyDrive(
      state: widget.state,
      params: widget.params,
      colors: widget.colors,
      statePresets: widget.statePresets,
      stateColors: widget.stateColors,
      stateVolumes: widget.stateVolumes,
      volumes: widget.volumes,
    );
    if (widget.paused != oldWidget.paused) {
      if (widget.paused) {
        _ticker.stop();
      } else {
        _ticker.start();
      }
    } else if (widget.paused) {
      // Frozen, but the drive changed: repaint the current frame once.
      _markNeedsPaint();
    }
  }

  void _onTick(Duration elapsed) {
    if (_lastTick > elapsed) {
      // The ticker was (re)started, so its clock reset.
      _lastTick = elapsed;
    }
    final dt = (elapsed - _lastTick).inMicroseconds / Duration.microsecondsPerSecond;
    _lastTick = elapsed;
    _runtime?.advance(dt);
    _markNeedsPaint();
  }

  void _markNeedsPaint() {
    final renderObject = _canvasKey.currentContext?.findRenderObject();
    if (renderObject is RenderCustomPaint) {
      renderObject.markNeedsPaint();
    }
  }

  @override
  void dispose() {
    _ticker.dispose();
    _runtime?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final runtime = _runtime;
    final error = _loadError;
    Widget child;
    if (runtime != null) {
      child = CustomPaint(
        key: _canvasKey,
        size: Size.square(widget.size),
        painter: _OrbPainter(runtime, MediaQuery.devicePixelRatioOf(context)),
      );
    } else if (error != null) {
      child = ColoredBox(
        color: const Color(0x22FFFFFF),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Text(
              'ORB-01 shader failed to load:\n$error',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xCCFFFFFF), fontSize: 11),
            ),
          ),
        ),
      );
    } else {
      child = const SizedBox.shrink();
    }
    if (widget.semanticsLabel != null) {
      child = Semantics(label: widget.semanticsLabel, child: child);
    }
    return SizedBox.square(dimension: widget.size, child: child);
  }
}

class _OrbPainter extends CustomPainter {
  const _OrbPainter(this.runtime, this.devicePixelRatio);

  final _OrbRuntime runtime;
  final double devicePixelRatio;

  @override
  void paint(Canvas canvas, Size size) {
    runtime.draw(canvas, size, devicePixelRatio);
  }

  @override
  bool shouldRepaint(_OrbPainter oldDelegate) {
    return oldDelegate.runtime != runtime ||
        oldDelegate.devicePixelRatio != devicePixelRatio;
  }
}

// ---------------------------------------------------------------------------
// Runtime — a port of `createOrbScene().advance()` from the original
// renderer.ts: springs, volume synthesis, phase integration, uniform writes.
// ---------------------------------------------------------------------------

/// Spring stiffness for parameters (PARAM_EASE).
const double _paramEase = 4;

/// Exponential approach rate for volumes (VOLUME_EASE).
const double _volumeEase = 12;

/// Upper bound on a single integration step (MAX_STEP).
const double _maxStep = 0.05;

double _clamp01(double n) => n < 0 ? 0 : (n > 1 ? 1 : n);

double _clamp(double value, double min, double max) =>
    value < min ? min : (value > max ? max : value);

/// Where a state's synthesized [input, output] volumes sit at `t` seconds.
OrbVolumes _targetVolumes(OrbState state, double t) {
  switch (state) {
    case OrbState.speaking:
      return (
        input: _clamp01(0.65 + math.sin(t * 4.8) * 0.22),
        output: _clamp01(0.75 + math.sin(t * 3.6) * 0.22),
      );
    case OrbState.thinking:
      final base = 0.38 + 0.07 * math.sin(t * 0.7);
      final wander = 0.05 * math.sin(t * 2.1) * math.sin(t * 0.37 + 1.2);
      return (
        input: _clamp01(base + wander),
        output: _clamp01(0.48 + 0.12 * math.sin(t * 1.05 + 0.6)),
      );
    case OrbState.idle:
      return (input: 0, output: 0.3);
  }
}

class _Spring {
  _Spring(this.x, this.v);

  double x;
  double v;
}

/// Semi-implicit spring step; both outputs land in the shared spring.
void _springStep(_Spring spring, double target, double dt) {
  final f = 1 + 2 * dt * _paramEase;
  final hoo = dt * _paramEase * _paramEase;
  final hhoo = dt * hoo;
  final detInv = 1 / (f + hhoo);
  final x = (f * spring.x + dt * spring.v + hhoo * target) * detInv;
  final v = (spring.v + hoo * (target - spring.x)) * detInv;
  spring.x = x;
  spring.v = v;
}

class _ParamDef {
  const _ParamDef(
    this.key,
    this.uniform,
    this.defaultValue,
    this.min,
    this.max, {
    this.integrate = false,
  });

  final String key;

  /// Name of the uniform in `shaders/orb_01.frag`.
  final String uniform;
  final double defaultValue;
  final double min;
  final double max;

  /// Integrated as a clock instead of eased, for shaders that read a phase.
  final bool integrate;
}

const List<_ParamDef> _paramDefs = <_ParamDef>[
  _ParamDef('speed', 'u_speed', 0.5, 0.015, 10, integrate: true),
  _ParamDef('spin', 'u_spin', 0.25, 0, 5, integrate: true),
  _ParamDef('camDist', 'u_cam_dist', 7, 1, 50),
  _ParamDef('focal', 'u_focal', 2.25, 0.15, 15),
  _ParamDef('tilt', 'u_tilt', 0.5, 0, 4),
  _ParamDef('turb', 'u_turb', 0.3, 0, 5),
  _ParamDef('sheets', 'u_sheets', 7, 1, 60),
  _ParamDef('disperse', 'u_disperse', 1, 0, 5),
  _ParamDef('stria', 'u_stria', 1, 0, 10),
  _ParamDef('envRadius', 'u_env_radius', 2.6, 0.15, 15),
  _ParamDef('envCore', 'u_env_core', 1, 0.3, 1.02),
  _ParamDef('fill', 'u_fill', 1.5, 0, 100),
  _ParamDef('stepClamp', 'u_step_clamp', 20, 0.3, 300),
  _ParamDef('scatter', 'u_scatter', 0.02, 0, 0.5),
  _ParamDef('exposure', 'u_exposure', 60, 1.5, 1500),
  _ParamDef('contrast', 'u_contrast', 1, 0.15, 15),
  _ParamDef('saturation', 'u_saturation', 1, 0, 4),
  _ParamDef('alphaGain', 'u_alpha_gain', 2, 0.05, 15),
  _ParamDef('edge', 'u_edge', 1, 0, 1),
  _ParamDef('edgeFade', 'u_edge_fade', 0.98, 0.1, 0.985),
];

/// Owns the eased simulation state and writes it into the shader's uniforms.
class _OrbRuntime {
  _OrbRuntime(this._shader, {math.Random? random})
      : _random = random ?? math.Random() {
    _uRes = _shader.getUniformVec2('u_res');
    _uInputVol = _shader.getUniformFloat('u_input_vol');
    _uOutputVol = _shader.getUniformFloat('u_output_vol');
    _uTint = _shader.getUniformVec3('u_tint');
    _paramSlots = List<ui.UniformFloatSlot>.generate(
      _paramDefs.length,
      (i) => _shader.getUniformFloat(_paramDefs[i].uniform),
      growable: false,
    );
    _paint = Paint()..shader = _shader;

    _paramSprings = List<_Spring>.generate(
      _paramDefs.length,
      (i) => _Spring(_paramDefs[i].defaultValue, 0),
      growable: false,
    );
    _paramClock = List<double>.filled(_paramDefs.length, 0);
    for (var i = 0; i < _paramDefs.length; i++) {
      if (_paramDefs[i].integrate) {
        // Integrated params carry their own phase, seeded apart so instances
        // desync.
        _paramClock[i] = _random.nextDouble() * 100;
      }
    }
    _tintSprings = List<_Spring>.generate(3, (_) => _Spring(1, 0));
    final resting = _targetVolumes(_state, 0);
    _volIn = resting.input;
    _volOut = resting.output;
  }

  final ui.FragmentShader _shader;
  final math.Random _random;

  late final ui.UniformVec2Slot _uRes;
  late final ui.UniformFloatSlot _uInputVol;
  late final ui.UniformFloatSlot _uOutputVol;
  late final ui.UniformVec3Slot _uTint;
  late final List<ui.UniformFloatSlot> _paramSlots;
  late final Paint _paint;

  late final List<_Spring> _paramSprings;
  late final List<double> _paramClock;
  late final List<_Spring> _tintSprings;

  // Drive, refreshed from the widget whenever its props change.
  OrbState _state = OrbState.idle;
  Map<String, double>? _params;
  Map<String, String>? _colors;
  Map<OrbState, Map<String, double>>? _statePresets;
  Map<OrbState, Map<String, String>>? _stateColors;
  Map<OrbState, OrbVolumes>? _stateVolumes;
  OrbVolumes? _volumes;

  // Simulation state.
  double _seconds = 0;
  double _speed = 0.1;
  final _Spring _speedSpring = _Spring(0.1, 0);
  double _volIn = 0;
  double _volOut = 0;

  // Cached tint target (parsed only when the hex string changes).
  String? _tintHex;
  late Float64List _tintTarget = _parseHex(orb01DefaultTint);

  void applyDrive({
    required OrbState state,
    required Map<String, double>? params,
    required Map<String, String>? colors,
    required Map<OrbState, Map<String, double>>? statePresets,
    required Map<OrbState, Map<String, String>>? stateColors,
    required Map<OrbState, OrbVolumes>? stateVolumes,
    required OrbVolumes? volumes,
  }) {
    _state = state;
    _params = params;
    _colors = colors;
    _statePresets = statePresets;
    _stateColors = stateColors;
    _stateVolumes = stateVolumes;
    _volumes = volumes;
  }

  /// Eases one step towards the drive and updates the uniform values.
  void advance(double dt) {
    if (dt <= 0) {
      return;
    }
    dt = math.min(dt, _maxStep);
    _seconds += dt;

    // Volumes and the shared flow clock.
    final synth = _targetVolumes(_state, _seconds);
    final targetIn = _volumes?.input ?? _stateVolumes?[_state]?.input ?? synth.input;
    final targetOut = _volumes?.output ?? _stateVolumes?[_state]?.output ?? synth.output;
    final kVol = 1 - math.exp(-dt * _volumeEase);
    _volIn += (targetIn - _volIn) * kVol;
    _volOut += (targetOut - _volOut) * kVol;

    // Loud output runs the flow clock faster.
    _springStep(_speedSpring, 0.1 + (1 - (_volOut - 1) * (_volOut - 1)) * 0.9, dt);
    _speed = _speedSpring.x;
    // (The original also integrates a shared `anim` clock here; ORB-01's
    // shader doesn't read it, so it is not tracked.)

    // Parameters.
    final preset = _statePresets?[_state] ?? orb01StatePresets[_state]!;
    for (var i = 0; i < _paramDefs.length; i++) {
      final def = _paramDefs[i];
      final explicit = _params?[def.key];
      final target = _clamp(explicit ?? preset[def.key] ?? def.defaultValue, def.min, def.max);
      _springStep(_paramSprings[i], target, dt);
      if (def.integrate) {
        _paramClock[i] += dt * _speed * _paramSprings[i].x;
      }
    }

    // Colours.
    final hex = _colors?['tint'] ?? _stateColors?[_state]?['tint'] ?? orb01DefaultTint;
    if (hex != _tintHex) {
      _tintHex = hex;
      _tintTarget = _parseHex(hex);
    }
    for (var c = 0; c < 3; c++) {
      _springStep(_tintSprings[c], _tintTarget[c], dt);
    }
  }

  void draw(Canvas canvas, Size size, double devicePixelRatio) {
    // FlutterFragCoord() is in device pixels, so the resolution uniform has
    // to be too — otherwise the orb would be composed at the wrong scale.
    _uRes.set(size.width * devicePixelRatio, size.height * devicePixelRatio);
    _uInputVol.set(_volIn);
    _uOutputVol.set(_volOut);
    for (var i = 0; i < _paramDefs.length; i++) {
      final value = _paramDefs[i].integrate ? _paramClock[i] : _paramSprings[i].x;
      _paramSlots[i].set(value);
    }
    _uTint.set(_tintSprings[0].x, _tintSprings[1].x, _tintSprings[2].x);
    canvas.drawRect(Offset.zero & size, _paint);
  }

  void dispose() {
    _shader.dispose();
  }

  static Float64List _parseHex(String hex) {
    var h = hex.trim();
    if (h.startsWith('#')) {
      h = h.substring(1);
    }
    if (h.length == 3) {
      h = '${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}';
    }
    final value = int.tryParse(h, radix: 16) ?? 0xffffff;
    return Float64List.fromList(<double>[
      ((value >> 16) & 0xff) / 255,
      ((value >> 8) & 0xff) / 255,
      (value & 0xff) / 255,
    ]);
  }
}
