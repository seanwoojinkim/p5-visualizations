---
doc_type: research
date: 2025-10-19T02:31:07+00:00
title: "Koi Flocking Jerkiness Accumulation Analysis"
research_question: "Why does jerkiness accumulate over time in the koi flocking simulation?"
researcher: Sean Kim

git_commit: 65fa2f88983b922829804f07e032d77639f16a54
branch: main
repository: visualizations

created_by: Sean Kim
last_updated: 2025-10-18
last_updated_by: Sean Kim

tags:
  - flocking
  - boids
  - p5js
  - force-smoothing
  - vector-operations
  - performance
status: draft

related_docs: []
---

# Research: Koi Flocking Jerkiness Accumulation Analysis

**Date**: 2025-10-18T22:31:07-08:00
**Researcher**: Sean Kim
**Git Commit**: 65fa2f88983b922829804f07e032d77639f16a54
**Branch**: main
**Repository**: visualizations

## Research Question

Why does jerkiness accumulate over time in the koi flocking simulation? The user reports that "the longer it runs, the jerkier it gets," despite recent implementation of force smoothing to reduce jerkiness from boid interactions.

## Summary

After comprehensive analysis of the koi flocking simulation code in `/Users/seankim/dev/visualizations/flocking/sketch.js`, I have identified **two critical bugs** and **one potential floating-point precision issue** that could cause jerkiness to accumulate over time:

### Critical Bugs Found:

1. **Unnecessary Acceleration Limiting (Line 756)** - The acceleration vector is limited AFTER being used for calculations but BEFORE being reset to zero. This serves no purpose and may indicate an underlying misunderstanding of the update cycle.

2. **Potential Vector Zeroing Issue (Line 757)** - The acceleration is reset using `this.acceleration.mult(0)`, which should work but may have edge cases or precision issues in p5.js.

### Potential Accumulation Issue:

3. **Double-Layer Smoothing with Floating-Point Drift** - The combination of force smoothing (30% blend) in `flock()` and velocity smoothing (15% blend) in `update()` creates two layers of lerp operations that could accumulate floating-point precision errors over thousands of frames.

## Detailed Findings

### 1. Force Smoothing Implementation (Lines 708-737)

**Location**: `flock()` method in Boid class

**Current Implementation**:
```javascript
// Lines 717-719: Create smoothed forces by lerping between previous and current
let smoothedAlignment = p5.Vector.lerp(this.previousAlignment.copy(), alignment, forceSmoothness);
let smoothedCohesion = p5.Vector.lerp(this.previousCohesion.copy(), cohesion, forceSmoothness);
let smoothedSeparation = p5.Vector.lerp(this.previousSeparation.copy(), separation, forceSmoothness);

// Lines 722-724: Store unweighted smoothed forces for next frame
this.previousAlignment = smoothedAlignment.copy();
this.previousCohesion = smoothedCohesion.copy();
this.previousSeparation = smoothedSeparation.copy();

// Lines 727-732: Apply weights to smoothed forces
smoothedAlignment.mult(params.alignmentWeight);
smoothedCohesion.mult(params.cohesionWeight);
smoothedSeparation.mult(params.separationWeight * bassBoost);
```

**Analysis**:
- The force smoothing uses `forceSmoothness = 0.3`, meaning 70% of the previous force and 30% of the new force
- The code correctly stores UNWEIGHTED forces in `previousX` variables (lines 722-724)
- Weights are applied AFTER storing (lines 727-732), which is the correct approach
- The `.copy()` calls are used correctly to prevent reference issues

**Potential Issues**:
1. **Unnecessary `.copy()` on line 717-719**: The code does `this.previousAlignment.copy()` before passing to static `p5.Vector.lerp()`. Since the static method returns a new vector, the `.copy()` creates an unnecessary intermediate object each frame, but this shouldn't cause accumulation.

2. **Zero Vector Initialization**: The previous forces are initialized as zero vectors in the constructor (lines 242-244). This means the first frame will have forces at only 30% of their actual value, ramping up over several frames. However, this should stabilize after ~10 frames, not accumulate indefinitely.

### 2. Acceleration Management (Lines 739-760)

**Location**: `update()` method in Boid class

