---
doc_type: research
date: 2025-10-26T15:55:14+00:00
title: "Wave Deformation Crinkling Analysis"
research_question: "Why do the tail and dorsal fin crinkle during wave animation?"
researcher: Claude

git_commit: f13984e2560e55d7e6530daf1e129c38ead79414
branch: main
repository: workspace

created_by: Claude
last_updated: 2025-10-26
last_updated_by: Claude

tags:
  - rendering
  - animation
  - svg
  - wave-deformation
  - debugging
status: draft

related_docs: []
---

# Research: Wave Deformation Crinkling Analysis

**Date**: 2025-10-26T15:55:14+00:00
**Researcher**: Claude
**Git Commit**: f13984e2560e55d7e6530daf1e129c38ead79414
**Branch**: main
**Repository**: workspace

## Research Question

Why do the tail and dorsal fin appear to "crinkle" or distort during wave animation, when the main wave movement looks correct?

## Summary

The crinkling/distortion is caused by a **mismatch between vertex count and segment count**, combined with **discrete (non-interpolated) vertex-to-segment mapping**. Specifically:

1. **Too Few Segments vs. Too Many Vertices**: Tail uses 6 segments but has 21 vertices (20 + 1 endpoint). Dorsal fin uses 4 segments but also has 21 vertices. This creates a **3.5:1 vertex-to-segment ratio** for tail and **5.25:1** for dorsal fin.

2. **Discrete Mapping with No Interpolation**: The `mapVertexToSegment()` method maps each vertex to exactly ONE segment using `Math.floor()`, causing abrupt "jumps" when adjacent vertices map to different segments.

3. **Visual Result**: As the wave animates, vertices snap between segment Y-offsets, creating a stair-step or accordion-like visual distortion instead of smooth wave motion.

## Detailed Findings

### 1. Wave Deformation Implementation

**Location**: `/workspace/flocking/src/core/koi-renderer.js:592-603`

The `applyWaveDeformation()` method is straightforward:

```javascript
applyWaveDeformation(vertices, params) {
    const { segmentPositions, numSegments } = params;

    return vertices.map(v => {
        const segIdx = this.mapVertexToSegment(v.x, vertices, numSegments);
        const segment = segmentPositions[segIdx];
        return {
            x: v.x,
            y: v.y + segment.y  // Simply adds segment Y offset to vertex Y
        };
    });
}
```

**How it works**:
- Maps each vertex's X coordinate to a segment index
- Adds that segment's Y offset to the vertex's Y coordinate
- No interpolation between segments - uses discrete segment mapping

**Issue**: This approach assumes vertices are distributed somewhat evenly across segments. When you have 21 vertices and only 4-6 segments, multiple vertices map to the same segment, then suddenly jump to the next segment.

---

### 2. Vertex-to-Segment Mapping Logic

**Location**: `/workspace/flocking/src/core/koi-renderer.js:751-770`

```javascript
mapVertexToSegment(vertexX, svgVertices, numSegments) {
    // Find X bounds of SVG vertices
    const xs = svgVertices.map(v => v.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);

    // Normalize vertex X to 0-1 range
    const t = (vertexX - minX) / (maxX - minX);

    // Flip t because SVG has head at positive X, but segments[0] is head
    const flippedT = 1 - t;

    // Map to segment index
    const segmentIndex = Math.floor(flippedT * numSegments);

    // Clamp to valid range
    return Math.min(Math.max(0, segmentIndex), numSegments - 1);
}
```

**How it works**:
1. Normalizes vertex X position to 0-1 range across SVG bounds
2. Flips the normalized value (because SVG coordinate space has head at positive X, segments[0] at head)
3. **Uses `Math.floor()` to discretely map to segment index** (THIS IS THE PROBLEM)
4. Clamps to valid segment range

**Critical Issue**: `Math.floor(flippedT * numSegments)` creates discrete buckets with no smoothing:
- With 6 segments: Each segment "owns" 1/6 of the X range (16.67%)
- With 21 vertices evenly distributed: ~3-4 vertices per segment
- When animation causes segment Y values to change, ALL vertices in that bucket jump together
- Adjacent vertices in DIFFERENT buckets get different Y offsets, creating visible discontinuities

**Geometric Example** (Tail with 6 segments, 21 vertices):
```
Vertex positions (normalized 0-1):
[0.00, 0.05, 0.10, 0.15, 0.20, 0.25, ...]

Segment mapping (Math.floor(flippedT * 6)):
Vertices 0-2   -> Segment 0 (Y offset = +2.1)
Vertices 3-5   -> Segment 1 (Y offset = +1.8)
Vertices 6-8   -> Segment 2 (Y offset = +0.9)
Vertices 9-11  -> Segment 3 (Y offset = -0.3)
...

Result: "Stair-step" pattern instead of smooth curve
```

