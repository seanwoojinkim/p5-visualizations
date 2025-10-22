---
doc_type: research
date: 2025-10-20T00:49:24+00:00
title: "Koi Movement and Direction Change Implementation Analysis"
research_question: "How are koi movement, velocity, and direction changes currently implemented, and where would changes need to be made to add realistic turning behavior (where turning radius depends on forward speed)?"
researcher: Sean Kim

git_commit: 9286bf16eb2890dfeae2bd769b33fb82923ea6ab
branch: main
repository: visualizations

created_by: Sean Kim
last_updated: 2025-10-19
last_updated_by: Sean Kim

tags:
  - koi
  - movement
  - physics
  - boids
  - flocking
  - turning
  - steering
  - velocity
  - acceleration
status: draft

related_docs: []
---

# Research: Koi Movement and Direction Change Implementation Analysis

**Date**: 2025-10-19T16:49:24-08:00
**Researcher**: Sean Kim
**Git Commit**: 9286bf16eb2890dfeae2bd769b33fb82923ea6ab
**Branch**: main
**Repository**: visualizations

## Research Question

How are koi movement, velocity, and direction changes currently implemented in this codebase? Specifically:
1. Where and how is koi movement/velocity calculated?
2. How are direction changes currently handled (instantaneous or gradual)?
3. What physics properties exist (velocity, acceleration, turning rate, etc.)?
4. How do steering behaviors or flocking algorithms handle direction changes?
5. What smoothing or interpolation mechanisms exist?

The goal is to understand the current implementation to identify where changes would need to be made to add realistic turning behavior where koi must move forward to turn, rather than rotating instantaneously (i.e., turning radius depends on forward speed).

## Summary

The koi flocking simulation implements a **classical boids algorithm with extensive smoothing mechanisms** to create graceful, fish-like movement. Direction changes are currently **gradual but not physically realistic** - koi can change direction while maintaining constant speed, rather than requiring forward momentum to turn.

**Key Findings:**

1. **Direction changes are smooth but instantaneous** - Velocity vector can rotate without constraint
2. **No turning radius physics** - Current heading can change independent of forward speed
3. **Multiple smoothing layers** reduce jerkiness but don't enforce realistic turning mechanics
4. **Derivative damping exists** but only resists rapid heading changes, doesn't enforce turn radius
5. **All physics calculations use vector-based steering** - No separation of heading vs velocity magnitude

**Where to Make Changes:**

To add realistic turning (where turning radius depends on forward speed), modifications are needed in:
- `Boid.update()` method (flocking/src/flocking/boid.js:219-329)
- Velocity calculation to separate heading rotation from speed
- New physics constraint: maximum angular velocity based on linear speed

## Detailed Findings

### 1. Movement and Velocity Calculation

#### Core Physics Properties (boid.js:21-26)

```javascript
// Physics
this.position = createVectorFunc(randomFunc(width), randomFunc(height));
this.velocity = p5Instance.Vector.random2D();
this.velocity.setMag(randomFunc(0.5, 1.5));
this.acceleration = createVectorFunc();
this.perceptionRadius = PHYSICS_CONFIG.PERCEPTION_RADIUS;
```

**Location**: `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:21-26`

**Properties:**
- `position` - Current location (x, y vector)
- `velocity` - Current velocity (x, y vector) - combines speed AND direction
- `acceleration` - Applied forces from flocking behaviors (x, y vector)
- `perceptionRadius` - How far boid can "see" neighbors (50 pixels)

**Critical Observation**: Velocity is a 2D vector that inherently combines both speed (magnitude) and direction (angle). There's no separate `heading` property or `angularVelocity` - direction changes happen by modifying the velocity vector directly.

#### Velocity Update (boid.js:255-276)

```javascript
this.position.add(this.velocity);

// Smooth velocity changes - creates more fluid, graceful movement
let targetVelocity = p5.Vector.add(this.velocity, this.acceleration);

// Apply individual speed variation and audio modulation
const audioSpeedMult = 1 + audioAmplitude * audioReactivity;
let individualMaxSpeed = maxSpeed * this.speedMultiplier * audioSpeedMult;

// During scatter, increase max speed
const scatterIntensity = this.getScatterIntensity();
if (scatterIntensity > 0) {
    const scatterSpeedMult = 1 + (PHYSICS_CONFIG.SCATTER_SPEED_BOOST * scatterIntensity);
    individualMaxSpeed *= scatterSpeedMult;
}

targetVelocity.limit(individualMaxSpeed);

// Smoothly interpolate from current velocity to target velocity
const smoothing = PHYSICS_CONFIG.VELOCITY_SMOOTHING;
this.velocity.lerp(targetVelocity, smoothing);
```

