

import React, { useEffect, useRef } from 'react';
import { GameState, Position, FogState, TerrainType } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, MAP_WIDTH_TILES, MAP_HEIGHT_TILES, PLAYER_COLORS } from '../constants';

interface MinimapProps {
    state: GameState;
    viewportSize: React.MutableRefObject<{ width: number; height: number; }>;
    onMinimapClick: (pos: Position) => void;
}

const colorMap: Record<string, string> = {
    'border-blue-500': '#3b82f6',
    'border-red-500': '#ef4444',
    'border-green-500': '#22c55e',
    'border-yellow-500': '#eab308',
};

export const Minimap = React.memo(({ state, viewportSize, onMinimapClick }: MinimapProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const aspectRatio = MAP_WIDTH / MAP_HEIGHT;

    useEffect(() => {
        const canvas = canvasRef.current; 
        const ctx = canvas?.getContext('2d'); 
        const container = containerRef.current;
        if (!ctx || !canvas || !container || state.terrain.length === 0) return;
        
        const size = container.clientWidth; 
        canvas.width = size; 
        canvas.height = size / aspectRatio;
        const scaleX = canvas.width / MAP_WIDTH; 
        const scaleY = canvas.height / MAP_HEIGHT;

        ctx.fillStyle = '#2d3748'; ctx.fillRect(0,0, canvas.width, canvas.height);

        // Draw terrain
        for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
            for (let x = 0; x < MAP_WIDTH_TILES; x++) {
                 if (state.fogOfWar[y][x] !== FogState.UNEXPLORED) {
                     const terrainType = state.terrain[y][x];
                     switch(terrainType) {
                         case TerrainType.MOUNTAIN: ctx.fillStyle = '#4a5568'; break; // gray-700
                         case TerrainType.TREES: ctx.fillStyle = '#2f855a'; break; // green-700
                         case TerrainType.SHALLOW_WATER: ctx.fillStyle = '#4299e1'; break; // blue-400
                         case TerrainType.DEEP_WATER: ctx.fillStyle = '#2b6cb0'; break; // blue-700
                         case TerrainType.GROUND:
                         default:
                             ctx.fillStyle = '#3c485a'; break;
                     }
                     ctx.fillRect(x * TILE_SIZE * scaleX, y * TILE_SIZE * scaleY, TILE_SIZE * scaleX + 1, TILE_SIZE * scaleY + 1);
                 }
            }
        }
        
        // Draw resource patches
        ctx.fillStyle = '#facc15'; // yellow-400
        Object.values(state.resourcePatches).forEach(p => {
            const tileX = Math.floor(p.position.x / TILE_SIZE);
            const tileY = Math.floor(p.position.y / TILE_SIZE);
            if (state.fogOfWar[tileY]?.[tileX] !== FogState.UNEXPLORED) {
                ctx.beginPath();
                ctx.arc(p.position.x * scaleX, p.position.y * scaleY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Draw fog
        for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
            for (let x = 0; x < MAP_WIDTH_TILES; x++) {
                if (state.fogOfWar[y][x] === FogState.UNEXPLORED) {
                    ctx.fillStyle = 'rgba(0,0,0,1)';
                    ctx.fillRect(x * TILE_SIZE * scaleX, y * TILE_SIZE * scaleY, TILE_SIZE * scaleX + 1, TILE_SIZE * scaleY + 1);
                } else if (state.fogOfWar[y][x] === FogState.EXPLORED) {
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(x * TILE_SIZE * scaleX, y * TILE_SIZE * scaleY, TILE_SIZE * scaleX + 1, TILE_SIZE * scaleY + 1);
                }
            }
        }

        // Draw entities
        const playerIds = Object.keys(state.players);
        Object.values(state.entities).forEach(e => {
            const tileX = Math.floor(e.position.x / TILE_SIZE); 
            const tileY = Math.floor(e.position.y / TILE_SIZE);
            if (e.playerId === 'PLAYER_1' || state.fogOfWar[tileY]?.[tileX] === FogState.VISIBLE) {
                const playerIndex = playerIds.indexOf(e.playerId);
                const borderColor = PLAYER_COLORS[playerIndex] || 'border-gray-400';
                ctx.fillStyle = colorMap[borderColor] || '#ffffff';
                ctx.beginPath();
                ctx.arc(e.position.x * scaleX, e.position.y * scaleY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Draw viewport
        ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 1;
        ctx.strokeRect(state.viewport.x * scaleX, state.viewport.y * scaleY, viewportSize.current.width * scaleX, viewportSize.current.height * scaleY);
    }, [state.entities, state.viewport, state.terrain, state.fogOfWar, state.resourcePatches, aspectRatio, viewportSize, state.players]);
    
    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left; 
        const clickY = e.clientY - rect.top;
        onMinimapClick({ x: clickX / e.currentTarget.width, y: clickY / e.currentTarget.height });
    };

    return <div ref={containerRef} className="w-full"><canvas ref={canvasRef} onMouseDown={handleClick} className="w-full h-auto cursor-pointer" /></div>;
});
