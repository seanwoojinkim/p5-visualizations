# Painterly Water Background

Animated water background using brushstroke particles with undulating wave motion. Perfect for use as a background layer in the koi visualization.

## Features

- **Painterly aesthetic**: Uses brushstroke textures with blend modes for organic merging
- **Multi-layer depth**: 4 depth layers from deep to surface water
- **Undulating motion**: Multiple wave frequencies create realistic water movement
- **Horizontal flow**: Water current effect with depth-based speed
- **Water color palette**: Deep blues to surface cyan/blue
- **Real-time controls**: Adjust wave speed, amplitude, flow speed, and particle count

## How to Use

1. Open `index.html` in a browser
2. Use the controls panel to adjust:
   - **Wave Speed**: How fast the waves undulate (0.1 - 3.0)
   - **Wave Amplitude**: Vertical wave height (0 - 100 px)
   - **Flow Speed**: Horizontal water current speed (0 - 2.0)
   - **Particle Count**: Total number of brushstrokes (100 - 1000)
   - **Blend Mode**: Different rendering modes (ADD recommended for glowing water)

3. Click "Regenerate Water" to create new random particle distribution

## Technical Details

### WaterBrushstroke Class
Individual particles that:
- Flow horizontally (simulating water current)
- Undulate vertically (multi-frequency sine waves + noise)
- Have depth-based colors (deep = darker, surface = lighter)
- Pulse scale and opacity for organic "breathing"

### WaterLayer Class
Depth layers with:
- Depth-based scaling (deep layers smaller, surface layers larger)
- Depth-based opacity (deep layers more transparent)
- Depth-based flow speed (surface flows faster)

### Motion System
- **Primary wave**: `sin(time * 0.001 * speed + x * 0.01 + phase)`
- **Secondary wave**: `sin(time * 0.0015 * speed + x * 0.007 + phase)` at 50% amplitude
- **Noise variation**: Simplex noise at 30% amplitude for organic irregularity
- **Horizontal flow**: Constant drift with layer-specific multiplier
- **Wrap-around**: Particles loop horizontally for seamless motion

### Color Palette
- **Deep water** (depth 0-0.33): RGB(40, 80, 120) - dark blue
- **Mid-depth** (depth 0.33-0.66): RGB(80, 130, 170) - mid-tone blue
- **Surface** (depth 0.66-1.0): RGB(120, 180, 220) - cyan-blue

Each particle gets random variation ±20 on R/G channels for organic diversity.

## Integration with Koi Visualization

To use as background in `/workspace/flocking`:

1. **Option A - Direct canvas**: Copy the water layer rendering code into the koi sketch
2. **Option B - Separate layer**: Render water on a separate canvas, composite with koi canvas
3. **Option C - iframe background**: Use this as a background iframe with transparent koi layer on top

Recommended: Use ADD blend mode for glowing water effect, or MULTIPLY for darker/moodier water.

## Performance

- Default: 400 particles across 4 layers (~100 per layer)
- Runs at 60 FPS on most modern hardware
- Adjust particle count slider if experiencing performance issues
- Blend modes may impact performance differently (ADD is generally fast)

## Assets

Uses brushstroke textures from `/workspace/flocking/assets/koi/brushstrokes/`:
- spot-1.png through spot-5.png
- Randomly assigned to particles for visual variety