**Location**: `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:255-276`

**How it works:**
1. Calculate `targetVelocity = currentVelocity + acceleration`
2. Limit target velocity magnitude to `maxSpeed` (clamped)
3. Lerp current velocity toward target: `velocity = velocity * 0.85 + targetVelocity * 0.15`
4. Update position: `position += velocity`

**Critical Finding**: The `lerp()` operation smooths velocity changes but doesn't distinguish between speed changes and direction changes. A boid can rotate its velocity vector 90 degrees while maintaining the same speed - there's **no constraint on turning radius**.

#### Individual Speed Variation (boid.js:52-53)

```javascript
// Speed variation - each koi has its own preferred speed around the global max
this.speedMultiplier = randomFunc(0.6, 1.3);
```

**Location**: `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:52-53`

Each koi has a unique speed multiplier (60%-130% of base), creating natural variation in the flock.

### 2. Direction Change Mechanisms

#### Current Heading Calculation (boid.js:232, 324)

Direction is derived from velocity, not stored separately:

```javascript
const currentHeading = this.velocity.heading();
```

**Location**: `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:232`

**What `heading()` does**: Returns the angle of the velocity vector in radians (atan2(y, x))

**Implication**: Direction changes happen automatically when velocity vector changes - there's no separate angular physics.

#### Direction Change Process

Current flow:
```
Flocking forces calculated (alignment, cohesion, separation)
    ↓
Forces added to acceleration
    ↓
Acceleration added to velocity
    ↓
Velocity magnitude limited (speed cap)
    ↓
Velocity lerped toward target (smoothing)
    ↓
Heading = atan2(velocity.y, velocity.x)
```

**Critical Observation**: At no point is there a constraint on how fast the heading can change. The only limit is:
1. Maximum force magnitude (limits acceleration)
2. Velocity smoothing (lerp at 15% per frame)

Neither of these enforces a relationship between speed and turning radius.

#### Derivative Damping (boid.js:231-253)

The codebase implements a **damping force to resist rapid heading changes**:

```javascript
// DERIVATIVE DAMPING (PID D-term) - resist rapid heading changes
const currentHeading = this.velocity.heading();
let headingChange = currentHeading - this.previousHeading;

// Normalize angle difference to -PI to PI range
while (headingChange > Math.PI) headingChange -= Math.PI * 2;
while (headingChange < -Math.PI) headingChange += Math.PI * 2;

// Calculate damping force perpendicular to velocity
const dampingCoefficient = PHYSICS_CONFIG.DAMPING_COEFFICIENT;
const speed = this.velocity.mag();

if (speed > PHYSICS_CONFIG.MIN_SPEED_FOR_DAMPING) {
    // Damping force magnitude opposes heading change
    const dampingMagnitude = headingChange * -dampingCoefficient * speed;

    // Apply perpendicular to current velocity direction
    const perpAngle = currentHeading + Math.PI / 2;
    const dampingForce = p5.Vector.fromAngle(perpAngle, dampingMagnitude);

    // Add damping to acceleration
    this.acceleration.add(dampingForce);
}
```

**Location**: `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:231-253`

**How it works:**
- Tracks heading change per frame
- Applies a force perpendicular to velocity that opposes the rotation
- Force magnitude = `headingChange * dampingCoefficient * speed`
- Stronger damping at higher speeds (partially simulates turn radius!)

**Configuration**:
- `DAMPING_COEFFICIENT: 0.45` (physics-config.js:16)
- `MIN_SPEED_FOR_DAMPING: 0.1` (physics-config.js:17)

**Critical Analysis**: This is the **closest existing mechanism to realistic turning physics**. However:
- It only *resists* rapid turns, doesn't *prevent* them
- Damping is proportional to speed, which gives faster fish more resistance
- But it's still possible to rotate in place at low speeds
- No hard constraint on minimum turning radius

#### Escape Maneuver (boid.js:375-391)

When oscillation detected, boid picks a new direction:

