# Muse EEG Headset Integration Research
## Comprehensive Guide for Neurofeedback and Visualization Projects

**Date:** 2025-11-01
**Version:** 1.0
**Author:** Research & Development

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Part 1: Muse Headset Technical Specifications](#part-1-muse-headset-technical-specifications)
3. [Part 2: Open Source Libraries & SDKs](#part-2-open-source-libraries--sdks)
4. [Part 3: Neurofeedback Applications](#part-3-neurofeedback-applications)
5. [Part 4: Integration with Existing Biofeedback System](#part-4-integration-with-existing-biofeedback-system)
6. [Part 5: Practical Implementation](#part-5-practical-implementation)
7. [Part 6: Comparison & Use Cases](#part-6-comparison--use-cases)
8. [Recommendations](#recommendations)
9. [Resources](#resources)

---

## Executive Summary

The Muse headset is a consumer-grade EEG device ideal for neurofeedback and biometric visualization projects. With 4-5 EEG channels, 256 Hz sampling rate, and robust open-source support, it offers an excellent balance between affordability (~$250-$400), accessibility, and research validity.

**Key Findings:**
- **Best Model for Development:** Muse 2 ($249.99) offers the best price-to-performance ratio
- **Top Python Library:** muselsl with Lab Streaming Layer (LSL) for robust streaming
- **Top JavaScript Library:** muse-js for browser-based applications via Web Bluetooth
- **Research Validation:** Validated against research-grade EEG for spectral analysis and ERP studies
- **Multi-Modal Capability:** Can combine EEG + PPG (heart rate) for comprehensive biofeedback
- **Integration Feasibility:** Excellent fit for combining with existing Polar H10 HRV system

---

## Part 1: Muse Headset Technical Specifications

### 1.1 Available Models Comparison

| Feature | Muse 2 | Muse S (Gen 2) | Muse S Athena |
|---------|--------|----------------|---------------|
| **Price** | $249.99 | $399.99 | Premium tier |
| **EEG Channels** | 4 primary (TP9, AF7, AF8, TP10) | 4 primary + 2 auxiliary | 4 primary + 4 auxiliary |
| **Sampling Rate** | 256 Hz | 256 Hz | 256 Hz |
| **Resolution** | 12-bit | 12-bit | 14-bit |
| **Sensors** | EEG, PPG, Accelerometer, Gyroscope | EEG, PPG, Accelerometer, Gyroscope, SpO2 | EEG, PPG, fNIRS, Accelerometer, Gyroscope |
| **Battery Life** | 5 hours | 10 hours | 10+ hours |
| **Design** | Rigid plastic headband | Flexible fabric strap | Flexible fabric strap |
| **Sleep Tracking** | No | Yes | Yes (advanced) |
| **Best For** | Meditation, development, neurofeedback | Sleep + meditation | Advanced research |

**Recommendation for Development:**
- **Muse 2** is the best choice for development and hacking projects due to:
  - Lower cost ($249.99)
  - Full raw EEG data access
  - Fits under VR headsets
  - Excellent library support
  - Comfortable for extended wear

### 1.2 Sensors & Data Streams

#### EEG Sensors
- **Electrode Positions:** TP9, AF7, AF8, TP10 (10-20 system)
  - TP9, TP10: Behind ears (left/right temporal-parietal)
  - AF7, AF8: Forehead (left/right anterior frontal)
  - Reference: Fpz (forehead center)
- **Sampling Rate:** 256 Hz (all models)
- **Resolution:** 12-bit (Muse 2, Muse S) / 14-bit (Athena)
- **Range:** ~0 to 1682 μV (microvolts)
- **Frequency Range:** DC to ~83 Hz (Nyquist theorem), practical range DC-50 Hz

#### Raw EEG Data Format
```
Channel   Location   Data Type
-------------------------------
TP9       Left ear   Float (μV)
AF7       Left brow  Float (μV)
AF8       Right brow Float (μV)
TP10      Right ear  Float (μV)
AUX       Optional   Float (μV) - via USB port
```

#### Processed Metrics (Built-in DSP)
Muse provides pre-calculated frequency band powers:
- **Delta (δ):** 1-4 Hz (deep sleep)
- **Theta (θ):** 4-8 Hz (meditation, drowsiness)
- **Alpha (α):** 7.5-13 Hz (relaxation, eyes closed)
- **Beta (β):** 13-30 Hz (active thinking, focus)
- **Gamma (γ):** 30-44 Hz (high-level cognition)

**Band Power Calculation:**
- Uses FFT with Hamming window
- Values range from 0-1 (relative power)
- Formula for relative band power:
  ```
  alpha_relative = 10^alpha_absolute / (Σ all_bands)
  ```

#### Additional Sensors (Muse 2 and later)
- **PPG (Photoplethysmography):**
  - Heart rate measurement from forehead
  - Blood oxygen levels (SpO2) on Muse S
  - Sampling rate: Variable
- **Accelerometer:** 3-axis motion detection (52 Hz)
- **Gyroscope:** 3-axis orientation (52 Hz)

### 1.3 Connectivity

#### Bluetooth Specifications
- **Protocol:** Bluetooth Low Energy (BLE) 4.0+
- **Service:** MUSE_SERVICE (proprietary GATT profile)
- **Transmission Latency:** Mean 40ms ± 20ms
- **Range:** ~10 meters (33 feet) line-of-sight
- **Pairing:** Standard BLE pairing, requires location services on mobile

#### Data Protocols
1. **Native Bluetooth:** Direct BLE connection
2. **OSC (Open Sound Control):** Via Mind Monitor app over UDP
3. **LSL (Lab Streaming Layer):** Via muselsl or BlueMuse
4. **WebSocket:** Can be streamed via custom bridges

#### Multiple Device Support
- **BlueMuse (Windows):** Supports multiple simultaneous Muse devices
- **muselsl (Python):** One device per instance (use multiple terminals)
- **Mind Monitor (iOS/Android):** One device per app instance
- **Synchronization:** LSL provides timestamp synchronization across devices

---

## Part 2: Open Source Libraries & SDKs

### 2.1 Python Libraries

#### A. muselsl (Lab Streaming Layer)
**GitHub:** https://github.com/alexandrebarachant/muse-lsl
**PyPI:** `pip install muselsl`

**Overview:**
The most popular Python library for Muse EEG streaming. Built on Lab Streaming Layer for robust, time-synchronized data streaming.

**Key Features:**
- Stream EEG, PPG, accelerometer, and gyroscope data
- Record to XDF format (standard for EEG research)
- Real-time visualization tools
- Multiple backend support (bleak, bluemuse, bgapi)
- Works with Muse 2016, Muse 2, and Muse S

**Installation:**
```bash
pip install muselsl
```

**Basic Usage:**
```python
from muselsl import stream, list_muses

# List available Muse devices
muses = list_muses()
print(f"Found: {muses}")

# Start streaming from first device
if muses:
    stream(muses[0]['address'])
```

**Recording Data:**
```bash
# Terminal 1: Start streaming
muselsl stream

# Terminal 2: Start recording
muselsl record --duration 60
```

**Viewing Data:**
```bash
muselsl view
```

**Example: Neurofeedback Script**
Located at `examples/neurofeedback.py` in repository:
```python
from muselsl import stream, list_muses
from pylsl import StreamInlet, resolve_byprop
import numpy as np

# Connect to Muse
inlet = StreamInlet(resolve_byprop('type', 'EEG')[0])

# Buffer for storing data
buffer = []

while True:
    # Pull sample
    sample, timestamp = inlet.pull_sample()
    buffer.append(sample)

    # Process when buffer full (e.g., 256 samples = 1 second)
    if len(buffer) >= 256:
        data = np.array(buffer)

        # Calculate band powers via FFT
        fft = np.fft.rfft(data, axis=0)
        freqs = np.fft.rfftfreq(len(data), 1/256)

        # Extract alpha power (8-13 Hz)
        alpha_idx = np.where((freqs >= 8) & (freqs <= 13))
        alpha_power = np.mean(np.abs(fft[alpha_idx]))

        print(f"Alpha Power: {alpha_power:.2f}")

        buffer = []  # Reset buffer
```

**Pros:**
- Industry standard for EEG research
- Excellent documentation
- Time synchronization across multiple devices
- Active community
- Works cross-platform

**Cons:**
- Requires understanding of LSL concepts
- Bluetooth backend can be finicky on some systems
- One device per process (use multiple terminals for multi-device)

**Maintenance Status:** ✅ Active (last updated 2024)

---

#### B. pylsl (Lab Streaming Layer Core)
**GitHub:** https://github.com/labstreaminglayer/pylsl
**PyPI:** `pip install pylsl`

**Overview:**
Core Python bindings for Lab Streaming Layer. Required by muselsl but can be used directly for receiving streams.

**Key Features:**
- Receive data from any LSL-compatible device
- Timestamp synchronization
- Network streaming (local or remote)
- Buffer management

**Installation:**
```bash
pip install pylsl
```

**Basic Usage (Receiving Data):**
```python
from pylsl import StreamInlet, resolve_stream

# Find EEG streams on network
print("Looking for EEG stream...")
streams = resolve_stream('type', 'EEG')

# Create inlet to receive data
inlet = StreamInlet(streams[0])

# Pull samples
while True:
    sample, timestamp = inlet.pull_sample()
    print(f"{timestamp}: {sample}")
```

**Advanced: Multiple Streams**
```python
from pylsl import resolve_streams, StreamInlet

# Find all streams
streams = resolve_streams()

# Create inlet for each
inlets = [StreamInlet(s) for s in streams]

# Pull from all
for inlet in inlets:
    sample, timestamp = inlet.pull_sample(timeout=0.0)
    if sample:
        print(f"{inlet.info().name()}: {sample}")
```

**Pros:**
- Core infrastructure for multi-device research
- Cross-platform and cross-language
- Robust timestamp synchronization
- Can receive from any LSL device (EEG, eye trackers, etc.)

**Cons:**
- Lower-level than muselsl
- Requires separate streaming application (like muselsl or BlueMuse)

**Maintenance Status:** ✅ Active (core infrastructure)

---

#### C. BrainFlow
**GitHub:** https://github.com/brainflow-dev/brainflow
**Website:** https://brainflow.org
**PyPI:** `pip install brainflow`

**Overview:**
Unified library for multiple EEG devices including Muse, OpenBCI, and Emotiv.

**Key Features:**
- Direct Muse 2 and Muse S support (no dongle required)
- Unified API across devices
- Built-in signal processing (filtering, denoising)
- Machine learning integration
- Cross-platform (Windows 10.0.19041.0+, MacOS 10.15+)

**Installation:**
```bash
pip install brainflow
```

**Linux Additional Setup:**
```bash
sudo apt-get install libdbus-1-dev  # Ubuntu
sudo yum install dbus-devel         # CentOS
```

**Basic Usage:**
```python
from brainflow.board_shim import BoardShim, BrainFlowInputParams, BoardIds
from brainflow.data_filter import DataFilter, FilterTypes

# Setup
params = BrainFlowInputParams()
board_id = BoardIds.MUSE_2_BOARD.value

board = BoardShim(board_id, params)
board.prepare_session()
board.start_stream()

# Get data
import time
time.sleep(10)  # Record for 10 seconds
data = board.get_board_data()
board.stop_stream()
board.release_session()

# Process
eeg_channels = BoardShim.get_eeg_channels(board_id)
for channel in eeg_channels:
    # Apply bandpass filter
    DataFilter.perform_bandpass(data[channel], 256, 3.0, 45.0, 2,
                                 FilterTypes.BUTTERWORTH.value, 0)
```

**Pros:**
- Single API for multiple devices
- Built-in signal processing
- Direct device support (no intermediate apps)
- Good for switching between devices

**Cons:**
- Newer, less community adoption than muselsl
- Documentation not as extensive
- Platform requirements (recent Windows/macOS)

**Maintenance Status:** ✅ Active (regular updates)

---

### 2.2 JavaScript/Node.js Libraries

#### A. muse-js (Browser via Web Bluetooth)
**GitHub:** https://github.com/urish/muse-js
**NPM:** `npm install muse-js`

**Overview:**
JavaScript library for connecting to Muse devices directly in the browser using Web Bluetooth API.

**Key Features:**
- No additional software required
- Works in Chrome, Edge, Opera
- Real-time streaming at 256 Hz
- Supports Muse 1, Muse 2, Muse S
- RxJS Observable streams
- PPG, accelerometer, gyroscope support

**Installation:**
```bash
npm install muse-js
# or
<script src="https://unpkg.com/muse-js"></script>
```

**Basic Example:**
```javascript
import { MuseClient } from 'muse-js';

async function connectMuse() {
  // Create client
  const client = new MuseClient();

  // Connect (will show browser pairing dialog)
  await client.connect();

  // Start streaming
  await client.start();

  // Subscribe to EEG data
  client.eegReadings.subscribe(reading => {
    console.log(reading);
    // reading.electrode: 0-3 (TP9, AF7, AF8, TP10)
    // reading.samples: array of 12 samples
    // reading.timestamp: number
  });

  // Subscribe to other sensors
  client.accelerometerData.subscribe(accel => {
    console.log('Accel:', accel.samples);
  });
}

connectMuse();
```

**Enable PPG (Muse 2/S):**
```javascript
const client = new MuseClient();
client.enablePpg = true;  // Enable before connecting
await client.connect();
await client.start();

client.ppgReadings.subscribe(ppg => {
  console.log('PPG:', ppg);
  // ppg.ppgChannel: 0-2
  // ppg.samples: array of readings
});
```

**Enable Auxiliary Electrode:**
```javascript
const client = new MuseClient();
client.enableAux = true;  // Enable before connecting
await client.connect();
```

**Real-time Visualization Example:**
```javascript
import { MuseClient } from 'muse-js';
import { chartData } from './chart-setup';  // Your chart library

const client = new MuseClient();
await client.connect();
await client.start();

client.eegReadings.subscribe(reading => {
  // Update chart for each electrode
  const electrode = reading.electrode;
  const samples = reading.samples;

  chartData[electrode].push(...samples);

  // Keep only last 256 samples (1 second)
  if (chartData[electrode].length > 256) {
    chartData[electrode].splice(0, samples.length);
  }

  updateChart();
});
```

**Pros:**
- No installation required (runs in browser)
- Great for web-based neurofeedback apps
- Instant prototyping
- Cross-platform (any device with Chrome)
- Good documentation

**Cons:**
- Requires HTTPS (or localhost)
- Web Bluetooth support limited to Chromium browsers
- Can't run headless (needs user interaction for pairing)
- No multi-device support in single page

**Maintenance Status:** ⚠️ Less active (maintained alternative: web-muse)

---

#### B. web-muse (Modern Alternative)
**GitHub:** https://github.com/itayinbarr/web-muse

**Overview:**
Modern, actively maintained alternative to muse-js. Compatible with latest Muse firmware.

**Installation:**
```bash
npm install web-muse
```

**Usage:** Similar to muse-js with improved compatibility.

**Maintenance Status:** ✅ Active (recommended for new projects)

---

#### C. MuseJS (Vanilla JavaScript)
**GitHub:** https://github.com/Respiire/MuseJS

**Overview:**
Zero-dependency vanilla JavaScript library for Muse 2/S. Stores data in circular buffers.

**Key Features:**
- No dependencies
- Circular buffer design
- EEG, PPG, and motion sensors
- Lightweight

**Basic Usage:**
```javascript
// Include script
<script src="musejs.js"></script>

// Connect and stream
const muse = new MuseDevice();
await muse.connect();
await muse.start();

// Access circular buffers
console.log(muse.eegBuffer);  // Recent EEG data
console.log(muse.ppgBuffer);  // Recent PPG data
```

**Pros:**
- Extremely lightweight
- No build process needed
- Fast prototyping

**Cons:**
- Limited documentation
- Less feature-rich than muse-js

**Maintenance Status:** ⚠️ Limited (small project)

---

#### D. muse-lsl (Node.js for LSL)
**GitHub:** https://github.com/urish/muse-lsl (Node version)
**NPM:** `npm install muse-lsl`

**Overview:**
Node.js implementation for streaming Muse data to Lab Streaming Layer.

**Use Case:** Bridge between Muse and LSL ecosystem in Node.js environment.

**Maintenance Status:** ⚠️ Less active than Python version

---

### 2.3 Platform-Specific Tools

#### A. BlueMuse (Windows)
**GitHub:** https://github.com/kowalej/BlueMuse
**Platform:** Windows 10 (Version 1703+) / Windows 11

**Overview:**
GUI application for streaming Muse data via LSL on Windows.

**Key Features:**
- Multiple simultaneous Muse devices
- EEG, PPG, accelerometer, gyroscope, telemetry
- Timestamp formats: LSL local clock or Unix Epoch
- Stream bit depth: 32-bit or 64-bit
- No coding required

**Supported Devices:**
- Muse 2016
- Muse 2
- Muse S
- Smith Lowdown Focus glasses

**Installation:**
```powershell
# Download from releases page
# Install dependencies via PowerShell script
./install.ps1
```

**Usage:**
1. Launch BlueMuse
2. Turn on Muse device
3. Click "Start Streaming"
4. Connect from any LSL client (Python, MATLAB, etc.)

**Pros:**
- Easy GUI interface
- Multi-device support
- Reliable on Windows
- No coding required

**Cons:**
- Windows only
- GUI required (can't run headless easily)

**Maintenance Status:** ✅ Active

---

#### B. Mind Monitor (iOS/Android)
**Website:** https://mind-monitor.com
**Platform:** iOS / Android (paid app, ~$10)

**Overview:**
Mobile app for Muse with extensive streaming capabilities.

**Key Features:**
- OSC streaming over UDP/WiFi
- WebSocket streaming option
- Real-time signal quality monitoring
- Works with all Muse models (2014, 2016, 2, S)
- No computer required for simple recording

**Streaming Protocols:**
- **OSC (Open Sound Control):** Port 5000 UDP
- **Target Applications:** Max/MSP, TouchDesigner, Python (python-osc), Processing

**Setup:**
1. Install Mind Monitor on phone/tablet
2. Connect Muse via Bluetooth
3. Set OSC target IP (your computer)
4. Press Stream button

**Receiving in Python:**
```python
from pythonosc import dispatcher, osc_server

def handle_eeg(unused_addr, *args):
    print(f"EEG: {args}")

dispatcher = dispatcher.Dispatcher()
dispatcher.map("/muse/eeg", handle_eeg)

server = osc_server.ThreadingOSCUDPServer(
    ("0.0.0.0", 5000), dispatcher)
server.serve_forever()
```

**Pros:**
- Mobile-first (Bluetooth stays on phone)
- OSC compatibility with creative tools
- Signal quality visualization
- Best mobile app for Muse

**Cons:**
- Paid app (~$10)
- Requires phone/tablet to stay on

**Maintenance Status:** ✅ Active

---

### 2.4 Library Comparison Matrix

| Library | Language | Platform | Raw EEG | PPG | Multi-Device | Real-time | Ease of Use | Active Dev |
|---------|----------|----------|---------|-----|--------------|-----------|-------------|------------|
| **muselsl** | Python | Cross-platform | ✅ | ✅ | Via LSL | ✅ | Medium | ✅ |
| **pylsl** | Python | Cross-platform | ✅ (receive) | ✅ | ✅ | ✅ | Medium | ✅ |
| **BrainFlow** | Python/C++/Java | Win10+/Mac10.15+ | ✅ | ✅ | ❌ | ✅ | Medium | ✅ |
| **muse-js** | JavaScript | Browser | ✅ | ✅ | ❌ | ✅ | Easy | ⚠️ |
| **web-muse** | JavaScript | Browser | ✅ | ✅ | ❌ | ✅ | Easy | ✅ |
| **BlueMuse** | GUI | Windows | ✅ | ✅ | ✅ | ✅ | Very Easy | ✅ |
| **Mind Monitor** | iOS/Android | Mobile | ✅ | ✅ | ❌ | ✅ | Easy | ✅ |

**Recommendation:**
- **Python Projects:** Use **muselsl** + **pylsl**
- **Web Projects:** Use **web-muse** (or muse-js)
- **Windows Users:** Consider **BlueMuse** for easy setup
- **Creative Coding:** Use **Mind Monitor** with OSC
- **Multi-Device Research:** Use **LSL** ecosystem (muselsl/BlueMuse)

---

## Part 3: Neurofeedback Applications

### 3.1 Common Neurofeedback Protocols

#### A. Alpha Enhancement Protocol
**Goal:** Increase relaxation, reduce anxiety

**Method:**
- Target frequency: 8-13 Hz (alpha)
- Target location: AF7, AF8 (frontal)
- Increase alpha power / decrease delta noise

**Calculation:**
```python
alpha_protocol = alpha_power / delta_power
```

**Feedback:**
- High alpha → Positive feedback (green light, pleasant sound)
- Low alpha → Neutral or negative feedback

**Use Cases:**
- Meditation training
- Anxiety reduction
- Pre-sleep relaxation

**Research Support:** Strong evidence for effectiveness in relaxation training.

---

#### B. Beta Enhancement Protocol (Focus/Attention)
**Goal:** Improve focus and sustained attention

**Method:**
- Target frequency: 13-30 Hz (beta)
- Target location: AF7, AF8 (frontal)
- Increase beta power

**Use Cases:**
- ADHD treatment
- Productivity training
- Cognitive performance

**Research Support:** Theta/beta ratio training shows promising results for ADHD.

---

#### C. Theta/Beta Ratio Protocol
**Goal:** ADHD treatment, attention training

**Method:**
```python
theta_beta_ratio = theta_power / beta_power
# Goal: Decrease ratio (increase beta, decrease theta)
```

**Feedback:**
- Low ratio → Positive feedback (focused state)
- High ratio → Negative feedback (unfocused state)

**Training Schedule:**
- 3-4 sessions per week
- 9+ weeks for significant results

**Research Support:** One of the most validated neurofeedback protocols with controlled studies showing improvement in attention, distraction inhibition, and hyperactivity.

---

#### D. Sensory-Motor Rhythm (SMR) Protocol
**Goal:** Calm focus, motor control

**Method:**
- Target frequency: 12-15 Hz (SMR)
- Target location: Near motor cortex (not ideal with Muse 4-channel setup)

**Limitation:** Muse's electrode placement is not optimal for SMR protocol (needs C3/C4 positions).

---

#### E. Theta Enhancement Protocol
**Goal:** Deep meditation, creativity

**Method:**
- Target frequency: 4-8 Hz (theta)
- Increase theta during meditation

**Feedback:**
- Example from Muse app: Birds chirping when theta state achieved

**Use Cases:**
- Deep meditation training
- Mindfulness practice
- Creative flow states

---

#### F. Alpha Asymmetry Protocol
**Goal:** Mood regulation, depression treatment

**Method:**
```python
alpha_asymmetry = ln(alpha_right) - ln(alpha_left)
# Goal: Increase left frontal activity (approach motivation)
```

**Validation:** Muse validated for Frontal Alpha Asymmetry measurements in research studies.

---

### 3.2 Real-Time Processing

#### Band Power Calculation

**Step 1: Acquire Raw EEG**
```python
from pylsl import StreamInlet, resolve_byprop
import numpy as np

inlet = StreamInlet(resolve_byprop('type', 'EEG')[0])
buffer = []

# Collect 1 second of data (256 samples at 256 Hz)
while len(buffer) < 256:
    sample, timestamp = inlet.pull_sample()
    buffer.append(sample)

eeg_data = np.array(buffer)  # Shape: (256, 4) for 4 channels
```

**Step 2: Preprocessing**
```python
from scipy import signal

# Bandpass filter (1-50 Hz)
for ch in range(4):
    eeg_data[:, ch] = signal.detrend(eeg_data[:, ch])  # Remove DC offset

# Notch filter for 60 Hz line noise (use 50 Hz for Europe)
b_notch, a_notch = signal.iirnotch(60, 30, 256)
for ch in range(4):
    eeg_data[:, ch] = signal.filtfilt(b_notch, a_notch, eeg_data[:, ch])
```

**Step 3: FFT Calculation**
```python
# Apply FFT with Hamming window
window = np.hamming(len(eeg_data))
fft_data = np.fft.rfft(eeg_data * window[:, np.newaxis], axis=0)
freqs = np.fft.rfftfreq(len(eeg_data), 1/256)
power = np.abs(fft_data) ** 2
```

**Step 4: Extract Band Powers**
```python
def get_band_power(power, freqs, band_range):
    """Extract power in frequency band."""
    idx = np.where((freqs >= band_range[0]) & (freqs <= band_range[1]))
    return np.mean(power[idx], axis=0)

# Define bands
bands = {
    'delta': (1, 4),
    'theta': (4, 8),
    'alpha': (8, 13),
    'beta': (13, 30),
    'gamma': (30, 44)
}

# Calculate for each channel
band_powers = {}
for band_name, band_range in bands.items():
    band_powers[band_name] = get_band_power(power, freqs, band_range)

print("Alpha power (4 channels):", band_powers['alpha'])
```

**Step 5: Calculate Protocol Metric**
```python
# Example: Alpha protocol (relaxation)
alpha_protocol = band_powers['alpha'] / band_powers['delta']
avg_alpha_protocol = np.mean(alpha_protocol)

print(f"Alpha Protocol Score: {avg_alpha_protocol:.2f}")

# Provide feedback
if avg_alpha_protocol > threshold:
    print("✅ Relaxed state detected!")
    # Trigger positive feedback (green screen, pleasant sound)
else:
    print("⚠️ Not relaxed")
    # Neutral or negative feedback
```

#### Computational Requirements

**Latency Breakdown:**
- Data acquisition: ~4ms (1/256 Hz)
- FFT computation: ~5-10ms
- Band power extraction: ~1ms
- **Total:** <20ms per update

**Update Frequency:**
- Real-time: 1-4 Hz (every 250-1000ms)
- Reason: Need sufficient data for FFT (min 1 second window)

**Memory:**
- Buffer size: 256 samples × 4 channels × 4 bytes = 4 KB
- Minimal memory footprint

---

### 3.3 Validation & Accuracy

#### Research Validation Studies

**Study 1: ERP Research Validation (Krigolson et al., 2017)**
- Compared Muse to Brain Products ActiChamp (research-grade)
- Successfully measured N200 and P300 ERP components
- **Conclusion:** Muse comparable to research-grade systems for ERP studies

**Study 2: Spectral Analysis Validation**
- Compared Muse to BIOSEMI Active Two (64-channel research system)
- Validated for:
  - Power Spectral Density (PSD)
  - Individual Alpha Frequencies (IAF)
  - Frontal Alpha Asymmetry (FAA)
- **Conclusion:** Accurate and reliable for spectral analysis

**Study 3: Large-Scale Testing (n=1,000)**
- Demonstrated quick and accurate ERP and EEG measurement
- Affirmed validity for measuring brain health and performance in real-world environments

**Study 4: Signal Quality Concerns**
- One study found "extremely low alignment with research-grade systems"
- Issues with certain head shapes, sizes, and hairstyles

#### Accuracy Summary

**Strengths:**
- ✅ Spectral analysis (alpha, beta, theta, delta, gamma)
- ✅ Frontal Alpha Asymmetry
- ✅ Event-Related Potentials (N200, P300)
- ✅ Meditation/relaxation states
- ✅ Attention detection

**Limitations:**
- ⚠️ Only 4 channels (limited spatial resolution)
- ⚠️ Frontal/temporal focus (not full scalp coverage)
- ⚠️ Dry electrodes (lower signal quality than wet)
- ⚠️ Sensitive to fit and hair
- ⚠️ Limited for motor cortex studies (no C3/C4)

**Comparison to Research-Grade:**
- **Signal Quality:** 70-85% of research-grade (depending on fit)
- **Cost:** ~1% of research systems ($250 vs $25,000+)
- **Portability:** Far superior
- **Ease of Use:** Much easier

**Is it suitable for serious neurofeedback?**
- **Yes for:** Meditation, relaxation, attention training, home use
- **Maybe for:** Clinical ADHD treatment (some studies support, others don't)
- **No for:** Precise spatial localization, medical diagnosis, research requiring 10-20 system

**Recommendation:** Excellent for biofeedback art projects, personal neurofeedback, and exploratory research. Not a replacement for clinical-grade systems but validated for many applications.

---

## Part 4: Integration with Existing Biofeedback System

### 4.1 Multi-Modal Biofeedback Architecture

Your current system streams HRV coherence data from Polar H10 via WebSocket. Adding Muse EEG creates a powerful multi-modal biofeedback system.

#### Current Architecture (HRV Only)
```
┌─────────────────┐
│   Polar H10     │  ECG → RR intervals
│  (Chest Strap)  │
└────────┬────────┘
         │ Bluetooth LE
         ▼
┌─────────────────┐
│  HRV Monitor    │  HeartMath coherence
│   Service       │  Python (bleak)
│  :8765          │
└────────┬────────┘
         │ WebSocket
         ▼
┌─────────────────┐
│  Coherence      │  p5.js visualization
│  Visualization  │  Boid flocking
│ (Browser)       │
└─────────────────┘
```

#### Proposed Architecture (HRV + EEG)
```
┌─────────────────┐         ┌─────────────────┐
│   Polar H10     │         │   Muse EEG      │
│  (Chest Strap)  │         │   (Headband)    │
└────────┬────────┘         └────────┬────────┘
         │ BLE                       │ BLE
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│  HRV Monitor    │         │  Muse Stream    │
│   Service       │         │   Service       │
│  (Python)       │         │  (Python/muselsl)│
│  :8765          │         │  LSL            │
└────────┬────────┘         └────────┬────────┘
         │ WebSocket                 │ WebSocket
         │                           │
         └────────────┬──────────────┘
                      ▼
            ┌─────────────────┐
            │  Unified        │
            │  Biofeedback    │
            │  Server         │
            │  :8766          │
            └────────┬────────┘
                     │ WebSocket
                     ▼
            ┌─────────────────┐
            │  Visualization  │
            │  - HRV display  │
            │  - EEG display  │
            │  - Combined     │
            └─────────────────┘
```

### 4.2 Can Muse Heart Rate Replace Polar H10?

**Short Answer:** No, use both together.

**Muse PPG vs Polar H10 ECG:**

| Feature | Polar H10 (ECG) | Muse PPG |
|---------|-----------------|----------|
| **Technology** | Electrocardiogram (chest) | Photoplethysmography (forehead) |
| **Accuracy** | Gold standard (1ms precision) | Good for avg HR, poor for HRV |
| **R-R Intervals** | Direct measurement | Estimated from pulse |
| **Sampling Rate** | 1000 Hz | Variable (~60 Hz) |
| **Motion Artifacts** | Resistant | Very sensitive |
| **HRV Accuracy** | Excellent (rMSSD ≈ECG) | Acceptable for trends, not precise |
| **Use Case** | HRV coherence, medical | General heart rate monitoring |

**Research Findings:**
- PPG correlates well with ECG for average heart rate
- PPG acceptable for rMSSD (HRV metric) when stationary
- PPG highly sensitive to motion artifacts
- Polar H10 validated as equivalent to medical ECG

**Recommendation:**
- **Keep Polar H10 for:** HeartMath coherence, precise HRV analysis
- **Use Muse PPG for:** Basic heart rate, confirming user is wearing device, pulse synchronization with EEG
- **Best Approach:** Use both simultaneously for maximum biometric data

### 4.3 Combined HRV + EEG Insights

#### Heart-Brain Coherence Correlation

**Research Findings:**
- HRV coherence (0.1 Hz resonance) increases alpha power
- High HRV coherence correlates with increased prefrontal connectivity
- Individuals in cardiac coherence show EEG synchronization between people
- HRV biofeedback training changes EEG theta and alpha power

**Key Correlations:**
```
High HRV Coherence (Polar H10) ←→ Increased Alpha Power (Muse)
Coherent Breathing (0.1 Hz)     ←→ Frontal Theta/Alpha changes
Low HRV (stress)                ←→ High Beta / Low Alpha
```

**Metrics to Track:**
1. **HRV Coherence Score** (0-100) - from Polar H10
2. **Alpha/Beta Ratio** - from Muse (relaxation vs arousal)
3. **Alpha Power** - from Muse (relaxation)
4. **Theta Power** - from Muse (deep meditation)
5. **Heart-Brain Synchrony** - correlation between HRV and alpha oscillations

#### Visualization Ideas

**1. Dual Metrics Display**
```
┌─────────────────────────────────┐
│  Heart Coherence: ████████ 78%  │  Green when high
│  Alpha Power:     ████░░░ 65%  │  Blue when high
│  Combined Score:  ██████░ 71%  │  Purple when both high
└─────────────────────────────────┘
```

**2. Synchronized Visualization**
- **Boid flocking** responds to HRV coherence (as currently implemented)
- **Color palette** shifts based on dominant EEG frequency
  - High alpha → Cool colors (blue, purple)
  - High beta → Warm colors (orange, red)
  - High theta → Green, cyan
- **Particle density** reflects alpha/beta ratio

**3. Heart-Brain Sync Indicator**
- Calculate correlation between HRV oscillations and alpha power
- Display sync meter: 0-100%
- When sync >70%, trigger special visual effect

**Example Calculation:**
```python
import numpy as np
from scipy import signal

# Get 60 seconds of data
hrv_timeseries = [...]  # From Polar H10
alpha_timeseries = [...]  # From Muse

# Resample to same rate
hrv_resampled = signal.resample(hrv_timeseries, len(alpha_timeseries))

# Calculate correlation
correlation = np.corrcoef(hrv_resampled, alpha_timeseries)[0, 1]
sync_score = (correlation + 1) / 2 * 100  # Map -1,1 to 0,100

print(f"Heart-Brain Sync: {sync_score:.1f}%")
```

### 4.4 Technical Integration

#### Approach 1: Separate Streams (Simplest)
Keep services separate, combine in browser.

**HRV Service (Existing):**
- Python service on port 8765
- Streams HRV coherence scores

**Muse Service (New):**
```python
# muse_websocket_server.py
from muselsl import stream, list_muses
from pylsl import StreamInlet, resolve_byprop
import asyncio
import websockets
import json
import numpy as np

# Start streaming to LSL (run separately)
# $ muselsl stream

# WebSocket server
async def muse_server(websocket, path):
    # Connect to LSL
    streams = resolve_byprop('type', 'EEG')
    inlet = StreamInlet(streams[0])

    buffer = []

    while True:
        # Pull EEG sample
        sample, timestamp = inlet.pull_sample(timeout=0.0)

        if sample:
            buffer.append(sample)

            # Process every 256 samples (1 second)
            if len(buffer) >= 256:
                # Calculate band powers
                band_powers = calculate_band_powers(np.array(buffer))

                # Send to client
                message = {
                    'type': 'eeg_update',
                    'timestamp': timestamp,
                    'band_powers': band_powers,
                    'alpha': float(np.mean(band_powers['alpha'])),
                    'beta': float(np.mean(band_powers['beta'])),
                    'theta': float(np.mean(band_powers['theta'])),
                    'alpha_beta_ratio': float(
                        np.mean(band_powers['alpha']) /
                        np.mean(band_powers['beta'])
                    )
                }

                await websocket.send(json.dumps(message))

                buffer = buffer[-64:]  # Keep 64 sample overlap

        await asyncio.sleep(0.001)  # Prevent CPU spike

def calculate_band_powers(data):
    # FFT processing
    fft = np.fft.rfft(data * np.hamming(len(data))[:, None], axis=0)
    freqs = np.fft.rfftfreq(len(data), 1/256)
    power = np.abs(fft) ** 2

    bands = {
        'delta': (1, 4),
        'theta': (4, 8),
        'alpha': (8, 13),
        'beta': (13, 30),
        'gamma': (30, 44)
    }

    result = {}
    for name, (low, high) in bands.items():
        idx = np.where((freqs >= low) & (freqs <= high))
        result[name] = np.mean(power[idx], axis=0)

    return result

# Start server
start_server = websockets.serve(muse_server, "0.0.0.0", 8766)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
```

**Browser Client:**
```javascript
// Connect to both services
const polarWs = new WebSocket('ws://localhost:8765');
const museWs = new WebSocket('ws://localhost:8766');

let hrvCoherence = 0;
let alphaPower = 0;
let alphaBetaRatio = 1;

polarWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'coherence_update') {
    hrvCoherence = data.data.coherence;
    updateVisualization();
  }
};

museWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'eeg_update') {
    alphaPower = data.alpha;
    alphaBetaRatio = data.alpha_beta_ratio;
    updateVisualization();
  }
};

function updateVisualization() {
  // Map HRV to attraction force (existing code)
  params.coherenceLevel = (hrvCoherence / 50) - 1.0;

  // Map alpha/beta ratio to color
  const hue = map(alphaBetaRatio, 0.5, 2.0, 0, 240);  // Red to blue
  params.colorHue = hue;

  // Map alpha power to particle brightness
  const brightness = map(alphaPower, 0, 100, 50, 100);
  params.brightness = brightness;
}
```

---

#### Approach 2: Unified Server (More Complex)
Single Python service handling both devices.

**Pros:**
- Single WebSocket connection
- Synchronized timestamps
- Easier cross-correlation calculations

**Cons:**
- More complex service
- Harder to debug

**Architecture:**
```python
# unified_biofeedback_server.py
import asyncio
import websockets

class BiofeedbackServer:
    def __init__(self):
        self.polar_client = PolarH10Client()
        self.muse_client = MuseLSLClient()

        self.hrv_coherence = 0
        self.eeg_bands = {}

    async def run(self):
        # Start both clients
        await self.polar_client.connect()
        await self.muse_client.connect()

        # WebSocket server
        async with websockets.serve(self.handle_client, "0.0.0.0", 8766):
            await asyncio.Future()  # Run forever

    async def handle_client(self, websocket, path):
        while True:
            # Combine data
            message = {
                'type': 'biofeedback_update',
                'hrv': {
                    'coherence': self.hrv_coherence,
                    'heart_rate': self.polar_client.heart_rate
                },
                'eeg': {
                    'alpha': self.eeg_bands.get('alpha', 0),
                    'beta': self.eeg_bands.get('beta', 0),
                    'theta': self.eeg_bands.get('theta', 0),
                    'alpha_beta_ratio': self.calculate_ratio()
                },
                'combined': {
                    'heart_brain_sync': self.calculate_sync()
                }
            }

            await websocket.send(json.dumps(message))
            await asyncio.sleep(1.0)  # Update rate
```

---

### 4.5 Data Synchronization

#### Timestamp Alignment

**Challenge:** Polar H10 and Muse have different sampling rates and start times.

**Solution: LSL Timestamps**
- Both devices can stream to LSL
- LSL provides unified clock
- All samples get LSL timestamps

**Implementation:**
```python
# Use LSL for both devices
from pylsl import StreamInlet, resolve_byprop

# Find streams
eeg_stream = resolve_byprop('type', 'EEG')[0]
hrv_stream = resolve_byprop('type', 'ECG')[0]  # or custom type

eeg_inlet = StreamInlet(eeg_stream)
hrv_inlet = StreamInlet(hrv_stream)

# Samples have synchronized timestamps
eeg_sample, eeg_timestamp = eeg_inlet.pull_sample()
hrv_sample, hrv_timestamp = hrv_inlet.pull_sample()

# Timestamps are in same clock domain
time_diff = abs(eeg_timestamp - hrv_timestamp)
```

#### Data Alignment for Cross-Correlation

```python
import numpy as np
from scipy import signal

def align_signals(hrv_data, hrv_timestamps,
                   eeg_data, eeg_timestamps):
    """Align HRV and EEG signals for correlation analysis."""

    # Find common time range
    start_time = max(hrv_timestamps[0], eeg_timestamps[0])
    end_time = min(hrv_timestamps[-1], eeg_timestamps[-1])

    # Trim to common range
    hrv_mask = (hrv_timestamps >= start_time) & (hrv_timestamps <= end_time)
    eeg_mask = (eeg_timestamps >= start_time) & (eeg_timestamps <= end_time)

    hrv_trimmed = hrv_data[hrv_mask]
    eeg_trimmed = eeg_data[eeg_mask]

    # Resample to common rate (e.g., 4 Hz)
    target_rate = 4
    duration = end_time - start_time
    num_samples = int(duration * target_rate)

    hrv_resampled = signal.resample(hrv_trimmed, num_samples)
    eeg_resampled = signal.resample(eeg_trimmed, num_samples)

    return hrv_resampled, eeg_resampled
```

---

## Part 5: Practical Implementation

### 5.1 Getting Started

#### Hardware Acquisition

**Which Muse Model to Buy?**

**Recommended: Muse 2 ($249.99)**
- Best balance of features and price
- Full raw EEG access
- PPG, accelerometer, gyroscope
- 5-hour battery life sufficient for development
- Comfortable for extended sessions
- Excellent library support

**Where to Buy:**
- Official Muse website: choosemuse.com
- Amazon (beware of fakes - buy from official seller)
- Best Buy (US)

**Budget Alternative:**
- Used Muse 2016 (~$100-150 on eBay)
- Still works with all libraries
- No PPG sensor

**Not Recommended for Dev:**
- Muse S Gen 2 ($399) - Overkill for development, more expensive
- Muse S Athena - Expensive, minimal dev advantages

**What Else You Need:**
- Computer with Bluetooth LE (built-in on most modern laptops)
- No additional hardware required!

---

### 5.2 Setup and Calibration

#### Initial Setup

**Step 1: Unboxing and Charging**
```
1. Charge Muse via micro-USB (Muse 2) or USB-C (Muse S)
2. Full charge takes ~2 hours
3. LED indicators:
   - Flashing: Charging
   - Solid: Fully charged
   - Blinking rapidly: Low battery
```

**Step 2: Physical Fit**
```
1. Position headband:
   - Center reference sensor on forehead (between eyebrows)
   - Ear sensors snug behind ears (where glasses sit)

2. Adjust fit:
   - Muse 2: Squeeze or stretch plastic band
   - Muse S: Adjust fabric strap (like sleep mask)

3. Check contact:
   - Should feel snug but not tight
   - No gap between sensor and skin
   - Hair should be moved aside
```

**Step 3: Software Installation (Python)**
```bash
# Install muselsl
pip install muselsl

# Test connection
muselsl list
# Should show: Available Muse devices: Muse-XXXX

# Start streaming (LED will turn solid when connected)
muselsl stream --address XX:XX:XX:XX:XX:XX
```

**Step 4: Software Installation (JavaScript)**
```html
<!-- Create test.html -->
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/muse-js"></script>
</head>
<body>
  <button onclick="connect()">Connect Muse</button>
  <div id="status"></div>

  <script>
    async function connect() {
      const client = new muse.MuseClient();
      await client.connect();
      await client.start();

      document.getElementById('status').innerText = 'Connected!';

      client.eegReadings.subscribe(reading => {
        console.log('EEG:', reading);
      });
    }
  </script>
</body>
</html>
```

---

#### Signal Quality Verification

**Using Mind Monitor App (Recommended for Setup):**
1. Install Mind Monitor on iOS/Android ($10)
2. Connect Muse
3. View signal quality for each electrode (horseshoe display)
   - ⬤ Solid = Good connection
   - ○ Outline = Poor connection
   - Empty = No connection

**Using muselsl:**
```bash
# Start streaming
muselsl stream

# In another terminal, view live signals
muselsl view
```

**Good Signal Indicators:**
- Clean sine waves (not spiky)
- Minimal 60Hz noise (smooth, not fuzzy)
- Blink artifacts visible (proves it's reading brain, not noise)
- All 4 channels similar amplitude

**Poor Signal Indicators:**
- Flat lines (no connection)
- Extreme spikes (artifacts)
- 60Hz hum (line noise)
- One channel much different than others

---

#### Troubleshooting Connection

**Issue: Can't find Muse device**

**Solutions:**
```bash
# 1. Check Bluetooth is on
# 2. Turn Muse on (press button, LEDs flash)
# 3. Disconnect from other devices (Muse app, phone)
# 4. Move closer to computer (<3 feet)

# Scan for BLE devices (Linux)
sudo hcitool lescan

# Check if Muse appears (will show "Muse-XXXX")
```

**Issue: Connected but poor signal**

**Solutions:**
```
1. Clean forehead:
   - Wipe with damp cloth
   - Remove makeup, oils

2. Moisten ear sensors:
   - Dab with water
   - Or lick finger and wipe sensors (really!)

3. Adjust position:
   - Move headband up/down slightly
   - Press ear sensors firmly against head
   - Push hair out of the way

4. Room conditions:
   - Turn off fluorescent lights (EM interference)
   - Move away from power adapters
   - Avoid WiFi routers
```

**Issue: Connection drops frequently**

**Solutions:**
```
1. Update Bluetooth drivers
2. Disable WiFi temporarily (2.4GHz can interfere)
3. Move laptop closer to Muse
4. Check battery level (charge if low)
5. Restart Bluetooth service
```

---

### 5.3 Code Examples

#### Example 1: Basic Connection and Streaming (Python)

```python
#!/usr/bin/env python3
"""
Basic Muse EEG streaming example using muselsl
"""
from muselsl import stream, list_muses
from pylsl import StreamInlet, resolve_byprop
import time

def main():
    # List available Muse devices
    print("Scanning for Muse devices...")
    muses = list_muses()

    if not muses:
        print("No Muse devices found. Make sure device is on.")
        return

    print(f"Found: {muses[0]['name']} at {muses[0]['address']}")

    # Start streaming in background thread
    print("Connecting and streaming...")
    stream(muses[0]['address'], backend='auto', ppg_enabled=True)

    # Wait for stream to start
    time.sleep(2)

    # Connect to the stream
    print("Connecting to LSL stream...")
    streams = resolve_byprop('type', 'EEG', timeout=5)

    if not streams:
        print("Could not find EEG stream")
        return

    inlet = StreamInlet(streams[0])
    print("Connected! Streaming EEG data...\n")

    # Pull samples
    try:
        for i in range(100):  # Pull 100 samples
            sample, timestamp = inlet.pull_sample()
            # sample = [TP9, AF7, AF8, TP10] in microvolts
            print(f"{i:3d} | {timestamp:.3f} | "
                  f"TP9: {sample[0]:6.1f} | AF7: {sample[1]:6.1f} | "
                  f"AF8: {sample[2]:6.1f} | TP10: {sample[3]:6.1f}")

    except KeyboardInterrupt:
        print("\nStopped by user")

if __name__ == '__main__':
    main()
```

**Run:**
```bash
python muse_basic.py
```

**Expected Output:**
```
Scanning for Muse devices...
Found: Muse-ABCD at XX:XX:XX:XX:XX:XX
Connecting and streaming...
Connecting to LSL stream...
Connected! Streaming EEG data...

  0 | 1234.567 | TP9:  456.2 | AF7:  512.8 | AF8:  498.3 | TP10:  445.1
  1 | 1234.571 | TP9:  458.1 | AF7:  515.2 | AF8:  501.7 | TP10:  447.8
...
```

---

#### Example 2: Real-Time Band Power Calculation

```python
#!/usr/bin/env python3
"""
Real-time EEG band power calculation
"""
from pylsl import StreamInlet, resolve_byprop
import numpy as np
from scipy import signal
import time

class EEGProcessor:
    def __init__(self, sample_rate=256, window_size=1.0):
        self.sample_rate = sample_rate
        self.window_samples = int(sample_rate * window_size)
        self.buffer = []

        # Frequency bands
        self.bands = {
            'delta': (1, 4),
            'theta': (4, 8),
            'alpha': (8, 13),
            'beta': (13, 30),
            'gamma': (30, 44)
        }

    def add_sample(self, sample):
        """Add sample to buffer."""
        self.buffer.append(sample)

        # Keep only window_samples
        if len(self.buffer) > self.window_samples:
            self.buffer.pop(0)

    def calculate_band_powers(self):
        """Calculate power in each frequency band."""
        if len(self.buffer) < self.window_samples:
            return None  # Not enough data yet

        # Convert to numpy array
        data = np.array(self.buffer)  # Shape: (samples, channels)

        # Apply Hamming window
        window = np.hamming(len(data))
        windowed = data * window[:, np.newaxis]

        # FFT
        fft = np.fft.rfft(windowed, axis=0)
        freqs = np.fft.rfftfreq(len(data), 1/self.sample_rate)
        power = np.abs(fft) ** 2

        # Extract band powers
        results = {}
        for band_name, (low, high) in self.bands.items():
            idx = np.where((freqs >= low) & (freqs <= high))
            band_power = np.mean(power[idx], axis=0)  # Average across frequencies
            results[band_name] = band_power  # Array of 4 channels

        return results

def main():
    # Connect to EEG stream
    print("Looking for EEG stream...")
    streams = resolve_byprop('type', 'EEG')
    inlet = StreamInlet(streams[0])
    print("Connected!\n")

    # Create processor
    processor = EEGProcessor()

    print("Calculating band powers (updates every second)...\n")
    print("Channel order: TP9, AF7, AF8, TP10\n")

    last_update = time.time()

    while True:
        # Pull sample
        sample, timestamp = inlet.pull_sample()
        processor.add_sample(sample)

        # Calculate every second
        if time.time() - last_update >= 1.0:
            band_powers = processor.calculate_band_powers()

            if band_powers:
                # Average across all channels for simplicity
                print(f"Timestamp: {timestamp:.2f}")
                for band_name, powers in band_powers.items():
                    avg_power = np.mean(powers)
                    print(f"  {band_name:6s}: {avg_power:8.1f} μV²")

                # Calculate alpha/beta ratio (relaxation indicator)
                alpha_avg = np.mean(band_powers['alpha'])
                beta_avg = np.mean(band_powers['beta'])
                ratio = alpha_avg / beta_avg if beta_avg > 0 else 0

                print(f"\n  Alpha/Beta Ratio: {ratio:.2f}")
                if ratio > 1.5:
                    print("  → Relaxed state ✓")
                elif ratio < 0.8:
                    print("  → Active/focused state")
                else:
                    print("  → Neutral state")

                print("-" * 40 + "\n")

            last_update = time.time()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped by user")
```

**Run:**
```bash
# Terminal 1: Start streaming
muselsl stream

# Terminal 2: Run processor
python muse_bandpower.py
```

**Expected Output:**
```
Looking for EEG stream...
Connected!

Calculating band powers (updates every second)...

Timestamp: 1234.56
  delta :   1245.3 μV²
  theta :    856.7 μV²
  alpha :   1523.8 μV²
  beta  :    945.2 μV²
  gamma :    234.1 μV²

  Alpha/Beta Ratio: 1.61
  → Relaxed state ✓
----------------------------------------
```

---

#### Example 3: WebSocket Streaming Server

```python
#!/usr/bin/env python3
"""
WebSocket server for streaming Muse EEG to browser
"""
import asyncio
import websockets
import json
from pylsl import StreamInlet, resolve_byprop
import numpy as np
from scipy import signal as sp_signal

class MuseWebSocketServer:
    def __init__(self, host='0.0.0.0', port=8766):
        self.host = host
        self.port = port
        self.inlet = None
        self.processor = None
        self.clients = set()

    async def connect_muse(self):
        """Connect to Muse LSL stream."""
        print("Connecting to Muse EEG stream...")
        streams = resolve_byprop('type', 'EEG', timeout=10)

        if not streams:
            raise RuntimeError("No EEG stream found. Start muselsl stream first.")

        self.inlet = StreamInlet(streams[0])
        self.processor = EEGProcessor()
        print(f"✓ Connected to {streams[0].name()}")

    async def handle_client(self, websocket, path):
        """Handle WebSocket client connection."""
        self.clients.add(websocket)
        print(f"Client connected: {websocket.remote_address}")

        try:
            # Send initial status
            await websocket.send(json.dumps({
                'type': 'status',
                'connected': True
            }))

            # Keep connection alive
            while True:
                await asyncio.sleep(1)

        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.clients.remove(websocket)
            print(f"Client disconnected: {websocket.remote_address}")

    async def broadcast_data(self):
        """Pull EEG data and broadcast to all clients."""
        last_band_update = asyncio.get_event_loop().time()

        while True:
            # Pull sample (non-blocking)
            sample, timestamp = self.inlet.pull_sample(timeout=0.0)

            if sample:
                # Add to processor
                self.processor.add_sample(sample)

                # Send raw EEG every 10 samples (~40ms)
                if np.random.random() < 0.04:  # 4% chance per sample
                    await self.broadcast({
                        'type': 'raw_eeg',
                        'timestamp': timestamp,
                        'channels': {
                            'TP9': sample[0],
                            'AF7': sample[1],
                            'AF8': sample[2],
                            'TP10': sample[3]
                        }
                    })

                # Calculate band powers every 1 second
                now = asyncio.get_event_loop().time()
                if now - last_band_update >= 1.0:
                    band_powers = self.processor.calculate_band_powers()

                    if band_powers:
                        # Average across channels
                        avg_powers = {
                            band: float(np.mean(powers))
                            for band, powers in band_powers.items()
                        }

                        # Calculate metrics
                        alpha_beta_ratio = (
                            avg_powers['alpha'] / avg_powers['beta']
                            if avg_powers['beta'] > 0 else 0
                        )

                        await self.broadcast({
                            'type': 'band_powers',
                            'timestamp': timestamp,
                            'powers': avg_powers,
                            'metrics': {
                                'alpha_beta_ratio': alpha_beta_ratio,
                                'relaxation_score': min(alpha_beta_ratio / 2.0, 1.0) * 100
                            }
                        })

                    last_band_update = now

            await asyncio.sleep(0.001)  # Small delay to prevent CPU spike

    async def broadcast(self, message):
        """Send message to all connected clients."""
        if self.clients:
            message_json = json.dumps(message)
            await asyncio.gather(
                *[client.send(message_json) for client in self.clients],
                return_exceptions=True
            )

    async def run(self):
        """Start server."""
        await self.connect_muse()

        # Start WebSocket server
        async with websockets.serve(self.handle_client, self.host, self.port):
            print(f"\n✓ WebSocket server running on ws://{self.host}:{self.port}")
            print("Waiting for clients...\n")

            # Start broadcasting
            await self.broadcast_data()

# Include EEGProcessor class from Example 2
class EEGProcessor:
    # ... (copy from Example 2)
    pass

if __name__ == '__main__':
    server = MuseWebSocketServer(host='0.0.0.0', port=8766)

    try:
        asyncio.run(server.run())
    except KeyboardInterrupt:
        print("\nShutting down...")
```

**Browser Client (HTML + JavaScript):**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Muse EEG Monitor</title>
  <style>
    body { font-family: monospace; background: #000; color: #0f0; padding: 20px; }
    .status { color: #0ff; }
    .metric { margin: 10px 0; }
    .bar { display: inline-block; height: 20px; background: #0f0; }
  </style>
</head>
<body>
  <h1>Muse EEG Live Monitor</h1>
  <div class="status" id="status">Connecting...</div>

  <h2>Band Powers</h2>
  <div id="bands"></div>

  <h2>Metrics</h2>
  <div id="metrics"></div>

  <script>
    const ws = new WebSocket('ws://localhost:8766');

    ws.onopen = () => {
      document.getElementById('status').textContent = '✓ Connected';
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'band_powers') {
        // Display band powers
        let html = '';
        for (const [band, power] of Object.entries(data.powers)) {
          const width = Math.min(power / 20, 300);  // Scale for display
          html += `
            <div class="metric">
              ${band.padEnd(6)}:
              <div class="bar" style="width: ${width}px;"></div>
              ${power.toFixed(1)} μV²
            </div>
          `;
        }
        document.getElementById('bands').innerHTML = html;

        // Display metrics
        const ratio = data.metrics.alpha_beta_ratio;
        const relaxation = data.metrics.relaxation_score;

        document.getElementById('metrics').innerHTML = `
          <div class="metric">Alpha/Beta Ratio: ${ratio.toFixed(2)}</div>
          <div class="metric">Relaxation Score: ${relaxation.toFixed(1)}%</div>
          <div class="metric">State: ${
            ratio > 1.5 ? '😌 Relaxed' :
            ratio < 0.8 ? '🎯 Focused' : '😐 Neutral'
          }</div>
        `;
      }
    };

    ws.onerror = (error) => {
      document.getElementById('status').textContent = '❌ Connection Error';
    };

    ws.onclose = () => {
      document.getElementById('status').textContent = '❌ Disconnected';
    };
  </script>
</body>
</html>
```

**Run:**
```bash
# Terminal 1: Start Muse streaming
muselsl stream

# Terminal 2: Start WebSocket server
python muse_websocket_server.py

# Browser: Open HTML file
open muse_monitor.html
```

---

#### Example 4: Integration with Existing Polar H10 System

```javascript
// coherence-app-combined.js
// Extends existing coherence-app-polar.js with Muse EEG

import { PolarH10Client } from './integrations/polar-h10-client.js';

class CombinedBiofeedbackApp {
  constructor() {
    // Existing Polar H10 client
    this.polarClient = new PolarH10Client({
      wsUrl: 'ws://localhost:8765',
      onCoherenceUpdate: (data) => {
        this.onHRVUpdate(data);
      }
    });

    // New Muse EEG client
    this.museWs = null;
    this.connectMuse();

    // Biometric state
    this.hrvCoherence = 0;
    this.alphaPower = 0;
    this.alphaBetaRatio = 1.0;
    this.combinedScore = 0;
  }

  connectMuse() {
    this.museWs = new WebSocket('ws://localhost:8766');

    this.museWs.onopen = () => {
      console.log('[Muse] Connected');
      this.showStatus('Muse EEG', 'connected');
    };

    this.museWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'band_powers') {
        this.onEEGUpdate(data);
      }
    };

    this.museWs.onerror = () => {
      console.error('[Muse] Connection error');
      this.showStatus('Muse EEG', 'error');
    };

    this.museWs.onclose = () => {
      console.log('[Muse] Disconnected, reconnecting...');
      setTimeout(() => this.connectMuse(), 3000);
    };
  }

  onHRVUpdate(data) {
    this.hrvCoherence = data.score;  // 0-100
    this.updateCombinedScore();
    this.updateVisualization();
  }

  onEEGUpdate(data) {
    this.alphaPower = data.powers.alpha;
    this.alphaBetaRatio = data.metrics.alpha_beta_ratio;
    this.updateCombinedScore();
    this.updateVisualization();
  }

  updateCombinedScore() {
    // Combine HRV and EEG into single score

    // Normalize HRV coherence (0-100)
    const hrvNorm = this.hrvCoherence / 100;

    // Normalize alpha/beta ratio (0.5-2.0 → 0-1)
    const abRatioNorm = Math.max(0, Math.min(1,
      (this.alphaBetaRatio - 0.5) / 1.5
    ));

    // Combined score (weighted average)
    this.combinedScore = (hrvNorm * 0.6 + abRatioNorm * 0.4) * 100;

    console.log(`Combined: ${this.combinedScore.toFixed(1)} ` +
                `(HRV: ${this.hrvCoherence.toFixed(0)}, ` +
                `A/B: ${this.alphaBetaRatio.toFixed(2)})`);
  }

  updateVisualization() {
    // Map combined score to coherence level (-1 to +1)
    params.coherenceLevel = (this.combinedScore / 50) - 1.0;

    // Map alpha/beta ratio to color hue
    // High ratio (relaxed) → Blue/purple (240°)
    // Low ratio (focused) → Red/orange (0°)
    const hue = this.mapRange(this.alphaBetaRatio, 0.5, 2.0, 0, 240);
    params.colorHue = hue;

    // Map alpha power to brightness
    const brightness = this.mapRange(
      Math.log(this.alphaPower + 1),
      Math.log(100),
      Math.log(2000),
      50,
      100
    );
    params.brightness = brightness;
  }

  mapRange(value, inMin, inMax, outMin, outMax) {
    const clamped = Math.max(inMin, Math.min(inMax, value));
    return (clamped - inMin) / (inMax - inMin) * (outMax - outMin) + outMin;
  }

  showStatus(device, status) {
    // Update UI status indicators
    const statusEl = document.getElementById(`status-${device}`);
    if (statusEl) {
      statusEl.className = status;
      statusEl.textContent = status === 'connected' ? '● ' : '○ ';
    }
  }
}

// Initialize
const app = new CombinedBiofeedbackApp();
```

---

### 5.4 Best Practices

#### Electrode Placement and Contact

**Optimal Fit:**
1. **Forehead Sensor (Reference):**
   - Center between eyebrows, ~1 inch above
   - Flat against skin (no gap)
   - Avoid wrinkles if possible

2. **Ear Sensors:**
   - Behind ears where glasses rest
   - Snug against mastoid bone
   - May need to adjust up/down slightly

**Improving Contact:**
- **Moisture is key:** Sensors work better with slight dampness
  - Dab water on ear sensors before wearing
  - Clean forehead removes oils that block conductivity
- **Hair management:**
  - Push hair away from sensors
  - Short hair or pulled-back styles work best
  - Very thick/curly hair can be challenging
- **Pressure:**
  - Headband should be snug, not loose
  - But not so tight it's uncomfortable
  - Test by shaking head gently - shouldn't move

**Checking Quality:**
- Use Mind Monitor app's signal quality display
- All 4 channels should show solid indicators
- If one channel poor, adjust that side

---

#### Artifact Reduction

**Common Artifacts:**

1. **Eye Blinks**
   - Appear as large spikes in frontal channels (AF7, AF8)
   - Cannot be avoided, but can be detected and removed in processing

2. **Eye Movements**
   - Lower frequency drifts
   - Especially saccades (quick movements)
   - Mitigation: Keep eyes closed or fixate on point

3. **Jaw Clenching / Chewing**
   - High frequency noise in temporal channels (TP9, TP10)
   - Mitigation: Relax jaw, no gum or food during recording

4. **Head Movement**
   - Large artifacts across all channels
   - Mitigation: Stay still, comfortable position

5. **60Hz Line Noise**
   - Constant 60Hz (50Hz in Europe) hum
   - Appears as "fuzzy" signal
   - Mitigation:
     - Move away from power adapters
     - Turn off fluorescent lights
     - Use notch filter in processing

**Processing Artifacts:**

```python
from scipy import signal

def remove_artifacts(eeg_data, sample_rate=256):
    """Remove common artifacts from EEG data."""

    # 1. Detrend (remove DC offset)
    eeg_clean = signal.detrend(eeg_data, axis=0)

    # 2. Bandpass filter (1-50 Hz keeps relevant EEG)
    sos = signal.butter(4, [1, 50], btype='bandpass',
                        fs=sample_rate, output='sos')
    eeg_clean = signal.sosfiltfilt(sos, eeg_clean, axis=0)

    # 3. Notch filter (60 Hz line noise)
    b_notch, a_notch = signal.iirnotch(60, 30, sample_rate)
    eeg_clean = signal.filtfilt(b_notch, a_notch, eeg_clean, axis=0)

    # 4. Remove extreme outliers (cap at 3 standard deviations)
    std = np.std(eeg_clean, axis=0)
    mean = np.mean(eeg_clean, axis=0)
    eeg_clean = np.clip(eeg_clean, mean - 3*std, mean + 3*std)

    return eeg_clean
```

**Automated Rejection:**
```python
def detect_artifacts(eeg_data, threshold_uv=100):
    """Detect epochs with artifacts (simple threshold method)."""

    # Calculate peak-to-peak amplitude per channel
    ptp = np.ptp(eeg_data, axis=0)

    # Epochs exceeding threshold are artifactual
    is_artifact = np.any(ptp > threshold_uv)

    return is_artifact

# Usage
if detect_artifacts(epoch_data):
    print("Artifact detected, skipping epoch")
    continue
```

---

#### User Comfort for Extended Sessions

**Session Duration:**
- **Short sessions:** 5-15 minutes ideal for neurofeedback training
- **Medium sessions:** 30-45 minutes for meditation/focus work
- **Extended sessions:** 60+ minutes possible with Muse S (more comfortable)

**Comfort Tips:**

1. **Take Breaks:**
   - Every 20-30 minutes, remove headband for 1-2 minutes
   - Prevents pressure points
   - Allows skin to breathe

2. **Positioning:**
   - Sit comfortably with back support
   - Head can rest against headrest (doesn't affect signal much)
   - Avoid hunched forward position

3. **Temperature:**
   - Headband can get warm after 30+ minutes
   - Keep room cool
   - Wipe forehead between sessions

4. **Skin Sensitivity:**
   - Some users develop redness after extended use
   - Take longer breaks if this occurs
   - Clean sensors and skin regularly

**For Sleep (Muse S):**
- Use overnight with fabric band (more comfortable than Muse 2)
- Side sleepers: May need to adjust or it can slip
- Back sleepers: Works very well

---

#### Battery Life Considerations

**Muse 2 Battery:**
- Rated: 5 hours continuous use
- Real-world: 4-5 hours depending on conditions
- Charging time: 2 hours (micro-USB)

**Muse S Battery:**
- Rated: 10 hours continuous use
- Real-world: 8-10 hours
- Charging time: 2-3 hours (USB-C)

**Power-Saving Tips:**
1. Disable PPG if not needed (saves ~15% battery)
2. Keep firmware updated
3. Store at room temperature
4. Don't let battery fully drain regularly

**Charging During Use:**
- Not recommended (can cause interference)
- BLE may disconnect when charging starts
- Plan sessions around battery life

**Battery Degradation:**
- After 1-2 years, capacity may decrease
- Some older Muse devices have battery replacement issues
- Keep this in mind for long-term projects

---

## Part 6: Comparison & Use Cases

### 6.1 Muse vs Other Consumer EEG Devices

| Device | Channels | Sampling Rate | Price | Raw Data | Dev-Friendly | Best For |
|--------|----------|---------------|-------|----------|--------------|----------|
| **Muse 2** | 4 EEG + sensors | 256 Hz | $250 | ✅ Yes | ✅✅✅ | Meditation, neurofeedback, prototyping |
| **Muse S** | 4+2 EEG + sensors | 256 Hz | $400 | ✅ Yes | ✅✅ | Sleep tracking, meditation |
| **OpenBCI Cyton** | 8 EEG | 250 Hz | $500-700 | ✅ Yes | ✅✅✅ | Research, custom EEG projects |
| **OpenBCI Ganglion** | 4 EEG | 200 Hz | $200 | ✅ Yes | ✅✅ | Budget research |
| **Emotiv EPOC X** | 14 EEG | 256 Hz | $850 | ⚠️ Paid | ✅ | BCI research, games |
| **Emotiv Insight** | 5 EEG | 128 Hz | $500 | ⚠️ Paid | ✅ | Consumer BCI |
| **NeuroSky MindWave** | 1 EEG | 512 Hz | $100 | ✅ Yes | ✅✅ | Simple projects, education |

**Detailed Comparison:**

#### Muse (2/S)
**Pros:**
- Best price-to-performance for meditation/neurofeedback
- Excellent community and library support
- Easy to use (consumer device)
- Validated for research use
- PPG sensor included (heart rate)
- Comfortable for extended wear

**Cons:**
- Only 4 channels (frontal + temporal)
- No motor cortex coverage
- Dry electrodes (lower quality than wet)

**Best For:**
- Meditation training
- Relaxation/stress reduction
- Attention training (theta/beta protocol)
- Frontal alpha asymmetry studies
- Multi-modal biofeedback (EEG + PPG)
- Art installations

---

#### OpenBCI
**Pros:**
- More channels (8 or 16 with daisy chain)
- Highly customizable electrode placement
- Medical-grade quality
- Open source hardware and software
- Active developer community
- Best for research

**Cons:**
- More expensive ($500-1000+)
- Requires gel electrodes (messy)
- Setup more complex
- Not user-friendly for consumers
- Bulkier than Muse

**Best For:**
- Research projects
- Motor cortex studies (BCI for movement)
- Custom electrode placement
- Projects needing >4 channels
- Medical applications

---

#### Emotiv
**Pros:**
- More channels than Muse (5-14)
- Good spatial resolution
- Professional software suite
- Machine learning tools included

**Cons:**
- Expensive ($500-850)
- Raw data requires subscription ($99/year)
- More noise-susceptible than Muse
- Hardware harder to set up than Muse
- Saline electrode solution needed

**Best For:**
- BCI research
- Game control
- Professional applications with budget

---

#### NeuroSky MindWave
**Pros:**
- Cheapest option ($100)
- Very simple (1 channel)
- Good for education
- Long battery life

**Cons:**
- Only 1 channel (forehead)
- Very limited for neurofeedback
- Not validated for research
- Less community support

**Best For:**
- Educational projects
- Simple attention detection
- Budget prototyping
- Kids' projects

---

**Market Share in Research:**
- Emotiv: 67.69% of studies
- NeuroSky: 24.56%
- OpenBCI, Muse, others: 7.75%

**Developer Recommendation:**
1. **Meditation/Neurofeedback:** Muse 2 (best value)
2. **Research/Custom EEG:** OpenBCI Cyton (most flexible)
3. **Budget Research:** OpenBCI Ganglion or Muse 2
4. **Education:** NeuroSky MindWave
5. **Professional BCI:** Emotiv EPOC X (if budget allows)

**For this project (combined with Polar H10):** **Muse 2** is the clear winner.
- Perfect price point ($250)
- Validated for neurofeedback protocols
- Excellent library support
- Includes PPG for heart rate correlation
- Easy integration with existing WebSocket architecture

---

### 6.2 Project Ideas

#### 1. Combined HRV + EEG Meditation Trainer
**Description:** Real-time feedback system combining heart coherence and brainwave patterns.

**Features:**
- Visual feedback based on both HRV and alpha power
- Audio tones shift based on theta/alpha ratio
- Progress tracking over sessions
- Coherent breathing guide

**Tech Stack:**
- Polar H10 → HRV Monitor Service (existing)
- Muse 2 → muselsl → Band power calculation
- Unified WebSocket server
- Browser visualization (p5.js)

**Visualization Concept:**
- Base flocking behavior controlled by HRV coherence (existing)
- Color palette shifts with EEG bands:
  - High alpha → Cool blues/purples
  - High beta → Warm oranges/reds
  - High theta → Greens
- Particle trails appear when both HRV and EEG in target range

**Metrics:**
- Heart Coherence Score (0-100)
- Alpha Power
- Theta Power
- Alpha/Beta Ratio
- Combined "Flow State" score

---

#### 2. Focus/Productivity Training System
**Description:** ADHD-style neurofeedback for improving sustained attention.

**Protocol:** Theta/Beta ratio training
- Goal: Decrease theta (4-8 Hz), increase beta (13-30 Hz)
- Session: 20-30 minutes, 3-4x per week

**Features:**
- Real-time theta/beta ratio display
- Rewards (sound, visual) when ratio decreases
- Track improvement over weeks
- Export data for analysis

**Visualization:**
- Simple gauge showing ratio
- Target zone highlighted
- History graph

**Research Support:** Validated protocol with peer-reviewed studies showing ADHD improvement.

---

#### 3. Brain-Controlled Art Installation
**Description:** Public art piece that visualizes viewers' mental states.

**Concept:**
- Visitors wear Muse headset
- Their brainwaves control large-screen visualization
- Projection mapping or LED installation

**Data Mapping:**
- Alpha power → Fluidity of movement
- Beta power → Sharpness/angularity
- Theta power → Dreamlike effects
- Gamma power → Complexity

**Tech:**
- Muse + Mind Monitor → OSC streaming
- TouchDesigner or Processing for visuals
- Projection mapping or LED matrix

**Use Cases:**
- Museum installations
- Science centers
- Meditation studios
- Tech conferences

---

#### 4. Multi-Person Interpersonal Coherence
**Description:** Measure brain synchronization between multiple people.

**Setup:**
- 2+ people wearing Muse headsets
- Calculate inter-brain coherence
- Visualize degree of synchronization

**Metrics:**
- Phase-locking value between brainwaves
- Cross-correlation of alpha oscillations
- Hyperscanning analysis

**Visualization:**
- Each person represented by particle swarm
- Swarms merge when high synchronization
- Color indicates which frequencies are synced

**Research Basis:**
- Studies show EEG synchronization between people during:
  - Music listening
  - Conversation
  - Cooperative tasks
  - Loving relationships

---

#### 5. VR Meditation Experience
**Description:** Combine VR with real-time EEG feedback.

**Concept:**
- User wears VR headset + Muse 2 (fits underneath)
- Virtual environment responds to mental state
- Gamified meditation training

**Examples:**
- Underwater scene: Water clarity increases with alpha power
- Space environment: Galaxy density with theta power
- Forest walk: Weather changes with stress levels

**Tech Stack:**
- Muse 2 (fits under VR headset)
- Unity or Unreal Engine
- BrainFlow or OSC bridge for data
- VR headset (Quest, Vive, etc.)

---

#### 6. Sleep Quality Optimizer (Muse S)
**Description:** Track sleep stages and optimize sleep quality.

**Features:**
- Real-time sleep stage detection (light, deep, REM)
- Smart alarm (wake during light sleep)
- Sleep quality scoring
- Personalized recommendations

**Data Sources:**
- EEG → Sleep stages
- PPG → Heart rate variability during sleep
- Accelerometer → Movement/restlessness

**Interventions:**
- Bedtime routine recommendations
- Environmental adjustments
- Cognitive behavioral therapy for insomnia (CBT-I)

---

#### 7. Musical Brain-Computer Interface
**Description:** Control music parameters with brainwaves.

**Mappings:**
- Alpha power → Reverb amount
- Beta power → Tempo
- Theta power → Bass frequency
- Gamma power → Complexity/density

**Implementation:**
- Muse → OSC → Ableton Live/Max/MSP
- Real-time audio processing
- MIDI control generation

**Use Cases:**
- Live performance
- Therapeutic music for meditation
- Experimental music composition

---

#### 8. Attention-Based Game
**Description:** Video game controlled by focus level.

**Mechanics:**
- Character moves faster when focused (high beta)
- Obstacles appear when distracted (high theta)
- Rewards for sustained attention

**Applications:**
- ADHD training (gamified neurofeedback)
- Educational tool
- Brain fitness

**Tech:**
- Unity game engine
- BrainFlow or muse-js for data
- Simple 2D or 3D game

---

## Recommendations

### For Your Existing HRV Biofeedback System

**Best Path Forward:**

1. **Hardware:**
   - Purchase Muse 2 ($249.99)
   - Keep Polar H10 for HRV (don't replace)
   - Total new investment: $250

2. **Software Architecture:**
   - Create new `muse_websocket_server.py` (similar to HRV monitor)
   - Stream Muse data via muselsl to LSL
   - Calculate band powers in real-time
   - Broadcast via WebSocket on port 8766
   - Browser connects to both port 8765 (HRV) and 8766 (EEG)

3. **Integration Approach:**
   - Start with **separate streams** (easier)
   - Later combine into unified server if desired
   - Use LSL for timestamp synchronization

4. **Visualization Extensions:**
   - Keep existing HRV coherence → boid attraction/repulsion
   - Add EEG-based color palette shifting
   - Add combined "flow state" metric
   - Add heart-brain synchrony indicator

5. **Initial Protocols to Implement:**
   - Alpha enhancement (relaxation)
   - Alpha/beta ratio (relaxation vs focus)
   - Later: Theta/beta (ADHD-style training)

---

### Development Roadmap

**Phase 1: Basic Integration (1-2 weeks)**
- [ ] Purchase Muse 2
- [ ] Install muselsl
- [ ] Test basic connection and streaming
- [ ] Verify signal quality
- [ ] Create WebSocket server for Muse
- [ ] Test browser connection

**Phase 2: Band Power Calculation (1 week)**
- [ ] Implement FFT processing
- [ ] Calculate 5 frequency bands
- [ ] Add smoothing/filtering
- [ ] Display in browser (simple bars)

**Phase 3: Visualization Integration (1-2 weeks)**
- [ ] Connect to existing coherence visualization
- [ ] Map EEG metrics to visual parameters
- [ ] Test combined HRV + EEG effects
- [ ] Tune mapping functions

**Phase 4: Neurofeedback Protocols (2-3 weeks)**
- [ ] Implement alpha enhancement protocol
- [ ] Add audio feedback (tones)
- [ ] Create session recording
- [ ] Add progress tracking
- [ ] User testing and iteration

**Phase 5: Advanced Features (ongoing)**
- [ ] Heart-brain synchrony calculation
- [ ] Multi-person support
- [ ] Custom protocols
- [ ] Data analysis tools

---

### Best Practices Summary

**Do:**
- ✅ Start with Muse 2 (best value)
- ✅ Use muselsl + LSL (industry standard)
- ✅ Keep sessions short initially (5-15 min)
- ✅ Focus on validated protocols (alpha, theta/beta)
- ✅ Clean electrodes and skin before each session
- ✅ Use WebSocket architecture (matches existing system)
- ✅ Record data for offline analysis
- ✅ Validate against known states (eyes open/closed)

**Don't:**
- ❌ Expect medical-grade precision (it's consumer EEG)
- ❌ Trust single-channel or poorly fitted data
- ❌ Ignore signal quality indicators
- ❌ Use for medical diagnosis
- ❌ Start with complex protocols (keep it simple)
- ❌ Forget to account for individual differences
- ❌ Neglect artifact rejection
- ❌ Overlook comfort (affects signal quality)

---

## Resources

### Official Documentation
- **Muse Official Site:** https://choosemuse.com
- **Muse Research Page:** https://choosemuse.com/pages/muse-research
- **Muse Developer Forum:** http://forum.choosemuse.com

### Open Source Libraries

**Python:**
- muselsl: https://github.com/alexandrebarachant/muse-lsl
- pylsl: https://github.com/labstreaminglayer/pylsl
- BrainFlow: https://brainflow.org

**JavaScript:**
- muse-js: https://github.com/urish/muse-js
- web-muse: https://github.com/itayinbarr/web-muse

**Windows:**
- BlueMuse: https://github.com/kowalej/BlueMuse

**Mobile:**
- Mind Monitor: https://mind-monitor.com

### Lab Streaming Layer (LSL)
- Official Docs: https://labstreaminglayer.readthedocs.io
- Introduction: https://github.com/sccn/labstreaminglayer

### Research Papers

**Muse Validation:**
- Krigolson et al. (2017): "Choosing MUSE: Validation of a Low-Cost, Portable EEG System for ERP Research"
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5344886/

- "Validating the wearable MUSE headset for EEG spectral analysis and Frontal Alpha Asymmetry"
  https://www.biorxiv.org/content/10.1101/2021.11.02.466989v1

**Neurofeedback:**
- "EEG-Neurofeedback as a Tool to Modulate Cognition and Behavior: A Review Tutorial"
  https://www.frontiersin.org/articles/10.3389/fnhum.2017.00051/full

**HRV-EEG Correlation:**
- "The Influence of Heart Rate Variability Biofeedback on Cardiac Regulation and Functional Brain Connectivity"
  https://www.frontiersin.org/articles/10.3389/fnins.2021.691988/full

- "Heart rate variability biofeedback in a global study of the most common coherence frequencies"
  https://www.nature.com/articles/s41598-025-87729-7

### Tutorials
- "Muse 101 — How to start Developing with the Muse 2 right now"
  https://anushmutyala.medium.com/muse-101-how-to-start-developing-with-the-muse-2-right-now-a1b87119be5c

- "Reactive Brain Waves" (muse-js tutorial)
  https://urish.medium.com/reactive-brain-waves-af07864bb7d4

- "How to Decode Mental States With a Commercial EEG Headband"
  https://lukeguerdan.com/blog/2019/muse-neurofeedback/

### Community
- **NeuroTechX:** https://neurotechx.com (Open neuroscience community)
- **Reddit r/EEG:** https://reddit.com/r/eeg
- **OpenBCI Forum:** https://openbci.com/forum

### Data Analysis Tools
- **EEGLab (MATLAB):** https://sccn.ucsd.edu/eeglab/
- **MNE-Python:** https://mne.tools/
- **Kubios HRV:** https://www.kubios.com (for HRV analysis)

### Existing Projects (GitHub)
- EEG-101: https://github.com/NeuroTechX/eeg-101
- EEGEdu: https://github.com/kylemath/EEGEdu
- Muse Brain Display: https://github.com/arnodelorme/muse_brain_display
- BrainFlowsIntoVRChat: https://github.com/ChilloutCharles/BrainFlowsIntoVRChat

### Comparison Resources
- "Consumer BCI Review: 5 EEG Headsets for Developers"
  https://neurotechjp.com/blog/5-bci-gadget-reviews/

- "Scoping review on the use of consumer-grade EEG devices for research"
  https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0291186

---

## Conclusion

The Muse headset provides an excellent entry point for EEG neurofeedback and biometric visualization projects. At $250, the Muse 2 offers validated research-grade spectral analysis in a consumer-friendly package with excellent open-source library support.

For your existing Polar H10 HRV coherence system, adding Muse EEG will enable:
- Multi-modal biofeedback (heart + brain)
- Deeper insights into physiological states
- More nuanced visualizations
- Research into heart-brain coherence

The WebSocket architecture you've already built for Polar H10 can be easily extended to include Muse data, creating a unified biofeedback platform.

**Next Step:** Order a Muse 2, install muselsl, and start with basic band power streaming. The investment will open up a new dimension of biometric art and neurofeedback possibilities.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-01
**Research Completed By:** AI Research Assistant
**Sources:** 25+ web searches, 10+ research papers, multiple GitHub repositories
