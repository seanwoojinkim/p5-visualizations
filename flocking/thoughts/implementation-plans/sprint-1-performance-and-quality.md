# Sprint 1: Performance & Quality Quick Wins - Implementation Plan

**Goal:** Achieve 15-20ms performance improvement + cleaner codebase
**Estimated Time:** 6 hours
**Status:** Ready for Implementation

---

## Phase 1: Body Texture Tinting Cache (Est: 1.5 hours)

### Success Criteria
- Body textures are cached in the existing LRU cache system
- Cache hit rate > 90% after warmup
- Body texture tinting no longer happens per-frame per-koi
- Visual output remains identical to current rendering

### Implementation Steps

#### Step 1.1: Extend BrushTextures class with body texture cache method
**File:** `/workspace/flocking/src/rendering/brush-textures.js`

Add method after `getTintedSpot()`:
```javascript
/**
 * Get a pre-tinted body texture (with LRU caching for performance)
 * @param {Object} color - {h, s, b} HSB color to tint to
 * @param {number} alpha - Alpha value (0-255)
 * @returns {p5.Image|p5.Graphics} - Pre-tinted texture
 */
getTintedBody(color, alpha) {
    if (!this.p5Instance || !this.textures.body) {
        return this.textures.body;
    }

    // Create cache key (same rounding as spots)
    const h = Math.round(color.h / 5) * 5;
    const s = Math.round(color.s / 5) * 5;
    const b = Math.round(color.b / 5) * 5;
    const a = Math.round(alpha / 10) * 10;
    const cacheKey = `body_${h}_${s}_${b}_${a}`;

    // Check cache (LRU: move to end if found)
    if (this.tintCache.has(cacheKey)) {
        const cached = this.tintCache.get(cacheKey);
        this.tintCache.delete(cacheKey);
        this.tintCache.set(cacheKey, cached);
        this.cacheStats.hits++;
        return cached;
    }

    // Cache miss: create tinted texture
    this.cacheStats.misses++;

    const tinted = this.p5Instance.createGraphics(
        this.textures.body.width,
        this.textures.body.height
    );

    tinted.push();
    tinted.colorMode(tinted.HSB);
    tinted.tint(color.h, color.s, color.b, alpha);
    tinted.blendMode(tinted.MULTIPLY);
    tinted.image(this.textures.body, 0, 0);
    tinted.noTint();
    tinted.pop();

    // Evict oldest if cache full
    if (this.tintCache.size >= this.maxCacheSize) {
        const firstKey = this.tintCache.keys().next().value;
        const removed = this.tintCache.get(firstKey);
        removed.remove();
        this.tintCache.delete(firstKey);
        this.cacheStats.evictions++;
    }

    this.tintCache.set(cacheKey, tinted);
    return tinted;
}
```

#### Step 1.2: Update applyBodyTexture to use cached textures
**File:** `/workspace/flocking/src/core/koi-renderer.js`

Replace lines 1070-1081:
```javascript
// OLD CODE (DELETE):
context.push();
context.translate(centerX, centerY);

// Apply color tint (use body color)
context.colorMode(context.HSB);
context.tint(hue, saturation, brightness, BRUSH_TEXTURE_CONFIG.BODY_TEXTURE_ALPHA);

// Use MULTIPLY for integration with body color
context.blendMode(context.MULTIPLY);

// Draw texture scaled to body size
context.imageMode(context.CENTER);
const textureWidth = bodyWidth * BRUSH_TEXTURE_CONFIG.BODY_TEXTURE_SCALE;
const textureHeight = bodyHeight * BRUSH_TEXTURE_CONFIG.BODY_TEXTURE_SCALE;
context.image(bodyTexture, 0, 0, textureWidth, textureHeight);

context.noTint();
context.pop();

// NEW CODE:
// Get pre-tinted texture from cache (performance optimization)
const tintedBody = this.brushTextures.getTintedBody(
    { h: hue, s: saturation, b: brightness },
    BRUSH_TEXTURE_CONFIG.BODY_TEXTURE_ALPHA
);

context.push();
context.translate(centerX, centerY);

// Draw pre-tinted texture (no runtime tinting needed)
context.imageMode(context.CENTER);
const textureWidth = bodyWidth * BRUSH_TEXTURE_CONFIG.BODY_TEXTURE_SCALE;
const textureHeight = bodyHeight * BRUSH_TEXTURE_CONFIG.BODY_TEXTURE_SCALE;
context.image(tintedBody, 0, 0, textureWidth, textureHeight);

context.pop();
```

**Visual QA Required:** Yes - verify body textures look identical

---

## Phase 2: Pre-compute Trigonometric Values (Est: 1 hour)

