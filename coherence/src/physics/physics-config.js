/**
 * Physics configuration for coherence visualization
 * Centralized constants for tuning behavior
 */

export const PHYSICS_CONFIG = {
    // Perception & interaction
    PERCEPTION_RADIUS: 60,
    SEPARATION_RADIUS: 25,

    // Base force weights (will be modulated by coherence level)
    ALIGNMENT_WEIGHT: 1.0,
    COHESION_WEIGHT: 1.0,
    SEPARATION_WEIGHT: 1.5,

    // Inter-group interaction weights
    INTER_GROUP_ALIGNMENT_WEIGHT: 1.0,
    INTER_GROUP_COHESION_WEIGHT: 1.0,
    INTER_GROUP_REPULSION_WEIGHT: 2.0,

    // Central attractor (active when coherence > 0)
    ATTRACTOR_WEIGHT: 0.8,      // Pulls boids toward center
    ORBITAL_WEIGHT: 0.3,         // Adds circular motion around center

    // Coherence smoothing
    COHERENCE_DEAD_ZONE: 0.05,  // No forces applied in range [-0.05, +0.05]
                                 // Prevents harsh transitions around zero

    // Movement constraints
    MAX_FORCE: 0.15,
    MAX_SPEED: 2.5,

    // Force smoothing (higher = smoother, slower response)
    FORCE_SMOOTHING: 0.15,

    // Edge behavior
    EDGE_MARGIN: 50,
    TURN_FORCE: 0.3,

    // Visual
    BOID_SIZE: 8,
    TRAIL_LENGTH: 20,
    TRAIL_FADE: 0.95,
};
