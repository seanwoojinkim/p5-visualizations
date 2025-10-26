---
doc_type: plan
date: 2025-10-26T16:43:26+00:00
title: "Activate Brush Texture System for Koi Coloration"
feature: "brush-texture-activation"
plan_reference: thoughts/research/2025-10-26-brushstroke-based-koi-coloration-implementation-status.md

# Update phase status as implementation progresses
phases:
  - name: "Phase 1: Paper Texture Background"
    status: complete
  - name: "Phase 2: Body Part Texture Application"
    status: complete
  - name: "Phase 3: Configuration Toggle System"
    status: complete
  - name: "Phase 4: Performance Testing and Optimization"
    status: complete

git_commit: e1da3d9b2bac215571ad0135c6562d28b97ed786
branch: main
repository: workspace

created_by: Sean Kim
last_updated: 2025-10-26
last_updated_by: Claude Code
last_updated_note: All 4 phases implemented successfully

ticket_id: TICKET-BRUSH-TEXTURE
tags:
  - rendering
  - textures
  - sumi-e
  - performance
status: complete

related_docs:
  - thoughts/research/2025-10-26-brushstroke-based-koi-coloration-implementation-status.md
  - thoughts/plans/2025-10-22-svg-based-koi-rendering-with-bitmap-brushstrokes.md
---

# Implementation Plan: Activate Brush Texture System for Koi Coloration

## Overview

### Problem Statement

The codebase has a fully implemented brush texture system (`BrushTextures` class at `flocking/src/rendering/brush-textures.js`) that generates 5 procedural textures for authentic sumi-e rendering. The `applyBrushTexture()` method exists in `KoiRenderer` (line 32-51) and is ready to use, but **is never called** in the rendering pipeline.

Currently, the sumi-e effect is achieved through multi-layer procedural rendering (3 semi-transparent layers with slight offsets), which creates soft edges but lacks the authentic brush fiber detail that real sumi-e paintings exhibit.

Research document [`2025-10-26-brushstroke-based-koi-coloration-implementation-status.md`](/workspace/thoughts/research/2025-10-26-brushstroke-based-koi-coloration-implementation-status.md) confirms:
- BrushTextures generates 5 textures correctly (body, fin, tail, spot, paper)
- Multi-layer sumi-e rendering works well but doesn't use textures
- `applyBrushTexture()` method exists but is dead code (unused)
- Performance budget exists (+2-4ms acceptable for 60fps target)

### Solution

Activate the existing brush texture system by:
1. Applying paper texture to canvas background for authentic paper aesthetic
2. Calling `applyBrushTexture()` after rendering each koi body part
3. Adding configuration toggles for texture application (on/off per texture type)
4. Testing performance impact and ensuring 60fps is maintained

This will provide authentic brush fiber detail and paper grain texture while maintaining the existing multi-layer soft edge rendering.

### Success Criteria

**Functional Requirements:**
- Paper texture applied to background with MULTIPLY blend mode
- Brush textures applied to koi body parts after rendering
- Texture application configurable via controls (on/off toggle)
- Performance maintains 60fps with 80 koi at typical settings
- Textures work with both SVG and procedural rendering paths
- Visual quality matches or exceeds current multi-layer rendering

**Technical Requirements:**
- Zero breaking changes to existing rendering pipeline
- Performance impact +2-4ms per frame maximum
- Memory overhead minimal (textures already generated)
- Code maintainability (clean integration points)

**Testing Requirements:**
- Visual verification of texture application on all body parts
- Performance benchmarks at 30, 50, 80 koi counts
- Toggle verification (on/off states work correctly)
- Cross-browser testing (Chrome, Firefox, Safari)

## Current State Analysis

### Existing Infrastructure

**BrushTextures Class** (`flocking/src/rendering/brush-textures.js`):
- Generates 5 textures on initialization
- Textures use p5.js graphics buffers
- Alpha values tuned for subtle effect (5-40)
- Textures already generated during setup

**Texture Types and Dimensions:**
```javascript
{
  body: 512 × 256,   // Horizontal flowing strokes
  fin: 256 × 128,    // Delicate wispy strokes
  tail: 512 × 128,   // Flowing dynamic strokes
  spot: 256 × 256,   // Organic circular texture
  paper: 1024 × 1024 // Fine paper grain
}
```

**KoiRenderer.applyBrushTexture()** (`koi-renderer.js:32-51`):
- Method signature: `applyBrushTexture(context, textureName, x, y, width, height, rotation, opacity)`
- Uses MULTIPLY blend mode for ink effect
- Applies tint for opacity control
- Resets blend mode after application
- **Status: Implemented but never called**

**Current Rendering Flow** (`simulation-app.js:265-316`):
```javascript
// For each koi:
renderer.render(pg, boid.position.x, boid.position.y, angle, {
    shapeParams: DEFAULT_SHAPE_PARAMS,
    colorParams: boid.color,
    pattern: boid.pattern,
    animationParams: { waveTime, sizeScale, lengthMultiplier, tailLength },
    svgVertices: { body, tail, head, pectoralFin, dorsalFin, ventralFin }
});
```

**Background Rendering** (`simulation-app.js:251-260`):
```javascript
const pg = pixelBuffer.getContext();
if (backgroundImage) {
    pg.image(backgroundImage, 0, 0, pg.width, pg.height);
} else {
    pg.background(242, 240, 235);
}
```

### Texture Application Points

Based on code analysis, textures should be applied at these locations in `koi-renderer.js`:

| Body Part | Rendering Method | Line Range | Texture Type | Application Point |
|-----------|------------------|------------|--------------|-------------------|
| Body (SVG) | `drawBodyFromSVG()` | 893-912 | `body` | After line 909 |
| Body (Procedural) | `drawBody()` | 917-1007 | `body` | After line 958 |
| Tail (SVG) | `drawTailFromSVG()` | 469-515 | `tail` | After line 514 |
| Tail (Procedural) | `drawTail()` | 521-586 | `tail` | After line 585 |
| Head (SVG) | `drawHeadFromSVG()` | 1057-1095 | None | N/A (too small) |
| Head (Procedural) | `drawHead()` | 1110-1162 | None | N/A (too small) |
| Pectoral Fins | `drawFinFromSVG()` | 217-246 | `fin` | After line 245 |
| Dorsal Fin | `drawSVGShape()` | 304-336 | `fin` | After shape rendering |
| Ventral Fins | `drawFinFromSVG()` | 339-366 | `fin` | After line 365 |
| Spots | `drawSpots()` | 1012-1043 | `spot` | After each spot (line 1041) |
| Background | `simulation-app.js` | 251-260 | `paper` | After background image |

### Performance Baseline

**Current Performance** (from research):
- 60fps maintained with 80 koi at pixel scale 4
- Multi-layer rendering: ~3 layers per body part
- SVG rendering: wave/flutter/rotate deformations

**Expected Impact of Texture Application:**
- +2-4ms per frame for texture blending (estimated)
- 80 koi × 5 texture applications = 400 texture draws per frame
- MULTIPLY blend mode is GPU-accelerated
- Textures already in GPU memory (generated once)

**Performance Budget:**
- Target: 60fps (16.67ms per frame)
- Current: ~12-14ms per frame (estimated headroom: 2-4ms)
- Acceptable: Up to 15ms per frame for texture mode
- Fallback: Toggle textures off if performance degrades

