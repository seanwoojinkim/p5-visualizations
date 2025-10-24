---
doc_type: plan
date: 2025-10-22T14:45:27+00:00
title: "SVG-Based Koi Rendering with Bitmap Brushstrokes"
feature: "hybrid-rendering-svg-brushstrokes"

# Update phase status as implementation progresses
phases:
  - name: "Phase 1: SVG Parser Infrastructure"
    status: pending
  - name: "Phase 2: Brushstroke Library System"
    status: pending
  - name: "Phase 3: SVG Body Rendering Integration"
    status: pending
  - name: "Phase 4: SVG Tail Rendering Integration"
    status: pending
  - name: "Phase 5: Brushstroke Spot Rendering"
    status: pending
  - name: "Phase 6: Asset Loading and Initialization"
    status: pending
  - name: "Phase 7: Dorsal Fin SVG Rendering (Optional)"
    status: pending

git_commit: 24939bb0e8b3ffc10ff51453cd7ec97a0f34e8b6
branch: main
repository: visualizations

created_by: Sean Kim
last_updated: 2025-10-22
last_updated_by: Sean Kim

tags:
  - koi
  - rendering
  - svg
  - brushstrokes
  - animation
  - hybrid-rendering
status: draft

related_docs:
  - thoughts/research/2025-10-22-koi-rendering-system-body-part-structure-for-svg-transition.md
---

# Implementation Plan: SVG-Based Koi Rendering with Bitmap Brushstrokes

## Overview

### Problem Statement

The current koi rendering system uses procedural shape generation for all body parts (ellipses, curveVertex paths) and spots. While functional, this approach limits artistic control and makes it difficult to create distinctive, high-quality fish designs. The system needs to transition to SVG-authored vector paths for body structure while maintaining the organic, painterly aesthetic.

### Proposed Solution

Implement a **hybrid rendering system** that combines:

1. **SVG vector paths** for complex body structures (body outline, tail, fins) - authored in Illustrator and parsed to vertex arrays
2. **PNG bitmap brushstrokes** for spot patterns - procedurally applied with color tinting for organic texture
3. **Existing wave animation system** - maintained by applying deformation to SVG vertices using current segment-based wave motion
4. **Backward compatibility** - graceful fallback to procedural rendering if assets missing

This approach provides:
- **Artistic control**: Design complex body shapes in Illustrator
- **Organic texture**: Bitmap brushstrokes add painterly quality
- **Smooth animation**: Wave deformation system unchanged
- **Performance**: Comparable draw calls to current system (~2,000/frame)

### Success Definition

The implementation is successful when:

1. ✅ User can author body shapes in Illustrator, save as SVG, and see immediate results
2. ✅ 80 koi render smoothly at 60fps (desktop) / 30fps (mobile) with SVG assets
3. ✅ Wave animation looks identical to current procedural system
4. ✅ Bitmap brushstrokes add painterly texture without performance degradation
5. ✅ System gracefully falls back to procedural rendering if assets missing
6. ✅ All 8 body parts render correctly with proper z-layering

---

## Current State Analysis

### Existing System Structure

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js` (501 lines)

**Architecture**:
- **Segment-based positioning**: 10 segments along body length (lines 127-160)
- **Wave animation**: Sine wave applied to segment Y positions (line 133)
- **8 body parts**: Body, tail, head, eyes (2), dorsal fin, pectoral fins (2), ventral fins (2)
- **Rendering order**: Fins → Tail → Body → Head → Spots (lines 106-117)
- **Multi-layer sumi-e style**: Optional 2-3 layer rendering for soft edges (lines 274-294, 321-352)

**Key rendering methods**:
- `calculateSegments()` (lines 127-160) - Computes segment positions with wave motion
- `drawBody()` (lines 316-406) - Renders body outline with `curveVertex()`
- `drawTail()` (lines 253-311) - Renders tail with independent sway
- `drawFins()` (lines 166-248) - Renders all 6 fins (dorsal, pectoral, ventral)
- `drawHead()` (lines 447-492) - Renders head ellipse and 2 eyes
- `drawSpots()` (lines 411-442) - Renders spot pattern with ellipses

**Animation system**:
```javascript
// Body wave (line 133)
const y = Math.sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);

// Tail sway (line 266) - independent phase offset
const tailSway = Math.sin(waveTime - 2.5 - t * 2) * 3 * sizeScale * (0.5 + t * 0.5);
```

**Current rendering characteristics**:
- **Body**: 20 vertices (~10 segments × 2 edges) using `curveVertex()`
- **Tail**: 14 vertices (7 tail points × 2 edges) using `curveVertex()`
- **Spots**: 2-8 ellipses per koi, procedurally positioned on segments
- **Performance**: ~800 body/fin draws + ~1,200 spot draws = 2,000 draws/frame (80 koi)

### Completed Preparatory Work

✅ **Research documentation**:
- File: `/Users/seankim/dev/visualizations/thoughts/research/2025-10-22-koi-rendering-system-body-part-structure-for-svg-transition.md`
- Documents all 8 body parts, segment system, animation formulas, SVG conversion strategy

✅ **Asset structure created**:
- Directory: `/Users/seankim/dev/visualizations/assets/koi/`
- Subdirectories: `body-parts/`, `brushstrokes/`, `templates/`
- Template SVG files: `body.svg`, `tail.svg`, `dorsal-fin.svg` (lines 1-37 each)

✅ **SVG templates authored**:
- `body.svg` (line 24): Polygon with ~20 points, 160×80 viewBox, Illustrator-generated
- `tail.svg` (lines 26-35): Smooth cubic Bezier path, 60×30 viewBox, fan shape
- `dorsal-fin.svg`: Available (not yet read, but confirmed to exist)

✅ **Existing modules ready for integration**:
- `BrushTextures` class (line 89 of simulation-app.js): Already generates procedural brush textures
- `PixelBuffer` (line 64): Handles downsampled rendering (4x by default)
- `KoiRenderer` (line 93): Core renderer, ready to be extended

---

## Requirements Analysis

### Functional Requirements

**FR-1: SVG Path Parsing**
- Parse SVG `<path>` element `d` attribute to extract Bezier curve commands (M, L, C, Q, Z)
- Convert SVG path to array of `{x, y}` vertex coordinates
- Support both cubic (`C`) and quadratic (`Q`) Bezier curves
- Normalize coordinates to koi body dimensions (16×8 units)
- Sample path at configurable intervals (default: ~20 points for body, ~14 for tail)

**FR-2: SVG Vertex Deformation**
- Map each SVG vertex to corresponding body segment (0-9) based on X position
- Apply segment wave offset to vertex Y position: `vertex.y += segment.y`
- Maintain same wave animation formula: `sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2)`
- Support independent tail sway with different phase offset
- Preserve multi-layer sumi-e rendering with deformed vertices

**FR-3: Bitmap Brushstroke System**
- Load PNG brushstroke images from `/assets/koi/brushstrokes/` directory
- Organize brushstrokes by color category (red, black, white, orange, blue, generic)
- Select random brushstroke variant based on spot HSB color
- Apply color tinting to brushstroke PNG using p5.js `tint()`
- Render brushstroke at spot position with size scaling
- Support multi-layer rendering (3 layers with opacity [0.3, 0.75, 0.3])

**FR-4: Asset Loading and Management**
- Load SVG files in p5.js `preload()` function
- Parse SVGs to vertex arrays once (cache results)
- Load PNG brushstrokes in `preload()` (reuse existing `BrushTextures` pattern)
- Pass parsed SVG data to `KoiRenderer` constructor
- Graceful fallback: if SVG missing, use procedural rendering
- Graceful fallback: if brushstroke missing, use procedural ellipse

**FR-5: Rendering Integration**
- Replace procedural body generation with SVG vertex rendering
- Replace procedural tail generation with SVG vertex rendering
- Replace ellipse spot rendering with PNG image rendering
- Maintain exact same rendering order: Fins → Tail → Body → Head → Spots
- Support toggling between SVG and procedural modes for debugging

### Technical Requirements

**TR-1: Performance**
- Maintain 60fps on desktop (1920×1080) with 80 koi
- Maintain 30fps on mobile (iPhone 13) with 30 koi
- SVG parsing must complete in <500ms during preload
- Target: <2,500 draw calls per frame (same as current system)
- Pixel buffer downsampling (4x) reduces rendering load

**TR-2: Browser Compatibility**
- Use native browser SVG parsing APIs (no third-party libraries)
- Leverage `SVGPathElement.getPointAtLength()` for vertex extraction
- Support modern browsers: Chrome 90+, Firefox 88+, Safari 14+
- Fallback for unsupported features: use procedural rendering

**TR-3: Asset Management**
- SVG files must be valid XML with single `<path>` element
- SVG viewBox must match expected dimensions (160×80 for body, 60×30 for tail)
- PNG brushstrokes must be transparent background, black/grayscale ink
- Asset loading errors must log warnings but not crash application

**TR-4: Code Organization**
- Create new module: `/flocking/src/core/svg-parser.js` (~200 lines)
- Create new module: `/flocking/src/rendering/brushstroke-library.js` (~150 lines)
- Modify existing: `/flocking/src/core/koi-renderer.js` (add ~150 lines)
- Modify existing: `/flocking/src/apps/simulation-app.js` (add ~50 lines)
- No modifications to: `koi-params.js`, `boid.js`, `flock-manager.js`

### Out of Scope

**Not included in this implementation**:
- ❌ SVG authoring tools or editor UI (user uses Illustrator)
- ❌ Runtime SVG editing or manipulation
- ❌ Conversion of fins (pectoral, ventral) to SVG (keep procedural ellipses)
- ❌ Conversion of head/eyes to SVG (keep procedural ellipses)
- ❌ Brushstroke generation tools (user provides PNG assets)
- ❌ Advanced SVG features: gradients, filters, multiple paths, text
- ❌ Undo/redo for asset changes (refresh page to reload assets)
- ❌ Asset hot-reloading (requires manual page refresh)

---

## Architecture Design

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    simulation-app.js                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ preload()                                             │  │
│  │  - Load SVG files (body.svg, tail.svg, etc.)         │  │
│  │  - Load PNG brushstrokes                             │  │
│  │  - Parse SVGs → vertex arrays (SVGParser)            │  │
│  │  - Initialize BrushstrokeLibrary                     │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ setup()                                               │  │
│  │  - Pass parsed SVG data to KoiRenderer               │  │
│  │  - Pass BrushstrokeLibrary to KoiRenderer            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      KoiRenderer                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ constructor(brushTextures, svgAssets)                 │  │
│  │  - Store parsed SVG vertex arrays                    │  │
│  │  - Store brushstroke library reference               │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ render()                                              │  │
│  │  - Calculate segments (existing)                     │  │
│  │  - drawFins() [procedural - unchanged]               │  │
│  │  - drawTailFromSVG() [NEW - SVG vertices]            │  │
│  │  - drawBodyFromSVG() [NEW - SVG vertices]            │  │
│  │  - drawHead() [procedural - unchanged]               │  │
│  │  - drawSpotsWithBrushstrokes() [NEW - PNG images]    │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ drawBodyFromSVG()                                     │  │
│  │  - Map SVG vertices to segments                      │  │
│  │  - Apply wave deformation: vertex.y += segment.y     │  │
│  │  - Render with curveVertex()                         │  │
│  │  - Multi-layer sumi-e rendering                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ↓                                   ↓
┌─────────────────────┐          ┌─────────────────────────┐
│    SVGParser        │          │  BrushstrokeLibrary     │
│                     │          │                         │
│ - parseSVGFile()    │          │ - loadBrushstrokes()    │
│ - parsePathData()   │          │ - getRandomBrush()      │
│ - extractVertices() │          │ - categorizeByColor()   │
│ - normalizeCoords() │          │                         │
└─────────────────────┘          └─────────────────────────┘
```

### Data Flow

**Asset Loading Flow** (preload phase):
```
1. p5.js preload() called
   ↓
2. Load SVG text files → SVGParser.parseSVGFile()
   ↓
3. Extract <path> d attribute → SVGParser.parsePathData()
   ↓
4. Sample path at intervals → SVGParser.extractVertices()
   ↓
5. Normalize to koi dimensions → vertex array [{x,y}, ...]
   ↓
6. Store in koiAssets object
   ↓
7. Load PNG brushstrokes → BrushstrokeLibrary.loadBrushstrokes()
   ↓
8. Categorize by color (red, black, white, etc.)
```

