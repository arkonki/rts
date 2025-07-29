
import { GameState, AIAction, BuildingType, UnitType, Building, PlayerId, AIConfiguration, ResourcePatch, Position, Unit } from '../types';
import { ENTITY_CONFIGS } from '../constants';

function findNearestResourcePatch(position: Position, patches: Record<string, ResourcePatch>, assignedPatches: Set<string>): ResourcePatch | null {
    let nearest: ResourcePatch | null = null;
    let minDist = Infinity;
    Object.values(patches).forEach(p => {
        if (assignedPatches.has(p.id)) return;
        const dist = Math.hypot(p.position.x - position.x, p.position.y - position.y);
        if (dist < minDist) {
            minDist = dist;
            nearest = p;
        }
    });
    return nearest;
}

const getAggressiveAICommand = (state: GameState, aiPlayerId: PlayerId): AIAction => {
    const { entities, players, resourcePatches } = state;
    const aiPlayerState = players[aiPlayerId];
    const aiEntities = Object.values(entities).filter(e => e.playerId === aiPlayerId);
    const aiBuildings = aiEntities.filter(e => 'isPowered' in e) as Building[];
    const aiUnits = aiEntities.filter(e => 'status' in e);
    const hasBuilding = (type: BuildingType) => aiBuildings.some(b => b.type === type);
    
    // 1. Attack! If we have more than 5 units, send them.
    const combatUnits = aiUnits.filter(u => u.type !== UnitType.CHRONO_MINER);
    if (combatUnits.length >= 5) {
        const enemyHQs = Object.values(entities).filter(e => e.playerId !== aiPlayerId && e.type === BuildingType.HQ);
        if (enemyHQs.length > 0) {
            const targetHQ = enemyHQs[Math.floor(Math.random() * enemyHQs.length)];
            return { action: 'ATTACK', attackTargetId: targetHQ.id, thought: "Unleash the horde!", unitIds: combatUnits.map(u => u.id), playerId: aiPlayerId };
        }
    }
    
    // 2. Power up if needed for barracks/factory
    const powerDeficit = aiPlayerState.power.consumed > aiPlayerState.power.produced;
    if (powerDeficit && aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.POWER_PLANT].cost) {
        return { action: 'BUILD', buildingType: BuildingType.POWER_PLANT, thought: "Need power for the war machine.", playerId: aiPlayerId };
    }

    // 3. Build Barracks -> War Factory
    if (!hasBuilding(BuildingType.BARRACKS) && aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.BARRACKS].cost) {
        return { action: 'BUILD', buildingType: BuildingType.BARRACKS, thought: "Let's get some boots on the ground.", playerId: aiPlayerId };
    }
    if (hasBuilding(BuildingType.BARRACKS) && !hasBuilding(BuildingType.WAR_FACTORY) && aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.WAR_FACTORY].cost) {
        return { action: 'BUILD', buildingType: BuildingType.WAR_FACTORY, thought: "Need a factory to build harvesters.", playerId: aiPlayerId };
    }

    // 4. Manage economy
    const aiMiners = aiUnits.filter(u => u.type === UnitType.CHRONO_MINER) as Unit[];
    const idleMiners = aiMiners.filter(u => u.status === 'IDLE');
    if (idleMiners.length > 0) {
        const assignedPatches = new Set(aiMiners.map(m => m.gatherTargetId).filter(Boolean));
        const nearestPatch = findNearestResourcePatch(idleMiners[0].position, resourcePatches, assignedPatches);
        if (nearestPatch) {
            return { action: 'GATHER', unitIds: [idleMiners[0].id], gatherTargetId: nearestPatch.id, thought: 'Mining for the glorious war effort.', playerId: aiPlayerId };
        }
    }
    if (hasBuilding(BuildingType.WAR_FACTORY) && aiMiners.length < 2 && aiPlayerState.credits >= ENTITY_CONFIGS[UnitType.CHRONO_MINER].cost) {
        return { action: 'TRAIN', unitType: UnitType.CHRONO_MINER, thought: 'Need money to make soldiers.', playerId: aiPlayerId };
    }


    // 5. Spam Riflemen
    if (hasBuilding(BuildingType.BARRACKS) && aiPlayerState.credits >= ENTITY_CONFIGS[UnitType.RIFLEMAN].cost) {
        const barracks = aiBuildings.find(b => b.type === BuildingType.BARRACKS && b.productionQueue.length < 5);
        if (barracks) {
            return { action: 'TRAIN', unitType: UnitType.RIFLEMAN, thought: "More... MORE!", playerId: aiPlayerId };
        }
    }

    // 6. Build refinery if we have nothing else to do.
     if (!hasBuilding(BuildingType.REFINERY) && aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.REFINERY].cost) {
        return { action: 'BUILD', buildingType: BuildingType.REFINERY, thought: "I guess I need a place to drop off the cash.", playerId: aiPlayerId };
    }
    
    return { action: 'IDLE', thought: "Conserving energy for the next assault.", playerId: aiPlayerId };
}

