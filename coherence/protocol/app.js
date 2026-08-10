/**
 * Vibrational Breathing Protocol — N=1 vagal-tone validation tool.
 *
 * Goal: measure whether vibrational breathing (short nasal inhale + long humming
 * exhale) and slow exhales raise resting parasympathetic tone, using RMSSD from a
 * Polar H10, across a baseline → protocol → recovery sequence.
 *
 * First vertical slice (browser/desktop, client-side): connect via the existing
 * Python WebSocket bridge, compute RMSSD live in JS, run the paced protocol with
 * an on-screen breath guide, and persist the RAW RR stream + per-phase RMSSD in a
 * reproducibility-first record with CSV/JSON export.
 *
 * Transport note: RR arrives from ../src/integrations/polar-h10-client.js over
 * ws://localhost:8765 (start it with hrv-monitor/run.sh). This connector layer is
 * intentionally isolated so it can later be swapped for Web Bluetooth or the
 * planned Swift/CoreBluetooth wrapper when this moves into the Training Tracker.
 */

import { PolarH10Client } from '../src/integrations/polar-h10-client.js';
import { RmssdCalculator } from './lib/rmssd.js';
import { BreathPacer } from './lib/breath-pacer.js';
import { PhaseRunner, PRESETS } from './lib/phase-runner.js';
import { ProtocolRecorder } from './lib/recorder.js';

const $ = (id) => document.getElementById(id);
const fmtClock = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

class ProtocolApp {
    constructor() {
        this.pacer = new BreathPacer();
        this.liveRmssd = new RmssdCalculator({ windowMs: 60000 });
        this.recorder = new ProtocolRecorder();
        this.runner = null;

        this.connected = false;
        this.beatsSeen = 0;
        this.sessionActive = false;
        this.finished = false;

        this.sessionStartEpoch = null;
        this.currentPhaseId = 'idle';
        this.currentPhaseStartEpoch = null;
        this.beats = [];          // full raw record for the session
        this.doc = null;          // finalized session document

        this.canvas = $('pacer');
        this.ctx = this.canvas.getContext('2d');
    }

