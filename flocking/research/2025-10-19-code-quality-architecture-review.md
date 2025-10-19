---
doc_type: research
date: 2025-10-19T15:00:00+00:00
title: "Code Quality and Architecture Review: Koi Flocking Simulation"
research_question: "What architectural issues, code quality problems, and competing physics pipelines exist in the rapidly-evolved koi flocking codebase?"
researcher: Claude Code

git_commit: e8ec10a16e30cd6f21558d42180849dff8f67916
branch: main
repository: visualizations/flocking

created_by: Claude Code
last_updated: 2025-10-19
last_updated_by: Claude Code

tags:
  - architecture
  - code-quality
  - refactoring
  - physics-pipeline
  - scatter-mode
  - state-management
  - technical-debt
status: complete

related_docs:
  - research/2025-10-19-oscillation-detection-analysis-and-improvements.md
  - research/2025-10-19-koi-animation-jitter-investigation.md
  - MIGRATION.md
  - README.md
---

# Research: Code Quality and Architecture Review - Koi Flocking Simulation

**Date**: 2025-10-19T15:00:00+00:00
**Researcher**: Claude Code
**Git Commit**: e8ec10a16e30cd6f21558d42180849dff8f67916
**Branch**: main
**Repository**: visualizations/flocking

## Research Question

What are the architectural problems, code quality issues, and competing physics pipelines in the koi flocking simulation codebase? The system has evolved rapidly with multiple features (derivative damping, force prioritization proposals, scatter mode, escape behavior, individual scatter, debug modes) - we need to identify maintainability issues, inconsistencies, and refactoring opportunities.

## Executive Summary

### Critical Issues Found

**1. COMPETING PHYSICS PIPELINES (CRITICAL)**
- **Scatter mode completely bypasses normal physics** (`simulation-app.js:259-310`)
- Directly manipulates `boid.velocity`, `boid.position`, and `boid.acceleration`
- Creates race condition: flock.update() runs, then scatter adds MORE forces and updates physics again
- Result: **Double-update problem** where boids are integrated twice per frame during scatter

**2. TIMING INCONSISTENCY (HIGH)**
- `simulation-app.js` uses `millis()` (p5.js, can drift with audio/video sync)
- `boid.js` uses `Date.now()` (JavaScript native, wall-clock time)
- These can desynchronize over time, causing state timing bugs

**3. INCOMPLETE IMPLEMENTATION (HIGH)**
- Force prioritization (from oscillation research) **NOT implemented** despite being recommended
- Escape behavior triggers correctly but force application is **correct**
- Scatter mode architecture is **fundamentally broken** (not just suboptimal)

**4. STATE MANAGEMENT CONFUSION (MEDIUM)**
- Three boolean flags: `isEscaping`, `isIndependent`, `debugOscillation`
- **No clear precedence rules** when multiple states active
- Potential conflicts not handled (e.g., what if escaping AND scatter mode active?)

**5. TRIPLE-LAYER SMOOTHING (MEDIUM)**
- FlockManager: 30% smoothing (`flock-manager.js:122`)
- Boid.applyForces: 25% smoothing (`boid.js:83`)
- Boid.update velocity: 15% smoothing (`boid.js:202`)
- Combined lag: **10-20 frames** (167-333ms at 60fps)
- Causes "swimming through molasses" feel and phase-shifted oscillation

### Code Quality Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| Total LOC (core files) | 1,132 | Reasonable |
| Physics update paths | **3** | ❌ Should be 1 |
| Timing APIs | **2** (`millis()` + `Date.now()`) | ❌ Should be 1 |
| Smoothing layers | **3** | ⚠️ Should be 1-2 |
| State flags in Boid | **3** | ⚠️ Could be state machine |
| Magic numbers | **~15** | ⚠️ Should be constants |
| Hardcoded timing values | **8** | ⚠️ Should be configurable |

### Recommendations Priority

**🔴 CRITICAL (Fix Immediately)**
1. Remove scatter mode's direct physics manipulation - integrate into force pipeline
2. Unify timing API (use only `frameCount` or only `Date.now()`, not both)

**🟠 HIGH (Fix Soon)**
3. Implement force prioritization (already researched, just not applied)
4. Reduce to 2 smoothing layers (remove FlockManager or Boid layer)
5. Add state precedence rules (escape > scatter > independent > normal)

**🟡 MEDIUM (Plan for Refactor)**
6. Extract magic numbers to configuration object
7. Convert state flags to proper state machine
8. Consolidate parameter definitions (currently split across files)

**🟢 LOW (Nice-to-Have)**
9. Add JSDoc comments consistently
10. Extract repeated wrapping logic
11. Create physics integration abstraction

## Detailed Findings

## 1. Competing Physics Pipelines - THE CRITICAL PROBLEM

### 1.1 The Three Physics Update Paths

**Path 1: Normal Flocking** (`flock-manager.js:42-80` → `boid.js:160-267`)
```
FlockManager.update()
  → Calculate forces (alignment, cohesion, separation)
  → Boid.applyForces()
  → Boid.update()
    → position += velocity
    → velocity = lerp(velocity, velocity + acceleration)
    → acceleration.set(0,0,0)
```

**Path 2: Escape Behavior** (`flock-manager.js:48-63`)
```
FlockManager.update()
  → if (boid.isEscaping)
    → Calculate escape force
    → Boid.applyForces() with escape force in separation slot
  → Boid.update() (normal integration)
```

**Path 3: Scatter Mode** (`simulation-app.js:259-310`) **← THE PROBLEM**
```
simulation-app.js draw()
  → flock.update() runs FIRST (normal physics)
  → THEN for scatter mode:
    → boid.acceleration.add(scatterForce)      [LINE 289]
    → boid.velocity.add(boid.acceleration)     [LINE 292] ← DUPLICATE INTEGRATION
    → boid.velocity.limit(maxSpeed)            [LINE 296]
    → boid.position.add(boid.velocity)         [LINE 299] ← DUPLICATE INTEGRATION
    → boid.acceleration.set(0, 0)              [LINE 308]
```

### 1.2 The Double-Update Problem

**Timeline of a single frame during scatter mode:**

```
Frame N:
  ┌─────────────────────────────────────────────────────────┐
  │ simulation-app.js:269 - flock.update(modifiedParams)    │
  │   Inside this call:                                      │
  │   1. Calculate flocking forces (reduced by scatter %)   │
  │   2. Boid.applyForces() adds to acceleration            │
  │   3. Boid.update():                                      │
  │      → position += velocity           [INTEGRATION #1]  │
  │      → velocity = lerp(velocity + acceleration)         │
  │      → acceleration.set(0,0,0)        [RESET]          │
  └─────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │ simulation-app.js:272-309 - Scatter force addition      │
  │   4. boid.acceleration.add(scatterForce)   [LINE 289]  │
  │   5. boid.velocity.add(acceleration)       [LINE 292]  │
  │   6. boid.velocity.limit(maxSpeed)         [LINE 296]  │
  │   7. boid.position.add(velocity)           [LINE 299]  │
  │                                  [INTEGRATION #2] ←──────── DUPLICATE!
  │   8. acceleration.set(0,0)                 [LINE 308]  │
  └─────────────────────────────────────────────────────────┘
```

**Result:** Boids move **TWICE as far** per frame during scatter mode! Once from `Boid.update()`, once from scatter code.

**Evidence from code:**

`simulation-app.js:269-310`:
```javascript
flock.update(modifiedParams, audioData);  // ← Does full physics update

// Now add scatter forces on top
for (let i = 0; i < flock.boids.length; i++) {
    const boid = flock.boids[i];
    // ...
    boid.acceleration.add(weightedScatter);  // ← Line 289

    // ⚠️ THIS IS THE PROBLEM - Manually doing what Boid.update() already did
    boid.velocity.add(boid.acceleration);    // ← Line 292 - DUPLICATE
    boid.velocity.limit(maxSpeed);
    boid.position.add(boid.velocity);        // ← Line 299 - DUPLICATE

    // Edge wrapping (also duplicates Boid.edges())
    if (boid.position.x > flock.width) boid.position.x = 0;  // Lines 302-305
    // ...

    boid.acceleration.set(0, 0);             // ← Line 308
}
```

`boid.js:191-254` (what already happened inside flock.update()):
```javascript
update(maxSpeed, audioAmplitude, audioReactivity, p5, randomFunc) {
    // ... derivative damping ...

    this.position.add(this.velocity);  // ← Already updated position!

    let targetVelocity = p5.Vector.add(this.velocity, this.acceleration);
    targetVelocity.limit(individualMaxSpeed);
    this.velocity.lerp(targetVelocity, smoothing);  // ← Already updated velocity!

    // ... oscillation detection ...

    this.acceleration.set(0, 0, 0);  // ← Already reset!
}
```

### 1.3 Why This Happens

Looking at git history and code comments, scatter mode was likely added AFTER the modular refactor. The developer:
1. Saw that they needed to modify forces during scatter
2. Modified the weights passed to `flock.update()` (lines 262-267) ✓ This is correct
3. But then ALSO added manual force application + integration (lines 272-309) ✗ This duplicates what already happened

**This is a classic "working around the API instead of using it" problem.**

### 1.4 Impact

**Behavior:**
- Fish move 2x faster during scatter than intended
- Scatter force is applied AFTER flocking forces were already integrated
- No derivative damping applied to scatter forces (bypass Boid.update())
- No oscillation detection during scatter (bypass Boid.update())
- Edge wrapping done twice (Boid.edges() and manual)

**Visual:**
- Scatter feels "too aggressive" / "teleport-like"
- Fish can overshoot boundaries
- Scatter behavior fundamentally different feel than normal physics

### 1.5 The Correct Architecture

**Scatter should be just another force:**

```javascript
// CORRECT APPROACH (not currently implemented):

// simulation-app.js:
if (scatterIntensity > 0) {
    // Pass scatter force AS PART OF flocking forces, not after
    for (let i = 0; i < flock.boids.length; i++) {
        const scatterForce = scatterVectors[i].copy().mult(scatterIntensity);
        flock.boids[i].scatterForce = scatterForce;  // Store for Boid to use
    }
}

flock.update(params, audioData);  // Single update, no manual manipulation
```

