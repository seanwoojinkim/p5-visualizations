# EEG Neurofeedback Monitor - Web Interface

Real-time browser-based visualization for EEG neurofeedback training with the Muse 2 headset.

## Overview

This web interface provides a comprehensive real-time visualization dashboard for EEG neurofeedback training. It connects to the EEG backend server via WebSocket and displays:

- **Neurofeedback Score**: Real-time 0-100 score with circular gauge visualization
- **EEG Band Powers**: Live display of delta, theta, alpha, beta, and gamma frequency bands
- **Signal Quality**: Per-channel signal quality indicators (TP9, AF7, AF8, TP10)
- **Protocol Selection**: Switch between 5 different neurofeedback protocols
- **Baseline Calibration**: Controls for establishing baseline measurements
- **Session Information**: Device status, session duration, and system metrics

## Quick Start

### 1. Start the Backend Server

```bash
# Terminal 1: Start Muse LSL stream
muselsl stream

# Terminal 2: Start EEG backend
cd /workspace/coherence/eeg-monitor
python src/main.py --protocol alpha_enhancement
```

The backend WebSocket server will start on `ws://localhost:8766`.

### 2. Serve the Web Interface

```bash
# Terminal 3: Start HTTP server
cd /workspace/coherence/eeg-monitor/web
python -m http.server 8000
```

### 3. Open in Browser

Navigate to: **http://localhost:8000**

The interface will automatically connect to the WebSocket server.

## Browser Requirements

- **Modern browsers only**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **JavaScript**: ES6 modules support required
- **WebSocket**: Full WebSocket API support
- **Canvas**: HTML5 Canvas 2D context

## File Structure

```
web/
├── index.html              # Main application page
├── test.html               # WebSocket debugging console
├── README.md               # This file
├── css/
│   └── styles.css          # All styling (dark theme)
└── js/
    ├── eeg-app.js          # Main application logic
    ├── websocket-client.js # WebSocket connection manager
    ├── visualizations.js   # Canvas-based rendering
    └── protocol-info.js    # Protocol metadata
```

## Features

### 1. Protocol Selection

Choose from 5 validated neurofeedback protocols:

#### Alpha Enhancement
- **Goal**: Relaxation and meditation
- **Direction**: Higher alpha (8-13 Hz) is better
- **Use Case**: Stress reduction, meditation training
- **Instructions**: Close your eyes and relax

#### Theta/Beta Ratio
- **Goal**: Focus and attention training
- **Direction**: Lower ratio is better
- **Use Case**: ADHD management, concentration
- **Instructions**: Stay alert and focused
- **Note**: Most validated protocol (67+ studies)

#### Alpha Asymmetry
- **Goal**: Mood regulation and emotional balance
- **Direction**: Balanced hemispheres is better
- **Use Case**: Depression, anxiety management
- **Instructions**: Maintain positive, relaxed mood

#### Theta Enhancement
- **Goal**: Deep meditation and creativity
- **Direction**: Higher theta (4-8 Hz) is better
- **Use Case**: Creative flow states, meditation
- **Instructions**: Enter deep relaxation

#### Beta Enhancement
- **Goal**: Alertness and active thinking
- **Direction**: Higher beta (12-30 Hz) is better
- **Use Case**: Mental engagement, problem solving
- **Instructions**: Stay mentally alert
- **Warning**: Excessive beta may indicate stress

### 2. Neurofeedback Score Gauge

The circular gauge displays your real-time neurofeedback score (0-100):

- **0-30 (Red)**: Low/Poor - Need improvement
- **30-50 (Orange)**: Medium - Moderate performance
- **50-70 (Yellow)**: Good - Solid performance
- **70-100 (Green)**: Excellent - Optimal state

The gauge smoothly animates as your score changes, with glow effects for high scores.

### 3. Band Power Visualization

Horizontal bars show the power in each EEG frequency band:

- **Delta (0.5-4 Hz)**: Purple - Deep sleep, unconscious
- **Theta (4-8 Hz)**: Blue - Meditation, creativity
- **Alpha (8-13 Hz)**: Green - Relaxation, calmness
- **Beta (12-30 Hz)**: Yellow - Focus, active thinking
- **Gamma (30-50 Hz)**: Orange - High-level processing

Bars auto-scale to the maximum observed value.

### 4. Signal Quality Indicators

Four channel indicators show real-time signal quality:

- **Green**: Good signal quality
- **Yellow**: Fair signal quality (minor artifacts)
- **Red**: Poor signal quality (artifacts detected)

