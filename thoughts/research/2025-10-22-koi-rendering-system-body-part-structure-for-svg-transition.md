---
doc_type: research
date: 2025-10-22T14:26:17+00:00
title: "Koi Rendering System - Body Part Structure for SVG Transition"
research_question: "What body parts are currently rendered in the koi system, how are they structured, and what are the requirements for converting each to SVG assets?"
researcher: Sean Kim

git_commit: 9286bf16eb2890dfeae2bd769b33fb82923ea6ab
branch: main
repository: visualizations

created_by: Sean Kim
last_updated: 2025-10-22
last_updated_by: Sean Kim

tags:
  - koi
  - rendering
  - svg
  - body-parts
  - animation
status: draft

related_docs: []
---

# Research: Koi Rendering System - Body Part Structure for SVG Transition

**Date**: 2025-10-22T14:26:17+00:00
**Researcher**: Sean Kim
**Git Commit**: 9286bf16eb2890dfeae2bd769b33fb82923ea6ab
**Branch**: main
**Repository**: visualizations

## Research Question

What body parts are currently rendered in the koi rendering system, and what are the exact specifications needed to create 1:1 SVG assets that maintain the same body part structure for the transition from procedural shape generation to SVG-authored vector paths?

## Summary

The koi rendering system in `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js` renders **8 distinct body parts** organized into 5 rendering functions. The system uses a **10-segment backbone** for positioning and animation, with a wave-based deformation system that creates swimming motion. Each body part is attached to specific segments and has unique rendering characteristics.

The current system uses a combination of:
- **Curved path vertices** (body and tail) - ideal for SVG conversion
- **Primitive ellipses** (head, eyes, fins) - require conversion strategy
- **Multi-layer rendering** for sumi-e style (optional visual enhancement)

## Body Part Inventory

### Complete List of Body Parts (8 total)

| # | Body Part | Rendering Function | Lines | Count | Visual Layer |
|---|-----------|-------------------|-------|-------|--------------|
| 1 | **Main Body Outline** | `drawBody()` | 316-406 | 1 | Layer 3 (on top of fins/tail) |
| 2 | **Head** | `drawHead()` | 447-472 | 1 | Layer 4 (before spots) |
| 3 | **Left Eye (top)** | `drawHead()` | 478-483 | 1 | Layer 4 |
| 4 | **Right Eye (bottom)** | `drawHead()` | 486-491 | 1 | Layer 4 |
| 5 | **Tail** | `drawTail()` | 253-311 | 1 | Layer 2 (behind body) |
| 6 | **Dorsal Fin** | `drawFins()` | 200-218 | 1 | Layer 1 (behind all) |
| 7 | **Pectoral Fins** | `drawFins()` | 172-198 | 2 (top + bottom) | Layer 1 |
| 8 | **Ventral Fins** | `drawFins()` | 220-247 | 2 (top + bottom) | Layer 1 |

**Total Parts**: 8 distinct body parts
**Total Visual Elements**: 10 (counting paired fins as 2 each)

### Rendering Order (Z-Layer Stack)

From the code comments at lines 106-111:

```javascript
// RENDERING ORDER (for proper z-layering):
// 1. Fins (drawn first, appear behind body)
// 2. Tail (drawn second, behind body)
// 3. Body outline (drawn on top of fins and tail)
// 4. Head (drawn before spots so spots appear on head)
// 5. Spots (drawn last, on top of everything including head)
```

## Segment System Architecture

### Segment Calculation (`calculateSegments()`, lines 127-160)

**Configuration**:
- **Number of segments**: 10 (configurable via `shapeParams.numSegments`, default in `/Users/seankim/dev/visualizations/flocking/src/core/koi-params.js:8`)
- **Segment data structure**: Each segment has `{ x, y, w }` where:
  - `x`: Horizontal position along body length
  - `y`: Vertical offset from centerline (wave deformation)
  - `w`: Width at that segment position

**X Position Calculation** (line 132):
```javascript
const x = this.lerp(7, -9, t) * sizeScale * lengthMultiplier;
```
- Segments run from front (x=7) to back (x=-9)
- Total body length: 16 units (scaled)
- Parameter `t` ranges from 0 (front) to 1 (back)

**Y Position Calculation - Wave Animation** (line 133):
```javascript
const y = Math.sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);
```
- Creates traveling wave motion
- Wave amplitude: 1.5 units (scaled)
- Wave decreases toward tail: `(1 - t * 0.2)` reduces amplitude by 20%
- Phase shift: `t * 3.5` creates propagating wave

