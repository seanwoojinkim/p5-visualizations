# Integration Example: Connecting HRV Monitor to Coherence Visualization

This guide shows how to connect the Polar H10 HRV Monitor service to the existing coherence visualization at `/workspace/coherence/`.

## Architecture

```
┌──────────────────┐
│   Polar H10      │
│  (Chest Strap)   │
└────────┬─────────┘
         │ Bluetooth LE
         ▼
┌──────────────────┐
│  HRV Monitor     │  ws://localhost:8765
│    Service       │  Coherence: 0-100
└────────┬─────────┘
         │ WebSocket
         ▼
┌──────────────────┐
│  Integration     │  Maps score → level
│    Bridge        │  0-100 → -1.0 to +1.0
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Coherence      │  Existing p5.js
│  Visualization   │  visualization
└──────────────────┘
```

## Option 1: Direct Integration (Recommended)

Modify the existing coherence visualization to connect to the HRV Monitor WebSocket.

### Step 1: Add WebSocket Connection

Create `/workspace/coherence/src/integrations/hrv-monitor-client.js`:

```javascript
/**
 * HRV Monitor WebSocket Client
 * Connects to Polar H10 service and maps coherence scores to visualization levels
 */

export class HRVMonitorClient {
  constructor(config = {}) {
    this.wsUrl = config.wsUrl || 'ws://localhost:8765';
    this.onCoherenceUpdate = config.onCoherenceUpdate || (() => {});
    this.onStatusUpdate = config.onStatusUpdate || (() => {});

    this.ws = null;
    this.isConnected = false;
    this.reconnectDelay = 3000;
    this.shouldReconnect = true;

    // Smoothing
    this.currentLevel = 0.0;
    this.targetLevel = 0.0;
    this.smoothingFactor = 0.1;
  }

  connect() {
    console.log(`Connecting to HRV Monitor at ${this.wsUrl}...`);

    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      this.isConnected = true;
      console.log('✓ Connected to HRV Monitor');
      this.onStatusUpdate({ connected: true });
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.onStatusUpdate({ connected: false, error });
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      console.log('Disconnected from HRV Monitor');
      this.onStatusUpdate({ connected: false });

      if (this.shouldReconnect) {
        console.log(`Reconnecting in ${this.reconnectDelay / 1000}s...`);
        setTimeout(() => this.connect(), this.reconnectDelay);
      }
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case 'coherence_update':
        this.handleCoherenceUpdate(message.data);
        break;

      case 'buffer_status':
        this.handleBufferStatus(message.data);
        break;

      case 'connection_status':
        this.handleConnectionStatus(message.data);
        break;

      case 'initial_state':
        console.log('Received initial state:', message);
        break;
    }
  }

  handleCoherenceUpdate(data) {
    if (data.status === 'valid') {
      const score = data.coherence;

      // Map 0-100 score to -1.0 to +1.0 level
      this.targetLevel = this.scoreToLevel(score);

      // Notify callback
      this.onCoherenceUpdate({
        score,
        level: this.targetLevel,
        ratio: data.ratio,
        peakFrequency: data.peak_frequency,
        beatsUsed: data.beats_used
      });
    } else {
      console.log(`Coherence status: ${data.status}`);
    }
  }

  handleBufferStatus(data) {
    // Optional: Display buffer status in UI
    console.log(`Buffer: ${data.beats_in_buffer}/${data.min_beats_required} beats`);
  }

  handleConnectionStatus(data) {
    console.log(`Polar H10: ${data.polar_h10_connected ? 'Connected' : 'Disconnected'}`);
    this.onStatusUpdate({
      polarConnected: data.polar_h10_connected,
      deviceName: data.device_name
    });
  }

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

  /**
   * Get smoothed coherence level (call in draw loop)
   */
  getSmoothedLevel() {
    // Exponential smoothing for visual transitions
    this.currentLevel += (this.targetLevel - this.currentLevel) * this.smoothingFactor;
    return this.currentLevel;
  }

  getStatus() {
    return {
      connected: this.isConnected,
      currentLevel: this.currentLevel,
      targetLevel: this.targetLevel
    };
  }
}
```

### Step 2: Modify Main Sketch

Update `/workspace/coherence/index.html` or main sketch file:

```javascript
import { HRVMonitorClient } from './src/integrations/hrv-monitor-client.js';
import { CoherenceForces } from './src/physics/coherence-forces.js';
// ... other imports

// Global variables
let hrvClient;
let coherenceLevel = 0.0;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Initialize HRV Monitor client
  hrvClient = new HRVMonitorClient({
    wsUrl: 'ws://localhost:8765',

    onCoherenceUpdate: (data) => {
      console.log(`Coherence: ${data.score}/100 (level: ${data.level.toFixed(2)})`);

      // Update global coherence level
      coherenceLevel = data.level;

      // Optional: Display on screen
      displayCoherenceInfo(data);
    },

    onStatusUpdate: (status) => {
      if (status.polarConnected) {
        console.log(`✓ ${status.deviceName} connected`);
      }
    }
  });

  // Connect to HRV Monitor
  hrvClient.connect();

  // ... rest of setup
}

function draw() {
  background(0);

  // Get smoothed coherence level
  const smoothedLevel = hrvClient.getSmoothedLevel();

  // Apply to physics system
  applyCoherenceForces(boids, smoothedLevel);

  // Update and render
  updateBoids();
  renderBoids();

  // Display coherence info
  displayCoherenceUI(smoothedLevel);
}

function displayCoherenceUI(level) {
  push();

  // Draw coherence indicator
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);

  const status = hrvClient.getStatus();

  if (status.connected) {
    // Map level to color
    const color = level < 0
      ? [255, 100, 100]  // Red (repulsion)
      : [100, 255, 100]; // Green (coherence)

    fill(...color);
    text(`Coherence: ${((level + 1) * 50).toFixed(0)}/100`, 20, 20);

    fill(255, 150);
    text(`Level: ${level.toFixed(2)}`, 20, 40);
  } else {
    fill(255, 100, 100);
    text('HRV Monitor disconnected', 20, 20);
  }

  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (hrvClient) {
    hrvClient.disconnect();
  }
});
```