```javascript
triggerEscapeManeuver(randomFunc) {
    this.isEscaping = true;
    this.escapeEndTime = Date.now() + randomFunc(
        PHYSICS_CONFIG.ESCAPE_DURATION_MIN,
        PHYSICS_CONFIG.ESCAPE_DURATION_MAX
    );

    // Pick a direction at configured angle offset away from current heading
    const currentHeading = this.velocity.heading();
    const angleOffset = randomFunc(
        PHYSICS_CONFIG.ESCAPE_ANGLE_MIN,
        PHYSICS_CONFIG.ESCAPE_ANGLE_MAX
    );
    const direction = randomFunc() > 0.5 ? 1 : -1;

    this.escapeDirection = currentHeading + (angleOffset * direction);
}
```

**Location**: `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:375-391`

**Configuration**:
- `ESCAPE_ANGLE_MIN: Math.PI / 4` (45 degrees)
- `ESCAPE_ANGLE_MAX: Math.PI / 2` (90 degrees)

**Critical Finding**: Escape can instantly set a target heading 45-90 degrees from current heading. The boid steers toward this new heading, but there's no physical constraint preventing sharp turns.

### 3. Physics Properties and Configuration

#### Physics Constants (physics-config.js)

```javascript
export const PHYSICS_CONFIG = {
    // Force Smoothing
    FORCE_SMOOTHING: 0.25,          // Blend current/previous forces
    VELOCITY_SMOOTHING: 0.15,       // Velocity interpolation
    DEAD_ZONE_THRESHOLD: 0.01,      // Ignore tiny forces

    // Damping
    DAMPING_COEFFICIENT: 0.45,      // Resistance to turning
    MIN_SPEED_FOR_DAMPING: 0.1,     // Only damp when moving

    // Perception
    PERCEPTION_RADIUS: 50,          // Neighbor detection range

    // Force Prioritization (when crowded)
    SEPARATION_HIGH_THRESHOLD: 0.05,
    SEPARATION_MED_THRESHOLD: 0.02,

    // Overcrowding Escape
    OVERCROWDING_NEIGHBOR_LIMIT: 15,
    OVERCROWDING_FORCE_LIMIT: 0.25,

    // Oscillation Detection
    OSCILLATION_HISTORY_LENGTH: 10,
    OSCILLATION_CHECK_LENGTH: 6,
    OSCILLATION_REVERSAL_THRESHOLD: 3,
};
```

**Location**: `/Users/seankim/dev/visualizations/flocking/src/flocking/physics-config.js`

**Relevant Properties for Turning:**
- `DAMPING_COEFFICIENT: 0.45` - Controls turn resistance
- `VELOCITY_SMOOTHING: 0.15` - How fast velocity converges (affects turn rate)
- `FORCE_SMOOTHING: 0.25` - How fast forces change (affects turn initiation)

**Missing Properties:**
- No `MAX_ANGULAR_VELOCITY` property
- No `MIN_TURN_RADIUS` property
- No separation of linear vs angular motion

#### Runtime Parameters (from sketch.js)

```javascript
let params = {
    pixelScale: 4,
    numBoids: 80,
    maxSpeed: 1,              // Maximum velocity magnitude
    maxForce: 0.1,            // Maximum acceleration magnitude
    separationWeight: 1.2,
    alignmentWeight: 1.2,
    cohesionWeight: 1.0,
    trailAlpha: 40,
    audioReactivity: 0.5
};
```

**Relevant Parameters:**
- `maxSpeed: 1` - Caps velocity magnitude (controls max linear speed)
- `maxForce: 0.1` - Caps acceleration magnitude (limits how fast velocity can change)

**Critical Finding**: `maxForce` limits how fast velocity can change in magnitude OR direction, but doesn't distinguish between them. A boid moving at maxSpeed can still apply maxForce perpendicular to its motion, allowing sharp turns.

### 4. Steering Behaviors and Flocking Forces

#### Force Calculation (flocking-forces.js)

Three classical boids forces:

**Alignment** (flocking-forces.js:50-64):
```javascript
export function calculateAlignment(boid, neighbors, maxSpeed, maxForce, createVector) {
    let steering = createVector();

    if (neighbors.length === 0) return steering;

    for (let other of neighbors) {
        steering.add(other.velocity);
    }

    steering.div(neighbors.length);
    steering.setMag(maxSpeed);
    steering.sub(boid.velocity);
    steering.limit(maxForce);

    return steering;
}
```

