/**
 * BiometricSimulator - Simulates heart rate variability and coherence
 * This simulates what real biometric data would look like from two people
 */

export class BiometricSimulator {
    constructor() {
        this.time = 0;
        this.currentMode = 'sync_breathing';
        this.transitionProgress = 0;
        this.targetCoherence = 0;
        this.currentCoherence = 0;

        // Noise generators for realistic variation
        this.noiseOffset1 = random(1000);
        this.noiseOffset2 = random(1000);

        // Simulation parameters
        this.coherenceSpeed = 0.01;  // How fast coherence changes
        this.updateInterval = 60;     // Frames between mode changes
        this.framesSinceUpdate = 0;
    }

    /**
     * Available simulation modes that represent different states
     */
    static MODES = {
        // Positive coherence states
        'sync_breathing': {
            name: 'Synchronized Breathing',
            targetCoherence: 0.85,
            description: 'Both people breathing in sync, high coherence',
            duration: 300,
        },
        'meditation': {
            name: 'Meditation Together',
            targetCoherence: 0.95,
            description: 'Deep meditative state, maximum coherence',
            duration: 400,
        },
        'conversation': {
            name: 'Pleasant Conversation',
            targetCoherence: 0.6,
            description: 'Engaged discussion, moderate coherence',
            duration: 250,
        },

        // Neutral states
        'neutral': {
            name: 'Neutral/Resting',
            targetCoherence: 0.0,
            description: 'Independent activity, no coherence',
            duration: 200,
        },
        'drift': {
            name: 'Drifting Apart',
            targetCoherence: -0.2,
            description: 'Attention wandering, slight incoherence',
            duration: 180,
        },

        // Negative coherence states
        'tension': {
            name: 'Tension Building',
            targetCoherence: -0.5,
            description: 'Mild stress or disagreement',
            duration: 150,
        },
        'conflict': {
            name: 'Active Conflict',
            targetCoherence: -0.85,
            description: 'Strong disagreement, high incoherence',
            duration: 120,
        },
        'separate_stress': {
            name: 'Independent Stress',
            targetCoherence: -0.7,
            description: 'Both stressed but not interacting',
            duration: 180,
        },
    };

    /**
     * Predefined sequences that tell a story
     */
    static SEQUENCES = {
        'journey_to_coherence': [
            { mode: 'conflict', duration: 180 },
            { mode: 'tension', duration: 150 },
            { mode: 'drift', duration: 120 },
            { mode: 'neutral', duration: 100 },
            { mode: 'conversation', duration: 200 },
            { mode: 'sync_breathing', duration: 300 },
            { mode: 'meditation', duration: 400 },
        ],
        'cycle': [
            { mode: 'meditation', duration: 300 },
            { mode: 'conversation', duration: 200 },
            { mode: 'neutral', duration: 150 },
            { mode: 'drift', duration: 120 },
            { mode: 'tension', duration: 150 },
            { mode: 'neutral', duration: 100 },
            { mode: 'sync_breathing', duration: 250 },
        ],
        'breakdown': [
            { mode: 'sync_breathing', duration: 300 },
            { mode: 'conversation', duration: 200 },
            { mode: 'drift', duration: 180 },
            { mode: 'tension', duration: 150 },
            { mode: 'conflict', duration: 200 },
            { mode: 'separate_stress', duration: 180 },
        ],
        'recovery': [
            { mode: 'conflict', duration: 150 },
            { mode: 'separate_stress', duration: 180 },
            { mode: 'tension', duration: 120 },
            { mode: 'drift', duration: 150 },
            { mode: 'neutral', duration: 120 },
            { mode: 'conversation', duration: 200 },
            { mode: 'sync_breathing', duration: 300 },
            { mode: 'meditation', duration: 400 },
        ],
    };

