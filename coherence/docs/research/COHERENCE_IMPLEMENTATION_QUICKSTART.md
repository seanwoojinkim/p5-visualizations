# HRV Coherence Implementation Quickstart Guide
## Fast-Track Implementation for Interactive Art

**Last Updated:** October 25, 2025

This is a condensed implementation guide extracted from the comprehensive research report. Use this for quick reference during development.

---

## TL;DR - What You Need to Know

**Coherence Formula:**
```
Coherence Ratio = Peak Power / (Total Power - Peak Power)

Where:
- Peak Power = PSD integrated over 0.030 Hz window centered on max peak
- Total Power = PSD integrated over 0.04-0.26 Hz range
- Max peak found in 0.04-0.26 Hz range
```

**Data Requirements:**
- Minimum: 30 seconds, ~25 beats
- Recommended: 60 seconds, ~50 beats
- Update: Every 3-5 seconds

**Latency:** 50-100ms total (well under your 500ms requirement)

---

## Essential Code Snippets

### 1. Arduino ECG Reader (AD8232)

```cpp
// Simple AD8232 reader - sends raw ECG values via serial
const int ECG_PIN = A0;
const int LO_PLUS = 10;
const int LO_MINUS = 11;

void setup() {
  Serial.begin(115200);
  pinMode(LO_PLUS, INPUT);
  pinMode(LO_MINUS, INPUT);
}

void loop() {
  if ((digitalRead(LO_PLUS) == 1) || (digitalRead(LO_MINUS) == 1)) {
    Serial.println(-1);  // Electrode disconnected
  } else {
    Serial.println(analogRead(ECG_PIN));
  }
  delay(2);  // 500 Hz sampling
}
```

### 2. R-Peak Detection (JavaScript)

```javascript
class SimplePeakDetector {
  constructor(samplingRate = 500) {
    this.samplingRate = samplingRate;
    this.buffer = [];
    this.threshold = 0;
    this.lastPeakTime = 0;
    this.rrIntervals = [];
  }

  addSample(value) {
    this.buffer.push(value);

    // Keep 5 seconds of data
    if (this.buffer.length > this.samplingRate * 5) {
      this.buffer.shift();
    }

    // Update threshold every 100 samples
    if (this.buffer.length % 100 === 0) {
      const recent = this.buffer.slice(-this.samplingRate * 2);
      this.threshold = Math.max(...recent) * 0.75;
    }

    // Detect peak
    if (this.buffer.length >= 3) {
      const idx = this.buffer.length - 2;
      const prev = this.buffer[idx - 1];
      const curr = this.buffer[idx];
      const next = this.buffer[idx + 1];

      const now = Date.now();
      const timeSinceLast = now - this.lastPeakTime;

      if (curr > prev && curr > next &&
          curr > this.threshold &&
          timeSinceLast > 300) {  // Minimum 300ms between peaks

        const rrInterval = timeSinceLast;
        this.lastPeakTime = now;

        if (rrInterval >= 300 && rrInterval <= 2000) {
          this.rrIntervals.push(rrInterval);
          return rrInterval;
        }
      }
    }

    return null;
  }

  getRecentRR(count = 60) {
    return this.rrIntervals.slice(-count);
  }
}
```

### 3. Coherence Calculator (Simplified)