**How it works**: Steers toward average velocity of neighbors
- Calculates average neighbor velocity
- Converts to desired velocity (magnitude = maxSpeed)
- Steering force = desired - current
- Limited to maxForce

**Cohesion** (flocking-forces.js:77-92):
```javascript
export function calculateCohesion(boid, neighbors, maxSpeed, maxForce, createVector) {
    let steering = createVector();

    if (neighbors.length === 0) return steering;

    for (let other of neighbors) {
        steering.add(other.position);
    }

    steering.div(neighbors.length);
    steering.sub(boid.position);
    steering.setMag(maxSpeed);
    steering.sub(boid.velocity);
    steering.limit(maxForce);

    return steering;
}
```

**How it works**: Steers toward center of mass of neighbors
- Calculates average neighbor position
- Direction from current position to center
- Converted to steering force

**Separation** (flocking-forces.js:107-139):
```javascript
export function calculateSeparation(boid, neighbors, perceptionRadius, maxSpeed, maxForce, createVector, p5) {
    let steering = createVector();
    let total = 0;

    for (let other of neighbors) {
        let d = dist(
            boid.position.x, boid.position.y,
            other.position.x, other.position.y
        );

        if (d < perceptionRadius * 0.7) {
            let diff = p5.Vector.sub(boid.position, other.position);

            // Prevent extreme forces when very close - cap minimum distance
            const minDist = 8;
            if (d < minDist) d = minDist;

            diff.div(d * d); // Weight by distance squared
            steering.add(diff);
            total++;
        }
    }

    if (total > 0) {
        steering.div(total);
        steering.setMag(maxSpeed);
        steering.sub(boid.velocity);
        steering.limit(maxForce);
    }

    return steering;
}
```

**How it works**: Steers away from nearby neighbors
- Inverse square law: closer neighbors = stronger repulsion
- Only applies within 70% of perception radius
- Minimum distance clamp prevents extreme forces

**Critical Observation**: All three forces produce steering vectors that can point in ANY direction relative to current velocity. There's no constraint preventing 90-degree or even 180-degree steering forces.

#### Force Application (boid.js:119-207)

Forces are smoothed and prioritized before application:

```javascript
applyForces(forces, neighborCount = 0, randomFunc = Math.random, maxForce = 0.1, p5 = null) {
    // Smooth forces by blending with previous frame
    const forceSmoothing = PHYSICS_CONFIG.FORCE_SMOOTHING;

    const smoothedAlignment = this.previousAlignment.copy().lerp(forces.alignment, forceSmoothing);
    const smoothedCohesion = this.previousCohesion.copy().lerp(forces.cohesion, forceSmoothing);
    const smoothedSeparation = this.previousSeparation.copy().lerp(forces.separation, forceSmoothing);

    // Dead zone: ignore very small forces
    const deadZoneThreshold = PHYSICS_CONFIG.DEAD_ZONE_THRESHOLD;

    if (smoothedAlignment.mag() < deadZoneThreshold) smoothedAlignment.set(0, 0);
    if (smoothedCohesion.mag() < deadZoneThreshold) smoothedCohesion.set(0, 0);
    if (smoothedSeparation.mag() < deadZoneThreshold) smoothedSeparation.set(0, 0);

    // FORCE PRIORITIZATION - when crowded, separation dominates
    const separationMag = smoothedSeparation.mag();

    let alignmentWeight = 1.0;
    let cohesionWeight = 1.0;
    let separationWeight = 1.0;

    if (separationMag > PHYSICS_CONFIG.SEPARATION_HIGH_THRESHOLD) {
        separationWeight = PHYSICS_CONFIG.PRIORITIZE_HIGH.separation; // 0.9
        alignmentWeight = PHYSICS_CONFIG.PRIORITIZE_HIGH.alignment;   // 0.1
        cohesionWeight = PHYSICS_CONFIG.PRIORITIZE_HIGH.cohesion;     // 0.1
    }

    // Apply weighted forces to acceleration
    this.acceleration.add(smoothedAlignment.mult(alignmentWeight));
    this.acceleration.add(smoothedCohesion.mult(cohesionWeight));
    this.acceleration.add(smoothedSeparation.mult(separationWeight));
}
```

**Location**: `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:119-207`

**Force Smoothing Process:**
1. Lerp each force with previous frame's force (25% new, 75% old)
2. Apply dead zone to ignore tiny forces (< 0.01)
3. Prioritize separation when crowded
4. Add all weighted forces to acceleration