### Success Criteria
- Wave sine values calculated once per frame instead of per-koi
- No visual changes to swimming animation
- Measurable performance improvement in calculateSegments

### Implementation Steps

#### Step 2.1: Add wave cache to KoiRenderer
**File:** `/workspace/flocking/src/core/koi-renderer.js`

Add to constructor (after line 11):
```javascript
constructor(brushTextures = null) {
    this.brushTextures = brushTextures;

    // Wave value cache for performance
    this.waveCache = null;
    this.lastWaveTime = -1;
    this.lastNumSegments = -1;
}
```

#### Step 2.2: Update calculateSegments to use cached wave values
**File:** `/workspace/flocking/src/core/koi-renderer.js`

Replace lines 191-227 calculateSegments method:
```javascript
calculateSegments(numSegments, waveTime, waveAmplitudeScale, lengthMultiplier, tailLength, sizeScale) {
    // Pre-calculate wave values once per frame (performance optimization)
    if (waveTime !== this.lastWaveTime || numSegments !== this.lastNumSegments) {
        this.waveCache = [];
        for (let i = 0; i < numSegments; i++) {
            const t = i / numSegments;
            this.waveCache[i] = Math.sin(waveTime - t * ANIMATION_CONFIG.wave.phaseGradient);
        }
        this.lastWaveTime = waveTime;
        this.lastNumSegments = numSegments;
    }

    const segments = [];

    for (let i = 0; i < numSegments; i++) {
        const t = i / numSegments;

        // X position: head (positive) to tail (negative)
        let x = lerp(
            ANIMATION_CONFIG.segments.headX,
            ANIMATION_CONFIG.segments.tailX * lengthMultiplier,
            t
        ) * sizeScale;

        // Y position: Use cached wave value instead of calculating
        const y = this.waveCache[i] *
            ANIMATION_CONFIG.wave.amplitude *
            sizeScale *
            waveAmplitudeScale *
            (1 - t * ANIMATION_CONFIG.wave.dampingFactor);

        // Calculate segment width
        let baseWidth = lerp(
            ANIMATION_CONFIG.segments.baseWidthStart,
            ANIMATION_CONFIG.segments.baseWidthPeak,
            sin(t * PI)
        );

        // Taper width near tail
        if (t > ANIMATION_CONFIG.segments.tailTaperStart) {
            const tailT = (t - ANIMATION_CONFIG.segments.tailTaperStart) /
                (1 - ANIMATION_CONFIG.segments.tailTaperStart);
            baseWidth = baseWidth * (1 - tailT * ANIMATION_CONFIG.segments.tailTaperAmount);
        }

        const segmentWidth = baseWidth * sizeScale;
        segments.push({ x, y, w: segmentWidth });
    }

    return segments;
}
```

**Visual QA Required:** Yes - verify swimming animation looks identical

---

## Phase 3: Color Mode Optimization (Est: 0.5 hours)

### Success Criteria
- Color mode set globally once in both simulation and editor
- No colorMode() calls in koi-renderer.js
- All colors render identically

### Implementation Steps

#### Step 3.1: Set color mode globally in simulation-app
**File:** `/workspace/flocking/src/apps/simulation-app.js`

Add after line 192 (in setup function):
```javascript
// Set color mode globally for performance (no per-koi switches)
pg.colorMode(pg.HSB);
```

#### Step 3.2: Set color mode globally in editor-app
**File:** `/workspace/flocking/src/apps/editor-app.js`

Add after line 142 (in setup function):
```javascript
// Set color mode globally for performance
colorMode(HSB);
```

#### Step 3.3: Remove color mode switches from koi-renderer
**File:** `/workspace/flocking/src/core/koi-renderer.js`

Remove lines 140 and 186:
```javascript
// DELETE line 140:
context.colorMode(context.HSB || 'HSB', 360, 100, 100);

// DELETE line 186:
context.colorMode(context.RGB || 'RGB');
```

**Visual QA Required:** Yes - verify all koi colors render correctly

---

## Phase 4: Optimize Array Spread Operations (Est: 0.5 hours)

### Success Criteria
- Array spreads replaced with manual loops in hot paths
- No visual changes
- Performance improvement in applyWaveDeformation

### Implementation Steps

#### Step 4.1: Replace array spreads in applyWaveDeformation
**File:** `/workspace/flocking/src/core/koi-renderer.js`

Replace lines 631-634:
```javascript
// OLD CODE (DELETE):
const xs = vertices.map(v => v.x);
const minX = Math.min(...xs);
const maxX = Math.max(...xs);
const bodyRange = maxX - minX;

// NEW CODE (3-5× faster):
// Manual min/max finding (faster than array spread for >20 elements)
let minX = Infinity;
let maxX = -Infinity;
for (let v of vertices) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
}
const bodyRange = maxX - minX;
```

