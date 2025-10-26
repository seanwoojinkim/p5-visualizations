/**
 * Koi Renderer
 * Pure koi rendering logic with no dependencies on flocking or audio
 * Consolidates all duplicated rendering code from sketch.js and koi-editor.js
 */

import { DEFAULT_SHAPE_PARAMS } from './koi-params.js';
import { ANIMATION_CONFIG } from './animation-config.js';
import { RENDERING_CONFIG } from './rendering-config.js';

/**
 * Brush Texture Rendering Constants
 */
const BRUSH_TEXTURE_CONFIG = {
    // Spot rendering
    SPOT_SIZE_MULTIPLIER: 1.5,          // Scale up spots now that clipping works
    SPOT_SIZE_VARIATION_MIN: 0.8,       // Minimum random size variation
    SPOT_SIZE_VARIATION_MAX: 1.2,       // Maximum random size variation
    SPOT_ROTATION_VARIATION: 30,        // Degrees of random rotation (±)

    // Adaptive opacity based on body brightness
    DARK_FISH_THRESHOLD: 50,            // Brightness threshold for dark fish
    DARK_FISH_SPOT_ALPHA: 140,          // Alpha for spots on dark fish (0-255)
    LIGHT_FISH_SPOT_ALPHA: 180,         // Alpha for spots on light fish (0-255)

    // Body texture
    BODY_TEXTURE_ALPHA: 8,              // Opacity for body brush texture
    BODY_TEXTURE_SCALE: 1.5,            // Scale multiplier for body texture
};

export class KoiRenderer {
    /**
     * Create a new koi renderer
     * @param {BrushTextures} brushTextures - Brush textures for sumi-e rendering (optional)
     */
    constructor(brushTextures = null) {
        this.brushTextures = brushTextures;
        this.useSumieStyle = brushTextures !== null && brushTextures.isReady;

        // Wave value cache for performance (eliminates ~800 Math.sin() calls per frame)
        this.waveCache = null;
        this.lastWaveTime = -1;
        this.lastNumSegments = -1;
    }

    /**
     * Apply brush texture overlay to enhance sumi-e aesthetic
     * @param {Object} context - p5 graphics context
     * @param {string} textureName - Name of texture to use (body, fin, tail, spot)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width to scale texture
     * @param {number} height - Height to scale texture
     * @param {number} rotation - Rotation angle in radians (default: 0)
     * @param {number} opacity - Opacity of texture overlay 0-1 (default: 0.3)
     */
    applyBrushTexture(context, textureName, x, y, width, height, rotation = 0, opacity = 0.3) {
        if (!this.useSumieStyle) return;

        const texture = this.brushTextures.get(textureName);
        if (!texture) return;

        context.push();
        context.translate(x, y);
        if (rotation !== 0) context.rotate(rotation);

        // Use MULTIPLY blend mode for ink effect
        // Dark values in texture darken the underlying color, white stays transparent
        context.blendMode(context.MULTIPLY);
        context.tint(255, opacity * 255); // Apply opacity to texture
        context.image(texture, -width/2, -height/2, width, height);
        context.noTint(); // Reset tint
        context.blendMode(context.BLEND); // Reset to normal blending

        context.pop();
    }

    /**
     * Render a koi fish to the given graphics context
     * @param {Object} context - p5 graphics context (can be main canvas or graphics buffer)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} angle - Rotation angle in radians
     * @param {Object} params - Rendering parameters
     * @param {Object} params.shapeParams - Shape parameters (defaults to DEFAULT_SHAPE_PARAMS)
     * @param {Object} params.colorParams - Color parameters {h, s, b} in HSB
     * @param {Array} params.pattern - Spot pattern array
     * @param {Object} params.animationParams - Animation parameters
     * @param {number} params.animationParams.waveTime - Time value for swimming wave animation
     * @param {number} params.animationParams.sizeScale - Size multiplier
     * @param {number} params.animationParams.lengthMultiplier - Length multiplier (default: 1)
     * @param {number} params.animationParams.tailLength - Tail length multiplier (default: 1)
     * @param {Object} params.modifiers - Optional visual modifiers
     * @param {number} params.modifiers.brightnessBoost - Brightness boost amount (default: 0)
     * @param {number} params.modifiers.saturationBoost - Saturation boost amount (default: 0)
     * @param {number} params.modifiers.sizeScale - Additional size scaling (default: 1)
     * @param {Object} params.svgVertices - Optional SVG vertices for body parts
     * @param {Array<{x,y}>} params.svgVertices.body - Body vertices
     * @param {Array<{x,y}>} params.svgVertices.tail - Tail vertices
     * @param {Array<{x,y}>} params.svgVertices.head - Head vertices
     * @param {Array<{x,y}>} params.svgVertices.pectoralFin - Pectoral fin vertices
     * @param {Array<{x,y}>} params.svgVertices.dorsalFin - Dorsal fin vertices
     * @param {Array<{x,y}>} params.svgVertices.ventralFin - Ventral fin vertices
     */
    render(context, x, y, angle, params) {
        const {
            shapeParams = DEFAULT_SHAPE_PARAMS,
            colorParams = { h: 0, s: 0, b: 90 },
            pattern = { spots: [] },
            animationParams = { waveTime: 0, sizeScale: 1, lengthMultiplier: 1, tailLength: 1, waveAmplitudeScale: 1 },
            modifiers = { brightnessBoost: 0, saturationBoost: 0, sizeScale: 1 },
            boidSeed = 0,
            svgVertices = {
                body: null,
                tail: null,
                head: null,
                pectoralFin: null,
                dorsalFin: null,
                ventralFin: null
            }
        } = params;

        const { waveTime, sizeScale, lengthMultiplier = 1, tailLength = 1, waveAmplitudeScale = 1 } = animationParams;
        const { brightnessBoost = 0, saturationBoost = 0, sizeScale: modifierSizeScale = 1 } = modifiers;

        // Apply modifier size scaling
        const finalSizeScale = sizeScale * modifierSizeScale;

        // Calculate body segment positions
        const segmentPositions = this.calculateSegments(
            shapeParams.numSegments,
            waveTime,
            finalSizeScale,
            lengthMultiplier,
            shapeParams,
            waveAmplitudeScale  // Separate wave amplitude scaling from size scaling
        );

        // Save graphics state
        context.push();
        context.translate(x, y);
        context.rotate(angle);

        // Set color mode and prepare colors
        context.colorMode(context.HSB || 'HSB', 360, 100, 100);
        const hue = colorParams.h;
        const saturation = Math.min(100, colorParams.s + saturationBoost);
        const brightness = Math.min(100, colorParams.b + brightnessBoost);

        // RENDERING ORDER (for proper z-layering):
        // 1. Pectoral and Ventral fins (drawn first, appear behind body)
        // 2. Tail (drawn second, behind body)
        // 3. Body outline (drawn on top of fins and tail)
        // 4. Head (drawn before spots so spots appear on head)
        // 5. Spots (on top of head)
        // 6. Dorsal fin (drawn last, appears on top of body)

        this.drawFins(context, segmentPositions, shapeParams, waveTime, finalSizeScale, hue, saturation, brightness, {
            pectoralFin: svgVertices.pectoralFin,
            dorsalFin: null, // Don't draw dorsal fin yet
            ventralFin: svgVertices.ventralFin
        });
        this.drawTail(context, segmentPositions, shapeParams, waveTime, finalSizeScale, tailLength, hue, saturation, brightness, svgVertices.tail, waveAmplitudeScale);

        // Use SVG body if vertices provided, otherwise use procedural body
        if (svgVertices.body && svgVertices.body.length > 0) {
            this.drawBodyFromSVG(context, segmentPositions, svgVertices.body, shapeParams, finalSizeScale, hue, saturation, brightness);
        } else {
            this.drawBody(context, segmentPositions, shapeParams, finalSizeScale, hue, saturation, brightness);
        }

        this.drawHead(context, segmentPositions[0], shapeParams, finalSizeScale, hue, saturation, brightness, svgVertices.head);

        // Clip body texture and spots to body+head outline for cleaner appearance
        // Single clipping region shared by both operations (performance optimization)
        this.clipToBodyAndHead(context, segmentPositions, svgVertices, shapeParams, finalSizeScale);
        this.applyBodyTexture(context, segmentPositions, shapeParams, finalSizeScale, hue, saturation, brightness, svgVertices);
        this.drawSpots(context, segmentPositions, pattern.spots || [], finalSizeScale, boidSeed, angle, brightness);
        context.drawingContext.restore(); // Remove clip

        // Draw dorsal fin last so it appears on top of the body
        this.drawFins(context, segmentPositions, shapeParams, waveTime, finalSizeScale, hue, saturation, brightness, {
            pectoralFin: null, // Don't draw pectoral fins again
            dorsalFin: svgVertices.dorsalFin, // Only draw dorsal fin
            ventralFin: null // Don't draw ventral fins again
        });

        // Restore graphics state
        context.pop();
    }

