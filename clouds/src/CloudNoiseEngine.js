/**
 * CloudNoiseEngine.js
 * Multi-scale Perlin noise generator for calming cloud movement
 *
 * Based on Blender cloud generator research with exact scales:
 * - Large scale (512): Dominant slow drift
 * - Medium scale (12.25): Secondary variation
 * - Fine scale (0.12): Minimal texture detail
 *
 * Design principle: Ultra-slow time evolution for ambient, calming movement
 */

class CloudNoiseEngine {
    /**
     * Create a multi-scale noise engine
     * @param {Object} params - Configuration parameters
     * @param {Object} params.scaleNoise - Noise scales { large, medium, fine }
     * @param {Object} params.weights - Weights for each scale { large, medium, fine }
     * @param {number} params.seed - Random seed for reproducibility
     */
    constructor(params = {}) {
        // Noise scales from Blender research
        this.scales = {
            large: params.scaleNoise?.large || 512.0,
            medium: params.scaleNoise?.medium || 12.25,
            fine: params.scaleNoise?.fine || 0.12
        };

        // Weights for multi-scale composition
        // Heavily favor large scale for calm, slow movement
        this.weights = {
            large: params.weights?.large || 1.0,   // Dominant
            medium: params.weights?.medium || 0.3, // Reduced for calm
            fine: params.weights?.fine || 0.1      // Minimal (less busyness)
        };

        // Time multipliers for ultra-slow evolution
        // These create the "ambient drift" feeling (not active movement)
        this.timeMultipliers = {
            large: 0.0001,   // Very slow overall drift
            medium: 0.0002,  // Slightly faster secondary
            fine: 0.0003     // Fastest but still very slow
        };

        // Seed for reproducibility
        this.seed = params.seed || 0;

        // Total weight for normalization
        this.totalWeight = this.weights.large + this.weights.medium + this.weights.fine;

        // Cache for performance
        this.timeOffset = 0;
    }

    /**
     * Sample multi-scale noise at a 2D position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} time - Current time value
     * @returns {number} Noise value in range [0, 1]
     */
    sample2D(x, y, time = 0) {
        // Large-scale: slow overall drift pattern
        const nL = noise(
            (x + this.seed) / this.scales.large,
            y / this.scales.large,
            time * this.timeMultipliers.large
        );

        // Medium-scale: secondary variation (minimal)
        const nM = noise(
            (x + this.seed + 1000) / this.scales.medium,
            (y + 500) / this.scales.medium,
            time * this.timeMultipliers.medium
        );

        // Fine-scale: texture detail (very subtle)
        const nF = noise(
            (x + this.seed + 2000) / this.scales.fine,
            (y + 1500) / this.scales.fine,
            time * this.timeMultipliers.fine
        );

        // Weighted combination
        const combined = (
            nL * this.weights.large +
            nM * this.weights.medium +
            nF * this.weights.fine
        );

        // Normalize to 0-1 range
        return combined / this.totalWeight;
    }

    /**
     * Sample multi-scale noise at a 3D position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @param {number} time - Current time value
     * @returns {number} Noise value in range [0, 1]
     */
    sample3D(x, y, z, time = 0) {
        // Note: P5.js noise() supports 2D and 3D
        // Large-scale: slow overall drift pattern
        const nL = noise(
            (x + this.seed) / this.scales.large,
            y / this.scales.large,
            (z + time * this.timeMultipliers.large) / this.scales.large
        );

        // Medium-scale: secondary variation
        const nM = noise(
            (x + this.seed + 1000) / this.scales.medium,
            (y + 500) / this.scales.medium,
            (z + time * this.timeMultipliers.medium) / this.scales.medium
        );

        // Fine-scale: texture detail
        const nF = noise(
            (x + this.seed + 2000) / this.scales.fine,
            (y + 1500) / this.scales.fine,
            (z + time * this.timeMultipliers.fine) / this.scales.fine
        );

        // Weighted combination
        const combined = (
            nL * this.weights.large +
            nM * this.weights.medium +
            nF * this.weights.fine
        );

        // Normalize to 0-1 range
        return combined / this.totalWeight;
    }

