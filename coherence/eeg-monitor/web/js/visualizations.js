/**
 * Visualizations Module
 *
 * Canvas-based visualizations for EEG neurofeedback:
 * - Score gauge (circular progress)
 * - Band power bars
 * - Real-time waveform display
 */

import { getScoreColor } from './protocol-info.js';

/**
 * Score Gauge Renderer
 * Renders a circular gauge showing the neurofeedback score (0-100)
 */
export class ScoreGauge {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas element not found: ${canvasId}`);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.targetScore = 0;
        this.level = 'low';
        this.animationSpeed = 0.1;

        // Gauge configuration
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.radius = Math.min(this.centerX, this.centerY) - 20;
        this.lineWidth = 20;
    }

    /**
     * Update gauge with new score
     *
     * @param {number} score - Score value (0-100)
     * @param {string} level - Feedback level for color coding
     */
    update(score, level = 'low') {
        this.targetScore = Math.max(0, Math.min(100, score));
        this.level = level;
    }

    /**
     * Render the gauge (call in animation loop)
     */
    render() {
        if (!this.ctx) return;

        // Smooth animation towards target
        const diff = this.targetScore - this.score;
        this.score += diff * this.animationSpeed;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background arc
        this._drawArc(0, 360, 'rgba(255, 255, 255, 0.1)', this.lineWidth);

        // Draw score arc
        const angle = (this.score / 100) * 270; // 270 degrees max
        const startAngle = 135; // Start at bottom-left
        const color = getScoreColor(this.level);
        this._drawArc(startAngle, startAngle + angle, color, this.lineWidth);

        // Draw center circle
        this._drawCenterCircle();

        // Add glow effect for high scores
        if (this.score > 70) {
            this._drawGlow(color);
        }
    }

    /**
     * Draw an arc
     * @private
     */
    _drawArc(startAngle, endAngle, color, lineWidth) {
        this.ctx.beginPath();
        this.ctx.arc(
            this.centerX,
            this.centerY,
            this.radius,
            this._toRadians(startAngle),
            this._toRadians(endAngle)
        );
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
    }

    /**
     * Draw center circle background
     * @private
     */
    _drawCenterCircle() {
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius - this.lineWidth, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(22, 33, 62, 0.8)';
        this.ctx.fill();
    }

    /**
     * Draw glow effect
     * @private
     */
    _drawGlow(color) {
        const gradient = this.ctx.createRadialGradient(
            this.centerX, this.centerY, this.radius - this.lineWidth,
            this.centerX, this.centerY, this.radius + 20
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, color + '20');

        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius + 20, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }

    /**
     * Convert degrees to radians
     * @private
     */
    _toRadians(degrees) {
        return (degrees - 90) * (Math.PI / 180);
    }
}

/**
 * Band Power Bars Renderer
 * Renders horizontal bars for each frequency band
 */
export class BandPowerBars {
    constructor() {
        this.bands = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
        this.values = {
            delta: 0,
            theta: 0,
            alpha: 0,
            beta: 0,
            gamma: 0
        };
        this.targetValues = { ...this.values };
        this.maxValue = 100; // Auto-scaling max
        this.animationSpeed = 0.15;
    }

    /**
     * Update band powers
     *
     * @param {Object} powers - Band power values
     */
    update(powers) {
        this.bands.forEach(band => {
            if (powers[band] !== undefined) {
                this.targetValues[band] = powers[band];

                // Auto-scale to max observed value
                if (powers[band] > this.maxValue) {
                    this.maxValue = powers[band] * 1.2;
                }
            }
        });
    }

    /**
     * Render bars (updates DOM elements)
     */
    render() {
        this.bands.forEach(band => {
            // Smooth animation
            const diff = this.targetValues[band] - this.values[band];
            this.values[band] += diff * this.animationSpeed;

            // Update bar width
            const percentage = (this.values[band] / this.maxValue) * 100;
            const barElement = document.getElementById(`band-bar-${band}`);
            if (barElement) {
                barElement.style.width = `${Math.min(100, percentage)}%`;
            }

            // Update value text
            const valueElement = document.getElementById(`band-value-${band}`);
            if (valueElement) {
                valueElement.textContent = this.values[band].toFixed(2);
            }
        });
    }

    /**
     * Reset max value (for auto-scaling)
     */
    resetScale() {
        this.maxValue = 100;
    }
}

/**
 * EEG Waveform Renderer
 * Renders real-time EEG waveform display
 */
export class WaveformDisplay {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas element not found: ${canvasId}`);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.options = {
            channels: 4,
            bufferSize: 512,
            lineWidth: 2,
            colors: ['#0984e3', '#00b894', '#fdcb6e', '#e17055'],
            ...options
        };

        // Data buffers for each channel
        this.buffers = {
            'TP9': [],
            'AF7': [],
            'AF8': [],
            'TP10': []
        };

        this.channelNames = ['TP9', 'AF7', 'AF8', 'TP10'];
        this.isEnabled = true;
    }

    /**
     * Add new sample data
     *
     * @param {Object} channelData - Data for each channel
     */
    addSample(channelData) {
        if (!this.isEnabled) return;

        this.channelNames.forEach(channel => {
            if (channelData[channel] !== undefined) {
                this.buffers[channel].push(channelData[channel]);

                // Maintain buffer size
                if (this.buffers[channel].length > this.options.bufferSize) {
                    this.buffers[channel].shift();
                }
            }
        });
    }

    /**
     * Render waveforms
     */
    render() {
        if (!this.ctx || !this.isEnabled) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background grid
        this._drawGrid();

        // Calculate channel height
        const channelHeight = this.canvas.height / this.channelNames.length;

        // Draw each channel
        this.channelNames.forEach((channel, index) => {
            const yOffset = channelHeight * index + channelHeight / 2;
            const color = this.options.colors[index % this.options.colors.length];

            this._drawWaveform(this.buffers[channel], yOffset, channelHeight, color);
            this._drawChannelLabel(channel, yOffset, color);
        });
    }

    /**
     * Draw background grid
     * @private
     */
    _drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        // Horizontal lines
        const channelHeight = this.canvas.height / this.channelNames.length;
        for (let i = 0; i <= this.channelNames.length; i++) {
            const y = i * channelHeight;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        // Vertical lines (time markers)
        const timeSteps = 10;
        for (let i = 0; i <= timeSteps; i++) {
            const x = (i / timeSteps) * this.canvas.width;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
    }

    /**
     * Draw waveform for a channel
     * @private
     */
    _drawWaveform(buffer, yOffset, height, color) {
        if (buffer.length < 2) return;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = this.options.lineWidth;
        this.ctx.beginPath();

        const scaleY = height * 0.4; // Use 40% of channel height
        const stepX = this.canvas.width / (this.options.bufferSize - 1);

        buffer.forEach((value, index) => {
            const x = index * stepX;
            const y = yOffset - (value * scaleY);

            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        this.ctx.stroke();
    }

    /**
     * Draw channel label
     * @private
     */
    _drawChannelLabel(channel, yOffset, color) {
        this.ctx.fillStyle = color;
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(channel, this.canvas.width - 10, yOffset);
    }

    /**
     * Enable/disable rendering
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    /**
     * Clear all buffers
     */
    clear() {
        this.channelNames.forEach(channel => {
            this.buffers[channel] = [];
        });
    }
}

/**
 * Animation Loop Manager
 * Manages requestAnimationFrame loop for all visualizations
 */
export class AnimationLoop {
    constructor() {
        this.isRunning = false;
        this.renderers = [];
        this.frameId = null;
        this.fps = 0;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
    }

    /**
     * Add renderer to animation loop
     *
     * @param {Object} renderer - Renderer with render() method
     */
    addRenderer(renderer) {
        if (renderer && typeof renderer.render === 'function') {
            this.renderers.push(renderer);
        }
    }

    /**
     * Start animation loop
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this._loop();
    }

    /**
     * Stop animation loop
     */
    stop() {
        this.isRunning = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    /**
     * Get current FPS
     *
     * @returns {number} Frames per second
     */
    getFPS() {
        return this.fps;
    }

    /**
     * Animation loop
     * @private
     */
    _loop() {
        if (!this.isRunning) return;

        // Calculate FPS
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.frameCount++;

        if (delta >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / delta);
            this.frameCount = 0;
            this.lastFrameTime = now;
        }

        // Render all registered renderers
        this.renderers.forEach(renderer => {
            try {
                renderer.render();
            } catch (error) {
                console.error('Renderer error:', error);
            }
        });

        // Schedule next frame
        this.frameId = requestAnimationFrame(() => this._loop());
    }
}
