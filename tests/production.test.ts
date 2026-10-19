import { describe, expect, it } from 'vitest';
import { updateBuildingProduction } from '../state/systems/production';
import { updateBuildingConstruction } from '../state/systems/construction';
import { BuildingType, GameState, Unit, UnitType } from '../types';
import { ENTITY_CONFIGS, GAME_LOOP_INTERVAL, HUMAN_PLAYER_ID } from '../constants';
import { entityMap, makeBuilding, makeState, makeTickContext, tileCenter } from './helpers';

function runTicks(state: GameState, ticks: number, system: typeof updateBuildingProduction, sounds: string[] = []): GameState {
    let current = state;
    for (let tick = 1; tick <= ticks; tick++) {
        const { ctx, sounds: tickSounds } = makeTickContext(tick);
        current = system(current, ctx);
        sounds.push(...tickSounds);
    }
    return current;
}

const unitsOf = (state: GameState, type: UnitType) =>
    Object.values(state.entities).filter(e => e.type === type) as Unit[];

describe('updateBuildingProduction', () => {
    const riflemanTicks = ENTITY_CONFIGS[UnitType.RIFLEMAN].buildTime / GAME_LOOP_INTERVAL;

    it('spawns the queued unit exactly when its build time has elapsed', () => {
        const barracks = makeBuilding('b1', BuildingType.BARRACKS, HUMAN_PLAYER_ID, tileCenter(10, 10), { productionQueue: [UnitType.RIFLEMAN] });
        const start = makeState({ entities: entityMap(barracks) });

        const almost = runTicks(start, riflemanTicks - 1, updateBuildingProduction);
        expect(unitsOf(almost, UnitType.RIFLEMAN)).toHaveLength(0);

        const sounds: string[] = [];
        const done = runTicks(start, riflemanTicks, updateBuildingProduction, sounds);
        const spawned = unitsOf(done, UnitType.RIFLEMAN);
        expect(spawned).toHaveLength(1);
        expect(spawned[0].playerId).toBe(HUMAN_PLAYER_ID);
        expect((done.entities['b1'] as typeof barracks).productionQueue).toHaveLength(0);
        expect(done.gameStats[HUMAN_PLAYER_ID].unitsBuilt[UnitType.RIFLEMAN]).toBe(1);
        expect(sounds).toContain('unit_ready');
    });

    it('does not progress while the producer is unpowered', () => {
        const barracks = makeBuilding('b1', BuildingType.BARRACKS, HUMAN_PLAYER_ID, tileCenter(10, 10), { productionQueue: [UnitType.RIFLEMAN], isPowered: false });
        const start = makeState({ entities: entityMap(barracks) });
        const after = runTicks(start, riflemanTicks * 2, updateBuildingProduction);
        expect(after).toBe(start);
    });

    it('gives simultaneously produced units distinct ids', () => {
        const a = makeBuilding('b1', BuildingType.BARRACKS, HUMAN_PLAYER_ID, tileCenter(10, 10), { productionQueue: [UnitType.RIFLEMAN] });
        const b = makeBuilding('b2', BuildingType.BARRACKS, HUMAN_PLAYER_ID, tileCenter(20, 10), { productionQueue: [UnitType.RIFLEMAN] });
        const done = runTicks(makeState({ entities: entityMap(a, b) }), riflemanTicks, updateBuildingProduction);
        const riflemen = unitsOf(done, UnitType.RIFLEMAN);
        expect(riflemen).toHaveLength(2);
        expect(new Set(riflemen.map(u => u.id)).size).toBe(2);
    });

    it('sends new units toward the rally point', () => {
        const barracks = makeBuilding('b1', BuildingType.BARRACKS, HUMAN_PLAYER_ID, tileCenter(10, 10), {
            productionQueue: [UnitType.RIFLEMAN],
            rallyPoint: tileCenter(20, 20),
        });
        const done = runTicks(makeState({ entities: entityMap(barracks) }), riflemanTicks, updateBuildingProduction);
        const [rifleman] = unitsOf(done, UnitType.RIFLEMAN);
        expect(rifleman.status).toBe('ATTACK_MOVING');
        expect(rifleman.path && rifleman.path.length).toBeGreaterThan(1);
    });
});

describe('updateBuildingConstruction', () => {
    const refineryTicks = ENTITY_CONFIGS[BuildingType.REFINERY].buildTime / GAME_LOOP_INTERVAL;

    it('finishes a building when its build time has elapsed and grants a free miner for a refinery', () => {
        const refinery = makeBuilding('r1', BuildingType.REFINERY, HUMAN_PLAYER_ID, tileCenter(10, 10), {
            hp: 1, isConstructing: true, isPowered: false,
        });
        const start = makeState({ entities: entityMap(refinery) });

        const almost = runTicks(start, refineryTicks - 1, updateBuildingConstruction);
        expect((almost.entities['r1'] as typeof refinery).isConstructing).toBe(true);
        expect(unitsOf(almost, UnitType.CHRONO_MINER)).toHaveLength(0);

        const done = runTicks(start, refineryTicks, updateBuildingConstruction);
        const finished = done.entities['r1'] as typeof refinery;
        expect(finished.isConstructing).toBe(false);
        expect(finished.isPowered).toBe(true);
        expect(unitsOf(done, UnitType.CHRONO_MINER)).toHaveLength(1);
        expect(done.gameStats[HUMAN_PLAYER_ID].buildingsConstructed[BuildingType.REFINERY]).toBe(1);
    });
});