**Visual QA Required:** No - pure optimization, no visual changes expected

---

## Phase 5: Remove Debug Console Statements (Est: 0.5 hours)

### Success Criteria
- Debug flag added to control console output
- Production console noise eliminated
- Debug logging can be re-enabled when needed

### Implementation Steps

#### Step 5.1: Add DEBUG flag to simulation-app
**File:** `/workspace/flocking/src/apps/simulation-app.js`

Add after imports (line 15):
```javascript
// Debug mode flag - set to true to enable verbose logging
const DEBUG = false;
```

#### Step 5.2: Update console.log statements
Replace lines 66-67:
```javascript
// OLD:
console.log(`Koi Flocking - ${deviceType} detected...`);

// NEW:
if (DEBUG) console.log(`Koi Flocking - ${deviceType} detected...`);
```

Replace lines 152-160 (inside preload):
```javascript
// Wrap all console.log in DEBUG checks
if (DEBUG) console.log('Loading brush texture images...');
if (DEBUG) console.log('Loading SVG body parts...');
// etc...
```

#### Step 5.3: Disable oscillation debug in Boid
**File:** `/workspace/flocking/src/flocking/boid.js`

Change line 36:
```javascript
// OLD:
this.debugOscillation = true;

// NEW:
this.debugOscillation = false; // Set to true to enable oscillation debug logging
```

#### Step 5.4: Reduce brush texture logging
**File:** `/workspace/flocking/src/rendering/brush-textures.js`

Keep only critical logs, remove success confirmations (optional):
```javascript
// Line 54 - Keep but make it cleaner
console.log(`Brush textures loaded: ${this.textures.spots.length} spot variations (pre-processed)`);

// Line 134 - Keep as is (user action)
console.log('✓ Tint cache cleared');
```

**Visual QA Required:** No - logging only

---

## Phase 6: Extract Magic Numbers (Est: 0.5 hours)

### Success Criteria
- All hardcoded values extracted to named constants
- Code is more self-documenting
- Values are easy to adjust

### Implementation Steps

#### Step 6.1: Add performance constants to simulation-app
**File:** `/workspace/flocking/src/apps/simulation-app.js`

Add after line 40 (with other params):
```javascript
// Performance monitoring constants
const TARGET_FRAME_TIME_MS = 16.67; // 60fps target
const TARGET_FPS = 60;

// Device-specific pixel scales
const PIXEL_SCALE = {
    MOBILE: 3,
    TABLET: 3,
    DESKTOP: 2
};

const BASE_SIZE_SCALE = {
    MOBILE: 1.0,
    TABLET: 1.0,
    DESKTOP: 2.0
};
```

#### Step 6.2: Use constants in params object
Replace lines 48-49, 62:
```javascript
// OLD:
pixelScale: isMobile ? 3 : (isSmallScreen ? 3 : 2),

// NEW:
pixelScale: isMobile ? PIXEL_SCALE.MOBILE : (isSmallScreen ? PIXEL_SCALE.TABLET : PIXEL_SCALE.DESKTOP),

// OLD (line 62):
const baseSizeScale = isMobile ? 1.0 : (isSmallScreen ? 1.0 : 2.0);

// NEW:
const baseSizeScale = isMobile ? BASE_SIZE_SCALE.MOBILE : (isSmallScreen ? BASE_SIZE_SCALE.TABLET : BASE_SIZE_SCALE.DESKTOP);
```

#### Step 6.3: Use constant in performance warning
Replace line 412:
```javascript
// OLD:
if (frameTime > 16.67) {

// NEW:
if (frameTime > TARGET_FRAME_TIME_MS) {
    console.warn(`Frame time: ${frameTime.toFixed(2)}ms (target: ${TARGET_FRAME_TIME_MS}ms for ${TARGET_FPS}fps)`);
}
```

#### Step 6.4: Add rotation constant to koi-renderer
**File:** `/workspace/flocking/src/core/koi-renderer.js`

Add to BRUSH_TEXTURE_CONFIG (line 14):
```javascript
const BRUSH_TEXTURE_CONFIG = {
    // ... existing config ...

    // Spot rotation
    SPOT_ROTATION_FLIP: Math.PI, // 180° to flip brush direction (head-to-tail)
};
```

Use in line 1254:
```javascript
// OLD:
context.rotate(Math.PI + randomRotation);

// NEW:
context.rotate(BRUSH_TEXTURE_CONFIG.SPOT_ROTATION_FLIP + randomRotation);
```

**Visual QA Required:** No - refactoring only

---

## Phase 7: Add Critical Null Checks (Est: 1.5 hours)

### Success Criteria
- Robust error handling prevents crashes
- Graceful fallbacks when resources fail to load
- Helpful error messages in console

