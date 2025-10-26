---
doc_type: research
date: 2025-10-26T16:04:13+00:00
title: "Magic Numbers in Koi Rendering and Animation Code"
research_question: "What magic numbers are used in koi rendering and animation code, and which should be extracted to centralized configuration?"
researcher: Claude

git_commit: f13984e2560e55d7e6530daf1e129c38ead79414
branch: main
repository: workspace

created_by: Claude
last_updated: 2025-10-26
last_updated_by: Claude

tags:
  - rendering
  - animation
  - configuration
  - magic-numbers
  - koi-renderer
status: complete

related_docs: []
---

# Research: Magic Numbers in Koi Rendering and Animation Code

**Date**: 2025-10-26T16:04:13+00:00
**Researcher**: Claude
**Git Commit**: f13984e2560e55d7e6530daf1e129c38ead79414
**Branch**: main
**Repository**: workspace

## Research Question

What magic numbers are used in koi rendering and animation code, and which should be extracted to centralized configuration?

## Summary

This research catalogs all magic numbers (hardcoded numeric values) found in `/workspace/flocking/src/core/koi-renderer.js` and categorizes them by purpose. The analysis identifies 60+ distinct magic numbers across animation parameters, rendering settings, geometry calculations, and visual effects. Key findings:

1. **Animation parameters** (wave amplitudes, frequencies, rotation values) are the most frequently reused and should be prioritized for extraction
2. **Rendering parameters** (opacity values, color adjustments, layer counts) are specific to sumi-e style and should be grouped together
3. **Geometry parameters** (segment counts, scale factors, distances) are currently split between `koi-renderer.js` and `koi-params.js`
4. Many values are reused multiple times (e.g., `0.8`, `0.15`, `1.2`) indicating they represent consistent design decisions

## Detailed Findings

### 1. ANIMATION PARAMETERS (High Priority for Extraction)

These control the motion and timing of koi swimming animations.

#### Wave Motion (Body Swimming)
- **Line 167**: `3.5` - Wave phase gradient multiplier (appears in body wave calculation: `waveTime - t * 3.5`)
- **Line 167**: `1.5` - Wave amplitude multiplier for body undulation
- **Line 167**: `0.2` - Wave dampening factor (reduces amplitude toward tail: `1 - t * 0.2`)
- **Line 490**: `3.5` - Same wave phase gradient (reused for tail continuation)
- **Line 490**: `1.5` - Same wave amplitude (reused for tail continuation)
- **Line 490**: `0.2` - Same dampening factor (reused for tail continuation)
- **Line 166**: `7` - Body segment X start position
- **Line 166**: `-9` - Body segment X end position

**Usage**: Body segment calculation (`calculateSegments` method)
**Reuse Count**: Wave values (`3.5`, `1.5`, `0.2`) appear 2x each (body + tail)
**Priority**: MUST EXTRACT - Core swimming animation parameters

#### Fin Animation
- **Line 267**: `0.5` - Fin sway phase offset (`waveTime - 0.5`)
- **Line 267**: `0.8` - Fin sway amplitude
- **Line 369**: `0.5` - Same sway phase (reused in procedural fins)
- **Line 369**: `0.8` - Same sway amplitude (reused)
- **Line 227**: `1.2` - Rotation frequency multiplier for fins (`waveTime * 1.2`)
- **Line 278**: `0.15` - Pectoral fin rotation amplitude (radians)
- **Line 291**: `-0.15` - Opposite pectoral fin rotation amplitude
- **Line 344**: `0.1` - Ventral fin rotation amplitude (radians)
- **Line 357**: `-0.1` - Opposite ventral fin rotation amplitude
- **Line 384**: `0.15` - Procedural pectoral rotation amplitude (same value)
- **Line 397**: `0.15` - Procedural pectoral rotation (reused)
- **Line 433**: `0.1` - Procedural ventral rotation (same value)
- **Line 446**: `0.1` - Procedural ventral rotation (reused)

