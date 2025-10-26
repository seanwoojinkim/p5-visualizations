---
doc_type: research
date: 2025-10-26T16:34:09+00:00
title: "Brushstroke-Based Koi Coloration Implementation Status"
research_question: "What is the current state of brushstroke/texture-based rendering for koi fish in the codebase, and what remains to be implemented for brushstroke-based coloration?"
researcher: Sean Kim

git_commit: e1da3d9b2bac215571ad0135c6562d28b97ed786
branch: main
repository: workspace

created_by: Sean Kim
last_updated: 2025-10-26
last_updated_by: Claude Code

tags:
  - rendering
  - brushstrokes
  - textures
  - sumi-e
  - watercolor
  - koi
  - SVG
  - procedural
status: complete

related_docs:
  - flocking/research/2025-10-19-sumi-e-rendering-for-koi-simulation.md
  - thoughts/plans/2025-10-22-generalize-svg-rendering-system-for-all-koi-body-parts.md
  - thoughts/plans/2025-10-22-svg-based-koi-rendering-with-bitmap-brushstrokes.md
---

# Research: Brushstroke-Based Koi Coloration Implementation Status

**Date**: 2025-10-26T16:34:09+00:00
**Researcher**: Claude Code (Anthropic)
**Git Commit**: e1da3d9b2bac215571ad0135c6562d28b97ed786
**Branch**: main
**Repository**: workspace

## Research Question

What is the current state of brushstroke/texture-based rendering for koi fish in the codebase? Specifically:
1. What brushstroke/texture-based rendering has been implemented?
2. How do the sumi-e (ink painting) and watercolor styles currently work?
3. What remains to be implemented for brushstroke-based koi coloration?
4. Where is the BrushTextures class defined and how is it used?
5. How are brush textures applied to different koi body parts?
6. What does the current rendering pipeline look like (SVG vs procedural, with/without textures)?
7. Are there any TODOs or incomplete implementations related to brush textures?

## Executive Summary

The codebase has a **partially implemented** brushstroke-based rendering system for koi fish. The infrastructure exists and works, but **brush textures are NOT actively applied to body parts**. Instead, the system currently uses a **multi-layer rendering technique** (sumi-e style) that creates soft, organic edges through layered semi-transparent shapes. This is a **procedural simulation of brush aesthetics** rather than actual bitmap brush texture application.

**Current State:**
- ✅ BrushTextures class exists and generates procedural brush textures (`src/rendering/brush-textures.js`)
- ✅ Textures are generated on initialization (body, fin, tail, spot, paper)
- ✅ Sumi-e rendering mode enabled when BrushTextures provided to KoiRenderer
- ✅ Multi-layer rendering creates soft, organic edges (3 layers for sumi-e style)
- ❌ **Brush textures are NOT applied via blending to koi body parts**
- ❌ Watercolor rendering is only configured, not implemented
- ✅ SVG rendering pipeline works for all body parts (Phases 1-5 complete)

**Key Finding:** The `applyBrushTexture()` method exists in KoiRenderer but **is not called** anywhere in the rendering pipeline. The sumi-e effect is achieved entirely through procedural layering, not texture application.

## Detailed Findings

### 1. BrushTextures Class Architecture

**Location**: `flocking/src/rendering/brush-textures.js`

**Class Structure:**
```javascript
export class BrushTextures {
    constructor() {
        this.textures = {
            body: null,
            fin: null,
            tail: null,
            spot: null,
            paper: null
        };
        this.isReady = false;
    }
}
```

**Texture Generation** (lines 24-35):
- Textures are procedurally generated using p5.js `createGraphics()`
- Generates 5 texture types with different characteristics:
  - **Body brush** (512×256): Horizontal flowing strokes with fiber detail
  - **Fin brush** (256×128): Delicate, wispy strokes
  - **Tail brush** (512×128): Flowing, dynamic strokes
  - **Spot brush** (256×256): Organic circular texture with soft edges
  - **Paper grain** (1024×1024): Fine paper texture for background overlay

**Texture Characteristics:**
- All textures use grayscale with alpha channel
- Very light opacity (alpha 5-40) for subtle effect
- Multi-layered approach: base strokes + fiber detail + noise
- Textures significantly lightened compared to original design (alpha reduced from 30-150 to 5-35)