**Width Calculation** (lines 139-153):
Three-phase width curve:
1. **Front to peak** (segments 0-7): Lerp from `bodyFrontWidth` (4.5) to `bodyPeakWidth` (8.0)
2. **Peak position**: At 70% along body (`bodyPeakPosition: 0.7`, line 13 of koi-params.js)
3. **Taper zone** (segments after 15%): Width reduces by `bodyTaperStrength` (0.9) toward tail

### Segment-to-Part Mapping

| Body Part | Segment(s) Used | Position Reference | Lines |
|-----------|-----------------|-------------------|-------|
| **Body Outline** | 0-9 (all) | All segments for outline curve | 316-406 |
| **Head** | 0 (first) | `segmentPositions[0]` | 447-492 |
| **Eyes** | 0 (first) | `headSegment` (segment 0) | 474-491 |
| **Pectoral Fins** | 2 | `segmentPositions[shapeParams.pectoralPos]` | 172-198 |
| **Dorsal Fin** | 4 | `segmentPositions[shapeParams.dorsalPos]` | 200-218 |
| **Ventral Fins** | 7 | `segmentPositions[shapeParams.ventralPos]` | 220-247 |
| **Tail** | 9 (last) | `segmentPositions[segmentPositions.length - 1]` | 253-311 |

## Detailed Body Part Analysis

### 1. Main Body Outline

**Function**: `drawBody()` (lines 316-406)

**Current Rendering Method**:
- Uses `beginShape()` with `curveVertex()` for smooth organic curves
- Creates closed path from head to tail and back

**Path Construction** (lines 361-394):
```javascript
// Head point (anchor)
const headPt = { x: headSeg.x + shapeParams.headX * sizeScale, y: headSeg.y };

// Top edge (back) - segments 0 to 9
for (let i = 0; i < segmentPositions.length; i++) {
    const topMultiplier = 0.48 * (1 - asymmetry * 0.15);
    context.curveVertex(seg.x, seg.y - seg.w * topMultiplier);
}

// Bottom edge (belly) - segments 9 to 0 (reverse)
for (let i = segmentPositions.length - 1; i >= 0; i--) {
    const bottomMultiplier = 0.48 * (1 + asymmetry * 0.15);
    context.curveVertex(seg.x, seg.y + seg.w * bottomMultiplier);
}
```

**Key Characteristics**:
- **Deformable**: Yes - vertices follow segment wave motion
- **Asymmetry**: Uses `bodyAsymmetry` (0.9) to make belly rounder than back
- **Vertex count**: ~20 vertices (10 segments × 2 edges)
- **Additional detail**: Segment lines drawn across body (lines 397-404) for definition

**SVG Suitability**: ⭐⭐⭐⭐⭐ **EXCELLENT** - Direct path with curve vertices

---

### 2. Tail

**Function**: `drawTail()` (lines 253-311)

**Current Rendering Method**:
- Uses `beginShape()` with `curveVertex()` for flowing shape
- Creates closed path from base to tip and back

**Tail Structure**:
- **Segments**: 6 tail segments (independent of body segments)
- **Length**: 6 units × `tailLength` multiplier × `sizeScale`
- **Attachment point**: Last body segment (segment 9) + `tailStartX` offset (-1 unit)

**Path Construction** (lines 259-271):
```javascript
const tailSegments = 6;
const tailLengthScaled = tailLength * 6 * sizeScale;

for (let i = 0; i <= tailSegments; i++) {
    const t = i / tailSegments;
    const x = tailStartX - (t * tailLengthScaled);  // Extends backwards
    const tailSway = Math.sin(waveTime - 2.5 - t * 2) * 3 * sizeScale * (0.5 + t * 0.5);
    const width = this.lerp(shapeParams.tailWidthStart, shapeParams.tailWidthEnd, t) * sizeScale;

    topPoints.push({ x, y: tailBase.y - width + tailSway });
    bottomPoints.push({ x, y: tailBase.y + width + tailSway });
}
```

**Animation Characteristics**:
- **Independent sway motion**: Separate sine wave from body (`waveTime - 2.5`)
- **Amplified at tip**: Sway increases from 50% to 100% along tail length
- **Width taper**: From 0.2 (base) to 1.5 (tip) - creates fan shape

**Key Characteristics**:
- **Deformable**: Yes - strong independent wave motion
- **Vertex count**: 14 vertices (7 tail points × 2 edges)
- **Attachment**: Inherits position from segment 9, plus offset

