# WebSocket Protocol Specification

**Service**: EEG Neurofeedback Monitor
**Port**: 8766
**Protocol**: WebSocket (RFC 6455)

---

## Overview

The EEG Monitor WebSocket server streams real-time neurofeedback data to browser clients. It provides:

- Protocol-specific neurofeedback metrics (0-100 scores)
- Raw frequency band powers (delta, theta, alpha, beta, gamma)
- Optional raw EEG waveforms
- Connection and signal quality status
- Multi-client support with rate limiting

---

## Connection

### Endpoint

```
ws://localhost:8766
```

### Connection Flow

1. Client initiates WebSocket connection
2. Server validates (checks max clients limit)
3. Server sends `initial_state` message with current data
4. Server begins streaming updates
5. Client can send control messages (ping, request_status, etc.)

### Example (JavaScript)

```javascript
const ws = new WebSocket('ws://localhost:8766');

ws.onopen = () => {
    console.log('Connected to EEG Monitor');
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleMessage(message);
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

ws.onclose = () => {
    console.log('Disconnected from EEG Monitor');
};
```

---

## Message Types

All messages are JSON objects with a `type` field indicating the message type.

### Server → Client Messages

#### 1. Initial State

Sent immediately upon connection to provide current system state.

```json
{
  "type": "initial_state",
  "timestamp": 1698765432.123,
  "connection_status": {
    "muse_connected": true,
    "device_name": "Muse-ABCD",
    "signal_quality": "good"
  },
  "current_protocol": "alpha_enhancement",
  "latest_metrics": {
    "score": 67.5,
    "direction": "higher",
    "feedback_level": "good",
    "details": {}
  },
  "latest_band_powers": {
    "delta": 45.2,
    "theta": 32.1,
    "alpha": 67.5,
    "beta": 28.3,
    "gamma": 12.4
  }
}
```

#### 2. Protocol Metric Update

Real-time neurofeedback score for the active protocol.

```json
{
  "type": "protocol_metric",
  "timestamp": 1698765432.123,
  "protocol": "alpha_enhancement",
  "score": 67.5,
  "direction": "higher",
  "feedback_level": "good",
  "details": {
    "alpha_power": 67.5,
    "baseline": 52.3,
    "relative_increase": 29.1
  }
}
```

**Fields:**
- `score`: 0-100 normalized score
- `direction`: One of:
  - `"higher"` - Higher values are better (alpha, theta, beta enhancement)
  - `"lower"` - Lower values are better (theta/beta ratio)
  - `"balanced"` - Balance around target is best (alpha asymmetry)
- `feedback_level`: One of `"low"`, `"medium"`, `"good"`, `"excellent"`
- `details`: Protocol-specific additional data

#### 3. Band Powers Update

Raw frequency band power values.

```json
{
  "type": "band_powers",
  "timestamp": 1698765432.123,
  "powers": {
    "delta": 45.2,
    "theta": 32.1,
    "alpha": 67.5,
    "beta": 28.3,
    "gamma": 12.4
  },
  "channels": {
    "TP9": {
      "delta": 43.1,
      "theta": 30.5,
      "alpha": 65.1,
      "beta": 30.2,
      "gamma": 11.8
    },
    "AF7": {
      "delta": 46.8,
      "theta": 33.2,
      "alpha": 68.9,
      "beta": 26.4,
      "gamma": 13.1
    },
    "AF8": {
      "delta": 44.5,
      "theta": 31.8,
      "alpha": 66.2,
      "beta": 27.9,
      "gamma": 12.0
    },
    "TP10": {
      "delta": 46.5,
      "theta": 32.9,
      "alpha": 69.8,
      "beta": 28.7,
      "gamma": 12.6
    }
  },
  "total_power": 185.5,
  "relative_powers": {
    "delta": 24.4,
    "theta": 17.3,
    "alpha": 36.4,
    "beta": 15.3,
    "gamma": 6.6
  }
}
```

**Fields:**
- `powers`: Average power across all channels (arbitrary units)
- `channels`: Per-channel breakdown (Muse 2: TP9, AF7, AF8, TP10)
- `total_power`: Sum of all band powers
- `relative_powers`: Each band as percentage of total

#### 4. EEG Waveform (Optional)

Raw EEG time-series data. **High bandwidth** - disabled by default.

```json
{
  "type": "eeg_waveform",
  "timestamp": 1698765432.123,
  "sample_rate": 256,
  "channels": {
    "TP9": [12.3, 11.8, 12.1, ...],
    "AF7": [15.2, 14.9, 15.1, ...],
    "AF8": [14.8, 15.1, 14.7, ...],
    "TP10": [13.1, 12.9, 13.2, ...]
  },
  "samples_per_channel": 256,
  "duration_ms": 1000
}
```

**Note:** Only enabled when `websocket.stream_raw_waveform: true` in config.

#### 5. Connection Status

Muse headset connection and signal quality updates.

```json
{
  "type": "connection_status",
  "timestamp": 1698765432.123,
  "muse_connected": true,
  "device_name": "Muse-ABCD",
  "device_address": "00:55:DA:B0:AB:CD",
  "signal_quality": "good",
  "channel_quality": {
    "TP9": "good",
    "AF7": "excellent",
    "AF8": "good",
    "TP10": "fair"
  },
  "battery_level": 85,
  "uptime_seconds": 342
}
```

