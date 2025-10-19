# Koi Flocking Visualization

Beautiful flocking simulation with realistic koi fish rendering, featuring 28 traditional koi varieties, audio reactivity, and an interactive shape editor.

## Quick Start

```bash
cd flocking
./serve.sh
```

Then open in your browser:
- **Simulation**: http://localhost:8000/index.html
- **Editor**: http://localhost:8000/koi-editor.html

## Features

- **28 Koi Varieties**: Authentic traditional Japanese koi varieties (Kohaku, Sanke, Showa, etc.)
- **Flocking Behavior**: Realistic boid simulation with alignment, cohesion, and separation
- **Audio Reactivity**: Upload music and watch the koi respond to bass, mid, and treble frequencies
- **Pixel Art Style**: Retro low-resolution rendering with adjustable pixel scale
- **Interactive Editor**: Fine-tune koi shape parameters with visual control points
- **Modular Architecture**: Clean ES6 modules for easy maintenance and extension

## Architecture

The codebase is organized into focused modules:

```
src/
├── core/          # Shared rendering logic
│   ├── koi-params.js
│   ├── koi-varieties.js
│   └── koi-renderer.js
├── flocking/      # Boid simulation
│   ├── flocking-forces.js
│   ├── boid.js
│   └── flock-manager.js
├── audio/         # Audio analysis
│   └── audio-analyzer.js
├── rendering/     # Pixel buffer
│   └── pixel-buffer.js
├── ui/            # Controls
│   ├── control-panel.js
│   └── editor-controls.js
└── apps/          # Applications
    ├── simulation-app.js
    └── editor-app.js
```

## Controls

### Simulation
- **Pixel Scale**: Adjust rendering resolution (1-8)
- **Boid Count**: Number of koi in the pond (20-300)
- **Max Speed**: How fast koi swim
- **Separation/Alignment/Cohesion**: Flocking behavior weights
- **Trail Length**: Motion trail persistence
- **Audio Reactivity**: How much music affects the koi (0-2)

### Editor
- Drag colored control points to adjust fin positions
- Use input fields for precise parameter values
- Copy values to clipboard for use in code

## Development

See [MIGRATION.md](MIGRATION.md) for detailed architecture documentation.

### Requirements
- Modern browser with ES6 module support (Chrome 61+, Firefox 60+, Safari 11+)
- Python 3 (for local development server)

### Server Options

**Python (recommended)**:
```bash
python3 -m http.server 8000
```

**Node.js**:
```bash
npx http-server -p 8000
```

**VS Code**: Use Live Server extension

## Recent Changes

- ✅ Modular reorganization (2025-10-18)
- ✅ Dual eye rendering for top-down perspective
- ✅ Fixed fin z-ordering (fins now render behind body)
- ✅ Eliminated ~400 lines of code duplication

## Credits

Built with [p5.js](https://p5js.org/) - A JavaScript library for creative coding
