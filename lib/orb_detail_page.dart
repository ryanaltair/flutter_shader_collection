/// Detail page for one orb variant: live preview plus controls generated from
/// the variant's metadata (state presets, colour definitions, parameter
/// ranges). Overrides win over the per-state presets, exactly like the
/// original component's `params` / `colors` props.
///
/// Built from `package:flutter/widgets.dart` only; the `AppBar`,
/// `SegmentedButton`, `Slider` and `Switch` replacements come from
/// `orb_ui.dart`.
library;

import 'package:flutter/widgets.dart';

import 'orb_runtime.dart';
import 'orb_ui.dart';

/// Extra swatches offered for every colour slot, on top of the variant's own
/// default.
const List<({String label, String hex})> _extraSwatches = <({String label, String hex})>[
  (label: 'white', hex: '#ffffff'),
  (label: 'ice', hex: '#8fd8ff'),
  (label: 'iris', hex: '#b79bff'),
  (label: 'ember', hex: '#ff9e7a'),
  (label: 'jade', hex: '#8ff0c0'),
];

class OrbDetailPage extends StatefulWidget {
  const OrbDetailPage({super.key, required this.variant});

  final OrbVariant variant;

  @override
  State<OrbDetailPage> createState() => _OrbDetailPageState();
}

class _OrbDetailPageState extends State<OrbDetailPage> {
  OrbState _state = OrbState.idle;
  final Map<String, double> _params = <String, double>{};
  final Map<String, String> _colors = <String, String>{};
  bool _paused = false;

  OrbVariant get variant => widget.variant;

  void _reset() {
    setState(() {
      _params.clear();
      _colors.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: kBackdrop,
      child: SafeArea(
        child: Column(
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: Row(
                children: <Widget>[
                  OrbIconButton(
                    icon: OrbIcon.back,
                    tooltip: 'Back',
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  const SizedBox(width: 4),
                  Expanded(child: Text(variant.label, style: kPageTitleStyle)),
                  OrbIconButton(
                    icon: OrbIcon.reset,
                    tooltip: 'Reset overrides',
                    onPressed: _reset,
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    Center(
                      child: ShaderOrb(
                        variant: variant,
                        size: 280,
                        state: _state,
                        paused: _paused,
                        params: _params.isEmpty ? null : _params,
                        colors: _colors.isEmpty ? null : _colors,
                        semanticsLabel: '${variant.label}: ${variant.note}',
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      variant.note,
                      textAlign: TextAlign.center,
                      style: kSubtitleStyle,
                    ),
                    const SizedBox(height: 24),
                    _sectionLabel('STATE'),
                    OrbSegmentedControl<OrbState>(
                      segments: const <({OrbState value, String label})>[
                        (value: OrbState.idle, label: 'idle'),
                        (value: OrbState.thinking, label: 'thinking'),
                        (value: OrbState.speaking, label: 'speaking'),
                      ],
                      selected: _state,
                      onChanged: (OrbState value) => setState(() => _state = value),
                    ),
                    const SizedBox(height: 24),
                    if (variant.colors.isNotEmpty) ...<Widget>[
                      _sectionLabel('COLORS'),
                      for (final color in variant.colors)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: _ColorRow(
                            def: color,
                            currentHex: _colors[color.key] ?? color.defaultHex,
                            onChanged: (String hex) =>
                                setState(() => _colors[color.key] = hex),
                          ),
                        ),
                      const SizedBox(height: 24),
                    ],
                    _sectionLabel('SHADER PARAMS'),
                    const Text(
                      'Overrides win over the per-state presets.',
                      style: kBodyTinyStyle,
                    ),
                    const SizedBox(height: 8),
                    for (final param in variant.params)
                      _ParamSlider(
                        def: param,
                        value: _params[param.key] ?? _displayValue(param),
                        onChanged: (double value) =>
                            setState(() => _params[param.key] = value),
                      ),
                    const SizedBox(height: 8),
                    Row(
                      children: <Widget>[
                        const Text('paused', style: kLabelSmallStyle),
                        const Spacer(),
                        OrbToggleSwitch(
                          value: _paused,
                          onChanged: (bool v) => setState(() => _paused = v),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// The value shown on the track before any override: the state preset's
  /// target, or the parameter's default when the preset does not mention it.
  double _displayValue(OrbParamDef param) {
    final preset = variant.statePresets[_state] ?? const <String, double>{};
    return preset[param.key] ?? param.defaultValue;
  }

  static Widget _sectionLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(text, style: kLabelSmallStyle),
    );
  }
}

class _ColorRow extends StatelessWidget {
  const _ColorRow({
    required this.def,
    required this.currentHex,
    required this.onChanged,
  });

  final OrbColorDef def;
  final String currentHex;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final swatches = <({String label, String hex})>[
      (label: 'default', hex: def.defaultHex),
      ..._extraSwatches,
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text('${def.key} · ${def.label}', style: kBodySmallStyle),
        const SizedBox(height: 6),
        Wrap(
          spacing: 10,
          runSpacing: 8,
          children: <Widget>[
            for (final swatch in swatches)
              _Swatch(
                hex: swatch.hex,
                label: swatch.label,
                selected: swatch.hex.toLowerCase() == currentHex.toLowerCase(),
                onTap: () => onChanged(swatch.hex),
              ),
          ],
        ),
      ],
    );
  }
}

class _Swatch extends StatelessWidget {
  const _Swatch({
    required this.hex,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String hex;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label · $hex',
      selected: selected,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: _parseHex(hex),
            shape: BoxShape.circle,
            border: Border.all(
              color: selected ? kTextPrimary : const Color(0x33FFFFFF),
              width: selected ? 2.5 : 1,
            ),
            boxShadow: <BoxShadow>[
              if (selected)
                BoxShadow(color: _parseHex(hex).withValues(alpha: 0.5), blurRadius: 12),
            ],
          ),
        ),
      ),
    );
  }
}

class _ParamSlider extends StatelessWidget {
  const _ParamSlider({
    required this.def,
    required this.value,
    required this.onChanged,
  });

  final OrbParamDef def;
  final double value;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final clamped = value.clamp(def.min, def.max);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: <Widget>[
          SizedBox(
            width: 110,
            child: Text(
              def.key,
              style: kBodySmallStyle,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Expanded(
            child: OrbSlider(
              value: clamped,
              min: def.min,
              max: def.max,
              step: def.step,
              onChanged: onChanged,
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 44,
            child: Text(
              clamped.toStringAsFixed(2),
              textAlign: TextAlign.right,
              style: kBodySmallStyle,
            ),
          ),
        ],
      ),
    );
  }
}

Color _parseHex(String hex) {
  var h = hex.trim();
  if (h.startsWith('#')) {
    h = h.substring(1);
  }
  if (h.length == 3) {
    h = '${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}';
  }
  final value = int.tryParse(h, radix: 16) ?? 0xffffff;
  return Color(0xFF000000 | value);
}
