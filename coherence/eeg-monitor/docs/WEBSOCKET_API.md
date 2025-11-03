# WebSocket API Documentation

**EEG Neurofeedback Monitor - WebSocket Protocol Specification**

Version: 1.0
Last Updated: 2025-11-03

---

## Overview

The EEG Monitor exposes a WebSocket server on port **8766** for real-time streaming of:
- Protocol coherence scores and metrics
- Raw EEG band powers (delta, theta, alpha, beta, gamma)
- Signal processor buffer status
- Muse headset connection status
- Baseline calibration progress

## Connection

### Server URL

```
ws://localhost:8766
```

### Security Limits

- **Maximum clients**: 10 simultaneous connections
- **Rate limit**: 10 messages per second per client
- **Message size limit**: 1024 bytes

Exceeding these limits will result in disconnection with appropriate WebSocket close codes.

---

## Message Types

All messages are JSON-encoded with a `type` field indicating the message type.

### Server → Client Messages

#### 1. Initial State

Sent immediately upon connection. Contains current system state.

```json
{
  "type": "initial_state",
  "timestamp": 1698765432.123,
  "connection_status": {
    "muse_connected": true,
    "device_name": "Muse-1234",
    "current_protocol": "alpha_enhancement",
    "baseline_calibrated": false
  },
  "latest_coherence": {
    "protocol": "alpha_enhancement",
    "score": 67.5,
    "direction": "higher",
    "feedback_level": "good",
    "details": {...}
  },
  "latest_eeg_update": {
    "delta": 10.5,
    "theta": 15.2,
    "alpha": 45.8,
    ...
  },
  "buffer_status": {
    "ready": true,
    "window_size": 512,
    ...
  },
  "baseline_progress": null
}
```

#### 2. Coherence Update

Protocol-specific coherence score and metrics. Sent approximately once per second.

```json
{
  "type": "coherence_update",
  "timestamp": 1698765432.123,
  "data": {
    "protocol": "alpha_enhancement",
    "score": 67.5,
    "direction": "higher",
    "feedback_level": "good",
    "details": {
      "alpha_power": 45.2,
      "baseline": 32.1
    },
    "timestamp": 1698765432.120,
    "calculation_number": 42,
    "signal_quality": "good"
  }
}
```

**Fields:**
- `protocol`: Name of active protocol
- `score`: 0-100 neurofeedback score
- `direction`: "higher", "lower", or "balanced" (training direction)
- `feedback_level`: "low", "medium", "good", or "excellent"
- `details`: Protocol-specific data (varies by protocol)
- `signal_quality`: "good", "fair", "poor", or "unknown"

**Protocol-Specific Details:**

**Alpha Enhancement:**
```json
"details": {
  "alpha_power": 45.2,
  "baseline": 32.1
}
```

**Theta/Beta Ratio:**
```json
"details": {
  "theta_power": 15.5,
  "beta_power": 28.3,
  "ratio": 0.55,
  "target": 1.5
}
```

**Alpha Asymmetry:**
```json
"details": {
  "left_alpha": 42.1,
  "right_alpha": 48.3,
  "asymmetry": 0.14,
  "dominant_hemisphere": "right"
}
```

#### 3. EEG Update

Raw EEG band powers. Sent approximately once per second.

```json
{
  "type": "eeg_update",
  "timestamp": 1698765432.123,
  "data": {
    "delta": 10.5,
    "theta": 15.2,
    "alpha": 45.8,
    "beta": 28.3,
    "gamma": 12.1,
    "channels": {
      "TP9": {
        "delta": 10.2,
        "theta": 14.8,
        "alpha": 44.1,
        "beta": 27.9,
        "gamma": 11.8
      },
      "AF7": {
        "delta": 10.1,
        "theta": 15.0,
        "alpha": 46.5,
        "beta": 28.2,
        "gamma": 12.3
      },
      "AF8": {
        "delta": 10.8,
        "theta": 15.7,
        "alpha": 46.2,
        "beta": 28.9,
        "gamma": 12.4
      },
      "TP10": {
        "delta": 10.9,
        "theta": 15.3,
        "alpha": 46.4,
        "beta": 28.2,
        "gamma": 12.0
      }
    },
    "artifacts": {
      "eye_blink": false,
      "jaw_clench": false,
      "movement": false,
      "signal_quality": "good",
      "details": {
        "max_amplitude": 45.2,
        "mean_variance": 12.3,
        "peak_to_peak": 85.7
      }
    },
    "timestamp": 1698765432.120
  }
}
```