**SVG Suitability**: ⭐⭐⭐⭐⭐ **EXCELLENT** - Curved path ideal for SVG

---

### 3. Head

**Function**: `drawHead()` (lines 447-472)

**Current Rendering Method**:
- Single `ellipse()` primitive
- Positioned at segment 0 with offset

**Position Calculation** (lines 448-451):
```javascript
const headX = headSegment.x + shapeParams.headX * sizeScale;  // -0.6 offset
const headY = headSegment.y;
const headWidth = shapeParams.headWidth * sizeScale;   // 7.5 units
const headHeight = shapeParams.headHeight * sizeScale; // 5.0 units
```

**Rendering** (line 471):
```javascript
context.ellipse(headX, headY, headWidth, headHeight);
```

**Key Characteristics**:
- **Deformable**: No - maintains ellipse shape, only position follows segment 0
- **Dimensions**: 7.5 × 5.0 units (aspect ratio 1.5:1)
- **Position**: Segment 0 + (-0.6, 0) offset
- **Rotation**: None - always aligned with body

**SVG Suitability**: ⭐⭐⭐ **MODERATE** - Need to convert ellipse to SVG path or keep procedural

---

### 4. Eyes (Left and Right)

**Function**: `drawHead()` (lines 474-491)

**Current Rendering Method**:
- Two separate `ellipse()` primitives (circular)
- Positioned relative to segment 0

**Left Eye (Top)** (lines 478-483):
```javascript
context.ellipse(
    headSegment.x + shapeParams.eyeX * sizeScale,      // 1.3
    headSegment.y + shapeParams.eyeYTop * sizeScale,   // -2.2 (above centerline)
    shapeParams.eyeSize * sizeScale,                   // 1.0
    shapeParams.eyeSize * sizeScale                    // 1.0 (circular)
);
```

**Right Eye (Bottom)** (lines 486-491):
```javascript
context.ellipse(
    headSegment.x + shapeParams.eyeX * sizeScale,        // 1.3
    headSegment.y + shapeParams.eyeYBottom * sizeScale,  // 2.0 (below centerline)
    shapeParams.eyeSize * sizeScale,                     // 1.0
    shapeParams.eyeSize * sizeScale                      // 1.0 (circular)
);
```

**Key Characteristics**:
- **Deformable**: No - fixed size, only position follows segment 0
- **Size**: 1.0 unit diameter (circular)
- **Position**: Segment 0 + (1.3, ±2.1) offsets
- **Color**: Black/dark (hue: 0, sat: 0, brightness: 10)
- **Opacity**: 0.8

**SVG Suitability**: ⭐⭐ **LOW** - Small circles, may be better as procedural

---

### 5. Dorsal Fin

**Function**: `drawFins()` (lines 200-218)

**Current Rendering Method**:
- Uses `beginShape()` with `vertex()` (not curveVertex)
- 5-point polygon for triangular fin shape

**Position**: Segment 4 (middle-back of body)

**Shape Definition** (lines 210-216):
```javascript
context.translate(dorsalPos.x, dorsalPos.y + shapeParams.dorsalY * sizeScale);
context.rotate(-0.2);  // Slight backward tilt
context.beginShape();
    context.vertex(0, offset);                                  // Base center
    context.vertex(-1 * sizeScale, -2 * sizeScale + offset);    // Back point
    context.vertex(1 * sizeScale, -2.5 * sizeScale + offset);   // Peak (highest)
    context.vertex(2 * sizeScale, -1.5 * sizeScale + offset);   // Front slope
    context.vertex(2 * sizeScale, offset);                      // Base front
context.endShape(context.CLOSE);
```

**Key Characteristics**:
- **Deformable**: No - maintains polygon shape, position follows segment 4's wave motion
- **Dimensions**: ~2 units wide × 2.5 units tall
- **Rotation**: -0.2 radians (static tilt)
- **Position**: Segment 4 + (0, -0.5) offset (above body)

**SVG Suitability**: ⭐⭐⭐⭐ **GOOD** - Simple polygon, easy to convert to SVG path

---

### 6. Pectoral Fins (Top and Bottom pair)

**Function**: `drawFins()` (lines 172-198)

**Current Rendering Method**:
- Two `ellipse()` primitives
- Positioned on opposite sides of segment 2

**Position**: Segment 2 (front quarter of body)

