---
doc_type: research
date: 2025-10-25T21:10:23+00:00
title: "SVG Rendering Implementation and Koi-Editor Integration Analysis"
research_question: "Understand the SVG renderer implementation in flocking directory and identify integration gaps with koi-editor"
researcher: Claude

git_commit: f13984e2560e55d7e6530daf1e129c38ead79414
branch: main
repository: workspace

created_by: Claude
last_updated: 2025-10-25
last_updated_by: Claude

tags:
  - svg-rendering
  - koi-renderer
  - koi-editor
  - integration
  - architecture
status: complete

related_docs:
  - thoughts/implementation-details/2025-10-25-phase-5-head-svg-rendering.md
  - thoughts/reviews/2025-10-25-TICKET-004-phase-4-review-fin-svg-rendering-pectoral-dorsal-ventral.md
  - thoughts/reviews/2025-10-25-TICKET-SVG-HEAD-phase-5-review-head-svg-rendering.md
---

# Research: SVG Rendering Implementation and Koi-Editor Integration Analysis

**Date**: 2025-10-25T21:10:23+00:00
**Researcher**: Claude Code
**Git Commit**: f13984e2560e55d7e6530daf1e129c38ead79414
**Branch**: main
**Repository**: visualizations

## Research Question

How is the SVG rendering system implemented in the flocking directory, where is it used in the main visualization, and is it integrated into the koi-editor? If not, what would be needed to integrate it?

## Summary

The SVG rendering system is **fully implemented** in the `KoiRenderer` class and is being **actively used** in the main simulation visualization. However, the **koi-editor does NOT use SVG rendering** - it only uses procedural rendering. This creates a significant gap where the editor cannot preview the actual SVG-rendered appearance of koi fish.

**Key Findings:**

1. **SVG Renderer Location**: Centralized in `/workspace/flocking/src/core/koi-renderer.js` (1097 lines)
2. **Main Visualization**: Fully integrated with SVG loading and rendering for all body parts
3. **Koi-Editor**: Missing SVG integration entirely - uses only procedural rendering
4. **Integration Gap**: The editor cannot show artists/developers what the final SVG appearance will look like

## Detailed Findings

### 1. SVG Renderer Implementation

**Location**: `/workspace/flocking/src/core/koi-renderer.js`

The `KoiRenderer` class contains a complete, generalized SVG rendering system that was built through 5 phases of development (as documented in the historical context).

#### Core Architecture

**Generalized SVG Shape Renderer** (`drawSVGShape()` method, lines 746-805):
```javascript
drawSVGShape(context, svgVertices, config) {
    // 1. Apply deformation (wave, flutter, rotate, static)
    let vertices = this.applyDeformation(svgVertices, deformationType, deformationParams);

    // 2. Apply mirror transformation (horizontal, vertical, none)
    vertices = this.applyMirror(vertices, mirror);

    // 3. Render with transform and sumi-e layering
    context.translate(positionX, positionY);
    context.rotate(rotation);

    // 3-layer rendering for sumi-e style or single layer for normal
    if (this.useSumieStyle) {
        for (let layer = 0; layer < 3; layer++) {
            // Render with soft edges
        }
    } else {
        // Normal rendering
    }
}
```

#### Deformation Types (Strategy Pattern)

The system supports 4 deformation strategies (`applyDeformation()` dispatcher, lines 666-680):

1. **`wave`** - Body wave motion (lines 548-559)
   - Maps vertices to body segments
   - Applies swimming wave animation
   - Used for: Body rendering

2. **`flutter`** - Traveling wave (lines 576-612)
   - Creates progressive wave from base to tip
   - Amplitude increases toward tip
   - Used for: Tail rendering

3. **`rotate`** - Rotation around pivot (lines 628-656)
   - Rotates vertices around a pivot point
   - Supports Y-sway for additional motion
   - Used for: Fin rendering (pectoral, dorsal, ventral)

4. **`static`** - No animation (line 675)
   - Returns vertices unchanged
   - Used for: Head rendering

#### Body Part Renderers

Each body part has a dedicated SVG rendering method:

**Body** (`drawBodyFromSVG()`, lines 819-838):
- Uses `wave` deformation with body segments
- 3-layer sumi-e rendering with opacity 0.7
- Brightness adjustment: `brightness - 2`
- Fallback: Procedural body rendering (lines 843-933)

**Tail** (`drawTailFromSVG()`, lines 430-466):
- Uses `flutter` deformation with extended tail segments
- 3-layer sumi-e rendering with opacity 0.7
- Color adjustments: `saturation + 5, brightness - 12`
- Fallback: Procedural tail with curve vertices (lines 472-537)

**Head** (`drawHeadFromSVG()`, lines 983-1021):
- Uses `static` deformation (no animation)
- Eyes are **always procedural** (rendered on top)
- Brightness boost: `brightness + 2` (slightly brighter than body)
- 3-layer sumi-e rendering with opacity 0.8
- Fallback: Procedural ellipse head (lines 1036-1088)

**Fins** (`drawFinFromSVG()`, lines 205-226):
- Helper method for rendering individual fins
- Uses `rotate` deformation with rotation amplitude and sway
- Rotation frequency: 1.2 (matches procedural)
- Color adjustments: `saturation + 8, brightness - 15`
- Opacity: 0.6 (sumi-e) or 0.7 (normal)
- Supports vertical mirroring for symmetric pairs
- Renders 5 fins: 2 pectoral, 1 dorsal, 2 ventral
- Fallback: Procedural ellipse fins (lines 332-414)

#### Main Render Method

The `render()` method (lines 78-148) orchestrates all rendering:

```javascript
render(context, x, y, angle, params) {
    const { svgVertices = { body, tail, head, pectoralFin, dorsalFin, ventralFin } } = params;

    // Rendering order for proper z-layering:
    // 1. Fins (behind body)
    this.drawFins(context, ..., svgVertices.{pectoralFin, dorsalFin, ventralFin});

    // 2. Tail (behind body)
    this.drawTail(context, ..., svgVertices.tail);

    // 3. Body (on top of fins/tail)
    if (svgVertices.body) {
        this.drawBodyFromSVG(...);
    } else {
        this.drawBody(...); // Procedural fallback
    }

    // 4. Head (before spots)
    this.drawHead(context, ..., svgVertices.head);

    // 5. Spots (on top of everything)
    this.drawSpots(...);
}
```

**Key Design Decisions**:
- Optional `svgVertices` parameter (defaults to empty object)
- Graceful fallback to procedural rendering for missing SVGs
- Eyes always procedural regardless of head rendering method
- Each body part checks independently for SVG availability
- No breaking changes to existing API

### 2. Main Visualization Usage (simulation-app.js)

**Location**: `/workspace/flocking/src/apps/simulation-app.js`

The main simulation **fully integrates** SVG rendering:

#### SVG Asset Loading (Preload Phase, lines 61-130)

