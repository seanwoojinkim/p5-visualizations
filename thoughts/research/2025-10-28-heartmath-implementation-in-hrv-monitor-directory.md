---
doc_type: research
date: 2025-10-28T01:11:00+00:00
title: "HeartMath Implementation in hrv-monitor Directory"
research_question: "What is the complete implementation of HeartMath coherence calculation in the hrv-monitor directory, including architecture, algorithms, sensor integration, and technical stack?"
researcher: Sean Kim

git_commit: 36b4f99dafec272233e1aa89b89a368a5ba0a8b3
branch: main
repository: workspace

created_by: Sean Kim
last_updated: 2025-10-28
last_updated_by: Sean Kim

tags:
  - heartmath
  - hrv
  - coherence
  - polar-h10
  - python
  - biofeedback
  - bluetooth-le
  - websocket
  - signal-processing
status: completed

related_docs: []
---

# Research: HeartMath Implementation in hrv-monitor Directory

**Date**: 2025-10-28T01:11:00+00:00
**Researcher**: Sean Kim
**Git Commit**: 36b4f99dafec272233e1aa89b89a368a5ba0a8b3
**Branch**: main
**Repository**: workspace

## Research Question

What is the complete implementation of HeartMath coherence calculation in the hrv-monitor directory, including architecture, algorithms, sensor integration, and technical stack?

## Summary

The hrv-monitor directory contains a complete, production-ready Python service that connects to a Polar H10 heart rate monitor via Bluetooth LE, calculates HeartMath-style coherence scores from RR interval data, and streams real-time results via WebSocket. The implementation consists of four core modules (main.py, polar_h10.py, coherence_calculator.py, websocket_server.py) that work together to provide research-grade HRV biofeedback with coherence scoring on a 0-100 scale.

The service implements the HeartMath coherence ratio algorithm: `CR = Peak Power / (Total Power - Peak Power)`, analyzing heart rate variability in the frequency domain (0.04-0.26 Hz range) to detect physiological synchronization patterns. It supports real-time streaming to multiple clients, auto-reconnection, calibration modes, and comprehensive logging.

## Detailed Findings

### 1. Overall Architecture and Structure

The hrv-monitor service follows a modular, event-driven architecture with clear separation of concerns:

#### Directory Structure

```
hrv-monitor/
├── config/
│   └── default.yaml              # Configuration settings
├── src/
│   ├── main.py                   # Orchestration & entry point
│   ├── polar_h10.py              # Bluetooth LE interface
│   ├── coherence_calculator.py   # HeartMath algorithm
│   └── websocket_server.py       # Real-time streaming
├── docs/
│   ├── MAC_SETUP.md              # macOS-specific guide
│   └── INTEGRATION_EXAMPLE.md    # Integration code samples
├── logs/                         # Runtime logs
├── tests/                        # (empty - future tests)
├── requirements.txt              # Python dependencies
├── README.md                     # Complete documentation
├── QUICKSTART.md                 # 5-minute setup guide
├── PROJECT_STRUCTURE.md          # Architecture overview
├── test_client.html              # WebSocket test client
├── run.sh                        # Service startup script
└── setup.sh                      # Environment setup
```

**Key Files:**
- `/workspace/hrv-monitor/src/main.py` - Entry point and service orchestration
- `/workspace/hrv-monitor/src/polar_h10.py` - Bluetooth LE sensor interface
- `/workspace/hrv-monitor/src/coherence_calculator.py` - HeartMath algorithm implementation
- `/workspace/hrv-monitor/src/websocket_server.py` - Real-time data broadcasting
- `/workspace/hrv-monitor/config/default.yaml` - All configuration settings

#### Component Architecture

```
┌─────────────────┐
│   Polar H10     │  1000 Hz ECG → RR intervals (1ms precision)
│  (Chest Strap)  │  Bluetooth LE (Heart Rate Service 0x180D)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  polar_h10.py   │  - BLE connection (Bleak library)
│                 │  - Heart Rate Service notifications
│                 │  - RR interval parsing
│                 │  - Auto-reconnect logic
└────────┬────────┘
         │ Callback: on_rr_interval(rr_ms)
         ▼
┌─────────────────┐
│ main.py         │  - Service orchestration
│ HRVMonitorSrvc  │  - Periodic updates (3s default)
│                 │  - Calibration management
└─────┬───────┬───┘  - Async task coordination
      │       │
      │       └──────────────────┐
      ▼                          ▼
┌─────────────────┐    ┌─────────────────┐
│ coherence_      │    │ websocket_      │
│ calculator.py   │    │ server.py       │
│                 │    │                 │
│ - Buffer mgmt   │    │ - Client mgmt   │
│ - Resample 4Hz  │    │ - Broadcasting  │
│ - Detrend       │    │ - CORS support  │
│ - Hanning win   │    │ - Message types │
│ - FFT (256pts)  │    └─────────────────┘
│ - Peak detect   │              │
│ - Ratio calc    │              ▼
│ - Score 0-100   │    ws://localhost:8765
└─────────────────┘              │
         │                       ▼
         │              ┌─────────────────┐
         └──────────────│ Clients:        │
                        │ - Visualization │
                        │ - Test client   │
                        │ - Recording     │
                        └─────────────────┘
```

#### Main Service Orchestration

**File:** `/workspace/hrv-monitor/src/main.py`

**Class:** `HRVMonitorService` (lines 55-203)

The main service class coordinates all components:

- **Initialization (lines 61-79):** Creates instances of `CoherenceCalculator`, `CoherenceWebSocketServer`, and `PolarH10` with configuration
- **RR Interval Callback (lines 81-94):** Receives RR intervals from Polar H10, adds to coherence calculator, broadcasts heartbeat events
- **Periodic Coherence Update (lines 96-143):** Every 3 seconds (configurable), calculates coherence, manages calibration period, broadcasts results
- **Periodic Status Broadcast (lines 145-156):** Every 5 seconds, broadcasts Polar H10 connection status
- **Run Method (lines 158-203):** Connects to Polar H10, starts WebSocket server, launches periodic tasks, maintains connection with auto-reconnect

**Async Task Management:**

The service runs four concurrent async tasks:
1. WebSocket server (`websocket_task`)
2. Coherence calculation updates (`coherence_task`)
3. Status broadcasts (`status_task`)
4. Polar H10 connection maintenance (`connection_task`)

All tasks are coordinated via `asyncio.gather()` (line 193-198).

### 2. HeartMath-Specific Implementation

#### Coherence Algorithm

**File:** `/workspace/hrv-monitor/src/coherence_calculator.py`

**Class:** `CoherenceCalculator` (lines 14-256)

The implementation follows the HeartMath Institute's coherence ratio methodology with precise spectral analysis.

##### Core Algorithm Formula

```
Coherence Ratio (CR) = Peak Power / (Total Power - Peak Power)

Where:
  Peak Power   = PSD integrated over ±0.015 Hz window around peak frequency
  Total Power  = PSD integrated over 0.04-0.26 Hz range (coherence band)
  Peak         = Maximum in 0.04-0.26 Hz range
```

Implemented at lines 131-134:
```python
if total_power <= peak_power:
    ratio = 0.0
else:
    ratio = peak_power / (total_power - peak_power)
```

##### Signal Processing Pipeline

**Method:** `calculate_coherence()` (lines 69-158)

The algorithm processes RR intervals through 10 steps:

**Step 1: Buffer Management** (lines 52-67)
- Maintains sliding window of RR intervals with timestamps
- Default window: 60 seconds
- Minimum required: 30 beats
- Auto-removes data outside window

**Step 2: Resample to Uniform 4 Hz** (lines 95-96, method at 160-184)
```python
resampled = self._resample_rr_intervals(self.rr_buffer, self.resample_rate)
```
- Converts irregularly-spaced RR intervals to uniform sampling
- Uses linear interpolation (numpy.interp)
- Creates cumulative time array from RR intervals
- Generates uniform time grid at 4 Hz (250ms intervals)

