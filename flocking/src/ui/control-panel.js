/**
 * Control Panel
 * Handles UI controls for the simulation
 */

import { RENDERING_CONFIG } from '../core/rendering-config.js';

export class ControlPanel {
    constructor(params, callbacks) {
        this.params = params;
        this.callbacks = callbacks;
        this.initializeValues();
        this.loadTextureConfig();
        this.setupListeners();
    }

    initializeValues() {
        // Set initial values for all controls based on params
        document.getElementById('pixelScaleValue').textContent = this.params.pixelScale;
        document.getElementById('pixelScale').value = this.params.pixelScale;

        document.getElementById('boidCountValue').textContent = this.params.numBoids;
        document.getElementById('boidCount').value = this.params.numBoids;
    }

    /**
     * Load texture configuration from localStorage
     */
    loadTextureConfig() {
        try {
            const saved = localStorage.getItem('koi-texture-config');
            if (!saved) return;

            const config = JSON.parse(saved);

            // Apply to RENDERING_CONFIG
            RENDERING_CONFIG.textures.enabled = config.enabled ?? true;
            RENDERING_CONFIG.textures.paper.enabled = config.paper ?? true;
            RENDERING_CONFIG.textures.body.enabled = config.body ?? true;
            RENDERING_CONFIG.textures.tail.enabled = config.tail ?? true;
            RENDERING_CONFIG.textures.fin.enabled = config.fin ?? true;
            RENDERING_CONFIG.textures.spot.enabled = config.spot ?? false;

            // Update UI checkboxes
            document.getElementById('texturesEnabled').checked = config.enabled;
            document.getElementById('paperTextureEnabled').checked = config.paper;
            document.getElementById('bodyTextureEnabled').checked = config.body;
            document.getElementById('tailTextureEnabled').checked = config.tail;
            document.getElementById('finTextureEnabled').checked = config.fin;
            document.getElementById('spotTextureEnabled').checked = config.spot;

            console.log('Texture config loaded:', config);
        } catch (e) {
            console.warn('Failed to load texture config from localStorage:', e);
        }
    }

    /**
     * Save texture configuration to localStorage
     */
    saveTextureConfig() {
        const config = {
            enabled: RENDERING_CONFIG.textures.enabled,
            paper: RENDERING_CONFIG.textures.paper.enabled,
            body: RENDERING_CONFIG.textures.body.enabled,
            tail: RENDERING_CONFIG.textures.tail.enabled,
            fin: RENDERING_CONFIG.textures.fin.enabled,
            spot: RENDERING_CONFIG.textures.spot.enabled
        };

        try {
            localStorage.setItem('koi-texture-config', JSON.stringify(config));
            console.log('Texture config saved:', config);
        } catch (e) {
            console.warn('Failed to save texture config to localStorage:', e);
        }
    }

    setupListeners() {
        // Audio file upload
        document.getElementById('audioFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && this.callbacks.onAudioFileLoad) {
                this.callbacks.onAudioFileLoad(file);
            }
        });

        // Play/Pause button
        document.getElementById('playPause').addEventListener('click', () => {
            if (this.callbacks.onPlayPause) {
                const isPlaying = this.callbacks.onPlayPause();
                document.getElementById('playPause').textContent = isPlaying ? 'Pause Audio' : 'Play Audio';
            }
        });

        // Audio reactivity
        document.getElementById('reactivity').addEventListener('input', (e) => {
            this.params.audioReactivity = parseFloat(e.target.value);
            document.getElementById('reactivityValue').textContent = this.params.audioReactivity.toFixed(1);
        });

        // Pixel scale
        document.getElementById('pixelScale').addEventListener('input', (e) => {
            this.params.pixelScale = parseInt(e.target.value);
            document.getElementById('pixelScaleValue').textContent = this.params.pixelScale;
            if (this.callbacks.onPixelScaleChange) {
                this.callbacks.onPixelScaleChange(this.params.pixelScale);
            }
        });

        // Boid count
        document.getElementById('boidCount').addEventListener('input', (e) => {
            const newCount = parseInt(e.target.value);
            document.getElementById('boidCountValue').textContent = newCount;
            this.params.numBoids = newCount;
            if (this.callbacks.onBoidCountChange) {
                this.callbacks.onBoidCountChange(newCount);
            }
        });

        // Max speed
        document.getElementById('maxSpeed').addEventListener('input', (e) => {
            this.params.maxSpeed = parseFloat(e.target.value);
            document.getElementById('maxSpeedValue').textContent = this.params.maxSpeed.toFixed(1);
        });

        // Separation
        document.getElementById('separation').addEventListener('input', (e) => {
            this.params.separationWeight = parseFloat(e.target.value);
            document.getElementById('separationValue').textContent = this.params.separationWeight.toFixed(1);
        });

        // Alignment
        document.getElementById('alignment').addEventListener('input', (e) => {
            this.params.alignmentWeight = parseFloat(e.target.value);
            document.getElementById('alignmentValue').textContent = this.params.alignmentWeight.toFixed(1);
        });

        // Cohesion
        document.getElementById('cohesion').addEventListener('input', (e) => {
            this.params.cohesionWeight = parseFloat(e.target.value);
            document.getElementById('cohesionValue').textContent = this.params.cohesionWeight.toFixed(1);
        });

        // Trail
        document.getElementById('trail').addEventListener('input', (e) => {
            this.params.trailAlpha = parseInt(e.target.value);
            document.getElementById('trailValue').textContent = this.params.trailAlpha;
        });

        // Reset button
        document.getElementById('reset').addEventListener('click', () => {
            if (this.callbacks.onReset) {
                this.callbacks.onReset();
            }
        });

        // Texture controls
        // Master texture toggle
        document.getElementById('texturesEnabled').addEventListener('change', (e) => {
            RENDERING_CONFIG.textures.enabled = e.target.checked;
            const textureControls = document.getElementById('textureDetailControls');
            textureControls.style.opacity = e.target.checked ? 1 : 0.5;
            this.saveTextureConfig();
        });

        // Individual texture toggles
        document.getElementById('paperTextureEnabled').addEventListener('change', (e) => {
            RENDERING_CONFIG.textures.paper.enabled = e.target.checked;
            this.saveTextureConfig();
        });

        document.getElementById('bodyTextureEnabled').addEventListener('change', (e) => {
            RENDERING_CONFIG.textures.body.enabled = e.target.checked;
            this.saveTextureConfig();
        });

        document.getElementById('tailTextureEnabled').addEventListener('change', (e) => {
            RENDERING_CONFIG.textures.tail.enabled = e.target.checked;
            this.saveTextureConfig();
        });

        document.getElementById('finTextureEnabled').addEventListener('change', (e) => {
            RENDERING_CONFIG.textures.fin.enabled = e.target.checked;
            this.saveTextureConfig();
        });

        document.getElementById('spotTextureEnabled').addEventListener('change', (e) => {
            RENDERING_CONFIG.textures.spot.enabled = e.target.checked;
            this.saveTextureConfig();
        });
    }

    enablePlayPause() {
        document.getElementById('playPause').disabled = false;
    }

    disablePlayPause() {
        document.getElementById('playPause').disabled = true;
    }
}