const getEconomicAICommand = (state: GameState, aiPlayerId: PlayerId): AIAction => {
    const { entities, players, resourcePatches } = state;
    const aiPlayerState = players[aiPlayerId];
    const aiEntities = Object.values(entities).filter(e => e.playerId === aiPlayerId);
    const aiBuildings = aiEntities.filter(e => 'isPowered' in e) as Building[];
    const aiUnits = aiEntities.filter(e => 'status' in e);
    const hasBuilding = (type: BuildingType) => aiBuildings.some(b => b.type === type);
    const countBuilding = (type: BuildingType) => aiBuildings.filter(b => b.type === type).length;
    
    // 1. Launch Nuke if ready
    if (aiPlayerState.superweapon?.isReady) {
        const enemyHQs = Object.values(entities).filter(e => e.playerId !== aiPlayerId && e.type === BuildingType.HQ);
        if(enemyHQs.length > 0) {
            return { action: 'LAUNCH_SUPERWEAPON', targetPosition: enemyHQs[0].position, thought: "Nuclear launch detected.", playerId: aiPlayerId };
        }
    }

    // 2. Always have enough power
    const powerDeficit = (aiPlayerState.power.consumed + 150) > aiPlayerState.power.produced;
    if (powerDeficit && aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.POWER_PLANT].cost) {
        return { action: 'BUILD', buildingType: BuildingType.POWER_PLANT, thought: "A solid power grid is the foundation of an empire.", playerId: aiPlayerId };
    }

    // 3. Build up to 2 Refineries then a War Factory
    if (countBuilding(BuildingType.REFINERY) < 2 && aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.REFINERY].cost) {
        return { action: 'BUILD', buildingType: BuildingType.REFINERY, thought: "Expanding my economic infrastructure.", playerId: aiPlayerId };
    }
     if (!hasBuilding(BuildingType.WAR_FACTORY) && aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.WAR_FACTORY].cost) {
        return { action: 'BUILD', buildingType: BuildingType.WAR_FACTORY, thought: "Unlocking vehicle production.", playerId: aiPlayerId };
    }

    // 4. Manage Miners
    const aiMiners = aiUnits.filter(u => u.type === UnitType.CHRONO_MINER) as Unit[];
    const idleMiners = aiMiners.filter(u => u.status === 'IDLE');
    if (idleMiners.length > 0) {
        const assignedPatches = new Set(aiMiners.map(m => m.gatherTargetId).filter(Boolean));
        const nearestPatch = findNearestResourcePatch(idleMiners[0].position, resourcePatches, assignedPatches);
        if (nearestPatch) {
            return { action: 'GATHER', unitIds: [idleMiners[0].id], gatherTargetId: nearestPatch.id, thought: 'Securing more resources.', playerId: aiPlayerId };
        }
    }
    if (hasBuilding(BuildingType.WAR_FACTORY) && aiMiners.length < 4 && aiPlayerState.credits >= ENTITY_CONFIGS[UnitType.CHRONO_MINER].cost) {
        return { action: 'TRAIN', unitType: UnitType.CHRONO_MINER, thought: 'The economy must grow.', playerId: aiPlayerId };
    }

    // 5. Tech up to Nuke
    if (!hasBuilding(BuildingType.BARRACKS) && aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.BARRACKS].cost) {
        return { action: 'BUILD', buildingType: BuildingType.BARRACKS, thought: "Establishing basic military production.", playerId: aiPlayerId };
    }
    if (hasBuilding(BuildingType.WAR_FACTORY) && !hasBuilding(BuildingType.NUCLEAR_MISSILE_SILO) && aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.NUCLEAR_MISSILE_SILO].cost) {
        return { action: 'BUILD', buildingType: BuildingType.NUCLEAR_MISSILE_SILO, thought: "The ultimate power is nearly mine.", playerId: aiPlayerId };
    }
    
    // 6. Attack only when strong
    const combatUnits = aiUnits.filter(u => u.type !== UnitType.CHRONO_MINER);
    if (combatUnits.length >= 15) {
        const enemyHQs = Object.values(entities).filter(e => e.playerId !== aiPlayerId && e.type === BuildingType.HQ);
        if (enemyHQs.length > 0) {
            const targetHQ = enemyHQs[Math.floor(Math.random() * enemyHQs.length)];
            return { action: 'ATTACK', attackTargetId: targetHQ.id, thought: "The time is now. Unleash the iron fist!", unitIds: combatUnits.map(u => u.id), playerId: aiPlayerId };
        }
    }
    
    // 7. Build expensive units if possible
    if (hasBuilding(BuildingType.WAR_FACTORY) && aiPlayerState.credits >= ENTITY_CONFIGS[UnitType.APOCALYPSE_TANK].cost) {
        const factory = aiBuildings.find(b => b.type === BuildingType.WAR_FACTORY && b.productionQueue.length < 2);
        if (factory) {
            return { action: 'TRAIN', unitType: UnitType.APOCALYPSE_TANK, thought: "Forging the ultimate weapon.", playerId: aiPlayerId };
        }
    }
    if (hasBuilding(BuildingType.WAR_FACTORY) && aiPlayerState.credits >= ENTITY_CONFIGS[UnitType.TANK].cost) {
        const factory = aiBuildings.find(b => b.type === BuildingType.WAR_FACTORY && b.productionQueue.length < 5);
        if (factory) {
            return { action: 'TRAIN', unitType: UnitType.TANK, thought: "A good, solid tank.", playerId: aiPlayerId };
        }
    }

    return { action: 'IDLE', thought: "Patience. The economy must grow.", playerId: aiPlayerId };
}

