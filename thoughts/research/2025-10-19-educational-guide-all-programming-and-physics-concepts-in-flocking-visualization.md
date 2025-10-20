---
doc_type: research
date: 2025-10-19T15:46:45+00:00
title: "Educational Guide: All Programming and Physics Concepts in Flocking Visualization"
research_question: "What are ALL the programming and physics concepts used in the flocking visualization, explained for an educational audience with some programming knowledge but limited physics knowledge?"
researcher: Sean Kim

git_commit: 1d7800f4827a83186389b4fe13d5ed35e539355b
branch: main
repository: visualizations

created_by: Sean Kim
last_updated: 2025-10-19
last_updated_by: Sean Kim

tags:
  - education
  - physics
  - programming
  - boids
  - vectors
  - p5js
  - audio-analysis
  - emergence
status: complete

related_docs: []
---

# Educational Guide: All Programming and Physics Concepts in Flocking Visualization

**Date**: 2025-10-19
**Researcher**: Sean Kim
**Git Commit**: 1d7800f4
**Branch**: main
**Repository**: visualizations

## Overview

This document provides a comprehensive educational explanation of ALL programming and physics concepts used in the flocking visualization. The simulation creates realistic koi fish that swim together using the boids algorithm, react to audio, and display emergent group behavior.

**Target Audience**: Readers with some programming knowledge (functions, objects, loops) but limited physics background.

---

## Part 1: Programming Concepts

### 1.1 p5.js Framework

**What it is**: p5.js is a JavaScript library that makes it easy to create interactive graphics and animations in the web browser.

**Core Architecture**:

p5.js uses two main functions that run automatically:
- `setup()` - Runs once at the start (sketch.js:26, simulation-app.js:49)
- `draw()` - Runs repeatedly (60 times per second by default) to create animation (sketch.js:205, simulation-app.js:159)

Think of it like a flipbook: `setup()` prepares the pages, and `draw()` draws each frame.

**Key Functions Used**:

1. **Canvas Creation** (sketch.js:27)
   ```javascript
   createCanvas(windowWidth, windowHeight);
   ```
   Creates a drawing surface that fills the browser window.

2. **Vector Creation** (boid.js:21)
   ```javascript
   this.position = createVector(random(width), random(height));
   ```
   Creates 2D vectors for position, velocity, acceleration.

3. **Image Rendering** (sketch.js:222, simulation-app.js:216)
   ```javascript
   image(pg, 0, 0, width, height);
   ```
   Draws the low-resolution buffer onto the main canvas, scaled up.

**Why it's needed**: p5.js handles the complexity of canvas management, animation loops, and vector math, letting us focus on the simulation logic.

---

### 1.2 Object-Oriented Design

**What it is**: A programming approach where related data and behavior are grouped into "objects" (classes).

**Class Structure in This Codebase**:

The codebase uses **separation of concerns** - each class has a specific, focused responsibility:

1. **Boid Class** (boid.js:10)
   - **Responsibility**: Physics and state only
   - **Data**: position, velocity, acceleration, koi appearance
   - **Behavior**: update position, apply forces, handle edges
   - **Does NOT render itself** - rendering is delegated to KoiRenderer

2. **FlockManager Class** (flock-manager.js:9)
   - **Responsibility**: Orchestrate the flock
   - **Data**: array of boids, canvas dimensions
   - **Behavior**: update all boids, calculate forces, manage flock size

3. **KoiRenderer Class** (koi-renderer.js:9)
   - **Responsibility**: Pure rendering logic
   - **Takes**: position, angle, appearance data
   - **Produces**: visual representation on canvas
   - **Completely separate from physics**

4. **AudioAnalyzer Class** (audio-analyzer.js:6)
   - **Responsibility**: Audio processing
   - **Behavior**: load files, analyze frequencies, extract bass/mid/treble

5. **PixelBuffer Class** (pixel-buffer.js:6)
   - **Responsibility**: Manage low-resolution rendering buffer
   - **Behavior**: create buffer, resize, render to main canvas

**Example - Boid Constructor** (boid.js:19):
```javascript
constructor(width, height, randomFunc, createVectorFunc, floorFunc, p5Instance) {
    this.position = createVectorFunc(randomFunc(width), randomFunc(height));
    this.velocity = p5Instance.Vector.random2D();
    this.acceleration = createVectorFunc();
    this.perceptionRadius = 50;
    // ... appearance data
}
```

**Why it's needed**:
- **Modularity**: Each class can be tested and modified independently
- **Reusability**: KoiRenderer can render koi in editor or simulation
- **Maintainability**: Physics changes don't affect rendering, and vice versa

---

### 1.3 Vector Mathematics

**What vectors are**: A vector is a mathematical object with both **magnitude** (size) and **direction**. Think of it as an arrow pointing from one place to another.

**Representation**: In 2D, a vector has two components: `(x, y)`

**Visual Example**:
```
Position vector: (100, 50) → Point on screen at x=100, y=50
Velocity vector: (2, 1) → Moving right 2 units, down 1 unit per frame
```

**Key Vector Operations**:

1. **Addition** (boid.js:227)
   ```javascript
   this.position.add(this.velocity);
   ```
   Adds velocity to position to move the boid.
   Math: `(100, 50) + (2, 1) = (102, 51)`

2. **Subtraction** (flocking-forces.js:118)
   ```javascript
   let diff = p5.Vector.sub(this.position, other.position);
   ```
   Finds the vector pointing from `other` to `this`.
   Math: `(100, 50) - (90, 40) = (10, 10)` → pointing right and down

3. **Magnitude (Length)** (boid.js:214, 764)
   ```javascript
   let speed = this.velocity.mag();
   ```
   Calculates the length of the vector using Pythagorean theorem.
   Math: `mag(3, 4) = √(3² + 4²) = √25 = 5`

4. **Normalization** (flocking-forces.js:59, 132)
   ```javascript
   steering.setMag(maxSpeed);
   ```
   Sets the vector to have a specific length while keeping the direction.
   Math: `(3, 4)` normalized to length 1 → `(0.6, 0.8)`

5. **Limiting** (flocking-forces.js:61, 134)
   ```javascript
   steering.limit(maxForce);
   ```
   Caps the vector's magnitude at a maximum value.
   If magnitude > max, scale down to max.

6. **Heading (Angle)** (boid.js:204, 763)
   ```javascript
   let angle = this.velocity.heading();
   ```
   Returns the direction the vector points, in radians.
   Math: `atan2(y, x)` → angle from 0 to 2π

**Why vectors are essential**:
- Position: "Where is the boid?"
- Velocity: "Which direction and how fast is it moving?"
- Acceleration: "How is the velocity changing?"
- Forces: "What's pushing/pulling the boid?"

---

### 1.4 Smoothing Techniques

**What smoothing is**: Techniques to prevent sudden, jerky changes by gradually transitioning from one value to another.

**Why it's needed**: Without smoothing, boids would twitch and vibrate as forces conflict. Smoothing creates graceful, natural-looking movement.

**Smoothing Methods Used**:

#### 1.4.1 Linear Interpolation (lerp)

**Mathematical Definition**:
```
lerp(a, b, t) = a + (b - a) * t
```
Where `t` ranges from 0 to 1:
- `t = 0` → returns `a`
- `t = 0.5` → returns halfway between
- `t = 1` → returns `b`

**Example** (koi-renderer.js:323):
```javascript
lerp(start, end, t) {
    return start + (end - start) * t;
}
```

**Usage - Body Width Calculation** (koi-renderer.js:101):
```javascript
baseWidth = this.lerp(bodyFrontWidth, bodyPeakWidth, Math.sin(frontT * Math.PI * 0.5));
```
Smoothly transitions body width from front to peak.

**Usage - Velocity Smoothing** (boid.js:248):
```javascript
const smoothing = 0.15;
this.velocity.lerp(targetVelocity, smoothing);
```
Each frame, velocity moves 15% closer to target velocity. This prevents instant direction changes.

