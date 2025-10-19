---
doc_type: research
date: 2025-10-19T14:44:28+00:00
title: "Koi Flocking Simulation: Input-Driven Visualization Mapping Analysis"
research_question: "What are all the behavior parameters, visual properties, and force systems in the koi flocking simulation, and what would be meaningful mappings for external inputs (music/MIDI/biometrics)?"
researcher: Sean Kim

git_commit: e8ec10a16e30cd6f21558d42180849dff8f67916
branch: main
repository: visualizations

created_by: Sean Kim
last_updated: 2025-10-19
last_updated_by: Sean Kim

tags:
  - flocking
  - koi
  - visualization
  - audio-reactive
  - midi
  - biometrics
  - input-mapping
  - boids
  - forces
  - rendering
status: completed

related_docs:
  - thoughts/research/2025-10-18-boids-oscillation-mitigation-using-aerospace-control-theory.md
  - thoughts/research/2025-10-18-koi-flocking-jerkiness-accumulation-analysis.md
  - thoughts/research/2025-10-18-flocking-animation-smoothness-analysis.md
---

# Research: Koi Flocking Simulation Input-Driven Visualization Mapping Analysis

**Date**: October 19, 2025, 14:44:28 UTC
**Researcher**: Sean Kim
**Git Commit**: e8ec10a16e30cd6f21558d42180849dff8f67916
**Branch**: main
**Repository**: visualizations

## Research Question

What are all the behavior parameters, visual properties, and force systems in the koi flocking simulation, and what would be meaningful mappings for external inputs (music/audio, MIDI, biometrics) to create impactful, artistically/scientifically interesting visualizations?

## Executive Summary

The koi flocking simulation is a sophisticated aerospace control theory-based implementation with extensive modulatable parameters across three key domains:

1. **Behavior Parameters**: 20+ parameters controlling flocking forces, movement, and individual behaviors
2. **Visual Properties**: 40+ parameters controlling color, shape, animation, and rendering
3. **Force Systems**: Multi-layered force calculation with smoothing, prioritization, and escape behaviors

The current implementation already includes basic audio reactivity (bass/treble/amplitude). This research identifies **high-impact mapping opportunities** across music/MIDI/biometrics that would create meaningful, visually compelling, and scientifically interesting visualizations.

**Key Finding**: The most impactful visualizations will come from mapping inputs to **force weights** (affecting collective behavior) and **individual fish properties** (size, speed, color) rather than global parameters. This creates emergent, organic responses where the collective system responds naturally to inputs.

## 1. Current Behavior Parameters

### 1.1 Global Flocking Parameters
**Location**: `flocking/src/apps/simulation-app.js:22-32`

```javascript
let params = {
    pixelScale: 4,
    numBoids: 80,
    maxSpeed: 0.5,
    maxForce: 0.1,
    separationWeight: 0.5,
    alignmentWeight: 1.2,
    cohesionWeight: 1.0,
    trailAlpha: 40,
    audioReactivity: 0.5
};
```

**Mapping Opportunities**:
- `maxSpeed` (0.5): Overall swimming speed - **HIGH IMPACT** for tempo/energy mapping
- `maxForce` (0.1): Steering strength - affects responsiveness to forces
- `separationWeight` (0.5): Personal space preference - **HIGH IMPACT** for stress/anxiety mapping
- `alignmentWeight` (1.2): Tendency to match neighbors' direction - **HIGH IMPACT** for conformity/harmony mapping
- `cohesionWeight` (1.0): Attraction to group center - **HIGH IMPACT** for social/isolation mapping
- `numBoids` (80): Flock size - **MEDIUM IMPACT** for density/crowd mapping

### 1.2 Individual Boid Properties
**Location**: `flocking/src/flocking/boid.js:19-74`

**Physics Properties**:
- `perceptionRadius` (50): How far a boid can "see" neighbors - **HIGH IMPACT** for awareness mapping
- `speedMultiplier` (0.6-1.3): Individual speed variation - **HIGH IMPACT** for energy diversity
- `smoothedSpeed`: Smoothed velocity magnitude for animation

**Size Variations** (lines 46-49):
- `sizeMultiplier` (0.6-1.4): Overall size variation - **MEDIUM IMPACT** for prominence mapping
- `lengthMultiplier` (0.85-1.25): Body length variation
- `tailLength` (0.9-1.8): Tail length variation

**Animation Properties** (line 55):
- `animationOffset` (0 to 2π): Phase offset for undulation - creates async swimming

**Behavioral States**:
- `isIndependent` (boolean): Currently swimming solo - **HIGH IMPACT** for individualism mapping
- `independenceChance` (0.05-0.15): Probability of going solo - **HIGH IMPACT** for conformity mapping
- `independenceDuration` (120-480 frames): How long to stay independent
- `isEscaping` (boolean): Currently escaping oscillation/overcrowding
- `escapeDirection` (angle): Direction to escape towards

**Advanced Control Systems** (aerospace theory):
- `previousSeparation/Alignment/Cohesion`: Force smoothing vectors
- `headingVelocity`: Derivative damping for PID control
- `headingHistory`: Oscillation detection buffer

### 1.3 Force Calculation Parameters
**Location**: `flocking/src/flocking/flocking-forces.js`

**Neighbor Detection** (lines 14-36):
- `maxNeighbors` (8): Limits neighbors to prevent force conflicts
- Distance-sorted neighbor selection

**Separation Force Details** (lines 106-138):
- `perceptionRadius * 0.7`: Active separation distance
- `minDist` (8): Minimum distance cap to prevent extreme forces
- Inverse square weighting: `diff.div(d * d)` - closer = stronger force

**Escape Force** (lines 150-159):
- `maxSpeed * 1.2`: Escape speed boost (20% faster)
- `maxForce * 2`: Double strength steering for escape maneuvers

### 1.4 Force Smoothing and Prioritization
**Location**: `flocking/src/flocking/boid.js:84-154`

