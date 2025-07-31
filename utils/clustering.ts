
import { GameEntity, Unit, Position, UnitDomain } from '../types';

export interface UnitCluster {
    isCluster: true;
    units: Unit[];
    id: string; // Composite ID for key prop
    position: Position;
    size: number;
    playerId: string;
    type: 'CLUSTER';
    domain: UnitDomain;
    hp: number;
    maxHp: number;
}

export type Renderable = GameEntity | UnitCluster;

export function clusterEntities(entities: Record<string, GameEntity>, clusterDistance: number): Renderable[] {
    const allUnits = Object.values(entities).filter(e => 'status' in e) as Unit[];
    const buildings = Object.values(entities).filter(e => 'isPowered' in e);
    const processedUnitIds = new Set<string>();
    const renderables: Renderable[] = [...buildings];

    for (const unit of allUnits) {
        if (processedUnitIds.has(unit.id)) {
            continue;
        }

        const currentCluster: Unit[] = [];
        const queue = [unit];
        processedUnitIds.add(unit.id);

        while (queue.length > 0) {
            const currentUnit = queue.shift()!;
            currentCluster.push(currentUnit);

            for (const otherUnit of allUnits) {
                if (processedUnitIds.has(otherUnit.id) || otherUnit.domain !== currentUnit.domain) {
                    continue;
                }

                const distance = Math.hypot(currentUnit.position.x - otherUnit.position.x, currentUnit.position.y - otherUnit.position.y);
                if (distance < clusterDistance) {
                    processedUnitIds.add(otherUnit.id);
                    queue.push(otherUnit);
                }
            }
        }

        if (currentCluster.length > 1) {
            const totalPosition = currentCluster.reduce((acc, u) => ({ x: acc.x + u.position.x, y: acc.y + u.position.y }), { x: 0, y: 0 });
            const avgPosition = { x: totalPosition.x / currentCluster.length, y: totalPosition.y / currentCluster.length };
            
            const totalHp = currentCluster.reduce((acc, u) => acc + u.hp, 0);
            const totalMaxHp = currentCluster.reduce((acc, u) => acc + u.maxHp, 0);

            renderables.push({
                isCluster: true,
                units: currentCluster,
                id: currentCluster.map(u => u.id).sort().join('-'),
                position: avgPosition,
                size: 35, // A fixed nice size for clusters
                playerId: currentCluster[0].playerId,
                type: 'CLUSTER',
                domain: currentCluster[0].domain,
                hp: totalHp,
                maxHp: totalMaxHp,
            });
        } else {
            renderables.push(currentCluster[0]);
        }
    }

    return renderables;
}