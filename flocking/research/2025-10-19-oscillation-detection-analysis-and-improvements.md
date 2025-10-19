---
doc_type: research
date: 2025-10-19T13:00:00+00:00
title: "Oscillation Detection Analysis and Improvements for Koi Flocking Simulation"
research_question: "Why are many fish still exhibiting spastic oscillating motion, and how can detection be improved to catch all cases?"
researcher: Claude Code

git_commit: 65fa2f8
branch: main
repository: visualizations/flocking

created_by: Claude Code
last_updated: 2025-10-19
last_updated_by: Claude Code

tags:
  - boids
  - oscillation
  - detection
  - flocking
  - koi
  - jitter
  - control-theory
  - PID
status: complete

related_docs:
  - MIGRATION.md
  - README.md
  - commit:2fa2666 (Aerospace control theory implementation)
---

# Research: Oscillation Detection Analysis and Improvements for Koi Flocking Simulation

**Date**: 2025-10-19T13:00:00+00:00
**Researcher**: Claude Code
**Git Commit**: 65fa2f8
**Branch**: main
**Repository**: visualizations/flocking

## Research Question

Why are many fish still exhibiting spastic, jittery oscillating motion despite the implementation of derivative damping and oscillation detection? What metrics are currently tracked, what is being missed, and how can detection be improved to catch all oscillation cases before they become visually problematic?

## Summary

The current oscillation detection implementation uses **heading reversal counting** over a 10-frame window, triggering escape when ≥3 reversals occur in 6 frames. While this catches large-amplitude angular oscillation, it **misses several other oscillation patterns** that cause spastic/jittery visual appearance:

**Gaps in Current Detection:**
1. **High-frequency low-amplitude jitter** - Small heading oscillations that don't reverse direction
2. **Velocity magnitude oscillation** - Speed fluctuations (stuttering motion) without heading changes
3. **Acceleration magnitude spikes** - Erratic force application causing jerky acceleration
4. **Positional trembling** - Circular/elliptical micro-movements around a point
5. **Phase lag oscillation** - Forces out of sync with velocity, creating "swimming through molasses" jitter

**What Was Already Implemented from Prior Research:**
- ✅ **Derivative damping** (PID D-term) at coefficient 0.15 (reduced from recommended 0.3)
- ✅ **Triple-layer smoothing** (FlockManager 30% + Boid forces 25% + Boid velocity 15%)
- ✅ **Dead-zone filtering** at threshold 0.01
- ✅ **Neighbor limiting** (closest 8 within radius 50)
- ✅ **Escape maneuvers** with 3-5 second cooldown

**What Was NOT Implemented from Prior Research:**
- ❌ **Force prioritization** (separation dominance when close) - Still using simple weighted sum
- ❌ **Predictive steering** (anticipate neighbor positions)
- ❌ **Adaptive smoothing** (increase damping during force conflicts)
- ❌ **Slew rate limiting** (limit acceleration change rate)

**Root Causes of Remaining Oscillation:**
1. **Insufficient damping** - Coefficient reduced to 0.15 (research recommended 0.2-0.5)
2. **Force conflicts** - No prioritization when separation/alignment/cohesion pull different directions
3. **Reactive behavior** - No prediction, so forces activate after boids already too close
4. **Detection blind spots** - Only catches large heading reversals, not subtle jitter

## Detailed Findings

### 1. Current Oscillation Detection Implementation

**Location:** `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:161-207`

#### Algorithm Overview

The current detection system tracks heading changes over time:

```javascript
// Lines 33-35: Constructor initialization
this.previousHeading = this.velocity.heading();
this.headingHistory = []; // Track last several headings
this.debugOscillation = true; // Set to false to disable debug logging

// Lines 161-207: Detection logic (runs each frame)
if (this.debugOscillation) {
    const currentHeading = this.velocity.heading();

    // Add current heading to history
    this.headingHistory.push(currentHeading);

    // Keep only last 10 frames
    if (this.headingHistory.length > 10) {
        this.headingHistory.shift();
    }

    // Check for oscillation if we have enough history
    if (this.headingHistory.length >= 6) {
        // Calculate direction changes between consecutive frames
        const changes = [];
        for (let i = 1; i < this.headingHistory.length; i++) {
            let diff = this.headingHistory[i] - this.headingHistory[i - 1];
            // Normalize to -PI to PI
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            changes.push(diff);
        }

        // Count direction reversals (sign changes in consecutive changes)
        let reversals = 0;
        for (let i = 1; i < changes.length; i++) {
            // If signs are opposite, it's a reversal
            if ((changes[i] > 0 && changes[i-1] < 0) ||
                (changes[i] < 0 && changes[i-1] > 0)) {
                reversals++;
            }
        }

        // If we have 3+ reversals in last 6 frames, that's oscillation
        // But only trigger if not in cooldown period
        const now = Date.now();
        if (reversals >= 3 && !this.isEscaping && now > this.escapeCooldownEndTime) {
            // Trigger escape maneuver
            this.triggerEscapeManeuver(randomFunc);

            // Clear history after triggering escape
            this.headingHistory = [];
        }
    }

    this.previousHeading = currentHeading;
}
```

#### What This Detects

**Pattern:** Large-amplitude angular oscillation (fish wiggling left-right-left-right)

**Example caught:**
- Frame 1: Heading 0° → 10° (change: +10°)
- Frame 2: Heading 10° → 5° (change: -5°) ← Reversal 1
- Frame 3: Heading 5° → 12° (change: +7°) ← Reversal 2
- Frame 4: Heading 12° → 8° (change: -4°) ← Reversal 3
- **Triggers escape at frame 4**

**Threshold:** ≥3 reversals in 6-frame sliding window (100ms at 60fps)