**Critical Finding**: Force smoothing reduces jerkiness but doesn't constrain turn radius. Forces can still request arbitrary direction changes - smoothing just makes the changes more gradual.

### 5. Smoothing and Interpolation Mechanisms

The codebase has **three layers of smoothing**:

#### Layer 1: Force Smoothing (boid.js:122-140)

```javascript
// Smooth forces by blending with previous frame
const forceSmoothing = PHYSICS_CONFIG.FORCE_SMOOTHING; // 0.25

const smoothedAlignment = this.previousAlignment.copy().lerp(forces.alignment, forceSmoothing);
const smoothedCohesion = this.previousCohesion.copy().lerp(forces.cohesion, forceSmoothing);
const smoothedSeparation = this.previousSeparation.copy().lerp(forces.separation, forceSmoothing);
```

**Effect**: Forces change gradually over time (25% new force per frame)
- Prevents sudden acceleration spikes
- Creates momentum-like behavior in force application
- Still doesn't enforce turn radius

#### Layer 2: Velocity Smoothing (boid.js:274-276)

```javascript
// Smoothly interpolate from current velocity to target velocity
const smoothing = PHYSICS_CONFIG.VELOCITY_SMOOTHING; // 0.15
this.velocity.lerp(targetVelocity, smoothing);
```

**Effect**: Velocity changes gradually (15% toward target per frame)
- Prevents sudden speed/direction changes
- Creates "swimming through water" feel
- Makes turns feel smooth but doesn't physically constrain them

#### Layer 3: Derivative Damping (boid.js:231-253)

```javascript
// DERIVATIVE DAMPING (PID D-term) - resist rapid heading changes
const currentHeading = this.velocity.heading();
let headingChange = currentHeading - this.previousHeading;

const dampingCoefficient = PHYSICS_CONFIG.DAMPING_COEFFICIENT; // 0.45
const dampingMagnitude = headingChange * -dampingCoefficient * speed;

const perpAngle = currentHeading + Math.PI / 2;
const dampingForce = p5.Vector.fromAngle(perpAngle, dampingMagnitude);

this.acceleration.add(dampingForce);
```

**Effect**: Resists rapid heading changes (proportional to speed)
- Faster fish have more turn resistance
- Mimics angular momentum
- **Closest to realistic turn physics** but still allows unrealistic turns

#### Dead Zone Filtering (boid.js:131-135)

```javascript
const deadZoneThreshold = PHYSICS_CONFIG.DEAD_ZONE_THRESHOLD; // 0.01

if (smoothedAlignment.mag() < deadZoneThreshold) smoothedAlignment.set(0, 0);
if (smoothedCohesion.mag() < deadZoneThreshold) smoothedCohesion.set(0, 0);
if (smoothedSeparation.mag() < deadZoneThreshold) smoothedSeparation.set(0, 0);
```

**Effect**: Ignores tiny forces to prevent micro-oscillations
- Prevents jitter from near-zero forces
- Creates "dead band" where no force is applied
- Improves stability but doesn't affect turning physics

### 6. Current vs Realistic Turning Behavior

#### Current Behavior

**What happens now:**
1. Flocking forces can request any direction change
2. Forces are smoothed (25% per frame)
3. Acceleration added to velocity
4. Velocity smoothed (15% per frame)
5. Derivative damping resists rapid heading changes
6. Result: Smooth but unconstrained turns

**Example scenario:**
- Koi moving north at speed 1.0
- Cohesion force points east (90-degree turn)
- Over ~10 frames, koi smoothly curves from north to east
- **Turn radius is independent of speed**

**At low speed:**
- Koi can rotate nearly in place
- Small turn radius even at minimal speed

**At high speed:**
- Same turn radius as low speed
- No increase in turn radius with speed

#### Realistic Turning Behavior

**What should happen (realistic physics):**
1. Turning radius = speed / max_angular_velocity
2. Faster movement = wider turns
3. Slower movement = tighter turns
4. Cannot rotate in place without forward movement

**Example scenario:**
- Koi moving north at speed 1.0
- Cohesion force points east (90-degree turn)
- Koi cannot turn directly east - must follow curved path
- Turn radius = 1.0 / max_angular_velocity
- Takes longer to complete 90-degree turn at high speed

