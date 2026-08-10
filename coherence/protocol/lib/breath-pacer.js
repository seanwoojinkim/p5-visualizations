/**
 * BreathPacer — an asymmetric paced-breathing guide rendered to a canvas.
 *
 * Ported in spirit from coherence/src/apps/coherence-app-polar.js
 * (renderBreathingGuide), but generalised for the vibrational-breathing protocol:
 *   - Asymmetric inhale/exhale (the vibrational spec is a short nasal inhale and
 *     a long low-pitched humming exhale, e.g. 4 s in / 9 s out ≈ 4.6 breaths/min).
 *   - Optional post-inhale / post-exhale holds.
 *   - Cosine easing so the circle grows on inhale and shrinks on exhale smoothly.
 *
 * The pacer is a pure view: it owns no timing state beyond the current cycle
 * clock. Call `setPattern()` to change cadence, `render(ctx, ms)` each frame.
 */

export class BreathPacer {
    /**
     * @param {Object} [pattern]
     * @param {number} [pattern.inhaleMs=4000]
     * @param {number} [pattern.holdInMs=0]
     * @param {number} [pattern.exhaleMs=9000]
     * @param {number} [pattern.holdOutMs=0]
     */
    constructor(pattern = {}) {
        this.setPattern(pattern);
        this.minRadius = 44;
        this.maxRadius = 130;
    }

    setPattern({ inhaleMs = 4000, holdInMs = 0, exhaleMs = 9000, holdOutMs = 0 } = {}) {
        this.inhaleMs = inhaleMs;
        this.holdInMs = holdInMs;
        this.exhaleMs = exhaleMs;
        this.holdOutMs = holdOutMs;
        this.cycleMs = inhaleMs + holdInMs + exhaleMs + holdOutMs;
    }

    /** Breaths per minute implied by the current pattern. */
    get breathsPerMinute() {
        return 60000 / this.cycleMs;
    }

    /**
     * Resolve the breath phase + normalised radius fraction for a given elapsed time.
     * @param {number} elapsedMs  ms since pacing started for the current phase.
     * @returns {{phase:'inhale'|'hold-in'|'exhale'|'hold-out', label:string,
     *            radiusFrac:number, secondsLeft:number}}
     */
    state(elapsedMs) {
        let t = elapsedMs % this.cycleMs;

        // Inhale: radius 0 -> 1
        if (t < this.inhaleMs) {
            const p = t / this.inhaleMs;
            return {
                phase: 'inhale',
                label: 'BREATHE IN',
                radiusFrac: (1 - Math.cos(p * Math.PI)) / 2,
                secondsLeft: (this.inhaleMs - t) / 1000,
            };
        }
        t -= this.inhaleMs;

        // Hold after inhale: radius stays 1
        if (t < this.holdInMs) {
            return { phase: 'hold-in', label: 'HOLD', radiusFrac: 1, secondsLeft: (this.holdInMs - t) / 1000 };
        }
        t -= this.holdInMs;

        // Exhale: radius 1 -> 0 (this is the long humming phase)
        if (t < this.exhaleMs) {
            const p = t / this.exhaleMs;
            return {
                phase: 'exhale',
                label: 'HUM OUT',
                radiusFrac: (1 + Math.cos(p * Math.PI)) / 2,
                secondsLeft: (this.exhaleMs - t) / 1000,
            };
        }
        t -= this.exhaleMs;

        // Hold after exhale: radius stays 0
        return { phase: 'hold-out', label: 'HOLD', radiusFrac: 0, secondsLeft: (this.holdOutMs - t) / 1000 };
    }

    /**
     * Draw the pacer centered in the canvas.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} elapsedMs
     * @param {Object} [opts]
     * @param {boolean} [opts.active=true]  If false, draws a dim "breathe naturally" resting state.
     */
    render(ctx, elapsedMs, opts = {}) {
        const active = opts.active !== false;
        // Draw in CSS pixels: the context is pre-scaled by devicePixelRatio, so
        // clientWidth/clientHeight (CSS px) are the correct logical dimensions.
        const w = ctx.canvas.clientWidth;
        const h = ctx.canvas.clientHeight;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        if (!active) {
            const r = (this.minRadius + this.maxRadius) / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(150,160,180,0.35)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 8]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(200,210,230,0.7)';
            ctx.font = '600 18px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('breathe naturally', cx, cy);
            return;
        }

        const s = this.state(elapsedMs);
        const r = this.minRadius + (this.maxRadius - this.minRadius) * s.radiusFrac;

        // Colour: inhale = cool blue, exhale = warm violet (the humming stroke).
        const inhaleCol = [110, 200, 255];
        const exhaleCol = [170, 120, 255];
        const col = s.phase === 'inhale' || s.phase === 'hold-in' ? inhaleCol : exhaleCol;

        // Glow
        const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.6);
        grad.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0.28)`);
        grad.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Main ring
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.9)`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner fill
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},0.12)`;
        ctx.fill();

        // Cue text + countdown
        ctx.fillStyle = 'rgba(240,244,255,0.95)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 22px system-ui, sans-serif';
        ctx.fillText(s.label, cx, cy - 12);
        ctx.font = '600 16px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(200,210,230,0.8)';
        ctx.fillText(`${Math.ceil(s.secondsLeft)}`, cx, cy + 16);
    }
}
