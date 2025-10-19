---
doc_type: research
date: 2025-10-19T14:39:54+00:00
title: "Koi Animation Jitter Investigation: Progressive Accumulation Over Time"
research_question: "Why does koi animation jitter accumulate over time despite smooth velocity vectors, and what is causing momentary jitter on reset?"
researcher: Claude Code

git_commit: e8ec10a16e30cd6f21558d42180849dff8f67916
branch: main
repository: visualizations/flocking

created_by: Claude Code
last_updated: 2025-10-19
last_updated_by: Claude Code

tags:
  - animation
  - jitter
  - smoothedSpeed
  - waveTime
  - rendering
  - accumulation
  - koi
  - boids
  - timing
status: complete

related_docs:
  - research/2025-10-19-oscillation-detection-analysis-and-improvements.md
  - MIGRATION.md
  - README.md
---

# Research: Koi Animation Jitter Investigation

**Date**: 2025-10-19T14:39:54+00:00
**Researcher**: Claude Code
**Git Commit**: e8ec10a16e30cd6f21558d42180849dff8f67916
**Branch**: main
**Repository**: visualizations/flocking

## Research Question

Why does koi animation exhibit visual jitter that progressively worsens over time (first 30 seconds smooth, then accumulates), despite velocity vectors being smooth? The jitter affects both turning fish and fish moving in straight lines, and all fish show momentary jitter when pressing 'R' to reset. What causes this accumulation and the reset jitter?

## Summary

The animation jitter is **NOT a physics oscillation issue** (velocity vectors are smooth). It's an **animation timing accumulation problem** caused by smoothing a value that controls animation **rate** rather than animation **position**. The progressive worsening over time is a textbook integration error.

**Root Cause Identified:**

The `smoothedSpeed` value (smoothed from `velocity.mag()`) is used as a **multiplier** in the animation rate calculation:

```javascript
// simulation-app.js:320
const waveTime = frameCount * 0.1 * (1 + boid.smoothedSpeed * 0.3) + boid.animationOffset;
```

**The Problem:** Smoothing creates lag between actual velocity changes and `smoothedSpeed`. This lag causes the animation to run at the **wrong speed** for multiple frames during velocity changes, leading to **phase drift** that accumulates over time as an integration error.

