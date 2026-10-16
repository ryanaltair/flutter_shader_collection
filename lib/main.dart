/// Gallery of all 33 ported shadercn orbs.
///
/// The home page shows every orb on a responsive grid; tapping a tile opens
/// its debug page (`orb_detail_page.dart`) with live state, colour and
/// parameter controls.
library;

import 'package:flutter/material.dart';

import 'orb_detail_page.dart';
import 'orb_runtime.dart';
import 'orbs.dart';

void main() {
  runApp(const OrbCollectionApp());
}

class OrbCollectionApp extends StatelessWidget {
  const OrbCollectionApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Orb Collection · 33 Flutter Shaders',
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

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final width = MediaQuery.sizeOf(context).width;
    final columns = width >= 1100 ? 4 : (width >= 700 ? 3 : 2);
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
                            Text(
                              'ORB COLLECTION',
                              style: textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.w300,
                                letterSpacing: 8,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${allOrbVariants.length} shader effects · Flutter ports of shadercn ORB-01 ~ ORB-${allOrbVariants.length.toString().padLeft(2, '0')}',
                              style: textTheme.bodySmall?.copyWith(
                                color: const Color(0x99FFFFFF),
                                letterSpacing: 1,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton.filledTonal(
                        tooltip: _paused ? 'Resume all' : 'Pause all',
                        onPressed: () => setState(() => _paused = !_paused),
                        icon: Icon(_paused ? Icons.play_arrow : Icons.pause),
                      ),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                sliver: SliverGrid(
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: columns,
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
                          MaterialPageRoute<void>(
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
      ),
    );
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
    final textTheme = Theme.of(context).textTheme;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0x0AFFFFFF),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0x1AFFFFFF)),
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
                Text(
                  variant.label,
                  style: textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w300,
                    letterSpacing: 3,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  variant.note,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.bodySmall?.copyWith(
                    color: const Color(0x66FFFFFF),
                    fontSize: 10,
                    height: 1.25,
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
