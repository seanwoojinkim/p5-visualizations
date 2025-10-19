let flock = [];
let pg; // Graphics buffer for low-res rendering

// Audio variables
let audioContext;
let analyser;
let audioSource;
let audioElement;
let frequencyData;
let audioLoaded = false;
let isPlaying = false;

// Parameters
let params = {
    pixelScale: 4,
    numBoids: 80,
    maxSpeed: 2,
    maxForce: 0.1,
    separationWeight: 1.2,
    alignmentWeight: 1.2,
    cohesionWeight: 1.0,
    trailAlpha: 40,
    audioReactivity: 0.5
};

function setup() {
    createCanvas(windowWidth, windowHeight);

    // Create low-res graphics buffer
    pg = createGraphics(
        floor(width / params.pixelScale),
        floor(height / params.pixelScale)
    );

    // Create initial flock
    initFlock();

    // Set up control listeners
    setupControls();
}

function initFlock() {
    flock = [];
    for (let i = 0; i < params.numBoids; i++) {
        flock.push(new Boid());
    }
}

function setupControls() {
    // Audio file upload
    document.getElementById('audioFile').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            loadAudioFile(file);
        }
    });

    // Play/Pause button
    document.getElementById('playPause').addEventListener('click', () => {
        if (!audioLoaded) return;

        if (isPlaying) {
            audioElement.pause();
            isPlaying = false;
            document.getElementById('playPause').textContent = 'Play Audio';
        } else {
            audioElement.play();
            isPlaying = true;
            document.getElementById('playPause').textContent = 'Pause Audio';
        }
    });

    // Audio reactivity
    document.getElementById('reactivity').addEventListener('input', (e) => {
        params.audioReactivity = parseFloat(e.target.value);
        document.getElementById('reactivityValue').textContent = params.audioReactivity.toFixed(1);
    });

    // Pixel scale
    document.getElementById('pixelScale').addEventListener('input', (e) => {
        params.pixelScale = parseInt(e.target.value);
        document.getElementById('pixelScaleValue').textContent = params.pixelScale;
        pg = createGraphics(
            floor(width / params.pixelScale),
            floor(height / params.pixelScale)
        );
    });

    // Boid count
    document.getElementById('boidCount').addEventListener('input', (e) => {
        let newCount = parseInt(e.target.value);
        document.getElementById('boidCountValue').textContent = newCount;

        if (newCount > params.numBoids) {
            // Add more boids
            for (let i = params.numBoids; i < newCount; i++) {
                flock.push(new Boid());
            }
        } else {
            // Remove boids
            flock = flock.slice(0, newCount);
        }
        params.numBoids = newCount;
    });

    // Max speed
    document.getElementById('maxSpeed').addEventListener('input', (e) => {
        params.maxSpeed = parseFloat(e.target.value);
        document.getElementById('maxSpeedValue').textContent = params.maxSpeed.toFixed(1);
    });

    // Separation
    document.getElementById('separation').addEventListener('input', (e) => {
        params.separationWeight = parseFloat(e.target.value);
        document.getElementById('separationValue').textContent = params.separationWeight.toFixed(1);
    });

    // Alignment
    document.getElementById('alignment').addEventListener('input', (e) => {
        params.alignmentWeight = parseFloat(e.target.value);
        document.getElementById('alignmentValue').textContent = params.alignmentWeight.toFixed(1);
    });

    // Cohesion
    document.getElementById('cohesion').addEventListener('input', (e) => {
        params.cohesionWeight = parseFloat(e.target.value);
        document.getElementById('cohesionValue').textContent = params.cohesionWeight.toFixed(1);
    });

    // Trail
    document.getElementById('trail').addEventListener('input', (e) => {
        params.trailAlpha = parseInt(e.target.value);
        document.getElementById('trailValue').textContent = params.trailAlpha;
    });

    // Reset button
    document.getElementById('reset').addEventListener('click', () => {
        initFlock();
    });
}

function loadAudioFile(file) {
    const url = URL.createObjectURL(file);

    // Create audio element if it doesn't exist
    if (!audioElement) {
        audioElement = new Audio();
        audioElement.loop = true;
    }

    audioElement.src = url;

    // Set up Web Audio API
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        frequencyData = new Uint8Array(analyser.frequencyBinCount);

        audioSource = audioContext.createMediaElementSource(audioElement);
        audioSource.connect(analyser);
        analyser.connect(audioContext.destination);
    }

    audioLoaded = true;
    document.getElementById('playPause').disabled = false;
    document.getElementById('playPause').textContent = 'Play Audio';
}