**Usage**: `drawFins`, `drawFinFromSVG` methods
**Reuse Count**: Sway values appear 2x, rotation values appear 4x each
**Priority**: MUST EXTRACT - Repeated animation values

#### Dorsal Fin Wave Dampening
- **Line 303**: `0.5` - Wave dampening for dorsal fin (30% comment is incorrect - should be 50%)
- **Line 305**: `1` - Dorsal start index offset (`dorsalPos - 1`)
- **Line 306**: `2` - Dorsal end index offset (`dorsalPos + 2`)

**Usage**: Dorsal fin wave deformation
**Priority**: SHOULD EXTRACT - Controls visual smoothness

#### Tail Flutter
- **Line 480**: `12` - Number of tail segments for wave interpolation
- **Line 486**: `6` - Tail length in units (before multiplier)
- **Line 489**: `0.5` - Tail wave continuation factor
- **Line 526**: `6` - Tail segment count (procedural)
- **Line 527**: `6` - Tail length units (procedural, same value)
- **Line 536**: `2.5` - Tail flutter phase offset
- **Line 536**: `2` - Tail flutter phase gradient
- **Line 536**: `3` - Tail flutter amplitude scale
- **Line 536**: `0.5` - Flutter amplitude start multiplier
- **Line 536**: `0.5` - Additional amplitude factor (`0.5 + t * 0.5`)

**Usage**: `drawTail`, `drawTailFromSVG` methods
**Reuse Count**: Tail length `6` appears 3x
**Priority**: MUST EXTRACT - Complex tail animation formulas

### 2. RENDERING PARAMETERS (Medium Priority)

These control visual appearance and artistic style.

#### Opacity Values
- **Line 30**: `0.3` - Default brush texture opacity
- **Line 370**: `0.6` - Sumi-e fin opacity
- **Line 370**: `0.7` - Normal (non-sumi-e) fin opacity
- **Line 379**: `0.5` - Sumi-e primary layer opacity (layer 0)
- **Line 379**: `0.25` - Sumi-e secondary layer opacity
- **Line 392**: `0.5` - Sumi-e layer 0 (reused)
- **Line 392**: `0.25` - Sumi-e layer (reused)
- **Line 406**: `0.6` - Sumi-e dorsal fin opacity (layer 0)
- **Line 406**: `0.3` - Sumi-e dorsal fin opacity (layer 1)
- **Line 406**: `0.75` - Normal dorsal fin opacity
- **Line 428**: `0.5` - Sumi-e ventral fin opacity
- **Line 428**: `0.25` - Sumi-e ventral fin opacity
- **Line 850**: `0.4` - Sumi-e SVG secondary layer opacity
- **Line 919**: `0.7` - Sumi-e body primary layer opacity
- **Line 919**: `0.3` - Sumi-e body secondary layer opacity
- **Line 1022**: `0.75` - Sumi-e spot primary opacity
- **Line 1022**: `0.3` - Sumi-e spot secondary opacity
- **Line 1123**: `0.8` - Sumi-e head primary opacity
- **Line 1123**: `0.3` - Sumi-e head secondary opacity

**Usage**: Sumi-e and normal rendering throughout
**Reuse Count**: `0.5` appears 5x, `0.25` appears 4x, `0.3` appears 5x
**Priority**: SHOULD EXTRACT - Group sumi-e style config

#### Color Adjustments
- **Line 118**: `100` - Max saturation value (HSB)
- **Line 119**: `100` - Max brightness value (HSB)
- **Line 116**: `360` - HSB hue range
- **Line 237**: `8` - Saturation boost for fins
- **Line 238**: `15` - Brightness reduction for fins
- **Line 328**: `8` - Saturation boost (reused)
- **Line 329**: `15` - Brightness reduction (reused)
- **Line 381**: `8` - Saturation boost (reused again)
- **Line 381**: `15` - Brightness reduction (reused)
- **Line 505**: `5` - Tail saturation boost
- **Line 506**: `12` - Tail brightness reduction
- **Line 568**: `5` - Tail saturation boost (reused)
- **Line 568**: `12` - Tail brightness reduction (reused)
- **Line 901**: `2` - Body brightness reduction
- **Line 956**: `2` - Body brightness reduction (reused)
- **Line 994**: `10` - Segment line saturation boost
- **Line 994**: `25` - Segment line brightness reduction
- **Line 1066**: `2` - Head brightness boost
- **Line 1125**: `2` - Head brightness boost (reused)

