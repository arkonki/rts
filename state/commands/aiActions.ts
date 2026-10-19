import { AIAction, Building, GameEntity, GameState, Unit, UnitType } from '../../types';
import { DIFFICULTY_SETTINGS, ENTITY_CONFIGS, TILE_SIZE } from '../../constants';
import { getPlacementError } from '../../utils/placement';
import { meetsRequirements } from '../../utils/logic';
import { canUnitAttack } from '../../utils/entity';
import { makeEntityId } from '../helpers';
import { commandGather, commandRepair } from './unitCommands';
import { launchNuke } from './superweapons';

/** Applies one AI decision to the game state, validating it against the same rules as the human. */
export function performAIAction(state: GameState, aiAction: AIAction): GameState {
    const { playerId, action: aiActionType, thought } = aiAction;
    let newState = { ...state };
    let message = `${playerId}: ${thought || 'Taking action...'}`;

    const aiPlayerState = newState.players[playerId];
    const aiConfig = newState.aiOpponents.find(o => o.id === playerId);
    if (!aiPlayerState || !aiConfig) return state;

    switch (aiActionType) {
        case 'BUILD': {
            const { buildingType, placementPosition } = aiAction;
            if (buildingType && placementPosition) {
                const config = ENTITY_CONFIGS[buildingType];
                if (aiPlayerState.credits >= config.cost) {
                    const pixelPos = { x: placementPosition.x * TILE_SIZE + TILE_SIZE / 2, y: placementPosition.y * TILE_SIZE + TILE_SIZE / 2 };

                    const placementError = getPlacementError(buildingType, pixelPos, newState.terrain, newState.entities, playerId);

                    if (!placementError) {
                        const newAiPlayerState = { ...aiPlayerState, credits: aiPlayerState.credits - config.cost };
                        const newId = makeEntityId(playerId, buildingType, newState.nextId);
                        newState.nextId += 1;
                        const newBuilding: Building = {
                            id: newId, type: buildingType, playerId: playerId, hp: 1, maxHp: config.hp,
                            position: pixelPos, size: config.size, isPowered: false,
                            productionQueue: [], productionProgress: 0, isConstructing: true,
                        };
                        newState.entities = { ...newState.entities, [newId]: newBuilding };
                        newState.players = { ...newState.players, [playerId]: newAiPlayerState };
                    } else {
                        message = thought + ` (Failed to place at ${placementPosition.x}, ${placementPosition.y}: ${placementError})`;
                    }
                }
            }
            break;
        }
        case 'TRAIN': {
            const { unitType } = aiAction;
            if (unitType) {
                const config = ENTITY_CONFIGS[unitType];
                const producerType = config.producedBy;

                if (producerType && meetsRequirements(config, newState.entities, playerId)) {
                    const producer = Object.values(newState.entities).find(e => e.playerId === playerId && e.type === producerType && 'isPowered' in e && (e as Building).isPowered) as Building;

                    if (producer && aiPlayerState.credits >= config.cost && producer.productionQueue.length < 5) {
                        const newAiPlayerState = { ...aiPlayerState, credits: aiPlayerState.credits - config.cost };
                        const newProducer = { ...producer, productionQueue: [...producer.productionQueue, unitType] };
                        newState.entities = { ...newState.entities, [producer.id]: newProducer };
                        newState.players = { ...newState.players, [playerId]: newAiPlayerState };
                    }
                }
            }
            break;
        }
        case 'ATTACK': {
            const { attackTargetId, unitIds } = aiAction;
            const attackTarget = attackTargetId ? newState.entities[attackTargetId] : undefined;
            if (attackTarget && attackTarget.playerId !== playerId) {
                const candidates = (unitIds && unitIds.length > 0 ? unitIds.map(id => newState.entities[id]).filter(Boolean) : Object.values(newState.entities)) as GameEntity[];
                // Only the AI's own armed units that can actually hit this target.
                const attackers = candidates.filter(e =>
                    e.playerId === playerId && 'status' in e &&
                    e.type !== UnitType.CHRONO_MINER && e.type !== UnitType.ENGINEER &&
                    canUnitAttack(e as Unit, attackTarget)
                ) as Unit[];
                if (attackers.length > 0) {
                    const newEntities = { ...newState.entities };
                    attackers.forEach(entity => {
                        const unit = newEntities[entity.id];
                        if (unit && 'status' in unit) {
                            const newUnit = { ...unit, status: 'ATTACKING', targetId: attackTargetId, targetPosition: undefined, path: undefined } as Unit;
                            newEntities[unit.id] = newUnit;
                        }
                    });
                    newState.entities = newEntities;
                }
            }
            break;
        }
        case 'REPAIR': {
            const { unitIds, repairTargetId } = aiAction;
            if (unitIds && unitIds.length > 0 && repairTargetId) {
                newState = commandRepair(newState, unitIds[0], repairTargetId);
            }
            break;
        }
        case 'GATHER': {
            const { unitIds, gatherTargetId } = aiAction;
            if (unitIds && unitIds.length > 0 && gatherTargetId) {
                const minerId = unitIds[0];
                const miner = newState.entities[minerId];
                const resource = newState.resourcePatches[gatherTargetId];
                if (miner && resource && 'status' in miner && miner.type === UnitType.CHRONO_MINER) {
                    newState = commandGather(newState, miner.id, resource.id);
                }
            }
            break;
        }
        case 'LAUNCH_SUPERWEAPON': {
            const { targetPosition } = aiAction;
            if (targetPosition) {
                // Tile position is passed straight through
                newState = launchNuke(newState, playerId, targetPosition);
            }
            break;
        }
        case 'IDLE':
            break;
    }

    const newCooldown = DIFFICULTY_SETTINGS[aiConfig.difficulty].decisionInterval;
    const newPlayerState = { ...newState.players[playerId], aiActionCooldown: newCooldown };

    return { ...newState, players: { ...newState.players, [playerId]: newPlayerState }, lastMessage: message };
}