    /**
     * Update simulation state
     */
    update() {
        this.time += 0.02;
        this.framesSinceUpdate++;

        // Smooth transition toward target coherence
        const diff = this.targetCoherence - this.currentCoherence;
        this.currentCoherence += diff * this.coherenceSpeed;

        // Add realistic noise/variation (breathing, micro-movements)
        const noise1 = noise(this.noiseOffset1 + this.time * 0.5) * 0.15 - 0.075;
        const noise2 = noise(this.noiseOffset2 + this.time * 0.7) * 0.15 - 0.075;
        const totalNoise = (noise1 + noise2) * 0.5;

        return this.currentCoherence + totalNoise;
    }

    /**
     * Set a specific mode manually
     */
    setMode(modeName) {
        if (BiometricSimulator.MODES[modeName]) {
            this.currentMode = modeName;
            this.targetCoherence = BiometricSimulator.MODES[modeName].targetCoherence;
            this.framesSinceUpdate = 0;
        }
    }

    /**
     * Get current mode info
     */
    getCurrentModeInfo() {
        return BiometricSimulator.MODES[this.currentMode];
    }

    /**
     * Reset simulation
     */
    reset() {
        this.time = 0;
        this.currentCoherence = 0;
        this.targetCoherence = 0;
        this.framesSinceUpdate = 0;
    }
}

/**
 * SequencePlayer - Plays through predefined sequences
 */
export class SequencePlayer {
    constructor(sequenceName = 'journey_to_coherence') {
        this.simulator = new BiometricSimulator();
        this.sequenceName = sequenceName;
        this.sequence = BiometricSimulator.SEQUENCES[sequenceName];
        this.currentStepIndex = 0;
        this.framesInCurrentStep = 0;
        this.isPlaying = false;
        this.loop = true;
    }

    /**
     * Start playing the sequence
     */
    play() {
        this.isPlaying = true;
    }

    /**
     * Pause the sequence
     */
    pause() {
        this.isPlaying = false;
    }

    /**
     * Stop and reset
     */
    stop() {
        this.isPlaying = false;
        this.currentStepIndex = 0;
        this.framesInCurrentStep = 0;
        this.simulator.reset();
    }

    /**
     * Update and get current coherence value
     */
    update() {
        if (!this.isPlaying) {
            return this.simulator.currentCoherence;
        }

        this.framesInCurrentStep++;

        // Check if we should move to next step
        const currentStep = this.sequence[this.currentStepIndex];
        if (this.framesInCurrentStep >= currentStep.duration) {
            this.nextStep();
        }

        return this.simulator.update();
    }

    /**
     * Move to next step in sequence
     */
    nextStep() {
        this.currentStepIndex++;

        // Handle end of sequence
        if (this.currentStepIndex >= this.sequence.length) {
            if (this.loop) {
                this.currentStepIndex = 0;
            } else {
                this.currentStepIndex = this.sequence.length - 1;
                this.isPlaying = false;
            }
        }

        // Set new mode
        const step = this.sequence[this.currentStepIndex];
        this.simulator.setMode(step.mode);
        this.framesInCurrentStep = 0;
    }

    /**
     * Get current step info
     */
    getCurrentStepInfo() {
        const step = this.sequence[this.currentStepIndex];
        const modeInfo = BiometricSimulator.MODES[step.mode];
        const progress = this.framesInCurrentStep / step.duration;

        return {
            stepIndex: this.currentStepIndex,
            totalSteps: this.sequence.length,
            mode: step.mode,
            modeName: modeInfo.name,
            description: modeInfo.description,
            progress: progress,
            framesRemaining: step.duration - this.framesInCurrentStep,
        };
    }

    /**
     * Change to a different sequence
     */
    setSequence(sequenceName) {
        if (BiometricSimulator.SEQUENCES[sequenceName]) {
            this.sequenceName = sequenceName;
            this.sequence = BiometricSimulator.SEQUENCES[sequenceName];
            this.currentStepIndex = 0;
            this.framesInCurrentStep = 0;
            this.simulator.reset();
        }
    }

    /**
     * Get available sequences
     */
    static getAvailableSequences() {
        return Object.keys(BiometricSimulator.SEQUENCES);
    }
}