**Usage**: Color calculations throughout rendering
**Reuse Count**: Fin adjustments (`8`, `15`) appear 3x each, tail (`5`, `12`) appear 2x
**Priority**: SHOULD EXTRACT - Consistent color theming

#### Layer Counts (Sumi-e Style)
- **Line 371**: `2` - Fin layer count (sumi-e)
- **Line 371**: `1` - Fin layer count (normal)
- **Line 545**: `3` - Tail layer count (sumi-e)
- **Line 848**: `3` - SVG shape layer count (sumi-e)
- **Line 917**: `3` - Body layer count (sumi-e)
- **Line 1019**: `3` - Spot layer count (sumi-e)
- **Line 1120**: `3` - Head layer count (sumi-e)

**Usage**: Multi-layer rendering for soft brush effect
**Reuse Count**: `3` layers is standard for most shapes
**Priority**: CAN STAY - Implementation detail, but could extract for consistency

#### Layer Offsets (Sumi-e Variation)
- **Line 378**: `0.5` - Layer offset center adjustment
- **Line 378**: `0.2` - Pectoral fin layer offset multiplier
- **Line 391**: `0.2` - Pectoral fin offset (reused)
- **Line 405**: `0.15` - Dorsal fin layer offset
- **Line 427**: `0.2` - Ventral fin offset
- **Line 440**: `0.2` - Ventral fin offset (reused)
- **Line 546**: `0.4` - Tail layer offset
- **Line 849**: `0.3` - SVG shape layer offset
- **Line 918**: `0.3` - Body layer offset
- **Line 1020**: `0.2` - Spot layer offset
- **Line 1121**: `0.25` - Head layer offset

**Usage**: Creates soft edge effect in sumi-e style
**Reuse Count**: `0.2` appears 5x
**Priority**: SHOULD EXTRACT - Visual style consistency

### 3. GEOMETRY PARAMETERS (Mixed Priority)

Some already in koi-params.js, others hardcoded.

#### Body Geometry (ALREADY IN koi-params.js)
These are correctly extracted to configuration:
- `numSegments`, `bodyPeakPosition`, `bodyPeakWidth`, `bodyFrontWidth`
- `bodyTaperStart`, `bodyTaperStrength`, `bodyAsymmetry`
- All fin positions, angles, and offsets
- Head, eye, and tail parameters

**Status**: GOOD - Already extracted
**Location**: `/workspace/flocking/src/core/koi-params.js`

#### Hardcoded Geometry (SHOULD EXTRACT)
- **Line 176**: `0.5` - Sin curve power for width interpolation (`Math.PI * 0.5`)
- **Line 180**: `0.5` - Same power (reused)
- **Line 934**: `0.48` - Top body width multiplier
- **Line 941**: `0.48` - Bottom body width multiplier
- **Line 974**: `0.48` - Top multiplier (reused)
- **Line 982**: `0.48` - Bottom multiplier (reused)
- **Line 997**: `0.48` - Segment line multiplier
- **Line 934**: `0.15` - Asymmetry influence on top
- **Line 941**: `0.15` - Asymmetry influence on bottom
- **Line 974**: `0.15` - Asymmetry influence (reused)
- **Line 982**: `0.15` - Asymmetry influence (reused)

**Usage**: Body shape calculations
**Reuse Count**: `0.48` appears 5x, `0.15` appears 4x
**Priority**: SHOULD EXTRACT - Fundamental shape constants

