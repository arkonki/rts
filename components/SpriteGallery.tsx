import React from 'react';
import { BuildingType, UnitType } from '../types';
import { ENTITY_CONFIGS, TEAM_COLORS } from '../constants';
import { EntitySprite, SpriteDefs } from './sprites';
import { EntityIcon } from './icons';
import { mapScale } from './sprites/scale';

const UNITS = Object.values(UnitType);
const BUILDINGS = Object.values(BuildingType);

/** Every sprite on one page, in each team colour, as cameos and as drawn on the map. Open with `?gallery`. */
export const SpriteGallery = () => (
    <div className="min-h-screen p-6 overflow-y-auto" style={{ background: '#3c4d2c', height: '100vh' }}>
        <SpriteDefs />
        <h1 className="text-2xl font-black tracking-widest text-yellow-100 mb-4">SPRITE GALLERY</h1>

        <h2 className="section-title mb-2">Buildings</h2>
        <div className="flex flex-wrap gap-6 mb-8">
            {BUILDINGS.map(type => (
                <div key={type} className="flex flex-col items-center gap-1">
                    <div className="flex gap-3">
                        {TEAM_COLORS.slice(0, 2).map(team => (
                            <div key={team} style={{ width: ENTITY_CONFIGS[type].size * 1.5, height: ENTITY_CONFIGS[type].size * 1.5 }}>
                                <EntitySprite type={type} team={team} />
                            </div>
                        ))}
                        <div className="w-20 h-20"><EntityIcon type={type} size="full" /></div>
                    </div>
                    <span className="text-xs text-white/80">{ENTITY_CONFIGS[type].name}</span>
                </div>
            ))}
        </div>

        <h2 className="section-title mb-2">Units (facing 0, 90, 200 degrees)</h2>
        <div className="flex flex-wrap gap-6">
            {UNITS.map(type => {
                const size = ENTITY_CONFIGS[type].size * mapScale(type) * 1.6;
                return (
                    <div key={type} className="flex flex-col items-center gap-1">
                        <div className="flex gap-3 items-center">
                            {[0, 90, 200].map((facing, i) => (
                                <div key={facing} style={{ width: size, height: size, transform: `rotate(${facing}deg)` }}>
                                    <EntitySprite type={type} team={TEAM_COLORS[i === 2 ? 1 : 0]} />
                                </div>
                            ))}
                            <div className="w-20 h-20"><EntityIcon type={type} size="full" /></div>
                        </div>
                        <span className="text-xs text-white/80">{ENTITY_CONFIGS[type].name}</span>
                    </div>
                );
            })}
        </div>
    </div>
);
