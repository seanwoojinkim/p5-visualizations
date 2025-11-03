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
import { SVGParser } from '../core/svg-parser.js';
import { RENDERING_CONFIG } from '../core/rendering-config.js';
import { LilypadManager } from '../environment/lilypad-manager.js';
import { BlossomManager } from '../environment/blossom-manager.js';
import { WaterBackground } from '../rendering/water-background.js';

// Global state
let flock;
let audio;
let pixelBuffer;
let renderer;
let controlPanel;
let brushTextures;
let backgroundImage;
let waterBackground;
let lilypadManager;
let lilypadImages = [];
let blossomManager;
let blossomImages = [];

// SVG vertices for all koi body parts
let bodyVertices = null;
let tailVertices = null;
let headVertices = null;
let pectoralFinVertices = null;
let dorsalFinVertices = null;
let ventralFinVertices = null;

// Brush texture images
let brushTextureImages = {
    body: null,
    fin: null,
    tail: null,
    spots: [],  // Array of spot texture variations
    paper: null
};

// Detect mobile/small screens and adjust defaults for performance
const isMobile = window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isSmallScreen = window.innerWidth < 1024;

// Parameters with device-specific defaults
let params = {
    pixelScale: isMobile ? 4 : (isSmallScreen ? 2 : 2),  // Mobile: 4 for much smaller buffer (4x fewer pixels)
    numBoids: isMobile ? 10 : (isSmallScreen ? 50 : 80),  // Mobile: 10 fish for performance
    maxSpeed: 0.5,
    maxForce: 0.05,  // Reduced from 0.1 for smoother steering (matches Processing standard)
    separationWeight: 0.9,  // Linear inverse (1/d) forces allow higher separation without jerky movement
    alignmentWeight: 1.2,
    cohesionWeight: 1.0,
    trailAlpha: 40,
    audioReactivity: 0.5
};

// Base size scale to compensate for pixelScale changes
// For koi: baseSizeScale equals pixelScale to properly compensate for buffer scaling
// For lilypads/blossoms: baseline is pixelScale=2 (their base sizes were designed for that)
const baseSizeScale = params.pixelScale;
const environmentSizeScale = params.pixelScale / 2;  // Baseline: pixelScale=2 → scale=1.0

// Log device-optimized settings
const deviceType = isMobile ? 'Mobile' : (isSmallScreen ? 'Tablet' : 'Desktop');
console.log(`🐟 Koi Flocking - ${deviceType} detected (${window.innerWidth}x${window.innerHeight})`);
console.log(`   Optimized defaults: ${params.numBoids} koi, pixel scale ${params.pixelScale}, base size scale ${baseSizeScale}x`);

// Scatter mode is now handled inside each boid

// Debug mode
let debugVectors = false;

