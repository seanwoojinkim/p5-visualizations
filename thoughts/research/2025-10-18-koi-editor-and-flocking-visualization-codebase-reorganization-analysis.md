---
doc_type: research
date: 2025-10-19T02:26:48+00:00
title: "Koi Editor and Flocking Visualization Codebase Reorganization Analysis"
research_question: "How should the koi editor and flocking visualization codebase be reorganized to separate concerns, reduce duplication, and improve maintainability?"
researcher: Sean Kim

git_commit: 65fa2f88983b922829804f07e032d77639f16a54
branch: main
repository: visualizations

created_by: Sean Kim
last_updated: 2025-10-18
last_updated_by: Sean Kim

tags:
  - code-organization
  - koi-rendering
  - flocking
  - refactoring
  - architecture
status: draft

related_docs: []
---

# Research: Koi Editor and Flocking Visualization Codebase Reorganization Analysis

**Date**: 2025-10-18
**Researcher**: Sean Kim
**Git Commit**: 65fa2f88983b922829804f07e032d77639f16a54
**Branch**: main
**Repository**: visualizations

## Research Question

How should the koi editor and flocking visualization codebase be reorganized to separate concerns, reduce duplication, and improve maintainability?

## Summary

The current codebase consists of two applications that share significant koi rendering logic but are organized as completely separate files with extensive code duplication. The analysis reveals:

1. **Massive duplication**: Approximately 400+ lines of koi rendering code duplicated between `sketch.js` (1036 lines) and `koi-editor.js` (426 lines)
2. **Tight coupling**: Koi rendering logic is tightly coupled with flocking behavior and editor UI
3. **No module separation**: Everything exists in monolithic files with no clear separation of concerns
4. **Inconsistent parameter structures**: Both files use `params` objects but with different shapes and purposes

The proposed reorganization separates the codebase into clear modules: koi rendering, flocking behavior, parameter management, and application-specific logic.

## Detailed Findings

### Current File Structure

```
flocking/
├── index.html           (129 lines) - Main flocking simulation entry
├── koi-editor.html      (205 lines) - Editor UI entry
├── sketch.js            (1036 lines) - Flocking simulation with koi rendering
└── koi-editor.js        (426 lines) - Static koi editor with shape controls
```

#### index.html (flocking/index.html:1-129)
- Purpose: Entry point for the flocking simulation
- Contains inline CSS for control panel styling (lines 7-68)
- Includes control inputs for:
  - Pixel scale, boid count, speed parameters
  - Flocking weights (separation, alignment, cohesion)
  - Trail length
  - Audio file upload and reactivity controls
- Loads p5.js from CDN (line 125)
- Loads sketch.js (line 126)

#### koi-editor.html (flocking/koi-editor.html:1-205)
- Purpose: Entry point for the koi shape editor
- Contains inline CSS for editor panel styling (lines 7-80)
- Includes detailed shape parameter inputs organized in sections:
  - Body shape (segments, width, height)
  - Head position and size
  - Tail dimensions
  - Fin positions and angles (dorsal, pectoral, ventral)
- Copy-to-clipboard button for parameter values (line 194)
- Loads p5.js from CDN (line 201)
- Loads koi-editor.js (line 202)

#### sketch.js (flocking/sketch.js:1-1036)
**Global variables and setup** (lines 1-47):
- Graphics buffer for low-res pixelated rendering (`pg`)
- Audio API variables (AudioContext, analyser, frequency data)
- Parameters object with flocking and rendering settings (lines 14-24)

**Flocking behavior** (lines 42-47, 208-237, 621-760):
- `initFlock()`: Creates initial boid population
- Boid class with flocking methods:
  - `align()`: Alignment steering (lines 621-645)
  - `cohesion()`: Cohesion steering (lines 647-672)
  - `separation()`: Separation steering with distance weighting (lines 674-706)
  - `flock()`: Combines forces with smoothing and audio reactivity (lines 708-737)
  - `update()`: Physics update with velocity smoothing (lines 739-760)

**Audio integration** (lines 4-11, 50-168, 170-203):
- File upload handling (lines 51-56)
- Web Audio API setup with analyser node (lines 154-163)
- Frequency band analysis (bass, mid, treble) (lines 170-203)
- Play/pause controls (lines 59-71)

**Control panel integration** (lines 49-140):
- Event listeners for all sliders and buttons
- Real-time parameter updates
- Dynamic flock resizing (lines 90-103)
- Graphics buffer recreation on pixel scale change (lines 80-87)

**Koi rendering - DUPLICATED CODE** (lines 233-1036):
- Boid constructor with variety selection (lines 234-317)
  - 28 koi varieties with weighted distribution
  - Size, length, and tail length variations
  - Color HSB values per variety
- Pattern generation (lines 319-611)
  - Variety-specific spot patterns
  - 28 separate case statements for different koi types
  - Spot positioning on body segments
- `show()` method - complete koi drawing (lines 762-1035)
  - Body segments with wave motion (lines 786-808)
  - Tail rendering with curve vertices (lines 810-881)
  - Fin rendering (lines 884-969)
  - Body outline with curve vertices (lines 974-1001)
  - Spot rendering (lines 1015-1022)
  - Head and eye (lines 1025-1030)

#### koi-editor.js (flocking/koi-editor.js:1-426)
**Global variables and setup** (lines 1-45):
- Static size scale for editor (line 1)
- Shape parameters object (lines 6-29)
- Control point system for drag interaction (lines 3, 31)

