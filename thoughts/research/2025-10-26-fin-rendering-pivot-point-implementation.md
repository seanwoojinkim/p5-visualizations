---
doc_type: research
date: 2025-10-26T14:10:12+00:00
title: "Fin Rendering Pivot Point Implementation"
research_question: "How are fin pivot points currently set and how can they be improved to pivot at the body-connection point instead of the center?"
researcher: Claude

git_commit: f13984e2560e55d7e6530daf1e129c38ead79414
branch: main
repository: workspace

created_by: Claude
last_updated: 2025-10-26
last_updated_by: Claude

tags:
  - rendering
  - fins
  - svg
  - animation
  - pivot-points
status: complete

related_docs: []
---

# Research: Fin Rendering Pivot Point Implementation

**Date**: 2025-10-26T14:10:12+00:00
**Researcher**: Claude
**Git Commit**: f13984e2560e55d7e6530daf1e129c38ead79414
**Branch**: main
**Repository**: workspace

## Research Question

How are fin pivot points currently set in the SVG-based fin rendering system, and how can they be improved to pivot at the body-connection point instead of the center?

## Executive Summary

The SVG-based fin rendering system currently rotates fins around their geometric center due to an interaction between `SVGParser.normalizeVertices()` (which centers shapes at origin) and `applyRotationDeformation()` (which uses pivot `{x: 0, y: 0}`). This creates unnatural "helicopter blade" motion where fins rotate around their center instead of their attachment point to the body.

**Root Cause**: SVG normalization centers all shapes at `(0, 0)`, making the current pivot point `{x: 0, y: 0}` correspond to the shape center rather than the attachment edge.

**Solution**: Calculate pivot dynamically as the leftmost edge center of normalized vertices: `{x: minX, y: 0}`. This matches the procedural fin rendering approach where the pivot (rotation origin) is separate from the shape center.

**Impact**: All three fin types (pectoral, ventral, dorsal) are affected. The fix is universal across mirrored and non-mirrored fins.

## Detailed Findings

### 1. Current Pivot Point Implementation

#### Location in Code
**File**: `/workspace/flocking/src/core/koi-renderer.js`

The pivot point is set in two places:

1. **drawFinFromSVG** (lines 205-226):
```javascript
drawFinFromSVG(context, segmentPos, svgVertices, yOffset, baseAngle,
               waveTime, rotationAmplitude, sway, sizeScale,
               hue, saturation, brightness, mirror = 'none') {
    this.drawSVGShape(context, svgVertices, {
        deformationType: 'rotate',
        deformationParams: {
            waveTime,
            rotationAmplitude,
            rotationFrequency: 1.2,
            pivot: { x: 0, y: 0 }, // ← CURRENT PIVOT (line 212)
            ySwayAmplitude: 0,
            ySwayPhase: 0
        },
        // ... other params
    });
}
```

2. **applyRotationDeformation** (lines 636-664):
```javascript
applyRotationDeformation(vertices, params) {
    const {
        waveTime,
        rotationAmplitude = 0,
        rotationFrequency = 1.2,
        pivot = { x: 0, y: 0 }, // ← DEFAULT PIVOT (line 641)
        ySwayAmplitude = 0,
        ySwayPhase = -0.5
    } = params;

    const rotationAngle = Math.sin(waveTime * rotationFrequency) * rotationAmplitude;
    // ... rotation matrix calculation

    return vertices.map(v => {
        const dx = v.x - pivot.x;  // Offset from pivot
        const dy = v.y - pivot.y;

        const rotatedX = dx * cos - dy * sin;
        const rotatedY = dx * sin + dy * cos;

        return {
            x: rotatedX + pivot.x,
            y: rotatedY + pivot.y + ySway
        };
    });
}
```

#### Current Behavior
- **Hardcoded pivot**: `{x: 0, y: 0}` in all fin rendering
- **Problem**: This pivot is at the **center** of normalized vertices
- **Result**: Fins rotate around their center like helicopter blades

### 2. SVG Fin Geometry Analysis

#### Raw SVG Coordinates

All fin SVG files are designed with the **left edge at X=0** (attachment point):

