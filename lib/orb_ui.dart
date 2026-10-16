/// Widgets-only UI kit shared by the gallery and the detail page.
///
/// The app depends on `package:flutter/widgets.dart` exclusively — never on
/// `package:flutter/material.dart` — so every Material control it needs
/// (`AppBar`, `IconButton`, `SegmentedButton`, `Slider`, `Switch`, `Tooltip`,
/// `MaterialPageRoute`) has a small hand-rolled replacement here, plus the
/// palette and text styles that `ThemeData` used to provide.
library;

import 'dart:math' as math;

import 'package:flutter/widgets.dart';

// ---------------------------------------------------------------------------
// Palette & text styles (previously ThemeData / TextTheme).
// ---------------------------------------------------------------------------

/// Backdrop gradient stops, top and bottom.
const Color kBgTop = Color(0xFF161A2E);
const Color kBgBottom = Color(0xFF05060A);

/// Accent used for selected segments and slider fills.
const Color kAccent = Color(0xFF8FD8FF);

const Color kTextPrimary = Color(0xFFFFFFFF);
const Color kTextSecondary = Color(0x99FFFFFF);
const Color kTextTertiary = Color(0x66FFFFFF);

/// Hairline borders and translucent fills.
const Color kHairline = Color(0x1AFFFFFF);
const Color kFill = Color(0x0AFFFFFF);
const Color kFillStrong = Color(0x14FFFFFF);

/// The app-wide backdrop: a radial gradient over near-black.
const BoxDecoration kBackdrop = BoxDecoration(
  gradient: RadialGradient(
    center: Alignment(0, -0.3),
    radius: 1.2,
    colors: <Color>[kBgTop, kBgBottom],
  ),
);

const TextStyle kTitleStyle = TextStyle(
  color: kTextPrimary,
  fontSize: 24,
  fontWeight: FontWeight.w300,
  letterSpacing: 8,
);

const TextStyle kPageTitleStyle = TextStyle(
  color: kTextPrimary,
  fontSize: 18,
  fontWeight: FontWeight.w300,
  letterSpacing: 4,
);

const TextStyle kSubtitleStyle = TextStyle(
  color: kTextSecondary,
  fontSize: 12,
  letterSpacing: 1,
);

const TextStyle kLabelLargeStyle = TextStyle(
  color: kTextPrimary,
  fontSize: 14,
  fontWeight: FontWeight.w300,
  letterSpacing: 3,
);

const TextStyle kLabelSmallStyle = TextStyle(
  color: kTextSecondary,
  fontSize: 11,
  letterSpacing: 2,
);

const TextStyle kBodySmallStyle = TextStyle(
  color: kTextSecondary,
  fontSize: 12,
);

const TextStyle kBodyTinyStyle = TextStyle(
  color: kTextTertiary,
  fontSize: 10,
  height: 1.25,
);

// ---------------------------------------------------------------------------
// Icons (previously Icons.*).
// ---------------------------------------------------------------------------

/// The handful of icons the app needs, painted by [_OrbIconPainter].
enum OrbIcon { back, play, pause, reset }

class _OrbIconPainter extends CustomPainter {
  const _OrbIconPainter(this.icon);

  final OrbIcon icon;

