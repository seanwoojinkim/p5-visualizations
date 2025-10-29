/**
 * WaterBackground
 * Animated painterly water background using brushstroke particles
 * Based on /workspace/water-background/ implementation
 */

export class WaterBackground {
    constructor(p5Instance, brushTextureImages, options = {}) {
        this.p5 = p5Instance;
        this.brushTextures = brushTextureImages.spots || []; // Use spot textures for water
        this.layers = [];
        this.noiseEngine = new SimplexNoise(Date.now());
        this.startTime = this.p5.millis();
        this.isMobile = options.isMobile || false;
        this.staticBackgroundImage = options.staticBackgroundImage || null; // Static painted background

        // Water color palette - matching water-background.png reference
        this.waterColors = {
            deep: { r: 15, g: 60, b: 180 },       // Deep cobalt blue
            mid: { r: 70, g: 140, b: 210 },       // Bright ocean blue
            surface: { r: 180, g: 220, b: 240 },  // Light cyan
            white: { r: 230, g: 240, b: 250 }     // Near-white highlights
        };

        // Performance-optimized parameters with mobile detection
        this.params = {
            particleCount: this.isMobile ? 30 : 150,  // Minimal particles on mobile
            numLayers: this.isMobile ? 1 : 2,          // Single layer on mobile
            flowSpeed: 0.5,
            noiseCacheTime: this.isMobile ? 1000 : 500 // Cache noise longer on mobile
        };

        console.log(`🌊 Water background: Mobile=${this.isMobile}, Particles=${this.params.particleCount}, Layers=${this.params.numLayers}`);
        console.log(`   Scale range: ${this.isMobile ? '135-225px' : '150-300px'}`);
    }

    /**
     * Initialize water layers with particles
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    init(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        const particlesPerLayer = Math.floor(this.params.particleCount / this.params.numLayers);

        // Create depth layers (0 = deep, 1 = surface)
        for (let i = 0; i < this.params.numLayers; i++) {
            // Handle single layer case to avoid division by zero (NaN)
            const depth = this.params.numLayers === 1 ? 0.5 : i / (this.params.numLayers - 1);
            const layer = new WaterLayer(depth, this.p5, this.isMobile);

            layer.generateBrushstrokes(
                particlesPerLayer,
                canvasWidth,
                canvasHeight,
                this.waterColors, // Pass full palette
                this.brushTextures
            );

            this.layers.push(layer);
        }

        console.log(`🌊 Water background: ${this.layers.length} layers, ${this.params.particleCount} total particles`);
    }

    /**
     * Update all water layers
     */
    update() {
        const time = this.p5.millis() - this.startTime;

        for (const layer of this.layers) {
            layer.update(this.noiseEngine, time, this.params, this.canvasWidth, this.canvasHeight);
        }
    }

    /**
     * Render water background to pixel buffer
     * @param {p5.Graphics} pg - Pixel buffer context
     */
    render(pg) {
        // Draw static painted water background first with gentle pulsing
        if (this.staticBackgroundImage) {
            pg.push();

            // Gentle breathing/pulsing effect (zooms in/out slightly)
            const time = this.p5.millis() - this.startTime;
            const pulseSpeed = 0.0003; // Very slow pulsing
            const pulseAmount = 0.03; // 3% zoom range (1.0 to 1.03)
            const pulse = 1.0 + Math.sin(time * pulseSpeed) * pulseAmount;

            // Center the scaling so it zooms from center
            pg.translate(pg.width / 2, pg.height / 2);
            pg.scale(pulse);
            pg.translate(-pg.width / 2, -pg.height / 2);

            pg.image(this.staticBackgroundImage, 0, 0, pg.width, pg.height);
            pg.pop();
        } else {
            // Fallback to cream paper background if no static image
            pg.background(240, 235, 220);
        }

        // Render animated particle layers on top with BLEND mode
        pg.push();

        for (const layer of this.layers) {
            layer.render(pg);
        }

        pg.pop();
    }
}

/**
 * WaterLayer - A depth layer of water brushstrokes
 */
class WaterLayer {
    constructor(depth, p5Instance, isMobile = false) {
        this.depth = depth; // 0 (deep) to 1 (surface)
        this.p5 = p5Instance;
        this.isMobile = isMobile;
        this.brushstrokes = [];

        // Depth-based properties
        this.depthScale = 0.5 + (depth * 0.5); // Deep = smaller, surface = larger
        this.depthAlpha = 0.3 + (depth * 0.7); // Deep = more transparent
        this.flowMultiplier = 0.3 + (depth * 0.7); // Surface flows faster
    }

    addBrushstroke(brushstroke) {
        const originalScale = brushstroke.baseScale;
        brushstroke.baseScale *= this.depthScale;
        brushstroke.scale = brushstroke.baseScale;
        brushstroke.baseOpacity *= this.depthAlpha;
        brushstroke.opacity = brushstroke.baseOpacity;

        // Debug log first brushstroke
        if (this.brushstrokes.length === 0) {
            console.log(`   🔧 After depthScale (${this.depthScale.toFixed(2)}): ${originalScale.toFixed(1)}px → ${brushstroke.baseScale.toFixed(1)}px`);
        }

        this.brushstrokes.push(brushstroke);
    }