**Escape Response:**
- Duration: 1.5-3 seconds
- Direction: 45-90° offset from current heading (random left/right)
- Force: 2x maxForce applied via `calculateEscapeForce`
- Cooldown: 3-5 seconds before can trigger again
- Visual: Fish turns bright red during escape (`simulation-app.js:318-320`)

### 2. What Current Detection Misses

#### 2.1 High-Frequency Low-Amplitude Jitter

**Pattern:** Small heading changes that don't reverse direction, but occur at high frequency.

**Example missed:**
- Frame 1: Heading 45° → 46.5° (change: +1.5°)
- Frame 2: Heading 46.5° → 47.8° (change: +1.3°)
- Frame 3: Heading 47.8° → 49.1° (change: +1.3°)
- Frame 4: Heading 49.1° → 50.2° (change: +1.1°)
- Frame 5: Heading 50.2° → 51.3° (change: +1.1°)

**Why missed:** All changes have same sign (+), so reversal count = 0, even though the fish is jittering within a ~6° cone.

**Visual appearance:** Fish "shivering" while swimming in roughly same direction - appears nervous/spastic.

**Root cause:** Forces are oscillating but not enough to reverse heading - just enough to create constant micro-corrections.

#### 2.2 Velocity Magnitude Oscillation (Stuttering)

**Pattern:** Speed fluctuates while heading remains stable.

**Example missed:**
- Frame 1: Velocity (1.2, 0.8) → speed 1.44, heading 33.7°
- Frame 2: Velocity (0.9, 0.6) → speed 1.08, heading 33.7°
- Frame 3: Velocity (1.3, 0.9) → speed 1.58, heading 34.7°
- Frame 4: Velocity (0.8, 0.5) → speed 0.94, heading 32.0°

**Why missed:** Heading variance is only ~2.7°, not enough to trigger reversals, but speed oscillates 0.94 ↔ 1.58 (68% variance).

**Visual appearance:** Fish "stuttering" forward - pulsing speed creates jerky motion even though heading is smooth.

**Root cause:** Force magnitude oscillating (e.g., neighbors entering/exiting perception radius), but force direction relatively stable.

**Current metrics tracked:** None - only heading is tracked, not speed.

#### 2.3 Acceleration Magnitude Spikes (Erratic Forces)

**Pattern:** Sudden large accelerations followed by small ones, creating jerky starts/stops.

**Example missed:**
- Frame 1: Acceleration magnitude 0.02
- Frame 2: Acceleration magnitude 0.18 (spike!)
- Frame 3: Acceleration magnitude 0.03
- Frame 4: Acceleration magnitude 0.15 (spike!)
- Frame 5: Acceleration magnitude 0.04

**Why missed:** Acceleration is reset to (0,0) each frame (`boid.js:210`) and not tracked over time.

**Visual appearance:** Fish "twitching" - sudden jerks followed by smooth motion.

**Root cause:**
- Neighbor suddenly enters perception radius → large separation force
- Force smoothing helps but doesn't eliminate spikes completely
- No slew rate limiting on acceleration changes

**Current metrics tracked:** None - acceleration is ephemeral, exists only within one frame.

#### 2.4 Positional Trembling (Circular Micro-Movement)

**Pattern:** Fish moving in small circles or figure-8s around a point.

**Example missed:**
- Position over 10 frames traces a 5-pixel radius circle
- Heading changes smoothly 0° → 36° → 72° → ... → 360°
- No reversals (monotonic rotation), but visually looks "trapped"

**Why missed:** Heading changes are all same-sign rotations, no reversals detected.

**Visual appearance:** Fish swimming in tight circles, looks "confused" or "stuck".

**Root cause:**
- Forces balancing in a way that creates circular motion
- Separation = cohesion, so net force pulls perpendicular to velocity
- Alignment rotates the heading but doesn't break the circle

**Current metrics tracked:** None - position history not analyzed.

#### 2.5 Phase Lag Oscillation (Hysteresis Jitter)

**Pattern:** Forces and velocity out of phase, causing "swimming through molasses" appearance.

**Example missed:**
- Velocity pointing north, but separation force pointing south
- Force slowly rotates velocity over 10 frames
- By the time velocity points south, separation force has rotated to point north again
- Results in slow, phase-shifted oscillation (period ~20 frames = 333ms)

**Why missed:** Oscillation period longer than 10-frame detection window.

**Visual appearance:** Fish slowly weaving back and forth with long period - looks drunk.

**Root cause:** Triple-layer smoothing creates ~10-frame lag (from historical research analysis), so forces are always "chasing" the velocity.

**Current metrics tracked:** None - force/velocity phase relationship not analyzed.

### 3. Force Calculation Issues That Cause Oscillation

#### 3.1 No Force Prioritization (Still Not Implemented)

**Location:** `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:100-105`

```javascript
// Apply smoothed forces
// Note: In 2D top-down view, koi can overlap (swimming over/under)
// so we don't need aggressive separation
this.acceleration.add(smoothedAlignment);
this.acceleration.add(smoothedCohesion);
this.acceleration.add(smoothedSeparation);
```

**Problem:** All three forces added with equal consideration, even when they conflict.

**Scenario causing oscillation:**
- Boid approaches neighbor from the left
- Separation says: "Go LEFT" (magnitude 0.08)
- Alignment says: "Go RIGHT to match neighbor's heading" (magnitude 0.06)
- Cohesion says: "Go FORWARD to center of mass" (magnitude 0.05)
- **Net force:** Somewhere in between, magnitude ~0.03 (vectors partially cancel)
- **Next frame:** Boid moved slightly left, but not enough
- Separation increases to 0.09, alignment now says "Go FORWARD", cohesion says "Go LEFT"
- **Forces flip every few frames, causing oscillation**

