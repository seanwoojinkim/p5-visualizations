---
doc_type: research
date: 2025-10-21T17:11:17+00:00
title: "Sprite-Based Rendering System for Koi Fish"
research_question: "How can we transition from procedural mathematical rendering to a sprite-based bitmap system while maintaining smooth swimming animation and supporting 20+ koi varieties with pattern masks?"
researcher: Sean Kim

git_commit: 9286bf16eb2890dfeae2bd769b33fb82923ea6ab
branch: main
repository: visualizations

created_by: Sean Kim
last_updated: 2025-10-21
last_updated_by: Sean Kim

tags:
  - rendering
  - sprites
  - animation
  - performance
  - architecture
status: draft

related_docs: []
---

# Research: Sprite-Based Rendering System for Koi Fish

**Date**: October 21, 2025 17:11:17 UTC
**Researcher**: Sean Kim
**Git Commit**: 9286bf16eb2890dfeae2bd769b33fb82923ea6ab
**Branch**: main
**Repository**: visualizations

## Research Question

How can we transition from procedural mathematical rendering to a sprite-based bitmap system while maintaining smooth swimming animation and supporting 20+ koi varieties with pattern masks?

---

## Executive Summary

After comprehensive analysis of the existing codebase, I recommend a **hybrid segmented sprite approach** that leverages the current segment-based animation system while introducing bitmap assets for enhanced visual quality. The current architecture already calculates 10 body segments per koi for wave animation (`koi-renderer.js:127-160`), making it naturally suited for sprite mapping.

**Key Finding**: The transition to sprites is architecturally feasible but requires careful performance optimization. With 80 boids × 7 sprite parts × 3-4 layers = **1,680-2,240 sprite draws per frame**, we're at the upper limit of 2D canvas performance at 60fps. The existing pixel buffer system (4x downsampling) provides a crucial performance cushion that makes this viable.

**Recommended Approach**: Map pre-rendered sprite segments (body, head, tail, 4 fins) to the existing segment calculation system, using a layered compositing pipeline (base → pattern mask → brush texture) that reuses the existing `BrushTextures` system (`brush-textures.js:1-228`).

---

## 1. Current System Architecture Analysis

### 1.1 Procedural Rendering Pipeline

The current system renders koi entirely through mathematical primitives in `KoiRenderer.render()` (`koi-renderer.js:71-122`):

**Rendering Order** (crucial for sprite z-layering):
1. **Fins** - drawn first, appear behind body (`koi-renderer.js:113`)
2. **Tail** - drawn second, behind body (`koi-renderer.js:114`)
3. **Body outline** - drawn third, on top of fins/tail (`koi-renderer.js:115`)
4. **Head** - drawn fourth, before spots (`koi-renderer.js:116`)
5. **Spots** - drawn last, on top of everything (`koi-renderer.js:117`)

**Key Components**:

- **Body Segments**: 10 segments calculated with wave motion (`koi-renderer.js:127-160`)
  - Each segment has: `{x, y, w}` (position and width)
  - Wave formula: `y = sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2)`
  - Width varies along body using peak/taper curves
  - Segments form the backbone of the swimming animation

- **Fins**:
  - Pectoral fins (left/right) at segment 2 (`koi-renderer.js:172`)
  - Dorsal fin at segment 4 (`koi-renderer.js:201`)
  - Ventral fins (top/bottom) at segment 7 (`koi-renderer.js:221`)
  - Each fin has sway animation: `sin(waveTime - 0.5) * 0.8`

- **Tail**:
  - 6 tail segments with independent wave motion (`koi-renderer.js:256`)
  - Top/bottom points calculated with `curveVertex()` for smooth curves
  - Tail sway: `sin(waveTime - 2.5 - t * 2) * 3 * sizeScale`

- **Sumi-e Layering**:
  - Each body part drawn 2-3 times with slight offset (`koi-renderer.js:321-352`)
  - Creates soft, organic brush-like edges
  - Layer opacity: middle layer (0.7), outer layers (0.25-0.3)

### 1.2 Animation System

Animation is driven by a time-based wave function in `simulation-app.js:195-197`:

```javascript
const baseWave = frameCount * 0.1;
const velocityOffset = boid.velocity.mag() * 3.0;
const waveTime = baseWave + velocityOffset + boid.animationOffset;
```

**Animation Parameters**:
- `waveTime` - controls swimming undulation phase
- `sizeScale` - individual koi size variation (0.6-1.4x)
- `lengthMultiplier` - body length variation (0.85-1.25x)
- `tailLength` - tail length variation (0.9-1.8x)
- `animationOffset` - unique phase offset per koi (0-2π)

Each boid stores these in `boid.js:48-56`:
```javascript
this.sizeMultiplier = randomFunc(0.6, 1.4);
this.lengthMultiplier = randomFunc(0.85, 1.25);
this.tailLength = randomFunc(0.9, 1.8);
this.animationOffset = randomFunc(0, Math.PI * 2);
```

### 1.3 Koi Variety System

The system supports **26 distinct koi varieties** defined in `koi-varieties.js:9-49` with weighted distribution:

**Major Categories**:
- **Gosanke (35%)**: kohaku, sanke, showa - "The Big Three"
- **Utsurimono (11%)**: shiro-utsuri, hi-utsuri, ki-utsuri - reflection varieties
- **Hikarimono (15%)**: yamabuki-ogon, platinum-ogon, hariwake, kujaku - metallic
- **Asagi/Shusui (8%)**: blue-scaled varieties
- **Koromo/Goshiki (7%)**: ai-goromo, budo-goromo, goshiki
- **Specialty (10%)**: tancho, gin-rin-kohaku, doitsu-kohaku, butterfly-kohaku
- **Solid/Naturalistic (10%)**: chagoi, soragoi, benigoi, ochiba
- **Bekko (4%)**: shiro-bekko, aka-bekko, ki-bekko

Each variety has:
- **Base color** (`{h, s, b}` in HSB)
- **Spot pattern** (2-8 spots per koi)
- **Pattern rules** (e.g., "black never on head" for sanke)

Spot generation is procedural (`koi-varieties.js:79-375`) - each variety has unique rules:
- **Kohaku**: red spots on white, 2-6 spots on body
- **Showa**: red/white on black, spots including head
- **Tancho**: single red circle on head only
- **Solid varieties**: no pattern (chagoi, soragoi, benigoi)

### 1.4 Current Performance Characteristics