    generateBrushstrokes(count, canvasWidth, canvasHeight, colorPalette, brushTextures) {
        // Add padding to ensure full coverage at edges
        const padding = 100;

        // Color palette array for random selection
        const colors = [colorPalette.deep, colorPalette.mid, colorPalette.surface, colorPalette.white];

        // Create water clusters (like cloud shapes) for strategic particle placement
        const numClusters = this.isMobile ? 3 : 5;
        const clusters = [];

        // Evenly distribute clusters across canvas (grid-based placement)
        const cols = this.isMobile ? 2 : 3;
        const rows = Math.ceil(numClusters / cols);
        const cellWidth = (canvasWidth + padding * 2) / cols;
        const cellHeight = (canvasHeight + padding * 2) / rows;

        let clusterIndex = 0;
        for (let row = 0; row < rows && clusterIndex < numClusters; row++) {
            for (let col = 0; col < cols && clusterIndex < numClusters; col++) {
                // Place in center of cell with slight random offset
                const centerX = -padding + (col + 0.5) * cellWidth;
                const centerY = -padding + (row + 0.5) * cellHeight;
                const offsetX = (Math.random() - 0.5) * cellWidth * 0.3;
                const offsetY = (Math.random() - 0.5) * cellHeight * 0.3;

                clusters.push({
                    x: centerX + offsetX,
                    y: centerY + offsetY,
                    radius: this.isMobile ? 250 : 350, // Cluster spread radius
                    color: colors[Math.floor(Math.random() * colors.length)]
                });
                clusterIndex++;
            }
        }

        const particlesPerCluster = Math.ceil(count / numClusters);

        for (const cluster of clusters) {
            for (let i = 0; i < particlesPerCluster; i++) {
                // Distribute particles within cluster using Gaussian-like distribution
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * Math.random() * cluster.radius; // Squared for center bias
                const x = cluster.x + Math.cos(angle) * distance;
                const y = cluster.y + Math.sin(angle) * distance;

                // Mobile uses small particles for optimal performance
                const scaleMin = this.isMobile ? 150 : 150;
                const scaleRange = this.isMobile ? 150 : 150;
                const finalBaseScale = scaleMin + Math.random() * scaleRange;

                // Debug log first particle
                if (i === 0 && cluster === clusters[0]) {
                    console.log(`   Creating ${numClusters} clusters with ~${particlesPerCluster} particles each`);
                    console.log(`   First particle baseScale: ${finalBaseScale}px, isMobile: ${this.isMobile}`);
                }

                const brushstroke = new WaterBrushstroke(x, y, this, {
                    baseScale: finalBaseScale,
                    baseOpacity: 0.3 + Math.random() * 0.4,
                    baseColor: cluster.color, // Use cluster's color for cohesion
                    flowSpeed: 0.5,
                    brushTextures: brushTextures,
                    p5: this.p5,
                    clusterCenter: { x: cluster.x, y: cluster.y }, // Store cluster center
                    clusterRadius: cluster.radius
                });

                this.addBrushstroke(brushstroke);
            }
        }
    }

    update(noiseEngine, time, params, canvasWidth, canvasHeight) {
        for (const brushstroke of this.brushstrokes) {
            brushstroke.update(noiseEngine, time, params, canvasWidth, canvasHeight);
        }
    }

    render(pg) {
        for (const brushstroke of this.brushstrokes) {
            brushstroke.render(pg);
        }
    }
}

/**
 * WaterBrushstroke - Individual particle that looks like a brushstroke of water
 */
class WaterBrushstroke {
    constructor(x, y, layer, params = {}) {
        this.x = x;
        this.y = y;
        this.baseY = y;
        this.layer = layer;
        this.p5 = params.p5;

        // Visual properties
        this.baseScale = params.baseScale || 200;
        this.scale = this.baseScale;
        this.baseOpacity = params.baseOpacity || 0.5;
        this.opacity = this.baseOpacity;
        this.baseColor = params.baseColor || { r: 100, g: 150, b: 200 };
        this.color = this.generateWaterColor(this.baseColor, layer.depth);

        // Movement properties
        this.flowSpeed = params.flowSpeed || 0.5;
        this.noiseOffset = Math.random() * 1000;
        this.driftX = 0;
        this.driftY = 0;
        this.lastNoiseTime = 0;

        // Cluster constraints (keep particles grouped like clouds)
        this.clusterCenter = params.clusterCenter || { x, y };
        this.clusterRadius = params.clusterRadius || 300;
        this.maxDriftFromCenter = this.clusterRadius * 0.8; // Stay within 80% of cluster radius

        // Texture
        this.brushTextures = params.brushTextures || [];
        this.textureIndex = Math.floor(Math.random() * this.brushTextures.length);
    }