**Pectoral Fin** (`pectoral-fin.svg`):
```
ViewBox: 0 0 4.5 2
Polygon points: "0 1 1.12 .25 2.25 .1 4.33 .1 4.04 1 3.66 1.9 2.25 1.9 1.12 1.75 0 1"
Raw bounds: X[0.00, 4.33] Y[0.10, 1.90]
Size: 4.33 × 1.80
Left edge (attachment): X = 0.00
Right edge (fin tip): X = 4.33
```

**Ventral Fin** (`ventral-fin.svg`):
```
ViewBox: 0 0 3 1.5
Polygon points: "0 .75 .75 .19 1.5 .07 2.25 .38 3 .75 2.25 1.12 1.5 1.43 .75 1.31 0 .75"
Raw bounds: X[0.00, 3.00] Y[0.07, 1.43]
Size: 3.00 × 1.36
Left edge (attachment): X = 0.00
Right edge (fin tip): X = 3.00
```

**Dorsal Fin** (`dorsal-fin.svg`):
```
ViewBox: 0 0 20 25
Path: "M 10,25 L 5,8 L 12,2 L 18,10 L 18,25 Z"
Raw bounds: X[5.00, 18.00] Y[2.00, 25.00]
Size: 13.00 × 23.00
Note: Uses path element, not polygon
```

### 3. SVG Normalization Process

**File**: `/workspace/flocking/src/core/svg-parser.js` (lines 149-178)

The `normalizeVertices()` function:
1. Calculates bounding box
2. Centers shape at origin `(0, 0)`
3. Scales to target dimensions while preserving aspect ratio

#### Normalization Algorithm
```javascript
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

    // Calculate scale (preserve aspect ratio)
    const scaleX = targetWidth / currentWidth;
    const scaleY = targetHeight / currentHeight;
    const scale = Math.min(scaleX, scaleY);

    // Transform: center at origin and scale
    const centerX = minX + currentWidth / 2;
    const centerY = minY + currentHeight / 2;

    return vertices.map(v => ({
        x: (v.x - centerX) * scale,  // ← Centers at 0
        y: (v.y - centerY) * scale   // ← Centers at 0
    }));
}
```

#### Target Dimensions for Fins

**File**: `/workspace/flocking/src/apps/simulation-app.js` (lines 91-109)

```javascript
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
```

#### Normalized Coordinates

After normalization, all fins are centered at `(0, 0)`:

**Pectoral Fin** (4.5 × 2 target):
```
Normalized bounds: X[-2.25, 2.25] Y[-0.94, 0.94]
Center: (0.00, 0.00) ← Centered by normalization
Left edge (attachment): X = -2.25
Right edge (fin tip): X = 2.25
```

**Ventral Fin** (3 × 1.5 target):
```
Normalized bounds: X[-1.50, 1.50] Y[-0.68, 0.68]
Center: (0.00, 0.00) ← Centered by normalization
Left edge (attachment): X = -1.50
Right edge (fin tip): X = 1.50
```

**Dorsal Fin** (4 × 5 target):
```
Normalized bounds: X[-1.41, 1.41] Y[-2.50, 2.50]
Center: (0.00, 0.00) ← Centered by normalization
Left edge (attachment): X = -1.41
Right edge (fin tip): X = 1.41
```

### 4. Procedural Fin Rendering Comparison

**File**: `/workspace/flocking/src/core/koi-renderer.js` (lines 340-364)

Procedural fins (fallback when SVG not loaded) **do pivot correctly**:

```javascript
// Top pectoral fin (left)
context.push();
context.translate(finPos.x, finPos.y + shapeParams.pectoralYTop * sizeScale + finSway);
context.rotate(shapeParams.pectoralAngleTop + Math.sin(waveTime * 1.2) * 0.15);
context.ellipse(2.25 * sizeScale, 0, 4.5 * sizeScale, 2 * sizeScale);
//              ^^^^^^^^^^^^^^^^ ← Ellipse CENTER offset from origin
context.pop();
```

#### Key Insight from Procedural Approach

