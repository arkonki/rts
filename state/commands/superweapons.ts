import { BuildingType, GameState, Position, SuperweaponState, Unit, VisualEffect } from '../../types';
import { ENTITY_CONFIGS, HUMAN_PLAYER_ID, TILE_SIZE } from '../../constants';
import { gameTime, withSound } from '../helpers';

export function activateChronoTeleport(state: GameState): GameState {
    return { ...state, isChronoTeleportPending: true, lastMessage: "Chrono Sphere ready. Select units and target location." };
}

export function chronoTeleportUnits(state: GameState, unitIds: string[], targetPosition: Position): GameState {
    const playerState = state.players[HUMAN_PLAYER_ID];

    if (!playerState.superweapon || playerState.superweapon.type !== BuildingType.CHRONO_SPHERE || !playerState.superweapon.isReady) {
        return state;
    }

    const now = gameTime(state);
    let nextId = state.nextId;
    const newEntities = { ...state.entities };
    const newVisualEffects: VisualEffect[] = [...state.visualEffects];

    let avgPosition = { x: 0, y: 0 };
    let count = 0;

    unitIds.forEach(id => {
        const unit = newEntities[id] as Unit;
        if (unit) {
            avgPosition.x += unit.position.x;
            avgPosition.y += unit.position.y;
            count++;
            newEntities[id] = { ...unit, position: targetPosition };
        }
    });

    if (count > 0) {
        avgPosition.x /= count;
        avgPosition.y /= count;
        newVisualEffects.push({ id: `chrono_${nextId++}_start`, type: 'CHRONO_VORTEX', creationTime: now, position: avgPosition, size: 100 });
    }
    newVisualEffects.push({ id: `chrono_${nextId++}_end`, type: 'CHRONO_VORTEX', creationTime: now, position: targetPosition, size: 100 });

    const newSuperweaponState: SuperweaponState = { ...playerState.superweapon, isReady: false, cooldown: ENTITY_CONFIGS[BuildingType.CHRONO_SPHERE].superweaponCooldown! };
    const newPlayerState = { ...playerState, superweapon: newSuperweaponState };

    return withSound({
        ...state,
        entities: newEntities,
        players: { ...state.players, [HUMAN_PLAYER_ID]: newPlayerState },
        visualEffects: newVisualEffects,
        nextId,
        isChronoTeleportPending: false,
        lastMessage: 'Chronoshift complete.',
    }, 'chrono_teleport');
}

/** targetPosition is in TILE coordinates (the AI works in tiles). */
export function launchNuke(state: GameState, playerId: string, targetPosition: Position): GameState {
    const playerState = state.players[playerId];

    if (!playerState || !playerState.superweapon || playerState.superweapon.type !== BuildingType.NUCLEAR_MISSILE_SILO || !playerState.superweapon.isReady) {
        return state;
    }

    // Convert tile position to pixel position for effect
    const pixelPosition = {
        x: targetPosition.x * TILE_SIZE + TILE_SIZE / 2,
        y: targetPosition.y * TILE_SIZE + TILE_SIZE / 2,
    };

    const newEntities = { ...state.entities };
    const newVisualEffects: VisualEffect[] = [...state.visualEffects];
    newVisualEffects.push({ id: `nuke_${state.nextId}`, type: 'NUKE_IMPACT', creationTime: gameTime(state), position: pixelPosition });

    const NUKE_RADIUS = TILE_SIZE * 5;
    const NUKE_DAMAGE = 1000;

    Object.values(newEntities).forEach(entity => {
        const dist = Math.hypot(entity.position.x - pixelPosition.x, entity.position.y - pixelPosition.y);
        if (dist < NUKE_RADIUS) {
            const damage = NUKE_DAMAGE * (1 - (dist / NUKE_RADIUS));
            const newHp = entity.hp - damage;
            if (newHp <= 0) {
                delete newEntities[entity.id];
            } else {
                newEntities[entity.id] = { ...entity, hp: newHp };
            }
        }
    });

    const newSuperweaponState: SuperweaponState = { ...playerState.superweapon, isReady: false, cooldown: ENTITY_CONFIGS[BuildingType.NUCLEAR_MISSILE_SILO].superweaponCooldown! };
    const newPlayerState = { ...playerState, superweapon: newSuperweaponState };

    return withSound({
        ...state,
        entities: newEntities,
        visualEffects: newVisualEffects,
        nextId: state.nextId + 1,
        players: { ...state.players, [playerId]: newPlayerState },
        lastMessage: "NUCLEAR LAUNCH DETECTED!",
    }, 'nuke_launch');
}
