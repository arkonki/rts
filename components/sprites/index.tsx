import React from 'react';
import { BuildingType, UnitType } from '../../types';
import { makePalette } from './palette';
import { UnitSprite } from './UnitSprites';
import { BuildingSprite } from './BuildingSprites';

/** Shared gradients and filters used by every sprite. Render once near the root of the app. */
export const SpriteDefs = () => (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
            <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#d4dadf" />
                <stop offset="0.5" stopColor="#8a949c" />
                <stop offset="1" stopColor="#4a525a" />
            </linearGradient>
            <linearGradient id="concrete" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#9a9fa5" />
                <stop offset="1" stopColor="#62676e" />
            </linearGradient>
            <linearGradient id="glassBlue" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#d3f0ff" />
                <stop offset="1" stopColor="#2d78b6" />
            </linearGradient>
            <linearGradient id="waterPad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3d84c4" />
                <stop offset="1" stopColor="#1d4f82" />
            </linearGradient>
            <radialGradient id="tankShade" cx="0.35" cy="0.3" r="0.9">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
                <stop offset="0.6" stopColor="#000000" stopOpacity="0" />
                <stop offset="1" stopColor="#000000" stopOpacity="0.35" />
            </radialGradient>
            <radialGradient id="envelopeShade" cx="0.35" cy="0.3" r="0.9">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
                <stop offset="0.55" stopColor="#000000" stopOpacity="0" />
                <stop offset="1" stopColor="#000000" stopOpacity="0.45" />
            </radialGradient>
            <radialGradient id="sphere" cx="0.35" cy="0.3" r="0.8">
                <stop offset="0" stopColor="#f5f3ff" />
                <stop offset="0.45" stopColor="#a78bfa" />
                <stop offset="1" stopColor="#4c1d95" />
            </radialGradient>
            <radialGradient id="glowCyan">
                <stop offset="0" stopColor="#f0ffff" />
                <stop offset="0.4" stopColor="#22d3ee" />
                <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="glowOrange">
                <stop offset="0" stopColor="#fff6c8" />
                <stop offset="0.45" stopColor="#ff9a1f" />
                <stop offset="1" stopColor="#ff4d00" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="glowYellow">
                <stop offset="0" stopColor="#fffbe0" />
                <stop offset="0.5" stopColor="#facc15" />
                <stop offset="1" stopColor="#facc15" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="glowPurple">
                <stop offset="0" stopColor="#c4b5fd" stopOpacity="0.9" />
                <stop offset="1" stopColor="#7c3aed" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="glowRed">
                <stop offset="0" stopColor="#ff8a7a" />
                <stop offset="0.5" stopColor="#dc2626" />
                <stop offset="1" stopColor="#7f1d1d" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="gem" cx="0.3" cy="0.3" r="0.8">
                <stop offset="0" stopColor="#fffbe6" />
                <stop offset="0.45" stopColor="#fbbf24" />
                <stop offset="1" stopColor="#b45309" />
            </radialGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
    </svg>
);

export const BUILDING_TYPES = new Set<string>(Object.values(BuildingType));

interface EntitySpriteProps {
    type: UnitType | BuildingType;
    /** Team colour as #rrggbb. */
    team: string;
}

/** The artwork for any unit or building, filling its parent. Units face up. */
export const EntitySprite = React.memo(({ type, team }: EntitySpriteProps) => {
    const palette = makePalette(team);
    return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }}>
            {BUILDING_TYPES.has(type)
                ? <BuildingSprite type={type as BuildingType} palette={palette} />
                : <UnitSprite type={type as UnitType} palette={palette} />}
        </svg>
    );
});