**Physics equations:**
```
angular_velocity = min(requested_turn_rate, max_angular_velocity)
max_angular_velocity = K * speed  (where K is turn tightness constant)
heading += angular_velocity * dt
velocity = speed * [cos(heading), sin(heading)]
```

### 7. Where Changes Need to Be Made

To implement realistic turning (where turn radius depends on forward speed), modifications are needed in **three key locations**:

#### Location 1: Boid Class - Add Heading Property (boid.js:20-26)

**Current:**
```javascript
this.position = createVectorFunc(randomFunc(width), randomFunc(height));
this.velocity = p5Instance.Vector.random2D();
this.velocity.setMag(randomFunc(0.5, 1.5));
this.acceleration = createVectorFunc();
```

**Needed:**
```javascript
this.position = createVectorFunc(randomFunc(width), randomFunc(height));
this.heading = randomFunc(0, Math.PI * 2);  // NEW: separate heading property
this.speed = randomFunc(0.5, 1.5);          // NEW: separate speed property
this.velocity = p5Instance.Vector.fromAngle(this.heading, this.speed); // Derived
this.acceleration = createVectorFunc();
this.angularVelocity = 0;                   // NEW: rate of heading change
```

**Why**: Separate heading from velocity to independently control rotation and speed.

#### Location 2: Boid.update() - Replace Velocity Lerp (boid.js:255-276)

**Current approach:**
```javascript
this.position.add(this.velocity);

let targetVelocity = p5.Vector.add(this.velocity, this.acceleration);
targetVelocity.limit(individualMaxSpeed);

const smoothing = PHYSICS_CONFIG.VELOCITY_SMOOTHING;
this.velocity.lerp(targetVelocity, smoothing);
```

**Needed approach:**
```javascript
// Calculate desired heading from acceleration
const desiredHeading = this.acceleration.heading();
const currentHeading = this.heading;

// Calculate angular difference
let headingDiff = desiredHeading - currentHeading;
while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;

// Apply angular velocity constraint (turn radius physics)
const maxAngularVelocity = PHYSICS_CONFIG.MAX_TURN_RATE * this.speed;
const requestedAngularVelocity = headingDiff * PHYSICS_CONFIG.TURN_RESPONSIVENESS;
this.angularVelocity = constrain(requestedAngularVelocity, -maxAngularVelocity, maxAngularVelocity);

// Update heading
this.heading += this.angularVelocity;

// Calculate speed change from acceleration
const speedChange = this.acceleration.mag();
this.speed += speedChange;
this.speed = constrain(this.speed, 0, individualMaxSpeed);

// Update velocity from heading and speed
this.velocity = p5.Vector.fromAngle(this.heading, this.speed);

// Update position
this.position.add(this.velocity);
```

**Why**: Separates heading rotation (constrained by angular velocity) from speed changes (constrained by linear acceleration).

#### Location 3: Physics Config - Add Turn Radius Constants (physics-config.js)

**Current:**
```javascript
export const PHYSICS_CONFIG = {
    DAMPING_COEFFICIENT: 0.45,
    // ... other constants
};
```

**Needed:**
```javascript
export const PHYSICS_CONFIG = {
    DAMPING_COEFFICIENT: 0.45,

    // NEW: Turn radius physics
    MAX_TURN_RATE: 0.05,           // Radians per frame at speed=1.0
    MIN_TURN_RADIUS: 20,            // Minimum turn radius in pixels
    TURN_RESPONSIVENESS: 0.3,       // How quickly to reach desired heading
    ANGULAR_DAMPING: 0.7,           // Damping on angular velocity

    // ... other constants
};
```

**Why**: Provides tunable parameters for turn radius physics.

### 8. Implementation Strategy

#### Option A: Minimal Change (Add Angular Constraint to Existing System)

Keep vector-based velocity but add post-processing constraint:

```javascript
// After velocity.lerp() in update()
const currentSpeed = this.velocity.mag();
const currentHeading = this.velocity.heading();
const previousHeading = this.previousVelocity.heading();

let headingChange = currentHeading - previousHeading;
while (headingChange > Math.PI) headingChange -= Math.PI * 2;
while (headingChange < -Math.PI) headingChange += Math.PI * 2;

// Constrain heading change based on speed
const maxAngularChange = PHYSICS_CONFIG.MAX_TURN_RATE * currentSpeed;
const constrainedChange = constrain(headingChange, -maxAngularChange, maxAngularChange);

// Apply constrained heading
const constrainedHeading = previousHeading + constrainedChange;
this.velocity = p5.Vector.fromAngle(constrainedHeading, currentSpeed);
```

