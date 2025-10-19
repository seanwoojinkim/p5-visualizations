/**
 * Simulation App
 * Main flocking simulation application
 * Orchestrates all modules: flock, audio, rendering, controls
 */

import { FlockManager } from '../flocking/flock-manager.js';
import { AudioAnalyzer } from '../audio/audio-analyzer.js';
import { PixelBuffer } from '../rendering/pixel-buffer.js';
import { KoiRenderer } from '../core/koi-renderer.js';
import { DEFAULT_SHAPE_PARAMS } from '../core/koi-params.js';
import { ControlPanel } from '../ui/control-panel.js';

// Global state
let flock;
let audio;
let pixelBuffer;
let renderer;
let controlPanel;

// Parameters
let params = {
    pixelScale: 4,
    numBoids: 80,
    maxSpeed: 0.5,
    maxForce: 0.1,
    separationWeight: 0.5,  // Reduced from 1.2 - overlap is OK in 2D top-down view
    alignmentWeight: 1.2,
    cohesionWeight: 1.0,
    trailAlpha: 40,
    audioReactivity: 0.5
};

// Scatter mode state
let scatterMode = false;
let scatterEndTime = 0;
let scatterVectors = [];
let scatterEaseTime = 2000; // 2 seconds to ease back into flocking

// Individual scatter state for each boid
let individualScatterData = [];

// Debug mode
let debugVectors = false;

// p5.js setup function
window.setup = function() {
    createCanvas(windowWidth, windowHeight);

    // Initialize audio analyzer
    audio = new AudioAnalyzer();

    // Initialize pixel buffer
    pixelBuffer = new PixelBuffer(width, height, params.pixelScale, createGraphics, floor);

    // Initialize flock manager
    const bufferDims = pixelBuffer.getDimensions();

    // Create a p5Instance object with access to p5.Vector
    // In global mode, we can access createVector's constructor to get p5.Vector
    const tempVec = createVector(0, 0);
    const p5Instance = {
        Vector: tempVec.constructor
    };

    flock = new FlockManager(
        params.numBoids,
        bufferDims.width,
        bufferDims.height,
        {
            random: (...args) => random(...args),  // Wrap to maintain context
            createVector,
            floor,
            p5Instance: p5Instance
        }
    );

    // Initialize individual scatter data for each boid
    initializeIndividualScatter();

    // Initialize koi renderer
    renderer = new KoiRenderer();

    // Initialize control panel
    controlPanel = new ControlPanel(params, {
        onAudioFileLoad: async (file) => {
            await audio.loadAudioFile(file);
            controlPanel.enablePlayPause();
        },
        onPlayPause: () => {
            return audio.togglePlayPause();
        },
        onPixelScaleChange: (scale) => {
            pixelBuffer.setPixelScale(scale, width, height);
            const bufferDims = pixelBuffer.getDimensions();
            flock.width = bufferDims.width;
            flock.height = bufferDims.height;
        },
        onBoidCountChange: (count) => {
            flock.resize(count);
        },
        onReset: () => {
            flock.reset();
        }
    });

    // Set up toggle controls
    setupToggleControls();

    // Set up keyboard controls
    setupKeyboardControls();
};

// Set up toggle controls
function setupToggleControls() {
    const controlsPanel = document.getElementById('controls');
    const toggleButton = document.getElementById('toggleControls');

    toggleButton.addEventListener('click', () => {
        controlsPanel.classList.toggle('minimized');
        toggleButton.textContent = controlsPanel.classList.contains('minimized') ? '▶' : '◀';
    });

    // Keyboard help toggle
    const keyboardPanel = document.getElementById('keyboard-help');
    const toggleKeyboard = document.getElementById('toggleKeyboard');

    toggleKeyboard.addEventListener('click', () => {
        keyboardPanel.classList.toggle('minimized');
        toggleKeyboard.textContent = keyboardPanel.classList.contains('minimized') ? '▲' : '▼';
    });
}

// Set up keyboard controls
function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        switch(e.key.toLowerCase()) {
            case 's':
                // Scatter mode - fish disperse in random directions
                triggerScatter();
                break;
            case 'r':
                // Reset flock
                flock.reset();
                break;
            case 'c':
                // Toggle controls visibility
                document.getElementById('toggleControls').click();
                break;
            case 'd':
                // Toggle debug mode (velocity vectors)
                debugVectors = !debugVectors;
                console.log('Debug vectors:', debugVectors ? 'ON' : 'OFF');
                break;
        }
    });
}

