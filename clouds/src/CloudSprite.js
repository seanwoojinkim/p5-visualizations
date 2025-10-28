/**
 * CloudSprite.js
 * Individual cloud particle with soft radial gradient rendering
 *
 * Design principle: Soft-edged circles that blend seamlessly, not hard geometric shapes
 * Key requirement: No visible concentric rings - must use smooth radial gradients
 */

class CloudSprite {
    /**
     * Create a cloud sprite
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {Object} layer - Parent layer reference
     * @param {Object} params - Configuration parameters
     * @param {number} params.baseScale - Base size in pixels
     * @param {number} params.baseOpacity - Base opacity (0-1)
     * @param {Object} params.baseColor - Base color { r, g, b }
     * @param {number} params.movementSpeed - Maximum drift speed (px/frame)
     */
    constructor(x, y, layer, params) {
        // Position
        this.pos = { x, y };

        // Fixed seed position in noise field (doesn't change)
        // This determines the sprite's path through the drift field
        this.seedX = x;
        this.seedY = y;

        // Layer context
        this.layer = layer;
        this.depth = layer ? layer.depth : 0.5;

        // Visual properties - size variation for natural appearance
        // Each sprite is 70-130% of base scale for organic distribution
        const sizeVariation = 0.7 + Math.random() * 0.6;
        this.baseScale = params.baseScale * sizeVariation;
        this.scale = this.baseScale; // Current scale (can be modulated)

        // Opacity with variation
        this.baseOpacity = params.baseOpacity || 0.8;
        this.opacity = this.baseOpacity;

        // Color (will be tinted by biofeedback in Phase 3)
        this.baseColor = params.baseColor || { r: 240, g: 245, b: 250 };
        this.color = { ...this.baseColor };

        // Movement
        this.maxSpeed = params.movementSpeed || 0.3;

        // Biofeedback modulation (set by BiofeedbackMapper in Phase 3)
        this.glowRadius = 1.0;

        // Pre-rendered gradient buffer for smooth rendering
        // This avoids concentric ring artifacts from drawing multiple circles
        this.gradientBuffer = null;
        this.bufferSize = 0;
        this.bufferNeedsUpdate = true;
    }

    /**
     * Update sprite position and visual properties
     * @param {CloudNoiseEngine} noiseEngine - Noise engine for drift calculation
     * @param {number} time - Current time offset
     * @param {Object} biofeedbackParams - Visual parameters from biofeedback mapper
     * @param {number} canvasWidth - Canvas width for edge wrapping
     * @param {number} canvasHeight - Canvas height for edge wrapping
     */
    update(noiseEngine, time, biofeedbackParams, canvasWidth, canvasHeight) {
        // Get drift velocity from noise field
        const drift = noiseEngine.getDriftVelocity(this, time);

        // Apply movement speed modulation from biofeedback
        // In Phase 3, high coherence = slower movement (more stillness)
        const speedMod = biofeedbackParams?.movementSpeed || 1.0;
        this.pos.x += drift.x * speedMod;
        this.pos.y += drift.y * speedMod;

        // Wrap around edges seamlessly
        // Add buffer zone so sprites don't pop in/out at edges
        const buffer = this.scale * 2;
        if (this.pos.x < -buffer) this.pos.x += canvasWidth + buffer * 2;
        if (this.pos.x > canvasWidth + buffer) this.pos.x -= canvasWidth + buffer * 2;
        if (this.pos.y < -buffer) this.pos.y += canvasHeight + buffer * 2;
        if (this.pos.y > canvasHeight + buffer) this.pos.y -= canvasHeight + buffer * 2;

        // Update visual properties from biofeedback (Phase 3)
        if (biofeedbackParams) {
            this.opacity = this.baseOpacity * (biofeedbackParams.opacity || 1.0);
            this.glowRadius = biofeedbackParams.glowRadius || 1.0;

            // Color temperature shift (Phase 3)
            if (biofeedbackParams.colorTemp) {
                // Lerp toward target color temperature
                this.color = this.lerpColorToward(
                    this.baseColor,
                    biofeedbackParams.colorTemp,
                    0.3
                );
            }
        }

        // Check if buffer needs regeneration
        const targetSize = Math.ceil(this.scale * this.glowRadius * 2);
        if (this.bufferSize !== targetSize) {
            this.bufferNeedsUpdate = true;
        }
    }

    /**
     * Render sprite with soft radial gradient
     * Uses pre-rendered gradient buffer for smooth appearance without concentric rings
     * @param {p5} p5 - P5.js instance
     */
    display(p5) {
        // Skip if fully transparent
        if (this.opacity <= 0) return;

        // Calculate final radius with glow modulation
        const radius = this.scale * this.glowRadius;

        // Use graphics buffer for smooth gradient (best quality)
        // Falls back to multi-ring method if buffer approach fails
        if (this.renderWithGradient(p5, radius)) {
            return;
        }

        // Fallback: Multi-ring gradient (still good quality)
        this.renderWithRings(p5, radius);
    }

