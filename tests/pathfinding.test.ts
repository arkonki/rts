import { describe, expect, it } from 'vitest';
import { findPath } from '../utils/pathfinding';
import { TerrainType, UnitDomain } from '../types';
import { MAP_HEIGHT_TILES, MAP_WIDTH_TILES, TILE_SIZE } from '../constants';
import { makeTerrain, tileCenter } from './helpers';

const tileOf = (p: { x: number; y: number }) => ({ x: Math.floor(p.x / TILE_SIZE), y: Math.floor(p.y / TILE_SIZE) });

describe('findPath', () => {
    it('walks from the start tile to the goal tile on open ground', () => {
        const path = findPath(tileCenter(2, 2), tileCenter(9, 6), makeTerrain(), UnitDomain.GROUND);
        expect(path).not.toBeNull();
        expect(path![0]).toEqual(tileCenter(2, 2));
        expect(path![path!.length - 1]).toEqual(tileCenter(9, 6));
        for (let i = 1; i < path!.length; i++) {
            expect(Math.abs(path![i].x - path![i - 1].x)).toBeLessThanOrEqual(TILE_SIZE);
            expect(Math.abs(path![i].y - path![i - 1].y)).toBeLessThanOrEqual(TILE_SIZE);
        }
    });

    it('takes the diagonal when it is the shortest route', () => {
        const path = findPath(tileCenter(0, 0), tileCenter(5, 5), makeTerrain(), UnitDomain.GROUND);
        expect(path).toHaveLength(6);
    });

    it('returns a single waypoint when start and goal share a tile', () => {
        const path = findPath(tileCenter(4, 4), tileCenter(4, 4), makeTerrain(), UnitDomain.GROUND);
        expect(path).toEqual([tileCenter(4, 4)]);
    });

    it('returns null for a goal ground units cannot enter', () => {
        const terrain = makeTerrain();
        terrain[5][12] = TerrainType.MOUNTAIN;
        terrain[6][12] = TerrainType.DEEP_WATER;
        expect(findPath(tileCenter(2, 5), tileCenter(12, 5), terrain, UnitDomain.GROUND)).toBeNull();
        expect(findPath(tileCenter(2, 6), tileCenter(12, 6), terrain, UnitDomain.GROUND)).toBeNull();
    });

    it('returns null for a goal outside the map', () => {
        expect(findPath(tileCenter(2, 2), { x: -50, y: 100 }, makeTerrain(), UnitDomain.GROUND)).toBeNull();
        expect(findPath(tileCenter(2, 2), tileCenter(MAP_WIDTH_TILES, 3), makeTerrain(), UnitDomain.GROUND)).toBeNull();
    });

    it('routes around obstacles through a gap', () => {
        const terrain = makeTerrain();
        for (let y = 0; y < MAP_HEIGHT_TILES - 1; y++) terrain[y][10] = TerrainType.MOUNTAIN; // gap on the last row
        const path = findPath(tileCenter(5, 5), tileCenter(15, 5), terrain, UnitDomain.GROUND);
        expect(path).not.toBeNull();
        path!.forEach(p => expect(terrain[tileOf(p).y][tileOf(p).x]).not.toBe(TerrainType.MOUNTAIN));
        expect(path!.some(p => tileOf(p).y === MAP_HEIGHT_TILES - 1)).toBe(true);
    });

    it('returns null when the goal is completely walled off', () => {
        const terrain = makeTerrain();
        for (let y = 0; y < MAP_HEIGHT_TILES; y++) terrain[y][10] = TerrainType.MOUNTAIN;
        expect(findPath(tileCenter(5, 5), tileCenter(15, 5), terrain, UnitDomain.GROUND)).toBeNull();
    });

    it('keeps sea units on water', () => {
        const terrain = makeTerrain();
        for (let x = 0; x <= 20; x++) terrain[5][x] = TerrainType.SHALLOW_WATER;
        const path = findPath(tileCenter(0, 5), tileCenter(20, 5), terrain, UnitDomain.SEA);
        expect(path).not.toBeNull();
        path!.forEach(p => expect(terrain[tileOf(p).y][tileOf(p).x]).toBe(TerrainType.SHALLOW_WATER));
        // Land goals are unreachable for ships.
        expect(findPath(tileCenter(0, 5), tileCenter(5, 9), terrain, UnitDomain.SEA)).toBeNull();
    });

    it('lets air units cross any terrain', () => {
        const terrain = makeTerrain();
        for (let y = 0; y < MAP_HEIGHT_TILES; y++) terrain[y][10] = TerrainType.MOUNTAIN;
        expect(findPath(tileCenter(5, 5), tileCenter(15, 5), terrain, UnitDomain.AIR)).not.toBeNull();
        expect(findPath(tileCenter(5, 5), tileCenter(10, 5), terrain, UnitDomain.AIR)).not.toBeNull();
    });
});