Common artifacts:
- Eye blinks (frontal channels: AF7, AF8)
- Jaw clenches (high frequency noise)
- Head movement (all channels)

### 5. Baseline Calibration

Establish a baseline for relative scoring:

1. Click **"Start Calibration"**
2. Sit relaxed with eyes closed for the specified duration (default: 60 seconds)
3. The progress bar shows calibration progress
4. Once complete, scores are normalized to your baseline

**Why baseline?**
- Individual differences in brain activity are large
- Relative changes are more meaningful than absolute values
- Baseline provides personalized target for training

### 6. Real-Time Waveform Display

The waveform canvas shows raw EEG traces for each channel:

- Each channel has a dedicated horizontal strip
- Time flows from left to right
- Amplitude variations show brain activity patterns

**Note**: This is a placeholder for future enhancement when raw waveform data is streamed from the backend.

## WebSocket Protocol

The web interface communicates with the backend via WebSocket messages:

### Client → Server (Commands)

```javascript
// Ping (keep-alive)
{ "type": "ping" }

// Request current status
{ "type": "request_status" }

// Switch protocol
{
  "type": "switch_protocol",
  "protocol": "alpha_enhancement"
}

// Start baseline calibration
{
  "type": "start_baseline",
  "duration": 60  // seconds
}

// Finish baseline early
{ "type": "finish_baseline" }
```

### Server → Client (Messages)

```javascript
// Initial state (sent on connection)
{
  "type": "initial_state",
  "connection_status": {...},
  "latest_coherence": {...},
  "latest_eeg_update": {...},
  ...
}

// Neurofeedback score update
{
  "type": "coherence_update",
  "data": {
    "protocol": "alpha_enhancement",
    "score": 67.5,
    "direction": "higher",
    "feedback_level": "good",
    "details": {...}
  }
}

// EEG band powers update
{
  "type": "eeg_update",
  "data": {
    "delta": 45.2,
    "theta": 32.1,
    "alpha": 67.5,
    "beta": 28.3,
    "gamma": 12.4,
    "channels": {...},
    "artifacts": {...}
  }
}

// Connection status
{
  "type": "connection_status",
  "data": {
    "muse_connected": true,
    "device_name": "Muse-XXXX",
    "current_protocol": "alpha_enhancement",
    "baseline_calibrated": false
  }
}

// Baseline progress
{
  "type": "baseline_progress",
  "data": {
    "state": "calibrating",
    "percent_complete": 45.5,
    "samples_collected": 567,
    "samples_required": 1250
  }
}

// Protocol switched confirmation
{
  "type": "protocol_switched",
  "data": {
    "protocol": "theta_beta_ratio",
    "success": true,
    "message": "Switched to Theta/Beta Ratio"
  }
}
```

## Debugging

### Test Console

Open `test.html` for a WebSocket debugging console:

```bash
# Open in browser
http://localhost:8000/test.html
```

Features:
- Manual WebSocket connection control
- Send custom commands
- View all message traffic
- Connection statistics
- JSON message viewer

### Debug Mode

Press **'D'** key in the main interface to toggle debug logging:

```javascript
window.EEG_DEBUG = true;  // Enable debug logging
```

All WebSocket messages will be logged to the browser console.

### Browser Console

Open browser DevTools (F12) to view:
- Console logs
- Network traffic (WebSocket frames)
- JavaScript errors
- Performance metrics

## Customization

### WebSocket URL

Override the default WebSocket URL via query parameters:

```
http://localhost:8000?ws_host=192.168.1.100&ws_port=8766
```

### Protocol Configuration

Protocol parameters are defined in `js/protocol-info.js`:

```javascript
export const PROTOCOLS = {
    'alpha_enhancement': {
        name: 'Alpha Enhancement',
        description: '...',
        direction: 'higher',
        color: '#00b894',
        // ... more config
    },
    // ... other protocols
};
```

### Styling

All styles are in `css/styles.css` using CSS custom properties:

```css
:root {
    /* Colors */
    --bg-dark: #1a1a2e;
    --accent-primary: #0f4c75;
    --excellent: #00ff88;
    --good: #00cc66;
    /* ... more variables */
}
```

Customize the theme by changing these variables.

## Troubleshooting

### WebSocket Won't Connect

**Problem**: "WebSocket: Disconnected" status

**Solutions**:
1. Verify backend server is running:
   ```bash
   python src/main.py --protocol alpha_enhancement
   ```
