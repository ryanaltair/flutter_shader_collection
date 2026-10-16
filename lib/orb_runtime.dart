/// Shared runtime for the shadercn "orbs" shader collection.
///
/// Flutter port of shadercn's Orbkit core (`registry/components/orbs/renderer.ts`
/// + `canvas.tsx`, MIT-licensed). Every orb is an [OrbVariant]: a shader asset
/// plus its parameter table, colour table and per-state presets. The runtime
/// owns one [ui.FragmentShader] per widget and, each frame:
///
///  * eases every parameter towards its target with a semi-implicit spring
///    (state preset or explicit override),
///  * integrates `speed`/`anim` style parameters into phases the shaders read
///    as uniforms (they are not rates — integrating them is what animates the
///    orb),
///  * synthesizes input/output "drive volumes" per state and eases towards
///    them,
///  * eases every colour per channel,
///  * writes the whole snapshot into the shader's uniforms and paints.
///
/// The per-orb shader files (`shaders/orb_XX.frag`) are statement-by-statement
/// translations of the original TypeGPU/WGSL sources (by XorDev); see the
/// matching `lib/orb_XX.dart` variant for each.
library;

import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

/// Drive preset the orb eases towards.
enum OrbState { idle, thinking, speaking }

/// Every state, in declaration order.
const List<OrbState> orbStates = <OrbState>[
  OrbState.idle,
  OrbState.thinking,
  OrbState.speaking,
];

/// Drive volumes, in the `[0, 1]` range, read straight into the shader.
typedef OrbVolumes = ({double input, double output});

/// One `f32` shader parameter, as declared by the original component's meta.
class OrbParamDef {
  const OrbParamDef(
    this.key,
    this.label,
    this.defaultValue,
    this.min,
    this.max, {
    this.step = 0.01,
    this.integrate = false,
    this.uniform,
  });

  /// Property name, as used by `params` overrides and the state presets.
  final String key;

  /// Human-readable label, for the debug UI.
  final String label;

  final double defaultValue;
  final double min;
  final double max;

  /// Slider step, for the debug UI.
  final double step;

  /// Integrated as a clock instead of eased, for shaders that read a phase.
  final bool integrate;

  /// Overrides the uniform name in the fragment shader; defaults to
  /// `u_<key>` in snake_case.
  final String? uniform;

  String get uniformName => uniform ?? 'u_${_snakeCase(key)}';

  /// Slider divisions implied by [step] (capped so the slider stays usable).
  int get divisions {
    if (!(step > 0) || !(max > min)) return 1;
    final d = ((max - min) / step).round();
    return d < 1 ? 1 : (d > 200 ? 200 : d);
  }
}

/// One `vec3` shader colour, as declared by the original component's meta.
class OrbColorDef {
  const OrbColorDef(this.key, this.label, this.defaultHex, {this.uniform});

  final String key;
  final String label;

  /// Default value, as a hex string (`#rrggbb` or `#rgb`).
  final String defaultHex;

  /// Overrides the uniform name in the fragment shader; defaults to
  /// `u_c_<key>` in snake_case.
  final String? uniform;

  String get uniformName => uniform ?? 'u_c_${_snakeCase(key)}';
}

/// `alphaGain` → `alpha_gain`, matching the uniform naming in the .frag files.
String _snakeCase(String key) {
  final sb = StringBuffer();
  for (var i = 0; i < key.length; i++) {
    final ch = key[i];
    if (ch.toUpperCase() == ch && ch.toLowerCase() != ch && i > 0) {
      sb.write('_');
    }
    sb.write(ch.toLowerCase());
  }
  return sb.toString();
}

/// Everything one orb is: its shader asset and the drive tables around it.
class OrbVariant {
  const OrbVariant({
    required this.key,
    required this.label,
    required this.note,
    required this.shaderAsset,
    required this.params,
    this.colors = const <OrbColorDef>[],
    this.statePresets = const <OrbState, Map<String, double>>{},
    this.stateColors = const <OrbState, Map<String, String>>{},
  });

  /// Slug, e.g. `orb-01`.
  final String key;

  /// Title, e.g. `ORB-01`.
  final String label;

  /// One-line description from the original component.
  final String note;