```javascript
// boid.js applyForces():
applyForces(forces, neighborCount, randomFunc) {
    // ... existing smoothing ...

    // Add scatter force if present
    if (this.scatterForce) {
        this.acceleration.add(this.scatterForce);
        this.scatterForce = null;  // Clear for next frame
    }

    this.acceleration.add(smoothedAlignment);
    this.acceleration.add(smoothedCohesion);
    this.acceleration.add(smoothedSeparation);
}
```

**Benefits of correct approach:**
- Single physics update path
- Scatter benefits from derivative damping
- Scatter benefits from oscillation detection
- No double-integration bug
- Consistent feel across all behaviors

## 2. Force Pipeline Architecture

### 2.1 Current Pipeline (Normal Flocking)

```
┌────────────────────────────────────────────────────────────────┐
│ Frame N                                                         │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ FlockManager.update() [flock-manager.js:42-80]                 │
│                                                                 │
│  1. For each boid:                                              │
│     - Check isEscaping → path diverges to escape force         │
│     - Check isIndependent → skip flocking forces entirely      │
│     - Find neighbors (max 8 within radius 50)                  │
│                                                                 │
│  2. calculateFlockingForces() [flock-manager.js:91-156]        │
│     Raw force calculation:                                      │
│       alignment = calculateAlignment(...)                       │
│       cohesion = calculateCohesion(...)                         │
│       separation = calculateSeparation(...)                     │
│                                                                 │
│     Smoothing Layer 1 (30%):                                   │
│       smoothedAlignment = lerp(prev, alignment, 0.3)           │
│       smoothedCohesion = lerp(prev, cohesion, 0.3)             │
│       smoothedSeparation = lerp(prev, separation, 0.3)         │
│                                                                 │
│     Apply parameter weights:                                    │
│       smoothedAlignment *= params.alignmentWeight              │
│       smoothedCohesion *= params.cohesionWeight                │
│       smoothedSeparation *= params.separationWeight * bassBoost│
│                                                                 │
│  3. Boid.applyForces(forces, neighborCount)                    │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Boid.applyForces() [boid.js:80-150]                            │
│                                                                 │
│  Smoothing Layer 2 (25%):                                      │
│    smoothedAlignment = lerp(prev, alignment, 0.25)             │
│    smoothedCohesion = lerp(prev, cohesion, 0.25)               │
│    smoothedSeparation = lerp(prev, separation, 0.25)           │
│                                                                 │
│  Dead-zone filtering (threshold 0.01):                         │
│    if (magnitude < 0.01) force.set(0, 0)                       │
│                                                                 │
│  ⚠️ MISSING: Force prioritization (from research)              │
│  Currently just simple addition:                                │
│    acceleration.add(smoothedAlignment)                          │
│    acceleration.add(smoothedCohesion)                           │
│    acceleration.add(smoothedSeparation)                         │
│                                                                 │
│  Overcrowding detection (escape trigger):                       │
│    if (neighborCount > 15 || totalForce > 0.25)                │
│      triggerEscapeManeuver()                                    │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Boid.update() [boid.js:160-267]                                │
│                                                                 │
│  Derivative damping (coefficient 0.15):                        │
│    Calculate heading change rate                                │
│    dampingForce = -headingChange * 0.15 * speed                │
│    acceleration.add(dampingForce)                               │
│                                                                 │
│  Position integration:                                          │
│    position += velocity                                         │
│                                                                 │
│  Velocity integration:                                          │
│    targetVelocity = velocity + acceleration                     │
│    targetVelocity.limit(maxSpeed * speedMultiplier)            │
│                                                                 │
│  Smoothing Layer 3 (15%):                                      │
│    velocity = lerp(velocity, targetVelocity, 0.15)             │
│                                                                 │
│  Oscillation detection:                                         │
│    Track heading history (10 frames)                            │
│    Count reversals in last 6 frames                             │
│    if (reversals >= 3) triggerEscapeManeuver()                 │
│                                                                 │
│  Reset acceleration:                                            │
│    acceleration.set(0, 0, 0)                                    │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Boid.edges() [boid.js:361-366]                                 │
│  Wrap around boundaries                                         │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Bypass Points

**Bypass #1: Escape Behavior** (✓ Correct - goes through pipeline)
```
FlockManager.update() [line 44-63]
  → if (isEscaping):
      escapeForce = calculateEscapeForce(...)  [flocking-forces.js:150]
      applyForces({alignment: 0, cohesion: 0, separation: escapeForce})
  → Boid.update() (normal integration)
```

**Why correct:** Escape force goes through `applyForces()` → `update()`, benefiting from:
- Dead-zone filtering
- Derivative damping
- Smoothing
- Oscillation detection
- Single integration path

**Bypass #2: Independent Behavior** (✓ Correct - skips forces only)
```
FlockManager.update() [line 65-74]
  → if (isIndependent):
      Don't calculate flocking forces
      Don't call applyForces()
  → Still call Boid.update() (integration with zero acceleration)
```

**Why correct:** Boids drift with current velocity, benefiting from:
- Derivative damping (prevents spinning)
- Velocity smoothing
- Edge wrapping

**Bypass #3: Scatter Mode** (❌ BROKEN - double update)
```
simulation-app.js draw() [lines 259-310]
  → flock.update(modifiedParams)  // First update
  → Manual force application + integration  // Second update ← PROBLEM
```

**Why broken:** See section 1 above - double integration.

### 2.3 Where Forces Flow

**Forces that GO through pipeline:**
- ✅ Alignment (smoothed 3x)
- ✅ Cohesion (smoothed 3x)
- ✅ Separation (smoothed 3x)
- ✅ Escape force (smoothed 3x, when active)
- ✅ Derivative damping (applied in Boid.update())

**Forces that BYPASS pipeline:**
- ❌ Scatter forces (added after flock.update(), not smoothed)

**Integration that goes through pipeline:**
- ✅ Normal flocking position/velocity integration
- ✅ Escape behavior integration
- ✅ Independent behavior integration (zero force)

**Integration that BYPASSES pipeline:**
- ❌ Scatter mode position/velocity integration (manual, line 292-305)

## 3. Code Duplication and Inconsistencies

### 3.1 Duplicate Physics Integration

**Original (correct):** `boid.js:191-203`
```javascript
this.position.add(this.velocity);
let targetVelocity = p5.Vector.add(this.velocity, this.acceleration);
targetVelocity.limit(individualMaxSpeed);
const smoothing = 0.15;
this.velocity.lerp(targetVelocity, smoothing);
```

**Duplicate (incorrect):** `simulation-app.js:292-296`
```javascript
boid.velocity.add(boid.acceleration);  // Different: no smoothing!
boid.velocity.limit(maxSpeed);  // Different: different speed calc!
boid.position.add(boid.velocity);
```

**Inconsistencies:**
- Scatter uses direct velocity integration (no lerp)
- Scatter uses `params.maxSpeed` not `maxSpeed * speedMultiplier`
- Scatter doesn't apply audio modulation to speed
- Different formulas for same operation = maintenance nightmare

### 3.2 Duplicate Edge Wrapping

**Original:** `boid.js:361-366`
```javascript
edges(width, height) {
    if (this.position.x > width) this.position.x = 0;
    if (this.position.x < 0) this.position.x = width;
    if (this.position.y > height) this.position.y = 0;
    if (this.position.y < 0) this.position.y = height;
}
```

**Duplicate:** `simulation-app.js:302-305`
```javascript
if (boid.position.x > flock.width) boid.position.x = 0;
if (boid.position.x < 0) boid.position.x = flock.width;
if (boid.position.y > flock.height) boid.position.y = 0;
if (boid.position.y < 0) boid.position.y = height;
```

**Why duplication is bad:**
- Bug fixes need to be applied twice
- Easy to forget one location
- Increases code size unnecessarily

### 3.3 Inconsistent Smoothing Patterns

**Triple-layered smoothing (current):**
```
Layer 1 (FlockManager): α = 0.3  [flock-manager.js:122]
Layer 2 (Boid.applyForces): α = 0.25  [boid.js:83]
Layer 3 (Boid.update velocity): α = 0.15  [boid.js:202]
```

**Combined lag:** ~10-20 frames (see oscillation research)

**Problem:** Research document recommends 1-2 layers, but 3 are still present.

### 3.4 Magic Numbers

**Smoothing factors:**
```javascript
// flock-manager.js:122
const forceSmoothness = 0.3;  // Why 0.3? Should be config

// boid.js:83
const forceSmoothing = 0.25;  // Why 0.25? Should be config

// boid.js:202
const smoothing = 0.15;  // Why 0.15? Should be config
```

**Damping:**
```javascript
// boid.js:176
const dampingCoefficient = 0.45;  // Why 0.45? Why not 0.3 from research?
```

**Thresholds:**
```javascript
// boid.js:92
const deadZoneThreshold = 0.01;

// boid.js:139
if (neighborCount > 15 || totalForceMag > 0.25)

// flocking-forces.js:33
const maxNeighbors = 8;

// flocking-forces.js:117
if (d < perceptionRadius * 0.7)  // Why 0.7?

// flocking-forces.js:121
const minDist = 8;  // Why 8?
```

**Timing:**
```javascript
// simulation-app.js:166
scatterEndTime = millis() + 3000; // Why 3000ms?

// simulation-app.js:38
let scatterEaseTime = 2000; // Why 2000ms?

// simulation-app.js:158
nextScatterTime: millis() + random(5000, 20000) // Why 5-20 seconds?

// boid.js:291
this.escapeEndTime = Date.now() + randomFunc(1500, 3000); // Why 1.5-3 seconds?