// Initialize individual scatter data
function initializeIndividualScatter() {
    individualScatterData = [];
    for (let i = 0; i < flock.boids.length; i++) {
        individualScatterData.push({
            active: false,
            endTime: 0,
            vector: null,
            nextScatterTime: millis() + random(5000, 20000) // Random time between 5-20 seconds
        });
    }
}

// Trigger scatter behavior (all koi)
function triggerScatter() {
    scatterMode = true;
    scatterEndTime = millis() + 3000; // Scatter for 3 seconds

    // Generate random direction vector for each boid
    scatterVectors = [];
    for (let i = 0; i < flock.boids.length; i++) {
        const angle = random(TWO_PI);
        const speed = random(0.8, 1.5);
        scatterVectors.push(createVector(cos(angle) * speed, sin(angle) * speed));
    }
}

// Update individual scatter behavior
function updateIndividualScatter() {
    const currentTime = millis();

    for (let i = 0; i < flock.boids.length; i++) {
        const data = individualScatterData[i];

        // Check if it's time to trigger a random scatter
        if (!data.active && currentTime > data.nextScatterTime && !scatterMode) {
            // Trigger scatter for this individual koi
            data.active = true;
            data.endTime = currentTime + random(1000, 2500); // Scatter for 1-2.5 seconds

            const angle = random(TWO_PI);
            const speed = random(0.8, 1.5);
            data.vector = createVector(cos(angle) * speed, sin(angle) * speed);
        }

        // Check if individual scatter should end
        if (data.active && currentTime > data.endTime + scatterEaseTime) {
            data.active = false;
            data.vector = null;
            // Schedule next scatter in 5-20 seconds
            data.nextScatterTime = currentTime + random(5000, 20000);
        }
    }
}

// Get scatter intensity for individual boid
function getIndividualScatterIntensity(index) {
    const data = individualScatterData[index];
    if (!data || !data.active) return 0;

    const currentTime = millis();

    if (currentTime < data.endTime) {
        // Still in scatter phase
        return 1.0;
    } else if (currentTime < data.endTime + scatterEaseTime) {
        // Easing back
        const elapsed = currentTime - data.endTime;
        let intensity = 1.0 - (elapsed / scatterEaseTime);
        // Use easeOut curve
        return intensity * intensity;
    }

    return 0;
}