**Parameter management** (lines 6-29, 372-425):
- Shape parameters matching those in sketch.js
- Input field synchronization (lines 372-391)
- Copy-to-clipboard functionality (lines 386-390)
- Output formatting (lines 393-425)

**Koi rendering - DUPLICATED CODE** (lines 71-257):
- `drawKoi()`: Main rendering function (lines 71-157)
  - Body segments calculation - IDENTICAL to sketch.js (lines 74-96)
  - Body outline drawing - IDENTICAL (lines 98-126)
  - Head rendering - IDENTICAL (lines 139-147)
- `drawTail()`: Tail rendering - IDENTICAL to sketch.js tail code (lines 159-203)
- `drawFins()`: Fin rendering - IDENTICAL to sketch.js fin code (lines 205-257)

**Editor-specific features** (lines 259-370):
- Control point system (lines 259-329)
- Mouse interaction for dragging (lines 331-370)
- Visual feedback for active control points (lines 58-66)

### Code Duplication Analysis

#### Complete Duplication (400+ lines)

**Body segment calculation** - IDENTICAL in both files:
- sketch.js lines 789-808
- koi-editor.js lines 74-96
- Duplication: Wave motion, segment positioning, width tapering logic

**Body outline drawing** - IDENTICAL:
- sketch.js lines 974-1001
- koi-editor.js lines 98-126
- Duplication: Curve vertex usage, head point, top/bottom edges

**Tail rendering** - IDENTICAL:
- sketch.js lines 810-881
- koi-editor.js lines 159-203
- Duplication: Tail segments, curve calculations, sway motion

**Fin rendering** - NEARLY IDENTICAL:
- sketch.js lines 884-969
- koi-editor.js lines 205-257
- Duplication: Pectoral, dorsal, ventral fin shapes and positioning
- Only difference: sketch.js uses HSB colors, editor uses fixed RGB

**Head rendering** - IDENTICAL:
- sketch.js lines 1025-1030
- koi-editor.js lines 139-147
- Duplication: Head ellipse and eye positioning

#### Partial Duplication

**Parameters structure**:
- Both files define shape parameters (body width, fin positions, etc.)
- sketch.js has additional flocking and audio parameters
- Parameter names match exactly for shape-related values

**Animation timing**:
- Both use `waveTime` calculated from frameCount
- sketch.js: `frameCount * 0.1 * (1 + swimSpeed)` (line 783)
- koi-editor.js: `frameCount * 0.05` (line 72)
- Different scaling but same concept

### Shared vs. Specialized Functionality

#### Shared Functionality (Should be extracted)

1. **Core koi rendering** (400+ lines):
   - Body segment calculation
   - Body outline drawing
   - Tail rendering
   - Fin rendering (dorsal, pectoral, ventral)
   - Head and eye rendering
   - All geometric calculations

2. **Shape parameters** (23 parameters):
   - Body: numSegments, bodyWidth, bodyHeight
   - Head: headX, headWidth, headHeight
   - Tail: tailStartX, tailWidthStart, tailWidthEnd, tailSplit
   - Fins: dorsalPos, dorsalY, pectoralPos, pectoralYTop, pectoralAngleTop, etc.

3. **Parameter defaults**:
   - Both files use identical default values for all shape parameters

#### Specialized Functionality (Should remain separate)

**sketch.js specific**:
1. Flocking behavior (lines 621-760)
   - Boid class with align, cohesion, separation methods
   - Force smoothing and blending
   - Perception radius and neighbor detection
2. Audio integration (lines 4-11, 50-203)
   - Web Audio API setup
   - Frequency analysis
   - Audio-reactive parameter modulation
3. Koi varieties and patterns (lines 248-611)
   - 28 koi variety definitions
   - Weighted random selection
   - Pattern generation per variety
4. Low-res pixel rendering (lines 2, 29-33, 222)
   - Graphics buffer management
   - Pixel scale control
5. Trail effect (line 212)
   - Background alpha for motion trails

**koi-editor.js specific**:
1. Control point system (lines 259-329)
   - Visual control point rendering
   - Parameter-to-screen-position mapping
2. Mouse interaction (lines 331-370)
   - Drag detection and handling
   - Parameter updates from mouse position
3. Static rendering
   - No flocking, no animation beyond basic swimming wave
4. Parameter export (lines 393-425)
   - Copy-to-clipboard functionality
   - Formatted parameter output

### Parameter Structure Analysis

#### sketch.js params object (lines 14-24)
```javascript
{
    pixelScale: 4,              // Rendering concern
    numBoids: 80,               // Flocking concern
    maxSpeed: 2,                // Flocking concern
    maxForce: 0.1,              // Flocking concern
    separationWeight: 1.2,      // Flocking concern
    alignmentWeight: 1.2,       // Flocking concern
    cohesionWeight: 1.0,        // Flocking concern
    trailAlpha: 40,             // Rendering concern
    audioReactivity: 0.5        // Audio concern
}
```
Note: Shape parameters are hardcoded in the Boid.show() method, not in params object.