2. Check WebSocket port (default: 8766)
3. Ensure no firewall blocking
4. Try `ws://127.0.0.1:8766` instead of `localhost`

### No Data Displayed

**Problem**: Connected but no scores or band powers

**Solutions**:
1. Check Muse headset is connected:
   ```bash
   muselsl stream
   ```
2. Verify electrodes have good contact (wet electrodes)
3. Wait for buffer to fill (takes ~2 seconds)
4. Check browser console for errors

### Poor Signal Quality

**Problem**: All channels showing red quality

**Solutions**:
1. Wet electrode contacts with water or gel
2. Adjust headband fit (snug but comfortable)
3. Ensure forehead electrodes (AF7, AF8) contact skin
4. Move away from electrical interference
5. Relax jaw and minimize blinking

### Baseline Calibration Stuck

**Problem**: Progress bar not moving

**Solutions**:
1. Check WebSocket connection status
2. Verify backend is receiving data from Muse
3. Look for error messages in browser console
4. Try clicking "Finish Calibration" to stop
5. Restart backend server if needed

### Slow Performance

**Problem**: Low FPS or laggy animations

**Solutions**:
1. Close other browser tabs
2. Disable browser extensions
3. Use Chrome or Firefox (best performance)
4. Check CPU usage (backend should be <30%)
5. Reduce canvas size in visualizations.js

## Performance

Expected performance metrics:

- **WebSocket Latency**: <100ms
- **Frame Rate**: 60 FPS (animations)
- **Data Rate**: ~1-10 Hz (protocol updates)
- **Memory Usage**: <100 MB
- **CPU Usage**: <10% (browser)

## Architecture

```
┌─────────────────────────────────────────┐
│         Browser (index.html)            │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │      eeg-app.js (Main App)       │  │
│  │  - Coordinates all components    │  │
│  │  - Manages application state     │  │
│  └──────────┬──────────────┬────────┘  │
│             │              │            │
│  ┌──────────┴────────┐  ┌─┴──────────┐ │
│  │ websocket-client  │  │visualizations│ │
│  │  - Connection     │  │ - ScoreGauge │ │
│  │  - Auto-reconnect │  │ - BandBars   │ │
│  │  - Message routing│  │ - Waveform   │ │
│  └──────────┬────────┘  └─────────────┘ │
│             │                            │
└─────────────┼────────────────────────────┘
              │ WebSocket
              │ (port 8766)
┌─────────────┼────────────────────────────┐
│  Backend Server (main.py)               │
│  - Muse integration                     │
│  - Signal processing                    │
│  - Protocol calculations                │
└─────────────────────────────────────────┘
```

## Technology Stack

- **HTML5**: Semantic markup, Canvas API
- **CSS3**: Custom properties, Grid, Flexbox
- **JavaScript ES6**: Modules, async/await, classes
- **WebSocket API**: Real-time bidirectional communication
- **Canvas 2D**: Hardware-accelerated rendering
- **No dependencies**: Vanilla JavaScript only

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 90+     | ✅ Full support |
| Firefox | 88+     | ✅ Full support |
| Safari  | 14+     | ✅ Full support |
| Edge    | 90+     | ✅ Full support |
| IE 11   | -       | ❌ Not supported |

## Security

- WebSocket connection uses unencrypted `ws://` protocol
- Intended for local network use only
- Server has rate limiting and client limits
- No sensitive data transmitted
- For production, use `wss://` (WebSocket Secure)

## Future Enhancements

Potential additions for future phases:

1. **Session Recording**: Save and replay sessions
2. **Historical Charts**: View score trends over time
3. **Audio/Visual Feedback**: Sounds or colors based on score
4. **Mobile Responsive**: Enhanced mobile layout
5. **Multi-User Support**: Compare multiple users
6. **Protocol Customization**: Create custom protocols
7. **Export Data**: Download session data as CSV/JSON
8. **Real Waveform Streaming**: Live EEG waveform display

## Contributing

When modifying the web interface:

1. Maintain ES6 module structure
2. Follow existing code style
3. Test on multiple browsers
4. Update this README for major changes
5. Ensure no external dependencies added

## License

Part of the EEG Neurofeedback Monitor project.

## Support

For issues or questions:

1. Check this README and troubleshooting section
2. Review browser console for error messages
3. Test with `test.html` debug console
4. Check backend server logs
5. Verify Muse hardware connection

---

**Version**: 1.0.0
**Last Updated**: 2025-11-03
**Author**: EEG Monitor Development Team
