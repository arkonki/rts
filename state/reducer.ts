
import { GameState, GameStatus, BuildingType, Building, Unit, UnitType, FogState, AIAction, TerrainType, UnitDomain, Position, VisualEffect, AIConfiguration, PlayerId, PlayerState, SuperweaponState, ResourcePatch, GameEntity } from '../types';
import { ENTITY_CONFIGS, GAME_LOOP_INTERVAL, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, MAP_WIDTH_TILES, MAP_HEIGHT_TILES, DIFFICULTY_SETTINGS, ATTACK_VISUAL_DURATION, EXPLOSION_DURATION, DAMAGE_TEXT_DURATION, STARTING_POSITIONS, CHRONO_VORTEX_DURATION, NUKE_IMPACT_DURATION } from '../constants';
import { generateMap } from '../utils/map';
import { findPath } from '../utils/pathfinding';
import { findNearestEnemy } from '../utils/entity';
import { findBuildPlacement } from '../utils/aiHelpers';
import { soundService, unitAttackSounds, SoundEffect } from '../services/soundService';

export const INITIAL_STATE: GameState = {
  entities: {},
  players: {},
  aiOpponents: [],
  selectedIds: [],
  gameStatus: 'MENU',
  lastMessage: "Welcome to Gemini RTS!",
  viewport: { x: 0, y: 0 },
  terrain: [],
  fogOfWar: [],
  visualEffects: [],
  isChronoTeleportPending: false,
  resourcePatches: {},
};

// --- Game Tick Helper Functions ---

type SoundDispatcher = (sound: SoundEffect, volume?: number) => void;

function updateBuildingConstruction(state: GameState, now: number, dispatchSound: SoundDispatcher): GameState {
    const updatedEntities = { ...state.entities };
    let entitiesChanged = false;

    Object.values(state.entities).forEach(entity => {
        if ('isConstructing' in entity && entity.isConstructing) {
            const building = entity as Building;
            const config = ENTITY_CONFIGS[building.type];
            const hpPerTick = config.hp / (config.buildTime / GAME_LOOP_INTERVAL);
            const newHp = Math.min(config.hp, building.hp + hpPerTick);

            if (newHp >= config.hp) {
                updatedEntities[building.id] = { ...building, hp: newHp, isConstructing: false, isPowered: true };
                if (building.playerId === 'PLAYER_1') {
                    dispatchSound('construction_complete');
                }
                // Spawn a free miner when a refinery is completed
                if (building.type === BuildingType.REFINERY) {
                    const minerConfig = ENTITY_CONFIGS[UnitType.CHRONO_MINER];
                    const spawnPos = { x: building.position.x, y: building.position.y + building.size / 2 + 20 };
                    const newId = `${building.playerId}_${UnitType.CHRONO_MINER.toLowerCase()}_${Date.now()}`;
                    updatedEntities[newId] = {
                        id: newId, playerId: building.playerId, type: UnitType.CHRONO_MINER,
                        hp: minerConfig.hp, maxHp: minerConfig.hp, position: spawnPos,
                        size: minerConfig.size, domain: minerConfig.domain!, status: 'IDLE', cargoAmount: 0,
                    };
                }
            } else {
                updatedEntities[building.id] = { ...building, hp: newHp };
            }
            entitiesChanged = true;
        }
    });

    return entitiesChanged ? { ...state, entities: updatedEntities } : state;
}

