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
import { BrushTextures } from '../rendering/brush-textures.js';

// Global state
let flock;
let audio;
let pixelBuffer;
let renderer;
let controlPanel;
let brushTextures;

// Detect mobile/small screens and adjust defaults for performance
const isMobile = window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isSmallScreen = window.innerWidth < 1024;

// Parameters with device-specific defaults
let params = {
    pixelScale: isMobile ? 3 : (isSmallScreen ? 3 : 4),
    numBoids: isMobile ? 30 : (isSmallScreen ? 50 : 80),
    maxSpeed: 0.5,
    maxForce: 0.1,
    separationWeight: 0.5,  // Reduced from 1.2 - overlap is OK in 2D top-down view
    alignmentWeight: 1.2,
    cohesionWeight: 1.0,
    trailAlpha: 40,
    audioReactivity: 0.5
};

// Log device-optimized settings
const deviceType = isMobile ? 'Mobile' : (isSmallScreen ? 'Tablet' : 'Desktop');
console.log(`🐟 Koi Flocking - ${deviceType} detected (${window.innerWidth}x${window.innerHeight})`);
console.log(`   Optimized defaults: ${params.numBoids} koi, pixel scale ${params.pixelScale}`);

// Scatter mode is now handled inside each boid

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

    // Initialize brush textures for sumi-e rendering
    brushTextures = new BrushTextures();
    brushTextures.generate(createGraphics, random);

    // Initialize koi renderer with brush textures
    renderer = new KoiRenderer(brushTextures);

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
                flock.triggerScatter(3000); // 3 seconds
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

// p5.js draw function
window.draw = function() {
    // Get audio data
    const audioData = audio.getAudioData();

    // Draw background - warm paper color for sumi-e aesthetic
    const pg = pixelBuffer.getContext();
    pg.background(242, 240, 235); // Warm paper color (rgb)

    // Update flock (scatter is now handled inside each boid)
    flock.update(params, audioData);

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
