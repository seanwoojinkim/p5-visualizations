/**
 * RMSSD calculator — time-domain HRV from a stream of RR (inter-beat) intervals.
 *
 * RMSSD = sqrt( mean( (RR[i] - RR[i-1])^2 ) )  over successive NORMAL beats.
 *
 * Why RMSSD (and not SDNN / LF-HF): it is built on successive beat-to-beat
 * differences, which are dominated by high-frequency (vagal / parasympathetic)
 * activity and — critically for short windows — stabilise fast. The validation
 * literature (Shaffer & Ginsberg 2017; Pecchia 2018; Munoz 2015) puts ~60 s as
 * the defensible minimum window; 60 s RMSSD correlates r > 0.9 with the 5-min
 * gold standard. So a 60 s rolling window is used here for the live read, and a
 * per-phase window (wash-in excluded) for the study comparison.
 *
 * Artifact handling matters more for RMSSD than any other metric: a single
 * ectopic / missed beat produces a huge successive difference and inflates the
 * value. Two guards are applied:
 *   1. Physiological range gate (300–2000 ms == 30–200 bpm).
 *   2. Relative jump filter: a beat differing from the previous accepted beat by
 *      more than `artifactThreshold` (default 25%) is flagged as an artifact.
 * Difference pairs that span a rejected beat are excluded from the RMSSD sum, so
 * we never "bridge" across an ectopic.
 */

export class RmssdCalculator {
    /**
     * @param {Object}  [opts]
     * @param {number}  [opts.windowMs=60000]        Rolling window length (ms).
     * @param {number}  [opts.artifactThreshold=0.25] Max fractional jump vs previous accepted RR.
     * @param {number}  [opts.minRr=300]             Physiological lower bound (ms).
     * @param {number}  [opts.maxRr=2000]            Physiological upper bound (ms).
     */
    constructor(opts = {}) {
        this.windowMs = opts.windowMs ?? 60000;
        this.artifactThreshold = opts.artifactThreshold ?? 0.25;
        this.minRr = opts.minRr ?? 300;
        this.maxRr = opts.maxRr ?? 2000;

        /** @type {{t:number, rr:number, accepted:boolean}[]} rolling buffer */
        this.buffer = [];
        this.lastAcceptedRr = null;
    }

    /**
     * Ingest one RR interval.
     * @param {number} rrMs  RR interval in milliseconds.
     * @param {number} tMs   Receipt timestamp in ms (epoch or performance clock — just be consistent).
     * @returns {{accepted:boolean, reason:(string|null)}}
     */
    addBeat(rrMs, tMs) {
        let accepted = true;
        let reason = null;

        if (!(rrMs >= this.minRr && rrMs <= this.maxRr)) {
            accepted = false;
            reason = 'range';
        } else if (this.lastAcceptedRr !== null) {
            const rel = Math.abs(rrMs - this.lastAcceptedRr) / this.lastAcceptedRr;
            if (rel > this.artifactThreshold) {
                accepted = false;
                reason = 'jump';
            }
        }

        this.buffer.push({ t: tMs, rr: rrMs, accepted });
        if (accepted) this.lastAcceptedRr = rrMs;

        // Prune outside the rolling window.
        const cutoff = tMs - this.windowMs;
        while (this.buffer.length && this.buffer[0].t < cutoff) {
            this.buffer.shift();
        }

        return { accepted, reason };
    }

    /**
     * Compute RMSSD over the current rolling buffer.
     * @returns {{rmssd:number|null, lnRmssd:number|null, meanHr:number|null,
     *            nBeats:number, nAccepted:number, nArtifacts:number,
     *            nDiffs:number, coverageSec:number}}
     */
    compute() {
        return RmssdCalculator.fromBeats(this.buffer);
    }

    /**
     * Pure computation over an arbitrary ordered beat list — reused for per-phase
     * summaries so the exact same math runs live and post-hoc.
     * @param {{t:number, rr:number, accepted:boolean}[]} beats  Ordered by time.
     */
    static fromBeats(beats) {
        const sumSq = { total: 0, n: 0 };
        let rrSum = 0;
        let nAccepted = 0;
        let nArtifacts = 0;

        for (let i = 0; i < beats.length; i++) {
            const b = beats[i];
            if (b.accepted) {
                rrSum += b.rr;
                nAccepted++;
            } else {
                nArtifacts++;
            }
            // Successive-difference term: only when both this beat and the
            // immediately-preceding raw beat were accepted (no rejected beat spans the pair).
            if (i > 0 && b.accepted && beats[i - 1].accepted) {
                const d = b.rr - beats[i - 1].rr;
                sumSq.total += d * d;
                sumSq.n++;
            }
        }

        const rmssd = sumSq.n > 0 ? Math.sqrt(sumSq.total / sumSq.n) : null;
        const meanRr = nAccepted > 0 ? rrSum / nAccepted : null;
        const coverageSec = beats.length > 1
            ? (beats[beats.length - 1].t - beats[0].t) / 1000
            : 0;

        return {
            rmssd,
            lnRmssd: rmssd !== null ? Math.log(rmssd) : null,
            meanHr: meanRr !== null ? 60000 / meanRr : null,
            nBeats: beats.length,
            nAccepted,
            nArtifacts,
            nDiffs: sumSq.n,
            coverageSec,
        };
    }

    reset() {
        this.buffer = [];
        this.lastAcceptedRr = null;
    }
}
