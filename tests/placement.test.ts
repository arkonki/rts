import { describe, expect, it } from 'vitest';
import { getPlacementError, isCoastalTile } from '../utils/placement';
import { BuildingType, TerrainType } from '../types';
import { HUMAN_PLAYER_ID, MAP_HEIGHT_TILES } from '../constants';
import { entityMap, makeBuilding, makeTerrain, tileCenter } from './helpers';

const hq = makeBuilding('hq', BuildingType.HQ, HUMAN_PLAYER_ID, tileCenter(10, 10));
const baseEntities = entityMap(hq);

describe('getPlacementError', () => {
    it('allows a power plant on open ground next to the HQ', () => {
        expect(getPlacementError(BuildingType.POWER_PLANT, tileCenter(14, 10), makeTerrain(), baseEntities, HUMAN_PLAYER_ID)).toBeNull();
    });

    it('requires prerequisite buildings to be finished', () => {
        const missing = getPlacementError(BuildingType.WAR_FACTORY, tileCenter(14, 10), makeTerrain(), baseEntities, HUMAN_PLAYER_ID);
        expect(missing).toMatch(/requires/i);

        const unfinished = entityMap(
            hq,
            makeBuilding('barracks', BuildingType.BARRACKS, HUMAN_PLAYER_ID, tileCenter(10, 16), { isConstructing: true }),
            makeBuilding('plant', BuildingType.POWER_PLANT, HUMAN_PLAYER_ID, tileCenter(16, 16)),
        );
        expect(getPlacementError(BuildingType.WAR_FACTORY, tileCenter(14, 10), makeTerrain(), unfinished, HUMAN_PLAYER_ID)).toMatch(/requires/i);

        const finished = entityMap(
            hq,
            makeBuilding('barracks', BuildingType.BARRACKS, HUMAN_PLAYER_ID, tileCenter(10, 16)),
            makeBuilding('plant', BuildingType.POWER_PLANT, HUMAN_PLAYER_ID, tileCenter(16, 16)),
        );
        expect(getPlacementError(BuildingType.WAR_FACTORY, tileCenter(14, 10), makeTerrain(), finished, HUMAN_PLAYER_ID)).toBeNull();
    });

    it('rejects non-ground terrain, including anywhere under the footprint', () => {
        const terrain = makeTerrain();
        terrain[10][14] = TerrainType.MOUNTAIN;
        expect(getPlacementError(BuildingType.POWER_PLANT, tileCenter(14, 10), terrain, baseEntities, HUMAN_PLAYER_ID)).toMatch(/terrain/i);

        // A refinery is 1.5 tiles wide, so it also covers the neighbouring tile columns.
        const edge = makeTerrain();
        edge[10][13] = TerrainType.MOUNTAIN;
        expect(getPlacementError(BuildingType.REFINERY, tileCenter(14, 10), edge, baseEntities, HUMAN_PLAYER_ID)).toMatch(/terrain/i);
    });

    it('rejects positions far from the player base', () => {
        expect(getPlacementError(BuildingType.POWER_PLANT, tileCenter(60, 50), makeTerrain(), baseEntities, HUMAN_PLAYER_ID)).toMatch(/too far/i);
    });

    it('does not count other players\' buildings as a base', () => {
        const enemyHq = makeBuilding('ai_hq', BuildingType.HQ, 'AI_1', tileCenter(40, 30));
        const entities = entityMap(hq, enemyHq);
        expect(getPlacementError(BuildingType.POWER_PLANT, tileCenter(42, 30), makeTerrain(), entities, HUMAN_PLAYER_ID)).toMatch(/too far/i);
    });

    it('rejects obstructed positions', () => {
        const nearHq = { x: hq.position.x + 30, y: hq.position.y };
        expect(getPlacementError(BuildingType.POWER_PLANT, nearHq, makeTerrain(), baseEntities, HUMAN_PLAYER_ID)).toMatch(/obstructed/i);
    });

    it('only allows a naval yard on the coast', () => {
        const entities = entityMap(
            hq,
            makeBuilding('barracks', BuildingType.BARRACKS, HUMAN_PLAYER_ID, tileCenter(10, 16)),
            makeBuilding('plant', BuildingType.POWER_PLANT, HUMAN_PLAYER_ID, tileCenter(16, 16)),
        );
        const terrain = makeTerrain();
        terrain[10][14] = TerrainType.SHALLOW_WATER;

        expect(getPlacementError(BuildingType.NAVAL_YARD, tileCenter(13, 10), terrain, entities, HUMAN_PLAYER_ID)).toBeNull();
        expect(getPlacementError(BuildingType.NAVAL_YARD, tileCenter(13, 5), terrain, entities, HUMAN_PLAYER_ID)).toMatch(/coast/i);
    });
});

describe('isCoastalTile', () => {
    it('detects land next to water anywhere on the map', () => {
        const terrain = makeTerrain();
        terrain[30][6] = TerrainType.DEEP_WATER;
        expect(isCoastalTile(5, 30, terrain)).toBe(true);
        expect(isCoastalTile(5, 20, terrain)).toBe(false);
        // Regression: a bounds-check typo used to make every in-range tile "not coastal".
        const bottom = makeTerrain();
        bottom[MAP_HEIGHT_TILES - 1][7] = TerrainType.SHALLOW_WATER;
        expect(isCoastalTile(6, MAP_HEIGHT_TILES - 1, bottom)).toBe(true);
    });

    it('treats water tiles and out-of-bounds tiles as non-coastal', () => {
        const terrain = makeTerrain();
        terrain[10][10] = TerrainType.SHALLOW_WATER;
        expect(isCoastalTile(10, 10, terrain)).toBe(false);
        expect(isCoastalTile(-1, 10, terrain)).toBe(false);
        expect(isCoastalTile(5, MAP_HEIGHT_TILES, terrain)).toBe(false);
    });
});
