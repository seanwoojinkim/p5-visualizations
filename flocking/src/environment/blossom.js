/**
 * Cherry Blossom Petal
 * Top-down view: fades in, drifts with wind, then settles on water surface
 */

export class Blossom {
    /**
     * Create a new cherry blossom petal
     * @param {number} x - Initial x position
     * @param {number} y - Initial y position
     * @param {Object} image - p5.Image of the blossom petal
     * @param {Object} p5Funcs - p5.js functions {random, createVector}
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    constructor(x, y, image, p5Funcs, width, height) {
        this.position = p5Funcs.createVector(x, y);
        this.image = image;
        this.p5Funcs = p5Funcs;
        this.canvasWidth = width;
        this.canvasHeight = height;

        // Wind-driven drift (top-down view - blossoms float on water surface)
        const angle = p5Funcs.random(0, Math.PI * 2);
        const speed = p5Funcs.random(0.15, 0.3);  // Gentler initial drift speed
        this.velocity = p5Funcs.createVector(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );

        // Rotation (petals spin slowly as they drift)
        this.rotation = p5Funcs.random(0, Math.PI * 2);
        this.rotationSpeed = p5Funcs.random(-0.03, 0.03);

        // Size variation (max 30% smaller: 0.5-0.84 instead of 0.5-1.2)
        this.scale = p5Funcs.random(0.5, 0.84);

        // Opacity - starts at 0, fades in
        this.opacity = 0;
        this.targetOpacity = p5Funcs.random(0.7, 1.0);
        this.fadeInSpeed = p5Funcs.random(0.01, 0.02);

        // State: 'drifting' or 'settled'
        this.state = 'drifting';

        // Drift duration (how long before settling on water)
        this.driftTime = 0;
        this.settleDuration = p5Funcs.random(180, 300);  // 3-5 seconds at 60fps

        // Settled floating properties (very gentle after settling)
        this.settledVelocity = p5Funcs.createVector(
            p5Funcs.random(-0.03, 0.03),
            p5Funcs.random(-0.03, 0.03)
        );
    }

    /**
     * Update blossom position and state
     * @param {number} frameCount - Current frame count for animations
     */
    update(frameCount) {
        // Track lifetime for all states (fixes expiration bug)
        this.driftTime++;

        // Fade in
        if (this.opacity < this.targetOpacity) {
            this.opacity += this.fadeInSpeed;
            if (this.opacity > this.targetOpacity) {
                this.opacity = this.targetOpacity;
            }
        }

        if (this.state === 'drifting') {
            // Drift with wind, gradually slowing down
            // Calculate slow-down factor (approaches 0 as we near settle duration)
            const progress = this.driftTime / this.settleDuration;
            const slowDownFactor = 1 - (progress * 0.85);  // Slow to 15% of original speed

            // Update position with slowing velocity
            this.position.x += this.velocity.x * slowDownFactor;
            this.position.y += this.velocity.y * slowDownFactor;

            // Check if time to settle
            if (this.driftTime >= this.settleDuration) {
                this.state = 'settled';
                // Slow down rotation when settled
                this.rotationSpeed *= 0.3;
            }
        } else if (this.state === 'settled') {
            // Gentle floating after settling
            this.position.x += this.settledVelocity.x;
            this.position.y += this.settledVelocity.y;
        }

        // Update rotation
        this.rotation += this.rotationSpeed;

        // Wrap around edges (toroidal space)
        const margin = 30;
        if (this.position.x < -margin) this.position.x = this.canvasWidth + margin;
        if (this.position.x > this.canvasWidth + margin) this.position.x = -margin;
        if (this.position.y < -margin) this.position.y = this.canvasHeight + margin;
        if (this.position.y > this.canvasHeight + margin) this.position.y = -margin;
    }

    /**
     * Render the blossom petal
     * @param {Object} context - p5 graphics context
     * @param {number} sizeScale - Size scale multiplier (baseSizeScale from simulation-app)
     */
    render(context, sizeScale = 1.0) {
        if (!this.image) return;

        context.push();
        context.translate(this.position.x, this.position.y);
        context.rotate(this.rotation);
        context.tint(255, 255, 255, this.opacity * 255);
        context.imageMode(context.CENTER);

        // Draw petal (small, delicate size)
        // Scale by sizeScale to match pixel zoom (baseline: pixelScale=2)
        const size = 20 * this.scale * sizeScale;
        context.image(this.image, 0, 0, size, size);

        context.noTint();
        context.pop();
    }

    /**
     * Check if blossom should be removed
     * @returns {boolean}
     */
    shouldRemove() {
        // Remove blossoms after a long time to prevent infinite accumulation
        // 30 seconds at 60fps = 1800 frames
        const maxLifetime = 1800;
        return this.driftTime > maxLifetime;
    }

    /**
     * Update canvas dimensions if window resized
     * @param {number} width - New canvas width
     * @param {number} height - New canvas height
     */
    resize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }
}
