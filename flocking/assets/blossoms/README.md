# Cherry Blossom Assets

This directory should contain PNG images of cherry blossom petals for the pond visualization.

## Required Files

- `blossom-1.png` - First petal variation
- `blossom-2.png` - Second petal variation
- `blossom-3.png` - Third petal variation

## Specifications

- **Format**: PNG with transparency
- **Recommended size**: 100x100px to 200x200px (petals are small, delicate)
- **Style**: Should match the watercolor/sumi-e aesthetic
- **Features**:
  - Five-petal cherry blossom shape (traditional sakura form)
  - Soft pink tones (#ffc0cb, #ffb7c5, #ffd9e3 or similar)
  - White to pale pink gradient
  - Delicate, semi-transparent edges
  - Subtle variations between the three images
  - Light, airy appearance
  - **Top-down perspective**: Petals viewed from above, floating on water

## Tips

- Use high transparency at petal edges for soft, organic blending
- Center should be slightly more opaque than edges
- Add subtle pink-to-white gradient for depth
- Consider varying petal arrangements (some more open, some more closed)
- Include small yellow/golden center details if desired
- Keep file size small (petals are rendered at 20px base size)
- Design for top-down view (as if looking down at petals on water)

## Rendering Notes

Petals are rendered at base size 20px with scale variation (0.5-1.2×), resulting in final sizes of 10-24 pixels. Design your source images with this small rendering in mind - details should be visible at small scales.

## Behavior

- Petals fade in at random positions on the pond surface
- Drift with simulated wind for 3-5 seconds
- Gradually slow down and settle on the water
- Continue gentle floating after settling
- Spin slowly as they drift