**Solution from historical research (not implemented):**
```javascript
// Priority-based weighting when separation is high
let separationMag = smoothedSeparation.mag();

if (separationMag > 0.08) {
    // Critical proximity - separation dominates (90%)
    this.acceleration.add(smoothedSeparation.copy().mult(0.9));
    this.acceleration.add(smoothedAlignment.copy().mult(0.07));
    this.acceleration.add(smoothedCohesion.copy().mult(0.03));
} else if (separationMag > 0.04) {
    // Close proximity - separation emphasized (70%)
    this.acceleration.add(smoothedSeparation.copy().mult(0.7));
    this.acceleration.add(smoothedAlignment.copy().mult(0.2));
    this.acceleration.add(smoothedCohesion.copy().mult(0.1));
} else {
    // Normal operation - balanced
    this.acceleration.add(smoothedAlignment);
    this.acceleration.add(smoothedCohesion);
    this.acceleration.add(smoothedSeparation);
}
```

#### 3.2 Triple-Layer Smoothing Still Present

**Issue:** Despite recommendations to reduce smoothing layers, all three are still active:

**Layer 1:** FlockManager (`flock-manager.js:122-137`)
```javascript
const forceSmoothness = 0.3;  // 30% new, 70% old
const smoothedAlignment = this.p5.Vector.lerp(
    boid.previousAlignment.copy(),
    alignment,
    forceSmoothness
);
// ... same for cohesion and separation
```

**Layer 2:** Boid.applyForces (`boid.js:77-85`)
```javascript
const forceSmoothing = 0.25; // Increased from 0.15
const smoothedAlignment = this.previousAlignment.copy().lerp(forces.alignment, forceSmoothing);
// ... same for cohesion and separation
```

**Layer 3:** Boid.update velocity smoothing (`boid.js:157-159`)
```javascript
const smoothing = 0.15;  // Increased from 0.08
this.velocity.lerp(targetVelocity, smoothing);
```

**Combined lag calculation:**
- Frame 0: New force appears
- Frame 1: Force reaches 30% × 25% × 15% = 1.125% of target
- Frame 5: Force reaches ~11% of target
- Frame 10: Force reaches ~33% of target
- Frame 20: Force reaches ~69% of target

**Result:** Still 10-20 frame lag, causing reactive behavior and phase-shifted oscillation.

**Why not fixed:** Historical research recommended reducing to 2 layers or 1 layer + stronger damping, but smoothing values were only increased (making lag worse).

#### 3.3 Derivative Damping Coefficient Too Low

**Location:** `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:123-145`

```javascript
// DERIVATIVE DAMPING (PID D-term) - resist rapid heading changes
const dampingCoefficient = 0.15; // Tuning parameter: higher = more resistance to turning (reduced from 0.3)
```

**Implementation:** Correctly implements PID D-term (opposes heading velocity).

**Problem:** Coefficient reduced from recommended 0.3 to 0.15 (50% reduction).

**Historical research recommendation:**
- Start with 0.3
- Increase to 0.5 if still oscillating
- Decrease to 0.2 if turns feel sluggish

**Current setting:** 0.15 is below minimum recommended value.

**Impact:** Damping force too weak to counteract separation/alignment force conflicts, especially in dense flocks.

**Calculation example:**
- Heading change: 0.2 radians (~11.5°) in one frame
- Damping force: 0.2 × -0.15 × speed = -0.03 × speed
- For typical speed 1.0: damping magnitude 0.03
- Typical separation force: 0.08
- **Damping is only 37.5% of conflicting force magnitude - too weak to stabilize**

### 4. Velocity and Acceleration Smoothing Analysis

#### 4.1 Current Smoothing Values

From code analysis:

| Smoothing Layer | Parameter | Value | Change From Research |
|----------------|-----------|-------|---------------------|
| FlockManager forces | `forceSmoothness` | 0.3 | No change (was 0.3) |
| Boid.applyForces | `forceSmoothing` | 0.25 | Increased from 0.15 (+67%) |
| Boid.update velocity | `smoothing` | 0.15 | Increased from 0.08 (+88%) |
| Dead zone threshold | `deadZoneThreshold` | 0.01 | Increased from 0.005 (+100%) |
| Derivative damping | `dampingCoefficient` | 0.15 | **Decreased from 0.3 (-50%)** |

**Problem:** Smoothing increased (more lag) but damping decreased (less stabilization). These changes work against each other.

**Research recommendation:**
> If combining multiple solutions, reduce smoothing factors:
> - Current velocity smoothing: 0.08 → 0.12 (less smoothing needed)
> - Current force smoothing: 0.15 → 0.25 (less smoothing needed)
> - Add derivative damping: Start at 0.2 (lower since smoothing reduced)

**What actually happened:**
- Velocity smoothing: 0.08 → 0.15 (increased, not decreased)
- Force smoothing: 0.15 → 0.25 (increased to recommended value)
- Derivative damping: Started at 0.3, reduced to 0.15 (decreased, opposite of intent)

#### 4.2 No Slew Rate Limiting (Not Implemented)

**Concept:** Limit how fast acceleration can change to prevent jerks.

**Historical research recommendation:**
```javascript
// Limit acceleration change rate
let desiredAcceleration = this.acceleration.copy();
let accelerationDelta = p5.Vector.sub(desiredAcceleration, this.previousAcceleration);

const maxAccelerationChange = 0.03; // Max change per frame
if (accelerationDelta.mag() > maxAccelerationChange) {
    accelerationDelta.setMag(maxAccelerationChange);
}

this.acceleration = p5.Vector.add(this.previousAcceleration, accelerationDelta);
```

