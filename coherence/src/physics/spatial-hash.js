/**
 * SpatialHash - Grid-based spatial partitioning for fast neighbor queries
 * Reduces neighbor search from O(n²) to approximately O(n)
 */

export class SpatialHash {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    /**
     * Get grid cell key for a position
     */
    getCellKey(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }

    /**
     * Clear the grid
     */
    clear() {
        this.grid.clear();
    }

    /**
     * Insert a boid into the grid
     */
    insert(boid) {
        const key = this.getCellKey(boid.position.x, boid.position.y);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key).push(boid);
    }

    /**
     * Get all boids in nearby cells (3x3 grid around the boid)
     */
    getNearby(boid) {
        const nearby = [];
        const cellX = Math.floor(boid.position.x / this.cellSize);
        const cellY = Math.floor(boid.position.y / this.cellSize);

        // Check 3x3 grid of cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${cellX + dx},${cellY + dy}`;
                const cell = this.grid.get(key);
                if (cell) {
                    nearby.push(...cell);
                }
            }
        }

        return nearby;
    }

    /**
     * Find neighbors within radius (optimized)
     */
    findNeighbors(boid, perceptionRadius) {
        const nearby = this.getNearby(boid);
        const neighbors = [];

        for (const other of nearby) {
            if (other === boid) continue;

            const dx = boid.position.x - other.position.x;
            const dy = boid.position.y - other.position.y;
            const distSq = dx * dx + dy * dy;
            const radiusSq = perceptionRadius * perceptionRadius;

            if (distSq < radiusSq) {
                neighbors.push(other);
            }
        }

        return neighbors;
    }
}
