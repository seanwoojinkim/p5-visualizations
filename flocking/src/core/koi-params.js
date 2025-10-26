/**
 * Koi Shape Parameters
 * Centralized parameter definitions, defaults, and validation
 */

export const DEFAULT_SHAPE_PARAMS = {
    // Body structure
    numSegments: 10,
    bodyWidth: 2.30,
    bodyHeight: 0.95,
    bodyTaperStart: 0.15,     // Where tapering begins (0-1, segment position)
    bodyTaperStrength: 0.90,   // How much to taper (0-1)
    bodyPeakPosition: 0.70,    // Where body is widest (0-1)
    bodyPeakWidth: 8.0,       // Maximum width multiplier
    bodyFrontWidth: 4.5,      // Front width multiplier
    bodyAsymmetry: 0.90,       // Belly rounder than back (-1 to 1)

    // Head
    headX: -0.2,
    headWidth: 7.5,
    headHeight: 5.0,

    // Eyes (added for dual-eye rendering)
    eyeX: 2.0,
    eyeYTop: -1.6,
    eyeYBottom: 1.5,
    eyeSize: 0.5,

    // Tail
    tailStartX: 1,
    tailWidthStart: 0.20,
    tailWidthEnd: 1.50,
    tailSplit: 0.5,

    // Dorsal fin
    dorsalPos: 4,
    dorsalY: -0.5,

    // Pectoral fins
    pectoralPos: 2,
    pectoralYTop: -2.5,
    pectoralAngleTop: -2.5,
    pectoralYBottom: 2.0,
    pectoralAngleBottom: 2.1,

    // Ventral fins
    ventralPos: 5,
    ventralYTop: -1.5,
    ventralAngleTop: -2.5,
    ventralYBottom: 1.5,
    ventralAngleBottom: 2.5
};

export const PARAMETER_RANGES = {
    numSegments: { min: 5, max: 20, step: 1, label: 'Body Segments' },
    bodyWidth: { min: 1, max: 5, step: 0.1, label: 'Body Width' },
    bodyHeight: { min: 0.5, max: 2, step: 0.05, label: 'Body Height' },
    bodyTaperStart: { min: 0, max: 1, step: 0.05, label: 'Taper Start Position' },
    bodyTaperStrength: { min: 0, max: 1, step: 0.05, label: 'Taper Strength' },
    bodyPeakPosition: { min: 0, max: 1, step: 0.05, label: 'Peak Width Position' },
    bodyPeakWidth: { min: 3, max: 10, step: 0.5, label: 'Peak Width' },
    bodyFrontWidth: { min: 2, max: 8, step: 0.5, label: 'Front Width' },
    bodyAsymmetry: { min: -1, max: 1, step: 0.1, label: 'Belly/Back Asymmetry' },

    headX: { min: -3, max: 1, step: 0.1, label: 'Head X Position' },
    headWidth: { min: 3, max: 12, step: 0.5, label: 'Head Width' },
    headHeight: { min: 2, max: 10, step: 0.5, label: 'Head Height' },

    eyeX: { min: 0, max: 4, step: 0.1, label: 'Eye X Position' },
    eyeYTop: { min: -4, max: 0, step: 0.1, label: 'Top Eye Y Position' },
    eyeYBottom: { min: 0, max: 4, step: 0.1, label: 'Bottom Eye Y Position' },
    eyeSize: { min: 0.5, max: 2, step: 0.1, label: 'Eye Size' },

    tailStartX: { min: -0.4, max: .4, step: 0.1, label: 'Tail Start X' },
    tailWidthStart: { min: 0.1, max: 1, step: 0.05, label: 'Tail Width Start' },
    tailWidthEnd: { min: 0.5, max: 3, step: 0.1, label: 'Tail Width End' },
    tailSplit: { min: 0, max: 2, step: 0.1, label: 'Tail Split' },

    dorsalPos: { min: 0, max: 9, step: 1, label: 'Dorsal Fin Position' },
    dorsalY: { min: -3, max: 3, step: 0.1, label: 'Dorsal Fin Y' },

    pectoralPos: { min: 0, max: 9, step: 1, label: 'Pectoral Fin Position' },
    pectoralYTop: { min: -5, max: 5, step: 0.1, label: 'Pectoral Top Y' },
    pectoralAngleTop: { min: -Math.PI, max: Math.PI, step: 0.1, label: 'Pectoral Top Angle' },
    pectoralYBottom: { min: -5, max: 5, step: 0.1, label: 'Pectoral Bottom Y' },
    pectoralAngleBottom: { min: -Math.PI, max: Math.PI, step: 0.1, label: 'Pectoral Bottom Angle' },

    ventralPos: { min: 0, max: 9, step: 1, label: 'Ventral Fin Position' },
    ventralYTop: { min: -5, max: 5, step: 0.1, label: 'Ventral Top Y' },
    ventralAngleTop: { min: -Math.PI, max: Math.PI, step: 0.1, label: 'Ventral Top Angle' },
    ventralYBottom: { min: -5, max: 5, step: 0.1, label: 'Ventral Bottom Y' },
    ventralAngleBottom: { min: -Math.PI, max: Math.PI, step: 0.1, label: 'Ventral Bottom Angle' }
};

/**
 * Validate shape parameters against defined ranges
 * @param {Object} params - Parameters to validate
 * @returns {Object} - { valid: boolean, errors: Array<string> }
 */
export function validateShapeParams(params) {
    const errors = [];

    for (const [key, value] of Object.entries(params)) {
        if (PARAMETER_RANGES[key]) {
            const range = PARAMETER_RANGES[key];
            if (value < range.min || value > range.max) {
                errors.push(`${range.label} must be between ${range.min} and ${range.max}`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Clamp a parameter value to its valid range
 * @param {string} paramName - Name of the parameter
 * @param {number} value - Value to clamp
 * @returns {number} - Clamped value
 */
export function clampParam(paramName, value) {
    const range = PARAMETER_RANGES[paramName];
    if (!range) return value;

    return Math.max(range.min, Math.min(range.max, value));
}

/**
 * Create a deep copy of shape parameters
 * @param {Object} params - Parameters to copy
 * @returns {Object} - Deep copy of parameters
 */
export function copyParams(params) {
    return JSON.parse(JSON.stringify(params));
}
