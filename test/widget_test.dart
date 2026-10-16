import 'dart:io';
import 'dart:ui' show FragmentProgram;

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_shader_collection/main.dart';
import 'package:flutter_shader_collection/orbs.dart';

/// Every uniform the shared runtime always writes, whatever the variant.
const Set<String> _sharedUniforms = <String>{
  'u_res',
  'u_input_vol',
  'u_output_vol',
};

/// Base-field uniforms the original runtime feeds every variant; a port
/// declares only the subset its shader reads.
const Set<String> _optionalBaseUniforms = <String>{
  'u_anim',
  'u_time',
};

void main() {
  testWidgets('gallery mounts and keeps rendering without exceptions', (tester) async {
    await tester.pumpWidget(const OrbCollectionApp());
    expect(find.byType(OrbGalleryPage), findsOneWidget);

    // Let the async shader loads and a few animation frames run.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('ORB-01'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('the registry holds all 33 orbs, in order', () {
    expect(allOrbVariants.length, 33);
    for (var i = 0; i < allOrbVariants.length; i++) {
      final variant = allOrbVariants[i];
      final nn = (i + 1).toString().padLeft(2, '0');
      expect(variant.key, 'orb-$nn');
      expect(variant.label, 'ORB-$nn');
      expect(variant.shaderAsset, 'shaders/orb_$nn.frag');

      // Uniform names are unique within a variant (shaders are independent
      // programs, so the same name may repeat across variants).
      final uniforms = <String>{
        ..._sharedUniforms,
        for (final p in variant.params) p.uniformName,
        for (final c in variant.colors) c.uniformName,
      };
      expect(
        uniforms.length,
        _sharedUniforms.length + variant.params.length + variant.colors.length,
        reason: 'duplicate uniform name in ${variant.key}',
      );
    }
  });

  test('every state preset only references known parameters', () {
    for (final variant in allOrbVariants) {
      final keys = variant.params.map((p) => p.key).toSet();
      variant.statePresets.forEach((state, preset) {
        for (final key in preset.keys) {
          expect(keys.contains(key), isTrue,
              reason: '${variant.key}/$state references unknown param $key');
        }
      });
      variant.stateColors.forEach((state, colors) {
        final colorKeys = variant.colors.map((c) => c.key).toSet();
        for (final key in colors.keys) {
          expect(colorKeys.contains(key), isTrue,
              reason: '${variant.key}/$state references unknown colour $key');
        }
      });
    }
  });

  test('every .frag declares exactly the uniforms the runtime writes', () {
    final uniformRe = RegExp(r'uniform\s+\w+\s+(\w+)\s*;');
    for (final variant in allOrbVariants) {
      final source = File(variant.shaderAsset).readAsStringSync();
      final declared = <String>{};
      for (final m in uniformRe.allMatches(source)) {
        declared.add(m.group(1)!);
      }
      final written = <String>{
        ..._sharedUniforms,
        for (final p in variant.params) p.uniformName,
        for (final c in variant.colors) c.uniformName,
      };
      // The runtime must never write a uniform the shader does not declare
      // (Flutter throws on that), and the shader must not declare uniforms
      // outside the variant tables plus the optional base fields.
      expect(
        written.difference(declared),
        isEmpty,
        reason: '${variant.key}: runtime writes undeclared uniforms',
      );
      expect(
        declared.difference(written).difference(_optionalBaseUniforms),
        isEmpty,
        reason: '${variant.key}: shader declares unmapped uniforms',
      );
    }
  });

  test('parameter bounds and defaults are sane', () {
    for (final variant in allOrbVariants) {
      for (final p in variant.params) {
        final id = '${variant.key}.${p.key}';
        expect(p.max, greaterThan(p.min), reason: id);
        expect(p.defaultValue, greaterThanOrEqualTo(p.min), reason: id);
        expect(p.defaultValue, lessThanOrEqualTo(p.max), reason: id);
        expect(p.step, greaterThan(0), reason: id);
      }
    }
  });

  testWidgets('every variant shader loads and exposes its uniforms', (tester) async {
    for (final variant in allOrbVariants) {
      Object? error;
      await tester.runAsync(() async {
        try {
          final program = await FragmentProgram.fromAsset(variant.shaderAsset);
          final shader = program.fragmentShader();
          // The shared fields every shader declares.
          shader.getUniformVec2('u_res');
          shader.getUniformFloat('u_input_vol');
          shader.getUniformFloat('u_output_vol');
          for (final p in variant.params) {
            shader.getUniformFloat(p.uniformName);
          }
          for (final c in variant.colors) {
            shader.getUniformVec3(c.uniformName);
          }
          shader.dispose();
        } catch (e) {
          error = e;
        }
      });
      expect(error, isNull, reason: '${variant.key} (${variant.shaderAsset})');
    }
  });
}
