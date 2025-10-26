#!/usr/bin/env node

/**
 * Pre-process Brush Textures
 *
 * This script converts brush texture PNGs to have brightness → alpha mapping.
 * This eliminates the need for runtime pixel manipulation (saves 200-500ms on startup).
 *
 * Process: For each pixel, convert brightness to alpha channel:
 *   - Dark areas (brightness ~0) → transparent (alpha 0)
 *   - Light areas (brightness ~255) → opaque (alpha 255)
 *   - Set RGB to white (255,255,255) so tint() can apply colors
 *
 * Usage: node hack/preprocess_brush_textures.js
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const TEXTURES_DIR = path.join(__dirname, '../assets/koi/brushstrokes');

// List of textures to process
const TEXTURES_TO_PROCESS = [
    'body.png',
    'spot-1.png',
    'spot-2.png',
    'spot-3.png',
    'spot-4.png',
    'spot-5.png',
];

/**
 * Convert brightness to alpha for a single texture
 * Mirrors the logic in brush-textures.js:invertBrightnessToAlpha()
 */
async function processTexture(inputPath, outputPath) {
    console.log(`Processing: ${path.basename(inputPath)}...`);

    const img = await loadImage(inputPath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Process each pixel: brightness → alpha
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Calculate brightness (0-255)
        const brightness = (r + g + b) / 3;

        // Set to white with brightness as alpha
        pixels[i] = 255;       // R
        pixels[i + 1] = 255;   // G
        pixels[i + 2] = 255;   // B
        pixels[i + 3] = brightness; // A (brightness → alpha)
    }

    // Put processed pixels back
    ctx.putImageData(imageData, 0, 0);

    // Save processed image
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);

    const sizeBefore = fs.statSync(inputPath).size;
    const sizeAfter = fs.statSync(outputPath).size;
    console.log(`  ✓ ${path.basename(outputPath)} (${Math.round(sizeAfter/1024)}KB, was ${Math.round(sizeBefore/1024)}KB)`);
}

/**
 * Main processing function
 */
async function main() {
    console.log('🖌️  Pre-processing brush textures...\n');

    // Check if textures directory exists
    if (!fs.existsSync(TEXTURES_DIR)) {
        console.error(`❌ Error: Textures directory not found: ${TEXTURES_DIR}`);
        process.exit(1);
    }

    let processed = 0;
    let skipped = 0;

    for (const filename of TEXTURES_TO_PROCESS) {
        const inputPath = path.join(TEXTURES_DIR, filename);
        const outputPath = path.join(TEXTURES_DIR, filename.replace('.png', '-processed.png'));

        // Check if input file exists
        if (!fs.existsSync(inputPath)) {
            console.log(`⚠️  Skipping ${filename} (not found)`);
            skipped++;
            continue;
        }

        // Skip if already processed and up-to-date
        if (fs.existsSync(outputPath)) {
            const inputMtime = fs.statSync(inputPath).mtime;
            const outputMtime = fs.statSync(outputPath).mtime;

            if (outputMtime > inputMtime) {
                console.log(`⏭️  Skipping ${filename} (already up-to-date)`);
                skipped++;
                continue;
            }
        }

        try {
            await processTexture(inputPath, outputPath);
            processed++;
        } catch (error) {
            console.error(`❌ Error processing ${filename}:`, error.message);
            process.exit(1);
        }
    }

    console.log(`\n✅ Done! Processed ${processed} textures, skipped ${skipped}`);
    console.log('\nNext steps:');
    console.log('  1. Update simulation-app.js and editor-app.js to load *-processed.png files');
    console.log('  2. Remove invertBrightnessToAlpha() from brush-textures.js');
    console.log('  3. Test rendering to verify textures look identical');
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { processTexture };
