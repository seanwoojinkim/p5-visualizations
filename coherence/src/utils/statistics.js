/**
 * Statistical Utility Functions
 * Provides common statistical calculations for session data analysis
 */

/**
 * Calculate the mean (average) of an array of numbers
 * @param {number[]} values - Array of numbers
 * @returns {number} Mean value
 */
export function mean(values) {
    if (!values || values.length === 0) {
        return 0;
    }
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
}

/**
 * Calculate the median of an array of numbers
 * @param {number[]} values - Array of numbers
 * @returns {number} Median value
 */
export function median(values) {
    if (!values || values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        // Even length: average of two middle values
        return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
        // Odd length: middle value
        return sorted[mid];
    }
}

/**
 * Calculate the standard deviation of an array of numbers
 * @param {number[]} values - Array of numbers
 * @returns {number} Standard deviation
 */
export function standardDeviation(values) {
    if (!values || values.length === 0) {
        return 0;
    }

    const avg = mean(values);
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    const variance = mean(squaredDiffs);
    return Math.sqrt(variance);
}

/**
 * Find the minimum value in an array
 * @param {number[]} values - Array of numbers
 * @returns {number} Minimum value
 */
export function min(values) {
    if (!values || values.length === 0) {
        return 0;
    }
    return Math.min(...values);
}

/**
 * Find the maximum value in an array
 * @param {number[]} values - Array of numbers
 * @returns {number} Maximum value
 */
export function max(values) {
    if (!values || values.length === 0) {
        return 0;
    }
    return Math.max(...values);
}

/**
 * Calculate a percentile of an array of numbers
 * @param {number[]} values - Array of numbers
 * @param {number} percentile - Percentile to calculate (0-100)
 * @returns {number} Value at the given percentile
 */
export function percentile(values, percentile) {
    if (!values || values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) {
        return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate time spent in coherence zones based on HeartMath thresholds
 * Zones:
 *   Low: coherence < 40
 *   Medium: 40 <= coherence < 60
 *   High: coherence >= 60
 *
 * @param {Object[]} samples - Array of coherence samples with {coherence, timestamp}
 * @returns {Object} Time in zones {low: {seconds, percentage}, medium: {seconds, percentage}, high: {seconds, percentage}}
 */
export function calculateTimeInZones(samples) {
    if (!samples || samples.length === 0) {
        return {
            low: { seconds: 0, percentage: 0 },
            medium: { seconds: 0, percentage: 0 },
            high: { seconds: 0, percentage: 0 }
        };
    }

    // Count samples in each zone
    let lowCount = 0;
    let mediumCount = 0;
    let highCount = 0;

    for (const sample of samples) {
        const coherence = sample.coherence;
        if (coherence < 40) {
            lowCount++;
        } else if (coherence < 60) {
            mediumCount++;
        } else {
            highCount++;
        }
    }

    // Calculate duration (assume 3 seconds per sample based on HRV update frequency)
    const secondsPerSample = 3;
    const totalSeconds = samples.length * secondsPerSample;

    const lowSeconds = lowCount * secondsPerSample;
    const mediumSeconds = mediumCount * secondsPerSample;
    const highSeconds = highCount * secondsPerSample;

    return {
        low: {
            seconds: lowSeconds,
            percentage: totalSeconds > 0 ? (lowSeconds / totalSeconds) * 100 : 0
        },
        medium: {
            seconds: mediumSeconds,
            percentage: totalSeconds > 0 ? (mediumSeconds / totalSeconds) * 100 : 0
        },
        high: {
            seconds: highSeconds,
            percentage: totalSeconds > 0 ? (highSeconds / totalSeconds) * 100 : 0
        }
    };
}

/**
 * Calculate achievement score based on session performance
 * Formula: (mean_coherence * duration_minutes) + (high_zone_percentage * 10)
 *
 * @param {number} meanCoherence - Mean coherence score (0-100)
 * @param {number} durationSeconds - Session duration in seconds
 * @param {number} highZonePercentage - Percentage of time in high coherence zone (0-100)
 * @returns {number} Achievement score
 */
export function calculateAchievementScore(meanCoherence, durationSeconds, highZonePercentage) {
    const durationMinutes = durationSeconds / 60;
    const score = (meanCoherence * durationMinutes) + (highZonePercentage * 10);
    return Math.round(score);
}

/**
 * Format duration in seconds to human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "5m 42s" or "1h 23m")
 */
export function formatDuration(seconds) {
    if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);

    if (minutes < 60) {
        return `${minutes}m ${remainingSeconds}s`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}
