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
        
        const groundColor = '#2d3748'; // gray-800
        const mountainColor = '#4a5568'; // gray-700
        const treeColor = '#2f855a'; // green-700
        const shallowWaterColor = '#4299e1'; // blue-400
        const deepWaterColor = '#2b6cb0'; // blue-700

        for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
            for (let x = 0; x < MAP_WIDTH_TILES; x++) {
                switch(terrain[y][x]) {
                    case TerrainType.MOUNTAIN: ctx.fillStyle = mountainColor; break;
                    case TerrainType.TREES: ctx.fillStyle = treeColor; break;
                    case TerrainType.SHALLOW_WATER: ctx.fillStyle = shallowWaterColor; break;
                    case TerrainType.DEEP_WATER: ctx.fillStyle = deepWaterColor; break;
                    default: ctx.fillStyle = groundColor; break;
                }
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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