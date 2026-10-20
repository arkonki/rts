import React from 'react';
import { GameEntity, Unit, Building, UnitDomain, UnitType } from '../types';
import { ENTITY_CONFIGS } from '../constants';
import { EntitySprite } from './sprites';
import { mapScale } from './sprites/scale';
import { FaWrench } from 'react-icons/fa';

export const HealthBar = ({ hp, maxHp }: { hp: number; maxHp: number }) => {
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    const color = ratio > 0.6 ? '#3ddc4a' : ratio > 0.3 ? '#f4c20d' : '#e0242b';
    return (
        <div className="hp-bar" aria-hidden="true">
            <div className="hp-fill" style={{ width: `${ratio * 100}%`, background: color }} />
        </div>
    );
};

const CargoBar = ({ cargo, capacity }: { cargo: number; capacity: number }) => (
    <div className="hp-bar" style={{ top: 'calc(100% + 4px)', bottom: 'auto', height: 3 }} aria-hidden="true">
        <div className="hp-fill" style={{ width: `${(cargo / capacity) * 100}%`, background: '#f2c14e' }} />
    </div>
);

/** Smoke and flames on badly damaged vehicles and buildings. */
const DamageFx = ({ ratio, isBuilding }: { ratio: number; isBuilding: boolean }) => {
    if (ratio >= 0.5) return null;
    const burning = ratio < 0.25;
    return (
        <div className="absolute inset-0 pointer-events-none">
            <span className="smoke" style={{ left: '30%', top: '35%' }} />
            <span className="smoke" style={{ left: '62%', top: '55%', animationDelay: '-0.7s' }} />
            {burning && <span className="fire" style={{ left: isBuilding ? '45%' : '48%', top: '45%' }} />}
        </div>
    );
};

interface GameEntityComponentProps {
    entity: GameEntity;
    isSelected: boolean;
    teamColor: string;
    onEntityClick: (e: React.MouseEvent, entity: GameEntity) => void;
}

export const GameEntityComponent = React.memo(({ entity, isSelected, teamColor, onEntityClick }: GameEntityComponentProps) => {
    const isBuilding = 'isPowered' in entity;
    const type = entity.type;
    const config = ENTITY_CONFIGS[type];
    const unit = isBuilding ? null : (entity as Unit);
    const building = isBuilding ? (entity as Building) : null;

    const isAirUnit = !isBuilding && config.domain === UnitDomain.AIR;
    const isInfantry = config.category === 'INFANTRY';
    const isConstructing = !!building?.isConstructing;
    const isUnpowered = !!building && !building.isConstructing && !building.isPowered;
    const isRepairing = unit?.status === 'REPAIRING';

    const isChronoMiner = type === UnitType.CHRONO_MINER;
    const isFullMiner = isChronoMiner && (unit?.cargoAmount ?? 0) >= (config.gatherCapacity ?? Infinity);

    const visualSize = entity.size * mapScale(type);
    const hpRatio = entity.hp / entity.maxHp;
    const showBar = isSelected || hpRatio < 1 || isConstructing;
    const buildProgress = isConstructing ? Math.max(0, Math.min(1, hpRatio)) : 1;

    return (
        <div
            className="absolute -translate-x-1/2 -translate-y-1/2 select-none"
            style={{ left: entity.position.x, top: entity.position.y, width: visualSize, height: visualSize, zIndex: isAirUnit ? 12 : (isBuilding ? 1 : 3) }}
            onMouseDown={(e) => onEntityClick(e, entity)}
        >
            {/* Ground shadow; aircraft cast a longer, fainter one to read as flying. */}
            {!isBuilding && (
                <div
                    className="entity-shadow"
                    style={{
                        width: visualSize * (isInfantry ? 0.4 : 0.62),
                        height: visualSize * (isInfantry ? 0.22 : 0.38),
                        left: '50%',
                        top: '50%',
                        transform: `translate(${isAirUnit ? '-20%, 55%' : '-45%, 5%'})`,
                        opacity: isAirUnit ? 0.22 : 0.35,
                    }}
                />
            )}

            <div
                className={`relative w-full h-full ${isUnpowered ? 'entity-unpowered' : ''} ${isFullMiner ? 'miner-full' : ''}`}
                style={{
                    transform: unit ? `rotate(${unit.facing ?? 0}deg)` : undefined,
                    clipPath: isConstructing ? `inset(${(1 - buildProgress) * 100}% 0 0 0)` : undefined,
                    transition: unit ? 'transform 90ms linear' : undefined,
                }}
            >
                <EntitySprite type={type} team={teamColor} />
            </div>

            {isConstructing && <div className="scaffold" />}
            {!isInfantry && <DamageFx ratio={hpRatio} isBuilding={isBuilding} />}

            {isUnpowered && (
                <svg className="absolute pointer-events-none low-power-icon" viewBox="0 0 24 24" width={18} height={18} style={{ right: 2, top: 2 }}>
                    <path d="M13 2 4 14h6l-1 8 10-13h-6z" fill="#facc15" stroke="#7c5a00" strokeWidth={1} />
                </svg>
            )}

            {isSelected && <div className="select-brackets" style={{ borderRadius: isBuilding ? 4 : 2 }} />}
            {showBar && <HealthBar hp={entity.hp} maxHp={entity.maxHp} />}
            {isChronoMiner && unit && config.gatherCapacity && (
                <CargoBar cargo={unit.cargoAmount || 0} capacity={config.gatherCapacity} />
            )}
            {isRepairing && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                    <FaWrench className="w-2 h-2 text-white" />
                </div>
            )}
        </div>
    );
});