    /**
     * Render using P5.js radial gradient technique
     * This produces the smoothest results without visible rings
     * @param {p5} p5 - P5.js instance
     * @param {number} radius - Sprite radius
     * @returns {boolean} Success status
     */
    renderWithGradient(p5, radius) {
        try {
            // Create or update gradient buffer
            if (this.bufferNeedsUpdate) {
                this.createGradientBuffer(p5, radius);
            }

            if (!this.gradientBuffer) return false;

            // Apply opacity via tint
            p5.push();
            p5.tint(255, this.opacity * 255);

            // Draw centered gradient buffer
            p5.imageMode(p5.CENTER);
            p5.image(this.gradientBuffer, this.pos.x, this.pos.y);

            p5.pop();
            return true;
        } catch (error) {
            // Silently fall back to ring method
            return false;
        }
    }

    /**
     * Create pre-rendered radial gradient buffer
     * Uses pixel manipulation for perfectly smooth gradient
     * @param {p5} p5 - P5.js instance
     * @param {number} radius - Sprite radius
     */
    createGradientBuffer(p5, radius) {
        const size = Math.ceil(radius * 2);
        this.bufferSize = size;

        // Create graphics buffer
        this.gradientBuffer = p5.createGraphics(size, size);

        // Draw radial gradient using pixels for maximum smoothness
        this.gradientBuffer.loadPixels();
        const centerX = size / 2;
        const centerY = size / 2;

        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                // Calculate distance from center
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Normalized distance (0 at center, 1 at edge)
                const normDist = dist / radius;

                // Smooth falloff using smoothstep for natural cloud edge
                // This creates soft, organic edges like real clouds
                let alpha;
                if (normDist >= 1.0) {
                    alpha = 0;
                } else {
                    // Smoothstep interpolation for natural falloff
                    alpha = 1.0 - this.smoothstep(0, 1, normDist);
                    // Apply additional softness with power curve
                    alpha = Math.pow(alpha, 1.5);
                }

                // Set pixel color
                const index = (x + y * size) * 4;
                this.gradientBuffer.pixels[index] = this.color.r;
                this.gradientBuffer.pixels[index + 1] = this.color.g;
                this.gradientBuffer.pixels[index + 2] = this.color.b;
                this.gradientBuffer.pixels[index + 3] = alpha * 255;
            }
        }

        this.gradientBuffer.updatePixels();
        this.bufferNeedsUpdate = false;
    }

    /**
     * Render using multi-ring technique (fallback)
     * Draws concentric circles with varying alpha for gradient effect
     * @param {p5} p5 - P5.js instance
     * @param {number} radius - Sprite radius
     */
    renderWithRings(p5, radius) {
        const rings = 30; // More rings = smoother gradient (increased from 12 to 30)
        const centerAlpha = this.opacity * 255;

        p5.push();
        p5.noStroke();

        // Draw from outside to inside for proper alpha blending
        for (let i = rings; i >= 0; i--) {
            const r = radius * (i / rings);

            // Smooth alpha falloff using smoothstep
            const t = i / rings;
            const smoothT = this.smoothstep(0, 1, t);
            const alpha = smoothT * centerAlpha;

            p5.fill(this.color.r, this.color.g, this.color.b, alpha);
            p5.circle(this.pos.x, this.pos.y, r * 2);
        }

        p5.pop();
    }

    /**
     * Smoothstep interpolation for natural falloff
     * @param {number} edge0 - Lower edge
     * @param {number} edge1 - Upper edge
     * @param {number} x - Input value
     * @returns {number} Smoothed value [0, 1]
     */
    smoothstep(edge0, edge1, x) {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }

    /**
     * Interpolate color toward target
     * @param {Object} current - Current color { r, g, b }
     * @param {Object} target - Target color { r, g, b }
     * @param {number} t - Interpolation amount [0, 1]
     * @returns {Object} Interpolated color { r, g, b }
     */
    lerpColorToward(current, target, t) {
        return {
            r: Math.round(current.r + (target.r - current.r) * t),
            g: Math.round(current.g + (target.g - current.g) * t),
            b: Math.round(current.b + (target.b - current.b) * t)
        };
    }

    /**
     * Force buffer regeneration (e.g., when color changes)
     */
    invalidateBuffer() {
        this.bufferNeedsUpdate = true;
    }

    /**
     * Cleanup resources
     */
    dispose() {
        if (this.gradientBuffer) {
            this.gradientBuffer.remove();
            this.gradientBuffer = null;
        }
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudSprite;
}