// p5.js draw function
window.draw = function() {
    // Get audio data
    const audioData = audio.getAudioData();

    // Draw background (no trail effect - clear each frame)
    const bgBase = 15 + audioData.bass * 5 * params.audioReactivity;
    const pg = pixelBuffer.getContext();
    pg.background(bgBase - 5, bgBase + 5, bgBase);

    // Update individual scatter behavior
    updateIndividualScatter();

    // Calculate scatter intensity (1.0 = full scatter, 0.0 = full flock)
    let scatterIntensity = 0;
    const currentTime = millis();

    if (currentTime < scatterEndTime) {
        // Still in scatter phase
        scatterIntensity = 1.0;
    } else if (currentTime < scatterEndTime + scatterEaseTime) {
        // Easing back to flocking
        const elapsed = currentTime - scatterEndTime;
        scatterIntensity = 1.0 - (elapsed / scatterEaseTime);
        // Use easeOut curve for smoother transition
        scatterIntensity = scatterIntensity * scatterIntensity;
    } else if (scatterMode) {
        // Transition complete
        scatterMode = false;
        scatterVectors = [];
    }

    // If scattering, we need to modify behavior before flock update
    if (scatterIntensity > 0) {
        // Calculate flocking forces but don't apply them yet
        // We'll blend them with scatter forces
        const modifiedParams = {...params};

        // Temporarily modify weights during scatter
        modifiedParams.separationWeight = params.separationWeight * (1 - scatterIntensity);
        modifiedParams.alignmentWeight = params.alignmentWeight * (1 - scatterIntensity);
        modifiedParams.cohesionWeight = params.cohesionWeight * (1 - scatterIntensity);

        flock.update(modifiedParams, audioData);

        // Now add scatter forces on top
        for (let i = 0; i < flock.boids.length; i++) {
            const boid = flock.boids[i];
            const scatterVec = scatterVectors[i];

            // Also check for individual scatter
            const individualIntensity = getIndividualScatterIntensity(i);
            const totalIntensity = Math.max(scatterIntensity, individualIntensity);
            const activeScatterVec = scatterIntensity > individualIntensity ?
                scatterVec : individualScatterData[i].vector;

            if (activeScatterVec && totalIntensity > 0) {
                // Create scatter force
                const scatterForce = activeScatterVec.copy();
                scatterForce.limit(params.maxForce * 5);

                // Add scatter force weighted by intensity
                const weightedScatter = scatterForce.copy().mult(totalIntensity);
                boid.acceleration.add(weightedScatter);

                // Apply velocity changes
                boid.velocity.add(boid.acceleration);

                // Speed limit blends between normal and fast
                const maxSpeed = lerp(params.maxSpeed, params.maxSpeed * 1.3, totalIntensity);
                boid.velocity.limit(maxSpeed);

                // Update position
                boid.position.add(boid.velocity);

                // Wrap around edges
                if (boid.position.x > flock.width) boid.position.x = 0;
                if (boid.position.x < 0) boid.position.x = flock.width;
                if (boid.position.y > flock.height) boid.position.y = 0;
                if (boid.position.y < 0) boid.position.y = flock.height;

                // Reset acceleration
                boid.acceleration.set(0, 0);
            }
        }
    } else {
        // Normal flocking update
        flock.update(params, audioData);
    }

    // Render each boid
    for (let boid of flock.boids) {
        // Each koi has unique animation phase offset so they don't all undulate in sync
        // Use ADDITIVE velocity modulation instead of MULTIPLICATIVE
        // Multiplicative compounds with frameCount, causing larger jumps over time
        // Additive keeps velocity influence constant regardless of elapsed time
        const baseWave = frameCount * 0.1;
        const velocityOffset = boid.velocity.mag() * 3.0; // Affects phase, not rate
        const waveTime = baseWave + velocityOffset + boid.animationOffset;

        // Debug mode: Show escaping koi in red
        let debugColor = boid.color;
        if (debugVectors) {
            const isEscaping = boid.getIsEscaping ? boid.getIsEscaping() : false;
            if (isEscaping) {
                // Override color to bright red for debug visualization
                debugColor = { h: 0, s: 100, b: 90 };
            }
        }

        renderer.render(
            pg,
            boid.position.x,
            boid.position.y,
            boid.velocity.heading(),
            {
                shapeParams: DEFAULT_SHAPE_PARAMS,
                colorParams: debugColor,
                pattern: boid.pattern,
                animationParams: {
                    waveTime,
                    sizeScale: boid.sizeMultiplier,
                    lengthMultiplier: boid.lengthMultiplier,
                    tailLength: boid.tailLength
                },
                modifiers: {
                    brightnessBoost: audioData.bass * 8 * params.audioReactivity,
                    saturationBoost: audioData.treble * 10 * params.audioReactivity,
                    sizeScale: 1 + audioData.amplitude * 0.3 * params.audioReactivity
                }
            }
        );
    }

    // Scale up the low-res buffer to main canvas
    pixelBuffer.render(window, width, height);

    // Debug mode: Draw velocity vectors on main canvas (full resolution)
    if (debugVectors) {
        const bufferDims = pixelBuffer.getDimensions();
        const scaleX = width / bufferDims.width;
        const scaleY = height / bufferDims.height;

        stroke(0, 255, 0); // Green for velocity
        strokeWeight(2);

        for (let boid of flock.boids) {
            // Scale positions to main canvas
            const screenX = boid.position.x * scaleX;
            const screenY = boid.position.y * scaleY;

            // Draw velocity vector (green)
            const endX = screenX + boid.velocity.x * 20 * scaleX;
            const endY = screenY + boid.velocity.y * 20 * scaleY;

            line(screenX, screenY, endX, endY);

            // Draw arrowhead
            push();
            translate(endX, endY);
            rotate(boid.velocity.heading());
            fill(0, 255, 0);
            noStroke();
            triangle(-10, -6, -10, 6, 0, 0);
            pop();

            // Draw acceleration vector (red)
            if (boid.acceleration.mag() > 0.001) {
                stroke(255, 0, 0); // Red for acceleration
                const accEndX = screenX + boid.acceleration.x * 100 * scaleX;
                const accEndY = screenY + boid.acceleration.y * 100 * scaleY;
                line(screenX, screenY, accEndX, accEndY);
            }
        }
    }
};

// p5.js windowResized function
window.windowResized = function() {
    resizeCanvas(windowWidth, windowHeight);
    pixelBuffer.resize(width, height);
};