    async init() {
        await this.recorder.init();
        this._populatePresets();
        this._wireControls();
        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());
        this._connectPolar();
        this._renderLoop();
        await this._refreshHistory();
    }

    _resizeCanvas() {
        // Backing store = CSS size × dpr; context pre-scaled so draw code uses CSS px.
        const dpr = window.devicePixelRatio || 1;
        const cssW = this.canvas.clientWidth;
        const cssH = this.canvas.clientHeight; // fixed 360px via CSS
        this.canvas.width = Math.round(cssW * dpr);
        this.canvas.height = Math.round(cssH * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    _populatePresets() {
        const sel = $('preset');
        for (const [key, p] of Object.entries(PRESETS)) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = p.label;
            sel.appendChild(opt);
        }
        sel.value = '2-5-2';
    }

    _wireControls() {
        $('startBtn').addEventListener('click', () => this._startSession());
        $('abortBtn').addEventListener('click', () => this._abortSession());
        $('newBtn').addEventListener('click', () => this._resetToSetup());
        $('saveRatingBtn').addEventListener('click', () => this._savePostRating());
        $('exportCsvBtn').addEventListener('click', () => {
            if (this.doc) ProtocolRecorder.download(`breath_${this.doc.sessionId}_beats.csv`,
                ProtocolRecorder.toBeatsCSV(this.doc), 'text/csv');
        });
        $('exportJsonBtn').addEventListener('click', () => {
            if (this.doc) ProtocolRecorder.download(`breath_${this.doc.sessionId}.json`,
                JSON.stringify(this.doc, null, 2), 'application/json');
        });
    }

    _connectPolar() {
        this.polar = new PolarH10Client({
            wsUrl: 'ws://localhost:8765',
            onStatusUpdate: (s) => {
                if (typeof s.connected === 'boolean') this.connected = s.connected;
                this._updateStatus(s);
            },
            onHeartbeat: (hb) => this._onBeat(hb),
            onError: () => this._updateStatus({ connected: false }),
        });
        this.polar.connect();
    }

    _updateStatus(s) {
        const pill = $('statusPill');
        const polarUp = s.polarConnected !== false && this.connected;
        pill.classList.toggle('ok', this.connected);
        pill.classList.toggle('bad', !this.connected);
        const bits = [this.connected ? 'bridge ✓' : 'bridge ✗'];
        if (s.deviceName) bits.push(s.deviceName);
        bits.push(`${this.beatsSeen} beats`);
        pill.textContent = bits.join(' · ');
    }

    _onBeat(hb) {
        const rr = hb.rrInterval;
        if (typeof rr !== 'number' || rr <= 0) return;
        this.beatsSeen++;

        const tEpoch = Date.now();
        // Live rolling RMSSD (independent of session).
        const res = this.liveRmssd.addBeat(rr, tEpoch);

        if (this.sessionActive && !this.finished) {
            const phaseElapsedMs = this.currentPhaseStartEpoch ? tEpoch - this.currentPhaseStartEpoch : 0;
            this.beats.push({
                t: tEpoch - this.sessionStartEpoch,
                tEpoch,
                rr,
                hr: 60000 / rr,
                accepted: res.accepted,
                reason: res.reason,
                phase: this.currentPhaseId,
                phaseElapsedMs,
            });
        }
        this._updateLiveStats();
    }

    _updateLiveStats() {
        const r = this.liveRmssd.compute();
        $('hrVal').textContent = r.meanHr ? r.meanHr.toFixed(0) : '—';
        $('rmssdVal').textContent = r.rmssd ? r.rmssd.toFixed(1) : '—';
        $('lnrmssdVal').textContent = r.lnRmssd ? r.lnRmssd.toFixed(2) : '—';
        $('coverageVal').textContent = `${r.coverageSec.toFixed(0)}s`;
        $('artifactVal').textContent = `${r.nArtifacts}/${r.nBeats}`;
    }

    // ---- Session lifecycle --------------------------------------------------

    _startSession() {
        if (!this.connected) {
            if (!confirm('Bridge not connected — start anyway? (No data will record until beats arrive.)')) return;
        }
        const presetKey = $('preset').value;
        const preset = PRESETS[presetKey];

        this.presetKey = presetKey;
        this.beats = [];
        this.finished = false;
        this.sessionActive = true;
        this.sessionStartEpoch = Date.now();
        this.currentPhaseId = preset.phases[0].id;
        this.currentPhaseStartEpoch = this.sessionStartEpoch;

        this.metadata = {
            posture: $('posture').value,
            caffeineMinAgo: $('caffeine').value ? Number($('caffeine').value) : null,
            mealMinAgo: $('meal').value ? Number($('meal').value) : null,
            notes: $('notes').value.trim(),
        };
        this.subjective = { preCalm: Number($('preCalm').value), postCalm: null };

        this.runner = new PhaseRunner(preset, {
            onPhaseStart: (phase) => {
                this.currentPhaseId = phase.id;
                this.currentPhaseStartEpoch = Date.now();
                if (phase.pace) this.pacer.setPattern(phase.pace);
                $('phaseLabel').textContent = phase.label;
                $('phaseHint').textContent = phase.pace
                    ? `Follow the guide · ${this.pacer.breathsPerMinute.toFixed(1)} breaths/min`
                    : 'Breathe naturally — just sit and let your breath settle';
            },
            onComplete: () => this._finalize(),
        });
        this.runner.start(Date.now());

        $('setup').classList.add('hidden');
        $('endCard').classList.add('hidden');
        $('runView').classList.remove('hidden');
    }

    _abortSession() {
        if (!this.sessionActive) return;
        if (!confirm('Abort this session? Recorded data will be discarded.')) return;
        this.runner.stop();
        this.sessionActive = false;
        this.finished = true;
        this._resetToSetup();
    }

    async _finalize() {
        this.finished = true;
        this.sessionActive = false;
        const finishedAt = Date.now();

        // Per-phase RMSSD over raw beats, wash-in excluded.
        const phaseSummaries = {};
        for (const phase of this.runner.phases) {
            const beats = this.beats.filter(b => b.phase === phase.id && b.phaseElapsedMs >= phase.washInMs);
            phaseSummaries[phase.id] = { ...RmssdCalculator.fromBeats(beats), label: phase.label, washInMs: phase.washInMs };
        }

        const base = phaseSummaries.baseline?.rmssd ?? null;
        const post = phaseSummaries.post?.rmssd ?? null;
        const prot = phaseSummaries.protocol?.rmssd ?? null;
        const comparison = {
            carryoverMs: (base !== null && post !== null) ? post - base : null,
            carryoverPct: (base && post !== null) ? ((post - base) / base) * 100 : null,
            protocolVsBaselineMs: (base !== null && prot !== null) ? prot - base : null,
        };

        this.doc = {
            sessionId: `${finishedAt}-${Math.random().toString(36).slice(2, 7)}`,
            startedAt: this.sessionStartEpoch,
            finishedAt,
            presetKey: this.presetKey,
            presetLabel: this.runner.presetLabel,
            metadata: this.metadata,
            subjective: this.subjective,
            config: { windowMs: 60000, artifactThreshold: 0.25 },
            phases: this.runner.phases,
            phaseSummaries,
            comparison,
            beats: this.beats,
        };

        try {
            await this.recorder.save(this.doc);
        } catch (e) {
            console.error('Save failed', e);
        }

        this._renderEndCard();
        await this._refreshHistory();
    }

    _renderEndCard() {
        const s = this.doc.phaseSummaries;
        const rows = [['baseline', 'Baseline'], ['protocol', 'Vibrational'], ['post', 'Recovery']]
            .map(([id, label]) => {
                const p = s[id] || {};
                return `<tr>
                    <td>${label}</td>
                    <td class="num">${p.rmssd != null ? p.rmssd.toFixed(1) : '—'}</td>
                    <td class="num">${p.lnRmssd != null ? p.lnRmssd.toFixed(2) : '—'}</td>
                    <td class="num">${p.meanHr != null ? p.meanHr.toFixed(0) : '—'}</td>
                    <td class="num">${p.nAccepted ?? 0}</td>
                    <td class="num">${p.nArtifacts ?? 0}</td>
                    <td class="num">${p.coverageSec != null ? p.coverageSec.toFixed(0) : '—'}s</td>
                </tr>`;
            }).join('');
        $('summaryBody').innerHTML = rows;

        const c = this.doc.comparison;
        const carryEl = $('carryover');
        if (c.carryoverMs != null) {
            const up = c.carryoverMs >= 0;
            carryEl.innerHTML = `Carryover (Recovery − Baseline): ` +
                `<b class="${up ? 'good' : 'bad'}">${up ? '+' : ''}${c.carryoverMs.toFixed(1)} ms` +
                ` (${up ? '+' : ''}${c.carryoverPct.toFixed(0)}%)</b>` +
                `<div class="sub">During protocol vs baseline: ${c.protocolVsBaselineMs != null ?
                    (c.protocolVsBaselineMs >= 0 ? '+' : '') + c.protocolVsBaselineMs.toFixed(1) + ' ms' : '—'} ` +
                `<span class="muted">(RSA spike — expected; the carryover above is the real signal)</span></div>`;
        } else {
            carryEl.innerHTML = `<span class="muted">Not enough clean beats to compute a comparison.</span>`;
        }

        $('runView').classList.add('hidden');
        $('endCard').classList.remove('hidden');
        $('postCalm').value = this.subjective.preCalm;
        $('postCalmOut').textContent = this.subjective.preCalm;
    }

    async _savePostRating() {
        if (!this.doc) return;
        this.doc.subjective.postCalm = Number($('postCalm').value);
        await this.recorder.save(this.doc);
        $('ratingSaved').textContent = 'saved ✓';
        await this._refreshHistory();
    }

    _resetToSetup() {
        this.sessionActive = false;
        this.finished = false;
        this.currentPhaseId = 'idle';
        $('runView').classList.add('hidden');
        $('endCard').classList.add('hidden');
        $('setup').classList.remove('hidden');
        $('ratingSaved').textContent = '';
    }

    async _refreshHistory() {
        const sessions = await this.recorder.getAll();
        const el = $('history');
        if (!sessions.length) { el.innerHTML = '<div class="muted">No sessions yet.</div>'; return; }
        el.innerHTML = sessions.slice(0, 8).map(d => {
            const c = d.comparison || {};
            const carry = c.carryoverMs != null
                ? `<span class="${c.carryoverMs >= 0 ? 'good' : 'bad'}">${c.carryoverMs >= 0 ? '+' : ''}${c.carryoverMs.toFixed(1)}ms</span>`
                : '—';
            return `<div class="hist-row">
                <span>${new Date(d.startedAt).toLocaleString()}</span>
                <span class="muted">${d.presetLabel}</span>
                <span>carryover ${carry}</span>
            </div>`;
        }).join('');
    }

    // ---- Render loop --------------------------------------------------------

    _renderLoop() {
        const frame = () => {
            if (this.sessionActive && this.runner) {
                const now = Date.now();
                const st = this.runner.tick(now);
                if (st.phase) {
                    const paced = !!st.phase.pace;
                    // Use CSS-pixel dims for drawing.
                    this.pacer.render(this.ctx, st.elapsedMs, { active: paced });
                    $('phaseTimer').textContent = fmtClock(st.remainingMs);
                    const overall = now - this.sessionStartEpoch;
                    $('overallBar').style.width =
                        `${Math.min(100, (overall / this.runner.totalMs) * 100)}%`;
                    $('washinTag').style.opacity = st.pastWashIn ? '0' : '1';
                }
            } else if (!this.finished) {
                this.pacer.render(this.ctx, 0, { active: false });
            }
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const app = new ProtocolApp();
    app.init().catch(e => console.error('init failed', e));
    window.__protocol = app; // debugging handle
});
