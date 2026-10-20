import { Unit, GameEntity, FogState, UnitDomain } from '../types';
import { ENTITY_CONFIGS, TILE_SIZE, HUMAN_PLAYER_ID } from '../constants';
import { SpatialGrid } from './spatialGrid';

/** Heading in degrees (0 = up/north, clockwise) from one point to another. */
export function headingTo(from: { x: number; y: number }, to: { x: number; y: number }): number {
    return (Math.atan2(to.x - from.x, -(to.y - from.y)) * 180) / Math.PI;
}

/** Rotates `current` toward `desired` by at most `maxStep` degrees, taking the short way round. */
export function turnToward(current: number, desired: number, maxStep: number): number {
    let delta = ((((desired - current + 540) % 360) + 360) % 360) - 180;
    if (Math.abs(delta) <= maxStep) return desired;
    delta = Math.sign(delta) * maxStep;
    return current + delta;
}

/** Buildings are implicitly ground-domain targets. */
export function getTargetDomain(entity: GameEntity): UnitDomain {
    return 'domain' in entity ? entity.domain : UnitDomain.GROUND;
}

/** Whether a unit's weapons can hit the given target (enemy ownership is not checked). */
export function canUnitAttack(unit: Unit, target: GameEntity): boolean {
    const canAttackDomains = ENTITY_CONFIGS[unit.type].canAttack;
    return !!canAttackDomains && canAttackDomains.includes(getTargetDomain(target));
}

export function findNearestEnemy(unit: Unit, allEntitiesGrid: SpatialGrid, fogOfWar: FogState[][]): GameEntity | null {
    let nearestEnemy: GameEntity | null = null;
    let minDistance = Infinity;
    
    const attackerConfig = ENTITY_CONFIGS[unit.type];
    const aggroRange = attackerConfig.aggroRange || unit.attackRange || 0;
    const canAttackDomains = attackerConfig.canAttack;

    if (!canAttackDomains || canAttackDomains.length === 0) return null;
    
    const nearbyEntities = allEntitiesGrid.getNearby(unit);

    for (const entity of nearbyEntities) {
        if (entity.playerId !== unit.playerId) {
            const tileX = Math.floor(entity.position.x / TILE_SIZE);
            const tileY = Math.floor(entity.position.y / TILE_SIZE);
            // Fog of war only tracks the human player's vision, so it only limits the human's units.
            if (unit.playerId === HUMAN_PLAYER_ID && fogOfWar[tileY]?.[tileX] !== FogState.VISIBLE) continue;

            if (!canAttackDomains.includes(getTargetDomain(entity))) {
                continue;
            }

            const dx = entity.position.x - unit.position.x;
            const dy = entity.position.y - unit.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance && distance < aggroRange) {
                minDistance = distance;
                nearestEnemy = entity;
            }
        }
    }
    return nearestEnemy;
}
