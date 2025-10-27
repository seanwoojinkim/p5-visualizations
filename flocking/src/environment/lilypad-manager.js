/**
 * Lilypad Manager
 * Manages multiple lily pads floating in the pond
 */

import { Lilypad } from './lilypad.js';

export class LilypadManager {
    /**
     * Create a new lilypad manager
     * @param {Array<Object>} images - Array of preloaded p5.Image objects
     * @param {number} count - Number of lilypads to create
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {Object} p5Funcs - p5.js functions {random, createVector, noise}
     */
    constructor(images, count, width, height, p5Funcs) {
        this.images = images;
        this.p5Funcs = p5Funcs;
        this.lilypads = [];
        this.width = width;
        this.height = height;
        this.sizeScale = 1.0;  // Size scale multiplier (baseSizeScale from simulation-app)

        // Create lilypads with random positions and images
        this.createLilypads(count);
    }

    /**
     * Create lilypads at random positions
     * @param {number} count - Number of lilypads to create
     */
    createLilypads(count) {
        if (!this.images || this.images.length === 0) {
            console.warn('LilypadManager: No images loaded, cannot create lilypads');
            return;
        }

        this.lilypads = [];

        for (let i = 0; i < count; i++) {
            // Random position across the canvas
            const x = this.p5Funcs.random(0, this.width);
            const y = this.p5Funcs.random(0, this.height);

            // Randomly select an image
            const imageIndex = Math.floor(this.p5Funcs.random(0, this.images.length));
            const image = this.images[imageIndex];

            // Create lilypad
            const lilypad = new Lilypad(x, y, image, this.p5Funcs, this.width, this.height);
            this.lilypads.push(lilypad);
        }

        console.log(`🌿 Created ${this.lilypads.length} lilypads`);
    }

    /**
     * Update all lilypads
     * @param {number} frameCount - Current frame count for animations
     */
    update(frameCount) {
        const noise = this.p5Funcs.noise;

        // Apply gentle collision repulsion between lilypads
        this.applyCollisions();

        for (let lilypad of this.lilypads) {
            lilypad.update(noise, frameCount, this.sizeScale);
        }
    }

    /**
     * Apply gentle repulsion when lilypads overlap too much
     * Lilypads can overlap partially, but not penetrate past a threshold
     */
    applyCollisions() {
        const overlapAllowance = 0.4; // Allow 40% overlap before repelling

        for (let i = 0; i < this.lilypads.length; i++) {
            for (let j = i + 1; j < this.lilypads.length; j++) {
                const padA = this.lilypads[i];
                const padB = this.lilypads[j];

                // Calculate distance between centers
                const dx = padB.position.x - padA.position.x;
                const dy = padB.position.y - padA.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Calculate combined radius with overlap allowance
                const radiusA = padA.getRadius(this.sizeScale);
                const radiusB = padB.getRadius(this.sizeScale);
                const minDistance = (radiusA + radiusB) * (1 - overlapAllowance);

                // If overlapping too much, apply gentle repulsion
                if (distance < minDistance && distance > 0) {
                    // Calculate repulsion force (very gentle)
                    const overlap = minDistance - distance;
                    const repulsionStrength = 0.002; // Very gentle push
                    const force = (overlap / minDistance) * repulsionStrength;

                    // Normalize direction vector
                    const dirX = dx / distance;
                    const dirY = dy / distance;

                    // Apply force in opposite directions
                    padA.velocity.x -= dirX * force;
                    padA.velocity.y -= dirY * force;
                    padB.velocity.x += dirX * force;
                    padB.velocity.y += dirY * force;
                }
            }
        }
    }

    /**
     * Render all lilypads
     * @param {Object} context - p5 graphics context (pixel buffer or main canvas)
     */
    render(context) {
        for (let lilypad of this.lilypads) {
            lilypad.render(context, this.sizeScale);
        }
    }

    /**
     * Set the size scale multiplier
     * @param {number} scale - Size scale multiplier (baseSizeScale from simulation-app)
     */
    setSizeScale(scale) {
        this.sizeScale = scale;
    }

    /**
     * Update canvas dimensions when window resizes
     * @param {number} width - New canvas width
     * @param {number} height - New canvas height
     */
    resize(width, height) {
        this.width = width;
        this.height = height;

        for (let lilypad of this.lilypads) {
            lilypad.resize(width, height);
        }
    }

    /**
     * Adjust the number of lilypads
     * @param {number} newCount - New number of lilypads
     */
    setCount(newCount) {
        if (newCount > this.lilypads.length) {
            // Add more lilypads
            const toAdd = newCount - this.lilypads.length;
            for (let i = 0; i < toAdd; i++) {
                const x = this.p5Funcs.random(0, this.width);
                const y = this.p5Funcs.random(0, this.height);
                const imageIndex = Math.floor(this.p5Funcs.random(0, this.images.length));
                const image = this.images[imageIndex];
                const lilypad = new Lilypad(x, y, image, this.p5Funcs, this.width, this.height);
                this.lilypads.push(lilypad);
            }
        } else if (newCount < this.lilypads.length) {
            // Remove lilypads
            this.lilypads = this.lilypads.slice(0, newCount);
        }
    }
}