#### Procedural Fin Geometry
- **Line 385**: `2.25` - Pectoral fin X offset
- **Line 385**: `4.5` - Pectoral fin width
- **Line 385**: `2` - Pectoral fin height
- **Line 398**: `2.25` - Pectoral X offset (reused)
- **Line 398**: `4.5` - Pectoral width (reused)
- **Line 398**: `2` - Pectoral height (reused)
- **Line 411**: `-0.2` - Dorsal fin rotation angle
- **Line 414-417**: Dorsal fin vertex coordinates (`-1`, `-2`, `1`, `-2.5`, `2`, `-1.5`)
- **Line 434**: `1.5` - Ventral fin X offset
- **Line 434**: `3` - Ventral fin width
- **Line 434**: `1.5` - Ventral fin height
- **Line 447**: `1.5` - Ventral X offset (reused)
- **Line 447**: `3` - Ventral width (reused)
- **Line 447**: `1.5` - Ventral height (reused)

**Usage**: Procedural (fallback) fin rendering
**Reuse Count**: Each fin dimension appears 2x (top/bottom fins)
**Priority**: CAN STAY - Fallback rendering, SVG is primary

#### Spot Rendering
- **Line 1013**: `0.8` - Spot height-to-width ratio
- **Line 1021**: `0.1` - Sumi-e spot size variation

**Usage**: `drawSpots` method
**Priority**: CAN STAY - Simple ratio, low priority

#### SVG Deformation
- **Line 489**: `1` - Tail wave continuation offset (body end = t=1)
- **Line 661**: `0` - Prevent division by zero check
- **Line 229**: `0` - Y sway amplitude (disabled for fins)
- **Line 230**: `0` - Y sway phase (disabled)

**Usage**: Wave deformation calculations
**Priority**: CAN STAY - Mathematical constants

### 4. SEGMENT LINE STYLING (Low Priority)

- **Line 993**: `0.3` - Segment line stroke weight
- **Line 994**: `0.4` - Segment line opacity

**Usage**: Body segment definition lines
**Priority**: CAN STAY - Minor visual detail

### 5. ARRAY INDICES AND LOOP COUNTERS

These are implementation details, not configuration:
- **Line 0**: Array index for head segment
- **Line 1**: Various mathematical constants
- Loop iterations (3 layers, etc.)

**Priority**: MUST STAY - Implementation logic

## Analysis: Reused vs. Unique Values

### Most Frequently Reused Values

| Value | Count | Purpose | Priority |
|-------|-------|---------|----------|
| `0.48` | 5 | Body width multiplier | SHOULD EXTRACT |
| `0.5` | 8+ | Layer offset center, wave values, opacity | MIXED - Context dependent |
| `0.2` | 8+ | Layer offsets, dampening | SHOULD EXTRACT (group by context) |
| `0.15` | 6 | Asymmetry influence, rotation amplitude | SHOULD EXTRACT |
| `3.5` | 2 | Wave phase gradient | MUST EXTRACT |
| `1.5` | 4+ | Wave amplitude, fin dimensions | MUST EXTRACT (animation) |
| `0.8` | 3 | Fin sway, spot ratio | SHOULD EXTRACT |
| `1.2` | 2+ | Rotation frequency | MUST EXTRACT |
| `8` | 3 | Fin saturation boost | SHOULD EXTRACT |
| `15` | 3 | Fin brightness reduction | SHOULD EXTRACT |
| `3` | 6+ | Layer count, tail amplitude | SHOULD EXTRACT |

### Unique Values (Used Once)

Many geometry-specific values are used only once:
- Dorsal fin vertices (`-1`, `-2`, `-2.5`, etc.)
- Specific opacity values for different body parts
- Phase offsets for specific animations
- Brush texture default opacity

**Assessment**: Unique values can often stay inline unless they represent design decisions that might be tweaked.

## Recommendations

### Proposed Configuration Structure

#### Option A: Create `animation-config.js` (RECOMMENDED)

Extract all animation-related magic numbers to a new file:

