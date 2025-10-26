---
doc_type: research
date: 2025-10-26T17:45:00+00:00
title: "Koi Spot Clipping Path Issue - Why Spots Render Outside Body Boundaries"
research_question: "Why the clipping path for koi spots isn't working properly - spots rendering outside body and head boundaries even though clipToBodyAndHead() is implemented"
researcher: Claude Code

git_commit: e1da3d9b2bac215571ad0135c6562d28b97ed786
branch: main
repository: flocking

created_by: Claude Code
last_updated: 2025-10-26
last_updated_by: Claude Code

tags:
  - koi-renderer
  - clipping
  - svg
  - coordinate-systems
  - canvas-api
  - wave-deformation
  - rendering-bug
status: complete

related_docs:
  - thoughts/research/2025-10-26-brushstroke-based-koi-coloration-implementation-status.md
  - thoughts/plans/2025-10-22-generalize-svg-rendering-system-for-all-koi-body-parts.md
---

# Research: Koi Spot Clipping Path Issue

**Date**: 2025-10-26T17:45:00+00:00
**Researcher**: Claude Code (Anthropic)
**Git Commit**: e1da3d9b2bac215571ad0135c6562d28b97ed786
**Branch**: main
**Repository**: flocking

## Research Question

Why is the clipping path for koi spots not working properly? Spots are still rendering outside the body and head boundaries even though we implemented a `clipToBodyAndHead()` method at `/workspace/flocking/src/core/koi-renderer.js:1019`.

Specifically investigate:
1. How the clipping is being set up in `clipToBodyAndHead()`
2. The coordinate system context - are we in rotated/translated koi space or world space?
3. How body/head are drawn vs how the clip path is created
4. Whether the SVG body outline calculation is correct for clipping
5. Any issues with canvas context save/restore around the clip

## Summary

**The clipping path is broken because it doesn't apply the same wave deformation that the body rendering uses.** There are three critical issues:

1. **Missing Wave Deformation**: `calculateSVGOutline()` (line 1089-1100) only applies simple scaling (`vertex.x * sizeScale, vertex.y * sizeScale`), but `drawBodyFromSVG()` (line 900-916) applies **wave deformation** via `applyWaveDeformation()`. The clip path is static while the body is animated.

2. **Coordinate System Mismatch**: The clipping happens in the **rotated/translated koi coordinate space** (after `context.translate(x, y)` and `context.rotate(angle)` at lines 115-117), which is correct. However, the clip path creation uses raw SVG vertices without considering that they're already in this transformed space.

3. **Incomplete Implementation**: The code comment at line 1091 explicitly acknowledges this: `"This is a simplified version - ideally would use the same deformation as drawBodyFromSVG"`

## Detailed Findings

### 1. Rendering Order and Coordinate System

**Location**: `/workspace/flocking/src/core/koi-renderer.js:114-163`

The rendering sequence is:

```javascript
// Line 115-117: Enter koi's local coordinate space
context.push();
context.translate(x, y);
context.rotate(angle);

// Lines 133-147: Draw body and head (WITH wave deformation for SVG)
this.drawBodyFromSVG(context, segmentPositions, svgVertices.body, ...);
this.drawHead(context, segmentPositions[0], ...);

// Lines 150-152: Clip and draw spots
this.clipToBodyAndHead(context, segmentPositions, svgVertices, ...);
this.drawSpots(context, segmentPositions, pattern.spots || [], ...);
context.drawingContext.restore(); // Remove clip

// Line 162: Exit koi's coordinate space
context.pop();
```

**Finding**: All rendering (body, head, clip, spots) happens **inside the transformed coordinate space**. The coordinate system itself is correct.

### 2. How Body is Drawn (WITH Deformation)

**Location**: `/workspace/flocking/src/core/koi-renderer.js:900-916`

```javascript
drawBodyFromSVG(context, segmentPositions, svgVertices, shapeParams, sizeScale, hue, saturation, brightness) {
    this.drawSVGShape(context, svgVertices, {
        deformationType: 'wave',              // ← WAVE DEFORMATION APPLIED
        deformationParams: {
            segmentPositions,                  // Body segments with Y offsets
            numSegments: segmentPositions.length
        },
        positionX: 0,
        positionY: 0,
        rotation: 0,
        scale: sizeScale,
        // ... colors ...
    });
}
```

This calls `drawSVGShape()` (line 826-886) which:
1. Calls `applyDeformation(svgVertices, 'wave', deformationParams)` (line 847)
2. Which routes to `applyWaveDeformation()` (line 605-639)
3. Which **maps each vertex to a body segment and applies the segment's Y wave offset**

