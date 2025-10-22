---
doc_type: research
date: 2025-10-20T01:03:54+00:00
title: "Koi Body Rendering and Turn Curvature Deformation Implementation Analysis"
research_question: "How is koi body/fish rendering currently implemented and how can we add body deformation based on turn curvature?"
researcher: Sean Kim

git_commit: 9286bf16eb2890dfeae2bd769b33fb82923ea6ab
branch: main
repository: visualizations

created_by: Sean Kim
last_updated: 2025-10-19
last_updated_by: Sean Kim

tags:
  - rendering
  - animation
  - koi
  - body-deformation
  - physics
  - turn-curvature
status: complete

related_docs: []
---

# Research: Koi Body Rendering and Turn Curvature Deformation Implementation Analysis

**Date**: 2025-10-19
**Researcher**: Sean Kim
**Git Commit**: 9286bf16eb2890dfeae2bd769b33fb82923ea6ab
**Branch**: main
**Repository**: visualizations

## Research Question

How is koi body/fish rendering currently implemented to understand how we can add body deformation based on turn curvature? Specifically:
1. Where is koi rendering code located and what is the body shape representation?
2. What rendering data is available from the boid physics system?
3. How is the body currently structured (segments, curves, control points)?
4. What existing animation mechanisms are present?
5. Where would we inject turn curvature data for realistic body bending?

## Summary

The koi rendering system is **segment-based** with a spine represented as an array of control points. Each segment stores `{x, y, w}` (position and width), calculated procedurally with sinusoidal undulation. The renderer has **no direct access to physics data like angular velocity** - it only receives position, heading angle, and animation time. Body bending could be implemented by:

1. **Modifying segment Y-offsets** in `calculateSegments()` based on turn curvature
2. **Passing angular velocity** from boid to renderer through `animationParams`
3. **Applying lateral offset** proportional to `angularVelocity * segmentPosition`

The existing undulation system provides a proven pattern for sinusoidal deformation that can be extended with curvature-based offsets.

## Detailed Findings

### 1. Koi Rendering Code Location

**Primary File**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`

The `KoiRenderer` class is a pure rendering module with no dependencies on physics or flocking systems. Key methods:

- **`render()`** (lines 71-122): Main entry point, orchestrates all rendering
- **`calculateSegments()`** (lines 127-160): Generates spine segments with swimming wave
- **`drawBody()`** (lines 316-406): Draws body outline using curve vertices
- **`drawTail()`** (lines 253-311): Draws flowing tail with separate control points
- **`drawFins()`** (lines 166-248): Draws pectoral, dorsal, and ventral fins
- **`drawHead()`** (lines 447-492): Draws head and eyes

**Related Files**:
- `/Users/seankim/dev/visualizations/flocking/src/core/koi-params.js` - Shape parameters (DEFAULT_SHAPE_PARAMS)
- `/Users/seankim/dev/visualizations/flocking/src/core/koi-varieties.js` - Color/pattern definitions
- `/Users/seankim/dev/visualizations/flocking/src/apps/simulation-app.js` - Calls renderer (lines 209-230)

### 2. Body Shape Representation: Segment-Based Spine

**Implementation**: `calculateSegments()` at `koi-renderer.js:127-160`

The body is represented as **10 segments** (configurable via `shapeParams.numSegments`) along a spine. Each segment is an object:

```javascript
{ x: number, y: number, w: number }
```

- **x**: Horizontal position along spine (head=7, tail=-9, scaled by `lengthMultiplier`)
- **y**: Vertical offset for swimming undulation
- **w**: Width at that segment (creates fish shape)

**Segment Calculation** (lines 130-157):
```javascript
for (let i = 0; i < numSegments; i++) {
    const t = i / numSegments;  // 0.0 at head, 1.0 at tail
    const x = this.lerp(7, -9, t) * sizeScale * lengthMultiplier;
    const y = Math.sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);

    // Width varies along body (front -> peak -> taper)
    let baseWidth;
    if (t < shapeParams.bodyPeakPosition) {
        // Front to peak
        const frontT = t / shapeParams.bodyPeakPosition;
        baseWidth = this.lerp(shapeParams.bodyFrontWidth, shapeParams.bodyPeakWidth, Math.sin(frontT * Math.PI * 0.5));
    } else {
        // Peak to tail
        const backT = (t - shapeParams.bodyPeakPosition) / (1 - shapeParams.bodyPeakPosition);
        baseWidth = this.lerp(shapeParams.bodyPeakWidth, shapeParams.bodyFrontWidth, Math.sin(backT * Math.PI * 0.5));
    }

    // Taper for tail section
    if (t > shapeParams.bodyTaperStart) {
        const tailT = (t - shapeParams.bodyTaperStart) / (1 - shapeParams.bodyTaperStart);
        baseWidth = baseWidth * (1 - tailT * shapeParams.bodyTaperStrength);
    }

    const segmentWidth = baseWidth * sizeScale;
    segments.push({ x, y, w: segmentWidth });
}
```

**Key Insight**: The `y` value is currently **only used for undulation**, not curvature. This is where we'd inject turn-based deformation.

### 3. Rendering from Segments: Curve Vertices

**Body Drawing** (`drawBody()` at lines 316-406):

The segments are converted to a smooth outline using **p5.js `curveVertex()`**:

```javascript
// Top edge from front to back
for (let i = 0; i < segmentPositions.length; i++) {
    const seg = segmentPositions[i];
    const topMultiplier = 0.48 * (1 - asymmetry * 0.15);
    context.curveVertex(seg.x, seg.y - seg.w * topMultiplier);
}