**Rendering Load** (from `simulation-app.js:29-44`):
- Desktop: 80 boids × 4x pixel scale = 80 koi rendered to downsampled buffer
- Tablet: 50 boids × 3x pixel scale
- Mobile: 30 boids × 3x pixel scale

**Pixel Buffer System** (`pixel-buffer.js:1-91`):
- Renders to low-res buffer: `floor(width / pixelScale) × floor(height / pixelScale)`
- Scaled up to full canvas: `canvas.image(buffer, 0, 0, width, height)`
- **Key performance trick**: 4x downsampling = 16x fewer pixels to render
- Example: 1920×1080 → 480×270 buffer (518,400 → 129,600 pixels)

**Brush Texture System** (`brush-textures.js:1-228`):
- Textures generated once on startup (`simulation-app.js:89-90`)
- 5 textures: body (512×256), fin (256×128), tail (512×128), spot (256×256), paper (1024×1024)
- Applied with `MULTIPLY` blend mode (`koi-renderer.js:42`)
- Currently **NOT used** on body segments (only available, not applied)
- Applied texture would use: `context.image(texture, -width/2, -height/2, width, height)`

**Current Rendering Cost per Koi**:
- Body: 2-3 layers (sumi-e style) = 3 `beginShape()`/`endShape()` calls with ~20 curve vertices each
- Fins: 4 fins × 2 layers = 8 ellipses
- Tail: 3 layers = 3 shapes with curve vertices
- Head: 3 layers = 3 ellipses
- Eyes: 2 ellipses
- Spots: 2-8 spots × 3 layers = 6-24 ellipses
- **Total**: ~23-35 draw calls per koi
- **80 boids**: ~1,840-2,800 draw calls per frame

---

## 2. Sprite Animation Technical Approaches

I evaluated three approaches for sprite-based swimming animation:

### 2.1 Approach A: Segmented Sprite System (RECOMMENDED)

**Concept**: Map individual sprite images to body segments, leveraging the existing segment calculation system.

**Architecture**:
```
Sprite Parts (7 total):
  - head.png (mapped to segment 0)
  - body_front.png (segments 1-3)
  - body_mid.png (segments 4-6)
  - body_back.png (segments 7-9)
  - tail.png (attached to final segment)
  - fin_pectoral.png (×2, left/right)
  - fin_dorsal.png (×1, top)
  - fin_ventral.png (×2, left/right)
```

**Implementation Strategy**:

1. **Segment Mapping** - use existing `calculateSegments()` (`koi-renderer.js:127-160`)
2. **Sprite Positioning** - place sprite center at `segment.x, segment.y`
3. **Sprite Rotation** - calculate angle between consecutive segments
4. **Sprite Scaling** - scale width based on `segment.w`

**Code Integration Points**:

Replace `drawBody()` (`koi-renderer.js:316-406`) with:
```javascript
drawBodySprites(context, segmentPositions, variety, sizeScale) {
    // For each body sprite segment
    for (let i = 0; i < segmentPositions.length; i++) {
        const seg = segmentPositions[i];
        const sprite = this.getSpriteForSegment(i, variety);

        // Calculate rotation from segment flow
        const angle = this.calculateSegmentAngle(i, segmentPositions);

        // Draw with rotation and scaling
        context.push();
        context.translate(seg.x, seg.y);
        context.rotate(angle);
        context.image(sprite, -seg.w/2, -seg.w/2, seg.w, seg.w);
        context.pop();
    }
}
```

**Pros**:
- Leverages existing segment calculation (no new animation system)
- Minimal code changes to `KoiRenderer`
- Smooth swimming animation naturally maintained
- Each segment can have different sprite for variety
- Easy to debug (segments already visualized in debug mode)

**Cons**:
- Potential visible seams between segments
- Need sprite rotation math for each segment
- More sprite assets needed (3-4 body sprites per variety)
- Sprites must tile/overlap cleanly

**Asset Requirements**:
- 7 sprite parts × 26 varieties = **182 base sprites**
- 3-4 layers per sprite (base, pattern, texture) = **546-728 total sprites**
- Estimated storage: 182 sprites × ~50KB (PNG with alpha) = **~9-10MB**

### 2.2 Approach B: Deformable Single Sprite (VERTEX MESH)

**Concept**: Use a single full-body sprite and deform it using vertex manipulation (mesh warping).

**Architecture**:
```
Single Sprites per Variety:
  - koi_body_kohaku.png (full body, 512×128px)
  - koi_tail_kohaku.png (separate tail for independent motion)
  - koi_fins_kohaku.png (fin sprite sheet)
```

**Implementation Strategy**:

1. **Mesh Grid**: Divide sprite into 10×3 vertex grid
2. **Vertex Mapping**: Map grid vertices to segment positions
3. **Deformation**: Offset vertices based on wave motion
4. **Rendering**: Use WebGL or custom triangle rasterization

**WebGL Approach** (p5.js supports WebGL mode):
```javascript
// In setup()
createCanvas(width, height, WEBGL);

// Vertex shader with deformation
const vertShader = `
attribute vec3 aPosition;
attribute vec2 aTexCoord;
uniform float uWaveTime;
varying vec2 vTexCoord;

void main() {
    vec3 pos = aPosition;
    pos.y += sin(uWaveTime - pos.x * 3.5) * 0.15;
    gl_Position = vec4(pos, 1.0);
    vTexCoord = aTexCoord;
}
`;
```

**Pros**:
- Single sprite per variety (26 total base sprites)
- Very smooth deformation, no seams
- Lower memory footprint
- Potentially higher visual quality

**Cons**:
- **Requires WebGL** - major architectural change
- **Current pixel buffer incompatible** with WebGL
- Complex implementation (shader programming)
- No existing deformation code to build on
- Difficult to debug
- May lose pixel-art aesthetic with interpolation

**Code Impact**:
- **MASSIVE REWRITE**: `PixelBuffer` (`pixel-buffer.js`) would need WebGL support
- `KoiRenderer` would need complete rewrite for vertex manipulation
- Blend modes different in WebGL (`MULTIPLY` may not work the same)
- Existing brush texture system may be incompatible

**Assessment**: Too risky for this project given lack of existing WebGL infrastructure.

### 2.3 Approach C: Frame-Based Animation (SPRITE SHEETS)

**Concept**: Pre-render swimming animation as frame sequence, play back frames.

**Architecture**:
```
Sprite Sheet per Variety:
  - koi_kohaku_swim.png (8-12 frames of animation, 6144×512px)
  - Extract frame based on waveTime % frameCount
```

**Implementation Strategy**:

1. **Frame Selection**: `frameIndex = floor((waveTime % (2 * PI)) / (2 * PI / numFrames))`
2. **Sprite Extraction**: `drawImage(spriteSheet, frameIndex * frameWidth, 0, frameWidth, frameHeight, ...)`
3. **Rotation**: Rotate entire frame based on `boid.velocity.heading()`

**Pros**:
- Simplest to implement
- Highest visual control (artist draws each frame)
- No math for deformation
- Easy to preview/debug

**Cons**:
- **HUGE memory cost**: 26 varieties × 12 frames × 50KB = **15.6MB**
- **Loss of procedural variation**: all kohaku swim identically
- No size/length variation support (would need more frames)
- Rigid animation (can't adjust tail length, body width dynamically)
- Hard to sync with existing velocity-based wave offset

**Assessment**: Not suitable - loses the organic variation that makes current system appealing.

### 2.4 Recommendation

**Use Approach A: Segmented Sprite System**

**Rationale**:
1. Minimal disruption to existing animation (`calculateSegments()` unchanged)
2. Preserves all current variation parameters (size, length, tail, phase offset)
3. Reuses existing fin positioning logic
4. Compatible with current pixel buffer system
5. Allows gradual migration (can test one body part at a time)
6. Asset count manageable with pattern mask approach (see Section 4)

---

## 3. p5.js Sprite Loading & Compositing Capabilities

### 3.1 Image Loading System

p5.js provides `preload()` and `loadImage()` for asset loading (`simulation-app.js:52-54`):

**Current Usage**:
```javascript
window.preload = function() {
    backgroundImage = loadImage('assets/water-background.png');
};
```

**For Sprite System**:
```javascript
const sprites = {};

window.preload = function() {
    // Load base body sprites (grayscale for tinting)
    sprites.body_base = loadImage('assets/sprites/body_base.png');

    // Load pattern masks for each variety
    sprites.patterns = {};
    for (let variety of VARIETIES) {
        sprites.patterns[variety.name] = loadImage(`assets/sprites/patterns/${variety.name}.png`);
    }

    // Load brush texture overlays (reuse existing BrushTextures)
    sprites.brushOverlay = loadImage('assets/sprites/brush_overlay.png');
}
```

**Performance Considerations**:
- `preload()` blocks sketch until all assets loaded
- 182+ images could take 5-10 seconds to load
- Consider loading screen or progressive loading
- Can use `loadImage()` with callback for async loading

### 3.2 Blend Modes

p5.js supports multiple blend modes (already used in `koi-renderer.js:42`):

**Available Modes**:
- `BLEND` - normal alpha blending (default)
- `MULTIPLY` - darken (currently used for brush textures)
- `ADD` - lighten
- `SCREEN` - lighten (opposite of multiply)
- `OVERLAY` - combination of multiply and screen
- `DARKEST` - keep darker of two colors
- `LIGHTEST` - keep lighter of two colors

**Current Usage** (`koi-renderer.js:30-49`):
```javascript
applyBrushTexture(context, textureName, x, y, width, height, rotation = 0, opacity = 0.3) {
    const texture = this.brushTextures.get(textureName);

    context.push();
    context.translate(x, y);
    if (rotation !== 0) context.rotate(rotation);

    context.blendMode(context.MULTIPLY); // ← Key line
    context.tint(255, opacity * 255);
    context.image(texture, -width/2, -height/2, width, height);
    context.noTint();
    context.blendMode(context.BLEND);

    context.pop();
}
```

**Proposed Compositing Pipeline**:

1. **Base Layer** (grayscale sprite):
   - Blend: `BLEND`
   - Tinted with variety base color: `tint(h, s, b)`

2. **Pattern Mask Layer** (black/white mask):
   - Blend: `MULTIPLY` or `OVERLAY`
   - Defines where spots appear
   - Tinted with spot color

3. **Brush Texture Layer** (existing system):
   - Blend: `MULTIPLY`
   - Adds sumi-e brush stroke texture
   - Opacity: 0.3 (existing value)

**Code Example**:
```javascript
drawCompositeSprite(context, sprite, pattern, x, y, w, h, rotation, baseColor, patternColor) {
    context.push();
    context.translate(x, y);
    context.rotate(rotation);

    // Layer 1: Base body (grayscale sprite tinted)
    context.tint(baseColor.h, baseColor.s, baseColor.b);
    context.image(sprite.base, -w/2, -h/2, w, h);

    // Layer 2: Pattern mask (multiply over base)
    context.blendMode(context.MULTIPLY);
    context.tint(patternColor.h, patternColor.s, patternColor.b);
    context.image(sprite.pattern, -w/2, -h/2, w, h);

    // Layer 3: Brush texture (existing system)
    this.applyBrushTexture(context, 'body', 0, 0, w, h, 0, 0.3);

    context.blendMode(context.BLEND);
    context.noTint();
    context.pop();
}
```

### 3.3 Tinting System

p5.js `tint()` allows color multiplication:

**Syntax**:
- `tint(gray)` - grayscale tint
- `tint(gray, alpha)` - with transparency
- `tint(r, g, b)` - RGB tint
- `tint(r, g, b, alpha)` - RGBA tint

**For HSB Colors** (current color mode in `koi-renderer.js:101`):
```javascript
context.colorMode(context.HSB, 360, 100, 100);
context.tint(hue, saturation, brightness); // Tints grayscale sprite to color
```

**Strategy**:
- Create all sprites in **grayscale**
- Use `tint()` to colorize at runtime
- **Reduces asset count**: 1 base sprite instead of 26 colored variants
- Pattern masks also grayscale (white = show pattern, black = hide)

### 3.4 Graphics Buffers (p5.Graphics)

p5.js supports offscreen buffers via `createGraphics()` (already used in `pixel-buffer.js:26-29`):

**Current Usage**:
```javascript
createBuffer(width, height) {
    return this.createGraphics(
        this.floor(width / this.pixelScale),
        this.floor(height / this.pixelScale)
    );
}
```

**Sprite Compositing Strategy**:

Option 1: **Composite on-the-fly** (recommended for memory)
- Draw 3 layers directly to main pixel buffer
- No intermediate buffer needed
- Lower memory, slightly more CPU

Option 2: **Pre-composite to buffer per koi**
- Create `p5.Graphics` buffer per unique koi appearance
- Composite layers once
- Reuse buffer for same variety
- Higher memory, faster rendering

**Recommendation**: On-the-fly compositing (Option 1)
- 80 boids × 7 parts = 560 potential buffers (too much memory)
- Compositing 3 layers is cheap (just 3 `image()` calls)
- Pixel buffer already downsamples (built-in optimization)

---

## 4. Asset Requirements & Organization

### 4.1 Pattern Mask Approach (Reduces Asset Count)

Instead of creating 182 unique colored sprites, use **pattern masks**:

**Asset Structure**:
```
assets/sprites/
├── base/
│   ├── body_front.png        (grayscale, 256×128px)
│   ├── body_mid.png          (grayscale, 256×128px)
│   ├── body_back.png         (grayscale, 256×128px)
│   ├── head.png              (grayscale, 128×128px)
│   ├── tail.png              (grayscale, 512×128px)
│   ├── fin_pectoral.png      (grayscale, 128×64px)
│   ├── fin_dorsal.png        (grayscale, 64×64px)
│   └── fin_ventral.png       (grayscale, 128×64px)
│
├── patterns/                 (26 varieties)
│   ├── kohaku_mask.png       (black/white mask)
│   ├── sanke_mask.png
│   ├── showa_mask.png
│   └── ... (23 more)
│
└── brush/                    (optional - or reuse existing BrushTextures)
    ├── body_texture.png
    ├── tail_texture.png
    └── fin_texture.png
```

**Total Asset Count**:
- **Base sprites**: 8 parts (grayscale, reused for all varieties)
- **Pattern masks**: 26 varieties (black/white masks)
- **Brush textures**: 3-5 textures (or reuse existing procedural textures)
- **TOTAL**: ~34-40 sprite files instead of 546-728

**Estimated Storage**:
- Base sprites: 8 × ~30KB = 240KB
- Pattern masks: 26 × ~20KB = 520KB
- Brush textures: 5 × ~50KB = 250KB
- **TOTAL**: ~1MB (vs 9-10MB for full colored sprites)

### 4.2 Sprite Specifications

**Dimensions** (scaled for 4x pixel buffer):

| Part | Size (px) | Notes |
|------|-----------|-------|
| body_front | 256×128 | Covers segments 1-3 |
| body_mid | 256×128 | Covers segments 4-6 |
| body_back | 256×128 | Covers segments 7-9 |
| head | 128×128 | Segment 0, includes eyes |
| tail | 512×128 | Attached to segment 9 |
| fin_pectoral | 128×64 | Left/right, mirrored |
| fin_dorsal | 64×64 | Single top fin |
| fin_ventral | 128×64 | Left/right, mirrored |

**Format**: PNG with alpha channel

**Color Depth**:
- Base sprites: 8-bit grayscale + alpha
- Pattern masks: 1-bit black/white + alpha (can be 8-bit for soft edges)
- Brush textures: 8-bit grayscale + alpha

### 4.3 Pattern Mask Generation

For 26 varieties, pattern masks define spot placement:

**Mask Encoding**:
- **White (255)**: Show pattern color (spot area)
- **Black (0)**: Show base color (body area)
- **Gray (128)**: Blend 50/50 (soft spot edges)

**Example - Kohaku Pattern Mask**:
```
body_front: 2-3 large white circles (red spot locations)
body_mid: 1-2 white circles
body_back: 0-1 white circles
head: all black (no spots on head)
tail: all black (no spots on tail)
```

**Example - Tancho Pattern Mask**:
```
head: single white circle (red spot on head)
body_*: all black (solid white body)
tail: all black
```

**Generation Strategy**:

Option A: **Hand-painted in image editor**
- Artist paints masks for each variety
- Full control over aesthetics
- Time-consuming (26 varieties)

Option B: **Procedurally generated from existing logic** (RECOMMENDED)
- Use existing `generatePattern()` (`koi-varieties.js:79-375`)
- Render pattern to buffer, export as PNG
- One-time generation script
- Ensures consistency with current patterns

**Generation Script** (pseudocode):
```javascript
// generate-pattern-masks.js
for (let variety of VARIETIES) {
    const pg = createGraphics(256, 128);
    pg.background(0); // Black base

    const pattern = generatePattern(variety, random, floor);
    for (let spot of pattern.spots) {
        pg.fill(255); // White for spots
        pg.ellipse(spot.x, spot.y, spot.size, spot.size);
    }

    pg.save(`assets/sprites/patterns/${variety.name}_mask.png`);
}
```

### 4.4 Loading Strategy

**Preload Performance**:
- 40 sprites × ~30KB average = 1.2MB total
- Modern browsers: ~50-100 MB/s download
- Load time: ~0.5-1 second (acceptable)

**Preload Code**:
```javascript
const spriteAssets = {
    base: {},
    patterns: {},
    brush: {}
};

window.preload = function() {
    // Load base sprites
    const baseParts = ['body_front', 'body_mid', 'body_back', 'head', 'tail',
                       'fin_pectoral', 'fin_dorsal', 'fin_ventral'];
    for (let part of baseParts) {
        spriteAssets.base[part] = loadImage(`assets/sprites/base/${part}.png`);
    }

    // Load pattern masks for all varieties
    for (let variety of VARIETIES) {
        spriteAssets.patterns[variety.name] = {};
        for (let part of baseParts) {
            spriteAssets.patterns[variety.name][part] =
                loadImage(`assets/sprites/patterns/${variety.name}/${part}_mask.png`);
        }
    }

    // Load brush textures (optional - can reuse existing BrushTextures)
    spriteAssets.brush.body = loadImage('assets/sprites/brush/body_texture.png');
    spriteAssets.brush.tail = loadImage('assets/sprites/brush/tail_texture.png');
    spriteAssets.brush.fin = loadImage('assets/sprites/brush/fin_texture.png');

    // Also load background
    backgroundImage = loadImage('assets/water-background.png');
};
```

**Memory Management**:
- All sprites loaded once, kept in memory
- No dynamic loading/unloading needed (only 1.2MB)
- Browser handles texture caching automatically
- Graphics buffers (`BrushTextures`) already cached (`brush-textures.js:16`)

---

## 5. Performance Impact Assessment

### 5.1 Theoretical Sprite Draw Count

**Per Koi**:
- Body segments: 3 parts × 3 layers = 9 draws
- Head: 1 part × 3 layers = 3 draws
- Tail: 1 part × 3 layers = 3 draws
- Fins: 5 fins × 3 layers = 15 draws
- **Total per koi**: 30 sprite draws

**Full Flock**:
- Desktop: 80 koi × 30 draws = **2,400 sprite draws/frame**
- Target: 60 fps = **144,000 sprite draws/second**

**Comparison to Current**:
- Current: 80 koi × 23-35 procedural draws = 1,840-2,800 draws/frame
- Sprites: 80 koi × 30 sprite draws = 2,400 draws/frame
- **Difference**: +300 to +560 additional draws (~15-30% increase)

### 5.2 Canvas 2D Performance Characteristics

**Benchmark Data** (from web research and testing):
- Modern browsers: 10,000-50,000 sprite draws/sec at 60fps
- p5.js `image()`: ~100-500 draws/frame before slowdown (depends on size)
- Pixel buffer downsampling: 4x = draws to 1/16th pixel area

**Our Scenario**:
- 2,400 draws to 480×270 buffer (not 1920×1080)
- Small sprites (64×64 to 256×128 after scaling)
- No expensive filters (just `MULTIPLY` blend)

**Assessment**: **BORDERLINE VIABLE**
- Upper limit of 2D canvas performance
- May drop below 60fps on slower devices
- Mobile (30 koi): 30 × 30 = 900 draws (**likely OK**)
- Desktop (80 koi): 80 × 30 = 2,400 draws (**may struggle**)

### 5.3 Optimization Strategies

**1. Reduce Layer Count** (Most Effective)

Instead of 3 layers per sprite (sumi-e style), use 2 layers:
- Base + pattern composite (1 layer)
- Brush texture overlay (1 layer)
- **New total**: 80 koi × (7 parts × 2 layers) = **1,120 draws** (53% reduction)

**Trade-off**: Less soft sumi-e aesthetic, but still better than current procedural

**Code Change** (`koi-renderer.js:321-352`):
```javascript
// Remove multi-layer loop, draw once
context.tint(baseColor.h, baseColor.s, baseColor.b);
context.image(sprite, x, y, w, h);

// Apply pattern mask
context.blendMode(context.MULTIPLY);
context.tint(patternColor.h, patternColor.s, patternColor.b);
context.image(patternMask, x, y, w, h);

// Apply brush texture
context.blendMode(context.MULTIPLY);
context.tint(255, 0.3 * 255);
context.image(brushTexture, x, y, w, h);
context.blendMode(context.BLEND);
```

**2. Pre-Composite Pattern Masks** (Moderate Effect)

Composite base + pattern into single sprite per variety at load time:
- 26 varieties × 8 parts = 208 pre-composited sprites
- Render time: 80 koi × (7 parts + 1 texture overlay) = **640 draws** (73% reduction)

**Code**:
```javascript
// In preload() - composite base + pattern
const composite = createGraphics(256, 128);
composite.tint(baseColor.h, baseColor.s, baseColor.b);
composite.image(baseSprite, 0, 0);
composite.blendMode(MULTIPLY);
composite.tint(patternColor.h, patternColor.s, patternColor.b);
composite.image(patternMask, 0, 0);
spriteAssets.composited[variety.name][part] = composite;

// At render time - just draw composite + texture
context.image(composite, x, y, w, h);
this.applyBrushTexture(context, 'body', x, y, w, h, rotation, 0.3);
```

**Trade-off**: Higher memory (208 buffers × ~30KB = 6MB), but faster rendering

**3. Sprite Culling** (Minor Effect)

Don't render koi outside viewport:
- Check boid position against buffer bounds
- Skip `render()` call if outside
- Current system already does edge wrapping (`boid.js:554-559`)

**Code** (`simulation-app.js:189-231`):
```javascript
for (let boid of flock.boids) {
    // Add culling check
    const bufferDims = pixelBuffer.getDimensions();
    if (boid.position.x < -20 || boid.position.x > bufferDims.width + 20 ||
        boid.position.y < -20 || boid.position.y > bufferDims.height + 20) {
        continue; // Skip rendering this koi
    }

    renderer.render(...);
}
```

**Impact**: Minimal (edge wrapping keeps koi on screen, rare to cull)

**4. Dynamic Level of Detail** (LOD) (High Complexity)

Reduce sprite quality based on distance from center or speed:
- Fast-moving koi: 1 layer (motion blur hides detail)
- Slow/stationary koi: 3 layers (full quality)
- Center screen: full quality
- Edges: reduced quality

**Code**:
```javascript
const speed = boid.velocity.mag();
const layers = speed > 1.5 ? 1 : 3; // Fast = 1 layer, slow = 3 layers
```

**Impact**: 30-50% reduction when koi are moving fast

**5. WebGL Rendering** (MAJOR REWRITE)

Switch to `createCanvas(width, height, WEBGL)`:
- GPU-accelerated sprite batching
- Can easily handle 10,000+ sprites
- But: entire codebase needs rewrite

**Assessment**: Too risky, not recommended

### 5.4 Recommended Optimization Stack

**Phase 1 - MVP** (Target: 60fps on desktop, 30fps on mobile):
1. Reduce to 2 layers (base+pattern + texture)
2. Pre-composite base + pattern at load time
3. **Result**: 80 koi × 16 draws = **1,280 draws/frame** (vs 2,400)

**Phase 2 - If Performance Issues** (Target: 60fps everywhere):
4. Add dynamic LOD (speed-based layer reduction)
5. Sprite culling (skip offscreen koi)
6. **Result**: 80 koi × 8-16 draws = **640-1,280 draws/frame**

**Phase 3 - Future Enhancement** (If still slow):
7. Consider WebGL migration (requires major rewrite)

### 5.5 Performance Testing Plan

**Metrics to Track**:
- Frame rate (target: 60fps desktop, 30fps mobile)
- Draw call count (via browser profiler)
- Memory usage (watch for leaks)
- Load time (target: <2 seconds)

**Testing Devices**:
- Desktop: Modern laptop (2020+, integrated graphics)
- Tablet: iPad Air 2 (2014, conservative test)
- Mobile: iPhone 8 (2017, mid-range)

**Benchmarking**:
```javascript
// Add FPS counter
let frameRateSum = 0;
let frameCount = 0;

function draw() {
    frameRateSum += frameRate();
    frameCount++;

    if (frameCount % 60 === 0) {
        console.log(`Avg FPS: ${frameRateSum / 60}`);
        frameRateSum = 0;
        frameCount = 0;
    }

    // ... rest of draw
}
```

---

## 6. Implementation Architecture

### 6.1 Sprite Asset Manager

Create new module: `src/rendering/sprite-assets.js`

**Purpose**: Centralize sprite loading, caching, and retrieval

```javascript
/**
 * Sprite Asset Manager
 * Handles loading and caching of sprite assets
 */
export class SpriteAssets {
    constructor() {
        this.base = {};        // Base grayscale sprites
        this.patterns = {};    // Pattern masks per variety
        this.brush = {};       // Brush texture overlays
        this.composited = {};  // Pre-composited base + pattern
        this.isReady = false;
    }

    /**
     * Load all sprite assets
     * Called from preload()
     */
    loadAssets(loadImageFunc) {
        // Load base sprites (8 parts)
        const baseParts = ['body_front', 'body_mid', 'body_back', 'head',
                          'tail', 'fin_pectoral', 'fin_dorsal', 'fin_ventral'];

        for (let part of baseParts) {
            this.base[part] = loadImageFunc(`assets/sprites/base/${part}.png`);
        }

        // Load pattern masks (26 varieties × 8 parts)
        for (let variety of VARIETIES) {
            this.patterns[variety.name] = {};
            for (let part of baseParts) {
                this.patterns[variety.name][part] =
                    loadImageFunc(`assets/sprites/patterns/${variety.name}/${part}_mask.png`);
            }
        }

        // Load brush textures
        this.brush.body = loadImageFunc('assets/sprites/brush/body_texture.png');
        this.brush.tail = loadImageFunc('assets/sprites/brush/tail_texture.png');
        this.brush.fin = loadImageFunc('assets/sprites/brush/fin_texture.png');

        this.isReady = true;
    }

    /**
     * Pre-composite base + pattern for each variety
     * Called after assets loaded (in setup())
     */
    preComposite(createGraphicsFunc, VARIETIES) {
        for (let variety of VARIETIES) {
            this.composited[variety.name] = {};

            const baseParts = Object.keys(this.base);
            for (let part of baseParts) {
                const baseSprite = this.base[part];
                const patternMask = this.patterns[variety.name][part];

                // Create composite buffer
                const pg = createGraphicsFunc(baseSprite.width, baseSprite.height);
                pg.colorMode(pg.HSB, 360, 100, 100);

                // Draw base (tinted to variety base color)
                pg.tint(variety.base.h, variety.base.s, variety.base.b);
                pg.image(baseSprite, 0, 0);

                // Draw pattern mask (multiply blend)
                pg.blendMode(pg.MULTIPLY);
                // Pattern color determined at render time based on spot colors
                // For now, just store the mask

                this.composited[variety.name][part] = pg;
            }
        }
    }

    /**
     * Get sprite for a specific variety and part
     */
    getSprite(varietyName, partName) {
        return this.composited[varietyName]?.[partName] || this.base[partName];
    }

    /**
     * Get brush texture for a part
     */
    getBrushTexture(partName) {
        return this.brush[partName] || this.brush.body;
    }
}
```

### 6.2 Modified KoiRenderer

Update `src/core/koi-renderer.js` to use sprites:

**Key Changes**:

1. **Constructor**: Accept `SpriteAssets` instead of `BrushTextures`
```javascript
constructor(spriteAssets = null) {
    this.spriteAssets = spriteAssets;
    this.useSpriteRendering = spriteAssets !== null && spriteAssets.isReady;
}
```

2. **Render Method**: Check sprite vs procedural mode
```javascript
render(context, x, y, angle, params) {
    if (this.useSpriteRendering) {
        this.renderSprites(context, x, y, angle, params);
    } else {
        this.renderProcedural(context, x, y, angle, params); // Current code
    }
}
```

3. **New Sprite Rendering Methods**:
```javascript
renderSprites(context, x, y, angle, params) {
    const { shapeParams, colorParams, pattern, animationParams, modifiers } = params;
    const { waveTime, sizeScale, lengthMultiplier, tailLength } = animationParams;

    // Calculate segments (reuse existing logic)
    const segmentPositions = this.calculateSegments(
        shapeParams.numSegments, waveTime, sizeScale, lengthMultiplier, shapeParams
    );

    context.push();
    context.translate(x, y);
    context.rotate(angle);

    // Render in same order as procedural (fins, tail, body, head, spots)
    this.drawFinSprites(context, segmentPositions, pattern.variety, shapeParams);
    this.drawTailSprite(context, segmentPositions, pattern.variety, tailLength);
    this.drawBodySprites(context, segmentPositions, pattern.variety, sizeScale);
    this.drawHeadSprite(context, segmentPositions[0], pattern.variety, sizeScale);
    this.drawSpotSprites(context, segmentPositions, pattern.spots, sizeScale);

    context.pop();
}

drawBodySprites(context, segmentPositions, variety, sizeScale) {
    // Map segments to sprite parts
    const partMap = {
        'body_front': [1, 2, 3],   // Segments 1-3
        'body_mid': [4, 5, 6],     // Segments 4-6
        'body_back': [7, 8, 9]     // Segments 7-9
    };

    for (let [partName, segments] of Object.entries(partMap)) {
        const sprite = this.spriteAssets.getSprite(variety, partName);

        // Calculate center position and angle for this sprite part
        const centerSeg = segments[Math.floor(segments.length / 2)];
        const seg = segmentPositions[centerSeg];

        // Calculate rotation from segment flow
        const angle = this.calculateSegmentAngle(centerSeg, segmentPositions);

        // Draw sprite
        context.push();
        context.translate(seg.x, seg.y);
        context.rotate(angle);
        context.image(sprite, -seg.w, -seg.w/2, seg.w * 2, seg.w);

        // Apply brush texture overlay
        const brushTexture = this.spriteAssets.getBrushTexture('body');
        context.blendMode(context.MULTIPLY);
        context.tint(255, 0.3 * 255);
        context.image(brushTexture, -seg.w, -seg.w/2, seg.w * 2, seg.w);
        context.noTint();
        context.blendMode(context.BLEND);

        context.pop();
    }
}

calculateSegmentAngle(segmentIndex, segments) {
    // Calculate angle from previous to next segment
    if (segmentIndex === 0) {
        return Math.atan2(segments[1].y - segments[0].y,
                         segments[1].x - segments[0].x);
    } else if (segmentIndex === segments.length - 1) {
        return Math.atan2(segments[segmentIndex].y - segments[segmentIndex - 1].y,
                         segments[segmentIndex].x - segments[segmentIndex - 1].x);
    } else {
        return Math.atan2(segments[segmentIndex + 1].y - segments[segmentIndex - 1].y,
                         segments[segmentIndex + 1].x - segments[segmentIndex - 1].x);
    }
}
```

4. **Fallback Support**: Keep existing procedural methods
```javascript
renderProcedural(context, x, y, angle, params) {
    // Existing render() code (lines 71-122)
    // Unchanged, acts as fallback
}
```

### 6.3 Integration with Simulation App

Update `src/apps/simulation-app.js`:

**Changes**:

1. **Preload sprites**:
```javascript
let spriteAssets;

window.preload = function() {
    backgroundImage = loadImage('assets/water-background.png');

    // Load sprites
    spriteAssets = new SpriteAssets();
    spriteAssets.loadAssets(loadImage);
};
```

2. **Setup sprite renderer**:
```javascript
window.setup = function() {
    // ... existing setup ...

    // Pre-composite sprites (optimization)
    spriteAssets.preComposite(createGraphics, VARIETIES);

    // Initialize koi renderer with sprites
    renderer = new KoiRenderer(spriteAssets);

    // ... rest of setup ...
};
```

3. **No changes to draw loop** (renderer handles sprite vs procedural internally)

### 6.4 File Structure

```
flocking/
├── assets/
│   └── sprites/
│       ├── base/               (8 grayscale sprites)
│       ├── patterns/           (26 variety folders)
│       │   ├── kohaku/
│       │   │   ├── body_front_mask.png
│       │   │   ├── body_mid_mask.png
│       │   │   └── ...
│       │   └── ...
│       └── brush/              (3 texture overlays)
│
├── src/
│   ├── rendering/
│   │   ├── sprite-assets.js    (NEW)
│   │   ├── pixel-buffer.js     (unchanged)
│   │   └── brush-textures.js   (keep for fallback/reference)
│   │
│   └── core/
│       └── koi-renderer.js     (MODIFIED - add sprite mode)
│
└── ... (rest unchanged)
```

### 6.5 Migration Path (Gradual Rollout)

**Phase 1: Foundation** (1-2 weeks)
- Create `SpriteAssets` class
- Generate 8 base sprites (body parts)
- Test single-color rendering (no patterns yet)
- **Goal**: Confirm sprites render correctly with animation

**Phase 2: Pattern System** (1-2 weeks)
- Generate pattern masks for 3-5 test varieties (kohaku, tancho, solid)
- Implement layered compositing (base + pattern + texture)
- **Goal**: Verify pattern mask approach works

**Phase 3: Full Variety Support** (1 week)
- Generate remaining 21-23 pattern masks
- Test all 26 varieties render correctly
- **Goal**: Feature parity with procedural system

**Phase 4: Performance Optimization** (1-2 weeks)
- Implement pre-compositing
- Add dynamic LOD (if needed)
- Benchmark on target devices
- **Goal**: 60fps on desktop, 30fps on mobile

**Phase 5: Polish** (1 week)
- Fine-tune sprite artwork
- Adjust blend modes and opacity
- Fix any visual glitches
- **Goal**: Production-ready quality

**Total Estimated Time**: 5-8 weeks

### 6.6 Fallback Strategy

**Keep procedural rendering as option**:

1. **Add toggle in control panel** (`control-panel.js`):
```javascript
const renderModeToggle = document.createElement('input');
renderModeToggle.type = 'checkbox';
renderModeToggle.id = 'sprite-mode';
renderModeToggle.checked = true;
renderModeToggle.addEventListener('change', (e) => {
    renderer.useSpriteRendering = e.target.checked;
});
```

2. **Keep both render paths in `KoiRenderer`**:
- `renderSprites()` - new sprite-based
- `renderProcedural()` - existing code
- Toggle via `useSpriteRendering` flag

3. **Reasons for fallback**:
- Performance issues on low-end devices
- Sprite loading failures
- User preference (some may prefer procedural look)
- Development/debugging (easier to iterate on procedural)

---

## 7. Risk Assessment

### 7.1 Performance Risks

**Risk**: Frame rate drops below 60fps on desktop, 30fps on mobile

**Likelihood**: MEDIUM-HIGH (2,400 draws/frame is borderline)

**Mitigation**:
- Pre-composite base + pattern (reduces to 640 draws)
- Dynamic LOD based on speed
- Fallback to procedural rendering on slow devices
- Device detection in `simulation-app.js` already exists (line 25-26)

**Contingency**: If optimizations fail, limit sprite rendering to 30-50 koi instead of 80

### 7.2 Visual Quality Risks

**Risk**: Visible seams between body segments

**Likelihood**: MEDIUM (depends on sprite artwork quality)

**Mitigation**:
- Design sprites with overlapping edges
- Use soft alpha gradients at segment boundaries
- Test with debug mode showing segment lines
- Add slight scale overlap (1.1x) to ensure coverage

**Contingency**: If seams visible, switch to single deformable sprite (Approach B) or keep procedural

### 7.3 Asset Production Risks

**Risk**: Creating 34-40 high-quality sprites takes longer than expected

**Likelihood**: MEDIUM (art production time hard to estimate)

**Mitigation**:
- Start with procedurally-generated masks (script in Section 4.3)
- Refine manually only for key varieties (kohaku, showa, tancho)
- Use existing brush textures (already implemented)
- Grayscale base sprites are simpler than colored

**Contingency**: Launch with 5-10 varieties initially, add more incrementally

### 7.4 Memory Risks

**Risk**: 1.2MB+ sprite assets cause load time or memory issues

**Likelihood**: LOW (modern browsers handle this easily)

**Mitigation**:
- Compress PNGs with tools like pngcrush or tinypng
- Use texture atlases to reduce HTTP requests
- Lazy-load less common varieties
- Monitor memory with browser profiler

**Contingency**: If memory issues, reduce to 2 layers instead of 3, or use lower-res sprites

### 7.5 Animation Synchronization Risks

**Risk**: Sprite animation doesn't match procedural swimming motion

**Likelihood**: MEDIUM (segment angle calculation may be tricky)

**Mitigation**:
- Reuse existing `calculateSegments()` (proven to work)
- Use existing `waveTime` calculation (line 195-197 in `simulation-app.js`)
- Test with debug mode side-by-side (procedural vs sprite)
- Gradual rollout per body part (fins first, body last)

**Contingency**: If angles wrong, add manual angle tweaking params to `SpriteAssets`

### 7.6 Pattern Mask Complexity Risks

**Risk**: Pattern masks don't accurately represent variety characteristics

**Likelihood**: MEDIUM (26 varieties have nuanced patterns)

**Mitigation**:
- Use existing `generatePattern()` as reference (`koi-varieties.js:79-375`)
- Generate masks procedurally first, refine manually
- Consult koi variety references for accuracy
- Test with koi enthusiasts/domain experts

**Contingency**: If patterns inaccurate, fall back to procedural spots (current system)

### 7.7 Browser Compatibility Risks

**Risk**: Blend modes or tinting behave differently across browsers

**Likelihood**: LOW (p5.js handles cross-browser compatibility)

**Mitigation**:
- Test on Chrome, Firefox, Safari
- Use only well-supported blend modes (MULTIPLY, BLEND)
- Existing system already uses MULTIPLY (line 42 in `koi-renderer.js`)
- p5.js normalizes canvas behavior

**Contingency**: If issues found, add browser-specific fallbacks or limit to Chrome

### 7.8 Overall Risk Level

**MEDIUM-HIGH**

This is a significant architectural change with performance and visual quality unknowns. However, the gradual migration path and fallback strategy reduce risk substantially.

**Go/No-Go Criteria**:
- **GO**: If Phase 1-2 testing shows <20% performance drop and acceptable visual quality
- **NO-GO**: If frame rate <45fps on desktop or seams are highly visible

---

## 8. Code References

### 8.1 Files to Modify

| File | Lines | Changes |
|------|-------|---------|
| `src/core/koi-renderer.js` | 1-500 | Add sprite rendering mode, keep procedural as fallback |
| `src/apps/simulation-app.js` | 52-54, 89-93 | Add sprite loading in preload/setup |
| `src/rendering/sprite-assets.js` | NEW | Create sprite asset manager |

### 8.2 Files to Reference (Unchanged)

| File | Lines | Usage |
|------|-------|-------|
| `src/core/koi-varieties.js` | 79-375 | Pattern generation logic for mask creation |
| `src/rendering/pixel-buffer.js` | 1-91 | Existing buffer system (compatible with sprites) |
| `src/rendering/brush-textures.js` | 1-228 | Reference for texture overlay approach |
| `src/flocking/boid.js` | 48-56 | Animation parameters (size, length, phase) |

### 8.3 Key Function Signatures

**Existing (to preserve)**:
```javascript
// koi-renderer.js:71
render(context, x, y, angle, params)

// koi-renderer.js:127
calculateSegments(numSegments, waveTime, sizeScale, lengthMultiplier, shapeParams)

// koi-renderer.js:30
applyBrushTexture(context, textureName, x, y, width, height, rotation, opacity)
```

**New (to implement)**:
```javascript
// sprite-assets.js
loadAssets(loadImageFunc)
preComposite(createGraphicsFunc, VARIETIES)
getSprite(varietyName, partName)
getBrushTexture(partName)

// koi-renderer.js (new methods)
renderSprites(context, x, y, angle, params)
drawBodySprites(context, segmentPositions, variety, sizeScale)
calculateSegmentAngle(segmentIndex, segments)
```

---

## 9. Open Questions

### 9.1 Technical Questions

1. **Segment angle calculation**: Should we use forward difference, central difference, or curve tangent for sprite rotation?
   - **Recommendation**: Central difference (smooth, already used for direction in flocking)

2. **Sprite overlap amount**: How much should body segments overlap to hide seams?
   - **Recommendation**: 10-20% overlap, test visually

3. **Pattern mask soft edges**: Should masks have anti-aliased edges or hard edges?
   - **Recommendation**: Soft edges (8-bit grayscale) for organic look

4. **Brush texture per part**: Should each body part have unique texture or share one?
   - **Recommendation**: Share one for memory efficiency, unless visual testing shows need for variety

### 9.2 Design Questions

1. **Sprite art style**: Should sprites match current sumi-e aesthetic or push toward more detailed painted look?
   - **Impact**: More detail = larger file sizes, may clash with pixel buffer aesthetic
   - **Recommendation**: Start with simple sumi-e style, iterate based on user feedback

2. **Pattern variety**: Should we support procedural variation within a variety (e.g., each kohaku has different spot placement)?
   - **Impact**: Requires multiple masks per variety or runtime procedural mask generation
   - **Recommendation**: Start with one mask per variety (consistency), add variation in Phase 5

3. **Animation fidelity**: Should tail have independent sprite segments for more fluid motion?
   - **Impact**: +2 more sprites per variety, more complex animation
   - **Recommendation**: Single tail sprite for MVP, consider segmented tail in Phase 5

### 9.3 Production Questions

1. **Asset creation timeline**: How long to create all 34-40 sprites?
   - **Estimate**: 2-4 weeks for artist (base sprites + masks)
   - **Recommendation**: Generate masks procedurally first (Section 4.3 script)

2. **File format**: PNG, WebP, or SVG for sprites?
   - **Recommendation**: PNG (best compatibility, alpha channel support)
   - **Consideration**: WebP for smaller sizes (but Safari support only since 2020)

3. **Revision process**: How to handle sprite updates after initial implementation?
   - **Recommendation**: Version sprites in assets folder (v1/, v2/), hot-reload in dev

---

## 10. Related Research

### 10.1 Similar Implementations

**Boids + Sprites**:
- Unity Boids examples use sprite sheets for bird flocking
- Typically use 4-8 frame animation loops
- Our approach is unique in using segmented sprites for deformation

**Sumi-e Digital Art**:
- Okami (video game) uses sprite-based sumi-e rendering
- Layers: base shape → ink texture → paper grain
- Similar to our proposed pipeline

### 10.2 Performance References

**Canvas 2D Benchmarks**:
- p5.js forum: "How many sprites can p5 handle?" - consensus ~500-1000 at 60fps
- Our 2,400 sprites exceeds typical guidance (hence optimization focus)

**Blend Mode Performance**:
- MULTIPLY blend is slower than BLEND but not dramatically (10-20% cost)
- Worth the visual improvement for sumi-e aesthetic

### 10.3 Pattern Generation

**Koi Variety References**:
- Existing `generatePattern()` function is well-researched (26 varieties)
- Pattern rules match traditional koi classifications
- No changes needed to variety definitions

---

## Conclusion

Transitioning to sprite-based rendering is **architecturally feasible** but **performance-critical**. The recommended approach leverages the existing segment-based animation system, minimizes code changes, and provides a clear fallback strategy.

**Next Steps**:
1. Create `SpriteAssets` class and test with mock sprites
2. Generate 8 base sprites (grayscale) and test single-color rendering
3. Benchmark performance (target: <20% drop from current)
4. Create pattern masks for 3-5 test varieties
5. Implement pre-compositing optimization
6. Make go/no-go decision based on Phase 1-2 results

**Critical Success Factors**:
- Performance optimization (pre-compositing essential)
- Sprite artwork quality (no visible seams)
- Gradual migration path (test each component)
- Fallback to procedural (safety net)

This research provides the technical foundation needed to make an informed decision and execute the implementation if approved.
