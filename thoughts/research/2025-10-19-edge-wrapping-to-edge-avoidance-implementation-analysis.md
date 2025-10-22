---
doc_type: research
date: 2025-10-20T02:43:38+00:00
title: "Edge Wrapping to Edge Avoidance Implementation Analysis"
research_question: "How does edge wrapping currently work and how can we replace it with edge avoidance forces to make fish avoid crossing screen edges instead of wrapping around?"
researcher: Sean Kim

git_commit: 9286bf16eb2890dfeae2bd769b33fb82923ea6ab
branch: main
repository: visualizations

created_by: Sean Kim
last_updated: 2025-10-19
last_updated_by: Sean Kim

tags:
  - edge-avoidance
  - boundary-forces
  - flocking
  - physics
  - steering-behaviors
status: complete

related_docs:
  - thoughts/research/2025-10-19-koi-movement-and-direction-change-implementation-analysis.md
  - thoughts/research/2025-10-18-boids-oscillation-mitigation-using-aerospace-control-theory.md
---

# Research: Edge Wrapping to Edge Avoidance Implementation Analysis

**Date**: 2025-10-19
**Researcher**: Sean Kim
**Git Commit**: 9286bf16eb2890dfeae2bd769b33fb82923ea6ab
**Branch**: main
**Repository**: visualizations

## Research Question

How does edge wrapping currently work in the koi flocking simulation, and how can we replace it with edge avoidance forces to make fish avoid crossing screen edges instead of wrapping around? Specifically:

1. How does the current edge wrapping implementation work?
2. Where and when is it called in the update cycle?
3. What are common techniques for edge avoidance in flocking simulations?
4. How would edge avoidance forces integrate with existing flocking forces?
5. Where should edge avoidance forces be calculated?
6. What parameters would need tuning?
7. What potential issues could arise (edge clustering, corner congestion, interaction with escape/scatter behaviors)?

## Summary

The current implementation uses **simple position teleportation** - when a fish crosses a screen boundary, it instantly wraps to the opposite side. This creates unrealistic discontinuities where fish disappear and reappear.

**Edge avoidance can be implemented as a steering force** that repels fish from boundaries, similar to how separation force repels them from each other. The recommended approach is:

1. Add a `calculateEdgeAvoidance()` function to `flocking-forces.js`
2. Calculate edge distance in each dimension (x and y separately)
3. Apply repulsive force when within a detection margin (e.g., 100 pixels from edge)
4. Use inverse-square or exponential falloff for smooth, progressive steering
5. Integrate with existing force system in `flock-manager.js`
6. Blend with flocking forces using existing prioritization system

**Key advantages of this approach:**
- Natural containment without teleportation
- Fish anticipate boundaries and smoothly turn away
- Works seamlessly with existing flocking forces
- No special case handling needed
- Minimal code changes (add one force function, call it in update loop)

**Potential issues and solutions:**
- **Edge clustering**: Fish may congregate along edges → Use moderate force strength
- **Corner trapping**: Fish may get stuck in corners → Apply perpendicular escape force when cornered
- **Interaction with scatter/escape**: These behaviors may push fish toward edges → Increase edge force strength during scatter
- **Visual boundaries**: Fish need margin to turn → Detection zone must be wider than fish visual size

## Detailed Findings

### 1. Current Edge Wrapping Implementation

#### edges() Method (boid.js:554-559)

```javascript
/**
 * Handle edge wrapping
 * @param {number} width - Width of the space
 * @param {number} height - Height of the space
 */
edges(width, height) {
    if (this.position.x > width) this.position.x = 0;
    if (this.position.x < 0) this.position.x = width;
    if (this.position.y > height) this.position.y = 0;
    if (this.position.y < 0) this.position.y = height;
}
```

**Location**: `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:554-559`

**How it works**:
- **X-axis**: If position.x > width, teleport to x = 0; if x < 0, teleport to x = width
- **Y-axis**: If position.y > height, teleport to y = 0; if y < 0, teleport to y = height
- **Instant**: No transition, velocity unchanged, just position snaps

**Characteristics**:
- Simple and performant (4 if-statements)
- Creates toroidal topology (pac-man effect)
- No visual indication of boundary
- Fish can exit mid-turn and re-enter at odd angle
- No anticipation or avoidance behavior

**Call Location** (flock-manager.js:90):

```javascript
// Update physics (includes independence, escape, and scatter state updates)
boid.update(
    params.maxSpeed,
    audioData.amplitude,
    params.audioReactivity,
    this.p5,
    this.p5Funcs.random,
    this.p5Funcs.createVector,
    globalScatterActive
);
boid.edges(this.width, this.height);  // ← Called AFTER physics update
```

**Location**: `/Users/seankim/dev/visualizations/flocking/src/flocking/flock-manager.js:85-90`

**Timing**:
- Called every frame for every boid
- Runs AFTER boid.update() (after velocity/position updates)
- Runs AFTER all flocking force calculations
- Acts as a post-processing correction

**Critical Observation**: Edge wrapping is a **position correction**, not a force. It doesn't influence steering behavior - fish don't "see" boundaries coming.

### 2. Common Edge Avoidance Techniques

Based on research into flocking simulation best practices and steering behaviors, there are several established approaches:

#### Approach A: Boundary Repulsion Force (RECOMMENDED)

**Concept**: Treat boundaries like invisible obstacles that repel boids.

**How it works**:
1. Calculate distance from each boundary (left, right, top, bottom)
2. If distance < detection margin, apply repulsive force away from boundary
3. Force strength increases as distance decreases (inverse relationship)
4. Force direction perpendicular to boundary (horizontal for left/right, vertical for top/bottom)

**Advantages**:
- Natural steering behavior (fish anticipate and curve away)
- Integrates seamlessly with existing force system
- No discontinuities or teleportation
- Fish remain visible at all times
- Works with existing smoothing mechanisms

**Disadvantages**:
- Requires tuning of force strength and detection distance
- May cluster fish near center if force too strong
- Corners need special handling (two forces at once)

**Mathematical Formulation**:

```javascript
function calculateEdgeAvoidance(boid, width, height, margin, maxForce) {
    const force = createVector(0, 0);

    // Left edge
    if (boid.position.x < margin) {
        const d = boid.position.x;
        const strength = (margin - d) / margin; // 0 to 1
        force.x += strength * strength * maxForce; // Quadratic falloff
    }

    // Right edge
    if (boid.position.x > width - margin) {
        const d = width - boid.position.x;
        const strength = (margin - d) / margin;
        force.x -= strength * strength * maxForce;
    }

    // Top edge
    if (boid.position.y < margin) {
        const d = boid.position.y;
        const strength = (margin - d) / margin;
        force.y += strength * strength * maxForce;
    }

    // Bottom edge
    if (boid.position.y > height - margin) {
        const d = height - boid.position.y;
        const strength = (margin - d) / margin;
        force.y -= strength * strength * maxForce;
    }

    return force;
}
```

