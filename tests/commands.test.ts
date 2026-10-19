import { describe, expect, it } from 'vitest';
import { commandAttack } from '../state/commands/unitCommands';
import { placeBuilding, queueProduction } from '../state/commands/buildCommands';
import { BuildingType, Unit, UnitType } from '../types';
import { ENTITY_CONFIGS, HUMAN_PLAYER_ID } from '../constants';
import { AI_ID, entityMap, makeBuilding, makeState, makeUnit, tileCenter } from './helpers';

const hq = makeBuilding('hq', BuildingType.HQ, HUMAN_PLAYER_ID, tileCenter(10, 10));
const soundsIn = (state: ReturnType<typeof makeState>) => state.soundEvents.map(e => e.sound);

describe('commandAttack', () => {
    it('only orders units that can hit the target domain', () => {
        const tesla = makeUnit('tesla', UnitType.TESLA_TROOPER, HUMAN_PLAYER_ID, tileCenter(5, 5));
        const rifleman = makeUnit('rifle', UnitType.RIFLEMAN, HUMAN_PLAYER_ID, tileCenter(6, 5));
        const jet = makeUnit('jet', UnitType.FIGHTER_JET, AI_ID, tileCenter(9, 5));
        const state = makeState({ entities: entityMap(tesla, rifleman, jet), selectedIds: ['tesla', 'rifle'] });

        const next = commandAttack(state, 'jet');
        expect((next.entities['tesla'] as Unit).status).toBe('IDLE'); // Tesla troopers cannot shoot air
        expect((next.entities['rifle'] as Unit).status).toBe('ATTACKING');
        expect((next.entities['rifle'] as Unit).targetId).toBe('jet');
    });

    it('never orders units to attack their own side', () => {
        const a = makeUnit('a', UnitType.TANK, HUMAN_PLAYER_ID, tileCenter(5, 5));
        const b = makeUnit('b', UnitType.TANK, HUMAN_PLAYER_ID, tileCenter(6, 5));
        const state = makeState({ entities: entityMap(a, b), selectedIds: ['a'] });
        expect((commandAttack(state, 'b').entities['a'] as Unit).status).toBe('IDLE');
    });
});

describe('queueProduction', () => {
    const barracks = makeBuilding('barracks', BuildingType.BARRACKS, HUMAN_PLAYER_ID, tileCenter(14, 10));

    it('queues a unit and charges credits', () => {
        const state = makeState({ entities: entityMap(hq, barracks) });
        const next = queueProduction(state, 'barracks', UnitType.RIFLEMAN);
        expect((next.entities['barracks'] as typeof barracks).productionQueue).toEqual([UnitType.RIFLEMAN]);
        expect(next.players[HUMAN_PLAYER_ID].credits).toBe(1000 - ENTITY_CONFIGS[UnitType.RIFLEMAN].cost);
    });

    it('refuses units the building cannot produce', () => {
        const state = makeState({ entities: entityMap(hq, barracks) });
        const next = queueProduction(state, 'barracks', UnitType.TANK);
        expect((next.entities['barracks'] as typeof barracks).productionQueue).toEqual([]);
        expect(next.players[HUMAN_PLAYER_ID].credits).toBe(1000);
        expect(soundsIn(next)).toContain('insufficient_funds');
    });
});

describe('placeBuilding', () => {
    it('starts construction, charges credits and queues a sound', () => {
        const state = makeState({ entities: entityMap(hq) });
        const next = placeBuilding(state, BuildingType.POWER_PLANT, tileCenter(14, 10));

        const plants = Object.values(next.entities).filter(e => e.type === BuildingType.POWER_PLANT);
        expect(plants).toHaveLength(1);
        expect(next.players[HUMAN_PLAYER_ID].credits).toBe(1000 - ENTITY_CONFIGS[BuildingType.POWER_PLANT].cost);
        expect(soundsIn(next)).toContain('place_building');
        expect(state.soundEvents).toHaveLength(0); // input state untouched
    });

    it('rejects an invalid position with a message and a sound, without charging', () => {
        const state = makeState({ entities: entityMap(hq) });
        const next = placeBuilding(state, BuildingType.POWER_PLANT, tileCenter(60, 50));

        expect(Object.keys(next.entities)).toEqual(['hq']);
        expect(next.players[HUMAN_PLAYER_ID].credits).toBe(1000);
        expect(next.lastMessage).toMatch(/too far/i);
        expect(soundsIn(next)).toContain('insufficient_funds');
    });

    it('rejects a build the player cannot afford', () => {
        const poor = makeState({ entities: entityMap(hq) });
        poor.players[HUMAN_PLAYER_ID] = { ...poor.players[HUMAN_PLAYER_ID], credits: 10 };
        const next = placeBuilding(poor, BuildingType.POWER_PLANT, tileCenter(14, 10));
        expect(next.lastMessage).toMatch(/not enough credits/i);
        expect(Object.keys(next.entities)).toEqual(['hq']);
    });
});
