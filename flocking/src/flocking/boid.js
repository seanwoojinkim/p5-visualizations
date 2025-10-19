/**
 * Boid Class
 * Physics and state only - no rendering logic
 * Stores koi appearance data (variety, pattern, size) but doesn't render itself
 */

import { selectVariety, generatePattern } from '../core/koi-varieties.js';

export class Boid {
    /**
     * Create a new boid with random position, velocity, and koi appearance
     * @param {number} width - Width of the space
     * @param {number} height - Height of the space
     * @param {Function} randomFunc - p5 random function
     * @param {Function} createVectorFunc - p5 createVector function
     * @param {Function} floorFunc - p5 floor function
     * @param {Object} p5 - p5 instance for Vector static methods
     */
    constructor(width, height, randomFunc, createVectorFunc, floorFunc, p5Instance) {
        // Physics
        this.position = createVectorFunc(randomFunc(width), randomFunc(height));
        this.velocity = p5Instance.Vector.random2D();
        this.velocity.setMag(randomFunc(0.5, 1.5));
        this.acceleration = createVectorFunc();
        this.perceptionRadius = 50;  // Reduced from 80 - fewer neighbors = less conflicting forces

        // Force smoothing - track previous frame's forces to reduce jerkiness
        this.previousSeparation = createVectorFunc();
        this.previousAlignment = createVectorFunc();
        this.previousCohesion = createVectorFunc();

        // Debug tracking for oscillation (rapid back-and-forth direction changes)
        this.previousHeading = this.velocity.heading();
        this.headingHistory = []; // Track last several headings
        this.debugOscillation = true; // Set to false to disable debug logging

        // Derivative damping - track heading velocity for PID D-term
        this.headingVelocity = 0;

        // Koi appearance (data only, no rendering)
        const variety = selectVariety(randomFunc);
        this.variety = variety;
        this.pattern = generatePattern(variety, randomFunc, floorFunc);
        this.color = variety.base;

        // Size variations
        this.sizeMultiplier = randomFunc(0.6, 1.4);
        this.lengthMultiplier = randomFunc(0.85, 1.25);
        this.tailLength = randomFunc(0.9, 1.8);

        // Speed variation - each koi has its own preferred speed around the global max
        this.speedMultiplier = randomFunc(0.6, 1.3);

        // Animation offset - each koi undulates at a different phase
        this.animationOffset = randomFunc(0, Math.PI * 2); // Random phase offset (0 to 2π)

        // Independence behavior
        this.isIndependent = false;
        this.independenceTimer = 0;
        this.independenceDuration = 0;
        this.independenceCheckInterval = randomFunc(180, 600); // Check every 3-10 seconds at 60fps
        this.independenceFrameCounter = 0;
        this.independenceChance = randomFunc(0.05, 0.15); // 5-15% chance when checking
    }

    /**
     * Apply forces to the boid's acceleration
     * Smooths forces over time to reduce jittery behavior
     * @param {Object} forces - Object containing force vectors {alignment, cohesion, separation}
     */
    applyForces(forces) {
        // Smooth forces by blending with previous frame
        // This reduces rapid oscillations when forces conflict
        const forceSmoothing = 0.25; // Increased from 0.15 - more responsive with damping

        // Lerp each force between previous and current
        const smoothedAlignment = this.previousAlignment.copy().lerp(forces.alignment, forceSmoothing);
        const smoothedCohesion = this.previousCohesion.copy().lerp(forces.cohesion, forceSmoothing);
        const smoothedSeparation = this.previousSeparation.copy().lerp(forces.separation, forceSmoothing);

        // Dead zone: ignore very small forces to prevent micro-oscillations
        // When forces are nearly balanced, tiny fluctuations cause jitter
        const deadZoneThreshold = 0.01; // Increased from 0.005

        if (smoothedAlignment.mag() < deadZoneThreshold) smoothedAlignment.set(0, 0);
        if (smoothedCohesion.mag() < deadZoneThreshold) smoothedCohesion.set(0, 0);
        if (smoothedSeparation.mag() < deadZoneThreshold) smoothedSeparation.set(0, 0);

        // Store current forces for next frame
        this.previousAlignment = forces.alignment.copy();
        this.previousCohesion = forces.cohesion.copy();
        this.previousSeparation = forces.separation.copy();

        // Apply smoothed forces
        // Note: In 2D top-down view, koi can overlap (swimming over/under)
        // so we don't need aggressive separation
        this.acceleration.add(smoothedAlignment);
        this.acceleration.add(smoothedCohesion);
        this.acceleration.add(smoothedSeparation);
    }

