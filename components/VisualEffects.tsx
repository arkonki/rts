
import React from 'react';
import { GameState, VisualEffect, AttackVisualEffect, DamageTextEffect, ExplosionEffect, UnitType, ChronoVortexEffect, NukeImpactEffect, RepairTextEffect } from '../types';
import { ENTITY_CONFIGS } from '../constants';


const DamageText = ({ effect }: { effect: DamageTextEffect }) => (
    <div
        className="absolute text-red-500 font-bold text-lg pointer-events-none z-30 damage-text-animate"
        style={{ left: effect.position.x, top: effect.position.y, textShadow: '1px 1px 2px black' }}
    >
        {effect.text}
    </div>
);

const RepairText = ({ effect }: { effect: RepairTextEffect }) => (
    <div
        className="absolute text-green-400 font-bold text-lg pointer-events-none z-30 damage-text-animate"
        style={{ left: effect.position.x + 10, top: effect.position.y, textShadow: '1px 1px 2px black' }}
    >
        {effect.text}
    </div>
);

const AttackVisual = ({ effect, state }: { effect: AttackVisualEffect, state: GameState }) => {
    const attacker = state.entities[effect.attackerId];
    const target = state.entities[effect.targetId];

    if (!attacker || !target) return null;

    const attackerConfig = ENTITY_CONFIGS[attacker.type as UnitType];
    const isBeam = attackerConfig.name === 'Prism Tank' || attackerConfig.name === 'Tesla Trooper';

    return (
        <svg className="absolute w-full h-full pointer-events-none z-20 attack-visual-animate" style={{ left: 0, top: 0 }}>
            <line
                x1={attacker.position.x}
                y1={attacker.position.y}
                x2={target.position.x}
                y2={target.position.y}
                stroke={isBeam ? 'cyan' : 'rgba(255, 255, 100, 0.7)'}
                strokeWidth={isBeam ? 3 : 2}
                strokeDasharray={isBeam ? "none" : "4 2"}
            />
        </svg>
    );
};

const Explosion = ({ effect }: { effect: ExplosionEffect }) => (
    <div
        className="absolute rounded-full pointer-events-none z-30 explosion-animate"
        style={{
            left: effect.position.x,
            top: effect.position.y,
            width: effect.size,
            height: effect.size,
            background: 'radial-gradient(circle, rgba(255,255,150,0.8) 0%, rgba(255,100,0,0.5) 50%, rgba(200,0,0,0) 70%)',
            transform: 'translate(-50%, -50%)',
        }}
    />
);

const ChronoVortex = ({ effect }: { effect: ChronoVortexEffect }) => (
     <div className="absolute pointer-events-none z-30" style={{ left: effect.position.x, top: effect.position.y, transform: 'translate(-50%, -50%)' }}>
        <div 
            className="w-full h-full rounded-full border-4 border-cyan-400"
            style={{
                width: effect.size,
                height: effect.size,
                animation: 'spin 1.5s linear infinite, chrono-fade 1.5s ease-out forwards'
            }}
        />
        <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes chrono-fade { from { opacity: 1; transform: scale(0.1); } to { opacity: 0; transform: scale(1.2); } }
        `}</style>
    </div>
);

const NukeImpact = ({ effect }: { effect: NukeImpactEffect }) => (
    <div className="absolute pointer-events-none z-50" style={{ left: effect.position.x, top: effect.position.y, transform: 'translate(-50%, -50%)' }}>
        <div 
            className="w-[500px] h-[500px] rounded-full"
            style={{
                background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,200,100,0.8) 20%, rgba(255,100,0,0.6) 40%, rgba(50,0,0,0) 70%)',
                animation: 'nuke-flash 5s ease-out forwards'
            }}
        />
        <style>{`
            @keyframes nuke-flash { 
                0% { opacity: 0; transform: scale(0.1); } 
                2% { opacity: 1; transform: scale(0.2); }
                40% { opacity: 0.8; transform: scale(1); }
                100% { opacity: 0; transform: scale(0.8); } 
            }
        `}</style>
    </div>
);


export const VisualEffectsLayer = React.memo(({ state }: { state: GameState }) => {
    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {state.visualEffects.map(effect => {
                switch (effect.type) {
                    case 'DAMAGE_TEXT':
                        return <DamageText key={effect.id} effect={effect} />;
                    case 'REPAIR_TEXT':
                        return <RepairText key={effect.id} effect={effect} />;
                    case 'ATTACK_VISUAL':
                        return <AttackVisual key={effect.id} effect={effect} state={state} />;
                    case 'EXPLOSION':
                        return <Explosion key={effect.id} effect={effect} />;
                    case 'CHRONO_VORTEX':
                        return <ChronoVortex key={effect.id} effect={effect} />;
                    case 'NUKE_IMPACT':
                        return <NukeImpact key={effect.id} effect={effect} />;
                    default:
                        return null;
                }
            })}
        </div>
    );
});