### Implementation Steps

#### Step 7.1: Add SVG validation in render method
**File:** `/workspace/flocking/src/core/koi-renderer.js`

Replace lines 161-167:
```javascript
// OLD:
if (svgVertices.body && svgVertices.body.length > 0) {

// NEW:
if (svgVertices.body && Array.isArray(svgVertices.body) && svgVertices.body.length > 0) {
    this.drawBodyFromSVG(context, segmentPositions, svgVertices.body, shapeParams, finalSizeScale, hue, saturation, brightness);
} else {
    if (svgVertices.body !== undefined && svgVertices.body !== null) {
        console.warn('Invalid SVG body vertices, falling back to procedural rendering');
    }
    this.drawBody(context, segmentPositions, shapeParams, finalSizeScale, hue, saturation, brightness);
}
```

#### Step 7.2: Add brush texture validation in applyBodyTexture
**File:** `/workspace/flocking/src/core/koi-renderer.js`

Replace lines 1044-1051:
```javascript
// OLD:
if (!this.brushTextures || !this.brushTextures.isReady) {
    return;
}

const bodyTexture = this.brushTextures.get('body');
if (!bodyTexture) {
    return;
}

// NEW:
if (!this.brushTextures || !this.brushTextures.isReady || typeof this.brushTextures.getTintedBody !== 'function') {
    if (DEBUG) console.warn('Brush textures not available for body texture');
    return;
}

const bodyTexture = this.brushTextures.get('body');
if (!bodyTexture || !bodyTexture.width || !bodyTexture.height) {
    console.warn('Invalid body texture, skipping body texture application');
    return;
}
```

#### Step 7.3: Add audio loading error handling
**File:** `/workspace/flocking/src/apps/simulation-app.js`

Replace lines 205-208:
```javascript
// OLD:
onAudioFileLoad: async (file) => {
    await audio.loadAudioFile(file);
    controlPanel.enablePlayPause();
},

// NEW:
onAudioFileLoad: async (file) => {
    try {
        await audio.loadAudioFile(file);
        controlPanel.enablePlayPause();
        if (DEBUG) console.log('Audio file loaded successfully');
    } catch (error) {
        console.error('Failed to load audio file:', error);
        alert('Failed to load audio file. Please try a different file or check the console for details.');
    }
},
```

#### Step 7.4: Improve SVG parsing error handling
**File:** `/workspace/flocking/src/core/svg-parser.js`

Replace lines 187-199:
```javascript
static async loadSVGFromURL(url, numPoints = 20, targetDimensions = null) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const svgText = await response.text();

        const vertices = this.parseSVGFile(svgText, numPoints, targetDimensions);
        if (!vertices || vertices.length === 0) {
            throw new Error('SVG parsing returned no vertices');
        }

        return vertices;
    } catch (error) {
        console.error(`Error loading SVG from ${url}:`, error.message || error);
        console.error('Stack:', error.stack);
        return null;
    }
}
```

**Visual QA Required:** No - error handling only, test by intentionally breaking SVG paths

---

## Testing & Validation

### Performance Testing
1. Run with 80 koi and monitor FPS
2. Check browser DevTools Performance tab for:
   - Reduced frame time (target: -15 to -20ms)
   - Fewer function calls in hot paths
   - Reduced time in tinting operations

### Visual QA Checkpoints
- [ ] Phase 1: Body textures look identical (colors, position, opacity)
- [ ] Phase 2: Swimming animation looks identical (smooth wave motion)
- [ ] Phase 3: All koi colors render correctly (no color shifts)

### Functional Testing
1. Load simulation - should work normally
2. Load editor - should work normally
3. Try different koi varieties - colors should be correct
4. Load audio file (valid) - should work
5. Load audio file (invalid) - should show error message
6. Check console - should be much quieter in production

---

## Success Metrics

### Performance Goals
- **Current:** 25-35 FPS with 80 koi
- **Target:** 40-50 FPS with 80 koi
- **Minimum:** 15ms frame time improvement

### Code Quality Goals
- Zero console spam in production
- Graceful error handling for all resource loading
- Self-documenting constant names

---

## Rollback Plan

If any phase causes issues:
1. Git revert to commit before phase started
2. Document the issue in this plan
3. Skip to next phase
4. Return to problematic phase later

---

## Notes for Code Reviewer

After implementation, verify:
1. **Performance**: Actual frame time improvement (use browser DevTools)
2. **Cache stats**: Body texture cache hit rate using `brushTextures.getCacheStats()`
3. **Visual consistency**: No rendering differences
4. **Error handling**: Graceful failures with helpful messages
5. **Code cleanliness**: No magic numbers, no debug spam