```javascript
window.preload = async function() {
    console.log('Loading SVG body parts...');

    // Body: 16 × 5.2 units (X: -8 to +8, Y: -2.6 to +2.6)
    bodyVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/body.svg',
        20,
        { width: 16, height: 5.2 }
    );

    // Tail: 6 × 4 units
    tailVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/tail.svg',
        20,
        { width: 6, height: 4 }
    );

    // Head: 7.5 × 5.0 units
    headVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/head.svg',
        20,
        { width: 7.5, height: 5.0 }
    );

    // Pectoral fin: 4.5 × 2 units
    pectoralFinVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/pectoral-fin.svg',
        20,
        { width: 4.5, height: 2 }
    );

    // Dorsal fin: 4 × 5 units
    dorsalFinVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/dorsal-fin.svg',
        20,
        { width: 4, height: 5 }
    );

    // Ventral fin: 3 × 1.5 units
    ventralFinVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/ventral-fin.svg',
        20,
        { width: 3, height: 1.5 }
    );

    // Log loading results
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

**Key Details**:
- All 6 body parts loaded asynchronously in preload phase
- SVG files located in `assets/koi/body-parts/`
- Each part has specific target dimensions matching koi coordinate space
- Debug logging for verification
- Graceful failure handling (falls back to procedural if load fails)

#### Rendering Integration (Draw Phase, lines 285-314)

```javascript
window.draw = function() {
    // ... update flock, calculate animation ...

    for (let boid of flock.boids) {
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
                svgVertices: {                    // ← SVG vertices passed here
                    body: bodyVertices,
                    tail: tailVertices,
                    head: headVertices,
                    pectoralFin: pectoralFinVertices,
                    dorsalFin: dorsalFinVertices,
                    ventralFin: ventralFinVertices
                }
            }
        );
    }
};
```

**Integration Pattern**:
- SVG vertices loaded once in preload, reused for all koi
- Passed as `svgVertices` object to renderer
- All 6 body parts provided
- Animation parameters still control motion
- Audio reactivity modifiers still apply

### 3. Koi-Editor Integration (editor-app.js)

**Location**: `/workspace/flocking/src/apps/editor-app.js`

**CRITICAL FINDING**: The koi-editor **does NOT use SVG rendering**.

#### Current Editor Implementation (lines 126-147)

```javascript
window.draw = function() {
    // ... calculate segments, update control points ...

    renderer.render(
        window,  // Draw directly to main canvas
        0,
        0,
        0,
        {
            shapeParams: params,
            colorParams: currentPattern ? currentPattern.baseColor : { h: 0, s: 0, b: 90 },
            pattern: currentPattern || { spots: [] },
            animationParams: {
                waveTime,
                sizeScale,
                lengthMultiplier: 1,
                tailLength: 1
            },
            modifiers: {
                brightnessBoost: 0,
                saturationBoost: 0,
                sizeScale: 1
            }
            // ← NO svgVertices parameter!
        }
    );
};
```

**Missing Integration**:
- No SVG asset loading in preload
- No `svgVertices` parameter passed to renderer
- Only uses procedural rendering path
- Cannot preview SVG appearance

#### Editor Architecture

The editor has the following structure:

**HTML**: `/workspace/flocking/koi-editor.html`
- Canvas container for visualization
- Control panel with parameter inputs
- Variety selector (28 koi varieties)
- Visual control points for interactive editing
- Toggle controls for UI minimize/maximize

**JavaScript**: `/workspace/flocking/src/apps/editor-app.js`
- Imports `KoiRenderer` (line 7)
- Uses same renderer as main simulation
- Only passes procedural parameters
- No SVG loading infrastructure

**Control Points** (lines 186-253):
- Visual handles for dragging parameters
- Head position, fin positions, tail start
- Direct manipulation of shape parameters
- Updates input fields on drag

### 4. The Integration Gap

**What's Missing in Koi-Editor**:

1. **No SVG Asset Loading**
   - No preload phase for SVG body parts
   - No `SVGParser` usage
   - No vertex storage

2. **No SVG Vertices Passed to Renderer**
   - `render()` call missing `svgVertices` parameter
   - Always falls back to procedural rendering
   - Cannot see actual SVG appearance

3. **No SVG Selection/Management**
   - Cannot load different SVG files
   - Cannot switch between procedural and SVG mode
   - Cannot test how shape parameters affect SVG rendering

**Why This Matters**:

The koi-editor is used for:
- Testing shape parameter adjustments
- Designing new koi varieties
- Previewing different configurations
- Exporting parameter values

Without SVG integration, developers/artists:
- Cannot see how SVG body parts will look with current parameters
- Cannot verify that shape parameters work with SVG rendering
- Cannot design varieties optimized for SVG appearance
- Must switch to main simulation to see SVG results

**Example Scenario**:

1. Artist adjusts `pectoralYTop` parameter in editor
2. Sees procedural ellipse fin move
3. Exports parameters
4. Tests in main simulation with SVG
5. SVG pectoral fin appears in wrong position!
6. Must iterate between editor and simulation

This creates a **preview disconnect** between design tool and final output.

## Code References

### SVG Renderer (koi-renderer.js)

- **Main render method**: `koi-renderer.js:78-148` - Orchestrates all rendering with SVG support
- **Generalized SVG shape renderer**: `koi-renderer.js:746-805` - Core rendering engine
- **Deformation dispatcher**: `koi-renderer.js:666-680` - Strategy pattern for deformation types
- **Wave deformation**: `koi-renderer.js:548-559` - Body wave motion
- **Flutter deformation**: `koi-renderer.js:576-612` - Tail traveling wave
- **Rotation deformation**: `koi-renderer.js:628-656` - Fin rotation/sway
- **Mirror transformation**: `koi-renderer.js:689-696` - Vertical/horizontal mirroring
- **Body SVG rendering**: `koi-renderer.js:819-838` - SVG body with wave deformation
- **Tail SVG rendering**: `koi-renderer.js:430-466` - SVG tail with flutter deformation
- **Head SVG rendering**: `koi-renderer.js:983-1021` - SVG head with static deformation
- **Fin SVG rendering**: `koi-renderer.js:205-226` - Helper for individual fins
- **Fins coordinated rendering**: `koi-renderer.js:245-330` - All 5 fins with rotation/mirroring

### Main Simulation (simulation-app.js)

- **SVG asset loading**: `simulation-app.js:61-130` - Preload all 6 body parts
- **Body loading**: `simulation-app.js:70-74` - Body SVG (16×5.2 units)
- **Tail loading**: `simulation-app.js:77-81` - Tail SVG (6×4 units)
- **Head loading**: `simulation-app.js:84-88` - Head SVG (7.5×5.0 units)
- **Pectoral fin loading**: `simulation-app.js:91-95` - Pectoral fin SVG (4.5×2 units)
- **Dorsal fin loading**: `simulation-app.js:98-102` - Dorsal fin SVG (4×5 units)
- **Ventral fin loading**: `simulation-app.js:105-109` - Ventral fin SVG (3×1.5 units)
- **Rendering integration**: `simulation-app.js:285-314` - Pass SVG vertices to renderer
- **SVG vertices parameter**: `simulation-app.js:305-312` - All 6 body parts passed

### Koi-Editor (editor-app.js)

- **Editor setup**: `editor-app.js:28-57` - Canvas, renderer, controls initialization
- **Rendering call**: `editor-app.js:126-147` - **Missing svgVertices parameter**
- **Control points**: `editor-app.js:186-253` - Visual handles for parameter editing
- **No SVG loading**: `editor-app.js` - No preload phase, no SVG infrastructure

## Architecture Documentation

### SVG Rendering Pipeline

```
1. Asset Loading (Preload)
   ↓
   SVGParser.loadSVGFromURL(path, subdivisions, dimensions)
   ↓
   Parse SVG → Subdivide paths → Normalize to target dimensions
   ↓
   Store vertices array