#### koi-editor.js params object (lines 6-29)
```javascript
{
    numSegments: 10,            // Shape concern
    bodyWidth: 2.4,             // Shape concern
    bodyHeight: 0.95,           // Shape concern
    headX: -0.4,                // Shape concern
    headWidth: 7,               // Shape concern
    headHeight: 5.5,            // Shape concern
    tailStartX: -1,             // Shape concern
    tailWidthStart: 0.2,        // Shape concern
    tailWidthEnd: 1.5,          // Shape concern
    tailSplit: 0.5,             // Shape concern (unused)
    dorsalPos: 4,               // Shape concern
    dorsalY: -0.5,              // Shape concern
    pectoralPos: 2,             // Shape concern
    pectoralYTop: -2,           // Shape concern
    pectoralAngleTop: -2.5,     // Shape concern
    pectoralYBottom: 2,         // Shape concern
    pectoralAngleBottom: 2.1,   // Shape concern
    ventralPos: 7,              // Shape concern
    ventralYTop: -1,            // Shape concern
    ventralAngleTop: -2.5,      // Shape concern
    ventralYBottom: 1,          // Shape concern
    ventralAngleBottom: 2.5     // Shape concern
}
```

### Rendering Pipeline Analysis

#### sketch.js rendering pipeline
1. `draw()` called by p5.js loop (line 205)
2. Get audio data (line 207)
3. Draw background with trail fade to graphics buffer `pg` (line 212)
4. For each boid:
   - Calculate flocking forces with neighbors (line 216)
   - Update position and velocity (line 217)
   - Render koi to graphics buffer `pg` (line 218)
5. Scale up graphics buffer to main canvas (line 222)

**Rendering context**: Always renders to `pg` (graphics buffer)
**Animation**: Controlled by boid velocity and flocking behavior
**Audio reactivity**: Passed to show() method, affects colors and size

#### koi-editor.js rendering pipeline
1. `draw()` called by p5.js loop (line 47)
2. Draw background directly to main canvas (line 48)
3. Translate to center (line 51)
4. Call `drawKoi()` (line 54)
   - Calculate body segments with wave animation
   - Draw body, tail, fins in sequence
   - Update control points
5. Draw control points over koi (lines 57-66)

**Rendering context**: Renders directly to main canvas
**Animation**: Static wave motion based on frameCount only
**No audio reactivity**: Pure shape visualization

### Problems with Current Organization

1. **Massive code duplication** (~400 lines, 40% of koi-editor.js)
   - Maintenance nightmare: bug fixes must be applied twice
   - Inconsistency risk: changes to one file may not propagate
   - Example: Any adjustment to fin shape requires editing both files

2. **Tight coupling**
   - Koi rendering mixed with flocking logic in sketch.js
   - No way to use koi rendering without Boid class
   - Pattern generation (lines 319-611) inseparable from flocking
   - Audio reactivity hardcoded into rendering (lines 768-769, 779, 731-732)

3. **Single Responsibility Principle violations**
   - Boid class does: flocking + pattern generation + rendering + physics
   - sketch.js does: audio + controls + flocking + rendering + patterns
   - koi-editor.js does: UI + rendering + parameter management

4. **No abstraction layers**
   - Can't render a koi without creating a Boid
   - Can't reuse pattern generation logic
   - Can't customize rendering without modifying source

5. **Hardcoded values scattered throughout**
   - Shape parameters embedded in show() method (sketch.js)
   - Magic numbers in calculations (e.g., line 791: `lerp(7, -9, t)`)
   - No central configuration

6. **Testing impossibility**
   - No way to test koi rendering in isolation
   - No way to test flocking without rendering
   - Monolithic structure prevents unit testing

7. **Extensibility limitations**
   - Adding new koi varieties requires editing Boid constructor
   - Adding new fin types requires editing show() method
   - Can't compose different rendering styles

## Proposed Reorganization

### New File Structure

```
flocking/
├── index.html                          # Main simulation entry
├── koi-editor.html                     # Editor entry
├── src/
│   ├── core/
│   │   ├── koi-renderer.js            # Pure koi rendering (NEW)
│   │   ├── koi-varieties.js           # Variety definitions & patterns (NEW)
│   │   └── koi-params.js              # Parameter schemas (NEW)
│   ├── flocking/
│   │   ├── boid.js                    # Boid physics only (EXTRACTED)
│   │   ├── flock-manager.js           # Flock coordination (NEW)
│   │   └── flocking-forces.js         # Separation/alignment/cohesion (EXTRACTED)
│   ├── audio/
│   │   └── audio-analyzer.js          # Audio processing (EXTRACTED)
│   ├── rendering/
│   │   └── pixel-buffer.js            # Low-res rendering setup (NEW)
│   ├── apps/
│   │   ├── simulation-app.js          # Main app logic (REFACTORED)
│   │   └── editor-app.js              # Editor app logic (REFACTORED)
│   └── ui/
│       ├── control-panel.js           # Simulation controls (EXTRACTED)
│       └── editor-controls.js         # Editor controls (EXTRACTED)
└── lib/
    └── p5.min.js                       # Local p5.js copy (RECOMMENDED)
```

### Module Descriptions and Responsibilities

#### Core Modules (Shared)

**src/core/koi-renderer.js** (NEW - extracted from duplication)
- **Purpose**: Pure koi rendering logic, no dependencies on flocking or audio
- **Exports**:
  - `KoiRenderer` class
  - Methods: `render(context, x, y, angle, params, modifiers)`
  - Private methods: `drawBody()`, `drawTail()`, `drawFins()`, `drawHead()`
- **Responsibilities**:
  - Calculate body segments from parameters
  - Draw body outline with curve vertices
  - Draw tail with sway motion
  - Draw all fins (dorsal, pectoral, ventral)
  - Draw head and eye
  - Apply color modifiers (brightness, saturation)
- **What moves here**:
  - sketch.js lines 786-1035 (show method internals)
  - koi-editor.js lines 71-257 (all drawing functions)
  - ~350 lines of deduplicated rendering code
