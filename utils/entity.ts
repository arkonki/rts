

import { Unit, GameEntity, FogState, UnitDomain } from '../types';
import { ENTITY_CONFIGS, TILE_SIZE } from '../constants';

export function findNearestEnemy(unit: Unit, allEntities: Record<string, GameEntity>, fogOfWar: FogState[][]): GameEntity | null {
    let nearestEnemy: GameEntity | null = null;
    let minDistance = Infinity;
    
    const attackerConfig = ENTITY_CONFIGS[unit.type];
    const aggroRange = attackerConfig.aggroRange || unit.attackRange || 0;
    const canAttackDomains = attackerConfig.canAttack;

    if (!canAttackDomains || canAttackDomains.length === 0) return null;

    for (const entity of Object.values(allEntities)) {
        if (entity.playerId !== unit.playerId) {
            const tileX = Math.floor(entity.position.x / TILE_SIZE);
            const tileY = Math.floor(entity.position.y / TILE_SIZE);
            if(fogOfWar[tileY]?.[tileX] !== FogState.VISIBLE) continue;

            // Check if attacker can attack target's domain
            let targetDomain: UnitDomain | undefined;
            if ('domain' in entity) {
                targetDomain = entity.domain;
            } else { // Buildings are implicitly ground domain
                targetDomain = UnitDomain.GROUND;
            }
            
            if (!canAttackDomains.includes(targetDomain)) {
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