/**
 * Audio Analyzer
 * Handles audio file loading and frequency analysis using Web Audio API
 */

export class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.audioSource = null;
        this.audioElement = null;
        this.frequencyData = null;
        this.audioLoaded = false;
        this.isPlaying = false;
    }

    /**
     * Load an audio file and set up Web Audio API
     * @param {File} file - Audio file from file input
     * @returns {Promise} - Resolves when audio is loaded
     */
    loadAudioFile(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);

            // Create audio element if it doesn't exist
            if (!this.audioElement) {
                this.audioElement = new Audio();
                this.audioElement.loop = true;
            }

            this.audioElement.src = url;

            // Set up Web Audio API
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;
                this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

                this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
                this.audioSource.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);
            }

            this.audioLoaded = true;
            resolve();
        });
    }

    /**
     * Play the loaded audio
     */
    play() {
        if (this.audioLoaded && this.audioElement) {
            this.audioElement.play();
            this.isPlaying = true;
        }
    }

    /**
     * Pause the audio
     */
    pause() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.isPlaying = false;
        }
    }

    /**
     * Toggle play/pause
     * @returns {boolean} - New playing state
     */
    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
        return this.isPlaying;
    }

    /**
     * Get current audio data
     * @returns {Object} - Audio data {amplitude, bass, mid, treble}
     */
    getAudioData() {
        if (!this.audioLoaded || !this.isPlaying) {
            return {
                amplitude: 0,
                bass: 0,
                mid: 0,
                treble: 0
            };
        }

        this.analyser.getByteFrequencyData(this.frequencyData);

        // Calculate average amplitude
        let sum = 0;
        for (let i = 0; i < this.frequencyData.length; i++) {
            sum += this.frequencyData[i];
        }
        const amplitude = sum / this.frequencyData.length / 255;

        // Get frequency bands
        const bass = this.getFrequencyRange(0, 4) / 255;
        const mid = this.getFrequencyRange(4, 16) / 255;
        const treble = this.getFrequencyRange(16, 32) / 255;

        return { amplitude, bass, mid, treble };
    }

    /**
     * Get average amplitude in a frequency range
     * @param {number} start - Start index
     * @param {number} end - End index
     * @returns {number} - Average amplitude
     */
    getFrequencyRange(start, end) {
        let sum = 0;
        for (let i = start; i < end && i < this.frequencyData.length; i++) {
            sum += this.frequencyData[i];
        }
        return sum / (end - start);
    }
}