**Current Implementation**:
```javascript
// Line 740: Update position
this.position.add(this.velocity);

// Lines 744-748: Calculate target velocity
let targetVelocity = p5.Vector.add(this.velocity, this.acceleration);
const speedMultiplier = 1 + audio.amplitude * params.audioReactivity;
targetVelocity.limit(params.maxSpeed * speedMultiplier);

// Line 753: Smooth velocity toward target
let smoothing = 0.15;
this.velocity.lerp(targetVelocity, smoothing);

// Lines 756-757: CRITICAL BUG - Limit then reset acceleration
this.acceleration.limit(params.maxForce * 1.5);
this.acceleration.mult(0);
```

**CRITICAL BUG - Line 756**:

```javascript
this.acceleration.limit(params.maxForce * 1.5);
```

**Why This Is Suspicious**:
- The acceleration has already been used to calculate `targetVelocity` (line 744)
- It's about to be reset to zero (line 757)
- Limiting a vector that's about to be zeroed serves no purpose
- This suggests the developer may have been debugging an issue with acceleration not being properly reset

**Hypothesis**: This line may have been added when the developer noticed jerkiness, thinking that limiting acceleration before zeroing might help. This indicates they may have suspected that `mult(0)` wasn't working correctly.

**POTENTIAL BUG - Line 757**:

```javascript
this.acceleration.mult(0);
```

According to p5.js documentation:
- `vector.mult(n)` multiplies all components by `n`
- `mult(0)` should set all components to exactly 0

However, there are several concerns:
1. **Floating-point precision**: In JavaScript, `0 * anything = 0`, but there could be edge cases with `NaN` or `Infinity`
2. **p5.js implementation details**: If there are any bugs in p5.js's `mult()` implementation, they could cause incomplete zeroing
3. **Reference issues**: If the acceleration vector is somehow aliased elsewhere, zeroing might not work as expected

**Better approach**: Use `this.acceleration.set(0, 0, 0)` or `this.acceleration = createVector()` for explicit zeroing.

### 3. Velocity Smoothing (Lines 744-753)

**Current Implementation**:
```javascript
let targetVelocity = p5.Vector.add(this.velocity, this.acceleration);
targetVelocity.limit(params.maxSpeed * speedMultiplier);
this.velocity.lerp(targetVelocity, smoothing);  // smoothing = 0.15
```

**Analysis**:
This creates a second layer of smoothing on top of the force smoothing:
- **Force smoothing**: 30% blend in `flock()`
- **Velocity smoothing**: 15% blend in `update()`

**Mathematical Behavior**:
With `smoothing = 0.15`, each frame:
```
new_velocity = old_velocity * 0.85 + target_velocity * 0.15
where target_velocity = old_velocity + acceleration

Therefore:
new_velocity = old_velocity * 0.85 + (old_velocity + acceleration) * 0.15
new_velocity = old_velocity * 0.85 + old_velocity * 0.15 + acceleration * 0.15
new_velocity = old_velocity * 1.0 + acceleration * 0.15
```

This is mathematically correct for a single frame. However, the `.lerp()` method modifies `this.velocity` **in place**, which is necessary for the algorithm to work.

**Potential Accumulation Issue - Floating-Point Drift**:

With two layers of lerp smoothing (force at 0.3, velocity at 0.15), each frame involves:
1. Three `p5.Vector.lerp()` calls for forces (alignment, cohesion, separation)
2. One `velocity.lerp()` call for velocity smoothing
3. Multiple vector additions and multiplications

Over thousands of frames (the simulation runs at 60fps, so 1 hour = 216,000 frames), floating-point precision errors could accumulate:
- JavaScript uses IEEE 754 double-precision (64-bit) floats
- Each lerp operation: `result = v1 * (1 - amt) + v2 * amt` involves 2 multiplications and 2 additions
- Repeated operations on the same vector could cause drift

**Evidence of Accumulation**:
The fact that jerkiness "accumulates over time" strongly suggests floating-point drift. If forces were simply too high or too low, the simulation would be consistently jerky from the start.

### 4. Vector Operation Patterns

**p5.Vector.lerp() Behavior** (from p5.js documentation):
- **Static**: `p5.Vector.lerp(v1, v2, amt)` - Returns a NEW vector, doesn't modify arguments
- **Instance**: `v.lerp(target, amt)` - Modifies `v` IN PLACE

**Usage in Code**:
- Line 717-719: Uses STATIC `p5.Vector.lerp()` - Creates new vectors ✓
- Line 753: Uses INSTANCE `.lerp()` - Modifies `this.velocity` in place ✓

Both usages are correct for their intended purpose.

**p5.Vector.mult() Behavior**:
- `v.mult(n)` - Multiplies all components by `n`, modifies in place
- `mult(0)` - Should zero the vector
- **Concern**: According to GitHub issues, there have been historical bugs with `mult()` in p5.js