**Rendering Flow** (draw phase, per frame):
```
1. For each boid in flock:
   ↓
2. Calculate 10 segment positions (existing wave animation)
   ↓
3. Render fins (procedural - unchanged)
   ↓
4. Render tail:
   - Get parsed tail vertices from koiAssets
   - For each vertex: map to position along tail (t = 0 to 1)
   - Apply tail sway: sin(waveTime - 2.5 - t * 2) * 3 * ...
   - Render with curveVertex()
   ↓
5. Render body:
   - Get parsed body vertices from koiAssets
   - For each vertex: map to segment (based on vertex.x position)
   - Apply segment wave offset: vertex.y += segment.y
   - Render with curveVertex()
   ↓
6. Render head (procedural - unchanged)
   ↓
7. Render spots:
   - For each spot in boid.pattern.spots:
     - Get segment position
     - BrushstrokeLibrary.getRandomBrush(spot.color)
     - Apply color tinting: context.tint(spot.color)
     - Render PNG image at position
```

### Module Design

#### Module 1: SVGParser

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/svg-parser.js`

**Purpose**: Parse SVG files to vertex arrays that can be deformed by wave animation

**Interface**:
```javascript
export class SVGParser {
  /**
   * Parse SVG file text to vertex array
   * @param {string} svgText - Raw SVG file content
   * @param {number} numPoints - Number of vertices to extract (default: 20)
   * @param {Object} targetDimensions - Target width/height for normalization
   * @returns {Array<{x, y}>} - Array of vertex coordinates
   */
  static parseSVGFile(svgText, numPoints = 20, targetDimensions = null) {
    // 1. Parse XML to DOM
    // 2. Extract <path> element
    // 3. Get 'd' attribute
    // 4. Return parsePathData(d, numPoints, targetDimensions)
  }

  /**
   * Parse SVG path 'd' attribute to vertices
   * @param {string} pathData - SVG path 'd' attribute (e.g., "M 10,20 L 30,40 ...")
   * @param {number} numPoints - Number of vertices to sample
   * @param {Object} targetDimensions - Optional {width, height} for normalization
   * @returns {Array<{x, y}>} - Sampled vertices
   */
  static parsePathData(pathData, numPoints = 20, targetDimensions = null) {
    // 1. Create temporary SVG element in browser DOM
    // 2. Use SVGPathElement.getTotalLength()
    // 3. Sample at even intervals: getPointAtLength(i / numPoints * length)
    // 4. Normalize coordinates if targetDimensions provided
    // 5. Return vertex array
  }

  /**
   * Normalize vertices to target dimensions
   * @param {Array<{x, y}>} vertices - Raw vertices
   * @param {number} targetWidth - Target width
   * @param {number} targetHeight - Target height
   * @returns {Array<{x, y}>} - Normalized vertices
   */
  static normalizeVertices(vertices, targetWidth, targetHeight) {
    // 1. Find bounding box of vertices (min/max x/y)
    // 2. Calculate scale factors
    // 3. Transform vertices to center origin and scale
    // 4. Return normalized vertices
  }
}
```

**Key algorithms**:

1. **Path sampling** (using native browser API):
```javascript
// Create temporary SVG element
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path.setAttribute('d', pathData);
svg.appendChild(path);
document.body.appendChild(svg);

// Sample path at intervals
const length = path.getTotalLength();
const vertices = [];
for (let i = 0; i <= numPoints; i++) {
  const point = path.getPointAtLength((i / numPoints) * length);
  vertices.push({ x: point.x, y: point.y });
}

// Cleanup
document.body.removeChild(svg);
```

2. **Coordinate normalization**:
```javascript
// Find bounds
const minX = Math.min(...vertices.map(v => v.x));
const maxX = Math.max(...vertices.map(v => v.x));
const minY = Math.min(...vertices.map(v => v.y));
const maxY = Math.max(...vertices.map(v => v.y));

const currentWidth = maxX - minX;
const currentHeight = maxY - minY;

// Scale and center
const scaleX = targetWidth / currentWidth;
const scaleY = targetHeight / currentHeight;

return vertices.map(v => ({
  x: (v.x - minX - currentWidth/2) * scaleX,
  y: (v.y - minY - currentHeight/2) * scaleY
}));
```

**Error handling**:
- Validate SVG is valid XML (try/catch on DOMParser)
- Check for `<path>` element existence
- Handle empty or malformed `d` attribute
- Return `null` on error (renderer falls back to procedural)

---

#### Module 2: BrushstrokeLibrary

**File**: `/Users/seankim/dev/visualizations/flocking/src/rendering/brushstroke-library.js`

**Purpose**: Manage PNG brushstroke textures for spot rendering

**Interface**:
```javascript
export class BrushstrokeLibrary {
  constructor() {
    this.brushes = {
      red: [],      // Hue: 0-30, 330-360
      orange: [],   // Hue: 30-60
      black: [],    // Saturation: <20
      white: [],    // Brightness: >80, Saturation: <20
      blue: [],     // Hue: 180-240
      generic: []   // Fallback for any color
    };
    this.isReady = false;
  }

  /**
   * Load brushstroke PNG images from assets directory
   * @param {Function} loadImageFunc - p5.js loadImage function
   * @returns {Promise} - Resolves when all images loaded
   */
  async loadBrushstrokes(loadImageFunc) {
    // 1. Define brushstroke file list (or scan directory)
    // 2. Load each PNG with loadImageFunc
    // 3. Categorize by filename convention (e.g., "red-01.png", "black-02.png")
    // 4. Store in this.brushes object
    // 5. Set this.isReady = true
  }

  /**
   * Get random brushstroke for a spot color
   * @param {Object} spotColor - HSB color {h, s, b}
   * @returns {p5.Image} - Random brushstroke texture
   */
  getRandomBrush(spotColor) {
    // 1. Categorize spot color (red, black, white, etc.)
    // 2. Get category array from this.brushes
    // 3. Return random element from array
    // 4. Fallback to generic if category empty
  }

  /**
   * Categorize HSB color to brushstroke category
   * @param {Object} color - HSB color {h, s, b}
   * @returns {string} - Category name (red, black, white, etc.)
   */
  categorizeColor(color) {
    // 1. Check saturation: if <20, return 'black' or 'white' based on brightness
    // 2. Check hue ranges:
    //    - 0-30 or 330-360: 'red'
    //    - 30-60: 'orange'
    //    - 180-240: 'blue'
    // 3. Fallback: 'generic'
  }
}
```

**Asset structure**:
```
/assets/koi/brushstrokes/
  ├── red-01.png
  ├── red-02.png
  ├── red-03.png
  ├── black-01.png
  ├── black-02.png
  ├── white-01.png
  ├── white-02.png
  ├── orange-01.png
  ├── blue-01.png
  └── generic-01.png
```

**PNG requirements**:
- Transparent background (RGBA)
- Black/grayscale ink strokes
- Recommended size: 128×128 pixels (scaled at render time)
- Organic, brushstroke-like appearance

**Color categorization logic**:
```javascript
categorizeColor(color) {
  const { h, s, b } = color;

  // Low saturation → black/white
  if (s < 20) {
    return b > 80 ? 'white' : 'black';
  }

  // High saturation → categorize by hue
  if ((h >= 0 && h < 30) || (h >= 330 && h <= 360)) return 'red';
  if (h >= 30 && h < 60) return 'orange';
  if (h >= 180 && h < 240) return 'blue';

  return 'generic';
}
```

---

#### Module 3: KoiRenderer (Modified)

**File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

**Changes**: Add ~150 lines

**New constructor signature**:
```javascript
constructor(brushTextures = null, svgAssets = null) {
  this.brushTextures = brushTextures;
  this.svgAssets = svgAssets; // NEW
  this.brushstrokeLibrary = null; // NEW
  this.useSumieStyle = brushTextures !== null && brushTextures.isReady;
}
```

**New property: svgAssets structure**:
```javascript
{
  body: [
    {x: -8, y: 0},
    {x: -6.5, y: -3.2},
    {x: -4.8, y: -3.8},
    // ... ~20 vertices total
  ],
  tail: [
    {x: 0, y: -0.2},
    {x: -1.2, y: -1.0},
    // ... ~14 vertices total
  ],
  dorsalFin: [
    {x: 0, y: 0},
    {x: -1, y: -2},
    {x: 1, y: -2.5},
    {x: 2, y: -1.5},
    {x: 2, y: 0}
  ]
}
```

**New methods**:

**1. `drawBodyFromSVG()`** (~50 lines):
```javascript
drawBodyFromSVG(context, segmentPositions, vertices, shapeParams, sizeScale, hue, saturation, brightness) {
  // Multi-layer rendering loop (1 or 3 layers)
  for (let layer = 0; layer < layers; layer++) {
    const offset = this.useSumieStyle ? (layer - 1) * 0.3 : 0;
    const opacity = this.useSumieStyle ? (layer === 1 ? 0.7 : 0.3) : 0.92;

    context.fill(hue, saturation, brightness - 2, opacity);
    context.beginShape();

    // Add first vertex twice for smooth curveVertex start
    context.curveVertex(/* first vertex */);
    context.curveVertex(/* first vertex */);

    // Deform each vertex based on segment position
    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];

      // Map vertex X position to segment index
      // Body extends from x=7 (front) to x=-9 (back) in segment coordinates
      // Vertices are normalized to this range
      const segmentIndex = this.mapVertexToSegment(vertex.x, segmentPositions);

      const seg = segmentPositions[segmentIndex];

      // Apply wave deformation
      const deformedX = vertex.x * sizeScale;
      const deformedY = vertex.y * sizeScale + seg.y + offset;

      context.curveVertex(deformedX, deformedY);
    }

    // Add last vertex twice for smooth curveVertex end
    context.curveVertex(/* last vertex */);
    context.curveVertex(/* last vertex */);

    context.endShape(context.CLOSE);
  }

  // Skip segment lines for sumi-e style
  context.noStroke();
}
```

**Vertex-to-segment mapping**:
```javascript
mapVertexToSegment(vertexX, segmentPositions) {
  // Body segments span x = 7 (front, segment 0) to x = -9 (back, segment 9)
  // Total body length: 16 units
  const bodyFrontX = 7;
  const bodyBackX = -9;
  const bodyLength = bodyFrontX - bodyBackX; // 16

  // Normalize vertex X to 0-1 range
  const t = (bodyFrontX - vertexX) / bodyLength;

  // Clamp to valid range
  const tClamped = Math.max(0, Math.min(1, t));

  // Map to segment index
  const segmentIndex = Math.floor(tClamped * (segmentPositions.length - 1));

  return Math.min(segmentIndex, segmentPositions.length - 1);
}
```

**2. `drawTailFromSVG()`** (~50 lines):
```javascript
drawTailFromSVG(context, segmentPositions, vertices, shapeParams, waveTime, sizeScale, tailLength, hue, saturation, brightness) {
  const tailBase = segmentPositions[segmentPositions.length - 1];

  // Multi-layer rendering loop
  for (let layer = 0; layer < layers; layer++) {
    const offset = this.useSumieStyle ? (layer - 1) * 0.4 : 0;
    const opacity = this.useSumieStyle ? (layer === 1 ? 0.7 : 0.25) : 0.8;

    context.fill(hue, saturation + 5, brightness - 12, opacity);
    context.beginShape();

    // Add first vertex twice
    context.curveVertex(/* first vertex */);
    context.curveVertex(/* first vertex */);

    // Deform each vertex with tail sway
    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];

      // Map vertex X position to tail position (0 = base, 1 = tip)
      // Tail extends backwards from body (negative X direction)
      // Vertices are normalized to tail length
      const t = i / (vertices.length - 1); // Simple linear mapping

      // Apply tail sway formula (independent from body wave)
      const tailSway = Math.sin(waveTime - 2.5 - t * 2) * 3 * sizeScale * (0.5 + t * 0.5);

      // Position relative to tail base
      const deformedX = tailBase.x + vertex.x * sizeScale * tailLength;
      const deformedY = tailBase.y + vertex.y * sizeScale + tailSway + offset;

      context.curveVertex(deformedX, deformedY);
    }

    // Add last vertex twice
    context.curveVertex(/* last vertex */);
    context.curveVertex(/* last vertex */);

    context.endShape(context.CLOSE);
  }
}
```

**3. `drawSpotsWithBrushstrokes()`** (~40 lines):
```javascript
drawSpotsWithBrushstrokes(context, segmentPositions, spots, sizeScale) {
  if (!this.brushstrokeLibrary || !this.brushstrokeLibrary.isReady) {
    // Fallback to ellipse rendering
    this.drawSpots(context, segmentPositions, spots, sizeScale);
    return;
  }

  for (let spot of spots) {
    if (spot.segment >= segmentPositions.length) continue;

    const seg = segmentPositions[spot.segment];
    const spotSize = spot.size * sizeScale;
    const spotX = seg.x;
    const spotY = seg.y + spot.offsetY * sizeScale;

    // Get random brushstroke for this spot color
    const brushstroke = this.brushstrokeLibrary.getRandomBrush(spot.color);

    // Multi-layer rendering for sumi-e style
    if (this.useSumieStyle) {
      for (let layer = 0; layer < 3; layer++) {
        const offset = (layer - 1) * 0.2;
        const sizeVariation = 1 + (layer - 1) * 0.1;
        const opacity = layer === 1 ? 0.75 : 0.3;

        // Apply color tinting to brushstroke
        context.push();
        context.tint(spot.color.h, spot.color.s, spot.color.b, opacity * 100);
        context.image(
          brushstroke,
          spotX + offset - spotSize * sizeVariation / 2,
          spotY + offset - spotSize * sizeVariation / 2,
          spotSize * sizeVariation,
          spotSize * sizeVariation
        );
        context.noTint();
        context.pop();
      }
    } else {
      // Single layer
      context.push();
      context.tint(spot.color.h, spot.color.s, spot.color.b, 85);
      context.image(brushstroke, spotX - spotSize/2, spotY - spotSize/2, spotSize, spotSize);
      context.noTint();
      context.pop();
    }
  }
}
```

**Modified `render()` method** (lines 71-122):
- Change line 115: `this.drawBody(...)` → check if SVG available, call `this.drawBodyFromSVG()` or `this.drawBody()`
- Change line 114: `this.drawTail(...)` → check if SVG available, call `this.drawTailFromSVG()` or `this.drawTail()`
- Change line 117: `this.drawSpots(...)` → check if brushstrokes available, call `this.drawSpotsWithBrushstrokes()` or `this.drawSpots()`

```javascript
render(context, x, y, angle, params) {
  // ... existing code (lines 72-112) unchanged ...

  // Fins (unchanged)
  this.drawFins(context, segmentPositions, shapeParams, waveTime, finalSizeScale, hue, saturation, brightness);

  // Tail (SVG or procedural)
  if (this.svgAssets && this.svgAssets.tail) {
    this.drawTailFromSVG(context, segmentPositions, this.svgAssets.tail, shapeParams, waveTime, finalSizeScale, tailLength, hue, saturation, brightness);
  } else {
    this.drawTail(context, segmentPositions, shapeParams, waveTime, finalSizeScale, tailLength, hue, saturation, brightness);
  }

  // Body (SVG or procedural)
  if (this.svgAssets && this.svgAssets.body) {
    this.drawBodyFromSVG(context, segmentPositions, this.svgAssets.body, shapeParams, finalSizeScale, hue, saturation, brightness);
  } else {
    this.drawBody(context, segmentPositions, shapeParams, finalSizeScale, hue, saturation, brightness);
  }

  // Head (unchanged)
  this.drawHead(context, segmentPositions[0], shapeParams, finalSizeScale, hue, saturation, brightness);

  // Spots (brushstrokes or procedural)
  if (this.brushstrokeLibrary && this.brushstrokeLibrary.isReady) {
    this.drawSpotsWithBrushstrokes(context, segmentPositions, pattern.spots || [], finalSizeScale);
  } else {
    this.drawSpots(context, segmentPositions, pattern.spots || [], finalSizeScale);
  }

  // ... existing code (lines 119-122) unchanged ...
}
```

---

#### Module 4: simulation-app.js (Modified)

**File**: `/Users/seankim/dev/visualizations/flocking/src/apps/simulation-app.js`

**Changes**: Add ~50 lines to `preload()` and modify `setup()`

**Modified `preload()` function** (lines 52-54):
```javascript
// Global variables (add at top)
let svgAssets = null;
let brushstrokeLibrary = null;