---

### 3. Tail Segment Creation

**Location**: `/workspace/flocking/src/core/koi-renderer.js:478-492`

```javascript
// Create extended segments for tail (continues body wave motion)
const numTailSegments = 6;  // HARDCODED: Only 6 segments
const tailSegments = [];
const bodySegmentCount = segmentPositions.length;

for (let i = 0; i < numTailSegments; i++) {
    const t = i / numTailSegments;
    const x = tailStartX - (t * tailLength * 6 * sizeScale);
    const waveT = 1 + (t * 0.5); // Continue wave beyond body end
    const y = Math.sin(waveTime - waveT * 3.5) * 1.5 * sizeScale * (1 - waveT * 0.2);
    tailSegments.push({ x, y, w: 0 });
}
```

**Key Facts**:
- Creates exactly **6 segments** for tail wave deformation
- Segments use smooth sine wave formula: `Math.sin(waveTime - waveT * 3.5)`
- Wave motion itself is smooth and correct
- But only 6 discrete sample points along the tail

**Problem**: 6 segments trying to represent a smooth wave across 21 vertices creates the stair-step effect.

---

### 4. Dorsal Fin Segment Creation

**Location**: `/workspace/flocking/src/core/koi-renderer.js:301-315`

```javascript
// Create mini body segments for dorsal fin to follow body wave
const waveDampening = 0.5; // Reduce wave amplitude to 50%
const dorsalSegments = [];
const dorsalStartIdx = Math.max(0, shapeParams.dorsalPos - 1);
const dorsalEndIdx = Math.min(segmentPositions.length - 1, shapeParams.dorsalPos + 2);

for (let i = dorsalStartIdx; i <= dorsalEndIdx; i++) {
    // Dampen the Y offset for a more subtle wave
    dorsalSegments.push({
        x: segmentPositions[i].x,
        y: segmentPositions[i].y * waveDampening,
        w: segmentPositions[i].w
    });
}
```

**Key Facts**:
- Uses body segments in range `[dorsalPos - 1, dorsalPos + 2]`
- With default `dorsalPos` around segment 3-4 (out of ~12 body segments)
- This creates approximately **4 segments** for dorsal fin
- Wave dampened to 50% amplitude (correct, not related to crinkling)

**Problem**: Even worse ratio than tail - **4 segments for 21 vertices** = 5.25:1 ratio.

---

### 5. SVG Path Structure and Vertex Density

**SVG Files**:
- `/workspace/flocking/assets/koi/body-parts/tail.svg` - Single `<path>` element
- `/workspace/flocking/assets/koi/body-parts/dorsal-fin.svg` - Single `<path>` element

**Vertex Sampling** (from `/workspace/flocking/src/core/svg-parser.js:110-128`):

```javascript
static parsePathData(pathData, numPoints = 20) {
    // ...
    const length = path.getTotalLength();
    const vertices = [];

    for (let i = 0; i <= numPoints; i++) {  // NOTE: <= creates 21 vertices (0 to 20 inclusive)
        const point = path.getPointAtLength((i / numPoints) * length);
        vertices.push({ x: point.x, y: point.y });
    }
    // ...
}
```

**Actual Loading** (from `/workspace/flocking/src/apps/simulation-app.js`):
```javascript
// Line 77-79: Tail loading
tailVertices = await SVGParser.loadSVGFromURL(
    'assets/koi/body-parts/tail.svg',
    20,  // numPoints parameter
    { width: 6, height: 4 }
);

// Line 98-100: Dorsal fin loading
dorsalFinVertices = await SVGParser.loadSVGFromURL(
    'assets/koi/body-parts/dorsal-fin.svg',
    20,  // numPoints parameter
    { width: 4, height: 5 }
);
```

**Key Facts**:
- Both tail and dorsal fin request **20 sample points**
- Parser uses `i <= numPoints` (inclusive), creating **21 total vertices** (0, 1, 2, ..., 20)
- Vertices are uniformly sampled along path using `getPointAtLength()`
- High vertex density ensures smooth SVG representation

**Problem**: High vertex density is good for visual fidelity, but creates severe mismatch when mapped to only 4-6 segments.

---

### 6. Visual Analysis: What's Happening Geometrically

**Smooth Wave (What We Want)**:
```
Y-offset curve along tail:
  ^
  |     ___
  |   /     \
  |  /       \___
  | /            \___
  |/                 \___
  +---------------------> X
  (Smooth sine curve)
```

