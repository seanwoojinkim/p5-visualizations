# Coherence Visualization

An interactive visualization showing two groups of boids (blue and red) that transition from repulsion to coherence based on a controllable parameter.

## Overview

This project demonstrates emergent behavior through flocking algorithms with an added "coherence" dimension. Two groups of autonomous agents (boids) interact with each other based on a coherence level that ranges from complete repulsion to complete alignment.

## Features

- **Two distinct groups**: Blue and red boids with independent flocking behavior (600 boids total)
- **Coherence continuum**: Smooth transition from repulsion (-1.0) to coherence (+1.0)
  - **-1.0**: Groups strongly repel each other
  - **0.0**: Groups are neutral (ignore each other)
  - **+1.0**: Groups align and move together coherently with circular orbital patterns
- **Central attractor**: At positive coherence levels, groups are drawn to the center with orbital motion
- **Biometric simulation mode**: Automated sequences that simulate heart rate coherence patterns
- **Interactive controls**: Real-time adjustment of parameters via UI
- **Visual feedback**: Trails, color coding, coherence indicator, and pulsing central attractor
- **Debug mode**: View alignment metrics and group statistics

## Running the Visualization

### Option 1: Simple HTTP Server (Python)

```bash
cd coherence
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

### Option 2: Node.js HTTP Server

```bash
cd coherence
npx http-server -p 8000
```

Then open http://localhost:8000 in your browser.

### Option 3: VS Code Live Server

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Controls

### UI Controls (Bottom Panel)

#### Simulation Mode
- **Biometric Simulation Mode**: Toggle between manual control and automated sequences
- **Sequence Selector**: Choose from predefined coherence sequences:
  - **Journey to Coherence**: From conflict to meditation (demonstrates recovery)
  - **Natural Cycle**: Realistic ups and downs of connection
  - **Relationship Breakdown**: Gradual loss of coherence
  - **Recovery & Healing**: Path from conflict back to deep coherence

#### Manual Controls
- **Coherence Level Slider**: Adjust from -1.0 (repulsion) to +1.0 (coherence)
  - Disabled when simulation mode is active
- **Boids per Group**: Control population size (10-300 per group)
- **Show Trails**: Toggle motion trails on/off
- **Debug Info**: Display statistics and metrics
- **Pause**: Pause/resume the simulation
- **Reset**: Reinitialize all boids to starting positions

### Keyboard Shortcuts

- `S`: Toggle simulation mode on/off
- `Space`: Pause/unpause simulation
- `R`: Reset simulation
- `D`: Toggle debug info
- `T`: Toggle trails
- `←/→`: Decrease/increase coherence level by 0.05 (manual mode only)

## Code Structure

```
coherence/
├── index.html                          # Entry point
├── README.md                           # This file
├── docs/                               # 📚 Research & documentation
│   ├── README.md                       # Documentation index
│   ├── research/                       # Sensor & biometric research
│   │   ├── FINGERTIP_ECG_RESEARCH_REPORT.md         # ⭐ Main sensor recommendation
│   │   ├── PPG_SUMMARY.md              # Quick reference guide
│   │   ├── SENSOR_DECISION_MATRIX.md   # Hardware decision tool
│   │   ├── BIOMETRIC_ART_RESEARCH.md   # Art installation precedents
│   │   ├── BIOMETRIC_TABLE_DESIGN_RESEARCH_REPORT.md  # UX & ergonomics
│   │   └── ... (8 more research docs)
│   └── implementation/                 # Guides & templates
│       └── alivecor-inquiry-email.md   # Commercial SDK inquiry
├── src/
│   ├── apps/
│   │   └── coherence-app.js            # Main application orchestration
│   ├── core/
│   │   ├── boid-params.js              # Parameter definitions & validation
│   │   ├── boid-renderer.js            # Visual rendering logic
│   │   └── biometric-simulator.js      # HRV/coherence simulation engine
│   ├── physics/
│   │   ├── physics-config.js           # Physics constants
│   │   ├── boid.js                     # Individual boid entity
│   │   ├── group-manager.js            # Manages both groups
│   │   └── coherence-forces.js         # Force calculation functions
│   └── ui/
│       └── control-panel.js            # Interactive UI controls
└── assets/                             # (Future: images, data files)
```

## How It Works

### Flocking Behavior

Each boid follows three basic flocking rules within its own group:

1. **Alignment**: Steer towards the average heading of neighbors
2. **Cohesion**: Move towards the average position of neighbors
3. **Separation**: Avoid crowding nearby boids

### Inter-Group Dynamics

The coherence level modulates how groups interact:

- **Negative coherence** (< 0): Groups experience repulsion proportional to coherence level
- **Zero coherence** (= 0): Groups ignore each other completely
- **Positive coherence** (> 0):
  - Groups apply alignment and cohesion forces to each other
  - **Central attractor** pulls both groups toward screen center
  - **Orbital force** creates circular motion around the center
  - Results in beautiful swirling, unified patterns

### Biometric Simulation

The simulation mode uses predefined sequences that represent realistic coherence patterns:

**Simulation States:**
- **Meditation Together**: Deep meditative state (coherence ~0.95)
- **Synchronized Breathing**: High coherence through breath sync (~0.85)
- **Pleasant Conversation**: Moderate coherence during engagement (~0.6)
- **Neutral/Resting**: Independent activity (coherence ~0.0)
- **Tension Building**: Mild stress or disagreement (~-0.5)
- **Active Conflict**: Strong disagreement (~-0.85)

Each sequence transitions through multiple states, with realistic noise and variation added to simulate natural biological fluctuations.

### Visual Design

- **Blue group**: Left-aligned at start, represents first participant
- **Red group**: Right-aligned at start, represents second participant
- **Trails**: Show historical movement patterns
- **Coherence indicator**: Top-center bar showing current coherence state
- **Central attractor**: Pulsing green rings visible during positive coherence
- **Simulation info panel**: Top-right display showing current state and progress

## Biometric Integration (In Progress)

This visualization is designed to integrate with real biometric data. The simulation mode demonstrates what this would look like.

### 📚 Research Documentation

Comprehensive research on biometric sensor integration has been completed. See **[docs/](docs/)** directory for:

- **Sensor technology analysis** (fingertip ECG, PPG, chest straps)
- **Hardware recommendations** (commercial and DIY options)
- **Table integration design** (ergonomics, materials, UX)
- **Implementation guides** (signal processing, real-time streaming)
- **Art installation precedents** (Rafael Lozano-Hemmer, TeamLab, etc.)

**Quick start:** Read [docs/research/PPG_SUMMARY.md](docs/research/PPG_SUMMARY.md) and [docs/research/SENSOR_DECISION_MATRIX.md](docs/research/SENSOR_DECISION_MATRIX.md)

### Recommended Hardware Approach

**Fingertip ECG sensors** integrated into a table surface:
- **Commercial option**: AliveCor KardiaMobile ($158-258 for 2-person system)
- **DIY option**: AD8232 ECG modules ($50 for 2-person system)
- **Accuracy**: R² > 0.95 correlation with chest ECG for HRV
- **Success rate**: 85-95% with walk-up participants
- **Integration**: Brass/copper electrodes flush-mounted in table

See [docs/research/FINGERTIP_ECG_RESEARCH_REPORT.md](docs/research/FINGERTIP_ECG_RESEARCH_REPORT.md) for complete analysis.

### Planned Integration Points

1. **Heart Rate Variability (HRV) Input**
   - Real-time inter-beat interval (IBI) data from fingertip ECG
   - Cross-correlation analysis for interpersonal synchrony
   - Map synchrony metrics to visualization coherence level

2. **Device Integration**
   - Fingertip ECG sensors (AliveCor SDK or DIY AD8232)
   - Bluetooth/WebBluetooth connectivity
   - Real-time data streaming (<500ms latency)

3. **Coherence Calculation**
   - Sliding window HRV analysis (30-second windows)
   - Phase synchronization and cross-correlation
   - Real-time coherence score (0-100%)

4. **Session Features**
   - 3-5 minute interactive sessions
   - Real-time visual feedback of coherence
   - Walk-up, self-service installation
   - No data storage (privacy-first design)

The current simulation mode provides a proof-of-concept showing how the visualization responds to changing coherence levels, making it easier to design and test the eventual biometric integration.

## Technical Details

- **Framework**: P5.js (1.7.0)
- **Module system**: ES6 modules
- **Architecture**: Modular, separation of concerns
- **Rendering**: Canvas 2D with smooth animations
- **Performance**: Optimized for 100+ boids at 60 FPS

## Customization

### Adjusting Physics

Edit `src/physics/physics-config.js` to tune behavior:

```javascript
export const PHYSICS_CONFIG = {
    PERCEPTION_RADIUS: 60,          // How far boids "see"
    SEPARATION_RADIUS: 25,          // Personal space distance
    MAX_SPEED: 2.5,                 // Speed limit
    MAX_FORCE: 0.15,                // Turning force limit
    // ... and more
};
```

### Changing Colors

Edit `src/core/boid-params.js`:

```javascript
export const DEFAULT_PARAMS = {
    group1Color: '#3b82f6',  // Blue (change to any hex color)
    group2Color: '#ef4444',  // Red (change to any hex color)
    // ...
};
```

## Credits

Based on Craig Reynolds' Boids algorithm (1986) with extensions for multi-group coherence dynamics.

## License

MIT License - feel free to use and modify for your projects.