**Fields:**
- Top-level band powers: Average across all 4 channels (µV²)
- `channels`: Per-channel band powers
- `artifacts`: Artifact detection results

#### 4. Buffer Status

Signal processor buffer statistics. Sent every ~5 seconds.

```json
{
  "type": "buffer_status",
  "timestamp": 1698765432.123,
  "data": {
    "ready": true,
    "window_size": 512,
    "channels": {
      "TP9": {
        "samples": 512,
        "ready": true,
        "fill_percent": 100.0
      },
      "AF7": {
        "samples": 512,
        "ready": true,
        "fill_percent": 100.0
      },
      "AF8": {
        "samples": 512,
        "ready": true,
        "fill_percent": 100.0
      },
      "TP10": {
        "samples": 512,
        "ready": true,
        "fill_percent": 100.0
      }
    }
  }
}
```

#### 5. Connection Status

Muse headset connection events.

```json
{
  "type": "connection_status",
  "timestamp": 1698765432.123,
  "data": {
    "muse_connected": true,
    "device_name": "Muse-1234",
    "current_protocol": "alpha_enhancement",
    "baseline_calibrated": false
  }
}
```

#### 6. Baseline Progress

Baseline calibration progress updates.

```json
{
  "type": "baseline_progress",
  "timestamp": 1698765432.123,
  "data": {
    "state": "calibrating",
    "samples_collected": 30,
    "samples_required": 60,
    "percent_complete": 50.0
  }
}
```

**States:**
- `"idle"`: No calibration in progress
- `"calibrating"`: Collecting baseline samples
- `"complete"`: Calibration finished successfully

When complete:
```json
{
  "type": "baseline_progress",
  "timestamp": 1698765432.123,
  "data": {
    "state": "complete",
    "samples_collected": 60,
    "samples_required": 60,
    "percent_complete": 100.0,
    "baseline_values": {
      "delta": 10.2,
      "theta": 14.5,
      "alpha": 32.1,
      "beta": 25.8,
      "gamma": 11.2,
      "sample_count": 60
    }
  }
}
```

#### 7. Protocol Switched

Confirmation of protocol switch.

```json
{
  "type": "protocol_switched",
  "timestamp": 1698765432.123,
  "data": {
    "protocol": "theta_beta_ratio",
    "success": true,
    "message": "Switched to Theta/Beta Ratio"
  }
}
```

If switch fails:
```json
{
  "type": "protocol_switched",
  "timestamp": 1698765432.123,
  "data": {
    "protocol": "invalid_protocol",
    "success": false,
    "message": "Error: Unknown protocol: 'invalid_protocol'"
  }
}
```

---

### Client → Server Commands

#### 1. Ping

Keep-alive check.

**Send:**
```json
{
  "type": "ping"
}
```

**Receive:**
```json
{
  "type": "pong",
  "timestamp": 1698765432.123
}
```

#### 2. Request Status

Get current system state.

**Send:**
```json
{
  "type": "request_status"
}
```

**Receive:**
```json
{
  "type": "status",
  "timestamp": 1698765432.123,
  "connection_status": {
    "muse_connected": true,
    "device_name": "Muse-1234",
    "current_protocol": "alpha_enhancement",
    "baseline_calibrated": false
  },
  "buffer_status": {
    "ready": true,
    "window_size": 512,
    ...
  },
  "connected_clients": 3
}
```

#### 3. Switch Protocol

Change active neurofeedback protocol.

**Send:**
```json
{
  "type": "switch_protocol",
  "protocol": "theta_beta_ratio"
}
```

