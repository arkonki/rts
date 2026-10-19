import { FogState, GameState } from '../../types';
import { ENTITY_CONFIGS, HUMAN_PLAYER_ID, MAP_HEIGHT_TILES, MAP_WIDTH_TILES, TILE_SIZE } from '../../constants';

export function updateFogOfWar(state: GameState): GameState {
    // 1. Work out which tiles the human player currently sees.
    const visible = new Uint8Array(MAP_WIDTH_TILES * MAP_HEIGHT_TILES);
    Object.values(state.entities).forEach(entity => {
        if (entity.playerId !== HUMAN_PLAYER_ID) return;
        const visionRange = ENTITY_CONFIGS[entity.type].visionRange;
        if (!visionRange) return;
        const centerTileX = Math.floor(entity.position.x / TILE_SIZE);
        const centerTileY = Math.floor(entity.position.y / TILE_SIZE);
        for (let y = Math.max(0, centerTileY - visionRange); y <= Math.min(MAP_HEIGHT_TILES - 1, centerTileY + visionRange); y++) {
            for (let x = Math.max(0, centerTileX - visionRange); x <= Math.min(MAP_WIDTH_TILES - 1, centerTileX + visionRange); x++) {
                if (Math.hypot(x - centerTileX, y - centerTileY) <= visionRange) {
                    visible[y * MAP_WIDTH_TILES + x] = 1;
                }
            }
        }
    });

    // 2. Diff against the current fog. Only allocate a new grid (and so only trigger
    //    canvas redraws downstream) when at least one tile actually changes state.
    let newFogOfWar: FogState[][] | null = null;
    for (let y = 0; y < state.fogOfWar.length; y++) {
        const row = state.fogOfWar[y];
        for (let x = 0; x < row.length; x++) {
            const current = row[x];
            const next = visible[y * MAP_WIDTH_TILES + x] ? FogState.VISIBLE : (current === FogState.VISIBLE ? FogState.EXPLORED : current);
            if (next !== current) {
                if (!newFogOfWar) newFogOfWar = state.fogOfWar.map(r => r.slice());
                newFogOfWar[y][x] = next;
            }
        }
    }
    return newFogOfWar ? { ...state, fogOfWar: newFogOfWar } : state;
}