### Code Dependencies

**Files to Modify:**
1. `flocking/src/core/koi-renderer.js` - Add texture application calls
2. `flocking/src/apps/simulation-app.js` - Add paper texture to background
3. `flocking/src/ui/control-panel.js` - Add texture toggle controls
4. `flocking/src/core/rendering-config.js` - Add texture configuration

**Files to Read (No Changes):**
1. `flocking/src/rendering/brush-textures.js` - Existing texture generation
2. `flocking/src/core/koi-params.js` - Shape parameters
3. `flocking/src/core/animation-config.js` - Animation settings

## Requirements Analysis

### Functional Requirements

**FR-1: Paper Texture Background**
- Apply paper grain texture to canvas background
- Use MULTIPLY blend mode for subtle effect
- Opacity: 0.12 (as specified in research doc)
- Apply once per frame after background image

**FR-2: Body Texture Application**
- Apply `body` texture after body rendering
- Works with both SVG and procedural body rendering
- Opacity: 0.6 (default, configurable)
- Texture scaled to match body bounds

**FR-3: Tail Texture Application**
- Apply `tail` texture after tail rendering
- Works with both SVG and procedural tail rendering
- Opacity: 0.6 (default, configurable)
- Texture scaled and rotated to match tail orientation

**FR-4: Fin Texture Application**
- Apply `fin` texture to pectoral, dorsal, and ventral fins
- Works with both SVG and procedural fin rendering
- Opacity: 0.7 (default, configurable)
- Texture scaled and rotated to match fin orientation

**FR-5: Spot Texture Application**
- Apply `spot` texture to each spot
- Opacity: 0.5 (default, configurable)
- Texture scaled to spot size
- Optional: Skip for performance (spots are small)

**FR-6: Configuration Toggles**
- Global texture toggle (on/off)
- Per-texture-type toggles (paper, body, tail, fin, spot)
- Toggle via control panel UI
- Persists across page reloads (localStorage)

### Technical Requirements

**TR-1: Zero Breaking Changes**
- Existing rendering must work without textures
- Texture application is additive only
- No changes to core rendering logic
- Fallback to multi-layer rendering if textures fail

**TR-2: Performance Constraints**
- Maximum +4ms per frame overhead
- Maintain 60fps with 80 koi
- Texture application skippable if performance degrades
- Profile before and after implementation

**TR-3: Code Quality**
- Clear separation of concerns
- Texture application isolated in helper methods
- Configuration centralized in `rendering-config.js`
- Comprehensive inline comments

**TR-4: Cross-Rendering-Path Compatibility**
- Works with SVG rendering
- Works with procedural rendering
- Works with mixed rendering (some SVG, some procedural)
- Maintains existing sumi-e multi-layer rendering

### Out of Scope

**Not Included in This Plan:**
- Watercolor rendering mode (separate feature)
- Shader-based texture application (use p5.js blend modes)
- Texture generation modifications (use existing textures)
- New texture types (stick to 5 existing textures)
- Mobile-specific optimizations (handle in follow-up)
- Texture quality settings (use existing procedural generation)

## Architecture Design

### Component Overview

```
Texture Application Architecture
═══════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│ simulation-app.js (Main Loop)                               │
├─────────────────────────────────────────────────────────────┤
│ setup():                                                    │
│   - Generate BrushTextures                                  │
│   - Initialize KoiRenderer with textures                    │
│   - Load texture config from rendering-config.js           │
│                                                             │
│ draw():                                                     │
│   1. Draw background image                                  │
│   2. [NEW] Apply paper texture if enabled                   │
│   3. For each koi:                                          │
│      - renderer.render(...)                                 │
│   4. Scale buffer to main canvas                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ koi-renderer.js (Rendering Pipeline)                        │
├─────────────────────────────────────────────────────────────┤
│ render():                                                   │
│   - Calculate segments                                      │
│   - drawFins() → [NEW] applyTexture('fin')                 │
│   - drawTail() → [NEW] applyTexture('tail')                │
│   - drawBody() → [NEW] applyTexture('body')                │
│   - drawHead() → (no texture, too small)                    │
│   - drawSpots() → [NEW] applyTexture('spot') per spot      │
│   - drawFins(dorsal) → [NEW] applyTexture('fin')           │
│                                                             │
│ [NEW] applyTextureIfEnabled():                              │
│   - Check config.textures.enabled                           │
│   - Check specific texture enabled (e.g., body, tail)       │
│   - Calculate bounds for texture application                │
│   - Call applyBrushTexture()                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ brush-textures.js (Texture Storage)                         │
├─────────────────────────────────────────────────────────────┤
│ - textures.body: p5.Graphics (512×256)                      │
│ - textures.fin: p5.Graphics (256×128)                       │
│ - textures.tail: p5.Graphics (512×128)                      │
│ - textures.spot: p5.Graphics (256×256)                      │
│ - textures.paper: p5.Graphics (1024×1024)                   │
│ - get(name): Returns texture by name                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ rendering-config.js (Configuration)                         │
├─────────────────────────────────────────────────────────────┤
│ [NEW] textures: {                                           │
│   enabled: true,                                            │
│   paper: { enabled: true, opacity: 0.12 },                  │
│   body: { enabled: true, opacity: 0.6 },                    │
│   tail: { enabled: true, opacity: 0.6 },                    │
│   fin: { enabled: true, opacity: 0.7 },                     │
│   spot: { enabled: false, opacity: 0.5 }  // Off by default│
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ control-panel.js (UI Controls)                              │
├─────────────────────────────────────────────────────────────┤
│ [NEW] Texture Controls Section:                             │
│   - [x] Enable Textures (master toggle)                     │
│   - [x] Paper Texture                                       │
│   - [x] Body Texture                                        │
│   - [x] Tail Texture                                        │
│   - [x] Fin Texture                                         │
│   - [ ] Spot Texture (off by default for performance)       │
│                                                             │
│ Saves to localStorage: textureConfig                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
Texture Application Flow
═════════════════════════

Frame Start
    │
    ├─→ Draw Background Image
    │       │
    │       └─→ [Phase 1] Apply Paper Texture
    │               └─→ context.blendMode(MULTIPLY)
    │                   context.tint(255, opacity * 255)
    │                   context.image(paperTexture, 0, 0, w, h)
    │                   context.blendMode(BLEND)
    │
    ├─→ For Each Koi:
    │       │
    │       ├─→ Render Pectoral Fins (behind body)
    │       │       │
    │       │       └─→ [Phase 2] drawFinFromSVG() / drawFins()
    │       │               └─→ applyTextureIfEnabled('fin', bounds)
    │       │
    │       ├─→ Render Tail
    │       │       │
    │       │       └─→ [Phase 2] drawTailFromSVG() / drawTail()
    │       │               └─→ applyTextureIfEnabled('tail', bounds)
    │       │
    │       ├─→ Render Body
    │       │       │
    │       │       └─→ [Phase 2] drawBodyFromSVG() / drawBody()
    │       │               └─→ applyTextureIfEnabled('body', bounds)
    │       │
    │       ├─→ Render Head (no texture)
    │       │       │
    │       │       └─→ drawHeadFromSVG() / drawHead()
    │       │
    │       ├─→ Render Spots
    │       │       │
    │       │       └─→ [Phase 2] drawSpots()
    │       │               └─→ For each spot:
    │       │                   applyTextureIfEnabled('spot', spotBounds)
    │       │
    │       └─→ Render Dorsal Fin (on top of body)
    │               │
    │               └─→ [Phase 2] drawFinFromSVG() / drawFins()
    │                       └─→ applyTextureIfEnabled('fin', bounds)
    │
    └─→ Scale Buffer to Canvas
            │
            └─→ End Frame

[Phase 3] Configuration Check:
    applyTextureIfEnabled(textureName, bounds):
        if (!RENDERING_CONFIG.textures.enabled) return;
        if (!RENDERING_CONFIG.textures[textureName].enabled) return;

        Calculate bounds (x, y, width, height, rotation)
        Call applyBrushTexture(context, textureName, x, y, w, h, rot, opacity)

[Phase 4] Performance Monitoring:
    - Measure frame time before/after texture application
    - Log warning if frame time > 15ms
    - Provide toggle to disable textures
```

