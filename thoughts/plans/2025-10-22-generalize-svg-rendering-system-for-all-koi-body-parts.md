---
doc_type: plan
date: 2025-10-22T21:35:32+00:00
title: "Generalize SVG rendering system for all koi body parts"
feature: "SVG body parts"

# Update phase status as implementation progresses
phases:
  - name: "Phase 1: Core infrastructure - Generalized SVG renderer"
    status: completed
  - name: "Phase 2: SVG asset loading and validation"
    status: completed
  - name: "Phase 3: Tail SVG rendering with flutter animation"
    status: completed
  - name: "Phase 4: Fin SVG rendering (pectoral, dorsal, ventral)"
    status: pending
  - name: "Phase 5: Head SVG rendering (optional)"
    status: pending
  - name: "Phase 6: Testing, optimization, and documentation"
    status: pending

git_commit: 24939bb0e8b3ffc10ff51453cd7ec97a0f34e8b6
branch: main
repository: visualizations

created_by: Sean Kim
last_updated: 2025-10-22
last_updated_by: Claude Code
last_updated_note: "Phase 3 (Tail SVG Rendering) completed - tail now renders from SVG with flutter animation matching procedural exactly"

tags:
  - rendering
  - svg
  - koi
  - animation
status: draft

related_docs: []
---

# Implementation Plan: Generalize SVG Rendering System for All Koi Body Parts

## Overview

### Problem Statement
Currently, the koi renderer uses a hybrid approach:
- **Body**: SVG vertices with wave deformation (implemented)
- **Tail, Head, Fins**: Procedural rendering with hardcoded geometry

This creates inconsistency and makes it difficult to customize koi appearance through SVG art files. The procedural code is tightly coupled to specific animation formulas, making it hard to maintain and extend.

### Solution
Create a generalized SVG rendering pipeline that:
1. Loads SVG files for all body parts
2. Provides flexible deformation types (wave, flutter, static)
3. Maintains current animation behavior exactly
4. Supports graceful fallback to procedural rendering
5. Enables artist-driven customization through SVG files

### Success Criteria
- [ ] All body parts can be rendered from SVG files
- [ ] Animation behavior matches current procedural rendering exactly
- [ ] Sumi-e 3-layer rendering works for all SVG parts
- [ ] Performance is acceptable (6 SVG files loaded, reused across all koi)
- [ ] Graceful fallback when SVG files are missing
- [ ] No regression in visual quality or animation smoothness
- [ ] Code is cleaner and more maintainable than current procedural approach

---

## Current State Analysis

### Existing Implementation

#### SVG Body Rendering (DONE)
**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js:364-420`

```javascript
drawBodyFromSVG(context, segmentPositions, svgVertices, shapeParams, sizeScale, hue, saturation, brightness) {
    // Maps each SVG vertex to a body segment
    // Applies wave deformation by adding segment.y offset to vertex Y
    // Supports 3-layer sumi-e rendering
}
```

**Key insights**:
- Uses `mapVertexToSegment()` to find which segment each vertex belongs to
- Applies wave deformation by adding `segment.y` offset
- Already supports sumi-e layering
- SVG vertices are normalized to koi coordinate space in preload

#### Procedural Tail Rendering
**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js:262-320`

**Animation formula** (line 275):
```javascript
const tailSway = Math.sin(waveTime - 2.5 - t * 2) * 3 * sizeScale * (0.5 + t * 0.5);
```

**Key insights**:
- 6 segments interpolated from base to tip
- Flutter effect: `waveTime - 2.5 - t * 2` (phase offset increases toward tip)
- Amplitude increases toward tip: `(0.5 + t * 0.5)`
- Width tapers from `tailWidthStart` to `tailWidthEnd`
- Positioned at `segmentPositions[segmentPositions.length - 1]` (tail segment)

#### Procedural Fin Rendering
**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js:175-257`

**Animation formula** (lines 191, 204, 240, 253):
- Pectoral fins: `Math.sin(waveTime * 1.2) * 0.15` (rotation angle)
- Ventral fins: `Math.sin(waveTime * 1.2) * 0.1` (rotation angle)
- Fin sway (Y offset): `Math.sin(waveTime - 0.5) * 0.8`

**Key insights**:
- Pectoral fins at `segmentPositions[shapeParams.pectoralPos]` (default: segment 2)
- Dorsal fin at `segmentPositions[shapeParams.dorsalPos]` (default: segment 4)
- Ventral fins at `segmentPositions[shapeParams.ventralPos]` (default: segment 7)
- Each fin has Y offset and rotation angle
- Left/right fins rendered separately (could be mirrored from single SVG)

#### Procedural Head Rendering
**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js:556-601`

**Key insights**:
- Simple ellipse at `segmentPositions[0]` (head segment)
- Eyes are always procedural (small, precise dots)
- 3-layer sumi-e rendering already implemented
- Head is mostly static (no animation)

#### SVG Parser
**File**: `/Users/seankim/dev/visualizations/flocking/src/core/svg-parser.js`

**Capabilities**:
- Parses `<polygon>` (body.svg uses this)
- Parses `<path>` elements (tail.svg, dorsal-fin.svg use this)
- Normalizes vertices to target dimensions
- Loads from URL asynchronously

**Current usage** (simulation-app.js:59-70):
```javascript
bodyVertices = await SVGParser.loadSVGFromURL(
    'assets/koi/body-parts/body.svg',
    20, // numPoints (not used for polygon)
    { width: 16, height: 5.2 } // Target dimensions
);
```

### Existing SVG Assets

**Created**:
- `/Users/seankim/dev/visualizations/flocking/assets/koi/body-parts/body.svg` - Polygon, working
- `/Users/seankim/dev/visualizations/flocking/assets/koi/body-parts/tail.svg` - Path element, 60x30 units
- `/Users/seankim/dev/visualizations/flocking/assets/koi/body-parts/dorsal-fin.svg` - Path element, 20x25 units

**Missing** (need to create):
- `pectoral-fin.svg` - Will be mirrored for left/right
- `ventral-fin.svg` - Will be mirrored for top/bottom
- `head.svg` - Optional, head is simple ellipse

### Coordinate System

**Koi space**:
- Positive X = forward (head direction)
- Positive Y = down (ventral/belly direction)
- Origin at center of mass
- Body spans approximately X: -8 to +8, Y: -2.6 to +2.6

**Segment positions**:
- Index 0 = head (front, positive X)
- Index 9 = tail base (back, negative X)
- Each segment has `{x, y, w}` where y is wave offset

---

## Requirements Analysis

### Functional Requirements

**FR1: Generalized SVG Rendering Method**
- Create `drawSVGShape()` that accepts SVG vertices, transform, deformation config
- Support deformation types: `wave`, `flutter`, `static`
- Apply position, rotation, scale, AND deformation
- Maintain sumi-e 3-layer rendering

**FR2: SVG Asset Loading**
- Load 5-6 SVG files in preload (body, tail, head, pectoral-fin, dorsal-fin, ventral-fin)
- Normalize each to appropriate coordinate space
- Store in global state for reuse across all koi
- Handle loading errors gracefully

**FR3: Conditional Rendering**
- Check if SVG vertices exist for each part
- Use SVG rendering if available, fallback to procedural if missing
- Allow per-part SVG enable/disable (for debugging/comparison)

