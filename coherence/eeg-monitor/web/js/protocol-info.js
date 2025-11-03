/**
 * Protocol Information Module
 *
 * Contains metadata for all 5 neurofeedback protocols including
 * descriptions, directions, instructions, and display configuration.
 */

export const PROTOCOLS = {
    'alpha_enhancement': {
        name: 'Alpha Enhancement',
        description: 'Promotes relaxation and meditation by increasing alpha waves (8-13 Hz). Associated with reduced anxiety and improved mental calmness.',
        direction: 'higher',
        directionText: 'Higher is better',
        instructions: 'Close your eyes and relax. Focus on your breath. Higher scores indicate deeper relaxation.',
        color: '#00b894',
        bands: ['alpha'],
        scoringInfo: {
            excellent: 'Deep relaxation/meditation state',
            good: 'Relaxed state',
            medium: 'Normal state',
            low: 'Tense or anxious state'
        },
        detailLabels: {
            alpha_power: 'Alpha Power (µV²)',
            baseline: 'Baseline Alpha',
            alpha_relative: 'Relative to Baseline (%)',
            channel_powers: 'Per-Channel Alpha'
        }
    },

    'theta_beta_ratio': {
        name: 'Theta/Beta Ratio',
        description: 'Improves focus and attention by reducing the theta/beta ratio. Lower ratios indicate better concentration and sustained attention.',
        direction: 'lower',
        directionText: 'Lower is better',
        instructions: 'Stay alert and focused. Engage your attention without tension. Lower ratios indicate better focus.',
        color: '#fdcb6e',
        bands: ['theta', 'beta'],
        scoringInfo: {
            excellent: 'Excellent focus (ratio < 1.5)',
            good: 'Good attention (ratio < 2.0)',
            medium: 'Moderate focus (ratio < 2.5)',
            low: 'Distracted state (ratio > 2.5)'
        },
        detailLabels: {
            theta_power: 'Theta Power (µV²)',
            beta_power: 'Beta Power (µV²)',
            ratio: 'Theta/Beta Ratio',
            target: 'Target Ratio'
        },
        note: 'Most validated protocol for ADHD training (67+ studies)'
    },

    'alpha_asymmetry': {
        name: 'Alpha Asymmetry',
        description: 'Balances left vs right hemisphere alpha activity for mood regulation. Aims for balanced alpha across hemispheres.',
        direction: 'balanced',
        directionText: 'Balanced is better',
        instructions: 'Maintain a positive, relaxed mood. Balance is key - neither too left nor too right dominant.',
        color: '#6c5ce7',
        bands: ['alpha'],
        scoringInfo: {
            excellent: 'Perfect balance (< 0.1 asymmetry)',
            good: 'Good balance (< 0.2 asymmetry)',
            medium: 'Moderate imbalance (< 0.3)',
            low: 'Significant imbalance (> 0.3)'
        },
        detailLabels: {
            left_alpha: 'Left Hemisphere (AF7)',
            right_alpha: 'Right Hemisphere (AF8)',
            asymmetry: 'Asymmetry Score',
            dominant_hemisphere: 'Dominant Side'
        },
        note: "Based on Davidson's frontal alpha asymmetry model"
    },

    'theta_enhancement': {
        name: 'Theta Enhancement',
        description: 'Enhances theta waves (4-8 Hz) for deep meditation, creativity, and hypnagogic states. Associated with creative insights.',
        direction: 'higher',
        directionText: 'Higher is better',
        instructions: 'Enter a deeply relaxed, meditative state. Let your mind wander freely. Higher theta indicates creative flow.',
        color: '#0984e3',
        bands: ['theta'],
        scoringInfo: {
            excellent: 'Deep meditation/creative state',
            good: 'Strong theta activity',
            medium: 'Moderate theta',
            low: 'Low theta activity'
        },
        detailLabels: {
            theta_power: 'Theta Power (µV²)',
            baseline: 'Baseline Theta',
            theta_relative: 'Relative to Baseline (%)',
            channel_powers: 'Per-Channel Theta'
        },
        note: 'Associated with creative states and deep meditation'
    },

    'beta_enhancement': {
        name: 'Beta Enhancement',
        description: 'Enhances beta waves (12-30 Hz) for focus, alertness, and active thinking. Use with caution - excessive beta may indicate stress.',
        direction: 'higher',
        directionText: 'Higher is better (with caution)',
        instructions: 'Stay mentally alert and engaged. Focus on active problem-solving. Watch for signs of over-activation.',
        color: '#e17055',
        bands: ['beta'],
        scoringInfo: {
            excellent: 'Highly alert and focused',
            good: 'Good mental engagement',
            medium: 'Moderate alertness',
            low: 'Low alertness'
        },
        detailLabels: {
            beta_power: 'Beta Power (µV²)',
            baseline: 'Baseline Beta',
            beta_relative: 'Relative to Baseline (%)',
            channel_powers: 'Per-Channel Beta'
        },
        warning: 'Very high beta (>150% baseline) may indicate anxiety or stress',
        note: 'Associated with active thinking and problem solving'
    }
};

