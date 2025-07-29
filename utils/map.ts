
import { TerrainType, Position, ResourcePatch } from '../types';
import { MAP_WIDTH_TILES, MAP_HEIGHT_TILES, TILE_SIZE } from '../constants';

interface PathNode { x: number; y: number; g: number; h: number; f: number; parent: PathNode | null; }

function findPathForMapGen(start: {x:number, y:number}, end: {x:number, y:number}, terrain: TerrainType[][]): {x:number, y:number}[] | null {
    const openList: PathNode[] = [];
    const closedList = new Set<string>();
    const heuristic = (a: {x:number, y:number}, b: {x:number, y:number}) => Math.hypot(a.x - b.x, a.y - b.y);

    const getCost = (type: TerrainType) => {
        switch(type) {
            case TerrainType.MOUNTAIN: return 100;
            case TerrainType.DEEP_WATER: return 100;
            case TerrainType.SHALLOW_WATER: return 5;
            case TerrainType.TREES: return 2;
            case TerrainType.GROUND: return 1;
            default: return 1;
        }
    };
    
    const startPathNode: PathNode = { ...start, g: 0, h: heuristic(start, end), f: heuristic(start, end), parent: null };
    openList.push(startPathNode);

    while (openList.length > 0) {
        let lowestIndex = 0;
        for (let i = 1; i < openList.length; i++) {
            if (openList[i].f < openList[lowestIndex].f) {
                lowestIndex = i;
            }
        }
        const currentNode = openList.splice(lowestIndex, 1)[0];
        const currentNodeKey = `${currentNode.x},${currentNode.y}`;
        
        if (closedList.has(currentNodeKey)) continue;
        closedList.add(currentNodeKey);

        if (currentNode.x === end.x && currentNode.y === end.y) {
            const path: {x:number, y:number}[] = [];
            let current: PathNode | null = currentNode;
            while (current) {
                path.unshift({ x: current.x, y: current.y });
                current = current.parent;
            }
            return path;
        }

        const neighbors = [ {x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}, {x:-1, y:-1}, {x:-1, y:1}, {x:1, y:-1}, {x:1, y:1}];
        
        for (const neighborMove of neighbors) {
            const neighborPos = { x: currentNode.x + neighborMove.x, y: currentNode.y + neighborMove.y };

            if (neighborPos.x < 0 || neighborPos.x >= MAP_WIDTH_TILES || neighborPos.y < 0 || neighborPos.y >= MAP_HEIGHT_TILES) {
                continue;
            }

            const terrainType = terrain[neighborPos.y]?.[neighborPos.x];
            const moveCost = getCost(terrainType) * (neighborMove.x !== 0 && neighborMove.y !== 0 ? 1.414 : 1);
            const gCost = currentNode.g + moveCost;
            
            const existingNeighborIndex = openList.findIndex(n => n.x === neighborPos.x && n.y === neighborPos.y);
            let existingNeighbor = existingNeighborIndex !== -1 ? openList[existingNeighborIndex] : null;

            if (!existingNeighbor || gCost < existingNeighbor.g) {
                if (!existingNeighbor) {
                    existingNeighbor = { ...neighborPos, g: gCost, h: heuristic(neighborPos, end), f: 0, parent: currentNode };
                    openList.push(existingNeighbor);
                }
                existingNeighbor.g = gCost;
                existingNeighbor.f = existingNeighbor.g + existingNeighbor.h;
                existingNeighbor.parent = currentNode;
            }
        }
    }
    return null;
}