**FR4: Animation Parity**
- Body wave: `segment.y` offset (DONE)
- Tail flutter: `Math.sin(waveTime - 2.5 - t * 2)` per vertex
- Fin rotation: `Math.sin(waveTime * 1.2)` applied to entire shape
- Maintain exact same formulas and coefficients

**FR5: Mirroring Support**
- Use single pectoral-fin.svg for both left/right
- Use single ventral-fin.svg for both top/bottom
- Apply horizontal or vertical flip during rendering

### Technical Requirements

**TR1: Performance**
- Load SVGs once in preload, not per-frame
- Reuse vertices across all koi instances
- No noticeable performance degradation vs procedural

**TR2: Maintainability**
- Decouple deformation logic from shape geometry
- Use descriptive deformation type names
- Document deformation parameters clearly

**TR3: Backward Compatibility**
- Procedural rendering must continue to work
- No breaking changes to KoiRenderer API
- Graceful degradation if SVG files missing

**TR4: Code Quality**
- Follow existing code style
- Add JSDoc comments for new methods
- Keep methods focused and testable

### Out of Scope

**Not included in this phase**:
- SVG-based spot patterns (spots remain procedural)
- SVG-based eyes (eyes remain procedural - too small/precise)
- Multiple SVG variants per part (e.g., different tail styles)
- Runtime SVG editing/morphing
- SVG animation tags (`<animate>`, etc.) - we handle animation in code
- Non-koi shapes (fish, birds, etc.)

---

## Architecture Design

### Design Option 1: Unified Deformation Engine (RECOMMENDED)

**Approach**: Create a single `drawSVGShape()` method with pluggable deformation strategies.

**Structure**:
```javascript
class KoiRenderer {
    drawSVGShape(context, svgVertices, config) {
        // config = {
        //   deformationType: 'wave' | 'flutter' | 'rotate' | 'static',
        //   deformationParams: { ... },
        //   position: {x, y},
        //   rotation: angle,
        //   scale: number,
        //   color: {h, s, b, opacity},
        //   mirror: 'none' | 'horizontal' | 'vertical'
        // }

        // 1. Apply deformation to vertices
        const deformedVertices = this.applyDeformation(svgVertices, config);

        // 2. Apply transform (position, rotation, scale)
        const transformedVertices = this.applyTransform(deformedVertices, config);

        // 3. Render with sumi-e layers
        this.renderShapeLayers(context, transformedVertices, config);
    }

    applyDeformation(vertices, config) {
        switch (config.deformationType) {
            case 'wave':
                return this.applyWaveDeformation(vertices, config.deformationParams);
            case 'flutter':
                return this.applyFlutterDeformation(vertices, config.deformationParams);
            case 'rotate':
                return this.applyRotationDeformation(vertices, config.deformationParams);
            case 'static':
                return vertices; // No deformation
        }
    }
}
```

**Pros**:
- Clean separation of concerns
- Easy to add new deformation types
- Deformation logic is reusable
- Clear, testable code structure

**Cons**:
- More abstraction overhead
- Slightly more complex initially

**Recommendation**: **Use this approach**. It provides the best long-term maintainability and extensibility.

---

### Design Option 2: Per-Part Methods

**Approach**: Create separate methods like `drawTailFromSVG()`, `drawFinFromSVG()`, etc.

**Pros**:
- Simpler to understand initially
- Each part's logic is self-contained

**Cons**:
- Code duplication (transform, rendering, layering logic repeated)
- Harder to maintain consistency
- Doesn't scale well if we add more parts

**Recommendation**: **Don't use**. This approach creates too much duplication.

---

## Deformation Types Specification

### Wave Deformation (for Body)
**Use case**: Body wave animation

**Parameters**:
```javascript
{
    deformationType: 'wave',
    deformationParams: {
        segmentPositions: [...], // Body segments with wave offsets
        numSegments: 10,
        axis: 'y' // Apply wave offset to Y coordinate
    }
}
```

**Algorithm**:
```javascript
applyWaveDeformation(vertices, params) {
    return vertices.map(v => {
        const segIdx = this.mapVertexToSegment(v.x, vertices, params.numSegments);
        const segment = params.segmentPositions[segIdx];
        return {
            x: v.x,
            y: v.y + segment.y // Add wave offset
        };
    });
}
```

**Status**: Already implemented in `drawBodyFromSVG()` (lines 364-420)

---

### Flutter Deformation (for Tail)
**Use case**: Tail flutter animation

**Parameters**:
```javascript
{
    deformationType: 'flutter',
    deformationParams: {
        waveTime: frameCount * 0.1,
        sizeScale: 1.0,
        phaseOffset: -2.5, // Matches procedural: waveTime - 2.5
        phaseGradient: -2, // Matches procedural: -t * 2
        amplitudeStart: 0.5, // Matches procedural: (0.5 + t * 0.5)
        amplitudeEnd: 1.0,
        amplitudeScale: 3, // Matches procedural: * 3 * sizeScale
        axis: 'y' // Apply flutter to Y coordinate
    }
}
```

**Algorithm**:
```javascript
applyFlutterDeformation(vertices, params) {
    // Find X bounds to compute t (0 to 1 from base to tip)
    const xs = vertices.map(v => v.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);

    return vertices.map(v => {
        const t = (v.x - minX) / (maxX - minX); // 0 at base, 1 at tip

        // Phase increases toward tip (creates traveling wave)
        const phase = params.waveTime + params.phaseOffset + (t * params.phaseGradient);

        // Amplitude increases toward tip
        const amplitude = params.amplitudeStart + (t * (params.amplitudeEnd - params.amplitudeStart));

        // Flutter offset
        const flutter = Math.sin(phase) * params.amplitudeScale * params.sizeScale * amplitude;

        return {
            x: v.x,
            y: v.y + flutter
        };
    });
}
```

**Matches procedural**: `Math.sin(waveTime - 2.5 - t * 2) * 3 * sizeScale * (0.5 + t * 0.5)`

---

### Rotate Deformation (for Fins)
**Use case**: Fin rotation/sway animation

**Parameters**:
```javascript
{
    deformationType: 'rotate',
    deformationParams: {
        waveTime: frameCount * 0.1,
        rotationAmplitude: 0.15, // radians (pectoral fins)
        rotationFrequency: 1.2, // Matches procedural: waveTime * 1.2
        pivot: {x: 0, y: 0}, // Rotation pivot point (base of fin)
        ySwayAmplitude: 0.8, // Optional Y offset (finSway)
        ySwayPhase: -0.5 // Optional Y sway phase offset
    }
}
```

**Algorithm**:
```javascript
applyRotationDeformation(vertices, params) {
    // Calculate rotation angle
    const rotationAngle = Math.sin(params.waveTime * params.rotationFrequency) * params.rotationAmplitude;

    // Optional Y sway (applied to all vertices uniformly)
    let ySway = 0;
    if (params.ySwayAmplitude) {
        ySway = Math.sin(params.waveTime + params.ySwayPhase) * params.ySwayAmplitude;
    }

    // Rotate vertices around pivot
    return vertices.map(v => {
        // Translate to pivot
        const dx = v.x - params.pivot.x;
        const dy = v.y - params.pivot.y;

        // Rotate
        const cos = Math.cos(rotationAngle);
        const sin = Math.sin(rotationAngle);
        const rotatedX = dx * cos - dy * sin;
        const rotatedY = dx * sin + dy * cos;

        // Translate back and add sway
        return {
            x: rotatedX + params.pivot.x,
            y: rotatedY + params.pivot.y + ySway
        };
    });
}
```

