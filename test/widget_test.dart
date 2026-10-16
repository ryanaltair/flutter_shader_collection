import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_shader_collection/main.dart';
import 'package:flutter_shader_collection/orb_01.dart';

void main() {
  testWidgets('ORB-01 demo mounts the orb without exceptions', (tester) async {
    await tester.pumpWidget(const Orb01DemoApp());
    expect(find.byType(Orb01), findsOneWidget);

    // Give the async shader load and a few animation frames a chance to run.
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byType(Orb01), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('every state preset only references known parameters', () {
    for (final state in orbStates) {
      final preset = orb01StatePresets[state];
      expect(preset, isNotNull);
      for (final key in preset!.keys) {
        expect(orb01DefaultParams.containsKey(key), isTrue, reason: key);
      }
    }
  });

  test('default params match the original component', () {
    expect(orb01DefaultParams['speed'], 0.5);
    expect(orb01DefaultParams['spin'], 0.25);
    expect(orb01DefaultParams['exposure'], 60);
    expect(orb01DefaultParams['envRadius'], 2.6);
    expect(orb01DefaultTint, '#ffffff');
  });
}