export function generateMap(startingPositions: Position[]): { terrain: TerrainType[][]; resourcePatches: Record<string, ResourcePatch> } {
    let terrain: TerrainType[][] = Array(MAP_HEIGHT_TILES).fill(0).map(() => Array(MAP_WIDTH_TILES).fill(TerrainType.GROUND));
    let resourcePatches: Record<string, ResourcePatch> = {};

    const placeFeature = (type: TerrainType, count: number, minSize: number, maxSize: number, irregular: boolean = true) => {
        for (let i = 0; i < count; i++) {
            const x = Math.floor(Math.random() * MAP_WIDTH_TILES);
            const y = Math.floor(Math.random() * MAP_HEIGHT_TILES);
            const size = Math.floor(Math.random() * (maxSize - minSize)) + minSize;
            for (let dy = -size; dy <= size; dy++) {
                for (let dx = -size; dx <= size; dx++) {
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if(irregular) dist += (Math.random() - 0.5) * size * 0.5;
                    if (dist <= size) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < MAP_WIDTH_TILES && ny >= 0 && ny < MAP_HEIGHT_TILES) {
                            terrain[ny][nx] = type;
                        }
                    }
                }
            }
        }
    };
    
    placeFeature(TerrainType.MOUNTAIN, 15, 2, 6);
    placeFeature(TerrainType.DEEP_WATER, 10, 3, 7);

    for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
        for (let x = 0; x < MAP_WIDTH_TILES; x++) {
            if (terrain[y][x] === TerrainType.GROUND) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < MAP_WIDTH_TILES && ny >= 0 && ny < MAP_HEIGHT_TILES && terrain[ny][nx] === TerrainType.DEEP_WATER) {
                            terrain[y][x] = TerrainType.SHALLOW_WATER;
                            break;
                        }
                    }
                }
            }
        }
    }
    
    placeFeature(TerrainType.TREES, 30, 2, 8);
    
    const clearRadius = 8;
    startingPositions.forEach(startPosPx => {
        const startPosTile = { x: Math.floor(startPosPx.x / TILE_SIZE), y: Math.floor(startPosPx.y / TILE_SIZE) };
        for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
            for (let x = 0; x < MAP_WIDTH_TILES; x++) {
                if (Math.hypot(x - startPosTile.x, y - startPosTile.y) < clearRadius) {
                    terrain[y][x] = TerrainType.GROUND;
                }
            }
        }
    });
    
    const pathWidth = 1;
    for(let i=0; i<startingPositions.length; i++) {
        const start = startingPositions[i];
        const end = startingPositions[(i + 1) % startingPositions.length];
        
        const startTile = { x: Math.floor(start.x / TILE_SIZE), y: Math.floor(start.y / TILE_SIZE) };
        const endTile = { x: Math.floor(end.x / TILE_SIZE), y: Math.floor(end.y / TILE_SIZE) };

        const path = findPathForMapGen(startTile, endTile, terrain);
        if(path) {
            path.forEach(node => {
                for (let j = -pathWidth; j <= pathWidth; j++) {
                    for (let k = -pathWidth; k <= pathWidth; k++) {
                        const nx = node.x + j;
                        const ny = node.y + k;
                        if (nx >= 0 && nx < MAP_WIDTH_TILES && ny >= 0 && ny < MAP_HEIGHT_TILES) {
                            if(terrain[ny][nx] === TerrainType.DEEP_WATER) {
                                terrain[ny][nx] = TerrainType.SHALLOW_WATER;
                            } else if (terrain[ny][nx] !== TerrainType.SHALLOW_WATER) {
                                terrain[ny][nx] = TerrainType.GROUND;
                            }
                        }
                    }
                }
            });
        }
    }

    const placeResourceCluster = (count: number, center: Position, radius: number, minAmount: number, maxAmount: number) => {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            const x = Math.floor(center.x + Math.cos(angle) * dist);
            const y = Math.floor(center.y + Math.sin(angle) * dist);

            if (x >= 0 && x < MAP_WIDTH_TILES && y >= 0 && y < MAP_HEIGHT_TILES && terrain[y][x] === TerrainType.GROUND) {
                const id = `ore_${x}_${y}`;
                if (resourcePatches[id]) continue; // Avoid overlap
                const amount = minAmount + Math.random() * (maxAmount - minAmount);
                resourcePatches[id] = {
                    id,
                    position: { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 },
                    amount,
                    maxAmount: amount,
                    size: TILE_SIZE * 0.8,
                };
            }
        }
    };
    
    startingPositions.forEach(startPosPx => {
        const startPosTile = { x: Math.floor(startPosPx.x / TILE_SIZE), y: Math.floor(startPosPx.y / TILE_SIZE) };
        placeResourceCluster(3, startPosTile, 5, 4000, 5000);
    });

    const midPoints = [
        { x: MAP_WIDTH_TILES * 0.5, y: MAP_HEIGHT_TILES * 0.5 },
        { x: MAP_WIDTH_TILES * 0.25, y: MAP_HEIGHT_TILES * 0.25 },
        { x: MAP_WIDTH_TILES * 0.75, y: MAP_HEIGHT_TILES * 0.75 },
        { x: MAP_WIDTH_TILES * 0.25, y: MAP_HEIGHT_TILES * 0.75 },
        { x: MAP_WIDTH_TILES * 0.75, y: MAP_HEIGHT_TILES * 0.25 },
    ];
    midPoints.forEach(point => {
        const tooClose = startingPositions.some(sp => {
            const spTile = { x: Math.floor(sp.x / TILE_SIZE), y: Math.floor(sp.y / TILE_SIZE) };
            return Math.hypot(point.x - spTile.x, point.y - spTile.y) < 20;
        });
        if(!tooClose) {
            placeResourceCluster(5, point, 8, 8000, 10000);
        }
    });

    return { terrain, resourcePatches };
}
