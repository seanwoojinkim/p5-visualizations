/**
 * Editor App
 * Shape editor application
 * Allows interactive editing of koi shape parameters
 */

import { KoiRenderer } from '../core/koi-renderer.js';
import { DEFAULT_SHAPE_PARAMS, copyParams } from '../core/koi-params.js';
import { EditorControls } from '../ui/editor-controls.js';
import { VARIETIES, generatePattern } from '../core/koi-varieties.js';

// Global state
let renderer;
let controls;
let params;
let centerX, centerY;
let controlPoints = [];
let draggingPoint = null;

// Variety selection
let currentVarietyIndex = 0;
let currentVariety = VARIETIES[0];
let currentPattern = null;

const sizeScale = 15;

// p5.js setup function
window.setup = function() {
    let canvas = createCanvas(800, 600);
    canvas.parent('canvasContainer');

    centerX = width / 2;
    centerY = height / 2;

    // Initialize renderer
    renderer = new KoiRenderer();

    // Initialize parameters
    params = copyParams(DEFAULT_SHAPE_PARAMS);

    // Initialize controls
    controls = new EditorControls(params, () => {
        // Parameter changed, no additional action needed
    });

    // Set up variety controls
    setupVarietyControls();

    // Initialize with first variety
    updateVariety(0);

    // Initial output update
    controls.updateOutput();
};

// Set up variety selection controls
function setupVarietyControls() {
    // Previous variety button
    document.getElementById('prevVariety').addEventListener('click', () => {
        currentVarietyIndex = (currentVarietyIndex - 1 + VARIETIES.length) % VARIETIES.length;
        updateVariety(currentVarietyIndex);
    });

    // Next variety button
    document.getElementById('nextVariety').addEventListener('click', () => {
        currentVarietyIndex = (currentVarietyIndex + 1) % VARIETIES.length;
        updateVariety(currentVarietyIndex);
    });

    // Regenerate pattern button
    document.getElementById('regeneratePattern').addEventListener('click', () => {
        regeneratePattern();
    });
}

// Update to a new variety
function updateVariety(index) {
    currentVarietyIndex = index;
    currentVariety = VARIETIES[index];
    regeneratePattern();
    updateVarietyDisplay();
}

// Regenerate the pattern for the current variety
function regeneratePattern() {
    currentPattern = generatePattern(currentVariety, random, floor);
}

// Update variety name display
function updateVarietyDisplay() {
    const displayName = currentVariety.name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    document.getElementById('varietyName').textContent = displayName;
    document.getElementById('varietyIndex').textContent =
        `${currentVarietyIndex + 1} / ${VARIETIES.length}`;
}

// p5.js draw function
window.draw = function() {
    background(10, 20, 15);

    push();
    translate(centerX, centerY);

    // Calculate segment positions for control points
    const waveTime = frameCount * 0.05;
    const segmentPositions = calculateSegments(params.numSegments, waveTime);

    // Render the koi with current variety and pattern
    renderer.render(
        window,  // Draw directly to main canvas
        0,
        0,
        0,
        {
            shapeParams: params,
            colorParams: currentPattern ? currentPattern.baseColor : { h: 0, s: 0, b: 90 },
            pattern: currentPattern || { spots: [] },
            animationParams: {
                waveTime,
                sizeScale,
                lengthMultiplier: 1,
                tailLength: 1
            },
            modifiers: {
                brightnessBoost: 0,
                saturationBoost: 0,
                sizeScale: 1
            }
        }
    );

    // Update and draw control points
    updateControlPoints(segmentPositions);
    for (let cp of controlPoints) {
        fill(cp.color);
        if (cp === draggingPoint) {
            stroke(255, 255, 0);
            strokeWeight(2);
        } else {
            noStroke();
        }
        ellipse(cp.x, cp.y, 10, 10);
    }

    pop();
};

