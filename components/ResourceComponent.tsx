
import React from 'react';
import { ResourcePatch } from '../types';

export const ResourcePatchComponent = React.memo(({ patch }: { patch: ResourcePatch }) => {
    const opacity = 0.5 + (patch.amount / patch.maxAmount) * 0.5;

    const style: React.CSSProperties = {
        left: patch.position.x,
        top: patch.position.y,
        width: patch.size,
        height: patch.size,
        transform: 'translate(-50%, -50%)',
        opacity,
        background: 'radial-gradient(circle, #fde047, #eab308)', // yellow-300 to yellow-500
        borderRadius: '50%',
        boxShadow: '0 0 15px #fde047',
        zIndex: 0,
    };

    return <div className="absolute resource-patch-animate" style={style} />;
});