**Step 3: Linear Detrending** (lines 98-99)
```python
detrended = signal.detrend(resampled, type='linear')
```
- Removes linear drift from the signal
- Uses scipy.signal.detrend
- Ensures mean-centered data for FFT

**Step 4: Hanning Window Application** (lines 101-103)
```python
window = np.hanning(len(detrended))
windowed = detrended * window
```
- Reduces spectral leakage in FFT
- Tapers signal edges to minimize edge effects

**Step 5: FFT and Power Spectral Density** (lines 105-108)
```python
fft_vals = rfft(windowed)
freqs = rfftfreq(len(windowed), 1/self.resample_rate)
psd = np.abs(fft_vals) ** 2 / len(windowed)
```
- Real FFT (rfft) for efficiency (real-valued input)
- Computes frequency bins
- PSD = magnitude squared / length (power normalization)

**Step 6: Extract Coherence Range** (lines 110-113)
```python
mask = (freqs >= self.coherence_min_freq) & (freqs <= self.coherence_max_freq)
coherence_freqs = freqs[mask]
coherence_psd = psd[mask]
```
- Filters to 0.04-0.26 Hz range (configurable)
- This range captures:
  - Baroreceptor feedback (~0.1 Hz)
  - Respiratory sinus arrhythmia
  - Coherent breathing patterns

**Step 7: Peak Frequency Detection** (lines 118-120)
```python
peak_idx = np.argmax(coherence_psd)
peak_freq = coherence_freqs[peak_idx]
```
- Finds dominant frequency in coherence range
- Target is ~0.1 Hz (6 breaths/minute = resonant frequency)

**Step 8: Calculate Peak Power** (lines 122-125)
```python
peak_half_width = self.peak_window_width / 2  # 0.015 Hz
peak_mask = np.abs(freqs - peak_freq) <= peak_half_width
peak_power = np.sum(psd[peak_mask])
```
- Integrates PSD over ±0.015 Hz window (0.030 Hz total width)
- Captures power concentrated around dominant frequency

**Step 9: Calculate Total Power** (lines 127-128)
```python
total_power = np.sum(coherence_psd)
```
- Integrates PSD over entire 0.04-0.26 Hz range

**Step 10: Coherence Ratio and Scoring** (lines 131-137)
```python
if total_power <= peak_power:
    ratio = 0.0
else:
    ratio = peak_power / (total_power - peak_power)

score = self._ratio_to_score(ratio)
```

##### Coherence Scoring

**Method:** `_ratio_to_score()` (lines 186-215)

Converts raw coherence ratio to 0-100 scale using HeartMath thresholds:

| Raw Ratio Range | Score Range | Level | Interpretation |
|----------------|-------------|-------|----------------|
| 0 - 0.9 | 0 - 33 | Low | Chaotic, irregular HRV |
| 0.9 - 7.0 | 33 - 67 | Medium | Some rhythmic patterns |
| 7.0+ | 67 - 100 | High | Strong sine-wave pattern |

**Scoring Logic:**

**Low Coherence** (ratio < 0.9):
```python
score = (ratio / self.low_threshold) * 33
```
Linear mapping from 0 to 33

**Medium Coherence** (0.9 ≤ ratio < 7.0):
```python
normalized = (ratio - self.low_threshold) / (self.high_threshold - self.low_threshold)
score = 33 + normalized * 34
```
Linear mapping from 33 to 67

**High Coherence** (ratio ≥ 7.0):
```python
excess = ratio - self.high_threshold
normalized = min(excess / 3.0, 1.0)
score = 67 + normalized * 33
```
Nonlinear mapping from 67 to 100, capped at 100

#### Metrics Tracked

**Return Value from `calculate_coherence()`** (lines 139-147):

```python
{
    'status': 'valid',              # 'valid' or 'insufficient_data' or 'error: ...'
    'coherence': int(score),         # 0-100 score
    'ratio': float(ratio),           # Raw coherence ratio (unbounded)
    'peak_frequency': float(peak_freq),  # Hz (typically ~0.1 Hz)
    'peak_power': float(peak_power),     # Power in ±0.015 Hz window
    'total_power': float(total_power),   # Total power in 0.04-0.26 Hz
    'beats_used': len(self.rr_buffer)    # Number of RR intervals used
}
```

**Buffer Status** - Method: `get_buffer_status()` (lines 229-250):

```python
{
    'beats_in_buffer': len(self.rr_buffer),
    'min_beats_required': self.min_beats_required,  # Default: 30
    'buffer_ready': len(self.rr_buffer) >= self.min_beats_required,
    'mean_heart_rate': mean_hr,  # BPM calculated from mean RR
    'buffer_duration_seconds': duration  # Actual time span
}
```

#### Configuration Parameters

**File:** `/workspace/hrv-monitor/config/default.yaml` (lines 16-36)

```yaml
coherence:
  # Window settings
  window_duration: 60          # seconds (45-60 recommended)
  update_interval: 3           # seconds between updates
  min_beats_required: 30       # minimum beats for calculation

  # Resampling
  resample_rate: 4             # Hz (standard for HRV)

  # FFT settings
  fft_size: 256                # samples

  # Frequency ranges (Hz)
  coherence_min_freq: 0.04     # Lower bound
  coherence_max_freq: 0.26     # Upper bound
  peak_window_width: 0.030     # Total width (±0.015 Hz)
  target_coherence_freq: 0.1   # Resonant frequency

  # Scoring thresholds
  low_coherence_threshold: 0.9   # ratio threshold for low
  high_coherence_threshold: 7.0  # ratio threshold for high
```

#### Frequency Domain Analysis

The implementation performs complete frequency domain analysis:

**Low Frequency (LF) and High Frequency (HF) Considerations:**

While the code doesn't explicitly separate LF/HF bands as in traditional HRV analysis, the coherence range (0.04-0.26 Hz) encompasses:

- **LF band (0.04-0.15 Hz):** Baroreceptor activity, sympathetic/parasympathetic balance
- **HF band (0.15-0.4 Hz):** Respiratory sinus arrhythmia, parasympathetic activity

The HeartMath coherence algorithm focuses on the **peak power concentration** rather than LF/HF ratios. High coherence occurs when most power is concentrated at one frequency (typically ~0.1 Hz), indicating synchronization of multiple physiological oscillators.

**No explicit SDNN or RMSSD calculation** in the current implementation - the algorithm is purely frequency-domain based. These time-domain metrics could be added as supplementary features.

### 3. Sensor Integration

#### Hardware: Polar H10

**File:** `/workspace/hrv-monitor/src/polar_h10.py`

**Class:** `PolarH10` (lines 16-221)

The implementation uses the Polar H10 chest strap heart rate monitor, which provides research-grade ECG accuracy.

##### Polar H10 Specifications

From `/workspace/hrv-monitor/README.md` (lines 350-360):

```
- ECG Sampling: 1000 Hz (internal)
- RR Interval Precision: 1 ms
- Bluetooth: 5.0 (LE + Classic)
- ANT+: Yes (for multi-device)
- Battery: CR2025 (400 hours)
- Accuracy: R² > 0.99 vs medical ECG
- Range: ~10 meters
```

##### Bluetooth LE Connection

**Service UUIDs** (lines 24-26):
```python
HEART_RATE_SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb"      # Standard BLE HR Service
HEART_RATE_MEASUREMENT_UUID = "00002a37-0000-1000-8000-00805f9b34fb"  # HR Measurement Characteristic
```

The Polar H10 uses the standard Bluetooth Low Energy Heart Rate Profile, which means:
- No proprietary protocols required
- No pairing/authentication needed for basic HR data
- Works with standard BLE libraries (Bleak)