const getBalancedAICommand = (state: GameState, aiPlayerId: PlayerId): AIAction => {
    const { entities, players, resourcePatches } = state;
    const aiPlayerState = players[aiPlayerId];
    const aiEntities = Object.values(entities).filter(e => e.playerId === aiPlayerId);
    const aiBuildings = aiEntities.filter(e => 'isPowered' in e) as Building[];
    const aiUnits = aiEntities.filter(e => 'status' in e);
    const hasBuilding = (type: BuildingType) => aiBuildings.some(b => b.type === type);
    const countBuilding = (type: BuildingType) => aiBuildings.filter(b => b.type === type).length;
    
    // 1. Nuke if ready!
    if (aiPlayerState.superweapon?.isReady) {
        const enemyHQs = Object.values(entities).filter(e => e.playerId !== aiPlayerId && e.type === BuildingType.HQ);
        if(enemyHQs.length > 0) {
            return { action: 'LAUNCH_SUPERWEAPON', targetPosition: enemyHQs[0].position, thought: "Delivering the final payload.", playerId: aiPlayerId };
        }
    }

    // 2. Power Management
    const powerDeficit = aiPlayerState.power.consumed > aiPlayerState.power.produced;
    if (powerDeficit && aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.POWER_PLANT].cost) {
        return { action: 'BUILD', buildingType: BuildingType.POWER_PLANT, thought: "I need more power.", playerId: aiPlayerId };
    }

    // 3. Economy
    if (countBuilding(BuildingType.REFINERY) < 1 && aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.REFINERY].cost) {
        return { action: 'BUILD', buildingType: BuildingType.REFINERY, thought: "Expanding my economy is crucial.", playerId: aiPlayerId };
    }
    if (hasBuilding(BuildingType.REFINERY) && !hasBuilding(BuildingType.WAR_FACTORY) && aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.WAR_FACTORY].cost) {
        return { action: 'BUILD', buildingType: BuildingType.WAR_FACTORY, thought: "I need a War Factory to build harvesters.", playerId: aiPlayerId };
    }

    // 4. Manage Miners
    const aiMiners = aiUnits.filter(u => u.type === UnitType.CHRONO_MINER) as Unit[];
    const idleMiners = aiMiners.filter(u => u.status === 'IDLE');
    if (idleMiners.length > 0) {
        const assignedPatches = new Set(aiMiners.map(m => m.gatherTargetId).filter(Boolean));
        const nearestPatch = findNearestResourcePatch(idleMiners[0].position, resourcePatches, assignedPatches);
        if (nearestPatch) {
            return { action: 'GATHER', unitIds: [idleMiners[0].id], gatherTargetId: nearestPatch.id, thought: 'Getting resources.', playerId: aiPlayerId };
        }
    }
     if (hasBuilding(BuildingType.WAR_FACTORY) && aiMiners.length < 3 && aiPlayerState.credits >= ENTITY_CONFIGS[UnitType.CHRONO_MINER].cost) {
        return { action: 'TRAIN', unitType: UnitType.CHRONO_MINER, thought: 'A healthy economy is a strong economy.', playerId: aiPlayerId };
    }

    
    // 5. Tech Up
    if (!hasBuilding(BuildingType.BARRACKS) && aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.BARRACKS].cost) {
        return { action: 'BUILD', buildingType: BuildingType.BARRACKS, thought: "Time to train some infantry.", playerId: aiPlayerId };
    }
     if (hasBuilding(BuildingType.WAR_FACTORY) && !hasBuilding(BuildingType.NUCLEAR_MISSILE_SILO) && aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.NUCLEAR_MISSILE_SILO].cost) {
        return { action: 'BUILD', buildingType: BuildingType.NUCLEAR_MISSILE_SILO, thought: "Initiating doomsday protocol.", playerId: aiPlayerId };
    }
    
    // 6. Attack
    const combatUnits = aiUnits.filter(u => u.type !== UnitType.CHRONO_MINER);
    if (combatUnits.length >= 10) {
        const enemyHQs = Object.values(entities).filter(e => e.playerId !== aiPlayerId && e.type === BuildingType.HQ);
        if (enemyHQs.length > 0) {
            const targetHQ = enemyHQs[Math.floor(Math.random() * enemyHQs.length)];
            return { action: 'ATTACK', attackTargetId: targetHQ.id, thought: `My army is ready. Attacking an enemy base!`, unitIds: combatUnits.map(u => u.id), playerId: aiPlayerId };
        }
    }

    // 7. Train Units (mix of infantry and tanks)
    if (hasBuilding(BuildingType.WAR_FACTORY) && aiPlayerState.credits >= ENTITY_CONFIGS[UnitType.TANK].cost && aiUnits.filter(u => u.type === UnitType.TANK).length < 5) {
        const factory = aiBuildings.find(b => b.type === BuildingType.WAR_FACTORY && b.productionQueue.length < 3);
        if (factory) {
            return { action: 'TRAIN', unitType: UnitType.TANK, thought: "Rolling out a new tank.", playerId: aiPlayerId };
        }
    }
    if (hasBuilding(BuildingType.BARRACKS) && aiPlayerState.credits >= ENTITY_CONFIGS[UnitType.RIFLEMAN].cost) {
        const barracks = aiBuildings.find(b => b.type === BuildingType.BARRACKS && b.productionQueue.length < 5);
        if (barracks) {
            return { action: 'TRAIN', unitType: UnitType.RIFLEMAN, thought: "Reinforcing my army.", playerId: aiPlayerId };
        }
    }
    
    return { action: 'IDLE', thought: "Saving up resources.", playerId: aiPlayerId };
}

export function getLocalAICommand(state: GameState, aiPlayerId: PlayerId, aiConfig: AIConfiguration): AIAction {
    const { personality } = aiConfig;

    switch(personality) {
        case 'AGGRESSIVE':
            return getAggressiveAICommand(state, aiPlayerId);
        case 'ECONOMIC':
            return getEconomicAICommand(state, aiPlayerId);
        case 'BALANCED':
        default:
            return getBalancedAICommand(state, aiPlayerId);
    }
}