function updateBuildingProduction(state: GameState, now: number, dispatchSound: SoundDispatcher): GameState {
    const updatedEntities = { ...state.entities };
    let entitiesChanged = false;

    Object.values(state.entities).forEach(entity => {
        if ('productionQueue' in entity && entity.productionQueue.length > 0 && entity.isPowered) {
            const building = entity as Building;
            const newProgress = building.productionProgress + GAME_LOOP_INTERVAL;
            const itemType = building.productionQueue[0] as UnitType;
            const config = ENTITY_CONFIGS[itemType];

            if (newProgress >= config.buildTime) {
                if (building.playerId === 'PLAYER_1') dispatchSound('unit_ready');

                let spawnPos = { x: building.position.x, y: building.position.y + building.size / 2 + 15 };
                if (building.type === BuildingType.NAVAL_YARD) {
                    // Find a valid coastal spawn point
                    let foundSpawn = false;
                      for(let dy = -3; dy <= 3; dy++) {
                          for(let dx = -3; dx <= 3; dx++) {
                              if(dx === 0 && dy === 0) continue;
                              const checkX = Math.floor(building.position.x / TILE_SIZE) + dx;
                              const checkY = Math.floor(building.position.y / TILE_SIZE) + dy;
                              const terrainType = state.terrain[checkY]?.[checkX];
                              if (terrainType === TerrainType.SHALLOW_WATER || terrainType === TerrainType.DEEP_WATER) {
                                  spawnPos.x = checkX * TILE_SIZE + TILE_SIZE / 2;
                                  spawnPos.y = checkY * TILE_SIZE + TILE_SIZE / 2;
                                  foundSpawn = true; break;
                              }
                          }
                          if(foundSpawn) break;
                      }
                }
                const newId = `${building.playerId}_${itemType.toLowerCase()}_${Date.now()}`;
                const rallyPath = building.rallyPoint ? findPath(spawnPos, building.rallyPoint, state.terrain, config.domain!) : null;
                
                updatedEntities[newId] = {
                    id: newId, playerId: building.playerId, type: itemType, hp: config.hp, maxHp: config.hp, position: spawnPos, size: config.size, 
                    domain: config.domain!, status: rallyPath ? 'ATTACK_MOVING' : 'IDLE',
                    path: rallyPath || undefined, targetPosition: building.rallyPoint,
                    damage: config.damage, attackRange: config.attackRange, lastAttackTime: 0,
                    cargoAmount: 0,
                };
                
                updatedEntities[building.id] = { ...building, productionProgress: 0, productionQueue: building.productionQueue.slice(1) };
                entitiesChanged = true;
            } else {
                updatedEntities[building.id] = { ...building, productionProgress: newProgress };
                entitiesChanged = true;
            }
        }
    });

    return entitiesChanged ? { ...state, entities: updatedEntities } : state;
}

