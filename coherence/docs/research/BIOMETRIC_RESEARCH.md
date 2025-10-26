# Real-Time Biometric Signal Processing Research
## For Interpersonal Coherence Art Installation

**Research Date:** October 25, 2025
**Focus:** Real-time HRV analysis, consumer hardware, web-compatible solutions for interactive art installations

---

## Executive Summary

This research focuses on practical, real-time biometric signal processing suitable for art installations measuring interpersonal coherence. The key findings emphasize **consumer-grade hardware** (Polar H10, MAX30102 sensors), **web-based technologies** (WebBluetooth, WebSocket), and **real-time processing techniques** that can provide responsive feedback (10-30 second windows) without extensive post-processing.

**Key Recommendation:** Use **Polar H10** chest straps with **WebBluetooth API** for direct browser integration, combined with **sliding window HRV analysis** (10-30 second windows) for near-instantaneous coherence feedback suitable for interactive art.

---

## 1. Hardware Options

### 1.1 Consumer Heart Rate Monitors

#### **Polar H10 Heart Rate Monitor** ⭐ RECOMMENDED

**Technology:** ECG (Electrocardiogram) - Gold standard for accuracy
**Price:** ~$86-90 USD
**Connectivity:** Bluetooth Low Energy (BLE), ANT+, 5kHz (GymLink)

**Pros:**
- ECG-based measurement (most accurate for HRV)
- Excellent developer support via Polar BLE SDK
- Can record raw ECG data (not just heart rate)
- Water resistant up to 30m
- Battery life: ~17 days continuous use (replaceable battery)
- Direct WebBluetooth compatibility
- Multiple example projects available on GitHub

**Cons:**
- More expensive than alternatives
- Chest strap may be less comfortable for long art installation sessions
- Requires proper skin contact with electrodes

**Developer Resources:**
- Official SDK: https://github.com/polarofficial/polar-ble-sdk
- WebBluetooth Example: https://github.com/cjs30/WebPolarReader
- Simple JS Example: https://gist.github.com/flatfeetpete/cabfdd41211e1b1007096463ad9b415c

---

#### **Wahoo TICKR / TICKR X**

**Technology:** ECG (Electrocardiogram)
**Price:**
- TICKR: ~$40 USD
- TICKR X: ~$79 USD

