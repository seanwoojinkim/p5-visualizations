/**
 * Flock Manager
 * Orchestrates the flock behavior, applying forces and updating all boids
 */

import { Boid } from './boid.js';
import { findNeighbors, calculateAlignment, calculateCohesion, calculateSeparation, calculateEscapeForce } from './flocking-forces.js';

export class FlockManager {
    /**
     * Create a new flock manager
     * @param {number} numBoids - Initial number of boids
     * @param {number} width - Width of the space
     * @param {number} height - Height of the space
     * @param {Object} p5Funcs - p5.js functions {random, createVector, floor}
     */
    constructor(numBoids, width, height, p5Funcs) {
        this.boids = [];
        this.width = width;
        this.height = height;
        this.p5Funcs = p5Funcs;
        this.p5 = p5Funcs.p5Instance;  // Need p5 instance for Vector operations

        // Initialize flock
        for (let i = 0; i < numBoids; i++) {
            this.boids.push(new Boid(
                width,
                height,
                p5Funcs.random,
                p5Funcs.createVector,
                p5Funcs.floor,
                this.p5
            ));
        }
    }

    /**
     * Update all boids with flocking behavior
     * @param {Object} params - Flocking parameters
     * @param {Object} audioData - Audio data for reactivity
     */
    update(params, audioData) {
        // Check if global scatter is active (more than half the flock scattering)
        const globalScatterActive = this.isAnyBoidScattering();

        for (let boid of this.boids) {
            // Check if this boid is escaping oscillation
            const isEscaping = boid.getIsEscaping();
            const escapeDirection = boid.getEscapeDirection();

            if (isEscaping && escapeDirection !== null) {
                // Apply strong escape force to break out of oscillation
                const escapeForce = calculateEscapeForce(
                    boid,
                    escapeDirection,
                    params.maxSpeed,
                    params.maxForce,
                    this.p5
                );

                // Override normal forces with escape force
                boid.applyForces({
                    alignment: this.p5Funcs.createVector(),
                    cohesion: this.p5Funcs.createVector(),
                    separation: escapeForce
                }, 0, this.p5Funcs.random);
            } else {
                // Check if this boid is independent
                const isIndependent = boid.getIsIndependent();

                if (!isIndependent) {
                    // Normal flocking behavior
                    const neighbors = findNeighbors(boid, this.boids, boid.perceptionRadius);
                    const forces = this.calculateFlockingForces(boid, neighbors, params, audioData);
                    boid.applyForces(forces, neighbors.length, this.p5Funcs.random, params.maxForce, this.p5);
                }
                // If independent, don't apply flocking forces - they just drift
            }

            // Update physics (includes independence, escape, and scatter state updates)
            boid.update(
                params.maxSpeed,
                audioData.amplitude,
                params.audioReactivity,
                this.p5,
                this.p5Funcs.random,
                this.p5Funcs.createVector,
                globalScatterActive
            );
            boid.edges(this.width, this.height);
        }
    }

    /**
     * Calculate combined flocking forces
     * Forces are smoothed in Boid.applyForces() to avoid double-smoothing
     * @param {Object} boid - The boid
     * @param {Array} neighbors - Neighboring boids
     * @param {Object} params - Flocking parameters
     * @param {Object} audioData - Audio data
     * @returns {Object} - Combined forces {alignment, cohesion, separation}
     */
    calculateFlockingForces(boid, neighbors, params, audioData) {
        const { createVector } = this.p5Funcs;

        // Calculate raw forces
        const alignment = calculateAlignment(
            boid,
            neighbors,
            params.maxSpeed,
            params.maxForce,
            createVector
        );

        const cohesion = calculateCohesion(
            boid,
            neighbors,
            params.maxSpeed,
            params.maxForce,
            createVector
        );

        const separation = calculateSeparation(
            boid,
            neighbors,
            boid.perceptionRadius,
            params.maxSpeed,
            params.maxForce,
            createVector,
            this.p5
        );

        // Weight the forces (smoothing happens in Boid.applyForces)
        alignment.mult(params.alignmentWeight);
        cohesion.mult(params.cohesionWeight);

        // Bass makes them separate more - push away on bass hits (gentle)
        const bassBoost = 1 + audioData.bass * 1.5 * params.audioReactivity;
        separation.mult(params.separationWeight * bassBoost);

        return {
            alignment,
            cohesion,
            separation
        };
    }

    /**
     * Resize the flock
     * @param {number} newCount - New number of boids
     */
    resize(newCount) {
        if (newCount > this.boids.length) {
            // Add more boids
            for (let i = this.boids.length; i < newCount; i++) {
                this.boids.push(new Boid(
                    this.width,
                    this.height,
                    this.p5Funcs.random,
                    this.p5Funcs.createVector,
                    this.p5Funcs.floor,
                    this.p5
                ));
            }
        } else {
            // Remove boids
            this.boids = this.boids.slice(0, newCount);
        }
    }

    /**
     * Reinitialize the entire flock
     */
    reset() {
        const count = this.boids.length;
        this.boids = [];
        for (let i = 0; i < count; i++) {
            this.boids.push(new Boid(
                this.width,
                this.height,
                this.p5Funcs.random,
                this.p5Funcs.createVector,
                this.p5Funcs.floor,
                this.p5
            ));
        }
    }

    /**
     * Trigger global scatter - all boids scatter in random directions
     * @param {number} duration - How long to scatter (milliseconds)
     */
    triggerScatter(duration = 3000) {
        for (let boid of this.boids) {
            // Generate random direction for each boid
            const angle = this.p5Funcs.random(0, Math.PI * 2);
            const speed = this.p5Funcs.random(0.8, 1.5);
            const direction = this.p5Funcs.createVector(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );

            boid.triggerScatter(duration, direction);
        }
    }

    /**
     * Check if any boids are currently scattering (for global scatter detection)
     * @returns {boolean}
     */
    isAnyBoidScattering() {
        return this.boids.some(boid => boid.getScatterIntensity() > 0.5);
    }
}
