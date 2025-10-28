# Polar H10 Heart Rate Monitor Service

Real-time HeartMath coherence calculation from Polar H10 heart rate monitor data. Streams coherence scores via WebSocket for integration with biometric visualization systems.

> **⚠️ IMPORTANT FOR macOS USERS:** This service must run directly on your Mac host, **NOT inside Docker containers**. Docker Desktop on Mac cannot access Bluetooth hardware. See [DOCKER_NOTE.md](DOCKER_NOTE.md) for details.

## Overview

This service connects to a Polar H10 chest strap heart rate monitor via Bluetooth LE, calculates HeartMath-style coherence scores from RR interval data, and broadcasts the results in real-time via WebSocket.

**Key Features:**
- **Research-grade accuracy**: Polar H10 provides 1000 Hz ECG sampling
- **HeartMath coherence**: Industry-standard coherence ratio algorithm
- **Real-time streaming**: WebSocket server for live visualization
- **Auto-reconnect**: Maintains connection if device disconnects
- **Calibration mode**: Initial baseline collection period
- **Low latency**: <100ms computation time

## Architecture

```
┌─────────────────┐
│   Polar H10     │  1000 Hz ECG → RR intervals
│  (Chest Strap)  │  Bluetooth LE
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  polar_h10.py   │  BLE connection & RR streaming
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ coherence_      │  HeartMath algorithm
│ calculator.py   │  - Resample 4 Hz
└────────┬────────┘  - Detrend
         │           - FFT (256 points)
         │           - Peak detection
         │           - Coherence ratio
         ▼
┌─────────────────┐
│ websocket_      │  Real-time broadcast
│ server.py       │  ws://localhost:8765
└─────────────────┘
         │
         ▼
    [Clients: Coherence Visualization, etc.]
```

## Installation

### Requirements

- Python 3.8+
- Polar H10 heart rate monitor (~$90)
- Bluetooth LE adapter (built-in on most modern computers)

### Setup

```bash
cd /workspace/hrv-monitor

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Configuration

Edit `config/default.yaml` to customize settings:

```yaml
# Polar H10 Connection
polar:
  device_name: "Polar H10"
  auto_reconnect: true

# Coherence Calculation
coherence:
  window_duration: 60      # seconds
  update_interval: 3       # seconds
  min_beats_required: 30   # beats

# WebSocket Server
websocket:
  host: "0.0.0.0"
  port: 8765
```

## Usage

### Starting the Service

```bash
# Activate virtual environment
source venv/bin/activate

# Run the service
python src/main.py
```

### Expected Output

```
2025-10-27 14:23:10 - INFO - Starting HRV Monitor Service
2025-10-27 14:23:10 - INFO - Connecting to Polar H10...
2025-10-27 14:23:15 - INFO - Found Polar H10 at AA:BB:CC:DD:EE:FF
2025-10-27 14:23:16 - INFO - Connected to Polar H10
2025-10-27 14:23:16 - INFO - ✓ Polar H10 connected
2025-10-27 14:23:16 - INFO - Starting WebSocket server...
2025-10-27 14:23:16 - INFO - ✓ Service running
2025-10-27 14:23:16 - INFO - WebSocket server: ws://0.0.0.0:8765
2025-10-27 14:23:16 - INFO - Calibration mode: 60s
2025-10-27 14:23:46 - INFO - Calibration complete
2025-10-27 14:23:50 - INFO - Coherence: 67/100 (ratio=3.45, peak=0.098 Hz, beats=48)
```

### Wearing the Polar H10

1. **Moisten electrodes**: Wet the electrode areas on the strap
2. **Wear snugly**: Position just below chest muscles
3. **Power on**: LEDs will flash red (pairing mode)
4. **Stay still**: During calibration period (~60s)

## WebSocket API

### Connection

Connect to `ws://localhost:8765`

### Message Types

#### 1. Initial State (on connection)

```json
{
  "type": "initial_state",
  "connection_status": {
    "polar_h10_connected": true,
    "device_name": "Polar H10"
  },
  "latest_coherence": {...},
  "buffer_status": {...}
}
```

#### 2. Coherence Update (every 3s)

```json
{
  "type": "coherence_update",
  "timestamp": 1698425630.123,
  "data": {
    "status": "valid",
    "coherence": 67,           // 0-100 score
    "ratio": 3.45,             // Raw coherence ratio
    "peak_frequency": 0.098,   // Hz (dominant frequency)
    "peak_power": 1234.5,      // Power in peak window
    "total_power": 2345.6,     // Total power in coherence range
    "beats_used": 48           // Number of beats in calculation
  }
}
```

#### 3. Buffer Status

```json
{
  "type": "buffer_status",
  "timestamp": 1698425630.123,
  "data": {
    "beats_in_buffer": 48,
    "min_beats_required": 30,
    "buffer_ready": true,
    "mean_heart_rate": 68.5,
    "buffer_duration_seconds": 59.2
  }
}
```

#### 4. Connection Status

```json
{
  "type": "connection_status",
  "timestamp": 1698425630.123,
  "data": {
    "polar_h10_connected": true,
    "device_name": "Polar H10",
    "device_address": "AA:BB:CC:DD:EE:FF"
  }
}
```

## Integration with Coherence Visualization

### Mapping Coherence Score to Visualization

The coherence score (0-100) can be mapped to the coherence visualization's level (-1.0 to +1.0):