function getAudioData() {
    if (!audioLoaded || !isPlaying) {
        return {
            amplitude: 0,
            bass: 0,
            mid: 0,
            treble: 0
        };
    }

    analyser.getByteFrequencyData(frequencyData);

    // Calculate average amplitude
    let sum = 0;
    for (let i = 0; i < frequencyData.length; i++) {
        sum += frequencyData[i];
    }
    let amplitude = sum / frequencyData.length / 255;

    // Get frequency bands
    const bass = getFrequencyRange(0, 4) / 255;
    const mid = getFrequencyRange(4, 16) / 255;
    const treble = getFrequencyRange(16, 32) / 255;

    return { amplitude, bass, mid, treble };
}

function getFrequencyRange(start, end) {
    let sum = 0;
    for (let i = start; i < end && i < frequencyData.length; i++) {
        sum += frequencyData[i];
    }
    return sum / (end - start);
}

function draw() {
    // Get audio data
    const audio = getAudioData();

    // Deep dark green pond background with gentle fade
    // Bass affects background brightness subtly
    const bgBase = 15 + audio.bass * 5 * params.audioReactivity;
    pg.background(bgBase - 5, bgBase + 5, bgBase, params.trailAlpha);

    // Update and display all boids
    for (let boid of flock) {
        boid.flock(flock, audio);
        boid.update(audio);
        boid.show(audio);
    }

    // Scale up the low-res buffer
    image(pg, 0, 0, width, height);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    pg = createGraphics(
        floor(width / params.pixelScale),
        floor(height / params.pixelScale)
    );
}

class Boid {
    constructor() {
        this.position = createVector(random(pg.width), random(pg.height));
        this.velocity = p5.Vector.random2D();
        this.velocity.setMag(random(0.5, 1.5));
        this.acceleration = createVector();
        this.perceptionRadius = 80;  // Larger perception for gentler reactions

        // Force smoothing - track previous frame's forces to reduce jerkiness
        this.previousSeparation = createVector();
        this.previousAlignment = createVector();
        this.previousCohesion = createVector();

        // Traditional koi varieties with weighted distribution
        // Each variety has a weight representing its percentage in the population
        const koiVarieties = [
            // Gosanke (35% total)
            { name: 'kohaku', base: { h: 0, s: 0, b: 90 }, weight: 15 },
            { name: 'sanke', base: { h: 0, s: 0, b: 90 }, weight: 10 },
            { name: 'showa', base: { h: 0, s: 0, b: 30 }, weight: 10 },

            // Utsurimono & Bekko (15% total)
            { name: 'shiro-utsuri', base: { h: 0, s: 0, b: 25 }, weight: 5 },
            { name: 'hi-utsuri', base: { h: 0, s: 0, b: 25 }, weight: 4 },
            { name: 'ki-utsuri', base: { h: 0, s: 0, b: 25 }, weight: 2 },
            { name: 'shiro-bekko', base: { h: 0, s: 0, b: 88 }, weight: 2 },
            { name: 'aka-bekko', base: { h: 5, s: 75, b: 75 }, weight: 1 },
            { name: 'ki-bekko', base: { h: 50, s: 60, b: 80 }, weight: 1 },

            // Hikarimono (15% total)
            { name: 'yamabuki-ogon', base: { h: 45, s: 50, b: 85 }, weight: 5 },
            { name: 'platinum-ogon', base: { h: 200, s: 8, b: 88 }, weight: 3 },
            { name: 'hariwake', base: { h: 0, s: 0, b: 88 }, weight: 4 },
            { name: 'kujaku', base: { h: 0, s: 0, b: 88 }, weight: 3 },

            // Asagi / Shusui (8% total)
            { name: 'asagi', base: { h: 200, s: 35, b: 65 }, weight: 5 },
            { name: 'shusui', base: { h: 200, s: 40, b: 68 }, weight: 3 },

            // Koromo / Goshiki (7% total)
            { name: 'ai-goromo', base: { h: 0, s: 0, b: 90 }, weight: 3 },
            { name: 'budo-goromo', base: { h: 0, s: 0, b: 90 }, weight: 2 },
            { name: 'goshiki', base: { h: 210, s: 25, b: 60 }, weight: 2 },

            // Specialty (10% total)
            { name: 'tancho', base: { h: 0, s: 0, b: 90 }, weight: 3 },
            { name: 'gin-rin-kohaku', base: { h: 0, s: 0, b: 90 }, weight: 2 },
            { name: 'doitsu-kohaku', base: { h: 0, s: 0, b: 90 }, weight: 3 },
            { name: 'butterfly-kohaku', base: { h: 0, s: 0, b: 90 }, weight: 2 },

            // Solid-color / Naturalistic (10% total)
            { name: 'chagoi', base: { h: 30, s: 35, b: 50 }, weight: 3 },
            { name: 'soragoi', base: { h: 0, s: 0, b: 60 }, weight: 3 },
            { name: 'benigoi', base: { h: 5, s: 80, b: 70 }, weight: 2 },
            { name: 'ochiba', base: { h: 40, s: 30, b: 70 }, weight: 2 }
        ];

        // Weighted random selection
        const totalWeight = koiVarieties.reduce((sum, v) => sum + v.weight, 0);
        let randomValue = random(totalWeight);
        let cumulativeWeight = 0;

        for (let variety of koiVarieties) {
            cumulativeWeight += variety.weight;
            if (randomValue < cumulativeWeight) {
                this.variety = variety;
                break;
            }
        }

        this.color = this.variety.base;

        // Size variation - some koi are bigger/smaller
        this.sizeMultiplier = random(0.6, 1.4);

        // Length variation - some are more elongated
        this.lengthMultiplier = random(0.85, 1.25);

        // Tail length variation - longer range, biased toward longer tails
        this.tailLength = random(0.9, 1.8);

        // Generate unique spot pattern for this koi
        this.spots = [];
        this.generatePattern();
    }

