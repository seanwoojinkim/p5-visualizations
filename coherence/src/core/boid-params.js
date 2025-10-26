/**
 * Boid parameters and defaults
 * Defines the visual and behavioral parameters for the simulation
 */

export const DEFAULT_PARAMS = {
    // Simulation parameters
    numBoidsPerGroup: 500,
    coherenceLevel: 0.0,  // -1.0 (fully repelled) to 1.0 (fully coherent)

    // Biometric simulation mode
    simulationMode: false,              // Toggle between manual and simulated control
    selectedSequence: 'journey_to_coherence',  // Which sequence to play
    showSimulationInfo: true,           // Show current simulation state

    // Visual parameters
    boidSize: 8,
    showTrails: true,
    trailLength: 40,
    backgroundColor: '#0a0a0a',
    lowQualityMode: false,  // Reduces visual effects for better performance

    // Group colors
    group1Color: '#3b82f6',  // Blue
    group2Color: '#ef4444',  // Red

    // Physics toggles
    showDebugInfo: false,
    pauseSimulation: false,
};

export const PARAMETER_RANGES = {
    numBoidsPerGroup: { min: 10, max: 500, step: 10, label: 'Boids per Group' },
    coherenceLevel: { min: -1.0, max: 1.0, step: 0.01, label: 'Coherence Level' },
    boidSize: { min: 4, max: 20, step: 1, label: 'Boid Size' },
    trailLength: { min: 5, max: 100, step: 5, label: 'Trail Length' },
};

/**
 * Validates and clamps a parameter to its valid range
 */
export function clampParam(paramName, value) {
    const range = PARAMETER_RANGES[paramName];
    if (!range) return value;
    return Math.max(range.min, Math.min(range.max, value));
}

/**
 * Creates a deep copy of parameters
 */
export function copyParams(params) {
    return JSON.parse(JSON.stringify(params));
}

/**
 * Validates all parameters
 */
export function validateParams(params) {
    const validated = copyParams(params);

    for (const [key, value] of Object.entries(validated)) {
        if (PARAMETER_RANGES[key]) {
            validated[key] = clampParam(key, value);
        }
    }

    return validated;
}