```javascript
import FFT from 'fft.js';

class CoherenceCalculator {
  constructor(windowSeconds = 60) {
    this.windowDuration = windowSeconds * 1000;
    this.rrBuffer = [];
    this.fftSize = 256;
    this.fft = new FFT(this.fftSize);
  }

  addRR(interval_ms) {
    const now = Date.now();
    this.rrBuffer.push({ rr: interval_ms, time: now });

    // Remove old data
    const cutoff = now - this.windowDuration;
    this.rrBuffer = this.rrBuffer.filter(item => item.time > cutoff);
  }

  calculate() {
    if (this.rrBuffer.length < 30) {
      return { status: 'insufficient_data', coherence: 0 };
    }

    // 1. Extract RR intervals
    const rr = this.rrBuffer.map(item => item.rr);

    // 2. Resample to 4 Hz
    const samplingRate = 4;
    const duration = this.windowDuration / 1000;
    const resampled = this.resample(rr, samplingRate, duration);

    // 3. Detrend
    const detrended = this.detrend(resampled);

    // 4. Apply Hanning window
    const windowed = this.applyHanning(detrended);

    // 5. FFT
    const { psd, frequencies } = this.computePSD(windowed, samplingRate);

    // 6. Calculate coherence ratio
    return this.coherenceRatio(psd, frequencies);
  }

  resample(rr, samplingRate, duration) {
    // Linear interpolation (faster than cubic spline)
    const n = Math.floor(duration * samplingRate);
    const cumTime = [0];
    rr.forEach(interval => cumTime.push(cumTime[cumTime.length - 1] + interval));

    const dt = 1000 / samplingRate;
    const resampled = [];

    for (let i = 0; i < n; i++) {
      const t = i * dt;
      let j = cumTime.findIndex(ct => ct > t);
      if (j <= 0) j = 1;
      if (j >= cumTime.length) j = cumTime.length - 1;

      const t0 = cumTime[j - 1];
      const t1 = cumTime[j];
      const v0 = rr[j - 1];
      const v1 = rr[j];

      const alpha = (t - t0) / (t1 - t0);
      resampled.push(v0 + alpha * (v1 - v0));
    }

    return resampled;
  }

  detrend(data) {
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);

    // Calculate linear trend
    const sumX = x.reduce((a, b) => a + b);
    const sumY = data.reduce((a, b) => a + b);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * data[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map((yi, i) => yi - (slope * i + intercept));
  }

  applyHanning(data) {
    const n = data.length;
    return data.map((val, i) => {
      const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / n));
      return val * window;
    });
  }

  computePSD(data, samplingRate) {
    const padded = [...data];
    while (padded.length < this.fftSize) padded.push(0);

    const out = this.fft.createComplexArray();
    this.fft.realTransform(out, padded.slice(0, this.fftSize));

    const psd = [];
    const frequencies = [];

    for (let i = 0; i < this.fftSize / 2; i++) {
      const real = out[2 * i];
      const imag = out[2 * i + 1];
      psd.push((real * real + imag * imag) / this.fftSize);
      frequencies.push(i * samplingRate / this.fftSize);
    }

    return { psd, frequencies };
  }

  coherenceRatio(psd, frequencies) {
    // Find peak in 0.04-0.26 Hz range
    let peakIdx = 0;
    let peakPower = 0;
    let peakFreq = 0;

    for (let i = 0; i < frequencies.length; i++) {
      if (frequencies[i] >= 0.04 && frequencies[i] <= 0.26) {
        if (psd[i] > peakPower) {
          peakPower = psd[i];
          peakIdx = i;
          peakFreq = frequencies[i];
        }
      }
    }

    // Peak window: ±0.015 Hz
    let peakWindowPower = 0;
    for (let i = 0; i < frequencies.length; i++) {
      if (Math.abs(frequencies[i] - peakFreq) <= 0.015) {
        peakWindowPower += psd[i];
      }
    }

    // Total power in coherence range
    let totalPower = 0;
    for (let i = 0; i < frequencies.length; i++) {
      if (frequencies[i] >= 0.04 && frequencies[i] <= 0.26) {
        totalPower += psd[i];
      }
    }

    // Coherence ratio
    const ratio = peakWindowPower / (totalPower - peakWindowPower);

    // Convert to 0-100 score
    let score = 0;
    if (ratio < 0.9) {
      score = (ratio / 0.9) * 33;
    } else if (ratio < 7.0) {
      score = 33 + ((ratio - 0.9) / (7.0 - 0.9)) * 34;
    } else {
      score = 67 + Math.min((ratio - 7.0) / 3.0, 1.0) * 33;
    }

    return {
      status: 'valid',
      coherence: Math.round(score),
      ratio,
      peakFrequency: peakFreq.toFixed(3),
      peakPower: peakWindowPower.toFixed(2),
      totalPower: totalPower.toFixed(2)
    };
  }
}
```

### 4. RMSSD Calculator (Fast Secondary Metric)