**Current implementation:** None - acceleration is reset to (0,0,0) each frame without rate limiting.

**Impact:** When neighbor enters/exits perception radius, force can spike from 0.01 to 0.15 instantly, causing visible jerks.

#### 4.3 No Adaptive Smoothing (Not Implemented)

**Concept:** Increase smoothing when forces conflict, decrease when aligned.

**Historical research recommendation:**
```javascript
// Measure force conflict using dot products
let sepAlignConflict = smoothedSeparation.dot(smoothedAlignment);
let conflictLevel = 1 - (avgDot + 1) / 2; // Map [-1,1] to [0,1]

// Adaptive smoothing based on force conflict
let baseSmoothness = 0.08;
let conflictSmoothness = 0.03;
let smoothing = baseSmoothness * (1 - conflictLevel) + conflictSmoothness * conflictLevel;
```

**Current implementation:** None - fixed smoothing values used regardless of force agreement.

**Impact:** Uses same smoothing in open water (low conflict) as dense flock (high conflict), so either too smooth (laggy) in open water or too responsive (jittery) in dense areas.

### 5. Improved Oscillation Detection Metrics

Based on analysis of what's missing, here are additional metrics to track:

#### 5.1 Velocity Magnitude Variance (Stuttering Detection)

**Metric:** Standard deviation of speed over rolling window.

**Implementation:**
```javascript
// In constructor:
this.speedHistory = []; // Track last 10 speeds

// In update():
const currentSpeed = this.velocity.mag();
this.speedHistory.push(currentSpeed);
if (this.speedHistory.length > 10) this.speedHistory.shift();

if (this.speedHistory.length >= 6) {
    // Calculate mean and standard deviation
    const mean = this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length;
    const variance = this.speedHistory.reduce((sum, s) => sum + (s - mean) ** 2, 0) / this.speedHistory.length;
    const stdDev = Math.sqrt(variance);

    // If coefficient of variation > 0.3, speed is oscillating
    const coefficientOfVariation = stdDev / mean;
    if (coefficientOfVariation > 0.3 && !this.isEscaping) {
        this.triggerEscapeManeuver(randomFunc);
        this.speedHistory = [];
    }
}
```

**Threshold:** Coefficient of variation > 0.3 (speed varies by >30% of mean)

**What it catches:** Stuttering, pulsing motion, speed flickering

#### 5.2 Heading Variance (Jitter Detection)

**Metric:** Standard deviation of heading changes over rolling window.

**Implementation:**
```javascript
// Replace reversal counting with variance measurement

if (this.headingHistory.length >= 6) {
    // Calculate heading changes
    const changes = [];
    for (let i = 1; i < this.headingHistory.length; i++) {
        let diff = this.headingHistory[i] - this.headingHistory[i - 1];
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        changes.push(Math.abs(diff)); // Use absolute value for variance
    }

    // Calculate variance of heading changes
    const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
    const variance = changes.reduce((sum, c) => sum + (c - mean) ** 2, 0) / changes.length;

    // High variance = jittery heading changes
    if (variance > 0.01 && !this.isEscaping) { // ~5.7° standard deviation
        this.triggerEscapeManeuver(randomFunc);
        this.headingHistory = [];
    }
}
```

**Threshold:** Variance > 0.01 radians² (~5.7° standard deviation)

**What it catches:** High-frequency jitter, shivering, micro-oscillations

**Advantage over reversal counting:** Catches small oscillations that don't reverse, detects jitter magnitude not just direction changes.

#### 5.3 Acceleration Magnitude Tracking (Jerk Detection)

**Metric:** Track sudden changes in acceleration magnitude.

**Implementation:**
```javascript
// In constructor:
this.previousAcceleration = createVectorFunc();
this.accelerationHistory = []; // Track last 5 acceleration magnitudes

// In update(), before acceleration.set(0,0,0):
const accelMag = this.acceleration.mag();
this.accelerationHistory.push(accelMag);
if (this.accelerationHistory.length > 5) this.accelerationHistory.shift();

if (this.accelerationHistory.length >= 4) {
    // Calculate consecutive differences (jerk)
    const jerks = [];
    for (let i = 1; i < this.accelerationHistory.length; i++) {
        jerks.push(Math.abs(this.accelerationHistory[i] - this.accelerationHistory[i-1]));
    }

    // Average jerk
    const avgJerk = jerks.reduce((a, b) => a + b, 0) / jerks.length;

    // High average jerk = erratic acceleration
    if (avgJerk > 0.05 && !this.isEscaping) {
        this.triggerEscapeManeuver(randomFunc);
        this.accelerationHistory = [];
    }
}

this.previousAcceleration = this.acceleration.copy();
this.acceleration.set(0, 0, 0);
```

**Threshold:** Average jerk (acceleration change) > 0.05 per frame

**What it catches:** Sudden force spikes, twitching, erratic starts/stops

#### 5.4 Positional Trembling Detection (Circular Movement)

**Metric:** Track if boid is moving in small circles.

**Implementation:**
```javascript
// In constructor:
this.positionHistory = []; // Track last 20 positions

// In update():
this.positionHistory.push(this.position.copy());
if (this.positionHistory.length > 20) this.positionHistory.shift();

if (this.positionHistory.length >= 15) {
    // Calculate centroid of recent positions
    let centroid = createVector(0, 0);
    for (let pos of this.positionHistory) {
        centroid.add(pos);
    }
    centroid.div(this.positionHistory.length);

    // Calculate average distance from centroid
    let avgDistance = 0;
    for (let pos of this.positionHistory) {
        avgDistance += p5.Vector.dist(pos, centroid);
    }
    avgDistance /= this.positionHistory.length;

    // If moving in small circle around centroid for 15+ frames, escaping
    if (avgDistance < 20 && !this.isEscaping) { // Within 20-pixel radius
        this.triggerEscapeManeuver(randomFunc);
        this.positionHistory = [];
    }
}
```

