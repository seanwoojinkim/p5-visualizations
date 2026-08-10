# Vibrational Breathing Protocol (N=1 vagal-tone validation)

A browser/desktop tool to test whether **vibrational breathing** (short nasal
inhale + long low-pitched humming exhale) and slow exhales raise **resting
parasympathetic tone**, measured as **RMSSD** from a Polar H10.

This is the first vertical slice: prove Polar connectivity, compute RMSSD live in
JS, run a paced protocol with an on-screen breath guide, and persist a
reproducibility-first record (raw RR + per-phase RMSSD) with CSV/JSON export.

## Design decisions (the why)

- **Metric: RMSSD** — the one time-domain HRV metric that stays valid on short
  (~60 s) windows. Live read uses a 60 s rolling window; per-phase summaries use
  the whole phase with the wash-in excluded.
- **Only the protocol phase is paced.** Baseline and recovery are *natural*
  breathing, so we measure resting tone before/after. The scientifically
  interesting number is the **carryover (Recovery − Baseline)**, not the (expected)
  RSA spike during pacing.
- **Wash-in excluded** — the first 30–45 s of each phase is dropped from the
  per-phase RMSSD because HRV lags a state change (RSA takes ~30–45 s to build).
- **Raw RR is the source of truth** — every beat (timestamp, phase, accept/reject)
  is stored, so any metric can be recomputed later. Artifact handling: physiological
  gate (300–2000 ms) + 25% relative-jump filter; difference pairs spanning a
  rejected beat are excluded (no bridging across ectopics).
- **Vibrational cadence**: 4 s inhale + 9 s humming exhale ≈ 4.6 breaths/min.

## Run it

1. **Start the Polar bridge** (needs the H10 worn + paired):
   ```
   cd hrv-monitor && ./run.sh      # WebSocket server on ws://localhost:8765
   ```
2. **Serve the page** (ES modules need http, not file://):
   ```
   cd coherence && python3 -m http.server 8080
   ```
3. Open **http://localhost:8080/protocol/** in Chrome.
4. The status pill shows `bridge ✓ · <device> · N beats` once RR is flowing.
   Pick a preset (Short 2/5/2 or Full 5/5/5), log context, rate how calm you feel,
   and **Start**. Hum on the exhale during the protocol phase.
5. At the end: per-phase RMSSD table + carryover, rate calm again, export CSV/JSON.

## Files

- `lib/rmssd.js` — RMSSD engine (rolling + per-phase), artifact handling.
- `lib/breath-pacer.js` — asymmetric inhale/exhale canvas guide.
- `lib/phase-runner.js` — baseline → protocol → recovery state machine + presets.
- `lib/recorder.js` — self-contained IndexedDB store + CSV/JSON export.
- `app.js` — orchestration; reuses `../src/integrations/polar-h10-client.js`.

## Not yet (deliberate scope cuts for slice 1)

- Transport is the existing Python bridge; **Web Bluetooth / Swift wrapper** is the
  planned refactor for the Training Tracker (Cognition) port.
- No per-session baseline distribution / z-scoring yet — that's the *day-scale*
  layer (mirrors the PVT N-gate). This slice validates the *within-session* effect
  first. One session tells you little; repeat daily for ~2 weeks before trusting
  the carryover against your own day-to-day variance.
