
import { GameState, AIAction, BuildingType, UnitType, Building, PlayerId, AIConfiguration, ResourcePatch, Position, Unit, GameEntity, UnitDomain } from '../types';
import { ENTITY_CONFIGS } from '../constants';

// --- AI Context and Helpers ---

interface AIContext {
    aiPlayerId: PlayerId;
    aiConfig: AIConfiguration;
    gameState: GameState;
    aiPlayerState: GameState['players'][string];
    allAiEntities: GameEntity[];
    aiBuildings: Building[];
    aiUnits: Unit[];
    aiMiners: Unit[];
    aiEngineers: Unit[];
    enemyEntities: GameEntity[];
    powerDeficit: boolean;
    hasBuilding: (type: BuildingType) => boolean;
    countBuilding: (type: BuildingType) => number;
    getProducers: (unitType: UnitType) => Building[];
}

function findNearestEntity(position: Position, entities: GameEntity[]): GameEntity | null {
    let nearest: GameEntity | null = null;
    let minDist = Infinity;
    entities.forEach(e => {
        const dist = Math.hypot(e.position.x - position.x, e.position.y - position.y);
        if (dist < minDist) {
            minDist = dist;
            nearest = e;
        }
    });
    return nearest;
}

function isBaseUnderAttack(ctx: AIContext): { underAttack: boolean; attacker: GameEntity | null } {
    for (const enemy of ctx.enemyEntities) {
        if ('status' in enemy && (enemy as Unit).status === 'ATTACKING') {
            const target = ctx.gameState.entities[(enemy as Unit).targetId!];
            if (target && target.playerId === ctx.aiPlayerId && 'isPowered' in target) {
                 return { underAttack: true, attacker: enemy };
            }
        }
    }
    return { underAttack: false, attacker: null };
}

function findBestAttackTarget(ctx: AIContext): GameEntity | null {
    if (ctx.enemyEntities.length === 0) return null;

    const targetPriority = [
        BuildingType.NUCLEAR_MISSILE_SILO,
        BuildingType.CHRONO_SPHERE,
        UnitType.PRISM_TANK,
        UnitType.APOCALYPSE_TANK,
        BuildingType.WAR_FACTORY,
        BuildingType.AIRFIELD,
        BuildingType.NAVAL_YARD,
        BuildingType.BARRACKS,
        UnitType.ENGINEER,
        BuildingType.REPAIR_BAY,
        UnitType.CHRONO_MINER,
        BuildingType.REFINERY,
        BuildingType.POWER_PLANT,
        BuildingType.HQ,
    ];

    let bestTarget: GameEntity | null = null;
    let highestScore = -1;

    for (const enemy of ctx.enemyEntities) {
        let score = 10; // Base score for any target
        const priorityIndex = targetPriority.indexOf(enemy.type as any);
        if (priorityIndex !== -1) {
            score += (targetPriority.length - priorityIndex) * 10;
        }
        
        // Add score for low health
        score += (1 - (enemy.hp / enemy.maxHp)) * 20;
        
        // Prioritize closer targets
        const hq = ctx.gameState.entities[ctx.aiPlayerState.hqId];
        if (hq) {
             const dist = Math.hypot(enemy.position.x - hq.position.x, enemy.position.y - hq.position.y);
             score -= dist / 100;
        }

        if (score > highestScore) {
            highestScore = score;
            bestTarget = enemy;
        }
    }
    
    return bestTarget || findNearestEntity(ctx.allAiEntities[0].position, ctx.enemyEntities);
}

// --- High-Level AI Behaviors ---

