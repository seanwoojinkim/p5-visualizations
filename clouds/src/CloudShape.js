/**
 * CloudShape.js
 * Represents a discrete cloud "base mesh" - the fundamental unit that defines
 * where a cloud exists in space.
 *
 * This aligns with Blender's approach:
 * 1. Base mesh surface (sphere/ellipse) defines the cloud boundary
 * 2. Particles are distributed ON/WITHIN this shape
 * 3. Noise adds variation, not the primary structure
 */

class CloudShape {
    /**
     * Create a cloud base shape
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {Object} params - Shape parameters
     * @param {number} params.width - Shape width
     * @param {number} params.height - Shape height
     * @param {number} params.rotation - Rotation in radians
     * @param {string} params.type - Shape type ('ellipse' or 'circle')
     */
    constructor(x, y, params = {}) {
        this.center = { x, y };
        this.width = params.width || 200;
        this.height = params.height || 150;
        this.rotation = params.rotation || 0;
        this.type = params.type || 'ellipse';

        // Seed for this specific cloud shape (for noise variation)
        this.seed = params.seed || Math.floor(Math.random() * 10000);
    }

    /**
     * Check if a point is inside this cloud shape
     * @param {number} x - Point X
     * @param {number} y - Point Y
     * @param {number} falloff - Distance falloff (0-1, where 1 = include edge region)
     * @returns {number} - Distance from center normalized (0 = center, 1 = edge, >1 = outside)
     */
    contains(x, y, falloff = 1.0) {
        // Translate point to shape-local coordinates
        const dx = x - this.center.x;
        const dy = y - this.center.y;

        // Rotate point by inverse rotation
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;

        // Ellipse equation: (x/a)^2 + (y/b)^2 <= 1
        const normalizedDist = Math.sqrt(
            (rx * rx) / ((this.width * falloff / 2) ** 2) +
            (ry * ry) / ((this.height * falloff / 2) ** 2)
        );

        return normalizedDist;
    }

    /**
     * Sample points within this cloud shape
     * @param {number} count - Number of points to generate
     * @param {Object} noiseEngine - Noise engine for variation
     * @returns {Array<{x, y, density}>} - Array of sample points with density values
     */
    samplePoints(count, noiseEngine) {
        const points = [];
        const attempts = count * 3; // Try 3x to account for rejection

        for (let i = 0; i < attempts && points.length < count; i++) {
            // Random point in bounding box
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.sqrt(Math.random()); // Sqrt for uniform distribution in circle

            // Scale by ellipse dimensions
            const x = this.center.x + radius * (this.width / 2) * Math.cos(angle + this.rotation);
            const y = this.center.y + radius * (this.height / 2) * Math.sin(angle + this.rotation);

            // Check if inside shape
            const dist = this.contains(x, y, 1.0);

            if (dist <= 1.0) {
                // Sample noise for density variation within cloud
                const noiseDensity = noiseEngine.sample2D(
                    x + this.seed,
                    y + this.seed,
                    0
                );

                // Density falloff from center (clouds are denser in center)
                const centerFalloff = 1.0 - Math.pow(dist, 0.5);
                const finalDensity = noiseDensity * centerFalloff;

                points.push({
                    x,
                    y,
                    density: finalDensity,
                    distFromCenter: dist
                });
            }
        }

        return points;
    }

    /**
     * Generate points on a grid within this shape
     * More efficient than random sampling for dense clouds
     * @param {number} gridResolution - Spacing between grid points
     * @param {Object} noiseEngine - Noise engine for variation
     * @returns {Array<{x, y, density}>} - Array of sample points
     */
    sampleGridPoints(gridResolution, noiseEngine) {
        const points = [];

        // Bounding box
        const minX = this.center.x - this.width / 2;
        const maxX = this.center.x + this.width / 2;
        const minY = this.center.y - this.height / 2;
        const maxY = this.center.y + this.height / 2;

        // Sample grid
        for (let x = minX; x <= maxX; x += gridResolution) {
            for (let y = minY; y <= maxY; y += gridResolution) {
                const dist = this.contains(x, y, 1.0);

                if (dist <= 1.0) {
                    // Sample noise for density variation
                    const noiseDensity = noiseEngine.sample2D(
                        x + this.seed,
                        y + this.seed,
                        0
                    );

                    // Center falloff
                    const centerFalloff = 1.0 - Math.pow(dist, 0.5);
                    const finalDensity = noiseDensity * centerFalloff;

                    points.push({
                        x,
                        y,
                        density: finalDensity,
                        distFromCenter: dist
                    });
                }
            }
        }

        return points;
    }

    /**
     * Get info for debugging
     * @returns {Object} Shape information
     */
    getInfo() {
        return {
            center: { ...this.center },
            width: this.width,
            height: this.height,
            rotation: this.rotation,
            type: this.type,
            seed: this.seed,
            area: Math.PI * (this.width / 2) * (this.height / 2)
        };
    }

    /**
     * Draw shape outline for debugging
     * @param {p5} p5 - P5.js instance
     */
    debugDraw(p5) {
        p5.push();
        p5.noFill();
        p5.stroke(255, 0, 0, 100);
        p5.strokeWeight(2);
        p5.translate(this.center.x, this.center.y);
        p5.rotate(this.rotation);
        p5.ellipse(0, 0, this.width, this.height);

        // Draw center point
        p5.fill(255, 0, 0, 150);
        p5.noStroke();
        p5.circle(0, 0, 5);

        p5.pop();
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudShape;
}
