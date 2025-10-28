# Calming Cloud Asset System

A **calming, meditative cloud visualization system** for P5.js, specifically optimized for HRV biofeedback applications and meditation support.

**Status**: Phase 1 Complete - Core Noise Engine and Calming Movement System

## Overview

This system provides slow, subtle, non-distracting cloud visualizations designed for 10-20 minute meditation and breathing training sessions. Unlike active, stimulating visualizations, these clouds offer a gentle, grounding background suitable for maintaining breath focus.

### Key Features

- **Multi-scale Perlin noise** using Blender-researched values (512, 12.25, 0.12)
- **Ultra-slow ambient drift** (0.1-0.5 px/frame) for calming effect
- **Soft organic forms** with radial gradients (no harsh edges)
- **Biofeedback-responsive** parameters (opacity, glow, warmth) - *Coming in Phase 3*
- **Meditation-optimized presets** - *Coming in Phase 4*
- **Guaranteed 60 FPS** performance for 20+ minute sessions

## Current Implementation (Phase 1)

### Files

```
/workspace/clouds/
├── src/
│   ├── CloudNoiseEngine.js    # Multi-scale noise generator
│   └── CloudUtils.js           # Helper utilities
└── examples/
    └── test-noise-engine.html  # Interactive noise visualization
```

### CloudNoiseEngine.js

Multi-scale Perlin noise generator with exact Blender research scales.

**Features:**
- Three noise scales: Large (512), Medium (12.25), Fine (0.12)
- Weighted composition favoring large scale for calm movement
- Ultra-slow time evolution for ambient drift
- 2D and 3D sampling
- Drift velocity calculation for sprite movement
- Seed-based reproducibility

**Example Usage:**

```javascript
// Create noise engine
const noiseEngine = new CloudNoiseEngine({
    seed: 42,
    scaleNoise: {
        large: 512.0,
        medium: 12.25,
        fine: 0.12
    },
    weights: {
        large: 1.0,
        medium: 0.3,
        fine: 0.1
    }
});

// Sample noise at position
const noiseValue = noiseEngine.sample2D(x, y, time);

// Get drift velocity for a sprite
const sprite = {
    seedX: 100,
    seedY: 200,
    maxSpeed: 0.3  // px/frame
};
const velocity = noiseEngine.getDriftVelocity(sprite, time);

// Update sprite position
sprite.x += velocity.x;
sprite.y += velocity.y;

// Update time each frame
noiseEngine.update(deltaTime);
```

### CloudUtils.js

Utility functions for color manipulation, smooth transitions, and animation helpers.

**Features:**
- Color interpolation (RGB lerping)
- Exponential moving average for smooth transitions
- RGB <-> HSL color conversion
- Color warmth adjustment
- Gaussian random distribution
- Easing functions
- Time-based oscillators

**Example Usage:**

```javascript
// Color interpolation
const color1 = { r: 200, g: 220, b: 255 };
const color2 = { r: 255, g: 245, b: 220 };
const blended = CloudUtils.lerpColor(color1, color2, 0.5);

// Smooth parameter transitions
const smoother = CloudUtils.createSmoother(0.5, 0.05);
smoother.update(0.8);  // Target: 0.8
const smoothValue = smoother.getValue();  // Gradually moves toward 0.8

// Adjust color warmth
const coolColor = { r: 200, g: 210, b: 220 };
const warmColor = CloudUtils.adjustWarmth(coolColor, 0.5);  // Shift toward warm

// Time-based oscillation
const breathingEffect = CloudUtils.oscillate(time, 0.2, 0.1, 1.0);
// Oscillates at 0.2 Hz (12 breaths/min) with amplitude 0.1 around 1.0
```

## Testing

### Test Page

The interactive test page (`examples/test-noise-engine.html`) provides:

- **Noise field visualization** (all three scales separately and combined)
- **Drifting particles** demonstration (100 soft sprites)
- **Interactive controls**:
  - Seed selection
  - Time speed multiplier
  - Max particle speed
  - Display mode switching