**Visual Example**:
```
Frame 1: velocity = (1, 0), target = (0, 1)
Frame 2: velocity = (1, 0) + 0.15 * [(0, 1) - (1, 0)] = (0.85, 0.15)
Frame 3: velocity = (0.85, 0.15) + 0.15 * [(0, 1) - (0.85, 0.15)] = (0.7225, 0.2775)
...gradually approaches (0, 1)
```

#### 1.4.2 Force Smoothing

**Implementation** (boid.js:93-98):
```javascript
const forceSmoothing = 0.25;
const smoothedAlignment = this.previousAlignment.copy().lerp(forces.alignment, forceSmoothing);
```

**What it does**: Blends current frame's force with previous frame's force to reduce oscillation.

**Why it helps**: When a boid is between two neighbors, forces can flip direction each frame. Smoothing prevents this rapid back-and-forth.

#### 1.4.3 Dead Zone

**Implementation** (boid.js:100-106):
```javascript
const deadZoneThreshold = 0.01;
if (smoothedAlignment.mag() < deadZoneThreshold) smoothedAlignment.set(0, 0);
```

**What it does**: Ignores forces smaller than a threshold.

**Why it's needed**: When forces are nearly balanced, tiny fluctuations (floating-point noise) cause micro-oscillations. The dead zone eliminates these.

#### 1.4.4 Derivative Damping (Advanced)

**Implementation** (boid.js:203-225):
```javascript
const dampingCoefficient = 0.45;
const headingChange = currentHeading - this.previousHeading;
const dampingMagnitude = headingChange * -dampingCoefficient * speed;
const perpAngle = currentHeading + Math.PI / 2;
const dampingForce = p5.Vector.fromAngle(perpAngle, dampingMagnitude);
this.acceleration.add(dampingForce);
```

**What it does**: Applies a force that resists rapid turning (like inertia).

**Physics analogy**: Think of a car turning - you feel pushed to the outside. That's your body resisting the change in direction. This code simulates that for boids.

**Why it's needed**: Prevents rapid oscillations when conflicting forces cause the boid to change direction too quickly.

---

### 1.5 Performance Optimizations

#### 1.5.1 Graphics Buffers

**What they are**: Separate drawing surfaces that can be drawn to independently, then composited together.

**Implementation** (pixel-buffer.js:15-30):
```javascript
constructor(width, height, pixelScale, createGraphics, floor) {
    this.buffer = createGraphics(
        floor(width / pixelScale),
        floor(height / pixelScale)
    );
}
```

**How it works**:
1. Create a small buffer (e.g., 400×300 pixels if canvas is 1600×1200 and pixelScale=4)
2. Draw all boids to the small buffer
3. Scale the buffer up to full screen size

**Why it's an optimization**:
- Drawing 80 detailed koi at 1920×1080 = expensive
- Drawing 80 detailed koi at 480×270 = much cheaper
- Scaling up one image = cheap

**Rendering Pipeline** (simulation-app.js:165-216):
```javascript
const pg = pixelBuffer.getContext();      // Get low-res buffer
pg.background(...);                       // Clear buffer
renderer.render(pg, ...);                 // Draw each koi to buffer
pixelBuffer.render(window, width, height); // Scale up to screen
```

#### 1.5.2 Pixel Scaling

**Visual Effect**: Creates a retro, pixel-art aesthetic while boosting performance.

**Implementation** (index.html:18):
```css
image-rendering: pixelated;
image-rendering: crisp-edges;
```
Prevents browser from smoothing (anti-aliasing) the scaled-up image.

**Parameter** (simulation-app.js:27):
```javascript
pixelScale: isMobile ? 3 : (isSmallScreen ? 3 : 4)
```
Automatically adjusts based on device capabilities.

#### 1.5.3 Neighbor Limiting

**Problem**: With 80 boids, each boid could check against 79 others. That's 80 × 79 = 6,320 comparisons per frame!

**Solution** (flocking-forces.js:30-36):
```javascript
neighborsWithDistance.sort((a, b) => a.distance - b.distance);
const maxNeighbors = 8;
const closestNeighbors = neighborsWithDistance.slice(0, maxNeighbors);
```

**How it works**:
1. Find all boids within perception radius
2. Sort by distance
3. Keep only the 8 closest

**Why it works**:
- Far neighbors have little influence anyway
- Limiting to 8 prevents force overload
- Reduces computational cost

#### 1.5.4 Device-Specific Optimization

**Implementation** (simulation-app.js:22-42):
```javascript
const isMobile = window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isSmallScreen = window.innerWidth < 1024;

let params = {
    pixelScale: isMobile ? 3 : (isSmallScreen ? 3 : 4),
    numBoids: isMobile ? 30 : (isSmallScreen ? 50 : 80),
    // ...
};
```

**What it does**: Automatically reduces boid count and increases pixel scale on mobile devices.

**Why it's needed**: Mobile devices have less processing power and smaller screens, so we adjust parameters for smooth performance.

---

### 1.6 Audio Analysis with Web Audio API

**What it is**: A browser API for processing and analyzing audio in real-time.

**Architecture**:

```
Audio File → Audio Element → Audio Context → Analyser Node → Frequency Data
                                  ↓
                            Audio Output (speakers)
```

**Implementation** (audio-analyzer.js:34-44):
```javascript
this.audioContext = new AudioContext();
this.analyser = audioContext.createAnalyser();
this.analyser.fftSize = 256;
this.frequencyData = new Uint8Array(analyser.frequencyBinCount);

audioSource = audioContext.createMediaElementSource(audioElement);
audioSource.connect(analyser);
analyser.connect(audioContext.destination);
```

**Key Concepts**:

#### 1.6.1 FFT (Fast Fourier Transform)

**What it is**: A mathematical algorithm that converts audio from time domain (amplitude over time) to frequency domain (strength of each frequency).

**Visual Analogy**:
```
Time Domain:        |  |   ||  |     (waveform - amplitude vs time)
                    ↓ FFT
Frequency Domain:   ███ ██ ███ █     (spectrum - amplitude vs frequency)
                   Bass Mid Treble
```

**FFT Size** (audio-analyzer.js:38):
```javascript
this.analyser.fftSize = 256;
```
- Determines frequency resolution
- 256 samples → 128 frequency bins (fftSize / 2)
- Each bin represents a range of frequencies

#### 1.6.2 Frequency Bands

**Implementation** (audio-analyzer.js:108-111):
```javascript
const bass = this.getFrequencyRange(0, 4) / 255;    // Low frequencies (20-200 Hz)
const mid = this.getFrequencyRange(4, 16) / 255;    // Mid frequencies (200-2000 Hz)
const treble = this.getFrequencyRange(16, 32) / 255; // High frequencies (2000-8000 Hz)
```

**How Frequency Ranges Work**:
```javascript
getFrequencyRange(start, end) {
    let sum = 0;
    for (let i = start; i < end && i < this.frequencyData.length; i++) {
        sum += this.frequencyData[i];
    }
    return sum / (end - start);
}
```

**What each band does**:
- **Bass**: Makes background darker, increases separation force (flock-manager.js:138)
- **Mid**: Currently unused, could affect cohesion
- **Treble**: Increases color saturation (simulation-app.js:208)
- **Amplitude**: Affects speed and size (simulation-app.js:209-210)

#### 1.6.3 Audio Reactivity

**Parameter** (simulation-app.js:35):
```javascript
audioReactivity: 0.5  // 0 = no effect, 1 = full effect
```

**Usage Example** (flock-manager.js:138):
```javascript
const bassBoost = 1 + audioData.bass * 1.5 * params.audioReactivity;
separation.mult(params.separationWeight * bassBoost);
```

**How it works**:
- `audioData.bass` ranges from 0 to 1
- With `audioReactivity = 0.5` and `bass = 0.8`:
  - `bassBoost = 1 + 0.8 * 1.5 * 0.5 = 1.6`
  - Separation force increased by 60%

**Result**: Bass hits make koi push away from each other, creating pulsing patterns.

---

### 1.7 Weighted Random Selection