2. Render Loop (Each Frame)
   ↓
   Pass vertices to renderer.render(context, x, y, angle, params)
   ↓
   For each body part:
   ├─ Check if SVG vertices provided
   ├─ If yes: drawXFromSVG(...)
   │  ├─ Apply deformation (wave/flutter/rotate/static)
   │  ├─ Apply mirror transformation
   │  ├─ Transform (translate, rotate, scale)
   │  └─ Render with sumi-e layers
   └─ If no: drawX(...) // Procedural fallback

3. Deformation System (Strategy Pattern)
   ↓
   drawSVGShape(context, vertices, config)
   ↓
   applyDeformation(vertices, type, params)
   ├─ 'wave' → applyWaveDeformation()
   ├─ 'flutter' → applyFlutterDeformation()
   ├─ 'rotate' → applyRotationDeformation()
   └─ 'static' → return vertices
   ↓
   applyMirror(vertices, mirror)
   ↓
   Render with transforms and sumi-e layers
```

### Current vs. Ideal Architecture

**Current Architecture**:

```
Main Simulation:
  [SVG Assets] → [KoiRenderer] → [SVG + Procedural Rendering]
                      ↓
               Preview matches output ✓

Koi-Editor:
  [No SVG Assets] → [KoiRenderer] → [Procedural Rendering Only]
                         ↓
                Preview doesn't match output ✗
