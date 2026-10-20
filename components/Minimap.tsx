

import React, { useEffect, useRef } from 'react';
import { GameState, Position, FogState, TerrainType } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, MAP_WIDTH_TILES, MAP_HEIGHT_TILES, TEAM_COLORS, ALERT_LIFETIME_TICKS } from '../constants';

interface MinimapProps {
    state: GameState;
    viewportSize: React.MutableRefObject<{ width: number; height: number; }>;
    onMinimapClick: (pos: Position) => void;
}

export const Minimap = React.memo(({ state, viewportSize, onMinimapClick }: MinimapProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const aspectRatio = MAP_WIDTH / MAP_HEIGHT;
    // Only animate the attack pings (redraw every tick) while there is an alert to show.
    const alertTick = state.alerts.length > 0 ? state.tick : 0;

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

        ctx.fillStyle = '#05070a'; ctx.fillRect(0,0, canvas.width, canvas.height);

        // Draw terrain
        for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
            for (let x = 0; x < MAP_WIDTH_TILES; x++) {
                 if (state.fogOfWar[y][x] !== FogState.UNEXPLORED) {
                     const terrainType = state.terrain[y][x];
                     switch(terrainType) {
                         case TerrainType.MOUNTAIN: ctx.fillStyle = '#7b848c'; break;
                         case TerrainType.TREES: ctx.fillStyle = '#2d6a3e'; break;
                         case TerrainType.SHALLOW_WATER: ctx.fillStyle = '#3a95b5'; break;
                         case TerrainType.DEEP_WATER: ctx.fillStyle = '#1f4c86'; break;
                         case TerrainType.GROUND:
                         default:
                             ctx.fillStyle = '#58783f'; break;
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
                ctx.fillStyle = TEAM_COLORS[playerIndex] || '#ffffff';
                const isBuilding = 'isPowered' in e;
                const half = isBuilding ? 2.5 : 1.6;
                ctx.fillRect(e.position.x * scaleX - half, e.position.y * scaleY - half, half * 2, half * 2);
            }
        });

        // Pulsing rings where the player is under attack
        state.alerts.forEach(alert => {
            const age = (state.tick - alert.tick) / ALERT_LIFETIME_TICKS;
            const radius = 4 + ((state.tick - alert.tick) % 10) * 1.6;
            ctx.strokeStyle = `rgba(255,70,60,${Math.max(0.2, 1 - age)})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(alert.position.x * scaleX, alert.position.y * scaleY, radius, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Draw viewport
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.strokeRect(state.viewport.x * scaleX, state.viewport.y * scaleY, viewportSize.current.width * scaleX, viewportSize.current.height * scaleY);
    }, [state.entities, state.viewport, state.terrain, state.fogOfWar, state.resourcePatches, state.alerts, alertTick, aspectRatio, viewportSize, state.players]);
    
    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left; 
        const clickY = e.clientY - rect.top;
        onMinimapClick({ x: clickX / e.currentTarget.width, y: clickY / e.currentTarget.height });
    };

    return <div ref={containerRef} className="w-full"><canvas ref={canvasRef} onMouseDown={handleClick} className="w-full h-auto cursor-pointer" /></div>;
});
