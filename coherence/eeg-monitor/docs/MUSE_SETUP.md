# Muse 2 Headset Setup Guide

**Complete guide for setting up and using the Muse 2 EEG headset**

---

## Table of Contents

1. [Hardware Overview](#hardware-overview)
2. [Initial Setup](#initial-setup)
3. [Fitting the Headset](#fitting-the-headset)
4. [Software Installation](#software-installation)
5. [Starting the Stream](#starting-the-stream)
6. [Testing Connection](#testing-connection)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Hardware Overview

### Muse 2 Specifications

- **Channels**: 4 EEG electrodes (TP9, AF7, AF8, TP10)
- **Sample Rate**: 256 Hz
- **Connection**: Bluetooth Low Energy (BLE)
- **Battery Life**: ~5 hours continuous use
- **Charge Time**: ~2 hours

### Electrode Locations

```
        Front of Head

    AF7 ●────────● AF8
        │ Forehead│
        │         │
    TP9 ●        ● TP10
    (Left ear) (Right ear)
```

- **AF7/AF8**: Frontal electrodes (forehead)
- **TP9/TP10**: Temporal electrodes (behind ears)

These positions follow the 10-20 international EEG placement system.

---

## Initial Setup

### 1. Unboxing and Inspection

- Remove Muse 2 from packaging
- Check for any visible damage
- Locate charging cable (USB micro or USB-C depending on model)
- Find electrode pads on forehead bar and ear sensors

### 2. Charging

```bash
# First-time setup
1. Plug in charging cable to Muse 2
2. Connect to USB power source
3. Wait for full charge (LED indicator will show status)
   - Red/Orange = Charging
   - Green = Fully charged
4. Initial charge may take 2+ hours
```

**Battery Care:**
- Charge before first use
- Don't let battery fully deplete regularly
- Store with 50-80% charge for longevity

### 3. Powering On

1. **Press and hold** the power button (behind left ear sensor)
2. LED will flash to indicate power on
3. Headset will enter pairing mode (LED flashing blue)
4. Headset is ready when LED settles to slow blink

**Note:** Muse 2 will auto-sleep after 10 minutes of inactivity.

---

## Fitting the Headset

### Proper Fit is Critical

Good electrode contact = good signal quality. Poor fit = poor data.

### Step-by-Step Fitting

1. **Prepare Electrodes**
   ```
   - Wet the forehead electrode pads with water (or conductive gel)
   - Wet the ear sensor pads
   - Wipe forehead and behind ears with clean cloth
   - Remove glasses if wearing (can interfere with fit)
   ```

2. **Position the Headband**
   ```
   - Place forehead bar centered on forehead, about 1-2 cm above eyebrows
   - Align ear sensors behind ears, touching skin
   - Adjust band tightness (snug but not uncomfortable)
   - Forehead should make firm contact across all 3 pads
   ```

3. **Check Fit**
   ```
   ✓ Forehead: All 3 pads touching skin
   ✓ Ears: Sensors touching skin behind ears
   ✓ No hair between electrodes and skin
   ✓ Comfortable - can wear for 20+ minutes
   ```

### Visual Fit Guide

```
Side View:

         ╱‾‾‾╲
    TP9 ●     ● TP10
        │     │
        │ Head│
        │     │
    AF7 ●═════● AF8 ← Should be ~1-2cm above eyebrows
         Forehead
```

---

## Software Installation

### Prerequisites

- **Operating System**: Linux, macOS, or Windows
- **Python**: 3.9 or higher
- **Bluetooth**: BLE support required

### Installation Steps

#### 1. Clone or Download Project

```bash
cd /workspace/coherence/eeg-monitor
```

#### 2. Run Setup Script

```bash
# Make setup script executable (if needed)
chmod +x setup.sh

# Run setup
./setup.sh
```

This will:
- Create Python virtual environment
- Install all dependencies (muselsl, pylsl, etc.)
- Verify installations
- Create necessary directories

#### 3. Manual Installation (Alternative)

If setup script fails:

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Verify muselsl
muselsl list
```

### Platform-Specific Notes

#### Linux

```bash
# Install Bluetooth support (if needed)
sudo apt-get install bluetooth bluez

# Install libusb (required by muselsl)
sudo apt-get install libusb-1.0-0

# Add user to bluetooth group
sudo usermod -a -G bluetooth $USER

# Restart for group changes
# Log out and log back in
```

#### macOS

```bash
# No special setup usually required
# Bluetooth should work out of the box
# May need to allow terminal Bluetooth access in System Preferences
```

#### Windows

```bash
# Use PowerShell or WSL2
# Bluetooth drivers should be installed
# May need to install Zadig for USB driver (muselsl requirement)
```

---

## Starting the Stream

### Two-Step Process

The EEG monitor uses **muselsl** as a bridge between Muse 2 and our Python application.

#### Terminal 1: Start muselsl Stream

```bash
# Activate virtual environment
cd /workspace/coherence/eeg-monitor
source venv/bin/activate

# Start muselsl stream (this will connect to Muse via Bluetooth)
muselsl stream
```

**Expected Output:**
```
Looking for Muse...
Found Muse: Muse-ABCD
Connecting...
Connected!
Streaming EEG data...
```

**Troubleshooting Connection:**
```bash
# If Muse not found, try:
muselsl list    # Scan for Muse devices

# If multiple devices, specify by name:
muselsl stream --name Muse-ABCD

# If connection fails, try:
# 1. Turn Muse off and on
# 2. Restart Bluetooth
# 3. Move closer to computer
# 4. Ensure Muse is charged
```

**Keep this terminal running!** The stream must stay active.

---

## Testing Connection

### Test 1: Connection Test

In a **second terminal**:

```bash
cd /workspace/coherence/eeg-monitor
source venv/bin/activate

# Run connection test
python tests/test_muse_connection.py
```

**What it Tests:**
- LSL stream discovery
- Channel count and names
- Sample rate accuracy (should be ~256 Hz)
- Connection stability

**Expected Result:**
```
✓ Stream Discovery - PASS
✓ Channel Count - PASS
✓ Channel Names - PASS
✓ Data Streaming - PASS
```

### Test 2: Signal Quality Test

```bash
# Make sure you're wearing the headset properly!
python tests/test_signal_quality.py
```

**What it Tests:**
- Signal amplitude (should be 5-100 µV)
- Electrode contact quality
- Artifacts (blinks, jaw clenches, movement)
- Frequency content

**Expected Result:**
```
Quality Score: 80+/100
Quality Rating: ✓ Excellent
```

**If Quality is Poor:**
- Re-wet electrodes
- Adjust headband fit
- Remove hair from under electrodes
- Relax jaw and facial muscles
- Stay still during test

---

## Troubleshooting

### Common Issues and Solutions

#### "No Muse Found"

**Symptoms:**
```
muselsl list
> No Muse devices found
```

**Solutions:**
1. **Check Muse is on**: LED should be blinking
2. **Restart Bluetooth**:
   ```bash
   # Linux
   sudo systemctl restart bluetooth

   # macOS
   # Turn Bluetooth off/on in System Preferences
   ```
3. **Move closer**: Be within 3 meters of computer
4. **Unpair and repair**: Remove from Bluetooth settings, pair again
5. **Charge headset**: Low battery can prevent connection

---

#### "Stream Found but No Data"

**Symptoms:**
```
muselsl stream
> Connected!
> Streaming...
(but test_muse_connection.py times out)
```

**Solutions:**
1. **Restart muselsl stream**: Ctrl+C and restart
2. **Check electrode contact**: Run signal quality test
3. **Verify LSL**:
   ```bash
   python -c "from pylsl import resolve_streams; print(resolve_streams())"
   ```

---

#### "Poor Signal Quality"

**Symptoms:**
- Signal quality test shows "Poor" or "Fair"
- Very low amplitude (<5 µV)
- High artifacts

**Solutions:**

**Low Amplitude (Poor Contact):**
```
1. Wet electrodes MORE (they should be damp)
2. Clean your skin (forehead, behind ears)
3. Adjust headband tighter
4. Remove hair from under electrodes
5. Try conductive gel instead of water
```

**High Artifacts:**
```
1. Relax jaw and face
2. Stay still (no head movement)
3. Close eyes (reduces blinks)
4. Move away from computer screen
5. Ground yourself (touch a grounded metal object)
```

**60 Hz Line Noise:**
```
1. Move away from power cables
2. Unplug nearby electronics
3. Sit farther from computer
4. Use laptop on battery (not plugged in)
5. Try a different room
```

---

#### "Connection Drops Frequently"

**Symptoms:**
- Stream disconnects every few minutes
- High dropout rate in stability test

**Solutions:**
1. **Move closer to computer** (Bluetooth range issue)
2. **Reduce interference**:
   - Turn off WiFi on phone
   - Move away from WiFi router
   - Disable other Bluetooth devices
3. **Charge headset** (low battery = unreliable connection)
4. **Update muselsl**: `pip install --upgrade muselsl`

---

#### "Import Error: No module named 'pylsl'"

**Symptoms:**
```
ImportError: No module named 'pylsl'
```

**Solutions:**
```bash
# Make sure you activated the virtual environment!
source venv/bin/activate

# Check it's activated (should show venv path):
which python

# If still fails, reinstall:
pip install pylsl
```

---

## Best Practices

### For Best Signal Quality

**Before Each Session:**

1. **Charge headset** (>50% battery)
2. **Clean skin** where electrodes contact
3. **Wet electrodes** thoroughly (water or gel)
4. **Check fit** - firm but comfortable contact
5. **Test signal quality** before starting training

**During Sessions:**

1. **Stay still** - minimize head and body movement
2. **Relax face** - no jaw clenching or teeth grinding
3. **Control blinks** - blink between measurements if needed
4. **Reduce noise** - quiet environment, minimal electronics
5. **Monitor quality** - if signal degrades, re-wet electrodes

### Electrode Care

**Cleaning:**
```
- After each use: wipe with damp cloth
- Weekly: clean with rubbing alcohol
- Never use harsh chemicals
- Don't scrub aggressively
```

**Storage:**
```
- Store in case or clean, dry place
- Don't leave in direct sunlight
- Don't compress electrode pads
- Keep away from extreme temperatures
```

### Session Tips

**Ideal Conditions:**
- Quiet, dimly lit room
- Comfortable seating
- Minimal distractions
- Temperature 20-22°C (68-72°F)
- No time pressure

**Session Duration:**
- Start with 5-10 minute sessions
- Build up to 20-30 minutes
- Take breaks if uncomfortable
- Don't exceed 1 hour per session

---

## Hardware Specifications Reference

### Technical Details

```yaml
Device: Muse 2 (InteraXon)
EEG Channels: 4 (TP9, AF7, AF8, TP10)
Sampling Rate: 256 Hz
ADC Resolution: 12-bit
Frequency Response: 0.1 - 100 Hz
Input Impedance: >1 MΩ
Connection: Bluetooth 4.2 LE
Battery: Rechargeable Li-ion
Charge Time: 2 hours
Battery Life: ~5 hours
Weight: ~60g
```

### Frequency Bands (for reference)

```
Delta:   0.5-4 Hz   (Deep sleep)
Theta:   4-8 Hz     (Meditation, creativity)
Alpha:   8-13 Hz    (Relaxation, calm focus)
Beta:    12-30 Hz   (Active thinking, concentration)
Gamma:   30-50 Hz   (High-level cognition)
```

---

## Additional Resources

### Documentation

- [Architecture](./ARCHITECTURE.md) - System design
- [WebSocket Protocol](./WEBSOCKET_PROTOCOL.md) - Message format
- [Main README](../README.md) - Project overview

### External Resources

- **Muse Developer**: https://choosemuse.com/
- **muselsl GitHub**: https://github.com/alexandrebarachant/muse-lsl
- **LSL Documentation**: https://labstreaminglayer.org/

### Community

- Muse subreddit: r/Muse
- Neurofeedback resources: Check implementation plan for research papers

---

## Quick Reference

### Essential Commands

```bash
# Activate environment
source venv/bin/activate

# List Muse devices
muselsl list

# Start stream
muselsl stream

# Test connection
python tests/test_muse_connection.py

# Test signal quality
python tests/test_signal_quality.py

# Start EEG monitor (future)
python src/main.py
```

### Troubleshooting Checklist

```
□ Muse is charged (>50%)
□ Muse is powered on (LED blinking)
□ Bluetooth is enabled on computer
□ muselsl stream is running
□ Electrodes are wet
□ Headband is properly fitted
□ No hair under electrodes
□ Face and jaw relaxed
□ Sitting still
□ Virtual environment activated
```

---

## Support

If you continue to experience issues:

1. Review this guide thoroughly
2. Run both test scripts and note specific errors
3. Check muselsl GitHub issues
4. Verify hardware with Muse official app (if available)
5. Try on different computer to isolate hardware vs software issues

**Remember:** 90% of EEG issues are related to electrode contact and fit!