**What it is**: Random selection where some options are more likely than others.

**Problem**: We want common koi varieties (like kohaku) to appear more often than rare ones (like ki-bekko).

**Implementation** (koi-varieties.js:56-70):
```javascript
export function selectVariety(randomFunc = Math.random) {
    const totalWeight = VARIETIES.reduce((sum, v) => sum + v.weight, 0);
    let randomValue = randomFunc() * totalWeight;
    let cumulativeWeight = 0;

    for (let variety of VARIETIES) {
        cumulativeWeight += variety.weight;
        if (randomValue < cumulativeWeight) {
            return variety;
        }
    }
}
```

**Example with 3 varieties**:
```
Varieties: kohaku (weight 15), sanke (weight 10), showa (weight 10)
Total weight: 35

Cumulative ranges:
- kohaku: 0 to 15    (15/35 = 43% chance)
- sanke:  15 to 25   (10/35 = 29% chance)
- showa:  25 to 35   (10/35 = 29% chance)

Random value: 18
→ 18 falls in range 15-25 → select sanke
```

**Why it's useful**: Creates realistic population distributions where common varieties are seen frequently, rare ones occasionally.

**Visual Representation**:
```
|----------kohaku----------|----sanke----|----showa----|
0                         15           25            35
                             ↑
                      random = 18 → sanke
```

---

### 1.8 HSB Color Mode

**What it is**: A color representation using Hue, Saturation, Brightness instead of Red, Green, Blue.

**HSB Components**:

1. **Hue (H)**: The color itself (0-360 degrees on color wheel)
   - 0° = Red
   - 120° = Green
   - 240° = Blue
   - 360° = Red again (full circle)

2. **Saturation (S)**: How vivid the color is (0-100%)
   - 0% = Gray (no color)
   - 100% = Pure, vivid color

3. **Brightness (B)**: How light or dark (0-100%)
   - 0% = Black
   - 100% = Bright

**Why HSB is better for this use case**:

RGB is good for mixing light, but hard to intuit:
- "Make this redder" → increase R? But by how much?
- "Make this darker" → decrease R, G, and B equally

HSB maps to natural descriptions:
- "Make this redder" → change Hue toward 0
- "Make this darker" → decrease Brightness
- "Make this more vivid" → increase Saturation

**Implementation** (koi-varieties.js:11-48):
```javascript
{ name: 'kohaku', base: { h: 0, s: 0, b: 90 }, weight: 15 },  // White base
{ name: 'asagi', base: { h: 200, s: 35, b: 65 }, weight: 5 }, // Blue base
```

**Color Mode Switching** (koi-renderer.js:60):
```javascript
context.colorMode(context.HSB || 'HSB', 360, 100, 100);
// Do HSB-based rendering
context.colorMode(context.RGB || 'RGB');
```

**Audio-Reactive Color** (simulation-app.js:207-208):
```javascript
brightnessBoost: audioData.bass * 8 * params.audioReactivity,
saturationBoost: audioData.treble * 10 * params.audioReactivity
```
Bass makes colors brighter, treble makes them more saturated.

---

## Part 2: Physics Concepts

### 2.1 Newtonian Motion

**The Core Principle**: Newton's laws of motion govern how objects move.

**Newton's Second Law**: F = ma (Force = mass × acceleration)

In this simulation, all boids have mass = 1 (implicit), so F = a.

**Position-Velocity-Acceleration Relationship**:

Think of these as hierarchical:
- **Position**: Where the boid is
- **Velocity**: How position changes per frame
- **Acceleration**: How velocity changes per frame

**Mathematical Relationships**:
```
acceleration = force (because mass = 1)
velocity = velocity + acceleration
position = position + velocity
```

**Implementation** (boid.js:227-248):
```javascript
// Add forces to acceleration (happens in flock-manager.js)
this.acceleration.add(alignment);
this.acceleration.add(cohesion);
this.acceleration.add(separation);

// Update velocity based on acceleration
this.position.add(this.velocity);
let targetVelocity = p5.Vector.add(this.velocity, this.acceleration);
targetVelocity.limit(maxSpeed);
this.velocity.lerp(targetVelocity, smoothing);

// Reset acceleration (forces are recalculated each frame)
this.acceleration.set(0, 0, 0);
```

**Frame-by-Frame Example**:
```
Frame 1:
  forces = alignment(0.1, 0) + cohesion(0.05, 0.05) + separation(-0.2, 0)
  acceleration = (-0.05, 0.05)
  velocity = (1, 0) + (-0.05, 0.05) = (0.95, 0.05)
  position = (100, 100) + (0.95, 0.05) = (100.95, 100.05)

Frame 2:
  [forces recalculated based on new position]
  ...
```

**Why reset acceleration?**: Forces change every frame as neighbors move. We recalculate forces fresh each frame, so we must clear the previous frame's acceleration.

---

### 2.2 Forces and Steering

**What are forces?**: In physics, a force is a push or pull that causes acceleration. In this simulation, forces are vectors that modify velocity.

**Steering Forces**: Instead of direct control ("turn left"), we apply forces that gradually change direction, like steering a car.

**Reynolds' Steering Behavior Formula**:
```
desired_velocity = direction_to_target * max_speed
steering_force = desired_velocity - current_velocity
steering_force = limit(steering_force, max_force)
```

**Example - Alignment** (flocking-forces.js:49-64):
```javascript
export function calculateAlignment(boid, neighbors, maxSpeed, maxForce, createVector) {
    let steering = createVector();

    // Calculate average velocity of neighbors
    for (let other of neighbors) {
        steering.add(other.velocity);
    }
    steering.div(neighbors.length);

    // That's the desired velocity
    steering.setMag(maxSpeed);

    // Subtract current velocity to get steering force
    steering.sub(boid.velocity);

    // Limit the force
    steering.limit(maxForce);

    return steering;
}
```

**Why this works**:
- `desired - current` gives the change needed
- Limiting prevents unrealistic instant turns
- Applying gradually over frames creates smooth steering

**Visual Example**:
```
Current velocity: →→→ (pointing right, magnitude 2)
Desired velocity: ↗↗↗ (pointing up-right, magnitude 2)
Steering force:   ↑   (pointing up, small magnitude)

Result: Gradually curves upward over several frames
```

---

### 2.3 The Boids Algorithm (Three Core Rules)

**Created by**: Craig Reynolds in 1986

**The Big Idea**: Complex flocking behavior emerges from three simple local rules. Each boid only considers nearby neighbors, yet the group forms coherent patterns.

#### 2.3.1 Separation (Collision Avoidance)

**Rule**: "Steer away from neighbors to avoid crowding"

**Implementation** (flocking-forces.js:106-138):
```javascript
export function calculateSeparation(boid, neighbors, perceptionRadius, maxSpeed, maxForce, createVector, p5) {
    let steering = createVector();

    for (let other of neighbors) {
        let d = dist(boid.position, other.position);

        // Only consider very close neighbors (70% of perception radius)
        if (d < perceptionRadius * 0.7) {
            // Vector pointing away from neighbor
            let diff = p5.Vector.sub(boid.position, other.position);

            // Weight by distance - closer = stronger push
            const minDist = 8;
            if (d < minDist) d = minDist;  // Prevent division by zero
            diff.div(d * d);  // Inverse square law

            steering.add(diff);
        }
    }

    // Average and convert to steering force
    steering.div(total);
    steering.setMag(maxSpeed);
    steering.sub(boid.velocity);
    steering.limit(maxForce);

    return steering;
}
```

**Key Points**:

1. **Inverse Square Weighting**: `diff.div(d * d)` (line 124)
   - Closer neighbors have exponentially stronger effect
   - At distance 2: weight = 1/4
   - At distance 4: weight = 1/16
   - Mimics real-world forces (gravity, magnetism)

2. **Minimum Distance Cap** (line 122)
   - Prevents extreme forces when boids are very close
   - Without this: division by near-zero → infinity → chaos