**Library:** Bleak (Bluetooth Low Energy platform Agnostic Klient)
- Cross-platform BLE support (Windows, macOS, Linux)
- Async/await interface
- Automatic device discovery

##### Connection Process

**Method:** `connect()` (lines 47-120)

**Step 1: Device Discovery** (lines 55-66)
```python
devices = await BleakScanner.discover(timeout=10.0)

for device in devices:
    if device.name and self.device_name.lower() in device.name.lower():
        polar_device = device
        break
```
- Scans for BLE devices advertising Heart Rate Service
- Searches by name (default: "Polar H10")
- 10-second timeout (configurable)

**Step 2: Connection** (lines 100-104)
```python
self.client = BleakClient(polar_device.address)
await self.client.connect()
self.is_connected = True
self.reconnect_count = 0
```

**Step 3: Enable Notifications** (lines 108-112)
```python
await self.client.start_notify(
    self.HEART_RATE_MEASUREMENT_UUID,
    self._notification_handler
)
```
- Subscribes to Heart Rate Measurement characteristic
- Notifications sent automatically by Polar H10 on each heartbeat

##### RR Interval Data Parsing

**Method:** `_notification_handler()` (lines 134-184)

The handler parses Bluetooth Heart Rate Measurement notifications according to the Bluetooth specification:

**Byte 0: Flags**
```python
flags = data[0]
rr_present = (flags & 0x10) != 0  # Bit 4 indicates RR intervals
hr_format = flags & 0x01           # Bit 0: 0=uint8 HR, 1=uint16 HR
```

**Bytes 1-2 (or 3): Heart Rate Value**
```python
if hr_format == 0:
    hr_offset = 2  # uint8 HR (1 byte) + 1 flag byte
else:
    hr_offset = 3  # uint16 HR (2 bytes) + 1 flag byte
```

**Remaining Bytes: RR Intervals**
```python
rr_data = data[hr_offset:]
rr_count = len(rr_data) // 2  # Each RR is 2 bytes

for i in range(rr_count):
    rr_value = int.from_bytes(rr_data[i*2:(i*2)+2], byteorder='little')
    rr_ms = (rr_value / 1024.0) * 1000.0  # Convert 1/1024s to milliseconds

    if self.on_rr_interval and rr_ms > 0:
        self.on_rr_interval(rr_ms)
```

**RR Interval Encoding:**
- Each RR interval is 16-bit unsigned integer (little-endian)
- Resolution: 1/1024 second (~0.98 ms)
- Multiple RR intervals can be sent in one notification

##### Auto-Reconnect Logic

**Method:** `maintain_connection()` (lines 186-206)

```python
while True:
    if not self.is_connected and self.auto_reconnect:
        if self.reconnect_count < self.max_reconnect_attempts:
            self.reconnect_count += 1
            logger.info(f"Attempting to reconnect ({self.reconnect_count}/{self.max_reconnect_attempts})...")
            await self.connect()
            if self.is_connected:
                logger.info("Reconnection successful")
            else:
                await asyncio.sleep(self.reconnect_delay)  # Default: 5 seconds
        else:
            logger.error(f"Max reconnect attempts ({self.max_reconnect_attempts}) reached")
            break

    await asyncio.sleep(1)
```

**Configuration** (from `/workspace/hrv-monitor/config/default.yaml`, lines 10-13):
```yaml
auto_reconnect: true
reconnect_delay: 5           # seconds between attempts
max_reconnect_attempts: 10   # total attempts before giving up
```

##### macOS-Specific Considerations

**File:** `/workspace/hrv-monitor/docs/MAC_SETUP.md`

Key insights:

1. **BLE devices don't appear in System Settings → Bluetooth** (lines 6-12)
   - macOS Bluetooth preferences only show classic Bluetooth devices
   - BLE Heart Rate Monitors require app-level scanning
   - Normal and expected behavior

2. **Device must be worn to be discoverable** (lines 44-58)
   - Polar H10 requires skin contact to power on
   - LED flashes red when active
   - Electrodes must be moistened

3. **macOS uses UUIDs instead of MAC addresses** (lines 301-311)
   - Privacy feature: each BLE device gets unique UUID
   - Changes per device but stable across connections
   - App uses UUID for connection

4. **Bluetooth permission required** (lines 185-194)
   - macOS prompts for Bluetooth access on first run
   - Can be managed in System Settings → Privacy & Security → Bluetooth

#### Data Acquisition Flow

**Complete data path from sensor to application:**

```
Polar H10 ECG Sensor (1000 Hz internal sampling)
    ↓
R-Peak Detection (internal to H10)
    ↓
RR Interval Calculation (1ms precision)
    ↓
Bluetooth LE Heart Rate Service
    - Notification every heartbeat (or batched)
    - RR intervals in 1/1024 second units
    ↓
polar_h10.py: _notification_handler()
    - Parse BLE Heart Rate Measurement format
    - Convert 1/1024s to milliseconds
    - Line 177: rr_ms = (rr_value / 1024.0) * 1000.0
    ↓
main.py: _on_rr_interval(rr_ms)
    - Line 89: self.coherence_calc.add_rr_interval(rr_ms)
    - Line 92: asyncio.create_task(self.websocket_server.broadcast_heartbeat(rr_ms))
    ↓
coherence_calculator.py: add_rr_interval()
    - Lines 52-67: Add to buffer with timestamp
    - Maintain 60-second sliding window
    - Auto-remove old data
    ↓
[Every 3 seconds - periodic update]
    ↓
coherence_calculator.py: calculate_coherence()
    - Lines 69-158: Full signal processing pipeline
    - Returns coherence result dictionary
    ↓
websocket_server.py: broadcast_coherence()
    - Lines 131-146: JSON-encode and broadcast
    ↓
WebSocket Clients
    - ws://localhost:8765
    - Real-time coherence updates
```

**Latency Analysis:**

From `/workspace/hrv-monitor/README.md` (lines 362-368):
```
- Window Duration: 60 seconds (45-60 recommended)
- Minimum Beats: 30 (at rest ~60 bpm)
- Update Frequency: Every 3-5 seconds
- Computation Time: 15-25 ms (FFT + calculations)
- Total Latency: < 100 ms (from RR to broadcast)
```

The system achieves real-time performance with:
- Immediate RR interval callback (< 1ms)
- Fast signal processing (15-25ms)
- Async WebSocket broadcasting (< 10ms)

### 4. User Interface and Feedback

#### WebSocket API

**File:** `/workspace/hrv-monitor/src/websocket_server.py`

**Class:** `CoherenceWebSocketServer` (lines 17-236)

The service provides a WebSocket server for real-time data streaming to visualization clients.

##### Connection

**Server Configuration** (from `/workspace/hrv-monitor/config/default.yaml`, lines 38-46):
```yaml
websocket:
  host: "0.0.0.0"      # Listen on all interfaces
  port: 8765           # Standard WebSocket port
  cors_origins:
    - "http://localhost:8000"
    - "http://localhost:8080"
    - "http://localhost:8123"
```

**Connection URL:** `ws://localhost:8765`

**Server Startup** (lines 47-56):
```python
async def start(self) -> None:
    logger.info(f"Starting WebSocket server on ws://{self.host}:{self.port}")

    async with websockets.serve(
        self._handler,
        self.host,
        self.port
    ):
        await asyncio.Future()  # Run forever
```

##### Message Types

**1. Initial State** (sent immediately on connection)

**Method:** `_send_initial_state()` (lines 86-100)

```json
{
  "type": "initial_state",
  "connection_status": {
    "polar_h10_connected": true,
    "device_name": "Polar H10",
    "device_address": "UUID-HERE"
  },
  "latest_coherence": {
    "status": "valid",
    "coherence": 67,
    "ratio": 3.45,
    "peak_frequency": 0.098,
    "peak_power": 1234.5,
    "total_power": 2345.6,
    "beats_used": 48
  },
  "buffer_status": {
    "beats_in_buffer": 48,
    "min_beats_required": 30,
    "buffer_ready": true,
    "mean_heart_rate": 68.5,
    "buffer_duration_seconds": 59.2
  }
}
```