**Smoothing Parameters**:
- `forceSmoothing` (0.25): Blend ratio between previous and current forces - **MEDIUM IMPACT**
- `deadZoneThreshold` (0.01): Ignore tiny forces to prevent micro-oscillations
- `smoothing` (0.15): Velocity interpolation factor

**Force Prioritization** (lines 107-133):
When `separationMag > 0.05` (high separation need):
- `separationWeight = 0.9` (90%)
- `alignmentWeight = 0.1` (10%)
- `cohesionWeight = 0.1` (10%)

When `separationMag > 0.02` (moderate separation):
- `separationWeight = 0.7` (70%)
- `alignmentWeight = 0.5` (50%)
- `cohesionWeight = 0.5` (50%)

**Overcrowding Escape Triggers** (lines 136-148):
- `neighborCount > 15`: Too many neighbors
- `totalForceMag > 0.25`: Force overload

### 1.5 Derivative Damping (PID Control)
**Location**: `flocking/src/flocking/boid.js:171-193`

**Parameters**:
- `dampingCoefficient` (0.45): Resistance to rapid turning - **MEDIUM IMPACT** for smoothness

**How it works**:
Calculates heading change rate and applies perpendicular damping force to resist rapid direction changes, creating smoother, more graceful swimming motion.

## 2. Visual Properties

### 2.1 Koi Rendering Properties
**Location**: `flocking/src/core/koi-renderer.js`

**Color System (HSB)**:
- `hue` (0-360): Base color from variety
- `saturation` (0-100): Color intensity
- `brightness` (0-100): Lightness

**Current Audio Modulation** (`simulation-app.js:347-350`):
```javascript
brightnessBoost: audioData.bass * 8 * params.audioReactivity,
saturationBoost: audioData.treble * 10 * params.audioReactivity,
sizeScale: 1 + audioData.amplitude * 0.3 * params.audioReactivity
```

### 2.2 Shape Parameters
**Location**: `flocking/src/core/koi-params.js:6-52`

**Body Structure**:
- `numSegments` (10): Body segment count - affects detail level
- `bodyPeakWidth` (8.0): Maximum width - **MEDIUM IMPACT**
- `bodyFrontWidth` (4.5): Front width
- `bodyAsymmetry` (0.9): Belly vs back roundness - **LOW IMPACT** for subtle variation
- `bodyTaperStart` (0.15): Where tapering begins
- `bodyTaperStrength` (0.9): Tapering intensity

**Head**:
- `headWidth` (7.5), `headHeight` (5.0)
- Eye positions: `eyeX`, `eyeYTop`, `eyeYBottom`, `eyeSize`

**Tail**:
- `tailWidthStart` (0.2), `tailWidthEnd` (1.5)
- `tailStartX` (-1), `tailSplit` (0.5)

**Fins** (positions and angles):
- Dorsal: `dorsalPos` (4), `dorsalY` (-0.5)
- Pectoral: `pectoralPos` (2), with top/bottom Y and angles
- Ventral: `ventralPos` (7), with top/bottom Y and angles

### 2.3 Animation Properties
**Location**: `flocking/src/core/koi-renderer.js:86-119`

**Wave Animation** (`simulation-app.js:320`):
```javascript
const waveTime = frameCount * 0.1 * (1 + boid.smoothedSpeed * 0.3) + boid.animationOffset;
```

**Parameters**:
- `frameCount * 0.1`: Base animation speed - **HIGH IMPACT** for tempo mapping
- `boid.smoothedSpeed * 0.3`: Speed affects undulation rate
- `boid.animationOffset`: Individual phase offset (0-2π) - prevents synchronized swimming

**Segment Calculation** (`koi-renderer.js:92`):
```javascript
const y = Math.sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);
```
- `waveTime - t * 3.5`: Wave propagation along body
- `1.5 * sizeScale`: Wave amplitude - **HIGH IMPACT** for expressiveness
- `(1 - t * 0.2)`: Amplitude taper towards tail

**Fin Movement** (`koi-renderer.js:126`):
```javascript
const finSway = Math.sin(waveTime - 0.5) * 0.8;
```

**Tail Movement** (`koi-renderer.js:199`):
```javascript
const tailSway = Math.sin(waveTime - 2.5 - t * 2) * 3 * sizeScale * (0.5 + t * 0.5);
```

### 2.4 Koi Varieties and Patterns
**Location**: `flocking/src/core/koi-varieties.js`

**26 Traditional Varieties** with weighted distribution:
- Gosanke (35%): kohaku, sanke, showa
- Utsurimono (15%): shiro-utsuri, hi-utsuri, ki-utsuri
- Bekko (4%): shiro/aka/ki-bekko
- Hikarimono (15%): metallic varieties
- Asagi/Shusui (8%): blue-scaled
- Specialty (10%): tancho, gin-rin, doitsu, butterfly
- Solid (10%): chagoi, soragoi, benigoi, ochiba

**Pattern System** (lines 79-375):
Each variety has unique spot generation:
- Number of spots: 2-6+ depending on variety
- Spot properties: `segment` (0-7), `offsetY`, `size`, `color` (HSB)
- Variety-specific rules (e.g., Tancho has single red circle on head)

**Mapping Opportunity**: Could generate new patterns or modulate existing ones based on input.

### 2.5 Rendering Modifiers
**Location**: `flocking/src/apps/simulation-app.js:346-351`

**Current Modifiers**:
```javascript
modifiers: {
    brightnessBoost: audioData.bass * 8 * params.audioReactivity,
    saturationBoost: audioData.treble * 10 * params.audioReactivity,
    sizeScale: 1 + audioData.amplitude * 0.3 * params.audioReactivity
}
```

**Available for Mapping**:
- `brightnessBoost`: Additive brightness (currently bass-driven)
- `saturationBoost`: Additive saturation (currently treble-driven)
- `sizeScale`: Multiplicative size scaling (currently amplitude-driven)

### 2.6 Background and Environment
**Location**: `flocking/src/apps/simulation-app.js:232-234`

```javascript
const bgBase = 15 + audioData.bass * 5 * params.audioReactivity;
pg.background(bgBase - 5, bgBase + 5, bgBase);
```

