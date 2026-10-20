import { describe, expect, it } from 'vitest';
import { updateUnits } from '../state/systems/units';
import { gameTick } from '../state/systems/tick';
import { cancelProduction } from '../state/commands/buildCommands';
import { holdPosition, stopUnits } from '../state/commands/unitCommands';
import { headingTo, turnToward } from '../utils/entity';
import { SpatialGrid } from '../utils/spatialGrid';
import { BuildingType, FogState, GameState, Unit, UnitType } from '../types';
import { ALERT_COOLDOWN_TICKS, ALERT_LIFETIME_TICKS, ENTITY_CONFIGS, HUMAN_PLAYER_ID, MAP_HEIGHT_TILES, MAP_WIDTH_TILES, TILE_SIZE } from '../constants';
import { AI_ID, entityMap, makeBuilding, makeState, makeTickContext, makeUnit, tileCenter } from './helpers';

const gridOf = (state: GameState) => {
    const grid = new SpatialGrid(TILE_SIZE * 5);
    Object.values(state.entities).forEach(e => grid.insert(e));
    return grid;
};

const fullyVisible = () => Array.from({ length: MAP_HEIGHT_TILES }, () => Array<FogState>(MAP_WIDTH_TILES).fill(FogState.VISIBLE));

describe('headings', () => {
    it('measures compass headings clockwise from north', () => {
        expect(headingTo({ x: 0, y: 0 }, { x: 0, y: -10 })).toBeCloseTo(0);
        expect(headingTo({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(90);
        expect(Math.abs(headingTo({ x: 0, y: 0 }, { x: 0, y: 10 }))).toBeCloseTo(180);
        expect(headingTo({ x: 0, y: 0 }, { x: -10, y: 0 })).toBeCloseTo(-90);
    });

    it('turns the short way round and never overshoots', () => {
        expect(turnToward(350, 10, 45)).toBe(10);
        expect(turnToward(10, 350, 45)).toBe(350);
        expect(Math.abs(turnToward(0, 180, 45))).toBe(45);
        expect(turnToward(0, 30, 45)).toBe(30);
    });
});

describe('unit facing', () => {
    it('turns a moving unit toward its next waypoint', () => {
        const unit = makeUnit('tank', UnitType.TANK, HUMAN_PLAYER_ID, tileCenter(5, 5), {
            status: 'MOVING',
            path: [tileCenter(9, 5)], // due east
        });
        const state = makeState({ entities: entityMap(unit) });
        const next = updateUnits(state, makeTickContext(1).ctx, gridOf(state));
        expect((next.entities['tank'] as Unit).facing).toBeCloseTo(45); // limited to one turn step per tick
    });
});

describe('under-attack alerts', () => {
    const hq = makeBuilding('hq', BuildingType.HQ, HUMAN_PLAYER_ID, tileCenter(10, 10));
    const attacker = makeUnit('raider', UnitType.TANK, AI_ID, tileCenter(13, 10), { status: 'ATTACKING', targetId: 'hq' });

    it('raises one alert with a sound when an enemy hits a human building', () => {
        const state = makeState({ entities: entityMap(hq, attacker) });
        const { ctx, sounds } = makeTickContext(100);
        const next = updateUnits(state, ctx, gridOf(state));

        expect(next.alerts).toHaveLength(1);
        expect(next.alerts[0].kind).toBe('UNDER_ATTACK');
        expect(next.alerts[0].position).toEqual(hq.position);
        expect(next.lastAlertTick).toBe(100);
        expect(sounds).toContain('under_attack');
    });

    it('throttles alerts', () => {
        const state = makeState({ entities: entityMap(hq, attacker) });
        const first = updateUnits(state, makeTickContext(100).ctx, gridOf(state));

        const rearmed = { ...first, entities: { ...first.entities, raider: { ...first.entities['raider'], lastAttackTime: 0 } } } as GameState;
        const tooSoon = updateUnits(rearmed, makeTickContext(100 + ALERT_COOLDOWN_TICKS - 1).ctx, gridOf(rearmed));
        expect(tooSoon.alerts).toHaveLength(1);

        const later = updateUnits(rearmed, makeTickContext(100 + ALERT_COOLDOWN_TICKS).ctx, gridOf(rearmed));
        expect(later.alerts).toHaveLength(2);
    });

    it('does not alert when the AI attacks the AI', () => {
        const aiHq = makeBuilding('ai_hq', BuildingType.HQ, 'AI_2', tileCenter(10, 10));
        const state = makeState({ entities: entityMap(aiHq, { ...attacker, targetId: 'ai_hq' }) });
        expect(updateUnits(state, makeTickContext(100).ctx, gridOf(state)).alerts).toHaveLength(0);
    });

    it('expires old alerts on the game tick', () => {
        const state = makeState({
            tick: 10,
            entities: entityMap(hq),
            alerts: [{ id: 1, kind: 'UNDER_ATTACK', position: hq.position, tick: 10 }],
        });
        expect(gameTick(state).alerts).toHaveLength(1);
        const old = { ...state, tick: 10 + ALERT_LIFETIME_TICKS };
        expect(gameTick(old).alerts).toHaveLength(0);
    });
});

describe('hold position', () => {
    // The tank is inside the rifleman's aggro range (5 tiles) but outside its weapon range (4 tiles).
    const enemy = makeUnit('enemy', UnitType.TANK, AI_ID, { x: tileCenter(10, 10).x + 180, y: tileCenter(10, 10).y });
    const stateWith = (holdPositionFlag: boolean) => {
        const rifleman = makeUnit('rifle', UnitType.RIFLEMAN, HUMAN_PLAYER_ID, tileCenter(10, 10), { holdPosition: holdPositionFlag });
        return makeState({ entities: entityMap(rifleman, enemy), fogOfWar: fullyVisible() });
    };

    it('chases targets normally', () => {
        const state = stateWith(false);
        const next = updateUnits(state, makeTickContext(100).ctx, gridOf(state));
        expect((next.entities['rifle'] as Unit).status).toBe('ATTACKING');
    });

    it('does not engage targets outside weapon range', () => {
        const state = stateWith(true);
        const next = updateUnits(state, makeTickContext(100).ctx, gridOf(state));
        expect((next.entities['rifle'] as Unit).status).toBe('IDLE');
    });

    it('still fires at targets inside weapon range', () => {
        const rifleman = makeUnit('rifle', UnitType.RIFLEMAN, HUMAN_PLAYER_ID, tileCenter(10, 10), { holdPosition: true });
        const close = makeUnit('enemy', UnitType.TANK, AI_ID, { x: tileCenter(10, 10).x + 100, y: tileCenter(10, 10).y });
        const state = makeState({ entities: entityMap(rifleman, close), fogOfWar: fullyVisible() });
        const next = updateUnits(state, makeTickContext(100).ctx, gridOf(state));
        expect((next.entities['rifle'] as Unit).status).toBe('ATTACKING');
    });

    it('is set by the hold command and cleared by stop', () => {
        const rifleman = makeUnit('rifle', UnitType.RIFLEMAN, HUMAN_PLAYER_ID, tileCenter(10, 10), { status: 'MOVING', path: [tileCenter(20, 10)] });
        const miner = makeUnit('miner', UnitType.CHRONO_MINER, HUMAN_PLAYER_ID, tileCenter(12, 10), { status: 'GATHERING' });
        const state = makeState({ entities: entityMap(rifleman, miner), selectedIds: ['rifle', 'miner'] });

        const held = holdPosition(state);
        expect((held.entities['rifle'] as Unit).holdPosition).toBe(true);
        expect((held.entities['rifle'] as Unit).path).toBeUndefined();
        expect((held.entities['miner'] as Unit).holdPosition).toBeUndefined(); // economy units ignore hold
        expect((held.entities['miner'] as Unit).status).toBe('GATHERING');

        const stopped = stopUnits(held);
        expect((stopped.entities['rifle'] as Unit).holdPosition).toBe(false);
        expect((stopped.entities['rifle'] as Unit).status).toBe('IDLE');
        expect((stopped.entities['miner'] as Unit).status).toBe('IDLE');
    });
});

describe('cancelProduction', () => {
    const barracks = makeBuilding('barracks', BuildingType.BARRACKS, HUMAN_PLAYER_ID, tileCenter(10, 10), {
        productionQueue: [UnitType.RIFLEMAN, UnitType.TESLA_TROOPER],
        productionProgress: 1500,
    });
    const cost = (type: UnitType) => ENTITY_CONFIGS[type].cost;

    it('refunds the item and resets progress when the front item is cancelled', () => {
        const state = makeState({ entities: entityMap(barracks) });
        const next = cancelProduction(state, 'barracks', 0);
        const after = next.entities['barracks'] as typeof barracks;

        expect(after.productionQueue).toEqual([UnitType.TESLA_TROOPER]);
        expect(after.productionProgress).toBe(0);
        expect(next.players[HUMAN_PLAYER_ID].credits).toBe(1000 + cost(UnitType.RIFLEMAN));
    });

    it('keeps progress on the front item when a later one is cancelled', () => {
        const state = makeState({ entities: entityMap(barracks) });
        const next = cancelProduction(state, 'barracks', 1);
        const after = next.entities['barracks'] as typeof barracks;

        expect(after.productionQueue).toEqual([UnitType.RIFLEMAN]);
        expect(after.productionProgress).toBe(1500);
        expect(next.players[HUMAN_PLAYER_ID].credits).toBe(1000 + cost(UnitType.TESLA_TROOPER));
    });

    it('ignores bad indexes and unknown buildings', () => {
        const state = makeState({ entities: entityMap(barracks) });
        expect(cancelProduction(state, 'barracks', 5)).toBe(state);
        expect(cancelProduction(state, 'barracks', -1)).toBe(state);
        expect(cancelProduction(state, 'nope', 0)).toBe(state);
    });
});