**Pros:**
- More affordable than Polar H10 (standard TICKR)
- ECG-based accuracy comparable to Polar H10
- Extremely comfortable fit (rated #1 in many reviews)
- TICKR X: 365-day battery life
- Compatible with major fitness apps

**Cons:**
- Less robust developer ecosystem than Polar
- Water resistance only to 5m (vs Polar's 30m)
- Limited API documentation for direct development
- WebBluetooth examples less common

**Best for:** Budget-conscious installations where comfort is priority

---

#### **Apple Watch (Series 4+)**

**Technology:** PPG (Photoplethysmography) + ECG (Series 4+)
**Price:** $399-829 USD (depending on model)

**Pros:**
- Widely available, many participants may already own one
- Wrist-based (more comfortable than chest strap)
- Includes ECG app for rhythm analysis
- Rich HealthKit ecosystem

**Cons:**
- **NOT suitable for real-time streaming to external apps**
- ~15 minute sync delay for Web API access
- Real-time data only available to watchOS apps (not web/external)
- Requires iPhone app development for data relay
- Most expensive option
- PPG less accurate than ECG for HRV

**Verdict:** ❌ NOT RECOMMENDED for real-time art installations due to sync delays

---

#### **Fitbit Devices**

**Technology:** PPG (Photoplethysmography)
**Price:** $70-330 USD (depending on model)

**Pros:**
- Affordable, widely available
- Wrist-based comfort
- Good for activity tracking

**Cons:**
- **NOT suitable for real-time streaming**
- ~15 minute sync delay for Web API
- No real-time API for third-party apps
- PPG less accurate for HRV than ECG
- Restrictive API access (requires application approval)

**Verdict:** ❌ NOT RECOMMENDED for real-time art installations

---

### 1.2 DIY / Custom Sensor Options

#### **MAX30102 PPG Sensor + ESP32** ⭐ BUDGET OPTION

**Technology:** PPG (Photoplethysmography)
**Price:** $5-15 USD for sensor + ESP32 board

**Pros:**
- Extremely affordable (can outfit multiple participants)
- Full control over data pipeline
- ESP32 supports WiFi and Bluetooth
- WebSocket support for real-time browser streaming
- Many tutorials and example projects available
- Can measure both heart rate and SpO2

**Cons:**
- DIY assembly required
- PPG less accurate than ECG (especially with movement)
- Sensitive to motion artifacts
- Requires technical setup and calibration
- Participant needs to keep finger on sensor (less natural)

**Best for:** Budget installations, experimental projects, multiple simultaneous participants

**Technical Resources:**
- Tutorial: https://www.teachmemicro.com/esp32-heart-rate-sensor-max30102/
- ESP32 + WebSocket example: Multiple sources available
- Libraries: DFRobot_MAX30102, Adafruit MAX3010x

**Setup:**
```
ESP32 + MAX30102 → WebSocket → Browser (JavaScript)
Real-time heart rate every 500ms - 1000ms
```

---

#### **Easy Pulse Sensor (DIY Kit)**

**Technology:** PPG (Photoplethysmography)
**Price:** ~$20-30 USD
**Platform:** Arduino compatible

**Pros:**
- Designed for education and hobbyist projects
- Good documentation
- Simpler than building from scratch

**Cons:**
- Still requires Arduino knowledge
- PPG limitations (motion artifacts)
- Less polished than commercial solutions

---

#### **EmotiBit - Multi-Sensor Biometric Platform**

**Technology:** Multi-sensor (PPG, EDA, temperature, accelerometer)
**Price:** ~$400 USD (estimate from research)

**Pros:**
- Open-source visualization based on OpenFrameworks
- Multiple biometric channels (not just heart rate)
- Supports OSC, LSL, UDP protocols
- Designed specifically for creative/research applications
- Used in art installations (documented use cases)

**Cons:**
- Expensive for single-purpose heart rate monitoring
- More complex than needed for HRV-only projects
- Overkill if only measuring heart rate

**Best for:** Multi-modal biometric art installations

---

### Hardware Summary Table

| Device | Price | Accuracy | Real-Time | Setup | Recommended |
|--------|-------|----------|-----------|-------|-------------|
| **Polar H10** | $90 | ⭐⭐⭐⭐⭐ ECG | ✅ Excellent | Easy | ⭐ PRIMARY |
| **Wahoo TICKR** | $40 | ⭐⭐⭐⭐⭐ ECG | ✅ Good | Easy | ✅ Budget alt |
| **MAX30102+ESP32** | $10 | ⭐⭐⭐ PPG | ✅ Excellent | DIY | ✅ DIY option |
| **Apple Watch** | $400+ | ⭐⭐⭐⭐ PPG/ECG | ❌ No | Complex | ❌ No |
| **Fitbit** | $70-330 | ⭐⭐⭐ PPG | ❌ No | Easy | ❌ No |
| **EmotiBit** | $400 | ⭐⭐⭐⭐ Multi | ✅ Yes | Moderate | ⚠️ Multi-modal |

---

## 2. Software Libraries and Tools

### 2.1 JavaScript Libraries (Web-Based) ⭐ RECOMMENDED FOR ART

#### **Web Bluetooth API** (Native Browser Support)

**Platform:** Chrome, Edge, Opera (limited Safari support)
**Cost:** Free (native browser API)

**What it does:**
- Direct Bluetooth Low Energy communication from web browser
- No native app required
- Works with standard Heart Rate Service (UUID: 0x180D)

**Browser Support:**
- ✅ Chrome 56+ (Windows, macOS, Android, ChromeOS)
- ✅ Edge 79+
- ⚠️ Safari (limited support)
- ❌ Firefox (not supported)

**Example Code (Heart Rate Monitor):**
```javascript
// Connect to heart rate monitor
async function connectHeartRate() {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ['heart_rate'] }]
  });

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService('heart_rate');
  const characteristic = await service.getCharacteristic('heart_rate_measurement');

  // Start notifications
  await characteristic.startNotifications();
  characteristic.addEventListener('characteristicvaluechanged', handleHeartRate);
}

function handleHeartRate(event) {
  const value = event.target.value;
  const heartRate = value.getUint8(1); // Parse heart rate from data
  console.log('Heart Rate:', heartRate);
  // Update visualization here
}
```

**Resources:**
- Official Docs: https://developer.chrome.com/docs/capabilities/bluetooth
- Live Samples: https://googlechrome.github.io/samples/web-bluetooth/
- Tutorial: https://labs.ullo.fr/tutorials/web-bluetooth/

**Pros:**
- No app installation required
- Cross-platform (works on any device with supported browser)
- Simple, clean API
- Direct integration with p5.js, Three.js, etc.
- Perfect for art installations (participants just open browser)

**Cons:**
- Limited browser support
- Requires HTTPS (except localhost)
- Can only access standard BLE services easily

---

#### **p5.ble.js** - p5.js + Bluetooth LE

**Platform:** Web (p5.js framework)
**Cost:** Free, open-source
**Creators:** NYU ITP (Yining Shi, Jingwen Zhu, Tom Igoe)

**What it does:**
- Simplifies BLE device connection in p5.js sketches
- Read/write BLE characteristics
- Start/stop notifications
- Perfect for creative coding

**Example Projects:**
- Heart rate visualization installations
- Interactive biometric art pieces
- Educational biosignal demos

**Code Example:**
```javascript
// p5.js sketch with BLE heart rate
let myBLE;
let heartRate = 0;

function setup() {
  createCanvas(400, 400);

  // Create BLE instance
  myBLE = new p5ble();

  // Create connect button
  const connectButton = createButton('Connect Heart Rate Monitor');
  connectButton.mousePressed(connectBLE);
}

function connectBLE() {
  myBLE.connect('heart_rate', gotCharacteristics);
}

function gotCharacteristics(error, characteristics) {
  if (error) return;

  myBLE.startNotifications('heart_rate_measurement', handleHeartRate);
}

function handleHeartRate(data) {
  heartRate = data.getUint8(1);
}

function draw() {
  background(220);
  // Visualize heart rate
  let size = map(heartRate, 40, 120, 50, 300);
  ellipse(width/2, height/2, size);
}
```

**Resources:**
- Website: https://itpnyu.github.io/p5ble-website/
- Tutorial: https://itp.nyu.edu/physcomp/labs/lab-bluetooth-le-and-p5-ble/
- Examples: https://editor.p5js.org/ (search "p5.ble")

---

#### **WebSocket Libraries** (Real-Time Data Streaming)

For streaming data from hardware to browser:

**Socket.io** (Node.js + Browser)
```javascript
// Server (Node.js)
const io = require('socket.io')(3000);

io.on('connection', (socket) => {
  // Stream heart rate data
  setInterval(() => {
    socket.emit('heartRate', {
      participant: 'A',
      bpm: getCurrentHeartRate(),
      timestamp: Date.now()
    });
  }, 100); // 10 Hz updates
});

// Client (Browser)
const socket = io('http://localhost:3000');
socket.on('heartRate', (data) => {
  updateVisualization(data);
});
```

**Performance:**
- Latency: <50ms typical
- Can stream 300,000+ data points/second
- Maintains 60 FPS visualization

---

#### **OSC (Open Sound Control) via WebSocket**

Perfect for integrating with creative tools (Processing, MaxMSP, TouchDesigner, Unity)

**osc.js Library:**
- Supports WebSocket transport
- Bridge browser to creative coding tools
- Proven in interactive art installations

**Example Flow:**
```
Browser → osc.js → WebSocket → Node.js → OSC/UDP → Max/MSP/Processing
```

**Latency:** Reported as "not bad" for interactive applications (~50-100ms)

---

### 2.2 Python Libraries (Backend Processing)

#### **HeartPy** ⭐ RECOMMENDED

**Platform:** Python
**Cost:** Free, open-source

**What it does:**
- Heart rate analysis toolkit for PPG and ECG
- Noise-resistant algorithms
- Real-time capable (designed for naturalistic data)
- Supports both PC and wearable implementations

**HRV Metrics:**
- BPM (beats per minute)
- RMSSD (Root Mean Square of Successive Differences)
- SDNN (Standard Deviation of NN intervals)
- LF/HF ratio (frequency domain)

**Real-Time Implementation:**
```python
import heartpy as hp

# Process streaming data
def process_hrv_window(ppg_data, sample_rate=100):
    """
    Process 30-second window of PPG data
    Returns: BPM, RMSSD for real-time display
    """
    wd, m = hp.process(ppg_data, sample_rate)

    return {
        'bpm': m['bpm'],
        'rmssd': m['rmssd'],
        'sdnn': m['sdnn']
    }
```

**Resources:**
- Docs: https://python-heart-rate-analysis-toolkit.readthedocs.io/
- GitHub: https://github.com/paulvangentcom/heartrate_analysis_python

**Pros:**
- Well-documented
- Handles noisy data well
- Can process various sensors (smartwatch, ECG, PPG)
- Arduino sketches available for embedded use

---

#### **hrv-analysis** (Python)

**Platform:** Python
**Cost:** Free, open-source

**What it does:**
- Comprehensive HRV analysis
- Time-domain, frequency-domain, non-linear metrics
- Good for research-grade analysis

**Installation:**
```bash
pip install hrv-analysis
```

**Example:**
```python
from hrvanalysis import get_time_domain_features, get_frequency_domain_features

# Compute HRV metrics from RR intervals (ms)
rr_intervals = [800, 850, 820, 790, 840]  # milliseconds

time_features = get_time_domain_features(rr_intervals)
# Returns: RMSSD, SDNN, NN50, pNN50, etc.

freq_features = get_frequency_domain_features(rr_intervals)
# Returns: LF, HF, LF/HF ratio
```

---

#### **NeuroKit2** (Python)

**Platform:** Python
**Cost:** Free, open-source

**What it does:**
- Comprehensive physiological signal processing
- ECG, PPG, EDA, EMG, RSP processing
- Most features but highest computational load

**Best for:** Research applications, batch processing, multi-modal analysis

**Tradeoff:** More features but slower than HeartPy or Systole

---

#### **Systole** (Python)

**Platform:** Python
**Cost:** Free, open-source

**What it does:**
- Cardiac data analysis
- Balance of functionality and efficiency
- Good for multi-person tracking

**Best for:** Multi-participant studies, group coherence measurement

---

### 2.3 Desktop Software (Reference)

#### **Kubios HRV**

**Platform:** Windows, macOS, Linux
**Cost:** Free (basic), Paid (premium features)

**What it does:**
- Professional HRV analysis
- Research-grade metrics
- Not for real-time streaming (batch processing)

**Best for:** Post-hoc analysis, validating your algorithms

---

## 3. Real-Time Processing Pipelines

### 3.1 Browser-Based Pipeline (RECOMMENDED)

**Best for:** Interactive art installations, minimal setup for participants

```
┌─────────────┐     WebBluetooth      ┌─────────────┐
│  Polar H10  │ ═══════════════════> │   Browser   │
│ (Chest Strap)│     BLE Heart Rate    │  (Chrome)   │
└─────────────┘                        └──────┬──────┘
                                              │
                                              │ JavaScript
                                              │ HRV Calculation
                                              ▼
                                       ┌─────────────┐
                                       │   p5.js     │
                                       │ Visualization│
                                       └─────────────┘
```

**Latency:** 100-200ms (BLE + processing)
**Complexity:** Low (no backend required)
**Setup:** Open browser, click "Connect"

**Code Architecture:**
```javascript
// main.js
let hrMonitor = new HeartRateMonitor();
let hrvAnalyzer = new HRVAnalyzer(windowSize=30); // 30 second window
let coherenceCalculator = new CoherenceCalculator();

function setup() {
  hrMonitor.connect('heart_rate');
  hrMonitor.onHeartbeat((rr_interval) => {
    hrvAnalyzer.addInterval(rr_interval);

    if (hrvAnalyzer.isWindowReady()) {
      let metrics = hrvAnalyzer.calculate(); // RMSSD, SDNN
      let coherence = coherenceCalculator.compute(metrics);
      visualize(coherence);
    }
  });
}
```

---

### 3.2 ESP32 + WebSocket Pipeline (DIY)

**Best for:** Budget installations, custom sensors, multiple participants

```
┌─────────────┐    I2C (400kHz)    ┌─────────────┐
│  MAX30102   │ ════════════════> │    ESP32    │
│ PPG Sensor  │                    │ Microcontroller│
└─────────────┘                    └──────┬──────┘
                                          │ WiFi
                                          │ WebSocket
                                          ▼
                                   ┌─────────────┐
                                   │   Browser   │
                                   │  WebSocket  │
                                   │   Client    │
                                   └──────┬──────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │  p5.js Viz  │
                                   └─────────────┘
```

**Latency:** 200-500ms (sensor sampling + WiFi + processing)
**Complexity:** Moderate (Arduino programming required)
**Setup:** Flash ESP32 once, participants connect to WiFi

**ESP32 Code (Arduino):**
```cpp
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <DFRobot_MAX30102.h>

WebSocketsServer webSocket = WebSocketsServer(81);
DFRobot_MAX30102 sensor;

void setup() {
  sensor.begin();
  WiFi.begin(SSID, PASSWORD);
  webSocket.begin();
}

void loop() {
  webSocket.loop();

  // Read heart rate at 500ms intervals
  if (sensor.getHeartRate()) {
    int32_t bpm = sensor.getHeartRate();

    // Broadcast to all connected clients
    String json = "{\"bpm\":" + String(bpm) + "}";
    webSocket.broadcastTXT(json);
  }
  delay(500);
}
```

---

### 3.3 Hybrid Pipeline (Multiple Participants)

**Best for:** Group coherence measurement, interpersonal synchrony

```
┌─────────────┐                        ┌─────────────┐
│ Polar H10 A │─┐                  ┌──>│ Browser A   │
└─────────────┘ │  WebBluetooth    │   └─────────────┘
                ├──────────────────┤
┌─────────────┐ │    to Node.js    │   ┌─────────────┐
│ Polar H10 B │─┘     Server       └──>│ Browser B   │
└─────────────┘                        └─────────────┘
                                              │
                       ┌──────────────────────┘
                       │
                       ▼
                ┌─────────────┐
                │   Node.js   │
                │   Server    │
                │ (HeartPy)   │
                └──────┬──────┘
                       │ Cross-Correlation
                       │ Synchrony Calculation
                       ▼
                ┌─────────────┐
                │  Projection  │
                │  Coherence   │
                │ Visualization│
                └─────────────┘
```

**Latency:** 500-1000ms (multi-device coordination + synchrony calculation)
**Complexity:** High (requires backend coordination)
**Setup:** Central server, multiple BLE connections

---

### 3.4 OSC Bridge Pipeline (Creative Tools)

**Best for:** Integration with Max/MSP, Processing, TouchDesigner, Unity

```
┌─────────────┐     BLE          ┌─────────────┐
│  Polar H10  │ ═══════════════> │   Browser   │
└─────────────┘                  │   (osc.js)  │
                                 └──────┬──────┘
                                        │ WebSocket
                                        │ OSC Messages
                                        ▼
                                 ┌─────────────┐
                                 │   Node.js   │
                                 │ OSC Bridge  │
                                 └──────┬──────┘
                                        │ UDP/OSC
                   ┌────────────────────┼────────────────────┐
                   │                    │                    │
                   ▼                    ▼                    ▼
            ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
            │   Max/MSP   │     │ Processing  │     │    Unity    │
            │   (Audio)   │     │  (Visual)   │     │    (VR)     │
            └─────────────┘     └─────────────┘     └─────────────┘
```

**Latency:** 50-150ms (OSC protocol is fast)
**Complexity:** Moderate (requires OSC understanding)
**Setup:** Run Node.js OSC bridge, connect creative tools

**OSC Message Format:**
```
/heartrate/participant1/bpm 72
/heartrate/participant1/rmssd 42.5
/coherence/pair1 0.78
```

---

## 4. Real-Time HRV Analysis Techniques

### 4.1 Sliding Window Analysis ⭐ KEY TECHNIQUE

**Concept:**
Instead of analyzing long recordings (5+ minutes), use short overlapping windows (10-30 seconds) that continuously update.

**Window Configurations:**

| Window Size | Update Rate | Metrics Available | Reliability |
|-------------|-------------|-------------------|-------------|
| **10 seconds** | Every 2s | HR, Mean RR | Good for HR |
| **20 seconds** | Every 2s | HR, HF (respiration) | Good |
| **30 seconds** | Every 5s | HR, RMSSD, HF | ⭐ Best balance |
| **60 seconds** | Every 5s | All time/freq metrics | Excellent |

**Research Findings:**
- **10-second windows:** Sufficient for mean heart rate and RR intervals
- **20-second windows:** Required for HF (high-frequency) power
- **30-second windows:** Required for RMSSD (most important HRV metric)
- **30-60 seconds:** Optimal for art installation balance (responsive but stable)

**Implementation:**
```javascript
class SlidingWindowHRV {
  constructor(windowSize=30, updateInterval=5) {
    this.windowSize = windowSize * 1000; // Convert to ms
    this.updateInterval = updateInterval * 1000;
    this.rrIntervals = []; // Store RR intervals with timestamps
    this.lastUpdate = 0;
  }

  addInterval(rr_ms, timestamp) {
    this.rrIntervals.push({ rr: rr_ms, time: timestamp });

    // Remove old data outside window
    const cutoff = timestamp - this.windowSize;
    this.rrIntervals = this.rrIntervals.filter(d => d.time > cutoff);

    // Calculate if update interval elapsed
    if (timestamp - this.lastUpdate > this.updateInterval) {
      return this.calculate();
    }
    return null;
  }

  calculate() {
    if (this.rrIntervals.length < 10) return null; // Need minimum data

    const rr = this.rrIntervals.map(d => d.rr);

    // Calculate RMSSD (Root Mean Square of Successive Differences)
    let sumSquares = 0;
    for (let i = 1; i < rr.length; i++) {
      const diff = rr[i] - rr[i-1];
      sumSquares += diff * diff;
    }
    const rmssd = Math.sqrt(sumSquares / (rr.length - 1));

    // Calculate SDNN (Standard Deviation of NN intervals)
    const mean = rr.reduce((a, b) => a + b) / rr.length;
    const variance = rr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / rr.length;
    const sdnn = Math.sqrt(variance);

    // Calculate mean HR
    const meanRR = mean;
    const bpm = 60000 / meanRR;

    this.lastUpdate = Date.now();

    return { bpm, rmssd, sdnn, window_size: rr.length };
  }
}
```

---

### 4.2 Key HRV Metrics for Real-Time Use

#### **RMSSD** (Root Mean Square of Successive Differences) ⭐ PRIMARY METRIC

**What it measures:** Beat-to-beat heart rate variability
**Reflects:** Parasympathetic (vagal) activity
**Window required:** 30+ seconds
**Interpretation:**
- Higher RMSSD = More relaxed, better autonomic regulation
- Lower RMSSD = Stress, sympathetic activation
- Typical range: 20-100 ms

**Real-time usage:**
```javascript
// Normalize RMSSD for visualization (0-1 scale)
function normalizeRMSSD(rmssd) {
  const MIN = 10;  // Low HRV (stressed)
  const MAX = 100; // High HRV (relaxed)
  return constrain(map(rmssd, MIN, MAX, 0, 1), 0, 1);
}

// Example: Control visual coherence
let coherence = normalizeRMSSD(rmssd);
strokeWeight(coherence * 10); // Thicker lines = more coherent
```

---

#### **SDNN** (Standard Deviation of NN intervals)

**What it measures:** Overall HRV across recording
**Reflects:** Total autonomic variability
**Window required:** 60+ seconds (ideally 5 minutes)
**Interpretation:**
- Higher SDNN = Better overall HRV
- Lower SDNN = Reduced autonomic function
- Typical range: 30-150 ms

**Real-time usage:** Less responsive than RMSSD for short windows; use for longer-term trends

---

#### **Heart Rate (BPM)**

**What it measures:** Instantaneous beats per minute
**Window required:** Instantaneous to 10 seconds
**Interpretation:**
- 60-100 BPM = Normal resting
- <60 BPM = Bradycardia (athletes, relaxed)
- >100 BPM = Tachycardia (exercise, stress, excitement)

**Real-time usage:** Most responsive metric; use for immediate feedback

---

#### **Heart Rate Coherence** (HeartMath Method)

**What it measures:** Sine-wave-like regularity in heart rhythm
**Frequency range:** 0.04-0.26 Hz (3-15 cycles/minute)
**Algorithm:**
1. Compute power spectrum of HRV over 64-second window
2. Find maximum peak in coherence range (0.04-0.26 Hz)
3. Calculate integral in ±0.030 Hz window around peak
4. Divide by total spectrum power
5. Update score every 5 seconds
6. Score range: 0-16

**Implementation complexity:** Moderate (requires FFT)

**Interpretation:**
- High coherence = Stable, rhythmic heart pattern
- Associated with emotional regulation, focus, reduced stress

**JavaScript FFT Libraries:**
- `fft.js` (npm package)
- `dsp.js`
- `ml-fft`

---

### 4.3 Interpersonal Coherence Calculation

#### **Cross-Correlation Method** ⭐ RECOMMENDED

**What it measures:** Synchrony between two people's heart rhythms

**Algorithm:**
1. Collect heart rate time series from both participants
2. Use sliding window (30-60 seconds)
3. Calculate cross-correlation with lag (±30 seconds typical)
4. Maximum correlation = synchrony strength
5. Update every 2-5 seconds

**Implementation:**
```javascript
function crossCorrelation(signal1, signal2, maxLag=30) {
  /**
   * Calculate cross-correlation between two signals
   * Returns: { correlation: float, lag: int }
   */
  let maxCorr = -Infinity;
  let bestLag = 0;

  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let corr = 0;
    let count = 0;

    for (let i = 0; i < signal1.length; i++) {
      let j = i + lag;
      if (j >= 0 && j < signal2.length) {
        corr += signal1[i] * signal2[j];
        count++;
      }
    }

    corr /= count;

    if (corr > maxCorr) {
      maxCorr = corr;
      bestLag = lag;
    }
  }

  return { correlation: maxCorr, lag: bestLag };
}

// Usage for two participants
let hrvA = [/* Person A HRV time series */];
let hrvB = [/* Person B HRV time series */];

let { correlation, lag } = crossCorrelation(hrvA, hrvB);

// Normalize to 0-1 for visualization
let synchrony = (correlation + 1) / 2; // Convert from [-1,1] to [0,1]
```

**Research Parameters:**
- **Window size:** 5-8 seconds per segment (research standard)
- **Window overlap:** 50% (2-4 second steps)
- **Maximum lag:** ±30 seconds
- **Update rate:** Every 2 seconds for real-time feel

---

#### **Wavelet Transform Coherence (WTC)** (Advanced)

**What it measures:** Time-frequency coherence between signals
**Frequency bands:**
- Low Frequency (LF): 0.04-0.15 Hz
- High Frequency (HF): 0.15-0.40 Hz

**Complexity:** High (requires continuous wavelet transform)

**Status:**
- ⚠️ Limited JavaScript implementations
- Most implementations in MATLAB/Python
- Would require porting from scientific libraries

**Recommendation:**
Use cross-correlation for real-time art; WTC for post-analysis research

---

## 5. Example Code and Projects

### 5.1 Complete WebBluetooth + p5.js Example

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/p5@1.7.0/lib/p5.js"></script>
  <title>Heart Coherence Visualization</title>
</head>
<body>
  <script>
    // Bluetooth connection
    let connected = false;
    let heartRate = 0;
    let rrIntervals = [];
    let hrvAnalyzer;

    class HRVAnalyzer {
      constructor(windowSize=30) {
        this.windowSize = windowSize * 1000;
        this.intervals = [];
      }

      addInterval(rr_ms) {
        const now = millis();
        this.intervals.push({ rr: rr_ms, time: now });

        // Remove old data
        const cutoff = now - this.windowSize;
        this.intervals = this.intervals.filter(d => d.time > cutoff);
      }

      getRMSSD() {
        if (this.intervals.length < 2) return 0;

        const rr = this.intervals.map(d => d.rr);
        let sumSquares = 0;

        for (let i = 1; i < rr.length; i++) {
          const diff = rr[i] - rr[i-1];
          sumSquares += diff * diff;
        }

        return Math.sqrt(sumSquares / (rr.length - 1));
      }

      getCoherence() {
        const rmssd = this.getRMSSD();
        // Normalize to 0-1 (adjust based on your population)
        return constrain(map(rmssd, 10, 100, 0, 1), 0, 1);
      }
    }

    function setup() {
      createCanvas(800, 600);

      hrvAnalyzer = new HRVAnalyzer(30); // 30 second window

      const connectBtn = createButton('Connect Heart Rate Monitor');
      connectBtn.position(10, 10);
      connectBtn.mousePressed(connectBluetooth);
    }

    async function connectBluetooth() {
      try {
        // Request Bluetooth device
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ services: ['heart_rate'] }]
        });

        console.log('Connecting to', device.name);

        // Connect to GATT server
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const characteristic = await service.getCharacteristic('heart_rate_measurement');

        // Start notifications
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', handleHeartRate);

        connected = true;
        console.log('Connected!');

      } catch(error) {
        console.error('Bluetooth error:', error);
      }
    }

    function handleHeartRate(event) {
      const value = event.target.value;

      // Parse heart rate (standard BLE heart rate format)
      const flags = value.getUint8(0);
      const is16Bit = flags & 0x1;

      if (is16Bit) {
        heartRate = value.getUint16(1, true); // Little-endian
      } else {
        heartRate = value.getUint8(1);
      }

      // Check if RR intervals present
      if (flags & 0x10) {
        // RR intervals present (for HRV calculation)
        let offset = is16Bit ? 3 : 2;

        while (offset < value.byteLength) {
          const rr = value.getUint16(offset, true); // 1/1024 second units
          const rr_ms = (rr / 1024) * 1000; // Convert to milliseconds

          hrvAnalyzer.addInterval(rr_ms);
          offset += 2;
        }
      }
    }

    function draw() {
      background(20, 20, 40);

      if (!connected) {
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(24);
        text('Click button to connect heart rate monitor', width/2, height/2);
        return;
      }

      // Get coherence level
      const coherence = hrvAnalyzer.getCoherence();

      // Visualize as pulsing circle
      push();
      translate(width/2, height/2);

      // Background glow
      noStroke();
      for (let r = 400; r > 0; r -= 20) {
        const alpha = map(r, 0, 400, 255, 0) * coherence;
        fill(100, 150, 255, alpha * 0.3);
        ellipse(0, 0, r, r);
      }

      // Main circle (pulses with heart rate)
      const pulsePhase = (frameCount * (heartRate / 60) * 0.05) % (TWO_PI);
      const pulseSize = sin(pulsePhase) * 30 * coherence;
      const circleSize = 200 + pulseSize;

      // Circle color based on coherence
      const r = map(coherence, 0, 1, 255, 50);
      const g = map(coherence, 0, 1, 50, 200);
      const b = map(coherence, 0, 1, 50, 255);

      fill(r, g, b, 200);
      stroke(255, 255, 255, 150);
      strokeWeight(2);
      ellipse(0, 0, circleSize, circleSize);

      pop();

      // Display metrics
      fill(255);
      noStroke();
      textAlign(LEFT, TOP);
      textSize(18);
      text(`Heart Rate: ${heartRate} BPM`, 20, height - 100);
      text(`RMSSD: ${hrvAnalyzer.getRMSSD().toFixed(1)} ms`, 20, height - 70);
      text(`Coherence: ${(coherence * 100).toFixed(0)}%`, 20, height - 40);

      // Coherence bar
      const barWidth = map(coherence, 0, 1, 0, 200);
      fill(r, g, b);
      rect(200, height - 45, barWidth, 20, 10);
    }
  </script>
