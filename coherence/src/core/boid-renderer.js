/**
 * BoidRenderer - handles visual representation of boids
 * Pure rendering logic, decoupled from physics
 */

export class BoidRenderer {
    constructor() {
        // No internal state needed for now
    }

    /**
     * Render a single boid with coherence-based visual effects
     */
    renderBoid(boid, color, size, coherenceLevel, pulseAmount = 1.0, lowQuality = false) {
        push();

        // Calculate bloom intensity based on coherence (only positive coherence)
        const bloomIntensity = coherenceLevel > 0 ? coherenceLevel : 0;

        // Draw trail with coherence-aware colors (skip in low quality mode)
        if (boid.trail.length > 1 && !lowQuality) {
            noFill();
            strokeWeight(1 + bloomIntensity * 0.5);

            // Draw every other trail segment for better performance with many boids
            const step = boid.trail.length > 20 ? 2 : 1;
            for (let i = 0; i < boid.trail.length - step; i += step) {
                const alpha = map(i, 0, boid.trail.length - 1, 0, 150 + bloomIntensity * 50);
                stroke(color.levels[0], color.levels[1], color.levels[2], alpha);
                line(
                    boid.trail[i].x,
                    boid.trail[i].y,
                    boid.trail[i + step].x,
                    boid.trail[i + step].y
                );
            }
        }

        // Draw boid as triangle pointing in direction of velocity
        const angle = boid.velocity.heading();
        translate(boid.position.x, boid.position.y);
        rotate(angle);

        // Apply pulsing scale at high coherence
        const pulseScale = 1.0 + (bloomIntensity * 0.15 * pulseAmount);
        scale(pulseScale);

        fill(color);
        noStroke();

        // Draw triangle
        const height = size * 1.5;
        const width = size * 0.8;
        triangle(
            height / 2, 0,
            -height / 2, width / 2,
            -height / 2, -width / 2
        );

        // No bloom - cleaner look and better performance

        pop();
    }

    /**
     * Apply color variation to base color for individual boid identity
     */
    applyColorVariation(baseColor, boid, coherenceLevel) {
        // Initialize properties if they don't exist (for boids created before this feature)
        if (boid.colorVariation === undefined) {
            boid.colorVariation = random(-0.3, 0.3);  // Increased range
            boid.brightnessVariation = random(0.7, 1.3);  // Increased range
        }

        // Debug: Log first few frames to see what's happening
        if (frameCount < 5 && Math.random() < 0.01) {
            console.log('Color variation check:', {
                colorVar: boid.colorVariation,
                brightness: boid.brightnessVariation,
                coherence: coherenceLevel,
                baseColor: [baseColor.levels[0], baseColor.levels[1], baseColor.levels[2]]
            });
        }

        // Extract RGB
        let r = baseColor.levels[0];
        let g = baseColor.levels[1];
        let b = baseColor.levels[2];

        // At low coherence, apply individual variation
        // As coherence increases, variation diminishes (uniformity)
        const variationStrength = 1.0 - Math.max(0, coherenceLevel * 0.7);

        // Apply brightness variation first (multiply, not add)
        const brightness = lerp(1.0, boid.brightnessVariation, variationStrength);
        r *= brightness;
        g *= brightness;
        b *= brightness;

        // Then apply hue shift by rotating in color space
        // This maintains saturation better than adding
        const hueShift = boid.colorVariation * variationStrength;

        // For red team: vary between orange-red and purple-red
        // For blue team: vary between cyan-blue and purple-blue
        if (r > b) {
            // Red-dominant (red team)
            g = constrain(g + hueShift * 150, 0, 255);  // Shift toward orange/purple
            b = constrain(b + hueShift * 180, 0, 255); // More blue shift
        } else {
            // Blue-dominant (blue team)
            r = constrain(r + hueShift * 120, 0, 255);  // Shift toward purple
            g = constrain(g + hueShift * 150, 0, 255);  // Shift toward cyan
        }

        r = constrain(r, 0, 255);
        g = constrain(g, 0, 255);
        b = constrain(b, 0, 255);

        // Debug: Log output occasionally
        if (frameCount < 5 && Math.random() < 0.01) {
            console.log('Output color:', [r, g, b], 'hueShift:', hueShift, 'varStrength:', variationStrength);
        }

        return color(r, g, b);
    }