**Signal Quality Values:**
- `"excellent"` - Strong, clean signal
- `"good"` - Adequate for neurofeedback
- `"fair"` - Usable but noisy
- `"poor"` - Poor electrode contact or artifacts
- `"disconnected"` - No signal

#### 6. Error Message

Errors, warnings, or important system events.

```json
{
  "type": "error",
  "timestamp": 1698765432.123,
  "severity": "warning",
  "code": "SIGNAL_QUALITY_POOR",
  "message": "Poor signal quality on AF7. Check electrode contact.",
  "details": {
    "channel": "AF7",
    "quality": "poor"
  }
}
```

**Severity Levels:**
- `"info"` - Informational
- `"warning"` - Issue but operation continues
- `"error"` - Serious error, functionality impaired
- `"critical"` - Critical failure, service stopped

---

### Client → Server Messages

#### 1. Ping

Keep-alive and latency check.

```json
{
  "type": "ping"
}
```

**Response:**
```json
{
  "type": "pong",
  "timestamp": 1698765432.123
}
```

#### 2. Request Status

Get current system status.

```json
{
  "type": "request_status"
}
```

**Response:**
```json
{
  "type": "status",
  "timestamp": 1698765432.123,
  "connection_status": {...},
  "current_protocol": "alpha_enhancement",
  "buffer_status": {
    "samples_available": 512,
    "buffer_fullness": 0.75,
    "oldest_sample_age_ms": 2000
  },
  "connected_clients": 2
}
```

#### 3. Switch Protocol

Change the active neurofeedback protocol.

```json
{
  "type": "switch_protocol",
  "protocol": "theta_beta_ratio"
}
```

**Response:**
```json
{
  "type": "protocol_switched",
  "timestamp": 1698765432.123,
  "protocol": "theta_beta_ratio",
  "success": true
}
```

**Error Response:**
```json
{
  "type": "error",
  "timestamp": 1698765432.123,
  "severity": "error",
  "code": "INVALID_PROTOCOL",
  "message": "Unknown protocol: 'invalid_name'",
  "details": {
    "requested": "invalid_name",
    "available": ["alpha_enhancement", "theta_beta_ratio", ...]
  }
}
```

#### 4. Set Baseline

Capture current band powers as baseline for relative scoring.

```json
{
  "type": "set_baseline",
  "duration": 60
}
```

Server will collect `duration` seconds of data, then respond:

```json
{
  "type": "baseline_set",
  "timestamp": 1698765432.123,
  "success": true,
  "baseline": {
    "delta": 45.2,
    "theta": 32.1,
    "alpha": 67.5,
    "beta": 28.3,
    "gamma": 12.4
  }
}
```

#### 5. Clear Baseline

Revert to absolute scoring.

```json
{
  "type": "clear_baseline"
}
```

**Response:**
```json
{
  "type": "baseline_cleared",
  "timestamp": 1698765432.123,
  "success": true
}
```

---

## Data Flow Example

```
Browser Client                  WebSocket Server                Muse 2
     |                                 |                           |
     |--- Connect -------------------->|                           |
     |<-- initial_state ---------------|                           |
     |                                 |<-- EEG samples ------------|
     |                                 |                           |
     |                                 |-- Process FFT ----------->|
     |                                 |-- Calculate bands ------->|
     |<-- band_powers -----------------|                           |
     |                                 |                           |
     |                                 |-- Calculate protocol ---->|
     |<-- protocol_metric -------------|                           |
     |                                 |                           |
     |--- switch_protocol ------------>|                           |
     |<-- protocol_switched ------------|                           |
     |<-- protocol_metric -------------|  (new protocol)           |
     |                                 |                           |
```

---

## Rate Limiting and Security

### Client Limits

- **Max clients**: 10 simultaneous connections
- **Max message size**: 1024 bytes
- **Max message rate**: 10 messages/second per client

Exceeding limits results in connection closure with appropriate WebSocket close code.

### CORS Origins

Configured in `config/default.yaml`:

```yaml
websocket:
  cors_origins:
    - "http://localhost:3000"
    - "http://localhost:5500"
```

Only listed origins can connect to the WebSocket server.

---

## Error Handling

### Connection Errors

- **1008 - Policy Violation**: Server full, rate limit exceeded
- **1009 - Message Too Large**: Message exceeded max size
- **1011 - Internal Error**: Server error during processing

### Message Validation

All client messages are validated. Invalid messages trigger an error response:

```json
{
  "type": "error",
  "severity": "warning",
  "code": "INVALID_MESSAGE",
  "message": "Missing required field: 'protocol'",
  "details": {
    "received": {...}
  }
}
```

---

## Timestamp Format

All timestamps are Unix epoch time with millisecond precision (float):

```javascript
// JavaScript
const date = new Date(message.timestamp * 1000);

// Python
from datetime import datetime
dt = datetime.fromtimestamp(message['timestamp'])
```

---

## Testing

Use the included test client:

```bash
python tests/test_websocket_client.py
```

Or test in browser console:

```javascript
const ws = new WebSocket('ws://localhost:8766');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
ws.send(JSON.stringify({type: 'ping'}));
```

---

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [MUSE_SETUP.md](./MUSE_SETUP.md) - Hardware setup guide
- [config/default.yaml](../config/default.yaml) - Configuration options