</body>
</html>
```

**Save as:** `heart-coherence.html`
**Run:** Open in Chrome browser (use HTTPS or localhost)
**Test:** Connect Polar H10 or compatible heart rate monitor

---

### 5.2 Two-Person Synchrony Example

```javascript
// two-person-coherence.js
class TwoPersonCoherence {
  constructor() {
    this.personA = new HRVAnalyzer(30);
    this.personB = new HRVAnalyzer(30);
    this.syncHistory = [];
  }

  calculateSynchrony() {
    const hrvA = this.personA.intervals.map(d => d.rr);
    const hrvB = this.personB.intervals.map(d => d.rr);

    if (hrvA.length < 10 || hrvB.length < 10) return 0;

    // Normalize signals
    const normA = this.normalize(hrvA);
    const normB = this.normalize(hrvB);

    // Calculate correlation
    const minLen = Math.min(normA.length, normB.length);
    let correlation = 0;

    for (let i = 0; i < minLen; i++) {
      correlation += normA[i] * normB[i];
    }

    correlation /= minLen;

    // Convert to 0-1 range
    const synchrony = (correlation + 1) / 2;

    this.syncHistory.push(synchrony);
    if (this.syncHistory.length > 100) this.syncHistory.shift();

    return synchrony;
  }

  normalize(signal) {
    const mean = signal.reduce((a,b) => a+b) / signal.length;
    const std = Math.sqrt(
      signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length
    );
    return signal.map(val => (val - mean) / std);
  }

