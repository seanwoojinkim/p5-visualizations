# Docker Compatibility Note

## Important: This Service Must Run on Host macOS

**The Polar H10 HRV Monitor service CANNOT run inside Docker containers on macOS.**

### Why?

Docker Desktop on Mac runs containers in a Linux VM, which does not have access to your Mac's built-in Bluetooth hardware. The Bleak library (used for Bluetooth Low Energy communication) requires native macOS APIs that aren't available inside containers.

### Architecture Limitation

```
macOS Host
  ↓ (Bluetooth hardware)
  ✅ Python app can access Bluetooth

macOS Host
  ↓ (VM boundary)
  Docker Container
    ↓
    ❌ Python app CANNOT access Bluetooth
```

### Recommended Setup

Run a **hybrid architecture**:

1. **HRV Monitor Service** → Run on macOS host (this service)
2. **Visualizations** → Run in Docker (your existing setup)
3. **Communication** → WebSocket connection between them

### Quick Start

```bash
# 1. Install dependencies on Mac host (not in container)
cd /workspace/hrv-monitor
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. Run the service on host
python src/main.py

# 3. Connect from Docker container (in your visualization)
# Use host.docker.internal to access host services
const ws = new WebSocket('ws://host.docker.internal:8765');
```

### Technical Details

**Why it doesn't work in Docker on Mac:**
- Docker Desktop uses VM (hypervisor.framework)
- Built-in Bluetooth not exposed to Linux VM
- Bleak requires CoreBluetooth framework (macOS-only)
- No USB/IP support for built-in Bluetooth

**On Linux:** Docker containers CAN access Bluetooth (native execution, not VM-based)

**On Mac:** Must run on host for Bluetooth access

### Is This a Problem?

**No!** This is actually a clean architecture:

✅ **Hardware-dependent service** (HRV Monitor) runs on host with native access
✅ **Portable web apps** (visualizations) run in Docker with isolation
✅ **Communication** happens via standard WebSocket protocol

The WebSocket interface at `ws://0.0.0.0:8765` allows:
- Multiple clients to connect (browser, Docker containers, other apps)
- Language-agnostic integration (JavaScript, Python, etc.)
- Clean separation of concerns

### Alternative: External Bluetooth Dongle?

Theoretically, an external USB Bluetooth adapter could work with Docker's experimental USB/IP support (Docker Desktop 4.35+), but:

❌ Still early/experimental
❌ Complex setup
❌ Unreliable
❌ Not worth the effort when host works perfectly

**Recommendation:** Just run on host!

## Summary

```bash
# ✅ DO THIS (run on macOS host)
cd /workspace/hrv-monitor
source venv/bin/activate
python src/main.py

# ❌ DON'T DO THIS (won't work in Docker on Mac)
docker run -it hrv-monitor python src/main.py
```

For complete setup instructions, see **QUICKSTART.md** and **docs/MAC_SETUP.md**.