3. **Reduced Perception** (line 117)
   - Separation only considers neighbors within 70% of perception radius
   - Alignment/cohesion use full 100%
   - Result: Boids only separate when quite close

**Visual Example**:
```
Current boid: ●
Neighbors:    ○ ○ ○

   ○
     ○  ●  ○

Force vectors from each neighbor:
←  ←  ↓ ↑  →  →

Combined separation force: →↑ (away from center of crowd)
```

#### 2.3.2 Alignment (Velocity Matching)

**Rule**: "Steer toward the average heading of neighbors"

**Implementation** (flocking-forces.js:49-64):
```javascript
export function calculateAlignment(boid, neighbors, maxSpeed, maxForce, createVector) {
    let steering = createVector();

    // Sum all neighbor velocities
    for (let other of neighbors) {
        steering.add(other.velocity);
    }

    // Calculate average
    steering.div(neighbors.length);

    // Convert to steering force
    steering.setMag(maxSpeed);
    steering.sub(boid.velocity);
    steering.limit(maxForce);

    return steering;
}
```

**What it does**: Makes boids swim in the same direction as their neighbors.

**Visual Example**:
```
Current boid: →    (moving right)
Neighbors:    ↗↗↗  (moving up-right)

Average neighbor velocity: ↗
Steering force: ↑ (turns current boid upward)
Result after several frames: →→↗ (boid now moving up-right too)
```

**Why it creates flocking**: When all boids align with neighbors, the whole group moves in a coordinated direction.

#### 2.3.3 Cohesion (Center of Mass Attraction)

**Rule**: "Steer toward the average position of neighbors"

**Implementation** (flocking-forces.js:76-92):
```javascript
export function calculateCohesion(boid, neighbors, maxSpeed, maxForce, createVector) {
    let steering = createVector();

    // Sum all neighbor positions
    for (let other of neighbors) {
        steering.add(other.position);
    }

    // Calculate center of mass
    steering.div(neighbors.length);

    // Vector from current position to center
    steering.sub(boid.position);

    // Convert to steering force
    steering.setMag(maxSpeed);
    steering.sub(boid.velocity);
    steering.limit(maxForce);

    return steering;
}
```

**What it does**: Pulls boids toward the middle of their local group.

**Mathematical Breakdown**:
1. Sum positions: (100,100) + (110,105) + (105,110) = (315,315)
2. Average (center of mass): (315,315) / 3 = (105,105)
3. Direction to center: (105,105) - (100,100) = (5,5)
4. Convert to steering force (normalize, limit, etc.)

**Visual Example**:
```
Current boid: ●  (at position 100,100)
Neighbors:    ○ ○ ○

     ○
  ●    ○
       ○

Center of mass: ✕ (average position)

Cohesion force: →↑ (toward center)
Result: Boid moves toward group center
```

**Why it creates flocking**: Prevents boids from drifting apart. Combined with separation (which prevents crowding), creates optimal spacing.

---

### 2.4 Force Limiting

**The Problem**: Uncapped forces can cause unrealistic behavior:
- Instant 180° turns
- Infinite acceleration near collisions
- Oscillation and instability

**Solution: Limit Maximum Force and Speed**

#### 2.4.1 Maximum Force

**Implementation** (simulation-app.js:30):
```javascript
maxForce: 0.1
```

**What it does**: Limits how quickly velocity can change.

**Applied in** (flocking-forces.js:61, 89, 134):
```javascript
steering.limit(maxForce);
```

**Effect**: Creates gradual, smooth turns instead of instant pivots.

**Real-world analogy**: A car can't instantly change from 60 mph north to 60 mph south. It must slow down, turn, and accelerate. `maxForce` is like the car's engine and braking power - it limits how quickly you can change direction.

#### 2.4.2 Maximum Speed

**Implementation** (simulation-app.js:29):
```javascript
maxSpeed: 0.5
```

**Applied in** (boid.js:244):
```javascript
targetVelocity.limit(individualMaxSpeed);
```

**What it does**: Caps how fast boids can move.

**Why it's needed**: Without a speed limit, forces accumulate unboundedly, causing boids to zoom offscreen or vibrate uncontrollably.

**Individual Speed Variation** (boid.js:52):
```javascript
this.speedMultiplier = randomFunc(0.6, 1.3);
```
Each boid has a personal speed multiplier (60%-130%), so some swim faster than others.

#### 2.4.3 Force Limiting Example

**Scenario**: Boid has 10 very close neighbors, each pushing away with force magnitude 0.5.

**Without limiting**:
```
Total separation force = 10 × 0.5 = 5.0
Velocity changes by 5.0 per frame
After 3 frames: velocity = 15.0 (way too fast!)
```

**With limiting** (maxForce = 0.1):
```
Total separation force = 5.0, but limit(5.0, 0.1) = 0.1
Velocity changes by 0.1 per frame
After 3 frames: velocity = 0.3 (controlled and smooth)
```

---

### 2.5 Perception Radius (Local vs Global Awareness)

**The Concept**: Each boid can only "see" neighbors within a certain distance. It has no knowledge of boids beyond this radius.

**Implementation** (boid.js:25):
```javascript
this.perceptionRadius = 50;  // Reduced from 80
```

**Why local awareness?**:
- **Realism**: Real fish can only see nearby fish
- **Performance**: Reduces number of neighbors to check
- **Emergence**: Global patterns emerge from local rules

**Finding Neighbors** (flocking-forces.js:14-37):
```javascript
export function findNeighbors(boid, flock, perceptionRadius) {
    const neighborsWithDistance = [];

    for (let other of flock) {
        if (other === boid) continue;

        const d = dist(boid.position, other.position);

        if (d < perceptionRadius) {
            neighborsWithDistance.push({ boid: other, distance: d });
        }
    }

    // Sort by distance and limit to closest 8
    neighborsWithDistance.sort((a, b) => a.distance - b.distance);
    return neighborsWithDistance.slice(0, 8).map(n => n.boid);
}
```

**Visual Example**:
```
Perception radius: 50 pixels

        ○ (distance 70 - NOT a neighbor)
    ○       ○ (distance 30 - IS a neighbor)
  ●
    ○       ○ (distance 40 - IS a neighbor)
        ○ (distance 55 - NOT a neighbor)

Boid ● only considers the 4 boids within radius 50
```

**Reduced Perception Benefit** (boid.js:25 comment):
- Fewer neighbors = fewer conflicting forces
- Reduces oscillation (rapid back-and-forth)
- Creates gentler, more natural reactions

---

### 2.6 Emergence

**Definition**: Complex global patterns arising from simple local rules.

**The Magic of Boids**: No boid knows about the overall flock shape or direction. Each only follows three simple rules based on nearby neighbors. Yet the flock forms coherent patterns like:
- Flowing together in the same direction
- Splitting around obstacles
- Maintaining even spacing
- Creating swirling vortices

**How Emergence Works**:

1. **Local Rules** (each boid):
   - "Stay close to neighbors" (cohesion)
   - "Match their speed" (alignment)
   - "Don't collide" (separation)

2. **Repeated Interactions**:
   - Rules applied 60 times per second
   - Each boid influences its neighbors
   - Those neighbors influence their neighbors
   - Information propagates through the flock

3. **Global Pattern** (emergent result):
   - Entire flock moves as coordinated unit
   - Creates beautiful, organic motion
   - No central controller needed

**Real-World Examples**:
- **Starlings** (birds): Murmurations create stunning aerial patterns
- **Fish schools**: Coordinate to evade predators
- **Ants**: Find optimal paths to food through pheromone trails
- **Traffic**: Stop-and-go waves emerge from individual driver reactions

**In This Simulation**:

Watch for these emergent patterns:
- **Vortex formation**: Boids spiral around empty spaces
- **Stream splitting**: Flock divides around screen edges
- **Density waves**: Clusters form and dissipate
- **Synchronized turns**: Entire group changes direction smoothly