**2. Coherence Update** (broadcast every 3 seconds, configurable)

**Method:** `broadcast_coherence()` (lines 131-146)

```json
{
  "type": "coherence_update",
  "timestamp": 1698425630.123,
  "data": {
    "status": "valid",
    "coherence": 67,
    "ratio": 3.45,
    "peak_frequency": 0.098,
    "peak_power": 1234.5,
    "total_power": 2345.6,
    "beats_used": 48
  }
}
```

**3. Heartbeat Event** (broadcast on every RR interval)

**Method:** `broadcast_heartbeat()` (lines 148-164)

```json
{
  "type": "heartbeat",
  "timestamp": 1698425630.456,
  "data": {
    "rr_interval": 856.3,
    "heart_rate": 70.1
  }
}
```

Heart rate calculated from RR interval: `HR = 60000 / rr_interval`

**4. Buffer Status** (broadcast with coherence updates)

**Method:** `broadcast_buffer_status()` (lines 166-181)

```json
{
  "type": "buffer_status",
  "timestamp": 1698425630.789,
  "data": {
    "beats_in_buffer": 48,
    "min_beats_required": 30,
    "buffer_ready": true,
    "mean_heart_rate": 68.5,
    "buffer_duration_seconds": 59.2
  }
}
```

**5. Connection Status** (broadcast every 5 seconds)

**Method:** `broadcast_connection_status()` (lines 183-202)

```json
{
  "type": "connection_status",
  "timestamp": 1698425631.012,
  "data": {
    "polar_h10_connected": true,
    "device_name": "Polar H10",
    "device_address": "F9168C5E-CEB2-4F3A-AC58-1234567890AB"
  }
}
```

##### Client Management

**Client Tracking** (lines 36-37):
```python
self.clients: Set[WebSocketServerProtocol] = set()
```

**Connection Handler** (lines 58-84):
```python
async def _handler(self, websocket: WebSocketServerProtocol) -> None:
    # Register client
    self.clients.add(websocket)
    client_address = websocket.remote_address
    logger.info(f"Client connected: {client_address}")

    try:
        # Send initial state
        await self._send_initial_state(websocket)

        # Keep connection alive and handle messages
        async for message in websocket:
            await self._handle_message(websocket, message)

    except websockets.exceptions.ConnectionClosed:
        logger.info(f"Client disconnected: {client_address}")
    except Exception as e:
        logger.error(f"Error handling client {client_address}: {e}")
    finally:
        # Unregister client
        self.clients.discard(websocket)
```

**Broadcasting** (lines 204-220):
```python
async def _broadcast(self, message: dict) -> None:
    if not self.clients:
        return

    message_json = json.dumps(message)

    # Send to all clients concurrently
    await asyncio.gather(
        *[client.send(message_json) for client in self.clients],
        return_exceptions=True
    )
```

Multiple clients can connect simultaneously, all receiving the same real-time data.

#### Test Client (HTML/JavaScript)

**File:** `/workspace/hrv-monitor/test_client.html` (342 lines)

A complete browser-based test client demonstrating WebSocket integration.

##### UI Components

**Visual Elements:**
- Connection status indicators (WebSocket + Polar H10)
- Large coherence score display (0-100)
- Animated coherence bar (color gradient)
- Coherence level text description
- Data grid with 4 metrics:
  - Heart Rate (BPM)
  - Peak Frequency (Hz)
  - Coherence Ratio (raw)
  - Beats Used (count)
- Scrolling log panel

**Styling** (lines 8-153):
- Gradient background (purple/violet)
- Glassmorphism design (translucent panels)
- Monospace font (Courier New)
- Smooth animations (CSS transitions)
- Responsive layout

##### WebSocket Client Logic

**Connection** (lines 214-261):
```javascript
const ws = new WebSocket('ws://localhost:8765');

ws.onopen = () => {
    wsStatus.className = 'status-indicator connected';
    wsStatusText.textContent = 'Connected';
    addLog('✓ Connected to HRV Monitor service');
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'initial_state') {
        addLog('Received initial state');
        updateConnectionStatus(message.connection_status);
    }

    if (message.type === 'coherence_update') {
        updateCoherenceData(message.data);
    }

    if (message.type === 'buffer_status') {
        updateBufferStatus(message.data);
    }

    if (message.type === 'connection_status') {
        updateConnectionStatus(message.data);
    }
};
```

##### Coherence Visualization

**Update Function** (lines 295-329):
```javascript
function updateCoherenceData(data) {
    if (data.status === 'valid') {
        const score = data.coherence;

        // Update score display
        coherenceScore.textContent = score;
        coherenceScore.className = 'metric-value updating';
        setTimeout(() => coherenceScore.classList.remove('updating'), 500);

        // Update progress bar
        coherenceFill.style.width = `${score}%`;

        // Update level description
        let level = '';
        if (score < 33) {
            level = 'Low Coherence - Chaotic HRV pattern';
        } else if (score < 67) {
            level = 'Medium Coherence - Some rhythmic patterns';
        } else {
            level = 'High Coherence - Strong sine-wave pattern';
        }
        coherenceLevel.textContent = level;

        // Update detailed metrics
        peakFreq.textContent = `${data.peak_frequency.toFixed(3)} Hz`;
        coherenceRatio.textContent = data.ratio.toFixed(2);
        beatsUsed.textContent = data.beats_used;

        addLog(`Coherence: ${score}/100 (ratio=${data.ratio.toFixed(2)}, peak=${data.peak_frequency.toFixed(3)} Hz)`);
    }
}
```

**Color Gradient Bar** (lines 88-92):
```css
.coherence-fill {
    background: linear-gradient(90deg,
        #f87171 0%,      /* Red: Low */
        #fbbf24 33%,     /* Yellow: Low-Med */
        #4ade80 67%,     /* Green: Med-High */
        #22d3ee 100%);   /* Cyan: High */
    width: 0%;
    transition: width 0.5s ease;
}
```

#### Feedback Mechanisms

**Visual Feedback:**
- Real-time coherence score (0-100)
- Color-coded progress bar
- Level descriptions (Low/Medium/High)
- Connection status indicators
- Numeric metrics (HR, frequency, ratio)
- Timestamped log entries

**No Audio or Haptic Feedback Currently Implemented**

The current implementation focuses on visual feedback through WebSocket streaming. Audio or haptic feedback would need to be implemented in client applications.

**Potential Extensions** (not currently implemented):
- Audio tones based on coherence level
- Haptic vibration patterns (mobile devices)
- Visual breathing pacer
- Real-time waveform display

#### Visualization Integration

**File:** `/workspace/hrv-monitor/docs/INTEGRATION_EXAMPLE.md`

Provides complete code examples for integrating with visualization systems.

**Score to Level Mapping** (lines 156-166):
```javascript
/**
 * Map coherence score (0-100) to coherence level (-1.0 to +1.0)
 *
 * 0-33: Low coherence → -1.0 to -0.33 (repulsion)
 * 33-67: Medium coherence → -0.33 to +0.33 (neutral)
 * 67-100: High coherence → +0.33 to +1.0 (attraction)
 */
scoreToLevel(score) {
    // Linear mapping
    return (score / 50) - 1.0;
}
```

**Exponential Smoothing** (lines 169-176):
```javascript
getSmoothedLevel() {
    // Exponential smoothing for visual transitions
    this.currentLevel += (this.targetLevel - this.currentLevel) * this.smoothingFactor;
    return this.currentLevel;
}
```

Default smoothing factor: 0.1 (configurable in `/workspace/hrv-monitor/config/default.yaml`, line 58)