**Matches procedural**:
- Pectoral: `Math.sin(waveTime * 1.2) * 0.15` (rotation)
- Ventral: `Math.sin(waveTime * 1.2) * 0.1` (rotation)
- Fin sway: `Math.sin(waveTime - 0.5) * 0.8` (Y offset)

---

### Static Deformation (for Head)
**Use case**: Head (mostly static, just follows body segment)

**Parameters**:
```javascript
{
    deformationType: 'static',
    deformationParams: {} // No deformation
}
```

**Algorithm**:
```javascript
applyStaticDeformation(vertices, params) {
    return vertices; // Return unchanged
}
```

---

## SVG Coordinate Space Normalization

### Target Dimensions per Part

| Part | Width (koi units) | Height (koi units) | Notes |
|------|-------------------|-------------------|-------|
| Body | 16 | 5.2 | X: -8 to +8, Y: -2.6 to +2.6 (DONE) |
| Tail | 12 | 6 | Length ~12, width at tip ~6 |
| Head | 7.5 | 5.0 | Matches procedural ellipse |
| Pectoral fin | 4.5 | 2 | Matches procedural ellipse |
| Dorsal fin | 4 | 5 | Height ~2.5 above body |
| Ventral fin | 3 | 1.5 | Matches procedural ellipse |

### Normalization Strategy

All SVG files will be normalized in `preload()`:
```javascript
tailVertices = await SVGParser.loadSVGFromURL(
    'assets/koi/body-parts/tail.svg',
    20, // numPoints for paths
    { width: 12, height: 6 } // Target dimensions
);
```

This ensures SVG coordinates match koi coordinate space.

---

## Phase-by-Phase Implementation

### Phase 1: Core Infrastructure - Generalized SVG Renderer

**Goal**: Create the foundational `drawSVGShape()` method and deformation system.

**Prerequisites**: None (builds on existing SVG body rendering)

#### Tasks

**1.1: Create deformation helper methods**

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

Add methods:
```javascript
/**
 * Apply wave deformation to SVG vertices (body wave)
 * @param {Array<{x, y}>} vertices - Original SVG vertices
 * @param {Object} params - Deformation parameters
 * @param {Array<{x, y, w}>} params.segmentPositions - Body segments with wave offsets
 * @param {number} params.numSegments - Number of body segments
 * @returns {Array<{x, y}>} - Deformed vertices
 */
applyWaveDeformation(vertices, params) {
    const { segmentPositions, numSegments } = params;

    return vertices.map(v => {
        const segIdx = this.mapVertexToSegment(v.x, vertices, numSegments);
        const segment = segmentPositions[segIdx];
        return {
            x: v.x,
            y: v.y + segment.y
        };
    });
}

/**
 * Apply flutter deformation to SVG vertices (tail flutter)
 * @param {Array<{x, y}>} vertices - Original SVG vertices
 * @param {Object} params - Flutter parameters
 * @returns {Array<{x, y}>} - Deformed vertices
 */
applyFlutterDeformation(vertices, params) {
    const {
        waveTime,
        sizeScale,
        phaseOffset = -2.5,
        phaseGradient = -2,
        amplitudeStart = 0.5,
        amplitudeEnd = 1.0,
        amplitudeScale = 3
    } = params;

    // Find X bounds for normalization
    const xs = vertices.map(v => v.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const rangeX = maxX - minX;

    if (rangeX === 0) return vertices; // Prevent division by zero

    return vertices.map(v => {
        const t = (v.x - minX) / rangeX; // 0 at base, 1 at tip

        const phase = waveTime + phaseOffset + (t * phaseGradient);
        const amplitude = amplitudeStart + (t * (amplitudeEnd - amplitudeStart));
        const flutter = Math.sin(phase) * amplitudeScale * sizeScale * amplitude;

        return {
            x: v.x,
            y: v.y + flutter
        };
    });
}

/**
 * Apply rotation deformation to SVG vertices (fin rotation/sway)
 * @param {Array<{x, y}>} vertices - Original SVG vertices
 * @param {Object} params - Rotation parameters
 * @returns {Array<{x, y}>} - Deformed vertices
 */
applyRotationDeformation(vertices, params) {
    const {
        waveTime,
        rotationAmplitude = 0,
        rotationFrequency = 1.2,
        pivot = { x: 0, y: 0 },
        ySwayAmplitude = 0,
        ySwayPhase = -0.5
    } = params;

    const rotationAngle = Math.sin(waveTime * rotationFrequency) * rotationAmplitude;
    const ySway = ySwayAmplitude ? Math.sin(waveTime + ySwayPhase) * ySwayAmplitude : 0;

    const cos = Math.cos(rotationAngle);
    const sin = Math.sin(rotationAngle);

    return vertices.map(v => {
        const dx = v.x - pivot.x;
        const dy = v.y - pivot.y;

        const rotatedX = dx * cos - dy * sin;
        const rotatedY = dx * sin + dy * cos;

        return {
            x: rotatedX + pivot.x,
            y: rotatedY + pivot.y + ySway
        };
    });
}

/**
 * Apply general deformation to vertices based on type
 * @param {Array<{x, y}>} vertices - Original vertices
 * @param {string} type - Deformation type ('wave', 'flutter', 'rotate', 'static')
 * @param {Object} params - Type-specific parameters
 * @returns {Array<{x, y}>} - Deformed vertices
 */
applyDeformation(vertices, type, params) {
    switch (type) {
        case 'wave':
            return this.applyWaveDeformation(vertices, params);
        case 'flutter':
            return this.applyFlutterDeformation(vertices, params);
        case 'rotate':
            return this.applyRotationDeformation(vertices, params);
        case 'static':
            return vertices; // No deformation
        default:
            console.warn(`Unknown deformation type: ${type}`);
            return vertices;
    }
}
```

**Success criteria**:
- [ ] All four deformation methods added
- [ ] JSDoc comments complete and accurate
- [ ] Methods are pure functions (no side effects)

---

**1.2: Create mirror transformation helper**

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

Add method:
```javascript
/**
 * Apply mirror transformation to vertices
 * @param {Array<{x, y}>} vertices - Original vertices
 * @param {string} mirror - Mirror type ('none', 'horizontal', 'vertical')
 * @returns {Array<{x, y}>} - Mirrored vertices
 */
applyMirror(vertices, mirror) {
    if (mirror === 'none') return vertices;

    return vertices.map(v => ({
        x: mirror === 'horizontal' ? -v.x : v.x,
        y: mirror === 'vertical' ? -v.y : v.y
    }));
}
```

**Success criteria**:
- [ ] Mirror method works for horizontal and vertical flips
- [ ] 'none' returns unchanged vertices

---

**1.3: Create generalized SVG shape renderer**

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

