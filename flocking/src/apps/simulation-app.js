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
    maxSpeed: 1,
    maxForce: 0.1,
    separationWeight: 0.5,  // Reduced from 1.2 - overlap is OK in 2D top-down view
    alignmentWeight: 1.2,
    cohesionWeight: 1.0,
    trailAlpha: 40,
    audioReactivity: 0.5
};

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
};

// Set up toggle controls
function setupToggleControls() {
    const controlsPanel = document.getElementById('controls');
    const toggleButton = document.getElementById('toggleControls');

    toggleButton.addEventListener('click', () => {
        controlsPanel.classList.toggle('minimized');
        toggleButton.textContent = controlsPanel.classList.contains('minimized') ? '▶' : '◀';
    });
}

// p5.js draw function
window.draw = function() {
    // Get audio data
    const audioData = audio.getAudioData();

    // Draw background (no trail effect - clear each frame)
    const bgBase = 15 + audioData.bass * 5 * params.audioReactivity;
    const pg = pixelBuffer.getContext();
    pg.background(bgBase - 5, bgBase + 5, bgBase);

    // Update flock
    flock.update(params, audioData);

    // Render each boid
    for (let boid of flock.boids) {
        // Each koi has unique animation phase offset so they don't all undulate in sync
        const waveTime = frameCount * 0.1 * (1 + boid.velocity.mag() * 0.3) + boid.animationOffset;

        renderer.render(
            pg,
            boid.position.x,
            boid.position.y,
            boid.velocity.heading(),
            {
                shapeParams: DEFAULT_SHAPE_PARAMS,
                colorParams: boid.color,
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
};

// p5.js windowResized function
window.windowResized = function() {
    resizeCanvas(windowWidth, windowHeight);
    pixelBuffer.resize(width, height);
};