    /**
     * Calculate color interpolation based on coherence
     * At high positive coherence, colors blend toward purple/magenta
     */
    getCoherenceBlendedColor(baseColor, coherenceLevel) {
        if (coherenceLevel <= 0) {
            return baseColor; // No blending at negative or zero coherence
        }

        // Target unified color: purple/magenta
        const targetR = 160;
        const targetG = 80;
        const targetB = 200;

        // Interpolate based on coherence level with stronger blending
        // Use exponential curve for more dramatic convergence at high coherence
        const blendAmount = Math.pow(coherenceLevel, 0.7) * 0.95; // Max 95% blend at full coherence

        const r = lerp(baseColor.levels[0], targetR, blendAmount);
        const g = lerp(baseColor.levels[1], targetG, blendAmount);
        const b = lerp(baseColor.levels[2], targetB, blendAmount);

        return color(r, g, b);
    }

    /**
     * Render all boids from both groups with coherence-aware visual effects
     */
    renderGroups(group1, group2, params) {
        const size = params.boidSize;
        const coherenceLevel = params.coherenceLevel;

        // Calculate blended colors based on coherence (cache to avoid repeated calculations)
        let color1, color2;
        if (coherenceLevel > 0) {
            const baseColor1 = color(params.group1Color);
            const baseColor2 = color(params.group2Color);
            color1 = this.getCoherenceBlendedColor(baseColor1, coherenceLevel);
            color2 = this.getCoherenceBlendedColor(baseColor2, coherenceLevel);
        } else {
            // No blending at negative coherence - use base colors directly
            color1 = color(params.group1Color);
            color2 = color(params.group2Color);
        }

        // Synchronized pulsing at high coherence
        const pulseAmount = coherenceLevel > 0.5
            ? sin(frameCount * 0.08) * 0.5 + 0.5
            : 0;

        const lowQuality = params.lowQualityMode;

        // Render group 1 (blue) - apply individual color variation
        for (const boid of group1) {
            const boidColor = this.applyColorVariation(color1, boid, coherenceLevel);
            this.renderBoid(boid, boidColor, size, coherenceLevel, pulseAmount, lowQuality);
        }

        // Render group 2 (red) - apply individual color variation
        for (const boid of group2) {
            const boidColor = this.applyColorVariation(color2, boid, coherenceLevel);
            this.renderBoid(boid, boidColor, size, coherenceLevel, pulseAmount, lowQuality);
        }
    }

    /**
     * Render debug information
     */
    renderDebugInfo(stats, params) {
        push();

        fill(255);
        noStroke();
        textSize(14);
        textAlign(LEFT, TOP);

        const infoLines = [
            `Total Boids: ${stats.totalBoids}`,
            `Group 1: ${stats.group1Count} | Group 2: ${stats.group2Count}`,
            `Coherence Level: ${params.coherenceLevel.toFixed(2)}`,
            `Alignment: ${stats.alignment.toFixed(3)}`,
            `Distance: ${stats.distanceBetweenGroups.toFixed(1)}px`,
        ];

        let y = 20;
        for (const line of infoLines) {
            text(line, 20, y);
            y += 20;
        }

        pop();
    }

    /**
     * Render simulation info
     */
    renderSimulationInfo(stepInfo, params) {
        if (!params.showSimulationInfo || !params.simulationMode) return;

        push();

        // Position in top right
        const x = width - 320;
        const y = 20;

        // Background box
        fill(20, 20, 20, 230);
        stroke(34, 197, 94, 150);
        strokeWeight(2);
        rect(x, y, 300, 140, 10);

        // Title
        fill(34, 197, 94);
        noStroke();
        textSize(16);
        textAlign(LEFT, TOP);
        text('BIOMETRIC SIMULATION', x + 15, y + 15);

        // Current state
        fill(255);
        textSize(14);
        text(`State: ${stepInfo.modeName}`, x + 15, y + 45);

        // Description
        fill(200);
        textSize(12);
        const descLines = this.wrapText(stepInfo.description, 35);
        let descY = y + 65;
        for (const line of descLines) {
            text(line, x + 15, descY);
            descY += 16;
        }

        // Progress bar
        const progressBarX = x + 15;
        const progressBarY = y + 105;
        const progressBarWidth = 270;
        const progressBarHeight = 8;

        // Background
        fill(60);
        noStroke();
        rect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 4);

        // Progress
        fill(34, 197, 94);
        rect(progressBarX, progressBarY, progressBarWidth * stepInfo.progress, progressBarHeight, 4);

        // Step indicator
        fill(200);
        textSize(11);
        textAlign(CENTER, TOP);
        text(`Step ${stepInfo.stepIndex + 1} of ${stepInfo.totalSteps}`, x + 150, y + 118);