Add method:
```javascript
/**
 * Draw SVG shape with deformation, transform, and sumi-e layering
 * @param {Object} context - p5 graphics context
 * @param {Array<{x, y}>} svgVertices - Original SVG vertices
 * @param {Object} config - Rendering configuration
 * @param {string} config.deformationType - Type of deformation ('wave', 'flutter', 'rotate', 'static')
 * @param {Object} config.deformationParams - Parameters for deformation
 * @param {number} config.positionX - X position in canvas space
 * @param {number} config.positionY - Y position in canvas space
 * @param {number} config.rotation - Rotation angle in radians
 * @param {number} config.scale - Scale multiplier
 * @param {number} config.hue - HSB hue
 * @param {number} config.saturation - HSB saturation
 * @param {number} config.brightness - HSB brightness
 * @param {number} config.opacity - Base opacity (0-1)
 * @param {string} config.mirror - Mirror type ('none', 'horizontal', 'vertical')
 */
drawSVGShape(context, svgVertices, config) {
    if (!svgVertices || svgVertices.length === 0) {
        console.warn('drawSVGShape: No vertices provided');
        return;
    }

    const {
        deformationType = 'static',
        deformationParams = {},
        positionX = 0,
        positionY = 0,
        rotation = 0,
        scale = 1,
        hue,
        saturation,
        brightness,
        opacity = 0.8,
        mirror = 'none'
    } = config;

    // 1. Apply deformation
    let vertices = this.applyDeformation(svgVertices, deformationType, deformationParams);

    // 2. Apply mirror
    vertices = this.applyMirror(vertices, mirror);

    // 3. Render with transform and sumi-e layers
    context.push();
    context.translate(positionX, positionY);
    context.rotate(rotation);

    if (this.useSumieStyle) {
        // 3-layer rendering for soft edges
        for (let layer = 0; layer < 3; layer++) {
            const offset = (layer - 1) * 0.3;
            const layerOpacity = layer === 1 ? opacity : opacity * 0.4;

            context.fill(hue, saturation, brightness, layerOpacity);
            context.beginShape();

            for (let v of vertices) {
                context.curveVertex(v.x * scale + offset, v.y * scale + offset);
            }

            context.endShape(context.CLOSE);
        }
    } else {
        // Normal rendering
        context.fill(hue, saturation, brightness, opacity);
        context.beginShape();

        for (let v of vertices) {
            context.curveVertex(v.x * scale, v.y * scale);
        }

        context.endShape(context.CLOSE);
    }

    context.pop();
}
```

**Success criteria**:
- [ ] Method renders SVG vertices with all transforms applied
- [ ] Sumi-e 3-layer rendering works
- [ ] Deformation is applied before rendering
- [ ] Mirror transformation works

---

**1.4: Refactor existing `drawBodyFromSVG()` to use new system**

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

Replace lines 364-420 with:
```javascript
/**
 * Draw body from SVG vertices with wave deformation
 * (Refactored to use generalized drawSVGShape method)
 */
drawBodyFromSVG(context, segmentPositions, svgVertices, shapeParams, sizeScale, hue, saturation, brightness) {
    this.drawSVGShape(context, svgVertices, {
        deformationType: 'wave',
        deformationParams: {
            segmentPositions,
            numSegments: segmentPositions.length
        },
        positionX: 0,
        positionY: 0,
        rotation: 0,
        scale: sizeScale,
        hue,
        saturation,
        brightness: brightness - 2,
        opacity: this.useSumieStyle ? 0.7 : 0.92,
        mirror: 'none'
    });

    context.noStroke(); // Match original behavior
}
```

**Success criteria**:
- [ ] Body rendering looks identical to before refactor
- [ ] Wave animation works exactly as before
- [ ] Sumi-e rendering matches original
- [ ] No performance regression

---

**1.5: Test core infrastructure**

Create test file:
**File**: `/Users/seankim/dev/visualizations/flocking/test-svg-deformations.html`

Test each deformation type:
- Static deformation (no change)
- Wave deformation (body wave)
- Flutter deformation (tail flutter)
- Rotate deformation (fin rotation)
- Mirror transformations

**Success criteria**:
- [ ] All deformation types work correctly
- [ ] Visual output matches expected behavior
- [ ] No console errors

---

**Time estimate**: 4-6 hours

**Risks**:
- Refactoring body rendering might introduce subtle bugs
- Deformation math might not match procedural exactly

**Mitigation**:
- Test body rendering extensively before and after refactor
- Use side-by-side comparison (SVG vs procedural)
- Unit test deformation math with known inputs/outputs

---

### Phase 2: SVG Asset Loading and Validation

**Goal**: Load all SVG files in preload and store for reuse.

**Prerequisites**: Phase 1 complete

#### Tasks

**2.1: Create missing SVG files**

Create SVG files with appropriate dimensions:

**File**: `/Users/seankim/dev/visualizations/flocking/assets/koi/body-parts/pectoral-fin.svg`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- Koi Pectoral Fin Template
     Dimensions: 4.5 × 2 units (length × width)
     Anchor: Base (left edge)
     Ellipse-like shape
-->
<svg width="4.5" height="2" viewBox="0 0 4.5 2" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="2.25" cy="1" rx="2.25" ry="1" fill="#ffffff" stroke="#000" stroke-width="0.1"/>
</svg>
```

**File**: `/Users/seankim/dev/visualizations/flocking/assets/koi/body-parts/ventral-fin.svg`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- Koi Ventral Fin Template
     Dimensions: 3 × 1.5 units (length × width)
     Anchor: Base (left edge)
     Ellipse-like shape
-->
<svg width="3" height="1.5" viewBox="0 0 3 1.5" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="1.5" cy="0.75" rx="1.5" ry="0.75" fill="#ffffff" stroke="#000" stroke-width="0.1"/>
</svg>
```

**File**: `/Users/seankim/dev/visualizations/flocking/assets/koi/body-parts/head.svg` (optional)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- Koi Head Template
     Dimensions: 7.5 × 5.0 units (width × height)
     Anchor: Center
     Ellipse shape
