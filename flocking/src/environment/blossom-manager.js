/**
 * Blossom Manager
 * Manages cherry blossom petals falling and floating in the pond
 */

import { Blossom } from './blossom.js';

export class BlossomManager {
    /**
     * Create a new blossom manager
     * @param {Array<Object>} images - Array of preloaded p5.Image objects
     * @param {number} spawnRate - Frames between spawning new blossoms (lower = more frequent)
     * @param {number} maxBlossoms - Maximum number of blossoms on screen
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {Object} p5Funcs - p5.js functions {random, createVector}
     */
    constructor(images, spawnRate, maxBlossoms, width, height, p5Funcs) {
        this.images = images;
        this.p5Funcs = p5Funcs;
        this.blossoms = [];
        this.width = width;
        this.height = height;
        this.spawnRate = spawnRate;
        this.maxBlossoms = maxBlossoms;
        this.framesSinceLastSpawn = 0;
        this.sizeScale = 1.0;  // Size scale multiplier (baseSizeScale from simulation-app)

        if (!this.images || this.images.length === 0) {
            console.warn('BlossomManager: No images loaded, cannot create blossoms');
        }
    }

    /**
     * Update all blossoms and spawn new ones
     * @param {number} frameCount - Current frame count for animations
     */
    update(frameCount) {
        // Spawn new blossoms if needed
        this.framesSinceLastSpawn++;
        if (this.framesSinceLastSpawn >= this.spawnRate && this.blossoms.length < this.maxBlossoms) {
            this.spawnBlossom();
            this.framesSinceLastSpawn = 0;
        }

        // Update all blossoms
        for (let blossom of this.blossoms) {
            blossom.update(frameCount);
        }

        // Remove dead blossoms
        this.blossoms = this.blossoms.filter(b => !b.shouldRemove());
    }

    /**
     * Spawn a new blossom at a random position (top-down view - already on water)
     */
    spawnBlossom() {
        if (!this.images || this.images.length === 0) {
            return;
        }

        // Random position with margin from edges to prevent immediate wrapping
        const margin = 50;
        const x = this.p5Funcs.random(margin, this.width - margin);
        const y = this.p5Funcs.random(margin, this.height - margin);

        // Randomly select an image
        const imageIndex = Math.floor(this.p5Funcs.random(0, this.images.length));
        const image = this.images[imageIndex];

        // Create blossom
        const blossom = new Blossom(x, y, image, this.p5Funcs, this.width, this.height);
        this.blossoms.push(blossom);
    }

    /**
     * Render all blossoms
     * @param {Object} context - p5 graphics context (pixel buffer or main canvas)
     */
    render(context) {
        for (let blossom of this.blossoms) {
            blossom.render(context, this.sizeScale);
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

        for (let blossom of this.blossoms) {
            blossom.resize(width, height);
        }
    }

    /**
     * Adjust the spawn rate
     * @param {number} newRate - New spawn rate (frames between spawns)
     */
    setSpawnRate(newRate) {
        this.spawnRate = newRate;
    }

    /**
     * Adjust the maximum number of blossoms
     * @param {number} newMax - New maximum
     */
    setMaxBlossoms(newMax) {
        this.maxBlossoms = newMax;
    }

    /**
     * Clear all blossoms
     */
    clear() {
        this.blossoms = [];
    }

    /**
     * Get current blossom count
     * @returns {number}
     */
    getCount() {
        return this.blossoms.length;
    }
}
