import React, { useEffect, useRef } from 'react';
import { TerrainType, FogState } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, MAP_WIDTH_TILES, MAP_HEIGHT_TILES } from '../constants';
import { hash2 } from './sprites/palette';

const isWater = (t: TerrainType | undefined) => t === TerrainType.SHALLOW_WATER || t === TerrainType.DEEP_WATER;
const isLand = (t: TerrainType | undefined) => t !== undefined && !isWater(t);

/** Smooth 2D value noise in [0, 1) built on the coordinate hash. */
function valueNoise(x: number, y: number, seed: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const top = hash2(x0, y0, seed) * (1 - sx) + hash2(x0 + 1, y0, seed) * sx;
    const bottom = hash2(x0, y0 + 1, seed) * (1 - sx) + hash2(x0 + 1, y0 + 1, seed) * sx;
    return top * (1 - sy) + bottom * sy;
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
};

const rgb = (r: number, g: number, b: number) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

/**
 * Paints the whole battlefield once. All variation comes from a coordinate hash rather than
 * Math.random, so the same terrain always looks the same.
 */
function paintTerrain(ctx: CanvasRenderingContext2D, terrain: TerrainType[][]) {
    const T = TILE_SIZE;
    const at = (x: number, y: number): TerrainType | undefined => terrain[y]?.[x];

    // Pass 1: ground, rock and water base colours, painted in small cells from smooth value noise
    // so patches of dirt and shades of grass blend instead of showing the tile grid.
    const CELL = 4;
    const mix = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const GRASS_DARK = [56, 90, 40];
    const GRASS_LIGHT = [96, 132, 64];
    const DIRT = [132, 108, 72];
    const DIRT_LIGHT = [156, 130, 92];
    const ROCK_DARK = [84, 90, 96];
    const ROCK_LIGHT = [128, 134, 140];
    const SHALLOW_A = [46, 132, 164];
    const SHALLOW_B = [78, 170, 192];
    const DEEP_A = [22, 66, 122];
    const DEEP_B = [34, 94, 152];

    for (let cy = 0; cy < MAP_HEIGHT / CELL; cy++) {
        for (let cx = 0; cx < MAP_WIDTH / CELL; cx++) {
            const tx = Math.floor((cx * CELL) / T);
            const ty = Math.floor((cy * CELL) / T);
            const t = terrain[ty][tx];
            // Noise is sampled in 8px units so the pattern does not depend on the cell size.
            const nx = (cx * CELL) / 8;
            const ny = (cy * CELL) / 8;
            const fine = valueNoise(nx / 2.2, ny / 2.2, 3);
            const broad = valueNoise(nx / 7, ny / 7, 5);
            let c: number[];
            if (t === TerrainType.DEEP_WATER) {
                c = mix(DEEP_A, DEEP_B, broad * 0.7 + fine * 0.3);
            } else if (t === TerrainType.SHALLOW_WATER) {
                c = mix(SHALLOW_A, SHALLOW_B, broad * 0.6 + fine * 0.4);
            } else if (t === TerrainType.MOUNTAIN) {
                c = mix(ROCK_DARK, ROCK_LIGHT, broad * 0.5 + fine * 0.5);
            } else {
                const grass = mix(GRASS_DARK, GRASS_LIGHT, broad * 0.6 + fine * 0.4);
                const dirtAmount = smoothstep(0.6, 0.72, valueNoise(nx / 11, ny / 11, 9));
                c = dirtAmount > 0 ? mix(grass, mix(DIRT, DIRT_LIGHT, fine), dirtAmount) : grass;
            }
            ctx.fillStyle = rgb(c[0], c[1], c[2]);
            ctx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
        }
    }

    // Pass 2: texture. Grass tufts on land, glints on water.
    for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
        for (let x = 0; x < MAP_WIDTH_TILES; x++) {
            const px = x * T;
            const py = y * T;
            const t = terrain[y][x];
            if (isLand(t)) {
                for (let i = 0; i < 5; i++) {
                    const hx = hash2(x, y, 10 + i);
                    const hy = hash2(x, y, 20 + i);
                    ctx.strokeStyle = i % 2 ? 'rgba(30,60,24,0.35)' : 'rgba(160,200,110,0.22)';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(px + hx * T, py + hy * T);
                    ctx.lineTo(px + hx * T + 1.5, py + hy * T - 3.5);
                    ctx.stroke();
                }
            } else {
                for (let i = 0; i < 2; i++) {
                    const hx = hash2(x, y, 30 + i);
                    const hy = hash2(x, y, 40 + i);
                    ctx.strokeStyle = t === TerrainType.DEEP_WATER ? 'rgba(150,200,255,0.22)' : 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(px + hx * (T - 12), py + hy * T);
                    ctx.quadraticCurveTo(px + hx * (T - 12) + 6, py + hy * T - 3, px + hx * (T - 12) + 12, py + hy * T);
                    ctx.stroke();
                }
            }
        }
    }

    // Pass 3: shorelines. Sand on the land side, foam on the water side.
    const edges: Array<[number, number, number, number, number, number]> = [
        // dx, dy, then the strip rectangle (x0, y0, w, h) as fractions of the tile
        [0, -1, 0, 0, 1, 0.16],
        [0, 1, 0, 0.84, 1, 0.16],
        [-1, 0, 0, 0, 0.16, 1],
        [1, 0, 0.84, 0, 0.16, 1],
    ];
    for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
        for (let x = 0; x < MAP_WIDTH_TILES; x++) {
            const t = terrain[y][x];
            for (const [dx, dy, rx, ry, rw, rh] of edges) {
                const neighbour = at(x + dx, y + dy);
                if (neighbour === undefined) continue;
                if (isLand(t) && isWater(neighbour)) {
                    ctx.fillStyle = 'rgba(214,190,128,0.85)';
                    ctx.fillRect(x * T + rx * T, y * T + ry * T, rw * T, rh * T);
                } else if (isWater(t) && isLand(neighbour)) {
                    ctx.fillStyle = 'rgba(255,255,255,0.35)';
                    ctx.fillRect(x * T + rx * T, y * T + ry * T, rw * T, rh * T);
                }
            }
        }
    }

    // Pass 4: rocks and trees, row by row so lower objects overlap higher ones.
    for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
        for (let x = 0; x < MAP_WIDTH_TILES; x++) {
            const px = x * T;
            const py = y * T;
            const t = terrain[y][x];

            if (t === TerrainType.MOUNTAIN) {
                // Two or three jagged spires per tile, overlapping neighbours so ranges look continuous.
                const spires = 2 + Math.floor(hash2(x, y, 50) * 2);
                for (let i = 0; i < spires; i++) {
                    const w = hash2(x, y, 52 + i);
                    const h = hash2(x, y, 56 + i);
                    const half = T * (0.38 + w * 0.3);
                    const centreX = px + T * (0.15 + hash2(x, y, 60 + i) * 0.7);
                    const base = py + T * (0.7 + hash2(x, y, 64 + i) * 0.35);
                    const peakX = centreX + (w - 0.5) * T * 0.35;
                    const peakY = base - T * (0.75 + h * 0.7);
                    const left = centreX - half;
                    const right = centreX + half;
                    // cast shadow
                    ctx.fillStyle = 'rgba(0,0,0,0.26)';
                    ctx.beginPath();
                    ctx.moveTo(left + 7, base + 3);
                    ctx.lineTo(peakX + 10, peakY + 8);
                    ctx.lineTo(right + 10, base + 3);
                    ctx.closePath();
                    ctx.fill();
                    // lit face
                    ctx.fillStyle = rgb(138 + w * 24, 144 + w * 24, 150 + w * 22);
                    ctx.beginPath();
                    ctx.moveTo(left, base);
                    ctx.lineTo(peakX, peakY);
                    ctx.lineTo(peakX + T * 0.06, base);
                    ctx.closePath();
                    ctx.fill();
                    // shaded face
                    ctx.fillStyle = rgb(74 + w * 16, 80 + w * 16, 88 + w * 16);
                    ctx.beginPath();
                    ctx.moveTo(peakX, peakY);
                    ctx.lineTo(right, base);
                    ctx.lineTo(peakX + T * 0.06, base);
                    ctx.closePath();
                    ctx.fill();
                    // snow cap on the tall ones
                    if (h > 0.55) {
                        ctx.fillStyle = 'rgba(240,246,250,0.9)';
                        ctx.beginPath();
                        ctx.moveTo(peakX, peakY);
                        ctx.lineTo(peakX - half * 0.28, peakY + (base - peakY) * 0.3);
                        ctx.lineTo(peakX + half * 0.1, peakY + (base - peakY) * 0.24);
                        ctx.lineTo(peakX + half * 0.3, peakY + (base - peakY) * 0.32);
                        ctx.closePath();
                        ctx.fill();
                    }
                    // ridge highlight
                    ctx.strokeStyle = 'rgba(235,240,244,0.5)';
                    ctx.lineWidth = 1.3;
                    ctx.beginPath();
                    ctx.moveTo(left + 3, base - 2);
                    ctx.lineTo(peakX, peakY + 1);
                    ctx.stroke();
                }
            } else if (t === TerrainType.TREES) {
                const count = 2 + Math.floor(hash2(x, y, 60) * 2);
                for (let i = 0; i < count; i++) {
                    const tx = px + T * (0.2 + hash2(x, y, 61 + i) * 0.6);
                    const ty = py + T * (0.45 + hash2(x, y, 71 + i) * 0.45);
                    const s = 0.8 + hash2(x, y, 81 + i) * 0.5;
                    // shadow
                    ctx.fillStyle = 'rgba(0,0,0,0.25)';
                    ctx.beginPath();
                    ctx.ellipse(tx + 5 * s, ty + 2, 8 * s, 3.5 * s, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // trunk
                    ctx.fillStyle = '#4a3220';
                    ctx.fillRect(tx - 1.5 * s, ty - 4 * s, 3 * s, 6 * s);
                    // layered conifer
                    for (let layer = 0; layer < 3; layer++) {
                        const ly = ty - (6 + layer * 7) * s;
                        const half = (9 - layer * 2) * s;
                        ctx.fillStyle = rgb(26 + layer * 10, 84 + layer * 14, 46 + layer * 6);
                        ctx.beginPath();
                        ctx.moveTo(tx, ly - 9 * s);
                        ctx.lineTo(tx + half, ly + 4 * s);
                        ctx.lineTo(tx - half, ly + 4 * s);
                        ctx.closePath();
                        ctx.fill();
                        ctx.fillStyle = 'rgba(190,240,160,0.18)';
                        ctx.beginPath();
                        ctx.moveTo(tx, ly - 9 * s);
                        ctx.lineTo(tx - half, ly + 4 * s);
                        ctx.lineTo(tx - half * 0.2, ly + 4 * s);
                        ctx.closePath();
                        ctx.fill();
                    }
                }
            }
        }
    }
}