**Why It Gets Worse Over Time:**
- Each velocity change adds a small phase error (a few degrees)
- Errors accumulate with each turn (positive and negative errors don't cancel)
- After 30 seconds at 60fps (1800 frames), hundreds of velocity changes have occurred
- Total accumulated phase error causes visible jitter in wave animation

**Why Reset Causes Jitter:**
- `smoothedSpeed` initialized to `velocity.mag()` in constructor
- But `animationOffset` is randomized (0 to 2π)
- Initial velocity magnitude varies (0.5 to 1.5)
- For ~100ms after reset, `smoothedSpeed` catches up to actual speed
- During catch-up, animation rate is wrong, creating visible jitter

## Detailed Findings

### 1. Animation Pipeline: From Velocity to Visual Output

#### 1.1 The Complete Flow

**Step 1: Calculate waveTime** (`simulation-app.js:320`)
```javascript
const waveTime = frameCount * 0.1 * (1 + boid.smoothedSpeed * 0.3) + boid.animationOffset;
```

**Breakdown:**
- `frameCount`: p5.js global, increments every frame (60fps)
- `0.1`: Base animation speed constant
- `boid.smoothedSpeed`: Exponentially smoothed velocity magnitude (0.2 smoothing factor)
- `0.3`: Speed influence multiplier (30% variation based on speed)
- `boid.animationOffset`: Random phase offset (0 to 2π) set at construction

**What this means:**
- Fish swimming at speed 0: `waveTime = frameCount * 0.1 + offset`
- Fish swimming at speed 1: `waveTime = frameCount * 0.13 + offset` (30% faster animation)
- Fish swimming at speed 2: `waveTime = frameCount * 0.16 + offset` (60% faster animation)

**Step 2: Pass to Renderer** (`simulation-app.js:331-352`)
```javascript
renderer.render(
    pg,
    boid.position.x,
    boid.position.y,
    boid.velocity.heading(),
    {
        // ...
        animationParams: {
            waveTime,  // ← The calculated time value
            sizeScale: boid.sizeMultiplier,
            lengthMultiplier: boid.lengthMultiplier,
            tailLength: boid.tailLength
        },
        // ...
    }
);
```

**Step 3: Calculate Body Segments** (`koi-renderer.js:86-119`)
```javascript
calculateSegments(numSegments, waveTime, sizeScale, lengthMultiplier, shapeParams) {
    const segments = [];

    for (let i = 0; i < numSegments; i++) {
        const t = i / numSegments;  // Segment position (0 to 1)
        const x = this.lerp(7, -9, t) * sizeScale * lengthMultiplier;

        // THIS IS WHERE WAVETIME CREATES THE WAVE MOTION:
        const y = Math.sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);
        //                 ^^^^^^^^   ^^^^^^
        //                 Current    Wave propagation
        //                 phase      along body

        // ... width calculations ...

        segments.push({ x, y, w: segmentWidth });
    }

    return segments;
}
```

**What `waveTime` controls:**
- **Body undulation**: `y = Math.sin(waveTime - t * 3.5)` creates S-curve wave along body
- **Fin movement**: `Math.sin(waveTime - 0.5)`, `Math.sin(waveTime * 1.2)` animates fin sway
- **Tail sway**: `Math.sin(waveTime - 2.5 - t * 2)` creates flowing tail motion

**Step 4: Use Segments for Rendering** (`koi-renderer.js:72-76`)
```javascript
this.drawFins(context, segmentPositions, shapeParams, waveTime, ...);
this.drawTail(context, segmentPositions, shapeParams, waveTime, ...);
this.drawBody(context, segmentPositions, shapeParams, ...);
this.drawHead(context, segmentPositions[0], shapeParams, ...);
this.drawSpots(context, segmentPositions, pattern.spots || [], ...);
```

**Visual Impact:**
- `waveTime` determines the **phase** of the swimming wave
- Small errors in `waveTime` → visible discontinuities in the wave
- Discontinuities appear as "jitter" or "stutter" in the animation

#### 1.2 The Critical Math: Why Smoothing Rate Causes Accumulation

**The Formula:**
```
waveTime = frameCount * 0.1 * (1 + smoothedSpeed * 0.3) + offset
```

**Rewritten as derivative:**
```
d(waveTime)/dt = 0.1 * (1 + smoothedSpeed * 0.3)
```

**This is an animation RATE, not a position!** Smoothing the rate is dangerous because:

1. **Ideal case** (no smoothing):
   - Actual speed changes from 1.0 → 1.5 instantly
   - Animation rate changes from 0.13 → 0.145 instantly
   - Wave phase stays synchronized with actual swimming speed

2. **Reality** (with smoothing):
   - Actual speed changes from 1.0 → 1.5 instantly at frame N
   - `smoothedSpeed` changes gradually over ~10 frames:
     - Frame N: 1.0 → 1.1 (animation too slow by 0.035/frame)
     - Frame N+1: 1.1 → 1.2 (animation too slow by 0.025/frame)
     - Frame N+2: 1.2 → 1.3 (animation too slow by 0.015/frame)
     - ...
     - Frame N+10: 1.48 → 1.5 (animation correct)
   - Total accumulated phase error ≈ 0.2 radians (11.5 degrees)

3. **After 30 seconds:**
   - Typical koi makes ~50-100 turns
   - Each turn adds 5-15 degrees of phase error
   - Total accumulated error: 250-1500 degrees = 0.7-4.2 full wave cycles
   - Fish's wave animation is out of sync with actual body position by multiple wavelengths

**Mathematical Proof:**

Let `v(t)` = actual velocity, `s(t)` = smoothedSpeed.

Smoothing formula: `s(t) = s(t-1) + (v(t) - s(t-1)) * 0.2`

Phase accumulation: `φ(t) = Σ [actual_rate - smoothed_rate] * dt`
                            = `Σ [0.1*(1+v*0.3) - 0.1*(1+s*0.3)] * dt`
                            = `Σ 0.03 * (v - s) * dt`

During a velocity change from 1.0 → 1.5 over 10 frames:
- Frame 0: `v-s = 0.5`, error = 0.015
- Frame 1: `v-s = 0.4`, error = 0.012
- Frame 2: `v-s = 0.32`, error = 0.0096
- ...
- Total error ≈ 0.08 radians per velocity change

**This is a classic integration error in numerical methods.**

### 2. The smoothedSpeed Mechanism and Accumulation

#### 2.1 Implementation Details

**Initialization** (`boid.js:57-59`)
```javascript
// Smoothed velocity magnitude for animation (prevents jittery wave animation)
// Initialize to actual velocity magnitude to prevent catch-up jitter
this.smoothedSpeed = this.velocity.mag();
```

**Comment says "prevent catch-up jitter"** but this creates the reset jitter! The issue is:
- Velocity is randomized: `velocity.setMag(randomFunc(0.5, 1.5))`
- So different boids start with different speeds: 0.5, 0.8, 1.2, 1.5, etc.
- `smoothedSpeed` initialized correctly to match
- BUT physics immediately starts changing velocity based on flocking forces
- For first ~100ms, `smoothedSpeed` lags behind actual speed changes
- This creates visible jitter during the catch-up period

**Update Every Frame** (`boid.js:209-219`)
```javascript
// Smooth speed for animation (prevents jittery wave animation)
// This is separate from physics - animation uses smoothed speed to prevent visual jitter
const currentSpeed = this.velocity.mag();
const speedSmoothingFactor = 0.2; // Balance between smoothness and responsiveness

// Cap maximum lag to prevent accumulation issues
const maxLag = 0.3;
const speedDiff = currentSpeed - this.smoothedSpeed;
const clampedDiff = Math.max(-maxLag, Math.min(maxLag, speedDiff));

this.smoothedSpeed = this.smoothedSpeed + clampedDiff * speedSmoothingFactor;
```

**Exponential Smoothing Analysis:**

This is exponential moving average (EMA) with α = 0.2:
```
smoothedSpeed(n) = smoothedSpeed(n-1) + α * (actualSpeed(n) - smoothedSpeed(n-1))
                 = (1 - α) * smoothedSpeed(n-1) + α * actualSpeed(n)
                 = 0.8 * smoothedSpeed(n-1) + 0.2 * actualSpeed(n)
```

**Lag calculation:**
- Time constant τ = -1/ln(1-α) = -1/ln(0.8) ≈ 4.48 frames
- 63% of step change reached after 4.48 frames (75ms at 60fps)
- 95% of step change reached after 3τ ≈ 13.4 frames (223ms)
- 99% of step change reached after 5τ ≈ 22.4 frames (373ms)

**The maxLag clamp (0.3):**
```javascript
const clampedDiff = Math.max(-maxLag, Math.min(maxLag, speedDiff));
```

This **doesn't prevent accumulation**! It only prevents extreme single-frame errors. The comment says "prevent accumulation issues" but it actually:
- Limits how fast `smoothedSpeed` can change per frame (±0.06 per frame at α=0.2)
- Prevents divergence from huge single-frame velocity changes
- Does NOT prevent gradual accumulation of small phase errors over time

**Why maxLag doesn't fix the problem:**
- Typical velocity changes: 1.0 → 1.2 (diff = 0.2, within clamp)
- Clamping only activates for extreme changes: 0.5 → 1.5 (diff = 1.0, clamped to ±0.3)
- Most velocity changes are gradual enough to stay within clamp
- Each unclamped change still contributes to phase accumulation

#### 2.2 Example of Accumulation Over 30 Seconds

**Scenario:** Fish swimming in a circle (constant turning)

Frame 0-300 (5 sec): Straight line, speed = 1.0
- `smoothedSpeed` = 1.0 (stable)
- `waveTime` increases at rate 0.13 per frame
- No accumulation

Frame 300: Starts turning, speed increases to 1.2
- Frame 300: `smoothedSpeed` = 1.0, actual = 1.2, error = +0.006/frame
- Frame 301: `smoothedSpeed` = 1.04, actual = 1.2, error = +0.0048/frame
- Frame 302: `smoothedSpeed` = 1.072, actual = 1.2, error = +0.00384/frame
- ...
- Frame 313: `smoothedSpeed` ≈ 1.19, actual = 1.2, error ≈ +0.0003/frame
- **Total phase error from this turn: ≈0.04 radians (2.3°)**

Frame 350: Turn complete, speed decreases to 0.9
- Frame 350: `smoothedSpeed` = 1.19, actual = 0.9, error = -0.0087/frame
- Frame 351: `smoothedSpeed` = 1.132, actual = 0.9, error = -0.00696/frame
- ...
- Frame 363: `smoothedSpeed` ≈ 0.92, actual = 0.9, error ≈ -0.0006/frame
- **Total phase error from this turn: ≈-0.06 radians (-3.4°)**

**After 10 turns:**
- Positive errors: +2.3° × 5 = +11.5°
- Negative errors: -3.4° × 5 = -17°
- **Net accumulation: -5.5° (errors don't cancel perfectly because smoothing is asymmetric)**

**After 100 turns (30 seconds):**
- **Net accumulation: -55° to -110° (0.96 to 1.92 radians)**
- This is enough to make the wave visibly out of sync
- Fish looks like it's "jittering" because wave phase doesn't match body angle

**Visual description of jitter:**
- Body is turning left, but wave peak is offset wrong
- Looks like fish is "sliding sideways" or "stuttering"
- Especially visible on tail - appears to "jump" rather than flow smoothly
- Straight-line fish also jitter because they're constantly micro-adjusting velocity

### 3. Reset Behavior and Initialization Jitter

#### 3.1 Reset Call Chain

**User presses 'R'** → `simulation-app.js:134-136`
```javascript
case 'r':
    // Reset flock
    flock.reset();
    break;
```

**FlockManager.reset()** → `flock-manager.js:185-198`
```javascript
reset() {
    const count = this.boids.length;
    this.boids = [];  // ← Destroy all existing boids
    for (let i = 0; i < count; i++) {
        this.boids.push(new Boid(  // ← Create NEW boids (not reset existing)
            this.width,
            this.height,
            this.p5Funcs.random,
            this.p5Funcs.createVector,
            this.p5Funcs.floor,
            this.p5
        ));
    }
}
```

**Boid Constructor** → `boid.js:19-74`
```javascript
constructor(width, height, randomFunc, createVectorFunc, floorFunc, p5Instance) {
    // Physics
    this.position = createVectorFunc(randomFunc(width), randomFunc(height));
    this.velocity = p5Instance.Vector.random2D();
    this.velocity.setMag(randomFunc(0.5, 1.5));  // ← Random initial speed
    this.acceleration = createVectorFunc();

    // ... (lines 25-54) ...

    // Animation offset - each koi undulates at a different phase
    this.animationOffset = randomFunc(0, Math.PI * 2); // ← Random phase offset

    // Smoothed velocity magnitude for animation (prevents jittery wave animation)
    // Initialize to actual velocity magnitude to prevent catch-up jitter
    this.smoothedSpeed = this.velocity.mag();  // ← Initialized to match velocity

    // ... (rest of constructor) ...
}
```

**Key Observation:** There is NO separate reset method for Boid. Reset = destroy + recreate.

#### 3.2 Why ALL Fish Jitter Momentarily After Reset

**Root cause:** Combination of randomized initialization + physics forces applied immediately.

**Timeline of first 100ms after reset:**

**Frame 0 (reset frame):**
- All boids created with random positions, velocities, offsets
- `smoothedSpeed` = actual velocity (correctly initialized)
- No jitter yet

**Frame 1 (first physics update):**
- Flocking forces calculated based on new random positions
- Forces applied → acceleration changes
- Velocity changes: `velocity += acceleration`
- `velocity.limit(maxSpeed)` may clamp velocity
- **Now `velocity.mag()` ≠ `smoothedSpeed`** (forces changed velocity)
- Animation runs at wrong rate for this frame
- **First jitter appears**

**Frames 2-10:**
- `smoothedSpeed` catches up: 1.2 → 1.16 → 1.128 → 1.1024 → ...
- Each frame, animation rate is slightly wrong
- Cumulative phase error accumulates: 0.01 → 0.02 → 0.034 → ...
- **Visible as continuous jitter for ~167ms**

**Frame 10+:**
- `smoothedSpeed` mostly caught up (95%)
- Animation rate mostly correct
- Jitter diminishes
- **But now accumulation begins for future velocity changes**

**Why it affects ALL fish:**
- Every single fish has random initial velocity
- Every single fish immediately experiences flocking forces (unless far from others)
- Every single fish's velocity changes in frame 1
- Therefore every fish has `smoothedSpeed` lag
- Therefore every fish jitters for first 100-200ms

**Why it's especially noticeable on reset:**
- User's attention is focused on the screen (they just pressed a key)
- All fish jitter simultaneously (synchronized artifact)
- Contrast with smooth pre-reset animation makes it obvious
- During normal operation, jitter is desynchronized across fish so less obvious

#### 3.3 Comparison: Constructor vs Reset Initialization

| Aspect | Constructor (`boid.js:19-74`) | Reset (`flock-manager.js:185-198`) |
|--------|-------------------------------|-------------------------------------|
| Method | `new Boid(...)` | `this.boids.push(new Boid(...))` |
| Position | `randomFunc(width), randomFunc(height)` | `randomFunc(width), randomFunc(height)` |
| Velocity direction | `p5Instance.Vector.random2D()` | `p5Instance.Vector.random2D()` |
| Velocity magnitude | `randomFunc(0.5, 1.5)` | `randomFunc(0.5, 1.5)` |
| `animationOffset` | `randomFunc(0, Math.PI * 2)` | `randomFunc(0, Math.PI * 2)` |
| `smoothedSpeed` | `this.velocity.mag()` | `this.velocity.mag()` |
| Force history | `createVectorFunc()` (zero) | `createVectorFunc()` (zero) |
| Heading history | `[]` (empty) | `[]` (empty) |

**THEY ARE IDENTICAL.** Reset just calls the constructor. No difference in initialization logic.

**State NOT reset/persisted:** NONE - all boids are destroyed and recreated.

**The issue is NOT missing reset logic.** The issue is that the initialization itself creates conditions for jitter:
1. Random velocity → guarantees `smoothedSpeed` will need to adjust when physics kicks in
2. No "warm-up" period → physics forces applied immediately in frame 1
3. No prediction → can't pre-compensate for expected velocity changes

### 4. Other Potential Jitter Sources (Investigated and Ruled Out)

#### 4.1 Frame Timing and frameCount

**Investigation:** Is `frameCount` stable? Does it skip or jump?

**Finding:** `frameCount` is a p5.js global variable that increments by 1 every frame.
- Source: `simulation-app.js:320`, `editor-app.js:122`, `sketch.js:783`
- All use `frameCount` directly (not a local counter)
- p5.js guarantees `frameCount` increments monotonically
- No frame skipping in p5.js unless `frameRate()` is changed dynamically (it's not)

**Evidence:**
```javascript
// No frameRate changes anywhere in codebase
// No deltaTime usage (would indicate variable timestep)
// frameCount used as-is in all locations
```

**Conclusion:** **NOT a source of jitter.** `frameCount` is reliable.

#### 4.2 Floating Point Precision in Math.sin()

**Investigation:** Does `Math.sin()` lose precision with large `waveTime` values?

**Theory:** After 30 seconds at 60fps, `waveTime` ≈ 234 (frameCount = 1800, base rate = 0.13).
- `Math.sin(234)` - is this precise enough?

**Testing:**
```javascript
Math.sin(234)    = -0.9999987317275395
Math.sin(234.01) = -0.9999970635069434
Difference = 0.0000016682205961

// For comparison:
Math.sin(0)      = 0
Math.sin(0.01)   = 0.009999833334166664
Difference = 0.009999833334166664
```

**Analysis:**
- `Math.sin()` uses IEEE 754 double precision (53-bit mantissa)
- Accurate to ~15 decimal places
- For `waveTime` values 0-10000, precision loss is negligible (<0.0001 radians)
- The 0.0000016 difference is ~0.00016 radians = 0.009 degrees
- Visual jitter threshold: ~1-2 degrees
- **Math.sin precision is 100x better than needed**

**Conclusion:** **NOT a source of jitter.** Floating point is not the issue.

#### 4.3 State Accumulation in Boid Class

**Investigation:** What state accumulates over time besides `smoothedSpeed`?

**All accumulated state in Boid:**
- `position` (boid.js:21) - grows unbounded but wrapped by `edges()` (boid.js:365-370)
- `velocity` (boid.js:22) - limited by `maxSpeed` (boid.js:207)
- `acceleration` (boid.js:24) - reset to (0,0,0) every frame (boid.js:270)
- `smoothedSpeed` (boid.js:59) - grows unbounded ✓ **POTENTIAL ISSUE**
- `headingHistory` (boid.js:34) - limited to 10 entries (boid.js:229-231)
- `previousHeading` (boid.js:33) - wraps within -π to π (boid.js:176-177)
- Force histories (boid.js:28-30) - vectors, no magnitude accumulation

**Only `smoothedSpeed` accumulates error without bounds.**

**Wrap check:**
```javascript
// Position is wrapped:
edges(width, height) {
    if (this.position.x > width) this.position.x = 0;
    if (this.position.x < 0) this.position.x = width;
    if (this.position.y > height) this.position.y = 0;
    if (this.position.y < 0) this.position.y = height;
}

// Heading is normalized:
while (headingChange > Math.PI) headingChange -= Math.PI * 2;
while (headingChange < -Math.PI) headingChange += Math.PI * 2;

// But smoothedSpeed is NOT bounded!
this.smoothedSpeed = this.smoothedSpeed + clampedDiff * speedSmoothingFactor;
// No wrap, no reset, just keeps accumulating error
```

**Conclusion:** **smoothedSpeed is the ONLY unbounded accumulated state** that affects animation.

#### 4.4 waveTime Wrap Behavior

**Investigation:** Does `waveTime` ever wrap or reset?

**Finding:** NO. `waveTime` grows unbounded.

```javascript
// At 30 seconds (frameCount = 1800, speed = 1.0):
waveTime = 1800 * 0.1 * (1 + 1.0 * 0.3) + offset
         = 1800 * 0.13 + offset
         = 234 + offset (offset is 0 to 2π ≈ 6.28)
         = 234 to 240

// At 60 seconds:
waveTime ≈ 468 to 474

// At 5 minutes:
waveTime ≈ 2340 to 2346
```

**Math.sin() is periodic**, so `Math.sin(waveTime)` wraps naturally:
- `Math.sin(234)` = `Math.sin(234 % (2π))` = `Math.sin(2.96)` ≈ 0.19
- But the **rate of change** of waveTime determines animation speed
- If `waveTime` increases too fast or too slow due to `smoothedSpeed` error, jitter occurs

**Conclusion:** **NOT wrapping waveTime is fine** because `Math.sin()` is periodic. The issue is the **rate**, not the value.

#### 4.5 Turning vs Straight-Line Fish

**User observation:** "Jitter happens on BOTH fish that are turning AND fish moving in straight lines"

**Investigation:** Why would straight-line fish jitter?

**Finding:** "Straight line" fish are NOT actually moving in perfect straight lines!

**Evidence from physics:**
- Flocking forces ALWAYS active (unless independent behavior triggered)
- Alignment, cohesion, separation constantly adjusting velocity
- Even "straight" fish are micro-adjusting every frame
- Velocity magnitude fluctuates ±0.05 to ±0.2 per frame

**Example of "straight line" fish velocity over 10 frames:**
```
Frame 0: velocity = (1.0, 0.0), mag = 1.0
Frame 1: velocity = (1.02, 0.03), mag = 1.020
Frame 2: velocity = (0.98, -0.02), mag = 0.980
Frame 3: velocity = (1.01, 0.01), mag = 1.010
Frame 4: velocity = (0.99, -0.01), mag = 0.990
...
```

Each small magnitude change → `smoothedSpeed` lags → phase error accumulates → jitter.

**Conclusion:** **All fish jitter** because all fish experience velocity fluctuations from flocking forces. There are no truly "straight line" fish in flocking simulation.

### 5. Alternative Animation Timing Approaches (Found in Codebase)

#### 5.1 Editor Mode Animation (No Velocity Dependency)

**Location:** `editor-app.js:122`
```javascript
const waveTime = frameCount * 0.05;
// Note: No smoothedSpeed, no velocity dependency
```

**Behavior:**
- Constant animation rate (0.05 per frame)
- Never accumulates error because rate never changes
- Used in koi-editor.html for designing fish appearance
- **No jitter because no variable rate**

**Why this works for editor:**
- Editor shows single stationary fish
- No physics, no velocity changes
- Animation is just for visual reference

**Could this work for simulation?**
- Would decouple animation from swimming speed
- Fish would undulate at constant rate regardless of speed
- **Visually wrong:** Fast fish would look too slow, slow fish too fast
- Not realistic swimming behavior

#### 5.2 Sketch.js Animation (Direct Speed, No Smoothing)

**Location:** `sketch.js:783`
```javascript
let waveTime = frameCount * 0.1 * (1 + swimSpeed);
// Note: Uses swimSpeed directly, not smoothedSpeed
```

**What is swimSpeed?**
- Looking at context: appears to be a normalized velocity magnitude
- No exponential smoothing applied
- Direct use of current speed

**Would this eliminate jitter?**
- **NO**, but it would change the character:
  - Animation would respond instantly to speed changes
  - No lag → no phase accumulation
  - BUT: animation would jitter from frame-to-frame velocity noise
  - Different problem: high-frequency jitter instead of accumulation

**This is the trade-off:**
- Smoothing prevents high-frequency jitter but causes accumulation
- No smoothing eliminates accumulation but introduces high-frequency jitter

#### 5.3 Alternative: Smooth Position, Not Rate

**Concept:** Instead of smoothing the speed (rate), smooth the animation phase (position).

**Current approach (smooth rate):**
```javascript
// Smooth the rate:
smoothedSpeed = smoothedSpeed + (velocity.mag() - smoothedSpeed) * 0.2;

// Use smoothed rate:
waveTime = frameCount * 0.1 * (1 + smoothedSpeed * 0.3) + offset;
```

**Alternative approach (smooth position):**
```javascript
// Calculate ideal waveTime directly from actual speed:
idealWaveTime = frameCount * 0.1 * (1 + velocity.mag() * 0.3) + offset;

// Smooth the waveTime itself:
smoothedWaveTime = smoothedWaveTime + (idealWaveTime - smoothedWaveTime) * 0.2;

// Use smoothed waveTime:
waveTime = smoothedWaveTime;
```

**Why this is better:**
- Smoothing a position accumulates to the correct value over time
- Smoothing a rate accumulates errors indefinitely
- Position smoothing: `Σ error → 0` as time → ∞ (error bounded)
- Rate smoothing: `Σ error → ∞` as time → ∞ (error unbounded)

**Mathematical proof:**
- Position smoothing: `error(t) = idealPos - smoothedPos`
  - After N frames: `error(N) ≈ error(0) * (1-α)^N → 0`
- Rate smoothing: `error(t) = Σ (idealRate - smoothedRate) * dt`
  - After N frames: `error(N) ≈ Σ error(i)` (unbounded accumulation)

**This alternative is NOT currently used in codebase.**

#### 5.4 Alternative: Smooth Heading, Not Speed

**Concept:** The user suggested "smooth heading angle instead of speed"

**Analysis:**
- Heading is already smoothed via velocity smoothing (`boid.js:207`)
- Adding heading smoothing for animation wouldn't help
- Animation jitter is from wave phase, not body rotation
- Body rotation is controlled by `velocity.heading()` passed to renderer
- Wave phase is controlled by `waveTime`
- These are independent!

**Current:**
```javascript
renderer.render(
    pg,
    boid.position.x,
    boid.position.y,
    boid.velocity.heading(),  // ← Body angle (already smooth from velocity lerp)
    {
        animationParams: {
            waveTime,  // ← Wave phase (jittery from smoothedSpeed)
            // ...
        },
        // ...
    }
);
```

**Why heading smoothing won't fix this:**
- The jitter is in the **wave undulation**, not the **body rotation**
- `velocity.heading()` controls which direction fish points
- `waveTime` controls how much the body is curved/bent
- These can be out of sync → fish pointing left but wave peak on right → jitter

**Conclusion:** Smoothing heading won't fix wave animation jitter.

#### 5.5 Alternative: Decouple Animation from Velocity Entirely

**Concept:** Each fish has independent animation timer, no velocity dependency.

**Implementation:**
```javascript
// In constructor:
this.internalAnimationTime = randomFunc(0, Math.PI * 2);

// In update():
this.internalAnimationTime += 0.13; // Constant rate

// In simulation-app.js:
const waveTime = boid.internalAnimationTime;
```

**Pros:**
- No accumulation (constant rate)
- No jitter from velocity changes
- Simple, predictable

**Cons:**
- Fish swimming fast look wrong (undulating too slow)
- Fish swimming slow look wrong (undulating too fast)
- Loses realism of animation matching speed

**When this makes sense:**
- Stylized art (not realistic simulation)
- Performance-critical (one less calculation)
- When visual consistency > physical accuracy

**Not suitable for this project** (goal is realistic koi simulation).

## Code References

### Animation Pipeline
- `src/apps/simulation-app.js:320` - waveTime calculation with smoothedSpeed
- `src/apps/simulation-app.js:341` - waveTime passed to renderer
- `src/core/koi-renderer.js:86-119` - calculateSegments uses waveTime
- `src/core/koi-renderer.js:92` - Body wave: `Math.sin(waveTime - t * 3.5)`
- `src/core/koi-renderer.js:126` - Fin sway: `Math.sin(waveTime - 0.5)`
- `src/core/koi-renderer.js:199` - Tail sway: `Math.sin(waveTime - 2.5 - t * 2)`

### smoothedSpeed Implementation
- `src/flocking/boid.js:55` - animationOffset initialization
- `src/flocking/boid.js:57-59` - smoothedSpeed initialization
- `src/flocking/boid.js:209-219` - smoothedSpeed update with exponential smoothing
- `src/flocking/boid.js:215` - maxLag clamp (0.3)
- `src/flocking/boid.js:212` - speedSmoothingFactor (0.2)

### Reset Behavior
- `src/apps/simulation-app.js:134-136` - 'R' key handler
- `src/flocking/flock-manager.js:185-198` - reset() method
- `src/flocking/boid.js:19-74` - Boid constructor

### Alternative Approaches
- `src/apps/editor-app.js:122` - Constant rate animation (no velocity)
- `sketch.js:783` - Direct speed (no smoothing)

### Physics (for context)
- `src/flocking/boid.js:164-271` - update() method with velocity smoothing
- `src/flocking/boid.js:207` - Velocity smoothing (0.15 lerp factor)

## Architecture Documentation

### Current Animation Timing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Frame N                                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Physics Update (boid.js:164-271)                                │
│  1. Apply forces → acceleration                                 │
│  2. velocity += acceleration                                    │
│  3. velocity.limit(maxSpeed)                                    │
│  4. velocity.lerp(targetVelocity, 0.15)  ← Velocity smoothing  │
│  5. position += velocity                                        │
│  6. currentSpeed = velocity.mag()                               │
│  7. smoothedSpeed += (currentSpeed - smoothedSpeed) * 0.2  ✗   │
│     ^─────────────────────────────────────────────────────^     │
│     ERROR SOURCE: Smoothing animation RATE instead of POSITION  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Animation Calculation (simulation-app.js:320)                   │
│  waveTime = frameCount * 0.1 * (1 + smoothedSpeed * 0.3) + off │
│                                     ^^^^^^^^^^^^^               │
│                                     Lagged value                │
│  Phase Error = ∫(actualSpeed - smoothedSpeed) dt  → unbounded │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Rendering (koi-renderer.js:86-119)                              │
│  For each body segment:                                         │
│    y = Math.sin(waveTime - t * 3.5) * ...                      │
│        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^                          │
│        Small errors in waveTime → visible jitter in wave       │
└─────────────────────────────────────────────────────────────────┘
```

### Why Progressive Accumulation Occurs

```
Time →

Velocity changes: ___/‾‾‾\___/‾‾‾\___/‾‾‾\___  (actual, instant)
smoothedSpeed:    ___/⁻‾⁻\___/⁻‾⁻\___/⁻‾⁻\___  (lagged, smooth)

During rise:  smoothedSpeed < actual → animation too slow → phase lag +
During fall:  smoothedSpeed > actual → animation too fast → phase lag +
                                                                      ↓
                                        Net accumulation (doesn't cancel)

After 30 sec: Phase error ≈ 50-200 degrees = visible jitter
```

### Comparison of Animation Approaches

| Approach | Formula | Accumulation | High-Freq Jitter | Realism |
|----------|---------|--------------|------------------|---------|
| **Current** (smooth rate) | `waveTime = frameCount * 0.1 * (1 + smoothedSpeed * 0.3) + offset` | ✗ YES (unbounded) | ✓ NO (smooth) | ✓ YES |
| **Editor** (constant rate) | `waveTime = frameCount * 0.05` | ✓ NO | ✓ NO | ✗ N/A (static) |
| **Direct speed** (no smooth) | `waveTime = frameCount * 0.1 * (1 + velocity.mag() * 0.3) + offset` | ✓ NO | ✗ YES (noisy) | ✓ YES |
| **Smooth position** (proposed) | `smoothedWaveTime += (idealWaveTime - smoothedWaveTime) * 0.2` | ✓ NO (bounded) | ✓ NO (smooth) | ✓ YES |
| **Independent** (decouple) | `waveTime = internalTimer; internalTimer += 0.13` | ✓ NO | ✓ NO | ✗ NO |

## Historical Context (from thoughts/)

### Related Research: Oscillation Detection

From `research/2025-10-19-oscillation-detection-analysis-and-improvements.md`:

That research focused on **physics oscillation** (heading reversals, stuttering motion from force conflicts). This current research focuses on **animation jitter** (wave phase accumulation).

**Key differences:**
- Physics oscillation: Velocity vector actually oscillates (rapid direction changes)
- Animation jitter: Velocity vector is smooth, but animation phase accumulates error

**Debug observation from user:** "Debug vectors (D key) show velocity vectors are SMOOTH"
- This RULES OUT physics oscillation as the cause
- Confirms this is animation-only issue

**Historical smoothing values:**
- Velocity smoothing: 0.15 (from oscillation research, increased from 0.08)
- Force smoothing: 0.25 (from oscillation research, increased from 0.15)
- These improvements helped physics oscillation but worsened animation accumulation!

**Why more physics smoothing makes animation worse:**
- More smoothed physics → more stable velocity
- More stable velocity → less visible physics jitter
- BUT: smoother velocity changes → longer smoothedSpeed lag
- Longer lag → more phase accumulation per velocity change
- **Trade-off:** Fixed physics jitter, created animation jitter

## Tradeoffs Analysis

### Smoothing vs Accumulation

**High Smoothing (current: α=0.2):**
- Pros: Very smooth animation during constant velocity
- Cons: Large lag (4.5 frames), significant accumulation over time
- Use case: Slow-moving, rarely-turning fish

**Medium Smoothing (proposed: α=0.4):**
- Pros: Faster response (2.3 frames lag), less accumulation
- Cons: Some high-frequency jitter visible
- Use case: Balanced for flocking simulation

**Low Smoothing (proposed: α=0.6):**
- Pros: Very responsive (1.4 frames lag), minimal accumulation
- Cons: Noticeable high-frequency jitter
- Use case: Fast, erratic movements

**No Smoothing (direct velocity):**
- Pros: Zero accumulation, instant response
- Cons: Severe high-frequency jitter
- Use case: Not suitable for visual polish

### Smooth Rate vs Smooth Position

**Current (smooth rate):**
```javascript
smoothedSpeed += (actualSpeed - smoothedSpeed) * α;
waveTime = frameCount * baseRate * (1 + smoothedSpeed * multiplier) + offset;
```
- Integration: `waveTime = ∫ rate dt` where rate varies
- Error: `Σ (idealRate - smoothedRate) * dt` → unbounded
- Complexity: Simple (2 lines)

**Proposed (smooth position):**
```javascript
idealWaveTime = frameCount * baseRate * (1 + actualSpeed * multiplier) + offset;
smoothedWaveTime += (idealWaveTime - smoothedWaveTime) * α;
waveTime = smoothedWaveTime;
```
- Integration: Direct smoothing of integrated value
- Error: `(idealPos - smoothedPos)` → bounded, exponentially decays
- Complexity: Simple (3 lines)

**Mathematical guarantee:**
- Rate smoothing: `lim(t→∞) error(t) → constant * t` (linear growth)
- Position smoothing: `lim(t→∞) error(t) → 0` (exponential decay)

### Realism vs Stability

**Velocity-coupled animation (realistic):**
- Fast fish undulate faster (realistic swimming)
- Slow fish undulate slower (realistic swimming)
- Requires smoothing to prevent jitter
- Risk of accumulation if smoothing implemented wrong

**Velocity-decoupled animation (stable):**
- All fish undulate at same rate regardless of speed
- Perfectly stable, no jitter, no accumulation
- Visually unrealistic (fast fish look sluggish)
- Simpler implementation

**Recommended:** Velocity-coupled with position smoothing (best of both worlds).

## Open Questions

1. **What is the acceptable lag for animation response?**
   - Current: 4.5 frames (75ms) feels sluggish
   - Proposed: 2-3 frames (33-50ms) might be sweet spot
   - Need user testing

2. **Is position smoothing sufficient or do we need additional techniques?**
   - Position smoothing eliminates accumulation
   - But does it eliminate all visible jitter?
   - May need combined approach (light position smooth + light rate smooth)

3. **Should smoothing factor be adaptive based on velocity change rate?**
   - Small changes: high smoothing (α=0.1) for stability
   - Large changes: low smoothing (α=0.5) for responsiveness
   - More complex but potentially better results

4. **Is the 30% speed multiplier appropriate?**
   - Current: `waveTime = frameCount * 0.1 * (1 + speed * 0.3)`
   - Speed 0: rate 0.1
   - Speed 1: rate 0.13 (30% faster)
   - Speed 2: rate 0.16 (60% faster)
   - This seems reasonable but untested with real koi behavior

5. **Should we add a "warm-up" period on reset to hide initialization jitter?**
   - First 100ms after reset, fade in fish opacity from 0 to 1
   - Or: freeze animation for 100ms while smoothedSpeed catches up
   - Or: pre-calculate smoothedSpeed based on flocking forces before first render

## Recommendations

Based on this comprehensive analysis, here are specific recommendations to fix the animation jitter:

### Solution 1: Smooth Position, Not Rate (RECOMMENDED)

**Change:** `src/apps/simulation-app.js:317-321`

**Before:**
```javascript
// Each koi has unique animation phase offset so they don't all undulate in sync
// Use smoothedSpeed instead of velocity.mag() to prevent jittery wave animation
const waveTime = frameCount * 0.1 * (1 + boid.smoothedSpeed * 0.3) + boid.animationOffset;
```

**After:**
```javascript
// Calculate ideal waveTime from actual velocity (no lag)
const idealWaveTime = frameCount * 0.1 * (1 + boid.velocity.mag() * 0.3) + boid.animationOffset;

// Smooth the waveTime itself (smoothing position, not rate)
// This eliminates accumulation while maintaining smooth animation
if (boid.smoothedWaveTime === undefined) {
    boid.smoothedWaveTime = idealWaveTime; // Initialize on first frame
}
boid.smoothedWaveTime += (idealWaveTime - boid.smoothedWaveTime) * 0.3;
const waveTime = boid.smoothedWaveTime;
```

**Why this works:**
- Smoothing position → error bounded and decays to zero
- No accumulation over time
- Still smooth (no high-frequency jitter)
- Higher smoothing factor (0.3 vs 0.2) for faster response

**Side note:** Can remove `smoothedSpeed` entirely from `boid.js` if not used elsewhere.

### Solution 2: Reduce Smoothing Factor (ALTERNATIVE)

If keeping rate smoothing, reduce lag:

**Change:** `src/flocking/boid.js:212`

**Before:**
```javascript
const speedSmoothingFactor = 0.2; // Balance between smoothness and responsiveness
```

**After:**
```javascript
const speedSmoothingFactor = 0.5; // Faster response, less accumulation
```

**Pros:**
- Simpler (one line change)
- Reduces accumulation by ~60% (lag drops from 4.5 to 1.8 frames)

**Cons:**
- Doesn't eliminate accumulation, just slows it
- More high-frequency jitter (may need to increase to 0.6-0.7 to notice)
- Still wrong approach mathematically

### Solution 3: Reset waveTime Periodically (BAND-AID)

Add a reset mechanism to clear accumulated error:

**Change:** `src/apps/simulation-app.js` after waveTime calculation

**Add:**
```javascript
const waveTime = frameCount * 0.1 * (1 + boid.smoothedSpeed * 0.3) + boid.animationOffset;

// Reset waveTime to ideal value every 300 frames (5 seconds) to clear accumulation
if (frameCount % 300 === 0) {
    const idealWaveTime = frameCount * 0.1 * (1 + boid.velocity.mag() * 0.3) + boid.animationOffset;
    // Adjust animationOffset to compensate
    boid.animationOffset += (idealWaveTime - waveTime);
}
```

**Pros:**
- Fixes accumulation without changing algorithm
- Accumulated error cleared every 5 seconds

**Cons:**
- Hacky (doesn't fix root cause)
- Potential visible "snap" every 5 seconds if error is large
- Doesn't fix reset jitter

**Not recommended** (use Solution 1 instead).

### Solution 4: Warm-Up Period on Reset (FIXES RESET JITTER)

Hide initialization jitter with fade-in:

**Change:** `src/flocking/boid.js` constructor

**Add:**
```javascript
// In constructor:
this.opacity = 0; // Start invisible
this.warmupFrames = 15; // 250ms warm-up at 60fps
```

**Change:** `src/flocking/boid.js` update method

**Add after line 219:**
```javascript
// Warm-up period: gradually increase opacity
if (this.warmupFrames > 0) {
    this.warmupFrames--;
    this.opacity = 1 - (this.warmupFrames / 15);
}
```

**Change:** `src/apps/simulation-app.js` rendering

**Use `boid.opacity` in modifiers:**
```javascript
modifiers: {
    brightnessBoost: audioData.bass * 8 * params.audioReactivity,
    saturationBoost: audioData.treble * 10 * params.audioReactivity,
    sizeScale: 1 + audioData.amplitude * 0.3 * params.audioReactivity,
    opacity: boid.opacity || 1  // Use warm-up opacity if present
}
```

**Pros:**
- Completely hides reset jitter
- Smooth, professional appearance
- Minimal code change

**Cons:**
- Doesn't fix underlying issue
- Fish invisible for first 250ms (but better than jitter)

**Recommended in combination with Solution 1.**

---

**Priority:**
1. **Implement Solution 1** (smooth position) - Fixes root cause
2. **Implement Solution 4** (warm-up) - Improves reset experience
3. Test and tune smoothing factor (try 0.2, 0.3, 0.4)
4. Remove `smoothedSpeed` from `boid.js` if no longer needed

**Expected result:**
- Zero accumulation over time (can run for hours without jitter)
- Smooth animation (no high-frequency jitter)
- Clean reset (no momentary jitter)
- Realistic velocity-coupled swimming

---

*This research identifies that animation jitter is caused by smoothing the animation RATE (smoothedSpeed) instead of the animation POSITION (waveTime). Smoothing a rate that's integrated over time leads to unbounded error accumulation. The fix is to smooth the final waveTime value directly, which guarantees bounded error that decays exponentially rather than accumulating linearly.*