// Bottom edge from back to front
for (let i = segmentPositions.length - 1; i >= 0; i--) {
    const seg = segmentPositions[i];
    const bottomMultiplier = 0.48 * (1 + asymmetry * 0.15);
    context.curveVertex(seg.x, seg.y + seg.w * bottomMultiplier);
}
```

- **Top edge**: `y - w * 0.48` (accounting for asymmetry)
- **Bottom edge**: `y + w * 0.48`
- **Curve rendering**: Catmull-Rom splines through control points

**Fins and Tail Positioning**: All fins are positioned relative to specific segments:
- Pectoral fins: `segmentPositions[shapeParams.pectoralPos]` (default segment 2)
- Dorsal fin: `segmentPositions[shapeParams.dorsalPos]` (default segment 4)
- Ventral fins: `segmentPositions[shapeParams.ventralPos]` (default segment 7)
- Tail: Extends from last segment (`segmentPositions[segmentPositions.length - 1]`)

**Critical**: If we modify segment positions for curvature, fins and tail automatically follow because they're positioned relative to segments.

### 4. Data Flow: Boid → Renderer

**Rendering Call** (`simulation-app.js:209-230`):

```javascript
renderer.render(
    pg,                          // Graphics context
    boid.position.x,             // World X position
    boid.position.y,             // World Y position
    boid.velocity.heading(),     // Rotation angle (radians)
    {
        shapeParams: DEFAULT_SHAPE_PARAMS,
        colorParams: debugColor,
        pattern: boid.pattern,
        animationParams: {
            waveTime,                    // Animation phase (frameCount-based)
            sizeScale: boid.sizeMultiplier,
            lengthMultiplier: boid.lengthMultiplier,
            tailLength: boid.tailLength
        },
        modifiers: {
            brightnessBoost: audioData.bass * 8 * params.audioReactivity,
            saturationBoost: audioData.treble * 10 * params.audioReactivity,
            sizeScale: 1 + audioData.amplitude * 0.3 * params.audioReactivity
        }
    }
);
```

**Currently Passed**:
- ✅ Position (x, y)
- ✅ Heading angle (rotation)
- ✅ Animation time (waveTime)
- ✅ Size/scale parameters

**NOT Currently Passed** (but available in boid):
- ❌ `boid.velocity` (Vector with x, y components)
- ❌ `boid.heading` (constrained heading from turn radius physics)
- ❌ Angular velocity (turn rate) - **must be calculated**
- ❌ Current speed (`boid.velocity.mag()`)

**Physics Data Available in Boid** (`boid.js`):
- `boid.position` - Current position (Vector)
- `boid.velocity` - Velocity vector (Vector)
- `boid.heading` - Constrained heading angle (number, radians)
- `boid.previousHeading` - Previous frame's heading (tracked for damping)
- `boid.currentSpeed` - Can be computed as `velocity.mag()`

**Turn Radius Physics** (`boid.js:277-302`):
The boid already tracks heading changes and calculates constrained angular velocity:

```javascript
// Calculate maximum angular velocity based on current speed
const currentSpeed = this.velocity.mag();
const maxAngularVel = PHYSICS_CONFIG.MAX_TURN_RATE * currentSpeed;