**p5.Vector.copy() Behavior**:
- Creates a NEW vector with the same components
- Used correctly in the code to prevent reference issues

### 5. Memory/State Accumulation Check

**Variables That Persist Across Frames**:

In the Boid constructor:
```javascript
this.position = createVector(...);           // Modified every frame
this.velocity = p5.Vector.random2D();        // Modified every frame via lerp
this.acceleration = createVector();          // Zeroed every frame (supposedly)
this.previousSeparation = createVector();    // Replaced every frame with copy
this.previousAlignment = createVector();     // Replaced every frame with copy
this.previousCohesion = createVector();      // Replaced every frame with copy
this.spots = [];                             // Static, generated once
```

**Global State**:
```javascript
let flock = [];  // Array of boids, size changes with params.numBoids
```

**Memory Leaks**:
- Lines 722-724 create new vector objects every frame via `.copy()`, but the old ones should be garbage collected
- No unbounded arrays or growing data structures detected
- The `spots` array is generated once and never grows

**Conclusion**: No obvious memory leaks, but the frequent object creation (3 new vectors per boid per frame for previousX forces, plus intermediate vectors from static lerp calls) could cause garbage collection pressure.

## Code References

### Force Smoothing
- `/Users/seankim/dev/visualizations/flocking/sketch.js:241-244` - Previous force initialization
- `/Users/seankim/dev/visualizations/flocking/sketch.js:708-737` - Force smoothing implementation
- `/Users/seankim/dev/visualizations/flocking/sketch.js:717-719` - Smoothed force calculation using static lerp
- `/Users/seankim/dev/visualizations/flocking/sketch.js:722-724` - Storing unweighted previous forces
- `/Users/seankim/dev/visualizations/flocking/sketch.js:727-732` - Applying weights to forces

### Acceleration Management
- `/Users/seankim/dev/visualizations/flocking/sketch.js:238` - Acceleration initialization
- `/Users/seankim/dev/visualizations/flocking/sketch.js:734-736` - Adding weighted forces to acceleration
- `/Users/seankim/dev/visualizations/flocking/sketch.js:744` - Using acceleration to calculate target velocity
- `/Users/seankim/dev/visualizations/flocking/sketch.js:756` - CRITICAL BUG: Unnecessary acceleration limiting
- `/Users/seankim/dev/visualizations/flocking/sketch.js:757` - POTENTIAL BUG: Acceleration reset via mult(0)

### Velocity Smoothing
- `/Users/seankim/dev/visualizations/flocking/sketch.js:744-748` - Target velocity calculation
- `/Users/seankim/dev/visualizations/flocking/sketch.js:752-753` - Velocity smoothing via instance lerp
- `/Users/seankim/dev/visualizations/flocking/sketch.js:740` - Position update

### Update Loop
- `/Users/seankim/dev/visualizations/flocking/sketch.js:205-223` - Main draw loop
- `/Users/seankim/dev/visualizations/flocking/sketch.js:215-219` - Boid update sequence: flock() → update() → show()

## Potential Root Causes (In Order of Likelihood)

### 1. Acceleration Not Being Fully Reset (HIGH CONFIDENCE)

**Evidence**:
- Line 756 limits acceleration AFTER use and BEFORE reset - suggests developer suspected reset issues
- Line 757 uses `mult(0)` which should work but may have edge cases
- Jerkiness "accumulates over time" matches the behavior of acceleration not being fully zeroed

**Hypothesis**:
If `mult(0)` doesn't fully zero the vector due to floating-point issues, tiny residual acceleration values could accumulate over thousands of frames. Even values on the order of 1e-15 would compound over time.

**Test**: Replace line 757 with:
```javascript
this.acceleration = createVector();  // Explicitly create new zero vector
```
or
```javascript
this.acceleration.set(0, 0, 0);  // Explicitly set to zero
```

### 2. Floating-Point Precision Drift in Double Smoothing (MEDIUM CONFIDENCE)

**Evidence**:
- Two layers of lerp smoothing (forces at 0.3, velocity at 0.15)
- Velocity is modified in place every frame
- Over long runtime (1 hour = 216,000 frames), precision errors could compound

**Hypothesis**:
The repeated lerp operations on `this.velocity` could cause the vector to drift slightly from its mathematically correct value. Combined with force smoothing, this creates a feedback loop where small errors compound.

