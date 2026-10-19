import { Building, BuildingType, GameState } from '../../types';
import { ENTITY_CONFIGS, GAME_LOOP_INTERVAL, HUMAN_PLAYER_ID } from '../../constants';
import { TickContext, shallowChanged } from '../helpers';

export function updatePlayerPowerAndSuperweapons(state: GameState, ctx: TickContext): GameState {
    const newPlayers = { ...state.players };
    let newEntities = state.entities;
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
        // Keep the existing power object when the totals are unchanged so shallowChanged() below stays false.
        const powerUnchanged = power.produced === player.power.produced && power.consumed === player.power.consumed;
        let newPlayer = { ...player, power: powerUnchanged ? player.power : power };

        // Low power shuts down every finished building that draws power. The HQ and
        // buildings that draw none (Power Plants) always stay online so a player can recover.
        const lowPower = power.consumed > power.produced;
        Object.values(state.entities).forEach(entity => {
            if (entity.playerId !== playerId || !('isPowered' in entity)) return;
            const building = entity as Building;
            if (building.isConstructing) return;
            const drawsPower = (ENTITY_CONFIGS[building.type].powerConsumed || 0) > 0;
            const shouldBePowered = !lowPower || building.type === BuildingType.HQ || !drawsPower;
            if (building.isPowered !== shouldBePowered) {
                if (newEntities === state.entities) newEntities = { ...state.entities };
                newEntities[building.id] = { ...building, isPowered: shouldBePowered };
            }
        });

        // Superweapon state logic
        const currentSuperweapon = player.superweapon;
        if (superweaponBuilding && !currentSuperweapon && !superweaponBuilding.isConstructing) {
            const config = ENTITY_CONFIGS[superweaponType!];
            newPlayer.superweapon = {
                type: superweaponType!, isReady: false, cooldown: config.superweaponCooldown!,
            };
            if (playerId === HUMAN_PLAYER_ID) ctx.emitSound('superweapon_ready');
        } else if (currentSuperweapon && !currentSuperweapon.isReady) {
            const newCooldown = currentSuperweapon.cooldown - GAME_LOOP_INTERVAL;
            if (newCooldown <= 0) {
                newPlayer.superweapon = { ...currentSuperweapon, isReady: true, cooldown: 0 };
                if (playerId === HUMAN_PLAYER_ID) ctx.emitSound('superweapon_ready');
            } else {
                newPlayer.superweapon = { ...currentSuperweapon, cooldown: newCooldown };
            }
        } else if (!superweaponBuilding && currentSuperweapon) {
            newPlayer.superweapon = null; // It was destroyed
        }
        
        if (shallowChanged(newPlayer, player)) {
            newPlayers[playerId] = newPlayer;
            playersChanged = true;
        }
    });

    if (!playersChanged && newEntities === state.entities) return state;
    return { ...state, players: newPlayers, entities: newEntities };
}
