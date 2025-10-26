---
doc_type: research
date: 2025-10-26T16:04:36+00:00
title: "Koi Editor Current State and Issues Analysis"
research_question: "What is the current state of the koi-editor and what issues need to be fixed?"
researcher: Claude

git_commit: f13984e2560e55d7e6530daf1e129c38ead79414
branch: main
repository: workspace

created_by: Claude
last_updated: 2025-10-26
last_updated_by: Claude

tags:
  - koi-editor
  - bugs
  - parameters
  - ui-controls
status: complete

related_docs: []
---

# Research: Koi Editor Current State and Issues Analysis

**Date**: 2025-10-26 16:04:44 UTC
**Researcher**: Claude
**Git Commit**: f13984e2560e55d7e6530daf1e129c38ead79414
**Branch**: main
**Repository**: workspace

## Research Question
What is the current state of the koi-editor and what issues need to be fixed? Specifically:
1. Why aren't control points scaling with the koi?
2. How to make the collapsible menu always visible?
3. What parameters are obsolete or missing?
4. What's the disconnect between editor and renderer?

## Summary

The koi-editor (`flocking/koi-editor.html` and `flocking/src/apps/editor-app.js`) is a shape editor for interactively adjusting koi parameters with visual control points. Four specific issues have been identified with exact code locations and solutions:

1. **Control points use hardcoded sizes** instead of scaling with `displayScale`
2. **Collapsible menu starts minimized** and has toggle behavior
3. **No obsolete parameters**, but several new renderer features are missing from the editor
4. **Editor and renderer are in sync** for existing parameters, but renderer has hardcoded values for newer features

All issues have been located with exact file paths and line numbers, with specific code changes documented below.

## Detailed Findings

### Issue 1: Control Point Scaling

**Problem**: Control points are drawn with hardcoded size 10x10 pixels and don't scale with the koi.

**Root Cause**: The control point drawing code uses a hardcoded ellipse size instead of multiplying by `displayScale`.

**Code Location**: `flocking/src/apps/editor-app.js:245-254`

```javascript
// Current code (BROKEN)
for (let cp of controlPoints) {
    fill(cp.color);
    if (cp === draggingPoint) {
        stroke(255, 255, 0);
        strokeWeight(2);
    } else {
        noStroke();
    }
    ellipse(cp.x, cp.y, 10, 10); // LINE 253 - HARDCODED SIZE
}
```

**Additional Issue**: Mouse hit detection also uses hardcoded size at line 352:

```javascript
// Current code (BROKEN)
const d = dist(mouseX - centerX, mouseY - centerY, cp.x, cp.y);
if (d < 10) { // LINE 353 - HARDCODED HIT RADIUS
```

**Scale Factor**: The `displayScale` constant is defined at line 38:
```javascript
const displayScale = 15; // Display scale for canvas
```

**Solution**:

1. Change line 253 to scale the control point size:
```javascript
ellipse(cp.x, cp.y, 10 / displayScale, 10 / displayScale);
```

2. Change line 353 to scale the hit detection radius:
```javascript
if (d < 10 / displayScale) {
```

**Explanation**: Control points are drawn in the scaled coordinate space (after `scale(displayScale)` is applied at line 205). To maintain a constant screen size of ~10 pixels, we must divide by the display scale. This way, when the coordinate system is scaled up by 15x, the 10/15 = 0.67 unit circle becomes 10 pixels on screen.

### Issue 2: Collapsible Menu Always Visible

**Problem**: The control panel starts minimized and has a toggle button that collapses it.

**HTML Structure**: `flocking/koi-editor.html:109-110`

```html
<div id="controls" class="minimized">
    <button id="toggleControls">▶</button>
```

The panel has `class="minimized"` by default.

**CSS Rules**: Lines 33-43

```css
#controls.minimized {
    max-width: 80px;
    padding: 10px;
}
#controls.minimized h2,
#controls.minimized p,
#controls.minimized h3,
#controls.minimized .section,
#controls.minimized #output {
    display: none;
}
```

**JavaScript Toggle**: `flocking/src/apps/editor-app.js:145-153`