**Separation of pivot and shape center**:
- `translate()` sets the **pivot point** (rotation origin)
- `rotate()` rotates around current origin (the pivot)
- `ellipse(2.25, 0, ...)` draws the shape with its **center offset** from pivot
- Result: Rotation happens at attachment point, not shape center

**Effective pivot**: `(0, 0)` in transformed space = attachment point
**Effective shape center**: `(2.25, 0)` = extends rightward from pivot

This matches the fin's physical structure: attached at one edge, extending outward.

### 5. Fin Positioning in drawFins()

**File**: `/workspace/flocking/src/core/koi-renderer.js` (lines 245-330)

All fins are positioned at specific body segments with Y offsets:

#### Pectoral Fins
```javascript
const finPos = segmentPositions[shapeParams.pectoralPos];  // segment index 2

// Top pectoral fin
drawFinFromSVG(
    context, finPos, svgVertices.pectoralFin,
    shapeParams.pectoralYTop,      // Y offset: -3.5
    shapeParams.pectoralAngleTop,  // Base angle: -2.50 rad
    waveTime,
    0.15,  // rotationAmplitude
    finSway,
    sizeScale,
    hue, saturation, brightness,
    'none'  // No mirroring
);

// Bottom pectoral fin (mirrored)
drawFinFromSVG(
    context, finPos, svgVertices.pectoralFin,
    shapeParams.pectoralYBottom,      // Y offset: 3.5
    shapeParams.pectoralAngleBottom,  // Base angle: 2.20 rad
    waveTime,
    -0.15,  // Negative rotation (opposite)
    -finSway,  // Opposite sway
    sizeScale,
    hue, saturation, brightness,
    'vertical'  // Mirror vertically
);
```

#### Dorsal Fin
```javascript
const dorsalPos = segmentPositions[shapeParams.dorsalPos];  // segment index 0

drawFinFromSVG(
    context, dorsalPos, svgVertices.dorsalFin,
    shapeParams.dorsalY,  // Y offset: -0.5
    -0.2,  // Base angle (static)
    waveTime,
    0,  // No rotation animation
    0,  // No sway
    sizeScale,
    hue, saturation, brightness,
    'none'
);
```

#### Ventral Fins
```javascript
const ventralPos = segmentPositions[shapeParams.ventralPos];  // segment index 7

// Top ventral fin
drawFinFromSVG(
    context, ventralPos, svgVertices.ventralFin,
    shapeParams.ventralYTop,      // Y offset: -2.0
    shapeParams.ventralAngleTop,  // Base angle: -2.50 rad
    waveTime,
    0.1,  // rotationAmplitude
    0,  // No sway
    sizeScale,
    hue, saturation, brightness,
    'none'
);

// Bottom ventral fin (mirrored)
drawFinFromSVG(
    context, ventralPos, svgVertices.ventralFin,
    shapeParams.ventralYBottom,      // Y offset: 2.0
    shapeParams.ventralAngleBottom,  // Base angle: 2.50 rad
    waveTime,
    -0.1,  // Opposite rotation
    0,
    sizeScale,
    hue, saturation, brightness,
    'vertical'  // Mirror vertically
);
```

### 6. Mirroring Effects on Pivot Points

**File**: `/workspace/flocking/src/core/koi-renderer.js` (lines 697-704)

```javascript
applyMirror(vertices, mirror) {
    if (mirror === 'none') return vertices;

    return vertices.map(v => ({
        x: mirror === 'horizontal' ? -v.x : v.x,
        y: mirror === 'vertical' ? -v.y : v.y
    }));
}
```

#### Critical Finding: Vertical Mirroring Preserves X Coordinates

Current fins use **vertical mirroring only** (y → -y):
- X coordinates remain unchanged
- Attachment edge (at minX) stays at same position
- **Same pivot formula works for both mirrored and non-mirrored fins**

Example with pectoral fin:
```
Top fin (no mirror):
  Vertices: X[-2.25, 2.25] Y[-0.94, 0.94]
  Pivot: (-2.25, 0) ← left edge center

Bottom fin (vertical mirror):
  Vertices: X[-2.25, 2.25] Y[0.94, -0.94]  (Y flipped)
  Pivot: (-2.25, 0) ← SAME left edge center
```

