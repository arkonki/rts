
import React, { useEffect, useRef } from 'react';
import { TerrainType, FogState } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, MAP_WIDTH_TILES, MAP_HEIGHT_TILES } from '../constants';

export const TerrainCanvas = React.memo(({ terrain }: { terrain: TerrainType[][] }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas || terrain.length === 0) return;

        canvas.width = MAP_WIDTH;
        canvas.height = MAP_HEIGHT;
        
        // A more thematic and detailed color palette for terrain
        const colors = {
            ground: '#6B5B3E',
            groundDetail: '#836F4D',
            mountain: '#5A686C',
            mountainHighlight: '#8A9AA0',
            treeTrunk: '#5A3825',
            treeLeaves: '#3E8351',
            shallowWater: '#4299e1',
            deepWater: '#2b6cb0',
            wave: '#63b3ed',
        };

        for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
            for (let x = 0; x < MAP_WIDTH_TILES; x++) {
                const tileX = x * TILE_SIZE;
                const tileY = y * TILE_SIZE;
                
                // Base ground color for all land tiles
                if(terrain[y][x] !== TerrainType.SHALLOW_WATER && terrain[y][x] !== TerrainType.DEEP_WATER){
                    ctx.fillStyle = colors.ground;
                    ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                }

                switch(terrain[y][x]) {
                    case TerrainType.GROUND:
                         // Add subtle texture to ground
                        ctx.fillStyle = colors.groundDetail;
                        for(let i = 0; i < 3; i++) {
                            ctx.beginPath();
                            ctx.arc(tileX + Math.random() * TILE_SIZE, tileY + Math.random() * TILE_SIZE, Math.random() * 1.5, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        break;
                    case TerrainType.MOUNTAIN:
                        ctx.fillStyle = colors.mountain;
                        ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                        ctx.fillStyle = colors.mountainHighlight;
                        ctx.beginPath();
                        ctx.moveTo(tileX + TILE_SIZE * 0.2, tileY + TILE_SIZE * 0.8);
                        ctx.lineTo(tileX + TILE_SIZE * 0.5, tileY + TILE_SIZE * 0.2);
                        ctx.lineTo(tileX + TILE_SIZE * 0.8, tileY + TILE_SIZE * 0.8);
                        ctx.closePath();
                        ctx.fill();
                        break;
                    case TerrainType.TREES:
                         // Trunk
                        ctx.fillStyle = colors.treeTrunk;
                        ctx.fillRect(tileX + TILE_SIZE * 0.4, tileY + TILE_SIZE * 0.5, TILE_SIZE * 0.2, TILE_SIZE * 0.4);
                        // Leaves
                        ctx.fillStyle = colors.treeLeaves;
                        ctx.beginPath();
                        ctx.arc(tileX + TILE_SIZE / 2, tileY + TILE_SIZE * 0.4, TILE_SIZE * 0.3, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    case TerrainType.SHALLOW_WATER:
                        ctx.fillStyle = colors.shallowWater;
                        ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                        // Waves
                        ctx.strokeStyle = colors.wave;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(tileX, tileY + TILE_SIZE * 0.3);
                        ctx.quadraticCurveTo(tileX + TILE_SIZE / 2, tileY + TILE_SIZE * 0.1, tileX + TILE_SIZE, tileY + TILE_SIZE * 0.3);
                        ctx.moveTo(tileX, tileY + TILE_SIZE * 0.8);
                        ctx.quadraticCurveTo(tileX + TILE_SIZE / 2, tileY + TILE_SIZE * 0.6, tileX + TILE_SIZE, tileY + TILE_SIZE * 0.8);
                        ctx.stroke();
                        break;
                    case TerrainType.DEEP_WATER:
                        ctx.fillStyle = colors.deepWater;
                        ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                         // Subtle wave
                        ctx.strokeStyle = colors.shallowWater;
                        ctx.lineWidth = 1;
                        ctx.globalAlpha = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(tileX, tileY + TILE_SIZE * 0.5);
                        ctx.quadraticCurveTo(tileX + TILE_SIZE / 2, tileY + TILE_SIZE * 0.3, tileX + TILE_SIZE, tileY + TILE_SIZE * 0.5);
                        ctx.stroke();
                        ctx.globalAlpha = 1.0;
                        break;
                }
            }
        }
    }, [terrain]);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 pointer-events-none" />;
});

export const FogCanvas = React.memo(({ fog }: { fog: FogState[][] }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas || fog.length === 0) return;

        canvas.width = MAP_WIDTH;
        canvas.height = MAP_HEIGHT;
        ctx.clearRect(0,0, canvas.width, canvas.height);

        const unexploredColor = 'rgba(0,0,0,1)';
        const exploredColor = 'rgba(0,0,0,0.5)';

        for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
            for (let x = 0; x < MAP_WIDTH_TILES; x++) {
                if (fog[y][x] === FogState.UNEXPLORED) {
                    ctx.fillStyle = unexploredColor;
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                } else if (fog[y][x] === FogState.EXPLORED) {
                    ctx.fillStyle = exploredColor;
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }, [fog]);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 pointer-events-none" />;
});