**Key Parameters**:
- `margin`: Detection distance (e.g., 100 pixels from edge)
- `maxForce`: Maximum repulsion strength (e.g., same as maxForce for separation)
- Falloff curve: `strength * strength` for quadratic, `strength * strength * strength` for cubic

#### Approach B: Desired Velocity Towards Center

**Concept**: When near edge, add a force pulling toward center of screen.

**How it works**:
1. Calculate vector from boid position to screen center
2. If near edge, create desired velocity toward center
3. Steering force = desired - current velocity

**Advantages**:
- Simple conceptually
- Guarantees fish move toward safe zone

**Disadvantages**:
- Creates unnatural "gathering at center" behavior
- Doesn't respect fish's current direction
- Can conflict with flocking cohesion (which also pulls to center of flock)

**Not recommended** for this project due to visual clustering.

#### Approach C: Reflection with Damping

**Concept**: When fish hits boundary, reflect velocity like a ball bouncing.

**How it works**:
1. Check if position outside bounds
2. Clamp position to boundary
3. Reverse velocity component perpendicular to boundary
4. Apply damping factor (e.g., multiply by 0.8)

**Advantages**:
- Physically intuitive (elastic collision)
- No teleportation

**Disadvantages**:
- Still has discontinuity (sudden velocity reversal)
- Doesn't look natural for fish (fish don't bounce)
- Requires post-collision handling

**Not recommended** for organic fish movement.

#### Approach D: Soft Boundary with Exponential Force

**Concept**: Similar to Approach A but with exponential falloff for sharper response near edge.

```javascript
const strength = Math.exp((margin - d) / (margin * 0.3)) - 1;
force.x += strength * maxForce;
```

**Advantages**:
- Gentle far from edge, strong near edge
- More dramatic avoidance behavior
- Better for preventing edge crossings

**Disadvantages**:
- Harder to tune (exponential parameters less intuitive)
- May create visible "speed up" near edges

**Consider as refinement** after basic implementation works.

### 3. Integration with Existing Flocking Forces

The codebase has a well-established force calculation and application system:

#### Current Force System Architecture

**Force Calculation** (`flock-manager.js:103-148`):

```javascript
calculateFlockingForces(boid, neighbors, params, audioData) {
    // Calculate raw forces
    const alignment = calculateAlignment(boid, neighbors, params.maxSpeed, params.maxForce, createVector);
    const cohesion = calculateCohesion(boid, neighbors, params.maxSpeed, params.maxForce, createVector);
    const separation = calculateSeparation(boid, neighbors, boid.perceptionRadius, params.maxSpeed, params.maxForce, createVector, this.p5);

    // Weight the forces
    alignment.mult(params.alignmentWeight);
    cohesion.mult(params.cohesionWeight);
    separation.mult(params.separationWeight * bassBoost);

    return { alignment, cohesion, separation };
}
```

**Force Application** (`boid.js:119-207`):

```javascript
applyForces(forces, neighborCount, randomFunc, maxForce, p5) {
    // Smooth forces by blending with previous frame
    const smoothedAlignment = this.previousAlignment.copy().lerp(forces.alignment, forceSmoothing);
    const smoothedCohesion = this.previousCohesion.copy().lerp(forces.cohesion, forceSmoothing);
    const smoothedSeparation = this.previousSeparation.copy().lerp(forces.separation, forceSmoothing);

    // Dead zone: ignore very small forces
    if (smoothedAlignment.mag() < deadZoneThreshold) smoothedAlignment.set(0, 0);
    // ... similar for cohesion and separation

    // FORCE PRIORITIZATION - when crowded, separation dominates
    if (separationMag > PHYSICS_CONFIG.SEPARATION_HIGH_THRESHOLD) {
        separationWeight = 0.9;
        alignmentWeight = 0.1;
        cohesionWeight = 0.1;
    }

    // Apply weighted forces
    this.acceleration.add(smoothedAlignment.mult(alignmentWeight));
    this.acceleration.add(smoothedCohesion.mult(cohesionWeight));
    this.acceleration.add(smoothedSeparation.mult(separationWeight));
}
```

**Key Mechanisms**:
1. **Force Smoothing** (FORCE_SMOOTHING: 0.25): Blends current and previous forces to reduce jitter
2. **Dead Zone** (DEAD_ZONE_THRESHOLD: 0.01): Ignores tiny forces to prevent micro-oscillations
3. **Force Prioritization**: Separation dominates when fish are too close
4. **Velocity Smoothing** (VELOCITY_SMOOTHING: 0.15): Gradually transitions velocity
5. **Derivative Damping** (DAMPING_COEFFICIENT: 0.45): Resists rapid heading changes

#### Integration Strategy for Edge Avoidance

**Option 1: Add as Fourth Force (RECOMMENDED)**

Add edge avoidance to the force object alongside alignment, cohesion, separation:

```javascript
// In flock-manager.js calculateFlockingForces()
const edgeAvoidance = calculateEdgeAvoidance(
    boid,
    this.width,
    this.height,
    params.edgeMargin || 100,
    params.maxForce,
    this.p5Funcs.createVector
);

// Weight it
edgeAvoidance.mult(params.edgeAvoidanceWeight || 1.5);

return {
    alignment,
    cohesion,
    separation,
    edgeAvoidance  // NEW
};
```

Then in `boid.applyForces()`:

```javascript
const smoothedEdgeAvoidance = this.previousEdgeAvoidance.copy().lerp(forces.edgeAvoidance, forceSmoothing);

if (smoothedEdgeAvoidance.mag() < deadZoneThreshold) smoothedEdgeAvoidance.set(0, 0);

this.acceleration.add(smoothedEdgeAvoidance);
```

**Advantages**:
- Consistent with existing force architecture
- Benefits from force smoothing
- Benefits from dead zone filtering
- Easy to tune weight separately
- Can be disabled by setting weight to 0

**Changes Required**:
1. Add `calculateEdgeAvoidance()` to `flocking-forces.js`
2. Add `previousEdgeAvoidance` property to `Boid` constructor
3. Add edge force calculation to `flock-manager.calculateFlockingForces()`
4. Add edge force application to `boid.applyForces()`
5. Add parameters: `edgeMargin`, `edgeAvoidanceWeight` to params

**Option 2: Apply Separately with High Priority**

Calculate and apply edge avoidance force directly, bypassing the normal force blending:

```javascript
// In boid.update(), before velocity calculation
const edgeForce = calculateEdgeAvoidance(this.position, width, height, margin, maxForce);
if (edgeForce.mag() > 0.01) {
    this.acceleration.add(edgeForce.mult(2.0)); // Higher priority
}
```

