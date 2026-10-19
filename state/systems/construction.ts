import { Building, BuildingType, GameState, UnitType } from '../../types';
import { ENTITY_CONFIGS, GAME_LOOP_INTERVAL, HUMAN_PLAYER_ID } from '../../constants';
import { TickContext, makeEntityId, withStats } from '../helpers';

export function updateBuildingConstruction(state: GameState, ctx: TickContext): GameState {
    const updatedEntities = { ...state.entities };
    let updatedGameStats = state.gameStats;
    let nextId = state.nextId;
    let changed = false;

    Object.values(state.entities).forEach(entity => {
        if ('isConstructing' in entity && entity.isConstructing) {
            const building = entity as Building;
            const config = ENTITY_CONFIGS[building.type];
            const hpPerTick = config.hp / (config.buildTime / GAME_LOOP_INTERVAL);
            const newHp = Math.min(config.hp, building.hp + hpPerTick);

            if (newHp >= config.hp) {
                updatedEntities[building.id] = { ...building, hp: newHp, isConstructing: false, isPowered: true };
                changed = true;

                updatedGameStats = withStats(updatedGameStats, building.playerId, stats => ({
                    ...stats,
                    buildingsConstructed: { ...stats.buildingsConstructed, [building.type]: (stats.buildingsConstructed[building.type] || 0) + 1 },
                }));

                if (building.playerId === HUMAN_PLAYER_ID) {
                    ctx.emitSound('construction_complete');
                }
                // Spawn a free miner when a refinery is completed
                if (building.type === BuildingType.REFINERY) {
                    const minerConfig = ENTITY_CONFIGS[UnitType.CHRONO_MINER];
                    const spawnPos = { x: building.position.x, y: building.position.y + building.size / 2 + 20 };
                    const newId = makeEntityId(building.playerId, UnitType.CHRONO_MINER, nextId++);
                    updatedEntities[newId] = {
                        id: newId, playerId: building.playerId, type: UnitType.CHRONO_MINER,
                        hp: minerConfig.hp, maxHp: minerConfig.hp, position: spawnPos,
                        size: minerConfig.size, domain: minerConfig.domain!, status: 'IDLE', cargoAmount: 0,
                    };
                }
            } else {
                updatedEntities[building.id] = { ...building, hp: newHp };
                changed = true;
            }
        }
    });

    return changed ? { ...state, entities: updatedEntities, gameStats: updatedGameStats, nextId } : state;
}
