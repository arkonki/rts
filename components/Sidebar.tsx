

import React from 'react';
import { GameState, BuildingType, UnitType, Building, Unit, PlayerState, GameEntity } from '../types';
import { ENTITY_CONFIGS, MAP_HEIGHT, MAP_WIDTH } from '../constants';
import { CreditsIcon, PowerIcon, EntityIcon } from './icons';
import { Minimap } from './Minimap';
import { soundService } from '../services/soundService';
import { getProducibleItems } from '../utils/logic';


const Tooltip = ({ config }: { config: typeof ENTITY_CONFIGS[UnitType] }) => (
    <div className="absolute left-full top-0 ml-2 w-64 p-3 bg-gray-900 border border-cyan-400 rounded-md shadow-lg text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <h3 className="font-bold text-base text-cyan-300">{config.name}</h3>
        <p className="text-gray-300 my-1">{config.description}</p>
        <div className="flex justify-between mt-2 pt-2 border-t border-gray-700">
            <span>Build Time:</span>
            <span className="font-bold">{(config.buildTime / 1000).toFixed(1)}s</span>
        </div>
        <div className="flex justify-between">
            <span>HP:</span>
            <span className="font-bold">{config.hp}</span>
        </div>
        {config.damage && (
            <div className="flex justify-between">
                <span>Damage:</span>
                <span className="font-bold">{config.damage}</span>
            </div>
        )}
    </div>
);


const ProductionButton = ({ itemType, onProduce, canProduce, canAfford }: { itemType: UnitType | BuildingType, onProduce: () => void, canProduce: boolean, canAfford: boolean }) => {
    const config = ENTITY_CONFIGS[itemType];
    const isDisabled = !canProduce || !canAfford;

    const handleClick = () => {
        if (!isDisabled) {
            soundService.play('click');
            onProduce();
        }
    };

    return (
        <div className="relative group">
            <button onClick={handleClick} disabled={isDisabled} className={`w-full p-2 border flex items-center justify-between text-left transition-colors ${!isDisabled ? 'bg-black/30 border-gray-500 hover:bg-cyan-500/20 hover:border-cyan-400' : 'bg-black/50 border-gray-700 text-gray-500 cursor-not-allowed'}`}>
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8"><EntityIcon type={itemType} size="full" /></div>
                    <span>{config.name}</span>
                </div>
                <div className="flex items-center space-x-1 text-green-400 font-bold">
                    <span>{config.cost}</span> <div className="w-4 h-4"><CreditsIcon /></div>
                </div>
            </button>
            {!isDisabled && <Tooltip config={config} />}
        </div>
    )
}

