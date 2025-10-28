# Polar H10 Setup Guide for macOS

Complete guide for connecting Polar H10 to Mac and troubleshooting common issues.

## The Key Insight

**The Polar H10 will NOT appear in macOS System Settings → Bluetooth. This is completely normal!**

### Why?

The Polar H10 uses **Bluetooth Low Energy (BLE)**, which is different from classic Bluetooth. macOS System Settings Bluetooth menu only shows classic Bluetooth devices (keyboards, mice, headphones, speakers).

**BLE devices like heart rate monitors don't appear there by design.** The Python application will find and connect to it automatically using app-level BLE scanning.

## How BLE Connection Works

```
macOS System Settings Bluetooth
    ↓
❌ Cannot see BLE devices like Polar H10
    (Only shows: Keyboards, Mice, Headphones, etc.)

Python/Bleak BLE Scanner
    ↓
✅ Scans for BLE devices directly
    (Finds: Heart Rate Monitors, Fitness Sensors, etc.)
```

## Step-by-Step Connection Guide

### 1. Verify Bluetooth is Enabled

```bash
# Check Bluetooth status in Terminal
system_profiler SPBluetoothDataType | grep "Bluetooth Power"
```

Should show: `Bluetooth Power (On/Off): On`

Or simply: System Settings → Bluetooth → Make sure it's ON

### 2. Prepare the Polar H10

**Critical**: The H10 only becomes discoverable when worn!

1. **Moisten the electrodes**
   - Wet the two gray rectangular areas on the strap
   - Use water or saliva
   - Should be damp but not dripping

2. **Wear the strap**
   - Position just below chest muscles
   - Polar logo should be centered
   - Strap should be snug but comfortable
   - Sensor module should be on your left side

3. **Verify it's powered on**
   - LED should flash red (indicates active/pairing mode)
   - If no LED: electrodes may not be wet enough or battery is dead

### 3. Disconnect from Other Devices

**Important**: The Polar H10 can only connect to one device at a time (unless dual mode is enabled).

**On iPhone:**
1. Open Settings → Bluetooth
2. Find "Polar H10 XXXXXXXX" in the device list
3. Tap the (i) icon
4. Choose "Forget This Device"

**Force quit fitness apps:**
- Polar Beat
- Polar Flow
- Apple Health
- Any other fitness apps

### 4. Run the Python Application

```bash
cd /workspace/hrv-monitor
source venv/bin/activate
python src/main.py
```

**What happens:**
- App performs BLE scan (10 seconds)
- Finds devices advertising Heart Rate Service
- Connects to Polar H10 automatically
- No interaction with System Settings needed!

**Expected output:**
```
2025-10-27 14:23:10 - INFO - Starting HRV Monitor Service
2025-10-27 14:23:10 - INFO - Scanning for Polar H10...
2025-10-27 14:23:15 - INFO - Found Polar H10 ABCD1234 at UUID-HERE
2025-10-27 14:23:16 - INFO - Connected to Polar H10 ABCD1234
2025-10-27 14:23:16 - INFO - Heart rate notifications started
2025-10-27 14:23:16 - INFO - ✓ Service running
```

## Verifying the H10 is Discoverable

If you want to confirm the Polar H10 is working before running the Python app:

### Download LightBlue (Free Mac App)

1. Open Mac App Store
2. Search for "LightBlue"
3. Download and install (free)

### Use LightBlue to Scan

1. **Wear the Polar H10** (with moistened electrodes)
2. Open LightBlue app
3. You should see "Polar H10 XXXXXXXX" in the device list
4. It will show signal strength (RSSI)

**If you see it in LightBlue:**
- ✅ The H10 is working correctly
- ✅ It's discoverable via BLE
- ✅ The Python app will find it

**If you don't see it in LightBlue:**
- Check electrodes are moistened
- Make sure strap is worn snugly
- Verify LED is flashing (if not, battery may be dead)
- Check it's not connected to another device

## Common Issues and Solutions

### Issue 1: "Polar H10 not found" Error

**Most common cause:** Not wearing the device!

The Polar H10 requires skin contact to power on and become discoverable.

**Solution checklist:**
1. ✅ Wearing the strap with moistened electrodes
2. ✅ LED is flashing red
3. ✅ Not connected to iPhone/iPad (forgot device in Bluetooth settings)
4. ✅ Bluetooth enabled on Mac
5. ✅ Within 10 meters of Mac

### Issue 2: Connected to iPhone, Won't Connect to Mac

**Problem:** H10 already has active connection to another device

**Solution:**
```bash
# On iPhone:
Settings → Bluetooth → Polar H10 → Forget This Device

# Force quit all fitness apps:
- Double-tap home button (or swipe up on newer iPhones)
- Swipe up on Polar Beat, Apple Health, etc.

# Then try Mac connection again
```

### Issue 3: Connection Drops Frequently

**Possible causes:**
- Poor electrode contact
- USB 3.0 interference (USB 3 uses 2.4 GHz like Bluetooth)
- Distance too far
- Battery low

**Solutions:**
1. Re-moisten electrodes
2. Unplug USB 3.0 devices near Mac
3. Move closer to Mac
4. Replace battery (CR2025 coin cell)

