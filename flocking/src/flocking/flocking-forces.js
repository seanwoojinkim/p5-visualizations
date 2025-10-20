/**
 * Flocking Force Calculations
 * Pure functions for calculating alignment, cohesion, and separation forces
 * Extracted from sketch.js Boid class methods
 */

import { PHYSICS_CONFIG } from './physics-config.js';

/**
 * Find neighbors within perception radius
 * @param {Object} boid - The boid to find neighbors for
 * @param {Array} flock - Array of all boids
 * @param {number} perceptionRadius - How far the boid can "see"
 * @returns {Array} - Array of neighboring boids
 */
export function findNeighbors(boid, flock, perceptionRadius) {
    const neighborsWithDistance = [];

    for (let other of flock) {
        if (other === boid) continue;

        const d = dist(
            boid.position.x, boid.position.y,
            other.position.x, other.position.y
        );

        if (d < perceptionRadius) {
            neighborsWithDistance.push({ boid: other, distance: d });
        }
    }

    // Sort by distance and limit to closest N neighbors
    // This prevents oscillation from too many conflicting forces
    neighborsWithDistance.sort((a, b) => a.distance - b.distance);
    const closestNeighbors = neighborsWithDistance.slice(0, PHYSICS_CONFIG.MAX_NEIGHBORS);

    return closestNeighbors.map(n => n.boid);
}

/**
 * Calculate alignment steering force
 * Steer towards the average heading of nearby boids
 * @param {Object} boid - The boid
 * @param {Array} neighbors - Nearby boids
 * @param {number} maxSpeed - Maximum speed
 * @param {number} maxForce - Maximum steering force
 * @param {Function} createVector - p5.Vector constructor
 * @returns {Object} - Steering force vector
 */
export function calculateAlignment(boid, neighbors, maxSpeed, maxForce, createVector) {
    let steering = createVector();

    if (neighbors.length === 0) return steering;

    for (let other of neighbors) {
        steering.add(other.velocity);
    }

    steering.div(neighbors.length);
    steering.setMag(maxSpeed);
    steering.sub(boid.velocity);
    steering.limit(maxForce);

    return steering;
}

/**
 * Calculate cohesion steering force
 * Steer towards the center of mass of nearby boids
 * @param {Object} boid - The boid
 * @param {Array} neighbors - Nearby boids
 * @param {number} maxSpeed - Maximum speed
 * @param {number} maxForce - Maximum steering force
 * @param {Function} createVector - p5.Vector constructor
 * @returns {Object} - Steering force vector
 */
export function calculateCohesion(boid, neighbors, maxSpeed, maxForce, createVector) {
    let steering = createVector();

    if (neighbors.length === 0) return steering;

    for (let other of neighbors) {
        steering.add(other.position);
    }

    steering.div(neighbors.length);
    steering.sub(boid.position);
    steering.setMag(maxSpeed);
    steering.sub(boid.velocity);
    steering.limit(maxForce);

    return steering;
}

/**
 * Calculate separation steering force
 * Steer away from nearby boids to avoid crowding
 * @param {Object} boid - The boid
 * @param {Array} neighbors - Nearby boids
 * @param {number} perceptionRadius - Perception radius
 * @param {number} maxSpeed - Maximum speed
 * @param {number} maxForce - Maximum steering force
 * @param {Function} createVector - p5.Vector constructor
 * @param {Object} p5 - p5 instance for p5.Vector.sub
 * @returns {Object} - Steering force vector
 */
export function calculateSeparation(boid, neighbors, perceptionRadius, maxSpeed, maxForce, createVector, p5) {
    let steering = createVector();
    let total = 0;

    for (let other of neighbors) {
        let d = dist(
            boid.position.x, boid.position.y,
            other.position.x, other.position.y
        );

        // Larger separation distance to keep them more spread out
        if (d < perceptionRadius * 0.7) {
            let diff = p5.Vector.sub(boid.position, other.position);

            // Prevent extreme forces when very close - cap minimum distance
            const minDist = 8;
            if (d < minDist) d = minDist;

            diff.div(d * d); // Weight by distance
            steering.add(diff);
            total++;
        }
    }

    if (total > 0) {
        steering.div(total);
        steering.setMag(maxSpeed);
        steering.sub(boid.velocity);
        steering.limit(maxForce);
    }

    return steering;
}

/**
 * Calculate escape steering force to break out of oscillation
 * Steer towards a direction 45-90 degrees from current heading
 * @param {Object} boid - The boid
 * @param {number} escapeDirection - Target heading in radians
 * @param {number} maxSpeed - Maximum speed
 * @param {number} maxForce - Maximum steering force
 * @param {Object} p5 - p5 instance for Vector operations
 * @returns {Object} - Steering force vector
 */
export function calculateEscapeForce(boid, escapeDirection, maxSpeed, maxForce, p5) {
    // Create a target velocity in the escape direction
    const targetVelocity = p5.Vector.fromAngle(escapeDirection, maxSpeed * 1.2);

    // Calculate steering force to reach that velocity
    const steering = p5.Vector.sub(targetVelocity, boid.velocity);
    steering.limit(maxForce * 2); // Stronger force to break out of oscillation

    return steering;
}

/**
 * Helper: Calculate distance between two points
 */
function dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}
