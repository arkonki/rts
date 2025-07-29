import { Position, TerrainType, UnitDomain } from '../types';
import { TILE_SIZE, MAP_WIDTH_TILES, MAP_HEIGHT_TILES } from '../constants';

interface PathNode { x: number; y: number; g: number; h: number; f: number; parent: PathNode | null; }

export function findPath(start: Position, end: Position, terrain: TerrainType[][], domain: UnitDomain): Position[] | null {
    const startNode = { x: Math.floor(start.x / TILE_SIZE), y: Math.floor(start.y / TILE_SIZE) };
    const endNode = { x: Math.floor(end.x / TILE_SIZE), y: Math.floor(end.y / TILE_SIZE) };

    const openList: PathNode[] = [];
    const closedList = new Set<string>();

    const heuristic = (a: {x:number, y:number}, b: {x:number, y:number}) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    const startPathNode: PathNode = { ...startNode, g: 0, h: heuristic(startNode, endNode), f: heuristic(startNode, endNode), parent: null };
    openList.push(startPathNode);

    while (openList.length > 0) {
        openList.sort((a, b) => a.f - b.f);
        const currentNode = openList.shift()!;
        const currentNodeKey = `${currentNode.x},${currentNode.y}`;

        if (currentNode.x === endNode.x && currentNode.y === endNode.y) {
            const path: Position[] = [];
            let current: PathNode | null = currentNode;
            while (current) {
                path.unshift({ x: current.x * TILE_SIZE + TILE_SIZE / 2, y: current.y * TILE_SIZE + TILE_SIZE / 2 });
                current = current.parent;
            }
            return path;
        }

        closedList.add(currentNodeKey);

        const neighbors = [ {x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}, {x:-1, y:-1}, {x:-1, y:1}, {x:1, y:-1}, {x:1, y:1}];

        for (const neighborMove of neighbors) {
            const neighborPos = { x: currentNode.x + neighborMove.x, y: currentNode.y + neighborMove.y };
            const neighborKey = `${neighborPos.x},${neighborPos.y}`;
            
            if (neighborPos.x < 0 || neighborPos.x >= MAP_WIDTH_TILES || neighborPos.y < 0 || neighborPos.y >= MAP_HEIGHT_TILES || closedList.has(neighborKey)) {
                continue;
            }
            
            const neighborTerrain = terrain[neighborPos.y]?.[neighborPos.x];

            // Domain-specific movement rules
            if (domain === UnitDomain.GROUND) {
                if (neighborTerrain === TerrainType.MOUNTAIN || neighborTerrain === TerrainType.DEEP_WATER) {
                    continue;
                }
            } else if (domain === UnitDomain.SEA) {
                if (neighborTerrain !== TerrainType.SHALLOW_WATER && neighborTerrain !== TerrainType.DEEP_WATER) {
                    continue;
                }
            }
            // AIR domain has no restrictions, so no special "continue" check here.

            const gCost = currentNode.g + 1;
            let existingNeighbor = openList.find(n => n.x === neighborPos.x && n.y === neighborPos.y);

            if (!existingNeighbor || gCost < existingNeighbor.g) {
                if (!existingNeighbor) {
                    existingNeighbor = { ...neighborPos, g: gCost, h: heuristic(neighborPos, endNode), f: 0, parent: currentNode };
                    openList.push(existingNeighbor);
                }
                existingNeighbor.g = gCost;
                existingNeighbor.f = existingNeighbor.g + existingNeighbor.h;
                existingNeighbor.parent = currentNode;
            }
        }
    }

    return null; // No path found
}