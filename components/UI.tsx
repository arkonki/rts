
import React, { useState } from 'react';
import { AIDifficulty, GameStatus, AIType, AIPersonality, AIConfiguration, PlayerState, BuildingType } from '../types';
import { soundService } from '../services/soundService';
import { EntityIcon } from './icons';
import { ENTITY_CONFIGS } from '../constants';

const MenuButton = ({ onClick, children, disabled=false, small=false }: { onClick: () => void, children: React.ReactNode, disabled?: boolean, small?: boolean }) => (
    <button 
        onClick={() => { if(!disabled) { soundService.play('click'); onClick(); } }} 
        disabled={disabled} 
        className={`w-full px-4 ${small ? 'py-2 text-base' : 'py-3 text-xl'} bg-gray-800 border-2 border-cyan-400 text-cyan-300 font-bold rounded-sm shadow-lg hover:bg-cyan-900 hover:text-white transition-all duration-200 disabled:bg-gray-800/50 disabled:border-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed`}>
        {children}
    </button>
);

const OpponentConfigurator = ({ config, onUpdate, onRemove }: { config: AIConfiguration, onUpdate: (newConfig: AIConfiguration) => void, onRemove: () => void }) => {
    return (
        <div className="p-4 bg-gray-800/50 border border-gray-600 rounded-lg w-full md:w-[450px]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">{config.id}</h3>
                <button onClick={onRemove} className="px-3 py-1 text-sm bg-red-800 hover:bg-red-700 border border-red-500 rounded text-white">Remove</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <label className="block text-gray-400 mb-1">Type</label>
                    <select value={config.type} onChange={e => onUpdate({...config, type: e.target.value as AIType, apiKey: e.target.value === 'LOCAL' ? null : config.apiKey })} className="w-full p-2 bg-gray-900 border border-gray-500 rounded text-white">
                        <option value="LOCAL">Local AI</option>
                        <option value="GEMINI">Gemini AI</option>
                    </select>
                </div>
                <div>
                    <label className="block text-gray-400 mb-1">Personality</label>
                    <select value={config.personality} onChange={e => onUpdate({...config, personality: e.target.value as AIPersonality})} className="w-full p-2 bg-gray-900 border border-gray-500 rounded text-white">
                        <option value="BALANCED">Balanced</option>
                        <option value="AGGRESSIVE">Aggressive</option>
                        <option value="ECONOMIC">Economic</option>
                    </select>
                </div>
                <div className="md:col-span-2">
                     <label className="block text-gray-400 mb-1">Difficulty</label>
                    <select value={config.difficulty} onChange={e => onUpdate({...config, difficulty: e.target.value as AIDifficulty})} className="w-full p-2 bg-gray-900 border border-gray-500 rounded text-white">
                        <option value="EASY">Easy</option>
                        <option value="NORMAL">Normal</option>
                        <option value="HARD">Hard</option>
                    </select>
                </div>

                {config.type === 'GEMINI' && (
                    <div className="md:col-span-2">
                         <label className="block text-gray-400 mb-1">Gemini API Key (Optional)</label>
                         <input
                            type="password"
                            placeholder="Leave empty to use default key"
                            value={config.apiKey || ''}
                            onChange={(e) => onUpdate({...config, apiKey: e.target.value})}
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-500 rounded text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export const MainMenu = ({ onStartGame }: { onStartGame: (options: { opponents: AIConfiguration[] }) => void }) => {
    const [opponents, setOpponents] = useState<AIConfiguration[]>([
        { id: 'AI_1', type: 'LOCAL', personality: 'BALANCED', difficulty: 'NORMAL', apiKey: null }
    ]);
    
    const addOpponent = () => {
        soundService.init(); // Initialize on first user action
        if(opponents.length < 3) {
            const newId: AIPersonality = `AI_${opponents.length + 1}` as AIPersonality;
            setOpponents([...opponents, { id: newId, type: 'LOCAL', personality: 'BALANCED', difficulty: 'NORMAL', apiKey: null }]);
        }
    };

    const updateOpponent = (index: number, newConfig: AIConfiguration) => {
        const newOpponents = [...opponents];
        newOpponents[index] = newConfig;
        setOpponents(newOpponents);
    };

    const removeOpponent = (index: number) => {
        const newOpponents = opponents.filter((_, i) => i !== index);
        // Re-assign IDs to keep them sequential
        const reindexedOpponents = newOpponents.map((opp, i) => ({ ...opp, id: `AI_${i + 1}`}));
        setOpponents(reindexedOpponents);
    };
    
    const handleStart = () => {
        onStartGame({ opponents });
    };

    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-black text-white p-4 overflow-y-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-red-500 mb-4" style={{ textShadow: '2px 2px 8px rgba(0,255,255,0.5)' }}>Gemini RTS</h1>
            <h2 className="text-2xl text-center font-semibold text-white mb-6">Opponent Setup</h2>

            <div className="flex flex-col items-center space-y-4 w-full max-w-lg mb-6">
                {opponents.map((opp, index) => (
                    <OpponentConfigurator 
                        key={index} 
                        config={opp} 
                        onUpdate={(newConfig) => updateOpponent(index, newConfig)}
                        onRemove={() => removeOpponent(index)}
                    />
                ))}
                {opponents.length < 3 && (
                    <button onClick={addOpponent} className="w-full md:w-[450px] py-2 border-2 border-dashed border-gray-500 text-gray-400 hover:border-cyan-400 hover:text-cyan-400 transition-colors rounded-lg">
                        + Add Opponent
                    </button>
                )}
            </div>
            
            <div className="w-full md:w-[450px]">
                 <MenuButton onClick={handleStart} disabled={opponents.length === 0}>Start Game</MenuButton>
            </div>
           
            <p className="text-gray-500 mt-8">A classic RTS experience</p>
        </div>
    );
};

export const GameOverScreen = ({ status, onRestart, onMainMenu }: { status: GameStatus, onRestart: () => void, onMainMenu: () => void }) => (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-black/80 text-white space-y-6">
        <h1 className={`text-7xl font-bold ${status === 'PLAYER_WIN' ? 'text-green-400' : 'text-red-500'}`}>
            {status === 'PLAYER_WIN' ? 'VICTORY' : 'DEFEAT'}
        </h1>
        <div className="flex flex-col space-y-4 md:w-80">
            <MenuButton onClick={onRestart}>Play Again</MenuButton>
            <MenuButton onClick={onMainMenu}>Main Menu</MenuButton>
        </div>
    </div>
);

export const PauseMenu = ({ onResume, onRestart, onShowControls, onMainMenu }: { onResume: () => void, onRestart: () => void, onShowControls: () => void, onMainMenu: () => void }) => (
     <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50">
        <div className="flex flex-col space-y-4 p-8 bg-gray-900 border-2 border-gray-700 rounded-lg md:w-80">
            <h2 className="text-4xl font-bold text-center mb-4 text-white">Paused</h2>
            <MenuButton onClick={onResume}>Resume</MenuButton>
            <MenuButton onClick={onShowControls}>Controls</MenuButton>
            <MenuButton onClick={onRestart}>Restart</MenuButton>
            <MenuButton onClick={onMainMenu}>Main Menu</MenuButton>
        </div>
    </div>
);

export const ControlsModal = ({ onClose }: { onClose: () => void }) => (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-gray-900 border-2 border-gray-700 rounded-lg p-8 max-w-lg w-full text-white" onClick={e => e.stopPropagation()}>
            <h2 className="text-3xl font-bold mb-6 text-center">Controls</h2>
            <ul className="space-y-3">
                <li className="flex justify-between"><span>Select Unit/Building</span> <span className="font-bold text-cyan-400">Left Click</span></li>
                <li className="flex justify-between"><span>Add to Selection</span> <span className="font-bold text-cyan-400">Shift + Left Click</span></li>
                <li className="flex justify-between"><span>Select Multiple Units</span> <span className="font-bold text-cyan-400">Drag Left Mouse</span></li>
                <li className="flex justify-between"><span>Move / Attack Target</span> <span className="font-bold text-cyan-400">Right Click</span></li>
                <li className="flex justify-between"><span>Attack-Move</span> <span className="font-bold text-cyan-400">A + Left Click</span></li>
                <li className="flex justify-between"><span>Set Rally Point</span> <span className="font-bold text-cyan-400">Right Click on Map</span></li>
                <li className="flex justify-between"><span>Cancel Action</span> <span className="font-bold text-cyan-400">Escape Key</span></li>
                <li className="flex justify-between"><span>Scroll Map</span> <span className="font-bold text-cyan-400">Mouse to Screen Edge</span></li>
            </ul>
             <div className="text-center mt-8">
                <button onClick={onClose} className="px-8 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded">Close</button>
            </div>
        </div>
    </div>
);

export const SuperweaponIndicator = ({ playerState, onActivate }: { playerState: PlayerState, onActivate: () => void }) => {
    if (!playerState.superweapon) return null;

    const { type, isReady, cooldown } = playerState.superweapon;
    const config = ENTITY_CONFIGS[type];
    const minutes = Math.floor(cooldown / 60000);
    const seconds = ((cooldown % 60000) / 1000).toFixed(0).padStart(2, '0');

    const buttonClasses = isReady
        ? "border-yellow-400 bg-yellow-900/50 hover:bg-yellow-800/80 text-yellow-300 animate-pulse"
        : "border-gray-600 bg-gray-800/80 text-gray-400 cursor-default";

    return (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
            <button
                onClick={isReady ? onActivate : undefined}
                className={`flex items-center space-x-3 px-4 py-2 rounded-md border-2 transition-all ${buttonClasses}`}
            >
                <div className="w-8 h-8">
                    <EntityIcon type={type} size="full" />
                </div>
                <div className="text-left">
                    <div className="font-bold">{config.name}</div>
                    <div className="text-lg font-mono">
                        {isReady ? 'READY' : `${minutes}:${seconds}`}
                    </div>
                </div>
            </button>
        </div>
    );
};