```javascript
class RMSSDCalculator {
  constructor(windowSize = 20) {
    this.windowSize = windowSize;
    this.rrIntervals = [];
  }

  addInterval(rr_ms) {
    this.rrIntervals.push(rr_ms);
    if (this.rrIntervals.length > this.windowSize) {
      this.rrIntervals.shift();
    }
  }

  calculate() {
    if (this.rrIntervals.length < 2) return null;

    let sumSquaredDiffs = 0;
    for (let i = 0; i < this.rrIntervals.length - 1; i++) {
      const diff = this.rrIntervals[i + 1] - this.rrIntervals[i];
      sumSquaredDiffs += diff * diff;
    }

    return Math.sqrt(sumSquaredDiffs / (this.rrIntervals.length - 1));
  }
}
```

### 5. p5.js Integration

```javascript
let peakDetector;
let coherenceCalc;
let rmssdCalc;
let serial;

// Display values
let currentCoherence = 0;
let currentRMSSD = 0;
let targetCoherence = 0;

function setup() {
  createCanvas(800, 600);

  // Initialize calculators
  peakDetector = new SimplePeakDetector(500);
  coherenceCalc = new CoherenceCalculator(60);
  rmssdCalc = new RMSSDCalculator(20);

  // Web Serial setup
  serial = createSerial();

  let connectBtn = createButton('Connect to ECG Sensor');
  connectBtn.position(20, 20);
  connectBtn.mousePressed(connectToSerial);

  // Calculate coherence every 3 seconds
  setInterval(updateCoherence, 3000);
}

function connectToSerial() {
  if (!serial.opened()) {
    serial.open(115200);
  }
}

function serialEvent() {
  let data = serial.readLine();
  if (data.length > 0) {
    const ecgValue = parseInt(data);

    if (ecgValue === -1) {
      // Electrode disconnected
      return;
    }

    // Detect R-peak
    const rrInterval = peakDetector.addSample(ecgValue);

    if (rrInterval !== null) {
      // New heartbeat detected
      coherenceCalc.addRR(rrInterval);
      rmssdCalc.addInterval(rrInterval);
    }
  }
}

function updateCoherence() {
  const result = coherenceCalc.calculate();
  if (result.status === 'valid') {
    targetCoherence = result.coherence;
    console.log('Coherence:', result);
  }
}

function draw() {
  background(0);

  // Smooth transition
  currentCoherence = lerp(currentCoherence, targetCoherence, 0.1);
  currentRMSSD = rmssdCalc.calculate() || 0;

  // Visual mapping
  const hue = map(currentCoherence, 0, 100, 0, 120); // Red to green
  const brightness = map(currentCoherence, 0, 100, 30, 100);
  const size = map(currentRMSSD, 0, 100, 100, 400);

  colorMode(HSB);
  fill(hue, 80, brightness);
  noStroke();

  // Main coherence circle
  ellipse(width / 2, height / 2, size, size);

  // Text overlay
  colorMode(RGB);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  text(Math.round(currentCoherence), width / 2, height / 2);

  // Info text
  textAlign(LEFT, TOP);
  textSize(16);
  fill(200);
  text(`Coherence: ${currentCoherence.toFixed(1)}`, 20, 60);
  text(`RMSSD: ${currentRMSSD.toFixed(1)} ms`, 20, 85);
}
```

---

## Installation Steps

### 1. Hardware Setup

```
AD8232 → Arduino Nano
-----------------------
GND    → GND
VCC    → 3.3V
OUTPUT → A0
LO-    → D10
LO+    → D11
```

**Electrode Placement (3-lead):**
- **RA (Right Arm):** Right chest, below collarbone
- **LA (Left Arm):** Left chest, below collarbone
- **RL (Right Leg):** Lower right rib cage (reference)

### 2. Arduino Setup

1. Install Arduino IDE
2. Upload the ECG reader sketch above
3. Note the COM port (e.g., COM3 or /dev/ttyUSB0)

### 3. JavaScript Setup

```bash
# Create project directory
mkdir ecg-coherence
cd ecg-coherence

# Initialize npm
npm init -y

# Install dependencies
npm install fft.js

# If using bundler (recommended)
npm install --save-dev vite

# File structure
# ecg-coherence/
# ├── index.html
# ├── sketch.js
# ├── peak-detector.js
# ├── coherence-calculator.js
# ├── rmssd-calculator.js
# └── package.json
```