// boid.js:329
this.escapeCooldownEndTime = Date.now() + (Math.random() * 2000 + 3000); // Why 3-5 seconds?
```

**Recommendation:** Extract all these to a configuration object:

```javascript
const PHYSICS_CONFIG = {
    smoothing: {
        forces: 0.25,      // Unified force smoothing
        velocity: 0.15,    // Velocity smoothing
    },
    damping: {
        coefficient: 0.45,  // Derivative damping strength
    },
    detection: {
        deadZone: 0.01,
        overcrowdingNeighbors: 15,
        overcrowdingForce: 0.25,
        maxNeighbors: 8,
    },
    separation: {
        distanceMultiplier: 0.7,
        minDistance: 8,
    },
    timing: {
        scatterDuration: 3000,
        scatterEaseDuration: 2000,
        scatterIntervalMin: 5000,
        scatterIntervalMax: 20000,
        escapeDurationMin: 1500,
        escapeDurationMax: 3000,
        escapeCooldownMin: 3000,
        escapeCooldownMax: 5000,
    }
};
```

### 3.5 Inconsistent Naming Conventions

**Parameter objects:**
- `params` (simulation-app.js) - flocking parameters
- `shapeParams` (koi-renderer.js) - visual parameters
- `animationParams` (simulation-app.js:348) - animation parameters
- `modifiers` (simulation-app.js:354) - audio reactive modifiers
- `colorParams` (simulation-app.js:346) - color parameters

**Good:** Clear separation of concerns
**Bad:** No consistent suffix (some `Params`, some nothing)

**Function names:**
- `calculateAlignment()` - calculate prefix
- `findNeighbors()` - no prefix
- `applyForces()` - apply prefix
- `triggerEscapeManeuver()` - trigger prefix

**Recommendation:** Standardize on verb prefixes: `calculate*`, `apply*`, `update*`, `trigger*`, `get*`, `set*`

### 3.6 Missing Abstractions

**Repeated pattern:** Vector smoothing (lerp)
```javascript
// Appears 6 times in codebase:
const smoothed = this.p5.Vector.lerp(previous, current, factor);
```

**Could be:**
```javascript
function smoothVector(previous, current, factor, p5) {
    return p5.Vector.lerp(previous.copy(), current, factor);
}
```

**Repeated pattern:** Edge wrapping
```javascript
// Appears 2 times (boid.js, simulation-app.js)
if (position.x > width) position.x = 0;
if (position.x < 0) position.x = width;
// ...
```

**Could be:**
```javascript
function wrapPosition(position, width, height) {
    if (position.x > width) position.x = 0;
    if (position.x < 0) position.x = width;
    if (position.y > height) position.y = 0;
    if (position.y < 0) position.y = height;
}
```

**Repeated pattern:** Time-based state checks
```javascript
// Appears multiple times:
if (Date.now() > this.endTime) { /* ... */ }
```

**Could be:**
```javascript
class TimedState {
    constructor(duration) {
        this.endTime = Date.now() + duration;
    }
    isExpired() {
        return Date.now() >= this.endTime;
    }
    reset(duration) {
        this.endTime = Date.now() + duration;
    }
}
```

## 4. State Management Issues

### 4.1 Boid State Flags

**All state flags in Boid:**
```javascript
// boid.js:35, 58, 66
this.debugOscillation = true;  // Debug flag
this.isIndependent = false;     // Behavior state
this.isEscaping = false;        // Behavior state
```

**Plus timers:**
```javascript
this.independenceTimer = 0;
this.independenceDuration = 0;
this.independenceFrameCounter = 0;
this.escapeEndTime = 0;
this.escapeCooldownEndTime = 0;
```

### 4.2 State Interactions

**Question:** What happens when multiple states are active?

**Scenario 1:** Escaping + Scatter mode active
```
FlockManager.update() [line 45]:
  if (isEscaping) {
    applyForces(escapeForce)  // Applies escape force
  }
  update()  // Integrates

simulation-app.js [line 272]:
  if (scatterMode) {
    // Adds scatter force ON TOP OF escape force
    // Then re-integrates position/velocity
  }
```

**Result:** Boid gets escape force, then scatter force, then moves twice. **Undefined behavior.**

**Scenario 2:** Independent + Scatter mode active
```
FlockManager.update() [line 66]:
  if (isIndependent) {
    // Skip forces, just call update()
  }

simulation-app.js [line 272]:
  if (scatterMode) {
    // Adds scatter force anyway!
  }
```

**Result:** Independent boids still affected by scatter. **Inconsistent with independence concept.**

**Scenario 3:** Escaping + Independent simultaneously
```
// This CANNOT happen - different trigger mechanisms
// Independent: frame counter (boid.js:271-294)
// Escaping: force-based trigger (boid.js:138-143)

// But if it could:
FlockManager.update():
  if (isEscaping) {
    // Applies escape force
  } else if (isIndependent) {
    // Skips forces
  }
```

**Currently safe** because of `else if`, but **no documentation of precedence**.

### 4.3 State Precedence (Implicit, Undocumented)

**Current implicit precedence** (from code reading):

```
1. isEscaping (highest priority)
   → Overrides flocking forces with escape force

2. isIndependent
   → Skips flocking forces if NOT escaping

3. Normal flocking (lowest priority)
   → Only if not escaping AND not independent
```

**But scatter mode is OUTSIDE this hierarchy!** It applies to ALL states.

### 4.4 Recommended State Machine

**Proposed enum:**
```javascript
const BoidState = {
    NORMAL: 'normal',
    INDEPENDENT: 'independent',
    ESCAPING: 'escaping',
    SCATTERING: 'scattering',  // ← Should be a state, not external
};
```

**State transitions:**
```
NORMAL ←→ INDEPENDENT (random timer)
   ↓ ↑
ESCAPING (cooldown prevents immediate return)

SCATTERING (global override - affects all states)
```

**State behavior:**
```javascript
switch (this.state) {
    case BoidState.ESCAPING:
        forces = { escape: calculateEscapeForce(...) };
        break;

    case BoidState.SCATTERING:
        forces = { scatter: getScatterForce() };
        break;

    case BoidState.INDEPENDENT:
        forces = { zero: true };  // Drift only
        break;

    case BoidState.NORMAL:
    default:
        forces = calculateFlockingForces(...);
        break;
}

applyForces(forces);
update();
```

**Benefits:**
- Clear precedence (switch = priority order)
- Exhaustive handling (no missing cases)
- Easy to debug (single state variable)
- Easy to extend (add new states)

### 4.5 Missing State Checks

**No check for:** What if scatter scatter scatter intensity is 0 but we're still in loop?
```javascript
// simulation-app.js:272-309
for (let i = 0; i < flock.boids.length; i++) {
    // ...
    const totalIntensity = Math.max(scatterIntensity, individualIntensity);

    if (activeScatterVec && totalIntensity > 0) {  // ✓ Has check
        // Apply scatter force
    }
}
```

**Actually this IS checked.** Good.

**No check for:** Escape during cooldown
```javascript
// boid.js:138-143
if (!this.isEscaping && now > this.escapeCooldownEndTime) {
    if (neighborCount > 15 || totalForceMag > 0.25) {
        this.triggerEscapeManeuver(randomFunc);
    }
}
```

**This IS checked.** Good.

**Missing check:** Independence during escape?
```javascript
// boid.js:262-294 - updateIndependence()
// No check for isEscaping! Could theoretically go independent while escaping.
```

**Probably benign** (escape checks happen in FlockManager before independence check), but **undocumented assumption**.

## 5. Timing and Frame-Based Logic

### 5.1 Mixed Timing APIs

**API 1: `millis()` - p5.js timing**
- Returns milliseconds since sketch started
- Synchronized with p5.js animation frame
- Affected by `frameRate()` changes
- Used in: `simulation-app.js` (6 locations)

**API 2: `Date.now()` - JavaScript wall-clock**
- Returns milliseconds since Unix epoch
- Independent of animation frame
- Continues running in background
- Used in: `boid.js` (6 locations)

**API 3: `frameCount` - p5.js frame counter**
- Increments by 1 each frame
- Synchronized with drawing
- Used in: `simulation-app.js:320` (animation timing)

### 5.2 Potential Drift Issues

**Scenario:** Browser tab backgrounded

```
millis() when backgrounded:
  → p5.js pauses animation loop
  → millis() stops incrementing
  → millis() = 5000 (frozen)

Date.now() when backgrounded:
  → System clock keeps running
  → Date.now() = 1634567890000
  → Date.now() = 1634567895000 (5 seconds later)

Tab restored:
  → millis() resumes: 5001, 5016, 5032...
  → Date.now() continues: 1634567895000...

Result:
  → scatter timers (millis()) think 5 seconds passed
  → escape timers (Date.now()) think 5 seconds + background time passed
  → Desynchronization!
```

**Impact:**
- Escape cooldowns expire earlier than expected (uses Date.now())
- Scatter intervals expire later than expected (uses millis())
- **Not critical** (just timing quirks), but inconsistent

### 5.3 Frame Rate Assumptions

**Assumption found in comments:**
```javascript
// boid.js:61
this.independenceCheckInterval = randomFunc(180, 600); // Check every 3-10 seconds at 60fps
//                                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                                                        Hardcoded 60fps assumption
```

**Calculation:**
- 180 frames ÷ 60fps = 3 seconds ✓
- 600 frames ÷ 60fps = 10 seconds ✓

**Problem:** If frame rate is NOT 60fps (e.g., 30fps on slow device), timing is wrong:
- 180 frames ÷ 30fps = 6 seconds (not 3!)
- 600 frames ÷ 30fps = 20 seconds (not 10!)

**Recommendation:** Use time-based, not frame-based:
```javascript
// Instead of frame counter:
this.independenceCheckTime = Date.now() + randomFunc(3000, 10000);  // milliseconds

// Check:
if (Date.now() >= this.independenceCheckTime) {
    // Roll independence chance
}
```

**OR** use `deltaTime` (p5.js):
```javascript
this.independenceTimer += deltaTime;  // Accumulate actual elapsed time
if (this.independenceTimer >= this.independenceCheckInterval) {
    // Roll independence chance
}
```

### 5.4 Animation Timing Issues

See the separate animation jitter research document. Key finding:
- Animation uses `frameCount` (frame-based)
- Physics uses `millis()` or `Date.now()` (time-based)
- These can drift on variable frame rates

**From animation research:**
> "The fix is to smooth the final waveTime value directly, which guarantees bounded error that decays exponentially rather than accumulating linearly."

**Status:** Partially fixed in recent commit (e8ec10a), but still some accumulation issues.

## 6. Scatter Mode Deep Dive

### 6.1 Architecture Problems

**Current design:**
```
simulation-app.js owns scatter state
  → scatterMode (boolean)
  → scatterEndTime (timestamp)
  → scatterVectors (array of forces)
  → individualScatterData (array of per-boid state)

