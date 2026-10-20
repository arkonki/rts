import React from 'react';
import { UnitDomain, UnitType } from '../types';
import { Renderable, UnitCluster } from '../utils/clustering';
import { EntitySprite } from './sprites';
import { mapScale } from './sprites/scale';
import { HealthBar } from './GameEntityComponent';

interface UnitClusterComponentProps {
    cluster: UnitCluster;
    isSelected: boolean;
    teamColor: string;
    onEntityClick: (e: React.MouseEvent, item: Renderable) => void;
}

/** A tight group of units drawn as one sprite with a count badge. */
export const UnitClusterComponent = React.memo(({ cluster, isSelected, teamColor, onEntityClick }: UnitClusterComponentProps) => {
    const { units, position, domain, hp, maxHp } = cluster;
    const isAirUnit = domain === UnitDomain.AIR;

    // Find the most numerous unit type to use for the artwork
    const typeCounts = units.reduce((acc, unit) => {
        acc[unit.type] = (acc[unit.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const representativeType = Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b) as UnitType;
    const lead = units.find(u => u.type === representativeType) ?? units[0];

    const visualSize = 36 * Math.min(1.6, mapScale(representativeType) / 1.2);

    return (
        <div
            className="absolute -translate-x-1/2 -translate-y-1/2 select-none"
            style={{ left: position.x, top: position.y, width: visualSize, height: visualSize, zIndex: isAirUnit ? 12 : 3 }}
            onMouseDown={(e) => onEntityClick(e, cluster)}
        >
            <div className="entity-shadow" style={{ width: visualSize * 0.7, height: visualSize * 0.4, left: '50%', top: '50%', transform: 'translate(-45%, 10%)', opacity: 0.35 }} />
            <div className="relative w-full h-full" style={{ transform: `rotate(${lead.facing ?? 0}deg)` }}>
                <EntitySprite type={representativeType} team={teamColor} />
            </div>
            {isSelected && <div className="select-brackets" />}
            <HealthBar hp={hp} maxHp={maxHp} />
            <div className="cluster-badge">{units.length}</div>
        </div>
    );
});