Horizontal mirroring (not currently used) **would** require different pivot calculation:
- Would flip x → -x
- Attachment edge would move from minX to maxX
- Pivot formula would need conditional logic

### 7. The Root Cause Explained

**The Problem Chain**:

1. **SVG Design**: Fins designed with attachment at left edge (X=0 in raw SVG)
2. **Normalization**: `SVGParser.normalizeVertices()` centers shape at `(0, 0)`
3. **Pivot Hardcoded**: `applyRotationDeformation()` uses pivot `{x: 0, y: 0}`
4. **Misalignment**: Pivot `(0, 0)` now points to **shape center**, not attachment edge
5. **Wrong Rotation**: Fins rotate around center instead of attachment point

**Visual Comparison**:

```
INTENDED (like procedural fins):
    Body          Fin
    ====|---------->
        ^
        Pivot at attachment edge

ACTUAL (current SVG):
    Body      Fin
    ====  <---•--->
              ^
              Pivot at center (wrong!)
```

## Solution Analysis

### Option A: Calculate Pivot Dynamically from Vertices ⭐ RECOMMENDED

**Approach**: Compute pivot as leftmost edge center of normalized vertices.

**Implementation**:
```javascript
drawFinFromSVG(context, segmentPos, svgVertices, yOffset, baseAngle,
               waveTime, rotationAmplitude, sway, sizeScale,
               hue, saturation, brightness, mirror = 'none') {

    // Calculate attachment edge pivot
    const xs = svgVertices.map(v => v.x);
    const minX = Math.min(...xs);
    const attachmentPivot = { x: minX, y: 0 };

    this.drawSVGShape(context, svgVertices, {
        deformationType: 'rotate',
        deformationParams: {
            waveTime,
            rotationAmplitude,
            rotationFrequency: 1.2,
            pivot: attachmentPivot,  // ← Dynamic pivot
            ySwayAmplitude: 0,
            ySwayPhase: 0
        },
        // ... rest unchanged
    });
}
```

**Pros**:
- ✅ Works with any SVG shape automatically
- ✅ No metadata or manual configuration needed
- ✅ Robust across different fin designs
- ✅ Handles both mirrored and non-mirrored fins
- ✅ Minimal code changes (single function)
- ✅ No performance impact (one-time calculation per frame)

**Cons**:
- ❌ Assumes left edge is always attachment (valid for current designs)
- ❌ Calculates pivot every frame (though negligible cost)

**Robustness**: High. Works for any fin where left edge is attachment.

### Option B: Add Pivot Metadata to Loading

**Approach**: Specify pivot in `loadSVGFromURL()` call.

**Implementation**:
```javascript
// In simulation-app.js
pectoralFinVertices = await SVGParser.loadSVGFromURL(
    'assets/koi/body-parts/pectoral-fin.svg',
    20,
    {
        width: 4.5,
        height: 2,
        pivotType: 'left-edge'  // ← New metadata
    }
);

// Store pivot info with vertices
pectoralFinVertices.pivot = { x: minX, y: 0 };

// Use in drawFinFromSVG
drawFinFromSVG(...) {
    const pivot = svgVertices.pivot || { x: 0, y: 0 };
    // ...
}
```

**Pros**:
- ✅ Explicit configuration
- ✅ Could support different pivot strategies per fin
- ✅ Pivot calculated once at load time

**Cons**:
- ❌ Requires changes to SVGParser
- ❌ Vertices array needs augmentation (or separate storage)
- ❌ More complex API
- ❌ Manual configuration in multiple files
- ❌ Easy to forget when adding new fins

**Robustness**: Medium. Requires correct metadata for each fin.

### Option C: Heuristic-Based Pivot Detection

**Approach**: Analyze fin orientation to determine attachment edge.