  draw(x, y, w, h) {
    push();
    translate(x, y);

    const sync = this.calculateSynchrony();

    // Draw synchrony visualization
    // Two circles that merge based on synchrony
    const separation = map(sync, 0, 1, 100, 0);
    const circleSize = map(sync, 0, 1, 80, 150);

    // Person A circle
    fill(255, 100, 100, 150);
    ellipse(-separation/2, 0, circleSize, circleSize);

    // Person B circle
    fill(100, 100, 255, 150);
    ellipse(separation/2, 0, circleSize, circleSize);

    // Synchrony text
    fill(255);
    textAlign(CENTER, BOTTOM);
    textSize(16);
    text(`Synchrony: ${(sync * 100).toFixed(0)}%`, 0, h/2 + 50);

    // Draw sync history graph
    this.drawHistory(0, h/2 - 100, w, 50);

    pop();
  }

  drawHistory(x, y, w, h) {
    push();
    translate(x, y);

    noFill();
    stroke(255, 200);
    strokeWeight(2);

    beginShape();
    for (let i = 0; i < this.syncHistory.length; i++) {
      const x = map(i, 0, this.syncHistory.length, -w/2, w/2);
      const y = map(this.syncHistory[i], 0, 1, h, 0);
      vertex(x, y);
    }
    endShape();

    pop();
  }
}
```

---

### 5.3 ESP32 + MAX30102 Arduino Code

```cpp
// esp32-heart-websocket.ino
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <DFRobot_MAX30102.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YourWiFiSSID";
const char* password = "YourPassword";

