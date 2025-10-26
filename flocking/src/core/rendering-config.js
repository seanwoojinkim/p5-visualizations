/**
 * Rendering Configuration
 * Centralized constants for visual rendering, opacity, colors, and effects
 */

export const RENDERING_CONFIG = {
    // Opacity values (all set to 1.0 for fully opaque rendering)
    opacity: {
        body: 1.0,
        tail: 1.0,
        fins: 1.0,
        head: 1.0,
        eyes: 1.0,
        spots: 1.0
    },

    // Color adjustments
    color: {
        spotBrightness: 60,       // Base brightness for spots
        spotDarkeningFactor: 0.7, // Darkening factor for spot variation
        eyeBrightness: 10,        // Eye brightness value
        eyeSaturation: 0          // Eye saturation (grayscale)
    },

    // Sumi-e (ink painting) rendering
    sumie: {
        brushTextureCount: 3,
        brushTextures: [
            { alpha: 15, offset: { x: 0.3, y: 0.3 } },
            { alpha: 10, offset: { x: -0.2, y: 0.4 } },
            { alpha: 8, offset: { x: 0.1, y: -0.3 } }
        ],
        brushTextureScale: 1.1    // Scale for brush texture relative to shape
    },

    // Watercolor rendering
    watercolor: {
        layerCount: 3,
        layers: [
            { alpha: 30, offset: { x: 0.5, y: 0.5 } },
            { alpha: 20, offset: { x: -0.3, y: 0.6 } },
            { alpha: 15, offset: { x: 0.2, y: -0.4 } }
        ],
        layerScale: 1.05          // Scale for watercolor layers relative to shape
    },

    // Default scaling and geometry
    geometry: {
        defaultSizeScale: 1,      // Default size scale for rendering
        eyeRadiusBase: 0.5,       // Base eye radius
        eyeRadiusOuter: 0.7       // Outer eye radius (white part)
    }
};
