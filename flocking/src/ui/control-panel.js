/**
 * Control Panel
 * Handles UI controls for the simulation
 */

export class ControlPanel {
    constructor(params, callbacks) {
        this.params = params;
        this.callbacks = callbacks;
        this.initializeValues();
        this.setupListeners();
    }

    initializeValues() {
        // Set initial values for all controls based on params
        document.getElementById('pixelScaleValue').textContent = this.params.pixelScale;
        document.getElementById('pixelScale').value = this.params.pixelScale;

        document.getElementById('boidCountValue').textContent = this.params.numBoids;
        document.getElementById('boidCount').value = this.params.numBoids;
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
    }

    enablePlayPause() {
        document.getElementById('playPause').disabled = false;
    }

    disablePlayPause() {
        document.getElementById('playPause').disabled = true;
    }
}