export const TerrainCanvas = React.memo(({ terrain }: { terrain: TerrainType[][] }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas || terrain.length === 0) return;

        canvas.width = MAP_WIDTH;
        canvas.height = MAP_HEIGHT;
        paintTerrain(ctx, terrain);
    }, [terrain]);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 pointer-events-none" />;
});

/**
 * Fog is drawn at one pixel per tile and stretched to the map by the browser. The bilinear
 * scaling turns the hard tile edges into soft, feathered fog boundaries for free.
 */
export const FogCanvas = React.memo(({ fog }: { fog: FogState[][] }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas || fog.length === 0) return;

        canvas.width = MAP_WIDTH_TILES;
        canvas.height = MAP_HEIGHT_TILES;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
            for (let x = 0; x < MAP_WIDTH_TILES; x++) {
                if (fog[y][x] === FogState.UNEXPLORED) {
                    ctx.fillStyle = 'rgba(4,6,8,1)';
                    ctx.fillRect(x, y, 1, 1);
                } else if (fog[y][x] === FogState.EXPLORED) {
                    ctx.fillStyle = 'rgba(4,6,8,0.55)';
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
    }, [fog]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ width: MAP_WIDTH, height: MAP_HEIGHT, imageRendering: 'auto', zIndex: 20 }}
        />
    );
});
