import { Building, BuildingType, GameAlert, GameState, Position, Unit, UnitDomain, UnitType } from '../../types';
import { ALERT_COOLDOWN_TICKS, ENTITY_CONFIGS, GAME_LOOP_INTERVAL, HUMAN_PLAYER_ID, TILE_SIZE, TURN_STEP_DEGREES, unitAttackSounds } from '../../constants';
import { findPath } from '../../utils/pathfinding';
import { findNearestEnemy, headingTo, turnToward } from '../../utils/entity';
import { SpatialGrid } from '../../utils/spatialGrid';
import { TickContext, shallowChanged, withStats } from '../helpers';

// Repair text is only spawned every Nth tick per repairer to avoid flooding the screen.
const REPAIR_BAY_TEXT_EVERY_N_TICKS = 10;
const ENGINEER_TEXT_EVERY_N_TICKS = 5;

/** Economy, repair, combat and movement for every unit. */
export function updateUnits(state: GameState, ctx: TickContext, spatialGrid: SpatialGrid): GameState {
    const { now, tick } = ctx;
    let newEntities = { ...state.entities };
    let newResourcePatches = { ...state.resourcePatches };
    let newPlayers = { ...state.players };
    let newVisualEffects = [...state.visualEffects];
    let newGameStats = state.gameStats;
    let nextId = state.nextId;
    let somethingChanged = false;
    // Position of the first human entity hit by an enemy this tick, for the under-attack alert.
    let humanHitAt: Position | null = null;

    // --- Repair Bay Logic ---
    const repairBays = Object.values(newEntities).filter(e => e.type === BuildingType.REPAIR_BAY && (e as Building).isPowered && !(e as Building).isConstructing) as Building[];
    if (repairBays.length > 0) {
        const repairBayConfig = ENTITY_CONFIGS[BuildingType.REPAIR_BAY];
        const repairPerTick = (repairBayConfig.repairPower! * GAME_LOOP_INTERVAL) / 1000;
        
        Object.values(newEntities).forEach(entity => {
            if ('domain' in entity && entity.domain === UnitDomain.GROUND && entity.hp < entity.maxHp) {
                const vehicle = entity as Unit;
                const isNearBay = repairBays.some(bay => Math.hypot(bay.position.x - vehicle.position.x, bay.position.y - vehicle.position.y) < bay.size * 1.5);
                
                if (isNearBay) {
                    const player = newPlayers[vehicle.playerId];
                    const repairCost = repairPerTick * repairBayConfig.repairCostMultiplier!;
                    if (player.credits >= repairCost) {
                        const newHp = Math.min(vehicle.maxHp, vehicle.hp + repairPerTick);
                        newPlayers[vehicle.playerId] = { ...player, credits: player.credits - repairCost };
                        newEntities[vehicle.id] = { ...vehicle, hp: newHp };
                        if (tick % REPAIR_BAY_TEXT_EVERY_N_TICKS === 0) {
                            newVisualEffects.push({ id: `rep_${nextId++}`, type: 'REPAIR_TEXT', creationTime: now, text: `+${Math.round(repairPerTick)}`, position: vehicle.position });
                        }
                        somethingChanged = true;
                    }
                }
            }
        });
    }

    const allUnits = Object.values(newEntities).filter(e => 'status' in e) as Unit[];
    
    allUnits.forEach(unit => {
        let currentUnit: Unit = { ...unit }; // Work on a mutable copy for this unit
        const config = ENTITY_CONFIGS[unit.type];
        
        // --- STATE-SPECIFIC LOGIC (NON-MOVEMENT) ---
        if (unit.type === UnitType.CHRONO_MINER) {
            switch(unit.status) {
                case 'GATHERING': {
                    const gatherTarget = newResourcePatches[unit.gatherTargetId!];
                    if (!gatherTarget || gatherTarget.amount <= 0) {
                        currentUnit.status = 'IDLE';
                        currentUnit.gatherTargetId = undefined;
                        if (gatherTarget) delete newResourcePatches[unit.gatherTargetId!];
                        break;
                    }
                    const newCargo = (currentUnit.cargoAmount || 0) + config.gatherAmount!;
                    const newPatchAmount = gatherTarget.amount - config.gatherAmount!;
                    newResourcePatches[gatherTarget.id] = { ...gatherTarget, amount: newPatchAmount };

                    if (newCargo >= config.gatherCapacity!) {
                        currentUnit.cargoAmount = config.gatherCapacity;
                        const refineries = Object.values(newEntities).filter(e => e.playerId === unit.playerId && e.type === BuildingType.REFINERY && (e as Building).isPowered);
                        if (refineries.length > 0) {
                            const nearestRefinery = refineries.sort((a,b) => Math.hypot(unit.position.x - a.position.x, unit.position.y - a.position.y) - Math.hypot(unit.position.x - b.position.x, unit.position.y - b.position.y))[0];
                            const path = findPath(unit.position, nearestRefinery.position, state.terrain, unit.domain);
                            // Only change status if a path is successfully found to prevent getting stuck
                            if (path) {
                                currentUnit = { ...currentUnit, status: 'RETURNING_TO_REFINERY', path: path, refineryTargetId: nearestRefinery.id };
                            } else {
                                // Can't find path to refinery, so stop trying.
                                currentUnit.status = 'IDLE';
                            }
                        } else { currentUnit.status = 'IDLE'; }
                    } else {
                        currentUnit.cargoAmount = newCargo;
                    }
                    break;
                }
                case 'RETURNING_TO_REFINERY': {
                    // Check if the refinery still exists. The actual deposit logic is handled on path completion.
                    const refinery = newEntities[unit.refineryTargetId!];
                    if(!refinery) { 
                        currentUnit.status = 'IDLE'; 
                        currentUnit.path = undefined;
                        currentUnit.refineryTargetId = undefined;
                    }
                    break;
                }
            }
        } else if (unit.type === UnitType.ENGINEER) {
            if (currentUnit.status === 'REPAIRING' && currentUnit.repairTargetId) {
                const target = newEntities[currentUnit.repairTargetId];
                if (!target || target.hp >= target.maxHp) {
                    currentUnit = { ...currentUnit, status: 'IDLE', repairTargetId: undefined };
                } else {
                    const player = newPlayers[currentUnit.playerId];
                    const repairPerTick = (config.repairPower! * GAME_LOOP_INTERVAL) / 1000;
                    const repairCost = repairPerTick * config.repairCostMultiplier!;
                    if (player.credits >= repairCost) {
                        const newHp = Math.min(target.maxHp, target.hp + repairPerTick);
                        newPlayers[currentUnit.playerId] = { ...player, credits: player.credits - repairCost };
                        newEntities[target.id] = { ...target, hp: newHp };
                        if (tick % ENGINEER_TEXT_EVERY_N_TICKS === 0) {
                            newVisualEffects.push({ id: `rep_${nextId++}`, type: 'REPAIR_TEXT', creationTime: now, text: `+${Math.round(repairPerTick)}`, position: target.position });
                        }
                    } else { // Not enough money, stop repairing
                        currentUnit = { ...currentUnit, status: 'IDLE', repairTargetId: undefined };
                    }
                }
            }
        }
        else { // --- COMBAT LOGIC for non-miners/non-engineers ---
            if (unit.status === 'IDLE' || unit.status === 'ATTACK_MOVING') {
                const enemy = findNearestEnemy(unit, spatialGrid, state.fogOfWar);
                // A unit holding position only engages what is already in weapon range.
                const reachable = enemy && (!unit.holdPosition ||
                    Math.hypot(enemy.position.x - unit.position.x, enemy.position.y - unit.position.y) <= (unit.attackRange || 0));
                if (enemy && reachable) {
                    currentUnit = { ...currentUnit, status: 'ATTACKING', targetId: enemy.id, path: undefined };
                }
            }
            if (currentUnit.status === 'ATTACKING' && currentUnit.targetId) {
                let target = newEntities[currentUnit.targetId];
                if (!target) {
                    const hasTargetPos = !!currentUnit.targetPosition;
                    currentUnit = { 
                        ...currentUnit,
                        status: hasTargetPos ? 'ATTACK_MOVING' : 'IDLE',
                        targetId: undefined,
                        path: hasTargetPos ? findPath(currentUnit.position, currentUnit.targetPosition!, state.terrain, currentUnit.domain) || undefined : undefined
                    };
                } else {
                    const dist = Math.hypot(target.position.x - currentUnit.position.x, target.position.y - currentUnit.position.y);
                    if (dist > (currentUnit.attackRange || 0) && currentUnit.holdPosition) {
                        // Target walked out of range and we must not chase it.
                        currentUnit = { ...currentUnit, status: 'IDLE', targetId: undefined, path: undefined };
                    } else if (dist > (currentUnit.attackRange || 0)) { // Move closer
                        if (!currentUnit.path || currentUnit.path.length < 2) {
                           const newPath = findPath(currentUnit.position, target.position, state.terrain, currentUnit.domain);
                           if (newPath) currentUnit.path = newPath;
                        }
                    } else { // In range, attack
                        currentUnit.path = undefined;
                        currentUnit.facing = turnToward(currentUnit.facing ?? 0, headingTo(currentUnit.position, target.position), TURN_STEP_DEGREES);
                        if (config.attackSpeed && (now - (currentUnit.lastAttackTime || 0) > config.attackSpeed)) {
                            currentUnit.lastAttackTime = now;
                            const damage = currentUnit.damage || 0;
                            
                            newVisualEffects.push({ id: `att_${nextId++}`, type: 'ATTACK_VISUAL', creationTime: now, attackerId: unit.id, targetId: target.id });
                            newVisualEffects.push({ id: `dmg_${nextId++}`, type: 'DAMAGE_TEXT', creationTime: now, text: `${damage}`, position: target.position });
                            newVisualEffects.push({ id: `exp_${nextId++}`, type: 'EXPLOSION', creationTime: now, position: target.position, size: damage > 50 ? 25 : 15 });
                            ctx.emitSound(unitAttackSounds[unit.type] || 'explosion_small', 0.2);

                            if (target.playerId === HUMAN_PLAYER_ID && currentUnit.playerId !== HUMAN_PLAYER_ID && !humanHitAt) {
                                humanHitAt = target.position;
                            }

                            const newHp = target.hp - damage;
                            if (newHp <= 0) {
                                ctx.emitSound(target.maxHp > 300 ? 'explosion_large' : 'explosion_small', 0.4);
                                
                                // --- STATS UPDATE ---
                                const attackerPlayerId = currentUnit.playerId;
                                const targetPlayerId = target.playerId;
                                if (attackerPlayerId in newGameStats && targetPlayerId in newGameStats) {
                                    if ('status' in target) { // It's a unit
                                        newGameStats = withStats(newGameStats, targetPlayerId, s => ({ ...s, unitsLost: s.unitsLost + 1 }));
                                        newGameStats = withStats(newGameStats, attackerPlayerId, s => ({ ...s, enemiesKilled: s.enemiesKilled + 1 }));
                                    } else if ('isPowered' in target) { // It's a building
                                        newGameStats = withStats(newGameStats, attackerPlayerId, s => ({ ...s, enemiesKilled: s.enemiesKilled + 1 })); // Count destroyed buildings as kills
                                    }
                                }
                                // --- END STATS UPDATE ---

                                delete newEntities[target.id]; // Target destroyed
                                const hasTargetPos = !!currentUnit.targetPosition;
                                currentUnit = { 
                                  ...currentUnit, 
                                  status: hasTargetPos ? 'ATTACK_MOVING' : 'IDLE', 
                                  targetId: undefined,
                                  path: hasTargetPos ? findPath(currentUnit.position, currentUnit.targetPosition!, state.terrain, currentUnit.domain) || undefined : undefined
                                };
                            } else {
                                newEntities[target.id] = { ...target, hp: newHp };
                            }
                        }
                    }
                }
            }
        }
        
        // --- MOVEMENT LOGIC (applies to all statuses with a path) ---
        if (currentUnit.path && currentUnit.path.length > 0) {
            const nextPos = currentUnit.path[0];
            const dx = nextPos.x - currentUnit.position.x;
            const dy = nextPos.y - currentUnit.position.y;
            const dist = Math.hypot(dx, dy);
            if (dist < TILE_SIZE / 2) {
                // Copy instead of shift(): the array is shared with the stored entity, and the
                // changed-detection below relies on the stored entity not being mutated in place.
                currentUnit.path = currentUnit.path.slice(1);
                if (currentUnit.path.length === 0) { // Path is complete, determine next state
                    currentUnit.targetPosition = undefined;
                    
                    if (currentUnit.status === 'MOVING_TO_ORE') {
                        currentUnit.status = 'GATHERING';
                    } else if (currentUnit.status === 'MOVING_TO_REPAIR') {
                        currentUnit.status = 'REPAIRING';
                    }
                    else if (currentUnit.status === 'RETURNING_TO_REFINERY') {
                        const player = newPlayers[currentUnit.playerId];
                        const cargo = currentUnit.cargoAmount || 0;
                        newPlayers[currentUnit.playerId] = { ...player, credits: player.credits + cargo };
                        
                        newGameStats = withStats(newGameStats, currentUnit.playerId, s => ({ ...s, creditsEarned: s.creditsEarned + cargo }));
                        
                        currentUnit.cargoAmount = 0;
                        const resourceTarget = newResourcePatches[currentUnit.gatherTargetId!];
                        
                        let pathBackToOre: Position[] | null = null;
                        if (resourceTarget && resourceTarget.amount > 0) {
                            pathBackToOre = findPath(currentUnit.position, resourceTarget.position, state.terrain, currentUnit.domain);
                        }
                        
                        if (pathBackToOre) {
                            currentUnit = { ...currentUnit, status: 'MOVING_TO_ORE', path: pathBackToOre, refineryTargetId: undefined };
                        } else {
                            currentUnit = { ...currentUnit, status: 'IDLE', gatherTargetId: undefined, refineryTargetId: undefined };
                        }
                    } else if (currentUnit.status !== 'ATTACKING') {
                        currentUnit.status = 'IDLE';
                    }
                }
            } else {
                currentUnit.position = { x: currentUnit.position.x + (dx / dist) * 2, y: currentUnit.position.y + (dy / dist) * 2 };
                currentUnit.facing = turnToward(currentUnit.facing ?? 0, headingTo(unit.position, nextPos), TURN_STEP_DEGREES);
            }
        }
        
        // If the unit has changed, update it in the entities map
        if (shallowChanged(unit, currentUnit)) {
            newEntities[unit.id] = currentUnit;
            somethingChanged = true;
        }
    });

    // Throttled "base under attack" alert for the human player.
    let newAlerts = state.alerts;
    let lastAlertTick = state.lastAlertTick;
    const hitAt = humanHitAt as Position | null; // assigned inside the unit loop above
    if (hitAt && tick - state.lastAlertTick >= ALERT_COOLDOWN_TICKS) {
        const alert: GameAlert = { id: nextId++, kind: 'UNDER_ATTACK', position: hitAt, tick };
        newAlerts = [...state.alerts, alert];
        lastAlertTick = tick;
        ctx.emitSound('under_attack');
    }

    if (somethingChanged || newVisualEffects.length > state.visualEffects.length || newAlerts !== state.alerts) {
        return { ...state, entities: newEntities, resourcePatches: newResourcePatches, players: newPlayers, visualEffects: newVisualEffects, gameStats: newGameStats, nextId, alerts: newAlerts, lastAlertTick };
    }
    return state;
}