    /**
     * Get drift velocity for a sprite based on noise field
     * Converts noise values to directional movement
     * @param {Object} sprite - Sprite with seedX, seedY properties
     * @param {number} sprite.seedX - Fixed X position in noise field
     * @param {number} sprite.seedY - Fixed Y position in noise field
     * @param {number} sprite.maxSpeed - Maximum drift speed (px/frame)
     * @param {number} time - Current time value
     * @returns {Object} Velocity vector { x, y }
     */
    getDriftVelocity(sprite, time) {
        // Sample noise at sprite's seed position (fixed in field)
        // X velocity from one noise sample
        const nx = this.sample2D(sprite.seedX, sprite.seedY, time);

        // Y velocity from offset noise sample (uncorrelated)
        const ny = this.sample2D(
            sprite.seedX + 10000,
            sprite.seedY + 10000,
            time
        );

        // Convert 0-1 noise to -0.5 to +0.5 velocity
        // Then scale by sprite's maximum speed
        return {
            x: (nx - 0.5) * sprite.maxSpeed,
            y: (ny - 0.5) * sprite.maxSpeed
        };
    }

    /**
     * Get drift velocity with custom direction offset
     * Useful for creating spiral or circular patterns
     * @param {number} seedX - X position in noise field
     * @param {number} seedY - Y position in noise field
     * @param {number} maxSpeed - Maximum drift speed (px/frame)
     * @param {number} time - Current time value
     * @param {number} angleOffset - Additional angle offset (radians)
     * @returns {Object} Velocity vector { x, y }
     */
    getDriftVelocityWithAngle(seedX, seedY, maxSpeed, time, angleOffset = 0) {
        // Get base drift
        const nx = this.sample2D(seedX, seedY, time);
        const ny = this.sample2D(seedX + 10000, seedY + 10000, time);

        // Convert to angle and magnitude
        let angle = (nx * Math.PI * 2) + angleOffset;
        let magnitude = ny * maxSpeed;

        return {
            x: Math.cos(angle) * magnitude,
            y: Math.sin(angle) * magnitude
        };
    }

    /**
     * Update time offset for animation
     * Call once per frame
     * @param {number} deltaTime - Time elapsed since last frame (milliseconds)
     */
    update(deltaTime) {
        this.timeOffset += deltaTime;
    }

    /**
     * Get current time offset
     * @returns {number} Current time offset
     */
    getTime() {
        return this.timeOffset;
    }

    /**
     * Reset time offset
     */
    resetTime() {
        this.timeOffset = 0;
    }

    /**
     * Change seed for different noise patterns
     * @param {number} newSeed - New random seed
     */
    setSeed(newSeed) {
        this.seed = newSeed;
    }

    /**
     * Get a noise value mapped to a specific range
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} time - Current time value
     * @param {number} min - Minimum output value
     * @param {number} max - Maximum output value
     * @returns {number} Mapped noise value
     */
    sampleMapped(x, y, time, min, max) {
        const n = this.sample2D(x, y, time);
        return min + n * (max - min);
    }

    /**
     * Visualize noise field (for debugging)
     * @param {p5} p - P5.js instance
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {number} resolution - Sample resolution (pixels per sample)
     * @param {number} time - Current time value
     */
    visualize(p, width, height, resolution = 10, time = 0) {
        p.loadPixels();
        for (let x = 0; x < width; x += resolution) {
            for (let y = 0; y < height; y += resolution) {
                const noiseVal = this.sample2D(x, y, time);
                const brightness = noiseVal * 255;

                // Fill resolution x resolution block
                for (let dx = 0; dx < resolution; dx++) {
                    for (let dy = 0; dy < resolution; dy++) {
                        const px = x + dx;
                        const py = y + dy;
                        if (px < width && py < height) {
                            const index = (px + py * width) * 4;
                            p.pixels[index] = brightness;
                            p.pixels[index + 1] = brightness;
                            p.pixels[index + 2] = brightness;
                            p.pixels[index + 3] = 255;
                        }
                    }
                }
            }
        }
        p.updatePixels();
    }

    /**
     * Get noise scale information (for debugging)
     * @returns {Object} Noise configuration
     */
    getConfig() {
        return {
            scales: { ...this.scales },
            weights: { ...this.weights },
            timeMultipliers: { ...this.timeMultipliers },
            seed: this.seed,
            totalWeight: this.totalWeight
        };
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudNoiseEngine;
}