- **Interface example**:
```javascript
const renderer = new KoiRenderer();
renderer.render(pg, x, y, angle, {
    shapeParams: { numSegments: 10, headWidth: 7, ... },
    colorParams: { hue: 45, saturation: 50, brightness: 85 },
    animationParams: { waveTime: frameCount * 0.1, sizeScale: 1.2 },
    modifiers: { brightnessBoost: 0, saturationBoost: 0, sizeScale: 1 }
});
```

**src/core/koi-varieties.js** (EXTRACTED from sketch.js)
- **Purpose**: Koi variety definitions and pattern generation
- **Exports**:
  - `VARIETIES` - array of variety definitions
  - `selectVariety(weights)` - weighted random selection
  - `generatePattern(variety, params)` - create spot array
- **Responsibilities**:
  - Define 28 koi varieties with colors and weights
  - Weighted random variety selection
  - Generate variety-specific spot patterns
  - Return pattern as data structure (not rendering)
- **What moves here**:
  - sketch.js lines 247-301 (variety definitions)
  - sketch.js lines 319-611 (pattern generation)
  - ~390 lines of variety/pattern logic
- **Data structure**:
```javascript
// Variety definition
{
    name: 'kohaku',
    base: { h: 0, s: 0, b: 90 },
    weight: 15,
    patternType: 'spots'
}

// Pattern output
{
    variety: 'kohaku',
    baseColor: { h: 0, s: 0, b: 90 },
    spots: [
        { segment: 2, offsetY: 0.5, size: 3, color: { h: 5, s: 80, b: 75 } },
        ...
    ]
}
```

**src/core/koi-params.js** (NEW - centralized configuration)
- **Purpose**: Parameter schemas, defaults, and validation
- **Exports**:
  - `DEFAULT_SHAPE_PARAMS` - object with all shape parameters
  - `DEFAULT_RENDER_PARAMS` - rendering-specific parameters
  - `validateShapeParams(params)` - validation function
  - `parameterRanges` - min/max for each parameter
- **Responsibilities**:
  - Define default values for all parameters
  - Provide parameter metadata (ranges, descriptions)
  - Validation functions
  - Type definitions/schemas
- **What moves here**:
  - koi-editor.js lines 6-29 (shape params)
  - Parameter defaults currently scattered in code
  - ~50 lines of configuration
- **Structure**:
```javascript
export const DEFAULT_SHAPE_PARAMS = {
    body: {
        numSegments: 10,
        bodyWidth: 2.4,
        bodyHeight: 0.95
    },
    head: {
        headX: -0.4,
        headWidth: 7,
        headHeight: 5.5
    },
    tail: {
        tailStartX: -1,
        tailWidthStart: 0.2,
        tailWidthEnd: 1.5
    },
    fins: {
        dorsal: { pos: 4, y: -0.5 },
        pectoral: { pos: 2, yTop: -2, angleTop: -2.5, ... },
        ventral: { pos: 7, yTop: -1, angleTop: -2.5, ... }
    }
};

export const PARAMETER_RANGES = {
    'body.numSegments': { min: 5, max: 20, step: 1 },
    'body.bodyWidth': { min: 1, max: 5, step: 0.1 },
    ...
};
```

#### Flocking Modules (Simulation-specific)

**src/flocking/boid.js** (EXTRACTED from sketch.js)
- **Purpose**: Boid physics and state, no rendering
- **Exports**: `Boid` class
- **Responsibilities**:
  - Position, velocity, acceleration vectors
  - Edge wrapping
  - Physics update with smoothing
  - Store individual koi properties (variety, size, pattern)
  - NO RENDERING - only data
- **What moves here**:
  - sketch.js lines 233-246 (constructor physics setup)
  - sketch.js lines 613-619 (edges)
  - sketch.js lines 739-760 (update)
  - Physics-related force tracking (lines 241-244)
  - ~50 lines of physics code
- **Interface**:
```javascript
class Boid {
    constructor(x, y) {
        this.position = createVector(x, y);
        this.velocity = p5.Vector.random2D();
        this.acceleration = createVector();

        // Koi appearance (data only)
        this.variety = selectVariety(VARIETIES);
        this.pattern = generatePattern(this.variety);
        this.sizeMultiplier = random(0.6, 1.4);
        this.lengthMultiplier = random(0.85, 1.25);
        this.tailLength = random(0.9, 1.8);
    }

    update(maxSpeed, maxForce) { /* physics only */ }
    edges(width, height) { /* wrapping */ }
}
```

**src/flocking/flocking-forces.js** (EXTRACTED from sketch.js)
- **Purpose**: Pure flocking force calculations
- **Exports**:
  - `calculateAlignment(boid, neighbors, params)`
  - `calculateCohesion(boid, neighbors, params)`
  - `calculateSeparation(boid, neighbors, params)`
  - `findNeighbors(boid, flock, perceptionRadius)`
- **Responsibilities**:
  - Separation, alignment, cohesion calculations
  - Neighbor detection within perception radius
  - Force limiting and magnitude setting
  - Pure functions - no state modification
- **What moves here**:
  - sketch.js lines 621-645 (align)
  - sketch.js lines 647-672 (cohesion)
  - sketch.js lines 674-706 (separation)
  - ~85 lines of flocking algorithms