// WebSocket server on port 81
WebSocketsServer webSocket = WebSocketsServer(81);

// MAX30102 sensor
DFRobot_MAX30102 particleSensor;

// Heartbeat detection
unsigned long lastBeat = 0;
int beatsPerMinute = 0;

void setup() {
  Serial.begin(115200);

  // Initialize MAX30102
  while (!particleSensor.begin()) {
    Serial.println("MAX30102 not found");
    delay(1000);
  }

  // Configure sensor
  particleSensor.sensorConfiguration(
    /*ledBrightness=*/50,
    /*sampleAverage=*/SAMPLEAVG_4,
    /*ledMode=*/MODE_MULTILED,
    /*sampleRate=*/SAMPLERATE_100,
    /*pulseWidth=*/PULSEWIDTH_411,
    /*adcRange=*/ADCRANGE_16384
  );

  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // Start WebSocket server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);

  Serial.println("WebSocket server started");
}

void loop() {
  webSocket.loop();

  // Read sensor
  int32_t heartRate = particleSensor.getHeartRate();
  int32_t spo2 = particleSensor.getSPO2();

  if (heartRate > 0 && heartRate < 200) {
    // Calculate RR interval (time between beats)
    unsigned long now = millis();
    unsigned long rrInterval = now - lastBeat;
    lastBeat = now;

    // Create JSON message
    StaticJsonDocument<200> doc;
    doc["bpm"] = heartRate;
    doc["spo2"] = spo2;
    doc["rr"] = rrInterval;
    doc["timestamp"] = now;

    String output;
    serializeJson(doc, output);

    // Broadcast to all connected clients
    webSocket.broadcastTXT(output);

    Serial.println(output);
  }

  delay(100); // 10 Hz sampling
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected\n", num);
      break;

    case WStype_CONNECTED:
      {
        IPAddress ip = webSocket.remoteIP(num);
        Serial.printf("[%u] Connected from %s\n", num, ip.toString().c_str());
      }
      break;

    case WStype_TEXT:
      Serial.printf("[%u] Received: %s\n", num, payload);
      break;
  }
}
```

**Browser Client:**
```javascript
// Connect to ESP32 WebSocket
const ws = new WebSocket('ws://192.168.1.XXX:81'); // Replace with ESP32 IP

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Heart Rate:', data.bpm, 'BPM');
  console.log('RR Interval:', data.rr, 'ms');

  // Update visualization
  hrvAnalyzer.addInterval(data.rr);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onopen = () => {
  console.log('Connected to heart rate sensor');
};
```

---

### 5.4 OSC Bridge for Creative Tools

```javascript
// osc-bridge.js (Node.js)
const osc = require('osc');
const WebSocket = require('ws');