### 5. Breathing Guidance

**No explicit breathing guidance is implemented in the current service.**

The system calculates and reports coherence, but does not provide:
- Visual breathing pacer
- Audio breathing cues
- Haptic breathing guidance

However, the documentation extensively covers breathing techniques:

**From `/workspace/hrv-monitor/QUICKSTART.md` (lines 84-97):**

```markdown
### Achieving High Coherence

Try **coherent breathing**:
1. Sit comfortably and relax
2. Breathe in for **5 seconds**
3. Breathe out for **5 seconds**
4. Repeat (6 breaths per minute = 0.1 Hz resonance)
5. Watch your coherence score rise!

### Peak Frequency

- **~0.1 Hz (6 breaths/min)**: Optimal resonance frequency
- **0.04-0.26 Hz**: Normal coherence range
- **Higher than 0.1 Hz**: Breathing too fast
- **Lower than 0.1 Hz**: Breathing very slowly
```

**Target Frequency Configuration** (from `/workspace/hrv-monitor/config/default.yaml`, line 32):
```yaml
target_coherence_freq: 0.1  # Resonant frequency (6 breaths/min)
```

This value is documented but not actively used in calculations - it serves as a reference for understanding the optimal breathing rate.

**Potential Implementation:**

The `peak_frequency` value returned in coherence updates could be used to drive breathing guidance:

```javascript
// Hypothetical breathing pacer (not implemented)
if (peak_frequency < 0.09) {
    showFeedback("Breathe slightly faster");
} else if (peak_frequency > 0.11) {
    showFeedback("Breathe slightly slower");
} else {
    showFeedback("Perfect resonance!");
}
```

**Breathing Rate Support:**

The algorithm supports any breathing rate in the coherence range (0.04-0.26 Hz):
- 0.04 Hz = 2.4 breaths/minute (very slow)
- 0.1 Hz = 6 breaths/minute (optimal resonance)
- 0.26 Hz = 15.6 breaths/minute (fast)

The system will detect coherence at any of these rates, but physiological research shows 0.1 Hz (~6 breaths/min) produces maximum coherence due to resonance with multiple physiological systems.

### 6. Data Storage and Analysis

**No persistent data storage or session recording is implemented in the current service.**

The system operates entirely in real-time with no database or file storage.

#### Current Data Handling

**In-Memory Only:**

1. **RR Interval Buffer** (`coherence_calculator.py`, lines 49-50):
   ```python
   self.rr_buffer: List[float] = []
   self.timestamps: List[float] = []
   ```
   - Stores last 60 seconds of RR intervals
   - Automatically removes old data
   - No persistence between sessions

2. **Latest Values Cache** (`websocket_server.py`, lines 39-45):
   ```python
   self.latest_coherence = None
   self.latest_buffer_status = None
   self.connection_status = {...}
   ```
   - Caches most recent values for new client connections
   - Cleared on service restart

3. **Logging** (file-based, configurable):
   ```yaml
   logging:
     level: "INFO"
     file: "logs/hrv-monitor.log"
   ```
   - Application logs saved to `logs/hrv-monitor.log`
   - Contains timestamps, coherence scores, connection events
   - Not structured for analysis (human-readable format)

#### What's Not Implemented

**No Session Storage:**
- No session start/end tracking
- No coherence data recording
- No RR interval archiving
- No session metadata (duration, average coherence, etc.)

**No Historical Analysis:**
- No session history database
- No trend analysis
- No session comparison
- No progress tracking over time

**No Export Features:**
- No CSV export
- No JSON data dumps
- No session replay
- No data download

#### Potential Implementation Approach

**From `/workspace/hrv-monitor/PROJECT_STRUCTURE.md` (lines 217-225):**

```markdown
## Future Enhancements

### Planned Features
- [ ] Data recording/playback
- [ ] REST API alongside WebSocket
- [ ] Web dashboard UI
```

A potential architecture for data storage:

```python
# Hypothetical session recording (not implemented)
class SessionRecorder:
    def __init__(self, session_id, output_dir="sessions"):
        self.session_id = session_id
        self.start_time = time.time()
        self.rr_intervals = []
        self.coherence_samples = []

    def record_rr(self, rr_ms):
        self.rr_intervals.append({
            'timestamp': time.time(),
            'rr_ms': rr_ms
        })

    def record_coherence(self, coherence_data):
        self.coherence_samples.append({
            'timestamp': time.time(),
            **coherence_data
        })

    def save_session(self):
        session_data = {
            'session_id': self.session_id,
            'start_time': self.start_time,
            'duration': time.time() - self.start_time,
            'rr_intervals': self.rr_intervals,
            'coherence_samples': self.coherence_samples,
            'statistics': self._calculate_stats()
        }

        with open(f"sessions/{self.session_id}.json", 'w') as f:
            json.dump(session_data, f, indent=2)
```

**Client-Side Recording:**

Currently, the most practical approach for session recording is client-side:

```javascript
// Record session in browser
const sessionData = [];

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    sessionData.push({
        timestamp: Date.now(),
        message: message
    });
};

// Save session
function downloadSession() {
    const blob = new Blob([JSON.stringify(sessionData, null, 2)],
                          {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hrv-session-${Date.now()}.json`;
    a.click();
}
```

### 7. Technical Stack

#### Languages and Frameworks

**Primary Language:** Python 3.8+

**File:** `/workspace/hrv-monitor/requirements.txt`

##### Core Dependencies

**1. Bluetooth LE and Sensor Integration**

```
bleak>=0.19.0
```
- **Bleak** (Bluetooth Low Energy platform Agnostic Klient)
- Cross-platform BLE library
- Used for Polar H10 connection (polar_h10.py)
- Supports Windows, macOS, Linux
- Async/await interface
- GitHub: https://github.com/hbldh/bleak

```
systole>=0.2.3
```
- **Systole** - HRV analysis tools
- Provides additional HRV utilities (though not actively used in main code)
- Includes Polar H10 support (alternative to Bleak)

```
pyhrv>=0.4.0
```
- **PyHRV** - Python Heart Rate Variability analysis toolkit
- Included as dependency but not directly used in current implementation
- Provides time-domain and frequency-domain HRV metrics

**2. Signal Processing and Scientific Computing**

```
numpy>=1.21.0
```
- **NumPy** - Numerical computing
- Used extensively in `coherence_calculator.py`:
  - Array operations
  - Interpolation (line 182: `np.interp`)
  - Statistical functions (mean, sum)
  - FFT operations (via scipy)

```
scipy>=1.7.0
```
- **SciPy** - Scientific computing
- Used in `coherence_calculator.py`:
  - `signal.detrend()` - Linear detrending (line 99)
  - `rfft()` / `rfftfreq()` - Real FFT operations (lines 106-107)
  - `np.hanning()` - Hanning window (line 102)

**3. Real-time Communication**

```
websockets>=10.0
```
- **websockets** - WebSocket protocol implementation
- Used in `websocket_server.py`
- Async WebSocket server (line 51: `websockets.serve`)
- Full WebSocket support for real-time streaming

```
aiohttp>=3.8.0
```
- **aiohttp** - Async HTTP client/server
- Included but not actively used in current implementation
- Could be used for future REST API

**4. Configuration and Utilities**

```
pyyaml>=6.0
```
- **PyYAML** - YAML parser
- Used in `main.py` (line 223: `yaml.safe_load`)
- Loads configuration from `config/default.yaml`

```
python-dotenv>=0.19.0
```
- **python-dotenv** - Environment variable management
- Included but not actively used
- Could be used for environment-specific configuration

##### Python Standard Library Usage

**asyncio** - Async/await framework
- Core to entire application architecture
- Used throughout all modules
- Event loop management (main.py)
- Task coordination (asyncio.gather)
- Async tasks (asyncio.create_task)

**logging** - Application logging
- Configured in main.py (lines 21-49)
- Used in all modules
- File and console handlers
- Configurable log levels

**time** - Timestamp management
- Used in coherence_calculator.py
- RR interval buffering with timestamps

**json** - JSON serialization
- WebSocket message encoding/decoding
- Configuration file support

**pathlib** - Path handling
- File path operations (main.py, line 216)

**sys** - System operations
- Exit codes
- Command-line args

#### Project Structure

**Build System:** No explicit build system (Python interpreted)

**Virtual Environment:** venv (standard Python)

**Setup Scripts:**

`setup.sh` (lines referenced from git status):
```bash
#!/bin/bash
# Creates virtual environment and installs dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