**Key Code** (`applyWaveDeformation`, lines 614-637):
```javascript
return vertices.map(v => {
    // Normalize vertex X to 0-1 range, flipped so rightmost = 0, leftmost = 1
    const flippedT = range === 0 ? 0 : (maxX - v.x) / range;

    // Map to segment range with interpolation
    const segmentFloat = flippedT * (numSegments - 1);
    const segIdx = Math.floor(segmentFloat);
    const blend = segmentFloat - segIdx;

    // Get Y offsets from current and next segment
    const currentY = segmentPositions[currentIdx].y;
    const nextY = segmentPositions[nextIdx].y;

    // Linear interpolation between segments
    const interpolatedY = currentY + (nextY - currentY) * blend;

    return {
        x: v.x,
        y: v.y + interpolatedY  // ← WAVE OFFSET ADDED
    };
});
```

**Finding**: The body rendering **adds swimming wave motion** to every vertex by interpolating segment Y offsets. The body undulates.

### 3. How Clipping Path is Created (WITHOUT Deformation)

**Location**: `/workspace/flocking/src/core/koi-renderer.js:1019-1084`

```javascript
clipToBodyAndHead(context, segmentPositions, svgVertices, shapeParams, sizeScale) {
    const ctx = context.drawingContext;
    ctx.save();
    ctx.beginPath();

    // Create body outline path
    if (svgVertices.body && svgVertices.body.length > 0) {
        // Use SVG body outline
        const bodyOutline = this.calculateSVGOutline(svgVertices.body, segmentPositions, sizeScale);
        ctx.moveTo(bodyOutline[0].x, bodyOutline[0].y);
        for (let i = 1; i < bodyOutline.length; i++) {
            ctx.lineTo(bodyOutline[i].x, bodyOutline[i].y);
        }
        ctx.closePath();
    }
    // ... head outline ...
    ctx.clip();
}
```

This calls `calculateSVGOutline()` (lines 1089-1100):

```javascript
calculateSVGOutline(svgVertices, segmentPositions, sizeScale) {
    // For now, use a simple transformation of SVG vertices to world space
    // This is a simplified version - ideally would use the same deformation as drawBodyFromSVG
    const outline = [];
    for (const vertex of svgVertices) {
        outline.push({
            x: vertex.x * sizeScale,
            y: vertex.y * sizeScale   // ← NO WAVE DEFORMATION!
        });
    }
    return outline;
}
```

**Critical Finding**: The clip path **only scales vertices** - no wave deformation is applied. The comment at line 1091 acknowledges this is wrong: `"ideally would use the same deformation as drawBodyFromSVG"`.

### 4. The Root Cause

**The body vertices are deformed by the swimming wave animation, but the clipping path uses the static, undeformed vertices.**

When the koi swims:
- Body segments have Y offsets like: `{y: 2.3}, {y: 1.8}, {y: 0.5}, {y: -1.2}, ...` (wave pattern)
- Body rendering: Each vertex's Y coordinate is adjusted by interpolating segment Y offsets
- Clip path: Vertices are used as-is, with `y: vertex.y * sizeScale` (no wave adjustment)

**Result**: The clip path is a static body outline, but the rendered body is undulating. When the body curves, parts of it extend outside the static clip boundary, and spots that should be inside render outside.

### 5. SVG Vertex Normalization

**Location**: `/workspace/flocking/src/core/svg-parser.js:149-178`

SVG vertices are normalized to koi coordinate space:

```javascript
static normalizeVertices(vertices, targetWidth, targetHeight) {
    // Find bounding box
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Scale preserving aspect ratio
    const scale = Math.min(scaleX, scaleY);

    // Transform vertices: center at origin and scale
    const centerX = minX + currentWidth / 2;
    const centerY = minY + currentHeight / 2;

    return vertices.map(v => ({
        x: (v.x - centerX) * scale,
        y: (v.y - centerY) * scale
    }));
}
```

**Finding**: SVG vertices are correctly normalized to koi coordinate space (centered at origin, scaled to match body dimensions). The issue is not with normalization but with the missing deformation during clipping.

### 6. Canvas Context Save/Restore

**Location**: `/workspace/flocking/src/core/koi-renderer.js:1020-1021, 152`

```javascript
clipToBodyAndHead(context, segmentPositions, svgVertices, shapeParams, sizeScale) {
    const ctx = context.drawingContext;
    ctx.save();    // ← Save canvas state before clipping
    ctx.beginPath();
    // ... create clip path ...
    ctx.clip();
}

// Later in render():
context.drawingContext.restore(); // ← Remove clip at line 152
```

**Finding**: The save/restore pattern is correct. `ctx.save()` is called before creating the clip at line 1021, and `context.drawingContext.restore()` removes it at line 152. However, there's a potential mismatch: `clipToBodyAndHead()` uses `ctx.save()` but the calling code uses `context.drawingContext.restore()`. They reference the same underlying context, so this works, but it's inconsistent.

### 7. Head Clipping (Also Incomplete)

**Location**: `/workspace/flocking/src/core/koi-renderer.js:1054-1081`

The head clipping also has issues:

```javascript
// Add head outline to clip path
if (svgVertices.head && svgVertices.head.length > 0) {
    const headPos = segmentPositions[0];
    const headOffsetX = shapeParams.headX * sizeScale;

    ctx.moveTo(headPos.x + headOffsetX + svgVertices.head[0].x * sizeScale,
              headPos.y + svgVertices.head[0].y * sizeScale);
    for (let i = 1; i < svgVertices.head.length; i++) {
        const v = svgVertices.head[i];
        ctx.lineTo(headPos.x + headOffsetX + v.x * sizeScale,
                  headPos.y + v.y * sizeScale);
    }
    ctx.closePath();
}
```

**Finding**: Head clipping adds `headPos.x` and `headPos.y`, which includes the first segment's wave offset. This is partially correct, but the head SVG vertices themselves aren't deformed (they're used as-is, just offset). Since the head is drawn with `deformationType: 'static'` (line 1207), this is actually correct for the head - no deformation needed.

## Code References

All references are relative to `/workspace/flocking/`:

- `src/core/koi-renderer.js:115-117` - Coordinate transform (translate/rotate to koi space)
- `src/core/koi-renderer.js:142-147` - Body and head rendering
- `src/core/koi-renderer.js:150-152` - Clipping and spot rendering
- `src/core/koi-renderer.js:900-916` - `drawBodyFromSVG()` with wave deformation
- `src/core/koi-renderer.js:605-639` - `applyWaveDeformation()` implementation
- `src/core/koi-renderer.js:826-886` - `drawSVGShape()` generalized renderer
- `src/core/koi-renderer.js:1019-1084` - `clipToBodyAndHead()` implementation
- `src/core/koi-renderer.js:1089-1100` - `calculateSVGOutline()` broken implementation
- `src/core/svg-parser.js:149-178` - SVG vertex normalization

## Architectural Context

The koi rendering system has two paths:

1. **Procedural rendering**: Mathematical body outlines (used as fallback)
2. **SVG rendering**: SVG vertices with deformation (body wave, fin rotation, tail flutter)

The deformation system (`applyDeformation()`, `applyWaveDeformation()`, etc.) is designed to animate SVG vertices. Body rendering correctly uses this system, but clipping doesn't.

## What's Wrong (Summary)

1. **`calculateSVGOutline()` doesn't apply wave deformation** - it only scales vertices
2. The clipping path is **static** while the body is **animated**
3. When the body undulates, it moves outside the static clip boundary
4. Spots that should be inside the deformed body render outside the static clip

## How to Fix It

To fix the clipping, `calculateSVGOutline()` must apply the same wave deformation as `drawBodyFromSVG()`:

**Current (broken)**:
```javascript
calculateSVGOutline(svgVertices, segmentPositions, sizeScale) {
    const outline = [];
    for (const vertex of svgVertices) {
        outline.push({
            x: vertex.x * sizeScale,
            y: vertex.y * sizeScale  // ← Missing deformation
        });
    }
    return outline;
}
```

**Required fix**:
```javascript
calculateSVGOutline(svgVertices, segmentPositions, sizeScale) {
    // Apply the same wave deformation as drawBodyFromSVG
    const deformedVertices = this.applyWaveDeformation(svgVertices, {
        segmentPositions,
        numSegments: segmentPositions.length
    });

    // Then scale the deformed vertices
    const outline = [];
    for (const vertex of deformedVertices) {
        outline.push({
            x: vertex.x * sizeScale,
            y: vertex.y * sizeScale
        });
    }
    return outline;
}
```

This ensures the clipping path follows the same wave motion as the rendered body, keeping spots properly constrained inside the animated body outline.

## Related Code Patterns

The fix follows the same pattern used throughout the renderer:
1. `drawBodyFromSVG()` → calls `drawSVGShape()` with `deformationType: 'wave'`
2. `drawSVGShape()` → calls `applyDeformation()`
3. `applyDeformation()` → dispatches to `applyWaveDeformation()`
4. `applyWaveDeformation()` → maps vertices to segments and adds Y offsets

The clipping code needs to follow steps 3-4: call `applyWaveDeformation()` before scaling.

## Performance Note

Calling `applyWaveDeformation()` on every frame for clipping (in addition to body rendering) doubles the deformation work. However, this is unavoidable - the clip path **must** match the deformed body. The alternative (using procedural body clipping) would require maintaining two different clipping implementations.

## Testing Recommendation

After implementing the fix:
1. Verify spots stay inside the body during swimming animation
2. Test with different wave amplitudes and frequencies
3. Ensure clipping still works with procedural body (when SVG not available)
4. Check performance impact of double-deformation (body + clip)

## Open Questions

1. Should clipping use the same 3-layer sumi-e rendering offset as the body? (Currently body has ±0.3 offset for soft edges)
2. Should the clip path use canvas curves (`bezierCurveTo`) instead of straight lines (`lineTo`) to match the smooth body outline?
3. Can we cache the deformed outline to avoid recalculating every frame, or does the wave animation change every frame?
