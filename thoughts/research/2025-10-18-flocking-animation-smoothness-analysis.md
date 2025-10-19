---
doc_type: research
date: 2025-10-18T21:47:00-07:00
title: "Flocking Animation Smoothness Analysis"
research_question: "How is animation smoothness currently handled and what causes jagged/jerky animation in the koi flocking visualization?"
researcher: Claude

git_commit: N/A (not a git repository)
branch: N/A
repository: visualizations

created_by: Claude
last_updated: 2025-10-18
last_updated_by: Claude

tags: [animation, smoothness, rendering, boids, motion, p5js, koi, visualization]
status: complete

related_docs: []
---

# Research: Flocking Animation Smoothness Analysis

**Date**: 2025-10-18T21:47:00-07:00
**Researcher**: Claude Code
**Git Commit**: N/A (not a git repository)
**Branch**: N/A
**Repository**: visualizations

## Research Question

How is animation smoothness currently handled in the koi flocking visualization, and what specific mechanisms might be causing jagged or jerky animation?

## Summary

The koi flocking visualization uses a combination of boids algorithm for movement, sine-wave-based swimming animations, and velocity smoothing via linear interpolation (lerp). After comprehensive analysis, I've identified **multiple smoothing mechanisms currently in place** and **several potential sources of jerkiness** related to timing, force calculations, and rendering approaches.

**Key Findings:**
1. **Velocity smoothing is implemented** but may be too aggressive (0.15 lerp factor)
2. **Frame-based timing** (using `frameCount`) creates frame-rate-dependent animations
3. **Discrete separation force calculations** can cause sudden velocity changes
4. **Pixel scaling artifacts** from low-res buffer upscaling affect perceived smoothness
5. **Multiple animation layers** (body undulation, fin movement, tail sway) share timing but may compound timing issues

## Detailed Findings

### 1. Swimming Animation Implementation

#### Body Undulation (sketch.js:539-550)

The body undulation creates the swimming wave motion:

```javascript
// Swimming wave motion - smoother, more natural
let swimSpeed = speed * 0.3;
let waveTime = frameCount * 0.1 * (1 + swimSpeed);

// Body segments - create smooth undulating motion
let numSegments = 10;
let segmentPositions = [];

for (let i = 0; i < numSegments; i++) {
    let t = i / numSegments;
    let x = lerp(7, -9, t) * sizeScale * this.lengthMultiplier;
    // Smoother wave with less amplitude
    let y = sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);
```

**How it works:**
- `waveTime = frameCount * 0.1 * (1 + swimSpeed)` - Time progresses based on frame count
- Wave phase shifts along body: `sin(waveTime - t * 3.5)` where `t` is segment position (0-1)
- Amplitude decreases toward tail: `1.5 * sizeScale * (1 - t * 0.2)`
- Each of 10 body segments follows this sine wave

**Potential Issue:** Frame-based timing (`frameCount`) means animation speed varies with framerate. At 60fps vs 30fps, the animation runs at different speeds, which can feel inconsistent.

#### Tail Sway (sketch.js:595)

```javascript
for (let i = 0; i <= tailSegments; i++) {
    let t = i / tailSegments;
    let x = tailStartX - (t * tailLength);
    let tailSway = sin(waveTime - 2.5 - t * 2) * 3 * sizeScale * (0.5 + t * 0.5);
    let width = lerp(tailWidthStart, tailWidthEnd, t) * sizeScale;
```

**How it works:**
- Uses same `waveTime` as body undulation for synchronized movement
- Phase offset: `waveTime - 2.5` positions tail wave relative to body
- Amplitude increases toward tail tip: `3 * sizeScale * (0.5 + t * 0.5)`
- Creates flowing, whip-like motion

**Potential Issue:** Same frame-based timing issue. Tail sway is calculated per-segment but phase relationship to body could create visible discontinuities if timing isn't smooth.

#### Fin Animation (sketch.js:691-697, 714-720)