-->
<svg width="7.5" height="5.0" viewBox="0 0 7.5 5.0" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="3.75" cy="2.5" rx="3.75" ry="2.5" fill="#ffffff" stroke="#000" stroke-width="0.1"/>
</svg>
```

**Success criteria**:
- [ ] All 3 SVG files created
- [ ] Files have correct dimensions
- [ ] Files use simple shapes (match procedural for now)

---

**2.2: Update preload to load all SVG parts**

**File**: `/Users/seankim/dev/visualizations/flocking/src/apps/simulation-app.js`

Update global state (line 24):
```javascript
let bodyVertices = null;
let tailVertices = null;
let headVertices = null;
let pectoralFinVertices = null;
let dorsalFinVertices = null;
let ventralFinVertices = null;
```

Update `preload()` function (lines 54-71):
```javascript
window.preload = async function() {
    backgroundImage = loadImage('assets/water-background.png');

    // Load and parse all SVG body parts
    // Target dimensions match koi coordinate space

    bodyVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/body.svg',
        20,
        { width: 16, height: 5.2 }
    );

    tailVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/tail.svg',
        20,
        { width: 12, height: 6 }
    );

    headVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/head.svg',
        20,
        { width: 7.5, height: 5.0 }
    );

    pectoralFinVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/pectoral-fin.svg',
        20,
        { width: 4.5, height: 2 }
    );

    dorsalFinVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/dorsal-fin.svg',
        20,
        { width: 4, height: 5 }
    );

    ventralFinVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/ventral-fin.svg',
        20,
        { width: 3, height: 1.5 }
    );

    // Log loading results
    const parts = {
        body: bodyVertices,
        tail: tailVertices,
        head: headVertices,
        pectoralFin: pectoralFinVertices,
        dorsalFin: dorsalFinVertices,
        ventralFin: ventralFinVertices
    };

    console.log('SVG body parts loaded:');
    for (const [name, vertices] of Object.entries(parts)) {
        if (vertices) {
            const info = SVGParser.getDebugInfo(vertices);
            console.log(`  ${name}: ${info.vertexCount} vertices, bounds: ${JSON.stringify(info.bounds)}`);
        } else {
            console.warn(`  ${name}: FAILED to load (will use procedural fallback)`);
        }
    }
};
```

**Success criteria**:
- [ ] All 6 SVG files load successfully
- [ ] Console shows loading results for each part
- [ ] Failed loads are logged as warnings (not errors)

---

**2.3: Pass SVG vertices to renderer**

**File**: `/Users/seankim/dev/visualizations/flocking/src/apps/simulation-app.js`

Update `renderer.render()` call in `draw()` (lines 226-248):
```javascript
renderer.render(
    pg,
    boid.position.x,
    boid.position.y,
    boid.velocity.heading(),
    {
        shapeParams: DEFAULT_SHAPE_PARAMS,
        colorParams: debugColor,
        pattern: boid.pattern,
        animationParams: {
            waveTime,
            sizeScale: boid.sizeMultiplier,
            lengthMultiplier: boid.lengthMultiplier,
            tailLength: boid.tailLength
        },
        modifiers: {
            brightnessBoost: audioData.bass * 8 * params.audioReactivity,
            saturationBoost: audioData.treble * 10 * params.audioReactivity,
            sizeScale: 1 + audioData.amplitude * 0.3 * params.audioReactivity
        },
        svgVertices: {
            body: bodyVertices,
            tail: tailVertices,
            head: headVertices,
            pectoralFin: pectoralFinVertices,
            dorsalFin: dorsalFinVertices,
            ventralFin: ventralFinVertices
        }
    }
);
```

**Success criteria**:
- [ ] SVG vertices passed to renderer
- [ ] No breaking changes to existing rendering

---

**Time estimate**: 2-3 hours

**Risks**:
- SVG files might not load correctly
- Dimension normalization might be incorrect

**Mitigation**:
- Test each SVG file individually
- Use `test-svg-parser.html` to validate dimensions
- Add console logging for debugging

---

### Phase 3: Tail SVG Rendering with Flutter Animation

**Goal**: Replace procedural tail rendering with SVG-based rendering.

**Prerequisites**: Phases 1-2 complete

#### Tasks

**3.1: Update render() method to accept SVG parts**

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

Update JSDoc comment for `render()` (line 71):
```javascript
/**
 * @param {Object} params.svgVertices - Optional SVG vertices for body parts
 * @param {Array<{x,y}>} params.svgVertices.body - Body vertices
 * @param {Array<{x,y}>} params.svgVertices.tail - Tail vertices
 * @param {Array<{x,y}>} params.svgVertices.head - Head vertices
 * @param {Array<{x,y}>} params.svgVertices.pectoralFin - Pectoral fin vertices
 * @param {Array<{x,y}>} params.svgVertices.dorsalFin - Dorsal fin vertices
 * @param {Array<{x,y}>} params.svgVertices.ventralFin - Ventral fin vertices
 */
```

Update destructuring in `render()` (line 79):
```javascript
svgVertices = {
    body: null,
    tail: null,
    head: null,
    pectoralFin: null,
    dorsalFin: null,
    ventralFin: null
}
```

**Success criteria**:
- [ ] SVG vertices properly destructured
- [ ] Default values prevent errors if not provided

---

**3.2: Create drawTailFromSVG() method**

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

Add method (after `drawTail()` at line 320):
```javascript
/**
 * Draw tail from SVG vertices with flutter animation
 * @param {Object} context - p5 graphics context
 * @param {Array<{x, y, w}>} segmentPositions - Body segment positions
 * @param {Array<{x, y}>} svgVertices - Tail SVG vertices
 * @param {Object} shapeParams - Shape parameters
 * @param {number} waveTime - Animation time
 * @param {number} sizeScale - Size multiplier
 * @param {number} tailLength - Tail length multiplier
 * @param {number} hue - HSB hue
 * @param {number} saturation - HSB saturation
 * @param {number} brightness - HSB brightness
 */
drawTailFromSVG(context, segmentPositions, svgVertices, shapeParams, waveTime, sizeScale, tailLength, hue, saturation, brightness) {
    const tailBase = segmentPositions[segmentPositions.length - 1];
    const tailStartX = tailBase.x + shapeParams.tailStartX * sizeScale;

    this.drawSVGShape(context, svgVertices, {
        deformationType: 'flutter',
        deformationParams: {
            waveTime,
            sizeScale,
            phaseOffset: -2.5,    // Matches procedural: waveTime - 2.5
            phaseGradient: -2,    // Matches procedural: -t * 2
            amplitudeStart: 0.5,  // Matches procedural: (0.5 + t * 0.5)
            amplitudeEnd: 1.0,
            amplitudeScale: 3     // Matches procedural: * 3 * sizeScale
        },
        positionX: tailStartX,
        positionY: tailBase.y,
        rotation: 0,
        scale: sizeScale * tailLength, // Apply tail length multiplier to scale
        hue,
        saturation: saturation + 5,
        brightness: brightness - 12,
        opacity: this.useSumieStyle ? 0.7 : 0.8,
        mirror: 'none'
    });
}
```

**Success criteria**:
- [ ] Tail flutter animation matches procedural exactly
- [ ] Tail position matches procedural (at tail base segment)
- [ ] Sumi-e rendering works

---

**3.3: Update drawTail() to conditionally use SVG**

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

Update `drawTail()` method signature (line 262):
```javascript
drawTail(context, segmentPositions, shapeParams, waveTime, sizeScale, tailLength, hue, saturation, brightness, svgVertices = null) {
    // Use SVG if provided, otherwise procedural
    if (svgVertices && svgVertices.length > 0) {
        this.drawTailFromSVG(context, segmentPositions, svgVertices, shapeParams, waveTime, sizeScale, tailLength, hue, saturation, brightness);
        return;
    }

    // Original procedural tail rendering code
    const tailBase = segmentPositions[segmentPositions.length - 1];
    // ... (rest of existing code unchanged)
}
```

**Success criteria**:
- [ ] SVG tail rendering used when vertices provided
- [ ] Procedural fallback works when SVG missing
- [ ] No breaking changes to method signature

---

**3.4: Update render() to pass tail SVG vertices**

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

Update `drawTail()` call in `render()` (line 116):
```javascript
this.drawTail(
    context,
    segmentPositions,
    shapeParams,
    waveTime,
    finalSizeScale,
    tailLength,
    hue,
    saturation,
    brightness,
    svgVertices.tail // Pass tail SVG vertices
);
```

**Success criteria**:
- [ ] Tail SVG vertices passed to drawTail()
- [ ] Tail renders from SVG when available

---

**3.5: Test tail SVG rendering**

**Manual testing**:
1. Run simulation with tail.svg present
2. Verify tail flutter animation looks natural
3. Compare to procedural tail (temporarily disable SVG)
4. Check sumi-e rendering
5. Test performance (should be similar to procedural)

**Success criteria**:
- [ ] Tail flutter animation matches procedural behavior
- [ ] Visual quality is equal or better than procedural
- [ ] No performance regression
- [ ] Sumi-e layering works correctly

---

**Time estimate**: 3-4 hours

**Risks**:
- Flutter deformation math might not match procedural exactly
- Tail positioning might be off
- SVG tail shape might not look natural with flutter

**Mitigation**:
- Test flutter formula with simple vertices first
- Use side-by-side comparison with procedural
- Adjust flutter parameters if needed
- Test with different tail shapes (refine SVG if needed)

---

### Phase 4: Fin SVG Rendering (Pectoral, Dorsal, Ventral)

**Goal**: Replace procedural fin rendering with SVG-based rendering.

**Prerequisites**: Phases 1-3 complete

#### Tasks

**4.1: Create drawFinFromSVG() method**

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

Add method (after `drawFins()` at line 257):
```javascript
/**
 * Draw single fin from SVG vertices with rotation/sway animation
 * @param {Object} context - p5 graphics context
 * @param {Object} segmentPos - Segment position {x, y, w}
 * @param {Array<{x, y}>} svgVertices - Fin SVG vertices
 * @param {number} yOffset - Y offset from segment center
 * @param {number} baseAngle - Base rotation angle
 * @param {number} waveTime - Animation time
 * @param {number} rotationAmplitude - Rotation animation amplitude
 * @param {number} sway - Y sway offset
 * @param {number} sizeScale - Size multiplier
 * @param {number} hue - HSB hue
 * @param {number} saturation - HSB saturation
 * @param {number} brightness - HSB brightness
 * @param {string} mirror - Mirror type ('none', 'horizontal', 'vertical')
 */