// OSC UDP Port (send to Max/MSP, Processing, etc.)
const oscPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 57121,
  remoteAddress: "127.0.0.1",
  remotePort: 57120
});

oscPort.open();

// WebSocket server (receive from browser)
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Browser connected');

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    // Forward heart rate data as OSC messages
    oscPort.send({
      address: `/heartrate/${data.participant}/bpm`,
      args: [{ type: 'i', value: data.bpm }]
    });

    oscPort.send({
      address: `/heartrate/${data.participant}/rmssd`,
      args: [{ type: 'f', value: data.rmssd }]
    });

    oscPort.send({
      address: `/heartrate/${data.participant}/coherence`,
      args: [{ type: 'f', value: data.coherence }]
    });

    console.log(`Sent OSC: ${data.participant} - ${data.bpm} BPM`);
  });
});

console.log('OSC Bridge running');
console.log('WebSocket: ws://localhost:8080');
console.log('OSC Out: localhost:57120');
```

**Max/MSP Patch:**
```
[udpreceive 57120]
|
[OSC-route /heartrate]
|
[route participant1 participant2]
|           |
[route bpm rmssd coherence]
|      |      |
[i]    [f]    [f]
```

---

## 6. Technical Challenges and Solutions

### 6.1 Latency and Responsiveness

**Challenge:** Art installations require immediate feedback, but HRV analysis needs time to accumulate data.

**Solutions:**

1. **Use Heart Rate for Immediate Feedback** (< 1 second latency)
   - Display instantaneous BPM
   - Pulse animations synchronized to heartbeat
   - Immediate visual/audio response

2. **Layer Multiple Timescales**
   - Fast: Heart rate (< 1s)
   - Medium: 10-second RMSSD (10s window)
   - Slow: 30-second coherence (30s window)
   - Context: 60+ second trends

3. **Predictive Smoothing**
   ```javascript
   // Exponential smoothing for less jitter
   let smoothedHRV = 0;
   const alpha = 0.3; // Smoothing factor

   function updateHRV(newValue) {
     smoothedHRV = alpha * newValue + (1 - alpha) * smoothedHRV;
     return smoothedHRV;
   }
   ```

4. **Optimize Update Rates**
   - BLE heart rate: Every heartbeat (~1 Hz)
   - HRV calculation: Every 2-5 seconds
   - Visualization: 60 FPS (interpolate between updates)

**Typical Latency Budget:**
```
BLE transmission:     50-100ms
JavaScript processing: 10-50ms
HRV calculation:      50-100ms
Rendering:            16ms (60 FPS)
─────────────────────────────────
Total:                ~150-300ms
```

This is acceptable for art installations (participants won't notice < 500ms delays).

---

### 6.2 Motion Artifacts and Noise

**Challenge:** PPG sensors (fingertip, wrist) are sensitive to movement, causing false readings.

**Solutions:**

1. **Use ECG (Chest Straps) When Possible**
   - Polar H10, Wahoo TICKR = ECG = gold standard
   - More resistant to motion artifacts
   - Better for HRV analysis

2. **Signal Quality Detection**
   ```javascript
   function isSignalQualityGood(rrIntervals) {
     // Check for unrealistic values
     const valid = rrIntervals.filter(rr => rr > 300 && rr < 2000);

     // Need at least 80% valid data
     if (valid.length / rrIntervals.length < 0.8) {
       return false;
     }

     // Check for excessive variability (artifacts)
     const diffs = [];
     for (let i = 1; i < valid.length; i++) {
       diffs.push(Math.abs(valid[i] - valid[i-1]));
     }
     const meanDiff = diffs.reduce((a,b) => a+b) / diffs.length;

     // Reject if mean diff > 200ms (likely artifacts)
     return meanDiff < 200;
   }
   ```

3. **Visual Feedback for Participants**
   - Show signal quality indicator
   - Guide participants to stay still
   - Provide comfortable seating

4. **Sensor Placement Best Practices**
   - Chest straps: Moisten electrodes, snug fit
   - Fingertip: Rest hand on table, don't squeeze sensor
   - Wrist: Wear one finger-width above wrist bone, not too tight

---

### 6.3 Individual Variability

**Challenge:** HRV varies widely between individuals (age, fitness, genetics). A "good" RMSSD for one person might be low for another.

**Solutions:**

1. **Normalization to Individual Baseline**
   ```javascript
   class PersonalizedHRV {
     constructor() {
       this.baseline = null;
       this.calibrationData = [];
     }

     calibrate(rmssd) {
       // Collect 2 minutes of baseline data
       this.calibrationData.push(rmssd);

       if (this.calibrationData.length >= 24) { // 24 × 5s = 2 min
         // Use median as baseline (robust to outliers)
         this.baseline = this.median(this.calibrationData);
       }
     }

     normalize(rmssd) {
       if (!this.baseline) return 0.5; // Default during calibration

       // Normalize relative to personal baseline
       return constrain(rmssd / this.baseline, 0, 2) / 2;
     }

     median(arr) {
       const sorted = arr.slice().sort((a, b) => a - b);
       const mid = Math.floor(sorted.length / 2);
       return sorted[mid];
     }
   }
   ```

2. **Calibration Period**
   - First 2 minutes: Establish baseline
   - Show "Calibrating..." message
   - Then normalize all values to personal baseline

3. **Avoid Absolute Thresholds**
   - Don't use fixed "good" vs "bad" thresholds
   - Focus on relative changes (increasing/decreasing)
   - Compare to individual's own baseline

4. **Display Trends, Not Absolute Values**
   - Show arrow: ↑ improving, ↓ declining
   - Show percentage change from baseline
   - De-emphasize raw numbers

---

### 6.4 Synchronization (Multiple Participants)

**Challenge:** When measuring two people simultaneously, their data streams may not be perfectly aligned in time.

**Solutions:**

1. **Timestamp Everything**
   ```javascript
   {
     participant: 'A',
     bpm: 72,
     rr: 833,
     timestamp: 1635789234567 // Unix milliseconds
   }
   ```

2. **Server-Side Synchronization**
   ```javascript
   class MultiParticipantSync {
     constructor() {
       this.buffers = {
         A: [],
         B: []
       };
     }

     addData(participant, data) {
       this.buffers[participant].push(data);

       // Align to oldest timestamp
       const minTime = Math.max(
         this.buffers.A[0]?.timestamp || 0,
         this.buffers.B[0]?.timestamp || 0
       );

       // Trim data older than alignment point
       for (let p in this.buffers) {
         this.buffers[p] = this.buffers[p].filter(
           d => d.timestamp >= minTime
         );
       }
     }

     getAlignedData() {
       // Return time-aligned data for synchrony calculation
       return {
         A: this.buffers.A,
         B: this.buffers.B
       };
     }
   }
   ```

3. **Use Server Time, Not Client Time**
   - Central server timestamps all data
   - Avoids clock drift between devices

4. **Buffer Management**
   - Keep 60-second buffer for each participant
   - Calculate synchrony on overlapping data only

---

### 6.5 Browser Compatibility

**Challenge:** Web Bluetooth API not supported in all browsers.

**Solutions:**

1. **Feature Detection**
   ```javascript
   if (!navigator.bluetooth) {
     alert('Web Bluetooth not supported. Please use Chrome, Edge, or Opera.');
     // Fallback: Show QR code to transfer to compatible device
     return;
   }
   ```

2. **Progressive Enhancement**
   - Offer demo mode with simulated data
   - Alternative: Use mobile app (iOS/Android native BLE support)
   - Alternative: ESP32 WebSocket bridge (no browser BLE needed)

3. **Recommended Setup**
   - **Desktop:** Chrome or Edge (best support)
   - **Mobile:** Chrome for Android, Bluefy (iOS BLE web browser)
   - **Kiosk:** Chromebook or Chrome OS device

4. **Fallback Architecture**
   ```
   Primary:   Browser WebBluetooth → Polar H10
   Fallback:  ESP32 WebSocket → Browser (works in any browser)
   Demo:      Simulated data generator
   ```

---

### 6.6 Battery Life and Reliability

**Challenge:** Art installations may run for hours; sensors need to last all day.

**Solutions:**

1. **Choose Long-Battery Devices**
   - Polar H10: ~17 days continuous (change battery weekly)
   - Wahoo TICKR X: ~365 days
   - ESP32 + MAX30102: 4-6 hours (USB power bank or wall adapter)

2. **Power Management**
   - Provide charging station
   - Have backup sensors ready
   - Monitor battery levels via BLE battery service

3. **Graceful Degradation**
   ```javascript
   device.addEventListener('gattserverdisconnected', () => {
     console.log('Device disconnected');
     showReconnectButton();
     // Fall back to demo visualization while disconnected
   });
   ```

4. **Connection Monitoring**
   - Detect disconnections
   - Auto-reconnect with exponential backoff
   - Visual indicator of connection status

---

## 7. Privacy and Ethical Considerations

### 7.1 GDPR and Biometric Data Compliance

**Key Points:**

1. **Biometric Data = Special Category Data**
   - Heart rate, HRV = physiological characteristics
   - Protected under GDPR Article 9
   - Processing generally prohibited without explicit consent

2. **Explicit Consent Required**
   - Must be freely given, specific, informed, unambiguous
   - Cannot be hidden in terms of service
   - Must be easily revocable

3. **Transparency Requirements**
   - Clearly explain what data is collected
   - Why it's collected (art installation purpose)
   - How it will be used (real-time visualization only)
   - How long it's retained (delete immediately after session)
   - Who will have access (public display vs private)

4. **Data Minimization**
   - Only collect what's necessary (heart rate, not identity)
   - Don't store long-term unless necessary
   - Anonymize immediately if storing for research

---

### 7.2 Consent Framework for Art Installations

**Recommended Implementation:**

```
┌─────────────────────────────────────┐
│   BIOMETRIC ART INSTALLATION        │
│   Informed Consent                  │
├─────────────────────────────────────┤
│                                     │
│ This installation measures your     │
│ heart rate in real-time to create   │
│ an interactive visualization.       │
│                                     │
│ ✓ Data collected: Heart rate (BPM) │
│   and heart rate variability        │
│                                     │
│ ✓ Data use: Real-time visualization│
│   visible to you and other viewers  │
│                                     │
│ ✓ Data retention: Deleted           │
│   immediately when you disconnect   │
│   (not stored or recorded)          │
│                                     │
│ ✓ Your rights:                      │
│   - Withdraw at any time            │
│   - Request data deletion           │
│   - Ask questions about the process │
│                                     │
│ [ ] I consent to participate        │
│                                     │
│ [Continue]  [Learn More]  [Decline] │
└─────────────────────────────────────┘
```

**Code Implementation:**
```javascript
class ConsentManager {
  constructor() {
    this.consentGiven = false;
    this.participantId = null;
  }