window.preload = function() {
  // Existing background image loading
  backgroundImage = loadImage('assets/water-background.png');

  // NEW: Load SVG assets
  try {
    const bodySVGText = loadStrings('assets/koi/body-parts/body.svg');
    const tailSVGText = loadStrings('assets/koi/body-parts/tail.svg');
    const dorsalFinSVGText = loadStrings('assets/koi/body-parts/dorsal-fin.svg');

    // Parse SVGs to vertex arrays
    svgAssets = {
      body: SVGParser.parseSVGFile(
        bodySVGText.join('\n'),
        20, // 20 vertices for body
        { width: 16, height: 8 } // Body dimensions in koi units
      ),
      tail: SVGParser.parseSVGFile(
        tailSVGText.join('\n'),
        14, // 14 vertices for tail
        { width: 6, height: 3 } // Tail dimensions
      ),
      dorsalFin: SVGParser.parseSVGFile(
        dorsalFinSVGText.join('\n'),
        5, // 5 vertices for dorsal fin
        { width: 2, height: 2.5 }
      )
    };

    console.log('✅ SVG assets loaded:', Object.keys(svgAssets));
  } catch (err) {
    console.warn('⚠️ Failed to load SVG assets, using procedural rendering:', err);
    svgAssets = null;
  }

  // NEW: Load brushstroke library
  try {
    brushstrokeLibrary = new BrushstrokeLibrary();

    // Define brushstroke file list
    const brushstrokeFiles = [
      'red-01.png', 'red-02.png', 'red-03.png',
      'black-01.png', 'black-02.png',
      'white-01.png', 'white-02.png',
      'orange-01.png', 'blue-01.png',
      'generic-01.png'
    ];

    // Load each brushstroke PNG
    for (const filename of brushstrokeFiles) {
      const img = loadImage(`assets/koi/brushstrokes/${filename}`);
      const category = filename.split('-')[0]; // Extract category from filename
      brushstrokeLibrary.brushes[category].push(img);
    }

    brushstrokeLibrary.isReady = true;
    console.log('✅ Brushstroke library loaded:', brushstrokeFiles.length, 'images');
  } catch (err) {
    console.warn('⚠️ Failed to load brushstrokes, using ellipse spots:', err);
    brushstrokeLibrary = null;
  }
};
```

**Note on p5.js loading**: p5.js `loadStrings()` is synchronous in `preload()` - the sketch waits until all assets load before calling `setup()`. Error handling ensures graceful fallback.

**Modified `setup()` function** (line 57):
```javascript
window.setup = function() {
  // ... existing code (lines 58-90) unchanged ...

  // Initialize koi renderer with brush textures AND SVG assets
  renderer = new KoiRenderer(brushTextures, svgAssets); // Modified line 93

  // Pass brushstroke library to renderer
  if (brushstrokeLibrary && brushstrokeLibrary.isReady) {
    renderer.brushstrokeLibrary = brushstrokeLibrary;
  }

  // ... existing code (lines 95-122) unchanged ...
};
```

---

### Design Trade-offs

| Decision | Alternative | Rationale |
|----------|-------------|-----------|
| **Native browser SVG API** | Third-party library (svg-path-properties) | ✅ No dependencies, faster load time, browser-optimized<br>❌ Library may have more features |
| **Sample path at intervals** | Parse Bezier math manually | ✅ Simpler, leverages browser implementation<br>❌ Less control over sampling |
| **Hybrid system (SVG + procedural)** | Pure SVG for all parts | ✅ Pragmatic, preserves simple shapes as procedural<br>❌ Inconsistent asset management |
| **Brushstrokes in BrushstrokeLibrary** | Extend BrushTextures class | ✅ Cleaner separation of concerns<br>❌ Two similar classes |
| **Color-based brushstroke selection** | Random selection only | ✅ More organic variation per koi variety<br>❌ Requires more PNG assets |
| **Fallback to procedural** | Crash if assets missing | ✅ Robust, works without assets<br>❌ Silent failures may hide issues |
| **Parse SVGs in preload()** | Parse on-demand in render() | ✅ One-time cost, faster rendering<br>❌ Longer initial load |

### Alternative Approaches Considered

**1. Runtime SVG manipulation** (rejected):
- Idea: Keep SVG as DOM elements, manipulate with CSS transforms
- Pros: No parsing needed, SVG stays vector
- Cons: Performance issues with 80+ animated SVGs, DOM overhead, no pixel buffer integration

**2. Pre-baked vertex data** (rejected):
- Idea: Manually define vertex arrays in JS, skip SVG parsing
- Pros: No parsing overhead, predictable
- Cons: Loses SVG authoring workflow, hard to edit shapes

**3. WebGL shader-based deformation** (deferred):
- Idea: Use vertex shaders to apply wave deformation on GPU
- Pros: Much faster for 100+ koi
- Cons: Complex implementation, overkill for current performance (60fps achieved)

---

## Phase-by-Phase Implementation

### Phase 1: SVG Parser Infrastructure

**Goal**: Create module to parse SVG files and extract vertex arrays

**Duration**: 4-6 hours

**Prerequisites**: None

**Deliverables**:

1. **Create `/Users/seankim/dev/visualizations/flocking/src/core/svg-parser.js`** (~200 lines)
   - Implement `SVGParser` class with static methods
   - `parseSVGFile(svgText, numPoints, targetDimensions)` - main parsing function
   - `parsePathData(pathData, numPoints, targetDimensions)` - path sampling
   - `normalizeVertices(vertices, targetWidth, targetHeight)` - coordinate transformation

2. **Path sampling using native browser API**:
   ```javascript
   // Key algorithm (lines 40-60 of svg-parser.js)
   static parsePathData(pathData, numPoints = 20, targetDimensions = null) {
     // Create temporary SVG element
     const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
     const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
     path.setAttribute('d', pathData);
     svg.appendChild(path);
     document.body.appendChild(svg);

     // Sample path at even intervals
     const length = path.getTotalLength();
     const vertices = [];
     for (let i = 0; i <= numPoints; i++) {
       const point = path.getPointAtLength((i / numPoints) * length);
       vertices.push({ x: point.x, y: point.y });
     }

     // Cleanup
     document.body.removeChild(svg);

     // Normalize if dimensions provided
     if (targetDimensions) {
       return this.normalizeVertices(vertices, targetDimensions.width, targetDimensions.height);
     }

     return vertices;
   }
   ```

3. **Coordinate normalization**:
   ```javascript
   // Transform to center origin and scale to target dimensions (lines 70-90)
   static normalizeVertices(vertices, targetWidth, targetHeight) {
     // Find bounding box
     const xs = vertices.map(v => v.x);
     const ys = vertices.map(v => v.y);
     const minX = Math.min(...xs);
     const maxX = Math.max(...xs);
     const minY = Math.min(...ys);
     const maxY = Math.max(...ys);

     const currentWidth = maxX - minX;
     const currentHeight = maxY - minY;

     // Calculate scale (preserve aspect ratio - use minimum scale)
     const scaleX = targetWidth / currentWidth;
     const scaleY = targetHeight / currentHeight;
     const scale = Math.min(scaleX, scaleY);

     // Center origin and scale
     const centerX = minX + currentWidth / 2;
     const centerY = minY + currentHeight / 2;

     return vertices.map(v => ({
       x: (v.x - centerX) * scale,
       y: (v.y - centerY) * scale
     }));
   }
   ```

4. **Error handling**:
   - Validate SVG is valid XML (try/catch on `DOMParser.parseFromString()`)
   - Check for `<path>` element existence: `const pathElement = doc.querySelector('path')`
   - Handle empty or malformed `d` attribute: `if (!pathData || pathData.length === 0) return null`
   - Return `null` on any parsing error (caller falls back to procedural)
   - Log warnings to console for debugging

5. **Testing strategy**:
   - **Unit test**: Parse simple SVG path `"M 0,0 L 10,0 L 10,10 L 0,10 Z"` (square)
     - Expected: 4 vertices at corners
   - **Integration test**: Parse `body.svg` (exists at `/assets/koi/body-parts/body.svg`)
     - Expected: ~20 vertices
     - Verify vertices span expected range (X: -8 to 8, Y: -4 to 4)
   - **Edge case test**: Parse SVG with cubic Bezier curves (`C` commands)
     - Verify smooth sampling (no gaps or jumps)
   - **Error test**: Pass invalid XML, missing `<path>`, empty `d` attribute
     - Expected: Return `null`, log warning

**Files created**:
- `/Users/seankim/dev/visualizations/flocking/src/core/svg-parser.js` (new file, ~200 lines)

**Files modified**: None (standalone module)

**Success criteria**:
- ✅ Can parse `body.svg` and extract ~20 vertices
- ✅ Can parse `tail.svg` and extract ~14 vertices
- ✅ Vertices match SVG path shape (visual preview recommended)
- ✅ Coordinates normalized to target dimensions (body: 16×8, tail: 6×3)
- ✅ Handles errors gracefully (returns `null`, logs warning)

**Validation checkpoint**:
1. Create simple test HTML file:
   ```html
   <script type="module">
   import { SVGParser } from './svg-parser.js';

   fetch('../../assets/koi/body-parts/body.svg')
     .then(res => res.text())
     .then(svgText => {
       const vertices = SVGParser.parseSVGFile(svgText, 20, { width: 16, height: 8 });
       console.log('Parsed vertices:', vertices);

       // Visual preview
       const canvas = document.createElement('canvas');
       canvas.width = 400;
       canvas.height = 200;
       document.body.appendChild(canvas);
       const ctx = canvas.getContext('2d');

       ctx.translate(200, 100); // Center
       ctx.scale(10, 10); // Scale up for visibility

       ctx.beginPath();
       vertices.forEach((v, i) => {
         if (i === 0) ctx.moveTo(v.x, v.y);
         else ctx.lineTo(v.x, v.y);
       });
       ctx.closePath();
       ctx.stroke();
     });
   </script>
   ```

2. User reviews:
   - Vertex count correct (~20 for body)
   - Shape matches authored SVG visually
   - Console shows no errors

**Time estimate**: 4-6 hours

---

### Phase 2: Brushstroke Library System

**Goal**: Load and manage PNG brushstroke textures for spot rendering

**Duration**: 3-4 hours

**Prerequisites**: None (can run in parallel with Phase 1)

**Deliverables**:

1. **Create `/Users/seankim/dev/visualizations/flocking/src/rendering/brushstroke-library.js`** (~150 lines)
   - Implement `BrushstrokeLibrary` class
   - `loadBrushstrokes(loadImageFunc)` - loads PNG files
   - `getRandomBrush(spotColor)` - selects brush based on color
   - `categorizeColor(color)` - maps HSB to category (red, black, white, etc.)

2. **Asset structure**:
   ```
   /Users/seankim/dev/visualizations/assets/koi/brushstrokes/
     ├── red-01.png
     ├── red-02.png
     ├── red-03.png
     ├── black-01.png
     ├── black-02.png
     ├── white-01.png
     ├── white-02.png
     ├── orange-01.png
     ├── blue-01.png
     └── generic-01.png
   ```

3. **PNG brushstroke requirements**:
   - Transparent background (PNG with alpha channel)
   - Black/grayscale ink strokes (will be tinted at render time)
   - Recommended size: 128×128 pixels
   - Organic, irregular edges (simulates brush texture)

4. **Color categorization algorithm**:
   ```javascript
   // Lines 70-85 of brushstroke-library.js
   categorizeColor(color) {
     const { h, s, b } = color;

     // Low saturation → black/white (achromatic)
     if (s < 20) {
       return b > 80 ? 'white' : 'black';
     }

     // High saturation → categorize by hue
     // Red: 0-30° or 330-360° (wraps around hue wheel)
     if ((h >= 0 && h < 30) || (h >= 330 && h <= 360)) return 'red';

     // Orange: 30-60°
     if (h >= 30 && h < 60) return 'orange';

     // Blue: 180-240°
     if (h >= 180 && h < 240) return 'blue';

     // Fallback for any other color
     return 'generic';
   }
   ```

5. **Loading implementation**:
   ```javascript
   // Lines 20-50 of brushstroke-library.js
   loadBrushstrokes(loadImageFunc, brushstrokeFiles) {
     for (const filename of brushstrokeFiles) {
       try {
         const img = loadImageFunc(`assets/koi/brushstrokes/${filename}`);

         // Extract category from filename (e.g., "red-01.png" → "red")
         const category = filename.split('-')[0];

         if (!this.brushes[category]) {
           this.brushes[category] = [];
         }

         this.brushes[category].push(img);
       } catch (err) {
         console.warn(`⚠️ Failed to load brushstroke: ${filename}`, err);
       }
     }

     this.isReady = true;
     console.log(`✅ Loaded ${brushstrokeFiles.length} brushstrokes`);
   }
   ```

6. **Random selection**:
   ```javascript
   // Lines 55-68 of brushstroke-library.js
   getRandomBrush(spotColor) {
     const category = this.categorizeColor(spotColor);

     // Get brushes for this category
     const brushes = this.brushes[category];

     // Fallback to generic if category empty
     if (!brushes || brushes.length === 0) {
       console.warn(`⚠️ No brushstrokes for category: ${category}, using generic`);
       return this.brushes.generic[0] || null;
     }

     // Return random brush from category
     const randomIndex = Math.floor(Math.random() * brushes.length);
     return brushes[randomIndex];
   }
   ```

7. **Testing strategy**:
   - **Unit test**: Categorize sample colors
     - `{h: 10, s: 80, b: 60}` → 'red'
     - `{h: 45, s: 75, b: 70}` → 'orange'
     - `{h: 200, s: 70, b: 50}` → 'blue'
     - `{h: 0, s: 10, b: 20}` → 'black'
     - `{h: 0, s: 5, b: 90}` → 'white'
   - **Integration test**: Load 2-3 sample PNG brushstrokes
     - Verify images load successfully
     - Call `getRandomBrush()` for each category
     - Verify returns valid p5.Image object
   - **Edge case test**: Request brushstroke for category with no PNGs
     - Expected: Falls back to 'generic', logs warning

**Files created**:
- `/Users/seankim/dev/visualizations/flocking/src/rendering/brushstroke-library.js` (new file, ~150 lines)

**Files modified**: None (standalone module)

**Success criteria**:
- ✅ Can load PNG brushstroke images using p5.js `loadImage()`
- ✅ Can categorize spot colors correctly (red, black, white, orange, blue, generic)
- ✅ Can select random brushstroke variant for a spot color
- ✅ Falls back gracefully if brushstroke category empty (uses 'generic')
- ✅ `isReady` flag indicates successful loading

**Validation checkpoint**:
1. User creates 2-3 sample PNG brushstrokes:
   - Use image editor (Photoshop, GIMP, Procreate)
   - Draw organic black ink strokes on transparent background
   - Save as 128×128 PNG
   - Name: `red-01.png`, `black-01.png`, `generic-01.png`
   - Place in `/assets/koi/brushstrokes/`

2. Create test script:
   ```html
   <script type="module">
   import { BrushstrokeLibrary } from './brushstroke-library.js';

   const library = new BrushstrokeLibrary();

   // Mock loadImage function
   const mockLoadImage = (path) => {
     console.log('Loading:', path);
     return { path }; // Mock p5.Image
   };

   library.loadBrushstrokes(mockLoadImage, ['red-01.png', 'black-01.png', 'generic-01.png']);

   // Test color categorization
   const testColors = [
     { h: 10, s: 80, b: 60 },  // Red
     { h: 0, s: 10, b: 20 },   // Black
     { h: 0, s: 5, b: 90 }     // White
   ];

   testColors.forEach(color => {
     const category = library.categorizeColor(color);
     const brush = library.getRandomBrush(color);
     console.log(`Color ${JSON.stringify(color)} → ${category}, brush: ${brush ? '✅' : '❌'}`);
   });
   </script>
   ```

3. User reviews console output:
   - All brushstrokes load successfully
   - Color categorization matches expected values
   - Random brush selection returns valid objects

**Time estimate**: 3-4 hours

---

### Phase 3: SVG Body Rendering Integration

**Goal**: Render body using SVG vertices with wave deformation

**Duration**: 6-8 hours

**Prerequisites**: Phase 1 complete (SVG parser available)

**Deliverables**:

1. **Modify `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`**:
   - Update constructor to accept `svgAssets` parameter (line 14)
   - Add `drawBodyFromSVG()` method (~50 lines)
   - Add `mapVertexToSegment()` helper method (~15 lines)
   - Modify `render()` method to conditionally use SVG or procedural body (line 115)

2. **Constructor changes** (line 14):
   ```javascript
   // OLD:
   constructor(brushTextures = null) {
     this.brushTextures = brushTextures;
     this.useSumieStyle = brushTextures !== null && brushTextures.isReady;
   }

   // NEW:
   constructor(brushTextures = null, svgAssets = null) {
     this.brushTextures = brushTextures;
     this.svgAssets = svgAssets; // Store parsed SVG vertices
     this.useSumieStyle = brushTextures !== null && brushTextures.isReady;
   }
   ```

3. **Add `mapVertexToSegment()` helper** (new method, ~15 lines):
   ```javascript
   /**
    * Map SVG vertex X coordinate to body segment index
    * @param {number} vertexX - Vertex X coordinate (normalized to body length)
    * @param {Array} segmentPositions - Array of segment {x, y, w} objects
    * @returns {number} - Segment index (0-9)
    */
   mapVertexToSegment(vertexX, segmentPositions) {
     // Body segments span x = 7 (front, segment 0) to x = -9 (back, segment 9)
     const bodyFrontX = 7;
     const bodyBackX = -9;
     const bodyLength = bodyFrontX - bodyBackX; // 16 units

     // Normalize vertex X to 0-1 range (0 = front, 1 = back)
     const t = (bodyFrontX - vertexX) / bodyLength;

     // Clamp to valid range
     const tClamped = Math.max(0, Math.min(1, t));

     // Map to segment index
     const segmentIndex = Math.floor(tClamped * (segmentPositions.length - 1));

     return Math.min(segmentIndex, segmentPositions.length - 1);
   }
   ```

4. **Add `drawBodyFromSVG()` method** (new method, ~60 lines):
   ```javascript
   /**
    * Draw body outline using SVG vertices with wave deformation
    * @param {Object} context - p5 graphics context
    * @param {Array} segmentPositions - Array of segment {x, y, w} objects
    * @param {Array} vertices - SVG vertices [{x, y}, ...]
    * @param {Object} shapeParams - Shape parameters
    * @param {number} sizeScale - Size scaling factor
    * @param {number} hue - HSB hue
    * @param {number} saturation - HSB saturation
    * @param {number} brightness - HSB brightness
    */
   drawBodyFromSVG(context, segmentPositions, vertices, shapeParams, sizeScale, hue, saturation, brightness) {
     const layers = this.useSumieStyle ? 3 : 1;

     for (let layer = 0; layer < layers; layer++) {
       const offset = this.useSumieStyle ? (layer - 1) * 0.3 : 0;
       const opacity = this.useSumieStyle ? (layer === 1 ? 0.7 : 0.3) : 0.92;

       context.fill(hue, saturation, brightness - 2, opacity);
       context.beginShape();

       // Add first vertex twice for smooth curveVertex start
       const firstVertex = vertices[0];
       const firstSegmentIndex = this.mapVertexToSegment(firstVertex.x, segmentPositions);
       const firstSeg = segmentPositions[firstSegmentIndex];
       const firstX = firstVertex.x * sizeScale;
       const firstY = firstVertex.y * sizeScale + firstSeg.y + offset;
       context.curveVertex(firstX, firstY);
       context.curveVertex(firstX, firstY);

       // Render all vertices with deformation
       for (let i = 0; i < vertices.length; i++) {
         const vertex = vertices[i];

         // Map vertex to segment
         const segmentIndex = this.mapVertexToSegment(vertex.x, segmentPositions);
         const seg = segmentPositions[segmentIndex];

         // Apply wave deformation to Y position
         const deformedX = vertex.x * sizeScale;
         const deformedY = vertex.y * sizeScale + seg.y + offset;

         context.curveVertex(deformedX, deformedY);
       }

       // Add last vertex twice for smooth curveVertex end
       const lastVertex = vertices[vertices.length - 1];
       const lastSegmentIndex = this.mapVertexToSegment(lastVertex.x, segmentPositions);
       const lastSeg = segmentPositions[lastSegmentIndex];
       const lastX = lastVertex.x * sizeScale;
       const lastY = lastVertex.y * sizeScale + lastSeg.y + offset;
       context.curveVertex(lastX, lastY);
       context.curveVertex(lastX, lastY);

       context.endShape(context.CLOSE);
     }

     context.noStroke();
   }
   ```

5. **Modify `render()` method** (line 115):
   ```javascript
   // OLD:
   this.drawBody(context, segmentPositions, shapeParams, finalSizeScale, hue, saturation, brightness);

   // NEW:
   if (this.svgAssets && this.svgAssets.body) {
     this.drawBodyFromSVG(context, segmentPositions, this.svgAssets.body, shapeParams, finalSizeScale, hue, saturation, brightness);
   } else {
     this.drawBody(context, segmentPositions, shapeParams, finalSizeScale, hue, saturation, brightness);
   }
   ```

6. **Testing strategy**:
   - **Visual test**: Render single koi with SVG body, compare to procedural body
     - Position: center of canvas
     - Rotation: 0 radians
     - Animation: static (waveTime = 0)
     - Expected: SVG body shape visible, matches authored shape
   - **Animation test**: Render koi with wave animation
     - Increment waveTime continuously
     - Expected: Body undulates smoothly, wave motion matches procedural
   - **Multi-koi test**: Render 80 koi with SVG bodies
     - Expected: 60fps maintained (same as procedural)
   - **Fallback test**: Remove SVG assets, verify procedural rendering works
     - Expected: Koi still render using procedural `drawBody()`

**Files modified**:
- `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js` (+~80 lines)

**Success criteria**:
- ✅ Body renders using SVG vertices from `body.svg`
- ✅ Wave animation looks identical to procedural (smooth undulation)
- ✅ Shape matches authored SVG (visual inspection)
- ✅ Multi-layer sumi-e style works with SVG (soft edges)
- ✅ Performance: 60fps with 80 koi (same as procedural)
- ✅ Fallback to procedural if SVG missing (no crash)

**Validation checkpoint**:
1. User runs simulation with SVG body:
   - Open `/flocking/simulation.html` in browser
   - Verify body shape matches `body.svg` authored in Illustrator
   - Verify wave animation smooth and natural

2. Side-by-side comparison:
   - Screenshot procedural body (remove SVG assets temporarily)
   - Screenshot SVG body (re-add SVG assets)
   - Verify wave amplitude and phase match

3. Performance test:
   - Open browser DevTools → Performance tab
   - Record 10 seconds of simulation
   - Verify 60fps maintained (framerate graph)

**Time estimate**: 6-8 hours

---

### Phase 4: SVG Tail Rendering Integration

**Goal**: Render tail using SVG vertices with independent sway motion

**Duration**: 4-6 hours

**Prerequisites**: Phase 3 complete (body rendering working)

**Deliverables**:

1. **Add `drawTailFromSVG()` method to `koi-renderer.js`** (~50 lines):
   ```javascript
   /**
    * Draw tail using SVG vertices with independent sway motion
    * @param {Object} context - p5 graphics context
    * @param {Array} segmentPositions - Array of segment {x, y, w} objects
    * @param {Array} vertices - SVG vertices [{x, y}, ...]
    * @param {Object} shapeParams - Shape parameters
    * @param {number} waveTime - Animation time value
    * @param {number} sizeScale - Size scaling factor
    * @param {number} tailLength - Tail length multiplier
    * @param {number} hue - HSB hue
    * @param {number} saturation - HSB saturation
    * @param {number} brightness - HSB brightness
    */
   drawTailFromSVG(context, segmentPositions, vertices, shapeParams, waveTime, sizeScale, tailLength, hue, saturation, brightness) {
     const tailBase = segmentPositions[segmentPositions.length - 1];
     const layers = this.useSumieStyle ? 3 : 1;

     for (let layer = 0; layer < layers; layer++) {
       const offset = this.useSumieStyle ? (layer - 1) * 0.4 : 0;
       const opacity = this.useSumieStyle ? (layer === 1 ? 0.7 : 0.25) : 0.8;

       context.fill(hue, saturation + 5, brightness - 12, opacity);
       context.beginShape();

       // Add first vertex twice
       const firstVertex = vertices[0];
       const firstT = 0; // Base of tail
       const firstTailSway = Math.sin(waveTime - 2.5 - firstT * 2) * 3 * sizeScale * (0.5 + firstT * 0.5);
       const firstX = tailBase.x + firstVertex.x * sizeScale * tailLength;
       const firstY = tailBase.y + firstVertex.y * sizeScale + firstTailSway + offset;
       context.curveVertex(firstX, firstY);
       context.curveVertex(firstX, firstY);

       // Render all vertices with tail sway
       for (let i = 0; i < vertices.length; i++) {
         const vertex = vertices[i];

         // Map vertex index to tail position (0 = base, 1 = tip)
         const t = i / (vertices.length - 1);

         // Apply tail sway formula (independent from body wave)
         // Amplification increases toward tip: (0.5 + t * 0.5)
         const tailSway = Math.sin(waveTime - 2.5 - t * 2) * 3 * sizeScale * (0.5 + t * 0.5);

         // Position relative to tail base
         const deformedX = tailBase.x + vertex.x * sizeScale * tailLength;
         const deformedY = tailBase.y + vertex.y * sizeScale + tailSway + offset;

         context.curveVertex(deformedX, deformedY);
       }

       // Add last vertex twice
       const lastVertex = vertices[vertices.length - 1];
       const lastT = 1; // Tip of tail
       const lastTailSway = Math.sin(waveTime - 2.5 - lastT * 2) * 3 * sizeScale * (0.5 + lastT * 0.5);
       const lastX = tailBase.x + lastVertex.x * sizeScale * tailLength;
       const lastY = tailBase.y + lastVertex.y * sizeScale + lastTailSway + offset;
       context.curveVertex(lastX, lastY);
       context.curveVertex(lastX, lastY);

       context.endShape(context.CLOSE);
     }
   }
   ```

2. **Modify `render()` method** (line 114):
   ```javascript
   // OLD:
   this.drawTail(context, segmentPositions, shapeParams, waveTime, finalSizeScale, tailLength, hue, saturation, brightness);

   // NEW:
   if (this.svgAssets && this.svgAssets.tail) {
     this.drawTailFromSVG(context, segmentPositions, this.svgAssets.tail, shapeParams, waveTime, finalSizeScale, tailLength, hue, saturation, brightness);
   } else {
     this.drawTail(context, segmentPositions, shapeParams, waveTime, finalSizeScale, tailLength, hue, saturation, brightness);
   }
   ```

3. **Key differences from body rendering**:
   - **Position**: Tail base inherits position from last body segment (segment 9)
   - **Sway formula**: Independent phase offset (`waveTime - 2.5`)
   - **Amplification**: Increases from 50% (base) to 100% (tip): `(0.5 + t * 0.5)`
   - **Length scaling**: Tail length multiplier applied to X positions

4. **Testing strategy**:
   - **Visual test**: Render single koi with SVG tail
     - Verify tail attaches to body segment 9 correctly
     - Verify tail shape matches `tail.svg`
   - **Animation test**: Compare tail sway motion to procedural
     - Verify independent sway (different phase from body)
     - Verify amplification increases toward tip
     - Expected: Tail whips back and forth naturally
   - **Multi-koi test**: Render 80 koi with SVG tails
     - Expected: 60fps maintained
   - **Fallback test**: Remove SVG tail asset
     - Expected: Procedural tail rendering works

**Files modified**:
- `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js` (+~55 lines)

**Success criteria**:
- ✅ Tail renders using SVG vertices from `tail.svg`
- ✅ Independent sway motion works correctly (different phase from body)
- ✅ Tail connects to body segment 9 properly (no gap or overlap)
- ✅ Amplification at tip matches procedural (increased sway)
- ✅ Multi-layer sumi-e style works with SVG
- ✅ Performance: 60fps maintained

**Validation checkpoint**:
1. User runs simulation with SVG tail:
   - Verify tail shape matches `tail.svg` authored in Illustrator
   - Verify tail motion looks natural and fluid
   - Verify tail tip whips back and forth (amplified sway)

2. Compare to procedural tail:
   - Screenshot procedural tail (remove SVG assets temporarily)
   - Screenshot SVG tail (re-add SVG assets)
   - Verify sway amplitude matches
   - Verify connection to body segment 9 identical

3. Edge case test:
   - Test with `tailLength` parameter: 0.5, 1.0, 1.5
   - Verify tail scales correctly without breaking

**Time estimate**: 4-6 hours

---

### Phase 5: Brushstroke Spot Rendering

**Goal**: Replace ellipse spots with PNG brushstroke images

**Duration**: 5-7 hours

**Prerequisites**: Phase 2 complete (BrushstrokeLibrary available)

**Deliverables**:

1. **Add `drawSpotsWithBrushstrokes()` method to `koi-renderer.js`** (~50 lines):
   ```javascript
   /**
    * Draw spots using PNG brushstroke images instead of ellipses
    * @param {Object} context - p5 graphics context
    * @param {Array} segmentPositions - Array of segment {x, y, w} objects
    * @param {Array} spots - Array of spot objects {segment, offsetY, size, color}
    * @param {number} sizeScale - Size scaling factor
    */
   drawSpotsWithBrushstrokes(context, segmentPositions, spots, sizeScale) {
     if (!this.brushstrokeLibrary || !this.brushstrokeLibrary.isReady) {
       // Fallback to ellipse rendering
       this.drawSpots(context, segmentPositions, spots, sizeScale);
       return;
     }

     for (let spot of spots) {
       if (spot.segment >= segmentPositions.length) continue;

       const seg = segmentPositions[spot.segment];
       const spotSize = spot.size * sizeScale;
       const spotX = seg.x;
       const spotY = seg.y + spot.offsetY * sizeScale;

       // Get random brushstroke for this spot color
       const brushstroke = this.brushstrokeLibrary.getRandomBrush(spot.color);

       if (!brushstroke) {
         // Fallback to ellipse if no brushstroke available
         context.fill(spot.color.h, spot.color.s, spot.color.b, 0.85);
         context.ellipse(spotX, spotY, spotSize, spotSize * 0.8);
         continue;
       }

       // Multi-layer rendering for sumi-e style
       if (this.useSumieStyle) {
         for (let layer = 0; layer < 3; layer++) {
           const offset = (layer - 1) * 0.2;
           const sizeVariation = 1 + (layer - 1) * 0.1; // Slight size variation
           const opacity = layer === 1 ? 0.75 : 0.3;

           context.push();
           context.tint(spot.color.h, spot.color.s, spot.color.b, opacity * 100);
           context.image(
             brushstroke,
             spotX + offset - (spotSize * sizeVariation) / 2,
             spotY + offset - (spotSize * sizeVariation) / 2,
             spotSize * sizeVariation,
             spotSize * sizeVariation
           );
           context.noTint();
           context.pop();
         }
       } else {
         // Single layer (non-sumi-e)
         context.push();
         context.tint(spot.color.h, spot.color.s, spot.color.b, 85);
         context.image(
           brushstroke,
           spotX - spotSize / 2,
           spotY - spotSize / 2,
           spotSize,
           spotSize
         );
         context.noTint();
         context.pop();
       }
     }
   }
   ```

2. **Modify `render()` method** (line 117):
   ```javascript
   // OLD:
   this.drawSpots(context, segmentPositions, pattern.spots || [], finalSizeScale);

   // NEW:
   if (this.brushstrokeLibrary && this.brushstrokeLibrary.isReady) {
     this.drawSpotsWithBrushstrokes(context, segmentPositions, pattern.spots || [], finalSizeScale);
   } else {
     this.drawSpots(context, segmentPositions, pattern.spots || [], finalSizeScale);
   }
   ```

3. **Add property to constructor** (line 14):
   ```javascript
   constructor(brushTextures = null, svgAssets = null) {
     this.brushTextures = brushTextures;
     this.svgAssets = svgAssets;
     this.brushstrokeLibrary = null; // NEW - set by simulation-app.js
     this.useSumieStyle = brushTextures !== null && brushTextures.isReady;
   }
   ```

4. **Color tinting with p5.js**:
   - Use `context.tint(h, s, b, alpha)` in HSB mode
   - HSB color mode already set in `render()` (line 101)
   - `tint()` applies color overlay to image
   - Grayscale PNG + tint = colored brushstroke
   - `noTint()` resets after each image draw

5. **Testing strategy**:
   - **Visual test**: Render single koi with brushstroke spots
     - Verify spots appear as PNG images, not ellipses
     - Verify color tinting works (red spot → red brushstroke)
   - **Color test**: Test each category (red, black, white, orange, blue)
     - Create koi with spots of different colors
     - Verify correct brushstroke category selected
   - **Performance test**: Render 80 koi with brushstroke spots
     - Expected: 60fps maintained
     - Monitor draw calls: ~1,200 image draws/frame (80 koi × 5 spots × 3 layers)
   - **Fallback test**: Remove brushstroke PNGs
     - Expected: Ellipse spots render (fallback)

**Files modified**:
- `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js` (+~55 lines)

**Success criteria**:
- ✅ Spots render as PNG images instead of ellipses
- ✅ Color tinting works correctly (HSB mode preserved)
- ✅ Procedural placement identical to current system (segment-based)
- ✅ Multi-layer sumi-e style works with brushstrokes
- ✅ Performance acceptable: 60fps with 80 koi (1,200 image draws/frame)
- ✅ Fallback to ellipses if brushstroke missing

**Validation checkpoint**:
1. User creates sample brushstroke PNGs:
   - Use image editor to create 3-5 organic brush strokes
   - Black ink on transparent background
   - Save as 128×128 PNG
   - Place in `/assets/koi/brushstrokes/`

2. Visual comparison:
   - Screenshot ellipse spots (disable brushstrokes)
   - Screenshot brushstroke spots (enable brushstrokes)
   - Verify brushstrokes look more painterly and organic

3. Performance test:
   - Open browser DevTools → Performance tab
   - Record 10 seconds with brushstroke spots
   - Verify 60fps maintained (check framerate graph)
   - Compare to ellipse spot performance (should be similar)

**Time estimate**: 5-7 hours

---

### Phase 6: Asset Loading and Initialization

**Goal**: Load all assets and wire up the complete system

**Duration**: 4-5 hours

**Prerequisites**: Phases 1-5 complete (all modules implemented)

**Deliverables**:

1. **Modify `/Users/seankim/dev/visualizations/flocking/src/apps/simulation-app.js`**:
   - Add SVG loading in `preload()` function (lines 52-54)
   - Add brushstroke loading in `preload()`
   - Initialize `SVGParser` and parse SVGs
   - Initialize `BrushstrokeLibrary` and load PNGs
   - Pass parsed data to `KoiRenderer` in `setup()` (line 93)

2. **Add global variables** (top of file, after line 22):
   ```javascript
   // Add after line 22 (let backgroundImage;)
   let svgAssets = null;
   let brushstrokeLibrary = null;
   ```

3. **Import new modules** (top of file, after line 13):
   ```javascript
   import { SVGParser } from '../core/svg-parser.js';
   import { BrushstrokeLibrary } from '../rendering/brushstroke-library.js';
   ```

4. **Modify `preload()` function** (lines 52-54):
   ```javascript
   window.preload = function() {
     // Existing background image loading
     backgroundImage = loadImage('assets/water-background.png');

     // NEW: Load and parse SVG assets
     try {
       console.log('🔍 Loading SVG assets...');

       // Load SVG text files
       const bodySVGText = loadStrings('assets/koi/body-parts/body.svg');
       const tailSVGText = loadStrings('assets/koi/body-parts/tail.svg');
       const dorsalFinSVGText = loadStrings('assets/koi/body-parts/dorsal-fin.svg');

       // Parse SVGs to vertex arrays
       svgAssets = {
         body: SVGParser.parseSVGFile(
           bodySVGText.join('\n'),
           20, // 20 vertices for body
           { width: 16, height: 8 } // Body dimensions in koi units
         ),
         tail: SVGParser.parseSVGFile(
           tailSVGText.join('\n'),
           14, // 14 vertices for tail
           { width: 6, height: 3 } // Tail dimensions
         ),
         dorsalFin: SVGParser.parseSVGFile(
           dorsalFinSVGText.join('\n'),
           5, // 5 vertices for dorsal fin
           { width: 2, height: 2.5 } // Fin dimensions
         )
       };

       console.log('✅ SVG assets loaded and parsed:', Object.keys(svgAssets));
       console.log('   - Body vertices:', svgAssets.body ? svgAssets.body.length : 'N/A');
       console.log('   - Tail vertices:', svgAssets.tail ? svgAssets.tail.length : 'N/A');
       console.log('   - Dorsal fin vertices:', svgAssets.dorsalFin ? svgAssets.dorsalFin.length : 'N/A');
     } catch (err) {
       console.warn('⚠️ Failed to load SVG assets, using procedural rendering:', err);
       svgAssets = null;
     }

     // NEW: Load brushstroke library
     try {
       console.log('🖌️ Loading brushstroke library...');

       brushstrokeLibrary = new BrushstrokeLibrary();

       // Define brushstroke file list
       const brushstrokeFiles = [
         'red-01.png', 'red-02.png', 'red-03.png',
         'black-01.png', 'black-02.png',
         'white-01.png', 'white-02.png',
         'orange-01.png',
         'blue-01.png',
         'generic-01.png'
       ];

       // Load brushstrokes using BrushstrokeLibrary
       brushstrokeLibrary.loadBrushstrokes(loadImage, brushstrokeFiles);

       console.log('✅ Brushstroke library loaded:', brushstrokeFiles.length, 'images');
     } catch (err) {
       console.warn('⚠️ Failed to load brushstrokes, using ellipse spots:', err);
       brushstrokeLibrary = null;
     }
   };
   ```

5. **Modify `setup()` function** (line 93):
   ```javascript
   // OLD (line 93):
   renderer = new KoiRenderer(brushTextures);

   // NEW:
   renderer = new KoiRenderer(brushTextures, svgAssets);

   // Pass brushstroke library to renderer
   if (brushstrokeLibrary && brushstrokeLibrary.isReady) {
     renderer.brushstrokeLibrary = brushstrokeLibrary;
     console.log('✅ Brushstroke library connected to renderer');
   }
   ```

6. **Asset loading error handling**:
   - Wrap SVG loading in try/catch
   - If SVG fails to load, set `svgAssets = null` (renderer uses procedural)
   - Log warning to console for debugging
   - Wrap brushstroke loading in try/catch
   - If brushstrokes fail to load, set `brushstrokeLibrary = null` (renderer uses ellipses)

7. **Testing strategy**:
   - **Full system test**: Run simulation with all assets loaded
     - Verify console shows "✅ SVG assets loaded"
     - Verify console shows "✅ Brushstroke library loaded"
     - Verify 80 koi render with SVG bodies, tails, brushstroke spots
     - Verify 60fps maintained
   - **Asset missing test**: Remove one asset at a time
     - Remove `body.svg` → verify procedural body renders
     - Remove `tail.svg` → verify procedural tail renders
     - Remove brushstroke PNGs → verify ellipse spots render
     - Verify no crashes, warnings logged
   - **Startup time test**: Measure time from page load to first frame
     - Expected: <2 seconds (including asset parsing)

**Files modified**:
- `/Users/seankim/dev/visualizations/flocking/src/apps/simulation-app.js` (+~60 lines)

**Success criteria**:
- ✅ All assets load in preload phase (no blocking after setup)
- ✅ Console logs show successful loading and parsing
- ✅ SVG vertices correctly passed to `KoiRenderer`
- ✅ Brushstroke library correctly connected to `KoiRenderer`
- ✅ Falls back to procedural if SVG missing
- ✅ Falls back to ellipses if brushstrokes missing
- ✅ No errors or crashes during startup

**Validation checkpoint**:
1. User opens `/flocking/simulation.html` in browser
2. Open browser console (F12)
3. Verify console output:
   ```
   🐟 Koi Flocking - Desktop detected (1920x1080)
      Optimized defaults: 80 koi, pixel scale 4
   🔍 Loading SVG assets...
   ✅ SVG assets loaded and parsed: body, tail, dorsalFin
      - Body vertices: 20
      - Tail vertices: 14
      - Dorsal fin vertices: 5
   🖌️ Loading brushstroke library...
   ✅ Brushstroke library loaded: 10 images
   ✅ Brushstroke library connected to renderer
   ```

4. Visual verification:
   - 80 koi swimming smoothly
   - Body shapes match authored SVGs
   - Tail shapes match authored SVGs
   - Spots appear as brushstroke textures (not ellipses)
   - Animation smooth (60fps)

5. Fallback test:
   - Rename `body.svg` to `body.svg.bak` (simulate missing asset)
   - Refresh page
   - Verify console shows "⚠️ Failed to load SVG assets"
   - Verify koi still render using procedural body (no crash)
   - Restore `body.svg`

**Time estimate**: 4-5 hours

---

### Phase 7: Dorsal Fin SVG Rendering (Optional)

**Goal**: Convert dorsal fin to SVG (simple polygon)

**Duration**: 2-3 hours

**Prerequisites**: Phase 6 complete (full system working)

**Note**: This phase is **optional** and can be skipped if dorsal fin complexity doesn't benefit from SVG authoring. The current procedural dorsal fin (5-point polygon) is already simple and functional.

**Deliverables**:

1. **Add `drawDorsalFinFromSVG()` method to `koi-renderer.js`** (~30 lines):
   ```javascript
   /**
    * Draw dorsal fin using SVG vertices (static rotation)
    * @param {Object} context - p5 graphics context
    * @param {Object} dorsalPos - Segment position {x, y, w}
    * @param {Array} vertices - SVG vertices [{x, y}, ...]
    * @param {Object} shapeParams - Shape parameters
    * @param {number} sizeScale - Size scaling factor
    * @param {number} hue - HSB hue
    * @param {number} saturation - HSB saturation
    * @param {number} brightness - HSB brightness
    */
   drawDorsalFinFromSVG(context, dorsalPos, vertices, shapeParams, sizeScale, hue, saturation, brightness) {
     const layers = this.useSumieStyle ? 2 : 1;

     for (let layer = 0; layer < layers; layer++) {
       const offset = this.useSumieStyle ? (layer - 0.5) * 0.15 : 0;
       const opacity = this.useSumieStyle ? (layer === 0 ? 0.6 : 0.3) : 0.75;

       context.fill(hue, saturation + 8, brightness - 15, opacity);

       context.push();
       context.translate(dorsalPos.x, dorsalPos.y + shapeParams.dorsalY * sizeScale);
       context.rotate(-0.2); // Static rotation (same as procedural)

       context.beginShape();
       for (let vertex of vertices) {
         context.vertex(vertex.x * sizeScale, vertex.y * sizeScale + offset);
       }
       context.endShape(context.CLOSE);

       context.pop();
     }
   }
   ```

2. **Modify `drawFins()` method** (lines 200-218):
   ```javascript
   // Inside drawFins(), replace dorsal fin section (lines 200-218):

   // Dorsal fin (SVG or procedural)
   const dorsalPos = segmentPositions[shapeParams.dorsalPos];

   if (this.svgAssets && this.svgAssets.dorsalFin) {
     // Render using SVG
     this.drawDorsalFinFromSVG(
       context,
       dorsalPos,
       this.svgAssets.dorsalFin,
       shapeParams,
       sizeScale,
       hue,
       saturation,
       brightness
     );
   } else {
     // Existing procedural rendering (lines 202-218)
     for (let layer = 0; layer < layers; layer++) {
       const offset = this.useSumieStyle ? (layer - 0.5) * 0.15 : 0;
       const opacity = this.useSumieStyle ? (layer === 0 ? 0.6 : 0.3) : 0.75;

       context.fill(hue, saturation + 8, brightness - 15, opacity);
       context.push();
       context.translate(dorsalPos.x, dorsalPos.y + shapeParams.dorsalY * sizeScale);
       context.rotate(-0.2);
       context.beginShape();
       context.vertex(0, offset);
       context.vertex(-1 * sizeScale, -2 * sizeScale + offset);
       context.vertex(1 * sizeScale, -2.5 * sizeScale + offset);
       context.vertex(2 * sizeScale, -1.5 * sizeScale + offset);
       context.vertex(2 * sizeScale, offset);
       context.endShape(context.CLOSE);
       context.pop();
     }
   }
   ```

3. **Testing strategy**:
   - **Visual test**: Render koi with SVG dorsal fin
     - Verify fin shape matches `dorsal-fin.svg`
     - Verify position at segment 4 correct
     - Verify static rotation (-0.2 radians) applied
   - **Animation test**: Verify fin follows segment 4 wave motion
     - Fin position should move with body wave (segment 4)
     - Fin rotation should remain static (-0.2 radians)
   - **Fallback test**: Remove `dorsal-fin.svg`
     - Verify procedural dorsal fin renders

**Files modified**:
- `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js` (+~35 lines)

**Success criteria**:
- ✅ Dorsal fin renders from SVG vertices
- ✅ Static rotation (-0.2 radians) works
- ✅ Position follows segment 4 wave motion
- ✅ Multi-layer sumi-e style works
- ✅ Fallback to procedural if SVG missing

**Validation checkpoint**:
1. User runs simulation with SVG dorsal fin:
   - Verify fin shape matches authored `dorsal-fin.svg`
   - Verify fin position and rotation look natural

2. Compare to procedural dorsal fin:
   - Screenshot procedural (remove SVG)
   - Screenshot SVG (re-add SVG)
   - Verify no visual regression

**Time estimate**: 2-3 hours

---

## Testing and Verification Strategy

### Unit Tests (Per Phase)

Each phase includes specific unit tests documented in its "Testing strategy" section. Summary:

**Phase 1 (SVG Parser)**:
- Parse simple SVG path (square)
- Parse complex Bezier path (body.svg)
- Normalize coordinates to target dimensions
- Handle malformed SVG gracefully

**Phase 2 (Brushstroke Library)**:
- Categorize colors correctly (red, black, white, etc.)
- Load PNG images successfully
- Select random brushstroke per category
- Fallback to generic category

**Phase 3 (Body SVG Rendering)**:
- Render body with SVG vertices
- Apply wave deformation correctly
- Map vertices to segments accurately
- Fallback to procedural rendering

**Phase 4 (Tail SVG Rendering)**:
- Render tail with SVG vertices
- Apply independent sway motion
- Connect to body segment 9 properly
- Fallback to procedural rendering

**Phase 5 (Brushstroke Spots)**:
- Render PNG images instead of ellipses
- Apply color tinting correctly
- Maintain procedural placement logic
- Fallback to ellipse spots

**Phase 6 (Asset Loading)**:
- Load all assets in preload phase
- Parse SVGs to vertex arrays
- Initialize brushstroke library
- Handle missing assets gracefully

**Phase 7 (Dorsal Fin, Optional)**:
- Render dorsal fin from SVG
- Maintain static rotation
- Follow segment 4 position

### Integration Tests

**Test 1: Single Koi Rendering**
- Render one koi at center of screen
- No animation (waveTime = 0)
- Verify all parts render correctly:
  - SVG body shape visible
  - SVG tail shape visible
  - Head, eyes render correctly
  - Fins render correctly
  - Brushstroke spots visible

**Test 2: Animation Correctness**
- Render one koi with animation
- Increment waveTime continuously
- Verify:
  - Body undulates smoothly (wave motion)
  - Tail sways independently (different phase)
  - Fins follow segment positions
  - Spots move with segments

**Test 3: Multi-Koi Performance**
- Render 80 koi on desktop
- Verify:
  - 60fps maintained (check DevTools framerate)
  - No dropped frames during animation
  - Memory usage stable (no leaks)

**Test 4: Asset Fallback**
- Remove SVG assets one by one
- Verify:
  - Missing body.svg → procedural body renders
  - Missing tail.svg → procedural tail renders
  - Missing brushstrokes → ellipse spots render
  - No crashes or errors

**Test 5: Cross-Browser Compatibility**
- Test on Chrome, Firefox, Safari
- Verify:
  - SVG parsing works (native browser API)
  - PNG tinting works (p5.js tint())
  - Performance acceptable on all browsers

### Manual Testing Checklist

**Visual Quality**:
- [ ] Body shape matches authored SVG (compare to Illustrator preview)
- [ ] Tail shape matches authored SVG
- [ ] Wave animation looks smooth and natural
- [ ] Tail sway motion independent from body
- [ ] Brushstroke spots look organic and painterly
- [ ] Multi-layer sumi-e style adds soft edges
- [ ] Color tinting preserves HSB hue accurately

**Performance**:
- [ ] 60fps on desktop (1920×1080, 80 koi)
- [ ] 30fps on mobile (iPhone 13, 30 koi)
- [ ] No frame drops during rapid movement
- [ ] Memory usage stable (no leaks over 5 minutes)

**Robustness**:
- [ ] Handles missing SVG assets (fallback to procedural)
- [ ] Handles missing brushstroke PNGs (fallback to ellipses)
- [ ] Handles malformed SVG (logs warning, doesn't crash)
- [ ] Console logs helpful messages (loading status, errors)

**Animation**:
- [ ] Body wave motion identical to procedural
- [ ] Tail sway motion identical to procedural
- [ ] Fin oscillations work correctly
- [ ] Spot positions follow segments accurately

---

## Deployment and Migration

### Deployment Steps

**Step 1: Verify Prerequisites**
- ✅ All 7 phases implemented and tested
- ✅ SVG assets authored in Illustrator (`body.svg`, `tail.svg`, `dorsal-fin.svg`)
- ✅ Brushstroke PNG assets created (10+ images)
- ✅ Assets placed in correct directories (`/assets/koi/body-parts/`, `/assets/koi/brushstrokes/`)

**Step 2: Deploy Code**
- Commit all code changes to git
- Push to main branch or feature branch
- Deploy to hosting environment (e.g., GitHub Pages, Vercel, Netlify)

**Step 3: Deploy Assets**
- Upload SVG files to `/assets/koi/body-parts/` on server
- Upload PNG brushstrokes to `/assets/koi/brushstrokes/` on server
- Verify file paths match code expectations

**Step 4: Verify Deployment**
- Open deployed URL in browser
- Check browser console for loading messages
- Verify all assets load successfully
- Test on desktop and mobile devices
- Test on multiple browsers (Chrome, Firefox, Safari)

### Migration Path

**Current State**: Procedural rendering (ellipses, curveVertex)

**Target State**: Hybrid SVG + procedural rendering

**Migration Strategy**: **Gradual rollout with feature flag** (optional)

If you want to enable/disable SVG rendering dynamically:

```javascript
// In simulation-app.js, add feature flag
const ENABLE_SVG_RENDERING = true; // Set to false to use procedural only