drawFinFromSVG(context, segmentPos, svgVertices, yOffset, baseAngle, waveTime, rotationAmplitude, sway, sizeScale, hue, saturation, brightness, mirror = 'none') {
    this.drawSVGShape(context, svgVertices, {
        deformationType: 'rotate',
        deformationParams: {
            waveTime,
            rotationAmplitude,
            rotationFrequency: 1.2, // Matches procedural: waveTime * 1.2
            pivot: { x: 0, y: 0 }, // Rotate around base
            ySwayAmplitude: 0,
            ySwayPhase: 0
        },
        positionX: segmentPos.x,
        positionY: segmentPos.y + yOffset * sizeScale + sway,
        rotation: baseAngle, // Base angle applied to entire shape
        scale: sizeScale,
        hue,
        saturation: saturation + 8,
        brightness: brightness - 15,
        opacity: this.useSumieStyle ? 0.6 : 0.7,
        mirror
    });
}
```

**Success criteria**:
- [ ] Single fin renders with rotation animation
- [ ] Mirror parameter works for flipping fins
- [ ] Sway offset applied correctly

---

**4.2: Create drawFinsFromSVG() method**

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

Add method:
```javascript
/**
 * Draw all fins from SVG vertices
 * @param {Object} context - p5 graphics context
 * @param {Array<{x, y, w}>} segmentPositions - Body segment positions
 * @param {Object} shapeParams - Shape parameters
 * @param {number} waveTime - Animation time
 * @param {number} sizeScale - Size multiplier
 * @param {number} hue - HSB hue
 * @param {number} saturation - HSB saturation
 * @param {number} brightness - HSB brightness
 * @param {Object} svgVertices - SVG vertices for all fins
 */
drawFinsFromSVG(context, segmentPositions, shapeParams, waveTime, sizeScale, hue, saturation, brightness, svgVertices) {
    const finSway = Math.sin(waveTime - 0.5) * 0.8;

    // Pectoral fins
    const finPos = segmentPositions[shapeParams.pectoralPos];
    if (svgVertices.pectoralFin) {
        // Top pectoral fin (left)
        this.drawFinFromSVG(
            context, finPos, svgVertices.pectoralFin,
            shapeParams.pectoralYTop,
            shapeParams.pectoralAngleTop,
            waveTime,
            0.15, // rotationAmplitude
            finSway,
            sizeScale,
            hue, saturation, brightness,
            'none'
        );

        // Bottom pectoral fin (right) - mirrored vertically
        this.drawFinFromSVG(
            context, finPos, svgVertices.pectoralFin,
            shapeParams.pectoralYBottom,
            shapeParams.pectoralAngleBottom,
            waveTime,
            -0.15, // Negative for opposite rotation
            -finSway, // Opposite sway
            sizeScale,
            hue, saturation, brightness,
            'vertical' // Mirror vertically
        );
    }

    // Dorsal fin
    const dorsalPos = segmentPositions[shapeParams.dorsalPos];
    if (svgVertices.dorsalFin) {
        this.drawFinFromSVG(
            context, dorsalPos, svgVertices.dorsalFin,
            shapeParams.dorsalY,
            -0.2, // Base angle
            waveTime,
            0.05, // Subtle rotation for dorsal fin
            0, // No sway
            sizeScale,
            hue, saturation, brightness,
            'none'
        );
    }

    // Ventral fins
    const ventralPos = segmentPositions[shapeParams.ventralPos];
    if (svgVertices.ventralFin) {
        // Top ventral fin
        this.drawFinFromSVG(
            context, ventralPos, svgVertices.ventralFin,
            shapeParams.ventralYTop,
            shapeParams.ventralAngleTop,
            waveTime,
            0.1, // rotationAmplitude
            0, // No sway
            sizeScale,
            hue, saturation, brightness,
            'none'
        );

        // Bottom ventral fin - mirrored vertically
        this.drawFinFromSVG(
            context, ventralPos, svgVertices.ventralFin,
            shapeParams.ventralYBottom,
            shapeParams.ventralAngleBottom,
            waveTime,
            -0.1, // Opposite rotation
            0,
            sizeScale,
            hue, saturation, brightness,
            'vertical' // Mirror vertically
        );
    }
}
```

**Success criteria**:
- [ ] All 5 fins render from SVG (2 pectoral, 1 dorsal, 2 ventral)
- [ ] Mirroring works for left/right fins
- [ ] Rotation animation matches procedural

---

**4.3: Update drawFins() to conditionally use SVG**

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

Update `drawFins()` method signature (line 175):
```javascript
drawFins(context, segmentPositions, shapeParams, waveTime, sizeScale, hue, saturation, brightness, svgVertices = {}) {
    // Use SVG if any fin vertices provided
    if (svgVertices.pectoralFin || svgVertices.dorsalFin || svgVertices.ventralFin) {
        this.drawFinsFromSVG(context, segmentPositions, shapeParams, waveTime, sizeScale, hue, saturation, brightness, svgVertices);
        return;
    }

    // Original procedural fin rendering code
    const finSway = Math.sin(waveTime - 0.5) * 0.8;
    // ... (rest of existing code unchanged)
}
```

**Success criteria**:
- [ ] SVG fin rendering used when vertices provided
- [ ] Procedural fallback works when SVG missing
- [ ] Can mix SVG and procedural (e.g., SVG pectoral, procedural dorsal)

---

**4.4: Update render() to pass fin SVG vertices**

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

Update `drawFins()` call in `render()` (line 115):
```javascript
this.drawFins(
    context,
    segmentPositions,
    shapeParams,
    waveTime,
    finalSizeScale,
    hue,
    saturation,
    brightness,
    {
        pectoralFin: svgVertices.pectoralFin,
        dorsalFin: svgVertices.dorsalFin,
        ventralFin: svgVertices.ventralFin
    }
);
```

**Success criteria**:
- [ ] Fin SVG vertices passed to drawFins()
- [ ] Fins render from SVG when available

---

**4.5: Test fin SVG rendering**

**Manual testing**:
1. Run simulation with all fin SVGs present
2. Verify fin rotation animation looks natural
3. Check mirroring (left/right fins should be symmetric)
4. Compare to procedural fins
5. Test with only some fins as SVG (mixed mode)

**Success criteria**:
- [ ] All fins render correctly from SVG
- [ ] Rotation animation matches procedural
- [ ] Mirroring works correctly
- [ ] Mixed SVG/procedural mode works
- [ ] No performance regression

---

**Time estimate**: 4-5 hours

**Risks**:
- Mirroring might not work correctly
- Fin rotation pivot point might be wrong
- Sway timing might not match procedural

**Mitigation**:
- Test mirroring with asymmetric SVG shapes
- Adjust pivot point if needed
- Compare frame-by-frame with procedural rendering

---

### Phase 5: Head SVG Rendering (Optional)

**Goal**: Replace procedural head rendering with SVG-based rendering.

**Prerequisites**: Phases 1-4 complete

**Note**: Head rendering is optional because the procedural version is simple (just an ellipse) and eyes remain procedural anyway.

#### Tasks

**5.1: Create drawHeadFromSVG() method**

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

Add method (after `drawHead()` at line 601):
```javascript
/**
 * Draw head from SVG vertices (static, no animation)
 * @param {Object} context - p5 graphics context
 * @param {Object} headSegment - Head segment position {x, y, w}
 * @param {Array<{x, y}>} svgVertices - Head SVG vertices
 * @param {Object} shapeParams - Shape parameters
 * @param {number} sizeScale - Size multiplier
 * @param {number} hue - HSB hue
 * @param {number} saturation - HSB saturation
 * @param {number} brightness - HSB brightness
 */