    /**
     * Calculate body segment positions with swimming wave motion
     */
    calculateSegments(numSegments, waveTime, sizeScale, lengthMultiplier, shapeParams = DEFAULT_SHAPE_PARAMS, waveAmplitudeScale = 1.0) {
        // Pre-compute wave values once per frame (performance optimization)
        // Eliminates ~800 Math.sin() calls per frame by caching when time changes
        if (waveTime !== this.lastWaveTime || numSegments !== this.lastNumSegments) {
            this.waveCache = [];
            for (let i = 0; i < numSegments; i++) {
                const t = i / numSegments;
                this.waveCache[i] = Math.sin(waveTime - t * ANIMATION_CONFIG.wave.phaseGradient);
            }
            this.lastWaveTime = waveTime;
            this.lastNumSegments = numSegments;
        }

        const segments = [];

        for (let i = 0; i < numSegments; i++) {
            const t = i / numSegments;
            const x = this.lerp(7, -9, t) * sizeScale * lengthMultiplier;
            // Wave amplitude uses separate scaling to avoid exaggerated motion when rendering at larger sizes
            // Use cached wave value instead of calling Math.sin() (performance optimization)
            const y = this.waveCache[i] *
                      ANIMATION_CONFIG.wave.amplitude * waveAmplitudeScale *
                      (1 - t * ANIMATION_CONFIG.wave.dampening);

            // Calculate width based on position using new parameters
            // Create a smooth curve from front to peak to tail
            let baseWidth;

            if (t < shapeParams.bodyPeakPosition) {
                // Front to peak: lerp from front width to peak width
                const frontT = t / shapeParams.bodyPeakPosition;
                baseWidth = this.lerp(shapeParams.bodyFrontWidth, shapeParams.bodyPeakWidth, Math.sin(frontT * Math.PI * 0.5));
            } else {
                // Peak to tail: lerp from peak width back down
                const backT = (t - shapeParams.bodyPeakPosition) / (1 - shapeParams.bodyPeakPosition);
                baseWidth = this.lerp(shapeParams.bodyPeakWidth, shapeParams.bodyFrontWidth, Math.sin(backT * Math.PI * 0.5));
            }

            // Add taper for tail section
            if (t > shapeParams.bodyTaperStart) {
                const tailT = (t - shapeParams.bodyTaperStart) / (1 - shapeParams.bodyTaperStart);
                baseWidth = baseWidth * (1 - tailT * shapeParams.bodyTaperStrength);
            }

            const segmentWidth = baseWidth * sizeScale;
            segments.push({ x, y, w: segmentWidth });
        }

        return segments;
    }

    /**
     * Draw single fin from SVG vertices with rotation/sway animation
     * Helper method for rendering individual fins with 'rotate' deformation
     * @param {Object} context - p5 graphics context
     * @param {Object} segmentPos - Segment position {x, y, w}
     * @param {Array<{x, y}>} svgVertices - Fin SVG vertices
     * @param {number} yOffset - Y offset from segment center
     * @param {number} baseAngle - Base rotation angle in radians
     * @param {number} waveTime - Animation time
     * @param {number} rotationAmplitude - Rotation animation amplitude in radians
     * @param {number} sway - Y sway offset (additional vertical motion)
     * @param {number} sizeScale - Size multiplier
     * @param {number} hue - HSB hue
     * @param {number} saturation - HSB saturation
     * @param {number} brightness - HSB brightness
     * @param {string} [mirror='none'] - Mirror type ('none', 'horizontal', 'vertical')
     */
    drawFinFromSVG(context, segmentPos, svgVertices, yOffset, baseAngle, waveTime, rotationAmplitude, sway, sizeScale, hue, saturation, brightness, mirror = 'none') {
        // Calculate pivot at attachment edge (left edge center)
        // This ensures fins rotate naturally from their body connection point
        const xs = svgVertices.map(v => v.x);
        const attachmentPivot = {
            x: Math.min(...xs),  // Left edge X coordinate (closest to body)
            y: 0                 // Center line
        };

        this.drawSVGShape(context, svgVertices, {
            deformationType: 'rotate',
            deformationParams: {
                waveTime,
                rotationAmplitude,
                rotationFrequency: 1.2, // Matches procedural: waveTime * 1.2
                pivot: attachmentPivot, // Rotate around attachment edge
                ySwayAmplitude: 0, // Y sway applied via positionY instead
                ySwayPhase: 0
            },
            positionX: segmentPos.x,
            positionY: segmentPos.y + yOffset * sizeScale + sway,
            rotation: baseAngle, // Base angle applied to entire shape
            scale: sizeScale,
            hue,
            saturation: saturation + 8,
            brightness: brightness - 15,
            opacity: RENDERING_CONFIG.opacity.fins,
            mirror
        });
    }