**Pros**: Minimal code changes, works with existing flocking forces
**Cons**: Velocity still stored as vector, less intuitive physics

#### Option B: Full Separation (Heading + Speed Properties)

Restructure to separate heading and speed:

**Benefits:**
- Clean physics separation
- Easier to tune turn radius
- Can add features like drift (velocity ≠ heading)
- More realistic fish physics

**Drawbacks:**
- Larger code refactor
- Need to update all velocity references
- Flocking forces need recalculation

#### Option C: Hybrid (Velocity Vector + Angular Constraint)

Keep velocity vector but add separate heading tracking:

```javascript
// In constructor
this.heading = this.velocity.heading();

// In update()
const desiredHeading = targetVelocity.heading();
let headingDiff = desiredHeading - this.heading;
// ... normalize to -PI to PI

const maxAngularVel = PHYSICS_CONFIG.MAX_TURN_RATE * this.velocity.mag();
const angularVel = constrain(headingDiff * 0.3, -maxAngularVel, maxAngularVel);
this.heading += angularVel;

// Reconstruct velocity with constrained heading
const speed = targetVelocity.mag();
this.velocity = p5.Vector.fromAngle(this.heading, speed);
```

**Pros**: Moderate refactor, keeps most existing code working
**Cons**: Redundant state (velocity and heading)

## Code References

### Movement and Velocity
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:21-26` - Physics properties initialization
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:255-276` - Velocity update and smoothing
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:52-53` - Individual speed variation

### Direction Changes
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:232` - Heading calculation from velocity
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:231-253` - Derivative damping (turn resistance)
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:375-391` - Escape maneuver direction change

### Physics Configuration
- `/Users/seankim/dev/visualizations/flocking/src/flocking/physics-config.js` - All physics constants
- `/Users/seankim/dev/visualizations/flocking/src/flocking/physics-config.js:16-17` - Damping parameters

### Flocking Forces
- `/Users/seankim/dev/visualizations/flocking/src/flocking/flocking-forces.js:50-64` - Alignment calculation
- `/Users/seankim/dev/visualizations/flocking/src/flocking/flocking-forces.js:77-92` - Cohesion calculation
- `/Users/seankim/dev/visualizations/flocking/src/flocking/flocking-forces.js:107-139` - Separation calculation

### Force Application
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:119-207` - Force smoothing and prioritization
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:122-140` - Force smoothing implementation
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:131-135` - Dead zone filtering

### Smoothing Mechanisms
- `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js:274-276` - Velocity lerp smoothing
- `/Users/seankim/dev/visualizations/flocking/src/flocking/physics-config.js:9-12` - Smoothing constants

## Architecture Documentation

### Current Movement Architecture

```
Flocking Forces (alignment, cohesion, separation)
    ↓
Force Smoothing (25% new, 75% old) [Layer 1]
    ↓
Dead Zone Filter (ignore forces < 0.01)
    ↓
Force Prioritization (separation dominates when crowded)
    ↓
Acceleration = Σ(weighted forces)
    ↓
Target Velocity = Current Velocity + Acceleration
    ↓
Limit Target Velocity Magnitude (maxSpeed)
    ↓
Velocity Smoothing (15% toward target) [Layer 2]
    ↓
Derivative Damping (resist rapid heading changes) [Layer 3]
    ↓
Position += Velocity
    ↓
Heading = atan2(Velocity.y, Velocity.x) [derived]
```

**Key Characteristic**: Direction and speed are coupled in velocity vector. No hard constraint on turn radius.

### Proposed Realistic Turn Architecture

```
Flocking Forces (alignment, cohesion, separation)
    ↓
Force Smoothing (25% new, 75% old)
    ↓
Acceleration = Σ(weighted forces)
    ↓
Desired Heading = atan2(Acceleration.y, Acceleration.x)
    ↓
Angular Difference = Desired Heading - Current Heading
    ↓
MAX Angular Velocity = MAX_TURN_RATE * Current Speed  ← NEW CONSTRAINT
    ↓
Constrain Angular Velocity to Max
    ↓
Heading += Angular Velocity
    ↓
Speed Change = Acceleration.mag()
    ↓
Speed += Speed Change (limited to maxSpeed)
    ↓
Velocity = [cos(Heading) * Speed, sin(Heading) * Speed]
    ↓