```javascript
// Pectoral fins - positioned on body, sway with swimming motion
let finPos = segmentPositions[2];
let finSway = sin(waveTime - 0.5) * 0.8;

// Left pectoral fin
pg.push();
pg.translate(finPos.x, finPos.y - 2 * sizeScale + finSway);
pg.rotate(sin(waveTime * 1.2) * 0.15 - 2.5);
```

**How it works:**
- Fins sway vertically: `sin(waveTime - 0.5) * 0.8`
- Fins rotate: `sin(waveTime * 1.2) * 0.15` (different frequency for variety)
- Synchronized with body wave but different phase and frequency

**Potential Issue:** Multiple sine frequencies (`waveTime * 1.2` vs `waveTime`) could create interference patterns that feel jerky when framerates vary.

### 2. Current Smoothing Mechanisms

#### Velocity Smoothing (sketch.js:496-514)

The most important smoothing mechanism in the codebase:

```javascript
update(audio) {
    this.position.add(this.velocity);

    // Smooth velocity changes - creates more fluid, graceful movement
    // Instead of instantly applying acceleration, blend it in gradually
    let targetVelocity = p5.Vector.add(this.velocity, this.acceleration);

    // Audio affects max speed - amplitude makes them faster
    const speedMultiplier = 1 + audio.amplitude * params.audioReactivity;
    targetVelocity.limit(params.maxSpeed * speedMultiplier);

    // Smoothly interpolate from current velocity to target velocity
    // Lower value = smoother but slower response, higher = more responsive but jerkier
    let smoothing = 0.15;  // Much more smoothing to eliminate vibration
    this.velocity.lerp(targetVelocity, smoothing);

    // Cap acceleration to prevent jerky movements
    this.acceleration.limit(params.maxForce * 1.5);
    this.acceleration.mult(0);

    this.edges();
}
```

**How it works:**
- Calculates `targetVelocity` = current velocity + acceleration
- Uses `lerp(targetVelocity, 0.15)` to interpolate: `velocity = velocity * 0.85 + targetVelocity * 0.15`
- This creates exponential smoothing with 85% weight on previous velocity
- Acceleration is capped at `maxForce * 1.5` and then reset to zero

**Analysis:**
- **Smoothing factor 0.15 is quite low** - means velocity changes very slowly (15% of the difference per frame)
- At 60fps, it takes ~4.3 frames to reach 50% of target velocity
- This prevents sudden direction changes but may feel "sluggish" or create lag
- **Potential Issue:** If framerates drop, the same smoothing factor means even slower convergence to target velocity, which could feel like the koi is "swimming through molasses"

#### Boids Algorithm Parameters (sketch.js:14-24)

```javascript
let params = {
    pixelScale: 4,
    numBoids: 80,
    maxSpeed: 2,
    maxForce: 0.1,
    separationWeight: 1.2,
    alignmentWeight: 1.2,
    cohesionWeight: 1.0,
    trailAlpha: 40,
    audioReactivity: 0.5
};
```

**How they affect smoothness:**
- `maxSpeed: 2` - Maximum velocity magnitude (low value = slower, smoother movement)
- `maxForce: 0.1` - Maximum acceleration (low value = gradual changes)
- Perception radius: 80 pixels (sketch.js:239) - Large radius means koi react from farther away

**Analysis:**
- Low maxForce (0.1) combined with low smoothing (0.15) creates very gradual velocity changes
- This is generally good for smoothness but can feel unresponsive

#### Force Limiting in Boids (sketch.js:411, 438, 472)

Each boids behavior (align, cohesion, separation) applies force limiting:

```javascript
if (total > 0) {
    steering.div(total);
    steering.setMag(params.maxSpeed);
    steering.sub(this.velocity);
    steering.limit(params.maxForce);  // ← Force capping
}
```

**How it works:**
- Desired velocity is calculated based on neighbors
- Steering force = desired velocity - current velocity
- Force is capped at `maxForce` to prevent extreme accelerations

**Potential Issue:** When many neighbors are very close, the `div(total)` averaging could still produce large steering forces that get clamped, causing discrete jumps to exactly `maxForce`.

