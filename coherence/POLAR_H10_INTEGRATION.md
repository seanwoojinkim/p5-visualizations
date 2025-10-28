# Polar H10 Integration Guide

This coherence visualization can now be controlled by **real-time heart rate coherence data** from your Polar H10!

## Quick Start

### 1. Start the HRV Monitor Service (on Mac, not in Docker)

```bash
# Open a terminal on your Mac host
cd /workspace/hrv-monitor

# Run the setup script (first time only)
./setup.sh

# Start the service
./run.sh
```

Expected output:
```
🚀 Starting Polar H10 HRV Monitor Service...

2025-10-27 14:23:10 - INFO - Starting HRV Monitor Service
2025-10-27 14:23:10 - INFO - Scanning for Polar H10...
2025-10-27 14:23:15 - INFO - Found Polar H10 ABCD1234
2025-10-27 14:23:16 - INFO - ✓ Polar H10 connected
2025-10-27 14:23:16 - INFO - WebSocket server: ws://0.0.0.0:8765
```

### 2. Prepare Your Polar H10

- Moisten the electrodes on the chest strap
- Wear it snugly just below your chest
- LED should flash red (device active)
- Disconnect from iPhone if currently connected

### 3. Open the Visualization

**From Docker container:**
```bash
# If not already running
cd /workspace
docker-compose up -d

# Access the visualization
open http://localhost:8123/coherence/index-polar.html
```

**Or directly** (if serving files):
```bash
open /workspace/coherence/index-polar.html
```

### 4. Enable Polar H10 Mode

In the visualization:
1. Click "Start Visualization" to dismiss the instructions
2. Press **`P`** on your keyboard to enable Polar H10 mode
3. Watch the visualization respond to your heart rate coherence!

## How It Works

```
┌─────────────────┐
│   Polar H10     │  ECG → RR intervals
│  (Chest Strap)  │
└────────┬────────┘
         │ Bluetooth LE
         ▼
┌─────────────────┐
│  HRV Monitor    │  Coherence calculation
│   Service       │  (running on Mac host)
│  :8765          │
└────────┬────────┘
         │ WebSocket
         ▼
┌─────────────────┐
│  Coherence      │  Visualization
│  Visualization  │  (in browser)
└─────────────────┘
```

**Data Flow:**
1. Polar H10 measures your heartbeat (1000 Hz ECG)
2. HRV service calculates HeartMath coherence score (0-100)
3. Score mapped to coherence level (-1.0 to +1.0)
4. Visualization updates every 3 seconds:
   - **Low coherence (0-33)** → Boids repel (chaotic movement)
   - **Medium coherence (33-67)** → Neutral movement
   - **High coherence (67-100)** → Boids attract (synchronized)

## Keyboard Controls

| Key | Action |
|-----|--------|
| **P** | Toggle Polar H10 mode |
| **S** | Toggle simulation mode |
| **B** | Toggle breathing guide (coherent breathing) |
| **C** | Toggle control panel (minimized by default) |
| **Space** | Pause/unpause |
| **R** | Reset simulation |
| **D** | Toggle debug info |
| **T** | Toggle trails |
| **← →** | Adjust coherence (manual mode only) |

## Modes

### Manual Mode (Default)
- Control coherence with slider or arrow keys
- Good for testing and demonstrations

### Simulation Mode (Press S)
- Automated biometric simulation
- Shows pre-programmed coherence sequences
- Useful for understanding coherence patterns

### Polar H10 Mode (Press P)
- **Real-time heart rate coherence**
- Requires HRV Monitor service running
- Responds to your actual physiological state

## Achieving High Coherence

### Using the Breathing Guide

Press **B** to enable the interactive breathing guide (enabled by default):

- A pulsing circle appears in the center of the screen
- **Light blue** = Breathe in (5 seconds)
- **Purple** = Breathe out (5 seconds)
- Circle expands during inhale, contracts during exhale
- Follow the countdown timer (5→1) for each phase

This implements **coherent breathing** at 0.1 Hz resonance frequency (6 breaths per minute), which maximizes heart rate variability and triggers the HeartMath coherence response.

### Manual Coherent Breathing

If you prefer to practice without the guide:

1. Sit comfortably and relax
2. Breathe in slowly for **5 seconds**
3. Breathe out slowly for **5 seconds**
4. Repeat (6 breaths per minute = 0.1 Hz resonance)
5. Watch the visualization transition from chaos to synchronization!

### What You'll See

**Normal breathing (low coherence):**
- Score: 0-40
- Boids repel from each other
- Chaotic, irregular movement
- Red/orange colors

**Coherent breathing (high coherence):**
- Score: 60-100
- Boids attracted together
- Smooth, synchronized movement
- Green/blue colors

## On-Screen Info (Polar H10 Mode)

When Polar H10 mode is active, you'll see:

**Left side - Connection status:**
```
POLAR H10 MODE
● WS Connected
● Polar H10 ABCD1234

Coherence Score: 67/100
Heart Rate: 68 bpm
Peak Freq: 0.098 Hz
Ratio: 3.45
```

**Center - Breathing guide (press B to toggle):**
- Large pulsing circle for coherent breathing
- Light blue during inhale (5 seconds)
- Purple during exhale (5 seconds)
- "BREATHE IN" / "BREATHE OUT" text above
- Countdown timer (5→1) in center
- Smooth sine-wave animation for natural pacing