    /**
     * Draw all fins (dorsal, pectoral, ventral)
     * Rendered FIRST so they appear behind the body
     * Uses SVG if vertices provided, otherwise uses procedural rendering
     * @param {Object} context - p5 graphics context
     * @param {Array<{x, y, w}>} segmentPositions - Body segment positions
     * @param {Object} shapeParams - Shape parameters
     * @param {number} waveTime - Animation time
     * @param {number} sizeScale - Size multiplier
     * @param {number} hue - HSB hue
     * @param {number} saturation - HSB saturation
     * @param {number} brightness - HSB brightness
     * @param {Object} [svgVertices={}] - SVG vertices for fins
     * @param {Array<{x,y}>} [svgVertices.pectoralFin] - Pectoral fin vertices
     * @param {Array<{x,y}>} [svgVertices.dorsalFin] - Dorsal fin vertices
     * @param {Array<{x,y}>} [svgVertices.ventralFin] - Ventral fin vertices
     */
    drawFins(context, segmentPositions, shapeParams, waveTime, sizeScale, hue, saturation, brightness, svgVertices = {}) {
        // Check if we should use SVG rendering for any fins
        const useSVG = svgVertices.pectoralFin || svgVertices.dorsalFin || svgVertices.ventralFin;

        if (useSVG) {
            // SVG-based fin rendering
            const finSway = Math.sin(waveTime - 0.5) * ANIMATION_CONFIG.fins.pectoral.swayAmplitude;

            // Pectoral fins (left and right)
            const finPos = segmentPositions[shapeParams.pectoralPos];
            if (svgVertices.pectoralFin) {
                // Top pectoral fin (left)
                this.drawFinFromSVG(
                    context, finPos, svgVertices.pectoralFin,
                    shapeParams.pectoralYTop,
                    shapeParams.pectoralAngleTop,
                    waveTime,
                    ANIMATION_CONFIG.fins.pectoral.rotationAmplitude,
                    finSway,
                    sizeScale,
                    hue, saturation, brightness,
                    'none'
                );

                // Bottom pectoral fin (right) - mirrored vertically
                this.drawFinFromSVG(
                    context, finPos, svgVertices.pectoralFin,
                    shapeParams.pectoralYBottom,
                    shapeParams.pectoralAngleBottom,
                    waveTime,
                    -ANIMATION_CONFIG.fins.pectoral.rotationAmplitude, // Negative for opposite rotation
                    -finSway, // Opposite sway
                    sizeScale,
                    hue, saturation, brightness,
                    'vertical' // Mirror vertically for bottom fin
                );
            }

            // Dorsal fin - uses wave deformation to follow body undulation
            if (svgVertices.dorsalFin) {
                // Create mini body segments for dorsal fin to follow body wave
                // Apply dampening to make the wave more subtle on the fin
                const dorsalSegments = [];
                const dorsalStartIdx = Math.max(0, shapeParams.dorsalPos - 1);
                const dorsalEndIdx = Math.min(segmentPositions.length - 1, shapeParams.dorsalPos + 2);

                for (let i = dorsalStartIdx; i <= dorsalEndIdx; i++) {
                    // Dampen the Y offset for a more subtle wave
                    dorsalSegments.push({
                        x: segmentPositions[i].x,
                        y: segmentPositions[i].y * ANIMATION_CONFIG.wave.dorsalDampening,
                        w: segmentPositions[i].w
                    });
                }

                this.drawSVGShape(context, svgVertices.dorsalFin, {
                    deformationType: 'wave',
                    deformationParams: {
                        segmentPositions: dorsalSegments,
                        numSegments: dorsalSegments.length
                    },
                    positionX: segmentPositions[shapeParams.dorsalPos].x,
                    positionY: segmentPositions[shapeParams.dorsalPos].y + shapeParams.dorsalY * sizeScale,
                    rotation: 0,
                    scale: sizeScale,
                    hue,
                    saturation: saturation + 8,
                    brightness: brightness - 15,
                    opacity: RENDERING_CONFIG.opacity.fins,
                    mirror: 'none'
                });
            }

            // Ventral fins (top and bottom)
            const ventralPos = segmentPositions[shapeParams.ventralPos];
            if (svgVertices.ventralFin) {
                // Top ventral fin
                this.drawFinFromSVG(
                    context, ventralPos, svgVertices.ventralFin,
                    shapeParams.ventralYTop,
                    shapeParams.ventralAngleTop,
                    waveTime,
                    ANIMATION_CONFIG.fins.ventral.rotationAmplitude,
                    0, // No sway
                    sizeScale,
                    hue, saturation, brightness,
                    'none'
                );

                // Bottom ventral fin - mirrored vertically
                this.drawFinFromSVG(
                    context, ventralPos, svgVertices.ventralFin,
                    shapeParams.ventralYBottom,
                    shapeParams.ventralAngleBottom,
                    waveTime,
                    -ANIMATION_CONFIG.fins.ventral.rotationAmplitude, // Opposite rotation
                    0,
                    sizeScale,
                    hue, saturation, brightness,
                    'vertical' // Mirror vertically for bottom fin
                );
            }

            return; // Exit early - SVG rendering complete
        }

        // PROCEDURAL FIN RENDERING (fallback)
        const finSway = Math.sin(waveTime - 0.5) * 0.8;
        const finOpacity = this.useSumieStyle ? 0.6 : 0.7;
        const layers = this.useSumieStyle ? 2 : 1; // Lighter layering for fins

        // Pectoral fins (left and right)
        const finPos = segmentPositions[shapeParams.pectoralPos];

        // Top pectoral fin (left)
        for (let layer = 0; layer < layers; layer++) {
            const offset = this.useSumieStyle ? (layer - 0.5) * 0.2 : 0;
            const opacity = this.useSumieStyle ? (layer === 0 ? 0.5 : 0.25) : finOpacity;

            context.fill(hue, saturation + 8, brightness - 15, opacity);
            context.push();
            context.translate(finPos.x, finPos.y + shapeParams.pectoralYTop * sizeScale + finSway);
            context.rotate(shapeParams.pectoralAngleTop + Math.sin(waveTime * 1.2) * 0.15);
            context.ellipse(2.25 * sizeScale + offset, 0, 4.5 * sizeScale, 2 * sizeScale);
            context.pop();
        }

        // Bottom pectoral fin (right)
        for (let layer = 0; layer < layers; layer++) {
            const offset = this.useSumieStyle ? (layer - 0.5) * 0.2 : 0;
            const opacity = this.useSumieStyle ? (layer === 0 ? 0.5 : 0.25) : finOpacity;

            context.fill(hue, saturation + 8, brightness - 15, opacity);
            context.push();
            context.translate(finPos.x, finPos.y + shapeParams.pectoralYBottom * sizeScale - finSway);
            context.rotate(shapeParams.pectoralAngleBottom - Math.sin(waveTime * 1.2) * 0.15);
            context.ellipse(2.25 * sizeScale + offset, 0, 4.5 * sizeScale, 2 * sizeScale);
            context.pop();
        }

        // Dorsal fin
        const dorsalPos = segmentPositions[shapeParams.dorsalPos];
        for (let layer = 0; layer < layers; layer++) {
            const offset = this.useSumieStyle ? (layer - 0.5) * 0.15 : 0;
            const opacity = this.useSumieStyle ? (layer === 0 ? 0.6 : 0.3) : 0.75;

            context.fill(hue, saturation + 8, brightness - 15, opacity);
            context.push();
            context.translate(dorsalPos.x, dorsalPos.y + shapeParams.dorsalY * sizeScale);
            context.rotate(-0.2);
            context.beginShape();
            context.vertex(0, offset);
            context.vertex(-1 * sizeScale, -2 * sizeScale + offset);
            context.vertex(1 * sizeScale, -2.5 * sizeScale + offset);
            context.vertex(2 * sizeScale, -1.5 * sizeScale + offset);
            context.vertex(2 * sizeScale, offset);
            context.endShape(context.CLOSE);
            context.pop();
        }

        // Ventral fins (top and bottom)
        const ventralPos = segmentPositions[shapeParams.ventralPos];

        // Top ventral fin
        for (let layer = 0; layer < layers; layer++) {
            const offset = this.useSumieStyle ? (layer - 0.5) * 0.2 : 0;
            const opacity = this.useSumieStyle ? (layer === 0 ? 0.5 : 0.25) : finOpacity;

            context.fill(hue, saturation + 8, brightness - 15, opacity);
            context.push();
            context.translate(ventralPos.x, ventralPos.y + shapeParams.ventralYTop * sizeScale);
            context.rotate(shapeParams.ventralAngleTop + Math.sin(waveTime * 1.2) * 0.1);
            context.ellipse(1.5 * sizeScale + offset, 0, 3 * sizeScale, 1.5 * sizeScale);
            context.pop();
        }

        // Bottom ventral fin
        for (let layer = 0; layer < layers; layer++) {
            const offset = this.useSumieStyle ? (layer - 0.5) * 0.2 : 0;
            const opacity = this.useSumieStyle ? (layer === 0 ? 0.5 : 0.25) : finOpacity;

            context.fill(hue, saturation + 8, brightness - 15, opacity);
            context.push();
            context.translate(ventralPos.x, ventralPos.y + shapeParams.ventralYBottom * sizeScale);
            context.rotate(shapeParams.ventralAngleBottom - Math.sin(waveTime * 1.2) * 0.1);
            context.ellipse(1.5 * sizeScale + offset, 0, 3 * sizeScale, 1.5 * sizeScale);
            context.pop();
        }
    }