**Top Pectoral Fin (Left)** (lines 174-185):
```javascript
context.translate(finPos.x, finPos.y + shapeParams.pectoralYTop * sizeScale + finSway);
context.rotate(shapeParams.pectoralAngleTop + Math.sin(waveTime * 1.2) * 0.15);
context.ellipse(2.25 * sizeScale + offset, 0, 4.5 * sizeScale, 2 * sizeScale);
```

**Bottom Pectoral Fin (Right)** (lines 187-198):
```javascript
context.translate(finPos.x, finPos.y + shapeParams.pectoralYBottom * sizeScale - finSway);
context.rotate(shapeParams.pectoralAngleBottom - Math.sin(waveTime * 1.2) * 0.15);
context.ellipse(2.25 * sizeScale + offset, 0, 4.5 * sizeScale, 2 * sizeScale);
```

**Animation**:
- **Fin sway**: `Math.sin(waveTime - 0.5) * 0.8` - vertical oscillation (line 167)
- **Rotation oscillation**: `Math.sin(waveTime * 1.2) * 0.15` - subtle flapping

**Key Characteristics**:
- **Deformable**: No - ellipse shape maintained
- **Dimensions**: 4.5 × 2.0 units (aspect ratio 2.25:1)
- **Base rotation**: -2.5 radians (top), 2.1 radians (bottom)
- **Position**: Segment 2 + (2.25, ±2.0) offsets
- **Animated**: Yes - vertical sway and rotation oscillation

**SVG Suitability**: ⭐⭐⭐ **MODERATE** - Ellipses with animation, need path conversion

---

### 7. Ventral Fins (Top and Bottom pair)

**Function**: `drawFins()` (lines 220-247)

**Current Rendering Method**:
- Two `ellipse()` primitives
- Positioned on opposite sides of segment 7

**Position**: Segment 7 (rear quarter of body)

**Top Ventral Fin** (lines 223-234):
```javascript
context.translate(ventralPos.x, ventralPos.y + shapeParams.ventralYTop * sizeScale);
context.rotate(shapeParams.ventralAngleTop + Math.sin(waveTime * 1.2) * 0.1);
context.ellipse(1.5 * sizeScale + offset, 0, 3 * sizeScale, 1.5 * sizeScale);
```

**Bottom Ventral Fin** (lines 236-247):
```javascript
context.translate(ventralPos.x, ventralPos.y + shapeParams.ventralYBottom * sizeScale);
context.rotate(shapeParams.ventralAngleBottom - Math.sin(waveTime * 1.2) * 0.1);
context.ellipse(1.5 * sizeScale + offset, 0, 3 * sizeScale, 1.5 * sizeScale);
```

**Animation**:
- **Rotation oscillation**: `Math.sin(waveTime * 1.2) * 0.1` - subtle flapping (less than pectorals)

**Key Characteristics**:
- **Deformable**: No - ellipse shape maintained
- **Dimensions**: 3.0 × 1.5 units (aspect ratio 2:1)
- **Base rotation**: -2.5 radians (top), 2.5 radians (bottom)
- **Position**: Segment 7 + (1.5, ±1.0) offsets
- **Animated**: Yes - rotation oscillation only

**SVG Suitability**: ⭐⭐⭐ **MODERATE** - Ellipses with animation, need path conversion

---

## Animation and Deformation System

### Wave Motion (Applied to All Segments)

**Core wave equation** (line 133):
```javascript
const y = Math.sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);
```

**Parameters**:
- `waveTime`: Time value, continuously incremented
- `t`: Position along body (0 = front, 1 = back)
- `3.5`: Wave frequency multiplier (higher = more undulations)
- `1.5`: Base amplitude
- `(1 - t * 0.2)`: Amplitude decay (20% reduction from front to back)

**Effect on Parts**:
- **Body**: All vertices deform with segment wave motion
- **Tail**: Independent wave with phase offset (`waveTime - 2.5`)
- **Head**: Position follows segment 0 wave
- **Fins**: Positions follow their respective segment waves
- **Eyes**: Positions follow segment 0 wave

### Fin Animation

**Pectoral fin sway** (line 167):
```javascript
const finSway = Math.sin(waveTime - 0.5) * 0.8;
```
- Vertical oscillation: ±0.8 units
- Applied oppositely to top/bottom fins (+ vs -)

**Rotation oscillation**:
- **Pectorals** (lines 182, 195): `Math.sin(waveTime * 1.2) * 0.15` (±0.15 radians)
- **Ventrals** (lines 231, 244): `Math.sin(waveTime * 1.2) * 0.1` (±0.1 radians)