Scatter forces applied AFTER flock.update()
  → Bypasses Boid class encapsulation
  → Direct manipulation of boid internals
```

**Problems:**
1. **Violates encapsulation** - simulation-app.js reaches into boid physics
2. **State split** - scatter state is outside Boid, but affects Boid behavior
3. **Duplicate integration** - as documented in section 1
4. **No smoothing** - scatter forces not smoothed like flocking forces
5. **No damping** - scatter bypasses derivative damping
6. **No detection** - scatter bypasses oscillation detection

### 6.2 Individual Scatter State

**Per-boid scatter state** (simulation-app.js:154-161):
```javascript
individualScatterData = [
    {
        active: false,
        endTime: 0,
        vector: null,
        nextScatterTime: millis() + random(5000, 20000)
    },
    // ... one per boid
];
```

**Problems:**
- **Parallel array** - individualScatterData[i] corresponds to flock.boids[i]
- **Fragile** - if boids array is resorted or resized, indices break
- **Split state** - boid behavior state stored outside Boid class

**This should be IN the Boid class:**
```javascript
// boid.js:
this.individualScatter = {
    active: false,
    endTime: 0,
    vector: null,
    nextScatterTime: 0
};
```

### 6.3 Scatter Force Calculation

**Current:** `simulation-app.js:283-288`
```javascript
const scatterForce = activeScatterVec.copy();
scatterForce.limit(params.maxForce * 5);  // ← Why 5x?

const weightedScatter = scatterForce.copy().mult(totalIntensity);
boid.acceleration.add(weightedScatter);
```

**Issues:**
- `maxForce * 5` is magic number (should be `SCATTER_FORCE_MULTIPLIER`)
- Force not smoothed (unlike flocking forces which are smoothed 3x)
- Force added directly to acceleration (bypasses applyForces())

**Correct approach:**
```javascript
// In Boid class:
calculateScatterForce(scatterVector, maxForce, intensity) {
    if (!scatterVector || intensity === 0) {
        return createVector(0, 0);
    }

    const force = scatterVector.copy();
    force.limit(maxForce * SCATTER_FORCE_MULTIPLIER);
    force.mult(intensity);

    return force;
}

// Then in applyForces():
if (this.scatterForce) {
    // Smooth scatter force like other forces
    const smoothedScatter = this.previousScatter.copy().lerp(
        this.scatterForce,
        forceSmoothing
    );

    this.acceleration.add(smoothedScatter);
    this.previousScatter = smoothedScatter.copy();
}
```

### 6.4 Scatter Easing

**Current:** `simulation-app.js:240-256`
```javascript
const currentTime = millis();

if (currentTime < scatterEndTime) {
    scatterIntensity = 1.0;
} else if (currentTime < scatterEndTime + scatterEaseTime) {
    const elapsed = currentTime - scatterEndTime;
    scatterIntensity = 1.0 - (elapsed / scatterEaseTime);
    scatterIntensity = scatterIntensity * scatterIntensity;  // easeOut curve
} else if (scatterMode) {
    scatterMode = false;
    scatterVectors = [];
}
```

**Good:**
- Smooth easing (quadratic easeOut)
- Clear state transitions

**Could be better:**
- Extract easing function: `easeOut(t) = t * t`
- Use enum for scatter phases: `ACTIVE`, `EASING`, `INACTIVE`

### 6.5 Recommended Scatter Refactor

**Move scatter into force pipeline:**

```javascript
// In Boid class:
class Boid {
    constructor(...) {
        // ...
        this.scatterState = {
            active: false,
            vector: null,
            intensity: 0,
            endTime: 0,
            nextTriggerTime: 0
        };
        this.previousScatterForce = createVector(0, 0);
    }

    // Called each frame to update scatter state
    updateScatterState(globalScatter, randomFunc) {
        // Check for global scatter trigger
        if (globalScatter.active) {
            this.scatterState.active = true;
            this.scatterState.vector = globalScatter.getVectorFor(this);
            this.scatterState.intensity = globalScatter.intensity;
        }

        // Check for individual scatter trigger
        const now = millis();
        if (!this.scatterState.active && now >= this.scatterState.nextTriggerTime) {
            // Trigger individual scatter
            this.scatterState.active = true;
            this.scatterState.vector = p5.Vector.random2D();
            this.scatterState.intensity = 1.0;
            this.scatterState.endTime = now + randomFunc(1000, 2500);
        }

        // Update intensity (easing)
        if (this.scatterState.active) {
            if (now < this.scatterState.endTime) {
                this.scatterState.intensity = 1.0;
            } else {
                // Ease out
                const elapsed = now - this.scatterState.endTime;
                this.scatterState.intensity = easeOut(1.0 - elapsed / SCATTER_EASE_TIME);

                if (this.scatterState.intensity <= 0) {
                    this.scatterState.active = false;
                    this.scatterState.nextTriggerTime = now + randomFunc(5000, 20000);
                }
            }
        }
    }

    // Calculate scatter force (called during force calculation)
    calculateScatterForce(maxForce) {
        if (!this.scatterState.active || this.scatterState.intensity === 0) {
            return createVector(0, 0);
        }

        const force = this.scatterState.vector.copy();
        force.limit(maxForce * SCATTER_FORCE_MULTIPLIER);
        force.mult(this.scatterState.intensity);

        return force;
    }

    applyForces(forces, neighborCount, randomFunc) {
        // ... existing smoothing ...

        // Add scatter force (smoothed)
        const scatterForce = this.calculateScatterForce(/* maxForce from params */);
        const smoothedScatter = this.previousScatterForce.copy().lerp(
            scatterForce,
            forceSmoothing
        );

        // Apply with PRIORITIZATION
        // When scattering, scatter dominates
        if (this.scatterState.intensity > 0.5) {
            // High scatter - scatter dominates (80%)
            this.acceleration.add(smoothedScatter.copy().mult(0.8));
            this.acceleration.add(smoothedAlignment.copy().mult(0.15));
            this.acceleration.add(smoothedCohesion.copy().mult(0.05));
            this.acceleration.add(smoothedSeparation.copy().mult(0.0));  // No separation during scatter
        } else if (this.scatterState.intensity > 0) {
            // Low scatter - blended
            const scatterWeight = this.scatterState.intensity;
            const flockWeight = 1.0 - scatterWeight;

            this.acceleration.add(smoothedScatter.copy().mult(scatterWeight));
            this.acceleration.add(smoothedAlignment.copy().mult(flockWeight * 0.6));
            this.acceleration.add(smoothedCohesion.copy().mult(flockWeight * 0.3));
            this.acceleration.add(smoothedSeparation.copy().mult(flockWeight * 0.1));
        } else {
            // No scatter - normal flocking (with force prioritization as researched)
            // ... existing force prioritization logic ...
        }

        this.previousScatterForce = smoothedScatter.copy();
    }
}
```

**Benefits:**
- Single physics update path (no double integration)
- Scatter forces smoothed like flocking forces
- Scatter benefits from derivative damping
- Scatter benefits from oscillation detection
- State encapsulated in Boid (no parallel arrays)
- Clear force prioritization during scatter

## 7. Escape Behavior Integration

### 7.1 Escape Trigger Points

**Trigger 1: Overcrowding** (`boid.js:132-144`)
```javascript
const now = Date.now();

if (!this.isEscaping && now > this.escapeCooldownEndTime) {
    if (neighborCount > 15 || totalForceMag > 0.25) {
        this.triggerEscapeManeuver(randomFunc);
        this.headingHistory = [];  // Reset oscillation detection
    }
}
```

**Trigger 2: Oscillation** (`boid.js:240-258`)
```javascript
if (reversals >= 3 && !this.isEscaping && now > this.escapeCooldownEndTime) {
    this.triggerEscapeManeuver(randomFunc);
    this.headingHistory = [];
}
```

**Both triggers:**
- ✓ Check `!this.isEscaping` (don't retrigger during escape)
- ✓ Check cooldown (`now > this.escapeCooldownEndTime`)
- ✓ Clear heading history to reset oscillation detection

**Good design.** No issues found.

### 7.2 Escape Force Application

**Escape force calculation:** `flocking-forces.js:150-159`
```javascript
export function calculateEscapeForce(boid, escapeDirection, maxSpeed, maxForce, p5) {
    const targetVelocity = p5.Vector.fromAngle(escapeDirection, maxSpeed * 1.2);
    const steering = p5.Vector.sub(targetVelocity, boid.velocity);
    steering.limit(maxForce * 2);  // Stronger force
    return steering;
}
```

**Force application:** `flock-manager.js:48-63`
```javascript
if (isEscaping && escapeDirection !== null) {
    const escapeForce = calculateEscapeForce(
        boid,
        escapeDirection,
        params.maxSpeed,
        params.maxForce,
        this.p5
    );

    // Override normal forces with escape force
    boid.applyForces({
        alignment: this.p5Funcs.createVector(),     // Zero
        cohesion: this.p5Funcs.createVector(),      // Zero
        separation: escapeForce                      // Escape in separation slot
    }, 0, this.p5Funcs.random);
}
```

**Analysis:**
- ✓ Escape force goes through `applyForces()` (correct)
- ✓ Other forces zeroed out (escape takes full control)
- ✓ Escape force is 2x stronger than normal (`maxForce * 2`)
- ✓ Target speed is 20% faster (`maxSpeed * 1.2`)

**Escape is correctly integrated!** Goes through normal pipeline:
1. applyForces() → smooths escape force
2. update() → applies derivative damping
3. update() → velocity/position integration
4. edges() → wrapping

**No bypass, no double-update.** Good.

### 7.3 Escape Direction Selection

**Direction calculation:** `boid.js:289-300`
```javascript
triggerEscapeManeuver(randomFunc) {
    this.isEscaping = true;
    this.escapeEndTime = Date.now() + randomFunc(1500, 3000);

    const currentHeading = this.velocity.heading();
    const angleOffset = randomFunc(Math.PI / 4, Math.PI / 2);  // 45-90 degrees
    const direction = randomFunc() > 0.5 ? 1 : -1;  // Randomly left or right

    this.escapeDirection = currentHeading + (angleOffset * direction);
}
```

**Good:**
- 45-90° turn (not too sharp, not too shallow)
- Random left/right (not predictable)
- Duration 1.5-3 seconds (reasonable)

**Could be improved:**
- Consider force direction? (escape AWAY from high force)
- Currently just random ±45-90° from current heading
- Might escape TOWARD the threat by chance

**Suggested enhancement:**
```javascript
triggerEscapeManeuver(randomFunc, forceDirection = null) {
    this.isEscaping = true;
    this.escapeEndTime = Date.now() + randomFunc(1500, 3000);

    const currentHeading = this.velocity.heading();

    if (forceDirection !== null) {
        // Escape AWAY from the problematic force
        const awayHeading = forceDirection + Math.PI;  // Opposite direction

        // Add some randomness (±30°) to avoid looking robotic
        const randomOffset = randomFunc(-Math.PI / 6, Math.PI / 6);
        this.escapeDirection = awayHeading + randomOffset;
    } else {
        // Random escape (current behavior)
        const angleOffset = randomFunc(Math.PI / 4, Math.PI / 2);
        const direction = randomFunc() > 0.5 ? 1 : -1;
        this.escapeDirection = currentHeading + (angleOffset * direction);
    }
}
```

### 7.4 Escape Cooldown

**Cooldown logic:** `boid.js:324-345`
```javascript
updateEscape() {
    if (this.isEscaping && Date.now() >= this.escapeEndTime) {
        this.isEscaping = false;
        this.escapeDirection = null;

        // Set cooldown period of 3-5 seconds
        this.escapeCooldownEndTime = Date.now() + (Math.random() * 2000 + 3000);

        // Clear heading history
        this.headingHistory = [];
    }
}
```

**Analysis:**
- ✓ Cooldown prevents immediate retriggering
- ✓ Heading history cleared (fresh start for oscillation detection)
- ✓ Random cooldown (3-5 seconds) prevents synchronization

**No issues found.** Well designed.

### 7.5 Escape Visualization

**Debug visualization:** `simulation-app.js:331-337`
```javascript
const isEscaping = boid.getIsEscaping ? boid.getIsEscaping() : false;
let debugColor = boid.color;

