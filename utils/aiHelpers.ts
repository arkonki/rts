
import { BuildingType, GameEntity, Position, TerrainType } from '../types';
import { ENTITY_CONFIGS, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE, MAP_HEIGHT_TILES, MAP_WIDTH_TILES } from '../constants';

function isCoastalTile(x: number, y: number, terrain: TerrainType[][]): boolean {
    if (x < 0 || x >= MAP_WIDTH_TILES || y < 0 || y >= MAP_HEIGHT_TILES) return false;
    if (terrain[y]?.[x] !== TerrainType.GROUND) return false;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = y + dy;
            const nx = x + dx;
            const neighborTerrain = terrain[ny]?.[nx];
            if (neighborTerrain === TerrainType.SHALLOW_WATER || neighborTerrain === TerrainType.DEEP_WATER) {
                return true;
            }
        }
    }
    return false;
}

export function findBuildPlacement(buildingType: BuildingType, allAiEntities: GameEntity[], hqPosition: Position, terrain: TerrainType[][]): Position | null {
    const isCoastal = ENTITY_CONFIGS[buildingType].placementRule === 'COASTAL';

    for (let i = 0; i < 100; i++) { // Increase attempts
        const angle = Math.random() * Math.PI * 2;
        const distance = TILE_SIZE * 4 + Math.random() * TILE_SIZE * 10;
        const pos = {
            x: hqPosition.x + Math.cos(angle) * distance,
            y: hqPosition.y + Math.sin(angle) * distance,
        };

        pos.x = Math.max(TILE_SIZE * 2, Math.min(pos.x, MAP_WIDTH - TILE_SIZE * 4));
        pos.y = Math.max(TILE_SIZE * 2, Math.min(pos.y, MAP_HEIGHT - TILE_SIZE * 4));
        
        const tileX = Math.floor(pos.x / TILE_SIZE);
        const tileY = Math.floor(pos.y / TILE_SIZE);

        if (isCoastal) {
            if (!isCoastalTile(tileX, tileY, terrain)) continue;
        } else {
            if (terrain[tileY]?.[tileX] !== TerrainType.GROUND) continue;
        }

        const isOccupied = allAiEntities.some(e => {
            const dx = e.position.x - pos.x;
            const dy = e.position.y - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < (e.size / 2 + (ENTITY_CONFIGS[buildingType].size / 2) + TILE_SIZE); // Add buffer
        });

        if (!isOccupied) return pos;
    }
    return null; // Return null if no position found
}