```javascript
function setupToggleControls() {
    const controlsPanel = document.getElementById('controls');
    const toggleButton = document.getElementById('toggleControls');

    toggleButton.addEventListener('click', () => {
        controlsPanel.classList.toggle('minimized');
        toggleButton.textContent = controlsPanel.classList.contains('minimized') ? '▶' : '◀';
    });
}
```

**Solution Options**:

**Option A - Remove minimized state entirely**:
1. Remove `class="minimized"` from line 109 in `koi-editor.html`
2. Remove the toggle button (line 110 in HTML)
3. Remove or comment out the `setupToggleControls()` function call (line 135 in editor-app.js)
4. Remove the CSS rules for `.minimized` state (lines 33-43 in HTML)

**Option B - Start expanded but keep toggle functionality**:
1. Only remove `class="minimized"` from line 109 in `koi-editor.html`
2. Keep all other code
3. Panel starts visible, user can still minimize if desired

**Recommendation**: Option B provides the best user experience - panel is visible by default but users can still collapse it if needed.

**Exact Changes for Option B**:
In `flocking/koi-editor.html` line 109, change:
```html
<div id="controls" class="minimized">
```
to:
```html
<div id="controls">
```

And change the toggle button initial text at line 110 from:
```html
<button id="toggleControls">▶</button>
```
to:
```html
<button id="toggleControls">◀</button>
```

### Issue 3: Parameter Audit

**Editor Parameters** (from `flocking/src/ui/editor-controls.js:14-23`):

```javascript
const inputs = [
    'numSegments', 'bodyWidth', 'bodyHeight',
    'bodyTaperStart', 'bodyTaperStrength', 'bodyPeakPosition', 'bodyPeakWidth', 'bodyFrontWidth', 'bodyAsymmetry',
    'headX', 'headWidth', 'headHeight',
    'eyeX', 'eyeYTop', 'eyeYBottom', 'eyeSize',
    'tailStartX', 'tailWidthStart', 'tailWidthEnd', 'tailSplit',
    'dorsalPos', 'dorsalY',
    'pectoralPos', 'pectoralYTop', 'pectoralAngleTop', 'pectoralYBottom', 'pectoralAngleBottom',
    'ventralPos', 'ventralYTop', 'ventralAngleTop', 'ventralYBottom', 'ventralAngleBottom'
];
```

**Renderer Parameters** (from `flocking/src/core/koi-params.js:6-52`):

All 30 editor parameters exist in `DEFAULT_SHAPE_PARAMS` and are actively used by the renderer.

**Verdict on Obsolete Parameters**: **NONE**. All parameters shown in the editor are used by the renderer.

**Missing Parameters** (hardcoded in renderer but not exposed in editor):

1. **waveDampening** (`koi-renderer.js:303`) - Hardcoded as `0.5`
   - Controls how much the dorsal fin follows body wave motion
   - Current: `const waveDampening = 0.5; // Reduce wave amplitude to 30%`
   - Should be: Exposed as parameter with range 0-1

2. **numTailSegments** (`koi-renderer.js:480`) - Hardcoded as `12`
   - Controls smoothness of tail wave interpolation
   - Current: `const numTailSegments = 12; // Increased for smoother wave interpolation`
   - Should be: Exposed as parameter with range 6-20

3. **Fin rotation amplitudes** (hardcoded at multiple locations):
   - Pectoral fin: `0.15` radians (lines 278, 291)
   - Ventral fin: `0.1` radians (lines 344, 357)
   - Should be: Exposed as parameters for fine-tuning fin animation

4. **Flutter parameters** (`koi-renderer.js:644-653`) - All hardcoded:
   ```javascript
   phaseOffset = -2.5,
   phaseGradient = -2,
   amplitudeStart = 0.5,
   amplitudeEnd = 1.0,
   amplitudeScale = 3
   ```
   - Control tail flutter animation characteristics
   - Should be: Exposed for artistic control over tail motion

5. **Sumi-e style toggle** - Not controllable in editor
   - Renderer supports both normal and sumi-e rendering styles
   - Should be: Toggle in editor UI

**New Parameters to Add**:

High Priority:
- `dorsalWaveDampening` (0-1, default: 0.5) - Dorsal fin wave follow
- `tailSegments` (6-20, default: 12) - Tail smoothness

