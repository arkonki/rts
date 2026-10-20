import React from 'react';
import { GameState, ChronoVortexEffect, NukeImpactEffect, DamageTextEffect, RepairTextEffect, AttackVisualEffect, ExplosionEffect, UnitType, Position } from '../types';
import { hashString } from './sprites/palette';

const DamageText = ({ effect }: { effect: DamageTextEffect | RepairTextEffect }) => {
    const color = effect.type === 'DAMAGE_TEXT' ? '#ff5148' : '#4ade80';
    return (
        <div
            className="absolute font-bold text-base pointer-events-none -translate-x-1/2 damage-text-animate"
            style={{ left: effect.position.x, top: effect.position.y, color, zIndex: 40, textShadow: '0 0 3px #000, 0 1px 2px #000, 1px 0 2px #000' }}
        >
            {effect.text}
        </div>
    );
};

type WeaponStyle = 'bullet' | 'shell' | 'beam' | 'tesla' | 'missile';

const WEAPON_STYLE: Partial<Record<UnitType, WeaponStyle>> = {
    [UnitType.RIFLEMAN]: 'bullet',
    [UnitType.TESLA_TROOPER]: 'tesla',
    [UnitType.TANK]: 'shell',
    [UnitType.APOCALYPSE_TANK]: 'shell',
    [UnitType.DESTROYER]: 'shell',
    [UnitType.KIROV_AIRSHIP]: 'shell',
    [UnitType.PRISM_TANK]: 'beam',
    [UnitType.ROCKETEER]: 'missile',
    [UnitType.FIGHTER_JET]: 'missile',
    [UnitType.SEA_SCORPION]: 'missile',
};

const lerp = (a: Position, b: Position, t: number): Position => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** A jagged lightning path between two points; the shape is stable per effect id. */
function lightningPoints(from: Position, to: Position, seed: number): string {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const segments = Math.max(4, Math.round(length / 14));
    const points: string[] = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const jitter = i === 0 || i === segments ? 0 : ((((seed * 97 + i * 0.6180339) % 1) - 0.5) * 16);
        points.push(`${from.x + dx * t + nx * jitter},${from.y + dy * t + ny * jitter}`);
    }
    return points.join(' ');
}

const AttackVisual = ({ effect, state }: { effect: AttackVisualEffect, state: GameState }) => {
    const attacker = state.entities[effect.attackerId];
    const target = state.entities[effect.targetId];
    if (!attacker || !target) return null;

    const style = WEAPON_STYLE[attacker.type as UnitType] ?? 'bullet';
    const from = attacker.position;
    const to = target.position;
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const dir = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
    const muzzle = { x: from.x + dir.x * Math.min(attacker.size * 0.6, length), y: from.y + dir.y * Math.min(attacker.size * 0.6, length) };
    const seed = hashString(effect.id);

    return (
        <svg className="absolute pointer-events-none top-0 left-0 attack-visual-animate" style={{ width: '100%', height: '100%', zIndex: 15, overflow: 'visible' }}>
            {style === 'bullet' && (
                <>
                    <line x1={muzzle.x} y1={muzzle.y} x2={to.x} y2={to.y} stroke="#ffe9a0" strokeWidth={1.6} strokeDasharray="5 11" strokeLinecap="round" />
                    <circle cx={muzzle.x} cy={muzzle.y} r={4} fill="url(#glowOrange)" />
                </>
            )}
            {style === 'shell' && (
                <>
                    <line x1={muzzle.x} y1={muzzle.y} x2={to.x} y2={to.y} stroke="#ffb347" strokeWidth={2.4} strokeDasharray="14 16" strokeLinecap="round" filter="url(#glow)" />
                    <circle cx={muzzle.x} cy={muzzle.y} r={11} fill="url(#glowOrange)" />
                </>
            )}
            {style === 'beam' && (
                <>
                    <line x1={muzzle.x} y1={muzzle.y} x2={to.x} y2={to.y} stroke="#22d3ee" strokeWidth={7} strokeOpacity={0.35} strokeLinecap="round" />
                    <line x1={muzzle.x} y1={muzzle.y} x2={to.x} y2={to.y} stroke="#e8ffff" strokeWidth={2.4} strokeLinecap="round" filter="url(#glow)" />
                    <circle cx={to.x} cy={to.y} r={12} fill="url(#glowCyan)" />
                </>
            )}
            {style === 'tesla' && (
                <>
                    <polyline points={lightningPoints(muzzle, to, seed)} fill="none" stroke="#38bdf8" strokeWidth={4} strokeOpacity={0.45} strokeLinejoin="round" />
                    <polyline points={lightningPoints(muzzle, to, seed)} fill="none" stroke="#f0fbff" strokeWidth={1.6} strokeLinejoin="round" filter="url(#glow)" />
                    <circle cx={to.x} cy={to.y} r={9} fill="url(#glowCyan)" />
                </>
            )}
            {style === 'missile' && (
                <>
                    <line x1={muzzle.x} y1={muzzle.y} x2={lerp(muzzle, to, 0.78).x} y2={lerp(muzzle, to, 0.78).y} stroke="#cfd5da" strokeWidth={3} strokeOpacity={0.55} strokeLinecap="round" />
                    <circle cx={lerp(muzzle, to, 0.8).x} cy={lerp(muzzle, to, 0.8).y} r={4} fill="url(#glowOrange)" />
                    <circle cx={muzzle.x} cy={muzzle.y} r={6} fill="url(#glowOrange)" />
                </>
            )}
        </svg>
    );
};

const Explosion = ({ effect }: { effect: ExplosionEffect }) => (
    <div
        className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{ left: effect.position.x, top: effect.position.y, width: effect.size * 3, height: effect.size * 3, zIndex: 22 }}
    >
        <div className="explosion-ring explosion-animate" />
        <div className="explosion-core explosion-animate" />
    </div>
);

const ChronoVortex = ({ effect }: { effect: ChronoVortexEffect }) => (
    <div className="absolute pointer-events-none" style={{ left: effect.position.x, top: effect.position.y, transform: 'translate(-50%, -50%)', zIndex: 30 }}>
        <div className="chrono-vortex" style={{ width: effect.size * 1.6, height: effect.size * 1.6 }} />
    </div>
);

const NukeImpact = ({ effect }: { effect: NukeImpactEffect }) => (
    <div className="absolute pointer-events-none" style={{ left: effect.position.x, top: effect.position.y, transform: 'translate(-50%, -50%)', zIndex: 50 }}>
        <div className="nuke-flash" style={{ width: 520, height: 520 }} />
        <div className="nuke-ring" style={{ width: 400, height: 400 }} />
        <div className="nuke-ring nuke-ring-late" style={{ width: 400, height: 400 }} />
    </div>
);

export const VisualEffectsLayer = React.memo(({ state }: { state: GameState }) => {
    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {state.visualEffects.map(effect => {
                switch (effect.type) {
                    case 'DAMAGE_TEXT':
                    case 'REPAIR_TEXT':
                        return <DamageText key={effect.id} effect={effect} />;
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
