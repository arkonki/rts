
import React from 'react';
import { Unit, UnitDomain, UnitType } from '../types';
import { EntityIcon } from './icons';
import { Renderable, UnitCluster } from '../utils/clustering';

const HealthBar = ({ hp, maxHp }: { hp: number; maxHp: number }) => {
    if (maxHp === 0) return null;
    const percentage = (hp / maxHp) * 100;
    const color = percentage > 60 ? 'bg-green-500' : percentage > 30 ? 'bg-yellow-500' : 'bg-red-500';
    return <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden absolute -bottom-2"><div className={`${color} h-full`} style={{ width: `${percentage}%` }}></div></div>;
};


interface UnitClusterComponentProps {
    cluster: UnitCluster;
    isSelected: boolean;
    borderColor: string;
    onEntityClick: (e: React.MouseEvent, item: Renderable) => void;
}

export const UnitClusterComponent = React.memo(({ cluster, isSelected, borderColor, onEntityClick }: UnitClusterComponentProps) => {
    const { units, position, size, domain, hp, maxHp } = cluster;
    const selectionBorderColor = 'border-cyan-400';
    const displayBorderColor = isSelected ? selectionBorderColor : borderColor;
    const isAirUnit = domain === UnitDomain.AIR;

    // Find the most numerous unit type to use for the icon
    const typeCounts = units.reduce((acc, unit) => {
        acc[unit.type] = (acc[unit.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const representativeType = Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b) as UnitType;
    
    const entityStyle: React.CSSProperties = {
        left: position.x,
        top: position.y,
        width: size,
        height: size,
        zIndex: isAirUnit ? 10 : 1
    };

    return (
        <div className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
             style={entityStyle}
             onMouseDown={(e) => onEntityClick(e, cluster)}>
            {isAirUnit && (
                <div 
                    className="absolute bg-black rounded-full opacity-30" 
                    style={{ 
                        width: size * 0.8, 
                        height: size * 0.4, 
                        top: '85%', 
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                    }}
                />
            )}
            <div className={`w-full h-full border-2 ${displayBorderColor} shadow-lg relative`}>
                <EntityIcon type={representativeType} size="full" />
                <HealthBar hp={hp} maxHp={maxHp} />
                <div className="absolute -top-2 -right-2 bg-black/80 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                    {units.length}
                </div>
            </div>
        </div>
    );
});