- **Interface**:
```javascript
export function calculateAlignment(boid, neighbors, maxSpeed, maxForce) {
    let steering = createVector();
    // ... calculation ...
    return steering;
}

export function findNeighbors(boid, flock, perceptionRadius) {
    return flock.filter(other => {
        if (other === boid) return false;
        let d = dist(boid.position.x, boid.position.y,
                     other.position.x, other.position.y);
        return d < perceptionRadius;
    });
}
```

**src/flocking/flock-manager.js** (NEW - orchestration)
- **Purpose**: Coordinate flock behavior and updates
- **Exports**: `FlockManager` class
- **Responsibilities**:
  - Manage array of boids
  - Apply flocking forces to all boids
  - Handle force smoothing and blending
  - Add/remove boids dynamically
  - Coordinate updates with audio reactivity
- **What moves here**:
  - sketch.js lines 1, 42-47 (flock array and init)
  - sketch.js lines 708-737 (flock method combining forces)
  - Force smoothing logic
  - ~80 lines of coordination code
- **Interface**:
```javascript
class FlockManager {
    constructor(numBoids, width, height) {
        this.boids = [];
        this.initFlock(numBoids, width, height);
    }

    update(params, audioData) {
        for (let boid of this.boids) {
            const neighbors = findNeighbors(boid, this.boids, params.perceptionRadius);
            const forces = this.calculateFlockingForces(boid, neighbors, params, audioData);
            boid.applyForces(forces);
            boid.update(params.maxSpeed, params.maxForce);
        }
    }

    resize(newCount) { /* add or remove boids */ }
}
```

#### Audio Module (Simulation-specific)

**src/audio/audio-analyzer.js** (EXTRACTED from sketch.js)
- **Purpose**: Audio file handling and frequency analysis
- **Exports**: `AudioAnalyzer` class
- **Responsibilities**:
  - Web Audio API setup
  - File loading
  - Frequency band analysis (bass, mid, treble)
  - Amplitude calculation
  - Play/pause control
- **What moves here**:
  - sketch.js lines 4-11 (audio variables)
  - sketch.js lines 142-168 (loadAudioFile)
  - sketch.js lines 170-203 (getAudioData, getFrequencyRange)
  - ~80 lines of audio code
- **Interface**:
```javascript
class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.audioElement = null;
    }

    loadFile(file) { /* setup Web Audio API */ }

    getAudioData() {
        return {
            amplitude: 0.5,  // 0-1
            bass: 0.3,       // 0-1
            mid: 0.4,        // 0-1
            treble: 0.2      // 0-1
        };
    }

    play() { /* start playback */ }
    pause() { /* stop playback */ }
}
```

#### Rendering Module (Simulation-specific)

**src/rendering/pixel-buffer.js** (NEW - extracted pattern)
- **Purpose**: Low-resolution pixel art rendering setup
- **Exports**: `PixelBuffer` class
- **Responsibilities**:
  - Create and manage p5 graphics buffer
  - Handle pixel scale changes
  - Scale buffer to main canvas
  - Background/trail effects
- **What moves here**:
  - sketch.js lines 2, 29-33 (pg creation)
  - sketch.js lines 83-86, 227-230 (buffer recreation)
  - sketch.js line 212 (background with trail)
  - sketch.js line 222 (scaling to canvas)
  - ~30 lines of buffer management
- **Interface**:
```javascript
class PixelBuffer {
    constructor(width, height, pixelScale) {
        this.pixelScale = pixelScale;
        this.buffer = createGraphics(
            floor(width / pixelScale),
            floor(height / pixelScale)
        );
    }

    resize(width, height) { /* recreate buffer */ }

    drawBackground(color, alpha) { /* trail effect */ }

    render(canvas) {
        image(this.buffer, 0, 0, canvas.width, canvas.height);
    }

    getContext() { return this.buffer; }
}
```

#### Application Modules

**src/apps/simulation-app.js** (REFACTORED from sketch.js)
- **Purpose**: Main flocking simulation application logic
- **Exports**: Setup and draw functions for p5.js
- **Responsibilities**:
  - Coordinate all modules (flock, audio, rendering, controls)
  - p5.js lifecycle (setup, draw, windowResized)
  - Connect audio data to flock updates
  - Render each boid using KoiRenderer
- **What moves here**:
  - sketch.js lines 26-40 (setup, refactored)
  - sketch.js lines 205-223 (draw, refactored)
  - sketch.js lines 225-231 (windowResized, refactored)
  - Integration logic
  - ~100 lines of app coordination
- **Structure**:
```javascript
import { FlockManager } from '../flocking/flock-manager.js';
import { AudioAnalyzer } from '../audio/audio-analyzer.js';
import { PixelBuffer } from '../rendering/pixel-buffer.js';
import { KoiRenderer } from '../core/koi-renderer.js';
import { ControlPanel } from '../ui/control-panel.js';

let flock;
let audio;
let pixelBuffer;
let renderer;
let controls;

function setup() {
    createCanvas(windowWidth, windowHeight);

    audio = new AudioAnalyzer();
    pixelBuffer = new PixelBuffer(width, height, params.pixelScale);
    flock = new FlockManager(params.numBoids, pixelBuffer.buffer.width, pixelBuffer.buffer.height);
    renderer = new KoiRenderer();
    controls = new ControlPanel(params, onParamChange);
}

function draw() {
    const audioData = audio.getAudioData();

    pixelBuffer.drawBackground(params.backgroundColor, params.trailAlpha);

    flock.update(params, audioData);

    for (let boid of flock.boids) {
        renderer.render(
            pixelBuffer.getContext(),
            boid.position.x,
            boid.position.y,
            boid.velocity.heading(),
            {
                shapeParams: DEFAULT_SHAPE_PARAMS,
                colorParams: boid.variety.base,
                pattern: boid.pattern,
                animationParams: {
                    waveTime: frameCount * 0.1,
                    sizeScale: boid.sizeMultiplier
                },
                modifiers: {
                    brightnessBoost: audioData.bass * 8 * params.audioReactivity,
                    saturationBoost: audioData.treble * 10 * params.audioReactivity,
                    sizeScale: 1 + audioData.amplitude * 0.3 * params.audioReactivity
                }
            }
        );
    }

    pixelBuffer.render(this);
}
```

