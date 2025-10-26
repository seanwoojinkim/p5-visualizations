/**
 * Pure functions for calculating flocking and coherence forces
 * These functions implement the core behavior of the visualization
 */

import { PHYSICS_CONFIG } from './physics-config.js';

/**
 * Find nearby boids within perception radius (optimized with squared distance)
 */
export function findNeighbors(boid, allBoids, perceptionRadius) {
    const neighbors = [];
    const radiusSq = perceptionRadius * perceptionRadius;

    for (const other of allBoids) {
        if (other === boid) continue;

        // Use squared distance to avoid expensive sqrt
        const dx = boid.position.x - other.position.x;
        const dy = boid.position.y - other.position.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < radiusSq) {
            neighbors.push(other);
        }
    }

    return neighbors;
}

/**
 * Separate neighbors by group
 */
export function separateNeighborsByGroup(boid, neighbors) {
    const sameGroup = [];
    const otherGroup = [];

    for (const neighbor of neighbors) {
        if (neighbor.groupId === boid.groupId) {
            sameGroup.push(neighbor);
        } else {
            otherGroup.push(neighbor);
        }
    }

    return { sameGroup, otherGroup };
}

/**
 * Alignment: steer towards average heading of neighbors
 */
export function calculateAlignment(boid, neighbors, weight = 1.0) {
    if (neighbors.length === 0) return createVector(0, 0);

    const avgVelocity = createVector(0, 0);
    for (const neighbor of neighbors) {
        avgVelocity.add(neighbor.velocity);
    }
    avgVelocity.div(neighbors.length);

    avgVelocity.setMag(PHYSICS_CONFIG.MAX_SPEED);
    const steer = p5.Vector.sub(avgVelocity, boid.velocity);
    steer.limit(PHYSICS_CONFIG.MAX_FORCE);
    steer.mult(weight);

    return steer;
}

/**
 * Cohesion: steer towards average position of neighbors
 */
export function calculateCohesion(boid, neighbors, weight = 1.0) {
    if (neighbors.length === 0) return createVector(0, 0);

    const center = createVector(0, 0);
    for (const neighbor of neighbors) {
        center.add(neighbor.position);
    }
    center.div(neighbors.length);

    const desired = p5.Vector.sub(center, boid.position);
    desired.setMag(PHYSICS_CONFIG.MAX_SPEED);
    const steer = p5.Vector.sub(desired, boid.velocity);
    steer.limit(PHYSICS_CONFIG.MAX_FORCE);
    steer.mult(weight);

    return steer;
}

/**
 * Separation: steer away from neighbors that are too close
 */
export function calculateSeparation(boid, neighbors, weight = 1.5) {
    if (neighbors.length === 0) return createVector(0, 0);

    const steer = createVector(0, 0);
    let count = 0;

    for (const neighbor of neighbors) {
        const d = p5.Vector.dist(boid.position, neighbor.position);
        if (d < PHYSICS_CONFIG.SEPARATION_RADIUS) {
            const diff = p5.Vector.sub(boid.position, neighbor.position);
            diff.normalize();
            diff.div(d);  // Weight by distance
            steer.add(diff);
            count++;
        }
    }

    if (count > 0) {
        steer.div(count);
        steer.setMag(PHYSICS_CONFIG.MAX_SPEED);
        steer.sub(boid.velocity);
        steer.limit(PHYSICS_CONFIG.MAX_FORCE);
        steer.mult(weight);
    }

    return steer;
}

/**
 * Repulsion: steer away from other group
 */
export function calculateRepulsion(boid, otherGroupNeighbors, weight = 2.0) {
    if (otherGroupNeighbors.length === 0) return createVector(0, 0);

    const steer = createVector(0, 0);

    for (const other of otherGroupNeighbors) {
        const diff = p5.Vector.sub(boid.position, other.position);
        const d = diff.mag();
        diff.normalize();
        diff.div(d);  // Weight by distance (closer = stronger repulsion)
        steer.add(diff);
    }

    steer.div(otherGroupNeighbors.length);
    steer.setMag(PHYSICS_CONFIG.MAX_SPEED);
    steer.sub(boid.velocity);
    steer.limit(PHYSICS_CONFIG.MAX_FORCE);
    steer.mult(weight);

    return steer;
}

/**
 * Central Attractor: pull boids toward the center point
 * Creates a circular gathering pattern when coherence is positive
 */
export function calculateAttractorForce(boid, centerPoint, weight = 1.0) {
    const desired = p5.Vector.sub(centerPoint, boid.position);
    const distance = desired.mag();

    // Attractor strength decreases with distance (inverse square-ish)
    desired.normalize();
    desired.mult(PHYSICS_CONFIG.MAX_SPEED);

    const steer = p5.Vector.sub(desired, boid.velocity);
    steer.limit(PHYSICS_CONFIG.MAX_FORCE);
    steer.mult(weight);

    return steer;
}

/**
 * Orbital Force: adds tangential velocity for circular motion around center
 * This creates a swirling, orbiting effect around the attractor
 */
