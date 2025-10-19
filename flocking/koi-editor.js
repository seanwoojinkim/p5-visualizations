let sizeScale = 15;
let centerX, centerY;
let controlPoints = [];

// Koi parameters
let params = {
    numSegments: 10,
    bodyWidth: 2.4,
    bodyHeight: 0.95,
    headX: -0.4,
    headWidth: 7,
    headHeight: 5.5,
    tailStartX: -1,
    tailWidthStart: 0.2,
    tailWidthEnd: 1.5,
    tailSplit: 0.5,
    dorsalPos: 4,
    dorsalY: -0.5,
    pectoralPos: 2,
    pectoralYTop: -2,
    pectoralAngleTop: -2.5,
    pectoralYBottom: 2,
    pectoralAngleBottom: 2.1,
    ventralPos: 7,
    ventralYTop: -1,
    ventralAngleTop: -2.5,
    ventralYBottom: 1,
    ventralAngleBottom: 2.5
};

let draggingPoint = null;

function setup() {
    let canvas = createCanvas(800, 600);
    canvas.parent('canvasContainer');

    centerX = width / 2;
    centerY = height / 2;

    // Set up input listeners
    setupInputs();

    // Initial update
    updateOutput();
}

function draw() {
    background(10, 20, 15);

    push();
    translate(centerX, centerY);

    // Draw the koi
    drawKoi();

    // Draw control points
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
}

function drawKoi() {
    let waveTime = frameCount * 0.05;

    // Body segments
    let numSegments = params.numSegments;
    let segmentPositions = [];

    for (let i = 0; i < numSegments; i++) {
        let t = i / numSegments;
        let x = lerp(7, -9, t) * sizeScale;
        let y = sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);
        // Smooth curve with gradual taper to tail
        // Sine curve for smooth middle, then extra taper at the end
        // Reduced peak width from 7 to 6.2 to avoid jutting
        let baseWidth = lerp(5, 7, sin(t * PI));

        // Add additional taper for the tail section (last 40%)
        if (t > 0.6) {
            let tailT = (t - 0.6) / 0.4; // 0 to 1 over the tail section
            // Smoothly reduce to a point
            baseWidth = baseWidth * (1 - tailT * 0.9);
        }

        let segmentWidth = baseWidth * sizeScale;
        segmentPositions.push({ x, y, w: segmentWidth });
    }

    // Draw body outline
    fill(200, 200, 220, 230);
    beginShape();

    // Start with head point and add as duplicate for curve control
    let headSeg = segmentPositions[0];
    let headPt = { x: headSeg.x + params.headX * sizeScale, y: headSeg.y };
    curveVertex(headPt.x, headPt.y);

    // Head point (actual)
    curveVertex(headPt.x, headPt.y);

    // Top edge from front to back
    for (let i = 0; i < numSegments; i++) {
        let seg = segmentPositions[i];
        curveVertex(seg.x, seg.y - seg.w * 0.48);
    }

    // Bottom edge from back to front
    for (let i = numSegments - 1; i >= 0; i--) {
        let seg = segmentPositions[i];
        curveVertex(seg.x, seg.y + seg.w * 0.48);
    }

    // Close back to head point and add duplicate for smooth curve
    curveVertex(headPt.x, headPt.y);
    curveVertex(headPt.x, headPt.y);

    endShape(CLOSE);

    // Segment lines
    strokeWeight(0.3);
    stroke(150, 150, 180, 100);
    for (let i = 1; i < numSegments - 1; i++) {
        let seg = segmentPositions[i];
        let topY = seg.y - seg.w * 0.48;
        let bottomY = seg.y + seg.w * 0.48;
        line(seg.x, topY, seg.x, bottomY);
    }
    noStroke();

    // Head
    fill(220, 220, 240);
    ellipse(headSeg.x + params.headX * sizeScale, headSeg.y,
            params.headWidth * sizeScale, params.headHeight * sizeScale);

    // Eye
    fill(20);
    ellipse(headSeg.x + 2.5 * sizeScale, headSeg.y - 1 * sizeScale,
            1.2 * sizeScale, 1.2 * sizeScale);

    // Draw tail
    drawTail(segmentPositions, waveTime);

    // Draw fins
    drawFins(segmentPositions, waveTime);

    // Update control points
    updateControlPoints(segmentPositions);
}