Medium Priority:
- `pectoralRotationAmplitude` (0-0.5, default: 0.15) - Pectoral fin sway
- `ventralRotationAmplitude` (0-0.5, default: 0.1) - Ventral fin sway

Low Priority:
- Tail flutter parameters (advanced users only)
- Sumi-e style toggle (rendering preference)

### Issue 4: Editor vs Renderer Disconnect

**Analysis**: The editor and renderer are well-synchronized for shape parameters. All 30 parameters in the editor UI directly correspond to fields in `DEFAULT_SHAPE_PARAMS` used by the renderer.

**Synchronization Points**:

1. **Parameter Definition**: `koi-params.js:6-52`
2. **Editor Inputs**: `editor-controls.js:14-23`
3. **Editor HTML**: `koi-editor.html:129-269`
4. **Renderer Usage**: `koi-renderer.js` throughout

**Disconnects Found**:

1. **New rendering features** (SVG rendering, wave dampening, etc.) were added to the renderer but not exposed in the editor
2. **Animation parameters** (`waveTime`, `sizeScale`, etc.) are calculated at runtime in editor-app.js but not exposed as tunable values
3. **Rendering styles** (sumi-e vs normal) are not selectable in the editor

**Root Cause**: The renderer (`koi-renderer.js`) was recently enhanced with SVG rendering and advanced animation features (commits `24939bb` and `f13984e`), but the editor UI was not updated to expose these new capabilities.

**Evidence from Git History**:
```
f13984e tails are in a place
24939bb research and beginning of svg rendering enginer
```

**No True Disconnect**: Parameters shown in editor ARE used by renderer. The issue is that the renderer has gained new capabilities that aren't yet exposed in the editor interface.

## Code References

- `flocking/src/apps/editor-app.js:253` - Control point drawing (needs scaling)
- `flocking/src/apps/editor-app.js:352` - Mouse hit detection (needs scaling)
- `flocking/src/apps/editor-app.js:38` - displayScale constant definition
- `flocking/src/apps/editor-app.js:145-153` - Toggle control setup
- `flocking/koi-editor.html:109` - Controls panel with minimized class
- `flocking/koi-editor.html:110` - Toggle button
- `flocking/koi-editor.html:33-43` - CSS minimized state rules
- `flocking/src/ui/editor-controls.js:14-23` - Parameter list
- `flocking/src/core/koi-params.js:6-52` - DEFAULT_SHAPE_PARAMS
- `flocking/src/core/koi-renderer.js:303` - waveDampening hardcoded
- `flocking/src/core/koi-renderer.js:480` - numTailSegments hardcoded
- `flocking/src/core/koi-renderer.js:278,291,344,357` - Fin rotation amplitudes
- `flocking/src/core/koi-renderer.js:644-653` - Flutter parameters

## Architecture Documentation

### Editor Architecture

The koi-editor consists of three main components:

1. **HTML Structure** (`koi-editor.html`)
   - Canvas container for p5.js rendering
   - Control panel with parameter inputs
   - Variety selection controls
   - Toggle button for minimize/expand

2. **Editor Application** (`editor-app.js`)
   - p5.js setup and draw loop
   - Control point management and interaction
   - Variety switching and pattern regeneration
   - SVG loading via preload

3. **Editor Controls** (`editor-controls.js`)
   - Input field management
   - Parameter synchronization
   - Output display and clipboard copy

### Control Point System

Control points are visual handles that allow dragging to adjust parameters:

- Created in `updateControlPoints()` (line 280)
- Each point has: position (x, y), color, parameter name, label
- Drawn in the draw loop (line 245-254)
- Mouse interaction: mousePressed (line 350), mouseDragged (line 360), mouseReleased (line 387)

### Coordinate System

The editor uses two coordinate systems:

1. **Canvas coordinates**: 800x600 pixels (line 114)
2. **Koi coordinates**: Scaled by `displayScale = 15` (line 38)

Transform applied at line 205:
```javascript
scale(displayScale); // Scale up for display
```

All koi and control point rendering happens in the scaled coordinate space.

### Parameter Flow

1. User adjusts input field or drags control point
2. `EditorControls` updates `params` object
3. `editor-app.js` uses updated params in next draw() call
4. `KoiRenderer.render()` receives params and draws koi
5. Control points are recalculated based on params