        pop();
    }

    /**
     * Wrap text to fit within a certain character width
     */
    wrapText(text, maxChars) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            if ((currentLine + word).length > maxChars) {
                if (currentLine) lines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                currentLine += word + ' ';
            }
        }
        if (currentLine) lines.push(currentLine.trim());

        return lines;
    }

    /**
     * Render coherence indicator
     */
    renderCoherenceIndicator(coherenceLevel) {
        push();

        const barWidth = 300;
        const barHeight = 30;
        const x = width / 2 - barWidth / 2;
        const y = 30;

        // Background bar
        fill(40);
        noStroke();
        rect(x, y, barWidth, barHeight, 15);

        // Labels
        fill(255);
        textSize(12);
        textAlign(CENTER, TOP);
        text('REPULSION', x + barWidth * 0.15, y + barHeight + 5);
        text('NEUTRAL', x + barWidth * 0.5, y + barHeight + 5);
        text('COHERENCE', x + barWidth * 0.85, y + barHeight + 5);

        // Indicator position
        const indicatorX = map(coherenceLevel, -1, 1, x, x + barWidth);

        // Colored fill based on coherence level
        if (coherenceLevel < 0) {
            // Red for repulsion
            const c = lerpColor(color(60, 60, 60), color(239, 68, 68), -coherenceLevel);
            fill(c);
        } else if (coherenceLevel > 0) {
            // Green/blue for coherence
            const c = lerpColor(color(60, 60, 60), color(34, 197, 94), coherenceLevel);
            fill(c);
        } else {
            fill(60, 60, 60);
        }

        rect(x, y, map(Math.abs(coherenceLevel), 0, 1, 0, barWidth / 2), barHeight, 15);

        // Indicator marker
        fill(255);
        noStroke();
        circle(indicatorX, y + barHeight / 2, 12);

        pop();
    }

    /**
     * Render background coherence field
     * Subtle gradient that visualizes the coherence energy
     */
    renderCoherenceField(coherenceLevel) {
        if (Math.abs(coherenceLevel) < 0.1) return; // No field at near-zero coherence

        push();

        // Create radial gradient from center
        const centerX = width / 2;
        const centerY = height / 2;

        noStroke();

        if (coherenceLevel > 0) {
            // Positive coherence: warm purple/magenta glow from center
            const intensity = coherenceLevel;
            const maxRadius = max(width, height) * 0.8;

            // Draw multiple circles to create gradient effect
            const steps = 15;
            for (let i = steps; i >= 0; i--) {
                const radius = map(i, 0, steps, 0, maxRadius);
                const alpha = map(i, 0, steps, 25 * intensity, 0);

                // Purple/magenta color
                fill(160, 80, 200, alpha);
                circle(centerX, centerY, radius * 2);
            }
        } else {
            // Negative coherence: subtle dark red overlay (no artifacts)
            const intensity = -coherenceLevel;

            // Single overlay with low alpha
            fill(100, 20, 20, 15 * intensity);
            noStroke();
            rect(0, 0, width, height);
        }

        pop();
    }

    /**
     * Render central attractor visualization
     * Shows when coherence is positive
     */
    renderAttractor(coherenceLevel) {
        // Only show when coherence is positive
        if (coherenceLevel <= 0) return;

        push();

        const centerX = width / 2;
        const centerY = height / 2;

        // Pulsing effect based on frame count
        const pulse = sin(frameCount * 0.05) * 0.2 + 0.8;

        // Multiple rings growing with coherence
        const maxRadius = 200;
        const baseRadius = maxRadius * coherenceLevel * pulse;

        // Draw multiple concentric rings
        noFill();

        // Outer glow
        for (let i = 3; i >= 1; i--) {
            const alpha = map(i, 1, 3, 80, 20) * coherenceLevel;
            const radius = baseRadius + i * 15;
            stroke(34, 197, 94, alpha * pulse);
            strokeWeight(2);
            circle(centerX, centerY, radius * 2);
        }

        // Inner bright ring
        stroke(34, 197, 94, 150 * coherenceLevel * pulse);
        strokeWeight(3);
        circle(centerX, centerY, baseRadius * 2);

        // Center dot
        fill(34, 197, 94, 200 * coherenceLevel);
        noStroke();
        circle(centerX, centerY, 8);

        // Orbital path indicator (faint circle showing orbit radius)
        noFill();
        stroke(255, 255, 255, 30 * coherenceLevel);
        strokeWeight(1);
        circle(centerX, centerY, baseRadius * 1.5 * 2);

        pop();
    }
}
