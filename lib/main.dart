/// Gallery of all 33 ported shadercn orbs.
///
/// The home page shows every orb on a responsive grid; tapping a tile opens
/// its debug page (`orb_detail_page.dart`) with live state, colour and
/// parameter controls.
///
/// The app uses `package:flutter/widgets.dart` exclusively — no
/// `package:flutter/material.dart` — so the shared control replacements live in
/// `orb_ui.dart`.
library;

import 'package:flutter/widgets.dart';

import 'orb_detail_page.dart';
import 'orb_runtime.dart';
import 'orb_ui.dart';
import 'orbs.dart';

void main() {
  runApp(const OrbCollectionApp());
}

class OrbCollectionApp extends StatelessWidget {
  const OrbCollectionApp({super.key});

  @override
  Widget build(BuildContext context) {
    return WidgetsApp(
      title: 'Orb Collection · 33 Flutter Shaders',
      color: kBgBottom,
      debugShowCheckedModeBanner: false,
      pageRouteBuilder: <T>(RouteSettings settings, WidgetBuilder builder) {
        return OrbFadeRoute<T>(settings: settings, builder: builder);
      },
      home: const OrbGalleryPage(),
    );
  }
}

class OrbGalleryPage extends StatefulWidget {
  const OrbGalleryPage({super.key});

  @override
  State<OrbGalleryPage> createState() => _OrbGalleryPageState();
}

class _OrbGalleryPageState extends State<OrbGalleryPage> {
  bool _paused = false;

  void _togglePaused() => setState(() => _paused = !_paused);

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: kBackdrop,
      child: SafeArea(
        child: CustomScrollView(
          slivers: <Widget>[
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
              sliver: SliverToBoxAdapter(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          const Text('ORB COLLECTION', style: kTitleStyle),
                          const SizedBox(height: 6),
                          Text(
                            '${allOrbVariants.length} shader effects · Flutter ports of shadercn ORB-01 ~ ORB-${allOrbVariants.length.toString().padLeft(2, '0')}',
                            style: kSubtitleStyle,
                          ),
                        ],
                      ),
                    ),
                    OrbIconButton(
                      icon: _paused ? OrbIcon.play : OrbIcon.pause,
                      tooltip: _paused ? 'Resume all' : 'Pause all',
                      onPressed: _togglePaused,
                      filled: true,
                    ),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              sliver: SliverGrid(
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: _columns(context),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 0.78,
                ),
                delegate: SliverChildBuilderDelegate(
                  (BuildContext context, int index) {
                    final variant = allOrbVariants[index];
                    return _OrbTile(
                      variant: variant,
                      paused: _paused,
                      onTap: () => Navigator.of(context).push(
                        OrbFadeRoute<void>(
                          builder: (_) => OrbDetailPage(variant: variant),
                        ),
                      ),
                    );
                  },
                  childCount: allOrbVariants.length,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  int _columns(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width >= 1100) {
      return 4;
    }
    return width >= 700 ? 3 : 2;
  }
}

class _OrbTile extends StatelessWidget {
  const _OrbTile({
    required this.variant,
    required this.paused,
    required this.onTap,
  });

  final OrbVariant variant;
  final bool paused;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        decoration: BoxDecoration(
          color: kFill,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: kHairline),
        ),
        child: LayoutBuilder(
          builder: (BuildContext context, BoxConstraints constraints) {
            // The label stack is about 44px tall; the orb takes the rest,
            // never wider than the tile.
            final orbSize = (constraints.maxHeight - 44).clamp(48.0, constraints.maxWidth);
            return Column(
              children: <Widget>[
                ShaderOrb(
                  variant: variant,
                  size: orbSize,
                  paused: paused,
                  semanticsLabel: '${variant.label}: ${variant.note}',
                ),
                const SizedBox(height: 8),
                Text(variant.label, style: kLabelLargeStyle),
                const SizedBox(height: 2),
                Text(
                  variant.note,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: kBodyTinyStyle,
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