**Top-right - Heartbeat visualization:**
- Pulsing red circle that expands with each heartbeat
- Real-time BPM display below the pulse
- Appears only when Polar H10 is connected

**Status Indicators:**
- **Green ●** - Connected
- **Red ○** - Disconnected

**Metrics:**
- **Coherence Score** - 0-100 (HeartMath score)
- **Heart Rate** - Current average BPM
- **Peak Freq** - Dominant frequency in HRV spectrum
- **Ratio** - Raw coherence ratio

**Control Panel:**
- Starts minimized by default for cleaner view
- Press **C** to expand/collapse
- Click the **−** or **+** button to toggle

## Troubleshooting

### "WS Disconnected" in visualization

**Problem:** Can't connect to HRV Monitor service

**Solution:**
```bash
# Check if service is running
ps aux | grep "python src/main.py"

# If not, start it:
cd /workspace/hrv-monitor
./run.sh
```

### "Polar H10 Disconnected"

**Problem:** Service running but can't find Polar H10

**Checklist:**
1. ✅ Wearing the strap with moistened electrodes?
2. ✅ LED flashing red?
3. ✅ Disconnected from iPhone?
4. ✅ Bluetooth enabled on Mac?

**Check service logs:**
```bash
# In the terminal where HRV service is running
# Look for error messages about Bluetooth scanning
```

### "Buffering data..."

**Problem:** Connected but no coherence scores yet

**This is normal!** The service needs:
- 30-60 seconds of heart rate data
- 30-50 heartbeats minimum

Just wait and keep breathing normally.

### Jerky/laggy transitions

**Problem:** Visualization updates feel abrupt

**Solution:** Smoothing factor can be adjusted in the code:

Edit `/workspace/coherence/src/integrations/polar-h10-client.js`:
```javascript
// Line 31: Lower value = smoother
this.smoothingFactor = 0.05;  // Was 0.08
```

## Architecture Details

### Files Created

**Integration Module:**
- `/workspace/coherence/src/integrations/polar-h10-client.js`
  - WebSocket client for HRV Monitor
  - Score → level mapping
  - Exponential smoothing
  - Auto-reconnect

**Polar App:**
- `/workspace/coherence/src/apps/coherence-app-polar.js`
  - Main app with Polar H10 integration
  - Mode switching (manual/simulation/polar)
  - Real-time HRV display

**HTML:**
- `/workspace/coherence/index-polar.html`
  - Entry point with instructions
  - Uses coherence-app-polar.js

### WebSocket Connection

The visualization connects to the HRV Monitor WebSocket:

```javascript
// In polar-h10-client.js
const polarClient = new PolarH10Client({
  wsUrl: 'ws://localhost:8765',

  onCoherenceUpdate: (data) => {
    // data.score: 0-100
    // data.level: -1.0 to +1.0
    // data.peakFrequency: Hz
    // data.ratio: coherence ratio
  }
});

polarClient.connect();
```

### Score Mapping

Coherence score (0-100) is mapped to visualization level (-1.0 to +1.0):

```
Score    Level     Behavior
0-33  → -1.0 to -0.33  Repulsion (chaotic)
33-67 → -0.33 to +0.33 Neutral (independent)
67-100 → +0.33 to +1.0 Attraction (coherent)
```

Formula: `level = (score / 50) - 1.0`

## Advanced Configuration

### Adjust Update Frequency

Edit `/workspace/hrv-monitor/config/default.yaml`:
```yaml
coherence:
  update_interval: 3  # Seconds between updates (3-5 recommended)
```

### Adjust Window Duration

```yaml
coherence:
  window_duration: 60  # Seconds of data to analyze (45-60 recommended)
```

### Custom WebSocket URL

If running HRV service on different port or computer:

Edit `/workspace/coherence/src/apps/coherence-app-polar.js`:
```javascript
polarClient = new PolarH10Client({
  wsUrl: 'ws://192.168.1.100:8765',  // Custom IP/port
  // ...
});
```

## Next Steps

### Multi-Person Mode

With 2 Polar H10 devices, you can visualize **interpersonal coherence**:
- Two people wearing heart rate monitors
- Calculate coherence between them
- Visualization shows synchronization

(This requires updates to HRV Monitor service - see research docs for cross-correlation implementation)

### Record Sessions

Save coherence data for playback:
- Log WebSocket data to file
- Replay recorded sessions
- Compare different meditation techniques

### Custom Visualizations

The WebSocket interface is language-agnostic:
- Python visualization with pygame
- Unity game engine integration
- LED light installations
- Sound synthesis

Any client can connect to `ws://localhost:8765` and receive coherence updates!

## Support

**For HRV Monitor issues:**
- `/workspace/hrv-monitor/README.md`
- `/workspace/hrv-monitor/docs/MAC_SETUP.md`
- `/workspace/hrv-monitor/QUICKSTART.md`

**For visualization issues:**
- `/workspace/coherence/docs/`
- Browser console (F12) for error messages

**Integration documentation:**
- `/workspace/hrv-monitor/docs/INTEGRATION_EXAMPLE.md`

## Credits

**HeartMath Institute** - Coherence algorithm research
**Polar Electro** - H10 heart rate monitor
**Bleak** - Python Bluetooth Low Energy library
**p5.js** - Creative coding framework
