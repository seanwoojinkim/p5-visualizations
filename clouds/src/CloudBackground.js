/**
 * CloudBackground.js
 * Main orchestrator class for calming cloud visualization
 *
 * Drop-in component for P5.js sketches
 * Manages multiple cloud layers with depth, noise-based drift, and biofeedback integration
 *
 * Usage:
 *   let clouds = new CloudBackground({ particleCount: 100 });
 *   clouds.generate();
 *   // In draw():
 *   clouds.update(deltaTime);
 *   clouds.display(window);
 */

class CloudBackground {
    /**
     * Create a cloud background system
     * @param {Object} params - Configuration parameters
     * @param {number} params.particleCount - Total particles across all layers (50-150)
     * @param {number} params.layerCount - Number of depth layers (3-5)
     * @param {Object} params.baseColor - Base cloud color { r, g, b }
     * @param {number} params.opacity - Base opacity (0.6-1.0)
     * @param {number} params.movementSpeed - Drift speed in px/frame (0.05-0.5)
     * @param {number} params.baseScale - Base sprite size in pixels (20-80)
     * @param {number} params.seed - Random seed for reproducibility
     * @param {boolean} params.biofeedbackMode - Enable biofeedback integration
     * @param {Object} params.scaleNoise - Noise scales (Blender values: 512, 12.25, 0.12)
     */
    constructor(params = {}) {
        // Merge with defaults
        this.params = {
            particleCount: params.particleCount || 100,
            layerCount: params.layerCount || 3,
            baseColor: params.baseColor || { r: 240, g: 245, b: 250 },
            opacity: params.opacity || 0.85,
            movementSpeed: params.movementSpeed || 0.3,
            baseScale: params.baseScale || 40,
            seed: params.seed || Math.floor(Math.random() * 10000),
            biofeedbackMode: params.biofeedbackMode || false,
            scaleNoise: params.scaleNoise || {
                large: 512.0,
                medium: 12.25,
                fine: 0.12
            }
        };

        // Core systems
        this.noiseEngine = new CloudNoiseEngine({
            seed: this.params.seed,
            scaleNoise: this.params.scaleNoise
        });

        this.layers = [];

        // Biofeedback state (Phase 3)
        this.coherenceLevel = 0.5; // Default neutral
        this.biofeedbackParams = {
            opacity: 1.0,
            glowRadius: 1.0,
            colorTemp: this.params.baseColor,
            movementSpeed: 1.0,
            layerSeparation: 1.0
        };

        // Performance tracking
        this.frameCount = 0;
        this.isGenerated = false;

        // Canvas dimensions (set during generate)
        this.canvasWidth = 0;
        this.canvasHeight = 0;
    }

    /**
     * Generate cloud sprites across layers
     * Call once during setup, or when regeneration is needed
     * @param {number} canvasWidth - Canvas width (optional, uses window if not provided)
     * @param {number} canvasHeight - Canvas height (optional, uses window if not provided)
     * @param {number} seed - Optional new seed
     */
    generate(canvasWidth = null, canvasHeight = null, seed = null) {
        // Use provided dimensions or get from window
        this.canvasWidth = canvasWidth || (typeof width !== 'undefined' ? width : 800);
        this.canvasHeight = canvasHeight || (typeof height !== 'undefined' ? height : 600);

        // Update seed if provided
        if (seed !== null) {
            this.params.seed = seed;
            this.noiseEngine.setSeed(seed);
        }

        // Clear existing layers
        this.clearLayers();

        // Create depth layers
        const layerCount = this.params.layerCount;
        const particlesPerLayer = Math.floor(this.params.particleCount / layerCount);

        for (let i = 0; i < layerCount; i++) {
            // Depth: 0 (far) to 1 (near)
            const depth = i / (layerCount - 1);

            // Create layer with distributed particle count
            const layer = new CloudLayer(depth, {
                particleCount: particlesPerLayer,
                baseScale: this.params.baseScale,
                baseOpacity: this.params.opacity,
                baseColor: this.params.baseColor,
                movementSpeed: this.params.movementSpeed,
                // Cloud shape params - discrete cloud regions
                numClouds: this.params.numClouds || 3,
                gridResolution: this.params.gridResolution || 20,
                offsetRandom: this.params.offsetRandom || 10,
                scaleVar: this.params.scaleVar || 0.3
            });

            // Generate sprites using noise-based density distribution
            layer.generateSprites(this.noiseEngine, this.canvasWidth, this.canvasHeight);

            this.layers.push(layer);
        }

        this.isGenerated = true;
    }

    /**
     * Update cloud animation
     * Call once per frame in draw loop
     * @param {number} deltaTime - Time elapsed since last frame (milliseconds)
     */
    update(deltaTime = 16.67) {
        if (!this.isGenerated) {
            console.warn('CloudBackground: generate() not called yet');
            return;
        }

        // Update noise engine time
        this.noiseEngine.update(deltaTime);
        const currentTime = this.noiseEngine.getTime();

        // Update all layers
        for (const layer of this.layers) {
            layer.update(
                this.noiseEngine,
                currentTime,
                this.biofeedbackParams,
                this.canvasWidth,
                this.canvasHeight
            );
        }

        this.frameCount++;
    }

    /**
     * Render cloud layers
     * Call after update() in draw loop
     * @param {p5} p5Instance - P5.js instance (usually window in global mode)
     */
    display(p5Instance) {
        if (!this.isGenerated) {
            console.warn('CloudBackground: generate() not called yet');
            return;
        }

        // Render layers from far to near for proper depth
        for (const layer of this.layers) {
            layer.display(p5Instance);
        }
    }