function manageRepairs(ctx: AIContext): AIAction | null {
    const idleEngineers = ctx.aiEngineers.filter(e => e.status === 'IDLE');
    if (idleEngineers.length === 0) return null;

    const damagedEntities = ctx.allAiEntities.filter(e => e.hp < e.maxHp).sort((a,b) => (a.hp/a.maxHp) - (b.hp/b.maxHp));
    const mostDamaged = damagedEntities[0];

    if (mostDamaged) {
        return { action: 'REPAIR', unitIds: [idleEngineers[0].id], repairTargetId: mostDamaged.id, thought: `My ${mostDamaged.type} is damaged. Sending an Engineer to fix it.`, playerId: ctx.aiPlayerId };
    }

    return null;
}

function manageEconomy(ctx: AIContext, minerTarget: number, refineryTarget: number): AIAction | null {
    // 1. Assign idle miners
    const idleMiners = ctx.aiMiners.filter(u => u.status === 'IDLE');
    if (idleMiners.length > 0) {
        const assignedPatches = new Set(ctx.aiMiners.map(m => m.gatherTargetId).filter(Boolean));
        let nearestPatch: ResourcePatch | null = null;
        let minDist = Infinity;
        
        Object.values(ctx.gameState.resourcePatches).forEach(p => {
             if (assignedPatches.has(p.id)) return;
             const dist = Math.hypot(p.position.x - idleMiners[0].position.x, p.position.y - idleMiners[0].position.y);
             if (dist < minDist) {
                minDist = dist;
                nearestPatch = p;
             }
        });
        
        if (nearestPatch) {
            return { action: 'GATHER', unitIds: [idleMiners[0].id], gatherTargetId: nearestPatch.id, thought: 'Miner heading to a new ore patch.', playerId: ctx.aiPlayerId };
        }
    }
    
    // 2. Build Power if needed for refinery
    if (ctx.powerDeficit && ctx.countBuilding(BuildingType.REFINERY) < refineryTarget && ctx.aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.POWER_PLANT].cost) {
        return { action: 'BUILD', buildingType: BuildingType.POWER_PLANT, thought: 'Need more power before expanding economy.', playerId: ctx.aiPlayerId };
    }
    
    // 3. Build Refineries
    if (ctx.countBuilding(BuildingType.REFINERY) < refineryTarget && ctx.aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.REFINERY].cost) {
        return { action: 'BUILD', buildingType: BuildingType.REFINERY, thought: 'Expanding my economic infrastructure.', playerId: ctx.aiPlayerId };
    }
    
    // 4. Train Miners
    if (ctx.hasBuilding(BuildingType.WAR_FACTORY) && ctx.aiMiners.length < minerTarget && ctx.aiPlayerState.credits >= ENTITY_CONFIGS[UnitType.CHRONO_MINER].cost) {
        const producers = ctx.getProducers(UnitType.CHRONO_MINER);
        if (producers.length > 0 && producers[0].productionQueue.length < 2) {
             return { action: 'TRAIN', unitType: UnitType.CHRONO_MINER, thought: 'The economy must grow. Building another miner.', playerId: ctx.aiPlayerId };
        }
    }
    
    return null;
}

function manageSupport(ctx: AIContext): AIAction | null {
    const vehicleCount = ctx.aiUnits.filter(u => u.domain === UnitDomain.GROUND && u.type !== UnitType.RIFLEMAN && u.type !== UnitType.TESLA_TROOPER).length;

    // Build Repair Bay
    if (vehicleCount > 3 && !ctx.hasBuilding(BuildingType.REPAIR_BAY) && ctx.aiPlayerState.credits > ENTITY_CONFIGS[BuildingType.REPAIR_BAY].cost) {
        return { action: 'BUILD', buildingType: BuildingType.REPAIR_BAY, thought: 'My army needs mechanical support. Building a Repair Bay.', playerId: ctx.aiPlayerId };
    }

    // Train Engineers
    if (ctx.hasBuilding(BuildingType.BARRACKS) && ctx.aiEngineers.length < 2 && ctx.aiPlayerState.credits > ENTITY_CONFIGS[UnitType.ENGINEER].cost) {
        const producers = ctx.getProducers(UnitType.ENGINEER);
        if (producers.length > 0 && producers[0].productionQueue.length < 2) {
             return { action: 'TRAIN', unitType: UnitType.ENGINEER, thought: 'I need engineers for battlefield maintenance.', playerId: ctx.aiPlayerId };
        }
    }
    return null;
}