**Code That Enables Emergence** (flock-manager.js:46-76):
```javascript
for (let boid of this.boids) {
    // Each boid only knows about its neighbors
    const neighbors = findNeighbors(boid, this.boids, boid.perceptionRadius);

    // Apply simple local rules
    const forces = this.calculateFlockingForces(boid, neighbors, params, audioData);
    boid.applyForces(forces, neighbors.length, ...);

    // Update position
    boid.update(...);
}
```

No code says "make the flock turn left" or "form a circle". Those patterns emerge naturally from the three rules applied to each individual.

---

## Part 3: Mathematical Concepts

### 3.1 Linear Interpolation (lerp)

**Covered in detail in Section 1.4.1** (Smoothing Techniques)

**Summary**: `lerp(a, b, t) = a + (b - a) * t` smoothly blends between two values.

**Additional Use Cases**:

1. **Body Shape** (koi-renderer.js:101):
   ```javascript
   baseWidth = this.lerp(bodyFrontWidth, bodyPeakWidth, frontT);
   ```
   Creates smooth taper from head to tail.

2. **Tail Width** (koi-renderer.js:200):
   ```javascript
   const width = this.lerp(tailWidthStart, tailWidthEnd, t) * sizeScale;
   ```
   Tail gradually widens from base to tip.

3. **Swimming Wave** (koi-renderer.js:92):
   ```javascript
   const x = this.lerp(7, -9, t) * sizeScale * lengthMultiplier;
   ```
   Positions body segments along length.

---

### 3.2 Normalization (Setting Vector Magnitude)

**What it is**: Changing a vector's length to a specific value while keeping its direction.

**Formula**:
```
normalized = (vector / magnitude) * desired_length
```

**p5.js Method** (used throughout):
```javascript
vector.setMag(desiredMagnitude);
```

**Implementation Inside p5.js** (conceptually):
```javascript
setMag(desiredMag) {
    const currentMag = Math.sqrt(this.x * this.x + this.y * this.y);
    if (currentMag > 0) {
        this.x = (this.x / currentMag) * desiredMag;
        this.y = (this.y / currentMag) * desiredMag;
    }
}
```

**Example**:
```
Vector: (3, 4)
Current magnitude: √(3² + 4²) = 5

setMag(10):
  Direction: (3, 4) / 5 = (0.6, 0.8)
  Result: (0.6, 0.8) * 10 = (6, 8)
  New magnitude: √(6² + 8²) = 10 ✓
```

**Use Case - Steering Forces** (flocking-forces.js:59):
```javascript
steering.div(neighbors.length);  // Average velocity
steering.setMag(maxSpeed);       // Make it maxSpeed length
steering.sub(boid.velocity);      // Subtract current
```

This ensures desired velocity always has magnitude `maxSpeed`, regardless of how many neighbors contributed.

---

### 3.3 Distance Calculations (Euclidean Distance)

**What it is**: The straight-line distance between two points in 2D space.

**Formula (Pythagorean Theorem)**:
```
distance = √[(x₂ - x₁)² + (y₂ - y₁)²]
```

**Implementation** (flocking-forces.js:164-168):
```javascript
function dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}
```

**Visual Example**:
```
Point A: (100, 100)
Point B: (103, 104)

dx = 103 - 100 = 3
dy = 104 - 100 = 4
distance = √(3² + 4²) = √(9 + 16) = √25 = 5
```

**Where It's Used**:

1. **Finding Neighbors** (flocking-forces.js:20-26):
   ```javascript
   const d = dist(boid.position.x, boid.position.y, other.position.x, other.position.y);
   if (d < perceptionRadius) {
       neighborsWithDistance.push({ boid: other, distance: d });
   }
   ```

2. **Separation Weighting** (flocking-forces.js:111-113):
   ```javascript
   let d = dist(boid.position.x, boid.position.y, other.position.x, other.position.y);
   if (d < perceptionRadius * 0.7) {
       // Apply separation force
   }
   ```

3. **Inverse Square Law** (flocking-forces.js:124):
   ```javascript
   diff.div(d * d);  // Closer neighbors = stronger force
   ```

**Optimization Note**: `Math.sqrt()` is computationally expensive. When only comparing distances (not using the actual value), you can skip the sqrt:
```javascript
// Instead of: dist(a, b) < radius
// Use: distSquared(a, b) < radius * radius
```
This codebase doesn't use this optimization, prioritizing code clarity.

---

### 3.4 Trigonometry

**What it is**: Mathematics of angles and triangles, relating angles to distances.

**Core Functions**:
- `sin(angle)`: Sine function (-1 to 1)
- `cos(angle)`: Cosine function (-1 to 1)
- `atan2(y, x)`: Inverse tangent, returns angle

#### 3.4.1 Sine Waves for Swimming Motion

**Implementation** (koi-renderer.js:92):
```javascript
const y = Math.sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);
```

**What it creates**: Smooth undulating motion, like a wave passing through the body.

**Breakdown**:
- `waveTime`: Increases each frame, creating motion
- `t`: Position along body (0 = head, 1 = tail)
- `t * 3.5`: Multiplies angle, creating multiple waves along body
- `Math.sin(...)`: Converts to smooth oscillation
- `(1 - t * 0.2)`: Reduces amplitude toward tail

**Visual Example of sine wave**:
```
Time:  0    π/2   π    3π/2  2π
Sin:   0     1    0    -1     0

 1 |     ╱╲
   |    ╱  ╲
 0 |---╱----╲----
   |         ╲  ╱
-1 |          ╲╱
```

**Result**: Each body segment moves up and down in sequence, creating swimming motion.

#### 3.4.2 Heading Angles

**What is heading?**: The direction a vector points, measured as an angle.

**p5.js Method** (used in boid.js:204, 763):
```javascript
let angle = this.velocity.heading();
```

**Implementation** (inside p5.js):
```javascript
heading() {
    return Math.atan2(this.y, this.x);
}
```

**What `atan2(y, x)` does**:
- Takes a vector (x, y)
- Returns angle in radians (-π to π)
- Handles all quadrants correctly

**Example**:
```
Vector: (1, 0) → heading = 0 rad (pointing right)
Vector: (0, 1) → heading = π/2 rad (pointing down)
Vector: (-1, 0) → heading = π rad (pointing left)
Vector: (1, 1) → heading = π/4 rad (pointing down-right)
```

**Usage - Rotation** (simulation-app.js:195):
```javascript
renderer.render(
    pg,
    boid.position.x,
    boid.position.y,
    boid.velocity.heading(),  // Rotation angle
    // ...
);
```

This rotates the koi to face the direction it's moving.

#### 3.4.3 Angle Normalization

**Problem**: Angles can wrap around. Difference between 1° and 359° is 2°, not 358°.

**Implementation** (boid.js:207-209):
```javascript
let headingChange = currentHeading - this.previousHeading;
while (headingChange > Math.PI) headingChange -= Math.PI * 2;
while (headingChange < -Math.PI) headingChange += Math.PI * 2;
```

**What it does**: Ensures angle difference is in range -π to π (smallest rotation).

**Example**:
```
Previous: 0.1 rad (almost 0°)
Current: 6.2 rad (almost 360°)
Difference: 6.2 - 0.1 = 6.1 rad (huge!)

Normalized: 6.1 - 2π = 6.1 - 6.28 = -0.18 rad (small!)
Correct interpretation: turned left 0.18 rad, not right 6.1 rad
```

#### 3.4.4 Creating Vectors from Angles

**Method** (boid.js:221):
```javascript
const dampingForce = p5.Vector.fromAngle(perpAngle, dampingMagnitude);
```

**What it does**: Creates a vector with specific angle and length.

**Implementation** (inside p5.js):
```javascript
static fromAngle(angle, length = 1) {
    return new p5.Vector(
        Math.cos(angle) * length,
        Math.sin(angle) * length
    );
}
```

**Trigonometry Refresher**:
```
For angle θ and radius r:
x = r * cos(θ)
y = r * sin(θ)

Example: angle = π/4 (45°), length = 10
x = 10 * cos(π/4) = 10 * 0.707 = 7.07
y = 10 * sin(π/4) = 10 * 0.707 = 7.07
Result: (7.07, 7.07) pointing down-right
```