if (isEscaping) {
    // Override color to bright red
    debugColor = { h: 0, s: 100, b: 90 };
}
```

**Good:**
- Easy to see which boids are escaping
- Non-intrusive (just color change)

**Could be improved:**
- Add UI toggle (like debug vectors 'D' key)
- Show escape direction arrow?

**Recommendation:**
```javascript
case 'e':
    // Toggle escape visualization
    debugEscape = !debugEscape;
    console.log('Debug escape:', debugEscape ? 'ON' : 'OFF');
    break;
```

## 8. File-by-File Code Quality Analysis

### 8.1 `src/apps/simulation-app.js` (410 lines)

**Purpose:** Main application orchestration - connects flock, audio, rendering, UI.

**Strengths:**
- ✅ Clear module imports
- ✅ Separation of concerns (delegates to specialized classes)
- ✅ Well-commented sections
- ✅ Clean keyboard controls

**Issues:**
- ❌ **CRITICAL: Scatter mode physics bypass** (lines 259-310)
  - Directly manipulates boid internals
  - Double-update problem
  - Should integrate into force pipeline
  - **Priority: Fix immediately**

- ⚠️ **Uses `millis()` while Boid uses `Date.now()`**
  - Lines: 158, 166, 179, 210, 241
  - Potential drift issues
  - **Priority: High - unify timing API**

- ⚠️ **Parallel array for individual scatter state**
  - `individualScatterData` array (line 41)
  - Fragile coupling with `flock.boids` array
  - Should move into Boid class
  - **Priority: Medium**

- ⚠️ **Magic numbers**
  - `scatterEaseTime = 2000` (line 38)
  - `millis() + 3000` (line 166)
  - `random(5000, 20000)` (line 158)
  - Should extract to config
  - **Priority: Low**

- ⚠️ **Edge wrapping duplicated**
  - Lines 302-305 duplicate `boid.edges()`
  - **Priority: Low** (will be fixed when scatter is refactored)

**Recommendations:**
1. Remove scatter physics manipulation (refactor to force pipeline)
2. Move individual scatter state into Boid
3. Unify timing API (use only frameCount for frame-based, only Date.now() for time-based)
4. Extract timing constants to configuration object

**Rating: 6/10** - Good structure undermined by scatter mode architecture flaw.

### 8.2 `src/flocking/boid.js` (355 lines)

**Purpose:** Individual boid physics, state, and behavior.

**Strengths:**
- ✅ Clean separation of physics and rendering (no draw code)
- ✅ Comprehensive JSDoc comments
- ✅ Well-organized constructor
- ✅ Proper escape behavior integration
- ✅ Good oscillation detection implementation

**Issues:**
- ⚠️ **Uses `Date.now()` while app uses `millis()`**
  - Lines: 133, 240, 291, 306, 324, 329
  - **Priority: High - unify timing API**

- ⚠️ **Missing force prioritization** (researched but not implemented)
  - Lines 147-149: Simple force addition
  - Research recommends separation-based prioritization
  - **Priority: High** (causes remaining oscillation)

- ⚠️ **Frame-based timing assumes 60fps**
  - Line 61 comment: "Check every 3-10 seconds at 60fps"
  - Independence check uses frame counter
  - Breaks on variable frame rates
  - **Priority: Medium**

- ⚠️ **Magic numbers**
  - Damping coefficient: 0.45 (line 176)
  - Force smoothing: 0.25 (line 83)
  - Velocity smoothing: 0.15 (line 202)
  - Dead zone: 0.01 (line 92)
  - Overcrowding thresholds: 15 neighbors, 0.25 force (line 139)
  - **Priority: Low**

- ⚠️ **Smoothed speed code no longer needed?**
  - Lines 205-243: `smoothedSpeed` calculation
  - Animation jitter research suggests smoothing waveTime instead
  - Recent commit may have made this obsolete
  - **Priority: Low** (verify before removing)

- ⚠️ **State precedence undocumented**
  - Three boolean flags: `isEscaping`, `isIndependent`, `debugOscillation`
  - Precedence rules implicit in code
  - **Priority: Medium** (document or convert to state machine)

**Recommendations:**
1. Implement force prioritization (from oscillation research)
2. Unify timing API (Date.now() → millis() or frameCount)
3. Convert frame-based independence to time-based
4. Document state precedence OR convert to state machine
5. Extract magic numbers to config
6. Consider removing smoothedSpeed if obsolete

**Rating: 7.5/10** - Solid implementation with some technical debt and missing optimizations.

### 8.3 `src/flocking/flock-manager.js` (199 lines)

**Purpose:** Orchestrates flock behavior, applies forces to all boids.

**Strengths:**
- ✅ Clean class structure
- ✅ Good JSDoc documentation
- ✅ Proper separation between force calculation and application
- ✅ Handles escape behavior correctly

**Issues:**
- ⚠️ **Duplicate smoothing layer**
  - Lines 122-137: Smooths forces 30%
  - Boid.applyForces() smooths again 25%
  - Creates excessive lag (10-20 frames)
  - Research recommends removing one layer
  - **Priority: High**

- ⚠️ **Force smoothing then weighting**
  - Line 145-150: Weights applied AFTER smoothing
  - Means smoothing acts on unweighted forces
  - Then weights applied to smoothed forces
  - Order may not be optimal
  - **Priority: Low** (functional, just unusual)

- ⚠️ **Bass boost on separation only**
  - Line 149: `separationWeight * bassBoost`
  - Why not on alignment/cohesion?
  - Design decision, but undocumented
  - **Priority: Low** (add comment)

- ⚠️ **Independence check could be method**
  - Line 66: `const isIndependent = boid.getIsIndependent();`
  - But line 45: `const isEscaping = boid.getIsEscaping();`
  - Inconsistency: both should be methods OR both should be properties
  - **Priority: Low** (style issue)

**Recommendations:**
1. Remove smoothing layer (either this one or Boid's, not both)
2. Add comment explaining why bass boosts separation only
3. Consider moving bass boost logic into force calculation functions

**Rating: 8/10** - Clean implementation with one architectural issue (double smoothing).

### 8.4 `src/flocking/flocking-forces.js` (168 lines)

**Purpose:** Pure force calculation functions.

**Strengths:**
- ✅ Pure functions (no side effects)
- ✅ Well-documented parameters
- ✅ Separate function per force type (SRP)
- ✅ Proper vector math
- ✅ Includes escape force calculation

**Issues:**
- ⚠️ **Magic numbers**
  - `maxNeighbors = 8` (line 33)
  - `perceptionRadius * 0.7` (line 117)
  - `minDist = 8` (line 121)
  - `maxSpeed * 1.2` (line 152 - escape)
  - `maxForce * 2` (line 156 - escape)
  - **Priority: Low** (extract to constants)

- ⚠️ **Neighbor limiting hard-coded**
  - Line 33: `const maxNeighbors = 8;`
  - Should be parameter or config
  - **Priority: Low**

- ⚠️ **`dist()` helper function at bottom**
  - Lines 164-168: Local dist() implementation
  - Could use p5.Vector.dist() for consistency
  - **Priority: Low** (works fine, just inconsistent)

- ⚠️ **No scatter force calculation**
  - Scatter forces calculated in simulation-app.js
  - Should be in this file for consistency
  - **Priority: Medium** (when refactoring scatter)

**Recommendations:**
1. Extract magic numbers to named constants
2. Add `calculateScatterForce()` function (when refactoring scatter)
3. Make `maxNeighbors` a parameter
4. Consider using p5.Vector.dist() instead of local dist()

**Rating: 8.5/10** - Clean pure functions with minor style issues.

### 8.5 `src/core/koi-renderer.js` (not read in detail, but referenced)

**Purpose:** Renders koi visual appearance.

**Known from other files:**
- Used by simulation-app.js and editor-app.js
- Handles shape, color, animation
- No physics logic (good separation)

**No issues identified** in scope of this research (rendering not analyzed).

**Rating: N/A** (not analyzed)

### 8.6 `src/core/koi-params.js` (139 lines)

**Purpose:** Centralized parameter definitions and validation.

**Strengths:**
- ✅ Single source of truth for shape parameters
- ✅ Parameter validation functions
- ✅ Range definitions for UI controls
- ✅ Helper functions (clamp, copy)

**Issues:**
- ⚠️ **Only shape parameters here, physics parameters elsewhere**
  - This file: shape parameters (body, fins, etc.)
  - simulation-app.js: physics parameters (maxSpeed, weights, etc.)
  - Inconsistent organization
  - **Priority: Low** (consider consolidation)

**Recommendations:**
1. Create `physics-params.js` with same structure
2. OR add physics params to this file (rename to `params.js`)

**Rating: 9/10** - Excellent structure, minor organization inconsistency.

### 8.7 `src/core/koi-varieties.js` (not read, but referenced)

**Purpose:** Koi color variety definitions.

**No issues identified** in scope of this research.

**Rating: N/A** (not analyzed)

### 8.8 `src/ui/control-panel.js` (not read in detail)

**Purpose:** UI controls for simulation parameters.

**Known from references:**
- Handles sliders and inputs
- Fires callbacks to simulation-app.js

**No issues identified** in scope of this research.

**Rating: N/A** (not analyzed)

## 9. Proposed Refactoring Architecture

### 9.1 Unified Force Pipeline

**Goal:** ALL forces flow through ONE path, no bypasses.

**New architecture:**

```javascript
// In Boid class:
class Boid {
    update(params, audioData, scatterData, p5, randomFunc) {
        // 1. Update all state machines
        this.updateEscape();
        this.updateIndependence(randomFunc);
        this.updateScatter(scatterData, randomFunc);

        // 2. Determine current state
        const state = this.getCurrentState();  // NORMAL, ESCAPING, SCATTERING, INDEPENDENT

        // 3. Calculate forces based on state
        const forces = this.calculateForcesForState(state, params, audioData);

        // 4. Apply forces (with smoothing, prioritization, dead-zone)
        this.applyForces(forces, params);

        // 5. Integrate physics (derivative damping, velocity, position)
        this.integratePhysics(params, audioData, p5);

        // 6. Detect oscillation
        this.detectOscillation(randomFunc);

        // 7. Wrap edges
        this.edges(width, height);
    }

