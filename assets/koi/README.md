# Koi SVG Asset Guidelines

## Directory Structure

```
assets/koi/
├── body-parts/          # Main SVG assets (edit these in Illustrator)
│   ├── body.svg         # Main body outline
│   ├── tail.svg         # Tail shape
│   └── dorsal-fin.svg   # Dorsal fin
├── templates/           # Reference guides (do not edit)
│   └── segment-guide.svg  # Shows 10 body segments
├── brushstrokes/        # PNG brushstroke textures
│   └── (add your painted spots here)
└── README.md            # This file
```

## Body Part Specifications

### 1. body.svg
**Purpose**: Main koi body outline path
**Dimensions**: ~16 × 8 units (width × height at peak)
**Anchor**: Center of head (left/front of path)
**Vertex count**: ~20-24 control points

**Shape requirements**:
- Front (left): Narrower (~4.5 units tall)
- Peak width (~8 units): At ~70% along length
- Bottom (belly): Rounder than top (back)
- Taper toward tail (right) after 15% mark
- Closed smooth curve

**Animation**: Wave deformation will be applied to all vertices

---

### 2. tail.svg
**Purpose**: Flowing koi tail
**Dimensions**: ~6 × 3 units (length × width at tip)
**Anchor**: Base attachment (left edge connects to body)
**Vertex count**: ~14 control points (7 per edge)

**Shape requirements**:
- Base (left): Narrow (~0.2 units)
- Tip (right): Wider (~1.5 units) - fan shape
- Smooth, flowing curves
- Paddle/fan shape typical of koi

**Animation**: Independent tail sway motion (amplified at tip)

---

### 3. dorsal-fin.svg
**Purpose**: Dorsal fin on koi back
**Dimensions**: ~2 × 2.5 units (width × height)
**Anchor**: Base center
**Vertex count**: 5-10 vertices

**Shape requirements**:
- Triangular/peaked shape
- Front slope gentler than back
- Traditional koi fin style
- Can add detail beyond template

**Animation**: Position follows segment 4 wave motion (no vertex deformation)

---

## SVG Authoring Guidelines

### General Rules
1. **Use simple paths**: One `<path>` element per file
2. **Closed paths**: Use `Z` command to close the shape
3. **Smooth curves**: Use Bézier curves (`C` commands) for organic shapes
4. **Anchor points**: ~20-24 for body, ~14 for tail, ~5-10 for fins
5. **No groups**: Flatten all groups to single path
6. **No effects**: No gradients, filters, or transforms in SVG

### Illustrator Workflow
1. Open template SVG in Illustrator
2. Select the path with Pen Tool (A)
3. Use Direct Selection Tool (A) to adjust anchor points
4. Add/remove points as needed (keep vertex count reasonable)
5. Use Smooth Tool for organic curves
6. File > Save As > SVG
   - **SVG Profiles**: SVG 1.1
   - **Decimal Places**: 2
   - **Minify**: No (keep readable)
7. Export with default settings

### Tips for Organic Shapes
- **Fewer anchor points = smoother curves**
- Use Bézier handles for smooth transitions
- Keep symmetry for belly/back curves
- Reference real koi photos for inspiration
- Test animation by imagining wave motion

---

## Coordinate System

### SVG Coordinates (as authored)
- Origin: Top-left corner
- X-axis: Left → Right (positive)
- Y-axis: Top → Bottom (positive)

### Runtime Coordinates (p5.js)
- Origin: Center (after translate)
- Coordinates scaled to koi size
- Wave deformation applied to Y-axis

**The parser handles coordinate transformation automatically**

---

## Integration with Animation System

### Wave Deformation (Body & Tail)
Each vertex's Y position is modified by:
```
y_offset = sin(waveTime - vertex_x_position * 3.5) * 1.5 * scale
```

This creates the swimming undulation.

### Segment Mapping
- Body vertices are mapped to 10 segments based on X position
- Each segment has its own wave offset
- Vertices inherit the wave motion of their segment

### Rendering
Your SVG paths are converted to p5.js `curveVertex()` calls:
```javascript
beginShape();
for (vertex of svg_vertices) {
  curveVertex(vertex.x + wave_offset, vertex.y);
}
endShape(CLOSE);
```

---

## Current Body Part Status

| Part | Status | Priority | Notes |
|------|--------|----------|-------|
| body.svg | 🟡 Template | High | Edit in Illustrator to match koi anatomy |
| tail.svg | 🟡 Template | High | Create flowing tail shape |
| dorsal-fin.svg | 🟡 Template | Medium | Simple triangular fin |
| pectoral-fin.svg | ⚪ Not created | Low | Optional - can stay as ellipse |
| ventral-fin.svg | ⚪ Not created | Low | Optional - can stay as ellipse |

🟡 Template = Placeholder shape, needs artistic authoring
🟢 Complete = Production-ready
⚪ Not created = Not yet started

---

## Brushstroke Assets

**Location**: `assets/koi/brushstrokes/`

### PNG Brushstroke Specifications
- **Format**: PNG with alpha channel
- **Size**: 128×128 to 256×256 pixels
- **Style**: Hand-painted organic spots
- **Variants**: Create 3-5 variations per color

### Naming Convention
```
{color}-{variant}.png
Examples:
  red-01.png
  red-02.png
  red-03.png
  black-01.png
  black-02.png
  white-01.png
```

### Color Categories
- **red**: For kohaku, sanke spots (hue 0-30°)
- **black**: For sanke, showa sumi spots
- **white**: For showa white markings
- **orange**: For hariwake, kujaku patterns
- **blue**: For asagi, shusui scales

---

## Testing Your Assets

### Visual Check
1. Open SVG in Illustrator
2. Verify path has ~20 control points (body) or ~14 (tail)
3. Check that shape is closed (no gaps)
4. Ensure no groups or effects

### Code Integration
The parser will:
1. Load your SVG file
2. Extract `<path>` element's `d` attribute
3. Parse to vertex array
4. Apply wave animation
5. Render with `curveVertex()`

**You'll see your authored shapes swimming in the simulation!**

---

## Related Documentation

- **Research doc**: `/thoughts/research/2025-10-22-koi-rendering-system-body-part-structure-for-svg-transition.md`
- **Current renderer**: `/flocking/src/core/koi-renderer.js`
- **Parser** (TODO): `/flocking/src/core/svg-parser.js`

---

## Questions?

Refer to the research document for:
- Detailed segment mapping
- Animation parameters
- Performance considerations
- Implementation roadmap

The templates provided are starting points - feel free to create completely different shapes that match your artistic vision!