**Parameters**:
- Base darkness: 15
- Bass modulation: 0-5 additional brightness
- RGB slightly varied for subtle color

## 3. Force and Behavior System Architecture

### 3.1 Force Calculation Pipeline

**Step 1: Neighbor Finding** (`flocking-forces.js:14-36`)
```
For each boid:
  1. Find all boids within perceptionRadius (50)
  2. Sort by distance
  3. Limit to closest 8 neighbors (maxNeighbors)
  → Prevents oscillation from too many conflicting forces
```

**Step 2: Calculate Raw Forces** (`flock-manager.js:94-119`)
```
alignment = calculateAlignment(boid, neighbors, maxSpeed, maxForce)
cohesion = calculateCohesion(boid, neighbors, maxSpeed, maxForce)
separation = calculateSeparation(boid, neighbors, perceptionRadius, maxSpeed, maxForce)
```

**Step 3: Force Smoothing** (`flock-manager.js:122-142`)
```
smoothedAlignment = lerp(previousAlignment, alignment, forceSmoothness=0.3)
smoothedCohesion = lerp(previousCohesion, cohesion, forceSmoothness=0.3)
smoothedSeparation = lerp(previousSeparation, separation, forceSmoothness=0.3)
```

**Step 4: Apply Weights** (`flock-manager.js:144-150`)
```
smoothedAlignment *= alignmentWeight (1.2)
smoothedCohesion *= cohesionWeight (1.0)
smoothedSeparation *= separationWeight (0.5) * bassBoost (1 + bass * 1.5)
```

**Step 5: Force Prioritization** (`boid.js:107-133`)
```
if separationMag > 0.05:
    separationWeight = 0.9, others = 0.1
elif separationMag > 0.02:
    separationWeight = 0.7, others = 0.5
```

**Step 6: Apply to Acceleration** (`boid.js:151-153`)
```
acceleration += smoothedAlignment
acceleration += smoothedCohesion
acceleration += smoothedSeparation
```

**Step 7: Derivative Damping** (`boid.js:171-193`)
```
headingChange = currentHeading - previousHeading
dampingForce = perpendicular to velocity, magnitude = headingChange * -dampingCoefficient * speed
acceleration += dampingForce
```

**Step 8: Update Velocity** (`boid.js:195-207`)
```
targetVelocity = velocity + acceleration
targetVelocity.limit(maxSpeed * speedMultiplier * audioSpeedMult)
velocity = lerp(velocity, targetVelocity, smoothing=0.15)
```

**Step 9: Update Position** (`boid.js:195`)
```
position += velocity
```

### 3.2 Special Behavior Modes

**Independence Behavior** (`boid.js:277-299`):
- Check every 180-600 frames (3-10 seconds at 60fps)
- 5-15% chance to go independent when checking
- Duration: 120-480 frames (2-8 seconds)
- Effect: Flocking forces not applied, boid drifts freely

**Escape Behavior** (`boid.js:305-350`):
Triggered when:
- Oscillation detected (3+ direction reversals in 6 frames)
- Overcrowding (>15 neighbors)
- Force overload (total force magnitude >0.25)

Escape mechanics:
- Duration: 1500-3000ms
- Direction: 45-90° from current heading
- Force: `maxForce * 2` (double strength)
- Cooldown: 3-5 seconds after escape

**Scatter Mode** (`simulation-app.js:164-224`):
Global scatter (keyboard 's'):
- Duration: 3 seconds
- Each boid gets random direction
- Ease-out transition over 2 seconds

Individual scatter:
- Random timing: 5-20 seconds between scatters
- Duration: 1-2.5 seconds per scatter
- Individual ease-out: 2 seconds

### 3.3 Audio Integration (Current)
**Location**: `flocking/src/audio/audio-analyzer.js`

**FFT Analysis**:
- `fftSize`: 256 (128 frequency bins)
- `frequencyData`: Uint8Array of amplitudes (0-255)

**Frequency Bands** (`audio-analyzer.js:108-110`):
```javascript
bass = getFrequencyRange(0, 4) / 255      // Bins 0-3 (0-344 Hz approx)
mid = getFrequencyRange(4, 16) / 255      // Bins 4-15 (344-1290 Hz approx)
treble = getFrequencyRange(16, 32) / 255  // Bins 16-31 (1290-2580 Hz approx)
amplitude = average of all bins
```

**Current Mappings**:
1. Bass → Separation force boost (`flock-manager.js:149`)
2. Bass → Background brightness (`simulation-app.js:232`)
3. Bass → Brightness boost (`simulation-app.js:347`)
4. Treble → Saturation boost (`simulation-app.js:348`)
5. Amplitude → Size scale (`simulation-app.js:349`)
6. Amplitude → Speed (`boid.js:201`)

## 4. Input Mapping Opportunities

### 4.1 Music/Audio Mappings

#### 4.1.1 High-Impact Mappings (Recommended)

**Frequency Bands → Force Weights**:
```
BASS (0-344 Hz) → separationWeight (0.2-1.5)
  - More bass = more personal space, explosive separation
  - Current: 1 + bass * 1.5 (already implemented well)
  - KEEP THIS - it works beautifully

MID (344-1290 Hz) → alignmentWeight (0.5-2.0)
  - Mid frequencies = coordination, synchronization
  - Higher mid = tighter alignment, more synchronized movement
  - Maps to rhythm section, vocals

TREBLE (1290-2580 Hz) → cohesionWeight (0.3-1.5)
  - High frequencies = attraction, bringing together
  - More treble = tighter clustering
  - Maps to cymbals, hi-hats, bright tones

AMPLITUDE → maxSpeed (0.3-1.2)
  - Overall energy level controls swimming speed
  - Current: Individual speed multiplier (good)
  - ENHANCE: Also modulate global maxSpeed
```

**Onset Detection → Scatter Triggers**:
```
BASS ONSET (sudden bass spike) → Individual scatter
  - Kick drum hits = individual fish dart away
  - Probability based on onset strength (0.1-0.8)

TREBLE ONSET (sudden treble spike) → Brief cohesion boost
  - Snare hits, cymbals = momentary clustering
  - Duration: 100-300ms

GLOBAL ONSET (any sudden spike) → Escape trigger
  - Sudden loud sounds = fish flee
  - Simulates startle response
```