---

### 3.5 Inverse Square Weighting

**What it is**: Strength decreases with the square of distance (like gravity or light).

**Formula**:
```
strength ∝ 1 / distance²
```

**Implementation** (flocking-forces.js:124):
```javascript
diff.div(d * d);  // Divide by distance squared
```

**Why inverse square?**:

1. **Physical accuracy**: Many natural forces follow this law
   - Gravity: F = G × (m₁m₂) / r²
   - Light intensity: I = P / (4πr²)
   - Magnetism: F ∝ 1 / r²

2. **Rapid falloff**: Force decreases quickly with distance
   - Distance 2: force = 1/4 of distance 1
   - Distance 3: force = 1/9 of distance 1
   - Distance 10: force = 1/100 of distance 1

**Example**:
```
Two boids with separation vector (6, 0):
Distance: 6
Force before weighting: (6, 0)
Force after: (6, 0) / 36 = (0.167, 0)

If they were closer, distance = 2:
Force after: (2, 0) / 4 = (0.5, 0) — Much stronger!
```

**Graph**:
```
Force
  |
1 |●
  | ╲
  |  ╲
0.5|   ●
  |     ╲___
0.25|        ●_____
  |              ●__________
  +---------------------------- Distance
  0  1  2    3       4       5
```

**Why it helps**: Nearby boids get strong push to avoid collision, distant boids have minimal effect.

---

## Part 4: Advanced Concepts

### 4.1 Force Prioritization

**The Problem**: When multiple forces conflict (alignment pulls left, cohesion pulls right), boids can oscillate rapidly.

**Solution**: Dynamically adjust force weights based on situation.

**Implementation** (boid.js:113-135):
```javascript
const separationMag = smoothedSeparation.mag();

let alignmentWeight = 1.0;
let cohesionWeight = 1.0;
let separationWeight = 1.0;

if (separationMag > 0.05) {
    // High separation need - too close to neighbors
    separationWeight = 0.9;
    alignmentWeight = 0.1;
    cohesionWeight = 0.1;
} else if (separationMag > 0.02) {
    // Moderate separation need
    separationWeight = 0.7;
    alignmentWeight = 0.5;
    cohesionWeight = 0.5;
}
```

**What it does**: When separation force is high (boids are very close), reduce alignment and cohesion so separation dominates.

**Why it works**: Prevents situation where boid is pulled toward group center (cohesion) while simultaneously pushed away from individuals (separation), causing vibration.

**Priority Hierarchy**:
1. **High separation** (> 0.05): 90% separation, 10% alignment/cohesion
2. **Medium separation** (0.02-0.05): 70% separation, 50% alignment/cohesion
3. **Low separation** (< 0.02): 100% all forces

---

### 4.2 Oscillation Detection and Escape

**The Problem**: When forces rapidly conflict, boids can get stuck oscillating (turning left, then right, then left...).

**Detection** (boid.js:250-293):
```javascript
// Track heading history
this.headingHistory.push(currentHeading);
if (this.headingHistory.length > 10) {
    this.headingHistory.shift();
}

// Calculate direction changes
const changes = [];
for (let i = 1; i < this.headingHistory.length; i++) {
    let diff = this.headingHistory[i] - this.headingHistory[i - 1];
    // Normalize to -PI to PI
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    changes.push(diff);
}

// Count reversals (sign changes)
let reversals = 0;
for (let i = 1; i < changes.length; i++) {
    if ((changes[i] > 0 && changes[i-1] < 0) || (changes[i] < 0 && changes[i-1] > 0)) {
        reversals++;
    }
}

// If 3+ reversals in 6 frames → oscillating!
if (reversals >= 3 && !this.isEscaping) {
    this.triggerEscapeManeuver();
}
```

**What it detects**:
- Frame 1: turn left
- Frame 2: turn right
- Frame 3: turn left
- Frame 4: turn right
- → Reversing direction repeatedly = oscillation

**Escape Maneuver** (boid.js:334-344):
```javascript
triggerEscapeManeuver(randomFunc) {
    this.isEscaping = true;
    this.escapeEndTime = Date.now() + randomFunc(1500, 3000);

    // Pick direction 45-90 degrees from current
    const currentHeading = this.velocity.heading();
    const angleOffset = randomFunc(Math.PI / 4, Math.PI / 2);
    const direction = randomFunc() > 0.5 ? 1 : -1;

    this.escapeDirection = currentHeading + (angleOffset * direction);
}
```

**What escape does**:
- Overrides normal flocking forces
- Applies strong force in escape direction (flocking-forces.js:150-159)
- Lasts 1.5-3 seconds
- Cooldown period prevents immediate re-trigger

**Result**: Boid breaks out of oscillation trap and returns to normal behavior.

---

### 4.3 State Management

**Boids can be in multiple overlapping states**:

1. **ESCAPING** (highest priority)
   - Triggered by: oscillation or overcrowding
   - Overrides: all other behaviors
   - Duration: 1.5-3 seconds + 3-5 second cooldown

2. **SCATTERING** (second priority)
   - Triggered by: 'S' key or random timer
   - Reduces: flocking forces by scatter intensity
   - Duration: 1-2.5 seconds + 2 second ease-out

3. **INDEPENDENT** (third priority)
   - Triggered by: random timer (5-15% chance)
   - Disables: flocking forces
   - Duration: 2-8 seconds

4. **NORMAL** (default)
   - Full flocking behavior

**State Precedence** (flock-manager.js:47-78):
```javascript
for (let boid of this.boids) {
    if (isEscaping) {
        // Override with escape force
        boid.applyForces({
            separation: escapeForce,
            alignment: createVector(),
            cohesion: createVector()
        });
    } else if (isIndependent) {
        // Don't apply flocking forces - just drift
    } else {
        // Normal flocking
        const neighbors = findNeighbors(...);
        const forces = calculateFlockingForces(...);
        boid.applyForces(forces);
    }
}
```

**Why multiple states?**: Creates realistic variety in behavior:
- Most fish follow the group
- Some occasionally swim off alone
- All react to threats by scattering
- Stuck fish can break free

---

### 4.4 Scatter Behavior

**Two Types of Scatter**:

1. **Global Scatter** (triggered by 'S' key)
   - All boids scatter at once
   - Simulates loud noise or predator

2. **Individual Scatter** (random timer)
   - Individual boids randomly scatter
   - Creates organic, less uniform behavior

**Scatter Intensity** (boid.js:448-465):
```javascript
getScatterIntensity() {
    if (!this.isScattering) return 0;

    const currentTime = Date.now();

    if (currentTime < this.scatterEndTime) {
        return 1.0;  // Full scatter
    } else if (currentTime < this.scatterEndTime + this.scatterEaseTime) {
        // Easing back
        const elapsed = currentTime - this.scatterEndTime;
        let intensity = 1.0 - (elapsed / this.scatterEaseTime);
        return intensity * intensity;  // Quadratic ease-out
    }

    return 0;
}
```

**Ease-Out Curve**:
```
Intensity
1.0 |████████
    |        ╲
0.5 |         ╲
    |          ╲__
0.0 |            ╲______
    +--------------------- Time
    Scatter  Ease  Normal
     Phase   Out   Phase
```

**Force Blending** (boid.js:140-148):
```javascript
const scatterIntensity = this.getScatterIntensity();
if (scatterIntensity > 0) {
    scatterForce = calculateScatterForce(...);

    // Reduce flocking forces during scatter
    const flockingMultiplier = 1 - scatterIntensity;
    alignmentWeight *= flockingMultiplier;
    cohesionWeight *= flockingMultiplier;
    separationWeight *= flockingMultiplier;
}
```

**What this does**:
- During full scatter (intensity = 1): flocking forces = 0%, scatter force = 100%
- During ease-out (intensity = 0.5): flocking forces = 50%, scatter force = 50%
- After scatter (intensity = 0): flocking forces = 100%, scatter force = 0%

**Result**: Smooth transition from scatter back to normal flocking.

