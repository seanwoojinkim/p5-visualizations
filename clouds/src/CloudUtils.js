/**
 * CloudUtils.js
 * Utility functions for cloud visualization system
 *
 * Provides:
 * - Color interpolation and manipulation
 * - Exponential moving average for smooth transitions
 * - Math helpers for animation
 */

class CloudUtils {
    /**
     * Linear interpolation between two values
     * @param {number} start - Start value
     * @param {number} end - End value
     * @param {number} t - Interpolation factor [0, 1]
     * @returns {number} Interpolated value
     */
    static lerp(start, end, t) {
        return start + (end - start) * t;
    }

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Map a value from one range to another
     * @param {number} value - Input value
     * @param {number} inMin - Input range minimum
     * @param {number} inMax - Input range maximum
     * @param {number} outMin - Output range minimum
     * @param {number} outMax - Output range maximum
     * @returns {number} Mapped value
     */
    static map(value, inMin, inMax, outMin, outMax) {
        const t = (value - inMin) / (inMax - inMin);
        return outMin + t * (outMax - outMin);
    }

    /**
     * Interpolate between two RGB colors
     * @param {Object} colorA - Start color { r, g, b }
     * @param {Object} colorB - End color { r, g, b }
     * @param {number} t - Interpolation factor [0, 1]
     * @returns {Object} Interpolated color { r, g, b }
     */
    static lerpColor(colorA, colorB, t) {
        return {
            r: Math.round(this.lerp(colorA.r, colorB.r, t)),
            g: Math.round(this.lerp(colorA.g, colorB.g, t)),
            b: Math.round(this.lerp(colorA.b, colorB.b, t))
        };
    }

    /**
     * Smoothly interpolate a color toward a target color
     * Uses the current color as base, moves toward target by t amount
     * @param {Object} currentColor - Current color { r, g, b }
     * @param {Object} targetColor - Target color { r, g, b }
     * @param {number} t - Amount to move toward target [0, 1]
     * @returns {Object} New color { r, g, b }
     */
    static lerpColorToward(currentColor, targetColor, t) {
        return this.lerpColor(currentColor, targetColor, t);
    }

    /**
     * Exponential moving average for smooth parameter transitions
     * Commonly used for biofeedback parameter smoothing
     * @param {number} current - Current value
     * @param {number} target - Target value
     * @param {number} smoothing - Smoothing factor [0, 1] (higher = faster response)
     * @returns {number} Smoothed value
     */
    static exponentialMovingAverage(current, target, smoothing) {
        return current + (target - current) * smoothing;
    }

    /**
     * Create an exponential moving average smoother object
     * Maintains state for smooth transitions over time
     * @param {number} initialValue - Starting value
     * @param {number} smoothingFactor - Smoothing factor [0, 1] (default: 0.05)
     * @returns {Object} Smoother object with update() and getValue() methods
     */
    static createSmoother(initialValue = 0, smoothingFactor = 0.05) {
        return {
            current: initialValue,
            target: initialValue,
            smoothing: smoothingFactor,

            update(newTarget) {
                this.target = newTarget;
                this.current = CloudUtils.exponentialMovingAverage(
                    this.current,
                    this.target,
                    this.smoothing
                );
            },

            getValue() {
                return this.current;
            },

            setValue(value) {
                this.current = value;
                this.target = value;
            },

            setSmoothingFactor(factor) {
                this.smoothing = CloudUtils.clamp(factor, 0, 1);
            }
        };
    }

    /**
     * Convert RGB color to HSL
     * @param {Object} rgb - Color { r, g, b } with values 0-255
     * @returns {Object} HSL color { h, s, l } with h: 0-360, s/l: 0-1
     */
    static rgbToHsl(rgb) {
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;

        if (max === min) {
            return { h: 0, s: 0, l };
        }

        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        let h;
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }

