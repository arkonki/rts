import React from 'react';
import { GameState, ChronoVortexEffect, NukeImpactEffect, DamageTextEffect, RepairTextEffect, AttackVisualEffect, ExplosionEffect, UnitType } from '../types';

const DamageText = ({ effect }: { effect: DamageTextEffect | RepairTextEffect }) => {
    const color = effect.type === 'DAMAGE_TEXT' ? 'text-red-500' : 'text-green-500';
    const style = {
        left: effect.position.x,
        top: effect.position.y,
    };
    return (
        <div 
            className={`absolute ${color} font-bold text-lg pointer-events-none transform -translate-x-1/2 damage-text-animate z-20`} 
            style={style}
        >
            {effect.text}
        </div>
    );
};

const AttackVisual = ({ effect, state }: { effect: AttackVisualEffect, state: GameState }) => {
    const attacker = state.entities[effect.attackerId];
    const target = state.entities[effect.targetId];
    if (!attacker || !target) return null;
    
    const isBeam = attacker.type === UnitType.PRISM_TANK || attacker.type === UnitType.TESLA_TROOPER;
    const stroke = isBeam ? 'cyan' : 'yellow';
    const strokeWidth = isBeam ? 2 : 1.5;
    
    return (
        <svg className="absolute w-full h-full pointer-events-none z-10 top-0 left-0 attack-visual-animate">
            <line 
                x1={attacker.position.x} 
                y1={attacker.position.y} 
                x2={target.position.x} 
                y2={target.position.y} 
                stroke={stroke} 
                strokeWidth={strokeWidth}
                strokeDasharray={isBeam ? 'none' : '4 4'} 
            />
        </svg>
    );
};

const Explosion = ({ effect }: { effect: ExplosionEffect }) => {
    const style = {
        left: effect.position.x,
        top: effect.position.y,
        width: effect.size * 2,
        height: effect.size * 2,
    };
    return (
        <div 
            className="absolute bg-yellow-400 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 explosion-animate z-20"
            style={style}
        />
    );
};

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
                    case 'REPAIR_TEXT':
                        return <DamageText key={effect.id} effect={effect as DamageTextEffect | RepairTextEffect} />;
                    case 'ATTACK_VISUAL':
                        return <AttackVisual key={effect.id} effect={effect as AttackVisualEffect} state={state} />;
                    case 'EXPLOSION':
                        return <Explosion key={effect.id} effect={effect as ExplosionEffect} />;
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