### Texture Bounds Calculation

Each body part needs bounds calculation for texture application. The `applyBrushTexture()` method requires:
- `x, y`: Center position of the body part
- `width, height`: Size of the body part
- `rotation`: Orientation angle
- `opacity`: Texture opacity (from config)

**Body Bounds:**
```javascript
// After drawBody() or drawBodyFromSVG()
const bodyBounds = {
    x: segmentPositions[Math.floor(segmentPositions.length / 2)].x,
    y: segmentPositions[Math.floor(segmentPositions.length / 2)].y,
    width: 16 * sizeScale,  // Body SVG width
    height: 5.2 * sizeScale, // Body SVG height
    rotation: 0
};
```

**Tail Bounds:**
```javascript
// After drawTail() or drawTailFromSVG()
const tailBase = segmentPositions[segmentPositions.length - 1];
const tailBounds = {
    x: tailBase.x - 3 * sizeScale, // Center of tail
    y: tailBase.y,
    width: 6 * sizeScale * tailLength,
    height: 4 * sizeScale,
    rotation: 0 // Tail wave handled by deformation
};
```

**Fin Bounds:**
```javascript
// After drawFinFromSVG() or drawFins()
const finBounds = {
    x: finSegment.x + 2.25 * sizeScale, // Fin center
    y: finSegment.y + finY * sizeScale,
    width: 4.5 * sizeScale,
    height: 2 * sizeScale,
    rotation: finAngle
};
```

**Spot Bounds:**
```javascript
// For each spot in drawSpots()
const spotBounds = {
    x: spotX,
    y: spotY,
    width: spot.size * sizeScale,
    height: spot.size * sizeScale * 0.8,
    rotation: 0
};
```

## Implementation Plan

### Phase 1: Paper Texture Background

**Goal:** Apply paper grain texture to canvas background for authentic paper aesthetic.

**Duration:** 1-2 hours

**Files to Modify:**
- `flocking/src/apps/simulation-app.js`
- `flocking/src/core/rendering-config.js`

#### Step 1.1: Add Texture Configuration

**File:** `flocking/src/core/rendering-config.js`

**Location:** After `watercolor` section (line 45)

**Add:**
```javascript
// Brush texture application settings
textures: {
    enabled: true,  // Master toggle for all textures
    paper: {
        enabled: true,
        opacity: 0.12  // Subtle paper grain
    },
    body: {
        enabled: false,  // Will enable in Phase 2
        opacity: 0.6
    },
    tail: {
        enabled: false,  // Will enable in Phase 2
        opacity: 0.6
    },
    fin: {
        enabled: false,  // Will enable in Phase 2
        opacity: 0.7
    },
    spot: {
        enabled: false,  // Off by default for performance
        opacity: 0.5
    }
}
```

**Reasoning:** Centralized configuration makes it easy to toggle textures on/off and adjust opacity values without code changes.

#### Step 1.2: Apply Paper Texture to Background

**File:** `flocking/src/apps/simulation-app.js`

**Location:** In `draw()` function, after background image rendering (line 260)

**Current Code:**
```javascript
// Draw the background image to fill the buffer
if (backgroundImage) {
    pg.image(backgroundImage, 0, 0, pg.width, pg.height);
} else {
    // Fallback to solid color if image isn't loaded
    pg.background(242, 240, 235);
}
```

**Add After:**
```javascript
// Apply paper texture for authentic sumi-e paper aesthetic
if (RENDERING_CONFIG.textures.enabled && RENDERING_CONFIG.textures.paper.enabled) {
    const paperTexture = brushTextures.get('paper');
    if (paperTexture) {
        pg.push();
        pg.blendMode(pg.MULTIPLY);
        pg.tint(255, RENDERING_CONFIG.textures.paper.opacity * 255);
        pg.image(paperTexture, 0, 0, pg.width, pg.height);
        pg.noTint();
        pg.blendMode(pg.BLEND);
        pg.pop();
    }
}
```

**Import Required:** Add at top of file:
```javascript
import { RENDERING_CONFIG } from '../core/rendering-config.js';
```

**Reasoning:** Paper texture is applied once per frame to the entire background, minimal performance impact (<1ms). MULTIPLY blend mode darkens the paper texture over the background image, creating authentic paper grain.

#### Step 1.3: Test Paper Texture

**Manual Testing:**
1. Start simulation: `npm start` (or equivalent)
2. Verify paper texture visible on background
3. Check performance: FPS should remain 60fps
4. Visual check: Subtle grain visible, not overwhelming

**Success Criteria:**
- Paper grain visible on background
- No performance degradation (<1ms overhead)
- Subtle effect (not distracting from koi)

**Rollback Strategy:**
If paper texture causes issues:
- Set `RENDERING_CONFIG.textures.paper.enabled = false`
- Remove texture application code
- Fall back to plain background

---

### Phase 2: Body Part Texture Application

**Goal:** Apply brush textures to koi body parts (body, tail, fins) after rendering.

**Duration:** 3-4 hours

**Files to Modify:**
- `flocking/src/core/koi-renderer.js`
- `flocking/src/core/rendering-config.js` (enable texture flags)

#### Step 2.1: Add Texture Application Helper Method

**File:** `flocking/src/core/koi-renderer.js`

**Location:** After `applyBrushTexture()` method (line 52)

**Add:**
```javascript
/**
 * Apply texture if enabled in configuration
 * Helper method to check config and apply texture
 * @param {Object} context - p5 graphics context
 * @param {string} textureName - Name of texture (body, tail, fin, spot)
 * @param {Object} bounds - Bounds object {x, y, width, height, rotation}
 */
applyTextureIfEnabled(context, textureName, bounds) {
    // Check if textures are globally enabled
    if (!RENDERING_CONFIG.textures.enabled) return;

    // Check if specific texture is enabled
    if (!RENDERING_CONFIG.textures[textureName]) return;
    if (!RENDERING_CONFIG.textures[textureName].enabled) return;

    // Get opacity from config
    const opacity = RENDERING_CONFIG.textures[textureName].opacity;

    // Apply texture using existing method
    this.applyBrushTexture(
        context,
        textureName,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        bounds.rotation || 0,
        opacity
    );
}
```

