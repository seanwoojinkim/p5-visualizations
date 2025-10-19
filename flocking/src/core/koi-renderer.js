/**
 * Koi Renderer
 * Pure koi rendering logic with no dependencies on flocking or audio
 * Consolidates all duplicated rendering code from sketch.js and koi-editor.js
 */

import { DEFAULT_SHAPE_PARAMS } from './koi-params.js';

export class KoiRenderer {
    /**
     * Create a new koi renderer
     * @param {BrushTextures} brushTextures - Brush textures for sumi-e rendering (optional)
     */
    constructor(brushTextures = null) {
        this.brushTextures = brushTextures;
        this.useSumieStyle = brushTextures !== null && brushTextures.isReady;
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
     */
    render(context, x, y, angle, params) {
        const {
            shapeParams = DEFAULT_SHAPE_PARAMS,
            colorParams = { h: 0, s: 0, b: 90 },
            pattern = { spots: [] },
            animationParams = { waveTime: 0, sizeScale: 1, lengthMultiplier: 1, tailLength: 1 },
            modifiers = { brightnessBoost: 0, saturationBoost: 0, sizeScale: 1 }
        } = params;

        const { waveTime, sizeScale, lengthMultiplier = 1, tailLength = 1 } = animationParams;
        const { brightnessBoost = 0, saturationBoost = 0, sizeScale: modifierSizeScale = 1 } = modifiers;

        // Apply modifier size scaling
        const finalSizeScale = sizeScale * modifierSizeScale;

        // Calculate body segment positions
        const segmentPositions = this.calculateSegments(
            shapeParams.numSegments,
            waveTime,
            finalSizeScale,
            lengthMultiplier,
            shapeParams
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
        // 1. Fins (drawn first, appear behind body)
        // 2. Tail (drawn second, behind body)
        // 3. Body outline (drawn on top of fins and tail)
        // 4. Head (drawn before spots so spots appear on head)
        // 5. Spots (drawn last, on top of everything including head)

        this.drawFins(context, segmentPositions, shapeParams, waveTime, finalSizeScale, hue, saturation, brightness);
        this.drawTail(context, segmentPositions, shapeParams, waveTime, finalSizeScale, tailLength, hue, saturation, brightness);
        this.drawBody(context, segmentPositions, shapeParams, finalSizeScale, hue, saturation, brightness);
        this.drawHead(context, segmentPositions[0], shapeParams, finalSizeScale, hue, saturation, brightness);
        this.drawSpots(context, segmentPositions, pattern.spots || [], finalSizeScale);

        // Restore graphics state
        context.pop();
        context.colorMode(context.RGB || 'RGB');
    }

    /**
     * Calculate body segment positions with swimming wave motion
     */
    calculateSegments(numSegments, waveTime, sizeScale, lengthMultiplier, shapeParams = DEFAULT_SHAPE_PARAMS) {
        const segments = [];

        for (let i = 0; i < numSegments; i++) {
            const t = i / numSegments;
            const x = this.lerp(7, -9, t) * sizeScale * lengthMultiplier;
            const y = Math.sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);

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
     * Draw all fins (dorsal, pectoral, ventral)
     * Rendered FIRST so they appear behind the body
     */
    drawFins(context, segmentPositions, shapeParams, waveTime, sizeScale, hue, saturation, brightness) {
        const finSway = Math.sin(waveTime - 0.5) * 0.8;
        context.fill(hue, saturation + 8, brightness - 15, 0.7);

        // Pectoral fins (left and right)
        const finPos = segmentPositions[shapeParams.pectoralPos];

        // Top pectoral fin (left)
        context.push();
        context.translate(finPos.x, finPos.y + shapeParams.pectoralYTop * sizeScale + finSway);
        context.rotate(shapeParams.pectoralAngleTop + Math.sin(waveTime * 1.2) * 0.15);
        context.ellipse(2.25 * sizeScale, 0, 4.5 * sizeScale, 2 * sizeScale);
        context.pop();

        // Bottom pectoral fin (right)
        context.push();
        context.translate(finPos.x, finPos.y + shapeParams.pectoralYBottom * sizeScale - finSway);
        context.rotate(shapeParams.pectoralAngleBottom - Math.sin(waveTime * 1.2) * 0.15);
        context.ellipse(2.25 * sizeScale, 0, 4.5 * sizeScale, 2 * sizeScale);
        context.pop();

        // Dorsal fin
        const dorsalPos = segmentPositions[shapeParams.dorsalPos];
        context.fill(hue, saturation + 8, brightness - 15, 0.75);
        context.push();
        context.translate(dorsalPos.x, dorsalPos.y + shapeParams.dorsalY * sizeScale);
        context.rotate(-0.2);
        context.beginShape();
        context.vertex(0, 0);
        context.vertex(-1 * sizeScale, -2 * sizeScale);
        context.vertex(1 * sizeScale, -2.5 * sizeScale);
        context.vertex(2 * sizeScale, -1.5 * sizeScale);
        context.vertex(2 * sizeScale, 0);
        context.endShape(context.CLOSE);
        context.pop();

        // Ventral fins (top and bottom)
        const ventralPos = segmentPositions[shapeParams.ventralPos];
        context.fill(hue, saturation + 8, brightness - 15, 0.7);

        // Top ventral fin
        context.push();
        context.translate(ventralPos.x, ventralPos.y + shapeParams.ventralYTop * sizeScale);
        context.rotate(shapeParams.ventralAngleTop + Math.sin(waveTime * 1.2) * 0.1);
        context.ellipse(1.5 * sizeScale, 0, 3 * sizeScale, 1.5 * sizeScale);
        context.pop();

        // Bottom ventral fin
        context.push();
        context.translate(ventralPos.x, ventralPos.y + shapeParams.ventralYBottom * sizeScale);
        context.rotate(shapeParams.ventralAngleBottom - Math.sin(waveTime * 1.2) * 0.1);
        context.ellipse(1.5 * sizeScale, 0, 3 * sizeScale, 1.5 * sizeScale);
        context.pop();
    }

    /**
     * Draw tail with flowing motion
     */
    drawTail(context, segmentPositions, shapeParams, waveTime, sizeScale, tailLength, hue, saturation, brightness) {
        const tailBase = segmentPositions[segmentPositions.length - 1];
        const tailStartX = tailBase.x + shapeParams.tailStartX * sizeScale;
        const tailSegments = 6;
        const tailLengthScaled = tailLength * 6 * sizeScale;

        context.fill(hue, saturation + 5, brightness - 12, 0.8);
        context.beginShape();

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

        // Draw tail shape with curve vertices
        context.curveVertex(topPoints[0].x, topPoints[0].y);
        for (let pt of topPoints) {
            context.curveVertex(pt.x, pt.y);
        }
        for (let i = bottomPoints.length - 1; i >= 0; i--) {
            context.curveVertex(bottomPoints[i].x, bottomPoints[i].y);
        }
        context.curveVertex(bottomPoints[0].x, bottomPoints[0].y);

        context.endShape(context.CLOSE);

        // Apply brush texture overlay for flowing tail effect - subtle
        if (this.useSumieStyle) {
            const tailCenterX = (topPoints[3].x + bottomPoints[3].x) / 2;
            const tailCenterY = (topPoints[3].y + bottomPoints[3].y) / 2;
            const tailWidth = tailLengthScaled * 1.0;
            const tailHeight = shapeParams.tailWidthStart * sizeScale * 2.5;
            this.applyBrushTexture(context, 'tail', tailCenterX, tailCenterY, tailWidth, tailHeight, 0, 0.25);
        }
    }

    /**
     * Draw main body outline
     */
    drawBody(context, segmentPositions, shapeParams, sizeScale, hue, saturation, brightness) {
        context.fill(hue, saturation, brightness - 2, 0.92);
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

        // Apply brush texture overlay for sumi-e aesthetic - very subtle
        if (this.useSumieStyle) {
            // Apply texture only to a few segments to avoid over-darkening
            const bodyLength = segmentPositions.length;
            // Only apply to every other segment, and skip head/tail areas
            for (let i = 3; i < bodyLength - 3; i += 2) {
                const seg = segmentPositions[i];
                const textureWidth = seg.w * 2.5;
                const textureHeight = seg.w * 2;
                this.applyBrushTexture(context, 'body', seg.x, seg.y, textureWidth, textureHeight, 0, 0.2);
            }
        }
    }

    /**
     * Draw spot pattern on body
     */
    drawSpots(context, segmentPositions, spots, sizeScale) {
        for (let spot of spots) {
            if (spot.segment >= segmentPositions.length) continue;

            const seg = segmentPositions[spot.segment];
            context.fill(spot.color.h, spot.color.s, spot.color.b, 0.85);

            const spotW = spot.size * sizeScale;
            const spotH = spot.size * sizeScale * 0.8;
            context.ellipse(seg.x, seg.y + spot.offsetY * sizeScale, spotW, spotH);

            // Apply brush texture to each spot for organic edges - very subtle
            if (this.useSumieStyle) {
                const textureSize = spot.size * sizeScale * 1.1;
                this.applyBrushTexture(context, 'spot', seg.x, seg.y + spot.offsetY * sizeScale, textureSize, textureSize, 0, 0.15);
            }
        }
    }

    /**
     * Draw head and eyes
     */
    drawHead(context, headSegment, shapeParams, sizeScale, hue, saturation, brightness) {
        // Head ellipse
        context.fill(hue, saturation, brightness + 2, 0.92);
        context.ellipse(
            headSegment.x + shapeParams.headX * sizeScale,
            headSegment.y,
            shapeParams.headWidth * sizeScale,
            shapeParams.headHeight * sizeScale
        );

        // Eyes (both sides for top-down view)
        context.fill(0, 0, 10, 0.8);

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
