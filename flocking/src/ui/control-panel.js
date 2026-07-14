/**
 * Control Panel
 * Handles UI controls for the simulation
 */

export class ControlPanel {
    constructor(params, callbacks) {
        this.params = params;
        this.callbacks = callbacks;
        // Texture prefs live here (persisted to localStorage). The wooj-koi renderer only has a
        // single brush-texture gate (renderer.parts.texture), driven via the onTexturesToggle
        // callback; the per-part sub-toggles are kept for persistence but don't map to the
        // simplified package renderer.
        this.textureConfig = { enabled: true, paper: false, body: true, tail: true, fin: true, spot: false };
        this.initializeValues();
        this.loadTextureConfig();
        this.setupListeners();
    }

    /** Current master texture preference (read by the app to sync the renderer on startup). */
    texturesEnabled() {
        return this.textureConfig.enabled;
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

            this.textureConfig = {
                enabled: config.enabled ?? true,
                paper: config.paper ?? false,
                body: config.body ?? true,
                tail: config.tail ?? true,
                fin: config.fin ?? true,
                spot: config.spot ?? false
            };

            // Update UI checkboxes
            document.getElementById('texturesEnabled').checked = this.textureConfig.enabled;
            document.getElementById('paperTextureEnabled').checked = this.textureConfig.paper;
            document.getElementById('bodyTextureEnabled').checked = this.textureConfig.body;
            document.getElementById('tailTextureEnabled').checked = this.textureConfig.tail;
            document.getElementById('finTextureEnabled').checked = this.textureConfig.fin;
            document.getElementById('spotTextureEnabled').checked = this.textureConfig.spot;

            console.log('Texture config loaded:', this.textureConfig);
        } catch (e) {
            console.warn('Failed to load texture config from localStorage:', e);
        }
    }

    /**
     * Save texture configuration to localStorage
     */
    saveTextureConfig() {
        try {
            localStorage.setItem('koi-texture-config', JSON.stringify(this.textureConfig));
            console.log('Texture config saved:', this.textureConfig);
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
        // Master texture toggle — drives the renderer's brush-texture gate via the app callback.
        document.getElementById('texturesEnabled').addEventListener('change', (e) => {
            this.textureConfig.enabled = e.target.checked;
            const textureControls = document.getElementById('textureDetailControls');
            textureControls.style.opacity = e.target.checked ? 1 : 0.5;
            if (this.callbacks.onTexturesToggle) this.callbacks.onTexturesToggle(e.target.checked);
            this.saveTextureConfig();
        });

        // Per-part sub-toggles: persisted, but the simplified wooj-koi renderer has no per-part
        // texture gate, so they don't currently affect rendering.
        const subToggle = (id, key) => {
            document.getElementById(id).addEventListener('change', (e) => {
                this.textureConfig[key] = e.target.checked;
                this.saveTextureConfig();
            });
        };
        subToggle('paperTextureEnabled', 'paper');
        subToggle('bodyTextureEnabled', 'body');
        subToggle('tailTextureEnabled', 'tail');
        subToggle('finTextureEnabled', 'fin');
        subToggle('spotTextureEnabled', 'spot');
    }

    enablePlayPause() {
        document.getElementById('playPause').disabled = false;
    }

    disablePlayPause() {
        document.getElementById('playPause').disabled = true;
    }
}