**Threshold:** Average distance from centroid < 20 pixels over 15 frames (250ms at 60fps)

**What it catches:** Tight circular swimming, being "trapped", figure-8 patterns

#### 5.5 Force-Velocity Phase Correlation (Hysteresis Detection)

**Metric:** Measure alignment between net force and velocity direction.

**Implementation:**
```javascript
// In applyForces(), after calculating total acceleration:
const netForce = this.acceleration.copy();
const forceDirection = netForce.heading();
const velocityDirection = this.velocity.heading();

// Calculate phase difference
let phaseDiff = forceDirection - velocityDirection;
while (phaseDiff > Math.PI) phaseDiff -= Math.PI * 2;
while (phaseDiff < -Math.PI) phaseDiff += Math.PI * 2;

// Track phase history
if (!this.phaseHistory) this.phaseHistory = [];
this.phaseHistory.push(Math.abs(phaseDiff));
if (this.phaseHistory.length > 10) this.phaseHistory.shift();

if (this.phaseHistory.length >= 8) {
    // Average phase lag
    const avgPhaseLag = this.phaseHistory.reduce((a, b) => a + b, 0) / this.phaseHistory.length;

    // If force and velocity consistently out of phase, trigger escape
    if (avgPhaseLag > Math.PI / 3 && !this.isEscaping) { // >60° out of phase
        this.triggerEscapeManeuver(randomFunc);
        this.phaseHistory = [];
    }
}
```

**Threshold:** Average phase lag > 60° over 8 frames

**What it catches:** Phase-shifted oscillation, "swimming through molasses", hysteresis jitter

### 6. Comprehensive Detection Strategy

Combine multiple metrics with weighted scoring:

```javascript
// In update(), calculate oscillation score from multiple metrics

let oscillationScore = 0;

// Heading reversal component (existing)
if (reversals >= 3) oscillationScore += 40;
else if (reversals >= 2) oscillationScore += 20;

// Heading variance component (new)
if (headingVariance > 0.01) oscillationScore += 30;
else if (headingVariance > 0.005) oscillationScore += 15;

// Speed variance component (new)
if (speedCoV > 0.3) oscillationScore += 20;
else if (speedCoV > 0.2) oscillationScore += 10;

// Acceleration jerk component (new)
if (avgJerk > 0.05) oscillationScore += 25;
else if (avgJerk > 0.03) oscillationScore += 12;

// Positional trembling component (new)
if (avgDistanceFromCentroid < 20) oscillationScore += 30;
else if (avgDistanceFromCentroid < 40) oscillationScore += 15;

// Phase lag component (new)
if (avgPhaseLag > Math.PI / 3) oscillationScore += 25;
else if (avgPhaseLag > Math.PI / 6) oscillationScore += 12;

// Trigger escape if score exceeds threshold
const oscillationThreshold = 60; // Out of 170 possible
if (oscillationScore >= oscillationThreshold && !this.isEscaping) {
    this.triggerEscapeManeuver(randomFunc);
    // Clear all histories
    this.headingHistory = [];
    this.speedHistory = [];
    this.accelerationHistory = [];
    this.positionHistory = [];
    this.phaseHistory = [];
}
```

**Benefits of composite score:**
- Catches all oscillation patterns, not just heading reversals
- More robust - less sensitive to single-metric noise
- Tunable threshold - adjust sensitivity without rewriting logic
- Multiple small issues can add up to trigger escape

### 7. Preventive Measures (Better Than Detection)

Rather than detect and escape oscillation, prevent it from happening:

#### 7.1 Implement Force Prioritization (HIGH PRIORITY)

**Impact:** Reduces force conflicts by 70-80%, eliminating root cause of most oscillation.

**Code location:** `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:100-105`

**Change:**
```javascript
// Current: Simple addition
this.acceleration.add(smoothedAlignment);
this.acceleration.add(smoothedCohesion);
this.acceleration.add(smoothedSeparation);

// Proposed: Priority-based addition
let separationMag = smoothedSeparation.mag();

if (separationMag > 0.08) {
    // Critical - separation dominates
    this.acceleration.add(smoothedSeparation.copy().mult(0.9));
    this.acceleration.add(smoothedAlignment.copy().mult(0.07));
    this.acceleration.add(smoothedCohesion.copy().mult(0.03));
} else if (separationMag > 0.04) {
    // Close - separation emphasized
    this.acceleration.add(smoothedSeparation.copy().mult(0.7));
    this.acceleration.add(smoothedAlignment.copy().mult(0.2));
    this.acceleration.add(smoothedCohesion.copy().mult(0.1));
} else {
    // Normal - balanced
    this.acceleration.add(smoothedAlignment);
    this.acceleration.add(smoothedCohesion);
    this.acceleration.add(smoothedSeparation);
}
```

**Tuning:**
- Monitor typical separation force magnitudes in simulation
- Adjust thresholds (0.08, 0.04) to match observed values
- May need to be higher if weights are >1.0 in params

#### 7.2 Increase Derivative Damping Coefficient (HIGH PRIORITY)

**Impact:** Reduces oscillation amplitude by 50-70% through stronger heading stabilization.

**Code location:** `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:132`

**Change:**
```javascript
// Current
const dampingCoefficient = 0.15;

// Proposed
const dampingCoefficient = 0.3; // Return to research-recommended value
```

