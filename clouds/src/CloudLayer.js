/**
 * CloudLayer.js
 * Manages a collection of CloudSprites at a specific depth layer
 *
 * Features:
 * - Depth-based scaling (closer layers = larger sprites)
 * - Depth-based opacity (farther layers = more transparent)
 * - Parallax movement (closer layers move faster relative to camera)
 * - Layer separation modulation (expands/compresses based on biofeedback)
 */

class CloudLayer {
    /**
     * Create a cloud layer
     * @param {number} depth - Layer depth [0-1] (0 = far, 1 = near)
     * @param {Object} params - Configuration parameters
     * @param {number} params.particleCount - Number of sprites in this layer
     * @param {number} params.baseScale - Base sprite size
     * @param {number} params.baseOpacity - Base sprite opacity
     * @param {Object} params.baseColor - Base sprite color { r, g, b }
     * @param {number} params.movementSpeed - Base movement speed
     */
    constructor(depth, params = {}) {
        this.depth = depth; // 0 (far) to 1 (near)
        this.sprites = [];

        // Depth-based scaling: closer layers have larger sprites
        // Range: 0.5x (far) to 1.0x (near)
        this.depthScale = 0.5 + (depth * 0.5);

        // Depth-based alpha: farther layers are more transparent
        // Range: 0.4x (far) to 1.0x (near)
        this.depthAlpha = 0.4 + (depth * 0.6);

        // Parallax factor: closer layers move faster
        // Range: 0 (far, no parallax) to 0.3 (near, subtle parallax)
        this.parallaxFactor = depth * 0.3;

        // Store params for sprite creation
        this.params = params;

        // Biofeedback modulation (Phase 3)
        // Controls layer separation (1.0 = normal, >1.0 = expanded, <1.0 = compressed)
        this.separationModulation = 1.0;
    }

    /**
     * Add a sprite to this layer
     * Automatically applies depth-based properties
     * @param {CloudSprite} sprite - Sprite to add
     */
    addSprite(sprite) {
        sprite.layer = this;
        sprite.depth = this.depth;

        // Apply depth-based scale and opacity
        sprite.baseScale *= this.depthScale;
        sprite.scale = sprite.baseScale;
        sprite.baseOpacity *= this.depthAlpha;
        sprite.opacity = sprite.baseOpacity;

        this.sprites.push(sprite);
    }

    /**
     * Generate sprites for this layer using base cloud shapes
     * Aligns with Blender approach: discrete cloud shapes with particles distributed within
     * @param {CloudNoiseEngine} noiseEngine - Noise engine for density sampling
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    generateSprites(noiseEngine, canvasWidth, canvasHeight) {
        // Import CloudShape (inline for now)
        const CloudShape = window.CloudShape || this.getCloudShapeClass();

        const gridResolution = this.params.gridResolution || 20;
        const scaleVar = this.params.scaleVar || 0.3;
        const offsetRandom = this.params.offsetRandom || 10;
        const numClouds = this.params.numClouds || 3; // Number of discrete clouds per layer

        // Generate base cloud shapes (the "base mesh" from Blender)
        const cloudShapes = this.generateCloudShapes(numClouds, canvasWidth, canvasHeight);

        // For each cloud shape, distribute particles within it
        for (const shape of cloudShapes) {
            // Sample points within this cloud shape using grid
            const points = shape.sampleGridPoints(gridResolution, noiseEngine);

            for (const point of points) {
                // Density threshold - only create particles in denser regions
                if (point.density > 0.3) {
                    // Add random offset
                    const offsetX = (Math.random() - 0.5) * offsetRandom * 2;
                    const offsetY = (Math.random() - 0.5) * offsetRandom * 2;

                    // Scale based on density and distance from cloud center
                    const densityScale = Math.pow(point.density, 0.7);
                    const randomScale = 1.0 + (Math.random() - 0.5) * scaleVar * 2;
                    const finalScale = (this.params.baseScale || 40) * densityScale * randomScale;

                    // Create sprite
                    const sprite = new CloudSprite(
                        point.x + offsetX,
                        point.y + offsetY,
                        this,
                        {
                            baseScale: finalScale,
                            baseOpacity: this.params.baseOpacity || 0.8,
                            baseColor: this.params.baseColor || { r: 240, g: 245, b: 250 },
                            movementSpeed: this.params.movementSpeed || 0.3,
                            densityValue: point.density,
                            cloudShapeId: shape.seed
                        }
                    );

                    this.addSprite(sprite);
                }
            }
        }

        // Store cloud shapes for debugging
        this.cloudShapes = cloudShapes;
    }

    /**
     * Generate base cloud shapes for this layer
     * Each shape represents a discrete cloud region
     * @param {number} count - Number of clouds to generate
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @returns {Array<CloudShape>} - Array of cloud shapes
     */
    generateCloudShapes(count, canvasWidth, canvasHeight) {
        const CloudShape = window.CloudShape || this.getCloudShapeClass();
        const shapes = [];
        const padding = 100; // Keep clouds away from edges

        for (let i = 0; i < count; i++) {
            // Random position with padding
            const x = padding + Math.random() * (canvasWidth - padding * 2);
            const y = padding + Math.random() * (canvasHeight - padding * 2);

            // Variable cloud size
            const baseWidth = 150 + Math.random() * 200;  // 150-350px
            const baseHeight = 100 + Math.random() * 150; // 100-250px

            // Ellipses are more cloud-like than circles
            const aspectRatio = 0.6 + Math.random() * 0.6; // 0.6-1.2
            const width = baseWidth;
            const height = baseWidth * aspectRatio;

            // Random rotation
            const rotation = Math.random() * Math.PI * 2;

            shapes.push(new CloudShape(x, y, {
                width,
                height,
                rotation,
                type: 'ellipse',
                seed: Math.floor(Math.random() * 10000) + this.depth * 1000
            }));
        }

        return shapes;
    }