```javascript
// flocking/src/core/animation-config.js
export const ANIMATION_CONFIG = {
    // Body wave animation
    BODY_WAVE: {
        PHASE_GRADIENT: 3.5,      // Wave frequency (how quickly wave travels along body)
        AMPLITUDE: 1.5,           // Wave height
        DAMPENING: 0.2,           // Amplitude reduction toward tail (1 - t * DAMPENING)
        SEGMENT_START_X: 7,       // Front-most segment X
        SEGMENT_END_X: -9,        // Rear-most segment X
    },

    // Fin animation
    FIN_SWAY: {
        PHASE_OFFSET: 0.5,        // Phase offset from body wave
        AMPLITUDE: 0.8,           // Vertical sway amount
        ROTATION_FREQUENCY: 1.2,  // Rotation speed multiplier
    },

    FIN_ROTATION: {
        PECTORAL_AMPLITUDE: 0.15, // Rotation range for pectoral fins (radians)
        VENTRAL_AMPLITUDE: 0.1,   // Rotation range for ventral fins (radians)
    },

    // Dorsal fin wave following
    DORSAL_WAVE: {
        DAMPENING: 0.5,           // Reduce body wave amplitude for dorsal fin
        START_OFFSET: 1,          // Segments before dorsal position
        END_OFFSET: 2,            // Segments after dorsal position
    },

    // Tail animation
    TAIL: {
        SEGMENT_COUNT: 12,        // Segments for smooth wave interpolation
        SEGMENT_COUNT_PROCEDURAL: 6, // Segments for procedural tail
        LENGTH_UNITS: 6,          // Base tail length
        WAVE_CONTINUATION: 0.5,   // How far tail wave extends beyond body
        FLUTTER_PHASE_OFFSET: 2.5,
        FLUTTER_PHASE_GRADIENT: 2,
        FLUTTER_AMPLITUDE_SCALE: 3,
        FLUTTER_AMPLITUDE_START: 0.5,
    },
};
```

#### Option B: Extend `koi-params.js`

Add animation section to existing parameters:

```javascript
// Add to existing DEFAULT_SHAPE_PARAMS
export const DEFAULT_ANIMATION_PARAMS = {
    // ... same structure as Option A
};
```

#### Option C: Create `rendering-config.js`

Extract all rendering/visual style parameters:

```javascript
// flocking/src/core/rendering-config.js
export const RENDERING_CONFIG = {
    // Color mode
    HSB_RANGES: {
        HUE: 360,
        SATURATION: 100,
        BRIGHTNESS: 100,
    },

    // Color adjustments by body part
    COLOR_ADJUSTMENTS: {
        FINS: { saturation: 8, brightness: -15 },
        TAIL: { saturation: 5, brightness: -12 },
        BODY: { saturation: 0, brightness: -2 },
        HEAD: { saturation: 0, brightness: 2 },
        SEGMENT_LINES: { saturation: 10, brightness: -25 },
    },

    // Sumi-e style parameters
    SUMIE_STYLE: {
        BRUSH_TEXTURE_OPACITY: 0.3,

        LAYER_COUNTS: {
            FINS: 2,
            OTHER: 3,        // Body, tail, head, spots
            NORMAL: 1,       // Non-sumi-e
        },

        LAYER_OFFSETS: {
            PECTORAL_FIN: 0.2,
            DORSAL_FIN: 0.15,
            VENTRAL_FIN: 0.2,
            TAIL: 0.4,
            BODY: 0.3,
            HEAD: 0.25,
            SPOT: 0.2,
            SVG_SHAPE: 0.3,
        },

        LAYER_OPACITY: {
            CENTER_ADJUSTMENT: 0.5, // (layer - 0.5)

            FINS: { primary: 0.5, secondary: 0.25, normal: 0.7 },
            DORSAL: { primary: 0.6, secondary: 0.3, normal: 0.75 },
            TAIL: { primary: 0.7, secondary: 0.25 },
            BODY: { primary: 0.7, secondary: 0.3 },
            HEAD: { primary: 0.8, secondary: 0.3 },
            SPOTS: { primary: 0.75, secondary: 0.3 },
            SVG_SECONDARY: 0.4,
        },

        SIZE_VARIATION: {
            HEAD: 0.08,
            SPOT: 0.1,
        },
    },

    // Geometry constants
    GEOMETRY: {
        BODY_WIDTH_MULTIPLIER: 0.48,
        ASYMMETRY_INFLUENCE: 0.15,
        SPOT_HEIGHT_RATIO: 0.8,
        SEGMENT_LINE_WEIGHT: 0.3,
        SEGMENT_LINE_OPACITY: 0.4,
    },

    // Procedural fin geometry (fallback)
    PROCEDURAL_FINS: {
        PECTORAL: { xOffset: 2.25, width: 4.5, height: 2 },
        DORSAL: {
            rotation: -0.2,
            vertices: [
                { x: 0, y: 0 },
                { x: -1, y: -2 },
                { x: 1, y: -2.5 },
                { x: 2, y: -1.5 },
                { x: 2, y: 0 },
            ],
        },
        VENTRAL: { xOffset: 1.5, width: 3, height: 1.5 },
    },
};
```