### Sumi-e Style Multi-Layer Rendering

**Optional visual enhancement** (enabled when `useSumieStyle` is true):
- **Body**: 3 layers with opacity [0.3, 0.7, 0.3] and slight offsets (lines 321-352)
- **Tail**: 3 layers with opacity [0.25, 0.7, 0.25] (lines 274-294)
- **Head**: 3 layers with size variation (lines 454-467)
- **Fins**: 2 layers with opacity [0.5, 0.25] (dorsal), [0.5, 0.25] (others)
- **Spots**: 3 layers with opacity [0.3, 0.75, 0.3] (lines 423-435)

**Purpose**: Creates soft, brush-like edges for traditional ink painting aesthetic

---

## SVG Conversion Analysis

### Parts Suitable for Direct SVG Conversion

#### ⭐⭐⭐⭐⭐ Excellent Candidates (Use curveVertex paths)

**1. Body Outline**
- **Current**: `beginShape()` + `curveVertex()` (lines 361-394)
- **SVG approach**: Direct path conversion - author smooth body outline in Illustrator
- **Vertex animation**: Yes - apply same wave deformation to SVG vertices
- **Complexity**: ~20 vertices

**2. Tail**
- **Current**: `beginShape()` + `curveVertex()` (lines 280-310)
- **SVG approach**: Direct path conversion - author flowing tail shape
- **Vertex animation**: Yes - apply independent tail sway to SVG vertices
- **Complexity**: ~14 vertices

#### ⭐⭐⭐⭐ Good Candidates (Simple polygons)

**3. Dorsal Fin**
- **Current**: `beginShape()` + `vertex()` (lines 210-216)
- **SVG approach**: 5-point polygon path - easy to author in Illustrator
- **Vertex animation**: No - position follows segment 4 wave only
- **Complexity**: 5 vertices

### Parts Requiring Conversion Strategy

#### ⭐⭐⭐ Moderate (Ellipses with animation)

**4. Pectoral Fins (2x)**
- **Current**: `ellipse()` primitives with rotation animation
- **SVG approach**: Convert to elliptical paths, maintain rotation animation
- **Challenge**: Rotation oscillation must be preserved in code
- **Alternative**: Keep procedural or author as simple oval paths

**5. Ventral Fins (2x)**
- **Current**: `ellipse()` primitives with rotation animation
- **SVG approach**: Same as pectorals
- **Challenge**: Smaller rotation oscillation to preserve

**6. Head**
- **Current**: Large `ellipse()` primitive (7.5 × 5.0)
- **SVG approach**: Convert to oval path or keep procedural
- **Challenge**: Simple shape - may not benefit from SVG authoring

#### ⭐⭐ Low Priority (Small simple shapes)

**7. Eyes (2x)**
- **Current**: Small circular `ellipse()` primitives (1.0 diameter)
- **SVG approach**: Not recommended - too simple
- **Recommendation**: Keep as procedural circles

---

## SVG Implementation Strategy

### Recommended Approach: Hybrid System

**Convert to SVG**:
1. **Body Outline** - Primary candidate, complex organic shape
2. **Tail** - Primary candidate, flowing shape with independent motion
3. **Dorsal Fin** - Simple polygon, easy conversion

**Keep Procedural**:
4. **Head** - Simple ellipse, no benefit from SVG
5. **Eyes** - Very simple circles, no benefit from SVG
6. **Pectoral Fins** - Simple ellipses, but consider SVG if design needs more detail
7. **Ventral Fins** - Simple ellipses, but consider SVG if design needs more detail

### SVG Asset Specifications

#### 1. body.svg

**Description**: Main body outline path
**Dimensions**: ~16 × 8 units (width × height at peak)
**Anchor point**: Center of head (front of path)
**Path structure**:
- Closed smooth curve
- ~20 control points corresponding to 10 segments × 2 edges
- Must match segment positions for deformation

**Control Points Layout**:
```
Front anchor → Top edge (10 points) → Rear → Bottom edge (10 points) → Front anchor
```

**Authoring Notes**:
- Create smooth, organic koi body shape
- Front should be narrower (bodyFrontWidth: 4.5)
- Peak width at 70% along length (bodyPeakWidth: 8.0)
- Belly should be rounder than back (asymmetry: 0.9)
- Taper toward tail after 15% mark

**Animation Integration**:
- Parse SVG path to vertex array
- Map each vertex to corresponding segment
- Apply wave deformation: `vertex.y += segment.y`
- Render using `curveVertex()` with deformed positions