    calculateForcesForState(state, params, audioData) {
        switch (state) {
            case BoidState.ESCAPING:
                return {
                    escape: this.calculateEscapeForce(params),
                    flocking: null
                };

            case BoidState.SCATTERING:
                return {
                    scatter: this.calculateScatterForce(params),
                    flocking: this.calculateFlockingForces(params, audioData, 0.2)  // Reduced weight
                };

            case BoidState.INDEPENDENT:
                return {
                    flocking: null  // Drift only
                };

            case BoidState.NORMAL:
            default:
                return {
                    flocking: this.calculateFlockingForces(params, audioData, 1.0)  // Full weight
                };
        }
    }

    applyForces(forces, params) {
        // Smooth all forces
        const smoothed = this.smoothForces(forces, params.smoothingFactor);

        // Apply dead-zone filter
        const filtered = this.filterDeadZone(smoothed, params.deadZone);

        // Prioritize forces (separation > scatter > alignment > cohesion)
        const prioritized = this.prioritizeForces(filtered, params);

        // Accumulate into acceleration
        for (const force of Object.values(prioritized)) {
            if (force) this.acceleration.add(force);
        }
    }
}
```

### 9.2 State Machine Implementation

**Replace boolean flags with enum:**

```javascript
const BoidState = {
    NORMAL: 'normal',
    INDEPENDENT: 'independent',
    ESCAPING: 'escaping',
    SCATTERING: 'scattering'
};

class Boid {
    constructor(...) {
        this.state = BoidState.NORMAL;
        this.stateTimers = {
            escapeEnd: 0,
            escapeCooldown: 0,
            scatterEnd: 0,
            scatterNext: 0,
            independenceEnd: 0,
            independenceNext: 0
        };
    }

    getCurrentState() {
        const now = Date.now();

        // State priority (highest to lowest):
        // 1. ESCAPING (overrides all)
        if (this.state === BoidState.ESCAPING && now < this.stateTimers.escapeEnd) {
            return BoidState.ESCAPING;
        }

        // 2. SCATTERING (overrides normal and independent)
        if (now < this.stateTimers.scatterEnd) {
            return BoidState.SCATTERING;
        }

        // 3. INDEPENDENT
        if (this.state === BoidState.INDEPENDENT && now < this.stateTimers.independenceEnd) {
            return BoidState.INDEPENDENT;
        }

        // 4. NORMAL (default)
        return BoidState.NORMAL;
    }

    transitionTo(newState, duration, randomFunc) {
        const now = Date.now();

        console.log(`Boid state: ${this.state} → ${newState}`);
        this.state = newState;

        switch (newState) {
            case BoidState.ESCAPING:
                this.stateTimers.escapeEnd = now + duration;
                this.stateTimers.escapeCooldown = now + duration + randomFunc(3000, 5000);
                break;

            case BoidState.SCATTERING:
                this.stateTimers.scatterEnd = now + duration;
                break;

            case BoidState.INDEPENDENT:
                this.stateTimers.independenceEnd = now + duration;
                break;

            case BoidState.NORMAL:
                // No timers needed
                break;
        }
    }
}
```

### 9.3 Configuration Consolidation

**Single source of truth:**

```javascript
// physics-config.js
export const PHYSICS_CONFIG = {
    // Force weights
    forces: {
        alignmentWeight: 1.2,
        cohesionWeight: 1.0,
        separationWeight: 0.5,
        scatterMultiplier: 5,
        escapeMultiplier: 2,
        escapeSpeedBoost: 1.2
    },

    // Smoothing
    smoothing: {
        forces: 0.25,        // Single layer (remove FlockManager layer)
        velocity: 0.15,
        deadZone: 0.01
    },

    // Damping
    damping: {
        coefficient: 0.45,   // Or 0.3 from research - needs tuning
        minSpeed: 0.1        // Only apply damping if moving
    },

    // Detection
    detection: {
        maxNeighbors: 8,
        perceptionRadius: 50,
        separationDistance: 0.7,  // * perceptionRadius
        minDistance: 8,

        // Overcrowding escape triggers
        overcrowdingNeighbors: 15,
        overcrowdingForce: 0.25,

        // Oscillation escape triggers
        oscillationReversals: 3,
        oscillationWindow: 6,
        historyLength: 10
    },

    // Timing (in milliseconds)
    timing: {
        scatter: {
            duration: 3000,
            easeOutDuration: 2000,
            individualIntervalMin: 5000,
            individualIntervalMax: 20000,
            individualDurationMin: 1000,
            individualDurationMax: 2500
        },
        escape: {
            durationMin: 1500,
            durationMax: 3000,
            cooldownMin: 3000,
            cooldownMax: 5000,
            angleLow: Math.PI / 4,   // 45 degrees
            angleHigh: Math.PI / 2   // 90 degrees
        },
        independence: {
            checkIntervalMin: 3000,
            checkIntervalMax: 10000,
            durationMin: 2000,
            durationMax: 8000,
            chanceMin: 0.05,
            chanceMax: 0.15
        }
    }
};

// params.js (simulation parameters - from UI)
export const DEFAULT_PARAMS = {
    // Physics
    maxSpeed: 0.5,
    maxForce: 0.1,
    numBoids: 80,

    // Weights (override PHYSICS_CONFIG.forces)
    separationWeight: 0.5,
    alignmentWeight: 1.2,
    cohesionWeight: 1.0,

    // Rendering
    pixelScale: 4,
    trailAlpha: 40,
    audioReactivity: 0.5
};

// Usage:
import { PHYSICS_CONFIG } from './physics-config.js';
import { DEFAULT_PARAMS } from './params.js';

const damping = PHYSICS_CONFIG.damping.coefficient;
const maxSpeed = DEFAULT_PARAMS.maxSpeed;
```

### 9.4 Separation of Concerns

**Current:**
```
simulation-app.js (410 lines):
  - App orchestration ✓
  - Audio setup ✓
  - Rendering setup ✓
  - UI callbacks ✓
  - Scatter state management ✗ (should be in Boid)
  - Scatter physics ✗ (should be in Boid)
  - Individual scatter state ✗ (should be in Boid)
```

**Proposed:**
```
simulation-app.js (250 lines):
  - App orchestration ✓
  - Audio setup ✓
  - Rendering setup ✓
  - UI callbacks ✓
  - Global scatter trigger only (broadcast to boids)

boid.js (400 lines):
  - All physics ✓
  - All state management ✓
  - All behavior logic ✓
  - Scatter state + forces ✓ (moved from app)
  - No rendering ✓