```

**Ideal Architecture** (after integration):

```
Main Simulation:
  [SVG Assets] → [KoiRenderer] → [SVG + Procedural Rendering]
                      ↓
               Preview matches output ✓

Koi-Editor:
  [SVG Assets] → [KoiRenderer] → [SVG + Procedural Rendering]
                      ↓
               Preview matches output ✓
               Toggle between modes
```

### Design Patterns Used

**Strategy Pattern** (Deformation Types):
- Context: `drawSVGShape()` method
- Strategy Interface: `applyDeformation(vertices, type, params)`
- Concrete Strategies: `applyWaveDeformation()`, `applyFlutterDeformation()`, `applyRotationDeformation()`, static
- Benefit: Easy to add new deformation types without modifying existing code

**Template Method Pattern** (Body Part Rendering):
- Template: `drawSVGShape()` defines rendering structure
- Variants: Each body part (`drawBodyFromSVG()`, `drawTailFromSVG()`, etc.) specifies deformation type and parameters
- Benefit: Consistent rendering flow with body-part-specific behavior

**Graceful Degradation Pattern** (SVG Fallback):
- Primary: SVG rendering with deformation
- Fallback: Procedural rendering
- Check: `if (svgVertices && svgVertices.length > 0)`
- Benefit: System works even if SVG assets fail to load

## Historical Context (from thoughts/)

Based on the review documents, the SVG rendering system was built in phases:

**Phase 1**: Core infrastructure (generalized SVG renderer)
- Built `drawSVGShape()` with deformation system
- Established strategy pattern for deformation types
- Created mirror transformation support

**Phase 2**: SVG asset loading and validation
- Implemented `SVGParser` for loading SVG files
- Added subdivision and normalization
- Created debug logging for verification

**Phase 3**: Tail SVG rendering with continuous wave motion
- Implemented `drawTailFromSVG()` using flutter deformation
- Created traveling wave effect
- Matched procedural tail animation exactly

**Phase 4**: Fin SVG rendering (pectoral, dorsal, ventral)
- Implemented `drawFinFromSVG()` helper method
- Used rotate deformation with mirroring
- Rendered all 5 fins (2 pectoral, 1 dorsal, 2 ventral)
- Review document: `thoughts/reviews/2025-10-25-TICKET-004-phase-4-review-fin-svg-rendering-pectoral-dorsal-ventral.md`

**Phase 5**: Head SVG rendering
- Implemented `drawHeadFromSVG()` using static deformation
- Kept eyes always procedural (smart design decision)
- Implementation document: `thoughts/implementation-details/2025-10-25-phase-5-head-svg-rendering.md`
- Review document: `thoughts/reviews/2025-10-25-TICKET-SVG-HEAD-phase-5-review-head-svg-rendering.md`

**Phase 6**: Testing and optimization (presumed next phase)

## Integration Recommendations

To integrate SVG rendering into the koi-editor:

### 1. Add SVG Asset Loading

Add preload phase to `editor-app.js`:

```javascript
// Global state (add to editor-app.js top)
let bodyVertices = null;
let tailVertices = null;
let headVertices = null;
let pectoralFinVertices = null;
let dorsalFinVertices = null;
let ventralFinVertices = null;

// Add preload function
window.preload = async function() {
    // Import SVGParser
    const { SVGParser } = await import('../core/svg-parser.js');

    // Load all body parts (same as simulation-app.js)
    bodyVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/body.svg',
        20,
        { width: 16, height: 5.2 }
    );
    // ... (repeat for other body parts)
};
```

### 2. Pass SVG Vertices to Renderer

Update the render call in `editor-app.js` draw function:

```javascript
window.draw = function() {
    // ... existing code ...

    renderer.render(
        window,
        0,
        0,
        0,
        {
            shapeParams: params,
            colorParams: currentPattern ? currentPattern.baseColor : { h: 0, s: 0, b: 90 },
            pattern: currentPattern || { spots: [] },
            animationParams: {
                waveTime,
                sizeScale,
                lengthMultiplier: 1,
                tailLength: 1
            },
            modifiers: {
                brightnessBoost: 0,
                saturationBoost: 0,
                sizeScale: 1
            },
            svgVertices: {                    // ← Add this
                body: bodyVertices,
                tail: tailVertices,
                head: headVertices,
                pectoralFin: pectoralFinVertices,
                dorsalFin: dorsalFinVertices,
                ventralFin: ventralFinVertices
            }
        }
    );
};
```

### 3. Add Mode Toggle Control (Optional Enhancement)

Add UI toggle to switch between SVG and procedural preview:

```javascript
// Add state variable
let useSVGRendering = true;