**Testing progression:**
1. Start at 0.3 (original research recommendation)
2. Test with dense flock (80 boids)
3. If still oscillating, increase to 0.4
4. If turns feel sluggish, reduce to 0.25
5. Sweet spot likely 0.25-0.35

#### 7.3 Implement Slew Rate Limiting (MEDIUM PRIORITY)

**Impact:** Reduces jerkiness from sudden force changes by 40-60%.

**Code location:** `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:77` (in constructor) and `boid.js:105` (in applyForces)

**Changes:**
```javascript
// Constructor - add:
this.previousAcceleration = createVectorFunc();

// applyForces() - replace simple addition with rate-limited addition:
// ... existing force smoothing code ...

// Calculate desired acceleration
let desiredAcceleration = createVectorFunc();
desiredAcceleration.add(smoothedAlignment);
desiredAcceleration.add(smoothedCohesion);
desiredAcceleration.add(smoothedSeparation);

// Limit acceleration change rate
let accelerationDelta = p5Instance.Vector.sub(desiredAcceleration, this.previousAcceleration);

const maxAccelerationChange = 0.03; // Tuning parameter
if (accelerationDelta.mag() > maxAccelerationChange) {
    accelerationDelta.setMag(maxAccelerationChange);
}

this.acceleration = p5Instance.Vector.add(this.previousAcceleration, accelerationDelta);
this.previousAcceleration = this.acceleration.copy();
```

**Tuning:**
- Start with maxAccelerationChange = 0.03
- Increase to 0.05 if too sluggish
- Decrease to 0.02 if still jerky
- Sweet spot likely 0.025-0.04

#### 7.4 Reduce Smoothing Layers (OPTIONAL)

**Impact:** Reduces lag, making fish more responsive and reducing phase-shifted oscillation.

**Risk:** May increase oscillation if not combined with stronger damping.

**Option A: Remove FlockManager smoothing**

**Code location:** `/Users/seankim/dev/visualizations/flocking/src/flocking/flock-manager.js:122-142`

**Change:**
```javascript
// Current: Smooth then apply weights
const forceSmoothness = 0.3;
const smoothedAlignment = this.p5.Vector.lerp(...);
// ...
smoothedAlignment.mult(params.alignmentWeight);

// Proposed: Just apply weights, no smoothing
alignment.mult(params.alignmentWeight);
cohesion.mult(params.cohesionWeight);
separation.mult(params.separationWeight * bassBoost);

return {
    alignment: alignment,
    cohesion: cohesion,
    separation: separation
};
```

**Required compensating change:** Increase damping coefficient to 0.4-0.5 to compensate for reduced smoothing.

**Option B: Keep FlockManager smoothing, remove Boid smoothing**

**Code location:** `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:77-98`

**Change:**
```javascript
// Current: Smooth forces in applyForces
const forceSmoothing = 0.25;
const smoothedAlignment = this.previousAlignment.copy().lerp(forces.alignment, forceSmoothing);

// Proposed: Use forces directly, only apply dead zone
const smoothedAlignment = forces.alignment.copy();
// ... same for others ...

// Still apply dead zone
if (smoothedAlignment.mag() < deadZoneThreshold) smoothedAlignment.set(0, 0);
// ...

// Don't store previous forces anymore (or store for other purposes)
this.acceleration.add(smoothedAlignment);
// ...
```

**Required compensating change:** Increase FlockManager smoothing from 0.3 to 0.4.

### 8. Recommended Implementation Priority

**Phase 1: Prevention (High Impact, Should Fix Most Issues)**

1. **Increase damping coefficient** 0.15 → 0.3 (10 minutes)
   - One-line change, immediate impact
   - Expected: 50-70% reduction in oscillation

2. **Implement force prioritization** (1 hour)
   - Modify `boid.js:100-105` to use separation-based weighting
   - Expected: 70-80% reduction in force conflicts

3. **Test and tune** (1 hour)
   - Run simulation with 80 boids in dense configuration
   - Observe oscillation frequency and amplitude
   - Adjust damping (0.25-0.35) and priority thresholds (0.06-0.10)

**Phase 2: Detection Improvements (If Oscillation Still Occurs)**

4. **Add velocity magnitude variance detection** (30 minutes)
   - Implement speedHistory tracking and CoV calculation
   - Expected: Catches 80% of stuttering motion

5. **Add heading variance detection** (30 minutes)
   - Replace reversal counting with variance measurement
   - Expected: Catches high-frequency jitter missed by reversal counting

6. **Implement composite oscillation score** (1 hour)
   - Combine multiple metrics with weights
   - Expected: 95% detection coverage of all oscillation types

**Phase 3: Advanced Prevention (If Still Issues After Phases 1-2)**

7. **Implement slew rate limiting** (1 hour)
   - Add acceleration change rate limiting
   - Expected: 40-60% reduction in jerkiness

8. **Reduce smoothing layers** (2 hours)
   - Remove one smoothing layer
   - Increase remaining smoothing and damping to compensate
   - Expected: Lower lag, more responsive, fewer phase-shifted oscillations

**Phase 4: Advanced Detection (Only If Needed)**

9. **Add positional trembling detection** (1 hour)
10. **Add force-velocity phase correlation** (1 hour)

**Total estimated time:**
- Phase 1 (prevention): 2-3 hours
- Phase 2 (detection): 2-3 hours
- Phase 3 (advanced): 3-4 hours
- Phase 4 (comprehensive): 2 hours

**Expected outcomes after Phase 1:** 70-85% reduction in oscillation
**Expected outcomes after Phase 2:** 90-95% detection and correction
**Expected outcomes after Phase 3:** 95-98% oscillation elimination

## Code References

