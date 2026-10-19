import { BuildingType, GameEntity, PlayerId, Position, TerrainType } from '../types';
import { BASE_BUILD_RADIUS_TILES, ENTITY_CONFIGS, MAP_HEIGHT_TILES, MAP_WIDTH_TILES, TILE_SIZE } from '../constants';
import { getRequirements, hasCompletedBuilding, meetsRequirements } from './logic';

export function isCoastalTile(x: number, y: number, terrain: TerrainType[][]): boolean {
    if (x < 0 || x >= MAP_WIDTH_TILES || y < 0 || y >= MAP_HEIGHT_TILES) return false;
    if (terrain[y]?.[x] !== TerrainType.GROUND) return false;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const neighborTerrain = terrain[y + dy]?.[x + dx];
            if (neighborTerrain === TerrainType.SHALLOW_WATER || neighborTerrain === TerrainType.DEEP_WATER) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Single source of truth for whether a player may place a building at a pixel position.
 * Used by the reducer (human and AI builds), the AI placement search and the placement ghost.
 * Returns a human-readable reason when placement is not allowed, or null when it is.
 * Credits are intentionally not checked here.
 */
export function getPlacementError(
    buildingType: BuildingType,
    position: Position,
    terrain: TerrainType[][],
    entities: Record<string, GameEntity>,
    playerId: PlayerId,
): string | null {
    const config = ENTITY_CONFIGS[buildingType];

    if (!meetsRequirements(config, entities, playerId)) {
        const names = getRequirements(config).map(req => ENTITY_CONFIGS[req].name).join(', ');
        return `${config.name} requires: ${names}.`;
    }
    if (config.producedBy && !hasCompletedBuilding(entities, playerId, config.producedBy)) {
        return `${config.name} must be built by a ${ENTITY_CONFIGS[config.producedBy].name}.`;
    }

    const tileX = Math.floor(position.x / TILE_SIZE);
    const tileY = Math.floor(position.y / TILE_SIZE);

    if (config.placementRule === 'COASTAL') {
        if (!isCoastalTile(tileX, tileY, terrain)) return `${config.name} must be built on a coastline.`;
    } else {
        // Every tile under the building's footprint must be buildable ground.
        const half = config.size / 2 - 0.5;
        const minX = Math.floor((position.x - half) / TILE_SIZE);
        const maxX = Math.floor((position.x + half) / TILE_SIZE);
        const minY = Math.floor((position.y - half) / TILE_SIZE);
        const maxY = Math.floor((position.y + half) / TILE_SIZE);
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (terrain[y]?.[x] !== TerrainType.GROUND) return 'Cannot build on this terrain.';
            }
        }
    }

    const maxBaseDistance = BASE_BUILD_RADIUS_TILES * TILE_SIZE;
    const nearOwnBase = Object.values(entities).some(e =>
        e.playerId === playerId && 'isPowered' in e &&
        Math.hypot(e.position.x - position.x, e.position.y - position.y) <= maxBaseDistance
    );
    if (!nearOwnBase) return 'Too far from your base.';

    const isObstructed = Object.values(entities).some(e =>
        Math.hypot(e.position.x - position.x, e.position.y - position.y) < (e.size / 2 + config.size / 2)
    );
    if (isObstructed) return 'Cannot place building here: location is obstructed.';

    return null;
}