- **Live statistics**:
  - Frame rate
  - Average particle velocity
  - Current time
  - Noise configuration

### Running the Test

1. **Start a local server**:
   ```bash
   cd /workspace/clouds/examples
   python3 -m http.server 8001
   ```

2. **Open in browser**:
   ```
   http://localhost:8001/test-noise-engine.html
   ```

3. **Test scenarios**:
   - Select "Combined" mode to see multi-scale noise
   - Select "Large Scale Only" to see slow drift pattern
   - Select "Drifting Particles" to see calming movement
   - Adjust max speed slider and verify velocity stays under 0.5 px/frame

## Design Principles

### Calming Movement

- **Maximum velocity**: 0.5 pixels per frame (30 px/sec at 60 FPS)
- **Perception**: < 1 px/frame feels like "drifting" not "moving"
- **Time evolution**: 100x slower than typical implementations
- **No sudden changes**: Smooth, continuous noise-based movement

### Soft Organic Forms

- **Shape**: Circular sprites with radial alpha gradients (no sharp edges)
- **Size distribution**: Gaussian (most medium-sized, few large/small)
- **Range**: 20-80 pixels diameter

### Color Palette for Meditation

- **Low saturation**: Maximum 20% (HSV) to avoid arousal
- **Cool neutrals**: Soft whites, cool grays (default)
- **Warm coherence**: Golden glows, warm peachy tones (high coherence)
- **Transitions**: 3-5 second smooth blends (no jarring shifts)

## Performance Targets

- **Frame rate**: 60 FPS sustained
- **Session duration**: 20+ minutes stable
- **Memory**: < 50 MB, no leaks
- **Particle count**: 50-150 sprites

## Roadmap

### Phase 1: Core Noise Engine (COMPLETED)
- [x] Multi-scale noise system
- [x] Helper utilities
- [x] Interactive test page

### Phase 2: Layered Sprite Renderer (Pending)
- [ ] CloudSprite.js with radial gradients
- [ ] CloudLayer.js with depth management
- [ ] CloudBackground.js orchestrator
- [ ] Soft clouds demo

### Phase 3: Biofeedback Integration (Pending)
- [ ] BiofeedbackMapper.js
- [ ] Coherence → visual parameter mapping
- [ ] Integration with HRV coherence system
- [ ] Biofeedback demo page

### Phase 4: Presets and Optimization (Pending)
- [ ] CalmingPresets.js
- [ ] Morning mist, evening calm, deep meditation presets
- [ ] Performance optimization
- [ ] Complete documentation

## Technical Specifications

### Noise Scales (from Blender Research)

| Scale | Value | Purpose | Weight |
|-------|-------|---------|--------|
| Large | 512.0 | Slow overall drift | 1.0 |
| Medium | 12.25 | Secondary variation | 0.3 |
| Fine | 0.12 | Minimal texture | 0.1 |

### Time Multipliers

| Scale | Multiplier | Effect |
|-------|-----------|--------|
| Large | 0.0001 | Very slow drift |
| Medium | 0.0002 | Slightly faster secondary |
| Fine | 0.0003 | Fastest but still very slow |

## References

- **Plan**: [Calming Cloud Asset System Plan](/workspace/thoughts/plans/2025-10-28-calming-cloud-asset-system-for-hrv-biofeedback-visualization.md)
- **Research**: [Blender Procedural Cloud Generator Analysis](/workspace/thoughts/research/2025-10-28-blender-procedural-cloud-generator-technical-analysis.md)
- **Implementation**: [Phase 1 Progress](/workspace/thoughts/implementation-details/2025-10-28-CLOUD-PHASE-1-calming-cloud-asset-system-phase-1-progress.md)

## License

Part of the HRV Biofeedback workspace.

---

**Status**: Phase 1 Complete (2025-10-28)
**Next**: Phase 2 - Layered Sprite Cloud Renderer with Soft Organic Forms