        return { h: h * 360, s, l };
    }

    /**
     * Convert HSL color to RGB
     * @param {Object} hsl - Color { h, s, l } with h: 0-360, s/l: 0-1
     * @returns {Object} RGB color { r, g, b } with values 0-255
     */
    static hslToRgb(hsl) {
        const h = hsl.h / 360;
        const s = hsl.s;
        const l = hsl.l;

        if (s === 0) {
            const gray = Math.round(l * 255);
            return { r: gray, g: gray, b: gray };
        }

        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        return {
            r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
            g: Math.round(hue2rgb(p, q, h) * 255),
            b: Math.round(hue2rgb(p, q, h - 1/3) * 255)
        };
    }

    /**
     * Adjust color warmth (shift toward warm or cool tones)
     * @param {Object} color - Base color { r, g, b }
     * @param {number} warmth - Warmth factor [-1, 1] (negative = cool, positive = warm)
     * @returns {Object} Adjusted color { r, g, b }
     */
    static adjustWarmth(color, warmth) {
        const hsl = this.rgbToHsl(color);

        // Shift hue toward warm (oranges) or cool (blues)
        if (warmth > 0) {
            // Warm: shift toward orange (30°)
            hsl.h = this.lerp(hsl.h, 30, warmth * 0.3);
        } else {
            // Cool: shift toward blue (210°)
            hsl.h = this.lerp(hsl.h, 210, Math.abs(warmth) * 0.3);
        }

        return this.hslToRgb(hsl);
    }

    /**
     * Calculate distance between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Distance
     */
    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Normalize a vector
     * @param {Object} vector - Vector { x, y }
     * @returns {Object} Normalized vector { x, y }
     */
    static normalize(vector) {
        const mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        if (mag === 0) return { x: 0, y: 0 };
        return {
            x: vector.x / mag,
            y: vector.y / mag
        };
    }

    /**
     * Get random value from Gaussian (normal) distribution
     * Uses Box-Muller transform
     * @param {number} mean - Mean value (default: 0)
     * @param {number} stdDev - Standard deviation (default: 1)
     * @returns {number} Random value from Gaussian distribution
     */
    static randomGaussian(mean = 0, stdDev = 1) {
        // Use P5.js randomGaussian if available
        if (typeof randomGaussian !== 'undefined') {
            return randomGaussian(mean, stdDev);
        }

        // Otherwise use Box-Muller transform
        let u1 = Math.random();
        let u2 = Math.random();

        // Ensure u1 is not 0 (would cause log(0))
        while (u1 === 0) u1 = Math.random();

        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return z0 * stdDev + mean;
    }

    /**
     * Ease in-out cubic interpolation
     * Provides smooth acceleration/deceleration
     * @param {number} t - Input value [0, 1]
     * @returns {number} Eased value [0, 1]
     */
    static easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /**
     * Ease out exponential interpolation
     * Quick start, slow finish
     * @param {number} t - Input value [0, 1]
     * @returns {number} Eased value [0, 1]
     */
    static easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    /**
     * Create a color from hex string
     * @param {string} hex - Hex color string (e.g., '#FF5533' or 'FF5533')
     * @returns {Object} RGB color { r, g, b }
     */
    static hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace(/^#/, '');

        // Parse hex values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return { r, g, b };
    }

    /**
     * Convert RGB color to hex string
     * @param {Object} rgb - Color { r, g, b }
     * @returns {string} Hex color string (e.g., '#FF5533')
     */
    static rgbToHex(rgb) {
        const toHex = (n) => {
            const hex = Math.round(n).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return '#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
    }

    /**
     * Create a time-based oscillator (sine wave)
     * Useful for gentle pulsing/breathing effects
     * @param {number} time - Current time (milliseconds)
     * @param {number} frequency - Oscillation frequency (Hz)
     * @param {number} amplitude - Oscillation amplitude (default: 1)
     * @param {number} offset - Vertical offset (default: 0)
     * @returns {number} Oscillator value
     */
    static oscillate(time, frequency, amplitude = 1, offset = 0) {
        return offset + amplitude * Math.sin(2 * Math.PI * frequency * time / 1000);
    }

    /**
     * Calculate smooth step interpolation (Hermite interpolation)
     * @param {number} edge0 - Lower edge
     * @param {number} edge1 - Upper edge
     * @param {number} x - Input value
     * @returns {number} Smooth step value [0, 1]
     */
    static smoothstep(edge0, edge1, x) {
        const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    }

    /**
     * Get luminance of an RGB color (perceived brightness)
     * @param {Object} rgb - Color { r, g, b }
     * @returns {number} Luminance value [0, 1]
     */
    static getLuminance(rgb) {
        // Use relative luminance formula (sRGB)
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudUtils;
}