**Advantages**:
- Simpler implementation (no force object changes)
- Higher priority ensures edge avoidance isn't overwhelmed
- No need to modify force smoothing system

**Disadvantages**:
- Bypasses smoothing (may cause jittery edge behavior)
- Inconsistent with architecture
- Harder to tune alongside other forces

**Not recommended** - loses benefits of force smoothing.

**Option 3: Hybrid - Separate Calculation, Integrated Application**

Calculate in `boid.update()` but add to acceleration alongside other forces:

```javascript
// In boid.update(), before applying flocking forces
const edgeForce = this.calculateEdgeAvoidanceForce(width, height, params, p5);
this.acceleration.add(edgeForce);
```

**Advantages**:
- Boid knows its own boundaries (no need to pass width/height everywhere)
- Edge force gets smoothed with all forces via velocity smoothing
- Simpler force object (no new property)

**Disadvantages**:
- Doesn't benefit from force-specific smoothing
- Less consistent with architecture

**Consider as alternative** if Option 1 proves too complex.

### 4. Implementation Location Analysis

#### Where to Add calculateEdgeAvoidance()

**Recommendation**: `flocking-forces.js` (alongside alignment, cohesion, separation)

**Rationale**:
- Edge avoidance is a steering behavior, same category as flocking forces
- Keeps all force calculations in one module
- Pure function with no side effects
- Consistent with existing architecture

**Function Signature**:

```javascript
/**
 * Calculate edge avoidance steering force
 * Steer away from screen boundaries to prevent wrapping
 * @param {Object} boid - The boid
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @param {number} margin - Distance from edge to start avoiding (pixels)
 * @param {number} maxForce - Maximum steering force
 * @param {Function} createVector - p5.Vector constructor
 * @returns {Object} - Steering force vector
 */
export function calculateEdgeAvoidance(boid, width, height, margin, maxForce, createVector) {
    let steering = createVector();

    // Check each edge and accumulate forces
    // (implementation details below)

    return steering;
}
```

**File Location**: `/Users/seankim/dev/visualizations/flocking/src/flocking/flocking-forces.js`

**Add after**: `calculateEscapeForce()` function (line 160)

#### Where to Call calculateEdgeAvoidance()

**Recommendation**: `flock-manager.js` in `calculateFlockingForces()` method

**Current Location** (flock-manager.js:103-148):

```javascript
calculateFlockingForces(boid, neighbors, params, audioData) {
    const { createVector } = this.p5Funcs;

    // Calculate raw forces
    const alignment = calculateAlignment(...);
    const cohesion = calculateCohesion(...);
    const separation = calculateSeparation(...);

    // NEW: Calculate edge avoidance
    const edgeAvoidance = calculateEdgeAvoidance(
        boid,
        this.width,
        this.height,
        params.edgeMargin || PHYSICS_CONFIG.EDGE_MARGIN,
        params.maxForce,
        createVector
    );

    // Weight the forces
    alignment.mult(params.alignmentWeight);
    cohesion.mult(params.cohesionWeight);
    separation.mult(params.separationWeight * bassBoost);
    edgeAvoidance.mult(params.edgeAvoidanceWeight || PHYSICS_CONFIG.EDGE_AVOIDANCE_WEIGHT);

    return {
        alignment,
        cohesion,
        separation,
        edgeAvoidance
    };
}
```

**Rationale**:
- Already calculates all other forces here
- Has access to width/height (stored in flock-manager)
- Has access to params and createVector
- Return object naturally extends to include edgeAvoidance

#### Where to Apply Edge Avoidance Force

**Recommendation**: `boid.js` in `applyForces()` method

**Current Structure** (boid.js:119-207):

```javascript
applyForces(forces, neighborCount = 0, randomFunc = Math.random, maxForce = 0.1, p5 = null) {
    // Smooth forces
    const smoothedAlignment = this.previousAlignment.copy().lerp(forces.alignment, forceSmoothing);
    const smoothedCohesion = this.previousCohesion.copy().lerp(forces.cohesion, forceSmoothing);
    const smoothedSeparation = this.previousSeparation.copy().lerp(forces.separation, forceSmoothing);
    // NEW: Smooth edge avoidance
    const smoothedEdgeAvoidance = this.previousEdgeAvoidance.copy().lerp(forces.edgeAvoidance, forceSmoothing);

    // Dead zone filtering
    if (smoothedAlignment.mag() < deadZoneThreshold) smoothedAlignment.set(0, 0);
    if (smoothedCohesion.mag() < deadZoneThreshold) smoothedCohesion.set(0, 0);
    if (smoothedSeparation.mag() < deadZoneThreshold) smoothedSeparation.set(0, 0);
    if (smoothedEdgeAvoidance.mag() < deadZoneThreshold) smoothedEdgeAvoidance.set(0, 0);

    // Store for next frame
    this.previousAlignment = forces.alignment.copy();
    this.previousCohesion = forces.cohesion.copy();
    this.previousSeparation = forces.separation.copy();
    this.previousEdgeAvoidance = forces.edgeAvoidance.copy();

    // Force prioritization (same as current)
    // ...

    // Apply forces
    this.acceleration.add(smoothedAlignment.mult(alignmentWeight));
    this.acceleration.add(smoothedCohesion.mult(cohesionWeight));
    this.acceleration.add(smoothedSeparation.mult(separationWeight));
    this.acceleration.add(smoothedEdgeAvoidance); // No additional weight (already applied)
}
```

**Changes Required**:
1. Add `this.previousEdgeAvoidance = createVectorFunc()` to Boid constructor
2. Smooth edge force like other forces
3. Apply dead zone filtering
4. Store for next frame
5. Add to acceleration

#### Where to Remove Edge Wrapping

**Current Call** (flock-manager.js:90):

```javascript
boid.edges(this.width, this.height);
```

**Action**: Comment out or remove this line once edge avoidance is working.

**Testing Strategy**:
1. Implement edge avoidance first
2. Keep edge wrapping as fallback (comment: "TODO: remove once edge avoidance is tuned")
3. Test with both active to see which activates first
4. Once confident edge avoidance works, remove edges() call
5. Optionally remove edges() method from Boid class entirely

### 5. Parameter Tuning Requirements

#### New Physics Constants

Add to `physics-config.js`:

```javascript
// === EDGE AVOIDANCE ===
EDGE_MARGIN: 100,               // Distance from edge to start avoiding (pixels)
EDGE_AVOIDANCE_WEIGHT: 1.5,     // Multiplier for edge avoidance force (relative to other forces)
EDGE_FORCE_FALLOFF: 2,          // Exponent for distance falloff (2 = quadratic, 3 = cubic)
```

**EDGE_MARGIN**: How far from boundary edge force starts
- **Too small** (< 50): Fish get too close to edge, may partially cross before turning
- **Too large** (> 200): Fish cluster in center, avoid outer regions
- **Recommended starting value**: 100 pixels
- **Tuning guide**: Should be ~2-3x the perception radius (PERCEPTION_RADIUS: 50)