// Add toggle button in HTML
<button id="toggleRenderingMode">Toggle SVG/Procedural</button>

// Add event listener in setupToggleControls()
document.getElementById('toggleRenderingMode').addEventListener('click', () => {
    useSVGRendering = !useSVGRendering;
    document.getElementById('toggleRenderingMode').textContent =
        useSVGRendering ? 'Mode: SVG' : 'Mode: Procedural';
});

// Modify render call
renderer.render(
    window,
    0, 0, 0,
    {
        // ... existing params ...
        svgVertices: useSVGRendering ? {   // ← Conditional
            body: bodyVertices,
            tail: tailVertices,
            head: headVertices,
            pectoralFin: pectoralFinVertices,
            dorsalFin: dorsalFinVertices,
            ventralFin: ventralFinVertices
        } : {}  // Empty object = procedural fallback
    }
);
```

### 4. Add SVG File Selection (Advanced Enhancement)

Allow loading different SVG files for testing variations:

```javascript
// Add file input in HTML
<input type="file" id="loadBodySVG" accept=".svg">

// Add handler
document.getElementById('loadBodySVG').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const text = await file.text();
        bodyVertices = await SVGParser.parseSVG(text, 20, { width: 16, height: 5.2 });
    }
});
```

### Implementation Complexity

**Minimal Integration** (Steps 1-2):
- Effort: ~30 minutes
- Changes: Add preload, pass svgVertices parameter
- Benefit: Editor shows SVG appearance
- Risk: Low (no API changes, graceful fallback exists)

**Mode Toggle** (Step 3):
- Effort: ~15 minutes
- Changes: Add state variable, button, conditional
- Benefit: Compare SVG vs procedural side-by-side
- Risk: Very low (UI-only change)

**Advanced Features** (Step 4):
- Effort: ~2 hours
- Changes: File upload, SVG validation, error handling
- Benefit: Test custom SVG files without rebuilding
- Risk: Medium (file handling, security considerations)

## Related Research

- Implementation plan: `thoughts/plans/2025-10-22-generalize-svg-rendering-system-for-all-koi-body-parts.md`
- Phase 4 review: `thoughts/reviews/2025-10-25-TICKET-004-phase-4-review-fin-svg-rendering-pectoral-dorsal-ventral.md`
- Phase 5 implementation: `thoughts/implementation-details/2025-10-25-phase-5-head-svg-rendering.md`
- Phase 5 review: `thoughts/reviews/2025-10-25-TICKET-SVG-HEAD-phase-5-review-head-svg-rendering.md`

## Open Questions

1. **Why wasn't the editor updated with SVG support?**
   - Likely oversight during SVG implementation
   - Editor may have been developed before SVG system
   - Procedural rendering was sufficient for parameter editing initially

2. **Should editor default to SVG or procedural mode?**
   - Recommendation: Default to SVG (matches main simulation)
   - Provide toggle to switch modes
   - Show mode indicator clearly in UI

3. **Should editor support custom SVG file loading?**
   - For production: Not necessary (use fixed assets)
   - For development: Very useful for testing new SVG designs
   - Could be hidden behind "developer mode" flag

4. **Performance impact of SVG rendering in editor?**
   - Main simulation renders 80+ koi with SVG successfully
   - Editor renders 1 koi at larger scale
   - Performance should be negligible
   - No optimization needed

5. **Should shape parameters affect SVG rendering?**
   - Currently: Shape parameters control positioning only
   - SVG vertices are fixed (no parametric deformation)
   - Tail/fin positioning parameters do affect placement
   - Body width/height parameters not applied to SVG
   - This is by design (SVG shape is fixed, position is parameterized)