**Valid protocols:**
- `"alpha_enhancement"`
- `"theta_beta_ratio"`
- `"alpha_asymmetry"`
- `"theta_enhancement"`
- `"beta_enhancement"`

**Receive:**
```json
{
  "type": "protocol_switch_requested",
  "protocol": "theta_beta_ratio",
  "timestamp": 1698765432.123
}
```

Then wait for `protocol_switched` message with result.

#### 4. Start Baseline Calibration

Begin baseline calibration.

**Send:**
```json
{
  "type": "start_baseline"
}
```

**Receive:**
```json
{
  "type": "baseline_start_requested",
  "timestamp": 1698765432.123
}
```

Then watch for `baseline_progress` messages.

#### 5. Finish Baseline Calibration

Complete baseline calibration.

**Send:**
```json
{
  "type": "finish_baseline"
}
```

**Receive:**
```json
{
  "type": "baseline_finish_requested",
  "timestamp": 1698765432.123
}
```

Then watch for final `baseline_progress` message with `state: "complete"`.

---

## Connection Flow

### 1. Initial Connection

```
Client                          Server
  |                               |
  |--- WebSocket Connect -------> |
  |                               |
  | <--- initial_state ---------- |
  |                               |
```

### 2. Normal Operation

```
Client                          Server
  |                               |
  | <--- coherence_update ------- | (every ~1s)
  | <--- eeg_update ------------- | (every ~1s)
  | <--- buffer_status ---------- | (every ~5s)
  |                               |
```

### 3. Protocol Switching

```
Client                          Server
  |                               |
  |--- switch_protocol ---------> |
  |                               |
  | <--- protocol_switch_req ---- |
  |                               |
  | <--- protocol_switched ------ |
  | <--- connection_status ------ |
  |                               |
```

### 4. Baseline Calibration

```
Client                          Server
  |                               |
  |--- start_baseline ----------> |
  |                               |
  | <--- baseline_start_req ----- |
  | <--- baseline_progress ------ | (periodic)
  | <--- baseline_progress ------ | (50% complete)
  | <--- baseline_progress ------ | (100% complete)
  | <--- connection_status ------ |
  |                               |
```

---

## JavaScript Client Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>EEG Monitor Client</title>
</head>
<body>
  <h1>EEG Neurofeedback Monitor</h1>

  <div id="status">Disconnected</div>
  <div id="protocol">Protocol: Unknown</div>
  <div id="score">Score: --</div>
  <div id="feedback">Feedback: --</div>
  <div id="alpha">Alpha: --</div>
  <div id="signal">Signal: --</div>

  <button onclick="switchProtocol('theta_beta_ratio')">
    Switch to Theta/Beta
  </button>
  <button onclick="startBaseline()">Start Baseline</button>

  <script>
    // Connect to WebSocket server
    const ws = new WebSocket('ws://localhost:8766');

    ws.onopen = () => {
      console.log('Connected to EEG Monitor');
      document.getElementById('status').textContent = 'Connected';
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'initial_state':
          handleInitialState(message);
          break;

        case 'coherence_update':
          handleCoherenceUpdate(message.data);
          break;

        case 'eeg_update':
          handleEEGUpdate(message.data);
          break;

        case 'connection_status':
          handleConnectionStatus(message.data);
          break;

        case 'baseline_progress':
          handleBaselineProgress(message.data);
          break;

        case 'protocol_switched':
          handleProtocolSwitched(message.data);
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('Disconnected from EEG Monitor');
      document.getElementById('status').textContent = 'Disconnected';
    };

    function handleInitialState(message) {
      if (message.connection_status) {
        handleConnectionStatus(message.connection_status);
      }
      if (message.latest_coherence) {
        handleCoherenceUpdate(message.latest_coherence);
      }
    }

    function handleCoherenceUpdate(data) {
      document.getElementById('score').textContent =
        `Score: ${data.score.toFixed(1)}`;
      document.getElementById('feedback').textContent =
        `Feedback: ${data.feedback_level}`;
    }

    function handleEEGUpdate(data) {
      document.getElementById('alpha').textContent =
        `Alpha: ${data.alpha.toFixed(1)} µV²`;
      document.getElementById('signal').textContent =
        `Signal: ${data.artifacts.signal_quality}`;
    }

    function handleConnectionStatus(data) {
      document.getElementById('protocol').textContent =
        `Protocol: ${data.current_protocol || 'Unknown'}`;
    }

    function handleBaselineProgress(data) {
      console.log(`Baseline: ${data.state} - ${data.percent_complete}%`);
    }

    function handleProtocolSwitched(data) {
      if (data.success) {
        console.log(`Switched to ${data.protocol}`);
      } else {
        console.error(`Failed to switch: ${data.message}`);
      }
    }

    function switchProtocol(protocolName) {
      ws.send(JSON.stringify({
        type: 'switch_protocol',
        protocol: protocolName
      }));
    }

    function startBaseline() {
      ws.send(JSON.dumps({
        type: 'start_baseline'
      }));
    }

    // Keep-alive ping every 30 seconds
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  </script>
</body>
</html>
```

---

## Error Handling

### WebSocket Close Codes

- **1000**: Normal closure
- **1008**: Policy violation (rate limit exceeded, server full)
- **1009**: Message too large (>1024 bytes)

### Error Responses

The server handles errors gracefully:
- Invalid JSON is logged and ignored (connection stays open)
- Unknown message types are logged and ignored
- Command errors are logged server-side

---

## Testing

### Using `wscat`

```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c ws://localhost:8766