    /**
     * Set coherence level for biofeedback visualization
     * @param {number} level - Coherence level [-1 to +1]
     * -1 = high stress, 0 = neutral, +1 = deep calm
     */
    setCoherence(level) {
        if (!this.params.biofeedbackMode) return;

        this.coherenceLevel = Math.max(-1, Math.min(1, level));

        // Map coherence to visual parameters
        // Phase 3 will implement BiofeedbackMapper class
        // For now, simple direct mapping
        this.biofeedbackParams = this.mapCoherenceToVisuals(this.coherenceLevel);
    }

    /**
     * Map coherence level to visual parameters
     * Simplified version - Phase 3 will use BiofeedbackMapper class
     * @param {number} coherence - Coherence level [-1 to +1]
     * @returns {Object} Visual parameters
     */
    mapCoherenceToVisuals(coherence) {
        // Opacity: 60-100% based on coherence
        const opacity = coherence < 0
            ? 0.6 + (coherence + 1) * 0.2  // -1 to 0 maps to 0.6-0.8
            : 0.8 + coherence * 0.2;        // 0 to 1 maps to 0.8-1.0

        // Glow radius: 0.8x to 1.3x
        const glowRadius = coherence < 0
            ? 0.8 + (coherence + 1) * 0.2   // -1 to 0 maps to 0.8-1.0
            : 1.0 + coherence * 0.3;        // 0 to 1 maps to 1.0-1.3

        // Movement speed: slower at high coherence (more stillness)
        const movementSpeed = 1.0 - Math.abs(coherence) * 0.3; // 1.0 to 0.7

        // Layer separation: compressed at low coherence, expanded at high
        const layerSeparation = 0.7 + coherence * 0.5; // 0.2 to 1.2

        // Color temperature shift (simplified for Phase 2)
        // Phase 3 will use full BiofeedbackMapper with color interpolation
        let colorTemp = { ...this.params.baseColor };
        if (coherence < -0.5) {
            // Cool blue-gray
            colorTemp = { r: 180, g: 195, b: 210 };
        } else if (coherence < 0) {
            // Cool gray
            colorTemp = { r: 200, g: 210, b: 220 };
        } else if (coherence > 0.7) {
            // Warm golden glow
            colorTemp = { r: 255, g: 245, b: 220 };
        } else if (coherence > 0.3) {
            // Warm white
            colorTemp = { r: 245, g: 240, b: 230 };
        }

        return {
            opacity,
            glowRadius,
            colorTemp,
            movementSpeed,
            layerSeparation
        };
    }

    /**
     * Regenerate with new seed
     * Creates completely different cloud pattern
     * @param {number} newSeed - New random seed (optional)
     */
    regenerate(newSeed = null) {
        const seed = newSeed || Math.floor(Math.random() * 10000);
        this.generate(this.canvasWidth, this.canvasHeight, seed);
        this.noiseEngine.resetTime();
    }

    /**
     * Reset animation time
     * Returns clouds to starting positions
     */
    resetTime() {
        this.noiseEngine.resetTime();
    }

    /**
     * Update canvas dimensions (e.g., on window resize)
     * @param {number} width - New canvas width
     * @param {number} height - New canvas height
     */
    resize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        // Note: Existing sprites keep their positions
        // Call regenerate() if you want to redistribute them
    }

    /**
     * Clear all layers and sprites
     */
    clearLayers() {
        for (const layer of this.layers) {
            layer.clear();
        }
        this.layers = [];
        this.isGenerated = false;
    }

    /**
     * Get total sprite count across all layers
     * @returns {number} Total sprite count
     */
    getSpriteCount() {
        return this.layers.reduce((sum, layer) => sum + layer.getSpriteCount(), 0);
    }

    /**
     * Get system information for debugging
     * @returns {Object} System information
     */
    getInfo() {
        return {
            params: { ...this.params },
            layerCount: this.layers.length,
            totalSprites: this.getSpriteCount(),
            isGenerated: this.isGenerated,
            frameCount: this.frameCount,
            coherenceLevel: this.coherenceLevel,
            biofeedbackMode: this.params.biofeedbackMode,
            noiseConfig: this.noiseEngine.getConfig(),
            layers: this.layers.map(layer => layer.getInfo())
        };
    }

    /**
     * Enable/disable biofeedback mode
     * @param {boolean} enabled - Enable biofeedback
     */
    setBiofeedbackMode(enabled) {
        this.params.biofeedbackMode = enabled;
        if (!enabled) {
            // Reset to neutral state
            this.coherenceLevel = 0.5;
            this.biofeedbackParams = this.mapCoherenceToVisuals(0.5);
        }
    }

    /**
     * Update configuration parameters
     * @param {Object} newParams - Parameters to update
     */
    updateParams(newParams) {
        Object.assign(this.params, newParams);

        // Update noise engine if noise scales changed
        if (newParams.scaleNoise) {
            // Recreate noise engine with new scales
            this.noiseEngine = new CloudNoiseEngine({
                seed: this.params.seed,
                scaleNoise: this.params.scaleNoise
            });
        }

        // Regenerate if structural params changed
        if (newParams.particleCount || newParams.layerCount) {
            this.generate(this.canvasWidth, this.canvasHeight);
        }
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudBackground;
}