// p5.js preload function (loads assets before setup)
window.preload = async function() {
    backgroundImage = loadImage('assets/water-background.png');

    // Load brush texture images (pre-processed for performance)
    console.log('Loading brush texture images...');
    brushTextureImages.body = loadImage('assets/koi/brushstrokes/body-processed.png');
    brushTextureImages.fin = loadImage('assets/koi/brushstrokes/fin.png');
    brushTextureImages.tail = loadImage('assets/koi/brushstrokes/tail.png');

    // Load all spot texture variations (pre-processed for performance)
    brushTextureImages.spots = [
        loadImage('assets/koi/brushstrokes/spot-1-processed.png'),
        loadImage('assets/koi/brushstrokes/spot-2-processed.png'),
        loadImage('assets/koi/brushstrokes/spot-3-processed.png'),
        loadImage('assets/koi/brushstrokes/spot-4-processed.png'),
        loadImage('assets/koi/brushstrokes/spot-5-processed.png')
    ];

    brushTextureImages.paper = loadImage('assets/koi/brushstrokes/paper.png');

    // Load lilypad images
    console.log('Loading lilypad images...');
    lilypadImages = [
        loadImage('assets/lilypad/lilypad-1.png'),
        loadImage('assets/lilypad/lilypad-2.png'),
        loadImage('assets/lilypad/lilypad-3.png')
    ];

    // Load blossom images
    console.log('Loading blossom images...');
    blossomImages = [
        loadImage('assets/blossoms/blossom-1.png'),
        loadImage('assets/blossoms/blossom-2.png'),
        loadImage('assets/blossoms/blossom-3.png')
    ];

    // Load and parse all SVG body parts
    // Target dimensions match koi coordinate space for each part

    console.log('Loading SVG body parts...');

    // Body: 16 × 5.2 units (X: -8 to +8, Y: -2.6 to +2.6)
    bodyVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/body.svg',
        20,
        { width: 16, height: 5.2 }
    );

    // Tail: 6 × 4 units (length × max width, matches procedural base dimensions)
    tailVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/tail.svg',
        20,
        { width: 6, height: 4 }
    );

    // Head: 7.5 × 5.0 units (width × height, matches procedural ellipse)
    headVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/head.svg',
        20,
        { width: 7.5, height: 5.0 }
    );

    // Pectoral fin: 4.5 × 2 units (length × width, elliptical)
    pectoralFinVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/pectoral-fin.svg',
        20,
        { width: 4.5, height: 2 }
    );

    // Dorsal fin: 4 × 5 units (width × height)
    dorsalFinVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/dorsal-fin.svg',
        20,
        { width: 4, height: 5 }
    );

    // Ventral fin: 3 × 1.5 units (length × width, elliptical)
    ventralFinVertices = await SVGParser.loadSVGFromURL(
        'assets/koi/body-parts/ventral-fin.svg',
        20,
        { width: 3, height: 1.5 }
    );

    // Log loading results for all parts
    const parts = {
        body: bodyVertices,
        tail: tailVertices,
        head: headVertices,
        pectoralFin: pectoralFinVertices,
        dorsalFin: dorsalFinVertices,
        ventralFin: ventralFinVertices
    };

    console.log('SVG body parts loaded:');
    for (const [name, vertices] of Object.entries(parts)) {
        if (vertices) {
            const info = SVGParser.getDebugInfo(vertices);
            console.log(`  ${name}: ${info.vertexCount} vertices, bounds: ${JSON.stringify(info.bounds)}`);
        } else {
            console.warn(`  ${name}: FAILED to load (will use procedural fallback)`);
        }
    }
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

    // Initialize brush textures for sumi-e rendering
    brushTextures = new BrushTextures();
    brushTextures.loadImages(brushTextureImages);
    brushTextures.setP5Instance(window); // Enable tint caching for performance

    // Initialize koi renderer with brush textures
    renderer = new KoiRenderer(brushTextures);

    // Initialize lilypad manager
    // Create a few lilypads per screen (2-5 depending on screen size, reduced on mobile for performance)
    const lilypadCount = isMobile ? 2 : (isSmallScreen ? 4 : 5);
    lilypadManager = new LilypadManager(
        lilypadImages,
        lilypadCount,
        bufferDims.width,
        bufferDims.height,
        {
            random: (...args) => random(...args),
            createVector,
            noise: (...args) => noise(...args)
        }
    );
    lilypadManager.setSizeScale(environmentSizeScale);

    // Initialize blossom manager
    // Spawn new blossoms periodically (every 2 seconds at 60fps)
    const blossomSpawnRate = 120;
    const maxBlossoms = isMobile ? 5 : (isSmallScreen ? 12 : 15);
    blossomManager = new BlossomManager(
        blossomImages,
        blossomSpawnRate,
        maxBlossoms,
        bufferDims.width,
        bufferDims.height,
        {
            random: (...args) => random(...args),
            createVector
        }
    );
    blossomManager.setSizeScale(environmentSizeScale);

    // Initialize water background with mobile detection and static background image
    waterBackground = new WaterBackground(window, brushTextureImages, {
        isMobile,
        staticBackgroundImage: backgroundImage
    });
    waterBackground.init(bufferDims.width, bufferDims.height);

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

            // Update size scale for lilypads and blossoms
            // environmentSizeScale uses pixelScale=2 as baseline (scale / 2)
            const newEnvironmentSizeScale = scale / 2;
            if (lilypadManager) {
                lilypadManager.setSizeScale(newEnvironmentSizeScale);
            }
            if (blossomManager) {
                blossomManager.setSizeScale(newEnvironmentSizeScale);
            }
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

    // Set up touch controls for mobile
    setupTouchControls();
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
            case 't':
                // Toggle textures on/off
                RENDERING_CONFIG.textures.enabled = !RENDERING_CONFIG.textures.enabled;
                console.log('Textures:', RENDERING_CONFIG.textures.enabled ? 'ON' : 'OFF');

                // Update UI checkbox if control panel exists
                const textureToggle = document.getElementById('texturesEnabled');
                if (textureToggle) {
                    textureToggle.checked = RENDERING_CONFIG.textures.enabled;
                }
                break;
        }
    });
}