---

### 4.5 Independence Behavior

**Purpose**: Some boids occasionally "go their own way", ignoring the flock.

**Probability System** (boid.js:78-90, 306-328):
```javascript
// Random chance and check interval assigned per boid
this.independenceChance = randomFunc(0.05, 0.15);  // 5-15%
this.independenceCheckInterval = randomFunc(180, 600);  // 3-10 seconds

updateIndependence(randomFunc) {
    if (this.isIndependent) {
        this.independenceTimer--;
        if (this.independenceTimer <= 0) {
            this.isIndependent = false;  // Rejoin flock
        }
    } else {
        this.independenceFrameCounter++;
        if (this.independenceFrameCounter >= this.independenceCheckInterval) {
            this.independenceFrameCounter = 0;

            // Roll the dice
            if (randomFunc() < this.independenceChance) {
                this.isIndependent = true;
                this.independenceDuration = randomFunc(120, 480);  // 2-8 seconds
                this.independenceTimer = this.independenceDuration;
            }
        }
    }
}
```

**Example Timeline**:
```
Time 0-5s:  Normal flocking
Time 5s:    Check independence (7% chance) → roll = 0.03 → GO INDEPENDENT!
Time 5-9s:  Independent, drifting (flocking forces OFF)
Time 9s:    Timer expires → rejoin flock
Time 9-17s: Normal flocking
Time 17s:   Check again → roll = 0.82 → stay in flock
...
```

**Implementation in FlockManager** (flock-manager.js:69-78):
```javascript
const isIndependent = boid.getIsIndependent();

if (!isIndependent) {
    // Apply normal flocking
    const neighbors = findNeighbors(...);
    const forces = calculateFlockingForces(...);
    boid.applyForces(forces);
}
// If independent, skip force application → boid just drifts
```

**Why it's interesting**: Creates more natural, less "robotic" behavior. Real fish don't always follow the group perfectly.

---

## Part 5: Rendering Concepts

### 5.1 Coordinate Transformations

**What they are**: Changes to the coordinate system that affect how shapes are drawn.

**Two Main Transformations**:

1. **Translate**: Moves the origin (0,0) to a new position
2. **Rotate**: Rotates the entire coordinate system

**Implementation** (koi-renderer.js:55-57):
```javascript
context.push();               // Save current coordinate system
context.translate(x, y);      // Move origin to boid position
context.rotate(angle);        // Rotate to face movement direction
// ... draw koi at local (0,0) ...
context.pop();                // Restore original coordinate system
```

**Why this is useful**: We can draw the koi as if it's always at (0,0) facing right, then transform the entire drawing to the correct position and angle.

**Without transformations**:
```javascript
// Would need to manually rotate every point
headX = x + cos(angle) * headOffsetX - sin(angle) * headOffsetY;
headY = y + sin(angle) * headOffsetX + cos(angle) * headOffsetY;
// Repeat for hundreds of points... painful!
```

**With transformations**:
```javascript
translate(x, y);
rotate(angle);
ellipse(0, 0, headWidth, headHeight);  // Simple!
```

**Visual Example**:
```
Original:           After translate(100,50):    After rotate(45°):

Y                   Y                           Y
↑                   ↑                           ↑ ╱
│                   │                           │╱
│                   │                           ╱
└───→ X             └───→ X                    ╱────→ X
(0,0)               (0,0)→(100,50)             ╱ (0,0)
```

---

### 5.2 Curve Vertices

**What they are**: Points that define smooth, flowing curves (not straight lines).

**p5.js API** (koi-renderer.js:207-215):
```javascript
context.beginShape();
context.curveVertex(x1, y1);  // First point (control point)
context.curveVertex(x2, y2);  // Second point (actual start)
context.curveVertex(x3, y3);  // Third point
context.curveVertex(x4, y4);  // Fourth point (actual end)
context.curveVertex(x5, y5);  // Fifth point (control point)
context.endShape(CLOSE);
```

**How it works**: Creates a Catmull-Rom spline that passes through points 2-4, using points 1 and 5 for curve direction.

**Visual Example**:
```
Straight lines (vertex):
  ●---●---●---●

Curve (curveVertex):
  ●───╮
      ╰──●
         ╰──●
            ╰──●
```

**Usage - Tail Shape** (koi-renderer.js:207-215):
```javascript
// Calculate top and bottom edge points
const topPoints = [...];
const bottomPoints = [...];

// Draw smooth outline
context.curveVertex(topPoints[0].x, topPoints[0].y);  // Duplicate for control
for (let pt of topPoints) {
    context.curveVertex(pt.x, pt.y);  // Top edge
}
for (let i = bottomPoints.length - 1; i >= 0; i--) {
    context.curveVertex(bottomPoints[i].x, bottomPoints[i].y);  // Bottom edge (reversed)
}
context.curveVertex(bottomPoints[0].x, bottomPoints[0].y);  // Duplicate for control
```

**Result**: Smooth, natural-looking tail instead of polygonal shape.

---

### 5.3 Z-Ordering (Layering)

**The Problem**: In 2D graphics, later draws appear on top of earlier draws. Order matters!

**Rendering Order for Koi** (koi-renderer.js:65-76):
```javascript
// 1. Fins (drawn first, appear behind body)
this.drawFins(...);

// 2. Tail (drawn second, behind body)
this.drawTail(...);

// 3. Body outline (drawn on top of fins and tail)
this.drawBody(...);

// 4. Head (drawn before spots so spots appear on head)
this.drawHead(...);

// 5. Spots (drawn last, on top of everything including head)
this.drawSpots(...);
```

**Why this order?**:
- Fins stick out from body → draw first so body covers fin bases
- Tail extends from body → draw before body for same reason
- Spots are on top of body → draw last
- Head overlaps body → draw after body but before spots

**Visual Layering**:
```
Layer 5: ████ Spots (topmost)
Layer 4: ████████████ Head
Layer 3: ████████████████████ Body
Layer 2: ╰──████████────╯ Tail
Layer 1: ╱╲      ╱╲ Fins (bottommost)
```

---

### 5.4 Alpha Blending (Transparency)

**What it is**: Drawing semi-transparent shapes that blend with underlying colors.

**Alpha Values**:
- 0.0 = Completely transparent (invisible)
- 0.5 = 50% transparent
- 1.0 = Completely opaque (solid)

**Implementation** (koi-renderer.js:127, 189):
```javascript
context.fill(hue, saturation, brightness, 0.7);  // 70% opaque fins
context.fill(hue, saturation, brightness, 0.92); // 92% opaque body
```

**Why use transparency?**:
- **Depth**: Fins appear translucent, creating 3D illusion
- **Overlapping**: Multiple boids can overlap without completely hiding each other
- **Softness**: Slightly transparent edges look more natural than hard edges

**Trail Effect** (simulation-app.js:166):
```javascript
pg.background(bgBase - 5, bgBase + 5, bgBase, params.trailAlpha);
```

**How trail works**:
1. Each frame, draw semi-transparent background over entire canvas
2. Previous frame's drawings are partially visible through new background
3. Over multiple frames, old drawings fade out
4. Creates ghostly trails behind moving boids

**Trail Alpha Values**:
- Low (5-20): Long, persistent trails
- Medium (30-50): Moderate trails
- High (80-100): Very short trails, almost no persistence

---

### 5.5 Color Modulation

**What it is**: Dynamically adjusting colors based on external factors (audio, speed, etc.).

**Base Color + Modifiers** (simulation-app.js:197-211):
```javascript
renderer.render(
    pg,
    boid.position.x,
    boid.position.y,
    boid.velocity.heading(),
    {
        colorParams: boid.color,  // Base HSB color
        modifiers: {
            brightnessBoost: audioData.bass * 8 * params.audioReactivity,
            saturationBoost: audioData.treble * 10 * params.audioReactivity,
            sizeScale: 1 + audioData.amplitude * 0.3 * params.audioReactivity
        }
    }
);
```