### Issue 4: macOS BLE Scanning is Slow

**Known limitation:** macOS BLE scanning is slower than iOS (1-3 callbacks/second vs 10/second on iPhone)

**The 10-second scan timeout in the Python app should be sufficient.**

If you're still having issues:
- Increase scan timeout in `/workspace/hrv-monitor/src/polar_h10.py`
- Change `timeout=10.0` to `timeout=15.0`

### Issue 5: "Permission Denied" or Bluetooth Access Error

macOS requires apps to request Bluetooth access.

**First run:** You should see a system prompt asking for Bluetooth permission
- Click "OK" or "Allow"

**If you denied it:**
1. System Settings → Privacy & Security → Bluetooth
2. Find "Python" or "Terminal" in the list
3. Enable the checkbox

### Issue 6: Device Shows Different Name

The Polar H10 advertises with its serial number in the name:
- `Polar H10 ABCD1234`
- `Polar H10 12345678`

The Python app searches for any device containing "Polar H10" in the name, so this should work regardless of serial number.

**To connect to a specific device:**
Edit `/workspace/hrv-monitor/config/default.yaml`:
```yaml
polar:
  device_name: "Polar H10 ABCD1234"  # Your specific device
```

## Hardware Details

### Polar H10 Specifications

- **Bluetooth**: 5.0 (Low Energy + Classic)
- **ECG Sampling**: 1000 Hz (internal)
- **RR Interval Output**: 1 ms precision
- **Battery**: CR2025 coin cell (~400 hours)
- **Range**: ~10 meters (30 feet)
- **Connections**: 1 Bluetooth LE (2 with dual mode enabled)
- **ANT+**: Unlimited simultaneous connections

### Bluetooth LE Services

The Polar H10 advertises:

**Heart Rate Service (0x180D):**
- Heart Rate Measurement (0x2A37) - RR intervals included
- Body Sensor Location (0x2A38)
- Heart Rate Control Point (0x2A39)

**Battery Service (0x180F):**
- Battery Level (0x2A19)

**Device Information (0x180A):**
- Manufacturer Name
- Model Number
- Serial Number
- Firmware Revision

## Advanced: Enabling Dual Bluetooth Mode

If you need to connect the H10 to both Mac and iPhone simultaneously:

1. Download Polar Beat app on iPhone
2. Connect H10 to Polar Beat
3. Go to Settings in Polar Beat
4. Enable "Dual Bluetooth" mode
5. Now H10 can maintain 2 BLE connections

**Note:** This requires Polar Beat app; can't be done from Mac alone.

## Bluetooth Troubleshooting Commands

### Check Bluetooth Hardware

```bash
# Check if Bluetooth controller is present
system_profiler SPBluetoothDataType
```

### Reset Bluetooth Module (If Needed)

```bash
# Remove Bluetooth preference files (requires restart)
sudo rm /Library/Preferences/com.apple.Bluetooth.plist
sudo rm ~/Library/Preferences/com.apple.Bluetooth.plist

# Restart Mac
sudo reboot
```

**Warning:** This will unpair ALL Bluetooth devices. Use as last resort.

### Check Bluetooth Log

```bash
# View Bluetooth system log
log show --predicate 'subsystem == "com.apple.bluetooth"' --last 5m
```

## Python/Bleak-Specific Details

### Why No Pairing Required

The standard BLE Heart Rate Service (0x180D) does **not require pairing** for basic heart rate and RR interval data.

From the code:
```python
# Direct connection without pairing
self.client = BleakClient(polar_device.address)
await self.client.connect()
```

This works because:
- Heart Rate Service characteristics are open (no encryption required)
- BLE connection-only access is sufficient
- No authentication needed for standard HR data

### macOS Privacy: UUIDs Instead of MAC Addresses

For privacy, macOS doesn't expose real Bluetooth MAC addresses. Instead:
- Each BLE device gets a **unique UUID** (changes per device)
- `device.address` returns this UUID
- The app uses this for connection

Example:
- **Real MAC**: `A0:E6:F8:50:72:53`
- **macOS UUID**: `F9168C5E-CEB2-4F3A-AC58-1234567890AB`

Both identify the same device, macOS just uses UUIDs for privacy.

## Summary

1. ✅ **Don't look for Polar H10 in System Settings → Bluetooth** (won't appear)
2. ✅ **Wear the device** with moistened electrodes (required for power-on)
3. ✅ **Disconnect from other devices** (iPhone, iPad, etc.)
4. ✅ **Run the Python app** - it will find and connect automatically
5. ✅ **Use LightBlue app** to verify if having issues

The Python/Bleak application handles BLE scanning and connection automatically. No manual pairing needed!

## Still Having Issues?

Check the main troubleshooting guide:
- `/workspace/hrv-monitor/README.md` - Complete documentation
- `/workspace/hrv-monitor/QUICKSTART.md` - Quick start guide

Or enable debug logging:
```yaml
# Edit config/default.yaml
logging:
  level: "DEBUG"  # Change from INFO to DEBUG
```

Then check logs:
```bash
tail -f logs/hrv-monitor.log
```
