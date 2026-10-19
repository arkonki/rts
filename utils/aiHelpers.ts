import { BuildingType, GameState, PlayerId, Position } from '../types';
import { ENTITY_CONFIGS, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE } from '../constants';
import { getPlacementError } from './placement';

/** Finds a valid tile position for a new AI building near the HQ. Returns tile coordinates, or null. */
export function findBuildPlacement(buildingType: BuildingType, playerId: PlayerId, hqPosition: Position, state: GameState): Position | null {
    const config = ENTITY_CONFIGS[buildingType];
    const ownEntities = Object.values(state.entities).filter(e => e.playerId === playerId);

    for (let i = 0; i < 100; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = TILE_SIZE * 4 + Math.random() * TILE_SIZE * 10;
        const x = Math.max(TILE_SIZE * 2, Math.min(hqPosition.x + Math.cos(angle) * distance, MAP_WIDTH - TILE_SIZE * 4));
        const y = Math.max(TILE_SIZE * 2, Math.min(hqPosition.y + Math.sin(angle) * distance, MAP_HEIGHT - TILE_SIZE * 4));

        const tileX = Math.floor(x / TILE_SIZE);
        const tileY = Math.floor(y / TILE_SIZE);
        // The reducer places AI buildings at the tile centre, so validate that exact position.
        const centre = { x: tileX * TILE_SIZE + TILE_SIZE / 2, y: tileY * TILE_SIZE + TILE_SIZE / 2 };

        if (getPlacementError(buildingType, centre, state.terrain, state.entities, playerId) !== null) continue;

        // Keep a one-tile gap to the AI's own buildings so units can path between them.
        const tooClose = ownEntities.some(e =>
            Math.hypot(e.position.x - centre.x, e.position.y - centre.y) < (e.size / 2 + config.size / 2 + TILE_SIZE)
        );
        if (!tooClose) return { x: tileX, y: tileY };
    }
    return null;
}