### 3. Visual Rendering Quality

#### Curve Vertex Usage (sketch.js:642-668)

Body outline uses p5.js `curveVertex()` for smooth interpolation:

```javascript
// Draw body outline first - create smooth contour
pg.fill(hue, saturation, brightness - 2, 0.92);
pg.beginShape();

// Start with head point and add as duplicate for curve control
let headSeg = segmentPositions[0];
let headPt = { x: headSeg.x + -0.4 * sizeScale, y: headSeg.y };
pg.curveVertex(headPt.x, headPt.y);  // ← Duplicate for smooth start

// Head point (actual)
pg.curveVertex(headPt.x, headPt.y);

// Top edge from front to back
for (let i = 0; i < numSegments; i++) {
    let seg = segmentPositions[i];
    pg.curveVertex(seg.x, seg.y - seg.w * 0.48);
}

// Bottom edge from back to front
for (let i = numSegments - 1; i >= 0; i--) {
    let seg = segmentPositions[i];
    pg.curveVertex(seg.x, seg.y + seg.w * 0.48);
}

// Close back to head point and add duplicate for smooth curve
pg.curveVertex(headPt.x, headPt.y);
pg.curveVertex(headPt.x, headPt.y);  // ← Duplicate for smooth end

pg.endShape(CLOSE);
```

**How it works:**
- `curveVertex()` creates Catmull-Rom splines (smooth curves through points)
- Duplicate vertices at start/end ensure smooth shape closure
- 10 body segments provide enough resolution for smooth curves

**Analysis:** This is well-implemented for smooth visual rendering. The curve interpolation should not cause jerkiness.

#### Body Segment Count (sketch.js:543)

```javascript
let numSegments = 10;
```

**Analysis:**
- 10 segments is a reasonable balance between smoothness and performance
- Each segment is independently positioned along sine wave
- Segments are close enough that curveVertex smoothing works well

**Potential Issue:** If segment positions are calculated inconsistently (due to timing issues), the smooth curve could still show discontinuities.

#### Pixel Scaling Effects (sketch.js:2, 15, 29-33)

```javascript
let pg; // Graphics buffer for low-res rendering
let params = {
    pixelScale: 4,  // ← Render at 1/4 resolution
    ...
};

// Create low-res graphics buffer
pg = createGraphics(
    floor(width / params.pixelScale),
    floor(height / params.pixelScale)
);
```

Then upscaled at render time (sketch.js:222):

```javascript
// Scale up the low-res buffer
image(pg, 0, 0, width, height);
```

**How it affects smoothness:**
- Everything is rendered at 1/4 resolution (e.g., 480x270 instead of 1920x1080)
- Upscaling introduces pixelation and can make sub-pixel movements invisible
- A koi moving 0.5 pixels in the low-res buffer appears as discrete jumps

**Analysis:** This is a **significant source of visual jerkiness**. Even perfectly smooth velocity changes appear jerky when quantized to a 4x coarser pixel grid.

**Example:**
- At full resolution, moving 0.5 pixels/frame is smooth
- At pixelScale=4, this becomes 0.125 "low-res pixels"/frame
- Movement only becomes visible every ~8 frames, creating stuttering

### 4. Potential Jerkiness Sources

#### A. Frame-Based Timing (sketch.js:540)

```javascript
let waveTime = frameCount * 0.1 * (1 + swimSpeed);
```

**Problem:**
- `frameCount` increments by 1 per frame, regardless of actual time elapsed
- At 60fps: `waveTime` increments by 0.1 every ~16.67ms
- At 30fps: `waveTime` increments by 0.1 every ~33.33ms
- **Animation runs at half speed when framerate drops**

**Recommended Fix:** Use time-based animation:
```javascript
let waveTime = millis() * 0.001 * 0.6 * (1 + swimSpeed);
// millis() is actual milliseconds, not frame count
```

#### B. Separation Force Discontinuities (sketch.js:444-476)