**Implementation**:
```javascript
function detectAttachmentEdge(vertices) {
    const xs = vertices.map(v => v.x);
    const ys = vertices.map(v => v.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Heuristic: attachment is edge closest to origin after normalization
    const distToLeft = Math.abs(minX);
    const distToRight = Math.abs(maxX);
    const distToTop = Math.abs(minY);
    const distToBottom = Math.abs(maxY);

    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

    if (minDist === distToLeft) return { x: minX, y: 0 };
    if (minDist === distToRight) return { x: maxX, y: 0 };
    if (minDist === distToTop) return { x: 0, y: minY };
    return { x: 0, y: maxY };
}
```

**Pros**:
- ✅ Automatic detection
- ✅ Could handle different orientations

**Cons**:
- ❌ Complex heuristic
- ❌ May fail on unusual shapes
- ❌ Overengineered for current needs
- ❌ Harder to debug

**Robustness**: Low. Heuristics can fail unpredictably.

### Option D: SVG Attribute Annotation

**Approach**: Add custom attributes to SVG files.

**Implementation**:
```xml
<!-- pectoral-fin.svg -->
<svg data-pivot-edge="left" ...>
  <polygon class="st0" points="..."/>
</svg>
```

```javascript
// SVGParser extracts attribute
static parseSVGFile(svgText, numPoints, targetDimensions) {
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    const pivotEdge = svg.getAttribute('data-pivot-edge') || 'left';
    // ... calculate pivot based on attribute
}
```

**Pros**:
- ✅ Self-documenting SVG files
- ✅ Flexible per-fin configuration

**Cons**:
- ❌ Requires editing all SVG files
- ❌ Non-standard SVG attributes
- ❌ Artists need to know about pivot configuration
- ❌ More complex parsing logic

**Robustness**: Medium. Depends on SVG files being properly annotated.

## Recommended Solution: Option A (Dynamic Calculation)

**Why Option A is best**:

1. **Simplicity**: Single line of code change
2. **Robustness**: Works automatically for all current and future fins
3. **No Breaking Changes**: Doesn't require SVG file modifications
4. **Performance**: Negligible overhead (one Math.min per fin per frame)
5. **Maintainability**: Self-documenting, no external configuration
6. **Consistency**: Matches procedural fin behavior

**Implementation Code**:

```javascript
// File: /workspace/flocking/src/core/koi-renderer.js
// Lines: 205-226 (drawFinFromSVG method)

drawFinFromSVG(context, segmentPos, svgVertices, yOffset, baseAngle,
               waveTime, rotationAmplitude, sway, sizeScale,
               hue, saturation, brightness, mirror = 'none') {

    // Calculate pivot at attachment edge (left edge center)
    const xs = svgVertices.map(v => v.x);
    const attachmentPivot = {
        x: Math.min(...xs),  // Left edge X coordinate
        y: 0                 // Center line
    };

    this.drawSVGShape(context, svgVertices, {
        deformationType: 'rotate',
        deformationParams: {
            waveTime,
            rotationAmplitude,
            rotationFrequency: 1.2,
            pivot: attachmentPivot,  // Use calculated pivot instead of {x: 0, y: 0}
            ySwayAmplitude: 0,
            ySwayPhase: 0
        },
        positionX: segmentPos.x,
        positionY: segmentPos.y + yOffset * sizeScale + sway,
        rotation: baseAngle,
        scale: sizeScale,
        hue,
        saturation: saturation + 8,
        brightness: brightness - 15,
        opacity: this.useSumieStyle ? 0.6 : 0.7,
        mirror
    });
}
```

**Expected Results**:

| Fin Type | Current Pivot | New Pivot | Visual Change |
|----------|--------------|-----------|---------------|
| Pectoral | (0, 0) = center | (-2.25, 0) = left edge | Rotates at body attachment |
| Ventral | (0, 0) = center | (-1.50, 0) = left edge | Rotates at body attachment |
| Dorsal | (0, 0) = center | (-1.41, 0) = left edge | Rotates at body attachment |

**Validation**: Compare to procedural fins (lines 340-364) which already exhibit correct behavior.

## Code References

### Primary Files