### Priority Rankings

#### MUST EXTRACT (Immediate Priority)

1. **Body Wave Animation** (lines 166-167)
   - `PHASE_GRADIENT: 3.5`
   - `AMPLITUDE: 1.5`
   - `DAMPENING: 0.2`
   - `SEGMENT_START_X: 7`, `SEGMENT_END_X: -9`
   - **Reason**: Core animation, reused in tail, fundamental to swimming motion

2. **Fin Animation** (lines 267, 369, 227, 278, 291, 344, 357, 384, 397, 433, 446)
   - Sway phase offset, amplitude
   - Rotation frequency, amplitudes
   - **Reason**: Reused 2-4 times, controls visual quality

3. **Tail Animation** (lines 480, 486, 489, 526, 536)
   - Segment counts, flutter parameters
   - **Reason**: Complex formulas that should be documented

#### SHOULD EXTRACT (High Priority)

4. **Color Adjustments** (lines 237-238, 328-329, 381, 505-506, 568, 901, 956, 994, 1066, 1125)
   - Saturation/brightness boosts per body part
   - **Reason**: Reused 2-3x each, defines color theme

5. **Sumi-e Opacity Values** (lines 370, 379, 392, 406, 428, 850, 919, 1022, 1123)
   - Layer opacities for each body part
   - **Reason**: Defines artistic style, would benefit from grouped config

6. **Sumi-e Layer Offsets** (lines 378, 391, 405, 427, 440, 546, 849, 918, 1020, 1121)
   - Positional variation per layer
   - **Reason**: `0.2` reused 5x, defines brush stroke aesthetic

7. **Body Geometry Constants** (lines 934, 941, 974, 982, 997)
   - `BODY_WIDTH_MULTIPLIER: 0.48` (appears 5x)
   - `ASYMMETRY_INFLUENCE: 0.15` (appears 4x)
   - **Reason**: Fundamental shape constants, highly reused

8. **Dorsal Wave Dampening** (line 303)
   - `WAVE_DAMPENING: 0.5`
   - **Reason**: Visual quality control

#### CAN STAY (Low Priority)

9. **Layer Counts** (lines 371, 545, 848, 917, 1019, 1120)
   - Number of sumi-e layers
   - **Reason**: Could extract for consistency, but low impact

10. **Procedural Fin Geometry** (lines 385, 398, 411, 414-417, 434, 447)
    - Fallback rendering dimensions
    - **Reason**: SVG is primary, procedural is backup

11. **Spot Geometry** (line 1013)
    - Height ratio
    - **Reason**: Simple constant, rarely changed

12. **Segment Lines** (lines 993-994)
    - Stroke weight and opacity
    - **Reason**: Minor visual detail

#### MUST STAY (Not Configurable)

