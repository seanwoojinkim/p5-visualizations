/**
 * Brush Textures
 * Loads sumi-e brush texture images for koi rendering
 * Textures are loaded from PNG files in assets/koi/brushstrokes/
 * Implements LRU cache for pre-tinted textures to improve performance
 */

export class BrushTextures {
    constructor() {
        this.textures = {
            body: null,
            fin: null,
            tail: null,
            spots: [],  // Array of spot textures for variation
            paper: null
        };
        this.isReady = false;

        // LRU cache for pre-tinted textures (performance optimization)
        // Maps cache keys (texture+color+alpha+blendMode) to pre-tinted p5.Graphics
        this.tintCache = new Map();
        this.maxCacheSize = 200; // Limit cache to ~50MB (200 textures × 256KB avg)

        // Cache hit/miss statistics for performance monitoring
        this.cacheStats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };

        // Reference to p5 instance (needed for creating graphics buffers)
        this.p5Instance = null;
    }

    /**
     * Load brush texture images (called after p5.loadImage)
     * Textures are pre-processed offline with brightness → alpha conversion for performance
     * @param {Object} loadedImages - Object containing preloaded p5.Image objects
     */
    loadImages(loadedImages) {
        console.log('🖌️ Loading sumi-e brush textures...');

        // Load pre-processed textures (brightness already converted to alpha offline)
        this.textures.body = loadedImages.body;
        this.textures.fin = loadedImages.fin;
        this.textures.tail = loadedImages.tail;

        // Load pre-processed spot textures
        this.textures.spots = loadedImages.spots;

        this.textures.paper = loadedImages.paper;

        this.isReady = true;
        console.log(`✓ Brush textures loaded (${this.textures.spots.length} spot variations, pre-processed)`);
    }

    /**
     * Set p5 instance reference (needed for creating graphics buffers for caching)
     * Call this during setup() after p5 is initialized
     * @param {Object} p5 - p5.js instance
     */
    setP5Instance(p5) {
        this.p5Instance = p5;
    }

    /**
     * Get a pre-tinted spot texture (with LRU caching for performance)
     * @param {number} spotIndex - Which spot texture (0-4)
     * @param {Object} color - {h, s, b} HSB color to tint to
     * @param {number} alpha - Alpha value (0-255)
     * @param {string} blendMode - Blend mode ('BLEND' or 'MULTIPLY')
     * @returns {p5.Image|p5.Graphics} - Pre-tinted texture (or original if caching disabled)
     */
    getTintedSpot(spotIndex, color, alpha, blendMode = 'MULTIPLY') {
        if (!this.p5Instance || !this.textures.spots[spotIndex]) {
            // Caching not available, return original texture
            return this.textures.spots[spotIndex];
        }

        // Create cache key from parameters (rounded to reduce unique keys)
        // Round h to nearest 5°, s and b to nearest 5%
        const h = Math.round(color.h / 5) * 5;
        const s = Math.round(color.s / 5) * 5;
        const b = Math.round(color.b / 5) * 5;
        const a = Math.round(alpha / 10) * 10; // Round to nearest 10
        const cacheKey = `spot_${spotIndex}_${h}_${s}_${b}_${a}_${blendMode}`;

        // Check cache (LRU: move to end if found)
        if (this.tintCache.has(cacheKey)) {
            const cached = this.tintCache.get(cacheKey);
            // Move to end (most recently used)
            this.tintCache.delete(cacheKey);
            this.tintCache.set(cacheKey, cached);
            this.cacheStats.hits++;
            return cached;
        }

        // Cache miss: create tinted texture
        this.cacheStats.misses++;

        const sourceTexture = this.textures.spots[spotIndex];
        const tinted = this.p5Instance.createGraphics(sourceTexture.width, sourceTexture.height);

        tinted.push();
        tinted.colorMode(tinted.HSB);
        tinted.tint(color.h, color.s, color.b, alpha);
        tinted.blendMode(tinted[blendMode]);
        tinted.image(sourceTexture, 0, 0);
        tinted.noTint();
        tinted.pop();

        // Evict oldest entry if cache is full (LRU)
        if (this.tintCache.size >= this.maxCacheSize) {
            const firstKey = this.tintCache.keys().next().value;
            const removed = this.tintCache.get(firstKey);
            removed.remove(); // Free p5 graphics memory
            this.tintCache.delete(firstKey);
            this.cacheStats.evictions++;
        }

        // Add to cache
        this.tintCache.set(cacheKey, tinted);
        return tinted;
    }

    /**
     * Get a pre-tinted body texture (with LRU caching for performance)
     * @param {Object} color - {h, s, b} HSB color to tint to
     * @param {number} alpha - Alpha value (0-255)
     * @returns {p5.Image|p5.Graphics} - Pre-tinted texture
     */
    getTintedBody(color, alpha) {
        if (!this.p5Instance || !this.textures.body) {
            return this.textures.body;
        }

        // Create cache key (same rounding as spots)
        const h = Math.round(color.h / 5) * 5;
        const s = Math.round(color.s / 5) * 5;
        const b = Math.round(color.b / 5) * 5;
        const a = Math.round(alpha / 10) * 10;
        const cacheKey = `body_${h}_${s}_${b}_${a}`;

        // Check cache (LRU: move to end if found)
        if (this.tintCache.has(cacheKey)) {
            const cached = this.tintCache.get(cacheKey);
            this.tintCache.delete(cacheKey);
            this.tintCache.set(cacheKey, cached);
            this.cacheStats.hits++;
            return cached;
        }

        // Cache miss: create tinted texture
        this.cacheStats.misses++;

        const tinted = this.p5Instance.createGraphics(
            this.textures.body.width,
            this.textures.body.height
        );

        tinted.push();
        tinted.colorMode(tinted.HSB);
        tinted.tint(color.h, color.s, color.b, alpha);
        tinted.blendMode(tinted.BLEND);
        tinted.image(this.textures.body, 0, 0);
        tinted.noTint();
        tinted.pop();

        // Evict oldest if cache full
        if (this.tintCache.size >= this.maxCacheSize) {
            const firstKey = this.tintCache.keys().next().value;
            const removed = this.tintCache.get(firstKey);
            removed.remove();
            this.tintCache.delete(firstKey);
            this.cacheStats.evictions++;
        }

        this.tintCache.set(cacheKey, tinted);
        return tinted;
    }

    /**
     * Clear the tint cache (useful for memory management)
     */
    clearTintCache() {
        for (let [key, graphics] of this.tintCache.entries()) {
            graphics.remove(); // Free p5 graphics memory
        }
        this.tintCache.clear();
        console.log('✓ Tint cache cleared');
    }

    /**
     * Get cache statistics for performance monitoring
     * @returns {Object} - {hits, misses, evictions, size, hitRate}
     */
    getCacheStats() {
        const total = this.cacheStats.hits + this.cacheStats.misses;
        const hitRate = total > 0 ? ((this.cacheStats.hits / total) * 100).toFixed(1) : 0;

        return {
            ...this.cacheStats,
            size: this.tintCache.size,
            hitRate: `${hitRate}%`
        };
    }

    /**
     * Get a texture by name
     * @param {string} name - Texture name (body, fin, tail, spots, paper)
     * @returns {Object} - p5 graphics object (or array for 'spots')
     */
    get(name) {
        return this.textures[name];
    }

    /**
     * Get a random spot texture
     * @param {number} seed - Optional seed for consistent random selection (e.g., boid ID)
     * @returns {Object} - p5 Image object
     */
    getRandomSpot(seed) {
        if (!this.textures.spots || this.textures.spots.length === 0) {
            return null;
        }

        if (seed !== undefined) {
            // Use seed for consistent selection per koi
            const index = Math.floor(seed) % this.textures.spots.length;
            return this.textures.spots[index];
        } else {
            // Truly random
            const index = Math.floor(Math.random() * this.textures.spots.length);
            return this.textures.spots[index];
        }
    }

    /**
     * Get the number of available spot textures
     * @returns {number}
     */
    getSpotCount() {
        return this.textures.spots ? this.textures.spots.length : 0;
    }
}