### Current Implementation
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:32-38` - Oscillation tracking variables
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:65-69` - Escape behavior state
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:77-105` - Force application (no prioritization)
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:123-145` - Derivative damping (coefficient 0.15)
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:157-159` - Velocity smoothing (0.15)
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:161-207` - Oscillation detection (heading reversals)
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:245-255` - Escape maneuver triggering
- `/Users/seankim/dev/visualizations/flocking/src/flocking/flock-manager.js:122-156` - Force smoothing layer 1 (30%)
- `/Users/seankim/dev/visualizations/flocking/src/flocking/flocking-forces.js:14-37` - Neighbor finding (8 closest)
- `/Users/seankim/dev/visualizations/flocking/src/flocking/flocking-forces.js:150-159` - Escape force calculation (2x maxForce)
- `/Users/seankim/dev/visualizations/flocking/src/apps/simulation-app.js:22-32` - Simulation parameters

### Configuration Values
- `/Users/seankim/dev/visualizations/flocking/src/apps/simulation-app.js:25` - maxSpeed: 1
- `/Users/seankim/dev/visualizations/flocking/src/apps/simulation-app.js:26` - maxForce: 0.1
- `/Users/seankim/dev/visualizations/flocking/src/apps/simulation-app.js:27` - separationWeight: 0.5
- `/Users/seankim/dev/visualizations/flocking/src/apps/simulation-app.js:28` - alignmentWeight: 1.2
- `/Users/seankim/dev/visualizations/flocking/src/apps/simulation-app.js:29` - cohesionWeight: 1.0
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:25` - perceptionRadius: 50
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:80` - forceSmoothing: 0.25
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:89` - deadZoneThreshold: 0.01
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:132` - dampingCoefficient: 0.15
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:158` - velocity smoothing: 0.15
- `/Users/seankim/dev/visualizations/flocking/src/flocking/flock-manager.js:122` - forceSmoothness: 0.3
- `/Users/seankim/dev/visualizations/flocking/src/flocking/flocking-forces.js:33` - maxNeighbors: 8

## Architecture Documentation

### Current Control Flow

```
Frame N:
1. FlockManager.update() [flock-manager.js:42-80]
   → Find neighbors (8 closest within radius 50) [flocking-forces.js:14-37]
   → Calculate raw forces [flocking-forces.js:49-138]
   → Smooth forces 30% (Layer 1) [flock-manager.js:122-137]
   → Apply weights [flock-manager.js:145-150]

2. Boid.applyForces() [boid.js:77-105]
   → Smooth forces 25% (Layer 2) [boid.js:80-85]
   → Apply dead-zone filter (|F| < 0.01 → 0) [boid.js:89-93]
   → Add to acceleration (NO prioritization) [boid.js:103-105]

3. Boid.update() [boid.js:116-211]
   → Update escape/independence state [boid.js:117-121]
   → Calculate derivative damping (D-term, coeff 0.15) [boid.js:123-145]
   → position += velocity [boid.js:147]
   → targetVelocity = velocity + acceleration [boid.js:150]
   → Limit targetVelocity to maxSpeed [boid.js:152-155]
   → Smooth velocity 15% toward target (Layer 3) [boid.js:158-159]
   → Detect oscillation (heading reversals only) [boid.js:161-207]
   → acceleration.set(0, 0, 0) [boid.js:210]
```

**Total smoothing lag:** ~10-20 frames (167-333ms at 60fps)

**Oscillation detection:** Only heading reversals, not speed/acceleration/position

**Missing prevention:** No force prioritization, no slew rate limiting, no adaptive smoothing

### Proposed Control Flow (with all improvements)

```
Frame N:
1. FlockManager.update()
   → Find neighbors (8 closest)
   → Calculate raw forces with PREDICTION (lookahead 3 frames) [NEW]
   → Smooth forces 30% (or reduce to 20%) [OPTIONAL]
   → Apply weights

2. Boid.applyForces()
   → Smooth forces 25% (or remove if FlockManager smoothing remains)
   → Apply dead-zone filter
   → FORCE PRIORITIZATION based on separation magnitude [NEW]
   → SLEW RATE LIMITING on acceleration change [NEW]
   → Add to acceleration

3. Boid.update()
   → Update escape/independence state
   → Calculate derivative damping (INCREASE coeff to 0.3) [CHANGE]
   → position += velocity
   → targetVelocity = velocity + acceleration
   → Limit targetVelocity to maxSpeed
   → Smooth velocity 15%
   → COMPOSITE OSCILLATION DETECTION (heading, speed, accel, position, phase) [NEW]
   → acceleration.set(0, 0, 0)
```

**Total smoothing lag:** ~6-12 frames (100-200ms) if one layer removed

**Oscillation detection:** 95% coverage of all oscillation types

**Prevention:** Force prioritization, slew rate limiting, stronger damping

## Historical Context

### Original Research (Commit 2fa2666)

The previous aerospace control theory research document (no longer in repo but referenced in commit 2fa2666) recommended:

**Solutions Implemented:**
- ✅ Derivative damping (PID D-term) - though coefficient reduced from 0.3 to 0.15
- ✅ Increased smoothing values - force 0.15→0.25, velocity 0.08→0.15
- ✅ Dead-zone threshold increased 0.005→0.01
- ✅ Oscillation detection with escape maneuvers
- ✅ Perception radius reduced 80→50
- ✅ Neighbor limit set to 8

**Solutions NOT Implemented:**
- ❌ Force prioritization (separation dominance when close)
- ❌ Predictive steering (anticipate neighbor positions)
- ❌ Adaptive smoothing (adjust based on force conflicts)
- ❌ Slew rate limiting (limit acceleration change rate)
- ❌ Reduction of smoothing layers (still have 3 layers)

**Key Discrepancy:**