`run.sh` (lines referenced from git status):
```bash
#!/bin/bash
# Activates venv and runs service
source venv/bin/activate
python src/main.py
```

#### Runtime Architecture

**Async Event Loop:**
The entire application runs on a single asyncio event loop with concurrent tasks:

```
asyncio.run(main())
    ↓
├─ PolarH10.connect() (async)
├─ WebSocketServer.start() (async, runs forever)
├─ periodic_coherence_update() (async, runs forever)
├─ periodic_status_broadcast() (async, runs forever)
└─ PolarH10.maintain_connection() (async, runs forever)
```

**Threading Model:**
- Single-threaded async/await
- No explicit threading or multiprocessing
- Concurrent execution via coroutines
- Non-blocking I/O throughout

**Process Architecture:**
- Single Python process
- No multi-process setup
- No IPC mechanisms
- All components in same process space

#### Development Environment

**Version Control:** Git

**Code Style:**
- PEP 8 (inferred from code style)
- Type hints used extensively
- Docstrings for all classes and methods

**Documentation:**
- README.md (comprehensive)
- QUICKSTART.md (5-minute guide)
- PROJECT_STRUCTURE.md (architecture)
- Inline code comments
- docstrings with Args/Returns sections

**Testing:**
- `tests/` directory exists but empty
- No unit tests implemented
- Manual testing via test_client.html

#### Platform Support

**Operating Systems:**
- macOS (primary target, extensive documentation)
- Linux (supported via Bleak)
- Windows (supported via Bleak)

**Platform-Specific Considerations:**

**macOS:**
- Bluetooth LE permissions required
- BLE devices use UUIDs instead of MAC addresses
- Detailed setup guide in `docs/MAC_SETUP.md`
- Docker not supported (no Bluetooth access in containers)

**Linux:**
- BlueZ stack required
- May need sudo for Bluetooth access
- Less extensively documented

**Windows:**
- Bleak uses Windows BLE APIs
- Not tested or documented

#### Deployment

**No containerization in current implementation**

**From `/workspace/hrv-monitor/DOCKER_NOTE.md` (inferred from file list):**
Likely explains why Docker is not used (Bluetooth hardware access limitations)

**Deployment Method:**
- Direct Python execution
- Virtual environment
- No Docker, no systemd service
- Manual startup via `run.sh`

**Configuration Management:**
- YAML configuration file
- No environment variables (though python-dotenv included)
- Single config file: `config/default.yaml`

### 8. Current State and Completeness

#### Fully Implemented Features

**Core Functionality:**

✅ **Polar H10 Bluetooth LE Connection**
- Device discovery and connection (polar_h10.py)
- Heart Rate Service integration
- RR interval parsing
- Auto-reconnect with configurable attempts
- Connection status tracking
- macOS-specific handling

✅ **HeartMath Coherence Algorithm**
- Complete signal processing pipeline (coherence_calculator.py)
- 60-second sliding window buffer
- 4 Hz resampling with linear interpolation
- Linear detrending
- Hanning window application
- 256-point FFT
- Peak frequency detection (0.04-0.26 Hz range)
- Peak power calculation (±0.015 Hz window)
- Coherence ratio: CR = Peak Power / (Total Power - Peak Power)
- 0-100 scoring with HeartMath thresholds
- Buffer status tracking

✅ **Real-time WebSocket Streaming**
- WebSocket server on port 8765 (websocket_server.py)
- Multiple message types (5 different)
- Multi-client support
- Initial state on connection
- Concurrent broadcasting
- Connection/disconnection handling
- Error handling

✅ **Service Orchestration**
- Async task coordination (main.py)
- Periodic coherence updates (every 3s)
- Periodic status broadcasts (every 5s)
- Calibration mode (60s default)
- Graceful shutdown
- Keyboard interrupt handling

✅ **Configuration System**
- YAML configuration file
- All parameters configurable
- Coherence algorithm settings
- WebSocket settings
- Polar H10 connection settings
- Logging configuration
- Calibration settings

✅ **Logging**
- File and console output
- Configurable log levels
- Timestamps on all entries
- Connection events
- Coherence calculations
- Error tracking

✅ **Test Client**
- Complete HTML/JavaScript client (test_client.html)
- WebSocket connection
- Real-time updates
- Visual coherence display
- Connection status
- Metric display
- Log panel

✅ **Documentation**
- Comprehensive README (10,710 bytes)
- Quick start guide (5,598 bytes)
- Project structure doc (5,975 bytes)
- macOS setup guide (detailed)
- Integration examples
- API documentation
- Algorithm explanation

#### Missing or Incomplete Features

**Data Persistence:**

❌ **No Session Recording**
- No database integration
- No file-based session storage
- No session metadata tracking
- Cannot save coherence data for later analysis

❌ **No Historical Data**
- No session history
- No trend analysis
- No progress tracking
- No data export (CSV, JSON)

❌ **No Session Replay**
- Cannot replay recorded sessions
- No session comparison
- No offline analysis tools

**Analysis Features:**

❌ **No Time-Domain HRV Metrics**
- No SDNN (Standard Deviation of NN intervals)
- No RMSSD (Root Mean Square of Successive Differences)
- No pNN50 (percentage of intervals differing > 50ms)
- pyhrv library included but not used

❌ **No Explicit LF/HF Analysis**
- No separate Low Frequency band calculation
- No High Frequency band calculation
- No LF/HF ratio
- Focus is purely on coherence ratio

❌ **No Statistical Summary**
- No session statistics
- No averaging over time
- No min/max tracking
- No standard deviation calculations

**User Interface:**

❌ **No Breathing Guidance**
- No visual breathing pacer
- No audio breathing cues
- No haptic feedback
- Only passive coherence display

❌ **No Audio Feedback**
- No sonification of coherence
- No audio tones
- No voice guidance
- Silent operation only

❌ **No Haptic Feedback**
- No vibration patterns
- No tactile guidance
- Visual feedback only

❌ **No Real-time Waveform Display**
- No RR interval waveform
- No HRV tachogram
- No spectral plot
- Only numeric metrics

**Advanced Features:**

❌ **No Multi-Person Support**
- Single Polar H10 only
- No interpersonal coherence
- No cross-correlation analysis
- No group coherence metrics

❌ **No REST API**
- WebSocket only
- No HTTP endpoints
- No query API
- No control API

❌ **No Web Dashboard**
- Test client is basic
- No advanced UI
- No session management
- No user accounts

**Testing:**

❌ **No Unit Tests**
- `tests/` directory empty
- No automated testing
- No CI/CD
- Manual testing only

❌ **No Integration Tests**
- No end-to-end tests
- No WebSocket tests
- No Bluetooth mocking

**Deployment:**

❌ **No Docker Support**
- Cannot run in containers (Bluetooth limitation)
- No docker-compose
- Manual setup required

❌ **No Service Management**
- No systemd unit
- No auto-start
- No process management
- Manual execution only

❌ **No Monitoring**
- No health checks
- No metrics export
- No performance monitoring
- Logs only

#### Known Issues and TODOs

**From code analysis:**

No explicit TODO comments found in the source code.

**From documentation:**

