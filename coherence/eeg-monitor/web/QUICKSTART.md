# EEG Monitor - Quick Start Guide

## 1-2-3 Start

### Step 1: Start Muse Stream
```bash
muselsl stream
```
Wait for "Muse connected" message.

### Step 2: Start Backend
```bash
cd /workspace/coherence/eeg-monitor
python src/main.py --protocol alpha_enhancement
```
Wait for "WebSocket server started on ws://0.0.0.0:8766" message.

### Step 3: Open Web Interface
```bash
cd /workspace/coherence/eeg-monitor/web
./serve.sh
```
Then open: **http://localhost:8000**

---

## What You'll See

### Green Indicators ✅
- **Muse: Connected** - Headset is streaming data
- **WebSocket: Connected** - Backend is communicating

### Main Display
- **Circular Gauge**: Your neurofeedback score (0-100)
- **Color Bands**:
  - Green (70-100): Excellent
  - Yellow (50-69): Good
  - Orange (30-49): Medium
  - Red (0-29): Low

### Band Powers
Five horizontal bars showing brain wave activity:
- **Delta** (Purple): Deep sleep
- **Theta** (Blue): Meditation
- **Alpha** (Green): Relaxation ← Most protocols focus here
- **Beta** (Yellow): Focus
- **Gamma** (Orange): Processing

---

## First Session

### 1. Establish Baseline (Recommended)
1. Click **"Start Calibration"**
2. Close eyes and relax for 60 seconds
3. Wait for "Calibrated" status
4. Scores will now be relative to YOUR baseline

### 2. Start Training
- Watch the circular gauge
- Try to increase (or decrease) the score
- Follow the protocol instructions
- Experiment with different mental states

### 3. Protocol Switching
Use the dropdown to try different protocols:
- **Alpha Enhancement**: Relaxation (easiest to start)
- **Theta/Beta Ratio**: Focus/attention
- **Alpha Asymmetry**: Mood balance
- **Theta Enhancement**: Deep meditation
- **Beta Enhancement**: Alertness

---

## Tips for Success

### 1. Signal Quality
Check the 4 channel indicators (TP9, AF7, AF8, TP10):
- **Green**: Good signal - optimal
- **Yellow**: Fair signal - still usable
- **Red**: Poor signal - adjust headset

### 2. Common Issues
**Poor signal?**
- Wet the electrode contacts with water
- Adjust headband fit (snug but comfortable)
- Ensure forehead electrodes touch skin

**No data?**
- Check Muse is connected: `muselsl stream`
- Restart backend if needed
- Wait 2-3 seconds for buffer to fill

**Jumpy scores?**
- Minimize eye blinking
- Relax jaw (no clenching)
- Stay still (no head movement)

### 3. Training Strategies

**Alpha Enhancement (Relaxation):**
- Close eyes
- Focus on breath
- Let thoughts drift
- Don't try too hard

**Theta/Beta Ratio (Focus):**
- Keep eyes open
- Focus on a point
- Engage attention
- Stay alert but relaxed

**Alpha Asymmetry (Balance):**
- Maintain positive mood
- Think pleasant thoughts
- Avoid rumination
- Aim for neutral balance

---

## Keyboard Shortcuts

- **D**: Toggle debug mode (console logging)
- **Ctrl+Shift+I**: Open browser DevTools

---

## Troubleshooting

### WebSocket Won't Connect
```bash
# Check backend is running
python src/main.py --protocol alpha_enhancement

# Should see: "WebSocket server started on ws://0.0.0.0:8766"
```

### Muse Shows Disconnected
```bash
# In separate terminal
muselsl stream

# Should see: "Muse connected" and streaming data
```

### Still Having Issues?
1. Open test console: **http://localhost:8000/test.html**
2. Check browser console (F12) for errors
3. Restart all 3 terminals
4. Ensure no firewall blocking

---

## Session Best Practices

1. **Duration**: 10-20 minutes per session
2. **Frequency**: 3-5 sessions per week
3. **Environment**: Quiet, comfortable, minimal distractions
4. **Time**: Same time each day (consistency)
5. **Progress**: Track scores over weeks (not days)

---

## Expected Progress

### Week 1-2
- Learning the interface
- Understanding what affects scores
- Finding optimal mental states

### Week 3-4
- Scores stabilize
- Better control over brain states
- Protocol effectiveness becomes clear

### Week 5-8
- Noticeable improvements
- Scores increase 20-30%
- Transfer to daily life begins

### Long-term
- Sustained improvements
- Better stress management
- Enhanced focus/relaxation on demand

---

## Additional Resources

- **Full Documentation**: See `README.md`
- **Protocol Details**: See protocol descriptions in interface
- **WebSocket Testing**: See `test.html`
- **Backend Logs**: Check terminal running `main.py`

---

## Quick Reference

| Element | Purpose | Action |
|---------|---------|--------|
| Protocol Selector | Choose training goal | Dropdown menu |
| Start Calibration | Set baseline | Click button, relax 60s |
| Score Gauge | Real-time feedback | Watch and adjust |
| Band Powers | Brain activity | Monitor patterns |
| Signal Quality | Electrode contact | Ensure all green |

---

## Support

Questions or issues? Check:
1. Browser console (F12)
2. Backend terminal output
3. `README.md` troubleshooting section
4. Test console (`test.html`)

---

**Remember**: Neurofeedback is a skill that improves with practice. Be patient, stay consistent, and enjoy the process of learning to control your brain states!

**Version**: 1.0.0
**Last Updated**: 2025-11-03