**src/apps/editor-app.js** (REFACTORED from koi-editor.js)
- **Purpose**: Shape editor application logic
- **Exports**: Setup and draw functions for p5.js
- **Responsibilities**:
  - Render single koi with current parameters
  - Manage control points
  - Handle mouse interaction
  - Update UI from parameter changes
- **What moves here**:
  - koi-editor.js lines 33-45 (setup, refactored)
  - koi-editor.js lines 47-69 (draw, refactored)
  - koi-editor.js lines 259-370 (control points and mouse, refactored)
  - ~120 lines of editor app logic
- **Structure**:
```javascript
import { KoiRenderer } from '../core/koi-renderer.js';
import { EditorControls } from '../ui/editor-controls.js';
import { DEFAULT_SHAPE_PARAMS } from '../core/koi-params.js';

let renderer;
let controls;
let params = { ...DEFAULT_SHAPE_PARAMS };
let controlPoints = [];

function setup() {
    let canvas = createCanvas(800, 600);
    canvas.parent('canvasContainer');

    renderer = new KoiRenderer();
    controls = new EditorControls(params, onParamChange);
}

function draw() {
    background(10, 20, 15);

    push();
    translate(width / 2, height / 2);

    renderer.render(this, 0, 0, 0, {
        shapeParams: params,
        colorParams: { h: 0, s: 0, b: 90 },
        pattern: { spots: [] },
        animationParams: {
            waveTime: frameCount * 0.05,
            sizeScale: 15
        },
        modifiers: { brightnessBoost: 0, saturationBoost: 0, sizeScale: 1 }
    });

    // Draw control points
    for (let cp of controlPoints) {
        fill(cp.color);
        ellipse(cp.x, cp.y, 10, 10);
    }

    pop();
}
```

#### UI Modules

**src/ui/control-panel.js** (EXTRACTED from sketch.js)
- **Purpose**: Simulation control panel event handling
- **Exports**: `ControlPanel` class
- **Responsibilities**:
  - Set up event listeners for all controls
  - Update displayed values
  - Call callbacks on parameter changes
  - Handle audio file upload
  - Play/pause button state
- **What moves here**:
  - sketch.js lines 49-140 (setupControls and all listeners)
  - ~90 lines of UI event handling
- **Interface**:
```javascript
class ControlPanel {
    constructor(initialParams, onParamChange) {
        this.params = initialParams;
        this.onParamChange = onParamChange;
        this.setupListeners();
    }

    setupListeners() {
        document.getElementById('pixelScale').addEventListener('input', (e) => {
            this.params.pixelScale = parseInt(e.target.value);
            this.updateDisplay('pixelScaleValue', this.params.pixelScale);
            this.onParamChange('pixelScale', this.params.pixelScale);
        });
        // ... all other listeners ...
    }

    updateDisplay(elementId, value) {
        document.getElementById(elementId).textContent = value;
    }
}
```

**src/ui/editor-controls.js** (EXTRACTED from koi-editor.js)
- **Purpose**: Editor control panel and parameter export
- **Exports**: `EditorControls` class
- **Responsibilities**:
  - Set up input field listeners
  - Update output display
  - Copy-to-clipboard functionality
  - Synchronize UI with parameter changes
- **What moves here**:
  - koi-editor.js lines 372-425 (setupInputs and updateOutput)
  - ~55 lines of UI code
- **Interface**:
```javascript
class EditorControls {
    constructor(initialParams, onParamChange) {
        this.params = initialParams;
        this.onParamChange = onParamChange;
        this.setupInputs();
    }

    setupInputs() {
        const inputs = ['numSegments', 'bodyWidth', ...];
        inputs.forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                this.params[id] = parseFloat(e.target.value);
                this.updateOutput();
                this.onParamChange(id, this.params[id]);
            });
        });
    }

    updateOutput() { /* format and display params */ }
}
```

### Migration Strategy (What Code Moves Where)

#### Phase 1: Extract Core Rendering (Highest Priority)

**Create src/core/koi-renderer.js**:
1. Copy sketch.js lines 786-1035 (body/tail/fin/head rendering from show())
2. Remove all references to `this.` - make parameters explicit
3. Remove HSB mode switching - accept context in any mode
4. Convert to `render(context, x, y, angle, params, modifiers)` method
5. Extract helper methods: `drawBody()`, `drawTail()`, `drawFins()`, `drawHead()`
6. Result: ~400 lines of pure rendering logic