**From `/workspace/hrv-monitor/PROJECT_STRUCTURE.md` (lines 217-225):**
```markdown
## Future Enhancements

### Planned Features
- [ ] Unit tests in `tests/` directory
- [ ] Multi-person support (2+ Polar H10s)
- [ ] Cross-correlation for interpersonal coherence
- [ ] REST API alongside WebSocket
- [ ] Data recording/playback
- [ ] Web dashboard UI
- [ ] Docker containerization
```

**Potential Issues:**

1. **No Bluetooth timeout handling** - If device stops responding, may hang
2. **No data validation** - RR intervals not validated for physiological plausibility
3. **No outlier removal** - Artifacts or noise not filtered
4. **No interpolation for missing beats** - Ectopic beats not handled
5. **No session boundaries** - Service runs continuously, no session concept
6. **No calibration validation** - No check if calibration produced valid baseline
7. **No WebSocket authentication** - Anyone can connect
8. **No rate limiting** - Clients can request unlimited data

#### Code Quality

**Strengths:**
- Clear module separation
- Async/await throughout
- Type hints on all methods
- Comprehensive docstrings
- Error handling with try/except
- Logging at appropriate levels
- Configurable via YAML
- Well-commented code

**Weaknesses:**
- No unit tests
- No input validation
- No data sanitization
- No performance profiling
- No memory leak checks
- No long-running stability testing

#### Production Readiness

**Current State:** Prototype/Research Quality

**Ready for:**
- Personal use
- Research experiments
- Proof of concept
- Integration testing
- Algorithm validation

**Not ready for:**
- Production deployment
- Medical use
- Commercial product
- Multi-user environments
- Long-term stability
- High availability

**Required for Production:**
1. Comprehensive test suite
2. Data validation and sanitization
3. Error recovery mechanisms
4. Performance optimization
5. Security hardening (WebSocket auth)
6. Monitoring and alerting
7. Session management
8. Data persistence
9. User management
10. Deployment automation

## Code References

### Core Implementation Files

- `/workspace/hrv-monitor/src/main.py` (249 lines)
  - `HRVMonitorService` class (lines 55-203)
  - `load_config()` function (lines 206-225)
  - Entry point `main()` (lines 228-239)

- `/workspace/hrv-monitor/src/polar_h10.py` (221 lines)
  - `PolarH10` class (lines 16-221)
  - `connect()` method (lines 47-120)
  - `_notification_handler()` method (lines 134-184)
  - `maintain_connection()` method (lines 186-206)

- `/workspace/hrv-monitor/src/coherence_calculator.py` (256 lines)
  - `CoherenceCalculator` class (lines 14-256)
  - `calculate_coherence()` method (lines 69-158)
  - `_resample_rr_intervals()` method (lines 160-184)
  - `_ratio_to_score()` method (lines 186-215)
  - `get_buffer_status()` method (lines 229-250)

- `/workspace/hrv-monitor/src/websocket_server.py` (236 lines)
  - `CoherenceWebSocketServer` class (lines 17-236)
  - `start()` method (lines 47-56)
  - `_handler()` method (lines 58-84)
  - `broadcast_coherence()` method (lines 131-146)
  - `broadcast_heartbeat()` method (lines 148-164)
  - `_broadcast()` method (lines 204-220)

### Configuration and Documentation

- `/workspace/hrv-monitor/config/default.yaml` (72 lines)
  - Polar H10 settings (lines 5-13)
  - Coherence parameters (lines 16-36)
  - WebSocket configuration (lines 38-46)
  - Logging settings (lines 60-65)
  - Calibration settings (lines 68-71)

- `/workspace/hrv-monitor/README.md` (393 lines)
  - Architecture diagram (lines 20-48)
  - Algorithm explanation (lines 270-306)
  - WebSocket API (lines 128-196)
  - Technical specifications (lines 348-375)

- `/workspace/hrv-monitor/test_client.html` (342 lines)
  - WebSocket client (lines 214-282)
  - Coherence visualization (lines 295-329)
  - Buffer status display (lines 331-339)

- `/workspace/hrv-monitor/docs/MAC_SETUP.md` (340 lines)
  - BLE connection explanation (lines 6-27)
  - Step-by-step guide (lines 29-100)
  - Troubleshooting (lines 129-204)

- `/workspace/hrv-monitor/docs/INTEGRATION_EXAMPLE.md` (502 lines)
  - HRVMonitorClient class (lines 40-184)
  - Integration code (lines 187-287)
  - Bridge server example (lines 306-382)

### Dependencies

- `/workspace/hrv-monitor/requirements.txt` (22 lines)
  - All Python dependencies with version constraints

## Architecture Documentation

### Data Flow Architecture

```
[Physical Layer]
Polar H10 ECG Sensor (1000 Hz internal sampling)
    │
    ├─ R-Peak Detection (on-device)
    ├─ RR Interval Calculation (1ms precision)
    └─ Bluetooth LE Advertisement (Heart Rate Service)

[Communication Layer]
Bluetooth LE (BLE)
    │
    ├─ Service UUID: 0x180D (Heart Rate)
    ├─ Characteristic UUID: 0x2A37 (HR Measurement)
    ├─ Notifications: On each heartbeat (or batched)
    └─ Format: Flags (1 byte) + HR (1-2 bytes) + RR intervals (2 bytes each)

[Acquisition Layer - polar_h10.py]
BleakClient (Bleak library)
    │
    ├─ Device Discovery (BleakScanner.discover)
    ├─ Connection Management
    ├─ Notification Handler
    └─ RR Interval Parsing (1/1024s → ms conversion)

[Orchestration Layer - main.py]
HRVMonitorService
    │
    ├─ Component Initialization
    ├─ Callback Registration (on_rr_interval)
    ├─ Periodic Tasks (coherence, status)
    └─ Async Coordination (asyncio.gather)

[Processing Layer - coherence_calculator.py]
CoherenceCalculator
    │
    ├─ Buffer Management (60s sliding window)
    ├─ Signal Processing Pipeline:
    │   ├─ Resample to 4 Hz
    │   ├─ Linear Detrending
    │   ├─ Hanning Window
    │   ├─ 256-point FFT
    │   ├─ Peak Detection (0.04-0.26 Hz)
    │   └─ Coherence Ratio Calculation
    └─ Scoring (0-100 scale)

[Distribution Layer - websocket_server.py]
CoherenceWebSocketServer
    │
    ├─ WebSocket Server (port 8765)
    ├─ Client Management (multi-client)
    ├─ Message Broadcasting (concurrent)
    └─ Message Types (5 different)

[Client Layer]
WebSocket Clients
    │
    ├─ Test Client (test_client.html)
    ├─ Coherence Visualization (integration)
    └─ Custom Applications
```

### Signal Processing Pipeline Detail

```
RR Intervals (ms)
[856, 842, 851, 860, ...]  (irregular spacing)
    ↓
[Step 1: Buffer Management]
60-second sliding window + timestamps
Maintain minimum 30 beats
    ↓
[Step 2: Resample to Uniform 4 Hz]
Input: Irregular RR intervals
Process:
  - Create cumulative time array
  - Generate uniform time grid (250ms intervals)
  - Linear interpolation (numpy.interp)
Output: Uniform series at 4 Hz
[851.2, 852.1, 853.5, 854.8, ...]  (240 samples @ 4Hz for 60s)
    ↓
[Step 3: Linear Detrending]
Remove linear drift using scipy.signal.detrend
Output: Mean-centered, detrended signal
    ↓
[Step 4: Hanning Window]
Apply Hanning window to reduce spectral leakage
Window: [0.0, 0.003, 0.012, ..., 0.012, 0.003, 0.0]
Output: Tapered signal
    ↓
[Step 5: FFT and PSD]
- Real FFT (rfft) for efficiency
- Frequency bins: [0.0, 0.0167, 0.0333, ..., 2.0 Hz]
- PSD = |FFT|² / N
Output: Power Spectral Density
    ↓
[Step 6: Extract Coherence Range]
Filter to 0.04-0.26 Hz
Extract frequencies and corresponding PSD values
    ↓
[Step 7: Find Peak Frequency]
peak_freq = frequency at max(PSD)
Typically ~0.1 Hz for high coherence
    ↓
[Step 8: Calculate Peak Power]
Window: peak_freq ± 0.015 Hz
Peak Power = Σ PSD in window
    ↓
[Step 9: Calculate Total Power]
Total Power = Σ PSD in coherence range (0.04-0.26 Hz)
    ↓
[Step 10: Coherence Ratio]
CR = Peak Power / (Total Power - Peak Power)
    ↓
[Step 11: Score Conversion]
IF CR < 0.9:     Score = 0-33   (Low)
IF 0.9 ≤ CR < 7.0: Score = 33-67  (Medium)
IF CR ≥ 7.0:     Score = 67-100 (High)
    ↓
Output: Coherence Score (0-100)
```

