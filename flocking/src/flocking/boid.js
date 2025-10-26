/**
 * Boid Class
 * Physics and state only - no rendering logic
 * Stores koi appearance data (variety, pattern, size) but doesn't render itself
 */

import { selectVariety, generatePattern } from '../core/koi-varieties.js';
import { PHYSICS_CONFIG } from './physics-config.js';

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
        this.perceptionRadius = PHYSICS_CONFIG.PERCEPTION_RADIUS;

        // Force smoothing - track previous frame's forces to reduce jerkiness
        this.previousSeparation = createVectorFunc();
        this.previousAlignment = createVectorFunc();
        this.previousCohesion = createVectorFunc();

        // Debug tracking for oscillation (rapid back-and-forth direction changes)
        this.previousHeading = this.velocity.heading();
        this.headingHistory = []; // Track last PHYSICS_CONFIG.OSCILLATION_HISTORY_LENGTH headings
        this.debugOscillation = false; // Set to true to enable oscillation debug logging

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

        // === BOID STATE MANAGEMENT ===
        // Boids can be in multiple overlapping states. State precedence (highest to lowest):
        // 1. ESCAPING - Takes complete control, overrides all other behaviors
        //    Triggered by: oscillation detection or overcrowding
        //    Duration: 1.5-3 seconds, then 3-5 second cooldown
        //    Behavior: Strong directional force to break out of problematic situation
        //
        // 2. SCATTERING - Partially overrides flocking
        //    Triggered by: 'S' key (global) or random timer (individual)
        //    Duration: 1-3 seconds with 2 second ease-out
        //    Behavior: Random directional force, reduces flocking forces by scatter intensity
        //
        // 3. INDEPENDENT - Disables flocking but allows scatter/escape
        //    Triggered by: Random timer (5-15% chance every 3-10 seconds)
        //    Duration: 2-8 seconds
        //    Behavior: No flocking forces applied, drifts with current velocity
        //
        // 4. NORMAL - Default flocking behavior
        //    Active when: None of the above states are active
        //    Behavior: Full flocking forces (alignment, cohesion, separation)

        // Independence behavior
        this.isIndependent = false;
        this.independenceEndTime = 0;
        this.nextIndependenceCheckTime = Date.now() + randomFunc(
            PHYSICS_CONFIG.INDEPENDENCE_CHECK_MIN,
            PHYSICS_CONFIG.INDEPENDENCE_CHECK_MAX
        );
        this.independenceChance = randomFunc(
            PHYSICS_CONFIG.INDEPENDENCE_CHANCE_MIN,
            PHYSICS_CONFIG.INDEPENDENCE_CHANCE_MAX
        );

        // Oscillation escape behavior (HIGHEST PRIORITY)
        this.isEscaping = false;
        this.escapeEndTime = 0;
        this.escapeDirection = null;
        this.escapeCooldownEndTime = 0; // Prevent immediate re-triggering

        // Scatter behavior (SECOND PRIORITY)
        this.isScattering = false;
        this.scatterEndTime = 0;
        this.scatterVector = null;
        this.scatterEaseTime = PHYSICS_CONFIG.SCATTER_EASE_TIME;
        // Schedule first random scatter
        this.nextScatterTime = Date.now() + randomFunc(
            PHYSICS_CONFIG.SCATTER_NEXT_MIN,
            PHYSICS_CONFIG.SCATTER_NEXT_MAX
        );
    }

    /**
     * Apply forces to the boid's acceleration
     * Smooths forces over time to reduce jittery behavior
     * Implements force prioritization to reduce conflicts
     * @param {Object} forces - Object containing force vectors {alignment, cohesion, separation}
     * @param {number} neighborCount - Number of neighbors affecting this boid
     * @param {Function} randomFunc - Random function for triggering escape
     * @param {number} maxForce - Maximum force magnitude (for scatter)
     * @param {Object} p5 - p5 instance (for scatter force calculation)
     */
    applyForces(forces, neighborCount = 0, randomFunc = Math.random, maxForce = 0.1, p5 = null) {
        // Smooth forces by blending with previous frame
        // This reduces rapid oscillations when forces conflict
        const forceSmoothing = PHYSICS_CONFIG.FORCE_SMOOTHING;

        // Lerp each force between previous and current
        const smoothedAlignment = this.previousAlignment.copy().lerp(forces.alignment, forceSmoothing);
        const smoothedCohesion = this.previousCohesion.copy().lerp(forces.cohesion, forceSmoothing);
        const smoothedSeparation = this.previousSeparation.copy().lerp(forces.separation, forceSmoothing);

        // Dead zone: ignore very small forces to prevent micro-oscillations
        // When forces are nearly balanced, tiny fluctuations cause jitter
        const deadZoneThreshold = PHYSICS_CONFIG.DEAD_ZONE_THRESHOLD;

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

        if (separationMag > PHYSICS_CONFIG.SEPARATION_HIGH_THRESHOLD) {
            // High separation need - fish are too close
            separationWeight = PHYSICS_CONFIG.PRIORITIZE_HIGH.separation;
            alignmentWeight = PHYSICS_CONFIG.PRIORITIZE_HIGH.alignment;
            cohesionWeight = PHYSICS_CONFIG.PRIORITIZE_HIGH.cohesion;
        } else if (separationMag > PHYSICS_CONFIG.SEPARATION_MED_THRESHOLD) {
            // Moderate separation need
            separationWeight = PHYSICS_CONFIG.PRIORITIZE_MEDIUM.separation;
            alignmentWeight = PHYSICS_CONFIG.PRIORITIZE_MEDIUM.alignment;
            cohesionWeight = PHYSICS_CONFIG.PRIORITIZE_MEDIUM.cohesion;
        }
        // else: balanced weights (all 1.0)

        // SCATTER FORCES - Calculate and blend with flocking forces
        const scatterIntensity = this.getScatterIntensity();
        let scatterForce = null;

        if (scatterIntensity > 0 && p5) {
            scatterForce = this.calculateScatterForce(maxForce, p5);

            // During scatter, reduce flocking forces
            const flockingMultiplier = 1 - scatterIntensity;
            alignmentWeight *= flockingMultiplier;
            cohesionWeight *= flockingMultiplier;
            separationWeight *= flockingMultiplier;
        }

        // Apply weighted forces
        smoothedAlignment.mult(alignmentWeight);
        smoothedCohesion.mult(cohesionWeight);
        smoothedSeparation.mult(separationWeight);

        // OVERCROWDING DETECTION - Escape if too many neighbors or forces too high
        const totalForceMag = smoothedAlignment.mag() + smoothedCohesion.mag() + smoothedSeparation.mag();
        const now = Date.now();

        // Trigger escape if:
        // 1. Too many neighbors (overcrowding)
        // 2. Total force magnitude too high (force overload)
        if (!this.isEscaping && now > this.escapeCooldownEndTime) {
            if (neighborCount > PHYSICS_CONFIG.OVERCROWDING_NEIGHBOR_LIMIT ||
                totalForceMag > PHYSICS_CONFIG.OVERCROWDING_FORCE_LIMIT) {
                this.triggerEscapeManeuver(randomFunc);
                // Clear heading history to reset oscillation detection
                this.headingHistory = [];
            }
        }

        // Apply smoothed and weighted forces
        this.acceleration.add(smoothedAlignment);
        this.acceleration.add(smoothedCohesion);
        this.acceleration.add(smoothedSeparation);

        // Add scatter force if active
        if (scatterForce) {
            this.acceleration.add(scatterForce);
        }
    }

    /**
     * Update position and velocity
     * @param {number} maxSpeed - Maximum speed
     * @param {number} audioAmplitude - Audio amplitude for speed modulation
     * @param {number} audioReactivity - How much audio affects the boid
     * @param {Object} p5 - p5 instance for Vector operations
     * @param {Function} randomFunc - Random function for independence checks
     * @param {Function} createVectorFunc - p5 createVector function (for scatter)
     * @param {boolean} globalScatterActive - Whether global scatter is active
     */
    update(maxSpeed, audioAmplitude, audioReactivity, p5, randomFunc, createVectorFunc = null, globalScatterActive = false) {
        // Update escape behavior
        this.updateEscape();

        // Update independence behavior
        this.updateIndependence(randomFunc);

        // Update scatter behavior
        if (createVectorFunc) {
            this.updateScatter(randomFunc, createVectorFunc, globalScatterActive);
        }

        // DERIVATIVE DAMPING (PID D-term) - resist rapid heading changes
        const currentHeading = this.velocity.heading();
        let headingChange = currentHeading - this.previousHeading;

        // Normalize angle difference to -PI to PI range
        while (headingChange > Math.PI) headingChange -= Math.PI * 2;
        while (headingChange < -Math.PI) headingChange += Math.PI * 2;

        // Calculate damping force perpendicular to velocity
        const dampingCoefficient = PHYSICS_CONFIG.DAMPING_COEFFICIENT;
        const speed = this.velocity.mag();

        if (speed > PHYSICS_CONFIG.MIN_SPEED_FOR_DAMPING) { // Only apply damping if moving
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
        let individualMaxSpeed = maxSpeed * this.speedMultiplier * audioSpeedMult;

        // During scatter, increase max speed
        const scatterIntensity = this.getScatterIntensity();
        if (scatterIntensity > 0) {
            // Blend between normal and boosted speed based on scatter intensity
            const scatterSpeedMult = 1 + (PHYSICS_CONFIG.SCATTER_SPEED_BOOST * scatterIntensity);
            individualMaxSpeed *= scatterSpeedMult;
        }

        targetVelocity.limit(individualMaxSpeed);

        // Smoothly interpolate from current velocity to target velocity
        const smoothing = PHYSICS_CONFIG.VELOCITY_SMOOTHING;
        this.velocity.lerp(targetVelocity, smoothing);

        // Debug: detect oscillation (rapid back-and-forth direction changes)
        if (this.debugOscillation) {
            const currentHeading = this.velocity.heading();

            // Add current heading to history
            this.headingHistory.push(currentHeading);

            // Keep only last N frames
            if (this.headingHistory.length > PHYSICS_CONFIG.OSCILLATION_HISTORY_LENGTH) {
                this.headingHistory.shift();
            }

            // Check for oscillation if we have enough history
            if (this.headingHistory.length >= PHYSICS_CONFIG.OSCILLATION_CHECK_LENGTH) {
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

                // If we have N+ reversals in recent frames, that's oscillation
                // But only trigger if not in cooldown period
                const now = Date.now();
                if (reversals >= PHYSICS_CONFIG.OSCILLATION_REVERSAL_THRESHOLD &&
                    !this.isEscaping && now > this.escapeCooldownEndTime) {
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
        const currentTime = Date.now();

        if (this.isIndependent) {
            // Currently independent - check if time is up
            if (currentTime >= this.independenceEndTime) {
                this.isIndependent = false;
                // Schedule next check
                this.nextIndependenceCheckTime = currentTime + randomFunc(
                    PHYSICS_CONFIG.INDEPENDENCE_CHECK_MIN,
                    PHYSICS_CONFIG.INDEPENDENCE_CHECK_MAX
                );
            }
        } else {
            // Not independent - check if it's time to evaluate
            if (currentTime >= this.nextIndependenceCheckTime) {
                // Roll the dice - should this koi go independent?
                if (randomFunc() < this.independenceChance) {
                    this.isIndependent = true;
                    // Go independent for configured duration
                    const duration = randomFunc(
                        PHYSICS_CONFIG.INDEPENDENCE_DURATION_MIN,
                        PHYSICS_CONFIG.INDEPENDENCE_DURATION_MAX
                    );
                    this.independenceEndTime = currentTime + duration;
                } else {
                    // Didn't go independent - schedule next check
                    this.nextIndependenceCheckTime = currentTime + randomFunc(
                        PHYSICS_CONFIG.INDEPENDENCE_CHECK_MIN,
                        PHYSICS_CONFIG.INDEPENDENCE_CHECK_MAX
                    );
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
        this.escapeEndTime = Date.now() + randomFunc(
            PHYSICS_CONFIG.ESCAPE_DURATION_MIN,
            PHYSICS_CONFIG.ESCAPE_DURATION_MAX
        );

        // Pick a direction at configured angle offset away from current heading
        const currentHeading = this.velocity.heading();
        const angleOffset = randomFunc(
            PHYSICS_CONFIG.ESCAPE_ANGLE_MIN,
            PHYSICS_CONFIG.ESCAPE_ANGLE_MAX
        );
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

            // Set cooldown period to prevent immediate re-triggering
            const cooldownDuration = Math.random() *
                (PHYSICS_CONFIG.ESCAPE_COOLDOWN_MAX - PHYSICS_CONFIG.ESCAPE_COOLDOWN_MIN) +
                PHYSICS_CONFIG.ESCAPE_COOLDOWN_MIN;
            this.escapeCooldownEndTime = Date.now() + cooldownDuration;

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
     * Trigger global scatter (called from simulation-app when 'S' is pressed)
     * @param {number} duration - How long to scatter (milliseconds)
     * @param {Object} direction - Scatter direction vector {x, y}
     */
    triggerScatter(duration, direction) {
        this.isScattering = true;
        this.scatterEndTime = Date.now() + duration;
        this.scatterVector = direction;
    }

    /**
     * Schedule next random individual scatter
     * @param {Function} randomFunc - Random function
     * @param {number} currentTime - Current time in milliseconds
     */
    scheduleNextScatter(randomFunc, currentTime) {
        // Schedule next scatter
        this.nextScatterTime = currentTime + randomFunc(
            PHYSICS_CONFIG.SCATTER_NEXT_MIN,
            PHYSICS_CONFIG.SCATTER_NEXT_MAX
        );
    }

    /**
     * Update scatter state and trigger random individual scatters
     * @param {Function} randomFunc - Random function
     * @param {Function} createVectorFunc - p5 createVector function
     * @param {boolean} globalScatterActive - Whether global scatter is active
     */
    updateScatter(randomFunc, createVectorFunc, globalScatterActive) {
        const currentTime = Date.now();

        // Check if it's time to trigger a random individual scatter
        // Only trigger if not already scattering and no global scatter
        if (!this.isScattering && !globalScatterActive && currentTime > this.nextScatterTime) {
            // Trigger individual scatter
            const duration = randomFunc(
                PHYSICS_CONFIG.SCATTER_INDIVIDUAL_MIN,
                PHYSICS_CONFIG.SCATTER_INDIVIDUAL_MAX
            );
            const angle = randomFunc(0, Math.PI * 2);
            const speed = randomFunc(
                PHYSICS_CONFIG.SCATTER_SPEED_MIN,
                PHYSICS_CONFIG.SCATTER_SPEED_MAX
            );
            const vector = createVectorFunc(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );

            this.isScattering = true;
            this.scatterEndTime = currentTime + duration;
            this.scatterVector = vector;
        }

        // Check if scatter should end
        if (this.isScattering && currentTime >= this.scatterEndTime + this.scatterEaseTime) {
            this.isScattering = false;
            this.scatterVector = null;
            this.scheduleNextScatter(randomFunc, currentTime);
        }
    }

    /**
     * Get current scatter intensity (0.0 = no scatter, 1.0 = full scatter)
     * @returns {number}
     */
    getScatterIntensity() {
        if (!this.isScattering) return 0;

        const currentTime = Date.now();

        if (currentTime < this.scatterEndTime) {
            // Still in scatter phase
            return 1.0;
        } else if (currentTime < this.scatterEndTime + this.scatterEaseTime) {
            // Easing back
            const elapsed = currentTime - this.scatterEndTime;
            let intensity = 1.0 - (elapsed / this.scatterEaseTime);
            // Use easeOut curve for smoother transition
            return intensity * intensity;
        }

        return 0;
    }

    /**
     * Calculate scatter force based on current scatter state
     * @param {number} maxForce - Maximum force magnitude
     * @param {Object} p5 - p5 instance for Vector operations
     * @returns {Object} - Scatter force vector
     */
    calculateScatterForce(maxForce, p5) {
        const intensity = this.getScatterIntensity();

        if (intensity === 0 || !this.scatterVector) {
            return new p5.Vector(0, 0);
        }

        // Create scatter force
        const scatterForce = this.scatterVector.copy();
        scatterForce.limit(maxForce * PHYSICS_CONFIG.SCATTER_FORCE_MULTIPLIER);

        // Weight by intensity
        scatterForce.mult(intensity);

        return scatterForce;
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