**Update sketch.js**:
1. Import KoiRenderer
2. Create instance: `const koiRenderer = new KoiRenderer()`
3. Replace Boid.show() internals with:
```javascript
show(audio) {
    koiRenderer.render(pg, this.position.x, this.position.y, this.velocity.heading(), {
        shapeParams: DEFAULT_SHAPE_PARAMS,
        colorParams: this.color,
        pattern: { spots: this.spots },
        animationParams: {
            waveTime: frameCount * 0.1 * (1 + this.velocity.mag() * 0.3),
            sizeScale: this.sizeMultiplier,
            lengthMultiplier: this.lengthMultiplier,
            tailLength: this.tailLength
        },
        modifiers: {
            brightnessBoost: audio.bass * 8 * params.audioReactivity,
            saturationBoost: audio.treble * 10 * params.audioReactivity,
            sizeScale: 1 + audio.amplitude * 0.3 * params.audioReactivity
        }
    });
}
```

**Update koi-editor.js**:
1. Import KoiRenderer
2. Remove drawKoi(), drawTail(), drawFins() (lines 71-257)
3. Replace with renderer.render() call in draw()
4. Result: Delete ~180 lines, add ~15 lines

**Verification**:
- Both apps should render identically
- No visual changes expected

#### Phase 2: Extract Variety and Pattern Logic

**Create src/core/koi-varieties.js**:
1. Copy sketch.js lines 247-301 (variety definitions)
2. Export as `export const VARIETIES = [...]`
3. Copy sketch.js lines 290-301 (weighted selection)
4. Export as `export function selectVariety(varieties) { ... }`
5. Copy sketch.js lines 319-611 (generatePattern method)
6. Convert to `export function generatePattern(variety) { ... }`
7. Return pattern object instead of modifying `this.spots`
8. Result: ~400 lines of variety/pattern logic

**Create src/core/koi-params.js**:
1. Copy koi-editor.js lines 6-29 (params object)
2. Restructure into logical groups (body, head, tail, fins)
3. Export as `DEFAULT_SHAPE_PARAMS`
4. Add parameter ranges for validation
5. Result: ~80 lines of configuration

**Update sketch.js**:
1. Import VARIETIES, selectVariety, generatePattern
2. Update Boid constructor:
```javascript
constructor() {
    // ... position/velocity setup ...
    this.variety = selectVariety(VARIETIES);
    this.pattern = generatePattern(this.variety);
    this.color = this.variety.base;
    // ... size multipliers ...
}
```
3. Remove lines 247-611 (variety and pattern code)
4. Result: Delete ~365 lines

**Update koi-editor.js**:
1. Import DEFAULT_SHAPE_PARAMS
2. Replace params initialization with `let params = { ...DEFAULT_SHAPE_PARAMS }`
3. Result: Cleaner initialization

#### Phase 3: Extract Flocking Logic

**Create src/flocking/flocking-forces.js**:
1. Copy sketch.js lines 621-645 (align)
2. Copy sketch.js lines 647-672 (cohesion)
3. Copy sketch.js lines 674-706 (separation)
4. Convert to pure functions accepting boid and neighbors
5. Add findNeighbors helper function
6. Result: ~100 lines of force calculations

**Create src/flocking/boid.js**:
1. Copy Boid constructor (lines 234-317) minus variety/pattern code
2. Copy edges() method (lines 613-619)
3. Copy update() method (lines 739-760)
4. Add applyForces() method to accept calculated forces
5. Store variety, pattern, size as properties (data only)
6. Remove show() method entirely
7. Result: ~80 lines of physics code

**Create src/flocking/flock-manager.js**:
1. Create FlockManager class
2. Move initFlock() logic to constructor
3. Move flock array management
4. Create update() method combining force calculations
5. Add resize() for dynamic boid count
6. Result: ~100 lines of coordination

**Update sketch.js**:
1. Import FlockManager
2. Replace global flock with `let flockManager`
3. Update draw() to use flockManager.update()
4. Result: Much simpler main loop

#### Phase 4: Extract Audio and Rendering Utilities

**Create src/audio/audio-analyzer.js**:
1. Copy audio variables (lines 4-11)
2. Copy loadAudioFile (lines 142-168)
3. Copy getAudioData and getFrequencyRange (lines 170-203)
4. Wrap in AudioAnalyzer class
5. Result: ~80 lines

**Create src/rendering/pixel-buffer.js**:
1. Extract pg buffer creation pattern
2. Create PixelBuffer class with resize, render methods
3. Result: ~50 lines

**Update sketch.js**:
1. Import and use AudioAnalyzer
2. Import and use PixelBuffer
3. Clean up global scope
4. Result: Delete ~120 lines

#### Phase 5: Extract UI Logic

**Create src/ui/control-panel.js**:
1. Copy setupControls and all listeners (lines 49-140)
2. Wrap in ControlPanel class
3. Accept callback for parameter changes
4. Result: ~90 lines

**Create src/ui/editor-controls.js**:
1. Copy setupInputs and updateOutput (lines 372-425)
2. Wrap in EditorControls class
3. Result: ~55 lines

**Update sketch.js and koi-editor.js**:
1. Import respective control classes
2. Instantiate with callbacks
3. Result: Cleaner app files

#### Phase 6: Create Application Orchestrators

**Create src/apps/simulation-app.js**:
1. Import all necessary modules
2. Create clean setup() and draw() functions
3. Coordinate module interactions
4. Result: ~150 lines of clean app logic

**Create src/apps/editor-app.js**:
1. Import necessary modules
2. Create clean setup() and draw() functions
3. Handle control points and mouse
4. Result: ~120 lines of clean app logic

**Update HTML files**:
1. Change script tags to import new app modules
2. Use ES6 module syntax
3. Result: Modern module loading

### Benefits of New Organization