    /**
     * Get CloudShape class (fallback if not globally available)
     * @returns {Class} CloudShape class
     */
    getCloudShapeClass() {
        // This is a placeholder - in production, CloudShape would be imported properly
        console.warn('CloudShape not found globally, using fallback');
        return class CloudShape {
            constructor(x, y, params) {
                this.center = { x, y };
                this.width = params.width || 200;
                this.height = params.height || 150;
                this.seed = params.seed || 0;
            }
            sampleGridPoints(resolution, noiseEngine) {
                const points = [];
                const minX = this.center.x - this.width / 2;
                const maxX = this.center.x + this.width / 2;
                const minY = this.center.y - this.height / 2;
                const maxY = this.center.y + this.height / 2;

                for (let x = minX; x <= maxX; x += resolution) {
                    for (let y = minY; y <= maxY; y += resolution) {
                        const dx = (x - this.center.x) / (this.width / 2);
                        const dy = (y - this.center.y) / (this.height / 2);
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist <= 1.0) {
                            const density = noiseEngine.sample2D(x + this.seed, y + this.seed, 0);
                            const centerFalloff = 1.0 - Math.pow(dist, 0.5);
                            points.push({
                                x,
                                y,
                                density: density * centerFalloff,
                                distFromCenter: dist
                            });
                        }
                    }
                }
                return points;
            }
        };
    }

    /**
     * Update all sprites in this layer
     * @param {CloudNoiseEngine} noiseEngine - Noise engine for drift
     * @param {number} time - Current time offset
     * @param {Object} biofeedbackParams - Visual parameters from biofeedback
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    update(noiseEngine, time, biofeedbackParams, canvasWidth, canvasHeight) {
        // Update separation modulation from biofeedback (Phase 3)
        if (biofeedbackParams && biofeedbackParams.layerSeparation !== undefined) {
            this.separationModulation = biofeedbackParams.layerSeparation;
        }

        // Update all sprites
        for (const sprite of this.sprites) {
            sprite.update(noiseEngine, time, biofeedbackParams, canvasWidth, canvasHeight);
        }
    }

    /**
     * Render all sprites in this layer
     * Applies depth-based effects and parallax offset
     * @param {p5} p5 - P5.js instance
     * @param {Object} cameraOffset - Camera offset for parallax { x, y }
     */
    display(p5, cameraOffset = { x: 0, y: 0 }) {
        p5.push();

        // Enable additive blending for organic merging
        // This is the KEY technique that creates Blender's "painterly" quality in 2D
        // Particles blend together smoothly instead of overlapping with hard edges
        p5.blendMode(p5.ADD);

        // Apply subtle parallax offset
        // Closer layers move more with camera movement
        // (Currently static camera, but ready for Phase 4 enhancements)
        const parallaxX = cameraOffset.x * this.parallaxFactor;
        const parallaxY = cameraOffset.y * this.parallaxFactor;
        p5.translate(parallaxX, parallaxY);

        // Apply depth-based separation modulation
        // High coherence = more expansive (layers spread apart)
        // Low coherence = more compressed (layers closer together)
        // This creates subtle sense of depth expansion during calm states
        const separationOffset = (this.depth - 0.5) * 50 * this.separationModulation;
        p5.translate(0, separationOffset);

        // Render all sprites in this layer
        for (const sprite of this.sprites) {
            sprite.display(p5);
        }

        // Reset blend mode for other rendering
        p5.blendMode(p5.BLEND);

        p5.pop();
    }

    /**
     * Get sprite count
     * @returns {number} Number of sprites in layer
     */
    getSpriteCount() {
        return this.sprites.length;
    }

    /**
     * Clear all sprites
     */
    clear() {
        // Cleanup sprite resources
        for (const sprite of this.sprites) {
            if (sprite.dispose) {
                sprite.dispose();
            }
        }
        this.sprites = [];
    }

    /**
     * Get layer info for debugging
     * @returns {Object} Layer information
     */
    getInfo() {
        return {
            depth: this.depth,
            spriteCount: this.sprites.length,
            depthScale: this.depthScale,
            depthAlpha: this.depthAlpha,
            parallaxFactor: this.parallaxFactor,
            separationModulation: this.separationModulation
        };
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudLayer;
}