**Actual Stair-Step (What We Get with 6 segments)**:
```
Y-offset by vertex position:
  ^
  | ████
  |     ████
  |         ████
  |             ████
  |                 ████
  |                     ████
  +---------------------> X
  (Discrete steps create "crinkling")
```

**Why It Crinkles During Animation**:
As `waveTime` advances:
1. Each segment's Y offset changes smoothly (sine wave)
2. But vertices are LOCKED to their assigned segment
3. When a vertex crosses a segment boundary in the mapping, it suddenly jumps to a different Y offset
4. This creates visible "accordion" or "crinkling" artifacts
5. The effect is especially noticeable at segment boundaries where Y offset deltas are large

---

## Root Cause Summary

**Primary Cause**: Discrete vertex-to-segment mapping with insufficient segment resolution.

**Contributing Factors**:
1. **Low Segment Count**: 6 segments (tail), 4 segments (dorsal fin)
2. **High Vertex Count**: 21 vertices for both
3. **No Interpolation**: `Math.floor()` mapping with no blend between adjacent segments
4. **Visibility**: Long, thin shapes (tail, dorsal fin) make stair-stepping highly visible

**Why Body Doesn't Crinkle**:
- Body uses ~12 segments (from `shapeParams.numSegments`)
- Better segment-to-vertex ratio (~1.75:1 vs. 3.5:1 or 5.25:1)
- Body is wider/shorter, making stair-steps less noticeable
- Body vertices likely better distributed across segment boundaries

---

## Solution Options

### Option A: Interpolate Between Segments (RECOMMENDED)

**Description**: Modify `applyWaveDeformation()` to blend Y offsets from adjacent segments instead of snapping to one segment.

**Implementation**:
```javascript
applyWaveDeformation(vertices, params) {
    const { segmentPositions, numSegments } = params;

    return vertices.map(v => {
        const xs = vertices.map(v => v.x);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const t = (v.x - minX) / (maxX - minX);
        const flippedT = 1 - t;

        // Map to FLOATING POINT segment position
        const segmentFloat = flippedT * (numSegments - 1);
        const segIdx = Math.floor(segmentFloat);
        const nextIdx = Math.min(segIdx + 1, numSegments - 1);
        const blend = segmentFloat - segIdx;  // 0 to 1 within segment

        // Interpolate Y offset between adjacent segments
        const segment1 = segmentPositions[segIdx];
        const segment2 = segmentPositions[nextIdx];
        const yOffset = segment1.y * (1 - blend) + segment2.y * blend;

        return {
            x: v.x,
            y: v.y + yOffset
        };
    });
}
```

**Pros**:
- Smooths wave deformation with minimal performance cost
- Works with existing segment counts
- No SVG re-parsing needed
- Mathematically sound (linear interpolation)

**Cons**:
- Slightly more complex code
- Minor performance overhead (negligible)

**Estimated Impact**: Completely eliminates crinkling while maintaining existing architecture.

---

### Option B: Increase Segment Count

**Description**: Increase tail segments from 6 to ~20, dorsal fin segments from 4 to ~20.

**Implementation**:
```javascript
// In drawTailFromSVG() - Line 480
const numTailSegments = 20;  // Was 6

// In drawFins() for dorsal fin - Lines 305-306
const dorsalStartIdx = Math.max(0, shapeParams.dorsalPos - 5);
const dorsalEndIdx = Math.min(segmentPositions.length - 1, shapeParams.dorsalPos + 14);
// Creates ~20 segments instead of 4
```

**Pros**:
- Simple conceptual fix
- Creates 1:1 vertex-to-segment ratio
- No algorithm changes needed

**Cons**:
- Wastes computation (creating segments just to match vertex count)
- Doesn't address fundamental design issue
- Harder to maintain (magic numbers)
- May need to adjust wave formulas to maintain same visual appearance

**Estimated Impact**: Would reduce crinkling significantly but doesn't solve root problem.

---

### Option C: Reduce Vertex Count (NOT RECOMMENDED)

**Description**: Reduce SVG sampling from 20 points to 6 points for tail, 4 for dorsal fin.

**Implementation**:
```javascript
// In simulation-app.js and editor-app.js
tailVertices = await SVGParser.loadSVGFromURL(
    'assets/koi/body-parts/tail.svg',
    6,  // Was 20 - matches segment count
    { width: 6, height: 4 }
);

dorsalFinVertices = await SVGParser.loadSVGFromURL(
    'assets/koi/body-parts/dorsal-fin.svg',
    4,  // Was 20 - matches segment count
    { width: 4, height: 5 }
);
```

**Pros**:
- Creates 1:1 vertex-to-segment ratio
- Eliminates multiple vertices per segment

