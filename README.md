# flutter_shader_collection

Flutter ports of all 33 shader orbs from
[shadercn](https://www.shadercn.run/docs/components/orbs/orb-01) (ORB-01 ~
ORB-33), rendered with `FragmentShader` + `CustomPaint` — no third-party
dependencies.

## Structure

- `shaders/orb_NN.frag` — GLSL ES 3.00 ports of the original TypeGPU/WGSL
  shaders (sources fetched from the shadcn registry JSON at
  `https://www.shadercn.run/r/orb-NN.json`). Each port is a
  statement-by-statement translation; each keeps the original's alpha output
  contract (premultiplied for surface orbs, unpremultiplied for emissive ones).
- `lib/orb_runtime.dart` — the shared, variant-driven runtime: a port of the
  original `renderer.ts` (semi-implicit parameter springs, three-state drive
  presets, input/output volume synthesis, integrated `speed`/`anim` phases).
  Exposes `ShaderOrb`, `OrbVariant`, `OrbParamDef`, `OrbColorDef`, `OrbState`.
- `lib/orb_NN.dart` — one variant definition per orb: parameter table
  (min/max/step/integrate), colour definitions and per-state presets, plus a
  thin `OrbNN` widget wrapper.
- `lib/orbs.dart` — the registry of all 33 variants.
- `lib/main.dart` — the gallery home page (responsive grid, global pause).
- `lib/orb_detail_page.dart` — per-orb debug page: state switch, colour
  swatches, parameter sliders and pause, all generated from the variant
  metadata.

## Attribution

The shaders are by [XorDev](https://x.com/XorDev), ported for Orbkit with the
author's permission: non-commercial use only, with attribution to XorDev.
shadercn's runtime (renderer.ts) is MIT-licensed. Each ported file keeps the
original notice.

## Development

```bash
flutter pub get
flutter analyze
flutter test          # includes a runtime load of all 33 compiled shaders
flutter run           # gallery; tap a tile for the debug page
```

Shaders are compiled ahead-of-time by `impellerc` for native targets and to
SkSL for web. To re-verify one by hand:

```bash
impellerc --sksl --runtime-stage-gles --runtime-stage-gles3 \
  --runtime-stage-vulkan --iplr \
  --sl=out.sl --spirv=out.spirv \
  --input=shaders/orb_02.frag --input-type=frag \
  --include=shaders \
  --include=<flutter>/bin/cache/artifacts/engine/windows-x64/shader_lib
```