// Calculate requested angular velocity
const requestedAngularVel = headingDiff * PHYSICS_CONFIG.TURN_RESPONSIVENESS;

// Constrain angular velocity
const constrainedAngularVel = Math.max(Math.min(requestedAngularVel, maxAngularVel), -maxAngularVel);

// Update heading with constrained angular velocity
this.heading += constrainedAngularVel;
```

**Key Insight**: We can calculate `angularVelocity` as the heading change per frame:
```javascript
const angularVelocity = boid.heading - boid.previousHeading;
```

This needs to be normalized to `-PI` to `PI` range (already done in boid update loop).

### 5. Existing Animation Mechanisms

**Swimming Undulation** (`calculateSegments()` line 133):

```javascript
const y = Math.sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);
```

- **Phase progression**: `waveTime - t * 3.5` creates traveling wave from head to tail
- **Amplitude**: `1.5 * sizeScale` with decay `(1 - t * 0.2)` toward tail
- **Frequency**: Determined by `waveTime` advancement rate

**Wave Time Calculation** (`simulation-app.js:195-197`):

```javascript
const baseWave = frameCount * 0.1;
const velocityOffset = boid.velocity.mag() * 3.0;  // Speed affects phase
const waveTime = baseWave + velocityOffset + boid.animationOffset;
```

- **Base animation**: `frameCount * 0.1` (global time)
- **Speed modulation**: Faster fish have different phase
- **Individual offset**: Each fish has `animationOffset` for variety

**Fin Animation** (`drawFins()` line 167):

```javascript
const finSway = Math.sin(waveTime - 0.5) * 0.8;
```

Used to offset fin positions vertically, creating synchronized sway with body undulation.

**Tail Animation** (`drawTail()` line 266):

```javascript
const tailSway = Math.sin(waveTime - 2.5 - t * 2) * 3 * sizeScale * (0.5 + t * 0.5);
```

- Stronger amplitude than body (3.0 vs 1.5)
- Progressive phase shift along tail length
- Amplitude increases toward tail tip `(0.5 + t * 0.5)`

### 6. Integration Points for Turn Curvature

**Recommended Approach**: Modify `calculateSegments()` to add lateral offset based on angular velocity.

#### Option A: Add Curvature Parameter to Animation Params (RECOMMENDED)

**Step 1**: Calculate angular velocity in `simulation-app.js` before rendering:

```javascript
// Calculate turn curvature
const angularVelocity = boid.heading - boid.previousHeading;
// Normalize to -PI to PI (if not already done)
let normalizedAngularVel = angularVelocity;
while (normalizedAngularVel > Math.PI) normalizedAngularVel -= Math.PI * 2;
while (normalizedAngularVel < -Math.PI) normalizedAngularVel += Math.PI * 2;

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
            tailLength: boid.tailLength,
            angularVelocity: normalizedAngularVel,  // NEW
            currentSpeed: boid.velocity.mag()       // NEW (optional)
        },
        // ... rest of params
    }
);
```

**Step 2**: Modify `calculateSegments()` to apply curvature offset:

```javascript
calculateSegments(numSegments, waveTime, sizeScale, lengthMultiplier, shapeParams, angularVelocity = 0, currentSpeed = 0) {
    const segments = [];

    // Curvature scaling factor - tune this for desired bend strength
    const CURVATURE_STRENGTH = 30; // Pixels of lateral offset per radian/frame

    for (let i = 0; i < numSegments; i++) {
        const t = i / numSegments;
        const x = this.lerp(7, -9, t) * sizeScale * lengthMultiplier;

        // EXISTING: Swimming undulation
        const swimOffset = Math.sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);

        // NEW: Turn curvature - body bends into the turn
        // Positive angularVelocity = turning left (counterclockwise)
        // Apply increasing offset toward tail (t increases toward tail)
        const curvatureOffset = angularVelocity * CURVATURE_STRENGTH * t * sizeScale;

        // COMBINE: Undulation + curvature
        const y = swimOffset + curvatureOffset;

        // ... rest of width calculation ...

        segments.push({ x, y, w: segmentWidth });
    }

    return segments;
}
```

**How it works**:
- **Positive `angularVelocity`** (turning left/counterclockwise): Offsets segments **up** (positive y)
- **Negative `angularVelocity`** (turning right/clockwise): Offsets segments **down** (negative y)
- **Linear progression `* t`**: Head (t=0) has no offset, tail (t=1) has maximum offset
- **Scales with size**: `* sizeScale` keeps bend proportional to fish size

**Tuning Parameters**:
- `CURVATURE_STRENGTH = 30`: Controls how much the body bends per unit angular velocity
  - Increase for more dramatic bending
  - Decrease for subtle bending
- **Alternative progressive curves**:
  - Quadratic: `t * t` (more bend at tail)
  - Cubic: `t * t * t` (extreme tail bend)
  - Smooth ease: `Math.sin(t * Math.PI / 2)` (smooth acceleration)

#### Option B: Advanced - Speed-Dependent Curvature

Real fish bend more when turning at higher speeds:

```javascript
// In calculateSegments()
const speedFactor = currentSpeed / maxSpeed; // Normalize speed (need to pass maxSpeed)
const curvatureOffset = angularVelocity * CURVATURE_STRENGTH * t * sizeScale * speedFactor;
```

#### Option C: Damped Curvature (Smooth Transitions)

Prevent instant snapping by smoothing angular velocity over time:

```javascript
// In Boid class, add:
this.smoothedAngularVelocity = 0;