    /**
     * Draw tail from SVG vertices with flutter animation
     * Uses generalized drawSVGShape with flutter deformation matching procedural tail
     * @param {Object} context - p5 graphics context
     * @param {Array<{x, y, w}>} segmentPositions - Body segment positions
     * @param {Array<{x, y}>} svgVertices - Tail SVG vertices
     * @param {Object} shapeParams - Shape parameters
     * @param {number} waveTime - Animation time
     * @param {number} sizeScale - Size multiplier
     * @param {number} tailLength - Tail length multiplier
     * @param {number} hue - HSB hue
     * @param {number} saturation - HSB saturation
     * @param {number} brightness - HSB brightness
     */
    drawTailFromSVG(context, segmentPositions, svgVertices, shapeParams, waveTime, sizeScale, tailLength, hue, saturation, brightness, waveAmplitudeScale = 1.0) {
        const tailBase = segmentPositions[segmentPositions.length - 1];
        const tailStartX = tailBase.x + shapeParams.tailStartX * sizeScale;

        // Calculate tail's rightmost edge (connection point to body)
        // This ensures the tail connects seamlessly regardless of SVG shape
        const tailXCoords = svgVertices.map(v => v.x);
        const tailRightEdge = Math.max(...tailXCoords);

        // Position tail so its right edge aligns with tailStartX
        const tailConnectionX = tailStartX - (tailRightEdge * sizeScale * tailLength);

        // Create extended segments for tail (continues body wave motion)
        // Tail extends beyond body segments, continuing the wave pattern
        const numTailSegments = ANIMATION_CONFIG.tail.segments;
        const tailSegments = [];
        const bodySegmentCount = segmentPositions.length;

        for (let i = 0; i < numTailSegments; i++) {
            const t = i / numTailSegments;
            const x = tailStartX - (t * tailLength * 6 * sizeScale);
            // Continue the wave formula from body
            // But adjust t to continue from where body left off
            const waveT = 1 + (t * 0.5); // Continue wave beyond body end (t=1)
            const y = Math.sin(waveTime - waveT * ANIMATION_CONFIG.wave.phaseGradient) *
                      ANIMATION_CONFIG.wave.amplitude * waveAmplitudeScale *
                      (1 - waveT * ANIMATION_CONFIG.wave.dampening);
            tailSegments.push({ x, y, w: 0 });
        }

        this.drawSVGShape(context, svgVertices, {
            deformationType: 'wave',
            deformationParams: {
                segmentPositions: tailSegments,
                numSegments: numTailSegments
            },
            positionX: tailConnectionX,  // Position tail by its connection edge
            positionY: 0,  // Wave already applied via deformation, don't double-apply
            rotation: 0,
            scale: sizeScale * tailLength,
            hue,
            saturation: saturation + 5,
            brightness: brightness - 12,
            opacity: RENDERING_CONFIG.opacity.tail,
            mirror: 'none'
        });
    }

    /**
     * Draw tail with flowing motion
     * Uses SVG if vertices provided, otherwise uses procedural rendering
     */
    drawTail(context, segmentPositions, shapeParams, waveTime, sizeScale, tailLength, hue, saturation, brightness, svgVertices = null, waveAmplitudeScale = 1.0) {
        // Use SVG if provided, otherwise procedural
        if (svgVertices && svgVertices.length > 0) {
            this.drawTailFromSVG(context, segmentPositions, svgVertices, shapeParams, waveTime, sizeScale, tailLength, hue, saturation, brightness, waveAmplitudeScale);
            return;
        }

        // Original procedural tail rendering code
        const tailBase = segmentPositions[segmentPositions.length - 1];
        const tailStartX = tailBase.x + shapeParams.tailStartX * sizeScale;
        const tailSegments = 6;
        const tailLengthScaled = tailLength * 6 * sizeScale;

        // Calculate tail points
        const topPoints = [];
        const bottomPoints = [];

        for (let i = 0; i <= tailSegments; i++) {
            const t = i / tailSegments;
            const x = tailStartX - (t * tailLengthScaled);
            const tailSway = Math.sin(waveTime - 2.5 - t * 2) * 3 * sizeScale * (0.5 + t * 0.5);
            const width = this.lerp(shapeParams.tailWidthStart, shapeParams.tailWidthEnd, t) * sizeScale;

            topPoints.push({ x, y: tailBase.y - width + tailSway });
            bottomPoints.push({ x, y: tailBase.y + width + tailSway });
        }

        // For sumi-e style, draw multiple layers for soft edges
        if (this.useSumieStyle) {
            for (let layer = 0; layer < 3; layer++) {
                const offset = (layer - 1) * 0.4;
                const opacity = layer === 1 ? 0.7 : 0.25;

                context.fill(hue, saturation + 5, brightness - 12, opacity);
                context.beginShape();

                // Draw tail shape with curve vertices and offset
                context.curveVertex(topPoints[0].x, topPoints[0].y + offset);
                for (let pt of topPoints) {
                    context.curveVertex(pt.x, pt.y + offset);
                }
                for (let i = bottomPoints.length - 1; i >= 0; i--) {
                    context.curveVertex(bottomPoints[i].x, bottomPoints[i].y + offset);
                }
                context.curveVertex(bottomPoints[0].x, bottomPoints[0].y + offset);

                context.endShape(context.CLOSE);
            }
            return;
        }

        // Normal rendering (non-sumi-e)
        context.fill(hue, saturation + 5, brightness - 12, 1.0);
        context.beginShape();

        context.curveVertex(topPoints[0].x, topPoints[0].y);
        for (let pt of topPoints) {
            context.curveVertex(pt.x, pt.y);
        }
        for (let i = bottomPoints.length - 1; i >= 0; i--) {
            context.curveVertex(bottomPoints[i].x, bottomPoints[i].y);
        }
        context.curveVertex(bottomPoints[0].x, bottomPoints[0].y);

        context.endShape(context.CLOSE);
    }