function drawTail(segmentPositions, waveTime) {
    let tailBase = segmentPositions[params.numSegments - 1];
    let tailStartX = tailBase.x + params.tailStartX * sizeScale;
    let tailLength = 10 * sizeScale;
    let tailSegments = 6;

    // Tail should start at the width of the last body segment
    let tailSplitWidth = tailBase.w * 0.48;

    // Single unified tail - top-down view
    fill(180, 180, 200, 200);
    beginShape();

    // Calculate all points first
    let topPoints = [];
    let bottomPoints = [];

    for (let i = 0; i <= tailSegments; i++) {
        let t = i / tailSegments;
        let x = tailStartX - (t * tailLength);
        let tailSway = sin(waveTime - 2.5 - t * 2) * 3 * sizeScale * (0.5 + t * 0.5);
        let width = lerp(params.tailWidthStart, params.tailWidthEnd, t) * sizeScale;

        topPoints.push({ x: x, y: tailBase.y - width + tailSway });
        bottomPoints.push({ x: x, y: tailBase.y + width + tailSway });
    }

    // Start with duplicate for curve
    curveVertex(topPoints[0].x, topPoints[0].y);

    // Top edge
    for (let pt of topPoints) {
        curveVertex(pt.x, pt.y);
    }

    // Bottom edge (reversed)
    for (let i = bottomPoints.length - 1; i >= 0; i--) {
        curveVertex(bottomPoints[i].x, bottomPoints[i].y);
    }

    // End with duplicate for curve
    curveVertex(bottomPoints[0].x, bottomPoints[0].y);

    endShape(CLOSE);
}

function drawFins(segmentPositions, waveTime) {
    let finSway = sin(waveTime - 0.5) * 0.8;

    // Dorsal fin - pivot from base
    let dorsalPos = segmentPositions[params.dorsalPos];
    fill(170, 170, 190, 200);
    push();
    translate(dorsalPos.x, dorsalPos.y + params.dorsalY * sizeScale);
    beginShape();
    vertex(0, 0);
    vertex(-1 * sizeScale, -2 * sizeScale);
    vertex(1 * sizeScale, -2.5 * sizeScale);
    vertex(2 * sizeScale, -1.5 * sizeScale);
    vertex(2 * sizeScale, 0);
    endShape(CLOSE);
    pop();

    // Pectoral fins (left and right) - pivot from tip
    let finPos = segmentPositions[params.pectoralPos];

    // Top pectoral fin (left) - pivot at tip, points outward
    push();
    translate(finPos.x, finPos.y + params.pectoralYTop * sizeScale + finSway);
    rotate(params.pectoralAngleTop + sin(waveTime * 1.2) * 0.15);
    // Ellipse positioned so (0,0) is at the tip touching the body
    ellipse(2.25 * sizeScale, 0, 4.5 * sizeScale, 2 * sizeScale);
    pop();

    // Bottom pectoral fin (right) - pivot at tip, points outward
    push();
    translate(finPos.x, finPos.y + params.pectoralYBottom * sizeScale - finSway);
    rotate(params.pectoralAngleBottom - sin(waveTime * 1.2) * 0.15);
    // Ellipse positioned so (0,0) is at the tip touching the body
    ellipse(2.25 * sizeScale, 0, 4.5 * sizeScale, 2 * sizeScale);
    pop();

    // Ventral fins (top and bottom) - pivot from tip like pectoral fins
    let ventralPos = segmentPositions[params.ventralPos];

    // Top ventral fin
    push();
    translate(ventralPos.x, ventralPos.y + params.ventralYTop * sizeScale);
    rotate(params.ventralAngleTop + sin(waveTime * 1.2) * 0.1);
    ellipse(1.5 * sizeScale, 0, 3 * sizeScale, 1.5 * sizeScale);
    pop();

    // Bottom ventral fin
    push();
    translate(ventralPos.x, ventralPos.y + params.ventralYBottom * sizeScale);
    rotate(params.ventralAngleBottom - sin(waveTime * 1.2) * 0.1);
    ellipse(1.5 * sizeScale, 0, 3 * sizeScale, 1.5 * sizeScale);
    pop();
}