  @override
  void paint(Canvas canvas, Size size) {
    final fill = Paint()
      ..color = const Color(0xE6FFFFFF)
      ..style = PaintingStyle.fill;
    switch (icon) {
      case OrbIcon.back:
        final path = Path()
          ..moveTo(size.width * 0.62, size.height * 0.16)
          ..lineTo(size.width * 0.30, size.height * 0.50)
          ..lineTo(size.width * 0.62, size.height * 0.84)
          ..lineTo(size.width * 0.71, size.height * 0.75)
          ..lineTo(size.width * 0.47, size.height * 0.50)
          ..lineTo(size.width * 0.71, size.height * 0.25)
          ..close();
        canvas.drawPath(path, fill);
      case OrbIcon.play:
        final path = Path()
          ..moveTo(size.width * 0.28, size.height * 0.16)
          ..lineTo(size.width * 0.85, size.height * 0.50)
          ..lineTo(size.width * 0.28, size.height * 0.84)
          ..close();
        canvas.drawPath(path, fill);
      case OrbIcon.pause:
        const barWidth = 0.22;
        const gap = 0.14;
        final left = math.min(0.5 - barWidth - gap / 2, 0.28);
        for (final x in <double>[left, left + barWidth + gap]) {
          canvas.drawRRect(
            RRect.fromLTRBR(
              size.width * x,
              size.height * 0.16,
              size.width * (x + barWidth),
              size.height * 0.84,
              const Radius.circular(2),
            ),
            fill,
          );
        }
      case OrbIcon.reset:
        final rect = Rect.fromLTWH(
          size.width * 0.14,
          size.height * 0.14,
          size.width * 0.72,
          size.height * 0.72,
        );
        final start = math.pi * 0.25;
        final sweep = math.pi * 1.4;
        canvas.drawArc(
          rect,
          start,
          sweep,
          false,
          Paint()
            ..color = const Color(0xE6FFFFFF)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2.2
            ..strokeCap = StrokeCap.round,
        );
        // Arrowhead at the arc's end, pointing along the tangent.
        final angle = start + sweep;
        final end = Offset(
          rect.center.dx + rect.width / 2 * math.cos(angle),
          rect.center.dy + rect.height / 2 * math.sin(angle),
        );
        final tangent = Offset(-math.sin(angle), math.cos(angle));
        final normal = Offset(-tangent.dy, tangent.dx);
        final base = end - tangent * 4.2;
        final path = Path()
          ..moveTo(end.dx + tangent.dx * 2.2, end.dy + tangent.dy * 2.2)
          ..lineTo(base.dx + normal.dx * 3.6, base.dy + normal.dy * 3.6)
          ..lineTo(base.dx - normal.dx * 3.6, base.dy - normal.dy * 3.6)
          ..close();
        canvas.drawPath(path, fill);
    }
  }

  @override
  bool shouldRepaint(_OrbIconPainter oldDelegate) => oldDelegate.icon != icon;
}

// ---------------------------------------------------------------------------
// Buttons & routes.
// ---------------------------------------------------------------------------

/// Round icon button, replacing `IconButton`/`IconButton.filledTonal`.
class OrbIconButton extends StatelessWidget {
  const OrbIconButton({
    super.key,
    required this.icon,
    required this.tooltip,
    required this.onPressed,
    this.filled = false,
  });

  final OrbIcon icon;
  final String tooltip;
  final VoidCallback onPressed;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: tooltip,
      button: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onPressed,
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: filled ? kAccent.withValues(alpha: 0.18) : kFillStrong,
            border: Border.all(color: kHairline),
          ),
          child: Center(
            child: CustomPaint(
              size: const Size(18, 18),
              painter: _OrbIconPainter(icon),
            ),
          ),
        ),
      ),
    );
  }
}

/// Fade-through page route, replacing `MaterialPageRoute` so the app stays
/// free of `package:flutter/material.dart`.
class OrbFadeRoute<T> extends PageRoute<T> {
  OrbFadeRoute({required this.builder, super.settings});

  final WidgetBuilder builder;

  @override
  Color? get barrierColor => null;

  @override
  String? get barrierLabel => null;

  @override
  bool get opaque => true;

  @override
  bool get maintainState => true;

  @override
  Duration get transitionDuration => const Duration(milliseconds: 220);

  @override
  bool canTransitionTo(TransitionRoute<dynamic> nextRoute) => nextRoute is PageRoute;

  @override
  Widget buildPage(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
  ) {
    return builder(context);
  }

  @override
  Widget buildTransitions(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return FadeTransition(opacity: animation, child: child);
  }
}

// ---------------------------------------------------------------------------
// Controls (previously SegmentedButton / Slider / Switch).
// ---------------------------------------------------------------------------

/// Segmented single-select control, replacing `SegmentedButton`.
class OrbSegmentedControl<T> extends StatelessWidget {
  const OrbSegmentedControl({
    super.key,
    required this.segments,
    required this.selected,
    required this.onChanged,
  });