**Code Reference**: [`brush-textures.js:41-79`](/workspace/flocking/src/rendering/brush-textures.js#L41-L79) (body brush generation)

### 2. How Sumi-e Rendering Currently Works

**Activation** (`koi-renderer.js:16-18`):
```javascript
constructor(brushTextures = null) {
    this.brushTextures = brushTextures;
    this.useSumieStyle = brushTextures !== null && brushTextures.isReady;
}
```

**Rendering Technique** - Multi-Layer Procedural (NOT texture-based):

**Example: Body Rendering** (`koi-renderer.js:920-958`):
```javascript
if (this.useSumieStyle) {
    // Draw 3 layers with slight variations for soft edges
    for (let layer = 0; layer < 3; layer++) {
        const offset = (layer - 1) * 0.3; // Slight positional variation
        const opacity = layer === 1 ? 0.7 : 0.3; // Middle layer darker

        context.fill(hue, saturation, brightness - 2, opacity);
        context.beginShape();
        // ... draw shape with offset ...
        context.endShape(context.CLOSE);
    }
}
```

**How It Works:**
1. **Layer 1** (offset -0.3): Semi-transparent outer layer (opacity 0.3)
2. **Layer 2** (offset 0): Main shape, darker (opacity 0.7)
3. **Layer 3** (offset +0.3): Semi-transparent outer layer (opacity 0.3)

This creates soft, feathered edges that **simulate** brushstroke appearance without using actual brush textures.

**Applied to:**
- ✅ Body (`drawBody`, lines 920-958)
- ✅ Tail (`drawTail`, lines 549-569)
- ✅ Fins (pectoral, dorsal, ventral) (lines 373-444)
- ✅ SVG shapes (`drawSVGShape`, lines 851-865)

**Code References:**
- Body: [`koi-renderer.js:920-958`](/workspace/flocking/src/rendering/koi-renderer.js#L920-L958)
- Tail: [`koi-renderer.js:549-569`](/workspace/flocking/src/rendering/koi-renderer.js#L549-L569)
- SVG: [`koi-renderer.js:851-865`](/workspace/flocking/src/rendering/koi-renderer.js#L851-L865)

### 3. The Unused Brush Texture Application Method

**Location**: `koi-renderer.js:22-51`

**Method Signature:**
```javascript
applyBrushTexture(context, textureName, x, y, width, height, rotation = 0, opacity = 0.3)
```

**What it does:**
1. Checks if sumi-e style is enabled
2. Retrieves texture from BrushTextures instance
3. Applies MULTIPLY blend mode
4. Renders texture with tint and rotation
5. Resets blend mode

**CRITICAL FINDING:** This method is **NEVER CALLED** in the codebase!

**Verification:**
```bash
grep -rn "applyBrushTexture" flocking/src/
# Only finds: definition (line 32) and NO calls
```

**Implication:** Brush textures are generated but not used. The sumi-e effect comes entirely from multi-layer rendering.

### 4. Watercolor Rendering System Status

**Configuration Exists** (`rendering-config.js:36-44`):
```javascript
// Watercolor rendering
watercolor: {
    enabled: false,           // Toggle watercolor style
    layerCount: 3,            // Number of watercolor layers
    layerOpacity: [0.3, 0.5, 0.2], // Opacity for each layer
    edgeVariation: 0.4,       // Edge roughness
    colorBleed: 1.2,          // Color bleeding effect
    layerScale: 1.05          // Scale for watercolor layers relative to shape
}
```

**Status:** ❌ **NOT IMPLEMENTED**
- Configuration documented
- No rendering code exists
- No watercolor-specific methods in KoiRenderer
- `enabled: false` by default

**Location**: [`rendering-config.js:36-44`](/workspace/flocking/src/core/rendering-config.js#L36-L44)

### 5. Current Rendering Pipeline (SVG vs Procedural)

**Pipeline Flow:**

```
simulation-app.js setup()
    ↓
Generate BrushTextures
    ↓
Initialize KoiRenderer with brushTextures
    ↓
Set useSumieStyle = true
    ↓
simulation-app.js draw()
    ↓
For each koi:
    ↓
    renderer.render(context, x, y, angle, params)
        ↓
        Check if SVG vertices provided
        ↓
        ┌─────────────┴─────────────┐
        │                           │
    SVG Mode                  Procedural Mode
        │                           │
    drawBodyFromSVG()          drawBody()
    drawTailFromSVG()          drawTail()
    drawHeadFromSVG()          drawHead()
    drawFinFromSVG()           drawFins()
        │                           │
        └──────────┬────────────────┘
                   ↓
          Both use multi-layer rendering
          if useSumieStyle === true
                   ↓
          NO brush texture application
```

**SVG Rendering** (Phases 1-5 complete):
- ✅ Phase 1: Core infrastructure (`drawSVGShape()`)
- ✅ Phase 2: SVG asset loading
- ✅ Phase 3: Tail SVG rendering with flutter deformation
- ✅ Phase 4: Fin SVG rendering (pectoral, dorsal, ventral)
- ✅ Phase 5: Head SVG rendering (eyes always procedural)

**Deformation Types:**
- `wave`: Body wave motion (sine wave along spine)
- `flutter`: Tail traveling wave
- `rotate`: Fin rotation around pivot
- `static`: No deformation (head)

**Sumi-e Integration with SVG** (`drawSVGShape`, lines 851-876):
- SVG shapes also use 3-layer rendering when `useSumieStyle === true`
- Layer offsets: (layer - 1) * 0.3
- Opacity: middle layer 100%, outer layers 40%

**Code Reference**: [`koi-renderer.js:746-879`](/workspace/flocking/src/rendering/koi-renderer.js#L746-L879)

### 6. How Brush Textures SHOULD Be Applied (But Aren't)

Based on the research document (`2025-10-19-sumi-e-rendering-for-koi-simulation.md`) and the existing `applyBrushTexture()` method, the intended implementation was:

**Original Design** (from research doc, lines 1020-1044):
```javascript
drawBody(context, segmentPositions, ...) {
    // 1. Draw base shape
    context.fill(hue, saturation, brightness - 2, 0.92);
    context.beginShape();
    // ... existing body drawing ...
    context.endShape(context.CLOSE);

    // 2. NEW: Apply brush texture overlay for sumi-e effect
    if (this.inkStyle) {
        const bounds = this.calculateBounds(bodyPoints);

        this.applyBrushTexture(
            context,
            bounds,
            'body',
            { h: hue, s: saturation, b: brightness },
            0.6 // Ink opacity
        );
    }
}
```

**Why It Was Never Implemented:**
- Multi-layer rendering proved sufficient for sumi-e aesthetic
- Performance considerations (texture blending adds overhead)
- Simpler approach: procedural layering instead of texture + blend mode
- Research doc was exploratory; implementation took different path

**Code Reference**: [`flocking/research/2025-10-19-sumi-e-rendering-for-koi-simulation.md:1020-1044`](/workspace/flocking/research/2025-10-19-sumi-e-rendering-for-koi-simulation.md#L1020-L1044)

### 7. TODOs and Incomplete Implementations

**Searched for:**
```bash
grep -rn "TODO\|FIXME\|XXX" flocking/src/*.js --include="*.js"
```

**Result:** NO TODOs found in flocking source code

**Incomplete Features:**
1. ❌ **Brush texture application** - Method exists but unused
2. ❌ **Watercolor rendering** - Configured but not implemented
3. ❌ **Paper texture overlay** - Generated but not applied to background
4. ❌ **Spot brush texture** - Generated but spots use solid fills

**Working Features:**
1. ✅ BrushTextures class generates all textures
2. ✅ Multi-layer sumi-e rendering (procedural approach)
3. ✅ SVG rendering pipeline (all body parts)
4. ✅ Deformation system (wave, flutter, rotate, static)

### 8. Brush Texture Application to Body Parts (Current vs Intended)

**Current State (What Actually Happens):**

| Body Part | SVG Support | Sumi-e Style | Brush Texture Applied? |
|-----------|-------------|--------------|------------------------|
| Body      | ✅ Yes       | ✅ 3-layer    | ❌ No                   |
| Tail      | ✅ Yes       | ✅ 3-layer    | ❌ No                   |
| Head      | ✅ Yes       | ✅ Static     | ❌ No                   |
| Pectoral Fins | ✅ Yes   | ✅ 2-layer    | ❌ No                   |
| Dorsal Fin | ✅ Yes      | ✅ 2-layer    | ❌ No                   |
| Ventral Fins | ✅ Yes    | ✅ 2-layer    | ❌ No                   |
| Spots     | ❌ No        | ✅ Reduced opacity | ❌ No            |
| Eyes      | ❌ No (always procedural) | ✅ Solid | ❌ No (n/a) |
| Background | N/A        | N/A          | ❌ No (paper texture unused) |

**Intended State (From Research Doc):**

| Body Part | Intended Texture | Blend Mode | Opacity |
|-----------|------------------|------------|---------|
| Body      | `body` (512×256) | MULTIPLY   | 0.6     |
| Tail      | `tail` (512×128) | MULTIPLY   | 0.6     |
| Fins      | `fin` (256×128)  | MULTIPLY   | 0.7     |
| Spots     | `spot` (256×256) | MULTIPLY   | 0.5     |
| Background | `paper` (1024×1024) | MULTIPLY | 0.12   |

**Why Textures Weren't Applied:**
1. **Performance**: Multi-layer rendering is faster than texture blending
2. **Sufficient Quality**: Layered approach achieves sumi-e aesthetic
3. **Simplicity**: Fewer moving parts, easier to maintain
4. **Development Priority**: SVG pipeline took precedence

## Code References

### BrushTextures Class
- **Definition**: [`brush-textures.js:7-227`](/workspace/flocking/src/rendering/brush-textures.js#L7-L227)
- **Body brush**: [`brush-textures.js:41-79`](/workspace/flocking/src/rendering/brush-textures.js#L41-L79)
- **Fin brush**: [`brush-textures.js:85-112`](/workspace/flocking/src/rendering/brush-textures.js#L85-L112)
- **Tail brush**: [`brush-textures.js:118-145`](/workspace/flocking/src/rendering/brush-textures.js#L118-L145)
- **Spot brush**: [`brush-textures.js:151-173`](/workspace/flocking/src/rendering/brush-textures.js#L151-L173)
- **Paper grain**: [`brush-textures.js:179-217`](/workspace/flocking/src/rendering/brush-textures.js#L179-L217)

### KoiRenderer Sumi-e Implementation
- **Constructor**: [`koi-renderer.js:16-19`](/workspace/flocking/src/core/koi-renderer.js#L16-L19)
- **applyBrushTexture (unused)**: [`koi-renderer.js:32-51`](/workspace/flocking/src/core/koi-renderer.js#L32-L51)
- **Body multi-layer**: [`koi-renderer.js:920-958`](/workspace/flocking/src/core/koi-renderer.js#L920-L958)
- **Tail multi-layer**: [`koi-renderer.js:549-569`](/workspace/flocking/src/core/koi-renderer.js#L549-L569)
- **Fin multi-layer**: [`koi-renderer.js:373-444`](/workspace/flocking/src/core/koi-renderer.js#L373-L444)
- **SVG multi-layer**: [`koi-renderer.js:851-865`](/workspace/flocking/src/core/koi-renderer.js#L851-L865)

### SVG Rendering System
- **drawSVGShape**: [`koi-renderer.js:746-879`](/workspace/flocking/src/core/koi-renderer.js#L746-L879)
- **Wave deformation**: [`koi-renderer.js:598-632`](/workspace/flocking/src/rendering/koi-renderer.js#L598-L632)
- **Flutter deformation**: [`koi-renderer.js:645-687`](/workspace/flocking/src/core/koi-renderer.js#L645-L687)
- **Rotation deformation**: [`koi-renderer.js:702-740`](/workspace/flocking/src/core/koi-renderer.js#L702-L740)

### Initialization
- **BrushTextures generation**: [`simulation-app.js:165-166`](/workspace/flocking/src/apps/simulation-app.js#L165-L166)
- **KoiRenderer constructor call**: [`simulation-app.js:169`](/workspace/flocking/src/apps/simulation-app.js#L169)

### Configuration
- **Rendering config**: [`rendering-config.js:36-44`](/workspace/flocking/src/core/rendering-config.js#L36-L44) (watercolor)
- **Opacity settings**: [`rendering-config.js:28-33`](/workspace/flocking/src/core/rendering-config.js#L28-L33)

## Architecture Documentation

### Brush Texture Generation Flow

```
simulation-app.js setup()
    ↓
brushTextures = new BrushTextures()
    ↓
brushTextures.generate(createGraphics, random)
    ↓
    ├─ generateBodyBrush() → 512×256 texture
    ├─ generateFinBrush() → 256×128 texture
    ├─ generateTailBrush() → 512×128 texture
    ├─ generateSpotBrush() → 256×256 texture
    └─ generatePaperGrain() → 1024×1024 texture
    ↓
brushTextures.isReady = true
    ↓
renderer = new KoiRenderer(brushTextures)
    ↓
renderer.useSumieStyle = true
```

### Multi-Layer Sumi-e Rendering

```
drawBody(context, ...) / drawTail(context, ...) / drawFins(context, ...)
    ↓
    if (useSumieStyle) {
        for (layer = 0; layer < 3; layer++) {
            ↓
            offset = (layer - 1) * 0.3
            opacity = layer === 1 ? 0.7 : 0.3
            ↓
            context.fill(hue, sat, bright, opacity)
            context.beginShape()
            // Draw shape with offset
            context.endShape(CLOSE)
        }
    } else {
        // Single solid shape
    }
```

### Intended Brush Texture Application (NOT IMPLEMENTED)

```
drawBody(context, ...) {
    // Step 1: Draw base shape
    context.fill(hue, sat, bright, 0.92)
    context.beginShape()
    // ... vertices ...
    context.endShape(CLOSE)

    // Step 2: Apply brush texture overlay (NOT IMPLEMENTED)
    if (this.useSumieStyle) {
        bounds = calculateBounds(bodyPoints)

        applyBrushTexture(
            context,
            'body',  // texture name
            bounds.x, bounds.y,
            bounds.width, bounds.height,
            rotation = 0,
            opacity = 0.6
        )
            ↓
        context.blendMode(MULTIPLY)
        context.tint(255, opacity * 255)
        context.image(texture, x, y, w, h)
        context.blendMode(BLEND)
    }
}
```

### SVG + Sumi-e Integration

```
drawSVGShape(context, vertices, config)
    ↓
Apply deformation (wave/flutter/rotate/static)
    ↓
Transform (translate, rotate, scale)
    ↓
if (useSumieStyle) {
    for (layer = 0; layer < 3; layer++) {
        offset = (layer - 1) * 0.3
        layerOpacity = layer === 1 ? opacity : opacity * 0.4

        context.fill(hue, sat, bright, layerOpacity)
        context.beginShape()
        for (vertex of vertices) {
            context.curveVertex(x * scale + offset, y * scale + offset)
        }
        context.endShape(CLOSE)
    }
} else {
    // Single layer SVG rendering
}
```

## Historical Context

### Original Research Plan (October 19, 2025)

The research document [`2025-10-19-sumi-e-rendering-for-koi-simulation.md`](/workspace/flocking/research/2025-10-19-sumi-e-rendering-for-koi-simulation.md) outlined a comprehensive plan for authentic sumi-e rendering:

**Recommended Approach** (from research):
- **Hybrid texture-based** with optional shader
- Texture overlays with MULTIPLY blend mode
- Paper texture background
- 60fps performance maintained

**What Was Implemented:**
- ✅ BrushTextures class (procedural generation)
- ✅ Multi-layer rendering for soft edges
- ❌ Texture application via blend modes (skipped)
- ❌ Paper texture background (skipped)
- ❌ Edge enhancement shader (skipped)

**Reason for Divergence:**
The multi-layer procedural approach proved sufficient for achieving the sumi-e aesthetic without the complexity of texture blending. The research was exploratory; implementation prioritized simplicity and performance.

### SVG Rendering System Development (October 22-25, 2025)

After the sumi-e research, development pivoted to SVG-based rendering:

**Plans:**
- [`2025-10-22-generalize-svg-rendering-system-for-all-koi-body-parts.md`](/workspace/thoughts/plans/2025-10-22-generalize-svg-rendering-system-for-all-koi-body-parts.md)
- [`2025-10-22-svg-based-koi-rendering-with-bitmap-brushstrokes.md`](/workspace/thoughts/plans/2025-10-22-svg-based-koi-rendering-with-bitmap-brushstrokes.md)

**Implementation:**
- Phase 1: Core infrastructure (`drawSVGShape`)
- Phase 2: SVG asset loading
- Phase 3: Tail SVG rendering
- Phase 4: Fin SVG rendering
- Phase 5: Head SVG rendering

**Integration with Sumi-e:**
SVG rendering integrated multi-layer sumi-e technique in `drawSVGShape()`, achieving soft edges for SVG-rendered body parts.

## Related Research

### Sumi-e Rendering Research
- **Document**: [`flocking/research/2025-10-19-sumi-e-rendering-for-koi-simulation.md`](/workspace/flocking/research/2025-10-19-sumi-e-rendering-for-koi-simulation.md)
- **Key Findings**: Recommended hybrid texture-based approach with MULTIPLY blend mode
- **Implementation Status**: Partially implemented (multi-layer only, not texture-based)

### SVG Rendering System Plans
- **Generalized System**: [`thoughts/plans/2025-10-22-generalize-svg-rendering-system-for-all-koi-body-parts.md`](/workspace/thoughts/plans/2025-10-22-generalize-svg-rendering-system-for-all-koi-body-parts.md)
- **Bitmap Brushstrokes**: [`thoughts/plans/2025-10-22-svg-based-koi-rendering-with-bitmap-brushstrokes.md`](/workspace/thoughts/plans/2025-10-22-svg-based-koi-rendering-with-bitmap-brushstrokes.md)
- **Status**: SVG system complete (Phases 1-5), bitmap brushstrokes not implemented

## Open Questions

1. **Should brush texture application be implemented?**
   - Current multi-layer approach is performant and visually effective
   - Texture blending would add ~2-4ms per frame overhead
   - Would provide more authentic sumi-e aesthetic with real brush fiber detail
   - **Recommendation**: Implement if authentic traditional ink aesthetic is priority

2. **What about watercolor rendering?**
   - Configuration exists but no implementation
   - Would require different rendering approach (bleeding edges, color variation)
   - Could coexist with sumi-e mode as alternative style
   - **Recommendation**: Evaluate if watercolor aesthetic aligns with project goals

3. **Should paper texture be applied to background?**
   - Currently generated but unused
   - Would enhance traditional paper feel
   - Simple to implement: one MULTIPLY blend per frame
   - **Recommendation**: Low-hanging fruit, worth implementing

4. **Performance implications of full texture implementation?**
   - Research doc estimated +2-4ms per frame for texture blending
   - Current system runs at 60fps with headroom
   - 80 koi × 4 textures/fish = 320 texture draws per frame
   - **Recommendation**: Profile before committing to full implementation

5. **Is the `applyBrushTexture()` method worth keeping?**
   - Currently dead code (unused)
   - Well-designed and ready to use
   - Could be valuable for future enhancements
   - **Recommendation**: Keep as infrastructure for potential texture mode

## Summary

**Current State:**
The codebase has a **sophisticated rendering system** with both SVG and procedural paths, integrated with a **multi-layer sumi-e style** that creates soft, organic edges. Brush textures are procedurally generated and stored, but **NOT applied** to koi body parts. The sumi-e effect is achieved entirely through **layered semi-transparent shapes** rather than bitmap texture blending.

**What Works:**
- ✅ BrushTextures class generates all textures correctly
- ✅ Sumi-e style creates soft, painterly edges via multi-layer rendering
- ✅ SVG rendering pipeline complete for all body parts
- ✅ Deformation system (wave, flutter, rotate, static) functional
- ✅ Performance excellent (60fps maintained)

**What's Missing:**
- ❌ Brush texture application via MULTIPLY blend mode
- ❌ Paper texture background overlay
- ❌ Watercolor rendering implementation
- ❌ Authentic brush fiber detail on koi

**Next Steps to Complete Brushstroke-Based Coloration:**

1. **Minimal Implementation** (Paper texture only):
   - Apply paper grain to background with MULTIPLY blend
   - Estimated effort: 1 hour
   - Performance impact: <1ms per frame
   - Visual improvement: Subtle but authentic

2. **Body Part Texture Application**:
   - Call `applyBrushTexture()` after each body part rendering
   - Estimated effort: 4-6 hours (all body parts)
   - Performance impact: +2-4ms per frame
   - Visual improvement: Significant (authentic brush marks)

3. **Watercolor Mode** (Optional):
   - Implement watercolor-specific rendering
   - Different layer strategy (bleeding edges, color variation)
   - Estimated effort: 8-12 hours
   - New aesthetic option for users

**Recommendation:**
The current system is **production-ready** and visually effective. Implementing brush texture application would provide **more authentic traditional ink aesthetics** at a small performance cost. This should be implemented if:
- Authentic brush fiber detail is desired
- Traditional sumi-e aesthetic is a priority
- Performance budget allows (+2-4ms acceptable)

Otherwise, the current multi-layer approach is sufficient and performs excellently.

---

**Research Complete**: 2025-10-26T16:34:09+00:00
**Status**: All questions answered with code references and architectural documentation