function updateUnits(state: GameState, now: number, dispatchSound: SoundDispatcher): GameState {
    let newEntities = { ...state.entities };
    let newResourcePatches = { ...state.resourcePatches };
    let newPlayers = { ...state.players };
    let newVisualEffects = [...state.visualEffects];
    let somethingChanged = false;

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
        } else { // --- COMBAT LOGIC for non-miners ---
            if (unit.status === 'IDLE' || unit.status === 'ATTACK_MOVING') {
                const enemy = findNearestEnemy(unit, newEntities, state.fogOfWar);
                if (enemy) {
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
                    if (dist > (currentUnit.attackRange || 0)) { // Move closer
                        if (!currentUnit.path || currentUnit.path.length < 2) {
                           const newPath = findPath(currentUnit.position, target.position, state.terrain, currentUnit.domain);
                           if (newPath) currentUnit.path = newPath;
                        }
                    } else { // In range, attack
                        currentUnit.path = undefined;
                        if (config.attackSpeed && (now - (currentUnit.lastAttackTime || 0) > config.attackSpeed)) {
                            currentUnit.lastAttackTime = now;
                            const damage = currentUnit.damage || 0;
                            
                            newVisualEffects.push({ id: `att_${now}_${unit.id}`, type: 'ATTACK_VISUAL', creationTime: now, attackerId: unit.id, targetId: target.id });
                            newVisualEffects.push({ id: `dmg_${now}_${target.id}`, type: 'DAMAGE_TEXT', creationTime: now, text: `${damage}`, position: target.position });
                            newVisualEffects.push({ id: `exp_${now}_${target.id}`, type: 'EXPLOSION', creationTime: now, position: target.position, size: damage > 50 ? 25 : 15 });
                            dispatchSound(unitAttackSounds[unit.type] || 'explosion_small', 0.2);

                            const newHp = target.hp - damage;
                            if (newHp <= 0) {
                                dispatchSound(target.maxHp > 300 ? 'explosion_large' : 'explosion_small', 0.4);
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
                currentUnit.path.shift();
                if (currentUnit.path.length === 0) { // Path is complete, determine next state
                    currentUnit.targetPosition = undefined;
                    
                    if (currentUnit.status === 'MOVING_TO_ORE') {
                        currentUnit.status = 'GATHERING';
                    } else if (currentUnit.status === 'RETURNING_TO_REFINERY') {
                        const player = newPlayers[currentUnit.playerId];
                        newPlayers[currentUnit.playerId] = { ...player, credits: player.credits + (currentUnit.cargoAmount || 0) };
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
            }
        }
        
        // If the unit has changed, update it in the entities map
        if (JSON.stringify(unit) !== JSON.stringify(currentUnit)) {
            newEntities[unit.id] = currentUnit;
            somethingChanged = true;
        }
    });

    if (somethingChanged || newVisualEffects.length > state.visualEffects.length) {
        return { ...state, entities: newEntities, resourcePatches: newResourcePatches, players: newPlayers, visualEffects: newVisualEffects };
    }
    return state;
}

function updatePlayerPowerAndSuperweapons(state: GameState, now: number, dispatchSound: SoundDispatcher): GameState {
    const newPlayers = { ...state.players };
    let playersChanged = false;

    Object.keys(newPlayers).forEach(playerId => {
        let power = { produced: 0, consumed: 0 };
        let superweaponBuilding: Building | null = null;
        let superweaponType: BuildingType.CHRONO_SPHERE | BuildingType.NUCLEAR_MISSILE_SILO | null = null;

        Object.values(state.entities).forEach(entity => {
            if (entity.playerId === playerId && 'isPowered' in entity) {
                const building = entity as Building;
                const config = ENTITY_CONFIGS[building.type];
                if (!building.isConstructing) {
                    power.produced += config.powerProduced || 0;
                    power.consumed += config.powerConsumed || 0;
                }
                if (config.superweaponCooldown && (building.type === BuildingType.CHRONO_SPHERE || building.type === BuildingType.NUCLEAR_MISSILE_SILO)) {
                    superweaponBuilding = building;
                    superweaponType = building.type;
                }
            }
        });

        const player = newPlayers[playerId];
        let newPlayer = { ...player, power };

        // Superweapon state logic
        const currentSuperweapon = player.superweapon;
        if (superweaponBuilding && !currentSuperweapon && !superweaponBuilding.isConstructing) {
            const config = ENTITY_CONFIGS[superweaponType!];
            newPlayer.superweapon = {
                type: superweaponType!, isReady: false, cooldown: config.superweaponCooldown!,
            };
            if(playerId === 'PLAYER_1') dispatchSound('superweapon_ready');
        } else if (currentSuperweapon && !currentSuperweapon.isReady) {
            const newCooldown = currentSuperweapon.cooldown - GAME_LOOP_INTERVAL;
            if (newCooldown <= 0) {
                newPlayer.superweapon = { ...currentSuperweapon, isReady: true, cooldown: 0 };
                 if(playerId === 'PLAYER_1') dispatchSound('superweapon_ready');
            } else {
                newPlayer.superweapon = { ...currentSuperweapon, cooldown: newCooldown };
            }
        } else if (!superweaponBuilding && currentSuperweapon) {
            newPlayer.superweapon = null; // It was destroyed
        }
        
        if (JSON.stringify(newPlayer) !== JSON.stringify(player)) {
            newPlayers[playerId] = newPlayer;
            playersChanged = true;
        }
    });

    return playersChanged ? { ...state, players: newPlayers } : state;
}

function updateFogOfWar(state: GameState): GameState {
    const newFogOfWar: FogState[][] = state.fogOfWar.map(row => row.map(cell => cell === FogState.VISIBLE ? FogState.EXPLORED : cell));
    let fogChanged = false;
    const playerEntities = Object.values(state.entities).filter(e => e.playerId === 'PLAYER_1');
    
    playerEntities.forEach(entity => {
        const config = ENTITY_CONFIGS[entity.type];
        if (!config.visionRange) return;
        const centerTileX = Math.floor(entity.position.x / TILE_SIZE);
        const centerTileY = Math.floor(entity.position.y / TILE_SIZE);
        for (let y = centerTileY - config.visionRange; y <= centerTileY + config.visionRange; y++) {
            for (let x = centerTileX - config.visionRange; x <= centerTileX + config.visionRange; x++) {
                if (x >= 0 && x < MAP_WIDTH_TILES && y >= 0 && y < MAP_HEIGHT_TILES) {
                    if (Math.hypot(x - centerTileX, y - centerTileY) <= config.visionRange) {
                        if (newFogOfWar[y][x] !== FogState.VISIBLE) {
                            newFogOfWar[y][x] = FogState.VISIBLE;
                            fogChanged = true;
                        }
                    }
                }
            }
        }
    });
    return fogChanged ? { ...state, fogOfWar: newFogOfWar } : state;
}

function updateVisualEffects(effects: VisualEffect[], now: number): VisualEffect[] {
    return effects.filter(effect => {
        let duration = 0;
        switch(effect.type) {
            case 'ATTACK_VISUAL': duration = ATTACK_VISUAL_DURATION; break;
            case 'EXPLOSION': duration = EXPLOSION_DURATION; break;
            case 'DAMAGE_TEXT': duration = DAMAGE_TEXT_DURATION; break;
            case 'CHRONO_VORTEX': duration = CHRONO_VORTEX_DURATION; break;
            case 'NUKE_IMPACT': duration = NUKE_IMPACT_DURATION; break;
        }
        return now - effect.creationTime < duration;
    });
}

function checkWinLossConditions(state: GameState): GameStatus {
    const humanPlayerId = 'PLAYER_1';
    const humanHQ = state.entities[state.players[humanPlayerId]?.hqId];
    if (!humanHQ) return 'AI_WIN';

    const activeOpponents = state.aiOpponents.filter(opp => state.entities[state.players[opp.id]?.hqId]);
    if (activeOpponents.length === 0 && state.aiOpponents.length > 0) {
        return 'PLAYER_WIN';
    }
    
    return state.gameStatus;
}

function updateAICooldowns(players: Record<PlayerId, PlayerState>): Record<PlayerId, PlayerState> {
    const newPlayers = { ...players };
    Object.keys(newPlayers).forEach(playerId => {
        if (playerId !== 'PLAYER_1') {
            const player = newPlayers[playerId];
            newPlayers[playerId] = { ...player, aiActionCooldown: player.aiActionCooldown - GAME_LOOP_INTERVAL };
        }
    });
    return newPlayers;
}


// --- Main Reducer ---

export function gameReducer(state: GameState, action: any): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const { opponents } = action.payload as { opponents: AIConfiguration[] };
      const humanPlayerId: PlayerId = 'PLAYER_1';
      
      const allPlayerIds = [humanPlayerId, ...opponents.map(o => o.id)];
      const playerCount = allPlayerIds.length;
      
      const startingPositions = STARTING_POSITIONS[playerCount] || STARTING_POSITIONS[2];
      const { terrain, resourcePatches } = generateMap(startingPositions);
      const fogOfWar = Array(MAP_HEIGHT_TILES).fill(0).map(() => Array(MAP_WIDTH_TILES).fill(FogState.UNEXPLORED));

      const newPlayers: Record<PlayerId, PlayerState> = {};
      const newEntities: GameState['entities'] = {};

      const hqConfig = ENTITY_CONFIGS[BuildingType.HQ];
      
      allPlayerIds.forEach((id, index) => {
        const difficulty = opponents.find(o => o.id === id)?.difficulty || 'NORMAL';
        const difficultySettings = DIFFICULTY_SETTINGS[difficulty];
        const hqId = `${id}_hq`;
        const startPos = startingPositions[index];

        newPlayers[id] = {
            id,
            credits: difficultySettings.startingCredits,
            power: { produced: 0, consumed: 0 },
            aiActionCooldown: difficultySettings.decisionInterval,
            hqId: hqId,
            superweapon: null,
        };

        newEntities[hqId] = {
            id: hqId,
            type: BuildingType.HQ,
            playerId: id,
            hp: hqConfig.hp,
            maxHp: hqConfig.hp,
            position: startPos,
            size: hqConfig.size,
            isPowered: true,
            productionQueue: [],
            productionProgress: 0,
        };
      });
      
      const initialViewport = { x: startingPositions[0].x - 400, y: startingPositions[0].y - 400 };
      
      let startingState: GameState = { 
          ...INITIAL_STATE,
          players: newPlayers,
          aiOpponents: opponents,
          entities: newEntities, 
          gameStatus: 'PLAYING', 
          viewport: initialViewport,
          terrain,
          fogOfWar,
          resourcePatches,
      };
      // Pre-tick to set initial power and fog
      startingState = updatePlayerPowerAndSuperweapons(startingState, 0, () => {});
      startingState = updateFogOfWar(startingState);
      return startingState;
    }
    case 'RESTART_GAME':
        return gameReducer(state, { type: 'START_GAME', payload: { opponents: state.aiOpponents } });
    case 'MAIN_MENU':
        return { ...INITIAL_STATE, terrain: state.terrain }; // Keep terrain to avoid re-generating
    case 'PAUSE_GAME':
        return { ...state, gameStatus: 'PAUSED' };
    case 'RESUME_GAME':
        return { ...state, gameStatus: 'PLAYING' };
    case 'SELECT':
      return { ...state, selectedIds: action.payload, isChronoTeleportPending: false };
    
    case 'UPDATE_VIEWPORT':
      return { ...state, viewport: action.payload };
    
    case 'SET_RALLY_POINT': {
        const { buildingId, position } = action.payload;
        const building = state.entities[buildingId] as Building;
        if (!building) return state;
        const newBuilding = { ...building, rallyPoint: position };
        return { ...state, entities: { ...state.entities, [buildingId]: newBuilding }};
    }

    case 'COMMAND_GATHER': {
        const { unitId, resourceId } = action.payload;
        const unit = state.entities[unitId] as Unit;
        const resource = state.resourcePatches[resourceId];
        if (!unit || !resource || unit.type !== UnitType.CHRONO_MINER) return state;

        const path = findPath(unit.position, resource.position, state.terrain, unit.domain);
        if (path) {
            const newUnit = { 
                ...unit, 
                status: 'MOVING_TO_ORE', 
                gatherTargetId: resourceId, 
                refineryTargetId: undefined,
                path,
                targetId: undefined,
                targetPosition: resource.position,
            } as Unit;
            return { ...state, entities: { ...state.entities, [unitId]: newUnit } };
        }
        return state;
    }

    case 'COMMAND_MOVE':
    case 'COMMAND_ATTACK_MOVE': {
        const newState = { ...state, entities: { ...state.entities } };
        state.selectedIds.forEach(id => {
            const entity = newState.entities[id];
            if (entity && 'status' in entity) {
                const unit = { ...entity } as Unit;
                if (unit.type === UnitType.CHRONO_MINER) return; // Miners can't attack-move
                const path = findPath(unit.position, action.payload, state.terrain, unit.domain);
                if (path) {
                    unit.path = path;
                    unit.status = action.type === 'COMMAND_MOVE' ? 'MOVING' : 'ATTACK_MOVING';
                    unit.targetPosition = action.payload; // Store final destination
                    unit.targetId = undefined;
                    newState.entities[id] = unit;
                }
            }
        });
        return newState;
    }

    case 'COMMAND_ATTACK': {
        const newState = { ...state, entities: { ...state.entities } };
        const targetEntity = state.entities[action.payload];
        if (!targetEntity) return state;

        state.selectedIds.forEach(id => {
            const entity = newState.entities[id];
            if (entity && 'status' in entity) {
                const unit = { ...entity } as Unit;
                if (unit.type === UnitType.CHRONO_MINER) return;
                unit.status = 'ATTACKING';
                unit.targetId = action.payload;
                unit.targetPosition = undefined;
                unit.path = undefined; // Clear path when given direct attack order
                newState.entities[id] = unit;
            }
        });
        return newState;
    }

    case 'QUEUE_PRODUCTION': {
        const { buildingId, itemType } = action.payload;
        const producer = state.entities[buildingId] as Building;
        if (!producer || !producer.isPowered) return state;

        const playerState = state.players[producer.playerId];
        const config = ENTITY_CONFIGS[itemType as UnitType | BuildingType];

        const requirements = Array.isArray(config.requires) ? config.requires : (config.requires ? [config.requires] : []);
        const requirementsMet = requirements.every(req => 
          Object.values(state.entities).some(e => e.playerId === playerState.id && e.type === req && !('isConstructing' in e && e.isConstructing))
        );

        if (playerState.credits < config.cost || !requirementsMet) {
            if (producer.playerId === 'PLAYER_1') {
                soundService.play('insufficient_funds');
            }
            return state;
        }
        
        const newPlayerState = { ...playerState, credits: playerState.credits - config.cost };
        const newProducer = { ...producer, productionQueue: [...producer.productionQueue, itemType] };
        
        return {
            ...state,
            players: { ...state.players, [producer.playerId]: newPlayerState },
            entities: { ...state.entities, [buildingId]: newProducer },
        };
    }

    case 'PLACE_BUILDING': {
        const { buildingType, position } = action.payload;
        const config = ENTITY_CONFIGS[buildingType];
        const humanPlayerId = 'PLAYER_1';
        const humanPlayerState = state.players[humanPlayerId];

        if (humanPlayerState.credits < config.cost) {
            soundService.play('insufficient_funds');
            return { ...state, lastMessage: `Not enough credits for a ${config.name}.` };
        }

        const tileX = Math.floor(position.x / TILE_SIZE);
        const tileY = Math.floor(position.y / TILE_SIZE);
        
        if (config.placementRule === 'COASTAL') {
            let isCoastal = false;
            if(state.terrain[tileY]?.[tileX] === TerrainType.GROUND) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const neighborTerrain = state.terrain[tileY + dy]?.[tileX + dx];
                        if (neighborTerrain === TerrainType.SHALLOW_WATER || neighborTerrain === TerrainType.DEEP_WATER) {
                            isCoastal = true; break;
                        }
                    }
                    if(isCoastal) break;
                }
            }
            if (!isCoastal) {
                soundService.play('insufficient_funds');
                return { ...state, lastMessage: `${config.name} must be built on a coastline.` };
            }
        } else {
            if (state.terrain[tileY]?.[tileX] !== TerrainType.GROUND) {
                soundService.play('insufficient_funds');
                return { ...state, lastMessage: "Cannot build on this terrain." };
            }
        }

        const isOccupied = Object.values(state.entities).some(e => {
            const dx = e.position.x - position.x;
            const dy = e.position.y - position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < (e.size / 2 + config.size / 2);
        });
        if (isOccupied) {
            soundService.play('insufficient_funds');
            return { ...state, lastMessage: "Cannot place building here: location is obstructed." };
        }
        
        soundService.play('place_building');
        const newPlayerState = { ...humanPlayerState, credits: humanPlayerState.credits - config.cost };
        const newId = `player_1_${buildingType.toLowerCase()}_${Date.now()}`;
        const newBuilding: Building = {
            id: newId, type: buildingType, playerId: humanPlayerId, hp: 1, maxHp: config.hp, position,
            size: config.size, isPowered: false, productionQueue: [], productionProgress: 0, isConstructing: true,
        };
        return { ...state, players: {...state.players, [humanPlayerId]: newPlayerState }, entities: { ...state.entities, [newId]: newBuilding }, lastMessage: `Constructing ${config.name}...` };
    }
    
    case 'ACTIVATE_CHRONO_TELEPORT':
        return { ...state, isChronoTeleportPending: true, lastMessage: "Chrono Sphere ready. Select units and target location." };
    
    case 'CHRONO_TELEPORT_UNITS': {
        const { unitIds, targetPosition } = action.payload;
        const humanPlayerId = 'PLAYER_1';
        const playerState = state.players[humanPlayerId];
        
        if(!playerState.superweapon || playerState.superweapon.type !== BuildingType.CHRONO_SPHERE || !playerState.superweapon.isReady) {
            return state;
        }
        
        soundService.play('chrono_teleport');

        const newEntities = { ...state.entities };
        const newVisualEffects = [...state.visualEffects];
        
        let avgPosition = { x: 0, y: 0 };
        let count = 0;
        
        unitIds.forEach((id: string) => {
           const unit = newEntities[id] as Unit;
           if (unit) {
               avgPosition.x += unit.position.x;
               avgPosition.y += unit.position.y;
               count++;
               newEntities[id] = { ...unit, position: targetPosition };
           }
        });
        
        if(count > 0) {
            avgPosition.x /= count;
            avgPosition.y /= count;
            newVisualEffects.push({ id: `chrono_${Date.now()}_start_pos`, type: 'CHRONO_VORTEX', creationTime: Date.now(), position: avgPosition, size: 100 });
        }
        newVisualEffects.push({ id: `chrono_${Date.now()}_end`, type: 'CHRONO_VORTEX', creationTime: Date.now(), position: targetPosition, size: 100 });
        
        const newSuperweaponState: SuperweaponState = { ...playerState.superweapon, isReady: false, cooldown: ENTITY_CONFIGS[BuildingType.CHRONO_SPHERE].superweaponCooldown! };
        const newPlayerState = { ...playerState, superweapon: newSuperweaponState };
        
        return { ...state, entities: newEntities, players: { ...state.players, [humanPlayerId]: newPlayerState }, visualEffects: newVisualEffects, isChronoTeleportPending: false, lastMessage: 'Chronoshift complete.' };
    }

    case 'LAUNCH_NUKE': {
        const { playerId, targetPosition } = action.payload;
        const playerState = state.players[playerId];

        if(!playerState.superweapon || playerState.superweapon.type !== BuildingType.NUCLEAR_MISSILE_SILO || !playerState.superweapon.isReady) {
            return state;
        }

        soundService.play('nuke_launch');
        
        const newEntities = { ...state.entities };
        const newVisualEffects = [...state.visualEffects];
        newVisualEffects.push({ id: `nuke_${Date.now()}`, type: 'NUKE_IMPACT', creationTime: Date.now(), position: targetPosition });

        const NUKE_RADIUS = TILE_SIZE * 5;
        const NUKE_DAMAGE = 1000;

        Object.values(newEntities).forEach(entity => {
            const dist = Math.hypot(entity.position.x - targetPosition.x, entity.position.y - targetPosition.y);
            if (dist < NUKE_RADIUS) {
                const damage = NUKE_DAMAGE * (1 - (dist / NUKE_RADIUS));
                const newHp = entity.hp - damage;
                 if (newHp <= 0) {
                    delete newEntities[entity.id];
                } else {
                    newEntities[entity.id] = {...entity, hp: newHp};
                }
            }
        });

        const newSuperweaponState: SuperweaponState = { ...playerState.superweapon, isReady: false, cooldown: ENTITY_CONFIGS[BuildingType.NUCLEAR_MISSILE_SILO].superweaponCooldown! };
        const newPlayerState = { ...playerState, superweapon: newSuperweaponState };
        
        return { 
            ...state, 
            entities: newEntities,
            visualEffects: newVisualEffects,
            players: { ...state.players, [playerId]: newPlayerState },
            lastMessage: "NUCLEAR LAUNCH DETECTED!",
        };
    }

    case 'GAME_TICK': {
      if (state.gameStatus !== 'PLAYING') return state;
      const now = Date.now();
      
      const soundsToPlay: { sound: SoundEffect; volume?: number }[] = [];
      const dispatchSound = (sound: SoundEffect, volume?: number) => soundsToPlay.push({ sound, volume });
      
      let nextState = state;
      nextState = updateBuildingConstruction(nextState, now, dispatchSound);
      nextState = updateBuildingProduction(nextState, now, dispatchSound);
      nextState = updateUnits(nextState, now, dispatchSound);
      nextState = updatePlayerPowerAndSuperweapons(nextState, now, dispatchSound);
      nextState = updateFogOfWar(nextState);

      const finalState = {
          ...nextState,
          visualEffects: updateVisualEffects(nextState.visualEffects, now),
          players: updateAICooldowns(nextState.players),
          gameStatus: checkWinLossConditions(nextState),
      };

      soundsToPlay.forEach(({ sound, volume }) => soundService.play(sound, volume));

      return finalState;
    }

    case 'PERFORM_AI_ACTION': {
        const aiActionPayload = action.payload as AIAction;
        const { playerId, action: aiActionType, thought } = aiActionPayload;
        let newState = { ...state };
        let message = `${playerId}: ${thought || 'Taking action...'}`;
        
        const aiPlayerState = newState.players[playerId];
        const aiConfig = newState.aiOpponents.find(o => o.id === playerId);
        if(!aiPlayerState || !aiConfig) return state;

        switch(aiActionType) {
            case 'BUILD': {
                 const { buildingType } = aiActionPayload;
                 if(buildingType) {
                    const config = ENTITY_CONFIGS[buildingType];
                    const hq = newState.entities[aiPlayerState.hqId];
                    if (hq && aiPlayerState.credits >= config.cost) {
                        const placementPosition = findBuildPlacement(buildingType, Object.values(newState.entities).filter(e => e.playerId === playerId), hq.position, newState.terrain);
                        
                        if(placementPosition) {
                            const newAiPlayerState = { ...aiPlayerState, credits: aiPlayerState.credits - config.cost };
                            const newId = `${playerId}_${buildingType.toLowerCase()}_${Date.now()}`;
                            const newBuilding: Building = {
                                id: newId, type: buildingType, playerId: playerId, hp: 1, maxHp: config.hp,
                                position: placementPosition, size: config.size, isPowered: false, 
                                productionQueue: [], productionProgress: 0, isConstructing: true,
                            };
                            newState.entities = { ...newState.entities, [newId]: newBuilding };
                            newState.players[playerId] = newAiPlayerState;
                        } else {
                            message = thought + ` (Failed to find a spot!)`;
                        }
                    }
                 }
                break;
            }
            case 'TRAIN': {
                const { unitType } = aiActionPayload;
                if(unitType) {
                    const config = ENTITY_CONFIGS[unitType];
                    const producerType = config.producedBy;
                    
                    if (producerType) {
                         const producer = Object.values(newState.entities).find(e => e.playerId === playerId && e.type === producerType && 'isPowered' in e && (e as Building).isPowered) as Building;

                        if(producer && aiPlayerState.credits >= config.cost && producer.productionQueue.length < 5) {
                            const newAiPlayerState = { ...aiPlayerState, credits: aiPlayerState.credits - config.cost };
                            const newProducer = { ...producer, productionQueue: [...producer.productionQueue, unitType] };
                            newState.entities[producer.id] = newProducer;
                            newState.players[playerId] = newAiPlayerState;
                        }
                    }
                }
                break;
            }
            case 'ATTACK': {
                const { attackTargetId, unitIds } = aiActionPayload;
                if(attackTargetId && newState.entities[attackTargetId]) {
                    const attackers = (unitIds && unitIds.length > 0 ? unitIds.map(id => newState.entities[id]).filter(Boolean) : Object.values(newState.entities).filter(e => e.playerId === playerId && 'status' in e && e.type !== UnitType.CHRONO_MINER)) as Unit[];
                    if (attackers.length > 0) {
                        const newEntities = { ...newState.entities };
                        attackers.forEach(entity => {
                           const unit = newEntities[entity.id];
                           if(unit && 'status' in unit) {
                             const newUnit = {...unit, status: 'ATTACKING', targetId: attackTargetId, targetPosition: undefined, path: undefined} as Unit;
                             newEntities[unit.id] = newUnit;
                           }
                        });
                         newState.entities = newEntities;
                    }
                }
                break;
            }
            case 'GATHER': {
                const { unitIds, gatherTargetId } = aiActionPayload;
                if (unitIds && unitIds.length > 0 && gatherTargetId) {
                    const minerId = unitIds[0];
                    const miner = newState.entities[minerId];
                    const resource = newState.resourcePatches[gatherTargetId];
                    if (miner && resource && 'status' in miner && miner.type === UnitType.CHRONO_MINER) {
                        newState = gameReducer(newState, { type: 'COMMAND_GATHER', payload: { unitId: miner.id, resourceId: resource.id }});
                    }
                }
                break;
            }
            case 'LAUNCH_SUPERWEAPON': {
                const { targetPosition } = aiActionPayload;
                if (targetPosition) {
                    newState = gameReducer(newState, { type: 'LAUNCH_NUKE', payload: { playerId, targetPosition }});
                }
                break;
            }
            case 'IDLE':
                break;
        }

        let newCooldown = DIFFICULTY_SETTINGS[aiConfig.difficulty].decisionInterval;
        // If the API returned a rate limit error, double the cooldown to back off.
        if (aiActionPayload.error === 'RATE_LIMIT') {
            newCooldown *= 2;
            message = `${playerId}: Command servers overloaded. Backing off...`;
        }
        const newPlayerState = { ...newState.players[playerId], aiActionCooldown: newCooldown };
        
        return { ...newState, players: {...newState.players, [playerId]: newPlayerState }, lastMessage: message };
    }
    case '@@INIT_TERRAIN':
        return { ...state, terrain: action.payload };
    default:
      return state;
  }
}