**index.html:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HRV Coherence Art</title>
  <script src="https://cdn.jsdelivr.net/npm/p5@1.7.0/lib/p5.js"></script>
  <script src="https://unpkg.com/@gohai/p5.webserial@^1/libraries/p5.webserial.js"></script>
</head>
<body>
  <script type="module" src="sketch.js"></script>
</body>
</html>
```

### 4. Run

```bash
# Development server
npx vite

# Or simple HTTP server
python -m http.server 8000

# Open browser to http://localhost:8000
```

---

## Testing Without Hardware

### Synthetic Data Generator

```javascript
class SyntheticECG {
  constructor(coherent = true, bpm = 60) {
    this.coherent = coherent;
    this.bpm = bpm;
    this.time = 0;
    this.samplingRate = 500; // Hz
  }

  nextSample() {
    const t = this.time / this.samplingRate;

    // Base heart rate
    const baseRR = 60 / this.bpm;

    // Coherent: strong 0.1 Hz modulation
    // Non-coherent: mixed frequencies
    let modulation = 0;
    if (this.coherent) {
      modulation = 0.2 * Math.sin(2 * Math.PI * 0.1 * t);
    } else {
      modulation = 0.1 * Math.sin(2 * Math.PI * 0.15 * t) +
                   0.1 * Math.sin(2 * Math.PI * 0.25 * t) +
                   0.05 * Math.random();
    }

    // ECG waveform (simplified QRS complex)
    const phase = (t % baseRR) / baseRR;
    let ecg = 512; // Baseline (mid-range for 10-bit ADC)

    // R-peak at phase ~0.2
    if (phase > 0.15 && phase < 0.25) {
      ecg += 400 * Math.exp(-100 * Math.pow(phase - 0.2, 2));
    }

    // Add modulation to RR interval (affects peak timing)
    ecg += modulation * 50;

    // Noise
    ecg += (Math.random() - 0.5) * 20;

    this.time++;
    return Math.round(ecg);
  }
}

// Usage in setup():
const syntheticECG = new SyntheticECG(true, 60); // Coherent, 60 bpm

function draw() {
  // Instead of serial data
  const ecgValue = syntheticECG.nextSample();
  const rrInterval = peakDetector.addSample(ecgValue);
  // ... rest of processing
}
```

---

## Quick Troubleshooting

### Problem: No R-peaks detected
**Solutions:**
- Lower threshold (try 0.6-0.7 instead of 0.75)
- Check electrode placement
- Verify ECG signal is being received (plot raw values)
- Try adjusting the minimum time between peaks (200-400ms)

### Problem: Too many false peaks
**Solutions:**
- Raise threshold (try 0.8-0.85)
- Increase minimum time between peaks (350-400ms)
- Implement bandpass filter (5-15 Hz) before peak detection

### Problem: Coherence always low
**Solutions:**
- Check window duration (need at least 30 seconds)
- Verify RR intervals are in reasonable range (300-2000ms)
- Test with synthetic coherent data
- Ask user to breathe slowly (6 breaths/minute = 0.1 Hz)

### Problem: Serial connection fails
**Solutions:**
- Check baud rate matches (115200)
- Close other serial monitors
- Try different browser (Chrome recommended)
- Enable HTTPS for Web Serial API (or use localhost)

### Problem: Choppy visualization
**Solutions:**
- Use lerp() to smooth transitions
- Update coherence every 3-5 seconds, not every frame
- Separate calculation from rendering (use setInterval)

---

## Performance Checklist

- [ ] R-peak detection: <50ms per sample
- [ ] FFT computation: <5ms for 256 points
- [ ] Total coherence calculation: <20ms
- [ ] Visualization: 60 fps (16ms per frame)
- [ ] Serial reading: No buffer overflow (115200 baud sufficient)
- [ ] Memory: RR buffer limited (keep <100 samples)

---

## Validation Tests

### Test 1: Coherent Breathing
1. Breathe at 6 breaths/minute (10-second cycle)
2. Use metronome or visual pacer
3. Expected: Coherence score 70-100, peak at ~0.1 Hz

### Test 2: Normal Breathing
1. Breathe naturally
2. Expected: Coherence score 20-50, mixed frequencies

### Test 3: Breath Hold
1. Hold breath for 10 seconds
2. Expected: Coherence drops, lower variability

### Test 4: Synthetic Coherent Data
```javascript
const coherentRR = [];
for (let i = 0; i < 60; i++) {
  const t = i * 1000; // 1 second per beat
  const variation = 100 * Math.sin(2 * Math.PI * 0.1 * t / 1000);
  coherentRR.push(1000 + variation);
}

