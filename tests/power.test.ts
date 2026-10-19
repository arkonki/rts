import { describe, expect, it } from 'vitest';
import { updatePlayerPowerAndSuperweapons } from '../state/systems/power';
import { Building, BuildingType } from '../types';
import { HUMAN_PLAYER_ID } from '../constants';
import { entityMap, makeBuilding, makeState, makeTickContext, tileCenter } from './helpers';

const hq = makeBuilding('hq', BuildingType.HQ, HUMAN_PLAYER_ID, tileCenter(5, 5));
const barracks = makeBuilding('barracks', BuildingType.BARRACKS, HUMAN_PLAYER_ID, tileCenter(10, 5));
const plant = makeBuilding('plant', BuildingType.POWER_PLANT, HUMAN_PLAYER_ID, tileCenter(15, 5));

const run = (entities: ReturnType<typeof entityMap>) =>
    updatePlayerPowerAndSuperweapons(makeState({ entities }), makeTickContext().ctx);

describe('updatePlayerPowerAndSuperweapons', () => {
    it('totals power produced and consumed by finished buildings', () => {
        const next = run(entityMap(hq, barracks, plant));
        expect(next.players[HUMAN_PLAYER_ID].power).toEqual({ produced: 50, consumed: 20 });
    });

    it('shuts down power-hungry buildings in a deficit but keeps the HQ online', () => {
        const next = run(entityMap(hq, barracks));
        expect((next.entities['barracks'] as Building).isPowered).toBe(false);
        expect((next.entities['hq'] as Building).isPowered).toBe(true);
    });

    it('restores power once production catches up', () => {
        const shutDown = { ...barracks, isPowered: false };
        const next = run(entityMap(hq, shutDown, plant));
        expect((next.entities['barracks'] as Building).isPowered).toBe(true);
    });

    it('ignores buildings that are still under construction', () => {
        const building = makeBuilding('barracks', BuildingType.BARRACKS, HUMAN_PLAYER_ID, tileCenter(10, 5), { isConstructing: true, isPowered: false });
        const next = run(entityMap(hq, building));
        expect(next.players[HUMAN_PLAYER_ID].power.consumed).toBe(10);
        expect((next.entities['barracks'] as Building).isPowered).toBe(false);
    });

    it('returns the same state object when nothing changes', () => {
        const first = run(entityMap(hq, barracks, plant));
        const second = updatePlayerPowerAndSuperweapons(first, makeTickContext(2).ctx);
        expect(second).toBe(first);
    });
});