    /**
     * Apply wave deformation to SVG vertices (body wave)
     * Maps each vertex to a body segment and applies the segment's wave offset
     * Uses linear interpolation between segments for smooth deformation
     * @param {Array<{x, y}>} vertices - Original SVG vertices
     * @param {Object} params - Deformation parameters
     * @param {Array<{x, y, w}>} params.segmentPositions - Body segments with wave offsets
     * @param {number} params.numSegments - Number of body segments
     * @returns {Array<{x, y}>} - Deformed vertices
     */
    applyWaveDeformation(vertices, params) {
        const { segmentPositions, numSegments } = params;

        // Calculate X bounds once for all vertices (optimization)
        const xs = vertices.map(v => v.x);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const range = maxX - minX;

        return vertices.map(v => {
            // Normalize vertex X to 0-1 range, flipped so rightmost = 0, leftmost = 1
            const flippedT = range === 0 ? 0 : (maxX - v.x) / range;

            // Map to segment range with interpolation
            const segmentFloat = flippedT * (numSegments - 1);
            const segIdx = Math.floor(segmentFloat);
            const blend = segmentFloat - segIdx; // Fractional part for interpolation

            // Clamp indices to valid range
            const currentIdx = Math.max(0, Math.min(segIdx, numSegments - 1));
            const nextIdx = Math.min(currentIdx + 1, numSegments - 1);

            // Get Y offsets from current and next segment
            const currentY = segmentPositions[currentIdx].y;
            const nextY = segmentPositions[nextIdx].y;

            // Linear interpolation between segments
            const interpolatedY = currentY + (nextY - currentY) * blend;

            return {
                x: v.x,
                y: v.y + interpolatedY
            };
        });
    }

    /**
     * Apply flutter deformation to SVG vertices (tail flutter)
     * Creates a traveling wave effect from base to tip with increasing amplitude
     * Matches procedural tail flutter: Math.sin(waveTime - 2.5 - t * 2) * 3 * sizeScale * (0.5 + t * 0.5)
     * @param {Array<{x, y}>} vertices - Original SVG vertices
     * @param {Object} params - Flutter parameters
     * @param {number} params.waveTime - Animation time
     * @param {number} params.sizeScale - Size multiplier
     * @param {number} [params.phaseOffset=-2.5] - Phase offset for wave
     * @param {number} [params.phaseGradient=-2] - Phase change per unit distance (creates traveling wave)
     * @param {number} [params.amplitudeStart=0.5] - Flutter amplitude at base (multiplier)
     * @param {number} [params.amplitudeEnd=1.0] - Flutter amplitude at tip (multiplier)
     * @param {number} [params.amplitudeScale=3] - Overall amplitude scaling
     * @returns {Array<{x, y}>} - Deformed vertices
     */
    applyFlutterDeformation(vertices, params) {
        const {
            waveTime,
            sizeScale,
            phaseOffset = -2.5,
            phaseGradient = -2,
            amplitudeStart = 0.5,
            amplitudeEnd = 1.0,
            amplitudeScale = 3
        } = params;

        // Find X bounds for normalization (0 to 1 from base to tip)
        const xs = vertices.map(v => v.x);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const rangeX = maxX - minX;

        if (rangeX === 0) return vertices; // Prevent division by zero

        return vertices.map(v => {
            const t = (v.x - minX) / rangeX; // 0 at base, 1 at tip

            // Phase increases toward tip (creates traveling wave)
            const phase = waveTime + phaseOffset + (t * phaseGradient);

            // Amplitude increases toward tip
            const amplitude = amplitudeStart + (t * (amplitudeEnd - amplitudeStart));

            // Flutter offset
            const flutter = Math.sin(phase) * amplitudeScale * sizeScale * amplitude;

            return {
                x: v.x,
                y: v.y + flutter
            };
        });
    }

    /**
     * Apply rotation deformation to SVG vertices (fin rotation/sway)
     * Rotates vertices around a pivot point with optional Y sway
     * Matches procedural fin animation formulas
     * @param {Array<{x, y}>} vertices - Original SVG vertices
     * @param {Object} params - Rotation parameters
     * @param {number} params.waveTime - Animation time
     * @param {number} [params.rotationAmplitude=0] - Rotation amplitude in radians
     * @param {number} [params.rotationFrequency=1.2] - Rotation frequency multiplier
     * @param {Object} [params.pivot={x:0,y:0}] - Rotation pivot point
     * @param {number} [params.ySwayAmplitude=0] - Y sway amplitude (optional)
     * @param {number} [params.ySwayPhase=-0.5] - Y sway phase offset
     * @returns {Array<{x, y}>} - Deformed vertices
     */
    applyRotationDeformation(vertices, params) {
        const {
            waveTime,
            rotationAmplitude = 0,
            rotationFrequency = 1.2,
            pivot = { x: 0, y: 0 },
            ySwayAmplitude = 0,
            ySwayPhase = -0.5
        } = params;

        const rotationAngle = Math.sin(waveTime * rotationFrequency) * rotationAmplitude;
        const ySway = ySwayAmplitude ? Math.sin(waveTime + ySwayPhase) * ySwayAmplitude : 0;

        const cos = Math.cos(rotationAngle);
        const sin = Math.sin(rotationAngle);

        return vertices.map(v => {
            const dx = v.x - pivot.x;
            const dy = v.y - pivot.y;

            const rotatedX = dx * cos - dy * sin;
            const rotatedY = dx * sin + dy * cos;

            return {
                x: rotatedX + pivot.x,
                y: rotatedY + pivot.y + ySway
            };
        });
    }

    /**
     * Apply general deformation to vertices based on type
     * Dispatcher method that routes to specific deformation implementations
     * @param {Array<{x, y}>} vertices - Original vertices
     * @param {string} type - Deformation type ('wave', 'flutter', 'rotate', 'static')
     * @param {Object} params - Type-specific parameters
     * @returns {Array<{x, y}>} - Deformed vertices
     */
    applyDeformation(vertices, type, params) {
        switch (type) {
            case 'wave':
                return this.applyWaveDeformation(vertices, params);
            case 'flutter':
                return this.applyFlutterDeformation(vertices, params);
            case 'rotate':
                return this.applyRotationDeformation(vertices, params);
            case 'static':
                return vertices; // No deformation
            default:
                console.warn(`Unknown deformation type: ${type}`);
                return vertices;
        }
    }

    /**
     * Apply mirror transformation to vertices
     * Used for flipping fins and other symmetric body parts
     * @param {Array<{x, y}>} vertices - Original vertices
     * @param {string} mirror - Mirror type ('none', 'horizontal', 'vertical')
     * @returns {Array<{x, y}>} - Mirrored vertices
     */
    applyMirror(vertices, mirror) {
        if (mirror === 'none') return vertices;

        return vertices.map(v => ({
            x: mirror === 'horizontal' ? -v.x : v.x,
            y: mirror === 'vertical' ? -v.y : v.y
        }));
    }

    /**
     * Map vertex X coordinate to body segment index
     * SVG vertices span from negative X (tail) to positive X (head)
     * Body segments span from 0 (head/front) to numSegments-1 (tail/back)
     * @param {number} vertexX - X coordinate of SVG vertex
     * @param {Array<{x, y}>} svgVertices - All SVG vertices for bounds calculation
     * @param {number} numSegments - Number of body segments
     * @returns {number} - Segment index (0 to numSegments-1)
     */
    mapVertexToSegment(vertexX, svgVertices, numSegments) {
        // Find X bounds of SVG vertices
        const xs = svgVertices.map(v => v.x);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);

        // Normalize vertex X to 0-1 range
        // For koi body: positive X = head/front, negative X = tail/back
        const t = (vertexX - minX) / (maxX - minX);

        // IMPORTANT: Flip t because SVG has head at positive X, but segments[0] is head
        // Segment 0 should be at maxX (head), segment numSegments-1 at minX (tail)
        const flippedT = 1 - t;

        // Map to segment index
        const segmentIndex = Math.floor(flippedT * numSegments);