```javascript
separation(boids) {
    let steering = createVector();
    let total = 0;

    for (let other of boids) {
        let d = dist(
            this.position.x, this.position.y,
            other.position.x, other.position.y
        );

        // Larger separation distance to keep them more spread out
        if (other !== this && d < this.perceptionRadius * 0.7) {
            let diff = p5.Vector.sub(this.position, other.position);

            // Prevent extreme forces when very close - cap minimum distance
            let minDist = 8;  // Increased minimum distance
            if (d < minDist) d = minDist;  // ← DISCRETE JUMP

            diff.div(d * d); // Weight by distance
            steering.add(diff);
            total++;
        }
    }
```

**Problem:**
- When `d < 8`, it's clamped to exactly 8
- This creates a discrete jump in force: `diff.div(d*d)` suddenly changes from `diff.div(4*4)` to `diff.div(8*8)`
- Force changes by factor of 4 at the threshold
- Results in visible "popping" when koi get too close

**Recommended Fix:** Use smooth clamping:
```javascript
let smoothMinDist = max(d, minDist);
diff.div(smoothMinDist * smoothMinDist);
```
This is already done (same logic), but the discontinuity is **at the boundary** when crossing `d = minDist`.

**Better Fix:** Use a smooth falloff function:
```javascript
let safeDist = sqrt(d * d + minDist * minDist); // Never goes below minDist
diff.div(safeDist * safeDist);
```

#### C. Audio Reactivity Multipliers (sketch.js:488-489, 504-505)

```javascript
// Bass makes them separate more - push away on bass hits (gentle)
const bassBoost = 1 + audio.bass * 1.5 * params.audioReactivity;
separation.mult(params.separationWeight * bassBoost);

// Audio affects max speed - amplitude makes them faster
const speedMultiplier = 1 + audio.amplitude * params.audioReactivity;
targetVelocity.limit(params.maxSpeed * speedMultiplier);
```

**Problem:**
- Audio data can change rapidly between frames
- `audio.bass` and `audio.amplitude` are raw FFT values that can spike
- Multiplying forces/speeds by audio data introduces high-frequency jitter
- No smoothing applied to audio values

**Analysis:** While audio reactivity is a feature, the lack of temporal smoothing on audio values means forces can change abruptly frame-to-frame.

**Recommended Fix:** Smooth audio values over multiple frames:
```javascript
this.smoothedBass = lerp(this.smoothedBass || 0, audio.bass, 0.2);
this.smoothedAmplitude = lerp(this.smoothedAmplitude || 0, audio.amplitude, 0.2);
```

#### D. Velocity Lerp with Varying Framerates (sketch.js:509-510)

```javascript
let smoothing = 0.15;
this.velocity.lerp(targetVelocity, smoothing);
```

**Problem:**
- Lerp factor of 0.15 is constant, regardless of frame time
- At 60fps: velocity converges 15% toward target every 16.67ms
- At 30fps: velocity converges 15% toward target every 33.33ms
- **Different convergence rates** at different framerates

**Analysis:** This creates inconsistent feel across devices. A slow device feels "more damped" than a fast device.

**Recommended Fix:** Frame-rate-independent smoothing:
```javascript
let deltaTime = deltaTime || 16.67; // p5.js provides deltaTime
let smoothingPerSecond = 0.15 * 60; // 9.0 = target smoothing at 60fps
let frameSmoothness = 1 - pow(1 - smoothingPerSecond, deltaTime / 1000);
this.velocity.lerp(targetVelocity, frameSmoothness);
```

#### E. Pixel Scaling Quantization (sketch.js:15, 222)

```javascript
pixelScale: 4,
// ...
image(pg, 0, 0, width, height); // Upscale 4x
```

**Problem:**
- All rendering happens at 1/4 resolution
- Small movements are quantized to 4-pixel jumps on screen
- Creates visible "stepping" even with smooth velocity

**Analysis:** This is the most visually obvious source of jerkiness. The artistic style (pixelated aesthetic) intentionally trades smoothness for a retro look.