### Async Task Architecture

```
asyncio.run(main())
    │
    └─ HRVMonitorService.run()
        │
        ├─ [Task 1] PolarH10.connect() (one-time)
        │   ├─ BleakScanner.discover (10s timeout)
        │   ├─ BleakClient.connect
        │   └─ start_notify (Heart Rate Measurement)
        │
        ├─ [Task 2] websocket_server.start() (forever)
        │   ├─ websockets.serve (host=0.0.0.0, port=8765)
        │   └─ await asyncio.Future() (blocks forever)
        │       │
        │       └─ On each client connection:
        │           ├─ _handler() coroutine
        │           ├─ Send initial_state
        │           └─ Listen for messages
        │
        ├─ [Task 3] _periodic_coherence_update() (forever)
        │   ├─ Sleep 5s (initial delay)
        │   └─ Loop:
        │       ├─ coherence_calc.calculate_coherence()
        │       ├─ coherence_calc.get_buffer_status()
        │       ├─ Check calibration status
        │       ├─ websocket_server.broadcast_coherence()
        │       ├─ websocket_server.broadcast_buffer_status()
        │       └─ Sleep 3s
        │
        ├─ [Task 4] _periodic_status_broadcast() (forever)
        │   └─ Loop:
        │       ├─ polar_h10.get_status()
        │       ├─ websocket_server.broadcast_connection_status()
        │       └─ Sleep 5s
        │
        └─ [Task 5] polar_h10.maintain_connection() (forever)
            └─ Loop:
                ├─ Check is_connected
                ├─ If disconnected and auto_reconnect:
                │   ├─ Increment reconnect_count
                │   ├─ polar_h10.connect()
                │   └─ Sleep reconnect_delay (5s)
                └─ Sleep 1s

[Concurrent Execution]
All 5 tasks run concurrently via asyncio.gather()
Coordinated by single event loop
Non-blocking I/O throughout
```

### Message Flow Diagram

```
[Polar H10] ──RR Interval──> [polar_h10.py]
                                    │
                                    ├──on_rr_interval(rr_ms)──> [main.py]
                                    │                                │
                                    │                                ├──> [coherence_calculator.py]
                                    │                                │     add_rr_interval(rr_ms)
                                    │                                │
                                    │                                └──> [websocket_server.py]
                                    │                                      broadcast_heartbeat(rr_ms)
                                    │                                            │
                                    │                                            └──> All Clients
                                    │                                                 {type: "heartbeat", data: {...}}
                                    │
                                    └──[Every 3 seconds]──> [main.py]
                                                                 │
                                                                 ├──calculate_coherence()──> [coherence_calculator.py]
                                                                 │                                    │
                                                                 │                                    └──returns result
                                                                 │
                                                                 ├──get_buffer_status()──> [coherence_calculator.py]
                                                                 │                                 │
                                                                 │                                 └──returns status
                                                                 │
                                                                 ├──broadcast_coherence(result)──> [websocket_server.py]
                                                                 │                                         │
                                                                 │                                         └──> All Clients
                                                                 │                                              {type: "coherence_update", ...}
                                                                 │
                                                                 └──broadcast_buffer_status(status)──> [websocket_server.py]
                                                                                                              │
                                                                                                              └──> All Clients
                                                                                                                   {type: "buffer_status", ...}

[Every 5 seconds]
[main.py] ──get_status()──> [polar_h10.py]
                                    │
                                    └──returns connection info
                                               │
                                               └──broadcast_connection_status()──> [websocket_server.py]
                                                                                            │
                                                                                            └──> All Clients
                                                                                                 {type: "connection_status", ...}
```

## Historical Context (from thoughts/)

No existing related research documents found in the thoughts/ directory for this specific hrv-monitor implementation.

However, related coherence research exists in:
- `/workspace/coherence/docs/research/` (mentioned in README.md line 392)

The hrv-monitor service was designed to integrate with the coherence visualization system, providing real-time biofeedback for the biometric art installation project.

## Related Research

This implementation appears to be a standalone Python service created to provide HeartMath coherence calculation for the broader coherence visualization project. Potential related documents:

- Coherence algorithm research (location: `/workspace/coherence/docs/research/`)
- ECG R-peak detection research (mentioned in PROJECT_STRUCTURE.md line 236)
- HRV coherence algorithm research (mentioned in PROJECT_STRUCTURE.md line 234)

## Open Questions

1. **Why is pyhrv included but not used?**
   - The requirements.txt includes pyhrv>=0.4.0, but no time-domain HRV metrics (SDNN, RMSSD) are calculated in the current implementation.
   - Could add time-domain metrics alongside frequency-domain coherence.

2. **What is the intended deployment target?**
   - Currently requires direct hardware access (no Docker)
   - Manual startup required
   - No session management
   - Designed for single-user research environment?

3. **Is multi-person support planned?**
   - PROJECT_STRUCTURE.md mentions "Multi-person support (2+ Polar H10s)" as future feature
   - Would require significant architectural changes
   - Cross-correlation for interpersonal coherence mentioned

4. **Should time-domain HRV metrics be added?**
   - SDNN and RMSSD would provide additional context
   - Could run alongside coherence calculation
   - Minimal computational overhead

5. **How should sessions be defined and stored?**
   - No current concept of session start/end
   - Service runs continuously
   - Need session management layer?
   - Database choice (SQLite, PostgreSQL, file-based JSON)?

6. **What is the performance under long-running conditions?**
   - No memory leak testing mentioned
   - Buffer size limited (60s window)
   - WebSocket client accumulation?
   - Need stability testing

7. **Is calibration period actually used?**
   - 60-second calibration mode implemented
   - But no baseline calculation or normalization
   - What is calibration intended to establish?

8. **Should breathing guidance be added?**
   - Target frequency documented (0.1 Hz / 6 breaths/min)
   - No active breathing pacer
   - Would improve usability for biofeedback
   - Visual and/or audio guidance?

## Conclusion

The hrv-monitor directory contains a well-architected, functional implementation of a HeartMath coherence monitoring service using the Polar H10 heart rate monitor. The codebase demonstrates good software engineering practices with clear module separation, comprehensive documentation, and a complete signal processing pipeline.

The implementation is **research-quality** and suitable for personal use, experimentation, and integration with visualization systems. The HeartMath coherence algorithm is correctly implemented with proper signal processing steps (resampling, detrending, windowing, FFT, peak detection, ratio calculation).

Key strengths include:
- Clean async/await architecture
- Robust Bluetooth LE handling
- Real-time WebSocket streaming
- Comprehensive configuration
- Excellent documentation

Key limitations include:
- No data persistence
- No unit tests
- No multi-user support
- No session management
- No breathing guidance
- No production-ready features (auth, monitoring, deployment)

The service is ready for research and development use but would require significant additional work for production deployment or commercial use.