    /**
     * Update position and velocity
     * @param {number} maxSpeed - Maximum speed
     * @param {number} audioAmplitude - Audio amplitude for speed modulation
     * @param {number} audioReactivity - How much audio affects the boid
     * @param {Object} p5 - p5 instance for Vector operations
     * @param {Function} randomFunc - Random function for independence checks
     */
    update(maxSpeed, audioAmplitude, audioReactivity, p5, randomFunc) {
        // Update independence behavior
        this.updateIndependence(randomFunc);

        // DERIVATIVE DAMPING (PID D-term) - resist rapid heading changes
        const currentHeading = this.velocity.heading();
        let headingChange = currentHeading - this.previousHeading;

        // Normalize angle difference to -PI to PI range
        while (headingChange > Math.PI) headingChange -= Math.PI * 2;
        while (headingChange < -Math.PI) headingChange += Math.PI * 2;

        // Calculate damping force perpendicular to velocity
        const dampingCoefficient = 0.15; // Tuning parameter: higher = more resistance to turning (reduced from 0.3)
        const speed = this.velocity.mag();

        if (speed > 0.1) { // Only apply damping if moving
            // Damping force magnitude opposes heading change
            const dampingMagnitude = headingChange * -dampingCoefficient * speed;

            // Apply perpendicular to current velocity direction
            const perpAngle = currentHeading + Math.PI / 2;
            const dampingForce = p5.Vector.fromAngle(perpAngle, dampingMagnitude);

            // Add damping to acceleration
            this.acceleration.add(dampingForce);
        }

        this.position.add(this.velocity);

        // Smooth velocity changes - creates more fluid, graceful movement
        let targetVelocity = p5.Vector.add(this.velocity, this.acceleration);

        // Apply individual speed variation and audio modulation
        const audioSpeedMult = 1 + audioAmplitude * audioReactivity;
        const individualMaxSpeed = maxSpeed * this.speedMultiplier * audioSpeedMult;
        targetVelocity.limit(individualMaxSpeed);

        // Smoothly interpolate from current velocity to target velocity
        const smoothing = 0.15;  // Increased from 0.08 - more responsive with damping
        this.velocity.lerp(targetVelocity, smoothing);

        // Debug: detect oscillation (rapid back-and-forth direction changes)
        if (this.debugOscillation) {
            const currentHeading = this.velocity.heading();

            // Add current heading to history
            this.headingHistory.push(currentHeading);

            // Keep only last 10 frames
            if (this.headingHistory.length > 10) {
                this.headingHistory.shift();
            }

            // Check for oscillation if we have enough history
            if (this.headingHistory.length >= 6) {
                // Calculate direction changes between consecutive frames
                const changes = [];
                for (let i = 1; i < this.headingHistory.length; i++) {
                    let diff = this.headingHistory[i] - this.headingHistory[i - 1];
                    // Normalize to -PI to PI
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    changes.push(diff);
                }

                // Count direction reversals (sign changes in consecutive changes)
                let reversals = 0;
                for (let i = 1; i < changes.length; i++) {
                    // If signs are opposite, it's a reversal
                    if ((changes[i] > 0 && changes[i-1] < 0) || (changes[i] < 0 && changes[i-1] > 0)) {
                        reversals++;
                    }
                }

                // If we have 3+ reversals in last 6 frames, that's oscillation
                if (reversals >= 3) {
                    console.log(`Oscillation detected: ${reversals} reversals in last ${this.headingHistory.length} frames`, {
                        position: `(${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)})`,
                        variety: this.variety.name,
                        speed: this.velocity.mag().toFixed(2),
                        isIndependent: this.isIndependent,
                        changePattern: changes.map(c => (c * 180 / Math.PI).toFixed(1) + '°').join(', ')
                    });
                    // Clear history after logging to avoid spam
                    this.headingHistory = [];
                }
            }

            this.previousHeading = currentHeading;
        }

        // Reset acceleration to zero for next frame
        this.acceleration.set(0, 0, 0);
    }

    /**
     * Update independence behavior - periodically decide to go solo
     * @param {Function} randomFunc - Random function
     */
    updateIndependence(randomFunc) {
        if (this.isIndependent) {
            // Currently independent - count down
            this.independenceTimer--;
            if (this.independenceTimer <= 0) {
                this.isIndependent = false;
            }
        } else {
            // Not independent - check if it's time to evaluate
            this.independenceFrameCounter++;
            if (this.independenceFrameCounter >= this.independenceCheckInterval) {
                this.independenceFrameCounter = 0;

                // Roll the dice - should this koi go independent?
                if (randomFunc() < this.independenceChance) {
                    this.isIndependent = true;
                    // Go independent for 2-8 seconds (at 60fps)
                    this.independenceDuration = randomFunc(120, 480);
                    this.independenceTimer = this.independenceDuration;
                }
            }
        }
    }

    /**
     * Check if this boid is currently independent
     * @returns {boolean}
     */
    getIsIndependent() {
        return this.isIndependent;
    }

    /**
     * Handle edge wrapping
     * @param {number} width - Width of the space
     * @param {number} height - Height of the space
     */
    edges(width, height) {
        if (this.position.x > width) this.position.x = 0;
        if (this.position.x < 0) this.position.x = width;
        if (this.position.y > height) this.position.y = 0;
        if (this.position.y < 0) this.position.y = height;
    }
}