    generatePattern() {
        // Generate unique spot patterns based on variety
        // Each spot is attached to a body segment
        const numSpots = floor(random(2, 6));

        switch(this.variety.name) {
            // GOSANKE (Big Three)
            case 'kohaku':
                // Red spots on white - pattern should start at head, end before tail
                for (let i = 0; i < numSpots; i++) {
                    this.spots.push({
                        segment: floor(random(0, 6)),
                        offsetY: random(-1.5, 1.5),
                        size: random(2, 4.5),
                        color: { h: random(0, 15), s: random(70, 85), b: random(70, 80) }
                    });
                }
                break;

            case 'sanke':
                // Red and black spots on white - black never on head
                for (let i = 0; i < numSpots; i++) {
                    let isBlack = random() < 0.3;
                    this.spots.push({
                        segment: isBlack ? floor(random(2, 7)) : floor(random(0, 6)),
                        offsetY: random(-1.5, 1.5),
                        size: isBlack ? random(0.8, 2) : random(2, 4),
                        color: isBlack ?
                            { h: 0, s: 0, b: 20 } :
                            { h: random(0, 15), s: random(70, 85), b: random(70, 80) }
                    });
                }
                break;

            case 'showa':
                // Red and white spots on black - black appears on head
                for (let i = 0; i < numSpots + 2; i++) {
                    let isWhite = random() < 0.5;
                    this.spots.push({
                        segment: floor(random(0, 7)),
                        offsetY: random(-1.8, 1.8),
                        size: random(1.8, 4.5),
                        color: isWhite ?
                            { h: 0, s: 0, b: 90 } :
                            { h: random(0, 15), s: random(70, 85), b: random(70, 80) }
                    });
                }
                break;

            // UTSURIMONO (Reflection Varieties)
            case 'shiro-utsuri':
                // White islands on black - marble effect
                for (let i = 0; i < numSpots + 1; i++) {
                    this.spots.push({
                        segment: floor(random(0, 7)),
                        offsetY: random(-2, 2),
                        size: random(2, 5),
                        color: { h: 0, s: 0, b: 90 }
                    });
                }
                break;

            case 'hi-utsuri':
                // Red on black - fiery and bold
                for (let i = 0; i < numSpots + 1; i++) {
                    this.spots.push({
                        segment: floor(random(0, 7)),
                        offsetY: random(-2, 2),
                        size: random(2.5, 5),
                        color: { h: random(0, 12), s: random(75, 90), b: random(70, 85) }
                    });
                }
                break;

            case 'ki-utsuri':
                // Yellow on black - vibrant lemon-yellow
                for (let i = 0; i < numSpots; i++) {
                    this.spots.push({
                        segment: floor(random(0, 7)),
                        offsetY: random(-1.8, 1.8),
                        size: random(2, 4.5),
                        color: { h: random(55, 65), s: random(70, 85), b: random(80, 90) }
                    });
                }
                break;

            // HIKARIMONO (Metallic Varieties)
            case 'yamabuki-ogon':
            case 'platinum-ogon':
                // Solid metallic - no pattern spots
                break;

            case 'kujaku':
                // Red/orange/gold scales over black reticulation
                for (let i = 0; i < numSpots + 1; i++) {
                    this.spots.push({
                        segment: floor(random(1, 7)),
                        offsetY: random(-1.5, 1.5),
                        size: random(1.5, 3.5),
                        color: { h: random(15, 40), s: random(50, 70), b: random(70, 85) }
                    });
                }
                break;

            case 'hariwake':
                // Orange or yellow patches on metallic white
                for (let i = 0; i < numSpots; i++) {
                    let isOrange = random() < 0.6;
                    this.spots.push({
                        segment: floor(random(0, 6)),
                        offsetY: random(-1.5, 1.5),
                        size: random(2, 4),
                        color: isOrange ?
                            { h: random(20, 35), s: random(60, 75), b: random(75, 85) } :
                            { h: random(50, 60), s: random(50, 65), b: random(80, 90) }
                    });
                }
                break;

            // BEKKO
            case 'shiro-bekko':
                // Small black spots on white along back
                for (let i = 0; i < floor(random(2, 5)); i++) {
                    this.spots.push({
                        segment: floor(random(1, 7)),
                        offsetY: random(-0.8, 0.8),  // Along back mostly
                        size: random(1, 2.5),
                        color: { h: 0, s: 0, b: 20 }
                    });
                }
                break;

            case 'aka-bekko':
                // Black spots on red base
                for (let i = 0; i < floor(random(2, 4)); i++) {
                    this.spots.push({
                        segment: floor(random(1, 7)),
                        offsetY: random(-0.8, 0.8),
                        size: random(1, 2.5),
                        color: { h: 0, s: 0, b: 20 }
                    });
                }
                break;

            case 'ki-bekko':
                // Black spots on yellow - rarest
                for (let i = 0; i < floor(random(1, 3)); i++) {
                    this.spots.push({
                        segment: floor(random(1, 7)),
                        offsetY: random(-0.8, 0.8),
                        size: random(1, 2),
                        color: { h: 0, s: 0, b: 20 }
                    });
                }
                break;

            // BLUE-SCALED TYPES
            case 'asagi':
            case 'shusui':
                // Red/orange on belly, cheeks, and fins
                for (let i = 0; i < floor(random(2, 4)); i++) {
                    this.spots.push({
                        segment: floor(random(2, 6)),
                        offsetY: random(0.5, 2.2),  // Bottom/belly area
                        size: random(1.5, 3.5),
                        color: { h: random(10, 25), s: random(65, 80), b: random(70, 80) }
                    });
                }
                break;

            // KOROMO & GOSHIKI
            case 'ai-goromo':
                // Kohaku with blue edging on red scales
                for (let i = 0; i < numSpots; i++) {
                    this.spots.push({
                        segment: floor(random(0, 6)),
                        offsetY: random(-1.5, 1.5),
                        size: random(2, 4),
                        color: { h: random(0, 15), s: random(70, 85), b: random(70, 80) }
                    });
                }
                // Add blue edge spots
                for (let i = 0; i < floor(numSpots * 0.7); i++) {
                    this.spots.push({
                        segment: floor(random(0, 6)),
                        offsetY: random(-1.2, 1.2),
                        size: random(0.8, 1.5),
                        color: { h: random(210, 230), s: random(40, 60), b: random(50, 65) }
                    });
                }
                break;

            case 'budo-goromo':
                // Kohaku with grape-maroon edging
                for (let i = 0; i < numSpots; i++) {
                    this.spots.push({
                        segment: floor(random(0, 6)),
                        offsetY: random(-1.5, 1.5),
                        size: random(2, 4),
                        color: { h: random(330, 350), s: random(60, 75), b: random(50, 65) }
                    });
                }
                break;

            case 'goshiki':
                // Five colors - complex intermingled pattern
                for (let i = 0; i < numSpots + 2; i++) {
                    let colorChoice = floor(random(0, 4));
                    let spotColor;
                    if (colorChoice === 0) {
                        spotColor = { h: random(0, 15), s: random(70, 85), b: random(70, 80) }; // Red
                    } else if (colorChoice === 1) {
                        spotColor = { h: 0, s: 0, b: 20 }; // Black
                    } else if (colorChoice === 2) {
                        spotColor = { h: random(210, 230), s: random(30, 50), b: random(50, 70) }; // Blue-gray
                    } else {
                        spotColor = { h: 0, s: 0, b: 90 }; // White
                    }
                    this.spots.push({
                        segment: floor(random(0, 7)),
                        offsetY: random(-1.8, 1.8),
                        size: random(1.5, 3.5),
                        color: spotColor
                    });
                }
                break;

            // SPECIAL & MODERN
            case 'tancho':
                // Single red circle on head only
                this.spots.push({
                    segment: 0,
                    offsetY: random(-0.3, 0.3),
                    size: random(2.5, 3.5),
                    color: { h: 0, s: 80, b: 75 }
                });
                break;

            case 'ochiba':
                // Subtle darker spots on gray-brown autumn leaf
                for (let i = 0; i < floor(random(2, 4)); i++) {
                    this.spots.push({
                        segment: floor(random(1, 6)),
                        offsetY: random(-1, 1),
                        size: random(1.5, 3),
                        color: { h: random(30, 40), s: random(35, 45), b: random(45, 55) }
                    });
                }
                break;

            case 'doitsu-kohaku':
            case 'gin-rin-kohaku':
            case 'butterfly-kohaku':
                // Same pattern as regular Kohaku
                for (let i = 0; i < numSpots; i++) {
                    this.spots.push({
                        segment: floor(random(0, 6)),
                        offsetY: random(-1.5, 1.5),
                        size: random(2, 4.5),
                        color: { h: random(0, 15), s: random(70, 85), b: random(70, 80) }
                    });
                }
                break;

            // SOLID-COLOR / NATURALISTIC
            case 'chagoi':
                // Solid brown/tea color - minimal or no pattern
                // Very subtle darker patches if any
                if (random() < 0.3) {
                    for (let i = 0; i < floor(random(1, 2)); i++) {
                        this.spots.push({
                            segment: floor(random(1, 6)),
                            offsetY: random(-1, 1),
                            size: random(2, 4),
                            color: { h: random(25, 35), s: random(40, 50), b: random(40, 48) }
                        });
                    }
                }
                break;

            case 'soragoi':
                // Solid gray - clean, no pattern
                break;

            case 'benigoi':
                // Solid red - no pattern
                break;

            case 'ochiba':
                // Already defined above - gray with brown patches
                break;
        }
    }

