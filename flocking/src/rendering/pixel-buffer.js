/**
 * Pixel Buffer
 * Manages low-resolution pixel art rendering buffer
 */

export class PixelBuffer {
    /**
     * Create a new pixel buffer
     * @param {number} width - Full canvas width
     * @param {number} height - Full canvas height
     * @param {number} pixelScale - Pixel scale factor
     * @param {Function} createGraphics - p5.js createGraphics function
     * @param {Function} floor - p5.js floor function
     */
    constructor(width, height, pixelScale, createGraphics, floor) {
        this.pixelScale = pixelScale;
        this.createGraphics = createGraphics;
        this.floor = floor;
        this.buffer = this.createBuffer(width, height);
    }

    /**
     * Create the graphics buffer
     */
    createBuffer(width, height) {
        return this.createGraphics(
            this.floor(width / this.pixelScale),
            this.floor(height / this.pixelScale)
        );
    }

    /**
     * Resize the buffer
     * @param {number} width - New canvas width
     * @param {number} height - New canvas height
     */
    resize(width, height) {
        this.buffer = this.createBuffer(width, height);
    }

    /**
     * Update pixel scale and recreate buffer
     * @param {number} pixelScale - New pixel scale
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    setPixelScale(pixelScale, width, height) {
        this.pixelScale = pixelScale;
        this.resize(width, height);
    }

    /**
     * Draw background with trail effect
     * @param {number} r - Red value
     * @param {number} g - Green value
     * @param {number} b - Blue value
     * @param {number} alpha - Alpha for trail fade
     */
    drawBackground(r, g, b, alpha) {
        this.buffer.background(r, g, b, alpha);
    }

    /**
     * Render the buffer to the main canvas
     * @param {Object} canvas - Main p5 canvas or graphics context
     * @param {number} width - Target width
     * @param {number} height - Target height
     */
    render(canvas, width, height) {
        canvas.image(this.buffer, 0, 0, width, height);
    }

    /**
     * Get the graphics context for drawing
     * @returns {Object} - p5 graphics buffer
     */
    getContext() {
        return this.buffer;
    }

    /**
     * Get buffer dimensions
     * @returns {Object} - {width, height}
     */
    getDimensions() {
        return {
            width: this.buffer.width,
            height: this.buffer.height
        };
    }
}