const SelectedInfoPanel = ({ selectedIds, entities }: { selectedIds: string[], entities: Record<string, GameEntity> }) => {
    if (selectedIds.length === 0) return null;

    if (selectedIds.length === 1) { // Single entity selected
        const selectedEntity = entities[selectedIds[0]];
        if (selectedEntity) {
             const config = ENTITY_CONFIGS[selectedEntity.type];
             const isMiner = selectedEntity.type === UnitType.CHRONO_MINER;
             const cargo = isMiner ? (selectedEntity as Unit).cargoAmount || 0 : 0;
             const capacity = isMiner && config.gatherCapacity ? config.gatherCapacity : 1;

             return (
                <div className="mb-4 p-2 bg-black/30 rounded">
                    <h4 className="font-bold text-lg">{config.name}</h4>
                    <p>HP: {selectedEntity.hp.toFixed(0)} / {selectedEntity.maxHp}</p>
                    {'damage' in selectedEntity && selectedEntity.damage && <p>Damage: {selectedEntity.damage}</p>}
                    
                    {isMiner && (
                        <div className="mt-2">
                            <p>Cargo: {cargo} / {capacity}</p>
                            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mt-1 border border-black">
                                <div className="bg-yellow-400 h-full" style={{ width: `${(cargo / capacity) * 100}%` }}></div>
                            </div>
                        </div>
                    )}

                    <p className="text-gray-400 text-sm mt-1">Owner: {selectedEntity.playerId}</p>
                </div>
            )
        }
    }
    
    // Multiple units selected
    const unitGroups = selectedIds
        .map(id => entities[id])
        .filter(e => e && 'status' in e)
        .reduce((acc, unit) => {
            const u = unit as Unit;
            acc[u.type] = (acc[u.type] || 0) + 1;
            return acc;
        }, {} as Record<UnitType, number>);

    if (Object.keys(unitGroups).length === 0) return null;

    return (
        <div className="mb-4 p-2 bg-black/30 rounded">
            <h4 className="font-bold text-lg">{selectedIds.length} Units Selected</h4>
            <div className="grid grid-cols-4 gap-2 mt-2">
                {Object.entries(unitGroups).map(([type, count]) => (
                    <div key={type} className="flex flex-col items-center" title={`${count}x ${ENTITY_CONFIGS[type as UnitType].name}`}>
                        <div className="w-8 h-8 relative">
                            <EntityIcon type={type as UnitType} size="full" />
                            <span className="absolute -bottom-1 -right-1 bg-black/80 rounded-full px-1.5 text-xs font-bold">{count}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
};


interface SidebarProps {
    playerState: PlayerState;
    state: GameState;
    dispatch: React.Dispatch<any>;
    viewportSize: React.MutableRefObject<{ width: number; height: number; }>;
    setPlacingBuildingType: (type: BuildingType | null) => void;
}

export const Sidebar = ({ playerState, state, dispatch, viewportSize, setPlacingBuildingType }: SidebarProps) => {

    const { entities, selectedIds } = state;
    const selectedEntity = selectedIds.length === 1 ? entities[selectedIds[0]] : null;
    const playerEntities = Object.values(entities).filter(e => e.playerId === playerState.id);

    const renderProductionPanel = () => {
        if (!selectedEntity || 'status' in selectedEntity || selectedIds.length > 1 || selectedEntity.playerId !== playerState.id) {
            return <SelectedInfoPanel selectedIds={selectedIds} entities={entities} />;
        }
        
        const building = selectedEntity as Building;
        if (building.isConstructing) return <p className="text-cyan-400 text-center">Under Construction...</p>;

        const itemsToProduce = Object.entries(ENTITY_CONFIGS)
            .filter(([key, config]) => config.producedBy === building.type)
            .map(([key, config]) => key as UnitType | BuildingType);
        
        const { producibleBuildings, producibleUnits } = getProducibleItems(playerState, playerEntities);
        const allProducible = [...producibleBuildings, ...producibleUnits];
        
        const handleProduce = (itemType: UnitType | BuildingType) => {
            if (Object.values(UnitType).includes(itemType as UnitType)) {
                dispatch({ type: 'QUEUE_PRODUCTION', payload: { buildingId: building.id, itemType } });
            } else { 
                setPlacingBuildingType(itemType as BuildingType); 
                dispatch({ type: 'SELECT', payload: [] }); 
            }
        };

        return (
            <div className="space-y-1">
                <SelectedInfoPanel selectedIds={selectedIds} entities={entities} />
                {itemsToProduce.map(item => (
                     <ProductionButton 
                        key={item} 
                        itemType={item} 
                        onProduce={() => handleProduce(item)}
                        canProduce={allProducible.includes(item)}
                        canAfford={playerState.credits >= ENTITY_CONFIGS[item].cost}
                    />
                ))}
                {building.productionQueue.length > 0 && (
                    <div className="mt-4 pt-2 border-t border-gray-600"> <p className="font-bold mb-1">Production Queue:</p>
                        {building.productionQueue.map((item, i) => { const config = ENTITY_CONFIGS[item];
                            return ( <div key={i} className="flex items-center space-x-2 bg-black/30 p-1 relative overflow-hidden rounded-sm"> <div className="w-6 h-6 flex-shrink-0"><EntityIcon type={item} size="full" /></div> <span className="truncate">{config.name}</span> {i === 0 && <div className="absolute bottom-0 left-0 h-0.5 bg-cyan-400" style={{width: `${(building.productionProgress / config.buildTime) * 100}%`}}></div>} </div> ) })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <aside className="w-72 bg-gray-900/80 backdrop-blur-sm border-l-2 border-cyan-500/30 p-2 flex flex-col space-y-2 text-white">
          <header className="flex justify-around border-b-2 border-gray-500/50 pb-2 bg-black/20 rounded-t-md p-1">
              <div className="flex items-center space-x-2 text-lg"> <CreditsIcon /> <span className="font-bold">{Math.floor(playerState.credits)}</span> </div>
              <div className="flex items-center space-x-2 text-lg"> <PowerIcon /> <span className={`font-bold ${playerState.power.produced >= playerState.power.consumed ? 'text-green-400' : 'text-red-500'}`}>{playerState.power.produced - playerState.power.consumed}</span></div>
          </header>
          <Minimap 
            state={state}
            viewportSize={viewportSize}
            onMinimapClick={({x,y}) => {
                let newX = x * MAP_WIDTH - viewportSize.current.width / 2; 
                let newY = y * MAP_HEIGHT - viewportSize.current.height / 2;
                newX = Math.max(0, Math.min(newX, MAP_WIDTH - viewportSize.current.width));
                newY = Math.max(0, Math.min(newY, MAP_HEIGHT - viewportSize.current.height));
                dispatch({type: 'UPDATE_VIEWPORT', payload: {x: newX, y: newY}});
            }} 
          />
          <div className="flex-1 overflow-y-auto p-1 bg-black/20 rounded-b-md">
              {renderProductionPanel()}
          </div>
          <footer className="text-xs text-center text-gray-500"> Gemini RTS v1.4 </footer>
        </aside>
    );
};
