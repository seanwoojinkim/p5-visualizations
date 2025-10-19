/**
 * Flock Manager
 * Orchestrates the flock behavior, applying forces and updating all boids
 */

import { Boid } from './boid.js';
import { findNeighbors, calculateAlignment, calculateCohesion, calculateSeparation } from './flocking-forces.js';

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
        for (let boid of this.boids) {
            // Check if this boid is independent
            const isIndependent = boid.getIsIndependent();

            if (!isIndependent) {
                // Normal flocking behavior
                const neighbors = findNeighbors(boid, this.boids, boid.perceptionRadius);
                const forces = this.calculateFlockingForces(boid, neighbors, params, audioData);
                boid.applyForces(forces);
            }
            // If independent, don't apply flocking forces - they just drift

            // Update physics (includes independence state updates)
            boid.update(params.maxSpeed, audioData.amplitude, params.audioReactivity, this.p5, this.p5Funcs.random);
            boid.edges(this.width, this.height);
        }
    }

    /**
     * Calculate combined flocking forces with smoothing
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

        // Smooth the forces by blending with previous frame
        const forceSmoothness = 0.3;  // Lower = smoother, higher = more responsive
        const smoothedAlignment = this.p5.Vector.lerp(
            boid.previousAlignment.copy(),
            alignment,
            forceSmoothness
        );
        const smoothedCohesion = this.p5.Vector.lerp(
            boid.previousCohesion.copy(),
            cohesion,
            forceSmoothness
        );
        const smoothedSeparation = this.p5.Vector.lerp(
            boid.previousSeparation.copy(),
            separation,
            forceSmoothness
        );

        // Store smoothed forces for next frame
        boid.previousAlignment = smoothedAlignment.copy();
        boid.previousCohesion = smoothedCohesion.copy();
        boid.previousSeparation = smoothedSeparation.copy();

        // Weight the forces
        smoothedAlignment.mult(params.alignmentWeight);
        smoothedCohesion.mult(params.cohesionWeight);

        // Bass makes them separate more - push away on bass hits (gentle)
        const bassBoost = 1 + audioData.bass * 1.5 * params.audioReactivity;
        smoothedSeparation.mult(params.separationWeight * bassBoost);

        return {
            alignment: smoothedAlignment,
            cohesion: smoothedCohesion,
            separation: smoothedSeparation
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
}