export function calculateOrbitalForce(boid, centerPoint, weight = 0.5) {
    const toCenter = p5.Vector.sub(centerPoint, boid.position);
    const distance = toCenter.mag();

    // Create perpendicular vector for orbital motion
    const tangent = createVector(-toCenter.y, toCenter.x);
    tangent.normalize();
    tangent.mult(PHYSICS_CONFIG.MAX_SPEED * 0.8);

    const steer = p5.Vector.sub(tangent, boid.velocity);
    steer.limit(PHYSICS_CONFIG.MAX_FORCE);
    steer.mult(weight);

    return steer;
}

/**
 * Smooth coherence scaling function
 * Uses quadratic easing to make small coherence values have gentler effects
 * and high coherence values have more dramatic effects
 */
function smoothCoherenceScale(coherenceLevel, deadZone = 0.05) {
    const absCoherence = Math.abs(coherenceLevel);

    // Dead zone: no forces applied in the range [-deadZone, +deadZone]
    if (absCoherence < deadZone) {
        return 0;
    }

    // Remap to 0-1 range outside dead zone
    const remapped = (absCoherence - deadZone) / (1.0 - deadZone);

    // Apply quadratic easing for smooth acceleration
    // This makes low values (0.1-0.3) gentler and high values (0.7-1.0) stronger
    const smoothed = remapped * remapped;

    // Preserve sign
    return coherenceLevel >= 0 ? smoothed : -smoothed;
}

/**
 * Calculate all forces for a boid based on coherence level
 * coherenceLevel: -1.0 (full repulsion) to 1.0 (full alignment/coherence)
 *
 * Now uses smooth scaling with dead zone to prevent discontinuous jumps
 * around coherence = 0
 */
export function calculateBoidForces(boid, allBoids, coherenceLevel, centerPoint) {
    const neighbors = findNeighbors(boid, allBoids, PHYSICS_CONFIG.PERCEPTION_RADIUS);
    const { sameGroup, otherGroup } = separateNeighborsByGroup(boid, neighbors);

    // Same-group forces (always active)
    // Boost separation at high coherence to maintain visual distinctness
    const separationBoost = coherenceLevel > 0 ? 1.0 + (coherenceLevel * 0.8) : 1.0;

    const alignment = calculateAlignment(boid, sameGroup, PHYSICS_CONFIG.ALIGNMENT_WEIGHT);
    const cohesion = calculateCohesion(boid, sameGroup, PHYSICS_CONFIG.COHESION_WEIGHT);
    const separation = calculateSeparation(boid, sameGroup, PHYSICS_CONFIG.SEPARATION_WEIGHT * separationBoost);

    // Inter-group forces (modulated by coherence level)
    let interGroupForce = createVector(0, 0);
    let attractorForce = createVector(0, 0);
    let orbitalForce = createVector(0, 0);

    // Apply smooth scaling with dead zone
    const smoothedCoherence = smoothCoherenceScale(coherenceLevel, PHYSICS_CONFIG.COHERENCE_DEAD_ZONE);

    if (smoothedCoherence < 0) {
        // Negative coherence = repulsion
        // Smoothed scaling prevents harsh jumps at low repulsion values
        const repulsionStrength = -smoothedCoherence;
        const repulsion = calculateRepulsion(
            boid,
            otherGroup,
            PHYSICS_CONFIG.INTER_GROUP_REPULSION_WEIGHT * repulsionStrength
        );
        interGroupForce.add(repulsion);
    } else if (smoothedCoherence > 0) {
        // Positive coherence = alignment and cohesion with other group
        // Smoothed scaling makes low coherence gentler, high coherence more dramatic
        const alignmentForce = calculateAlignment(
            boid,
            otherGroup,
            PHYSICS_CONFIG.INTER_GROUP_ALIGNMENT_WEIGHT * smoothedCoherence
        );
        const cohesionForce = calculateCohesion(
            boid,
            otherGroup,
            PHYSICS_CONFIG.INTER_GROUP_COHESION_WEIGHT * smoothedCoherence
        );
        interGroupForce.add(alignmentForce);
        interGroupForce.add(cohesionForce);

        // Also apply separation from other group to maintain individual space
        const interGroupSeparation = calculateSeparation(
            boid,
            otherGroup,
            PHYSICS_CONFIG.SEPARATION_WEIGHT * 0.6
        );
        interGroupForce.add(interGroupSeparation);

        // Add central attractor force (grows with coherence)
        // Use original coherenceLevel for attractor to keep it responsive
        // but apply smoothing to prevent harsh jumps
        const attractorStrength = smoothedCoherence;
        attractorForce = calculateAttractorForce(
            boid,
            centerPoint,
            PHYSICS_CONFIG.ATTRACTOR_WEIGHT * attractorStrength
        );

        // Add orbital force for circular motion (grows with coherence)
        orbitalForce = calculateOrbitalForce(
            boid,
            centerPoint,
            PHYSICS_CONFIG.ORBITAL_WEIGHT * attractorStrength
        );
    }

    // Return all forces
    return {
        alignment,
        cohesion,
        separation,
        interGroupForce,
        attractorForce,
        orbitalForce
    };
}
