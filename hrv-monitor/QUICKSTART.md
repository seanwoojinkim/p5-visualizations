# Quick Start Guide

Get up and running with the Polar H10 HRV Monitor in 5 minutes.

## Prerequisites

- **Polar H10** heart rate monitor
- **Python 3.8+** installed
- **Bluetooth** enabled on your computer

## Installation

```bash
# Navigate to hrv-monitor directory
cd /workspace/hrv-monitor

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

## Running the Service

### Step 1: Prepare Polar H10

1. **Moisten the electrodes** on the chest strap
2. **Wear the strap** snugly just below your chest muscles
3. **Check the LED** - it should flash red (pairing mode)

### Step 2: Start the Service

```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Run the service
python src/main.py
```

Expected output:
```
2025-10-27 14:23:10 - INFO - Starting HRV Monitor Service
2025-10-27 14:23:10 - INFO - Connecting to Polar H10...
2025-10-27 14:23:15 - INFO - Found Polar H10 at AA:BB:CC:DD:EE:FF
2025-10-27 14:23:16 - INFO - ✓ Polar H10 connected
2025-10-27 14:23:16 - INFO - ✓ Service running
2025-10-27 14:23:16 - INFO - WebSocket server: ws://0.0.0.0:8765
```

### Step 3: Test the Connection

Open `test_client.html` in your web browser:

```bash
# Open in default browser
open test_client.html  # macOS
xdg-open test_client.html  # Linux
start test_client.html  # Windows
```

You should see:
- ✓ Connected to HRV Monitor service
- ✓ Polar H10 Connected
- Real-time coherence scores updating every 3 seconds

## Understanding the Output

### Coherence Scores

| Score | Level | What it means |
|-------|-------|---------------|
| **0-33** | Low | Normal resting state, irregular breathing |
| **33-67** | Medium | Some rhythmic patterns emerging |
| **67-100** | High | Strong coherence, synchronized systems |

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

## Troubleshooting

### "Polar H10 not found"

**IMPORTANT FOR MAC USERS**: The Polar H10 uses Bluetooth Low Energy (BLE) and **will NOT appear in macOS System Settings → Bluetooth**. This is normal! BLE devices don't show up there. The Python app will find it automatically when you run it.

**Common causes:**

1. **Not wearing the device** - The H10 MUST be worn to power on and become discoverable
2. **Already connected to phone** - Go to iPhone Settings → Bluetooth → Polar H10 → Forget This Device
3. **Electrodes not moistened** - Moisten the electrode areas on the strap
4. **Bluetooth not enabled** - Check System Settings → Bluetooth is ON
5. **Out of range** - Move closer to computer (within 10 meters)
6. **Battery dead** - Check if LED flashes red when worn; replace CR2025 battery if needed

**To verify the H10 is discoverable:**
- Download "LightBlue" app from Mac App Store (free BLE scanner)
- Wear the H10 with moistened electrodes
- Open LightBlue - you should see "Polar H10 XXXXXXXX" listed
- This confirms the device is working (even though it won't appear in System Settings)

### "Insufficient data"

- Wait 30-60 seconds for buffer to fill
- Make sure strap is making good contact
- Check electrodes are moistened

### Low coherence scores

This is **normal**! Low coherence is the default state during regular breathing. To increase coherence:

1. Try coherent breathing (5s in, 5s out)
2. Focus on your heart area
3. Think of a positive memory
4. Stay calm and relaxed

## Next Steps

### Connect to Coherence Visualization

The service is now streaming coherence data via WebSocket at `ws://localhost:8765`.

To integrate with the existing coherence visualization:

```javascript
// In your visualization code
const ws = new WebSocket('ws://localhost:8765');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'coherence_update') {
    const score = message.data.coherence;

    // Map 0-100 score to -1.0 to +1.0 coherence level
    const coherenceLevel = (score / 50) - 1.0;

    // Update your visualization
    updateCoherenceLevel(coherenceLevel);
  }
};
```

### Customize Settings

Edit `config/default.yaml`:

```yaml
coherence:
  window_duration: 45  # Use 45s instead of 60s
  update_interval: 5   # Update every 5s instead of 3s
```

Then restart the service.

## Stopping the Service

Press **Ctrl+C** in the terminal:

```
^C
2025-10-27 14:45:30 - INFO - Shutting down...
2025-10-27 14:45:31 - INFO - Service stopped
```

## Common Use Cases

### 1. Meditation Feedback

Monitor coherence during meditation practice:
- Start service before meditation
- Open test_client.html
- Aim for scores > 67

### 2. Breathing Exercise Trainer

Use coherent breathing to increase scores:
- 5 seconds inhale
- 5 seconds exhale
- Watch peak frequency approach 0.1 Hz

### 3. Biofeedback Art Installation

Stream data to visualization:
- Service runs in background
- Multiple clients can connect simultaneously
- Real-time coherence drives visual parameters

## Support

See **README.md** for detailed documentation.

For issues:
- Polar H10 hardware → Contact Polar Support
- Service/software → Check logs in `logs/hrv-monitor.log`