#### Eliminated Code Duplication
- **Before**: 400+ lines duplicated between sketch.js and koi-editor.js
- **After**: Single KoiRenderer shared by both apps
- **Maintenance**: Bug fixes and enhancements in one place
- **Consistency**: Rendering always identical between apps

#### Clear Separation of Concerns
- **Rendering**: KoiRenderer knows nothing about flocking or audio
- **Flocking**: Boid/FlockManager know nothing about rendering
- **Audio**: AudioAnalyzer is independent module
- **Apps**: Thin orchestration layer connecting modules

#### Testability
- **Pure functions**: Force calculations can be unit tested
- **Isolated rendering**: Can test koi rendering without p5.js canvas
- **Mock dependencies**: Easy to mock audio data or flocking forces
- **Component testing**: Each module testable in isolation

#### Reusability
- **Use koi rendering elsewhere**: Import KoiRenderer in any project
- **Try different flocking algorithms**: Swap FlockManager implementation
- **Different audio sources**: Replace AudioAnalyzer, same interface
- **New visualizations**: Combine modules in new ways

#### Extensibility
- **Add koi varieties**: Edit koi-varieties.js only
- **New fin types**: Modify KoiRenderer, all apps benefit
- **Custom rendering**: Extend KoiRenderer, override methods
- **Compose behaviors**: Mix and match modules

#### Parameter Management
- **Single source of truth**: DEFAULT_SHAPE_PARAMS in koi-params.js
- **Validation**: Centralized in koi-params.js
- **Type safety**: Clear parameter schemas
- **Documentation**: Parameter metadata in one place

#### Developer Experience
- **Smaller files**: No file over 400 lines
- **Clear purpose**: Each file has single responsibility
- **Easy navigation**: Logical folder structure
- **Modern tooling**: ES6 modules enable better IDE support

### Implementation Considerations

#### Module System
- Use ES6 modules (`import`/`export`)
- Update HTML to use `<script type="module">`
- Consider bundler for production (optional)

#### Backward Compatibility
- Keep old files during migration
- Test each phase thoroughly
- Gradual rollout reduces risk

#### Performance
- Module overhead negligible for this use case
- Rendering performance unchanged (same code, different organization)
- May improve due to better caching and tree-shaking

#### Dependencies
- Continue using p5.js from CDN or local copy
- No new external dependencies required
- Pure JavaScript modules

### Testing Strategy

#### Unit Tests (New Capability)
- Test force calculations with known inputs
- Test variety selection probabilities
- Test parameter validation
- Test audio data transformation

#### Integration Tests
- Test FlockManager with Boid instances
- Test KoiRenderer with various parameter sets
- Test AudioAnalyzer with mock audio data

#### Visual Regression Tests
- Capture screenshots before refactor
- Compare screenshots after each phase
- Ensure pixel-perfect consistency

#### Manual Testing
- Test both apps after each phase
- Verify controls work correctly
- Check audio reactivity
- Verify pattern generation randomness

## Code References

All line numbers reference the current codebase structure:

### Duplication Evidence
- **Body segments**: sketch.js:789-808 ≈ koi-editor.js:74-96
- **Body outline**: sketch.js:974-1001 ≈ koi-editor.js:98-126
- **Tail rendering**: sketch.js:810-881 ≈ koi-editor.js:159-203
- **Fin rendering**: sketch.js:884-969 ≈ koi-editor.js:205-257
- **Head rendering**: sketch.js:1025-1030 ≈ koi-editor.js:139-147

### Module Sources
- **KoiRenderer source**: sketch.js:786-1035 + koi-editor.js:71-257
- **Variety definitions**: sketch.js:247-301
- **Pattern generation**: sketch.js:319-611
- **Flocking forces**: sketch.js:621-706
- **Boid physics**: sketch.js:234-246, 613-619, 739-760
- **Audio analysis**: sketch.js:4-11, 142-168, 170-203
- **Control panels**: sketch.js:49-140, koi-editor.js:372-425

### Configuration
- **Shape parameters**: koi-editor.js:6-29
- **Flocking parameters**: sketch.js:14-24
- **Hardcoded values**: sketch.js:239, 791, 814, etc.

## Open Questions

1. **Build tooling**: Should we introduce a bundler (Webpack, Vite) or stick with native ES6 modules?
   - Native modules work in modern browsers
   - Bundler enables minification and optimization
   - Adds complexity to development workflow

2. **TypeScript**: Would TypeScript improve maintainability?
   - Better parameter type safety
   - IDE autocomplete for complex parameter objects
   - Adds build step and learning curve

3. **Pattern data format**: Should patterns be JSON-serializable for saving/loading?
   - Enables preset patterns
   - Could save generated koi designs
   - Requires format design

4. **Rendering backends**: Should KoiRenderer be backend-agnostic (p5, canvas2d, WebGL)?
   - More flexibility
   - More abstraction complexity
   - May not be needed for this project

5. **Configuration file**: Should parameters live in JSON/YAML config files?
   - Easier for non-programmers to edit
   - Loses JavaScript flexibility
   - Requires loading mechanism

6. **Testing framework**: Which testing framework to use (Jest, Vitest, Mocha)?
   - Need to support p5.js mocking
   - Visual testing capabilities
   - Developer familiarity

7. **Documentation**: What level of documentation for each module?
   - JSDoc comments for all public APIs
   - Usage examples in README
   - Interactive demo pages

8. **Version control**: How to manage the migration in git history?
   - Feature branch vs main branch
   - Preserve old files or delete
   - Tag stable points