**Recommended Options:**
1. **Reduce pixelScale** to 2 for smoother motion while maintaining aesthetic
2. **Add sub-pixel rendering** by offsetting the low-res buffer slightly based on fractional positions
3. **Add motion blur** to smooth perceived motion between frames

#### F. Inconsistent Body Segment Positioning (sketch.js:546-550)

```javascript
for (let i = 0; i < numSegments; i++) {
    let t = i / numSegments;
    let x = lerp(7, -9, t) * sizeScale * this.lengthMultiplier;
    let y = sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);
```

**Problem:**
- Each segment's Y position depends on `sin(waveTime - t * 3.5)`
- If `waveTime` changes non-smoothly (due to frame-based timing), all segments jump simultaneously
- Phase relationship `(waveTime - t * 3.5)` could create wave compression/expansion if timing stutters

**Analysis:** The sine wave calculation itself is smooth, but fed with frame-based `waveTime`, it experiences discrete jumps.

### 5. Comparison with koi-editor.js

The koi-editor.js uses identical animation logic:

```javascript
// koi-editor.js:72
let waveTime = frameCount * 0.05;

// koi-editor.js:81
let y = sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);
```

**Key Difference:** Editor uses slower wave time increment (0.05 vs 0.1) and doesn't have velocity-based speedup.

**Analysis:** Editor is for design/preview, not interactive animation, so frame-based timing is less problematic.

## Code References

### Swimming Animation
- `/Users/seankim/dev/visualizations/flocking/sketch.js:539-550` - Body undulation calculation
- `/Users/seankim/dev/visualizations/flocking/sketch.js:595` - Tail sway calculation
- `/Users/seankim/dev/visualizations/flocking/sketch.js:691-726` - Fin animation

### Smoothing Mechanisms
- `/Users/seankim/dev/visualizations/flocking/sketch.js:496-517` - Velocity smoothing with lerp
- `/Users/seankim/dev/visualizations/flocking/sketch.js:14-24` - Boids parameters
- `/Users/seankim/dev/visualizations/flocking/sketch.js:391-476` - Boids force calculations

### Rendering
- `/Users/seankim/dev/visualizations/flocking/sketch.js:642-668` - Curve vertex body rendering
- `/Users/seankim/dev/visualizations/flocking/sketch.js:2, 15, 29-33, 222` - Pixel scaling implementation

### Potential Issues
- `/Users/seankim/dev/visualizations/flocking/sketch.js:540` - Frame-based timing
- `/Users/seankim/dev/visualizations/flocking/sketch.js:459-460` - Separation force clamping
- `/Users/seankim/dev/visualizations/flocking/sketch.js:488-489, 504-505` - Audio reactivity multipliers
- `/Users/seankim/dev/visualizations/flocking/sketch.js:509-510` - Frame-rate-dependent lerp

## Architecture Documentation

### Animation Timing Architecture

**Current Approach:**
```
frameCount (increments by 1 per frame)
    ↓
waveTime = frameCount * 0.1 * (1 + swimSpeed)
    ↓
body segments: sin(waveTime - t * 3.5)
tail segments: sin(waveTime - 2.5 - t * 2)
fin rotation: sin(waveTime * 1.2)
```

**Frame-rate dependency:** All animations speed up/slow down with framerate changes.

### Velocity Smoothing Architecture

**Current Approach:**
```
Boids forces (separation, alignment, cohesion)
    ↓
acceleration = sum of weighted forces
    ↓
targetVelocity = currentVelocity + acceleration
    ↓
targetVelocity.limit(maxSpeed)
    ↓
velocity.lerp(targetVelocity, 0.15) ← 15% convergence per frame
    ↓
position += velocity
```

**Smoothing characteristics:**
- Heavy damping (85% retention of previous velocity)
- Frame-rate dependent convergence speed
- Good for preventing sudden direction changes
- Can feel "laggy" or "underwater"

### Rendering Pipeline

```
Low-res buffer (pg):
  width / 4 × height / 4 pixels
    ↓
Draw all koi at low resolution
    ↓
Upscale to full screen: image(pg, 0, 0, width, height)
    ↓
Nearest-neighbor scaling (pixelated aesthetic)
```