Position += Velocity
```

**Key Characteristic**: Heading and speed are separate. Turn rate constrained by speed - faster = wider turns.

### Physics Parameter Tuning Guide

For realistic fish-like turning:

```javascript
// Turn radius = Speed / Angular_Velocity
// At max speed (1.0) with MAX_TURN_RATE (0.05):
// Turn radius ≈ 1.0 / 0.05 = 20 pixels

MAX_TURN_RATE: 0.05,      // Smaller = wider turns, larger = tighter turns
MIN_TURN_RADIUS: 20,       // Prevent unrealistically tight turns
TURN_RESPONSIVENESS: 0.3,  // Higher = snappier response to desired heading
```

**Recommended starting values:**
- `MAX_TURN_RATE: 0.03-0.08` - For fish-like turning (20-60 pixel radius at speed 1.0)
- `TURN_RESPONSIVENESS: 0.2-0.5` - Balance between smooth and responsive
- `ANGULAR_DAMPING: 0.6-0.8` - Smooth out angular velocity changes

## Historical Context

### Previous Research on Smoothness

The codebase has undergone extensive smoothness optimization:

1. **Force Smoothing Added** (2025-10-18 research) - Addressed jerkiness from conflicting forces
2. **Velocity Smoothing** - Reduced sudden direction changes
3. **Derivative Damping** - Added turn resistance proportional to speed
4. **Oscillation Detection** - Escape mechanism to prevent stuck states

Reference: `/Users/seankim/dev/visualizations/thoughts/research/2025-10-18-koi-flocking-jerkiness-accumulation-analysis.md`

### Identified Smoothness Issues

Previous research identified:
- Frame-based timing causing framerate-dependent animation
- Pixel scaling quantization making small movements jerky
- Separation force clamping creating discrete jumps
- No inherent turn radius constraints

Reference: `/Users/seankim/dev/visualizations/thoughts/research/2025-10-18-flocking-animation-smoothness-analysis.md`

## Related Research

- `/Users/seankim/dev/visualizations/thoughts/research/2025-10-18-koi-flocking-jerkiness-accumulation-analysis.md` - Force smoothing and jerkiness analysis
- `/Users/seankim/dev/visualizations/thoughts/research/2025-10-18-flocking-animation-smoothness-analysis.md` - Animation smoothness mechanisms
- `/Users/seankim/dev/visualizations/thoughts/research/2025-10-18-boids-oscillation-mitigation-using-aerospace-control-theory.md` - Control theory approach to boids

## Open Questions

1. **Desired Turn Tightness**: How tight should koi be able to turn? Real koi can turn fairly sharply at low speeds but need wider arcs at high speeds. What feels most natural for the visualization?

2. **Speed-Turn Coupling**: Should turn radius be strictly proportional to speed, or should there be a minimum turn radius even at low speeds?

3. **Drift Physics**: Should koi be able to drift (velocity direction ≠ heading direction) like real fish coasting through water?

4. **Flocking Force Compatibility**: How should alignment/cohesion forces work with heading constraints? Should they influence desired heading or create turning forces?

5. **Visual Feedback**: How should the koi rendering reflect the new turn physics? Should body orientation always match velocity, or can it lag behind for more realistic appearance?

6. **Performance Impact**: What is the performance cost of separating heading and speed calculations? Will frame rate suffer?

## Recommendations

### For Implementation

1. **Start with Option C (Hybrid)** - Add heading property and angular velocity constraint while keeping velocity vector for compatibility

2. **Add Physics Constants** - Introduce `MAX_TURN_RATE`, `TURN_RESPONSIVENESS`, and `MIN_TURN_RADIUS` to physics-config.js

3. **Modify Boid.update()** - Add angular velocity constraint after velocity smoothing

4. **Test with Single Boid First** - Verify turn physics work correctly before enabling full flocking

5. **Tune Iteratively** - Start with conservative turn constraints and adjust based on feel

### For Further Research

1. **Real Koi Movement Study** - Analyze videos of real koi to measure turn radii at different speeds

2. **Drift Physics** - Research how fish momentum and water resistance affect turning

3. **Flocking Adaptation** - Study how birds/fish flocking maintains cohesion with realistic turn constraints

4. **Performance Profiling** - Measure frame time impact of heading/speed separation

---

**Next Steps**: Once approach is chosen, create implementation plan with specific code changes and testing methodology.
