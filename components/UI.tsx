import React, { useState, useEffect } from 'react';
import { AIDifficulty, GameStatus, AIPersonality, AIConfiguration, PlayerState, PlayerStats, GameAlert, Position } from '../types';
import { soundService } from '../services/soundService';
import { EntityIcon } from './icons';
import { ENTITY_CONFIGS, TEAM_COLORS } from '../constants';
import { GameAction } from '../state/actions';

const MenuButton = ({ onClick, children, disabled=false, small=false }: { onClick: () => void, children: React.ReactNode, disabled?: boolean, small?: boolean }) => (
    <button 
        onClick={() => { if(!disabled) { soundService.play('click'); onClick(); } }} 
        disabled={disabled} 
        className={`btn-ra w-full ${small ? 'btn-small' : 'btn-large'}`}>
        {children}
    </button>
);

const RedStar = ({ size = 72 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true">
        <circle r={11} fill="#7a0d12" stroke="#f2c14e" strokeWidth={0.8} />
        <path d="M0 -8.500 l2.500 5.500 l6 .6 l-4.500 4 l1.300 5.900 l-5.300 -3.100 l-5.300 3.100 l1.300 -5.900 l-4.500 -4 l6 -.6z" fill="#f2c14e" />
    </svg>
);

const PERSONALITY_BLURB: Record<AIPersonality, string> = {
    BALANCED: 'Steady economy and a mixed army.',
    AGGRESSIVE: 'Rushes early with cheap units.',
    ECONOMIC: 'Booms first, then strikes with heavy armour.',
};

const OpponentConfigurator = ({ config, index, onUpdate, onRemove }: { config: AIConfiguration, index: number, onUpdate: (newConfig: AIConfiguration) => void, onRemove: () => void }) => {
    return (
        <div className="panel p-4 w-full md:w-[450px]">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 rounded-sm border border-black/60" style={{ background: TEAM_COLORS[index + 1] }} />
                    <h3 className="text-lg font-bold tracking-wider text-yellow-100">{config.id.replace('_', ' ')}</h3>
                </div>
                <button onClick={onRemove} className="btn-ra btn-small btn-danger">Remove</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <label className="block text-gray-400 mb-1 text-xs tracking-widest">PERSONALITY</label>
                    <select value={config.personality} onChange={e => onUpdate({...config, personality: e.target.value as AIPersonality})} className="select-ra">
                        <option value="BALANCED">Balanced</option>
                        <option value="AGGRESSIVE">Aggressive</option>
                        <option value="ECONOMIC">Economic</option>
                    </select>
                </div>
                <div>
                     <label className="block text-gray-400 mb-1 text-xs tracking-widest">DIFFICULTY</label>
                    <select value={config.difficulty} onChange={e => onUpdate({...config, difficulty: e.target.value as AIDifficulty})} className="select-ra">
                        <option value="EASY">Easy</option>
                        <option value="NORMAL">Normal</option>
                        <option value="HARD">Hard</option>
                    </select>
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{PERSONALITY_BLURB[config.personality]}</p>
        </div>
    );
};

export const MainMenu = ({ onStartGame }: { onStartGame: (options: { opponents: AIConfiguration[] }) => void }) => {
    const [opponents, setOpponents] = useState<AIConfiguration[]>([
        { id: 'AI_1', personality: 'BALANCED', difficulty: 'NORMAL' }
    ]);
    const [soundsLoading, setSoundsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);

    useEffect(() => {
        soundService.preloadSounds((progress) => {
            setLoadingProgress(progress);
        }).then(() => {
            setSoundsLoading(false);
        });
    }, []);
    
    const addOpponent = () => {
        soundService.init(); // Initialize on first user action
        if(opponents.length < 3) {
            const newId: AIPersonality = `AI_${opponents.length + 1}` as AIPersonality;
            setOpponents([...opponents, { id: newId, personality: 'BALANCED', difficulty: 'NORMAL' }]);
        }
    };

    const updateOpponent = (index: number, newConfig: AIConfiguration) => {
        soundService.init(); // Also treat this as a user interaction
        const newOpponents = [...opponents];
        newOpponents[index] = newConfig;
        setOpponents(newOpponents);
    };

    const removeOpponent = (index: number) => {
        soundService.init(); // Also treat this as a user interaction
        const newOpponents = opponents.filter((_, i) => i !== index);
        // Re-assign IDs to keep them sequential
        const reindexedOpponents = newOpponents.map((opp, i) => ({ ...opp, id: `AI_${i + 1}`}));
        setOpponents(reindexedOpponents);
    };
    
    const handleStart = () => {
        soundService.init(); // Ensure initialized before starting game
        onStartGame({ opponents });
    };

    return (
        <div className="menu-backdrop w-screen h-screen flex flex-col items-center justify-center text-white p-4 overflow-y-auto">
            <div className="flex items-center gap-4 mb-1">
                <RedStar />
                <h1 className="title-metal text-6xl md:text-7xl font-black tracking-widest">AI RTS</h1>
            </div>
            <h2 className="text-xl md:text-2xl tracking-[0.5em] text-red-500 font-bold mb-8" style={{ textShadow: '0 0 12px rgba(224,36,43,0.6)' }}>RED ALERT</h2>

            <div className="flex flex-col items-center space-y-4 w-full max-w-lg mb-6">
                <h3 className="section-title self-start md:self-center">Opponent setup</h3>
                {opponents.map((opp, index) => (
                    <OpponentConfigurator 
                        key={index} 
                        index={index}
                        config={opp} 
                        onUpdate={(newConfig) => updateOpponent(index, newConfig)}
                        onRemove={() => removeOpponent(index)}
                    />
                ))}
                {opponents.length < 3 && (
                    <button onClick={addOpponent} className="w-full md:w-[450px] py-2 border-2 border-dashed border-gray-600 text-gray-400 hover:border-yellow-400 hover:text-yellow-300 transition-colors rounded-sm tracking-widest text-sm">
                        + ADD OPPONENT
                    </button>
                )}
            </div>
            
            <div className="w-full md:w-[450px]">
                 <MenuButton onClick={handleStart} disabled={opponents.length === 0 || soundsLoading}>
                    {soundsLoading ? `Loading assets... ${Math.round(loadingProgress)}%` : 'Start game'}
                 </MenuButton>
            </div>
           
            <p className="text-gray-600 mt-8 text-xs tracking-widest">BUILD · DEFEND · DESTROY THE ENEMY HQ</p>
        </div>
    );
};

export const GameOverScreen = ({ status, gameSummary, onRestart, onMainMenu }: { status: GameStatus, gameSummary: Record<string, PlayerStats> | null, onRestart: () => void, onMainMenu: () => void }) => (
    <div className="menu-backdrop w-screen h-screen flex flex-col items-center justify-center text-white p-4 z-50 absolute inset-0" style={{ background: 'rgba(5,6,8,0.88)' }}>
        <div className="w-full max-w-4xl flex flex-col items-center space-y-6">
            <h1 className={`text-7xl font-black tracking-widest ${status === 'PLAYER_WIN' ? 'text-green-400' : 'text-red-500'}`} style={{ textShadow: '0 0 22px currentColor' }}>
                {status === 'PLAYER_WIN' ? 'VICTORY' : 'DEFEAT'}
            </h1>
            
            {gameSummary && (
                <div className="panel w-full p-6">
                    <h2 className="section-title text-center mb-4">After-action report</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-gray-300">
                        {Object.entries(gameSummary).sort(([pIdA], [pIdB]) => pIdA === 'PLAYER_1' ? -1 : (pIdB === 'PLAYER_1' ? 1 : pIdA.localeCompare(pIdB))).map(([playerId, stats], index) => (
                            <div key={playerId} className="panel-inset p-4">
                                <h3 className="text-lg font-bold mb-3 tracking-wider" style={{ color: TEAM_COLORS[index] }}>{playerId.replace('_', ' ')}</h3>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex justify-between"><span>Kills</span> <span className="font-bold text-white">{stats.enemiesKilled}</span></li>
                                    <li className="flex justify-between"><span>Losses</span> <span className="font-bold text-white">{stats.unitsLost}</span></li>
                                    <li className="flex justify-between"><span>Credits earned</span> <span className="font-bold text-yellow-300">{stats.creditsEarned}</span></li>
                                    <li className="flex justify-between"><span>Units built</span> <span className="font-bold text-white">{Object.values(stats.unitsBuilt).reduce((a, b) => a + (b ?? 0), 0)}</span></li>
                                    <li className="flex justify-between"><span>Buildings built</span> <span className="font-bold text-white">{Object.values(stats.buildingsConstructed).reduce((a, b) => a + (b ?? 0), 0)}</span></li>
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col space-y-3 w-full md:w-80">
                <MenuButton onClick={onRestart}>Play again</MenuButton>
                <MenuButton onClick={onMainMenu}>Main menu</MenuButton>
            </div>
        </div>
    </div>
);

export const PauseMenu = ({ onResume, onRestart, onShowControls, onMainMenu }: { onResume: () => void, onRestart: () => void, onShowControls: () => void, onMainMenu: () => void }) => (
     <div className="absolute inset-0 flex flex-col items-center justify-center z-50" style={{ background: 'rgba(4,6,8,0.75)' }}>
        <div className="panel flex flex-col space-y-3 p-8 md:w-80">
            <h2 className="text-3xl font-black text-center mb-2 tracking-[0.3em] text-yellow-100">PAUSED</h2>
            <MenuButton onClick={onResume}>Resume</MenuButton>
            <MenuButton onClick={onShowControls}>Controls</MenuButton>
            <MenuButton onClick={onRestart}>Restart</MenuButton>
            <MenuButton onClick={onMainMenu}>Main menu</MenuButton>
        </div>
    </div>
);

const CONTROLS: Array<[string, string]> = [
    ['Select unit / building', 'Left click'],
    ['Add to selection', 'Shift + left click'],
    ['Box select', 'Drag left mouse'],
    ['Move / attack target', 'Right click'],
    ['Repair (with Engineer)', 'Right click on friendly'],
    ['Attack-move', 'Q, then left click'],
    ['Stop', 'X'],
    ['Hold position', 'H'],
    ['Set rally point', 'Right click on map (building selected)'],
    ['Set / recall control group', 'Ctrl + 1-9 / 1-9'],
    ['Centre on control group', 'Double-tap 1-9'],
    ['Cancel queued item', 'Click or right-click it'],
    ['Cancel action', 'Esc'],
    ['Scroll map', 'Screen edge, arrows or WASD'],
];

export const ControlsModal = ({ onClose }: { onClose: () => void }) => (
    <div className="absolute inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(4,6,8,0.75)' }} onClick={onClose}>
        <div className="panel p-8 max-w-xl w-full text-white" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black mb-6 text-center tracking-[0.3em] text-yellow-100">CONTROLS</h2>
            <ul className="space-y-2 text-sm">
                {CONTROLS.map(([action, keys]) => (
                    <li key={action} className="flex justify-between gap-4 border-b border-white/5 pb-1">
                        <span className="text-gray-300">{action}</span>
                        <span className="font-bold text-yellow-300 text-right">{keys}</span>
                    </li>
                ))}
            </ul>
            <div className="text-center mt-8 w-40 mx-auto">
                <MenuButton onClick={onClose} small>Close</MenuButton>
            </div>
        </div>
    </div>
);

export const SuperweaponIndicator = ({ playerState, onActivate }: { playerState: PlayerState, onActivate: () => void }) => {
    if (!playerState.superweapon) return null;

    const { type, isReady, cooldown } = playerState.superweapon;
    const config = ENTITY_CONFIGS[type];
    const total = config.superweaponCooldown ?? 1;
    const minutes = Math.floor(cooldown / 60000);
    const seconds = ((cooldown % 60000) / 1000).toFixed(0).padStart(2, '0');

    return (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
            <button
                onClick={isReady ? onActivate : undefined}
                className={`superweapon ${isReady ? 'superweapon-ready' : ''}`}
            >
                <div className="w-10 h-10">
                    <EntityIcon type={type} size="full" />
                </div>
                <div className="text-left">
                    <div className="font-bold text-sm tracking-wider">{config.name}</div>
                    <div className="led led-gold text-lg">
                        {isReady ? 'READY' : `${minutes}:${seconds}`}
                    </div>
                    {!isReady && <div className="superweapon-charge"><div style={{ width: `${(1 - cooldown / total) * 100}%` }} /></div>}
                </div>
            </button>
        </div>
    );
};

export const ControlGroupsBar = ({ controlGroups, dispatch }: { controlGroups: Record<string, string[]>, dispatch: React.Dispatch<GameAction>}) => {
    const [lastClick, setLastClick] = useState({key: '', time: 0});
    
    const handleGroupClick = (key: string) => {
        const now = Date.now();
        if(lastClick.key === key && now - lastClick.time < 300) {
            dispatch({ type: 'SELECT_AND_CENTER_CONTROL_GROUP', payload: { key } });
        } else {
            dispatch({ type: 'SELECT_CONTROL_GROUP', payload: { key } });
        }
        setLastClick({key, time: now});
        soundService.play('click', 0.3);
    };

    return (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex space-x-1.5 panel p-1.5">
            {Array.from({ length: 9 }, (_, i) => i + 1).map(num => {
                const key = String(num);
                const groupExists = controlGroups[key] && controlGroups[key].length > 0;
                return (
                    <button 
                        key={key} 
                        onClick={() => handleGroupClick(key)}
                        className={`group-key ${groupExists ? 'group-key-active' : ''}`}
                    >
                        {key}
                    </button>
                )
            })}
        </div>
    );
};

/** Flashing banner while the player's forces are being attacked. Click to jump to the action. */
export const AlertBanner = ({ alerts, onJump }: { alerts: GameAlert[], onJump: (position: Position) => void }) => {
    if (alerts.length === 0) return null;
    const latest = alerts[alerts.length - 1];
    return (
        <button className="alert-banner" onClick={() => onJump(latest.position)}>
            ⚠ UNDER ATTACK ⚠
        </button>
    );
};