function manageMilitary(ctx: AIContext, unitComposition: Partial<Record<UnitType, number>>, armySizeTarget: number): AIAction | null {
    const combatUnits = ctx.aiUnits.filter(u => u.type !== UnitType.CHRONO_MINER && u.type !== UnitType.ENGINEER);

    // 1. Build prerequisites first
    if (!ctx.hasBuilding(BuildingType.BARRACKS) && ctx.aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.BARRACKS].cost) {
        return { action: 'BUILD', buildingType: BuildingType.BARRACKS, thought: 'Need a Barracks to train infantry.', playerId: ctx.aiPlayerId };
    }
     if (!ctx.hasBuilding(BuildingType.WAR_FACTORY) && ctx.aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.WAR_FACTORY].cost) {
        return { action: 'BUILD', buildingType: BuildingType.WAR_FACTORY, thought: 'A War Factory is required for vehicles.', playerId: ctx.aiPlayerId };
    }
    
    // 2. Ensure enough power for production buildings
    if (ctx.powerDeficit && (ctx.getProducers(UnitType.RIFLEMAN).length > 0 || ctx.getProducers(UnitType.TANK).length > 0)) {
         if(ctx.aiPlayerState.credits >= ENTITY_CONFIGS[BuildingType.POWER_PLANT].cost) {
             return { action: 'BUILD', buildingType: BuildingType.POWER_PLANT, thought: 'Powering up my production facilities.', playerId: ctx.aiPlayerId };
         }
    }
    
    // 3. Train units based on composition
    const desiredUnit = Object.keys(unitComposition).find(u => {
        const unitType = u as UnitType;
        const config = ENTITY_CONFIGS[unitType];
        // Check if player has the required buildings for this unit
        const requirements = config.requires ? (Array.isArray(config.requires) ? config.requires : [config.requires]) : [];
        const requirementsMet = requirements.every(req => ctx.hasBuilding(req));

        if (!requirementsMet) return false;

        const currentRatio = combatUnits.filter(unit => unit.type === unitType).length / (combatUnits.length || 1);
        return currentRatio < unitComposition[unitType]! && ctx.aiPlayerState.credits >= config.cost;
    }) as UnitType | undefined;

    if (desiredUnit) {
        const producers = ctx.getProducers(desiredUnit);
        if (producers.length > 0 && producers[0].productionQueue.length < 3) {
            return { action: 'TRAIN', unitType: desiredUnit, thought: `Building a ${ENTITY_CONFIGS[desiredUnit].name} to balance my army.`, playerId: ctx.aiPlayerId };
        }
    }
    
    // 4. If army is below target size, build the cheapest available unit from the composition
    if (combatUnits.length < armySizeTarget) {
        const affordableUnits = Object.keys(unitComposition)
            .map(u => u as UnitType)
            .filter(u => ctx.aiPlayerState.credits >= ENTITY_CONFIGS[u].cost)
            .sort((a,b) => ENTITY_CONFIGS[a].cost - ENTITY_CONFIGS[b].cost);
        
        if (affordableUnits.length > 0) {
            const cheapestUnit = affordableUnits[0];
            const producers = ctx.getProducers(cheapestUnit);
            if(producers.length > 0 && producers[0].productionQueue.length < 5) {
                return { action: 'TRAIN', unitType: cheapestUnit, thought: `Bolstering my forces with a ${ENTITY_CONFIGS[cheapestUnit].name}.`, playerId: ctx.aiPlayerId };
            }
        }
    }

    // 5. Attack if army size is met
    if (combatUnits.length >= armySizeTarget) {
        const target = findBestAttackTarget(ctx);
        if(target) {
            return { action: 'ATTACK', attackTargetId: target.id, unitIds: combatUnits.map(u => u.id), thought: `My army is ready. Attacking the enemy ${target.type}!`, playerId: ctx.aiPlayerId };
        }
    }

    return null;
}