**Visual quantization:** Sub-pixel movements invisible until accumulating to 1 low-res pixel.

## Technical Analysis: Smooth vs. Jerky Motion

### What Makes Motion Appear Smooth

1. **Continuous velocity changes** - No discrete jumps in speed or direction
2. **Frame-rate independence** - Animation feels same at 30fps or 60fps
3. **Temporal continuity** - Each frame follows logically from previous
4. **Sub-pixel precision** - Movements can be fractional pixels
5. **Consistent timing** - Predictable progression over time

### What Makes Motion Appear Jerky

1. **Discrete value jumps** - Forces or velocities that suddenly change
2. **Frame-based timing** - Animation speed varies with framerate
3. **Quantization** - Position changes invisible until threshold crossed
4. **Inconsistent damping** - Smoothing that varies with framerate
5. **Phase discontinuities** - Wave calculations that skip or jump

### Current Implementation Analysis

**Smooth aspects:**
✅ Velocity lerp smoothing prevents sudden direction changes
✅ Low maxForce limits rate of acceleration
✅ Curve vertex rendering creates smooth body shapes
✅ Sine-wave body undulation is mathematically smooth
✅ Force limiting in boids prevents extreme accelerations

**Jerky aspects:**
❌ Frame-based timing (waveTime) creates framerate-dependent animation speed
❌ Pixel scaling (4x) quantizes small movements
❌ Separation force clamping creates discrete jumps at threshold
❌ Audio reactivity introduces high-frequency force changes
❌ Frame-dependent lerp smoothing inconsistent across devices
❌ Multiple sine frequencies (waveTime, waveTime * 1.2) can create interference

## Concrete Recommendations for Improving Smoothness

### Priority 1: Critical Issues (Biggest Impact)

**1. Replace frame-based timing with time-based timing**

Current:
```javascript
let waveTime = frameCount * 0.1 * (1 + swimSpeed);
```

Recommended:
```javascript
let waveTime = millis() * 0.001 * 0.6 * (1 + swimSpeed * 0.3);
// millis() is real time in milliseconds
// 0.001 converts to seconds
// 0.6 is animation speed (tunable)
// swimSpeed influence reduced to 0.3 for stability
```

**Impact:** Ensures consistent animation speed regardless of framerate.

**2. Reduce pixel scaling or add sub-pixel interpolation**

Option A - Reduce pixelScale:
```javascript
pixelScale: 2,  // Changed from 4
```

Option B - Add sub-pixel smoothing (keep pixelScale: 4):
```javascript
// In draw(), before image(pg, 0, 0, width, height):
let avgVelocity = calculateAverageVelocity(flock); // Get average motion
let offsetX = (avgVelocity.x % 1) * params.pixelScale;
let offsetY = (avgVelocity.y % 1) * params.pixelScale;
image(pg, offsetX, offsetY, width, height);
```

**Impact:** Reduces visual quantization, making small movements visible.

**3. Make velocity lerp frame-rate-independent**

Current:
```javascript
let smoothing = 0.15;
this.velocity.lerp(targetVelocity, smoothing);
```

Recommended:
```javascript
let smoothingPerSecond = 9.0; // Target: 15% per frame at 60fps = 900% per second
let frameTime = deltaTime / 1000; // deltaTime in milliseconds, convert to seconds
let frameSmoothness = 1 - pow(1 - smoothingPerSecond, frameTime);
this.velocity.lerp(targetVelocity, frameSmoothness);
```

**Impact:** Consistent smoothing feel across all framerates.

### Priority 2: Significant Improvements

**4. Smooth audio reactivity values**

Add to Boid constructor:
```javascript
this.smoothedBass = 0;
this.smoothedAmplitude = 0;
```

