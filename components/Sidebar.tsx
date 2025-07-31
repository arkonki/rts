
import React from 'react';
import { GameState, BuildingType, UnitType, Building, PlayerState, GameEntity } from '../types';
import { ENTITY_CONFIGS, MAP_HEIGHT, MAP_WIDTH } from '../constants';
import { CreditsIcon, PowerIcon, EntityIcon } from './icons';
import { Minimap } from './Minimap';
import { getProducibleItems } from '../utils/logic';
import { soundService } from '../services/soundService';
import Tooltip from './Tooltip';

interface SidebarProps {
  playerState: PlayerState;
  state: GameState;
  dispatch: React.Dispatch<any>;
  viewportSize: React.MutableRefObject<{ width: number; height: number }>;
  setPlacingBuildingType: (type: BuildingType | null) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const SidebarHeader = ({ playerState }: { playerState: PlayerState }) => {
    const powerBalance = playerState.power.produced - playerState.power.consumed;
    const powerColor = powerBalance >= 0 ? 'text-green-400' : 'text-red-500';

    return (
        <div className="p-4 bg-black/30 border-b-2 border-cyan-500/50">
            <div className="flex justify-around items-center text-lg font-bold">
                <div className="flex items-center space-x-2 text-yellow-300">
                    <div className="w-6 h-6"><CreditsIcon /></div>
                    <span>{playerState.credits}</span>
                </div>
                <div className={`flex items-center space-x-2 ${powerColor}`}>
                    <div className="w-6 h-6"><PowerIcon /></div>
                    <span>{powerBalance} / {playerState.power.produced}</span>
                </div>
            </div>
        </div>
    );
};

const ProductionButton = ({ itemType, buildingId, dispatch, playerState, playerEntities }: { itemType: UnitType | BuildingType, buildingId: string, dispatch: React.Dispatch<any>, playerState: PlayerState, playerEntities: GameEntity[] }) => {
    const config = ENTITY_CONFIGS[itemType];
    
    const requirements = Array.isArray(config.requires) ? config.requires : (config.requires ? [config.requires] : []);
    const playerBuildingTypes = playerEntities.filter(e => 'isPowered' in e).map(e => e.type);
    
    const canAfford = playerState.credits >= config.cost;
    const requirementsMet = requirements.every(req => playerBuildingTypes.includes(req));
    const isDisabled = !canAfford || !requirementsMet;

    const handleClick = () => {
        if(isDisabled) {
            soundService.play('insufficient_funds');
            return;
        }
        soundService.play('click');
        dispatch({ type: 'QUEUE_PRODUCTION', payload: { buildingId, itemType } });
    };

    const tooltipContent = (
        <>
            <h4 className={`font-bold ${canAfford ? 'text-cyan-300' : 'text-red-400'}`}>{config.name} - ${config.cost}</h4>
            <p className="text-sm text-gray-300">{config.description}</p>
            {!requirementsMet && <p className="text-xs text-red-400 mt-1">Requires: {requirements.join(', ')}</p>}
        </>
    );

    return (
        <Tooltip content={tooltipContent}>
            <button
                onClick={handleClick}
                className={`w-16 h-16 bg-gray-900/50 border-2 p-1 transition-colors ${isDisabled ? 'border-gray-700 opacity-50 cursor-not-allowed' : 'border-gray-600 hover:border-cyan-400 focus:border-cyan-400'}`}
                aria-label={`Produce ${config.name}`}
                disabled={isDisabled}
            >
                <EntityIcon type={itemType} size="full" />
            </button>
        </Tooltip>
    );
};

const BuildButton = ({ itemType, setPlacingBuildingType, playerState, playerEntities }: { itemType: BuildingType, setPlacingBuildingType: (type: BuildingType) => void, playerState: PlayerState, playerEntities: GameEntity[] }) => {
    const config = ENTITY_CONFIGS[itemType];
    
    const requirements = Array.isArray(config.requires) ? config.requires : (config.requires ? [config.requires] : []);
    const playerBuildingTypes = playerEntities.filter(e => 'isPowered' in e).map(e => e.type);

    const canAfford = playerState.credits >= config.cost;
    const requirementsMet = requirements.every(req => playerBuildingTypes.includes(req));
    const isDisabled = !canAfford || !requirementsMet;

    const handleClick = () => {
        if(isDisabled) {
            soundService.play('insufficient_funds');
            return;
        }
        soundService.play('click');
        setPlacingBuildingType(itemType);
    };

    const tooltipContent = (
        <>
            <h4 className={`font-bold ${canAfford ? 'text-cyan-300' : 'text-red-400'}`}>{config.name} - ${config.cost}</h4>
            <p className="text-sm text-gray-300">{config.description}</p>
            {!requirementsMet && <p className="text-xs text-red-400 mt-1">Requires: {requirements.join(', ')}</p>}
        </>
    );

    return (
        <Tooltip content={tooltipContent}>
            <button
                onClick={handleClick}
                className={`w-16 h-16 bg-gray-900/50 border-2 p-1 transition-colors ${isDisabled ? 'border-gray-700 opacity-50 cursor-not-allowed' : 'border-gray-600 hover:border-cyan-400 focus:border-cyan-400'}`}
                aria-label={`Build ${config.name}`}
                disabled={isDisabled}
            >
                <EntityIcon type={itemType} size="full" />
            </button>
        </Tooltip>
    );
};

const SelectionPanel = ({ state, dispatch, setPlacingBuildingType, playerState }: { state: GameState, dispatch: React.Dispatch<any>, setPlacingBuildingType: (type: BuildingType | null) => void, playerState: PlayerState }) => {
    const { selectedIds, entities } = state;
    const humanPlayerId = 'PLAYER_1';
    
    if (selectedIds.length === 0) {
        return <div className="p-4 text-center text-gray-400">No selection.</div>;
    }

    if (selectedIds.length === 1) {
        const entity = entities[selectedIds[0]];
        if (!entity) return null;
        if (entity.playerId !== humanPlayerId) return <div className="p-4 text-center text-gray-400">Enemy selected.</div>;

        const config = ENTITY_CONFIGS[entity.type];
        const playerEntities = Object.values(entities).filter(e => e.playerId === humanPlayerId);
        const { producibleUnits, producibleBuildings } = getProducibleItems(playerState, playerEntities);

        let producibleItems: (UnitType | BuildingType)[] = [];
        if ('isPowered' in entity) {
            producibleItems = [...producibleUnits, ...producibleBuildings].filter(item => ENTITY_CONFIGS[item].producedBy === entity.type);
        }

        return (
            <div className="p-4 flex flex-col items-center">
                <div className="w-24 h-24 mb-2"><EntityIcon type={entity.type} size="full" /></div>
                <h3 className="text-xl font-bold">{config.name}</h3>
                <p className="text-sm text-gray-400 mb-2">{Math.ceil(entity.hp)} / {entity.maxHp}</p>
                {'isPowered' in entity && !(entity as Building).isPowered && <p className="text-red-500 font-bold">LOW POWER</p>}
                
                {producibleItems.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        {producibleItems.map(item => {
                            if (Object.values(UnitType).includes(item as UnitType)) {
                                return <ProductionButton key={item} itemType={item as UnitType} buildingId={entity.id} dispatch={dispatch} playerState={playerState} playerEntities={playerEntities} />;
                            } else {
                                return <BuildButton key={item} itemType={item as BuildingType} setPlacingBuildingType={setPlacingBuildingType} playerState={playerState} playerEntities={playerEntities} />;
                            }
                        })}
                    </div>
                )}
                
                {'productionQueue' in entity && (entity as Building).productionQueue.length > 0 && (
                    <div className="w-full mt-4 space-y-1">
                        <h4 className="text-center font-bold text-gray-400 border-t border-gray-700 pt-2 mb-2">Queue</h4>
                        {(entity as Building).productionQueue.map((item, index) => (
                           <div key={index} className="flex items-center space-x-2 bg-gray-700 p-1 rounded-md">
                                <div className="w-8 h-8"><EntityIcon type={item as UnitType} size="full"/></div>
                                <span>{ENTITY_CONFIGS[item as UnitType].name}</span>
                           </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Multiple selection
    return (
        <div className="p-4">
            <h3 className="text-lg font-bold mb-2">Selected Units ({selectedIds.length})</h3>
            <div className="grid grid-cols-4 gap-1">
                {selectedIds.slice(0, 16).map(id => { // Limit to showing 16 icons
                    const entity = entities[id];
                    if (!entity || entity.playerId !== humanPlayerId) return null;
                    return (
                        <div key={id} className="w-12 h-12 p-0.5 border border-gray-600">
                           <EntityIcon type={entity.type} size="full" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const Sidebar = ({ playerState, state, dispatch, viewportSize, setPlacingBuildingType, onMouseEnter, onMouseLeave }: SidebarProps) => {
    
    const handleMinimapClick = (pos: { x: number; y: number }) => {
        const newViewportX = pos.x * MAP_WIDTH - viewportSize.current.width / 2;
        const newViewportY = pos.y * MAP_HEIGHT - viewportSize.current.height / 2;

        dispatch({
            type: 'UPDATE_VIEWPORT',
            payload: {
                x: Math.max(0, Math.min(newViewportX, MAP_WIDTH - viewportSize.current.width)),
                y: Math.max(0, Math.min(newViewportY, MAP_HEIGHT - viewportSize.current.height)),
            },
        });
    };

    if (!playerState) {
        return <aside className="w-80 h-screen border-l-2" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}></aside>;
    }

    const humanPlayerEntities = Object.values(state.entities).filter(e => e.playerId === playerState.id);
    const hasHQ = humanPlayerEntities.some(e => e.type === BuildingType.HQ);

    return (
        <aside className="w-80 h-screen flex flex-col border-l-2" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <SidebarHeader playerState={playerState} />
            <div className="flex-grow overflow-y-auto">
                <SelectionPanel state={state} dispatch={dispatch} setPlacingBuildingType={setPlacingBuildingType} playerState={playerState}/>
            </div>
            {hasHQ && (
              <div className="p-2 border-t-2 border-cyan-500/50">
                   <Minimap state={state} viewportSize={viewportSize} onMinimapClick={handleMinimapClick} />
              </div>
            )}
        </aside>
    );
};