# HRV Monitor Project Structure

Complete Polar H10 heart rate monitoring service for HeartMath coherence calculation.

## Directory Layout

```
hrv-monitor/
├── config/
│   └── default.yaml              # Configuration settings
│
├── src/
│   ├── main.py                   # Main application entry point
│   ├── polar_h10.py              # Polar H10 Bluetooth LE interface
│   ├── coherence_calculator.py   # HeartMath coherence algorithm
│   └── websocket_server.py       # Real-time data streaming
│
├── docs/                         # (empty - future documentation)
├── tests/                        # (empty - future unit tests)
├── logs/                         # Application logs (auto-generated)
│
├── requirements.txt              # Python dependencies
├── README.md                     # Complete documentation
├── QUICKSTART.md                 # 5-minute setup guide
├── PROJECT_STRUCTURE.md          # This file
└── test_client.html              # WebSocket test client (browser)
```

## Core Components

### 1. **main.py** (Entry Point)
- Orchestrates all components
- Manages service lifecycle
- Handles configuration loading
- Coordinates periodic updates

**Key Class**: `HRVMonitorService`

### 2. **polar_h10.py** (Hardware Interface)
- Connects to Polar H10 via Bluetooth LE
- Parses heart rate measurement notifications
- Extracts RR intervals from ECG data
- Implements auto-reconnect logic

**Key Class**: `PolarH10`

**Bluetooth Services Used**:
- Heart Rate Service: `0000180d-0000-1000-8000-00805f9b34fb`
- Heart Rate Measurement: `00002a37-0000-1000-8000-00805f9b34fb`

### 3. **coherence_calculator.py** (Algorithm)
- Implements HeartMath coherence ratio
- Manages RR interval buffer
- Performs signal processing:
  - Resampling (4 Hz)
  - Detrending (linear)
  - Windowing (Hanning)
  - FFT (256 points)
  - Peak detection
  - Coherence scoring

**Key Class**: `CoherenceCalculator`

**Algorithm**: `CR = Peak Power / (Total Power - Peak Power)`

### 4. **websocket_server.py** (Streaming)
- WebSocket server on port 8765
- Broadcasts real-time coherence data
- Manages multiple client connections
- Handles CORS for web clients

**Key Class**: `CoherenceWebSocketServer`

## Data Flow

```
Polar H10 (ECG @ 1000 Hz)
    ↓
[Bluetooth LE: Heart Rate Service]
    ↓
polar_h10.py → RR intervals (ms)
    ↓
coherence_calculator.py
    ├─ Resample to 4 Hz
    ├─ Detrend
    ├─ Hanning window
    ├─ FFT (256 points)
    ├─ Find peak (0.04-0.26 Hz)
    └─ Calculate ratio → Score (0-100)
    ↓
websocket_server.py
    ↓
[WebSocket: ws://localhost:8765]
    ↓
Clients (visualization, test client, etc.)
```

## Configuration

**File**: `config/default.yaml`

### Key Settings

```yaml
polar:
  device_name: "Polar H10"
  auto_reconnect: true

coherence:
  window_duration: 60      # seconds
  update_interval: 3       # seconds between updates
  min_beats_required: 30   # minimum for calculation
  resample_rate: 4         # Hz
  fft_size: 256           # samples

websocket:
  host: "0.0.0.0"
  port: 8765
```

## Dependencies

**File**: `requirements.txt`

### Core Libraries
- **systole** - Polar H10 connection & HRV analysis
- **pyhrv** - Additional HRV tools
- **numpy** - Numerical computing
- **scipy** - Signal processing (FFT, detrending)
- **websockets** - WebSocket server
- **bleak** - Bluetooth LE (alternative to systole)
- **pyyaml** - Configuration loading

## WebSocket API

### Message Types

1. **coherence_update** - Every 3 seconds
   ```json
   {
     "type": "coherence_update",
     "data": {
       "coherence": 67,
       "ratio": 3.45,
       "peak_frequency": 0.098,
       "status": "valid"
     }
   }
   ```

2. **buffer_status** - Buffer statistics
   ```json
   {
     "type": "buffer_status",
     "data": {
       "beats_in_buffer": 48,
       "buffer_ready": true,
       "mean_heart_rate": 68.5
     }
   }
   ```

3. **connection_status** - Polar H10 status
   ```json
   {
     "type": "connection_status",
     "data": {
       "polar_h10_connected": true,
       "device_name": "Polar H10"
     }
   }
   ```

## Usage

### Start Service
```bash
cd /workspace/hrv-monitor
source venv/bin/activate
python src/main.py
```

### Test Client
```bash
open test_client.html  # Opens in browser
```

### Connect from JavaScript
```javascript
const ws = new WebSocket('ws://localhost:8765');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'coherence_update') {
    console.log('Coherence:', msg.data.coherence);
  }
};
```

## Integration with Coherence Visualization

The service outputs coherence scores (0-100) which can be mapped to the existing coherence visualization's level parameter (-1.0 to +1.0):

```javascript
// Map score to visualization level
function scoreToLevel(score) {
  return (score / 50) - 1.0;
}

// 0 → -1.0 (full repulsion)
// 50 → 0.0 (neutral)
// 100 → +1.0 (full coherence)
```

## Future Enhancements

### Planned Features
- [ ] Unit tests in `tests/` directory
- [ ] Multi-person support (2+ Polar H10s)
- [ ] Cross-correlation for interpersonal coherence
- [ ] REST API alongside WebSocket
- [ ] Data recording/playback
- [ ] Web dashboard UI
- [ ] Docker containerization

### Integration Points
- `/workspace/coherence/` - Existing biometric visualization
- `/workspace/flocking/` - Koi simulation (potential audio reactivity)
- `/workspace/portfolio/` - Project showcase

## Research Documentation

Related research in main project:
- `/workspace/coherence/docs/research/HRV_COHERENCE_ALGORITHM_RESEARCH.md`
- `/workspace/coherence/docs/research/COHERENCE_IMPLEMENTATION_QUICKSTART.md`
- `/workspace/coherence/docs/research/ECG_R_PEAK_DETECTION_RESEARCH_REPORT.md`

## License

MIT License

## Author

Sean Kim
Portfolio: `/workspace/portfolio/`
Project: Biometric Coherence Art Installation