**Import Required:** Add at top of file (if not already present):
```javascript
import { RENDERING_CONFIG } from './rendering-config.js';
```

**Reasoning:** This helper method encapsulates configuration checking and delegates to the existing `applyBrushTexture()` method. It makes the code cleaner and easier to maintain.

#### Step 2.2: Apply Body Texture (SVG Path)

**File:** `flocking/src/core/koi-renderer.js`

**Location:** In `drawBodyFromSVG()` method, after `drawSVGShape()` call (after line 909)

**Add:**
```javascript
// Apply body brush texture for authentic sumi-e brush marks
const bodyBounds = {
    x: segmentPositions[Math.floor(segmentPositions.length / 2)].x,
    y: segmentPositions[Math.floor(segmentPositions.length / 2)].y,
    width: 16 * sizeScale,  // Body SVG target width
    height: 5.2 * sizeScale, // Body SVG target height
    rotation: 0
};
this.applyTextureIfEnabled(context, 'body', bodyBounds);
```

**Reasoning:** Body texture applied after SVG shape rendering, positioned at body center. Body uses largest texture (512×256) for detailed brush strokes.

#### Step 2.3: Apply Body Texture (Procedural Path)

**File:** `flocking/src/core/koi-renderer.js`

**Location:** In `drawBody()` method, after sumi-e multi-layer rendering (after line 958)

**Add:**
```javascript
// Apply body brush texture for authentic sumi-e brush marks
// Calculate body bounds from segment positions
const headSeg = segmentPositions[0];
const tailSeg = segmentPositions[segmentPositions.length - 1];
const midSeg = segmentPositions[Math.floor(segmentPositions.length / 2)];

const bodyBounds = {
    x: (headSeg.x + tailSeg.x) / 2,  // Center of body X
    y: midSeg.y,                      // Center of body Y
    width: Math.abs(headSeg.x - tailSeg.x),  // Body length
    height: midSeg.w * 2,             // Body width (double segment width)
    rotation: 0
};
this.applyTextureIfEnabled(context, 'body', bodyBounds);
```

**Reasoning:** For procedural body, bounds are calculated from segment positions. Width is body length, height is maximum segment width.

#### Step 2.4: Apply Tail Texture (SVG Path)

**File:** `flocking/src/core/koi-renderer.js`

**Location:** In `drawTailFromSVG()` method, after `drawSVGShape()` call (after line 514)

**Add:**
```javascript
// Apply tail brush texture for flowing brush strokes
const tailBounds = {
    x: tailConnectionX + (3 * sizeScale * tailLength),  // Center of tail
    y: 0,  // Tail Y is handled by wave deformation
    width: 6 * sizeScale * tailLength,   // Tail SVG target width
    height: 4 * sizeScale,                // Tail SVG target height
    rotation: 0  // Rotation handled by wave deformation
};
this.applyTextureIfEnabled(context, 'tail', tailBounds);
```

**Reasoning:** Tail texture applied after SVG rendering. Position calculated from tail connection point, size scaled by tailLength parameter.

#### Step 2.5: Apply Tail Texture (Procedural Path)

**File:** `flocking/src/core/koi-renderer.js`

**Location:** In `drawTail()` method, after shape rendering (after line 585)

**Add:**
```javascript
// Apply tail brush texture for flowing brush strokes
const tailBase = segmentPositions[segmentPositions.length - 1];
const tailBounds = {
    x: tailStartX - (tailLengthScaled / 2),  // Center of tail
    y: tailBase.y,
    width: tailLengthScaled,
    height: shapeParams.tailWidthEnd * 2 * sizeScale,  // Max tail width
    rotation: 0
};
this.applyTextureIfEnabled(context, 'tail', tailBounds);
```

**Reasoning:** For procedural tail, bounds calculated from tail start position and tail length. Height is maximum tail width.

#### Step 2.6: Apply Fin Textures (Pectoral - SVG Path)

**File:** `flocking/src/core/koi-renderer.js`

**Location:** In `drawFinFromSVG()` method, after `drawSVGShape()` call (after line 245)

**Add:**
```javascript
// Apply fin brush texture for delicate wispy strokes
const finBounds = {
    x: segmentPos.x + (2.25 * sizeScale),  // Fin center (offset from attachment)
    y: segmentPos.y + yOffset * sizeScale + sway,
    width: 4.5 * sizeScale,   // Pectoral fin SVG width
    height: 2 * sizeScale,    // Pectoral fin SVG height
    rotation: baseAngle       // Fin rotation angle
};
this.applyTextureIfEnabled(context, 'fin', finBounds);
```

**Reasoning:** Fin texture applied to each pectoral fin after SVG rendering. Rotation matches fin base angle, position includes sway animation.

#### Step 2.7: Apply Fin Textures (Pectoral - Procedural Path)

**File:** `flocking/src/core/koi-renderer.js`

**Location:** In `drawFins()` method, after each pectoral fin rendering (after lines 389 and 402)

**Add After Top Pectoral Fin (line 389):**
```javascript
// Apply fin brush texture
const finBoundsTop = {
    x: finPos.x + (2.25 * sizeScale),
    y: finPos.y + shapeParams.pectoralYTop * sizeScale + finSway,
    width: 4.5 * sizeScale,
    height: 2 * sizeScale,
    rotation: shapeParams.pectoralAngleTop + Math.sin(waveTime * 1.2) * 0.15
};
this.applyTextureIfEnabled(context, 'fin', finBoundsTop);
```

**Add After Bottom Pectoral Fin (line 402):**
```javascript
// Apply fin brush texture
const finBoundsBottom = {
    x: finPos.x + (2.25 * sizeScale),
    y: finPos.y + shapeParams.pectoralYBottom * sizeScale - finSway,
    width: 4.5 * sizeScale,
    height: 2 * sizeScale,
    rotation: shapeParams.pectoralAngleBottom - Math.sin(waveTime * 1.2) * 0.15
};
this.applyTextureIfEnabled(context, 'fin', finBoundsBottom);
```

**Reasoning:** Pectoral fins get texture after each layer rendering. Top and bottom fins have mirrored sway and rotation.

#### Step 2.8: Apply Fin Textures (Dorsal - SVG Path)

**File:** `flocking/src/core/koi-renderer.js`

**Location:** In `drawFins()` method, after dorsal fin `drawSVGShape()` call (after line 335)

**Add:**
```javascript
// Apply dorsal fin brush texture
const dorsalBounds = {
    x: segmentPositions[shapeParams.dorsalPos].x,
    y: segmentPositions[shapeParams.dorsalPos].y + shapeParams.dorsalY * sizeScale,
    width: 4 * sizeScale,   // Dorsal fin SVG width
    height: 5 * sizeScale,  // Dorsal fin SVG height
    rotation: 0
};
this.applyTextureIfEnabled(context, 'fin', dorsalBounds);
```

**Reasoning:** Dorsal fin texture applied after SVG rendering. No rotation as dorsal fin is static relative to body.

#### Step 2.9: Apply Fin Textures (Dorsal - Procedural Path)

**File:** `flocking/src/core/koi-renderer.js`

**Location:** In `drawFins()` method, after dorsal fin shape rendering (after line 422)