  /// Asset path of the compiled fragment shader, e.g. `shaders/orb_01.frag`.
  final String shaderAsset;

  final List<OrbParamDef> params;
  final List<OrbColorDef> colors;

  /// Per-state parameter targets; absent states fall back to [OrbParamDef]
  /// defaults.
  final Map<OrbState, Map<String, double>> statePresets;

  /// Per-state colour targets; absent entries fall back to
  /// [OrbColorDef.defaultHex].
  final Map<OrbState, Map<String, String>> stateColors;
}

/// Renders an animated orb.
///
/// Mirrors the props of the original `ShaderOrb` React component:
///
/// * [size] — rendered size in logical pixels (square).
/// * [state] — drive preset the orb eases towards.
/// * [params] — per-frame parameter overrides, keyed by parameter name; they
///   win over the state preset.
/// * [colors] — colour overrides as hex strings.
/// * [statePresets] / [stateColors] — replace the built-in per-state targets.
/// * [stateVolumes] / [volumes] — pin the drive volumes a state settles on, or
///   drive them directly (bypassing synthesis).
/// * [paused] — freeze the frame loop.
class ShaderOrb extends StatefulWidget {
  const ShaderOrb({
    super.key,
    required this.variant,
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

  final OrbVariant variant;
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
  State<ShaderOrb> createState() => _ShaderOrbState();
}

class _ShaderOrbState extends State<ShaderOrb> with SingleTickerProviderStateMixin {
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
      final program = await ui.FragmentProgram.fromAsset(widget.variant.shaderAsset);
      if (!mounted) {
        return;
      }
      final runtime = _OrbRuntime(program.fragmentShader(), widget.variant);
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
  void didUpdateWidget(ShaderOrb oldWidget) {
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
              '${widget.variant.label} shader failed to load:\n$error',
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
// Runtime — a port of `createOrbScene()` from the original renderer.ts:
// springs, volume synthesis, phase integration, uniform writes.
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

/// Writes `hex` as three 0..1 floats, falling back to white.
Float64List _parseHex(String hex) {
  var h = hex.trim();
  if (h.startsWith('#')) {
    h = h.substring(1);
  }
  if (h.length == 3) {
    h = '${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}';
  }
  final value = int.tryParse(h, radix: 16);
  if (h.length != 6 || value == null) {
    return Float64List.fromList(<double>[1, 1, 1]);
  }
  return Float64List.fromList(<double>[
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
  ]);
}

/// Owns the eased simulation state and writes it into the shader's uniforms.
///
/// A port of `createOrbScene()`: the uniform snapshot is the single source of
/// truth; every slot is resolved once by name and only written when the shader
/// actually declares it (each orb declares the subset it reads).
class _OrbRuntime {
  _OrbRuntime(this._shader, this.variant, {math.Random? random})
      : _random = random ?? math.Random() {
    // Base fields. `time` and `anim` are only declared by shaders that read
    // them; a missing uniform resolves to a null slot and is skipped.
    _uRes = _vec2('u_res');
    _uTime = _float('u_time');
    _uAnim = _float('u_anim');
    _uInputVol = _float('u_input_vol');
    _uOutputVol = _float('u_output_vol');

    _paramSlots = List<ui.UniformFloatSlot?>.generate(
      variant.params.length,
      (i) => _float(variant.params[i].uniformName),
      growable: false,
    );
    _colorSlots = List<ui.UniformVec3Slot?>.generate(
      variant.colors.length,
      (i) => _vec3(variant.colors[i].uniformName),
      growable: false,
    );
    _paint = Paint()..shader = _shader;

    _paramSprings = List<_Spring>.generate(
      variant.params.length,
      (i) => _Spring(variant.params[i].defaultValue, 0),
      growable: false,
    );
    _paramClock = List<double>.filled(variant.params.length, 0);
    for (var i = 0; i < variant.params.length; i++) {
      if (variant.params[i].integrate) {
        // Integrated params carry their own phase, seeded apart so instances
        // desync.
        _paramClock[i] = _random.nextDouble() * 100;
      }
    }
    _colorSprings = List<_Spring>.generate(
      variant.colors.length * 3,
      (i) {
        final def = variant.colors[i ~/ 3];
        final rgb = _parseHex(def.defaultHex);
        return _Spring(rgb[i % 3], 0);
      },
      growable: false,
    );

    final resting = _targetVolumes(_state, 0);
    _volIn = resting.input;
    _volOut = resting.output;
    // The shared flow clock, seeded apart so instances desync.
    _anim = _random.nextDouble() * 100;
  }

  final ui.FragmentShader _shader;
  final OrbVariant variant;
  final math.Random _random;

  ui.UniformFloatSlot? _float(String name) {
    try {
      return _shader.getUniformFloat(name);
    } catch (_) {
      // The shader does not declare this uniform; skip it.
      return null;
    }
  }

  ui.UniformVec2Slot? _vec2(String name) {
    try {
      return _shader.getUniformVec2(name);
    } catch (_) {
      return null;
    }
  }

  ui.UniformVec3Slot? _vec3(String name) {
    try {
      return _shader.getUniformVec3(name);
    } catch (_) {
      return null;
    }
  }

  late final ui.UniformVec2Slot? _uRes;
  late final ui.UniformFloatSlot? _uTime;
  late final ui.UniformFloatSlot? _uAnim;
  late final ui.UniformFloatSlot? _uInputVol;
  late final ui.UniformFloatSlot? _uOutputVol;
  late final List<ui.UniformFloatSlot?> _paramSlots;
  late final List<ui.UniformVec3Slot?> _colorSlots;
  late final Paint _paint;

  late final List<_Spring> _paramSprings;
  late final List<double> _paramClock;
  late final List<_Spring> _colorSprings;

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
  double _anim = 0;
  double _speed = 0.1;
  final _Spring _speedSpring = _Spring(0.1, 0);
  double _volIn = 0;
  double _volOut = 0;

  // Cached colour targets (parsed only when the hex string changes).
  late final List<Float64List> _colorTarget = List<Float64List>.generate(
    variant.colors.length,
    (i) => _parseHex(variant.colors[i].defaultHex),
    growable: false,
  );
  late final List<String?> _colorHexCache = List<String?>.generate(
    variant.colors.length,
    (_) => null,
    growable: false,
  );

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
    _anim += dt * _speed;

    // Parameters.
    final preset = _statePresets?[_state] ?? variant.statePresets[_state];
    for (var i = 0; i < variant.params.length; i++) {
      final def = variant.params[i];
      final explicit = _params?[def.key];
      final target = _clamp(explicit ?? preset?[def.key] ?? def.defaultValue, def.min, def.max);
      _springStep(_paramSprings[i], target, dt);
      if (def.integrate) {
        _paramClock[i] += dt * _speed * _paramSprings[i].x;
      }
    }

    // Colours.
    for (var i = 0; i < variant.colors.length; i++) {
      final def = variant.colors[i];
      final hex = _colors?[def.key] ?? _stateColors?[_state]?[def.key] ?? def.defaultHex;
      if (hex != _colorHexCache[i]) {
        _colorHexCache[i] = hex;
        _colorTarget[i] = _parseHex(hex);
      }
      for (var c = 0; c < 3; c++) {
        _springStep(_colorSprings[i * 3 + c], _colorTarget[i][c], dt);
      }
    }
  }

  void draw(Canvas canvas, Size size, double devicePixelRatio) {
    // FlutterFragCoord() is in device pixels, so the resolution uniform has
    // to be too — otherwise the orb would be composed at the wrong scale.
    _uRes?.set(size.width * devicePixelRatio, size.height * devicePixelRatio);
    _uTime?.set(_seconds * 0.5);
    _uAnim?.set(_anim);
    _uInputVol?.set(_volIn);
    _uOutputVol?.set(_volOut);
    for (var i = 0; i < variant.params.length; i++) {
      final value = variant.params[i].integrate ? _paramClock[i] : _paramSprings[i].x;
      _paramSlots[i]?.set(value);
    }
    for (var i = 0; i < variant.colors.length; i++) {
      _colorSlots[i]?.set(
        _colorSprings[i * 3].x,
        _colorSprings[i * 3 + 1].x,
        _colorSprings[i * 3 + 2].x,
      );
    }
    canvas.drawRect(Offset.zero & size, _paint);
  }

  void dispose() {
    _shader.dispose();
  }
}