// Set up touch controls for mobile
function setupTouchControls() {
    let touchStartTime = 0;
    let touchStartCount = 0;

    document.addEventListener('touchstart', (e) => {
        if (e.touches.length === 3) {
            touchStartTime = Date.now();
            touchStartCount = 3;
        }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        // Check if we had 3 fingers at start and the tap was quick
        if (touchStartCount === 3 && Date.now() - touchStartTime < 300) {
            debugVectors = !debugVectors;
            console.log('Debug FPS (three-finger tap):', debugVectors ? 'ON' : 'OFF');
        }

        // Reset counter when all touches are released
        if (e.touches.length === 0) {
            touchStartCount = 0;
        }
    }, { passive: true });
}

// p5.js draw function
window.draw = function() {
    // Performance monitoring
    const frameStartTime = performance.now();

    // Get audio data
    const audioData = audio.getAudioData();

    // Draw background - animated watercolor with static base layer
    const pg = pixelBuffer.getContext();

    // Render water background (includes static image + animated particles)
    if (waterBackground) {
        waterBackground.update();
        waterBackground.render(pg);
    } else {
        // Fallback if water background not initialized
        pg.background(242, 240, 235);
    }

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
                    sizeScale: boid.sizeMultiplier * baseSizeScale,  // Apply base size scale for rendering
                    waveAmplitudeScale: boid.sizeMultiplier,  // Wave amplitude uses natural size only (no baseSizeScale)
                    lengthMultiplier: boid.lengthMultiplier,
                    tailLength: boid.tailLength
                },
                modifiers: {
                    brightnessBoost: audioData.bass * 8 * params.audioReactivity,
                    saturationBoost: audioData.treble * 10 * params.audioReactivity,
                    sizeScale: 1 + audioData.amplitude * 0.3 * params.audioReactivity
                },
                boidSeed: Math.floor(boid.animationOffset * 1000), // Use animation offset as consistent seed
                svgVertices: {
                    body: bodyVertices,
                    tail: tailVertices,
                    head: headVertices,
                    pectoralFin: pectoralFinVertices,
                    dorsalFin: dorsalFinVertices,
                    ventralFin: ventralFinVertices
                }
            }
        );
    }

    // Render lilypads on top of koi (after koi so they appear above)
    if (lilypadManager) {
        lilypadManager.update(frameCount);
        lilypadManager.render(pg);
    }

    // Render blossoms on top of lilypads (falling petals should be most visible)
    if (blossomManager) {
        blossomManager.update(frameCount);
        blossomManager.render(pg);
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

    // Performance monitoring
    const frameEndTime = performance.now();
    const frameTime = frameEndTime - frameStartTime;

    // Log warning if frame time exceeds target (60fps = 16.67ms)
    if (frameTime > 16.67) {
        console.warn(`Frame time: ${frameTime.toFixed(2)}ms (target: 16.67ms for 60fps)`);
    }

    // Display frame time in debug mode
    if (debugVectors) {
        push();
        fill(255);
        noStroke();
        textSize(14);
        textAlign(LEFT, TOP);
        // Use p5's built-in frameRate() for accurate averaged FPS instead of instantaneous calculation
        text(`Frame: ${frameTime.toFixed(2)}ms (${Math.floor(frameRate())} fps)`, 10, 10);
        pop();
    }
};

// p5.js windowResized function
window.windowResized = function() {
    resizeCanvas(windowWidth, windowHeight);
    pixelBuffer.resize(width, height);

    // Resize lilypad manager
    if (lilypadManager) {
        const bufferDims = pixelBuffer.getDimensions();
        lilypadManager.resize(bufferDims.width, bufferDims.height);
    }

    // Resize blossom manager
    if (blossomManager) {
        const bufferDims = pixelBuffer.getDimensions();
        blossomManager.resize(bufferDims.width, bufferDims.height);
    }
};

// Hot Module Replacement (HMR) cleanup
// This prevents memory leaks and performance degradation on hot reload
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        console.log('🔄 HMR: Cleaning up simulation-app resources...');

        // Clear tint cache to free p5.Graphics memory (~50MB with 200 cached textures)
        if (brushTextures) {
            brushTextures.clearTintCache();
        }

        // Remove pixel buffer graphics
        if (pixelBuffer) {
            const pg = pixelBuffer.getContext();
            if (pg && pg.remove) {
                pg.remove();
            }
        }

        // Clear p5.js instance (will be recreated on reload)
        if (window.remove) {
            window.remove();
        }

        console.log('✓ HMR: Resources cleaned up');
    });
}