// Test coherence calculation
coherentRR.forEach(rr => coherenceCalc.addRR(rr));
const result = coherenceCalc.calculate();
console.log('Expected: 80-100, Actual:', result.coherence);
```

---

## Libraries Needed

**Required:**
- `fft.js` - FFT computation
- `p5.js` - Visualization
- `p5.webserial` - Serial communication

**Optional:**
- `cubic-spline` - Better interpolation (slower)
- `simple-statistics` - Statistical functions
- `chart.js` - Additional visualizations

**Installation:**
```bash
npm install fft.js
# p5.js and p5.webserial loaded via CDN in HTML
```

---

## Next Steps After Basic Implementation

1. **Improve R-peak Detection:**
   - Implement Pan-Tompkins algorithm
   - Add bandpass filtering
   - Adaptive thresholds

2. **Add Breathing Pacer:**
   - Visual guide at 0.1 Hz (expanding circle)
   - Instructions: "Breathe with the circle"
   - Helps users achieve coherence

3. **Calibration Period:**
   - First 60 seconds = baseline
   - Normalize scores to user's range
   - Show relative improvement

4. **Error Handling:**
   - Detect electrode disconnection
   - Motion artifact rejection
   - "Please remain still" messages

5. **Advanced Visualization:**
   - Multiple metrics (coherence + RMSSD + peak frequency)
   - Animated mandalas, particle systems
   - Sound synthesis (pitch = coherence)

6. **Data Logging:**
   - Save sessions to browser storage
   - Track progress over time
   - Export CSV for analysis

---

## Quick Reference: Key Constants

```javascript
const CONFIG = {
  // ECG Sampling
  SAMPLING_RATE: 500,              // Hz
  SERIAL_BAUD: 115200,             // bps

  // R-Peak Detection
  PEAK_THRESHOLD: 0.75,            // 75% of max
  MIN_RR_INTERVAL: 300,            // ms (200 bpm max)
  MAX_RR_INTERVAL: 2000,           // ms (30 bpm min)

  // Coherence Calculation
  WINDOW_DURATION: 60,             // seconds
  UPDATE_INTERVAL: 3,              // seconds
  MIN_BEATS_REQUIRED: 30,          // beats
  RESAMPLE_RATE: 4,                // Hz
  FFT_SIZE: 256,                   // samples

  // Frequency Ranges
  COHERENCE_MIN_FREQ: 0.04,        // Hz
  COHERENCE_MAX_FREQ: 0.26,        // Hz
  PEAK_WINDOW_WIDTH: 0.030,        // Hz (±0.015)
  TARGET_COHERENCE_FREQ: 0.1,      // Hz (6 bpm)

  // Scoring Thresholds (HeartMath standard)
  LOW_COHERENCE_THRESHOLD: 0.9,    // ratio
  HIGH_COHERENCE_THRESHOLD: 7.0,   // ratio

  // RMSSD
  RMSSD_WINDOW_SIZE: 20,           // beats

  // Visualization
  UPDATE_SMOOTH: 0.1,              // lerp factor
  FPS: 60                          // target frame rate
};
```

---

## Common Pitfall Checklist

- [ ] Don't update coherence every frame (too jittery)
- [ ] Don't use windows <30 seconds (insufficient data)
- [ ] Don't forget to remove old data from buffers
- [ ] Don't skip the Hanning window (spectral leakage)
- [ ] Don't forget to detrend the signal
- [ ] Don't use synchronous serial reading (blocks rendering)
- [ ] Don't show absolute scores (normalize to user)
- [ ] Don't forget electrode disconnection detection
- [ ] Don't skip artifact rejection (validate RR intervals)
- [ ] Don't use console.log in tight loops (performance)

---

**For complete details, formulas, and theory, see:**
`HRV_COHERENCE_ALGORITHM_RESEARCH.md` (full 50+ page research report)

**Questions or Issues?**
Refer to Section 8 (Troubleshooting) and Section 9 (Resources) in the main research document.