**Cons**:
- **SEVERE VISUAL DEGRADATION**: Only 6-7 vertices cannot represent smooth curved shapes
- SVG shapes will look jagged/polygonal even when stationary
- Loses benefit of high-quality SVG art
- Defeats purpose of using SVG paths

**Estimated Impact**: Would fix crinkling but destroy visual quality. NOT VIABLE.

---

### Option D: Catmull-Rom Spline Interpolation (ADVANCED)

**Description**: Use spline interpolation across segments for smoother wave propagation.

**Implementation**:
```javascript
applyWaveDeformation(vertices, params) {
    const { segmentPositions, numSegments } = params;

    return vertices.map(v => {
        // Calculate normalized position along shape
        const xs = vertices.map(v => v.x);
        const t = (v.x - Math.min(...xs)) / (Math.max(...xs) - Math.min(...xs));
        const flippedT = 1 - t;

        // Use Catmull-Rom spline to interpolate Y offset
        const yOffset = this.catmullRomInterpolate(
            segmentPositions.map(s => s.y),
            flippedT * (numSegments - 1)
        );

        return { x: v.x, y: v.y + yOffset };
    });
}

catmullRomInterpolate(points, t) {
    // Catmull-Rom spline implementation
    // See: https://en.wikipedia.org/wiki/Catmull%E2%80%93Rom_spline
    // ... implementation details ...
}
```

**Pros**:
- Smoothest possible interpolation
- Professional-grade curve fitting
- Handles non-uniform segment spacing

**Cons**:
- Significant code complexity
- Overkill for this use case (linear interpolation is sufficient)
- Harder to debug and maintain

**Estimated Impact**: Would create buttery-smooth deformation, but unnecessary complexity.

---

## Recommended Solution: Option A (Linear Interpolation)

**Why**:
1. Minimal code change (~10 lines modified)
2. Fixes root cause (discrete mapping) without changing architecture
3. Performance impact negligible (one extra lerp per vertex)
4. Maintains existing segment counts and wave formulas
5. Mathematically simple and easy to understand/debug

**Implementation Location**: `/workspace/flocking/src/core/koi-renderer.js:592-603`

**Testing Requirements**:
1. Verify tail wave is smooth during animation
2. Verify dorsal fin wave is smooth during animation
3. Ensure no performance regression
4. Test with different `waveTime` values
5. Verify body, pectoral fins, ventral fins still render correctly (should be unaffected)

**Rollback Plan**: Simple - revert to discrete mapping if issues arise.

---

## Code References

**Core Implementation**:
- `koi-renderer.js:592-603` - `applyWaveDeformation()` method (NEEDS FIX)
- `koi-renderer.js:751-770` - `mapVertexToSegment()` method (discrete mapping)
- `koi-renderer.js:478-492` - Tail segment creation (6 segments)
- `koi-renderer.js:301-315` - Dorsal fin segment creation (4 segments)

**SVG Loading**:
- `svg-parser.js:110-128` - `parsePathData()` creates 21 vertices
- `simulation-app.js:77-79` - Tail SVG loading (20 points -> 21 vertices)
- `simulation-app.js:98-100` - Dorsal fin SVG loading (20 points -> 21 vertices)
- `editor-app.js:57-59` - Same as simulation-app.js for editor

**SVG Assets**:
- `tail.svg` - Single path element (curved tail shape)
- `dorsal-fin.svg` - Single path element (triangular fin shape)

---

## Related Research

- Pectoral and ventral fins use 'rotate' deformation (not 'wave'), so they are unaffected by this issue
- Body uses 'wave' deformation but has better segment-to-vertex ratio (~12 segments)
- This research directly informs implementation for fixing tail/dorsal fin rendering

---

## Open Questions

1. **Performance**: Is linear interpolation fast enough for 60fps with 100+ koi on screen?
   - Likely YES - single lerp per vertex is trivial
   - Can benchmark if needed

2. **Visual Fidelity**: Will linear interpolation look "smooth enough" or do we need spline?
   - Linear should be sufficient for sine wave (already smooth function)
   - Can upgrade to spline later if needed

3. **Segment Count**: Should we still increase segment counts as a secondary improvement?
   - Not necessary with interpolation
   - Could reduce segments to improve performance (fewer wave calculations)

4. **Other Body Parts**: Do head, pectoral fins, ventral fins have similar issues?
   - NO - they use 'rotate' or 'static' deformation, not 'wave'
   - Only body, tail, and dorsal fin use wave deformation

---

## Next Steps

1. Implement Option A (linear interpolation) in `applyWaveDeformation()`
2. Test with tail and dorsal fin in both editor and simulation
3. Verify smooth wave motion with no crinkling
4. Consider reducing segment counts (optional performance optimization)
5. Document the fix in implementation notes
