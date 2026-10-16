import 'package:flutter/material.dart';

import 'orb_01.dart';

void main() {
  runApp(const Orb01DemoApp());
}

class Orb01DemoApp extends StatelessWidget {
  const Orb01DemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ORB-01 · Flutter Shader',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF05060A),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF8FD8FF),
          brightness: Brightness.dark,
        ),
      ),
      home: const Orb01DemoPage(),
    );
  }
}

class Orb01DemoPage extends StatefulWidget {
  const Orb01DemoPage({super.key});

  @override
  State<Orb01DemoPage> createState() => _Orb01DemoPageState();
}

class _Orb01DemoPageState extends State<Orb01DemoPage> {
  static const List<({String label, String hex, Color color})> _tints =
      <({String label, String hex, Color color})>[
    (label: 'Crystal', hex: '#ffffff', color: Color(0xFFFFFFFF)),
    (label: 'Ice', hex: '#8fd8ff', color: Color(0xFF8FD8FF)),
    (label: 'Iris', hex: '#b79bff', color: Color(0xFFB79BFF)),
    (label: 'Ember', hex: '#ff9e7a', color: Color(0xFFFF9E7A)),
    (label: 'Jade', hex: '#8ff0c0', color: Color(0xFF8FF0C0)),
  ];

  OrbState _state = OrbState.idle;
  String _tint = '#ffffff';
  double _speed = 0.5;
  double _turb = 0.3;
  double _disperse = 1;
  bool _paused = false;

  void _setState(OrbState state) => setState(() => _state = state);

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0, -0.3),
            radius: 1.2,
            colors: <Color>[Color(0xFF161A2E), Color(0xFF05060A)],
          ),
        ),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (BuildContext context, BoxConstraints constraints) {
              return SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                    child: Column(
                      children: <Widget>[
                        Text(
                          'ORB-01',
                          style: textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w300,
                            letterSpacing: 8,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'cut-glass orb · dispersive, turbulent interior',
                          style: textTheme.bodySmall?.copyWith(
                            color: const Color(0x99FFFFFF),
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(height: 28),
                        Orb01(
                          size: 280,
                          state: _state,
                          paused: _paused,
                          colors: <String, String>{'tint': _tint},
                          params: <String, double>{
                            'speed': _speed,
                            'turb': _turb,
                            'disperse': _disperse,
                          },
                          semanticsLabel:
                              'Animated cut-glass orb rendered with a Flutter shader',
                        ),
                        const SizedBox(height: 32),
                        _ControlsCard(
                          state: _state,
                          tint: _tint,
                          tints: _tints,
                          speed: _speed,
                          turb: _turb,
                          disperse: _disperse,
                          paused: _paused,
                          onStateChanged: _setState,
                          onTintChanged: (String hex) => setState(() => _tint = hex),
                          onSpeedChanged: (double v) => setState(() => _speed = v),
                          onTurbChanged: (double v) => setState(() => _turb = v),
                          onDisperseChanged: (double v) => setState(() => _disperse = v),
                          onPausedChanged: (bool v) => setState(() => _paused = v),
                        ),
                        const SizedBox(height: 12),
                      ],
                    ),
                  ),
                ),
              );
              },
            ),
          ),
        ),
    );
  }
}

class _ControlsCard extends StatelessWidget {
  const _ControlsCard({
    required this.state,
    required this.tint,
    required this.tints,
    required this.speed,
    required this.turb,
    required this.disperse,
    required this.paused,
    required this.onStateChanged,
    required this.onTintChanged,
    required this.onSpeedChanged,
    required this.onTurbChanged,
    required this.onDisperseChanged,
    required this.onPausedChanged,
  });

  final OrbState state;
  final String tint;
  final List<({String label, String hex, Color color})> tints;
  final double speed;
  final double turb;
  final double disperse;
  final bool paused;
  final ValueChanged<OrbState> onStateChanged;
  final ValueChanged<String> onTintChanged;
  final ValueChanged<double> onSpeedChanged;
  final ValueChanged<double> onTurbChanged;
  final ValueChanged<double> onDisperseChanged;
  final ValueChanged<bool> onPausedChanged;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0x0AFFFFFF),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0x1AFFFFFF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text('STATE', style: _labelStyle(textTheme)),
          const SizedBox(height: 10),
          SegmentedButton<OrbState>(
            segments: const <ButtonSegment<OrbState>>[
              ButtonSegment<OrbState>(value: OrbState.idle, label: Text('idle')),
              ButtonSegment<OrbState>(
                value: OrbState.thinking,
                label: Text('thinking'),
              ),
              ButtonSegment<OrbState>(
                value: OrbState.speaking,
                label: Text('speaking'),
              ),
            ],
            selected: <OrbState>{state},
            onSelectionChanged: (Set<OrbState> selection) =>
                onStateChanged(selection.first),
          ),
          const SizedBox(height: 22),
          Text('TINT', style: _labelStyle(textTheme)),
          const SizedBox(height: 10),
          Row(
            children: <Widget>[
              for (final t in tints)
                Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: _TintSwatch(
                    color: t.color,
                    label: t.label,
                    selected: t.hex == tint,
                    onTap: () => onTintChanged(t.hex),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 22),
          Text('SHADER PARAMS', style: _labelStyle(textTheme)),
          const SizedBox(height: 4),
          Text(
            'Overrides win over the per-state presets.',
            style: textTheme.bodySmall?.copyWith(color: const Color(0x66FFFFFF)),
          ),
          const SizedBox(height: 8),
          _ParamSlider(
            label: 'speed',
            value: speed,
            min: 0.015,
            max: 10,
            onChanged: onSpeedChanged,
          ),
          _ParamSlider(
            label: 'turbulence',
            value: turb,
            min: 0,
            max: 5,
            onChanged: onTurbChanged,
          ),
          _ParamSlider(
            label: 'dispersion',
            value: disperse,
            min: 0,
            max: 5,
            onChanged: onDisperseChanged,
          ),
          const SizedBox(height: 8),
          Row(
            children: <Widget>[
              Text('paused', style: _labelStyle(textTheme)),
              const Spacer(),
              Switch(value: paused, onChanged: onPausedChanged),
            ],
          ),
        ],
      ),
    );
  }

  static TextStyle? _labelStyle(TextTheme textTheme) {
    return textTheme.labelSmall?.copyWith(
      color: const Color(0x99FFFFFF),
      letterSpacing: 2,
    );
  }
}

class _TintSwatch extends StatelessWidget {
  const _TintSwatch({
    required this.color,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final Color color;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: label,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(
              color: selected ? Colors.white : const Color(0x33FFFFFF),
              width: selected ? 2.5 : 1,
            ),
            boxShadow: <BoxShadow>[
              if (selected)
                BoxShadow(color: color.withValues(alpha: 0.5), blurRadius: 12),
            ],
          ),
        ),
      ),
    );
  }
}

class _ParamSlider extends StatelessWidget {
  const _ParamSlider({
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
  });

  final String label;
  final double value;
  final double min;
  final double max;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: <Widget>[
          SizedBox(width: 86, child: Text(label, style: textTheme.bodySmall)),
          Expanded(
            child: Slider(
              value: value.clamp(min, max),
              min: min,
              max: max,
              label: value.toStringAsFixed(2),
              onChanged: onChanged,
            ),
          ),
          SizedBox(
            width: 44,
            child: Text(
              value.toStringAsFixed(2),
              textAlign: TextAlign.right,
              style: textTheme.bodySmall?.copyWith(color: const Color(0x99FFFFFF)),
            ),
          ),
        ],
      ),
    );
  }
}