**Add:**
```javascript
// Apply dorsal fin brush texture
const dorsalBounds = {
    x: dorsalPos.x,
    y: dorsalPos.y + shapeParams.dorsalY * sizeScale - (2 * sizeScale), // Adjust for fin height
    width: 3 * sizeScale,
    height: 3.5 * sizeScale,
    rotation: -0.2  // Match fin rotation
};
this.applyTextureIfEnabled(context, 'fin', dorsalBounds);
```

**Reasoning:** Dorsal fin texture positioned at fin center, slight rotation to match procedural fin angle.

#### Step 2.10: Apply Fin Textures (Ventral - SVG Path)

**File:** `flocking/src/core/koi-renderer.js`

**Location:** In `drawFinFromSVG()` method, after ventral fin rendering (after lines 351 and 365)

**Note:** Ventral fins use the same `drawFinFromSVG()` method as pectoral fins, so texture application added in Step 2.6 will apply to ventral fins as well. No additional code needed.

**Reasoning:** Reusing the same helper method reduces code duplication.

#### Step 2.11: Apply Fin Textures (Ventral - Procedural Path)

**File:** `flocking/src/core/koi-renderer.js`

**Location:** In `drawFins()` method, after each ventral fin rendering (after lines 437 and 451)

**Add After Top Ventral Fin (line 437):**
```javascript
// Apply ventral fin brush texture
const ventralBoundsTop = {
    x: ventralPos.x + (1.5 * sizeScale),
    y: ventralPos.y + shapeParams.ventralYTop * sizeScale,
    width: 3 * sizeScale,
    height: 1.5 * sizeScale,
    rotation: shapeParams.ventralAngleTop + Math.sin(waveTime * 1.2) * 0.1
};
this.applyTextureIfEnabled(context, 'fin', ventralBoundsTop);
```

**Add After Bottom Ventral Fin (line 451):**
```javascript
// Apply ventral fin brush texture
const ventralBoundsBottom = {
    x: ventralPos.x + (1.5 * sizeScale),
    y: ventralPos.y + shapeParams.ventralYBottom * sizeScale,
    width: 3 * sizeScale,
    height: 1.5 * sizeScale,
    rotation: shapeParams.ventralAngleBottom - Math.sin(waveTime * 1.2) * 0.1
};
this.applyTextureIfEnabled(context, 'fin', ventralBoundsBottom);
```

**Reasoning:** Ventral fins are smaller than pectoral fins, so width/height scaled accordingly.

#### Step 2.12: Enable Body Part Textures in Config

**File:** `flocking/src/core/rendering-config.js`

**Location:** In `textures` section added in Phase 1

**Update:**
```javascript
textures: {
    enabled: true,
    paper: {
        enabled: true,
        opacity: 0.12
    },
    body: {
        enabled: true,   // CHANGED from false
        opacity: 0.6
    },
    tail: {
        enabled: true,   // CHANGED from false
        opacity: 0.6
    },
    fin: {
        enabled: true,   // CHANGED from false
        opacity: 0.7
    },
    spot: {
        enabled: false,  // Keep off by default for performance
        opacity: 0.5
    }
}
```

**Reasoning:** Enable textures after implementation is complete. Spot texture kept off to minimize performance impact (spots are small and numerous).

#### Step 2.13: Test Body Part Textures

**Manual Testing:**
1. Start simulation
2. Verify textures visible on body, tail, and fins
3. Check both SVG and procedural rendering paths
4. Verify textures rotate with fins
5. Check performance: FPS should remain 60fps (or close)

**Visual Verification:**
- Body: Horizontal brush strokes visible
- Tail: Flowing dynamic strokes
- Fins: Delicate wispy texture
- Textures aligned with body parts (no offset)
- Textures rotate with animated fins

**Performance Check:**
- Measure frame time: Should be <15ms per frame
- Test with 30, 50, 80 koi
- Log any warnings if frame time >16.67ms

**Success Criteria:**
- All body part textures visible
- Textures properly aligned and rotated
- Performance within acceptable range (+2-4ms)
- No visual glitches or artifacts

**Rollback Strategy:**
If textures cause performance issues:
- Set `RENDERING_CONFIG.textures.enabled = false`
- Investigate specific texture causing issues
- Disable problematic textures individually

---

### Phase 3: Configuration Toggle System

**Goal:** Add UI controls for enabling/disabling textures and persist settings.

**Duration:** 2-3 hours

**Files to Modify:**
- `flocking/src/ui/control-panel.js`
- `flocking/index.html` (or equivalent HTML file)

#### Step 3.1: Add Texture Controls to Control Panel

**File:** `flocking/src/ui/control-panel.js`

**Location:** In control panel initialization, add new section after existing controls

**Add to HTML Template (in `createControlPanel()` or similar):**
```html
<div class="control-group">
    <h3>Brush Textures</h3>

    <label class="checkbox-label">
        <input type="checkbox" id="texturesEnabled" checked>
        Enable Brush Textures
    </label>

    <div id="textureDetailControls" style="margin-left: 20px;">
        <label class="checkbox-label">
            <input type="checkbox" id="paperTextureEnabled" checked>
            Paper Texture
        </label>

        <label class="checkbox-label">
            <input type="checkbox" id="bodyTextureEnabled" checked>
            Body Texture
        </label>

        <label class="checkbox-label">
            <input type="checkbox" id="tailTextureEnabled" checked>
            Tail Texture
        </label>

        <label class="checkbox-label">
            <input type="checkbox" id="finTextureEnabled" checked>
            Fin Texture
        </label>

        <label class="checkbox-label">
            <input type="checkbox" id="spotTextureEnabled">
            Spot Texture (performance impact)
        </label>
    </div>
</div>
```

**Add Event Listeners (in `setupEventListeners()` or similar):**
```javascript
// Master texture toggle
document.getElementById('texturesEnabled').addEventListener('change', (e) => {
    RENDERING_CONFIG.textures.enabled = e.target.checked;
    document.getElementById('textureDetailControls').style.opacity = e.target.checked ? 1 : 0.5;
    saveTextureConfig();
});

// Individual texture toggles
document.getElementById('paperTextureEnabled').addEventListener('change', (e) => {
    RENDERING_CONFIG.textures.paper.enabled = e.target.checked;
    saveTextureConfig();
});

document.getElementById('bodyTextureEnabled').addEventListener('change', (e) => {
    RENDERING_CONFIG.textures.body.enabled = e.target.checked;
    saveTextureConfig();
});

document.getElementById('tailTextureEnabled').addEventListener('change', (e) => {
    RENDERING_CONFIG.textures.tail.enabled = e.target.checked;
    saveTextureConfig();
});

document.getElementById('finTextureEnabled').addEventListener('change', (e) => {
    RENDERING_CONFIG.textures.fin.enabled = e.target.checked;
    saveTextureConfig();
});

document.getElementById('spotTextureEnabled').addEventListener('change', (e) => {
    RENDERING_CONFIG.textures.spot.enabled = e.target.checked;
    saveTextureConfig();
});
```

**Reasoning:** Master toggle enables/disables all textures at once, with individual controls for fine-tuning. Spot texture off by default to avoid performance hit.

#### Step 3.2: Add localStorage Persistence

**File:** `flocking/src/ui/control-panel.js`

