
import React from 'react';
import { GameEntity, Unit, Building, UnitDomain, UnitType } from '../types';
import { ENTITY_CONFIGS } from '../constants';
import { EntityIcon } from './icons';
import { FaWrench } from 'react-icons/fa';

const HealthBar = ({ hp, maxHp }: { hp: number; maxHp: number }) => {
    const percentage = (hp / maxHp) * 100;
    const color = percentage > 60 ? 'bg-green-500' : percentage > 30 ? 'bg-yellow-500' : 'bg-red-500';
    return <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden absolute -bottom-2"><div className={`${color} h-full`} style={{ width: `${percentage}%` }}></div></div>;
};

const CargoBar = ({ cargo, capacity }: { cargo: number; capacity: number }) => {
    const percentage = (cargo / capacity) * 100;
    return (
        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden absolute -bottom-4">
            <div className="bg-yellow-400 h-full" style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

interface GameEntityComponentProps {
    entity: GameEntity;
    isSelected: boolean;
    borderColor: string;
    onEntityClick: (e: React.MouseEvent, entity: GameEntity) => void;
}

export const GameEntityComponent = React.memo(({ entity, isSelected, borderColor, onEntityClick }: GameEntityComponentProps) => {
  const isBuilding = 'isPowered' in entity;
  const selectionBorderColor = 'border-cyan-400';
  const displayBorderColor = isSelected ? selectionBorderColor : borderColor;
  const type = 'status' in entity ? (entity as Unit).type : (entity as Building).type;
  const config = ENTITY_CONFIGS[type];
  const isAirUnit = !isBuilding && config.domain === UnitDomain.AIR;
  const isConstructing = 'isConstructing' in entity && entity.isConstructing;
  const isRepairing = 'status' in entity && (entity as Unit).status === 'REPAIRING';
  
  const isChronoMiner = entity.type === UnitType.CHRONO_MINER && 'cargoAmount' in entity && config.gatherCapacity;
  const isFullMiner = isChronoMiner && (entity as Unit).cargoAmount! >= config.gatherCapacity!;

  const entityStyle: React.CSSProperties = {
    left: entity.position.x,
    top: entity.position.y,
    width: entity.size,
    height: entity.size,
    zIndex: isAirUnit ? 10 : 1 // Air units appear above ground units
  };

  return (
    <div className={`absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 ${isConstructing ? 'opacity-60' : ''}`}
         style={entityStyle}
         onMouseDown={(e) => onEntityClick(e, entity)}>
      {isAirUnit && (
        <div 
          className="absolute bg-black rounded-full opacity-30" 
          style={{ 
            width: entity.size * 0.8, 
            height: entity.size * 0.4, 
            top: '85%', 
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        />
      )}
      <div className={`w-full h-full border-2 ${displayBorderColor} shadow-lg relative ${isFullMiner ? 'shadow-green-500' : ''}`}>
        {isFullMiner && <div className="absolute inset-0 bg-green-500/30 animate-pulse"></div>}
        <EntityIcon type={type} size="full" />
        <HealthBar hp={entity.hp} maxHp={entity.maxHp} />
        {isChronoMiner && (
            <CargoBar cargo={(entity as Unit).cargoAmount || 0} capacity={config.gatherCapacity!} />
        )}
        {isRepairing && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
            <FaWrench className="w-2 h-2 text-white" />
          </div>
        )}
      </div>
    </div>
  );
});