function updateControlPoints(segmentPositions) {
    controlPoints = [];

    let headSeg = segmentPositions[0];

    // Head position
    controlPoints.push({
        x: headSeg.x + params.headX * sizeScale,
        y: headSeg.y,
        color: color(100, 200, 255),
        param: 'headX',
        label: 'Head X'
    });

    // Dorsal fin
    let dorsalPos = segmentPositions[params.dorsalPos];
    controlPoints.push({
        x: dorsalPos.x,
        y: dorsalPos.y + params.dorsalY * sizeScale,
        color: color(255, 150, 100),
        param: 'dorsalY',
        label: 'Dorsal Y'
    });

    // Pectoral fin top
    let pectoralPos = segmentPositions[params.pectoralPos];
    controlPoints.push({
        x: pectoralPos.x,
        y: pectoralPos.y + params.pectoralYTop * sizeScale,
        color: color(255, 200, 100),
        param: 'pectoralYTop',
        label: 'Pectoral Top Y'
    });

    // Pectoral fin bottom
    controlPoints.push({
        x: pectoralPos.x,
        y: pectoralPos.y + params.pectoralYBottom * sizeScale,
        color: color(255, 220, 120),
        param: 'pectoralYBottom',
        label: 'Pectoral Bottom Y'
    });

    // Ventral fins
    let ventralPos = segmentPositions[params.ventralPos];
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
    let tailBase = segmentPositions[params.numSegments - 1];
    controlPoints.push({
        x: tailBase.x + params.tailStartX * sizeScale,
        y: tailBase.y,
        color: color(150, 255, 150),
        param: 'tailStartX',
        label: 'Tail Start'
    });
}

function mousePressed() {
    for (let cp of controlPoints) {
        let d = dist(mouseX - centerX, mouseY - centerY, cp.x, cp.y);
        if (d < 10) {
            draggingPoint = cp;
            return;
        }
    }
}

function mouseDragged() {
    if (draggingPoint) {
        let localX = mouseX - centerX;
        let localY = mouseY - centerY;

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

        // Update input field
        document.getElementById(draggingPoint.param).value = params[draggingPoint.param].toFixed(1);
        updateOutput();
    }
}

function mouseReleased() {
    draggingPoint = null;
}

function setupInputs() {
    const inputs = ['numSegments', 'bodyWidth', 'bodyHeight', 'headX', 'headWidth',
                    'headHeight', 'tailStartX', 'tailWidthStart', 'tailWidthEnd',
                    'tailSplit', 'dorsalPos', 'dorsalY', 'pectoralPos', 'pectoralYTop',
                    'pectoralAngleTop', 'pectoralYBottom', 'pectoralAngleBottom',
                    'ventralPos', 'ventralYTop', 'ventralAngleTop', 'ventralYBottom', 'ventralAngleBottom'];

    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            params[id] = parseFloat(e.target.value);
            updateOutput();
        });
    });

    document.getElementById('copyValues').addEventListener('click', () => {
        const output = document.getElementById('output').textContent;
        navigator.clipboard.writeText(output);
        alert('Values copied to clipboard!');
    });
}

function updateOutput() {
    const output = `// Koi Shape Parameters
numSegments: ${params.numSegments}
bodyWidth: ${params.bodyWidth.toFixed(2)}
bodyHeight: ${params.bodyHeight.toFixed(2)}

// Head
headX: ${params.headX.toFixed(1)}
headWidth: ${params.headWidth.toFixed(1)}
headHeight: ${params.headHeight.toFixed(1)}

// Tail
tailStartX: ${params.tailStartX.toFixed(1)}
tailWidthStart: ${params.tailWidthStart.toFixed(2)}
tailWidthEnd: ${params.tailWidthEnd.toFixed(2)}
tailSplit: ${params.tailSplit.toFixed(1)}

// Fins
dorsalPos: ${params.dorsalPos}
dorsalY: ${params.dorsalY.toFixed(1)}
pectoralPos: ${params.pectoralPos}
pectoralYTop: ${params.pectoralYTop.toFixed(1)}
pectoralAngleTop: ${params.pectoralAngleTop.toFixed(2)}
pectoralYBottom: ${params.pectoralYBottom.toFixed(1)}
pectoralAngleBottom: ${params.pectoralAngleBottom.toFixed(2)}
ventralPos: ${params.ventralPos}
ventralYTop: ${params.ventralYTop.toFixed(1)}
ventralAngleTop: ${params.ventralAngleTop.toFixed(2)}
ventralYBottom: ${params.ventralYBottom.toFixed(1)}
ventralAngleBottom: ${params.ventralAngleBottom.toFixed(2)}`;

    document.getElementById('output').textContent = output;
}