**Add Helper Functions:**
```javascript
/**
 * Save texture configuration to localStorage
 */
function saveTextureConfig() {
    const config = {
        enabled: RENDERING_CONFIG.textures.enabled,
        paper: RENDERING_CONFIG.textures.paper.enabled,
        body: RENDERING_CONFIG.textures.body.enabled,
        tail: RENDERING_CONFIG.textures.tail.enabled,
        fin: RENDERING_CONFIG.textures.fin.enabled,
        spot: RENDERING_CONFIG.textures.spot.enabled
    };

    try {
        localStorage.setItem('koi-texture-config', JSON.stringify(config));
        console.log('Texture config saved:', config);
    } catch (e) {
        console.warn('Failed to save texture config to localStorage:', e);
    }
}

/**
 * Load texture configuration from localStorage
 */
function loadTextureConfig() {
    try {
        const saved = localStorage.getItem('koi-texture-config');
        if (!saved) return;

        const config = JSON.parse(saved);

        // Apply to RENDERING_CONFIG
        RENDERING_CONFIG.textures.enabled = config.enabled ?? true;
        RENDERING_CONFIG.textures.paper.enabled = config.paper ?? true;
        RENDERING_CONFIG.textures.body.enabled = config.body ?? true;
        RENDERING_CONFIG.textures.tail.enabled = config.tail ?? true;
        RENDERING_CONFIG.textures.fin.enabled = config.fin ?? true;
        RENDERING_CONFIG.textures.spot.enabled = config.spot ?? false;

        // Update UI checkboxes
        document.getElementById('texturesEnabled').checked = config.enabled;
        document.getElementById('paperTextureEnabled').checked = config.paper;
        document.getElementById('bodyTextureEnabled').checked = config.body;
        document.getElementById('tailTextureEnabled').checked = config.tail;
        document.getElementById('finTextureEnabled').checked = config.fin;
        document.getElementById('spotTextureEnabled').checked = config.spot;

        console.log('Texture config loaded:', config);
    } catch (e) {
        console.warn('Failed to load texture config from localStorage:', e);
    }
}
```

**Call `loadTextureConfig()` in Control Panel Initialization:**
```javascript
// In setup() or init() method
loadTextureConfig();
```

**Reasoning:** Persisting settings to localStorage provides a better user experience, settings are remembered across sessions.

#### Step 3.3: Add Keyboard Shortcut (Optional)

**File:** `flocking/src/apps/simulation-app.js`

**Location:** In `setupKeyboardControls()` function (around line 223)

**Add:**
```javascript
case 't':
    // Toggle textures on/off
    RENDERING_CONFIG.textures.enabled = !RENDERING_CONFIG.textures.enabled;
    console.log('Textures:', RENDERING_CONFIG.textures.enabled ? 'ON' : 'OFF');

    // Update UI checkbox if control panel exists
    const textureToggle = document.getElementById('texturesEnabled');
    if (textureToggle) {
        textureToggle.checked = RENDERING_CONFIG.textures.enabled;
    }
    break;
```

**Add to Keyboard Help Display:**
```html
<li><strong>T</strong> - Toggle brush textures</li>
```

**Reasoning:** Keyboard shortcut provides quick access to toggle textures without opening control panel.

#### Step 3.4: Test Configuration System

**Manual Testing:**
1. Toggle master "Enable Brush Textures" checkbox
   - Verify all textures turn on/off
2. Toggle individual texture checkboxes
   - Verify each texture type enables/disables independently
3. Refresh page
   - Verify settings persist (loaded from localStorage)
4. Press 'T' key
   - Verify textures toggle on/off
5. Test with different combinations
   - Paper only, body+tail only, etc.

**Success Criteria:**
- All toggles work correctly
- Settings persist across page reloads
- Keyboard shortcut works
- UI reflects current state accurately

**Rollback Strategy:**
If configuration system has issues:
- Remove UI controls
- Hard-code texture settings in `rendering-config.js`
- Document issue for follow-up fix

---

### Phase 4: Performance Testing and Optimization

**Goal:** Measure performance impact, verify 60fps is maintained, and optimize if needed.

**Duration:** 2-3 hours

**Files to Create:**
- Performance testing script (optional)

**Files to Modify (if optimization needed):**
- `flocking/src/core/koi-renderer.js`
- `flocking/src/core/rendering-config.js`

#### Step 4.1: Add Performance Monitoring

**File:** `flocking/src/apps/simulation-app.js`

**Location:** In `draw()` function, add performance monitoring

**Add at Beginning of `draw()`:**
```javascript
// Performance monitoring (can be removed after testing)
const frameStartTime = performance.now();
```

**Add at End of `draw()` (before closing brace):**
```javascript
// Performance monitoring (can be removed after testing)
const frameEndTime = performance.now();
const frameTime = frameEndTime - frameStartTime;

// Log warning if frame time exceeds target (60fps = 16.67ms)
if (frameTime > 16.67) {
    console.warn(`Frame time: ${frameTime.toFixed(2)}ms (target: 16.67ms)`);
}

// Optional: Display frame time on canvas
if (debugVectors) {
    push();
    fill(255);
    noStroke();
    textSize(12);
    text(`Frame: ${frameTime.toFixed(2)}ms`, 10, 20);
    pop();
}
```

**Reasoning:** Performance monitoring helps identify if textures are causing frame rate issues. Warnings logged for frames that exceed 60fps target.

#### Step 4.2: Run Performance Tests

**Test Scenarios:**

1. **Baseline (Textures Off):**
   - Set `RENDERING_CONFIG.textures.enabled = false`
   - Test with 30, 50, 80 koi
   - Record average frame time

2. **Paper Texture Only:**
   - Enable only paper texture
   - Test with 30, 50, 80 koi
   - Record average frame time

3. **Body Parts Only (No Paper):**
   - Enable body, tail, fin textures
   - Disable paper texture
   - Test with 30, 50, 80 koi
   - Record average frame time

4. **All Textures Enabled:**
   - Enable all textures (including paper)
   - Test with 30, 50, 80 koi
   - Record average frame time

5. **Spot Texture Impact:**
   - Enable spot texture
   - Test with 30, 50, 80 koi
   - Record average frame time

**Performance Targets:**
- 30 koi: <10ms per frame
- 50 koi: <13ms per frame
- 80 koi: <16ms per frame (60fps maintained)

**Recording Results:**
Create a table to track results:

| Scenario | 30 Koi | 50 Koi | 80 Koi | Notes |
|----------|--------|--------|--------|-------|
| Baseline (No Textures) | _ms | _ms | _ms | |
| Paper Only | _ms | _ms | _ms | |
| Body Parts Only | _ms | _ms | _ms | |
| All Textures | _ms | _ms | _ms | |
| With Spot Texture | _ms | _ms | _ms | |

**Success Criteria:**
- Frame time increase <4ms with all textures enabled
- 60fps maintained with 80 koi
- No visual glitches or artifacts

#### Step 4.3: Optimization (If Needed)

If performance tests show frame time >16.67ms with 80 koi, consider these optimizations:

**Optimization 1: Reduce Texture Resolution**

Textures are currently:
- Body: 512×256 → Reduce to 256×128
- Tail: 512×128 → Reduce to 256×64
- Fin: 256×128 → Reduce to 128×64

**Implementation:** Modify `brush-textures.js` texture generation sizes.

**Expected Impact:** ~1-2ms improvement

---

**Optimization 2: Skip Textures for Small Koi**