---

#### 2. tail.svg

**Description**: Flowing tail shape
**Dimensions**: ~6 × 3 units (length × width at tip)
**Anchor point**: Base attachment point (connects to body segment 9)
**Path structure**:
- Closed smooth curve
- ~14 control points (7 per edge)
- Fan shape: narrow at base, wider at tip

**Control Points Layout**:
```
Base → Top edge (7 points) → Tip → Bottom edge (7 points) → Base
```

**Authoring Notes**:
- Base width: 0.2 units (tailWidthStart)
- Tip width: 1.5 units (tailWidthEnd)
- Length: 6 units
- Smooth, flowing curves
- Fan/paddle shape typical of koi tails

**Animation Integration**:
- Parse SVG path to vertex array
- For each vertex at position `t` along tail:
  - Calculate sway: `Math.sin(waveTime - 2.5 - t * 2) * 3 * (0.5 + t * 0.5)`
  - Apply to Y position
- Render using `curveVertex()` with deformed positions

---

#### 3. dorsal-fin.svg

**Description**: Triangular dorsal fin
**Dimensions**: ~2 × 2.5 units (width × height)
**Anchor point**: Base center point
**Path structure**:
- Closed polygon
- 5 vertices forming triangular/peaked shape

**Vertex Layout** (matching lines 211-215):
```
(0, 0)           → Base center
(-1, -2)         → Back point
(1, -2.5)        → Peak (highest point)
(2, -1.5)        → Front slope
(2, 0)           → Base front
```

**Authoring Notes**:
- Create peaked triangular shape
- Front slope gentler than back
- Can add more detail/curves than current polygon
- Should look like traditional koi dorsal fin

**Animation Integration**:
- No vertex deformation
- Position follows segment 4 wave motion
- Static rotation: -0.2 radians
- Render as positioned shape

---

#### 4. pectoral-fin.svg (Optional)

**Description**: Side pectoral fins (if converting from ellipse)
**Dimensions**: ~4.5 × 2 units
**Anchor point**: Base attachment point
**Path structure**: Oval/elliptical fin shape

**Authoring Notes**:
- Elongated oval (aspect ratio 2.25:1)
- Can add detail like fin rays if desired
- Two instances: top (left) and bottom (right)

**Animation Integration**:
- Base rotation: -2.5 rad (top), 2.1 rad (bottom)
- Rotation oscillation: `Math.sin(waveTime * 1.2) * 0.15`
- Vertical sway: `Math.sin(waveTime - 0.5) * 0.8`
- Position follows segment 2

---

#### 5. ventral-fin.svg (Optional)

**Description**: Rear ventral fins (if converting from ellipse)
**Dimensions**: ~3.0 × 1.5 units
**Anchor point**: Base attachment point
**Path structure**: Oval/elliptical fin shape

**Authoring Notes**:
- Smaller oval (aspect ratio 2:1)
- Can add detail like fin rays if desired
- Two instances: top and bottom

**Animation Integration**:
- Base rotation: -2.5 rad (top), 2.5 rad (bottom)
- Rotation oscillation: `Math.sin(waveTime * 1.2) * 0.1`
- Position follows segment 7

---

## SVG Parsing and Integration

### Required Parser Capabilities

**1. SVG Path to Vertex Array**:
- Parse SVG `<path>` element's `d` attribute
- Extract curve control points
- Convert to array of `{x, y}` coordinates
- Handle both straight (`L`) and curve (`C`, `Q`) commands

**2. Coordinate System**:
- SVG uses top-left origin
- p5.js uses center origin (with translate)
- Parser must handle coordinate transformation

**3. Libraries/Approaches**:

**Native JavaScript**:
```javascript
// Browser SVGPathElement API
const path = svgElement.querySelector('path');
const length = path.getTotalLength();
const points = [];
for (let i = 0; i <= segments; i++) {
    const point = path.getPointAtLength((i / segments) * length);
    points.push({ x: point.x, y: point.y });
}
```

**Third-party libraries**:
- **svg-path-properties**: Get points along path
- **parse-svg-path**: Parse path data to commands
- **opentype.js**: If using font-style paths

### Integration with Current System

**Modified rendering flow**:

```javascript
// 1. Preload SVG assets
let bodyPath, tailPath, dorsalFinPath;

function preload() {
    bodyPath = loadSVGPath('assets/body.svg');
    tailPath = loadSVGPath('assets/tail.svg');
    dorsalFinPath = loadSVGPath('assets/dorsal-fin.svg');
}

// 2. Parse SVG to vertices (one-time)
const bodyVertices = parseSVGToVertices(bodyPath);
const tailVertices = parseSVGToVertices(tailPath);

// 3. In drawBody(), use SVG vertices instead of procedural
drawBody(context, segmentPositions, bodyVertices, ...) {
    context.beginShape();
    for (let i = 0; i < bodyVertices.length; i++) {
        const vertex = bodyVertices[i];
        const segmentIndex = mapVertexToSegment(i, bodyVertices.length, segmentPositions.length);
        const seg = segmentPositions[segmentIndex];

        // Apply wave deformation
        const deformedX = vertex.x * sizeScale + seg.x;
        const deformedY = vertex.y * sizeScale + seg.y;

        context.curveVertex(deformedX, deformedY);
    }
    context.endShape(CLOSE);
}
```

**Key integration points**:
- Replace `for (let i = 0; i < segmentPositions.length; i++)` loops with SVG vertex loops
- Map SVG vertices to segments based on X position
- Apply same wave deformation math to SVG vertices
- Maintain all existing animation timing and amplitude

---

## Proposed Directory Structure

```
/Users/seankim/dev/visualizations/
├── assets/
│   └── koi/
│       ├── body-parts/
│       │   ├── body.svg                  # Main body outline
│       │   ├── tail.svg                  # Tail shape
│       │   ├── dorsal-fin.svg            # Dorsal fin
│       │   ├── pectoral-fin.svg          # Optional: pectoral fins
│       │   └── ventral-fin.svg           # Optional: ventral fins
│       ├── templates/
│       │   ├── segment-guide.svg         # Template with 10 segment markers
│       │   └── dimension-guide.svg       # Reference dimensions
│       └── README.md                     # SVG authoring guidelines
├── flocking/
│   └── src/
│       └── core/
│           ├── koi-renderer.js           # Current renderer (modify)
│           ├── koi-params.js             # Parameters
│           └── svg-parser.js             # NEW: SVG to vertex parser
└── thoughts/
    └── research/
        └── 2025-10-22-koi-rendering-system-body-part-structure-for-svg-transition.md
```

---

## Implementation Roadmap

### Phase 1: Parser Development
1. Create `svg-parser.js` module
2. Implement SVG path to vertex array conversion
3. Test with simple shapes
4. Create vertex-to-segment mapping function

### Phase 2: Body Conversion
1. Author `body.svg` in Illustrator with ~20 control points
2. Test SVG parsing and vertex extraction
3. Integrate into `drawBody()` function
4. Verify wave deformation works correctly
5. Compare visual output with procedural version

### Phase 3: Tail Conversion
1. Author `tail.svg` in Illustrator with ~14 control points
2. Parse and integrate into `drawTail()` function
3. Verify independent tail sway animation
4. Adjust amplitude/timing if needed

### Phase 4: Fin Conversion
1. Author `dorsal-fin.svg` in Illustrator
2. Integrate into `drawFins()` function
3. Optionally create SVG versions of pectoral/ventral fins
4. Test rotation and sway animations with SVG fins

### Phase 5: Testing and Refinement
1. Visual comparison tests (procedural vs SVG)
2. Performance benchmarking
3. Animation smoothness verification
4. Edge case testing (extreme sizes, fast motion)

---

## Technical Considerations

### Vertex Count Trade-offs

**More vertices**:
- ✅ Smoother curves
- ✅ More detailed shapes
- ✅ Better representation of artist's intent
- ❌ Slightly higher performance cost
- ❌ More complex deformation calculations

**Fewer vertices**:
- ✅ Better performance
- ✅ Simpler deformation math
- ❌ Less smooth curves
- ❌ Limited detail

**Recommendation**: Start with ~20 vertices for body (matching current segments) and ~14 for tail. Can optimize later if performance is an issue.

### Deformation Algorithm Compatibility

**Current system** (line 133):
```javascript
const y = Math.sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);
```

This algorithm is **position-based** (uses `t` as position along body), not vertex-based.

**For SVG vertices**:
- Must map each vertex X coordinate to a position value `t`
- Apply same sine wave with that `t` value
- Ensures consistent wave motion across SVG and procedural parts

**Mapping function**:
```javascript
function mapVertexToSegment(vertexX, minX, maxX, numSegments) {
    const t = (vertexX - minX) / (maxX - minX);  // Normalize to 0-1
    const segmentIndex = Math.floor(t * numSegments);
    return Math.min(segmentIndex, numSegments - 1);
}
```

