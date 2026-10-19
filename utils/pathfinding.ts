import { Position, TerrainType, UnitDomain } from '../types';
import { TILE_SIZE, MAP_WIDTH_TILES, MAP_HEIGHT_TILES } from '../constants';

/** Minimal binary min-heap keyed by priority; stores tile indices. */
class MinHeap {
    private priorities: number[] = [];
    private values: number[] = [];

    get size(): number {
        return this.priorities.length;
    }

    push(priority: number, value: number): void {
        let i = this.priorities.length;
        this.priorities.push(priority);
        this.values.push(value);
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.priorities[parent] <= priority) break;
            this.priorities[i] = this.priorities[parent];
            this.values[i] = this.values[parent];
            i = parent;
        }
        this.priorities[i] = priority;
        this.values[i] = value;
    }

    /** Removes and returns the value with the lowest priority. Heap must not be empty. */
    pop(): number {
        const top = this.values[0];
        const lastPriority = this.priorities.pop()!;
        const lastValue = this.values.pop()!;
        const n = this.priorities.length;
        if (n > 0) {
            let i = 0;
            while (true) {
                let child = 2 * i + 1;
                if (child >= n) break;
                if (child + 1 < n && this.priorities[child + 1] < this.priorities[child]) child++;
                if (this.priorities[child] >= lastPriority) break;
                this.priorities[i] = this.priorities[child];
                this.values[i] = this.values[child];
                i = child;
            }
            this.priorities[i] = lastPriority;
            this.values[i] = lastValue;
        }
        return top;
    }
}

// dx, dy, step cost (diagonals cost sqrt(2))
const NEIGHBORS: ReadonlyArray<readonly [number, number, number]> = [
    [0, -1, 1], [0, 1, 1], [-1, 0, 1], [1, 0, 1],
    [-1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [1, 1, Math.SQRT2],
];

function isWalkable(domain: UnitDomain, terrainType: TerrainType | undefined): boolean {
    switch (domain) {
        case UnitDomain.GROUND:
            return terrainType !== undefined && terrainType !== TerrainType.MOUNTAIN && terrainType !== TerrainType.DEEP_WATER;
        case UnitDomain.SEA:
            return terrainType === TerrainType.SHALLOW_WATER || terrainType === TerrainType.DEEP_WATER;
        default: // AIR has no restrictions
            return true;
    }
}

/**
 * A* over the tile grid with 8-way movement. Returns tile-centre waypoints (starting with the
 * start tile), or null if the goal is out of bounds, not walkable for this domain, or unreachable.
 */
export function findPath(start: Position, end: Position, terrain: TerrainType[][], domain: UnitDomain): Position[] | null {
    const W = MAP_WIDTH_TILES;
    const H = MAP_HEIGHT_TILES;
    const startX = Math.floor(start.x / TILE_SIZE);
    const startY = Math.floor(start.y / TILE_SIZE);
    const endX = Math.floor(end.x / TILE_SIZE);
    const endY = Math.floor(end.y / TILE_SIZE);

    if (startX < 0 || startX >= W || startY < 0 || startY >= H) return null;
    // Fail fast instead of flooding the whole map looking for an unreachable goal.
    if (endX < 0 || endX >= W || endY < 0 || endY >= H) return null;
    if (!isWalkable(domain, terrain[endY]?.[endX])) return null;

    const startIndex = startY * W + startX;
    const endIndex = endY * W + endX;

    const gCost = new Float32Array(W * H).fill(Infinity);
    const parent = new Int32Array(W * H).fill(-1);
    const closed = new Uint8Array(W * H);
    const open = new MinHeap();

    // Octile distance: admissible and consistent for 8-way movement with sqrt(2) diagonals.
    const heuristic = (x: number, y: number) => {
        const dx = Math.abs(x - endX);
        const dy = Math.abs(y - endY);
        return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
    };

    gCost[startIndex] = 0;
    open.push(heuristic(startX, startY), startIndex);

    while (open.size > 0) {
        const current = open.pop();
        if (closed[current]) continue; // stale duplicate entry
        closed[current] = 1;

        if (current === endIndex) {
            const reversed: Position[] = [];
            for (let i = current; i !== -1; i = parent[i]) {
                const x = i % W;
                const y = (i - x) / W;
                reversed.push({ x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 });
            }
            return reversed.reverse();
        }

        const cx = current % W;
        const cy = (current - cx) / W;

        for (const [dx, dy, stepCost] of NEIGHBORS) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;

            const neighborIndex = ny * W + nx;
            if (closed[neighborIndex]) continue;
            if (!isWalkable(domain, terrain[ny]?.[nx])) continue;

            const tentative = gCost[current] + stepCost;
            if (tentative < gCost[neighborIndex]) {
                gCost[neighborIndex] = tentative;
                parent[neighborIndex] = current;
                open.push(tentative + heuristic(nx, ny), neighborIndex);
            }
        }
    }

    return null; // No path found
}