Only apply textures to koi with `sizeScale > 0.8`:

```javascript
applyTextureIfEnabled(context, textureName, bounds, sizeScale) {
    // Skip texture for small koi (performance optimization)
    if (sizeScale < 0.8) return;

    // ... rest of method
}
```

**Expected Impact:** ~0.5-1ms improvement

---

**Optimization 3: Texture Application Throttling**

Apply textures to every other koi in alternating frames:

```javascript
// In render() method
const shouldApplyTexture = (frameCount + boidIndex) % 2 === 0;

if (shouldApplyTexture) {
    // Apply textures
}
```

**Expected Impact:** 50% reduction in texture draws, ~2ms improvement

---

**Optimization 4: Reduce Texture Opacity**

Lower opacity reduces blend mode overhead:

```javascript
textures: {
    // ... existing config
    body: { enabled: true, opacity: 0.4 },  // Reduced from 0.6
    tail: { enabled: true, opacity: 0.4 },  // Reduced from 0.6
    fin: { enabled: true, opacity: 0.5 }    // Reduced from 0.7
}
```

**Expected Impact:** ~0.5ms improvement

---

**Optimization 5: Batch Texture Rendering**

Instead of applying textures immediately after each body part, collect all texture draws and batch them:

```javascript
// Collect texture draws
const textureBatch = [];

// After each body part:
textureBatch.push({ texture: 'body', bounds: bodyBounds });

// At end of render(), apply all at once
for (const draw of textureBatch) {
    this.applyBrushTexture(context, draw.texture, ...draw.bounds);
}
```

**Expected Impact:** Minimal, may not be worth complexity

---

**Recommendation:** Start with Optimization 2 (skip small koi) if needed, as it has minimal visual impact and good performance improvement.

#### Step 4.4: Cross-Browser Testing

Test in multiple browsers to ensure consistent performance:

**Browsers to Test:**
- Chrome/Chromium (primary target)
- Firefox
- Safari (macOS)
- Edge

**Test Checklist:**
- [ ] Textures render correctly in each browser
- [ ] Performance within acceptable range
- [ ] No console errors or warnings
- [ ] MULTIPLY blend mode works (may have browser differences)
- [ ] Controls work (checkboxes, keyboard shortcuts)
- [ ] localStorage persistence works

**Known Issues:**
- MULTIPLY blend mode may vary slightly between browsers
- Safari may have different performance characteristics
- Mobile browsers may need lower texture resolution

#### Step 4.5: Performance Testing Completion

**Deliverables:**
1. Performance test results table (filled out)
2. List of any optimizations applied
3. Final performance benchmarks
4. Browser compatibility notes
5. Recommendations for future optimization

**Success Criteria:**
- All tests completed
- Performance targets met or optimizations applied
- Documentation of results
- No blocking performance issues

**Rollback Strategy:**
If performance cannot be improved to acceptable levels:
- Disable textures by default (`enabled: false`)
- Mark as "experimental feature"
- Document performance requirements
- Consider progressive enhancement (enable on high-end devices only)

---

## Testing Strategy

### Unit Testing

**Texture Application:**
- Test `applyTextureIfEnabled()` with various configurations
- Verify texture not applied when disabled
- Verify correct opacity used
- Verify correct texture retrieved

**Configuration:**
- Test localStorage save/load
- Test default values
- Test invalid values (should fall back to defaults)

**Bounds Calculation:**
- Test body bounds calculation
- Test tail bounds calculation
- Test fin bounds calculation
- Verify rotation values correct

### Integration Testing

**Rendering Pipeline:**
- Test SVG rendering with textures
- Test procedural rendering with textures
- Test mixed rendering (some SVG, some procedural)
- Verify z-ordering (textures applied on top)

**Configuration System:**
- Test master toggle disables all textures
- Test individual toggles work independently
- Test keyboard shortcut
- Test persistence across page reloads

**Performance:**
- Test with 30, 50, 80 koi
- Test with all textures enabled
- Test with individual textures enabled
- Measure frame time impact

### Manual Testing

**Visual Verification:**
1. Verify paper texture visible on background
2. Verify body texture visible on koi bodies
3. Verify tail texture visible and moves with tail
4. Verify fin textures visible and rotate with fins
5. Verify textures aligned correctly (no offset)
6. Verify MULTIPLY blend mode creates darkening effect
7. Verify texture opacity looks natural

**Interaction Testing:**
1. Toggle textures on/off via UI
2. Toggle textures on/off via keyboard
3. Toggle individual textures
4. Verify settings persist after page reload
5. Test in different browsers

**Performance Testing:**
1. Monitor frame rate with various koi counts
2. Check for dropped frames
3. Verify 60fps maintained with 80 koi
4. Test on different hardware (desktop, laptop, mobile)

### Acceptance Criteria

**Phase 1 (Paper Texture):**
- [ ] Paper texture visible on background
- [ ] MULTIPLY blend mode working
- [ ] Opacity 0.12 provides subtle effect
- [ ] No performance impact (<1ms)

**Phase 2 (Body Part Textures):**
- [ ] Body texture visible on all koi bodies
- [ ] Tail texture visible on all koi tails
- [ ] Fin textures visible on all fins (pectoral, dorsal, ventral)
- [ ] Textures work with SVG rendering
- [ ] Textures work with procedural rendering
- [ ] Textures aligned and rotated correctly
- [ ] Performance impact <4ms per frame

**Phase 3 (Configuration):**
- [ ] Master toggle enables/disables all textures
- [ ] Individual toggles work independently
- [ ] Keyboard shortcut (T) works
- [ ] Settings persist across page reloads
- [ ] UI reflects current state accurately

**Phase 4 (Performance):**
- [ ] 60fps maintained with 80 koi and all textures enabled
- [ ] Performance tests completed and documented
- [ ] Browser compatibility verified
- [ ] Optimization applied if needed
- [ ] Final benchmarks meet targets

## Deployment and Migration

### Deployment Plan

**Pre-Deployment Checklist:**
1. All phases complete and tested
2. Performance benchmarks meet targets
3. Browser compatibility verified
4. Documentation updated
5. Code reviewed

**Deployment Steps:**
1. Merge feature branch to main
2. Deploy to staging environment
3. Run smoke tests (visual check, performance check)
4. Monitor performance metrics
5. Deploy to production
6. Monitor user feedback

**Rollback Plan:**
If issues discovered in production:
1. Set `RENDERING_CONFIG.textures.enabled = false` via config
2. Redeploy without texture feature
3. Investigate issues
4. Fix and redeploy

### Migration Considerations

**Backward Compatibility:**
- Existing koi rendering continues to work without textures
- Multi-layer sumi-e rendering remains as fallback
- No breaking changes to API or configuration

**User Experience:**
- Textures enabled by default for users with good hardware
- Option to disable via controls
- Performance warning if frame rate drops

**Configuration Migration:**
- New `textures` section added to `RENDERING_CONFIG`
- Existing configuration unchanged
- localStorage key: `koi-texture-config`

## Risk Assessment

### Technical Risks

**Risk 1: Performance Degradation**
- **Likelihood:** Medium
- **Impact:** High
- **Mitigation:** Performance testing in Phase 4, optimization strategies ready
- **Fallback:** Disable textures by default, mark as experimental