### Sumi-e Style with SVG

**Current approach**: Draw same shape multiple times with offsets and varying opacity (lines 321-352)

**With SVG vertices**:
- Parse SVG vertices once
- Render multiple times with offsets in drawing loop
- Same multi-layer rendering can be applied
- May want to add slight vertex jitter for more organic look

---

## Reference Data

### Shape Parameters (from koi-params.js)

All default values from `/Users/seankim/dev/visualizations/flocking/src/core/koi-params.js`:

```javascript
// Body structure
numSegments: 10
bodyPeakPosition: 0.7      // Peak width at 70% along body
bodyPeakWidth: 8.0         // Maximum width
bodyFrontWidth: 4.5        // Front width
bodyAsymmetry: 0.9         // Belly rounder than back
bodyTaperStart: 0.15       // Tapering begins at 15%
bodyTaperStrength: 0.9     // Taper by 90%

// Head
headX: -0.6
headWidth: 7.5
headHeight: 5.0

// Eyes
eyeX: 1.3
eyeYTop: -2.2
eyeYBottom: 2.0
eyeSize: 1.0

// Tail
tailStartX: -1
tailWidthStart: 0.2
tailWidthEnd: 1.5

// Dorsal fin
dorsalPos: 4               // Segment 4
dorsalY: -0.5

// Pectoral fins
pectoralPos: 2             // Segment 2
pectoralYTop: -2
pectoralAngleTop: -2.5
pectoralYBottom: 2
pectoralAngleBottom: 2.1

// Ventral fins
ventralPos: 7              // Segment 7
ventralYTop: -1
ventralAngleTop: -2.5
ventralYBottom: 1
ventralAngleBottom: 2.5
```

### Animation Parameters

**Wave motion**:
- Base amplitude: 1.5 units
- Frequency multiplier: 3.5
- Amplitude decay: 20% (front to back)

**Tail sway**:
- Amplitude: 3 units
- Phase offset: -2.5
- Tip amplification: 50% to 100%

**Fin sway**:
- Pectoral vertical: ±0.8 units
- Pectoral rotation: ±0.15 radians
- Ventral rotation: ±0.1 radians

---

## Code References

| Component | File | Lines | Function |
|-----------|------|-------|----------|
| Main renderer | koi-renderer.js | 71-122 | `render()` |
| Segment calculation | koi-renderer.js | 127-160 | `calculateSegments()` |
| Body drawing | koi-renderer.js | 316-406 | `drawBody()` |
| Tail drawing | koi-renderer.js | 253-311 | `drawTail()` |
| Fin drawing | koi-renderer.js | 166-248 | `drawFins()` |
| Head/eye drawing | koi-renderer.js | 447-492 | `drawHead()` |
| Spot drawing | koi-renderer.js | 411-442 | `drawSpots()` |
| Shape parameters | koi-params.js | 6-52 | `DEFAULT_SHAPE_PARAMS` |
| Parameter ranges | koi-params.js | 54-93 | `PARAMETER_RANGES` |

---

## Open Questions

1. **SVG Parsing Library**: Which library/approach should be used for SVG parsing? Native browser API vs third-party?

2. **Vertex Density**: Should body SVG have exactly 20 vertices (matching 10 segments × 2) or allow more detail?

3. **Fin Strategy**: Should pectoral and ventral fins be converted to SVG, or kept as procedural ellipses?

4. **Performance Impact**: What is the performance difference between procedural generation and SVG vertex rendering?

5. **Asset Workflow**: Should SVG files include metadata about vertex-to-segment mapping, or calculate at runtime?

6. **Backwards Compatibility**: Should the renderer support both procedural and SVG modes, or fully transition?

7. **Spot Pattern**: Current spots are procedurally placed ellipses - should these also be SVG, or remain procedural?

---

## Conclusion

The koi rendering system has a well-defined structure with **8 distinct body parts** rendered across **5 functions**, using a **10-segment backbone** for positioning and wave-based animation. The parts most suitable for SVG conversion are:

1. **Body outline** - Complex curved path, primary conversion target
2. **Tail** - Flowing shape with independent motion, primary target
3. **Dorsal fin** - Simple polygon, good conversion candidate

The parser needs to convert SVG paths to vertex arrays that can be deformed using the existing wave animation math. The key challenge is mapping SVG vertices to body segments based on position along the length of the fish.

The hybrid approach (SVG for complex shapes, procedural for simple primitives) provides the best balance of artistic control and performance.
