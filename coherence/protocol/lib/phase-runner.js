/**
 * PhaseRunner — drives the baseline → protocol → post sequence for a session.
 *
 * Design rationale (see conversation): only the PROTOCOL phase is paced. Baseline
 * and post are natural, spontaneous breathing, so we measure RESTING vagal tone
 * before and after — and the scientifically interesting comparison is the
 * carryover (post vs baseline), not the (expected) RSA spike during pacing.
 *
 * Each phase carries a `washInMs` — the leading interval excluded from the
 * per-phase RMSSD because HRV lags a state change (RSA takes ~30–45 s to build
 * when paced breathing starts). The runner exposes clock/phase state; the app
 * owns rendering and recording.
 */

/**
 * Preset definitions. `pace` present == paced phase; absent == natural breathing.
 * Vibrational cadence: 4 s nasal inhale + 9 s humming exhale ≈ 4.6 breaths/min.
 */
export const PRESETS = {
    '2-5-2': {
        label: 'Short (2 / 5 / 2)',
        phases: [
            { id: 'baseline', label: 'Baseline', durationMs: 120000, washInMs: 30000 },
            { id: 'protocol', label: 'Vibrational breathing', durationMs: 300000, washInMs: 45000,
              pace: { inhaleMs: 4000, exhaleMs: 9000 } },
            { id: 'post', label: 'Recovery', durationMs: 120000, washInMs: 30000 },
        ],
    },
    '5-5-5': {
        label: 'Full (5 / 5 / 5)',
        phases: [
            { id: 'baseline', label: 'Baseline', durationMs: 300000, washInMs: 45000 },
            { id: 'protocol', label: 'Vibrational breathing', durationMs: 300000, washInMs: 45000,
              pace: { inhaleMs: 4000, exhaleMs: 9000 } },
            { id: 'post', label: 'Recovery', durationMs: 300000, washInMs: 45000 },
        ],
    },
};

export class PhaseRunner {
    /**
     * @param {Object} preset  One of PRESETS.
     * @param {Object} [cb]
     * @param {(phase:Object, index:number)=>void} [cb.onPhaseStart]
     * @param {(summary:Object)=>void}             [cb.onComplete]
     */
    constructor(preset, cb = {}) {
        this.phases = preset.phases;
        this.presetLabel = preset.label;
        this.onPhaseStart = cb.onPhaseStart || (() => {});
        this.onComplete = cb.onComplete || (() => {});

        this.index = -1;
        this.running = false;
        this.phaseStartMs = null;   // wall-clock ms at current phase start
        this.sessionStartMs = null;
    }

    start(nowMs) {
        this.running = true;
        this.sessionStartMs = nowMs;
        this._enter(0, nowMs);
    }

    _enter(index, nowMs) {
        this.index = index;
        this.phaseStartMs = nowMs;
        this.onPhaseStart(this.phases[index], index);
    }

    get current() {
        return this.index >= 0 ? this.phases[this.index] : null;
    }

    get isPaced() {
        return !!(this.current && this.current.pace);
    }

    /**
     * Advance the clock. Call every frame with a monotonic ms timestamp.
     * @returns {{phase:Object, index:number, elapsedMs:number, remainingMs:number,
     *            pastWashIn:boolean, done:boolean}}
     */
    tick(nowMs) {
        if (!this.running || this.index < 0) {
            return { phase: null, index: -1, elapsedMs: 0, remainingMs: 0, pastWashIn: false, done: !this.running };
        }
        const phase = this.phases[this.index];
        const elapsedMs = nowMs - this.phaseStartMs;

        if (elapsedMs >= phase.durationMs) {
            // Advance or finish.
            if (this.index + 1 < this.phases.length) {
                this._enter(this.index + 1, nowMs);
                return this.tick(nowMs);
            }
            this.running = false;
            this.onComplete({ finishedMs: nowMs });
            return { phase, index: this.index, elapsedMs: phase.durationMs, remainingMs: 0, pastWashIn: true, done: true };
        }

        return {
            phase,
            index: this.index,
            elapsedMs,
            remainingMs: phase.durationMs - elapsedMs,
            pastWashIn: elapsedMs >= phase.washInMs,
            done: false,
        };
    }

    /** Total session length across all phases (ms). */
    get totalMs() {
        return this.phases.reduce((s, p) => s + p.durationMs, 0);
    }

    stop() {
        this.running = false;
    }
}
