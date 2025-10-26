/**
 * GroupManager - manages both groups of boids and their interactions
 */

import { Boid } from './boid.js';
import { calculateBoidForces } from './coherence-forces.js';
import { PHYSICS_CONFIG } from './physics-config.js';
import { SpatialHash } from './spatial-hash.js';

export class GroupManager {
    constructor(numBoidsPerGroup) {
        this.group1 = [];  // Blue group
        this.group2 = [];  // Red group

        // Spatial hash for fast neighbor queries
        this.spatialHash = new SpatialHash(PHYSICS_CONFIG.PERCEPTION_RADIUS * 2);

        this.initializeGroups(numBoidsPerGroup);
    }

    /**
     * Initialize both groups with random positions
     */
    initializeGroups(numBoidsPerGroup) {
        this.group1 = [];
        this.group2 = [];

        // Create group 1 (blue) - start on left side
        for (let i = 0; i < numBoidsPerGroup; i++) {
            const x = random(width * 0.1, width * 0.4);
            const y = random(height * 0.2, height * 0.8);
            this.group1.push(new Boid(x, y, 0));
        }

        // Create group 2 (red) - start on right side
        for (let i = 0; i < numBoidsPerGroup; i++) {
            const x = random(width * 0.6, width * 0.9);
            const y = random(height * 0.2, height * 0.8);
            this.group2.push(new Boid(x, y, 1));
        }
    }

    /**
     * Get all boids from both groups
     */
    getAllBoids() {
        return [...this.group1, ...this.group2];
    }

    /**
     * Update all boids
     */
    update(params) {
        if (params.pauseSimulation) return;

        const allBoids = this.getAllBoids();
        const coherenceLevel = params.coherenceLevel;

        // Rebuild spatial hash for this frame
        this.spatialHash.clear();
        for (const boid of allBoids) {
            this.spatialHash.insert(boid);
        }

        // Center point for attractor (center of screen)
        const centerPoint = createVector(width / 2, height / 2);

        // Calculate forces for each boid (using spatial hash for neighbor queries)
        for (const boid of allBoids) {
            // Get nearby boids using spatial hash (much faster than checking all boids)
            const nearbyBoids = this.spatialHash.getNearby(boid);
            const forces = calculateBoidForces(boid, nearbyBoids, coherenceLevel, centerPoint);

            // Apply all forces
            boid.applyForce(forces.alignment);
            boid.applyForce(forces.cohesion);
            boid.applyForce(forces.separation);
            boid.applyForce(forces.interGroupForce);
            boid.applyForce(forces.attractorForce);
            boid.applyForce(forces.orbitalForce);

            // Optional: edge avoidance instead of wrapping
            // boid.avoidEdges();
        }

        // Update all boid positions
        for (const boid of allBoids) {
            boid.update(params);
        }
    }

    /**
     * Get the center point for the attractor
     */
    getCenterPoint() {
        return createVector(width / 2, height / 2);
    }

    /**
     * Adjust the number of boids in each group
     */
    adjustBoidCount(newCount) {
        // Adjust group 1
        while (this.group1.length < newCount) {
            const x = random(width);
            const y = random(height);
            this.group1.push(new Boid(x, y, 0));
        }
        while (this.group1.length > newCount) {
            this.group1.pop();
        }

        // Adjust group 2
        while (this.group2.length < newCount) {
            const x = random(width);
            const y = random(height);
            this.group2.push(new Boid(x, y, 1));
        }
        while (this.group2.length > newCount) {
            this.group2.pop();
        }
    }

    /**
     * Get statistics about the simulation
     */
    getStats() {
        const allBoids = this.getAllBoids();

        // Calculate average velocities for each group
        const avgVel1 = createVector(0, 0);
        for (const boid of this.group1) {
            avgVel1.add(boid.velocity);
        }
        avgVel1.div(this.group1.length);

        const avgVel2 = createVector(0, 0);
        for (const boid of this.group2) {
            avgVel2.add(boid.velocity);
        }
        avgVel2.div(this.group2.length);

        // Calculate alignment between groups (dot product of normalized velocities)
        const alignment = avgVel1.copy().normalize().dot(avgVel2.copy().normalize());

        // Calculate center of mass for each group
        const center1 = createVector(0, 0);
        for (const boid of this.group1) {
            center1.add(boid.position);
        }
        center1.div(this.group1.length);

        const center2 = createVector(0, 0);
        for (const boid of this.group2) {
            center2.add(boid.position);
        }
        center2.div(this.group2.length);

        const distanceBetweenGroups = p5.Vector.dist(center1, center2);

        return {
            totalBoids: allBoids.length,
            group1Count: this.group1.length,
            group2Count: this.group2.length,
            alignment: alignment,
            distanceBetweenGroups: distanceBetweenGroups,
        };
    }
}