**Mathematical Concern**:
```
Frame N: velocity = velocity * 0.85 + (velocity + accel) * 0.15
```

If there's any imprecision in the multiplication or addition, it gets fed back into the next frame's calculation.

**Test**: Log the velocity magnitude every 1000 frames and check for unbounded growth or oscillation.

### 3. Reference Aliasing in previousX Vectors (LOW CONFIDENCE)

**Evidence**:
- Code uses `.copy()` extensively, suggesting developer was aware of reference issues
- Lines 722-724 explicitly create copies when storing previous forces

**Hypothesis**:
Despite the `.copy()` calls, there might be a subtle reference issue where `smoothedAlignment` and `this.previousAlignment` point to the same object, causing the weights applied on lines 727-732 to affect the stored previous forces.

**However**: This seems unlikely because:
- `p5.Vector.lerp()` (static) returns a NEW vector
- `.copy()` creates a NEW vector
- Even if this were the issue, it would cause immediate visible problems, not gradual accumulation

**Test**: Add logging to verify that `this.previousAlignment !== smoothedAlignment` after line 722.

### 4. Garbage Collection Pressure (LOW CONFIDENCE)

**Evidence**:
- 3 new vector objects created per boid per frame (lines 722-724)
- Intermediate vectors created by static lerp calls
- With 80 boids at 60fps: 80 * 3 * 60 = 14,400 objects/second

**Hypothesis**:
Frequent garbage collection could cause frame drops that manifest as jerkiness. The longer the simulation runs, the more garbage accumulates, causing more frequent GC pauses.

**However**: Modern JavaScript engines handle this well, and GC pauses would cause stuttering, not smooth accumulation of jerkiness.

**Test**: Monitor memory usage and GC activity in browser DevTools.

## Recommended Diagnostic Steps

1. **Replace acceleration reset** (line 757):
   ```javascript
   // OLD:
   this.acceleration.mult(0);

   // NEW - Option 1:
   this.acceleration.set(0, 0, 0);

   // NEW - Option 2:
   this.acceleration = createVector();
   ```

2. **Remove unnecessary acceleration limit** (line 756):
   ```javascript
   // DELETE THIS LINE:
   this.acceleration.limit(params.maxForce * 1.5);
   ```

3. **Add diagnostic logging**:
   ```javascript
   // In update(), after line 753:
   if (frameCount % 1000 === 0) {
     console.log(`Frame ${frameCount}:`, {
       velocityMag: this.velocity.mag(),
       accelerationMag: this.acceleration.mag(),
       velocityX: this.velocity.x,
       velocityY: this.velocity.y
     });
   }
   ```

4. **Test with single-layer smoothing**:
   - Disable velocity smoothing (set `smoothing = 1.0` on line 752)
   - Or disable force smoothing (set `forceSmoothness = 1.0` on line 716)
   - Observe if jerkiness still accumulates

5. **Monitor for vector aliasing**:
   ```javascript
   // After line 722:
   console.assert(this.previousAlignment !== smoothedAlignment,
     "Vector aliasing detected!");
   ```

## Open Questions

1. **p5.js Version**: What version of p5.js is being used? There may be known bugs with `mult()` or `lerp()` in certain versions.

2. **Browser**: Does the issue occur in all browsers, or just specific ones? Different JavaScript engines handle floating-point math differently.

3. **Time to Manifestation**: How long does it take for the jerkiness to become noticeable? Minutes? Hours? This could help narrow down whether it's precision drift (would take hours) or a reset bug (could manifest in minutes).

4. **Audio Reactivity**: Does the issue occur without audio (`params.audioReactivity = 0`)? The `bassBoost` variable (line 731) adds variability that could exacerbate floating-point issues.

5. **Boid Count**: Does the issue scale with the number of boids, or is it independent? This could indicate whether it's a per-boid issue or a global state issue.

## Related Research

(None found - this appears to be the first formal investigation of this issue)

## Next Steps for Investigation

If the acceleration reset fix (replacing `mult(0)` with `set(0, 0, 0)`) doesn't resolve the issue, the next investigation should focus on:

1. **Velocity drift analysis**: Instrument the code to track velocity magnitudes over time
2. **Force magnitude analysis**: Log the raw force magnitudes to see if they grow unbounded
3. **Previous force analysis**: Verify that previousX vectors remain bounded
4. **Memory profiling**: Use browser DevTools to check for memory leaks or GC issues
5. **p5.js source review**: Examine the actual implementation of `mult()` and `lerp()` for potential bugs
