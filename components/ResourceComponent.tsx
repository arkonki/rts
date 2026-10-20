import React from 'react';
import { ResourcePatch } from '../types';
import { hashString } from './sprites/palette';

/** An ore field: a cluster of gold crystals that thins out as it is mined. */
export const ResourcePatchComponent = React.memo(({ patch }: { patch: ResourcePatch }) => {
    const seed = hashString(patch.id);
    const ratio = Math.max(0, Math.min(1, patch.amount / patch.maxAmount));
    const crystals = Math.max(2, Math.ceil(ratio * 6));
    const size = patch.size * 1.5;

    const style: React.CSSProperties = {
        left: patch.position.x,
        top: patch.position.y,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        zIndex: 0,
    };

    return (
        <div className="absolute pointer-events-none" style={style}>
            <div className="absolute inset-0 resource-patch-animate" style={{ borderRadius: '50%', background: 'radial-gradient(circle, rgba(250,204,21,0.5), rgba(250,204,21,0) 70%)', opacity: 0.4 + ratio * 0.6 }} />
            <svg viewBox="-20 -20 40 40" width="100%" height="100%" style={{ overflow: 'visible' }}>
                {Array.from({ length: crystals }, (_, i) => {
                    const angle = (i / crystals) * Math.PI * 2 + seed * 6;
                    const radius = i === 0 ? 0 : 7 + ((seed * 13 + i * 0.37) % 1) * 5;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius * 0.8;
                    const scale = 0.7 + (((seed * 7 + i * 0.61) % 1) * 0.6);
                    const tilt = (((seed * 31 + i * 0.29) % 1) - 0.5) * 50;
                    return (
                        <g key={i} transform={`translate(${x} ${y}) rotate(${tilt}) scale(${scale})`}>
                            <ellipse cx={2} cy={7} rx={5} ry={2} fill="#000" opacity={0.3} />
                            <path d="M0 -9 L5 -3 L3.500 7 L-3.500 7 L-5 -3z" fill="url(#gem)" stroke="#7a4a05" strokeWidth={0.7} />
                            <path d="M0 -9 L-5 -3 L-1 -2z" fill="#fff" opacity={0.65} />
                            <path d="M0 -9 L5 -3 L1 -2z" fill="#fff" opacity={0.25} />
                        </g>
                    );
                })}
            </svg>
        </div>
    );
});
