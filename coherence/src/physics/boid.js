/**
 * Boid class - represents a single agent in the simulation
 * Each boid has position, velocity, and belongs to a group
 */

import { PHYSICS_CONFIG } from './physics-config.js';

export class Boid {
    constructor(x, y, groupId) {
        // Use p5.Vector for position and velocity
        this.position = createVector(x, y);
        this.velocity = createVector(random(-1, 1), random(-1, 1));
        this.velocity.setMag(random(0.5, PHYSICS_CONFIG.MAX_SPEED));

        this.acceleration = createVector(0, 0);
        this.groupId = groupId;  // 0 or 1

        // Color variation within group (hue offset from base color)
        // Gives each boid unique shade while maintaining team identity
        this.colorVariation = random(-0.15, 0.15);  // ±15% hue variation
        this.brightnessVariation = random(0.85, 1.15);  // ±15% brightness

        // Trail for visual effect
        this.trail = [];
    }

    /**
     * Apply a force to the boid
     */
    applyForce(force) {
        this.acceleration.add(force);
    }

    /**
     * Update position and velocity
     */
    update(params) {
        // Update velocity
        this.velocity.add(this.acceleration);
        this.velocity.limit(PHYSICS_CONFIG.MAX_SPEED);

        // Update position
        this.position.add(this.velocity);

        // Reset acceleration
        this.acceleration.mult(0);

        // Handle edges (wrap around) - do this BEFORE trail update
        const wrapped = this.wrapEdges();

        // Update trail (after wrapping to avoid artifacts)
        if (params.showTrails) {
            // Clear trail if we just wrapped to prevent cross-screen lines
            if (wrapped) {
                this.trail = [];
            }
            this.trail.push(this.position.copy());
            if (this.trail.length > params.trailLength) {
                this.trail.shift();
            }
        } else {
            this.trail = [];
        }
    }

    /**
     * Wrap around screen edges
     * Returns true if wrapping occurred
     */
    wrapEdges() {
        let wrapped = false;
        if (this.position.x > width) {
            this.position.x = 0;
            wrapped = true;
        }
        if (this.position.x < 0) {
            this.position.x = width;
            wrapped = true;
        }
        if (this.position.y > height) {
            this.position.y = 0;
            wrapped = true;
        }
        if (this.position.y < 0) {
            this.position.y = height;
            wrapped = true;
        }
        return wrapped;
    }

    /**
     * Apply edge avoidance force (alternative to wrapping)
     */
    avoidEdges() {
        const margin = PHYSICS_CONFIG.EDGE_MARGIN;
        const turnForce = PHYSICS_CONFIG.TURN_FORCE;

        if (this.position.x < margin) {
            const force = createVector(turnForce, 0);
            this.applyForce(force);
        }
        if (this.position.x > width - margin) {
            const force = createVector(-turnForce, 0);
            this.applyForce(force);
        }
        if (this.position.y < margin) {
            const force = createVector(0, turnForce);
            this.applyForce(force);
        }
        if (this.position.y > height - margin) {
            const force = createVector(0, -turnForce);
            this.applyForce(force);
        }
    }
}
