/**
 * Brush Textures
 * Procedurally generate sumi-e brush textures for koi rendering
 * Textures are generated once on initialization and cached
 */

export class BrushTextures {
    constructor() {
        this.textures = {
            body: null,
            fin: null,
            tail: null,
            spot: null,
            paper: null
        };
        this.isReady = false;
    }

    /**
     * Generate all brush textures
     * @param {Function} createGraphics - p5 createGraphics function
     * @param {Function} random - p5 random function
     */
    generate(createGraphics, random) {
        console.log('🖌️ Generating sumi-e brush textures...');

        this.textures.body = this.generateBodyBrush(createGraphics, random);
        this.textures.fin = this.generateFinBrush(createGraphics, random);
        this.textures.tail = this.generateTailBrush(createGraphics, random);
        this.textures.spot = this.generateSpotBrush(createGraphics, random);
        this.textures.paper = this.generatePaperGrain(createGraphics, random);

        this.isReady = true;
        console.log('✓ Brush textures generated');
    }

    /**
     * Generate body brush texture (512×256)
     * Horizontal flowing strokes with fiber detail
     */
    generateBodyBrush(createGraphics, random) {
        const pg = createGraphics(512, 256);
        pg.background(255);
        pg.noStroke();

        // Create flowing horizontal brush strokes with fiber texture
        // Much lighter for subtle effect
        for (let i = 0; i < 400; i++) {
            const x = random(0, 512);
            const y = random(0, 256);
            const len = random(20, 80);
            const thickness = random(1, 4);
            const alpha = random(5, 35); // Reduced from 30-150

            pg.fill(0, alpha);
            pg.ellipse(x, y, len, thickness);
        }

        // Add fiber detail - very subtle
        for (let i = 0; i < 800; i++) {
            const x = random(0, 512);
            const y = random(0, 256);
            const alpha = random(3, 20); // Reduced from 10-60
            pg.fill(0, alpha);
            pg.ellipse(x, y, random(1, 3), random(0.5, 2));
        }

        // Add noise for organic texture
        pg.loadPixels();
        for (let i = 0; i < pg.pixels.length; i += 4) {
            const noise = random(-15, 15);
            pg.pixels[i] = Math.max(0, Math.min(255, pg.pixels[i] + noise));
            pg.pixels[i + 1] = Math.max(0, Math.min(255, pg.pixels[i + 1] + noise));
            pg.pixels[i + 2] = Math.max(0, Math.min(255, pg.pixels[i + 2] + noise));
        }
        pg.updatePixels();

        return pg;
    }

    /**
     * Generate fin brush texture (256×128)
     * Delicate, wispy strokes
     */
    generateFinBrush(createGraphics, random) {
        const pg = createGraphics(256, 128);
        pg.background(255);
        pg.noStroke();

        // Delicate, wispy strokes for fins - very light
        for (let i = 0; i < 150; i++) {
            const x = random(0, 256);
            const y = random(0, 128);
            const len = random(10, 40);
            const thickness = random(0.5, 2);
            const alpha = random(5, 30); // Reduced from 20-100

            pg.fill(0, alpha);
            pg.ellipse(x, y, len, thickness);
        }

        // Subtle fiber detail
        for (let i = 0; i < 250; i++) {
            const x = random(0, 256);
            const y = random(0, 128);
            const alpha = random(2, 15); // Reduced from 5-40
            pg.fill(0, alpha);
            pg.ellipse(x, y, random(1, 2), random(0.3, 1));
        }

        return pg;
    }

    /**
     * Generate tail brush texture (512×128)
     * Flowing, dynamic strokes
     */
    generateTailBrush(createGraphics, random) {
        const pg = createGraphics(512, 128);
        pg.background(255);
        pg.noStroke();

        // Flowing, dynamic strokes for tail - lighter
        for (let i = 0; i < 300; i++) {
            const x = random(0, 512);
            const y = random(0, 128);
            const len = random(30, 120);
            const thickness = random(1, 5);
            const alpha = random(5, 40); // Reduced from 25-140

            pg.fill(0, alpha);
            pg.ellipse(x, y, len, thickness);
        }

        // Add flowing detail - subtle
        for (let i = 0; i < 500; i++) {
            const x = random(0, 512);
            const y = random(0, 128);
            const alpha = random(3, 20); // Reduced from 10-50
            pg.fill(0, alpha);
            pg.ellipse(x, y, random(2, 5), random(0.5, 2));
        }

        return pg;
    }

    /**
     * Generate spot brush texture (256×256)
     * Organic circular texture with soft edges
     */
    generateSpotBrush(createGraphics, random) {
        const pg = createGraphics(256, 256);
        pg.background(255);
        pg.noStroke();

        // Organic spot texture with soft edges - very subtle
        const centerX = 128;
        const centerY = 128;

        for (let i = 0; i < 300; i++) {
            const angle = random(0, Math.PI * 2);
            const radius = random(0, 80);
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            const size = random(3, 15);
            const alpha = random(5, 40) * (1 - radius / 80); // Reduced from 40-150

            pg.fill(0, alpha);
            pg.ellipse(x, y, size, size);
        }

        return pg;
    }

    /**
     * Generate paper grain texture (1024×1024)
     * Fine paper texture for background overlay
     */
    generatePaperGrain(createGraphics, random) {
        const pg = createGraphics(1024, 1024);
        pg.background(255);
        pg.noStroke();

        // Fine paper grain texture
        for (let i = 0; i < 8000; i++) {
            const x = random(0, 1024);
            const y = random(0, 1024);
            const size = random(0.5, 2);
            const alpha = random(5, 25);

            pg.fill(0, alpha);
            pg.ellipse(x, y, size, size);
        }

        // Add subtle fiber patterns
        for (let i = 0; i < 2000; i++) {
            const x = random(0, 1024);
            const y = random(0, 1024);
            const len = random(2, 8);
            const alpha = random(3, 15);

            pg.fill(0, alpha);
            pg.ellipse(x, y, len, 1);
        }

        // Gentle noise
        pg.loadPixels();
        for (let i = 0; i < pg.pixels.length; i += 4) {
            const noise = random(-8, 8);
            pg.pixels[i] = Math.max(0, Math.min(255, pg.pixels[i] + noise));
            pg.pixels[i + 1] = Math.max(0, Math.min(255, pg.pixels[i + 1] + noise));
            pg.pixels[i + 2] = Math.max(0, Math.min(255, pg.pixels[i + 2] + noise));
        }
        pg.updatePixels();

        return pg;
    }

    /**
     * Get a texture by name
     * @param {string} name - Texture name (body, fin, tail, spot, paper)
     * @returns {Object} - p5 graphics object
     */
    get(name) {
        return this.textures[name];
    }
}
