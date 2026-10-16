---
name: flutter-orb-01-shader
overview: 将 shadercn ORB-01（基于 XorDev 的 TypeGPU/WGSL 着色器）完整移植为 Flutter FragmentShader 实现：GLSL 片元着色器 + Dart 运行时（弹簧缓动、状态预设、volumes 合成、相位积分）+ 演示页面，兼容 Web 与 Windows。
---

## 产品概述

将 shadercn ORB-01 组件（"cut-glass orb with a dispersive, turbulent interior"，原作者 XorDev，经 shadercn 以 TypeGPU/WGSL 移植）完整移植为 Flutter 实现：一个自包含的 `Orb01` Flutter Widget，通过 FragmentShader 渲染带色散、湍流内部的切面玻璃球，支持 idle / thinking / speaking 三种状态预设与平滑过渡，兼容 Web（Chrome/CanvasKit 或 Skwasm）与 Windows（Impeller/Vulkan）。

## 核心功能

- **GLSL 片元着色器**（`shaders/orb_01.frag`）：60 步 raymarching + 5 次湍流迭代的体积渲染，含自旋/倾斜旋转、sheet 条纹、色散、散射透射、边缘遮罩与光晕衰减
- **Dart 运行时**（`lib/orb_01.dart`）：逐帧弹簧缓动（semi-implicit spring，PARAM_EASE=4）、按状态合成的 input/output volumes（speaking/thinking/idle 三套三角函数曲线，VOLUME_EASE=12 指数逼近）、speed/spin 积分相位、tint 颜色逐通道弹簧，统一写入 uniform
- **Orb01 Widget**：props 对齐原版——size(280)、state、params 覆盖（20 个参数）、colors(tint)、statePresets/stateColors/stateVolumes、volumes 直接驱动、paused、maxDpr(2)、语义标签；Ticker 驱动，paused 时冻结帧循环
- **演示页面**（`lib/main.dart`）：深色背景，居中 280px 光球，状态切换（SegmentedButton）、tint 快捷配色、speed/turbulence/dispersion 参数滑块
- **跨端兼容**：使用官方 `#include <flutter/runtime_effect.glsl>` + `FlutterFragCoord()` 模板（自动处理 Impeller 与 Skia 坐标差异）、按名字获取 uniform slot（`getUniformVec2` 等）、u_res 传设备像素尺寸

## 边界与约束

- 着色器为 XorDev 作品的移植，需在源码注释保留署名
- 性能上限：60 步 × 5 湍流迭代/像素，与原版 WebGPU 同级，dpr 上限 2
- GLSL `smoothstep` 在 edge0 > edge1（env 衰减斜坡）时为未定义行为，需用自定义 clamp+hermite 辅助函数保证跨 GPU 确定性

## 技术栈

- **框架**：Flutter 3.47.7 stable（Dart 3.13.5），项目已含 `web/` 与 `windows/` 目录
- **渲染**：`dart:ui` FragmentShader（`FragmentProgram.fromAsset` + `CustomPaint`），Impeller（Windows/Vulkan）与 Skia/CanvasKit、Skwasm（Web）双端通用模板
- **语言/规范**：GLSL ES 3.00（`#version 300 es`）；Dart 空安全
- **无新增第三方依赖**（仅使用 flutter SDK 自带能力）

## 实现方案

### 总体策略

以 registry 逐字获取的 WGSL 源码为唯一事实来源，做**语义级直译**而非重写：GLSL 逐语句对应 TypeGPU 代码（循环上界、运算顺序、swizzle、`min/max/clamp` 语义保持一致），Dart 侧逐函数对应 `renderer.ts` 的 `createOrbScene.advance` 弹簧状态机。uniform 采用 Flutter 3.38+ 按名字获取 slot 的新 API，避免索引错位。

### 关键决策与取舍

1. **积分相位的正确处理**：原版 `speed`/`spin` 参数标记 `integrate: true`——shader 读取的 `p_speed`/`p_spin` 不是速率而是累计相位（`clock += dt * speed * spring.x`）。Dart 运行时必须复刻该积分，否则光球静止。这是移植正确性的核心。
2. **只声明被读取的 uniform**：原 struct 中 `anim`/`time` 不被 orb-01 片元着色器读取，GLSL 中若声明可能被编译器优化掉导致 `getUniformFloat` 抛异常，故不声明（运行时可仍维护 anim 计时器供未来变体使用，但不绑定 uniform）。
3. **自定义 smoothstep**：`env` 衰减为递减斜坡（edge0 = envRadius*1.12 > edge1 = envRadius*envCore），GLSL 规范对此未定义，实现 `sstep(a,b,x) = clamp((x-a)/(b-a),0,1)` + hermite，数学等价 WGSL 且跨 GPU 确定。
4. **Ticker + markNeedsPaint 而非每帧 setState**：用 GlobalKey 获取 `RenderCustomPaint` 直接标记重绘，避免每帧重建 widget 树；tick 回调处于 SchedulerPhase.transientCallbacks，是调 markNeedsPaint 的正确时机。
5. **u_res 传设备像素**：`FlutterFragCoord()` 返回设备像素坐标，故 `u_res = 逻辑尺寸 × devicePixelRatio（clamp 到 maxDpr=2）`，与原版 canvas backing store 行为一致，保证宽高比与圆形边缘正确。
6. **跨端模板**：`#include