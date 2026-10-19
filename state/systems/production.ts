import { Building, BuildingType, GameState, TerrainType, UnitType } from '../../types';
import { ENTITY_CONFIGS, GAME_LOOP_INTERVAL, HUMAN_PLAYER_ID, TILE_SIZE } from '../../constants';
import { findPath } from '../../utils/pathfinding';
import { TickContext, makeEntityId, withStats } from '../helpers';

export function updateBuildingProduction(state: GameState, ctx: TickContext): GameState {
    const updatedEntities = { ...state.entities };
    let updatedGameStats = state.gameStats;
    let nextId = state.nextId;
    let changed = false;

    Object.values(state.entities).forEach(entity => {
        if ('productionQueue' in entity && entity.productionQueue.length > 0 && entity.isPowered) {
            const building = entity as Building;
            const newProgress = building.productionProgress + GAME_LOOP_INTERVAL;
            const itemType = building.productionQueue[0] as UnitType;
            const config = ENTITY_CONFIGS[itemType];

            if (newProgress >= config.buildTime) {
                if (building.playerId === HUMAN_PLAYER_ID) ctx.emitSound('unit_ready');

                updatedGameStats = withStats(updatedGameStats, building.playerId, stats => ({
                    ...stats,
                    unitsBuilt: { ...stats.unitsBuilt, [itemType]: (stats.unitsBuilt[itemType] || 0) + 1 },
                }));

                let spawnPos = { x: building.position.x, y: building.position.y + building.size / 2 + 15 };
                if (building.type === BuildingType.NAVAL_YARD) {
                    // Find a valid coastal spawn point
                    let foundSpawn = false;
                    for (let dy = -3; dy <= 3; dy++) {
                        for (let dx = -3; dx <= 3; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const checkX = Math.floor(building.position.x / TILE_SIZE) + dx;
                            const checkY = Math.floor(building.position.y / TILE_SIZE) + dy;
                            const terrainType = state.terrain[checkY]?.[checkX];
                            if (terrainType === TerrainType.SHALLOW_WATER || terrainType === TerrainType.DEEP_WATER) {
                                spawnPos.x = checkX * TILE_SIZE + TILE_SIZE / 2;
                                spawnPos.y = checkY * TILE_SIZE + TILE_SIZE / 2;
                                foundSpawn = true; break;
                            }
                        }
                        if (foundSpawn) break;
                    }
                }
                const newId = makeEntityId(building.playerId, itemType, nextId++);
                const rallyPath = building.rallyPoint ? findPath(spawnPos, building.rallyPoint, state.terrain, config.domain!) : null;

                updatedEntities[newId] = {
                    id: newId, playerId: building.playerId, type: itemType, hp: config.hp, maxHp: config.hp, position: spawnPos, size: config.size,
                    domain: config.domain!, status: rallyPath ? 'ATTACK_MOVING' : 'IDLE',
                    path: rallyPath || undefined, targetPosition: building.rallyPoint,
                    damage: config.damage, attackRange: config.attackRange, lastAttackTime: 0,
                    cargoAmount: 0,
                };

                updatedEntities[building.id] = { ...building, productionProgress: 0, productionQueue: building.productionQueue.slice(1) };
                changed = true;
            } else {
                updatedEntities[building.id] = { ...building, productionProgress: newProgress };
                changed = true;
            }
        }
    });

    return changed ? { ...state, entities: updatedEntities, gameStats: updatedGameStats, nextId } : state;
}