    generateWaterColor(baseColor, depth) {
        // Keep colors vibrant with minimal variation
        const variation = 0.9 + Math.random() * 0.2; // 0.9 to 1.1 - very tight range
        const colorShift = (Math.random() - 0.5) * 15; // Minimal shift to keep saturation

        return {
            r: Math.max(0, Math.min(255, (baseColor.r + colorShift) * variation)),
            g: Math.max(0, Math.min(255, (baseColor.g + colorShift * 0.5) * variation)),
            b: Math.max(0, Math.min(255, baseColor.b * variation)) // Keep blue strong
        };
    }

    update(noiseEngine, time, params, canvasWidth, canvasHeight) {
        // Very slow drift - sample noise less frequently for performance
        // Cache time varies by device (1000ms mobile, 500ms desktop)
        const cacheTime = params.noiseCacheTime || 500;
        if (!this.lastNoiseTime || time - this.lastNoiseTime > cacheTime) {
            this.lastNoiseTime = time;
            const noiseX = noiseEngine.noise(this.x * 0.002 + this.noiseOffset, time * 0.0001, 0);
            const noiseY = noiseEngine.noise(this.x * 0.002 + this.noiseOffset, time * 0.0001, 100);

            const driftSpeed = (params.flowSpeed || this.flowSpeed) * 0.15;
            this.driftX = (noiseX - 0.5) * driftSpeed;
            this.driftY = (noiseY - 0.5) * driftSpeed;
        }

        // Apply cached drift
        this.x += this.driftX;
        this.y += this.driftY;

        // Hard constraint: clamp particles within cluster bounds (like clouds in their shape)
        // Clusters are stationary - particles can ONLY drift within the cluster radius
        const dx = this.x - this.clusterCenter.x;
        const dy = this.y - this.clusterCenter.y;
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);

        if (distFromCenter > this.maxDriftFromCenter) {
            // Clamp to boundary - particles cannot leave cluster
            const angle = Math.atan2(dy, dx);
            this.x = this.clusterCenter.x + Math.cos(angle) * this.maxDriftFromCenter;
            this.y = this.clusterCenter.y + Math.sin(angle) * this.maxDriftFromCenter;
        }

        // Keep scale and opacity constant (no pulsing/breathing)
        this.scale = this.baseScale;
        this.opacity = this.baseOpacity;
    }

    render(pg) {
        if (this.textureIndex >= this.brushTextures.length) return;
        const texture = this.brushTextures[this.textureIndex];
        if (!texture) return;

        // Debug log first render
        if (!this.hasLoggedRender) {
            console.log(`   🎨 Rendering particle: scale=${this.scale.toFixed(1)}px (baseScale=${this.baseScale.toFixed(1)}px)`);
            this.hasLoggedRender = true;
        }

        pg.push();
        pg.translate(this.x, this.y);

        // Apply color tint
        pg.tint(this.color.r, this.color.g, this.color.b, this.opacity * 255);

        // Draw brushstroke
        pg.imageMode(pg.CENTER);
        pg.image(texture, 0, 0, this.scale, this.scale);

        pg.noTint();
        pg.pop();
    }
}

/**
 * SimplexNoise - 2D noise generator
 * Simplified version for performance
 */
class SimplexNoise {
    constructor(seed = Math.random()) {
        this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
                     [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
                     [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
        this.p = [];
        for(let i=0; i<256; i++) {
            this.p[i] = Math.floor(this.seededRandom(seed + i) * 256);
        }
        this.perm = [];
        for(let i=0; i<512; i++) {
            this.perm[i]=this.p[i & 255];
        }
    }

    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    dot(g, x, y) {
        return g[0]*x + g[1]*y;
    }

    noise(xin, yin, zin = 0) {
        let n0, n1, n2;
        const F2 = 0.5*(Math.sqrt(3.0)-1.0);
        const s = (xin+yin)*F2;
        const i = Math.floor(xin+s);
        const j = Math.floor(yin+s);
        const G2 = (3.0-Math.sqrt(3.0))/6.0;
        const t = (i+j)*G2;
        const X0 = i-t;
        const Y0 = j-t;
        const x0 = xin-X0;
        const y0 = yin-Y0;
        let i1, j1;
        if(x0>y0) {i1=1; j1=0;}
        else {i1=0; j1=1;}
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;
        const ii = i & 255;
        const jj = j & 255;
        const gi0 = this.perm[ii+this.perm[jj]] % 12;
        const gi1 = this.perm[ii+i1+this.perm[jj+j1]] % 12;
        const gi2 = this.perm[ii+1+this.perm[jj+1]] % 12;
        let t0 = 0.5 - x0*x0-y0*y0;
        if(t0<0) n0 = 0.0;
        else {
            t0 *= t0;
            n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
        }
        let t1 = 0.5 - x1*x1-y1*y1;
        if(t1<0) n1 = 0.0;
        else {
            t1 *= t1;
            n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
        }
        let t2 = 0.5 - x2*x2-y2*y2;
        if(t2<0) n2 = 0.0;
        else {
            t2 *= t2;
            n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
        }
        return 70.0 * (n0 + n1 + n2);
    }
}