**Spectral Properties → Visual**:
```
SPECTRAL CENTROID (brightness of sound) → saturationBoost
  - Brighter sound = more saturated colors
  - Current: treble-based (good approximation)

SPECTRAL ROLLOFF → brightnessBoost
  - Higher rolloff = more high-frequency content = brighter fish
  - Alternative to simple bass mapping

ZERO CROSSING RATE → animationOffset modulation
  - Noisier sounds = more chaotic undulation phases
  - Creates visual texture matching audio texture
```

**Tempo/Rhythm → Animation**:
```
BPM → waveTime multiplier (0.05-0.2)
  - Faster music = faster undulation
  - Sync swimming to tempo
  - frameCount * (0.1 * tempoMultiplier)

BEAT PHASE → tailSway amplitude
  - Tails sway in sync with beat
  - Phase-locked to beat tracker
  - Creates rhythmic visual pulse

DOWNBEAT → Brief independence suppression
  - On downbeats, all fish flock together
  - Creates rhythmic cohesion/dispersion cycle
```

#### 4.1.2 Medium-Impact Mappings

**Harmonicity → perceptionRadius**:
```
HARMONIC (pure tones) → perceptionRadius (30-70)
  - More harmonic = wider awareness
  - Inharmonic (noise) = narrower awareness
  - Affects how many neighbors each fish sees
```

**RMS Energy Envelope → dampingCoefficient**:
```
LOW ENERGY → dampingCoefficient (0.3-0.6)
  - Quiet = more damping = smoother, more graceful
  - Loud = less damping = more reactive, jittery
  - Modulates smoothness dynamically
```

**Frequency Flux (change rate) → independenceChance**:
```
HIGH FLUX (rapidly changing) → independenceChance (0.05-0.3)
  - Chaotic music = more fish go solo
  - Stable music = more flocking
  - Maps musical complexity to behavioral complexity
```

#### 4.1.3 Low-Impact Mappings (Subtle)

**Spectral Contrast → bodyAsymmetry**:
- Different frequency ranges have different energy levels
- Creates variety in fish shapes

**Mel-Frequency Bands (12) → Individual fish colors**:
- Each frequency band controls hue offset for subset of fish
- Creates color palette shifts with musical content