// In update(), after heading update:
const currentAngularVel = this.heading - this.previousHeading;
this.smoothedAngularVelocity = this.smoothedAngularVelocity * 0.7 + currentAngularVel * 0.3;

// Pass smoothedAngularVelocity to renderer instead of raw value
```

### 7. Body Structure Analysis

**Coordinate System**:
- **Origin**: Center of fish (at `position`)
- **Rotation**: Applied via `context.rotate(angle)` before drawing
- **X-axis**: Points in heading direction (positive = forward)
- **Y-axis**: Points perpendicular to heading (positive = left/top in rotated space)

**Segment Spacing**:
- Default 10 segments over length ~16 units (7 to -9)
- Segment spacing: ~1.6 units
- At `sizeScale=1`: ~1.6 pixels per segment

**Width Profile** (at default params):
```
Position (t)  | Width Multiplier | Notes
--------------|------------------|-------
0.0 (head)    | 4.5             | Front width
0.7 (peak)    | 8.0             | Maximum width (bodyPeakPosition)
0.85+ (tail)  | <4.5 tapering   | Taper starts at bodyTaperStart=0.15
```

**Asymmetry** (`bodyAsymmetry = 0.9`):
- Top edge: `w * 0.48 * (1 - 0.9 * 0.15) = w * 0.4152`
- Bottom edge: `w * 0.48 * (1 + 0.9 * 0.15) = w * 0.5448`
- Creates rounder belly, flatter back (top-down koi view)

### 8. Technical Considerations

**1. Coordinate Transform Order**:
Current rendering applies transforms in this order:
```javascript
context.translate(x, y);      // Move to fish position
context.rotate(angle);        // Rotate to heading
// Draw segments in local space
```

Curvature offsets are applied in **rotated local space**, so:
- Y-offset moves perpendicular to heading (creates lateral bend)
- Positive Y = left of heading
- Negative Y = right of heading

**2. Fin/Tail Following**:
Since fins/tail are positioned relative to `segmentPositions[i]`, they automatically follow the curved spine. No additional modification needed.

**3. Sumi-e Layering**:
The sumi-e style draws multiple offset layers (lines 321-352 in `drawBody()`). Curvature will be consistent across all layers since it modifies segment positions before drawing.

**4. Performance**:
- Segment calculation is already per-frame per-boid
- Adding curvature is just one multiplication per segment (~10 segments)
- Negligible performance impact

### 9. Code Modification Summary

**Files to Modify**:

1. **`/Users/seankim/dev/visualizations/flocking/src/apps/simulation-app.js`** (lines 195-230)
   - Calculate `angularVelocity` from `boid.heading - boid.previousHeading`
   - Pass to renderer via `animationParams.angularVelocity`

2. **`/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`**
   - **Line 76**: Extract `angularVelocity` from `animationParams`
   - **Line 87-93**: Pass `angularVelocity` to `calculateSegments()`
   - **Line 127**: Add `angularVelocity = 0` parameter to method signature
   - **Line 133**: Modify `y` calculation to include `curvatureOffset`

3. **`/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js`** (optional for smoothing)
   - Add `this.smoothedAngularVelocity` property
   - Update in `update()` method with damping

**No Changes Needed**:
- `koi-params.js` - No new parameters required (could add `CURVATURE_STRENGTH` later)
- `drawBody()`, `drawFins()`, `drawTail()` - Already use segment positions
- Physics calculations - Already tracking necessary data

## Code References

**Primary Implementation Locations**:
- `src/core/koi-renderer.js:127-160` - Segment calculation (main integration point)
- `src/core/koi-renderer.js:71-122` - Main render function (parameter passing)
- `src/core/koi-renderer.js:316-406` - Body drawing (uses segments)
- `src/apps/simulation-app.js:209-230` - Renderer invocation (data source)
- `src/flocking/boid.js:277-302` - Turn radius physics (heading calculation)
- `src/flocking/boid.js:234-256` - Derivative damping (angular velocity smoothing)
- `src/flocking/physics-config.js:19-24` - Turn physics constants

**Animation References**:
- `src/core/koi-renderer.js:133` - Swimming undulation calculation
- `src/core/koi-renderer.js:266` - Tail sway calculation
- `src/core/koi-renderer.js:167` - Fin sway calculation
- `src/apps/simulation-app.js:195-197` - Wave time calculation

## Architecture Documentation

**Rendering Pipeline**:
```
Boid (Physics)
  └─> velocity.heading()  ──┐
  └─> position            ──┤
  └─> heading             ──┤─> simulation-app.js
  └─> previousHeading     ──┤       │
  └─> variety/pattern     ──┘       │
                                    ├─> Calculate waveTime
                                    ├─> Calculate angularVelocity (NEW)
                                    │
                                    ├─> renderer.render()
                                    │