window.preload = function() {
  if (ENABLE_SVG_RENDERING) {
    // Load SVG assets
  } else {
    svgAssets = null; // Force procedural rendering
  }
};
```

**Rollback Plan**:
1. If issues occur, set `ENABLE_SVG_RENDERING = false`
2. Alternatively, remove SVG assets from server (automatic fallback)
3. Revert code changes if necessary (git rollback)

### Backward Compatibility

**Fully backward compatible** - no breaking changes:
- ✅ Existing procedural rendering preserved (used as fallback)
- ✅ No changes to `koi-params.js` (parameters unchanged)
- ✅ No changes to `boid.js` or `flock-manager.js` (flocking unchanged)
- ✅ No changes to public API (rendering signature unchanged)

**Graceful degradation**:
- Missing SVG assets → procedural body/tail rendering
- Missing brushstroke PNGs → ellipse spot rendering
- Unsupported browser → procedural rendering (SVG parsing fails gracefully)

---

## Risk Assessment and Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **SVG parsing fails in some browsers** | Low | High | Use native browser API (`SVGPathElement`), test cross-browser, fallback to procedural |
| **Performance degradation with PNG brushstrokes** | Medium | Medium | Monitor FPS, reduce layers if needed, optimize image sizes (128×128) |
| **Wave deformation doesn't match procedural** | Medium | High | Use exact same formulas, test extensively, compare side-by-side |
| **Asset loading blocks startup** | Low | Low | Use p5.js preload (async), show loading indicator, timeout fallback |
| **Color tinting doesn't work correctly** | Low | Medium | Test HSB mode extensively, verify p5.js tint() behavior, fallback to ellipses |
| **SVG vertex mapping incorrect** | Medium | High | Test with multiple SVG shapes, visual debugging, boundary checks |

### Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **User uploads malformed SVG** | High | Low | Validate SVG in parser, log warnings, fallback to procedural |
| **Brushstroke PNGs missing or corrupt** | Medium | Low | Fallback to ellipse rendering, log warnings, provide default assets |
| **Asset file paths incorrect** | Medium | Medium | Document paths clearly, provide asset structure README, console logs |
| **Mobile performance issues** | Medium | Medium | Test on target devices, reduce boid count on mobile, adjust pixel scale |

### Content Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **SVG shapes don't match design intent** | High | Medium | Provide authoring guidelines, example templates, visual preview tools |
| **Brushstrokes lack organic quality** | Medium | Low | Provide reference examples, art direction guidelines, test with artist |
| **Asset file sizes too large** | Low | Low | Optimize PNGs (128×128 max), compress SVGs, lazy load if needed |

### Mitigation Strategies

**1. Extensive Testing**:
- Test on target devices (desktop, mobile, tablet)
- Test on multiple browsers (Chrome, Firefox, Safari)
- Test with edge cases (missing assets, malformed SVG, extreme sizes)

**2. Graceful Fallbacks**:
- Always have procedural rendering as fallback
- Log warnings to console for debugging
- Never crash on asset loading errors

**3. Performance Monitoring**:
- Monitor FPS in browser DevTools
- Profile rendering performance (draw calls, memory usage)
- Optimize if FPS drops below 60fps (desktop) or 30fps (mobile)

**4. Documentation**:
- Document SVG authoring guidelines (README in `/assets/koi/body-parts/`)
- Document brushstroke creation guidelines (README in `/assets/koi/brushstrokes/`)
- Document asset file paths and naming conventions

**5. Progressive Enhancement**:
- Start with body and tail (highest impact)
- Add brushstrokes later if performance acceptable
- Dorsal fin optional (Phase 7 can be skipped)

---

## Performance Considerations

### Expected Draw Calls Per Frame

**Current System (Procedural)**:
- Body: 80 koi × 1 body = 80 draws
- Tail: 80 koi × 1 tail = 80 draws
- Fins: 80 koi × 6 fins = 480 draws
- Head/Eyes: 80 koi × 3 parts = 240 draws
- Spots: 80 koi × 5 spots × 3 layers = 1,200 draws
- **Total: ~2,080 draws/frame**

**New System (SVG + Brushstrokes)**:
- Body (SVG): 80 koi × 1 body = 80 draws
- Tail (SVG): 80 koi × 1 tail = 80 draws
- Fins (procedural): 80 koi × 6 fins = 480 draws
- Head/Eyes (procedural): 80 koi × 3 parts = 240 draws
- Spots (PNG): 80 koi × 5 spots × 3 layers = 1,200 draws (now images)
- **Total: ~2,080 draws/frame** (same as current)

**Draw call breakdown**:
- `curveVertex()` draws (body, tail): 160
- `ellipse()` draws (fins, head, eyes): 720
- `image()` draws (spots): 1,200

**Expected performance**: Same as current system (~60fps on desktop)

**Pixel buffer downsampling**: Rendering happens at 4× lower resolution (configurable), then scaled up. This reduces draw call cost significantly.

### Optimization Strategies

**If performance degrades**:

1. **Reduce spot layers** (from 3 to 1 for non-sumi-e):
   - Saves 800 image draws/frame (1,200 → 400)

2. **Reduce boid count** (from 80 to 50):
   - Saves 37% of draw calls

3. **Increase pixel scale** (from 4 to 6):
   - Renders at 36× lower pixel count
   - Significant GPU savings

4. **Optimize PNG assets**:
   - Reduce brushstroke size (128×128 → 64×64)
   - Use indexed color PNGs (smaller file size)

5. **Batch rendering** (future optimization):
   - Use WebGL instancing for repeated shapes
   - Render all koi to texture, then composite

### Memory Considerations

**Asset memory usage**:
- SVG vertices: 20 vertices × 8 bytes × 3 SVGs = ~500 bytes (negligible)
- Brushstroke PNGs: 128×128×4 (RGBA) × 10 images = ~640 KB
- Total: <1 MB (acceptable)

**Runtime memory**:
- 80 boids with pattern data: ~100 KB
- Pixel buffer: 1920×1080 / 16 (4× scale) × 4 bytes = ~500 KB
- Total: <1 MB (acceptable)

**No memory leaks expected**:
- SVG vertices parsed once, reused
- Brushstroke PNGs loaded once, reused
- No dynamic allocation in render loop

---

## Security Considerations

### SVG Security

**Risk**: Malicious SVG files can contain executable code (e.g., `<script>` tags)

**Mitigation**:
- SVG parsing uses browser's native API (`SVGPathElement`), which sanitizes input
- Only extract `<path>` element and `d` attribute (ignore scripts, styles, etc.)
- Temporary SVG element created, immediately removed from DOM
- No SVG rendering in DOM (vertices extracted, then SVG discarded)

**Code example** (svg-parser.js):
```javascript
// Only extract path data, ignore everything else
const pathElement = doc.querySelector('path');
if (!pathElement) return null;
const pathData = pathElement.getAttribute('d');
// ... use pathData only, discard SVG DOM
```

### Asset Injection

**Risk**: User-uploaded SVG or PNG could be malicious

**Mitigation**:
- Assets loaded from trusted source (`/assets/` directory on same origin)
- No user upload functionality in current implementation
- If adding user uploads in future: validate file type, sanitize filenames, use Content Security Policy

### Cross-Origin Requests

**Risk**: Loading assets from untrusted domains

**Mitigation**:
- All assets served from same origin (no CORS issues)
- p5.js `loadImage()` and `loadStrings()` respect same-origin policy
- If loading from CDN: use HTTPS, verify domain, use Subresource Integrity (SRI)

### No Security Issues Identified

The implementation does not introduce security vulnerabilities:
- ✅ No user input processing (assets are static files)
- ✅ No network requests to untrusted domains
- ✅ No executable code in SVG (only path data extracted)
- ✅ No DOM manipulation vulnerabilities (SVG parsed in isolated context)

---

## Documentation Requirements

### Code Documentation

**Required documentation** (inline comments):

1. **svg-parser.js**:
   - Module-level JSDoc describing purpose
   - Function-level JSDoc for all public methods
   - Inline comments explaining complex algorithms (coordinate normalization, path sampling)

2. **brushstroke-library.js**:
   - Module-level JSDoc
   - Function-level JSDoc
   - Comments explaining color categorization logic

3. **koi-renderer.js** (modifications):
   - JSDoc for new methods (`drawBodyFromSVG`, `drawTailFromSVG`, `drawSpotsWithBrushstrokes`)
   - Comments explaining vertex-to-segment mapping
   - Comments explaining fallback logic

4. **simulation-app.js** (modifications):
   - Comments explaining asset loading flow
   - Comments documenting error handling and fallbacks

### Asset Documentation

**Required files**:

1. **`/assets/koi/body-parts/README.md`** (already exists - update):
   ```markdown
   # Koi Body Part SVG Assets

   ## Authoring Guidelines

   ### Body (body.svg)
   - Dimensions: 160×80 viewBox (16×8 koi units)
   - ~20 control points
   - Closed path starting at head (front)
   - Belly should be rounder than back
   - Peak width at 70% along length

   ### Tail (tail.svg)
   - Dimensions: 60×30 viewBox (6×3 koi units)
   - ~14 control points
   - Closed path, narrow at base, wide at tip
   - Fan/paddle shape

   ### Dorsal Fin (dorsal-fin.svg)
   - Dimensions: 20×25 viewBox (2×2.5 koi units)
   - 5 vertices (simple polygon)
   - Peaked triangular shape

   ## How to Edit

   1. Open SVG in Adobe Illustrator
   2. Edit path using Direct Selection Tool (A)
   3. Maintain same viewBox dimensions
   4. Keep path as single closed shape
   5. Save as SVG (Illustrator format)
   6. Refresh browser to see changes
   ```

2. **`/assets/koi/brushstrokes/README.md`** (create new):
   ```markdown
   # Koi Brushstroke Textures

   ## File Naming Convention

   Format: `{category}-{number}.png`

   Categories:
   - `red-##.png` - Red/pink spots
   - `black-##.png` - Black spots
   - `white-##.png` - White spots
   - `orange-##.png` - Orange spots
   - `blue-##.png` - Blue spots
   - `generic-##.png` - Any color (fallback)

   ## Creation Guidelines

   ### Image Specifications
   - Size: 128×128 pixels (recommended)
   - Format: PNG with transparency (RGBA)
   - Ink color: Black or grayscale (will be tinted at runtime)
   - Background: Transparent

   ### Artistic Guidelines
   - Organic, irregular edges (not perfect circles)
   - Brush-like texture (simulate ink strokes)
   - Variation between files (different shapes)
   - Soft edges (feathered, not hard cutout)

   ## How to Create

   1. Use image editor (Photoshop, Procreate, GIMP)
   2. Create 128×128 canvas with transparent background
   3. Paint black ink strokes with soft brush
   4. Add texture/grain for organic feel
   5. Save as PNG with transparency
   6. Name according to category
   7. Place in this directory
   ```

### Developer Documentation

**Required documentation**:

1. **Update main README.md** (project root):
   - Add section: "Rendering System"
   - Explain hybrid SVG + procedural approach
   - Link to asset authoring guidelines

2. **Architecture documentation** (this plan):
   - This implementation plan serves as architecture documentation
   - Keep updated as system evolves
   - Link from main README

3. **API documentation** (inline JSDoc):
   - All public methods documented
   - Can generate HTML docs using JSDoc tool (optional)

---

## Open Questions and Decisions

### Resolved Decisions

**Q1: Which SVG parsing approach?**
- ✅ **Decision**: Use native browser `SVGPathElement.getPointAtLength()` API
- **Rationale**: No dependencies, leverages browser optimization, simpler code

**Q2: Should fins be converted to SVG?**
- ✅ **Decision**: Keep pectoral/ventral fins as procedural ellipses, optionally convert dorsal fin
- **Rationale**: Simple ellipses don't benefit much from SVG authoring

**Q3: How many brushstroke variants per category?**
- ✅ **Decision**: 2-3 variants per category, 10+ total
- **Rationale**: Provides variation without overwhelming asset management

**Q4: Should multi-layer sumi-e style be maintained?**
- ✅ **Decision**: Yes, apply same multi-layer rendering to SVG and brushstrokes
- **Rationale**: Preserves artistic quality and consistency

**Q5: Fallback strategy if assets missing?**
- ✅ **Decision**: Graceful fallback to procedural rendering, log warnings
- **Rationale**: Robust, works without assets, aids debugging

### Open Questions for User

**Before implementation begins, confirm**:

1. **Brushstroke assets**: Do you have sample PNG brushstrokes ready, or should we test with procedurally generated placeholders first?
   - **Recommendation**: Start with 2-3 hand-made PNGs for testing, expand later

2. **Body parts priority**: Should we implement body + tail together (Phases 3-4), or body only first?
   - **Recommendation**: Implement body only first (Phase 3), validate, then add tail (Phase 4)

3. **Validation preference**: After each phase, do you want to run the full simulation, or just review code + screenshots?
   - **Recommendation**: Run simulation after Phases 3, 4, 5, 6 (key integration points)

4. **Fallback strategy**: Should procedural rendering be a permanent option (toggle flag), or removed after SVG transition complete?
   - **Recommendation**: Keep procedural as permanent fallback (more robust)

5. **Performance targets**: Are 60fps (desktop) / 30fps (mobile) acceptable, or should we target higher?
   - **Recommendation**: Start with 60fps/30fps, optimize later if needed

---

## Implementation Timeline

### Total Estimated Time: 28-39 hours

**Phase 1: SVG Parser Infrastructure** - 4-6 hours
- Create svg-parser.js module
- Implement path sampling and normalization
- Test with body.svg, tail.svg

**Phase 2: Brushstroke Library System** - 3-4 hours (parallel with Phase 1)
- Create brushstroke-library.js module
- Implement color categorization
- Test with sample PNGs

**Phase 3: SVG Body Rendering Integration** - 6-8 hours
- Modify koi-renderer.js
- Implement drawBodyFromSVG()
- Test wave deformation

**Phase 4: SVG Tail Rendering Integration** - 4-6 hours
- Implement drawTailFromSVG()
- Test independent tail sway

**Phase 5: Brushstroke Spot Rendering** - 5-7 hours
- Implement drawSpotsWithBrushstrokes()
- Test color tinting and performance

**Phase 6: Asset Loading and Initialization** - 4-5 hours
- Modify simulation-app.js
- Wire up full system
- Test end-to-end

**Phase 7: Dorsal Fin SVG Rendering (Optional)** - 2-3 hours
- Implement drawDorsalFinFromSVG()
- Test positioning and rotation

### Recommended Schedule

**Week 1**:
- Day 1-2: Phase 1 (SVG Parser) + Phase 2 (Brushstroke Library) in parallel
- Day 3: Phase 3 (Body SVG Rendering)
- Day 4: Phase 4 (Tail SVG Rendering)

**Week 2**:
- Day 5: Phase 5 (Brushstroke Spots)
- Day 6: Phase 6 (Asset Loading and Integration)
- Day 7: Testing, bug fixes, documentation
- Day 8 (optional): Phase 7 (Dorsal Fin)

---

## Success Metrics (Final Validation)

### Functional Completeness

- ✅ User can author body.svg in Illustrator, save, and see results immediately
- ✅ User can author tail.svg and dorsal-fin.svg (optional)
- ✅ User can add PNG brushstrokes and see them applied to spots
- ✅ 80 koi render smoothly at 60fps (desktop) / 30fps (mobile)
- ✅ Wave animation looks identical to current procedural system
- ✅ All 8 body parts render correctly with proper z-layering
- ✅ System gracefully falls back to procedural if assets missing
- ✅ Console logs helpful messages (loading status, errors, warnings)

### Performance Targets

- ✅ **Desktop (1920×1080)**: 60fps with 80 koi, SVG bodies/tails, brushstroke spots
- ✅ **Mobile (iPhone 13)**: 30fps with 30 koi, same rendering
- ✅ **Startup time**: <2 seconds from page load to first frame
- ✅ **Memory usage**: <50 MB total (stable over 5 minutes)
- ✅ **Asset loading**: <500ms for SVG parsing, <1s for brushstroke loading

### Code Quality

- ✅ All new modules have JSDoc documentation
- ✅ All public methods have parameter descriptions and return types
- ✅ Complex algorithms have inline comments
- ✅ Error handling comprehensive (try/catch, null checks)
- ✅ No console errors or warnings (besides intentional fallback warnings)

### Asset Quality

- ✅ SVG shapes match design intent (visual inspection)
- ✅ Brushstroke textures look organic and painterly
- ✅ Asset file sizes reasonable (<1 MB total)
- ✅ Asset structure documented (READMEs in asset directories)

---

## Appendix

### File Modification Summary

| File | Change Type | Lines Added | Lines Modified | Purpose |
|------|-------------|-------------|----------------|---------|
| `/flocking/src/core/svg-parser.js` | NEW | ~200 | 0 | SVG parsing to vertices |
| `/flocking/src/rendering/brushstroke-library.js` | NEW | ~150 | 0 | PNG brushstroke management |
| `/flocking/src/core/koi-renderer.js` | MODIFY | ~220 | ~10 | SVG rendering integration |
| `/flocking/src/apps/simulation-app.js` | MODIFY | ~60 | ~5 | Asset loading and initialization |

**Total**: ~630 lines added, ~15 lines modified

### Asset Inventory

**SVG Assets** (`/assets/koi/body-parts/`):
- `body.svg` (exists) - Body outline, 160×80 viewBox, ~20 vertices
- `tail.svg` (exists) - Tail shape, 60×30 viewBox, ~14 vertices
- `dorsal-fin.svg` (exists) - Dorsal fin, 20×25 viewBox, 5 vertices

**PNG Assets** (`/assets/koi/brushstrokes/`):
- `red-01.png`, `red-02.png`, `red-03.png` (to be created)
- `black-01.png`, `black-02.png` (to be created)
- `white-01.png`, `white-02.png` (to be created)
- `orange-01.png` (to be created)
- `blue-01.png` (to be created)
- `generic-01.png` (to be created)

**Total**: 3 SVG files (exist), 10 PNG files (to be created)

### Dependencies

**No new npm packages required** - using native browser APIs and existing p5.js:

- ✅ **SVG parsing**: Native browser `SVGPathElement` API (built-in)
- ✅ **Image loading**: p5.js `loadImage()` (already available)
- ✅ **Graphics rendering**: p5.js `curveVertex()`, `image()`, `tint()` (already available)
- ✅ **Color manipulation**: p5.js HSB color mode (already available)

### References

**Related documentation**:
- Research doc: `/thoughts/research/2025-10-22-koi-rendering-system-body-part-structure-for-svg-transition.md`
- Existing renderer: `/flocking/src/core/koi-renderer.js` (lines 1-501)
- Shape parameters: `/flocking/src/core/koi-params.js` (lines 1-139)
- Simulation app: `/flocking/src/apps/simulation-app.js` (lines 1-281)

**Browser API documentation**:
- [SVGPathElement.getTotalLength()](https://developer.mozilla.org/en-US/docs/Web/API/SVGGeometryElement/getTotalLength)
- [SVGPathElement.getPointAtLength()](https://developer.mozilla.org/en-US/docs/Web/API/SVGGeometryElement/getPointAtLength)
- [DOMParser](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser)

**p5.js documentation**:
- [loadImage()](https://p5js.org/reference/#/p5/loadImage)
- [tint()](https://p5js.org/reference/#/p5/tint)
- [curveVertex()](https://p5js.org/reference/#/p5/curveVertex)
- [HSB color mode](https://p5js.org/reference/#/p5/colorMode)

---

## Conclusion

This implementation plan provides a comprehensive roadmap for transitioning the koi rendering system from procedural shape generation to SVG-authored vector paths with bitmap brushstroke textures. The hybrid approach balances artistic control, performance, and maintainability.

**Key benefits**:
1. ✅ **Artistic control**: Design complex body shapes in Illustrator
2. ✅ **Organic texture**: Bitmap brushstrokes add painterly quality
3. ✅ **Smooth animation**: Existing wave system preserved
4. ✅ **Performance**: Comparable to current system (~60fps)
5. ✅ **Robustness**: Graceful fallback to procedural rendering
6. ✅ **Backward compatible**: No breaking changes

**Implementation approach**:
- **7 phases** with clear deliverables and validation checkpoints
- **28-39 hours** estimated development time
- **Progressive enhancement**: Start with body/tail (highest impact), add brushstrokes/fins later
- **No dependencies**: Uses native browser APIs and existing p5.js

**Next steps**:
1. Review and approve plan with user
2. Answer open questions (brushstroke assets, validation preference, etc.)
3. Begin Phase 1 (SVG Parser Infrastructure)
4. Validate after each phase with user checkpoint

This plan is ready for the plan-implementer agent to execute. Each phase includes specific code examples, file paths, testing strategies, and success criteria to guide implementation.