        // Clamp to valid range
        return Math.min(Math.max(0, segmentIndex), numSegments - 1);
    }

    /**
     * Draw SVG shape with deformation, transform, and sumi-e layering
     * Generalized method for rendering any SVG body part with animation
     * @param {Object} context - p5 graphics context
     * @param {Array<{x, y}>} svgVertices - Original SVG vertices
     * @param {Object} config - Rendering configuration
     * @param {string} [config.deformationType='static'] - Type of deformation ('wave', 'flutter', 'rotate', 'static')
     * @param {Object} [config.deformationParams={}] - Parameters for deformation
     * @param {number} [config.positionX=0] - X position in canvas space
     * @param {number} [config.positionY=0] - Y position in canvas space
     * @param {number} [config.rotation=0] - Rotation angle in radians
     * @param {number} [config.scale=1] - Scale multiplier
     * @param {number} config.hue - HSB hue
     * @param {number} config.saturation - HSB saturation
     * @param {number} config.brightness - HSB brightness
     * @param {number} [config.opacity=0.8] - Base opacity (0-1)
     * @param {string} [config.mirror='none'] - Mirror type ('none', 'horizontal', 'vertical')
     */
    drawSVGShape(context, svgVertices, config) {
        if (!svgVertices || svgVertices.length === 0) {
            console.warn('drawSVGShape: No vertices provided');
            return;
        }

        const {
            deformationType = 'static',
            deformationParams = {},
            positionX = 0,
            positionY = 0,
            rotation = 0,
            scale = 1,
            hue,
            saturation,
            brightness,
            opacity = 1.0,
            mirror = 'none'
        } = config;

        // 1. Apply deformation
        let vertices = this.applyDeformation(svgVertices, deformationType, deformationParams);

        // 2. Apply mirror
        vertices = this.applyMirror(vertices, mirror);

        // 3. Render with transform and sumi-e layers
        context.push();
        context.translate(positionX, positionY);
        context.rotate(rotation);
        context.noStroke(); // Remove stroke for clean SVG rendering

        if (this.useSumieStyle) {
            // 3-layer rendering for soft edges
            for (let layer = 0; layer < 3; layer++) {
                const offset = (layer - 1) * 0.3;
                const layerOpacity = layer === 1 ? opacity : opacity * 0.4;

                context.fill(hue, saturation, brightness, layerOpacity);
                context.beginShape();

                for (let v of vertices) {
                    context.curveVertex(v.x * scale + offset, v.y * scale + offset);
                }

                context.endShape(context.CLOSE);
            }
        } else {
            // Normal rendering
            context.fill(hue, saturation, brightness, opacity);
            context.beginShape();

            for (let v of vertices) {
                context.curveVertex(v.x * scale, v.y * scale);
            }

            context.endShape(context.CLOSE);
        }

        context.pop();
    }

    /**
     * Draw body from SVG vertices with wave deformation
     * Refactored to use generalized drawSVGShape method
     * @param {Object} context - p5 graphics context
     * @param {Array<{x, y, w}>} segmentPositions - Body segment positions with wave offsets
     * @param {Array<{x, y}>} svgVertices - SVG vertices normalized to koi coordinate space
     * @param {Object} shapeParams - Shape parameters
     * @param {number} sizeScale - Size multiplier
     * @param {number} hue - HSB hue
     * @param {number} saturation - HSB saturation
     * @param {number} brightness - HSB brightness
     */
    drawBodyFromSVG(context, segmentPositions, svgVertices, shapeParams, sizeScale, hue, saturation, brightness) {
        this.drawSVGShape(context, svgVertices, {
            deformationType: 'wave',
            deformationParams: {
                segmentPositions,
                numSegments: segmentPositions.length
            },
            positionX: 0,
            positionY: 0,
            rotation: 0,
            scale: sizeScale,
            hue,
            saturation,
            brightness: brightness - 2,
            opacity: RENDERING_CONFIG.opacity.body,
            mirror: 'none'
        });

        context.noStroke(); // Match original behavior
    }

    /**
     * Draw main body outline
     */
    drawBody(context, segmentPositions, shapeParams, sizeScale, hue, saturation, brightness) {
        // For sumi-e style, draw multiple semi-transparent layers with slight variations
        // This creates soft, organic brush-like edges
        if (this.useSumieStyle) {
            // Draw 3 layers with slight variations for soft edges
            for (let layer = 0; layer < 3; layer++) {
                const offset = (layer - 1) * 0.3; // Slight positional variation
                const opacity = layer === 1 ? 0.7 : 0.3; // Middle layer darker

                context.fill(hue, saturation, brightness - 2, opacity);
                context.beginShape();

                const headSeg = segmentPositions[0];
                const headPt = { x: headSeg.x + shapeParams.headX * sizeScale, y: headSeg.y };

                context.curveVertex(headPt.x, headPt.y + offset);
                context.curveVertex(headPt.x, headPt.y + offset);

                const asymmetry = shapeParams.bodyAsymmetry || 0;

                for (let i = 0; i < segmentPositions.length; i++) {
                    const seg = segmentPositions[i];
                    const topMultiplier = 0.48 * (1 - asymmetry * 0.15);
                    context.curveVertex(seg.x, seg.y - seg.w * topMultiplier + offset);
                }

                for (let i = segmentPositions.length - 1; i >= 0; i--) {
                    const seg = segmentPositions[i];
                    const bottomMultiplier = 0.48 * (1 + asymmetry * 0.15);
                    context.curveVertex(seg.x, seg.y + seg.w * bottomMultiplier + offset);
                }

                context.curveVertex(headPt.x, headPt.y + offset);
                context.curveVertex(headPt.x, headPt.y + offset);

                context.endShape(context.CLOSE);
            }

            // Skip segment lines for sumi-e style (too precise)
            context.noStroke();
            return; // Exit early, don't draw the normal body
        }

        // Normal rendering (non-sumi-e)
        context.fill(hue, saturation, brightness - 2, 1.0);
        context.beginShape();

        // Head point
        const headSeg = segmentPositions[0];
        const headPt = { x: headSeg.x + shapeParams.headX * sizeScale, y: headSeg.y };

        // Curve vertices for smooth body outline
        context.curveVertex(headPt.x, headPt.y);
        context.curveVertex(headPt.x, headPt.y);

        // Asymmetry factor: positive = rounder belly, negative = rounder back
        const asymmetry = shapeParams.bodyAsymmetry || 0;

        // Top edge from front to back (back side)
        for (let i = 0; i < segmentPositions.length; i++) {
            const seg = segmentPositions[i];
            // If asymmetry is positive, make back less wide
            const topMultiplier = 0.48 * (1 - asymmetry * 0.15);
            context.curveVertex(seg.x, seg.y - seg.w * topMultiplier);
        }

        // Bottom edge from back to front (belly side)
        for (let i = segmentPositions.length - 1; i >= 0; i--) {
            const seg = segmentPositions[i];
            // If asymmetry is positive, make belly more wide/round
            const bottomMultiplier = 0.48 * (1 + asymmetry * 0.15);
            context.curveVertex(seg.x, seg.y + seg.w * bottomMultiplier);
        }

        // Close back to head
        context.curveVertex(headPt.x, headPt.y);
        context.curveVertex(headPt.x, headPt.y);

        context.endShape(context.CLOSE);

        // Segment lines for definition
        context.strokeWeight(0.3);
        context.stroke(hue, saturation + 10, brightness - 25, 0.4);
        for (let i = 1; i < segmentPositions.length - 1; i++) {
            const seg = segmentPositions[i];
            const topY = seg.y - seg.w * 0.48;
            const bottomY = seg.y + seg.w * 0.48;
            context.line(seg.x, topY, seg.x, bottomY);
        }
        context.noStroke();
    }

    /**
     * Apply body brush texture as a stamp over the body
     * Approach 1: Texture as stamp scaled to body dimensions
     * Uses the same clipping as spots for consistency
     */
    applyBodyTexture(context, segmentPositions, shapeParams, sizeScale, hue, saturation, brightness, svgVertices) {
        if (!this.brushTextures || !this.brushTextures.isReady) {
            return; // No textures available
        }

        const bodyTexture = this.brushTextures.get('body');
        if (!bodyTexture) {
            return; // No body texture available
        }

        // Calculate body bounds
        const firstSeg = segmentPositions[0];
        const lastSeg = segmentPositions[segmentPositions.length - 1];

        // Body extends from head to tail
        const bodyWidth = Math.abs(firstSeg.x - lastSeg.x);
        const bodyHeight = Math.max(...segmentPositions.map(s => s.w));

        // Center position (middle of body)
        const centerX = (firstSeg.x + lastSeg.x) / 2;
        const centerY = 0;

        // Get pre-tinted texture from cache (performance optimization)
        const tintedBody = this.brushTextures.getTintedBody(
            { h: hue, s: saturation, b: brightness },
            BRUSH_TEXTURE_CONFIG.BODY_TEXTURE_ALPHA
        );

        // Assumes clipping region already established by caller (render method)
        // This avoids duplicate expensive clipping operations
        context.push();
        context.translate(centerX, centerY);

        // Draw pre-tinted texture with MULTIPLY blend mode
        context.blendMode(context.MULTIPLY);
        context.imageMode(context.CENTER);
        const textureWidth = bodyWidth * BRUSH_TEXTURE_CONFIG.BODY_TEXTURE_SCALE;
        const textureHeight = bodyHeight * BRUSH_TEXTURE_CONFIG.BODY_TEXTURE_SCALE;
        context.image(tintedBody, 0, 0, textureWidth, textureHeight);

        context.pop();
    }

    /**
     * Create a clipping path for body and head to constrain spots
     */
    clipToBodyAndHead(context, segmentPositions, svgVertices, shapeParams, sizeScale) {
        const ctx = context.drawingContext;
        ctx.save();
        ctx.beginPath();

        // Create body outline path
        if (svgVertices.body && svgVertices.body.length > 0) {
            // Use SVG body outline
            const bodyOutline = this.calculateSVGOutline(svgVertices.body, segmentPositions, sizeScale);
            ctx.moveTo(bodyOutline[0].x, bodyOutline[0].y);
            for (let i = 1; i < bodyOutline.length; i++) {
                ctx.lineTo(bodyOutline[i].x, bodyOutline[i].y);
            }
            ctx.closePath();
        } else {
            // Use procedural body outline
            // Top edge
            for (let i = 0; i < segmentPositions.length; i++) {
                const seg = segmentPositions[i];
                const topY = seg.y - seg.w * 0.48;
                if (i === 0) {
                    ctx.moveTo(seg.x, topY);
                } else {
                    ctx.lineTo(seg.x, topY);
                }
            }
            // Bottom edge (reverse)
            for (let i = segmentPositions.length - 1; i >= 0; i--) {
                const seg = segmentPositions[i];
                const bottomY = seg.y + seg.w * 0.48;
                ctx.lineTo(seg.x, bottomY);
            }
            ctx.closePath();
        }

        // Add head outline to clip path
        if (svgVertices.head && svgVertices.head.length > 0) {
            const headPos = segmentPositions[0];
            const headOffsetX = shapeParams.headX * sizeScale;

            ctx.moveTo(headPos.x + headOffsetX + svgVertices.head[0].x * sizeScale,
                      headPos.y + svgVertices.head[0].y * sizeScale);
            for (let i = 1; i < svgVertices.head.length; i++) {
                const v = svgVertices.head[i];
                ctx.lineTo(headPos.x + headOffsetX + v.x * sizeScale,
                          headPos.y + v.y * sizeScale);
            }
            ctx.closePath();
        } else {
            // Add procedural head ellipse to clip
            const headPos = segmentPositions[0];
            const headOffsetX = shapeParams.headX * sizeScale;
            const headWidth = shapeParams.headWidth * sizeScale;
            const headHeight = shapeParams.headHeight * sizeScale;

            ctx.ellipse(
                headPos.x + headOffsetX,
                headPos.y,
                headWidth / 2,
                headHeight / 2,
                0, 0, Math.PI * 2
            );
        }

        ctx.clip();
    }

    /**
     * Calculate SVG outline vertices for clipping
     */
    calculateSVGOutline(svgVertices, segmentPositions, sizeScale) {
        // Apply the same wave deformation as drawBodyFromSVG to match animated body
        const deformedVertices = this.applyWaveDeformation(svgVertices, {
            segmentPositions,
            numSegments: segmentPositions.length
        });

        // Then scale the deformed vertices to world space
        return deformedVertices.map(vertex => ({
            x: vertex.x * sizeScale,
            y: vertex.y * sizeScale
        }));
    }

    /**
     * Draw spot pattern on body using brush texture stamps
     * @param {number} bodyBrightness - Body color brightness (0-100) for adaptive blend mode
     */
    drawSpots(context, segmentPositions, spots, sizeScale, boidSeed = 0, koiAngle = 0, bodyBrightness = 50) {
        if (!this.brushTextures || !this.brushTextures.isReady) {
            // Fallback to simple ellipses if textures not available
            for (let spot of spots) {
                if (spot.segment >= segmentPositions.length) continue;
                const seg = segmentPositions[spot.segment];
                context.fill(spot.color.h, spot.color.s, spot.color.b, 1.0);
                const spotSize = spot.size * sizeScale * BRUSH_TEXTURE_CONFIG.SPOT_SIZE_MULTIPLIER;
                context.ellipse(
                    seg.x,
                    seg.y + spot.offsetY * sizeScale,
                    spotSize,
                    spotSize * 0.8
                );
            }
            return;
        }

        // Use brush texture stamps for authentic sumi-e spots
        // Get spot count to check if textures are available
        const spotCount = this.brushTextures.getSpotCount();
        if (spotCount === 0) {
            // Fallback to ellipses if no spot textures available
            for (let spot of spots) {
                if (spot.segment >= segmentPositions.length) continue;
                const seg = segmentPositions[spot.segment];
                context.fill(spot.color.h, spot.color.s, spot.color.b, 1.0);
                const spotSize = spot.size * sizeScale * BRUSH_TEXTURE_CONFIG.SPOT_SIZE_MULTIPLIER;
                context.ellipse(
                    seg.x,
                    seg.y + spot.offsetY * sizeScale,
                    spotSize,
                    spotSize * 0.8
                );
            }
            return;
        }

        for (let spotIndex = 0; spotIndex < spots.length; spotIndex++) {
            const spot = spots[spotIndex];
            if (spot.segment >= segmentPositions.length) continue;

            const seg = segmentPositions[spot.segment];
            // Scale up spot size now that clipping keeps them within body boundaries
            const spotSize = spot.size * sizeScale * BRUSH_TEXTURE_CONFIG.SPOT_SIZE_MULTIPLIER;
            const spotX = seg.x;
            const spotY = seg.y + spot.offsetY * sizeScale;

            // Generate deterministic random values for this specific spot
            // Using boidSeed + spotIndex for consistency across frames
            const randomSeed = (boidSeed * 1000 + spotIndex * 137) % 10000;

            // Determine which spot texture to use (deterministic per spot)
            const spotTextureIndex = Math.floor(randomSeed) % this.brushTextures.getSpotCount();

            // Mostly aligned with slight variation: ±SPOT_ROTATION_VARIATION degrees
            const rotationVariation = ((randomSeed % (BRUSH_TEXTURE_CONFIG.SPOT_ROTATION_VARIATION * 2)) - BRUSH_TEXTURE_CONFIG.SPOT_ROTATION_VARIATION) * (Math.PI / 180);
            const randomRotation = rotationVariation;
            const randomSizeVariation = BRUSH_TEXTURE_CONFIG.SPOT_SIZE_VARIATION_MIN +
                ((randomSeed % 100) / 100) * (BRUSH_TEXTURE_CONFIG.SPOT_SIZE_VARIATION_MAX - BRUSH_TEXTURE_CONFIG.SPOT_SIZE_VARIATION_MIN);

            // Adaptive alpha and blend mode based on body brightness
            // Dark fish: Lower alpha for better blending, BLEND mode for visibility
            // Light fish: Higher alpha, MULTIPLY for watercolor integration
            const spotAlpha = bodyBrightness < BRUSH_TEXTURE_CONFIG.DARK_FISH_THRESHOLD
                ? BRUSH_TEXTURE_CONFIG.DARK_FISH_SPOT_ALPHA
                : BRUSH_TEXTURE_CONFIG.LIGHT_FISH_SPOT_ALPHA;
            const blendMode = bodyBrightness < BRUSH_TEXTURE_CONFIG.DARK_FISH_THRESHOLD ? 'BLEND' : 'MULTIPLY';

            // Get pre-tinted texture from cache (performance optimization)
            // This eliminates expensive per-frame tinting operations
            const tintedSpot = this.brushTextures.getTintedSpot(spotTextureIndex, spot.color, spotAlpha, blendMode);

            context.push();
            context.translate(spotX, spotY);
            // Rotate 180° to flip brush direction (head-to-tail), plus random variation
            context.rotate(Math.PI + randomRotation);

            // Draw pre-tinted brush texture stamp with random size variation
            // No runtime tinting needed - texture is already colored and cached
            context.imageMode(context.CENTER);
            const finalSpotWidth = spotSize * randomSizeVariation;
            const finalSpotHeight = spotSize * 0.8 * randomSizeVariation;
            context.image(tintedSpot, 0, 0, finalSpotWidth, finalSpotHeight);

            context.pop();
        }
    }

    /**
     * Draw head from SVG vertices (static, no animation)
     * Eyes are always rendered procedurally on top of the SVG head shape
     * @param {Object} context - p5 graphics context
     * @param {Object} headSegment - Head segment position {x, y, w}
     * @param {Array<{x, y}>} svgVertices - Head SVG vertices
     * @param {Object} shapeParams - Shape parameters
     * @param {number} sizeScale - Size multiplier
     * @param {number} hue - HSB hue
     * @param {number} saturation - HSB saturation
     * @param {number} brightness - HSB brightness
     */
    drawHeadFromSVG(context, headSegment, svgVertices, shapeParams, sizeScale, hue, saturation, brightness) {
        const headX = headSegment.x + shapeParams.headX * sizeScale;
        const headY = headSegment.y;

        // Draw head shape from SVG with static deformation (no animation)
        this.drawSVGShape(context, svgVertices, {
            deformationType: 'static', // No animation for head
            deformationParams: {},
            positionX: headX,
            positionY: headY,
            rotation: 0,
            scale: sizeScale,
            hue,
            saturation,
            brightness: brightness + 2, // Slightly brighter than body
            opacity: RENDERING_CONFIG.opacity.head,
            mirror: 'none'
        });

        // Eyes are always drawn procedurally (precise, small details)
        // Rendered on top of SVG head shape
        context.fill(0, 0, RENDERING_CONFIG.color.eyeBrightness, RENDERING_CONFIG.opacity.eyes);

        // Left eye (top)
        context.ellipse(
            headSegment.x + shapeParams.eyeX * sizeScale,
            headSegment.y + shapeParams.eyeYTop * sizeScale,
            shapeParams.eyeSize * sizeScale,
            shapeParams.eyeSize * sizeScale
        );

        // Right eye (bottom)
        context.ellipse(
            headSegment.x + shapeParams.eyeX * sizeScale,
            headSegment.y + shapeParams.eyeYBottom * sizeScale,
            shapeParams.eyeSize * sizeScale,
            shapeParams.eyeSize * sizeScale
        );
    }

    /**
     * Draw head and eyes
     * Uses SVG if vertices provided, otherwise uses procedural rendering
     * Eyes are ALWAYS procedural regardless of head rendering method
     * @param {Object} context - p5 graphics context
     * @param {Object} headSegment - Head segment position {x, y, w}
     * @param {Object} shapeParams - Shape parameters
     * @param {number} sizeScale - Size multiplier
     * @param {number} hue - HSB hue
     * @param {number} saturation - HSB saturation
     * @param {number} brightness - HSB brightness
     * @param {Array<{x,y}>} [svgVertices=null] - Optional SVG vertices for head
     */
    drawHead(context, headSegment, shapeParams, sizeScale, hue, saturation, brightness, svgVertices = null) {
        // Use SVG if provided, otherwise use procedural rendering
        if (svgVertices && svgVertices.length > 0) {
            this.drawHeadFromSVG(context, headSegment, svgVertices, shapeParams, sizeScale, hue, saturation, brightness);
            return;
        }

        // PROCEDURAL HEAD RENDERING (fallback)
        const headX = headSegment.x + shapeParams.headX * sizeScale;
        const headY = headSegment.y;
        const headWidth = shapeParams.headWidth * sizeScale;
        const headHeight = shapeParams.headHeight * sizeScale;

        // For sumi-e style, draw head with multiple layers for soft edges
        if (this.useSumieStyle) {
            for (let layer = 0; layer < 3; layer++) {
                const offset = (layer - 1) * 0.25;
                const sizeVariation = 1 + (layer - 1) * 0.08;
                const opacity = layer === 1 ? 0.8 : 0.3;

                context.fill(hue, saturation, brightness + 2, opacity);
                context.ellipse(
                    headX + offset,
                    headY + offset,
                    headWidth * sizeVariation,
                    headHeight * sizeVariation
                );
            }
        } else {
            // Normal rendering
            context.fill(hue, saturation, brightness + 2, 1.0);
            context.ellipse(headX, headY, headWidth, headHeight);
        }

        // Eyes (both sides for top-down view) - always solid, no layering
        context.fill(0, 0, 10, 1.0);

        // Left eye (top)
        context.ellipse(
            headSegment.x + shapeParams.eyeX * sizeScale,
            headSegment.y + shapeParams.eyeYTop * sizeScale,
            shapeParams.eyeSize * sizeScale,
            shapeParams.eyeSize * sizeScale
        );

        // Right eye (bottom)
        context.ellipse(
            headSegment.x + shapeParams.eyeX * sizeScale,
            headSegment.y + shapeParams.eyeYBottom * sizeScale,
            shapeParams.eyeSize * sizeScale,
            shapeParams.eyeSize * sizeScale
        );
    }

    /**
     * Helper: Linear interpolation
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    }
}