```

**Benefits:**
- Clear ownership: Boid owns all physics and state
- simulation-app.js is thin orchestration layer
- No direct manipulation of boid internals
- Easy to test (Boid is self-contained)

## 10. Priority Recommendations

### 🔴 CRITICAL - Fix Immediately (Impact: Buggy Behavior)

**Issue 1: Scatter Mode Double-Update**
- **File:** `src/apps/simulation-app.js:259-310`
- **Problem:** Scatter adds forces AFTER flock.update(), then manually integrates, causing double-update
- **Impact:** Boids move 2x faster during scatter, bypass damping/detection
- **Fix:** Refactor scatter into force pipeline (see section 9.1)
- **Effort:** 2-3 hours
- **Lines changed:** ~100 (remove manual integration, add to Boid.calculateScatterForce())

**Issue 2: Timing API Inconsistency**
- **Files:** `simulation-app.js` (uses `millis()`), `boid.js` (uses `Date.now()`)
- **Problem:** Different timing sources can drift
- **Impact:** State timing bugs, especially when tab backgrounded
- **Fix:** Unify on single API (recommend `Date.now()` for time, `frameCount` for frames)
- **Effort:** 30 minutes
- **Lines changed:** ~10

### 🟠 HIGH - Fix Soon (Impact: Performance/Quality)

**Issue 3: Force Prioritization Not Implemented**
- **File:** `src/flocking/boid.js:147-149`
- **Problem:** Research recommends separation-based force prioritization, not implemented
- **Impact:** Remaining oscillation when boids too close (force conflicts)
- **Fix:** Add force prioritization logic (see oscillation research document)
- **Effort:** 1 hour
- **Lines changed:** ~30

**Issue 4: Triple-Layer Smoothing**
- **Files:** `flock-manager.js:122`, `boid.js:83`, `boid.js:202`
- **Problem:** Three smoothing layers create 10-20 frame lag
- **Impact:** "Swimming through molasses" feel, phase-shifted oscillation
- **Fix:** Remove FlockManager smoothing layer (keep Boid layers)
- **Effort:** 30 minutes
- **Lines changed:** ~20 (remove/comment out FlockManager smoothing)

**Issue 5: State Management Clarity**
- **File:** `src/flocking/boid.js`
- **Problem:** Three boolean flags (isEscaping, isIndependent, debugOscillation), precedence implicit
- **Impact:** Confusing interactions, potential conflicts with scatter
- **Fix:** Document precedence OR convert to state machine (see section 9.2)
- **Effort:** 1-2 hours (state machine), 15 minutes (documentation only)
- **Lines changed:** ~50 (state machine), ~5 (docs only)

**Issue 6: Individual Scatter State Location**
- **File:** `src/apps/simulation-app.js:41` (parallel array)
- **Problem:** Scatter state stored outside Boid, fragile parallel array
- **Impact:** Maintenance issue, potential index mismatch bugs
- **Fix:** Move individualScatterData into Boid class (part of scatter refactor)
- **Effort:** Included in Issue 1
- **Lines changed:** Included in Issue 1

### 🟡 MEDIUM - Plan for Refactor (Impact: Maintainability)

**Issue 7: Magic Numbers**
- **Files:** Multiple (boid.js, flocking-forces.js, simulation-app.js)
- **Problem:** ~15 hardcoded constants scattered across files
- **Impact:** Hard to tune, no documentation of why values chosen
- **Fix:** Extract to PHYSICS_CONFIG (see section 9.3)
- **Effort:** 1 hour
- **Lines changed:** ~30 (create config) + ~50 (replace usages)

**Issue 8: Frame-Based Timing Assumptions**
- **File:** `src/flocking/boid.js:61` (independence check)
- **Problem:** Frame counter assumes 60fps, breaks on variable frame rates
- **Impact:** Timing incorrect on slow devices (30fps → 2x duration)
- **Fix:** Convert to time-based (`Date.now()` or `deltaTime`)
- **Effort:** 30 minutes
- **Lines changed:** ~10

**Issue 9: Code Duplication**
- **Files:** Edge wrapping (2 locations), physics integration (2 locations)
- **Problem:** Same logic in multiple places, bug fixes need duplication
- **Impact:** Maintenance burden, easy to forget one location
- **Fix:** Extract to helper functions or remove duplicates (scatter refactor fixes integration)
- **Effort:** 30 minutes
- **Lines changed:** ~20

### 🟢 LOW - Nice-to-Have (Impact: Code Quality)

**Issue 10: Parameter Organization**
- **Files:** `koi-params.js` (shape), `simulation-app.js` (physics)
- **Problem:** Parameters split across files
- **Impact:** Inconsistent organization
- **Fix:** Create parallel `physics-params.js` OR consolidate into `params.js`
- **Effort:** 30 minutes
- **Lines changed:** ~50

**Issue 11: JSDoc Completeness**
- **Files:** All
- **Problem:** Some functions have great JSDoc, others missing
- **Impact:** IDE autocomplete inconsistent
- **Fix:** Add JSDoc to all public methods
- **Effort:** 2 hours
- **Lines changed:** ~100

**Issue 12: Naming Inconsistencies**
- **Files:** Multiple
- **Problem:** Some functions use verb prefixes (`calculate*`), others don't
- **Impact:** Minor style inconsistency
- **Fix:** Standardize on verb prefixes for all functions
- **Effort:** 30 minutes
- **Lines changed:** ~20 (renames only)

**Issue 13: Missing Abstractions**
- **Files:** Multiple
- **Problem:** Repeated patterns (vector smoothing, edge wrapping, time checks)
- **Impact:** More code than necessary
- **Fix:** Extract helper functions
- **Effort:** 1 hour
- **Lines changed:** ~50

## 11. Implementation Roadmap

### Phase 1: Critical Fixes (Week 1 - ~6 hours)

**Goal:** Fix buggy behavior, unblock other improvements

1. **[2-3 hours] Refactor scatter mode**
   - Move scatter state into Boid
   - Create `Boid.calculateScatterForce()`
   - Remove manual physics integration from simulation-app.js
   - Integrate scatter into force pipeline
   - Test: Scatter feels consistent with normal physics

2. **[30 min] Unify timing API**
   - Choose: `Date.now()` for time-based, `frameCount` for frame-based
   - Replace all `millis()` with `Date.now()` OR vice versa
   - Document choice in code comment
   - Test: No timing drift issues

3. **[1 hour] Implement force prioritization**
   - Add separation-magnitude-based force weighting (from oscillation research)
   - Test: Reduced oscillation in dense flocks

4. **[30 min] Remove one smoothing layer**
   - Comment out FlockManager smoothing (lines 122-137)
   - OR remove Boid.applyForces smoothing (prefer this)
   - Tune remaining smoothing factors if needed
   - Test: More responsive, less "molasses" feel

5. **[1 hour] Test and validate**
   - Run with 80 boids
   - Trigger scatter, escape, independence
   - Verify no double-updates
   - Verify oscillation reduced
   - Verify timing consistent

**Deliverable:** Stable physics, all behaviors through single pipeline

### Phase 2: High-Priority Improvements (Week 2 - ~4 hours)

**Goal:** Improve code organization and maintainability

6. **[1-2 hours] Implement state machine** (optional - or just document)
   - Option A: Full state machine (BoidState enum, transitions)
   - Option B: Document precedence rules in comments
   - Test: Clear state transitions, no undefined interactions

7. **[1 hour] Extract magic numbers to config**
   - Create `physics-config.js`
   - Define PHYSICS_CONFIG object
   - Replace hardcoded values with config references
   - Document each value with comment

8. **[30 min] Convert frame-based to time-based**
   - Independence check: frame counter → time
   - Test: Correct timing on variable frame rates

9. **[30 min] Remove code duplication**
   - Extract edge wrapping to helper
   - Remove duplicate integration (done in Phase 1)

**Deliverable:** Clean, maintainable codebase

### Phase 3: Polish and Optimization (Week 3 - ~4 hours)

**Goal:** Code quality improvements

10. **[2 hours] Complete JSDoc**
    - Add JSDoc to all public methods
    - Document complex private methods
    - Add @param and @returns for all

11. **[1 hour] Extract helper abstractions**
    - Vector smoothing helper
    - Time-based state helper
    - Force combination helper

12. **[30 min] Standardize naming**
    - Verb prefixes for all functions
    - Consistent parameter object suffixes

13. **[30 min] Final testing and tuning**
    - Test all scenarios
    - Tune damping, smoothing, thresholds
    - Performance profiling

**Deliverable:** Production-ready code

### Testing Checklist

After each phase, verify:

**Functional:**
- [ ] Normal flocking behavior (alignment, cohesion, separation)
- [ ] Scatter mode (both global 'S' and individual)
- [ ] Escape behavior (overcrowding and oscillation triggers)
- [ ] Independence behavior (random solo swimming)
- [ ] Edge wrapping (no boids lost)
- [ ] Audio reactivity (bass affects separation)

**Performance:**
- [ ] 60fps with 80 boids
- [ ] No memory leaks (run for 5 minutes)
- [ ] No frame time spikes

**Code Quality:**
- [ ] No linter errors
- [ ] All JSDoc complete
- [ ] No magic numbers (all in config)
- [ ] No code duplication
- [ ] Single physics pipeline (no bypasses)

## 12. Related Research Context

### From Oscillation Detection Research (2025-10-19)

**Key findings applied to this review:**
- Triple-layer smoothing creates 10-20 frame lag ✓ Confirmed
- Force prioritization recommended but not implemented ✓ Confirmed
- Damping coefficient reduced from 0.3 to 0.15 ✗ Incorrect (code shows 0.45)
- Detection only catches heading reversals ✓ Confirmed (scatter bypasses it)

**Connection to this review:**
- Scatter mode bypassing physics ALSO bypasses oscillation detection
- This means scatter can cause oscillation without being caught
- Fixing scatter (integrate into pipeline) also enables oscillation detection during scatter

### From Animation Jitter Research (2025-10-19)

**Key finding:**
- Smoothing animation RATE (smoothedSpeed) causes accumulation
- Should smooth animation POSITION (waveTime) instead
- Recent commit (e8ec10a) partially fixed this

**Connection to this review:**
- Animation timing separate from physics timing
- Uses `frameCount` (animation) while physics uses `millis()`/`Date.now()`
- This separation is actually GOOD (animation should be frame-synced)
- Timing API unification should EXCLUDE animation (keep animation on frameCount)

**Updated recommendation:**
- Physics timing: Unify on `Date.now()` (time-based state durations)
- Animation timing: Keep `frameCount` (frame-synced visuals)
- Frame-based behaviors: Convert to `Date.now()` (independence checks)

## Code References

### Critical Issues

**Scatter double-update:**
- `src/apps/simulation-app.js:269` - flock.update() call (first update)
- `src/apps/simulation-app.js:272-309` - Manual scatter physics (second update)
- `src/apps/simulation-app.js:289` - boid.acceleration.add() (bypass applyForces)
- `src/apps/simulation-app.js:292` - boid.velocity.add() (duplicate integration)
- `src/apps/simulation-app.js:299` - boid.position.add() (duplicate integration)

**Timing inconsistency:**
- `src/apps/simulation-app.js:158,166,179,210,241` - Uses `millis()`
- `src/flocking/boid.js:133,240,291,306,324,329` - Uses `Date.now()`

### Missing Implementation

**Force prioritization:**
- `src/flocking/boid.js:147-149` - Simple force addition (should be prioritized)
- `research/2025-10-19-oscillation-detection-analysis-and-improvements.md:286-305` - Recommended implementation

### Configuration

**Smoothing:**
- `src/flocking/flock-manager.js:122` - forceSmoothness: 0.3
- `src/flocking/boid.js:83` - forceSmoothing: 0.25
- `src/flocking/boid.js:202` - velocity smoothing: 0.15

**Damping:**
- `src/flocking/boid.js:176` - dampingCoefficient: 0.45

**Detection:**
- `src/flocking/boid.js:92` - deadZoneThreshold: 0.01
- `src/flocking/boid.js:139` - Overcrowding: neighborCount > 15, force > 0.25
- `src/flocking/flocking-forces.js:33` - maxNeighbors: 8

### State Management

**State flags:**
- `src/flocking/boid.js:35` - debugOscillation
- `src/flocking/boid.js:58` - isIndependent
- `src/flocking/boid.js:66` - isEscaping

**State checks:**
- `src/flocking/flock-manager.js:45` - Escape check
- `src/flocking/flock-manager.js:66` - Independence check

## Architecture Documentation

### Current Force Flow (with Scatter Bypass)

```
┌─────────────────────────────────────────────────────┐
│ Frame N                                              │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
    ┌───────────────────────────────────────────────────────────┐
    │ simulation-app.js:269                                     │
    │ flock.update(params)                                      │
    └───────────────────────────────────────────────────────────┘
                        │
                        ▼
    ┌───────────────────────────────────────────────────────────┐
    │ FlockManager.update()                                     │
    │   → Calculate flocking forces                             │
    │   → Smooth 30%                                            │
    │   → Apply weights                                         │
    │   → Boid.applyForces()                                    │
    │     → Smooth 25%                                          │
    │     → Add to acceleration                                 │
    │   → Boid.update()                                         │
    │     → Damping                                             │
    │     → position += velocity        [INTEGRATION #1]       │
    │     → velocity += acceleration                            │
    │     → Smooth velocity 15%                                 │
    │     → acceleration.set(0,0,0)                            │
    └───────────────────────────────────────────────────────────┘
                        │
                        ▼
    ┌───────────────────────────────────────────────────────────┐
    │ simulation-app.js:272-309                                 │
    │ if (scatterMode):                                         │
    │   boid.acceleration.add(scatterForce)  [LINE 289]        │
    │   boid.velocity.add(acceleration)      [LINE 292]        │
    │   boid.position.add(velocity)          [LINE 299]        │
    │                          [INTEGRATION #2] ←─────── BUG!  │
    └───────────────────────────────────────────────────────────┘
```

### Proposed Force Flow (Unified Pipeline)

```
┌─────────────────────────────────────────────────────┐
│ Frame N                                              │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
    ┌───────────────────────────────────────────────────────────┐
    │ Boid.update()                                             │
    │                                                           │
    │ 1. Update state machines                                 │
    │    → updateEscape()                                      │
    │    → updateIndependence()                                │
    │    → updateScatter()           ← Moved into Boid        │
    │                                                           │
    │ 2. Determine state: NORMAL | ESCAPING | SCATTERING       │
    │                                                           │
    │ 3. Calculate forces based on state                       │
    │    → switch (state):                                     │
    │        case ESCAPING: escapeForce                        │
    │        case SCATTERING: scatterForce + reduced flocking  │
    │        case INDEPENDENT: zero force                      │
    │        case NORMAL: full flocking                        │
    │                                                           │
    │ 4. applyForces(forces)                                   │
    │    → Smooth all forces (single layer, 25%)              │
    │    → Apply dead-zone filter                              │
    │    → Prioritize forces (separation > scatter > align)    │
    │    → Accumulate into acceleration                        │
    │                                                           │
    │ 5. integratePhysics()                                    │
    │    → Derivative damping                                  │
    │    → position += velocity      [SINGLE INTEGRATION]     │
    │    → velocity += acceleration                            │
    │    → Smooth velocity (15%)                               │
    │                                                           │
    │ 6. detectOscillation()                                   │
    │    → Check heading reversals                             │
    │    → Trigger escape if needed                            │
    │                                                           │
    │ 7. edges()                                               │
    │    → Wrap around boundaries                              │
    └───────────────────────────────────────────────────────────┘

        ✓ Single update path
        ✓ All forces smoothed
        ✓ All behaviors use damping
        ✓ Oscillation detection works for all behaviors
        ✓ No double-integration
```

### State Machine Diagram

```
Current (Implicit):

isEscaping?  ─yes→ Apply escape force
    │
    no
    │
    ▼
isIndependent? ─yes→ Apply zero force
    │
    no
    │
    ▼
Normal flocking

[Scatter is OUTSIDE this tree - applies regardless]


Proposed (Explicit):

    ╔════════════╗
    ║   NORMAL   ║ ←─────────────┐
    ╚════════════╝                │
         │  │  ↑                  │
 random  │  │  │  timer           │
  timer  │  │  │  expires         │
         ↓  │  │                  │
    ╔════════════╗                │
    ║INDEPENDENT ║                │
    ╚════════════╝                │
         │     ↑                  │
         │ forces│                │
    high │     │                  │
   forces│     │cooldown          │
         ↓     │                  │
    ╔════════════╗                │
    ║  ESCAPING  ║────────────────┘
    ╚════════════╝   duration
                      expires

[SCATTERING is global override - temporarily modifies force mix in ANY state]
```

## Tradeoffs Analysis

### Single vs Multiple Update Paths

**Current (multiple paths):**
- Pros: Easy to add new behaviors (just add another if)
- Cons: Hard to maintain (need to update all paths), bugs (double-update), inconsistent (some bypass damping)

**Proposed (single path):**
- Pros: Consistent behavior, all forces benefit from smoothing/damping, easier to test, no bypasses
- Cons: Requires refactoring existing code, need to think about state priority

**Recommendation:** Single path - benefits outweigh costs.

### State Machine vs Boolean Flags

**Boolean flags (current):**
- Pros: Simple, easy to add new flag, independent (can check any combination)
- Cons: Precedence unclear, combinations undefined, hard to debug (which flag won?)

**State machine (proposed):**
- Pros: Clear precedence (enum order), exhaustive (all cases covered), easy to debug (single state)
- Cons: More code, harder to allow simultaneous states (e.g., escaping while independent)

**Recommendation:** State machine for primary behavior states, keep booleans for debug flags.

### Time-Based vs Frame-Based

**Frame-based:**
- Pros: Synchronized with animation, consistent on fixed frame rate, simple (just increment counter)
- Cons: Breaks on variable frame rate, assumes 60fps, not real-time

**Time-based:**
- Pros: Accurate real-time durations, frame-rate independent, works when tab backgrounded
- Cons: Slightly more complex (need Date.now() or deltaTime), can drift from animation

**Recommendation:**
- Animation: frame-based (`frameCount`) ✓
- Physics state durations: time-based (`Date.now()`) ✓
- Independence checks: time-based (not frame-based) ✗ Currently frame-based

### Smoothing Layers: 1 vs 2 vs 3

**3 layers (current):**
- Lag: 10-20 frames (167-333ms)
- Pros: Very smooth, no high-frequency jitter
- Cons: Too smooth, "molasses" feel, phase-shifted oscillation

**2 layers (proposed):**
- Lag: 5-10 frames (83-167ms)
- Pros: Balanced smoothness and responsiveness
- Cons: Slight jitter may be visible

**1 layer:**
- Lag: 2-4 frames (33-67ms)
- Pros: Very responsive
- Cons: Higher jitter, may need stronger damping

**Recommendation:** 2 layers (force smoothing 25%, velocity smoothing 15%) with stronger damping (0.45).

## Open Questions

1. **Should scatter override escape?**
   - Current: Undefined (scatter happens after escape in app code)
   - Proposed: Escape has higher priority (escape overrides scatter)
   - Alternative: Scatter cancels escape (scatter is global emergency)
   - Needs design decision

2. **Should independent boids be affected by scatter?**
   - Current: Yes (scatter happens after independence check)
   - Proposed: No (independence means "ignore all social behaviors")
   - Alternative: Reduced (scatter at 50% intensity for independent boids)
   - Needs design decision

3. **What is the correct damping coefficient?**
   - Code has 0.45 (boid.js:176)
   - Oscillation research recommended 0.3 (minimum)
   - Research said "increase to 0.5 if still oscillating"
   - Current 0.45 is middle ground - why chosen? Needs testing

4. **Should we remove FlockManager smoothing or Boid smoothing?**
   - Option A: Remove FlockManager (keep forces pure, smooth once in Boid)
   - Option B: Remove Boid applyForces smoothing (smooth early, then just apply)
   - Option A is cleaner (FlockManager calculates pure forces)
   - Option B is more efficient (smooth once per flock, not per boid)
   - Needs performance testing

5. **Should animation use smoothedSpeed or smoothedWaveTime?**
   - Animation research says smoothedWaveTime (smooth position, not rate)
   - But code still has smoothedSpeed calculation (boid.js:205-243)
   - Recent commit may have made this obsolete
   - Needs verification - can smoothedSpeed code be removed?

## Next Steps

Based on this comprehensive research, the recommended next steps are:

### Immediate (This Week)
1. ✅ Complete this research document
2. Implement Phase 1 critical fixes (scatter refactor, timing unification)
3. Validate no regressions with extensive testing

### Short-term (Next 2 Weeks)
4. Implement Phase 2 improvements (state management, config extraction)
5. Update documentation with new architecture
6. Performance profiling and tuning

### Long-term (Next Month)
7. Implement Phase 3 polish (JSDoc, helpers, naming)
8. Consider additional features (adaptive smoothing, predictive steering from research)
9. Refactor for potential future behaviors (predator avoidance, food seeking, etc.)

---

**Total estimated effort:**
- Phase 1 (critical): 6 hours
- Phase 2 (high-priority): 4 hours
- Phase 3 (polish): 4 hours
- **Total: 14 hours** to fully refactor to production quality

**Expected outcomes:**
- **After Phase 1:** Stable physics, no double-updates, consistent behavior
- **After Phase 2:** Clean architecture, maintainable code, easy to extend
- **After Phase 3:** Production-ready, well-documented, performant

---

*This research provides a comprehensive code quality and architecture review of the koi flocking simulation. The primary issues are: (1) scatter mode bypassing normal physics causing double-update, (2) timing API inconsistency between app and boids, (3) missing force prioritization from oscillation research, (4) excessive smoothing creating lag. The recommended fix priority is: refactor scatter into force pipeline, unify timing API, implement force prioritization, reduce smoothing layers. These changes will create a single, consistent physics pipeline where all forces flow through proper smoothing, damping, and oscillation detection.*