In update():
```javascript
this.smoothedBass = lerp(this.smoothedBass, audio.bass, 0.2);
this.smoothedAmplitude = lerp(this.smoothedAmplitude, audio.amplitude, 0.2);

// Then use smoothed values:
const bassBoost = 1 + this.smoothedBass * 1.5 * params.audioReactivity;
const speedMultiplier = 1 + this.smoothedAmplitude * params.audioReactivity;
```

**Impact:** Prevents jittery force changes from audio spikes.

**5. Smooth separation force clamping**

Current:
```javascript
let minDist = 8;
if (d < minDist) d = minDist;
diff.div(d * d);
```

Recommended:
```javascript
let minDist = 8;
// Smooth minimum: never goes below minDist, smooth transition
let safeDist = sqrt(d * d + minDist * minDist * 0.25);
diff.div(safeDist * safeDist);
```

**Impact:** Eliminates force discontinuity at close range.

### Priority 3: Fine-Tuning

**6. Increase velocity smoothing slightly**

```javascript
let smoothing = 0.2;  // Changed from 0.15
```

**Impact:** Slightly faster response while maintaining smoothness.

**7. Reduce force limit multiplier**

Current:
```javascript
this.acceleration.limit(params.maxForce * 1.5);
```

Recommended:
```javascript
this.acceleration.limit(params.maxForce * 1.2);
```

**Impact:** Tighter force control, less potential for spikes.

**8. Add easing to fin animations**

Current fin animations use raw sine waves. Consider adding ease-in/out:

```javascript
// Instead of: sin(waveTime * 1.2) * 0.15
let rawRotation = sin(waveTime * 1.2) * 0.15;
let easedRotation = rawRotation * (1 - cos(rawRotation * PI) * 0.5);
```

**Impact:** More organic, less mechanical fin movement.

### Priority 4: Advanced (Optional)

**9. Add motion blur for pixelated aesthetic**

Render current frame with slight alpha over previous frame:

```javascript
// In draw(), before rendering boids:
pg.background(bgBase - 5, bgBase + 5, bgBase, params.trailAlpha + 50);
// Increased alpha creates motion blur
```

**Impact:** Perceived smoothness even with pixel quantization.

**10. Implement predictive smoothing**

Instead of lerping toward `targetVelocity`, lerp toward predicted next velocity:

```javascript
let predictedVelocity = p5.Vector.add(targetVelocity, this.acceleration);
this.velocity.lerp(predictedVelocity, smoothing * 0.5);
```

**Impact:** Reduces lag in response to direction changes.

## Summary of Jerkiness Sources (Ranked by Impact)

1. **Pixel scaling (4x)** - Most visually obvious, quantizes all movement
2. **Frame-based timing** - Inconsistent animation speed across framerates
3. **Frame-dependent lerp** - Smoothing feels different on different devices
4. **Separation force clamping** - Discrete jump when koi get close
5. **Audio reactivity** - High-frequency jitter from unsmoothed audio data
6. **Multiple sine frequencies** - Potential interference patterns

## Open Questions

1. **Desired aesthetic balance** - How much pixelation is intentional for the visual style?
2. **Performance constraints** - What is minimum target framerate? (affects smoothing calculations)
3. **Audio reactivity importance** - Is the bass/amplitude response a core feature to preserve?
4. **User perception** - Which specific movements feel most jerky? (body wave, direction changes, fin motion?)
5. **Device target** - Is this primarily for high-refresh displays or should it gracefully degrade?

## Next Steps for Implementation

If implementing smoothness improvements:

1. **Start with timing fix** - Convert to `millis()`-based animation (Priority 1, item 1)
2. **Test pixel scale reduction** - Try `pixelScale: 2` and evaluate visual impact (Priority 1, item 2)
3. **Add frame-rate-independent smoothing** - Use deltaTime for consistent feel (Priority 1, item 3)
4. **Measure framerate** - Add FPS counter to understand performance characteristics
5. **A/B test** - Compare before/after with users to validate improvements
6. **Iterate on smoothing factor** - Tune based on feel after fixing timing issues

---

*This research provides a comprehensive analysis of the current smoothness implementation and identifies specific, actionable improvements to reduce jerkiness in the koi swimming animation.*
