import React from 'react';
import { BuildingType, UnitType } from '../types';
import { TEAM_COLORS } from '../constants';
import { GiTwoCoins, GiLightningStorm } from 'react-icons/gi';
import { EntitySprite } from './sprites';
import { cameoScale } from './sprites/scale';

export const CreditsIcon = () => (
    <div className="w-full h-full text-yellow-400">
        <GiTwoCoins className="w-full h-full" />
    </div>
);

export const PowerIcon = () => (
    <div className="w-full h-full text-cyan-400">
        <GiLightningStorm className="w-full h-full" />
    </div>
);

/** A cameo: the unit or building's artwork on a dark bevelled tile, as in the sidebar build menu. */
export const EntityIcon = ({ type, size = '10', team = TEAM_COLORS[0] }: { type: BuildingType | UnitType; size?: string; team?: string }) => {
    const sizeClass = size === 'full' ? 'w-full h-full' : `w-${size} h-${size}`;
    return (
        <div className={`cameo ${sizeClass}`}>
            <div className="w-full h-full" style={{ transform: `scale(${cameoScale(type)})` }}>
                <EntitySprite type={type} team={team} />
            </div>
        </div>
    );
};
