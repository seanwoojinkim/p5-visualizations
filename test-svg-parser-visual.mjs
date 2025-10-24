/**
 * Visual ASCII representation of parsed body.svg
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DOMParser } from 'xmldom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read SVG
const svgPath = join(__dirname, 'assets/koi/body-parts/body.svg');
const svgText = readFileSync(svgPath, 'utf-8');

function parsePolygonPoints(pointsString) {
    const vertices = [];
    const cleaned = pointsString.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
    const coords = cleaned.split(' ').map(n => parseFloat(n));
    for (let i = 0; i < coords.length - 1; i += 2) {
        vertices.push({ x: coords[i], y: coords[i + 1] });
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

// Parse
const parser = new DOMParser();
const doc = parser.parseFromString(svgText, 'image/svg+xml');
const polygon = doc.getElementsByTagName('polygon')[0];
const pointsAttr = polygon.getAttribute('points');
const rawVertices = parsePolygonPoints(pointsAttr);
const normalizedVertices = normalizeVertices(rawVertices, 16, 8);

// ASCII art visualization
const width = 80;
const height = 30;
const canvas = Array(height).fill(null).map(() => Array(width).fill(' '));

// Draw axes
const midX = Math.floor(width / 2);
const midY = Math.floor(height / 2);
for (let x = 0; x < width; x++) canvas[midY][x] = '-';
for (let y = 0; y < height; y++) canvas[y][midX] = '|';
canvas[midY][midX] = '+';

// Draw shape
const scaleX = width / 20;  // 20 units wide view
const scaleY = height / 10; // 10 units tall view

for (let i = 0; i < normalizedVertices.length; i++) {
    const v = normalizedVertices[i];
    const nextV = normalizedVertices[(i + 1) % normalizedVertices.length];

    // Convert to screen coordinates
    const x1 = Math.floor(midX + v.x * scaleX);
    const y1 = Math.floor(midY - v.y * scaleY);
    const x2 = Math.floor(midX + nextV.x * scaleX);
    const y2 = Math.floor(midY - nextV.y * scaleY);

    // Simple line drawing (Bresenham-ish)
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    let x = x1;
    let y = y1;

    while (true) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
            canvas[y][x] = '█';
        }
        if (x === x2 && y === y2) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}

// Print
console.log('\n' + '='.repeat(80));
console.log('KOI BODY SHAPE - Normalized Coordinates (16×8 units)');
console.log('='.repeat(80));
console.log();
console.log(canvas.map(row => row.join('')).join('\n'));
console.log();
console.log('Legend:');
console.log('  █ = Body outline (parsed from body.svg)');
console.log('  + = Origin (0, 0)');
console.log('  | = Y-axis   - = X-axis');
console.log();
console.log('This shape will be deformed by wave animation in the koi renderer.');
console.log('Front (right side) → Back (left side)');
console.log();