**EDGE_AVOIDANCE_WEIGHT**: Strength of edge force relative to other forces
- **Too weak** (< 1.0): Fish will hit edges and wrap
- **Too strong** (> 3.0): Fish cluster in center, avoid edges excessively
- **Recommended starting value**: 1.5 (stronger than alignment/cohesion, weaker than separation)
- **Tuning guide**: Should be comparable to separation force in priority

**EDGE_FORCE_FALLOFF**: How force strength changes with distance
- **Linear (1)**: Constant force throughout margin
- **Quadratic (2)**: Smooth ramp-up as edge approached (RECOMMENDED)
- **Cubic (3)**: Sharp increase very near edge
- **Exponential**: Most dramatic, hardest to tune

**Relationship to Existing Parameters**:

| Parameter | Current Value | Edge Avoidance Relationship |
|-----------|---------------|----------------------------|
| maxSpeed | 1.0 | Edge margin should allow fish to turn at full speed |
| maxForce | 0.1 | Edge avoidance should be ≤ maxForce * weight |
| perceptionRadius | 50 | Edge margin should be 2-3x perception radius |
| separationWeight | 1.2 | Edge weight should be comparable (1.0-2.0) |

#### Runtime Parameter Addition

Add to sketch.js params object:

```javascript
let params = {
    pixelScale: 4,
    numBoids: 80,
    maxSpeed: 1,
    maxForce: 0.1,
    separationWeight: 1.2,
    alignmentWeight: 1.2,
    cohesionWeight: 1.0,
    edgeAvoidanceWeight: 1.5,   // NEW
    edgeMargin: 100,             // NEW
    trailAlpha: 40,
    audioReactivity: 0.5
};
```

**UI Controls** (control-panel.js):

Add sliders for tuning:
```javascript
{
    label: 'Edge Avoidance',
    key: 'edgeAvoidanceWeight',
    min: 0,
    max: 3.0,
    step: 0.1
},
{
    label: 'Edge Margin',
    key: 'edgeMargin',
    min: 50,
    max: 200,
    step: 10
}
```

#### Tuning Process

**Phase 1: Basic Functionality**
1. Set `edgeMargin = 100`, `edgeAvoidanceWeight = 1.5`, `falloff = 2`
2. Remove or comment out `boid.edges()` call
3. Run simulation and observe if fish cross boundaries
4. If fish cross: increase `edgeAvoidanceWeight` by 0.2
5. If fish cluster center: decrease `edgeAvoidanceWeight` by 0.2
6. Repeat until fish stay within bounds without excessive clustering

**Phase 2: Smoothness Tuning**
1. Watch for jittery behavior near edges
2. If jittery: edge force may be too strong or changing too rapidly
3. Verify force smoothing is applied (check `applyForces()` smoothing)
4. Consider increasing `FORCE_SMOOTHING` from 0.25 to 0.3
5. Consider reducing `edgeAvoidanceWeight` and increasing `edgeMargin`

