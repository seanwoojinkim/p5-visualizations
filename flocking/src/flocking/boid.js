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

        // Oscillation escape behavior
        this.isEscaping = false;
        this.escapeEndTime = 0;
        this.escapeDirection = null;
        this.escapeCooldownEndTime = 0; // Prevent immediate re-triggering
    }

    /**
     * Apply forces to the boid's acceleration
     * Smooths forces over time to reduce jittery behavior
     * Implements force prioritization to reduce conflicts
     * @param {Object} forces - Object containing force vectors {alignment, cohesion, separation}
     * @param {number} neighborCount - Number of neighbors affecting this boid
     * @param {Function} randomFunc - Random function for triggering escape
     */
    applyForces(forces, neighborCount = 0, randomFunc = Math.random) {
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

        // FORCE PRIORITIZATION - Prevent oscillation from conflicting forces
        // When too close to neighbors, separation dominates
        const separationMag = smoothedSeparation.mag();

        let alignmentWeight = 1.0;
        let cohesionWeight = 1.0;
        let separationWeight = 1.0;

        if (separationMag > 0.05) {
            // High separation need - fish are too close
            // Separation dominates (90%), others reduced
            separationWeight = 0.9;
            alignmentWeight = 0.1;
            cohesionWeight = 0.1;
        } else if (separationMag > 0.02) {
            // Moderate separation need
            // Separation emphasized (70%), others balanced
            separationWeight = 0.7;
            alignmentWeight = 0.5;
            cohesionWeight = 0.5;
        }
        // else: balanced weights (all 1.0)

        // Apply weighted forces
        smoothedAlignment.mult(alignmentWeight);
        smoothedCohesion.mult(cohesionWeight);
        smoothedSeparation.mult(separationWeight);

        // OVERCROWDING DETECTION - Escape if too many neighbors or forces too high
        const totalForceMag = smoothedAlignment.mag() + smoothedCohesion.mag() + smoothedSeparation.mag();
        const now = Date.now();

        // Trigger escape if:
        // 1. Too many neighbors (>15 = overcrowding)
        // 2. Total force magnitude too high (>0.25 = force overload)
        if (!this.isEscaping && now > this.escapeCooldownEndTime) {
            if (neighborCount > 15 || totalForceMag > 0.25) {
                this.triggerEscapeManeuver(randomFunc);
                // Clear heading history to reset oscillation detection
                this.headingHistory = [];
            }
        }

        // Apply smoothed and weighted forces
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
        // Update escape behavior
        this.updateEscape();

        // Update independence behavior
        this.updateIndependence(randomFunc);

        // DERIVATIVE DAMPING (PID D-term) - resist rapid heading changes
        const currentHeading = this.velocity.heading();
        let headingChange = currentHeading - this.previousHeading;

        // Normalize angle difference to -PI to PI range
        while (headingChange > Math.PI) headingChange -= Math.PI * 2;
        while (headingChange < -Math.PI) headingChange += Math.PI * 2;

        // Calculate damping force perpendicular to velocity
        const dampingCoefficient = 0.45; // Tuning parameter: higher = more resistance to turning
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
                // But only trigger if not in cooldown period
                const now = Date.now();
                if (reversals >= 3 && !this.isEscaping && now > this.escapeCooldownEndTime) {
                    // Trigger escape maneuver
                    this.triggerEscapeManeuver(randomFunc);

                    // Clear history after triggering escape
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
     * Trigger escape maneuver to break out of oscillation
     * @param {Function} randomFunc - Random function
     */
    triggerEscapeManeuver(randomFunc) {
        this.isEscaping = true;
        this.escapeEndTime = Date.now() + randomFunc(1500, 3000); // Escape for 0.8-1.5 seconds

        // Pick a direction 45-90 degrees away from current heading
        const currentHeading = this.velocity.heading();
        const angleOffset = randomFunc(Math.PI / 4, Math.PI / 2); // 45-90 degrees
        const direction = randomFunc() > 0.5 ? 1 : -1; // Randomly left or right

        this.escapeDirection = currentHeading + (angleOffset * direction);
    }

    /**
     * Check if this boid is currently escaping oscillation
     * @returns {boolean}
     */
    getIsEscaping() {
        return this.isEscaping && Date.now() < this.escapeEndTime;
    }

    /**
     * Get the escape direction if currently escaping
     * @returns {number|null} - Heading in radians, or null
     */
    getEscapeDirection() {
        if (this.getIsEscaping()) {
            return this.escapeDirection;
        }
        return null;
    }

    /**
     * Update escape state
     */
    updateEscape() {
        if (this.isEscaping && Date.now() >= this.escapeEndTime) {
            this.isEscaping = false;
            this.escapeDirection = null;

            // Set cooldown period of 3-5 seconds to prevent immediate re-triggering
            this.escapeCooldownEndTime = Date.now() + (Math.random() * 2000 + 3000);

            // Clear heading history to reset oscillation detection
            this.headingHistory = [];
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