# Send commands
> {"type": "ping"}
< {"type": "pong", "timestamp": 1698765432.123}

> {"type": "request_status"}
< {"type": "status", ...}

> {"type": "switch_protocol", "protocol": "theta_beta_ratio"}
< {"type": "protocol_switch_requested", ...}
```

### Using Python

```python
import asyncio
import websockets
import json

async def test_client():
    uri = "ws://localhost:8766"

    async with websockets.connect(uri) as websocket:
        # Receive initial state
        initial = await websocket.recv()
        print(json.dumps(json.loads(initial), indent=2))

        # Send ping
        await websocket.send(json.dumps({"type": "ping"}))
        pong = await websocket.recv()
        print(json.loads(pong))

        # Listen for updates
        while True:
            message = await websocket.recv()
            data = json.loads(message)
            print(f"{data['type']}: {data.get('data', {})}")

asyncio.run(test_client())
```

---

## Performance Considerations

### Message Frequency

- `coherence_update`: ~1 Hz (configurable via `update_interval`)
- `eeg_update`: ~1 Hz (same as coherence)
- `buffer_status`: ~0.2 Hz (every 5 seconds)
- `connection_status`: Event-driven (on changes)
- `baseline_progress`: ~1 Hz during calibration

### Bandwidth

Typical bandwidth per client:
- Coherence update: ~200 bytes/s
- EEG update: ~400 bytes/s
- Buffer status: ~80 bytes/s (amortized)
- **Total**: ~680 bytes/s per client

With 10 clients: ~6.8 KB/s total server bandwidth

---

## Security Notes

1. **No authentication**: This server is intended for local use only
2. **CORS**: Configured to allow all origins by default
3. **Rate limiting**: Prevents client flooding
4. **Max clients**: Prevents resource exhaustion
5. **Message size**: Prevents memory attacks

**For production use**, add:
- TLS/WSS encryption
- Authentication tokens
- Stricter CORS policy
- Additional input validation

---

## Version History

- **v1.0** (2025-11-03): Initial WebSocket API specification
  - Support for all 5 neurofeedback protocols
  - Real-time EEG streaming
  - Baseline calibration
  - Protocol switching
  - Full bidirectional communication

---

## Support

For issues or questions:
- Check server logs for errors
- Verify Muse headset is connected (`muselsl stream`)
- Test with `wscat` or Python client
- Review signal quality indicators
- Check protocol-specific requirements

## See Also

- `/workspace/coherence/eeg-monitor/README.md` - System overview
- `/workspace/coherence/eeg-monitor/config/default.yaml` - Configuration
- `/workspace/coherence/eeg-monitor/config/protocols.yaml` - Protocol details