**Brightness Boost** (koi-renderer.js:63):
```javascript
const brightness = Math.min(100, colorParams.b + brightnessBoost);
```

**Example**:
```
Base color: h=200 (blue), s=50, b=60
Audio: bass=0.8, reactivity=0.5
Boost: 0.8 * 8 * 0.5 = 3.2
Result: brightness = 60 + 3.2 = 63.2 (slightly brighter)

On strong bass hit (bass=1.0):
Boost: 1.0 * 8 * 0.5 = 4.0
Result: brightness = 64 (noticeably brighter)
```

**Visual Effect**: Koi pulse brighter on bass hits, more saturated on treble.

---

## Part 6: System Architecture

### 6.1 Separation of Concerns

**Principle**: Each module has ONE clear responsibility.

**Module Breakdown**:

```
simulation-app.js
    ↓ orchestrates
    ├─ flock-manager.js (manage flock)
    │   ├─ boid.js (physics)
    │   └─ flocking-forces.js (calculate forces)
    │
    ├─ koi-renderer.js (draw koi)
    │   ├─ koi-varieties.js (variety data)
    │   └─ koi-params.js (shape params)
    │
    ├─ audio-analyzer.js (process audio)
    ├─ pixel-buffer.js (manage buffer)
    └─ control-panel.js (UI)
```

**Why this matters**:
- **Testability**: Can test physics without rendering
- **Reusability**: KoiRenderer used in both simulation and editor
- **Maintainability**: Change rendering without touching physics
- **Clarity**: Easy to find where specific functionality lives

---

### 6.2 Data Flow

**Frame Update Cycle** (60 times per second):

```
1. simulation-app.draw()
   ↓
2. Get audio data
   audio.getAudioData() → {amplitude, bass, mid, treble}
   ↓
3. Update flock
   flock.update(params, audioData)
   ↓ for each boid:
   ├─ Find neighbors
   ├─ Calculate forces (separation, alignment, cohesion)
   ├─ Apply forces to acceleration
   ├─ Update velocity and position
   └─ Handle edge wrapping
   ↓
4. Render each boid
   renderer.render(pg, x, y, angle, params)
   ↓ (onto low-res buffer)
   ├─ Draw fins
   ├─ Draw tail
   ├─ Draw body
   ├─ Draw head
   └─ Draw spots
   ↓
5. Scale buffer to screen
   pixelBuffer.render(window, width, height)
```

**Data Flow Diagram**:
```
User Input → params
Audio File → analyser → frequency data → {amplitude, bass, mid, treble}
                                                ↓
params + audioData → FlockManager → force calculation → boid updates
                                                ↓
boid.position, boid.velocity, boid.appearance → KoiRenderer → pixels
                                                ↓
low-res buffer → PixelBuffer.render() → screen
```

---

### 6.3 Dependency Injection

**What it is**: Passing dependencies as parameters instead of hardcoding them.

**Example - Boid Constructor** (boid.js:19):
```javascript
constructor(width, height, randomFunc, createVectorFunc, floorFunc, p5Instance) {
    this.position = createVectorFunc(randomFunc(width), randomFunc(height));
    // ...
}
```

**Why inject functions?**:
- **Testing**: Can pass fake random function for predictable tests
- **Flexibility**: Can use different random implementations
- **Decoupling**: Boid doesn't depend on p5.js global functions

**Usage** (flock-manager.js:26-33):
```javascript
this.boids.push(new Boid(
    width,
    height,
    p5Funcs.random,
    p5Funcs.createVector,
    p5Funcs.floor,
    this.p5
));
```

**Alternative (bad)**:
```javascript
// Directly using p5 globals
this.position = createVector(random(width), random(height));
```
This tightly couples Boid to p5.js, making it untestable and inflexible.

---

## Part 7: Summary and Key Takeaways

### 7.1 Core Programming Lessons

1. **Object-Oriented Design**: Group related data and behavior into classes
2. **Separation of Concerns**: Each class has one responsibility
3. **Smoothing**: Prevent jerky motion with lerp and force smoothing
4. **Performance**: Use buffers and pixel scaling for efficiency
5. **State Management**: Handle multiple overlapping states with priorities
6. **Dependency Injection**: Pass dependencies for testability

### 7.2 Core Physics Lessons

1. **Newtonian Motion**: position ← velocity ← acceleration ← forces
2. **Vectors**: Magnitude + direction, essential for physics simulation
3. **Steering Forces**: Gradual direction changes via forces, not instant turns
4. **Boids Algorithm**: Three simple rules create complex flocking:
   - Separation: avoid crowding
   - Alignment: match neighbors' direction
   - Cohesion: move toward group center
5. **Emergence**: Global patterns from local rules
6. **Force Limiting**: Cap maximum force and speed for stability

### 7.3 Core Math Lessons

1. **Lerp**: Smooth blending between values
2. **Normalization**: Set vector length while keeping direction
3. **Distance**: Pythagorean theorem in 2D
4. **Trigonometry**: Sine waves for animation, atan2 for angles
5. **Inverse Square**: Force strength ∝ 1/distance²

### 7.4 How It All Works Together

**Simple Local Rules**:
- Each boid only sees nearby neighbors (perception radius)
- Applies three steering forces (separation, alignment, cohesion)
- Forces limited to prevent unrealistic motion
- Position updated based on velocity, velocity based on forces

**Emergent Global Behavior**:
- Entire flock moves as coordinated unit
- Forms organic, flowing patterns
- Reacts dynamically to environment (edges, audio)
- Creates beautiful, lifelike motion

**Performance Optimizations**:
- Low-res rendering buffer (4× speedup)
- Neighbor limiting (8 closest only)
- Dead zones (ignore tiny forces)
- Device-specific parameters

**Visual Appeal**:
- Realistic koi rendering with swimming animation
- Audio-reactive colors and movement
- Weighted variety distribution (common vs rare)
- Smooth trails and semi-transparent overlapping

---

## Code References

### Main Architecture
- `simulation-app.js:49-111` - Setup and initialization
- `simulation-app.js:159-256` - Main draw loop
- `flock-manager.js:42-92` - Flock update logic

### Physics
- `boid.js:10-501` - Boid class (physics and state)
- `flocking-forces.js:49-159` - Force calculation functions
- `boid.js:227-300` - Position/velocity update with damping

### Rendering
- `koi-renderer.js:30-81` - Main render function
- `koi-renderer.js:86-119` - Body segment calculation
- `koi-renderer.js:122-178` - Fin rendering
- `koi-renderer.js:180-217` - Tail rendering
- `koi-renderer.js:219-269` - Body and spot rendering

### Audio
- `audio-analyzer.js:6-128` - Web Audio API integration
- `audio-analyzer.js:88-113` - Frequency band extraction

### Optimization
- `pixel-buffer.js:6-91` - Low-res buffer management
- `flocking-forces.js:30-36` - Neighbor limiting

### Smoothing
- `boid.js:93-106` - Force smoothing and dead zones
- `boid.js:248` - Velocity smoothing
- `boid.js:203-225` - Derivative damping

### State Management
- `boid.js:57-105` - State declarations and comments
- `boid.js:306-328` - Independence behavior
- `boid.js:334-379` - Escape behavior
- `boid.js:416-442` - Scatter behavior

---

## Conclusion

This flocking visualization demonstrates how combining simple programming patterns with fundamental physics principles creates complex, beautiful behavior. The boids algorithm proves that **emergence** - global patterns from local rules - is one of nature's most powerful organizing principles.

By understanding these concepts, you can not only explain how this simulation works, but also apply the same principles to other projects: swarm robots, crowd simulation, particle systems, and more.

The key insight: **complexity doesn't require complicated rules. It requires the right simple rules, applied consistently, with proper smoothing and limiting.**

---

**For Further Exploration**:
- Craig Reynolds' original boids paper (1987)
- Steering behaviors for autonomous characters
- Flocking in nature (starlings, fish, ants)
- Emergence in complex systems
- PID controllers (Proportional-Integral-Derivative)
- Spatial data structures (quadtrees for performance)