  final List<({T value, String label})> segments;
  final T selected;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: kFill,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: kHairline),
      ),
      child: Row(
        children: <Widget>[
          for (final segment in segments)
            Expanded(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => onChanged(segment.value),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 160),
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  decoration: BoxDecoration(
                    color: segment.value == selected
                        ? kAccent.withValues(alpha: 0.22)
                        : const Color(0x00000000),
                    borderRadius: BorderRadius.circular(19),
                    border: Border.all(
                      color: segment.value == selected
                          ? kAccent.withValues(alpha: 0.6)
                          : const Color(0x00000000),
                    ),
                  ),
                  child: Text(
                    segment.label,
                    textAlign: TextAlign.center,
                    style: kLabelSmallStyle.copyWith(
                      color: segment.value == selected ? kAccent : kTextSecondary,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Discrete slider, replacing `Slider` (with `divisions` semantics).
class OrbSlider extends StatelessWidget {
  const OrbSlider({
    super.key,
    required this.value,
    required this.min,
    required this.max,
    required this.step,
    required this.onChanged,
  });

  final double value;
  final double min;
  final double max;
  final double step;
  final ValueChanged<double> onChanged;

  double get _snapStep => step > 0 ? step : (max - min) / 100;

  void _handle(double dx, double width) {
    if (width <= 0 || max <= min) {
      return;
    }
    final t = (dx / width).clamp(0.0, 1.0);
    final raw = min + (max - min) * t;
    final snapped = min + ((raw - min) / _snapStep).round() * _snapStep;
    onChanged(snapped.clamp(min, max));
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: (details) => _handle(details.localPosition.dx, constraints.maxWidth),
          onHorizontalDragStart: (details) => _handle(details.localPosition.dx, constraints.maxWidth),
          onHorizontalDragUpdate: (details) => _handle(details.localPosition.dx, constraints.maxWidth),
          child: SizedBox(
            height: 28,
            child: CustomPaint(
              painter: _OrbSliderPainter(value: value, min: min, max: max),
            ),
          ),
        );
      },
    );
  }
}

class _OrbSliderPainter extends CustomPainter {
  const _OrbSliderPainter({required this.value, required this.min, required this.max});

  final double value;
  final double min;
  final double max;

  @override
  void paint(Canvas canvas, Size size) {
    final t = max > min ? ((value - min) / (max - min)).clamp(0.0, 1.0) : 0.0;
    const trackHeight = 4.0;
    final trackY = (size.height - trackHeight) / 2;
    final track = RRect.fromLTRBR(
      0,
      trackY,
      size.width,
      trackY + trackHeight,
      const Radius.circular(2),
    );
    canvas.drawRRect(track, Paint()..color = kFillStrong);
    if (t > 0) {
      canvas.drawRRect(
        RRect.fromLTRBR(
          0,
          trackY,
          size.width * t,
          trackY + trackHeight,
          const Radius.circular(2),
        ),
        Paint()..color = kAccent,
      );
    }
    canvas.drawCircle(
      Offset(size.width * t, size.height / 2),
      7,
      Paint()..color = kTextPrimary,
    );
  }

  @override
  bool shouldRepaint(_OrbSliderPainter oldDelegate) {
    return oldDelegate.value != value ||
        oldDelegate.min != min ||
        oldDelegate.max != max;
  }
}

/// Toggle switch, replacing `Switch`.
class OrbToggleSwitch extends StatelessWidget {
  const OrbToggleSwitch({super.key, required this.value, required this.onChanged});

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      toggled: value,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => onChanged(!value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          width: 44,
          height: 26,
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(13),
            color: value ? kAccent.withValues(alpha: 0.45) : kFillStrong,
            border: Border.all(
              color: value ? kAccent.withValues(alpha: 0.8) : kHairline,
            ),
          ),
          child: AnimatedAlign(
            duration: const Duration(milliseconds: 160),
            alignment: value ? Alignment.centerRight : Alignment.centerLeft,
            child: Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: value ? kAccent : kTextSecondary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
