import React from 'react';
import { GameState, BuildingType, UnitType, Building, Unit, PlayerState, GameEntity } from '../types';
import { ENTITY_CONFIGS, MAP_HEIGHT, MAP_WIDTH, HUMAN_PLAYER_ID, TEAM_COLORS } from '../constants';
import { CreditsIcon, EntityIcon } from './icons';
import { Minimap } from './Minimap';
import { getProducibleItems } from '../utils/logic';
import { soundService } from '../services/soundService';
import { GameAction } from '../state/actions';
import Tooltip from './Tooltip';

interface SidebarProps {
  playerState: PlayerState;
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  viewportSize: React.MutableRefObject<{ width: number; height: number }>;
  setPlacingBuildingType: (type: BuildingType | null) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const SidebarHeader = ({ playerState }: { playerState: PlayerState }) => {
    const { produced, consumed } = playerState.power;
    const lowPower = consumed > produced;
    const scale = Math.max(produced, consumed, 1);

    return (
        <div className="panel p-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6"><CreditsIcon /></div>
                    <span className="led led-gold text-2xl">{Math.floor(playerState.credits)}</span>
                </div>
                <span className={`text-[11px] font-bold tracking-widest ${lowPower ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                    {lowPower ? 'LOW POWER' : 'POWER OK'}
                </span>
            </div>
            <div className="power-bar mt-2" title={`Output ${produced}, draw ${consumed}`}>
                <div className={`power-supply ${lowPower ? 'power-supply-low' : ''}`} style={{ width: `${(produced / scale) * 100}%` }} />
                <div className="power-draw" style={{ left: `${Math.min(99, (consumed / scale) * 100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] tracking-wider text-gray-400 mt-1">
                <span>OUTPUT {produced}</span>
                <span>DRAW {consumed}</span>
            </div>
        </div>
    );
};

interface CameoButtonProps {
    itemType: UnitType | BuildingType;
    label: string;
    disabled: boolean;
    progress?: number;
    queued?: number;
    tooltip: React.ReactNode;
    onClick: () => void;
    onContextMenu?: () => void;
}

const CameoButton = ({ itemType, label, disabled, progress = 0, queued = 0, tooltip, onClick, onContextMenu }: CameoButtonProps) => {
    const config = ENTITY_CONFIGS[itemType];
    return (
        <Tooltip content={tooltip}>
            <div className="flex flex-col items-center w-[84px]">
                <button
                    onClick={onClick}
                    onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(); }}
                    className={`cameo-btn ${disabled ? 'cameo-btn-disabled' : ''}`}
                    aria-label={label}
                    disabled={disabled}
                >
                    <EntityIcon type={itemType} size="full" />
                    {progress > 0 && <div className="cameo-progress" style={{ height: `${(1 - progress) * 100}%` }} />}
                    {queued > 0 && <span className="cameo-count">{queued}</span>}
                    <span className="cameo-cost">${config.cost}</span>
                </button>
                <span className="cameo-name">{config.name}</span>
            </div>
        </Tooltip>
    );
};

const itemTooltip = (itemType: UnitType | BuildingType, canAfford: boolean, requirementsMet: boolean, requirements: BuildingType[]) => {
    const config = ENTITY_CONFIGS[itemType];
    return (
        <>
            <h4 className={`font-bold ${canAfford ? 'text-yellow-300' : 'text-red-400'}`}>{config.name} - ${config.cost}</h4>
            <p className="text-sm text-gray-300">{config.description}</p>
            {!requirementsMet && <p className="text-xs text-red-400 mt-1">Requires: {requirements.map(r => ENTITY_CONFIGS[r].name).join(', ')}</p>}
        </>
    );
};

const requirementsOf = (itemType: UnitType | BuildingType): BuildingType[] => {
    const requires = ENTITY_CONFIGS[itemType].requires;
    return Array.isArray(requires) ? requires : (requires ? [requires] : []);
};

const ProductionButton = ({ itemType, producer, dispatch, playerState, playerEntities }: { itemType: UnitType | BuildingType, producer: Building, dispatch: React.Dispatch<GameAction>, playerState: PlayerState, playerEntities: GameEntity[] }) => {
    const config = ENTITY_CONFIGS[itemType];
    const requirements = requirementsOf(itemType);
    // Only finished buildings count, matching the reducer's requirement check.
    const playerBuildingTypes = playerEntities.filter(e => 'isPowered' in e && !(e as Building).isConstructing).map(e => e.type);

    const canAfford = playerState.credits >= config.cost;
    const requirementsMet = requirements.every(req => playerBuildingTypes.includes(req));
    const isDisabled = !canAfford || !requirementsMet || !producer.isPowered;

    const isActive = producer.productionQueue[0] === itemType;
    const progress = isActive ? Math.min(1, producer.productionProgress / config.buildTime) : 0;
    const queued = producer.productionQueue.filter(item => item === itemType).length;

    const handleClick = () => {
        if (isDisabled) {
            soundService.play('insufficient_funds');
            return;
        }
        soundService.play('click');
        dispatch({ type: 'QUEUE_PRODUCTION', payload: { buildingId: producer.id, itemType } });
    };

    const handleCancel = () => {
        const index = producer.productionQueue.lastIndexOf(itemType);
        if (index >= 0) {
            soundService.play('click');
            dispatch({ type: 'CANCEL_PRODUCTION', payload: { buildingId: producer.id, index } });
        }
    };

    return (
        <CameoButton
            itemType={itemType}
            label={`Produce ${config.name}`}
            disabled={isDisabled}
            progress={progress}
            queued={queued}
            tooltip={<>{itemTooltip(itemType, canAfford, requirementsMet, requirements)}{queued > 0 && <p className="text-xs text-gray-400 mt-1">Right-click to cancel one.</p>}</>}
            onClick={handleClick}
            onContextMenu={handleCancel}
        />
    );
};

const BuildButton = ({ itemType, setPlacingBuildingType, playerState, playerEntities }: { itemType: BuildingType, setPlacingBuildingType: (type: BuildingType) => void, playerState: PlayerState, playerEntities: GameEntity[] }) => {
    const config = ENTITY_CONFIGS[itemType];
    const requirements = requirementsOf(itemType);
    const playerBuildingTypes = playerEntities.filter(e => 'isPowered' in e && !(e as Building).isConstructing).map(e => e.type);

    const canAfford = playerState.credits >= config.cost;
    const requirementsMet = requirements.every(req => playerBuildingTypes.includes(req));
    const isDisabled = !canAfford || !requirementsMet;

    const handleClick = () => {
        if (isDisabled) {
            soundService.play('insufficient_funds');
            return;
        }
        soundService.play('click');
        setPlacingBuildingType(itemType);
    };

    return (
        <CameoButton
            itemType={itemType}
            label={`Build ${config.name}`}
            disabled={isDisabled}
            tooltip={itemTooltip(itemType, canAfford, requirementsMet, requirements)}
            onClick={handleClick}
        />
    );
};

/** The production queue of the selected building. Click (or right-click) an item to cancel it and get a refund. */
const QueueStrip = ({ producer, dispatch }: { producer: Building, dispatch: React.Dispatch<GameAction> }) => {
    if (producer.productionQueue.length === 0) return null;

    const cancel = (index: number) => {
        soundService.play('click');
        dispatch({ type: 'CANCEL_PRODUCTION', payload: { buildingId: producer.id, index } });
    };

    return (
        <div className="w-full mt-4">
            <h4 className="section-title">Queue <span className="text-gray-500 normal-case tracking-normal">(click to cancel and refund)</span></h4>
            <div className="flex flex-wrap gap-1.5 mt-2">
                {producer.productionQueue.map((item, index) => {
                    const config = ENTITY_CONFIGS[item];
                    const progress = index === 0 ? Math.min(1, producer.productionProgress / config.buildTime) : 0;
                    return (
                        <button
                            key={`${item}-${index}`}
                            className="queue-item"
                            title={`Cancel ${config.name} (refund $${config.cost})`}
                            onClick={() => cancel(index)}
                            onContextMenu={(e) => { e.preventDefault(); cancel(index); }}
                        >
                            <EntityIcon type={item} size="full" />
                            {index === 0 && <div className="queue-progress" style={{ width: `${progress * 100}%` }} />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const UnitCommands = ({ dispatch }: { dispatch: React.Dispatch<GameAction> }) => (
    <div className="flex gap-2 mt-3 w-full">
        <button className="btn-ra btn-small flex-1" onClick={() => { soundService.play('click'); dispatch({ type: 'STOP_UNITS' }); }}>
            Stop <kbd>X</kbd>
        </button>
        <button className="btn-ra btn-small flex-1" onClick={() => { soundService.play('click'); dispatch({ type: 'HOLD_POSITION' }); }}>
            Hold <kbd>H</kbd>
        </button>
    </div>
);

const SelectionPanel = ({ state, dispatch, setPlacingBuildingType, playerState }: { state: GameState, dispatch: React.Dispatch<GameAction>, setPlacingBuildingType: (type: BuildingType | null) => void, playerState: PlayerState }) => {
    const { selectedIds, entities } = state;

    if (selectedIds.length === 0) {
        return <div className="p-4 text-center text-gray-500 text-sm tracking-wider">NO SELECTION</div>;
    }

    if (selectedIds.length === 1) {
        const entity = entities[selectedIds[0]];
        if (!entity) return null;
        if (entity.playerId !== HUMAN_PLAYER_ID) return <div className="p-4 text-center text-red-400 text-sm tracking-wider">HOSTILE FORCES</div>;

        const config = ENTITY_CONFIGS[entity.type];
        const playerEntities = Object.values(entities).filter(e => e.playerId === HUMAN_PLAYER_ID);
        const { producibleUnits, producibleBuildings } = getProducibleItems(playerState, playerEntities);

        const building = 'isPowered' in entity ? (entity as Building) : null;
        const unit = building ? null : (entity as Unit);

        let producibleItems: (UnitType | BuildingType)[] = [];
        if (building && !building.isConstructing) {
            producibleItems = [...producibleUnits, ...producibleBuildings].filter(item => ENTITY_CONFIGS[item].producedBy === entity.type);
        }

        const hpRatio = entity.hp / entity.maxHp;

        return (
            <div className="p-4 flex flex-col items-center">
                <div className="w-24 h-24 mb-2"><EntityIcon type={entity.type} size="full" team={TEAM_COLORS[0]} /></div>
                <h3 className="text-lg font-bold tracking-wider text-yellow-200">{config.name}</h3>
                <div className="w-full mt-2 hp-bar-lg"><div style={{ width: `${hpRatio * 100}%`, background: hpRatio > 0.6 ? '#3ddc4a' : hpRatio > 0.3 ? '#f4c20d' : '#e0242b' }} /></div>
                <p className="text-xs text-gray-400 mt-1">{Math.ceil(entity.hp)} / {entity.maxHp}</p>
                {building?.isConstructing && <p className="text-yellow-300 font-bold text-sm mt-2 tracking-widest">CONSTRUCTING {Math.floor(hpRatio * 100)}%</p>}
                {building && !building.isConstructing && !building.isPowered && <p className="text-red-400 font-bold mt-2 tracking-widest animate-pulse">LOW POWER</p>}
                {unit && unit.holdPosition && <p className="text-cyan-300 text-xs mt-2 tracking-widest">HOLDING POSITION</p>}
                {unit && <UnitCommands dispatch={dispatch} />}

                {producibleItems.length > 0 && building && (
                    <div className="grid grid-cols-3 gap-x-1 gap-y-3 mt-4">
                        {producibleItems.map(item => {
                            if (Object.values(UnitType).includes(item as UnitType)) {
                                return <ProductionButton key={item} itemType={item} producer={building} dispatch={dispatch} playerState={playerState} playerEntities={playerEntities} />;
                            }
                            return <BuildButton key={item} itemType={item as BuildingType} setPlacingBuildingType={setPlacingBuildingType} playerState={playerState} playerEntities={playerEntities} />;
                        })}
                    </div>
                )}

                {building && !building.isConstructing && <QueueStrip producer={building} dispatch={dispatch} />}
            </div>
        );
    }

    // Multiple selection
    return (
        <div className="p-4">
            <h3 className="section-title mb-2">Selected units ({selectedIds.length})</h3>
            <div className="grid grid-cols-4 gap-1">
                {selectedIds.slice(0, 16).map(id => { // Limit to showing 16 icons
                    const entity = entities[id];
                    if (!entity || entity.playerId !== HUMAN_PLAYER_ID) return null;
                    return (
                        <div key={id} className="w-14 h-14">
                           <EntityIcon type={entity.type} size="full" team={TEAM_COLORS[0]} />
                        </div>
                    );
                })}
            </div>
            <UnitCommands dispatch={dispatch} />
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
        return <aside className="sidebar w-80 h-screen flex-shrink-0" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}></aside>;
    }

    const humanPlayerEntities = Object.values(state.entities).filter(e => e.playerId === playerState.id);
    const hasHQ = humanPlayerEntities.some(e => e.type === BuildingType.HQ);

    return (
        <aside className="sidebar w-80 h-screen flex flex-col flex-shrink-0" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <div className="p-2">
                <div className="radar-bezel">
                    <div className="radar-label">RADAR</div>
                    {hasHQ
                        ? <Minimap state={state} viewportSize={viewportSize} onMinimapClick={handleMinimapClick} />
                        : <div className="radar-offline">RADAR OFFLINE</div>}
                </div>
            </div>
            <SidebarHeader playerState={playerState} />
            <div className="flex-grow overflow-y-auto sidebar-scroll">
                <SelectionPanel state={state} dispatch={dispatch} setPlacingBuildingType={setPlacingBuildingType} playerState={playerState}/>
            </div>
        </aside>
    );
};