```javascript
// In your visualization client
function mapScoreToCoherenceLevel(score) {
  // 0-33: Low coherence → -1.0 to -0.33 (repulsion)
  // 33-67: Medium coherence → -0.33 to +0.33 (neutral)
  // 67-100: High coherence → +0.33 to +1.0 (attraction)

  return (score / 50) - 1.0;  // Linear mapping
}

// WebSocket client
const ws = new WebSocket('ws://localhost:8765');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'coherence_update') {
    const score = message.data.coherence;
    const coherenceLevel = mapScoreToCoherenceLevel(score);

    // Update your coherence visualization
    updateCoherenceVisualization(coherenceLevel);
  }
};
```

### Example Client (HTML/JavaScript)

```html
<!DOCTYPE html>
<html>
<head>
  <title>HRV Monitor Client</title>
</head>
<body>
  <h1>Coherence Score: <span id="score">--</span></h1>
  <p>Peak Frequency: <span id="peak">--</span> Hz</p>
  <p>Heart Rate: <span id="hr">--</span> bpm</p>

  <script>
    const ws = new WebSocket('ws://localhost:8765');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'coherence_update') {
        const data = message.data;
        document.getElementById('score').textContent = data.coherence;
        document.getElementById('peak').textContent =
          data.peak_frequency.toFixed(3);
      }

      if (message.type === 'buffer_status') {
        const data = message.data;
        document.getElementById('hr').textContent =
          data.mean_heart_rate.toFixed(1);
      }
    };

    ws.onopen = () => console.log('Connected to HRV Monitor');
    ws.onerror = (error) => console.error('WebSocket error:', error);
  </script>
</body>
</html>
```

## HeartMath Coherence Algorithm

### What is Coherence?

Coherence is a state of **physiological synchronization** where heart rate variability (HRV) shows a smooth, sine-wave-like pattern. This typically occurs during:

- Deep breathing (6 breaths/minute)
- Meditation
- Positive emotional states
- Focused attention

### Coherence Ratio Formula

```
CR = Peak Power / (Total Power - Peak Power)
```

**Where:**
- **Peak Power**: PSD integrated over ±0.015 Hz window around dominant frequency
- **Total Power**: PSD integrated over 0.04-0.26 Hz range (coherence band)

### Scoring (0-100)

| Score | Level | Coherence Ratio | Description |
|-------|-------|-----------------|-------------|
| 0-33 | Low | < 0.9 | Chaotic, irregular HRV |
| 33-67 | Medium | 0.9 - 7.0 | Some rhythmic patterns |
| 67-100 | High | > 7.0 | Strong sine-wave pattern |

### Target Frequency

The "resonant frequency" is typically around **0.1 Hz** (6 breaths per minute), where:
- Respiratory sinus arrhythmia
- Baroreflex feedback
- Heart rate oscillations

...all synchronize for maximum coherence.

## Troubleshooting

### Polar H10 Not Found

**Problem**: Service can't find Polar H10 during scan

**Solutions:**
1. Make sure Polar H10 is powered on (LEDs flashing)
2. Moisten electrode areas
3. Wear strap snugly on chest
4. Check Bluetooth is enabled on computer
5. Try removing and reseating the sensor module
6. Replace battery (CR2025 coin cell)

### Low Coherence Scores

**Problem**: Coherence scores remain in 0-33 range

**Possible causes:**
- **Normal resting state**: Low coherence is normal during regular breathing
- **Movement**: Physical activity reduces coherence
- **Poor electrode contact**: Moisten strap electrodes
- **Too soon**: Wait for 60s calibration period

**Try:**
- Coherent breathing: 6 breaths/minute (5s inhale, 5s exhale)
- Sit still and relax
- Focus on heart/chest area
- Visualize smooth, rhythmic breathing

### Connection Drops

**Problem**: Polar H10 disconnects frequently

**Solutions:**
- Check battery level
- Reduce distance to computer (<10 meters)
- Remove interference sources (other Bluetooth devices)
- Enable auto-reconnect in config

## Technical Specifications

### Polar H10

- **ECG Sampling**: 1000 Hz (internal)
- **RR Interval Precision**: 1 ms
- **Bluetooth**: 5.0 (LE + Classic)
- **ANT+**: Yes (for multi-device)
- **Battery**: CR2025 (400 hours)
- **Accuracy**: R² > 0.99 vs medical ECG
- **Range**: ~10 meters

### Algorithm Performance

- **Window Duration**: 60 seconds (45-60 recommended)
- **Minimum Beats**: 30 (at rest ~60 bpm)
- **Update Frequency**: Every 3-5 seconds
- **Computation Time**: 15-25 ms
- **Total Latency**: < 100 ms
- **Memory Usage**: ~50 MB

### Data Requirements

- **Minimum**: 30 seconds, ~25 beats
- **Recommended**: 60 seconds, ~50 beats
- **FFT Size**: 256 points
- **Resampling**: 4 Hz (linear interpolation)

## Research References

- HeartMath Institute - Coherence Research
- McCraty, R., & Shaffer, F. (2015). Heart Rate Variability: New Perspectives on Physiological Mechanisms
- Polar H10 Validation Studies (multiple peer-reviewed publications)
- Task Force of the European Society of Cardiology (1996). Heart rate variability standards

## License

MIT License - see LICENSE file for details

## Support

For issues related to:
- **Polar H10 hardware**: Contact Polar Support
- **This service**: Create an issue in the repository
- **HeartMath algorithm**: See research documentation in `/workspace/coherence/docs/research/`