**Phase 3: Corner Handling**
1. Watch fish behavior in corners
2. If fish get stuck: implement corner detection and escape (see Issue #3 below)
3. If fish avoid corners excessively: corners have 2x edge force (both X and Y)
4. Consider reducing `edgeAvoidanceWeight` or adding corner force capping

**Phase 4: Interaction Testing**
1. Test scatter behavior ('S' key) - do fish still scatter naturally?
2. Test escape behavior (oscillation detection) - do fish escape toward edges?
3. Test independence - do independent fish drift toward edges?
4. Adjust parameters for each state if needed (see Issue #4 below)

### 6. Potential Issues and Solutions

#### Issue #1: Edge Clustering

**Problem**: Fish congregate along edges instead of using full space.

**Causes**:
- Edge force too weak → fish comfortable near edges
- Edge margin too large → effective space reduced
- Cohesion force too strong → flock gathers, may gather near edge

**Symptoms**:
- Fish swimming parallel to edges
- Flock positioned against one wall
- Unused space in center

**Solutions**:

**Solution A: Reduce Edge Margin**
```javascript
EDGE_MARGIN: 80,  // Reduced from 100
```
Allows fish closer to visual boundary before force activates.

**Solution B: Increase Cohesion to Pull Fish Inward**
```javascript
cohesionWeight: 1.5,  // Increased from 1.0
```
Flock center of mass pulls fish away from edges.

**Solution C: Add Random Drift Force**
```javascript
// In boid.update(), add small random force
const drift = p5.Vector.random2D().mult(0.01);
this.acceleration.add(drift);
```
Prevents fish from settling at edges.

**Solution D: Reduce Edge Weight Near Flock**
```javascript
// In calculateEdgeAvoidance()
const nearFlockCenter = (distanceToFlockCenter < perceptionRadius);
const weight = nearFlockCenter ? edgeWeight * 0.5 : edgeWeight;
```
Edge force weakens when fish are with flock, preventing edge clustering.

#### Issue #2: Corner Congestion

**Problem**: Fish get trapped or stuck in corners.

**Causes**:
- Corner has 2 edges → 2x edge force
- Both forces point diagonally inward → fish forced toward center
- But if fish aligned with diagonal, may struggle to turn

**Symptoms**:
- Fish circling in corners
- Fish approaching corner then rapidly turning away
- Oscillation near corners (back and forth)

**Solutions**:

**Solution A: Detect Corners and Add Escape Force**
```javascript
function calculateEdgeAvoidance(boid, width, height, margin, maxForce, createVector) {
    let steering = createVector();
    let edgeCount = 0;

    // Calculate X and Y forces
    if (boid.position.x < margin) {
        steering.x += /* ... */;
        edgeCount++;
    }
    if (boid.position.x > width - margin) {
        steering.x -= /* ... */;
        edgeCount++;
    }
    if (boid.position.y < margin) {
        steering.y += /* ... */;
        edgeCount++;
    }
    if (boid.position.y > height - margin) {
        steering.y -= /* ... */;
        edgeCount++;
    }

    // If in corner (2 edges detected), boost force
    if (edgeCount === 2) {
        steering.mult(1.5); // 50% stronger in corners
    }

    return steering;
}
```

**Solution B: Corner-Specific Escape Angle**
```javascript
// If in corner, add perpendicular force toward center diagonal
if (edgeCount === 2) {
    const centerX = width / 2;
    const centerY = height / 2;
    const toCenter = createVector(centerX - boid.position.x, centerY - boid.position.y);
    toCenter.normalize().mult(maxForce * 0.5);
    steering.add(toCenter);
}
```

**Solution C: Widen Corner Detection**
```javascript
const cornerMargin = margin * 1.5; // Wider detection for corners
```
Fish start avoiding corners earlier, before forces combine.

**Solution D: Cap Maximum Edge Force**
```javascript
steering.limit(maxForce * 2); // Prevent extreme corner forces
```
Prevents runaway force accumulation in corners.

#### Issue #3: Interaction with Scatter/Escape Behaviors

**Problem**: Scatter and escape may push fish toward edges, conflicting with edge avoidance.

**Scenario 1: Scatter Toward Edge**
- Fish scattering randomly may scatter toward nearest edge
- Edge force resists scatter → fish stuck between two forces
- Fish may oscillate at edge margin

**Scenario 2: Escape Toward Edge**
- Overcrowding escape picks random direction (45-90° from current heading)
- May pick direction toward edge
- Fish escapes from flock into boundary

**Solutions**:

**Solution A: Increase Edge Force During Scatter**
```javascript
// In calculateEdgeAvoidance(), check scatter state
const scatterIntensity = boid.getScatterIntensity();
const edgeMultiplier = 1 + scatterIntensity; // 1x to 2x based on scatter
edgeForce.mult(edgeMultiplier);
```

**Solution B: Bias Escape Direction Away from Edges**
```javascript
// In boid.triggerEscapeManeuver()
const centerX = width / 2;
const centerY = height / 2;
const toCenter = Math.atan2(centerY - this.position.y, centerX - this.position.x);

// Pick angle offset, but bias toward center
const currentHeading = this.velocity.heading();
const angleToCenter = toCenter - currentHeading;
// Normalize to -PI to PI
while (angleToCenter > Math.PI) angleToCenter -= Math.PI * 2;
while (angleToCenter < -Math.PI) angleToCenter += Math.PI * 2;

// Bias escape direction toward center
const angleOffset = randomFunc(
    PHYSICS_CONFIG.ESCAPE_ANGLE_MIN,
    PHYSICS_CONFIG.ESCAPE_ANGLE_MAX
);
const direction = angleToCenter > 0 ? 1 : -1; // Turn toward center
this.escapeDirection = currentHeading + (angleOffset * direction);
```

**Solution C: Reduce Scatter Force Near Edges**
```javascript
// In boid.calculateScatterForce()
const nearEdge = (
    this.position.x < edgeMargin ||
    this.position.x > width - edgeMargin ||
    this.position.y < edgeMargin ||
    this.position.y > height - edgeMargin
);

if (nearEdge) {
    scatterForce.mult(0.5); // Weaker scatter near edges
}
```

**Solution D: Priority System - Edge Force > Scatter**
```javascript
// In boid.applyForces()
const edgeForceMag = smoothedEdgeAvoidance.mag();

if (edgeForceMag > 0.02) {
    // Near edge - reduce scatter weight
    const scatterReduction = Math.min(edgeForceMag * 5, 1.0);
    scatterForce.mult(1 - scatterReduction);
}
```

#### Issue #4: Performance Considerations

**Problem**: Edge checking adds computation every frame for every boid.

**Analysis**:
- Current: 4 position comparisons per boid per frame
- With edge avoidance: 4 comparisons + 4 potential force calculations + vector operations
- 80 boids × 60 fps = 4,800 edge calculations per second

**Actual Performance Impact**: NEGLIGIBLE
- Modern JavaScript handles this easily
- Vector operations are highly optimized in p5.js
- 4 comparisons and a few multiplications is trivial

**Optimization (only if needed)**:

**Option A: Skip if Far from Edges**
```javascript
// Quick reject: if boid far from all edges, skip calculation
const maxDist = Math.min(
    boid.position.x,
    width - boid.position.x,
    boid.position.y,
    height - boid.position.y
);

if (maxDist > margin * 2) {
    return createVector(0, 0); // Too far from any edge
}
```

**Option B: Batched Edge Checks**
```javascript
// Only calculate edge forces every N frames
if (frameCount % 2 === 0) {
    this.cachedEdgeForce = calculateEdgeAvoidance(...);
}
return this.cachedEdgeForce;
```

**Recommendation**: Don't optimize prematurely. Implement basic version first and profile.

#### Issue #5: Visual Boundary Mismatch

**Problem**: Fish appear to cross visual screen boundary even with edge avoidance.

**Cause**: Fish have visual size (rendered body extends beyond position point).

**Example**:
- Fish position at x = 90 (within bounds)
- Fish body extends 20 pixels forward
- Visual fish head at x = 110 (crosses boundary at x = width)

**Solution**: Account for fish size in edge margin

```javascript
// In calculateEdgeAvoidance()
const fishSize = boid.sizeMultiplier * 20; // Approximate fish length
const effectiveMargin = margin + fishSize;

if (boid.position.x < effectiveMargin) {
    // Edge force calculation using effectiveMargin
}
```

**Alternative**: Increase base margin to accommodate largest fish
```javascript
EDGE_MARGIN: 120,  // Increased to account for fish size
```

### 7. Recommended Implementation Approach

Based on the analysis above, here's the recommended step-by-step implementation:

#### Phase 1: Add Edge Avoidance Function

**File**: `flocking-forces.js`
**Location**: After `calculateEscapeForce()` (line 160)

```javascript
/**
 * Calculate edge avoidance steering force
 * Steer away from screen boundaries to prevent wrapping
 * Uses quadratic falloff - force increases as distance decreases
 * @param {Object} boid - The boid
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @param {number} margin - Distance from edge to start avoiding (pixels)
 * @param {number} maxForce - Maximum steering force
 * @param {Function} createVector - p5.Vector constructor
 * @returns {Object} - Steering force vector
 */
export function calculateEdgeAvoidance(boid, width, height, margin, maxForce, createVector) {
    let steering = createVector(0, 0);

    // Left edge
    if (boid.position.x < margin) {
        const d = boid.position.x;
        const strength = (margin - d) / margin; // 0 (far) to 1 (at edge)
        steering.x += strength * strength * maxForce; // Quadratic falloff
    }

    // Right edge
    if (boid.position.x > width - margin) {
        const d = width - boid.position.x;
        const strength = (margin - d) / margin;
        steering.x -= strength * strength * maxForce;
    }

    // Top edge
    if (boid.position.y < margin) {
        const d = boid.position.y;
        const strength = (margin - d) / margin;
        steering.y += strength * strength * maxForce;
    }

    // Bottom edge
    if (boid.position.y > height - margin) {
        const d = height - boid.position.y;
        const strength = (margin - d) / margin;
        steering.y -= strength * strength * maxForce;
    }

    return steering;
}
```

#### Phase 2: Add Physics Configuration

**File**: `physics-config.js`
**Location**: After FLOCKING FORCES section (line 83)

```javascript
// === EDGE AVOIDANCE ===
// Prevent fish from wrapping around screen edges
EDGE_MARGIN: 100,               // Distance from edge to start avoiding (pixels)
EDGE_AVOIDANCE_WEIGHT: 1.5,     // Multiplier for edge avoidance force
```

#### Phase 3: Update Boid Constructor

**File**: `boid.js`
**Location**: In constructor, after line 31

```javascript
// Force smoothing - track previous frame's forces to reduce jerkiness
this.previousSeparation = createVectorFunc();
this.previousAlignment = createVectorFunc();
this.previousCohesion = createVectorFunc();
this.previousEdgeAvoidance = createVectorFunc(); // NEW
```

#### Phase 4: Calculate Edge Force in FlockManager

**File**: `flock-manager.js`
**Location**: In `calculateFlockingForces()` method (line 103)

**Import statement** (line 7):
```javascript
import {
    findNeighbors,
    calculateAlignment,
    calculateCohesion,
    calculateSeparation,
    calculateEscapeForce,
    calculateEdgeAvoidance  // NEW
} from './flocking-forces.js';
```

**In calculateFlockingForces()** (after separation calculation, ~line 139):

```javascript
const separation = calculateSeparation(
    boid,
    neighbors,
    boid.perceptionRadius,
    params.maxSpeed,
    params.maxForce,
    createVector,
    this.p5
);

// NEW: Calculate edge avoidance
const edgeAvoidance = calculateEdgeAvoidance(
    boid,
    this.width,
    this.height,
    PHYSICS_CONFIG.EDGE_MARGIN,
    params.maxForce,
    createVector
);

// Weight the forces
alignment.mult(params.alignmentWeight);
cohesion.mult(params.cohesionWeight);

// Bass makes them separate more - push away on bass hits (gentle)
const bassBoost = 1 + audioData.bass * 1.5 * params.audioReactivity;
separation.mult(params.separationWeight * bassBoost);

// NEW: Weight edge avoidance
edgeAvoidance.mult(PHYSICS_CONFIG.EDGE_AVOIDANCE_WEIGHT);

return {
    alignment,
    cohesion,
    separation,
    edgeAvoidance  // NEW
};
```

#### Phase 5: Apply Edge Force in Boid

**File**: `boid.js`
**Location**: In `applyForces()` method

**Add smoothing** (after line 127):
```javascript
const smoothedAlignment = this.previousAlignment.copy().lerp(forces.alignment, forceSmoothing);
const smoothedCohesion = this.previousCohesion.copy().lerp(forces.cohesion, forceSmoothing);
const smoothedSeparation = this.previousSeparation.copy().lerp(forces.separation, forceSmoothing);
const smoothedEdgeAvoidance = this.previousEdgeAvoidance.copy().lerp(forces.edgeAvoidance, forceSmoothing); // NEW
```

**Add dead zone** (after line 135):
```javascript
if (smoothedAlignment.mag() < deadZoneThreshold) smoothedAlignment.set(0, 0);
if (smoothedCohesion.mag() < deadZoneThreshold) smoothedCohesion.set(0, 0);
if (smoothedSeparation.mag() < deadZoneThreshold) smoothedSeparation.set(0, 0);
if (smoothedEdgeAvoidance.mag() < deadZoneThreshold) smoothedEdgeAvoidance.set(0, 0); // NEW
```

**Store for next frame** (after line 140):
```javascript
this.previousAlignment = forces.alignment.copy();
this.previousCohesion = forces.cohesion.copy();
this.previousSeparation = forces.separation.copy();
this.previousEdgeAvoidance = forces.edgeAvoidance.copy(); // NEW
```

**Apply to acceleration** (after line 206):
```javascript
// Apply smoothed and weighted forces
this.acceleration.add(smoothedAlignment);
this.acceleration.add(smoothedCohesion);
this.acceleration.add(smoothedSeparation);
this.acceleration.add(smoothedEdgeAvoidance); // NEW

// Add scatter force if active
if (scatterForce) {
    this.acceleration.add(scatterForce);
}
```

#### Phase 6: Disable Edge Wrapping

**File**: `flock-manager.js`
**Location**: Line 90

**Comment out or remove**:
```javascript
// boid.edges(this.width, this.height); // DISABLED - using edge avoidance instead
```

#### Phase 7: Test and Tune

1. Run simulation and observe fish behavior
2. Check if fish cross boundaries
3. Check if fish cluster excessively
4. Adjust `EDGE_MARGIN` and `EDGE_AVOIDANCE_WEIGHT` in physics-config.js
5. Test scatter behavior ('S' key)
6. Test escape behavior (wait for oscillation)
7. Watch corner behavior

#### Phase 8: Add UI Controls (Optional)

**File**: `control-panel.js`

Add sliders for real-time tuning:
```javascript
{
    label: 'Edge Margin',
    key: 'edgeMargin',
    min: 50,
    max: 200,
    step: 10,
    category: 'Physics'
},
{
    label: 'Edge Avoidance',
    key: 'edgeAvoidanceWeight',
    min: 0,
    max: 3.0,
    step: 0.1,
    category: 'Weights'
}
```

**File**: `sketch.js` (params object)

Add parameters:
```javascript
let params = {
    // ... existing params
    edgeMargin: PHYSICS_CONFIG.EDGE_MARGIN,
    edgeAvoidanceWeight: PHYSICS_CONFIG.EDGE_AVOIDANCE_WEIGHT
};
```

**File**: `flock-manager.js`

Use params instead of config (for runtime tuning):
```javascript
const edgeAvoidance = calculateEdgeAvoidance(
    boid,
    this.width,
    this.height,
    params.edgeMargin || PHYSICS_CONFIG.EDGE_MARGIN,  // Use param if available
    params.maxForce,
    createVector
);

edgeAvoidance.mult(params.edgeAvoidanceWeight || PHYSICS_CONFIG.EDGE_AVOIDANCE_WEIGHT);
```

## Code References

**Current Edge Wrapping**:
- `flocking/src/flocking/boid.js:554-559` - edges() method implementation
- `flocking/src/flocking/flock-manager.js:90` - edges() method call

**Force Calculation System**:
- `flocking/src/flocking/flocking-forces.js:50-64` - calculateAlignment()
- `flocking/src/flocking/flocking-forces.js:77-92` - calculateCohesion()
- `flocking/src/flocking/flocking-forces.js:107-139` - calculateSeparation()
- `flocking/src/flocking/flocking-forces.js:151-160` - calculateEscapeForce()
- `flocking/src/flocking/flock-manager.js:103-148` - calculateFlockingForces()

**Force Application System**:
- `flocking/src/flocking/boid.js:119-207` - applyForces() method
- `flocking/src/flocking/boid.js:122-140` - Force smoothing
- `flocking/src/flocking/boid.js:142-161` - Force prioritization
- `flocking/src/flocking/boid.js:163-176` - Scatter force blending

**Physics Configuration**:
- `flocking/src/flocking/physics-config.js` - All physics constants
- `flocking/src/flocking/physics-config.js:8-12` - Force smoothing constants
- `flocking/src/flocking/physics-config.js:23-40` - Force prioritization

**Update Cycle**:
- `flocking/src/flocking/flock-manager.js:42-92` - Main update loop
- `flocking/src/flocking/boid.js:219-329` - boid.update() method
- `flocking/src/flocking/boid.js:255-276` - Velocity and position update

## Architecture Documentation

### Current Update Flow

```
FlockManager.update() [flock-manager.js:42-92]
  ↓
  For each boid:
    ↓
    If escaping:
      ├→ calculateEscapeForce() [flocking-forces.js:151]
      └→ boid.applyForces({escape only})
    ↓
    Else if independent:
      └→ Skip forces (drift)
    ↓
    Else (normal flocking):
      ├→ findNeighbors() [flocking-forces.js:16]
      ├→ calculateAlignment() [flocking-forces.js:50]
      ├→ calculateCohesion() [flocking-forces.js:77]
      ├→ calculateSeparation() [flocking-forces.js:107]
      └→ boid.applyForces({alignment, cohesion, separation})
    ↓
    boid.update() [boid.js:219]
      ├→ updateEscape() [boid.js:415]
      ├→ updateIndependence() [boid.js:335]
      ├→ updateScatter() [boid.js:469]
      ├→ Derivative damping [boid.js:231-253]
      ├→ Position += velocity
      ├→ Velocity smoothing [boid.js:257-276]
      └→ Oscillation detection [boid.js:278-325]
    ↓
    boid.edges() [boid.js:554] ← TELEPORT HERE
```

### Proposed Update Flow with Edge Avoidance

```
FlockManager.update() [flock-manager.js:42-92]
  ↓
  For each boid:
    ↓
    If escaping:
      ├→ calculateEscapeForce() [flocking-forces.js:151]
      ├→ calculateEdgeAvoidance() [flocking-forces.js:NEW]  ← NEW
      └→ boid.applyForces({escape, edgeAvoidance})           ← MODIFIED
    ↓
    Else if independent:
      ├→ calculateEdgeAvoidance() [flocking-forces.js:NEW]  ← NEW
      └→ boid.applyForces({edgeAvoidance only})             ← NEW
    ↓
    Else (normal flocking):
      ├→ findNeighbors() [flocking-forces.js:16]
      ├→ calculateAlignment() [flocking-forces.js:50]
      ├→ calculateCohesion() [flocking-forces.js:77]
      ├→ calculateSeparation() [flocking-forces.js:107]
      ├→ calculateEdgeAvoidance() [flocking-forces.js:NEW]  ← NEW
      └→ boid.applyForces({alignment, cohesion, separation, edgeAvoidance}) ← MODIFIED
    ↓
    boid.update() [boid.js:219]
      ├→ (same as before)
      └→ (no change to update cycle)
    ↓
    (boid.edges() removed or commented out)  ← REMOVED
```

**Key Changes**:
1. **NEW**: calculateEdgeAvoidance() function in flocking-forces.js
2. **MODIFIED**: calculateFlockingForces() returns edgeAvoidance in force object
3. **MODIFIED**: applyForces() smooths and applies edgeAvoidance force
4. **REMOVED**: boid.edges() call in flock-manager update loop

**Force Priority**:
1. **Edge avoidance**: Always active (EDGE_AVOIDANCE_WEIGHT: 1.5)
2. **Separation**: High priority when crowded (prioritization system)
3. **Escape**: Overrides flocking when escaping (2x maxForce)
4. **Alignment/Cohesion**: Normal priority (weights 1.0-1.2)
5. **Scatter**: Blended with others based on intensity

### Force Combination Example

**Scenario**: Fish near right edge with neighbors to the left

**Forces Applied**:
```javascript
// Flocking forces pull left (toward flock)
alignment = Vector(-0.08, 0.02)   // Velocity of neighbors
cohesion = Vector(-0.06, 0.01)    // Center of mass
separation = Vector(0.03, -0.01)  // Away from close neighbors

// Edge force pushes left (away from right edge)
edgeAvoidance = Vector(-0.12, 0)  // Strong force away from right edge

// After smoothing and weighting:
totalForce = smoothedAlignment * 1.2 +
             smoothedCohesion * 1.0 +
             smoothedSeparation * 1.2 +
             smoothedEdgeAvoidance * 1.5

// Result: Strong leftward force (both flocking and edge agree)
// Fish smoothly curves away from edge back toward flock
```

**Scenario**: Independent fish near top edge

**Forces Applied**:
```javascript
// No flocking forces (independent)
alignment = Vector(0, 0)
cohesion = Vector(0, 0)
separation = Vector(0, 0)

// Only edge force active
edgeAvoidance = Vector(0, 0.10)  // Push down from top edge

// Result: Fish drifts downward, avoiding edge
// Natural boundary containment even without flocking
```

## Historical Context (from thoughts/)

**Related Research**:

1. **Koi Movement and Direction Change Analysis** (`thoughts/research/2025-10-19-koi-movement-and-direction-change-implementation-analysis.md`)
   - Documents current velocity and steering implementation
   - Explains force smoothing and damping mechanisms
   - Shows how forces are currently calculated and applied
   - **Relevant insight**: Force smoothing (FORCE_SMOOTHING: 0.25) will naturally smooth edge avoidance forces

2. **Boids Oscillation Mitigation** (`thoughts/research/2025-10-18-boids-oscillation-mitigation-using-aerospace-control-theory.md`)
   - Documents derivative damping implementation
   - Explains PID D-term for resisting rapid heading changes
   - Shows oscillation detection and escape mechanism
   - **Relevant insight**: Edge avoidance may trigger oscillation detection if fish rapidly turns at boundary - escape mechanism will help fish break away from edge

3. **Flocking Animation Smoothness** (`thoughts/research/2025-10-18-flocking-animation-smoothness-analysis.md`)
   - Documents velocity smoothing (VELOCITY_SMOOTHING: 0.15)
   - Explains lerp-based smoothing approach
   - **Relevant insight**: Velocity smoothing will make edge avoidance turns gradual and natural-looking

**Lessons from History**:
- **Force smoothing is essential**: All forces benefit from frame-to-frame smoothing (prevents jitter)
- **Dead zone prevents micro-oscillations**: Small forces should be ignored to prevent oscillation at equilibrium
- **Prioritization prevents conflicts**: When forces conflict, one should dominate (separation > alignment when crowded)
- **Escape mechanisms are safety net**: When fish get stuck (oscillation, overcrowding), escape breaks the deadlock

**Application to Edge Avoidance**:
- Edge force MUST be smoothed (use existing smoothing system)
- Edge force MUST have dead zone (ignore if very far from edge)
- Edge force should have HIGH priority (prevent boundary crossing)
- Edge force may trigger escape in corners (this is GOOD - helps fish escape corner traps)

## Open Questions

1. **Optimal Edge Margin**: What distance from edge feels most natural?
   - Too small → fish get too close, visual crossing
   - Too large → fish cluster in center, unused space
   - **Needs visual testing** with different screen sizes

2. **Force Falloff Curve**: Quadratic, cubic, or exponential?
   - Quadratic (strength²): Smooth, moderate ramp-up (RECOMMENDED)
   - Cubic (strength³): Sharp increase near edge
   - Exponential (e^strength): Most dramatic, hardest to tune
   - **Needs testing** to see which feels most natural

3. **Corner Handling**: Do corners need special treatment?
   - Current approach: 2 edges → 2x force magnitude
   - May be sufficient if margin is large enough
   - **Test corners** to see if fish get trapped or stuck

4. **Edge Force During Scatter**: Should scatter reduce edge avoidance?
   - Option A: Keep edge force constant (prevents crossing during scatter)
   - Option B: Reduce edge force (allows more dramatic scatter)
   - Option C: Increase edge force (ensures fish stay bounded even when scattering)
   - **Recommended**: Option C (increase during scatter)

5. **Independent Fish at Edges**: Should independent fish drift toward edges?
   - Currently: independent = no flocking forces
   - With edge avoidance: independent fish still avoid edges
   - Is this desired behavior? Or should independent fish be allowed to drift to edges?
   - **Recommended**: Keep edge avoidance active (prevents unwanted wrapping)

6. **Visual Feedback**: Should there be visual indication of edge proximity?
   - Option A: No visual (invisible boundary, like an aquarium)
   - Option B: Subtle edge glow when fish near boundary
   - Option C: Debug mode shows edge force vectors
   - **Recommended**: Option A for production, Option C for debugging

7. **Audio Reactivity**: Should bass/treble affect edge avoidance?
   - Current system: bass boosts separation force
   - Could: bass weakens edge force (allows more dramatic edge approaches)
   - Could: treble strengthens edge force (tighter containment)
   - **Recommended**: Keep edge force constant (predictable boundaries)

## Recommendations

### Implementation Priority

**Phase 1: Basic Edge Avoidance** (Essential)
1. Add `calculateEdgeAvoidance()` to flocking-forces.js
2. Add edge force to flock-manager force calculation
3. Add edge force smoothing to boid.applyForces()
4. Add physics config constants (EDGE_MARGIN, EDGE_AVOIDANCE_WEIGHT)
5. Disable boid.edges() call
6. Test and verify fish don't cross boundaries

**Phase 2: Tuning and Polish** (Important)
1. Test different edge margin values (50-200)
2. Test different edge weight values (1.0-3.0)
3. Test different falloff curves (quadratic vs cubic)
4. Verify smooth turning behavior near edges
5. Watch for edge clustering and adjust

**Phase 3: Corner Handling** (If needed)
1. Monitor corner behavior during testing
2. If fish get stuck, implement corner detection
3. Add corner force boost or escape mechanism
4. Verify corners feel natural

**Phase 4: State Interaction** (If needed)
1. Test scatter behavior near edges
2. Test escape behavior near edges
3. Test independent fish near edges
4. Adjust force weights for each state if needed

**Phase 5: UI Controls** (Optional)
1. Add edge margin slider to control panel
2. Add edge weight slider to control panel
3. Allow runtime tuning without code changes

### Best Practices

**Force Calculation**:
- Use quadratic falloff (strength²) for smooth transitions
- Normalize strength to 0-1 range (edge to margin)
- Return zero vector if outside margin (early exit)
- Keep function pure (no side effects)

**Force Application**:
- Always smooth edge force with previous frame
- Apply dead zone threshold
- Add to acceleration with other forces
- Don't apply special priority (let normal prioritization work)

**Parameter Tuning**:
- Start conservative (lower weight, larger margin)
- Increase edge weight gradually until crossings stop
- Reduce margin gradually to maximize usable space
- Balance edge clustering vs boundary crossings

**Testing**:
- Test normal flocking first
- Test scatter behavior ('S' key)
- Test escape behavior (wait for oscillation)
- Test corner behavior specifically
- Test with different screen sizes (mobile vs desktop)

### Alternative Approaches (Not Recommended)

**Why not reflection?**
- Sudden velocity reversal feels unnatural for fish
- Creates visible discontinuity
- Doesn't anticipate boundary

**Why not desired velocity toward center?**
- Creates clustering at screen center
- Conflicts with flock cohesion (which also pulls to center)
- Unnatural "gathering" behavior

**Why not invisible walls with collision?**
- Still has discontinuity (hard stop)
- Requires collision detection and response
- More complex than force-based approach
- Doesn't look organic

**Why progressive steering force is best**:
- Fish anticipate boundary and turn smoothly
- No discontinuities or sudden changes
- Integrates perfectly with existing force system
- Feels natural and organic
- Minimal code changes
- Highly tunable

## Next Steps

To implement edge avoidance:

1. **Read**: Review `flocking-forces.js` to understand force calculation patterns
2. **Add**: Implement `calculateEdgeAvoidance()` function after `calculateEscapeForce()`
3. **Configure**: Add EDGE_MARGIN and EDGE_AVOIDANCE_WEIGHT to physics-config.js
4. **Integrate**: Add edge force calculation to flock-manager.calculateFlockingForces()
5. **Apply**: Add edge force smoothing and application to boid.applyForces()
6. **Disable**: Comment out or remove boid.edges() call in flock-manager
7. **Test**: Run simulation and verify fish stay within boundaries
8. **Tune**: Adjust margin and weight parameters for optimal behavior
9. **Polish**: Test corner behavior and state interactions
10. **Document**: Update code comments to explain edge avoidance system

**Minimal Working Implementation** (just the force function):

```javascript
// In flocking-forces.js, after calculateEscapeForce()
export function calculateEdgeAvoidance(boid, width, height, margin, maxForce, createVector) {
    let force = createVector(0, 0);

    // Left edge
    if (boid.position.x < margin) {
        const d = boid.position.x;
        const s = (margin - d) / margin;
        force.x += s * s * maxForce;
    }

    // Right edge
    if (boid.position.x > width - margin) {
        const d = width - boid.position.x;
        const s = (margin - d) / margin;
        force.x -= s * s * maxForce;
    }

    // Top edge
    if (boid.position.y < margin) {
        const d = boid.position.y;
        const s = (margin - d) / margin;
        force.y += s * s * maxForce;
    }

    // Bottom edge
    if (boid.position.y > height - margin) {
        const d = height - boid.position.y;
        const s = (margin - d) / margin;
        force.y -= s * s * maxForce;
    }

    return force;
}
```

This function, combined with the integration steps above, will replace edge wrapping with smooth edge avoidance.