/**
 * Get protocol information by name
 *
 * @param {string} protocolName - The protocol identifier
 * @returns {Object|null} Protocol info object or null if not found
 */
export function getProtocolInfo(protocolName) {
    return PROTOCOLS[protocolName] || null;
}

/**
 * Get all protocol names
 *
 * @returns {string[]} Array of protocol identifiers
 */
export function getAllProtocolNames() {
    return Object.keys(PROTOCOLS);
}

/**
 * Get color for score level
 *
 * @param {string} level - Feedback level: 'excellent', 'good', 'medium', 'low', 'poor'
 * @returns {string} CSS color value
 */
export function getScoreColor(level) {
    const colors = {
        'excellent': '#00ff88',
        'good': '#00cc66',
        'medium': '#ffaa00',
        'low': '#ff6600',
        'poor': '#ff3333'
    };
    return colors[level] || '#a0a0a0';
}

/**
 * Get direction indicator symbol
 *
 * @param {string} direction - Direction: 'higher', 'lower', 'balanced'
 * @returns {string} Unicode arrow/symbol
 */
export function getDirectionSymbol(direction) {
    const symbols = {
        'higher': '↑',
        'lower': '↓',
        'balanced': '⟷'
    };
    return symbols[direction] || '';
}

/**
 * Format score value for display
 *
 * @param {number} score - Score value (0-100)
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string} Formatted score string
 */
export function formatScore(score, decimals = 1) {
    if (typeof score !== 'number' || isNaN(score)) {
        return '--';
    }
    return score.toFixed(decimals);
}

/**
 * Format band power value for display
 *
 * @param {number} power - Power value in µV²
 * @returns {string} Formatted power string
 */
export function formatPower(power) {
    if (typeof power !== 'number' || isNaN(power)) {
        return '0.0';
    }
    if (power < 0.1) {
        return power.toFixed(3);
    } else if (power < 10) {
        return power.toFixed(2);
    } else {
        return power.toFixed(1);
    }
}

/**
 * Get CSS class name for score level
 *
 * @param {string} level - Feedback level
 * @returns {string} CSS class name
 */
export function getScoreClass(level) {
    return `text-${level}`;
}

/**
 * Get detailed explanation for a protocol metric
 *
 * @param {string} protocolName - Protocol identifier
 * @param {string} metricKey - Metric key from details
 * @returns {string} Human-readable label
 */
export function getMetricLabel(protocolName, metricKey) {
    const protocol = PROTOCOLS[protocolName];
    if (!protocol || !protocol.detailLabels) {
        return metricKey;
    }
    return protocol.detailLabels[metricKey] || metricKey;
}

/**
 * Validate protocol name
 *
 * @param {string} protocolName - Protocol identifier to validate
 * @returns {boolean} True if protocol exists
 */
export function isValidProtocol(protocolName) {
    return protocolName in PROTOCOLS;
}

/**
 * Get protocol color
 *
 * @param {string} protocolName - Protocol identifier
 * @returns {string} CSS color value
 */
export function getProtocolColor(protocolName) {
    const protocol = PROTOCOLS[protocolName];
    return protocol ? protocol.color : '#3282b8';
}

/**
 * Get band color
 *
 * @param {string} bandName - Band name (delta, theta, alpha, beta, gamma)
 * @returns {string} CSS color value
 */
export function getBandColor(bandName) {
    const colors = {
        'delta': '#6c5ce7',
        'theta': '#0984e3',
        'alpha': '#00b894',
        'beta': '#fdcb6e',
        'gamma': '#e17055'
    };
    return colors[bandName] || '#a0a0a0';
}

/**
 * Get scoring threshold information for a protocol
 *
 * @param {string} protocolName - Protocol identifier
 * @returns {Object|null} Scoring info object
 */
export function getScoringInfo(protocolName) {
    const protocol = PROTOCOLS[protocolName];
    return protocol ? protocol.scoringInfo : null;
}