## Summary of Fixes

### Fix 1: Control Point Scaling
**File**: `flocking/src/apps/editor-app.js`
**Lines to change**: 253, 353

Line 253 (drawing):
```javascript
// Before:
ellipse(cp.x, cp.y, 10, 10);

// After:
ellipse(cp.x, cp.y, 10 / displayScale, 10 / displayScale);
```

Line 353 (hit detection):
```javascript
// Before:
if (d < 10) {

// After:
if (d < 10 / displayScale) {
```

### Fix 2: Make Menu Always Visible
**File**: `flocking/koi-editor.html`
**Lines to change**: 109, 110

Line 109:
```html
<!-- Before: -->
<div id="controls" class="minimized">

<!-- After: -->
<div id="controls">
```

Line 110:
```html
<!-- Before: -->
<button id="toggleControls">▶</button>

<!-- After: -->
<button id="toggleControls">◀</button>
```

### Fix 3: Add Missing Parameters

**Step 1**: Add to `koi-params.js` DEFAULT_SHAPE_PARAMS (after line 51):
```javascript
// Fin animation
pectoralRotationAmplitude: 0.15,
ventralRotationAmplitude: 0.1,

// Tail animation
tailSegments: 12,
tailFlutterPhase: -2.5,
tailFlutterGradient: -2,
tailFlutterStart: 0.5,
tailFlutterEnd: 1.0,
tailFlutterScale: 3,

// Dorsal fin wave follow
dorsalWaveDampening: 0.5
```

**Step 2**: Add to `koi-params.js` PARAMETER_RANGES (after line 92):
```javascript
pectoralRotationAmplitude: { min: 0, max: 0.5, step: 0.01, label: 'Pectoral Fin Sway' },
ventralRotationAmplitude: { min: 0, max: 0.5, step: 0.01, label: 'Ventral Fin Sway' },
tailSegments: { min: 6, max: 20, step: 1, label: 'Tail Segments' },
dorsalWaveDampening: { min: 0, max: 1, step: 0.05, label: 'Dorsal Wave Dampening' }
```

**Step 3**: Add inputs to `koi-editor.html` (in Fins section, after line 268):
```html
<div class="param">
    <label>Pectoral Fin Sway Amplitude</label>
    <input type="number" id="pectoralRotationAmplitude" value="0.15" step="0.01">
</div>
<div class="param">
    <label>Ventral Fin Sway Amplitude</label>
    <input type="number" id="ventralRotationAmplitude" value="0.1" step="0.01">
</div>
```

Add new section after Fins (after line 269):
```html
<div class="section">
    <h3 style="font-size: 12px; color: #6ac0ff;">Animation</h3>
    <div class="param">
        <label>Dorsal Wave Dampening (0-1)</label>
        <input type="number" id="dorsalWaveDampening" value="0.5" step="0.05" min="0" max="1">
    </div>
    <div class="param">
        <label>Tail Segments</label>
        <input type="number" id="tailSegments" value="12" min="6" max="20">
    </div>
</div>
```

**Step 4**: Add to `editor-controls.js` inputs array (after line 22):
```javascript
'pectoralRotationAmplitude', 'ventralRotationAmplitude',
'tailSegments', 'dorsalWaveDampening'
```

**Step 5**: Update renderer to use parameters instead of hardcoded values:

In `koi-renderer.js` line 278:
```javascript
// Before:
0.15, // rotationAmplitude

// After:
shapeParams.pectoralRotationAmplitude || 0.15,
```

In `koi-renderer.js` line 303:
```javascript
// Before:
const waveDampening = 0.5;

// After:
const waveDampening = shapeParams.dorsalWaveDampening || 0.5;
```

In `koi-renderer.js` line 480:
```javascript
// Before:
const numTailSegments = 12;

// After:
const numTailSegments = shapeParams.tailSegments || 12;
```

## Open Questions

1. Should the flutter parameters be exposed in the editor? They're quite technical and most users may not need them.

2. Should there be a "Reset to Defaults" button for each section?

3. Should the editor support saving/loading parameter presets?

4. Should the sumi-e rendering style be toggleable in the editor? Currently it's only available in the main simulation.

5. Should control point colors be customizable, or should they remain color-coded by function?