KoiRenderer                         │
  └─> calculateSegments() <─────────┤
        └─> Undulation              │
        └─> Curvature (NEW)         │
        └─> Width profile           │
        │                           │
        └─> segmentPositions[]      │
              │                     │
              ├─> drawFins()        │
              ├─> drawTail()        │
              ├─> drawBody()        │
              ├─> drawHead()        │
              └─> drawSpots()       │
                    │               │
                    └─> PixelBuffer │
                          │
                          └─> Canvas
```

**Separation of Concerns**:
- **Boid**: Physics simulation, no rendering knowledge
- **KoiRenderer**: Pure rendering, no physics dependency
- **SimulationApp**: Orchestration, data transformation

This clean separation means curvature can be added by:
1. Calculating derived data (angular velocity) in app layer
2. Passing through existing parameter structure
3. Applying in renderer without coupling to physics

## Historical Context

**Related Research Documents**:

1. **`thoughts/research/2025-10-19-koi-movement-and-direction-change-implementation-analysis.md`**
   - Documents turn radius physics implementation
   - Explains `heading` vs `velocity.heading()` distinction
   - Shows how angular velocity is constrained

2. **`thoughts/research/2025-10-18-boids-oscillation-mitigation-using-aerospace-control-theory.md`**
   - Documents derivative damping for smooth turns
   - Explains `DAMPING_COEFFICIENT` and angular velocity tracking
   - Context for why turns are smooth (important for curvature rendering)

3. **`thoughts/research/2025-10-18-flocking-animation-smoothness-analysis.md`**
   - Documents swimming animation implementation
   - Explains `waveTime` calculation and velocity modulation
   - Shows pattern for additive vs multiplicative animation

4. **`thoughts/research/2025-10-19-koi-flocking-simulation-input-driven-visualization-mapping-analysis.md`**
   - Documents audio reactivity and visual modifiers
   - Shows how external data flows to renderer
   - Pattern for extending `animationParams`

**Key Insights from History**:
- Turn physics already smoothed via damping (no jittery bending)
- Animation uses additive combination of effects (undulation + curvature will compose well)
- Parameter passing structure is extensible (animationParams already has multiple fields)
- Separation of concerns maintained throughout codebase

## Recommended Implementation Approach

**Phase 1: Basic Curvature** (Minimal Change)
1. Calculate `angularVelocity` in `simulation-app.js`
2. Pass via `animationParams.angularVelocity`
3. Add curvature offset in `calculateSegments()`
4. Tune `CURVATURE_STRENGTH` constant for visual appeal

**Phase 2: Refinement** (Optional)
1. Add angular velocity smoothing in `Boid` class
2. Make curvature speed-dependent
3. Add configurable parameter to `koi-params.js`
4. Test with different fish sizes and speeds

**Phase 3: Polish** (Optional)
1. Add ease-in/ease-out for curvature transitions
2. Adjust fin angles based on turn (more advanced)
3. Add visual feedback for tight turns (tail whip effect)

**Testing Strategy**:
1. Use debug mode ('D' key) to visualize angular velocity
2. Trigger scatter ('S' key) to see rapid direction changes
3. Test with different pixel scales (curvature should scale)
4. Verify sumi-e rendering preserves curvature

## Open Questions

1. **Optimal Curvature Strength**: What value of `CURVATURE_STRENGTH` looks most realistic?
   - Needs visual tuning with actual fish reference
   - May vary by fish size

2. **Speed Dependency**: Should curvature scale with speed, or be constant?
   - Real fish physics suggests speed-dependent
   - Visual preference may differ

3. **Tail Whip**: Should tail segments have higher curvature multiplier?
   - Could use `* (1 + t)` instead of `* t` for more tail bend
   - Real koi show pronounced tail motion when turning

4. **Independent/Escaping Behavior**: Do these states need special handling?
   - Escape maneuvers have rapid turns (high angular velocity)
   - May want to cap curvature to prevent unrealistic bending

5. **Audio Reactivity**: Should bass/treble affect body curvature?
   - Current system modulates brightness/saturation/size
   - Could add rhythmic curvature variations

## Next Steps

To implement turn-based body deformation:

1. **Read**: Review `boid.js:277-302` to understand heading calculation
2. **Calculate**: Add `angularVelocity` computation in `simulation-app.js:197`
3. **Pass**: Add to `animationParams` structure at line 218
4. **Extract**: Read parameter in `koi-renderer.js:76`
5. **Apply**: Modify segment calculation at `koi-renderer.js:133`
6. **Tune**: Adjust `CURVATURE_STRENGTH` for desired visual effect
7. **Test**: Use debug mode and scatter to verify behavior

**Minimal Working Example** (add to `calculateSegments()`):
```javascript
const CURVATURE_STRENGTH = 30;
const curvatureOffset = (angularVelocity || 0) * CURVATURE_STRENGTH * t * sizeScale;
const y = swimOffset + curvatureOffset;
```

This single line addition, combined with parameter passing, will enable realistic body bending during turns.