// Calculate segment positions (simplified version for control points)
function calculateSegments(numSegments, waveTime) {
    const segments = [];
    for (let i = 0; i < numSegments; i++) {
        const t = i / numSegments;
        const x = lerp(7, -9, t) * sizeScale;
        const y = sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);

        let baseWidth = lerp(5, 7, sin(t * PI));
        if (t > 0.6) {
            const tailT = (t - 0.6) / 0.4;
            baseWidth = baseWidth * (1 - tailT * 0.9);
        }

        const segmentWidth = baseWidth * sizeScale;
        segments.push({ x, y, w: segmentWidth });
    }
    return segments;
}

// Update control point positions
function updateControlPoints(segmentPositions) {
    controlPoints = [];

    const headSeg = segmentPositions[0];

    // Head position
    controlPoints.push({
        x: headSeg.x + params.headX * sizeScale,
        y: headSeg.y,
        color: color(100, 200, 255),
        param: 'headX',
        label: 'Head X'
    });

    // Dorsal fin
    const dorsalPos = segmentPositions[params.dorsalPos];
    controlPoints.push({
        x: dorsalPos.x,
        y: dorsalPos.y + params.dorsalY * sizeScale,
        color: color(255, 150, 100),
        param: 'dorsalY',
        label: 'Dorsal Y'
    });

    // Pectoral fins
    const pectoralPos = segmentPositions[params.pectoralPos];
    controlPoints.push({
        x: pectoralPos.x,
        y: pectoralPos.y + params.pectoralYTop * sizeScale,
        color: color(255, 200, 100),
        param: 'pectoralYTop',
        label: 'Pectoral Top Y'
    });
    controlPoints.push({
        x: pectoralPos.x,
        y: pectoralPos.y + params.pectoralYBottom * sizeScale,
        color: color(255, 220, 120),
        param: 'pectoralYBottom',
        label: 'Pectoral Bottom Y'
    });

    // Ventral fins
    const ventralPos = segmentPositions[params.ventralPos];
    controlPoints.push({
        x: ventralPos.x,
        y: ventralPos.y + params.ventralYTop * sizeScale,
        color: color(200, 150, 255),
        param: 'ventralYTop',
        label: 'Ventral Top Y'
    });
    controlPoints.push({
        x: ventralPos.x,
        y: ventralPos.y + params.ventralYBottom * sizeScale,
        color: color(220, 170, 255),
        param: 'ventralYBottom',
        label: 'Ventral Bottom Y'
    });

    // Tail start
    const tailBase = segmentPositions[params.numSegments - 1];
    controlPoints.push({
        x: tailBase.x + params.tailStartX * sizeScale,
        y: tailBase.y,
        color: color(150, 255, 150),
        param: 'tailStartX',
        label: 'Tail Start'
    });
}

// Mouse interaction
window.mousePressed = function() {
    for (let cp of controlPoints) {
        const d = dist(mouseX - centerX, mouseY - centerY, cp.x, cp.y);
        if (d < 10) {
            draggingPoint = cp;
            return;
        }
    }
};

window.mouseDragged = function() {
    if (draggingPoint) {
        const localX = mouseX - centerX;
        const localY = mouseY - centerY;

        if (draggingPoint.param === 'headX') {
            params.headX = localX / sizeScale;
        } else if (draggingPoint.param === 'dorsalY') {
            params.dorsalY = localY / sizeScale;
        } else if (draggingPoint.param === 'pectoralYTop') {
            params.pectoralYTop = localY / sizeScale;
        } else if (draggingPoint.param === 'pectoralYBottom') {
            params.pectoralYBottom = localY / sizeScale;
        } else if (draggingPoint.param === 'ventralYTop') {
            params.ventralYTop = localY / sizeScale;
        } else if (draggingPoint.param === 'ventralYBottom') {
            params.ventralYBottom = localY / sizeScale;
        } else if (draggingPoint.param === 'tailStartX') {
            params.tailStartX = (localX - (-9 * sizeScale)) / sizeScale;
        }

        // Update input field and output
        controls.updateInputValue(draggingPoint.param, params[draggingPoint.param]);
        controls.updateOutput();
    }
};

window.mouseReleased = function() {
    draggingPoint = null;
};