drawHeadFromSVG(context, headSegment, svgVertices, shapeParams, sizeScale, hue, saturation, brightness) {
    const headX = headSegment.x + shapeParams.headX * sizeScale;
    const headY = headSegment.y;

    this.drawSVGShape(context, svgVertices, {
        deformationType: 'static', // No animation
        deformationParams: {},
        positionX: headX,
        positionY: headY,
        rotation: 0,
        scale: sizeScale,
        hue,
        saturation,
        brightness: brightness + 2,
        opacity: this.useSumieStyle ? 0.8 : 0.92,
        mirror: 'none'
    });

    // Eyes are still drawn procedurally (precise, small details)
    context.fill(0, 0, 10, 0.8);

    // Left eye (top)
    context.ellipse(
        headSegment.x + shapeParams.eyeX * sizeScale,
        headSegment.y + shapeParams.eyeYTop * sizeScale,
        shapeParams.eyeSize * sizeScale,
        shapeParams.eyeSize * sizeScale
    );

    // Right eye (bottom)
    context.ellipse(
        headSegment.x + shapeParams.eyeX * sizeScale,
        headSegment.y + shapeParams.eyeYBottom * sizeScale,
        shapeParams.eyeSize * sizeScale,
        shapeParams.eyeSize * sizeScale
    );
}
```

**Success criteria**:
- [ ] Head renders from SVG
- [ ] Eyes still render procedurally on top
- [ ] Static deformation (no animation)

---

**5.2: Update drawHead() to conditionally use SVG**

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

Update `drawHead()` method signature (line 556):
```javascript
drawHead(context, headSegment, shapeParams, sizeScale, hue, saturation, brightness, svgVertices = null) {
    // Use SVG if provided
    if (svgVertices && svgVertices.length > 0) {
        this.drawHeadFromSVG(context, headSegment, svgVertices, shapeParams, sizeScale, hue, saturation, brightness);
        return;
    }

    // Original procedural head rendering
    const headX = headSegment.x + shapeParams.headX * sizeScale;
    // ... (rest of existing code unchanged)
}
```

**Success criteria**:
- [ ] SVG head rendering used when vertices provided
- [ ] Procedural fallback works
- [ ] Eyes render correctly on both SVG and procedural head

---

**5.3: Update render() to pass head SVG vertices**

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

Update `drawHead()` call in `render()` (line 125):
```javascript
this.drawHead(
    context,
    segmentPositions[0],
    shapeParams,
    finalSizeScale,
    hue,
    saturation,
    brightness,
    svgVertices.head
);
```

**Success criteria**:
- [ ] Head SVG vertices passed to drawHead()
- [ ] Head renders from SVG when available

---

**Time estimate**: 1-2 hours

**Risks**:
- Eyes might not align correctly on SVG head
- Head shape might look worse than procedural ellipse

**Mitigation**:
- Make this phase truly optional (skip if procedural is good enough)
- Test eye positioning carefully
- Compare visual quality before committing to SVG head

---

### Phase 6: Testing, Optimization, and Documentation

**Goal**: Ensure system works robustly, performs well, and is well-documented.

**Prerequisites**: Phases 1-5 complete

#### Tasks

**6.1: Create comprehensive test page**

**File**: `/Users/seankim/dev/visualizations/flocking/test-svg-body-parts.html`

Create test page that:
- Shows side-by-side comparison (SVG vs procedural)
- Allows toggling each body part individually
- Shows performance metrics (FPS)
- Allows testing with missing SVG files
- Shows deformation parameters in real-time

**Success criteria**:
- [ ] Test page shows all body parts
- [ ] Can toggle between SVG and procedural per part
- [ ] Performance metrics displayed
- [ ] Visual comparison is easy

---

**6.2: Performance testing**

**Tests**:
1. Measure FPS with all SVG parts (80 koi)
2. Measure FPS with all procedural (80 koi)
3. Measure FPS with mixed SVG/procedural
4. Profile SVG loading time in preload
5. Profile per-frame rendering time

**Success criteria**:
- [ ] SVG rendering FPS >= 90% of procedural FPS
- [ ] SVG loading time < 500ms total
- [ ] No memory leaks (test over 5+ minutes)
- [ ] Smooth animation on target devices (desktop, tablet, mobile)

---

**6.3: Graceful fallback testing**

**Tests**:
1. Missing all SVG files
2. Missing only some SVG files
3. Corrupted SVG file
4. Empty SVG file
5. SVG with wrong dimensions

**Success criteria**:
- [ ] Console warnings (not errors) for missing SVGs
- [ ] Procedural rendering works when SVG missing
- [ ] No crash or visual artifacts
- [ ] Clear error messages for debugging

---

**6.4: Visual quality testing**

**Tests**:
1. Compare SVG vs procedural at different scales
2. Test sumi-e rendering for all SVG parts
3. Test animation smoothness (tail flutter, fin rotation)
4. Test with different SVG shapes (create 2-3 variants)
5. Test mirroring (fins should be symmetric)

**Success criteria**:
- [ ] SVG visual quality >= procedural quality
- [ ] Sumi-e layering looks natural for all parts
- [ ] Animation is smooth (no jitter)
- [ ] Mirrored fins look correct
- [ ] Different SVG shapes work correctly

---

**6.5: Code documentation**

**Update files with JSDoc comments**:
- `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`
  - All new methods have complete JSDoc
  - Deformation types documented
  - Examples provided for complex configs

**Create documentation files**:
- `/Users/seankim/dev/visualizations/flocking/docs/svg-body-parts.md`
  - How to create custom SVG body parts
  - Coordinate system explanation
  - Deformation types guide
  - Troubleshooting tips

**Success criteria**:
- [ ] All methods have JSDoc comments
- [ ] Parameter types and meanings clear
- [ ] Examples provided for complex usage
- [ ] User-facing documentation complete

---

**6.6: Update README**

**File**: `/Users/seankim/dev/visualizations/flocking/README.md`

Add section:
```markdown
## SVG Body Parts

Koi fish can be rendered using custom SVG shapes for all body parts:

- **Body**: Wave deformation follows swimming motion
- **Tail**: Flutter animation with traveling wave
- **Fins**: Rotation/sway animation (pectoral, dorsal, ventral)
- **Head**: Static shape (optional, eyes remain procedural)