**Chroma Features → Pattern modulation**:
- Detect pitch classes (C, C#, D, etc.)
- Each pitch class highlights different koi varieties
- Kohaku on C, Sanke on E, etc.

### 4.2 MIDI Mappings

#### 4.2.1 High-Impact Mappings (Recommended)

**Note-On Events → Individual Behaviors**:
```
NOTE ON → Trigger individual scatter
  - Each note triggers 1-3 random fish to scatter
  - Velocity controls scatter intensity (0.5-1.5)
  - Duration based on note length
  - Creates playable, musical fish response

NOTE OFF → End scatter, return to flock
  - Smooth ease-back to flocking
  - Duration: 0.5-2 seconds
```

**Note Velocity → Visual Intensity**:
```
VELOCITY (0-127) → Multiple modifiers:
  - brightnessBoost (0-20)
  - saturationBoost (0-20)
  - sizeScale (1.0-1.5)
  - Louder notes = more intense visual response
```

**Note Pitch → Force Weights**:
```
LOW NOTES (C0-C2) → separationWeight (0.8-1.5)
  - Bass notes = spread out

MID NOTES (C2-C5) → alignmentWeight (0.8-1.5)
  - Mid range = synchronize

HIGH NOTES (C5-C8) → cohesionWeight (0.8-1.5)
  - High notes = cluster together

Creates pitch-based flock morphology
```

**Polyphony (Note Density) → numBoids**:
```
NOTE COUNT (0-10+) → numBoids (20-150)
  - More simultaneous notes = more fish
  - Dynamically add/remove based on active notes
  - Visual density matches musical density
  - Add/remove smoothly over 0.5-1 second
```

**Pitch Bend → maxSpeed**:
```
PITCH BEND (-8192 to +8191) → maxSpeed (0.2-1.0)
  - Bend up = speed up
  - Bend down = slow down
  - Smooth, expressive speed control
```

#### 4.2.2 Medium-Impact Mappings

**Modulation Wheel (CC 1) → independenceChance**:
```
MOD WHEEL (0-127) → independenceChance (0.0-0.4)
  - More modulation = more individualistic behavior
  - Creates controllable chaos
```

**Expression (CC 11) → dampingCoefficient**:
```
EXPRESSION (0-127) → dampingCoefficient (0.2-0.7)
  - Higher expression = smoother movement
  - Lower = more reactive, jittery
```

**Sustain Pedal (CC 64) → Independence Override**:
```
SUSTAIN ON → Force all fish independent
SUSTAIN OFF → Resume normal flocking
  - Binary on/off control
  - Immediate visual response
```

**Aftertouch → Wave Amplitude**:
```
AFTERTOUCH (0-127) → Wave amplitude multiplier (0.5-2.0)
  - Pressure affects undulation intensity
  - Per-note or channel aftertouch
  - Expressive tail/body movement control
```

**CC 74 (Brightness) → backgroundBrightness**:
```
CC 74 (0-127) → background RGB (5-40)
  - Direct control of pond darkness/brightness
  - Affects overall mood
```

#### 4.2.3 Low-Impact Mappings (Advanced)

**Note Duration → tailLength**:
```
SHORT NOTES → tailLength (0.5-1.0)
LONG NOTES → tailLength (1.0-2.0)
  - Sustained notes = longer, flowing tails
  - Staccato = shorter, quicker tails
```

**Chord Detection → Variety Distribution**:
```
MAJOR CHORD → More bright varieties (kohaku, yamabuki-ogon)
MINOR CHORD → More dark varieties (showa, utsuri)
DIMINISHED → More unusual varieties (goshiki, tancho)
  - Dynamically shift population based on harmony
```

**Arpeggio Detection → Synchronized Animation**:
```
ARPEGGIO UP → All fish undulate in phase (animationOffset → 0)
ARPEGGIO DOWN → Maximum phase variation (random animationOffset)
  - Creates synchronized vs chaotic swimming
```

**Program Change → Preset Recall**:
```
PC 0-127 → Recall parameter presets
  - Different "scenes" or moods
  - Instant preset switching
  - PC 0 = calm, PC 64 = chaotic, PC 127 = energetic, etc.
```

### 4.3 Biometric Mappings

#### 4.3.1 Heart Rate Mappings (High Impact)

**Heart Rate → Multiple Parameters**:
```
RESTING (40-60 BPM) →
  - maxSpeed: 0.3-0.5 (slow, calm)
  - cohesionWeight: 1.2 (tight flocking)
  - independenceChance: 0.05 (minimal independence)
  - dampingCoefficient: 0.6 (smooth, graceful)
  - Color: Cool hues (blue-scaled varieties emphasized)

NORMAL (60-100 BPM) →
  - maxSpeed: 0.5-0.8 (normal)
  - Balanced force weights (current defaults)
  - Color: Balanced variety distribution

ELEVATED (100-140 BPM) →
  - maxSpeed: 0.8-1.0 (energetic)
  - separationWeight: 0.8-1.2 (more personal space)
  - independenceChance: 0.15-0.25 (more solo behavior)
  - dampingCoefficient: 0.3 (more reactive)
  - Color: Warm hues (red varieties emphasized)

PEAK (140+ BPM) →
  - maxSpeed: 1.0-1.5 (intense)
  - separationWeight: 1.5-2.0 (explosive separation)
  - Frequent scatter triggers
  - Color: Intense reds, high saturation
```

**Heart Rate Variability (HRV) → Behavioral Complexity**:
```
LOW HRV (stress, fatigue) →
  - independenceChance: 0.02 (minimal independence)
  - Tight, rigid flocking
  - Synchronized animation (similar animationOffset)
  - Muted colors

HIGH HRV (relaxed, healthy) →
  - independenceChance: 0.2 (more individual expression)
  - Loose, organic flocking
  - Varied animation phases
  - Vibrant, diverse colors
```

**Heart Beat Events → Visual Pulse**:
```
BEAT DETECTION (QRS complex) →
  - Momentary cohesion spike (50ms)
  - Brief size pulse (sizeScale: 1.0 → 1.2 → 1.0)
  - Subtle brightness flash
  - Synchronized to actual heartbeat
  - Creates living, breathing visualization
```

#### 4.3.2 Stress Level Mappings (High Impact)

**Stress/Arousal → Force Weights**:
```
RELAXED (low stress) →
  - cohesionWeight: 1.5 (strong clustering)
  - alignmentWeight: 1.5 (high synchronization)
  - separationWeight: 0.3 (comfortable proximity)
  - Color: Desaturated, pastel tones
  - Background: Lighter (20-30)

FOCUSED (medium stress) →
  - Balanced weights (defaults)
  - Normal behavior

STRESSED (high stress) →
  - separationWeight: 1.5-2.0 (avoid each other)
  - independenceChance: 0.3-0.5 (many solo fish)
  - Frequent escapes
  - Color: High saturation, intense
  - Background: Darker (5-15)

OVERWHELMED (extreme stress) →
  - Constant scatter mode
  - Very high separationWeight (2.0+)
  - All fish mostly independent
  - Chaotic, uncoordinated movement
  - Dark, intense colors
```

**Galvanic Skin Response (GSR) → Reactivity**:
```
LOW GSR (calm) →
  - dampingCoefficient: 0.7 (very smooth)
  - forceSmoothing: 0.15 (heavy smoothing)
  - Slow, graceful responses

HIGH GSR (aroused) →
  - dampingCoefficient: 0.2 (reactive)
  - forceSmoothing: 0.4 (minimal smoothing)
  - Quick, jittery responses to changes
  - Maps physiological arousal to movement quality
```

#### 4.3.3 Activity Level Mappings (Medium Impact)

**Step Count / Movement →numBoids and Speed**:
```
SEDENTARY (0-2000 steps) →
  - numBoids: 30-50 (sparse)
  - maxSpeed: 0.3-0.5 (slow)
  - Calm, minimal activity

ACTIVE (2000-8000 steps) →
  - numBoids: 60-90 (normal)
  - maxSpeed: 0.5-0.8 (moderate)

VERY ACTIVE (8000+ steps) →
  - numBoids: 100-150 (crowded)
  - maxSpeed: 0.8-1.2 (fast)
  - Energetic, dynamic
```

**Sleep Quality → Coherence**:
```
POOR SLEEP (<6h, fragmented) →
  - High independenceChance (0.3)
  - Desynchronized animation phases
  - Lower alignment/cohesion weights
  - Chaotic, uncoordinated flocking
  - Visualizes mental/physical fragmentation

GOOD SLEEP (7-9h, consolidated) →
  - Low independenceChance (0.05)
  - Synchronized, flowing movement
  - Higher alignment/cohesion weights
  - Harmonious flocking
  - Visualizes coherence and restoration
```

#### 4.3.4 Breath Rate Mappings (Medium Impact)

**Breath Rate → Animation Speed**:
```
SLOW BREATHING (4-8 breaths/min) →
  - waveTime multiplier: 0.05-0.08 (very slow undulation)
  - Meditative, calming

NORMAL (12-20 breaths/min) →
  - waveTime multiplier: 0.1 (current default)

RAPID (20-30 breaths/min) →
  - waveTime multiplier: 0.15-0.2 (fast undulation)
  - Anxious, energetic
```

**Breath Phase → Collective Behavior**:
```
INHALE → cohesionWeight increases (0.8 → 1.5)
  - Fish draw together
  - Expansion phase

EXHALE → separationWeight increases (0.5 → 1.2)
  - Fish spread apart
  - Contraction phase

Creates breathing, pulsing collective behavior
Synchronizes flock to user's breath
Biofeedback for breath awareness/meditation
```

#### 4.3.5 Multi-Modal Biometric Synthesis

**Composite "State" Mapping**:
```
CALCULATE COMPOSITE STATE:
  arousal = f(heart_rate, GSR, breath_rate)
  valence = f(HRV, sleep_quality, activity)
  energy = f(heart_rate, activity, breath_rate)

MAP TO VISUALIZATION:
  arousal → separationWeight (0.3-2.0)
  valence → color palette (cool to warm)
  energy → maxSpeed + numBoids

Creates holistic visualization of physiological state
More nuanced than single-metric mappings
```

### 4.4 Hybrid Multi-Input Mappings

**Music + Biometrics**:
```
SCENARIO: Meditation app with music
- Music controls global parameters (tempo, energy)
- Biometrics control individual behavior (stress → independence)
- Creates personalized visual response
- Fish behavior reflects your response to the music

SCENARIO: Exercise visualization
- Activity level controls fish count and speed
- Heart rate controls color intensity and separation
- Real-time feedback of workout intensity
- Gamification: "Collect" fish by reaching zones
```

**MIDI + Biometrics**:
```
SCENARIO: Biofeedback musical instrument
- Play MIDI keyboard to create music
- Biometrics modulate how fish respond to your playing
- Stressed = chaotic response, relaxed = harmonious
- Visual feedback helps regulate emotional state while playing
```

**Multi-User Collaborative**:
```
SCENARIO: Multiple MIDI controllers
- Each user controls subset of fish (20-30 each)
- Individual note events affect individual fish
- Collective harmony emerges from individual playing
- Competitive/cooperative modes
```

## 5. Recommendations

### 5.1 Most Visually Impactful Parameters

**Tier 1 (Highest Impact)**:
1. **Force weights** (separationWeight, alignmentWeight, cohesionWeight)
   - Dramatically changes flock morphology
   - Creates emergent collective patterns
   - Visible from distance
   - Easy to perceive changes

2. **maxSpeed** (global swimming speed)
   - Immediately obvious
   - Affects energy and mood dramatically
   - Syncs well with tempo/rhythm

3. **independenceChance** (solo behavior probability)
   - Creates interesting individual vs collective dynamics
   - Emergent complexity
   - Tells visual "stories"

4. **Scatter triggers** (individual/global scatter events)
   - Explosive, dramatic visual events
   - Perfect for onset/beat/note mappings
   - High audience engagement

**Tier 2 (High Impact)**:
5. **Color modifiers** (brightness, saturation boosts)
   - Already implemented, works well
   - Immediate color shifts very noticeable
   - Mood/emotion mapping

6. **perceptionRadius** (neighbor awareness)
   - Changes how fish interact
   - Affects flock cohesion subtly
   - Good for gradual state changes

7. **speedMultiplier** (individual speed variation)
   - Creates visual heterogeneity
   - Energy diversity in the flock
   - Per-fish mappings (MIDI notes)

**Tier 3 (Medium Impact)**:
8. **numBoids** (flock size)
   - Density changes noticeable
   - Computational cost consideration
   - Good for polyphony/activity mapping

9. **dampingCoefficient** (movement smoothness)
   - Affects movement quality
   - Graceful vs jittery
   - Best for slow transitions (biometrics)

10. **waveTime multiplier** (animation speed)
    - Undulation speed changes
    - Syncs to tempo well
    - Subtle but effective

### 5.2 Most Technically Straightforward

**Easy (1-2 hours implementation)**:
1. Expand audio frequency bands to control force weights
   - Similar to current bass → separation mapping
   - Just add mid → alignment, treble → cohesion

2. MIDI note velocity → brightness/saturation/size
   - Direct parameter mapping
   - Already have modifiers in place

3. Heart rate → maxSpeed mapping
   - Linear interpolation
   - Single biometric input

**Medium (4-8 hours implementation)**:
4. MIDI note-on → individual scatter triggers
   - Requires per-fish event tracking
   - Need to select random fish subset
   - Manage scatter states per fish

5. Onset detection → scatter events
   - Need to add onset detector (librosa, Essentia, or simple threshold)
   - Trigger existing scatter mechanisms

6. Beat phase → cohesion pulse
   - Need beat tracker
   - Modulate weights in sync with beats

**Complex (2-4 days implementation)**:
7. Polyphony → dynamic boid count
   - Need smooth add/remove logic
   - Avoid visual pops
   - Initialize new boids intelligently

8. Multi-user MIDI (fish subsets per controller)
   - Requires MIDI device routing
   - Partition fish array
   - Track per-controller state

9. Composite biometric state → multi-parameter mapping
   - Requires biometric fusion algorithm
   - State machine for different modes
   - Smooth transitions between states

### 5.3 Most Artistically/Scientifically Interesting

**Artistic Interest**:

1. **Breath-synchronized collective behavior** (inhale → cohere, exhale → separate)
   - Meditative, calming
   - Biofeedback for mindfulness
   - Creates living, breathing artwork
   - Unique: haven't seen this done before

2. **MIDI playable fish** (each note triggers individual fish)
   - Musical instrument meets visualization
   - Performance art potential
   - Improvisation creates emergent visuals
   - Highly engaging for audiences

3. **Stress → chaos mapping** (biometric stress levels control disorder)
   - Emotional data visualization
   - Self-reflection tool
   - Mental health application
   - Personal, intimate experience

**Scientific Interest**:

1. **Heart rate variability → behavioral complexity**
   - Visualizes ANS (autonomic nervous system) balance
   - Parasympathetic vs sympathetic activity
   - Quantified self / biohacking application
   - Educational: learn about HRV

2. **Musical structure → flock morphology**
   - Harmony → variety distribution
   - Rhythm → synchronization
   - Texture → individual diversity
   - Music information retrieval (MIR) visualization
   - Educational: see music structure visually

3. **Collective vs individual balance** (independence parameter exploration)
   - Social dynamics visualization
   - Explores conformity vs individuality
   - Philosophical implications
   - Agent-based modeling demonstration

**Hybrid (Art + Science)**:

1. **Multi-modal biometric synthesis visualization**
   - Holistic physiological state representation
   - More accurate than single metrics
   - Research tool for psychology/neuroscience
   - Personalized health dashboard
   - Beautiful and meaningful

2. **Adaptive music visualization** (music shapes fish, fish shape music parameters)
   - Feedback loop between audio and visual
   - Generative system
   - Exploration of emergence
   - AI/ML potential (learn mappings from user preferences)

3. **Social/collaborative flock** (multiple users control subsets)
   - Explores cooperation and conflict
   - Emergent behavior from individual actions
   - Multiplayer experience
   - Educational: game theory, collective behavior

### 5.4 Implementation Priorities

**Phase 1: Foundation (Week 1)**
- Expand audio bands → force weights (mid, treble)
- Add onset detection → scatter triggers
- Implement beat tracking → waveTime sync
- **Why first**: Builds on existing audio system, high impact, straightforward

**Phase 2: MIDI (Week 2)**
- Note-on → individual scatter
- Velocity → visual modifiers
- Pitch → force weight selection
- Polyphony → numBoids (dynamic)
- **Why second**: High engagement, performance potential, medium complexity

**Phase 3: Biometrics Basic (Week 3)**
- Heart rate → maxSpeed + color
- HRV → independenceChance
- Stress level → separationWeight
- **Why third**: Requires hardware integration, but straightforward mapping once data available

**Phase 4: Advanced Biometrics (Week 4)**
- Breath phase → collective pulse
- Composite state synthesis
- Multi-metric fusion
- **Why fourth**: Most complex biometric processing, highest artistic/scientific value

**Phase 5: Multi-User & Feedback (Week 5+)**
- MIDI multi-controller support
- Collaborative modes
- Adaptive learning (AI-based preference learning)
- **Why last**: Requires all previous systems, highest complexity

### 5.5 Technical Architecture Recommendations

**Input Abstraction Layer**:
```javascript
class InputManager {
  constructor() {
    this.sources = {
      audio: new AudioAnalyzer(),
      midi: new MIDIManager(),
      biometric: new BiometricManager()
    };
    this.mappings = new MappingEngine();
  }

  getModulationData() {
    // Collect all input data
    const audio = this.sources.audio.getFeatures();
    const midi = this.sources.midi.getCurrentState();
    const bio = this.sources.biometric.getCurrentState();

    // Apply mappings
    return this.mappings.apply({ audio, midi, bio });
  }
}
```

**Mapping Configuration** (JSON-based):
```json
{
  "mappings": [
    {
      "source": "audio.bass",
      "target": "params.separationWeight",
      "range": [0.5, 2.0],
      "curve": "linear"
    },
    {
      "source": "midi.note_velocity",
      "target": "modifiers.brightnessBoost",
      "range": [0, 20],
      "curve": "exponential"
    },
    {
      "source": "biometric.heart_rate",
      "target": "params.maxSpeed",
      "range": [0.3, 1.2],
      "curve": "sigmoid",
      "center": 80
    }
  ]
}
```

**Parameter Smoothing**:
```javascript
class ParameterSmoother {
  constructor(smoothingTime = 0.5) {
    this.targets = {};
    this.current = {};
    this.smoothingTime = smoothingTime; // seconds
  }

  setTarget(param, value) {
    this.targets[param] = value;
  }

  update(deltaTime) {
    for (let param in this.targets) {
      const alpha = deltaTime / this.smoothingTime;
      this.current[param] = lerp(
        this.current[param],
        this.targets[param],
        alpha
      );
    }
  }
}
```

**Preset System**:
```javascript
const PRESETS = {
  calm: {
    maxSpeed: 0.4,
    separationWeight: 0.3,
    cohesionWeight: 1.5,
    independenceChance: 0.05,
    dampingCoefficient: 0.6
  },
  energetic: {
    maxSpeed: 1.0,
    separationWeight: 1.2,
    cohesionWeight: 0.5,
    independenceChance: 0.25,
    dampingCoefficient: 0.3
  },
  chaotic: {
    maxSpeed: 1.2,
    separationWeight: 2.0,
    cohesionWeight: 0.3,
    independenceChance: 0.5,
    dampingCoefficient: 0.2
  }
};
```

## 6. Code References Summary

### Core Behavior Files
- **Boid class**: `/Users/seankim/dev/visualizations/flocking/src/flocking/boid.js`
  - Lines 19-74: Individual properties (speed, size, animation offsets)
  - Lines 84-154: Force application with smoothing and prioritization
  - Lines 164-271: Update loop with derivative damping
  - Lines 277-299: Independence behavior
  - Lines 305-350: Escape behavior

- **FlockManager**: `/Users/seankim/dev/visualizations/flocking/src/flocking/flock-manager.js`
  - Lines 22-32: Global parameters
  - Lines 42-81: Update loop orchestration
  - Lines 91-156: Force calculation and weighting

- **Flocking Forces**: `/Users/seankim/dev/visualizations/flocking/src/flocking/flocking-forces.js`
  - Lines 14-36: Neighbor finding
  - Lines 49-64: Alignment calculation
  - Lines 76-92: Cohesion calculation
  - Lines 106-138: Separation calculation
  - Lines 150-159: Escape force calculation

### Rendering Files
- **KoiRenderer**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-renderer.js`
  - Lines 30-81: Main render method
  - Lines 86-119: Segment position calculation with wave animation
  - Lines 125-178: Fin rendering
  - Lines 183-217: Tail rendering
  - Lines 274-285: Spot pattern rendering
  - Lines 290-318: Head and eyes

- **Koi Params**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-params.js`
  - Lines 6-52: DEFAULT_SHAPE_PARAMS (all shape values)
  - Lines 54-93: PARAMETER_RANGES (min/max for each param)

- **Koi Varieties**: `/Users/seankim/dev/visualizations/flocking/src/core/koi-varieties.js`
  - Lines 9-49: VARIETIES array (26 traditional varieties with weights)
  - Lines 56-70: selectVariety() weighted selection
  - Lines 79-375: generatePattern() variety-specific spot generation

### Application Files
- **Simulation App**: `/Users/seankim/dev/visualizations/flocking/src/apps/simulation-app.js`
  - Lines 22-32: Global parameters
  - Lines 164-175: Scatter trigger
  - Lines 232-234: Background modulation
  - Lines 259-314: Scatter mode handling
  - Lines 320-352: Per-boid rendering with audio modifiers
  - Lines 346-351: Current audio → visual modifiers

### Audio Files
- **AudioAnalyzer**: `/Users/seankim/dev/visualizations/flocking/src/audio/audio-analyzer.js`
  - Lines 36-44: Web Audio API setup (FFT size: 256)
  - Lines 88-113: getAudioData() - frequency band analysis
  - Lines 108-110: Bass/mid/treble band definitions

## 7. Historical Context

This codebase has undergone significant refinement to address oscillation and jerkiness issues, incorporating aerospace control theory concepts:

### Related Research Documents
1. **Boids Oscillation Mitigation** (`thoughts/research/2025-10-18-boids-oscillation-mitigation-using-aerospace-control-theory.md`)
   - Implemented derivative damping (PID D-term) to resist rapid heading changes
   - Force prioritization to prevent conflicting forces
   - Escape behaviors for overcrowding/oscillation detection

2. **Jerkiness Accumulation Analysis** (`thoughts/research/2025-10-18-koi-flocking-jerkiness-accumulation-analysis.md`)
   - Identified velocity/force smoothing lag accumulation
   - Implemented smoothed speed for animation (separate from physics)
   - Careful tuning of smoothing coefficients

3. **Animation Smoothness Analysis** (`thoughts/research/2025-10-18-flocking-animation-smoothness-analysis.md`)
   - Individual animation phase offsets to prevent synchronized swimming
   - Wave animation parameters for natural undulation
   - Speed-affected undulation frequency

4. **Oscillation Detection Improvements** (`flocking/research/2025-10-19-oscillation-detection-analysis-and-improvements.md`)
   - Latest improvements to oscillation detection system
   - Heading history tracking for pattern detection
   - Cooldown mechanisms to prevent escape spam

### Key Architectural Decisions

**Why Force Prioritization?**
When too many forces conflict (alignment wants left, cohesion wants right, separation wants away), fish oscillate. Solution: Prioritize separation when close to neighbors, reduce other forces. This mimics real fish behavior (personal space > coordination).

**Why Derivative Damping?**
Aerospace control theory: PID controllers use derivative term to resist rapid changes. Applied here: track heading velocity, apply perpendicular damping force. Result: smoother turns, more graceful swimming.

**Why Independent Behavior?**
Real fish don't always flock. Some break off, explore, rest. Adds visual interest, prevents monotonous synchronized movement. Creates "stories" - you can follow individual fish.

**Why Limit Neighbors to 8?**
Too many neighbors = too many forces = oscillation. Sorting by distance and limiting to closest 8 prevents this. Computationally efficient too (O(n log n) vs O(n^2)).

**Why Separate Smoothed Speed?**
Physics needs responsive velocity for accurate flocking. Animation needs smooth speed to prevent jittery waves. Solution: maintain both. Physics uses `velocity.mag()`, animation uses `smoothedSpeed`.

## 8. Open Questions & Future Research

### 8.1 Perceptual Questions
- What input latency is acceptable before the mapping feels disconnected?
- How many simultaneous modulated parameters can viewers track?
- What's the sweet spot between subtle/obvious parameter changes?
- Do rhythmic mappings (beat-sync) work better than continuous mappings?

### 8.2 Technical Questions
- How to handle biometric sensor noise and outliers?
- What's the best way to blend multiple input sources (audio + MIDI + bio)?
- Should mappings be user-configurable or designer-specified?
- How to prevent parameter conflicts (e.g., two inputs both control maxSpeed)?

### 8.3 Artistic Questions
- Should mappings be literal (high pitch → high cohesion) or metaphorical?
- How much randomness/noise should be added to prevent deterministic mappings?
- What's the role of the artist: designer of mappings or performer with inputs?
- Should the system learn user preferences over time (ML-based adaptation)?

### 8.4 Scientific Questions
- Can this be used as valid biofeedback for stress reduction?
- How accurate is the visualization of complex physiological states?
- Can multi-user collaborative mode teach principles of collective behavior?
- What can we learn about emergence and self-organization from mapping experiments?

### 8.5 Implementation Questions
- Should parameter changes be smoothed (how much? exponential or linear)?
- How to prevent extreme values from crashing the simulation?
- What's the best data structure for managing hundreds of dynamic mappings?
- How to serialize/deserialize mapping configurations for sharing?

## 9. Conclusion

This koi flocking simulation provides a rich, multi-layered system for input-driven visualization with:
- **20+ behavior parameters** controlling individual and collective movement
- **40+ visual parameters** controlling appearance and animation
- **Sophisticated force system** with aerospace control theory integration
- **Existing audio reactivity** that can be significantly expanded

The most impactful visualizations will come from:
1. **Force weight modulation** (separation/alignment/cohesion) - creates dramatic collective morphology shifts
2. **Individual scatter triggers** (note-on, onsets, beats) - explosive visual events
3. **Independence chance modulation** (HRV, stress, complexity) - emergent behavioral diversity
4. **Speed and energy mapping** (tempo, heart rate, activity) - obvious, intuitive responses

The most interesting artistic directions:
1. **Breath-synchronized collective pulse** - meditative biofeedback
2. **MIDI playable fish** - performance instrument
3. **Multi-modal biometric synthesis** - holistic state visualization

The most scientifically valuable directions:
1. **HRV → complexity mapping** - ANS visualization
2. **Musical structure → flock morphology** - MIR research
3. **Multi-user collaborative** - collective behavior education

Implementation should proceed in phases: audio expansion → MIDI → basic biometrics → advanced biometrics → multi-user. This builds complexity gradually while delivering value at each stage.

The existing architecture is well-suited for extension - modular, parameter-driven, with clean separation between behavior/rendering/input. Adding new input sources and mappings should be straightforward with proper abstraction layers.