- `/workspace/flocking/src/core/koi-renderer.js`
  - Line 212: Current hardcoded pivot `{x: 0, y: 0}` in `drawFinFromSVG()`
  - Lines 636-664: `applyRotationDeformation()` pivot logic
  - Lines 245-330: `drawFins()` - all fin positioning
  - Lines 340-364: Procedural pectoral fin rendering (correct pivot behavior)
  - Lines 697-704: `applyMirror()` transformation

- `/workspace/flocking/src/core/svg-parser.js`
  - Lines 149-178: `normalizeVertices()` - centers shapes at origin

- `/workspace/flocking/src/apps/simulation-app.js`
  - Lines 91-109: Fin SVG loading with target dimensions

### SVG Files

- `/workspace/flocking/assets/koi/body-parts/pectoral-fin.svg` (4.5 × 2 units)
- `/workspace/flocking/assets/koi/body-parts/ventral-fin.svg` (3 × 1.5 units)
- `/workspace/flocking/assets/koi/body-parts/dorsal-fin.svg` (4 × 5 units)

## Visual Explanation

### Current Behavior (Wrong)

```
Swimming motion with center pivot:

Frame 1:          Frame 2:          Frame 3:
   ----              ----             ----
  /    \            /   |            /    \
 |  •   |          |    •           |   •  |
  \    /            \   |            \    /
   ----              ----             ----
   ^                 ^                ^
   Body              Body             Body

• = Pivot at fin center
Fin rotates like helicopter blade, detached from body
```

### Correct Behavior (Fixed)

```
Swimming motion with edge pivot:

Frame 1:          Frame 2:          Frame 3:
   •---              •               •---
  / \               /|              / \
 /   \             / |             /   \
/     \           /  |            /     \
   ^                 ^                ^
   Body              Body             Body

• = Pivot at attachment edge
Fin rotates naturally from body connection point
```

### Coordinate System Visualization

```
After normalization (pectoral fin example):

Y
^
|    Fin shape (centered at origin)
|        _____
|       /     \
|------•-------•-------> X
|    Left    Right
|    edge    edge
|   (minX)   (maxX)
|   -2.25    2.25
|
|   Current pivot: (0, 0) = center ✗
|   Correct pivot: (-2.25, 0) = left edge ✓
```

## Summary of Findings

### Key Facts

1. **All fins are normalized to center at (0, 0)** by `SVGParser.normalizeVertices()`
2. **Current pivot (0, 0) equals shape center** after normalization
3. **Procedural fins pivot correctly** by offsetting shape from rotation origin
4. **Vertical mirroring preserves X coordinates**, so pivot formula is universal
5. **Fix requires single line change**: calculate `minX` from vertices

### Pivot Coordinates (After Fix)

| Fin Type | Target Size | Normalized Bounds | Correct Pivot |
|----------|------------|-------------------|---------------|
| Pectoral | 4.5 × 2 | X[-2.25, 2.25] Y[-0.94, 0.94] | (-2.25, 0) |
| Ventral | 3 × 1.5 | X[-1.50, 1.50] Y[-0.68, 0.68] | (-1.50, 0) |
| Dorsal | 4 × 5 | X[-1.41, 1.41] Y[-2.50, 2.50] | (-1.41, 0) |

### Implementation Impact

- **Files Modified**: 1 (`koi-renderer.js`)
- **Lines Changed**: ~5 (add pivot calculation)
- **Breaking Changes**: None
- **Performance Impact**: Negligible (one `Math.min()` per fin per frame)
- **Testing Needed**: Visual inspection of fin rotation in editor and simulation

## Open Questions

1. **Performance optimization**: Should pivot be cached per fin type rather than calculated every frame?
   - Answer: Not necessary. `Math.min()` over 9-20 vertices is ~0.001ms

2. **Future fin orientations**: What if a fin extends leftward instead of rightward?
   - Answer: Use `Math.max(...xs)` for right-edge attachment, or add orientation parameter

3. **Tail pivot**: Does the tail need similar fix?
   - Answer: No. Tail uses 'wave' deformation, not 'rotate'. Different animation system.

4. **Should `applyRotationDeformation` default pivot change?**
   - Answer: No. Keep default as `{x: 0, y: 0}` for backward compatibility. Let callers specify pivot.