### Step 3: Update Package Configuration

Add to `/workspace/coherence/package.json` (if using npm):

```json
{
  "scripts": {
    "dev": "vite",
    "hrv": "cd ../hrv-monitor && source venv/bin/activate && python src/main.py"
  }
}
```

## Option 2: Standalone Bridge Server

Create a separate integration service that sits between HRV Monitor and the visualization.

### Bridge Server (`/workspace/hrv-monitor/bridge-server.js`)

```javascript
/**
 * Bridge Server
 * Connects HRV Monitor WebSocket to Coherence Visualization
 */

const WebSocket = require('ws');

// Connect to HRV Monitor
const hrvWs = new WebSocket('ws://localhost:8765');

// Create server for visualization
const server = new WebSocket.Server({ port: 8766 });

let currentCoherence = {
  level: 0.0,
  score: 0,
  status: 'disconnected'
};

// HRV Monitor connection
hrvWs.on('open', () => {
  console.log('✓ Connected to HRV Monitor');
  currentCoherence.status = 'connected';
});

hrvWs.on('message', (data) => {
  const message = JSON.parse(data);

  if (message.type === 'coherence_update' && message.data.status === 'valid') {
    const score = message.data.coherence;
    const level = (score / 50) - 1.0;

    currentCoherence = {
      level,
      score,
      ratio: message.data.ratio,
      peakFrequency: message.data.peak_frequency,
      status: 'valid'
    };

    // Broadcast to all visualization clients
    broadcast(currentCoherence);
  }
});

// Broadcast to all connected clients
function broadcast(data) {
  server.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'coherence_level',
        data
      }));
    }
  });
}

// Visualization client connections
server.on('connection', (ws) => {
  console.log('Visualization client connected');

  // Send current state
  ws.send(JSON.stringify({
    type: 'coherence_level',
    data: currentCoherence
  }));

  ws.on('close', () => {
    console.log('Visualization client disconnected');
  });
});

console.log('Bridge server running on ws://localhost:8766');
```

## Usage

### Start Both Services

```bash
# Terminal 1: Start HRV Monitor
cd /workspace/hrv-monitor
source venv/bin/activate
python src/main.py

# Terminal 2: Start Coherence Visualization
cd /workspace/coherence
# ... your existing start command
```

### With Bridge Server

```bash
# Terminal 1: HRV Monitor
cd /workspace/hrv-monitor
source venv/bin/activate
python src/main.py

# Terminal 2: Bridge Server
cd /workspace/hrv-monitor
node bridge-server.js

# Terminal 3: Coherence Visualization
cd /workspace/coherence
# ... your existing start command (connects to ws://localhost:8766)
```

## Testing the Integration

### 1. Start Services

```bash
# Start HRV Monitor
cd /workspace/hrv-monitor
source venv/bin/activate
python src/main.py
```

### 2. Open Test Client

```bash
open test_client.html
```

Verify you see:
- ✓ Connected to HRV Monitor service
- ✓ Polar H10 Connected
- Coherence scores updating

### 3. Start Visualization

```bash
cd /workspace/coherence
# Start your visualization server
```

### 4. Test Coherent Breathing

1. **Normal breathing**: Scores should be 0-40 (low coherence, repulsion)
2. **Coherent breathing** (5s in, 5s out): Scores should increase to 60+ (attraction)
3. Watch the visualization respond in real-time!

## Expected Behavior

### Low Coherence (Score 0-33)
- **Level**: -1.0 to -0.33
- **Visualization**: Boids repel from center, chaotic movement
- **Breathing**: Normal, irregular

### Medium Coherence (Score 33-67)
- **Level**: -0.33 to +0.33
- **Visualization**: Neutral movement, some patterns
- **Breathing**: Somewhat rhythmic

### High Coherence (Score 67-100)
- **Level**: +0.33 to +1.0
- **Visualization**: Boids attracted to center, synchronized
- **Breathing**: Coherent (6 breaths/min), smooth sine wave

## Troubleshooting

### "Cannot connect to HRV Monitor"

1. Make sure HRV Monitor service is running
2. Check WebSocket URL is correct (`ws://localhost:8765`)
3. Check firewall settings

### Visualization not responding

1. Verify coherence data is received (check browser console)
2. Ensure `coherenceLevel` is being passed to physics system
3. Check smoothing isn't making changes too subtle

### Jerky transitions

Increase smoothing factor:

```javascript
// In HRVMonitorClient constructor
this.smoothingFactor = 0.05; // Lower = smoother (was 0.1)
```

## Next Steps

1. **Add UI controls** - Toggle between manual/HRV control
2. **Record sessions** - Save coherence data for playback
3. **Multi-person mode** - Two Polar H10s for interpersonal coherence
4. **Audio feedback** - Sonification of coherence scores

## Support

- HRV Monitor docs: `/workspace/hrv-monitor/README.md`
- Coherence visualization: `/workspace/coherence/docs/`
