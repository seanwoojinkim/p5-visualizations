/**
 * Lilypad
 * Gently floating lily pad that drifts around the pond
 */

export class Lilypad {
    /**
     * Create a new lilypad
     * @param {number} x - Initial x position
     * @param {number} y - Initial y position
     * @param {Object} image - p5.Image of the lilypad
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

        // Gentle floating velocity (very slow drift)
        const angle = p5Funcs.random(0, Math.PI * 2);
        const speed = p5Funcs.random(0.01, 0.05);
        this.velocity = p5Funcs.createVector(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );

        // Rotation
        this.rotation = p5Funcs.random(0, Math.PI * 2);
        this.rotationSpeed = p5Funcs.random(-0.002, 0.002);

        // Bobbing animation (subtle up/down motion)
        this.bobPhase = p5Funcs.random(0, Math.PI * 2);
        this.bobSpeed = p5Funcs.random(0.01, 0.03);
        this.bobAmplitude = p5Funcs.random(1, 3);

        // Size variation
        this.scale = p5Funcs.random(0.6, 1.2);

        // Opacity variation for depth
        this.opacity = p5Funcs.random(0.7, 0.95);

        // Movement variation using Perlin noise offsets
        this.noiseOffsetX = p5Funcs.random(1000);
        this.noiseOffsetY = p5Funcs.random(1000);
        this.noiseScale = 0.001; // How much noise affects movement
    }

    /**
     * Update lilypad position with gentle floating
     * @param {Function} noise - p5.noise function
     * @param {number} frameCount - Current frame count for animations
     * @param {number} sizeScale - Size scale multiplier (baseSizeScale from simulation-app)
     */
    update(noise, frameCount, sizeScale = 1.0) {
        // Apply Perlin noise for organic drift
        const noiseX = noise(this.noiseOffsetX + frameCount * this.noiseScale);
        const noiseY = noise(this.noiseOffsetY + frameCount * this.noiseScale);

        // Convert noise (0-1) to drift direction (-1 to 1)
        const driftX = (noiseX - 0.5) * 0.005;
        const driftY = (noiseY - 0.5) * 0.005;

        // Apply drift to velocity
        this.velocity.x += driftX;
        this.velocity.y += driftY;

        // Limit velocity to keep movement gentle
        const maxSpeed = 0.06;
        const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        if (speed > maxSpeed) {
            this.velocity.x = (this.velocity.x / speed) * maxSpeed;
            this.velocity.y = (this.velocity.y / speed) * maxSpeed;
        }

        // Update position
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Wrap around edges (like a toroidal pond)
        // Use lilypad radius so they wrap just as they leave the visible area
        const margin = this.getRadius(sizeScale);
        if (this.position.x < -margin) this.position.x = this.canvasWidth + margin;
        if (this.position.x > this.canvasWidth + margin) this.position.x = -margin;
        if (this.position.y < -margin) this.position.y = this.canvasHeight + margin;
        if (this.position.y > this.canvasHeight + margin) this.position.y = -margin;

        // Update rotation
        this.rotation += this.rotationSpeed;

        // Update bobbing phase
        this.bobPhase += this.bobSpeed;
    }

    /**
     * Render the lilypad
     * @param {Object} context - p5 graphics context
     * @param {number} sizeScale - Size scale multiplier (baseSizeScale from simulation-app)
     */
    render(context, sizeScale = 1.0) {
        if (!this.image) return;

        // Calculate bobbing offset
        const bobOffset = Math.sin(this.bobPhase) * this.bobAmplitude;

        context.push();
        context.translate(this.position.x, this.position.y + bobOffset);
        context.rotate(this.rotation);
        context.tint(255, 255, 255, this.opacity * 255);
        context.imageMode(context.CENTER);

        // Draw lilypad (base size 70 = 30% smaller than original 100)
        // Scale by sizeScale to match pixel zoom (baseline: pixelScale=2)
        const size = 70 * this.scale * sizeScale;
        context.image(this.image, 0, 0, size, size);

        context.noTint();
        context.pop();
    }

    /**
     * Get the radius of this lilypad for collision detection
     * @param {number} sizeScale - Size scale multiplier (baseSizeScale from simulation-app)
     * @returns {number} - Radius in pixels
     */
    getRadius(sizeScale = 1.0) {
        return (70 * this.scale * sizeScale) / 2;  // Half of the size
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