  showConsentDialog() {
    // Display consent form
    const consent = confirm(
      "This art installation measures your heart rate in real-time.\n\n" +
      "• Data: Heart rate and HRV\n" +
      "• Use: Real-time visualization only\n" +
      "• Storage: Deleted when you disconnect\n" +
      "• You can withdraw at any time\n\n" +
      "Do you consent to participate?"
    );

    if (consent) {
      this.consentGiven = true;
      this.participantId = this.generateAnonymousId();
      this.logConsent();
    }

    return consent;
  }

  generateAnonymousId() {
    // Anonymous participant ID (no personal info)
    return 'P_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  logConsent() {
    // Log consent for GDPR compliance
    console.log('Consent logged:', {
      participantId: this.participantId,
      timestamp: new Date().toISOString(),
      consentGiven: true
    });
    // In production: Send to server for audit trail
  }

  withdraw() {
    // Allow participant to withdraw
    this.consentGiven = false;
    this.deleteAllData();
    console.log('Consent withdrawn, data deleted');
  }

  deleteAllData() {
    // Delete all participant data
    hrvAnalyzer.clearData();
    // Disconnect sensors
    // Remove from visualization
  }
}
```

---

### 7.3 Best Practices for Art Context

1. **Signage and Information**
   - Large, visible sign explaining the installation
   - QR code to full privacy policy
   - Contact info for questions

2. **Opt-In by Design**
   - Participants must actively connect (not passive scanning)
   - Easy "Stop" button to disconnect immediately
   - Visual indicator that data is being collected (LED, screen)

3. **Data Handling**
   - **Ideal:** Process in browser only, never send to server
   - **If server needed:** Use anonymous IDs, encrypt in transit, delete after session
   - **Never:** Store personal identifiers (name, email, device MAC address)

4. **Public Display Considerations**
   - If displaying to audience: Make clear in consent
   - Option to participate without public display
   - Aggregate data if showing multiple people (not individual names)

5. **Research Ethics (If Applicable)**
   - If installation is also research: IRB approval required
   - Additional consent for data retention and analysis
   - Separate research consent from art participation

---

## 8. Complete System Recommendations

### 8.1 Recommended Setup: Consumer Art Installation

**Target:** Gallery, museum, festival installation for general public

**Hardware:**
- **2× Polar H10 chest straps** ($180 total)
- **1× Laptop/Computer** (Chrome browser)
- **1× Large display or projector**

**Software:**
- **Web Bluetooth + p5.js** (no server needed)
- **Custom visualization** (examples in Section 5)

**Setup Steps:**
1. Open `heart-coherence.html` in Chrome
2. Connect two Polar H10 devices via Web Bluetooth
3. Display real-time coherence visualization on large screen
4. Participants see immediate feedback as they interact

**Pros:**
- Simple, reliable
- No backend server (runs in browser)
- Professional accuracy (ECG-based)
- Easy for participants (just wear strap)

**Cost:** ~$200 + display

---

### 8.2 Budget Setup: DIY Multi-Participant

**Target:** Workshop, maker faire, experimental installation

**Hardware:**
- **4× MAX30102 sensors** ($20)
- **4× ESP32 boards** ($20)
- **1× WiFi router** ($30)
- **1× Laptop** (browser)

**Software:**
- **ESP32 Arduino sketch** (WebSocket server)
- **Browser client** (WebSocket + p5.js)

**Setup Steps:**
1. Flash ESP32 boards with heart rate WebSocket code
2. Connect MAX30102 sensors via I2C
3. Power via USB power banks
4. Participants connect fingertip to sensor
5. Browser displays group coherence

**Pros:**
- Very affordable (<$100)
- Can support many participants
- Full control over hardware/software
- Educational (participants learn about sensors)

**Cons:**
- More setup time (assembly, soldering)
- PPG sensors less accurate
- Participants must keep still (fingertip sensor)

---

### 8.3 Professional Setup: Multi-Modal Installation

**Target:** Museum exhibition, research installation, grant-funded project

**Hardware:**
- **4× EmotiBit sensors** ($1,600)
- **1× High-end computer** (runs OpenFrameworks)
- **Multiple displays or projectors**
- **Professional audio system**

**Software:**
- **EmotiBit OpenFrameworks app** (customizable)
- **OSC integration** (Max/MSP for audio, TouchDesigner for visuals)
- **Custom coherence algorithms**

**Setup Steps:**
1. Customize EmotiBit visualization in OpenFrameworks
2. Stream biometric data via OSC to creative tools
3. Create immersive multi-sensory experience
4. Professional installation with documentation

**Pros:**
- Multi-modal (HR, EDA, temperature, motion)
- Professional quality
- Highly customizable
- Suitable for research publication

**Cons:**
- Expensive ($2,000+)
- Requires programming expertise
- More complex setup

---

## 9. Conclusion and Recommendations

### Key Takeaways

1. **For Art Installations, Prioritize:**
   - ✅ Real-time responsiveness (< 500ms latency)
   - ✅ Simple participant experience (one-button connect)
   - ✅ Reliable hardware (ECG chest straps > PPG wrist/finger)
   - ✅ Web-based solutions (no app installation)
   - ✅ Clear consent and privacy practices

2. **Optimal Configuration:**
   - **Hardware:** Polar H10 chest straps (ECG accuracy + WebBluetooth support)
   - **Software:** Web Bluetooth API + p5.js (runs in browser, no backend)
   - **HRV Analysis:** 30-second sliding window RMSSD (balance of responsiveness + reliability)
   - **Coherence:** Cross-correlation with 2-5 second updates

3. **Avoid Common Pitfalls:**
   - ❌ Don't use Apple Watch or Fitbit (15-minute sync delay, no real-time API)
   - ❌ Don't expect perfect accuracy from wrist PPG sensors (motion artifacts)
   - ❌ Don't use 5-minute HRV windows (too slow for interactive art)
   - ❌ Don't ignore privacy/consent (GDPR compliance essential)

4. **Technical Stack Summary:**

   | Layer | Recommended Technology |
   |-------|------------------------|
   | **Sensors** | Polar H10 (ECG) |
   | **Connectivity** | Bluetooth Low Energy |
   | **API** | Web Bluetooth API |
   | **Language** | JavaScript (browser) |
   | **Visualization** | p5.js / Three.js |
   | **HRV Metrics** | RMSSD (30s window) |
   | **Coherence** | Cross-correlation |
   | **Latency** | 150-300ms total |

---

### Next Steps

1. **Prototype Phase:**
   - Start with single-person Web Bluetooth + p5.js example (Section 5.1)
   - Test with Polar H10
   - Iterate on visualization based on feel

2. **Pilot Testing:**
   - Test with 5-10 participants
   - Gather feedback on:
     - Comfort (chest strap fit)
     - Understanding (is coherence concept clear?)
     - Experience (does it feel responsive?)

3. **Refine Based on Context:**
   - Gallery: Emphasize aesthetic, minimize technical visibility
   - Festival: Make setup quick, provide clear instructions
   - Research: Add data logging, IRB approval

4. **Scale Considerations:**
   - Single participant: Web Bluetooth in browser (easiest)
   - Two participants: Two BLE connections + synchrony calculation
   - 3+ participants: Consider central server to coordinate data streams

---

### Resources Summary

**Hardware Vendors:**
- Polar H10: https://www.polar.com/us-en/sensors/h10-heart-rate-sensor
- MAX30102 Sensors: Adafruit, SparkFun, Amazon
- EmotiBit: https://www.emotibit.com/

**Software Libraries:**
- Web Bluetooth API: https://developer.chrome.com/docs/capabilities/bluetooth
- p5.ble.js: https://itpnyu.github.io/p5ble-website/
- HeartPy: https://github.com/paulvangentcom/heartrate_analysis_python
- osc.js: https://www.npmjs.com/package/osc

**Example Projects:**
- WebPolarReader: https://github.com/cjs30/WebPolarReader
- Biometric Dashboard: https://github.com/mi3nts/biometricDashboard3
- Heart Beat Installation: http://www.ellachung.com/heartbeat

**Academic References:**
- Interpersonal Physiological Synchrony: https://www.nature.com/articles/s41598-021-91831-x
- HRV Metrics Overview: https://www.frontiersin.org/articles/10.3389/fpubh.2017.00267
- Ultra-Short HRV: https://www.mdpi.com/1424-8220/22/17/6528

---

## Appendix: Glossary

**ANT+**: Wireless protocol for sports/fitness sensors (alternative to Bluetooth)

**BLE**: Bluetooth Low Energy, wireless protocol for low-power devices

**BPM**: Beats Per Minute, heart rate measurement

**Cross-Correlation**: Statistical measure of similarity between two time-series signals with time lag

**ECG**: Electrocardiogram, electrical measurement of heart activity (gold standard for HRV)

**GDPR**: General Data Protection Regulation, EU privacy law protecting personal data

**HF**: High Frequency HRV power (0.15-0.40 Hz), reflects respiratory sinus arrhythmia

**HRV**: Heart Rate Variability, variation in time between heartbeats

**LF**: Low Frequency HRV power (0.04-0.15 Hz), reflects mixed sympathetic/parasympathetic activity

**NN Interval**: Normal-to-Normal interval, time between consecutive heartbeats (RR interval)

**OSC**: Open Sound Control, protocol for real-time communication between creative tools

**PPG**: Photoplethysmography, optical measurement of blood volume changes (wrist/finger sensors)

**RMSSD**: Root Mean Square of Successive Differences, primary time-domain HRV metric

**RR Interval**: Time between consecutive R-peaks in ECG (heartbeat intervals), measured in milliseconds

**SDNN**: Standard Deviation of NN intervals, overall HRV metric

**SpO2**: Blood oxygen saturation percentage

**WebSocket**: Protocol for real-time bidirectional communication between browser and server

**WTC**: Wavelet Transform Coherence, advanced time-frequency synchrony measure

---

**End of Research Report**

For questions or implementation support, refer to the GitHub repositories and documentation links throughout this document.