    edges() {
        // Wrap around screen edges
        if (this.position.x > pg.width) this.position.x = 0;
        if (this.position.x < 0) this.position.x = pg.width;
        if (this.position.y > pg.height) this.position.y = 0;
        if (this.position.y < 0) this.position.y = pg.height;
    }

    align(boids) {
        let steering = createVector();
        let total = 0;

        for (let other of boids) {
            let d = dist(
                this.position.x, this.position.y,
                other.position.x, other.position.y
            );

            if (other !== this && d < this.perceptionRadius) {
                steering.add(other.velocity);
                total++;
            }
        }

        if (total > 0) {
            steering.div(total);
            steering.setMag(params.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(params.maxForce);
        }

        return steering;
    }

    cohesion(boids) {
        let steering = createVector();
        let total = 0;

        for (let other of boids) {
            let d = dist(
                this.position.x, this.position.y,
                other.position.x, other.position.y
            );

            if (other !== this && d < this.perceptionRadius) {
                steering.add(other.position);
                total++;
            }
        }

        if (total > 0) {
            steering.div(total);
            steering.sub(this.position);
            steering.setMag(params.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(params.maxForce);
        }

        return steering;
    }

    separation(boids) {
        let steering = createVector();
        let total = 0;

        for (let other of boids) {
            let d = dist(
                this.position.x, this.position.y,
                other.position.x, other.position.y
            );

            // Larger separation distance to keep them more spread out
            if (other !== this && d < this.perceptionRadius * 0.7) {
                let diff = p5.Vector.sub(this.position, other.position);

                // Prevent extreme forces when very close - cap minimum distance
                let minDist = 8;  // Increased minimum distance
                if (d < minDist) d = minDist;

                diff.div(d * d); // Weight by distance
                steering.add(diff);
                total++;
            }
        }

        if (total > 0) {
            steering.div(total);
            steering.setMag(params.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(params.maxForce);
        }

        return steering;
    }

    flock(boids, audio) {
        let alignment = this.align(boids);
        let cohesion = this.cohesion(boids);
        let separation = this.separation(boids);

        // Smooth the forces by blending with previous frame
        // This reduces jerkiness from rapid neighbor changes
        // IMPORTANT: Use static lerp to avoid modifying stored vectors
        const forceSmoothness = 0.3;  // Lower = smoother, higher = more responsive
        let smoothedAlignment = p5.Vector.lerp(this.previousAlignment.copy(), alignment, forceSmoothness);
        let smoothedCohesion = p5.Vector.lerp(this.previousCohesion.copy(), cohesion, forceSmoothness);
        let smoothedSeparation = p5.Vector.lerp(this.previousSeparation.copy(), separation, forceSmoothness);

        // Store the unweighted smoothed forces for next frame
        this.previousAlignment = smoothedAlignment.copy();
        this.previousCohesion = smoothedCohesion.copy();
        this.previousSeparation = smoothedSeparation.copy();

        // Weight the forces using params
        smoothedAlignment.mult(params.alignmentWeight);
        smoothedCohesion.mult(params.cohesionWeight);

        // Bass makes them separate more - push away on bass hits (gentle)
        const bassBoost = 1 + audio.bass * 1.5 * params.audioReactivity;
        smoothedSeparation.mult(params.separationWeight * bassBoost);

        this.acceleration.add(smoothedAlignment);
        this.acceleration.add(smoothedCohesion);
        this.acceleration.add(smoothedSeparation);
    }

    update(audio) {
        this.position.add(this.velocity);

        // Smooth velocity changes - creates more fluid, graceful movement
        // Instead of instantly applying acceleration, blend it in gradually
        let targetVelocity = p5.Vector.add(this.velocity, this.acceleration);

        // Audio affects max speed - amplitude makes them faster
        const speedMultiplier = 1 + audio.amplitude * params.audioReactivity;
        targetVelocity.limit(params.maxSpeed * speedMultiplier);

        // Smoothly interpolate from current velocity to target velocity
        // Lower value = smoother but slower response, higher = more responsive but jerkier
        let smoothing = 0.15;  // Much more smoothing to eliminate vibration
        this.velocity.lerp(targetVelocity, smoothing);

        // Cap acceleration to prevent jerky movements
        this.acceleration.limit(params.maxForce * 1.5);
        this.acceleration.mult(0);

        this.edges();
    }

    show(audio) {
        let angle = this.velocity.heading();
        let speed = this.velocity.mag();

        // Use traditional koi colors
        let hue = this.color.h;
        let saturation = this.color.s + audio.treble * 10 * params.audioReactivity;
        let brightness = this.color.b + audio.bass * 8 * params.audioReactivity;

        pg.colorMode(HSB, 360, 100, 100);
        pg.noStroke();

        pg.push();
        pg.translate(this.position.x, this.position.y);
        pg.rotate(angle);

        // Size pulses with amplitude, multiplied by koi's individual size
        let sizeScale = this.sizeMultiplier * (1 + audio.amplitude * 0.3 * params.audioReactivity);

        // Swimming wave motion - smoother, more natural
        let swimSpeed = speed * 0.3;
        let waveTime = frameCount * 0.1 * (1 + swimSpeed);

        // Body segments - create smooth undulating motion
        let numSegments = 10;
        let segmentPositions = [];

        for (let i = 0; i < numSegments; i++) {
            let t = i / numSegments;
            let x = lerp(7, -9, t) * sizeScale * this.lengthMultiplier;
            // Smoother wave with less amplitude
            let y = sin(waveTime - t * 3.5) * 1.5 * sizeScale * (1 - t * 0.2);

            // Smooth curve with gradual taper to tail
            // Sine curve for smooth middle, then extra taper at the end
            let baseWidth = lerp(5, 7, sin(t * PI));

            // Add additional taper for the tail section (last 40%)
            if (t > 0.6) {
                let tailT = (t - 0.6) / 0.4; // 0 to 1 over the tail section
                // Smoothly reduce to a point
                baseWidth = baseWidth * (1 - tailT * 0.9);
            }

            let segmentWidth = baseWidth * sizeScale;
            segmentPositions.push({ x, y, w: segmentWidth });
        }

        // Draw tail first (behind body) - single unified tail
        let tailBase = segmentPositions[numSegments - 1];

        // Tail starts slightly back from the last body segment
        let tailStartX = tailBase.x - 1 * sizeScale;

        // Create flowing tail segments
        let tailSegments = 6;
        let tailLength = this.tailLength * 6 * sizeScale;

        // Tail should start at the width of the last body segment
        let tailSplitWidth = tailBase.w * 0.48;

        // Tail width parameters
        let tailWidthStart = 0.2;
        let tailWidthEnd = 1.5;

        // Single unified tail - top-down view
        pg.fill(hue, saturation + 5, brightness - 12, 0.8);
        pg.beginShape();

        // Calculate all points first
        let topPoints = [];
        let bottomPoints = [];

        for (let i = 0; i <= tailSegments; i++) {
            let t = i / tailSegments;
            let x = tailStartX - (t * tailLength);
            let tailSway = sin(waveTime - 2.5 - t * 2) * 3 * sizeScale * (0.5 + t * 0.5);
            let width = lerp(tailWidthStart, tailWidthEnd, t) * sizeScale;

            topPoints.push({ x: x, y: tailBase.y - width + tailSway });
            bottomPoints.push({ x: x, y: tailBase.y + width + tailSway });
        }

        // Start with duplicate for curve
        pg.curveVertex(topPoints[0].x, topPoints[0].y);

        // Top edge
        for (let pt of topPoints) {
            pg.curveVertex(pt.x, pt.y);
        }

        // Bottom edge (reversed)
        for (let i = bottomPoints.length - 1; i >= 0; i--) {
            pg.curveVertex(bottomPoints[i].x, bottomPoints[i].y);
        }

        // End with duplicate for curve
        pg.curveVertex(bottomPoints[0].x, bottomPoints[0].y);

        pg.endShape(CLOSE);

        // Tail fin rays for structure
        pg.strokeWeight(0.3);
        pg.stroke(hue, saturation + 10, brightness - 25, 0.5);
        for (let r = 0; r < 4; r++) {
            let rayStart = tailStartX;
            let rayEnd = tailStartX - tailLength * 0.9;
            let offsetY = lerp(-3, 3, r / 3) * sizeScale;

            pg.beginShape();
            pg.noFill();
            for (let i = 0; i <= 5; i++) {
                let t = i / 5;
                let x = lerp(rayStart, rayEnd, t);
                let tailSway = sin(waveTime - 2.5 - t * 2) * 3 * sizeScale * (0.5 + t * 0.5);
                pg.vertex(x, tailBase.y + offsetY + tailSway * (0.5 + t * 0.5));
            }
            pg.endShape();
        }
        pg.noStroke();

        // =================================================================
        // FINS - Draw all fins first so body appears on top
        // =================================================================

        let headSeg = segmentPositions[0];
        let finPos = segmentPositions[2];
        let finSway = sin(waveTime - 0.5) * 0.8;

        // Pectoral fins - positioned on body, sway with swimming motion
        pg.fill(hue, saturation + 8, brightness - 15, 0.7);

        // Left pectoral fin
        pg.push();
        pg.translate(finPos.x, finPos.y - 2 * sizeScale + finSway);
        pg.rotate(sin(waveTime * 1.2) * 0.15 - 2.5);
        pg.ellipse(2.25 * sizeScale, 0, 4.5 * sizeScale, 2 * sizeScale);

        // Fin rays
        pg.strokeWeight(0.2);
        pg.stroke(hue, saturation + 10, brightness - 25, 0.4);
        for (let r = 0; r < 3; r++) {
            let angle = lerp(-0.3, 0.3, r / 2);
            let len = 2 * sizeScale;
            pg.line(0, 0, cos(angle) * len, sin(angle) * len);
        }
        pg.noStroke();
        pg.pop();

        // Right pectoral fin
        pg.push();
        pg.translate(finPos.x, finPos.y + 2 * sizeScale - finSway);
        pg.rotate(-sin(waveTime * 1.2) * 0.15 + 2.1);
        pg.ellipse(2.25 * sizeScale, 0, 4.5 * sizeScale, 2 * sizeScale);

        // Fin rays
        pg.strokeWeight(0.2);
        pg.stroke(hue, saturation + 10, brightness - 25, 0.4);
        for (let r = 0; r < 3; r++) {
            let angle = lerp(-0.3, 0.3, r / 2);
            let len = 2 * sizeScale;
            pg.line(0, 0, cos(angle) * len, sin(angle) * len);
        }
        pg.noStroke();
        pg.pop();

        // Dorsal fin - more realistic shape with fin rays
        let dorsalPos = segmentPositions[4];
        pg.fill(hue, saturation + 8, brightness - 15, 0.75);
        pg.push();
        pg.translate(dorsalPos.x, dorsalPos.y - 0.5 * sizeScale);
        pg.rotate(-0.2);
        pg.beginShape();
        pg.vertex(0, 0);
        pg.vertex(-1 * sizeScale, -2 * sizeScale);
        pg.vertex(1 * sizeScale, -2.5 * sizeScale);
        pg.vertex(2 * sizeScale, -1.5 * sizeScale);
        pg.vertex(2 * sizeScale, 0);
        pg.endShape(CLOSE);

        // Fin rays
        pg.strokeWeight(0.2);
        pg.stroke(hue, saturation + 10, brightness - 25, 0.4);
        for (let r = 0; r < 3; r++) {
            let x = lerp(0, 1.5, r / 2) * sizeScale;
            pg.line(x, 0, x, -2 * sizeScale);
        }
        pg.noStroke();
        pg.pop();

        // Ventral fins (top and bottom) - pivot from tip like pectoral fins
        let ventralPos = segmentPositions[7];
        pg.fill(hue, saturation + 8, brightness - 15, 0.7);

        // Top ventral fin
        pg.push();
        pg.translate(ventralPos.x, ventralPos.y - 1 * sizeScale);
        pg.rotate(-2.5 + sin(waveTime * 1.2) * 0.1);
        pg.ellipse(1.5 * sizeScale, 0, 3 * sizeScale, 1.5 * sizeScale);
        pg.pop();

        // Bottom ventral fin
        pg.push();
        pg.translate(ventralPos.x, ventralPos.y + 1 * sizeScale);
        pg.rotate(2.5 - sin(waveTime * 1.2) * 0.1);
        pg.ellipse(1.5 * sizeScale, 0, 3 * sizeScale, 1.5 * sizeScale);
        pg.pop();

        // =================================================================
        // BODY - Draw body on top of fins
        // =================================================================

        // Draw body outline - creates smooth contour
        pg.fill(hue, saturation, brightness - 2, 0.92);
        pg.beginShape();

        // Start with head point and add as duplicate for curve control
        let headPt = { x: headSeg.x + -0.4 * sizeScale, y: headSeg.y };
        pg.curveVertex(headPt.x, headPt.y);

        // Head point (actual)
        pg.curveVertex(headPt.x, headPt.y);

        // Top edge from front to back
        for (let i = 0; i < numSegments; i++) {
            let seg = segmentPositions[i];
            pg.curveVertex(seg.x, seg.y - seg.w * 0.48);
        }

        // Bottom edge from back to front
        for (let i = numSegments - 1; i >= 0; i--) {
            let seg = segmentPositions[i];
            pg.curveVertex(seg.x, seg.y + seg.w * 0.48);
        }

        // Close back to head point and add duplicate for smooth curve
        pg.curveVertex(headPt.x, headPt.y);
        pg.curveVertex(headPt.x, headPt.y);

        pg.endShape(CLOSE);

        // Draw segment lines for definition
        pg.strokeWeight(0.3);
        pg.stroke(hue, saturation + 10, brightness - 25, 0.4);
        for (let i = 1; i < numSegments - 1; i++) {
            let seg = segmentPositions[i];
            let topY = seg.y - seg.w * 0.48;
            let bottomY = seg.y + seg.w * 0.48;
            pg.line(seg.x, topY, seg.x, bottomY);
        }
        pg.noStroke();

        // Draw unique spot pattern - spots follow body segments
        for (let spot of this.spots) {
            let seg = segmentPositions[spot.segment];
            pg.fill(spot.color.h, spot.color.s, spot.color.b, 0.85);
            // Add some organic shape variation
            let spotW = spot.size * sizeScale;
            let spotH = spot.size * sizeScale * 0.8;
            pg.ellipse(seg.x, seg.y + spot.offsetY * sizeScale, spotW, spotH);
        }

        // Head detail
        pg.fill(hue, saturation, brightness + 2, 0.92);
        pg.ellipse(headSeg.x + -0.4 * sizeScale, headSeg.y, 7 * sizeScale, 5.5 * sizeScale);

        // Eye
        pg.fill(0, 0, 10, 0.8);
        pg.ellipse(headSeg.x + 2.5 * sizeScale, headSeg.y - 1 * sizeScale, 1.2 * sizeScale, 1.2 * sizeScale);

        pg.pop();

        pg.colorMode(RGB);
    }
}