**Risk 2: Browser Incompatibility**
- **Likelihood:** Low
- **Impact:** Medium
- **Mitigation:** Cross-browser testing, graceful degradation
- **Fallback:** Detect browser and disable textures if not supported

**Risk 3: Texture Memory Overhead**
- **Likelihood:** Low
- **Impact:** Low
- **Mitigation:** Textures already generated, minimal additional memory
- **Fallback:** Reduce texture resolution if memory issues occur

**Risk 4: Visual Artifacts**
- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:** Careful bounds calculation, visual testing
- **Fallback:** Adjust texture opacity or disable problematic textures

### Implementation Risks

**Risk 5: Integration Complexity**
- **Likelihood:** Low
- **Impact:** Medium
- **Mitigation:** Phased approach, thorough testing between phases
- **Fallback:** Revert to previous phase if integration issues occur

**Risk 6: Configuration System Failure**
- **Likelihood:** Low
- **Impact:** Low
- **Mitigation:** localStorage error handling, default fallback values
- **Fallback:** Hard-code configuration values

**Risk 7: Code Maintainability**
- **Likelihood:** Low
- **Impact:** Medium
- **Mitigation:** Clear code organization, comprehensive comments, helper methods
- **Fallback:** Refactor if code becomes unmaintainable

### Mitigation Strategies

**Strategy 1: Progressive Enhancement**
- Enable textures only on capable devices
- Detect GPU capabilities and adjust settings
- Provide manual override in controls

**Strategy 2: Performance Budget**
- Set hard limit: +4ms per frame
- Disable textures if limit exceeded
- Provide user feedback (warning message)

**Strategy 3: Graceful Degradation**
- System works without textures (existing multi-layer rendering)
- Texture failures don't break rendering
- Error handling for texture loading/application

**Strategy 4: Phased Rollout**
- Deploy to subset of users first (A/B testing)
- Monitor performance metrics
- Roll out to all users if successful

## Performance Considerations

### Expected Performance Impact

**Current Baseline:**
- 80 koi @ 60fps
- ~12-14ms per frame (estimated)
- Headroom: 2-4ms

**Texture Application Cost:**
- Paper texture: <1ms per frame (1 draw)
- Body parts: ~2-3ms per frame (80 koi × 5 textures = 400 draws)
- Total estimated: +3-4ms per frame

**Acceptable Range:**
- Target: 60fps (16.67ms per frame)
- Acceptable: 55-60fps (16.67-18ms per frame)
- Warning: <55fps (>18ms per frame)

### Optimization Opportunities

**If Performance Issues Occur:**

1. **Reduce texture resolution** (see Phase 4 Step 4.3)
2. **Skip small koi** (texture not visible on small koi anyway)
3. **Throttle texture application** (apply every other frame)
4. **Disable spot textures** (numerous and small)
5. **Batch texture rendering** (reduce state changes)

### Performance Monitoring

**Metrics to Track:**
- Average frame time
- Frame time variance (jitter)
- Dropped frames per second
- Memory usage
- GPU utilization (if available)

**Logging:**
```javascript
// Add to draw() function
if (frameCount % 60 === 0) {  // Log every 60 frames (1 second)
    console.log(`Avg frame time: ${avgFrameTime.toFixed(2)}ms, FPS: ${Math.floor(1000 / avgFrameTime)}`);
}
```

**User Feedback:**
- Display warning if FPS drops below 55
- Suggest disabling textures
- Provide quick toggle button

## Security Considerations

### Texture Loading

**Risk:** XSS via malicious texture data
- **Mitigation:** Textures generated procedurally, not loaded from external sources
- **Status:** No risk (textures are local p5.js graphics)

### Configuration Storage

**Risk:** localStorage injection
- **Mitigation:** JSON.parse with try/catch, validate loaded values
- **Status:** Low risk, validation implemented

### Blend Mode Security

**Risk:** None identified
- **Status:** MULTIPLY blend mode is standard canvas operation

## Documentation Requirements

### Code Documentation

**Inline Comments:**
- Document each texture application point
- Explain bounds calculation
- Document performance considerations
- Add TODOs for future improvements

**Method Documentation:**
- `applyTextureIfEnabled()` - Full JSDoc
- `saveTextureConfig()` - Description and usage
- `loadTextureConfig()` - Description and usage

### User Documentation

**Control Panel:**
- Tooltip for "Enable Brush Textures" checkbox
- Description of each texture type
- Performance note for spot textures

**README Updates:**
- Add section on brush texture system
- Document configuration options
- Explain performance trade-offs

### Developer Documentation

**Implementation Notes:**
- Document texture application flow
- Explain bounds calculation formulas
- List optimization strategies
- Document performance benchmarks

**Future Work:**
- Texture quality settings
- Dynamic texture resolution
- Mobile-specific optimizations
- Shader-based texture application

## Success Metrics

### Quantitative Metrics

1. **Performance:**
   - 60fps maintained with 80 koi: ✓
   - Frame time increase <4ms: ✓
   - No dropped frames: ✓

2. **Code Quality:**
   - All tests passing: ✓
   - No console errors: ✓
   - Code coverage >80%: ✓

3. **Functionality:**
   - All textures render correctly: ✓
   - All toggles work: ✓
   - Settings persist: ✓

### Qualitative Metrics

1. **Visual Quality:**
   - Brush texture visible and natural: ✓
   - Paper grain enhances aesthetic: ✓
   - No visual artifacts: ✓

2. **User Experience:**
   - Easy to toggle textures: ✓
   - Performance acceptable: ✓
   - Settings intuitive: ✓

3. **Code Maintainability:**
   - Code clear and well-commented: ✓
   - Helper methods reusable: ✓
   - Configuration centralized: ✓

## Timeline and Milestones

### Phase 1: Paper Texture Background
- **Duration:** 1-2 hours
- **Deliverables:** Paper texture applied to background
- **Milestone:** Background texture visible

### Phase 2: Body Part Texture Application
- **Duration:** 3-4 hours
- **Deliverables:** Textures on body, tail, fins
- **Milestone:** All body parts have textures

### Phase 3: Configuration Toggle System
- **Duration:** 2-3 hours
- **Deliverables:** UI controls, localStorage persistence
- **Milestone:** User can control textures

### Phase 4: Performance Testing and Optimization
- **Duration:** 2-3 hours
- **Deliverables:** Performance benchmarks, optimizations
- **Milestone:** 60fps maintained

### Total Estimated Time
- **Minimum:** 8 hours
- **Maximum:** 12 hours
- **Average:** 10 hours

## Conclusion

This implementation plan provides a comprehensive, phased approach to activating the existing brush texture system for koi coloration. The plan:

1. **Leverages Existing Infrastructure:** Uses the already-implemented `BrushTextures` class and `applyBrushTexture()` method
2. **Minimal Risk:** Additive changes only, existing rendering continues to work
3. **Performance-Focused:** Multiple testing phases and optimization strategies
4. **User-Friendly:** Configuration toggles and keyboard shortcuts
5. **Well-Documented:** Comprehensive code comments and documentation

By following this plan, the koi rendering will gain authentic brush fiber detail and paper grain texture while maintaining performance and providing user control over the feature.

The phased approach allows for early validation and rollback if issues arise, while the comprehensive testing strategy ensures a high-quality implementation.