// --- Main AI Logic ---

export function getLocalAICommand(state: GameState, aiPlayerId: PlayerId, aiConfig: AIConfiguration): AIAction {
    // --- Setup AI Context ---
    const allAiEntities = Object.values(state.entities).filter(e => e.playerId === aiPlayerId);
    if (allAiEntities.length === 0) {
        return { action: 'IDLE', thought: 'I have no units or buildings.', playerId: aiPlayerId };
    }
    
    const aiBuildings = allAiEntities.filter(e => 'isPowered' in e) as Building[];
    const aiUnits = allAiEntities.filter(e => 'status' in e) as Unit[];
    const aiPlayerState = state.players[aiPlayerId];
    
    const ctx: AIContext = {
        aiPlayerId,
        aiConfig,
        gameState: state,
        aiPlayerState,
        allAiEntities,
        aiBuildings,
        aiUnits,
        aiMiners: aiUnits.filter(u => u.type === UnitType.CHRONO_MINER),
        aiEngineers: aiUnits.filter(u => u.type === UnitType.ENGINEER),
        enemyEntities: Object.values(state.entities).filter(e => e.playerId !== aiPlayerId),
        powerDeficit: aiPlayerState.power.consumed + 20 > aiPlayerState.power.produced, // plan for future consumption
        hasBuilding: (type: BuildingType) => aiBuildings.some(b => b.type === type && !b.isConstructing),
        countBuilding: (type: BuildingType) => aiBuildings.filter(b => b.type === type && !b.isConstructing).length,
        getProducers: (unitType: UnitType) => {
            const producerType = ENTITY_CONFIGS[unitType].producedBy;
            return aiBuildings.filter(b => b.type === producerType && b.isPowered && !b.isConstructing);
        }
    };
    
    // --- Universal High-Priority Actions ---
    const { underAttack, attacker } = isBaseUnderAttack(ctx);
    if (underAttack && attacker) {
        const defenders = ctx.aiUnits.filter(u => u.type !== UnitType.CHRONO_MINER && u.status !== 'ATTACKING');
        if (defenders.length > 0) {
            return { action: 'ATTACK', attackTargetId: attacker.id, unitIds: defenders.map(u => u.id), thought: 'My base is under attack! Defending!', playerId: aiPlayerId };
        }
    }

    const repairAction = manageRepairs(ctx);
    if (repairAction) return repairAction;
    
    // --- Personality-driven Strategy ---
    let action: AIAction | null = null;
    switch(aiConfig.personality) {
        case 'AGGRESSIVE':
            action = manageEconomy(ctx, 2, 1) // Low eco target
                   || manageMilitary(ctx, { [UnitType.RIFLEMAN]: 0.5, [UnitType.TANK]: 0.5 }, 5); // Attack early
            break;

        case 'ECONOMIC':
            action = manageEconomy(ctx, 5, 2) // High eco target
                   || manageSupport(ctx)
                   || manageMilitary(ctx, { [UnitType.TANK]: 0.4, [UnitType.PRISM_TANK]: 0.3, [UnitType.APOCALYPSE_TANK]: 0.3 }, 15); // Attack late with strong units
            break;
            
        case 'BALANCED':
        default:
             action = manageEconomy(ctx, 3, 2) // Mid eco target
                   || manageSupport(ctx)
                   || manageMilitary(ctx, { [UnitType.TESLA_TROOPER]: 0.3, [UnitType.TANK]: 0.7 }, 10); // Attack with a decent mid-game army
            break;
    }

    return action || { action: 'IDLE', thought: 'Waiting for an opportunity.', playerId: aiPlayerId };
}