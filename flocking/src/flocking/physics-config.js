/**
 * Physics Configuration
 * Centralized physics constants for flocking behavior
 * All magic numbers extracted here for easy tuning
 */

export const PHYSICS_CONFIG = {
    // === FORCE SMOOTHING ===
    // How much to blend current forces with previous frame (0 = all previous, 1 = all current)
    FORCE_SMOOTHING: 0.25,          // Boid force smoothing (was 0.25)
    VELOCITY_SMOOTHING: 0.15,       // Velocity interpolation smoothing (was 0.15)
    DEAD_ZONE_THRESHOLD: 0.01,      // Ignore forces below this magnitude to prevent micro-oscillations

    // === DAMPING ===
    // Resistance to rapid heading changes (higher = more resistance to turning)
    DAMPING_COEFFICIENT: 0.45,      // Derivative damping for smooth turns (was 0.45)
    MIN_SPEED_FOR_DAMPING: 0.1,     // Only apply damping if moving faster than this

    // === PERCEPTION ===
    // How far boids can "see" their neighbors
    PERCEPTION_RADIUS: 50,          // Distance to check for neighbors (was 50)

    // === FORCE PRIORITIZATION ===
    // When boids are too close, separation force dominates to prevent overlap
    SEPARATION_HIGH_THRESHOLD: 0.05,    // Separation magnitude for high priority (90% separation)
    SEPARATION_MED_THRESHOLD: 0.02,     // Separation magnitude for medium priority (70% separation)

    // Weights when separation is high (too close)
    PRIORITIZE_HIGH: {
        separation: 0.9,
        alignment: 0.1,
        cohesion: 0.1
    },

    // Weights when separation is medium
    PRIORITIZE_MEDIUM: {
        separation: 0.7,
        alignment: 0.5,
        cohesion: 0.5
    },

    // === OVERCROWDING ESCAPE ===
    // Trigger escape when too many neighbors or forces too strong
    OVERCROWDING_NEIGHBOR_LIMIT: 15,    // Max neighbors before escaping
    OVERCROWDING_FORCE_LIMIT: 0.25,     // Max total force before escaping
    ESCAPE_DURATION_MIN: 1500,          // Min escape duration (ms)
    ESCAPE_DURATION_MAX: 3000,          // Max escape duration (ms)
    ESCAPE_COOLDOWN_MIN: 3000,          // Min cooldown after escape (ms)
    ESCAPE_COOLDOWN_MAX: 5000,          // Max cooldown after escape (ms)
    ESCAPE_ANGLE_MIN: Math.PI / 4,      // Min angle offset for escape (45°)
    ESCAPE_ANGLE_MAX: Math.PI / 2,      // Max angle offset for escape (90°)

    // === OSCILLATION DETECTION ===
    // Detect rapid back-and-forth direction changes
    OSCILLATION_HISTORY_LENGTH: 10,     // Track last N headings
    OSCILLATION_CHECK_LENGTH: 6,        // Need at least N headings to check
    OSCILLATION_REVERSAL_THRESHOLD: 3,  // N+ reversals = oscillation

    // === INDEPENDENCE BEHAVIOR ===
    // Random solo swimming behavior
    INDEPENDENCE_CHECK_MIN: 3000,       // Min time between checks (ms)
    INDEPENDENCE_CHECK_MAX: 10000,      // Max time between checks (ms)
    INDEPENDENCE_CHANCE_MIN: 0.05,      // Min chance to go independent (5%)
    INDEPENDENCE_CHANCE_MAX: 0.15,      // Max chance to go independent (15%)
    INDEPENDENCE_DURATION_MIN: 2000,    // Min independent duration (ms)
    INDEPENDENCE_DURATION_MAX: 8000,    // Max independent duration (ms)

    // === SCATTER BEHAVIOR ===
    // Random scattering behavior
    SCATTER_EASE_TIME: 2000,            // Time to ease back to flocking (ms)
    SCATTER_FORCE_MULTIPLIER: 5,        // Scatter forces are N x stronger than normal
    SCATTER_SPEED_BOOST: 0.3,           // Speed increase during scatter (30%)
    SCATTER_INDIVIDUAL_MIN: 1000,       // Min individual scatter duration (ms)
    SCATTER_INDIVIDUAL_MAX: 2500,       // Max individual scatter duration (ms)
    SCATTER_NEXT_MIN: 20000,             // Min time until next random scatter (ms)
    SCATTER_NEXT_MAX: 60000,            // Max time until next random scatter (ms)
    SCATTER_SPEED_MIN: 0.8,             // Min scatter speed multiplier
    SCATTER_SPEED_MAX: 1.5,             // Max scatter speed multiplier

    // === FLOCKING FORCES ===
    // (Note: These are in flocking-forces.js, may need separate config)
    MAX_NEIGHBORS: 8,                   // Limit neighbors for performance
};
