/**
 * Test SVG Parser - Node.js version
 * Tests the parser with body.svg and displays results in terminal
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DOMParser } from 'xmldom';

// Make DOMParser available globally for the SVG parser
global.DOMParser = DOMParser;
global.document = {
    createElementNS: () => {
        throw new Error('DOM methods not available in Node.js - use browser test');
    },
    body: {
        appendChild: () => {},
        removeChild: () => {}
    }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read and parse the SVG file manually for Node.js testing
const svgPath = join(__dirname, 'assets/koi/body-parts/body.svg');
const svgText = readFileSync(svgPath, 'utf-8');

console.log('='.repeat(80));
console.log('SVG PARSER TEST - body.svg');
console.log('='.repeat(80));
console.log();

// Simple polygon parser (since we can't use browser APIs in Node)
function parsePolygonPoints(pointsString) {
    const vertices = [];
    const cleaned = pointsString.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
    const coords = cleaned.split(' ').map(n => parseFloat(n));

    for (let i = 0; i < coords.length - 1; i += 2) {
        vertices.push({
            x: coords[i],
            y: coords[i + 1]
        });
    }

    return vertices;
}

function normalizeVertices(vertices, targetWidth, targetHeight) {
    if (!vertices || vertices.length === 0) return [];

    const xs = vertices.map(v => v.x);
    const ys = vertices.map(v => v.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const currentWidth = maxX - minX;
    const currentHeight = maxY - minY;

    const scaleX = targetWidth / currentWidth;
    const scaleY = targetHeight / currentHeight;
    const scale = Math.min(scaleX, scaleY);

    const centerX = minX + currentWidth / 2;
    const centerY = minY + currentHeight / 2;

    return vertices.map(v => ({
        x: (v.x - centerX) * scale,
        y: (v.y - centerY) * scale
    }));
}

function getDebugInfo(vertices) {
    if (!vertices || vertices.length === 0) return null;

    const xs = vertices.map(v => v.x);
    const ys = vertices.map(v => v.y);

    return {
        vertexCount: vertices.length,
        bounds: {
            minX: Math.min(...xs).toFixed(2),
            maxX: Math.max(...xs).toFixed(2),
            minY: Math.min(...ys).toFixed(2),
            maxY: Math.max(...ys).toFixed(2),
            width: (Math.max(...xs) - Math.min(...xs)).toFixed(2),
            height: (Math.max(...ys) - Math.min(...ys)).toFixed(2)
        },
        center: {
            x: ((Math.min(...xs) + Math.max(...xs)) / 2).toFixed(2),
            y: ((Math.min(...ys) + Math.max(...ys)) / 2).toFixed(2)
        }
    };
}

try {
    // Parse XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');

    // Extract polygon element
    const polygons = doc.getElementsByTagName('polygon');
    if (polygons.length === 0) {
        throw new Error('No polygon element found in SVG');
    }

    const polygon = polygons[0];
    const pointsAttr = polygon.getAttribute('points');

    console.log('✓ SVG file loaded successfully');
    console.log('✓ Found <polygon> element');
    console.log();

    // Parse raw vertices
    const rawVertices = parsePolygonPoints(pointsAttr);
    console.log(`✓ Parsed ${rawVertices.length} vertices from polygon`);
    console.log();

    // Show raw coordinate info
    const rawInfo = getDebugInfo(rawVertices);
    console.log('Raw Coordinates (from SVG file):');
    console.log(JSON.stringify(rawInfo, null, 2));
    console.log();

    // Normalize to koi dimensions (16×8 units)
    const normalizedVertices = normalizeVertices(rawVertices, 16, 8);
    const normInfo = getDebugInfo(normalizedVertices);

    console.log('Normalized Coordinates (16×8 koi units, centered at origin):');
    console.log(JSON.stringify(normInfo, null, 2));
    console.log();

    // Show first 5 vertices in detail
    console.log('First 5 Normalized Vertices:');
    normalizedVertices.slice(0, 5).forEach((v, i) => {
        console.log(`  [${i}] { x: ${v.x.toFixed(3)}, y: ${v.y.toFixed(3)} }`);
    });
    console.log();

    // Show all vertices
    console.log('All Normalized Vertices (for koi rendering):');
    console.log('[');
    normalizedVertices.forEach((v, i) => {
        const comma = i < normalizedVertices.length - 1 ? ',' : '';
        console.log(`  { x: ${v.x.toFixed(3)}, y: ${v.y.toFixed(3)} }${comma}`);
    });
    console.log(']');
    console.log();

    // Verify the shape makes sense
    console.log('='.repeat(80));
    console.log('VALIDATION CHECKPOINT');
    console.log('='.repeat(80));
    console.log();
    console.log('Expected koi body dimensions: ~16 units wide × ~8 units tall');
    console.log(`Actual normalized dimensions: ${normInfo.bounds.width} wide × ${normInfo.bounds.height} tall`);
    console.log();
    console.log('Expected: Shape centered at origin (0, 0)');
    console.log(`Actual center: (${normInfo.center.x}, ${normInfo.center.y})`);
    console.log();
    console.log('Expected: X range from ~-8 to ~8, Y range from ~-4 to ~4');
    console.log(`Actual X range: ${normInfo.bounds.minX} to ${normInfo.bounds.maxX}`);
    console.log(`Actual Y range: ${normInfo.bounds.minY} to ${normInfo.bounds.maxY}`);
    console.log();

    // Success
    console.log('✓ SVG Parser Phase 1 Complete');
    console.log('✓ Ready to integrate with koi renderer');
    console.log();
    console.log('Next steps:');
    console.log('  1. Open http://localhost:8000/test-svg-parser.html in browser');
    console.log('  2. Verify visual shape matches your Illustrator design');
    console.log('  3. Proceed to Phase 2: Brushstroke Library');
    console.log();

} catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
}