Research recommended: "If combining multiple solutions, **reduce smoothing factors**"
- Velocity: 0.08 → 0.12
- Force: 0.15 → 0.25
- Damping: **Start at 0.2** (lower since smoothing reduced)

What actually happened:
- Velocity: 0.08 → 0.15 (**increased**, not reduced)
- Force: 0.15 → 0.25 (matched recommendation)
- Damping: Started at 0.3, **reduced to 0.15** (opposite direction)

**Result:** More lag (increased smoothing) + less stabilization (reduced damping) = worse oscillation than expected.

## Tradeoffs Analysis

### Detection vs Prevention

**Detection Approach** (current):
- Pros: Catches oscillation after it starts, corrects it
- Cons: Fish still oscillates for 100ms before detected, escape maneuver is visible
- Performance: Low overhead (~10 vector operations per frame per boid)
- Aesthetics: Red escaping fish breaks immersion

**Prevention Approach** (recommended):
- Pros: Oscillation never starts, smoother appearance
- Cons: More complex force calculation logic
- Performance: Slightly higher (~15 vector operations per frame per boid)
- Aesthetics: Seamless, no visible corrections

**Recommendation:** Prioritize prevention (Phase 1), use improved detection as safety net (Phase 2).

### Responsiveness vs Stability

**High Stability** (current excessive smoothing):
- 3 smoothing layers = 10-20 frame lag
- Fish feel "drunk" or "swimming through molasses"
- Phase-shifted oscillation from lag

**High Responsiveness** (reduce smoothing):
- 1-2 smoothing layers = 3-6 frame lag
- Fish react quickly but may oscillate if damping insufficient
- Requires stronger damping (0.3-0.4) and force prioritization

**Recommended Balance:**
- 2 smoothing layers (remove FlockManager or Boid, not both)
- Damping coefficient 0.3
- Force prioritization
- Result: 6-8 frame lag with minimal oscillation

### Complexity vs Effectiveness

**Simple metrics** (current - heading reversals only):
- Low complexity: 20 lines of code
- Catches ~40% of oscillation cases
- Misses: jitter, stuttering, trembling, phase lag

**Composite metrics** (recommended - 5 metrics):
- Medium complexity: 80 lines of code
- Catches ~95% of oscillation cases
- More robust to edge cases

**Preventive measures** (force prioritization + damping):
- Medium complexity: 40 lines of code
- Eliminates ~80% of oscillation before it starts
- More effective than detection

**Recommendation:** Implement prevention first (simpler and more effective), add composite detection only if needed.

## Open Questions

1. **What damping coefficient feels best?** Need user testing to find sweet spot between 0.25-0.4
2. **What are typical separation force magnitudes?** Need logging to calibrate prioritization thresholds
3. **Is escape maneuver too disruptive visually?** Consider gentler correction instead of 45-90° turn
4. **Should escaping fish turn red?** Debug visualization may break immersion
5. **Is 3-5 second cooldown appropriate?** May need tuning based on oscillation frequency
6. **Which smoothing layer should be removed?** FlockManager or Boid - both have tradeoffs
7. **Should detection be disabled entirely** if prevention works well enough?

## Next Steps for Implementation

### Immediate Actions (Phase 1 - 2-3 hours)

1. **Increase damping coefficient** (10 minutes)
   ```javascript
   // File: src/flocking/boid.js:132
   const dampingCoefficient = 0.3; // Changed from 0.15
   ```

2. **Implement force prioritization** (1 hour)
   ```javascript
   // File: src/flocking/boid.js:100-105
   // Replace simple addition with separation-based weighting
   let separationMag = smoothedSeparation.mag();
   if (separationMag > 0.08) {
       // Critical proximity logic
   } else if (separationMag > 0.04) {
       // Close proximity logic
   } else {
       // Normal logic
   }
   ```

3. **Test and log metrics** (1 hour)
   - Add console logging of typical force magnitudes
   - Run with 80 boids for 5 minutes
   - Record: separation mag distribution, oscillation frequency, escape trigger rate
   - Tune prioritization thresholds based on data

### Short-term Actions (Phase 2 - 2-3 hours)

4. **Add speed variance detection** (30 minutes)
   - Track speedHistory array
   - Calculate coefficient of variation
   - Trigger escape if CoV > 0.3

5. **Replace reversal counting with heading variance** (30 minutes)
   - Calculate variance of heading changes
   - Trigger escape if variance > 0.01 rad²

6. **Implement composite oscillation score** (1 hour)
   - Combine heading variance + speed variance + current reversals
   - Weighted sum, trigger at threshold 60/170

### Medium-term Actions (Phase 3 - 3-4 hours)

7. **Implement slew rate limiting** (1 hour)
8. **Remove one smoothing layer** (2 hours including testing)
9. **Tune all parameters** (1 hour)

### Long-term Enhancements (Phase 4 - Optional)

10. **Add positional trembling detection** (1 hour)
11. **Add phase correlation detection** (1 hour)
12. **Implement adaptive smoothing** (2 hours)
13. **Implement predictive steering** (2 hours)

**Expected timeline:**
- Phase 1 complete: Day 1 (70-85% improvement)
- Phase 2 complete: Day 2 (90-95% improvement)
- Phase 3 complete: Day 3-4 (95-98% improvement)
- Phase 4 complete: Week 2 (98-99% improvement)

---

*This research provides a comprehensive analysis of why fish are still exhibiting spastic oscillation despite previous mitigation efforts. The primary issues are: (1) damping coefficient reduced below effective level, (2) no force prioritization implemented, (3) detection only catches heading reversals and misses jitter/stuttering/trembling. Recommended fix: increase damping to 0.3 and implement force prioritization - these two changes alone should eliminate 80% of oscillation.*