13. **Mathematical Constants**
    - `Math.PI`, division checks, array indices
    - **Reason**: Implementation logic, not design parameters

14. **HSB Color Ranges** (line 116)
    - `360, 100, 100`
    - **Reason**: Standard HSB color space definition

## Code References

Key files analyzed:
- `/workspace/flocking/src/core/koi-renderer.js` - Main rendering logic with all magic numbers
- `/workspace/flocking/src/core/koi-params.js` - Existing shape parameters (already well-structured)
- `/workspace/flocking/src/flocking/physics-config.js` - Example of good configuration extraction

## Current Configuration Status

### What's Already Extracted (GOOD)

`koi-params.js` already contains:
- Body structure parameters (segments, widths, taper, asymmetry)
- Head dimensions and eye positions
- Tail start position and dimensions
- All fin positions, angles, and Y offsets

This is excellent organization and should be the model for additional config files.

### What's Still Hardcoded (NEEDS WORK)

1. **Animation timing and motion** - All in koi-renderer.js
2. **Rendering style** - Opacity, layers, color adjustments scattered throughout
3. **Geometry calculations** - Body width multipliers, asymmetry influence
4. **Sumi-e artistic style** - Layer counts, offsets, opacity variations

## Proposed Implementation Plan

### Phase 1: Animation Config (Highest ROI)
Create `animation-config.js` with body wave, fin motion, and tail flutter parameters. These are the most reused and impact visual quality the most.

**Impact**: Makes animation tuning accessible without code diving
**Files to create**: 1 new file
**Files to modify**: `koi-renderer.js` (import and replace ~25 magic numbers)

### Phase 2: Rendering Config
Create `rendering-config.js` with color adjustments, opacity values, and sumi-e style parameters.

**Impact**: Centralizes artistic style decisions
**Files to create**: 1 new file
**Files to modify**: `koi-renderer.js` (replace ~40 magic numbers)

### Phase 3: Geometry Constants
Add hardcoded geometry values to `koi-params.js` (body width multiplier, asymmetry influence).

**Impact**: Completes the separation of shape from rendering
**Files to create**: 0 (extend existing)
**Files to modify**: `koi-params.js`, `koi-renderer.js`

### Phase 4: Procedural Fallbacks (Optional)
Extract procedural fin geometry if needed for easier maintenance of fallback rendering.

**Impact**: Low - SVG is primary rendering method
**Priority**: Low

## Related Research

This research connects to:
- SVG rendering system (uses these animation parameters for deformation)
- Sumi-e artistic style implementation
- Physics simulation (different config file, but similar pattern)

## Open Questions

1. Should animation config be per-koi or global?
   - Current assessment: Global is fine, per-koi would add complexity without clear benefit

2. Should sumi-e parameters be toggleable presets vs. individual settings?
   - Could have `SUMIE_PRESETS = { traditional: {...}, light: {...}, heavy: {...} }`

3. Where should procedural fallback geometry live?
   - Option A: In `koi-params.js` with other geometry
   - Option B: In `rendering-config.js` as rendering implementation detail
   - Option C: Leave inline as it's rarely used

4. Should color adjustments be HSB deltas or absolute colors?
   - Current: HSB deltas (e.g., `saturation + 8`)
   - Alternative: Could be color roles (e.g., `FIN_COLOR`, `BODY_COLOR`)
   - Assessment: Deltas are more flexible for dynamic coloring

## Conclusion

The koi rendering code contains 60+ magic numbers that should be organized into 2-3 configuration files:

1. **Animation Config** (25 values) - MUST EXTRACT
2. **Rendering Config** (40 values) - SHOULD EXTRACT
3. **Geometry additions to koi-params.js** (5 values) - SHOULD EXTRACT

This extraction will make the system more maintainable, documentable, and tunable without requiring deep code knowledge. The pattern established by `physics-config.js` and `koi-params.js` should be followed.

**Estimated Impact**: 70% of magic numbers should be extracted, leaving only mathematical constants and implementation details inline.