### Using Custom SVG Shapes

1. Create SVG files in `assets/koi/body-parts/`
2. Follow coordinate system conventions (see `docs/svg-body-parts.md`)
3. SVGs are automatically loaded and used if present
4. Graceful fallback to procedural rendering if missing

See `docs/svg-body-parts.md` for detailed instructions.
```

**Success criteria**:
- [ ] README updated with SVG section
- [ ] Links to documentation correct
- [ ] Brief, clear explanation

---

**6.7: Create migration guide (if needed)**

If this change affects existing users:

**File**: `/Users/seankim/dev/visualizations/flocking/MIGRATION.md`

Add section explaining:
- What changed (SVG rendering now supported)
- Backward compatibility (procedural still works)
- How to opt-in (add SVG files)
- Performance considerations

**Success criteria**:
- [ ] Migration guide clear and complete
- [ ] Backward compatibility confirmed
- [ ] Breaking changes (if any) documented

---

**Time estimate**: 4-6 hours

**Risks**:
- Performance might not be acceptable
- Visual quality might be worse than procedural
- Edge cases might cause crashes

**Mitigation**:
- Test extensively before declaring complete
- Profile and optimize if needed
- Document known issues and workarounds

---

## Risk Assessment and Mitigation

### Technical Risks

**Risk 1: Deformation math doesn't match procedural exactly**

**Likelihood**: Medium

**Impact**: High (animation looks wrong)

**Mitigation**:
- Extract formulas directly from procedural code
- Test with simple shapes first
- Use side-by-side comparison
- Allow parameter tweaking for fine-tuning

---

**Risk 2: Performance degradation**

**Likelihood**: Low

**Impact**: High (makes system unusable)

**Mitigation**:
- Load SVGs once in preload, not per-frame
- Reuse vertices across all koi instances
- Profile early and often
- Optimize deformation algorithms if needed
- Consider caching deformed vertices (if needed)

---

**Risk 3: SVG coordinate normalization issues**

**Likelihood**: Medium

**Impact**: Medium (shapes positioned/scaled wrong)

**Mitigation**:
- Test normalization with known dimensions
- Use `test-svg-parser.html` extensively
- Add debug visualization for bounds/center
- Document coordinate system clearly

---

**Risk 4: Sumi-e layering doesn't work for all shapes**

**Likelihood**: Low

**Impact**: Low (visual quality slightly worse)

**Mitigation**:
- Test sumi-e rendering early in Phase 1
- Adjust layer offsets if needed
- Allow per-part layer configuration
- Fallback to single layer if needed

---

**Risk 5: SVG files don't load or are corrupted**

**Likelihood**: Low

**Impact**: Low (graceful fallback)

**Mitigation**:
- Robust error handling in preload
- Console warnings for debugging
- Procedural fallback always available
- Test with missing/corrupted files

---

### Process Risks

**Risk 6: Scope creep (adding features beyond generalization)**

**Likelihood**: Medium

**Impact**: Medium (delayed completion)

**Mitigation**:
- Stick to phased plan
- Mark optional features clearly
- Don't add new features mid-implementation
- Save enhancements for future iterations

---

**Risk 7: Testing takes longer than expected**

**Likelihood**: Medium

**Impact**: Low (delays Phase 6)

**Mitigation**:
- Build test infrastructure early (Phase 1)
- Test incrementally after each phase
- Automate testing where possible
- Don't skip testing to save time

---

## Performance Considerations

### Expected Performance

**SVG loading (one-time cost)**:
- 6 SVG files @ ~1KB each = ~6KB total
- Parsing + normalization: ~100ms total
- **Impact**: Negligible (happens once in preload)

**Per-frame rendering (80 koi)**:
- Deformation: ~0.05ms per koi
- Transform: ~0.01ms per koi
- Sumi-e layering: ~0.1ms per koi (3x rendering)
- **Total**: ~0.16ms per koi = ~13ms per frame
- **Expected FPS**: 60+ FPS (assuming other systems take ~3ms)

**Memory usage**:
- SVG vertices: 6 parts × 20 vertices × 8 bytes = ~1KB
- **Impact**: Negligible

### Optimization Strategies (if needed)

**If performance is not acceptable**:

1. **Cache deformed vertices**: Store deformed vertices per animation frame
2. **Reduce sumi-e layers**: Use 2 layers instead of 3
3. **Simplify SVG shapes**: Use fewer vertices
4. **Skip deformation for distant koi**: Use LOD (level of detail)
5. **Use single layer for fins**: Fins are small, layering less noticeable

**Not recommended**:
- Don't skip SVG normalization (needed for correctness)
- Don't cache all possible states (memory cost too high)

---

## Success Metrics

### Functional Metrics
- [ ] All body parts can be rendered from SVG
- [ ] All deformation types work correctly (wave, flutter, rotate, static)
- [ ] Animation behavior matches procedural exactly
- [ ] Graceful fallback when SVG missing
- [ ] Mirroring works for fins

### Quality Metrics
- [ ] Visual quality >= procedural rendering
- [ ] Sumi-e layering works for all parts
- [ ] No visual artifacts or jitter
- [ ] Animation is smooth and natural

### Performance Metrics
- [ ] SVG loading time < 500ms
- [ ] FPS >= 90% of procedural FPS (60 FPS target)
- [ ] No memory leaks over 5+ minutes
- [ ] Works on mobile/tablet (30+ FPS)

### Maintainability Metrics
- [ ] Code is cleaner than procedural version
- [ ] JSDoc comments complete
- [ ] Easy to add new deformation types
- [ ] Easy to add new body parts

---

## Future Enhancements (Out of Scope)

**Not included in this plan** (consider for future iterations):

1. **Multiple SVG variants per part**: Different tail styles, fin shapes, etc.
2. **Runtime SVG editing**: Morphing shapes dynamically
3. **SVG-based spot patterns**: Custom spot shapes from SVG
4. **Texture mapping**: Apply textures to SVG shapes
5. **Skeletal animation**: Bone-based deformation for complex poses
6. **SVG animation tags**: Support `<animate>` elements
7. **Non-koi shapes**: Birds, butterflies, other creatures
8. **SVG export**: Save current koi as SVG file
9. **Visual SVG editor**: In-app shape editing
10. **Procedural SVG generation**: Generate shapes algorithmically

---

## Conclusion

This implementation plan provides a phased approach to generalizing the SVG rendering system for all koi body parts. The plan prioritizes:

1. **Correctness**: Match procedural animation behavior exactly
2. **Maintainability**: Clean, well-documented code
3. **Performance**: No significant regression
4. **Flexibility**: Easy to add new parts and deformations

**Total time estimate**: 18-26 hours over 6 phases

**Key milestones**:
- Phase 1: Core infrastructure (4-6 hours)
- Phase 2: Asset loading (2-3 hours)
- Phase 3: Tail rendering (3-4 hours)
- Phase 4: Fin rendering (4-5 hours)
- Phase 5: Head rendering (1-2 hours, optional)
- Phase 6: Testing & docs (4-6 hours)

**Recommended approach**:
- Complete phases sequentially
- Test thoroughly after each phase
- Don't skip Phase 6 (testing/docs)
- Consider Phase 5 optional if time-constrained

**Next steps**:
1. Review and approve this plan
2. Begin Phase 1 implementation
3. Test incrementally after each phase
4. Adjust plan if major issues discovered
