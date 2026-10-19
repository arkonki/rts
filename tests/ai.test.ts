import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLocalAICommand } from '../services/localAIService';
import { performAIAction } from '../state/commands/aiActions';
import { startGame } from '../state/commands/game';
import { INITIAL_STATE } from '../state/initialState';
import { findBuildPlacement } from '../utils/aiHelpers';
import { getPlacementError } from '../utils/placement';
import { createRng } from '../utils/random';
import { AIConfiguration, AIAction, Building, BuildingType, UnitType } from '../types';
import { ENTITY_CONFIGS, HUMAN_PLAYER_ID } from '../constants';
import { AI_ID, entityMap, makeBuilding, makePlayer, makeState, makeUnit, tileCenter } from './helpers';

const balanced: AIConfiguration = { id: AI_ID, personality: 'BALANCED', difficulty: 'NORMAL' };
const aggressive: AIConfiguration = { ...balanced, personality: 'AGGRESSIVE' };

afterEach(() => {
    vi.restoreAllMocks();
});

// findBuildPlacement samples positions with Math.random; pin it so tests are repeatable.
const seedRandom = (seed: number) => vi.spyOn(Math, 'random').mockImplementation(createRng(seed));

describe('getLocalAICommand', () => {
    it('builds a power plant first in a fresh game', () => {
        seedRandom(7);
        const state = startGame(INITIAL_STATE, [balanced], 42);
        const action = getLocalAICommand(state, AI_ID, balanced);

        expect(action.action).toBe('BUILD');
        expect(action.buildingType).toBe(BuildingType.POWER_PLANT);
        const centre = tileCenter(action.placementPosition!.x, action.placementPosition!.y);
        expect(getPlacementError(BuildingType.POWER_PLANT, centre, state.terrain, state.entities, AI_ID)).toBeNull();
    });

    it('builds a power plant before a war factory', () => {
        seedRandom(3);
        const entities = entityMap(
            makeBuilding(`${AI_ID}_hq`, BuildingType.HQ, AI_ID, tileCenter(40, 30)),
            makeBuilding('barracks', BuildingType.BARRACKS, AI_ID, tileCenter(40, 36)),
            makeBuilding('refinery', BuildingType.REFINERY, AI_ID, tileCenter(34, 30)),
            makeUnit('miner', UnitType.CHRONO_MINER, AI_ID, tileCenter(34, 33), { status: 'GATHERING' }),
        );
        const state = makeState({
            entities,
            players: {
                [HUMAN_PLAYER_ID]: makePlayer(HUMAN_PLAYER_ID),
                [AI_ID]: makePlayer(AI_ID, { credits: 2000, power: { produced: 0, consumed: 30 } }),
            },
        });

        const action = getLocalAICommand(state, AI_ID, aggressive);
        expect(action.action).toBe('BUILD');
        expect(action.buildingType).toBe(BuildingType.POWER_PLANT);
    });

    it('defends the base when an enemy attacks a building', () => {
        const entities = entityMap(
            makeBuilding(`${AI_ID}_hq`, BuildingType.HQ, AI_ID, tileCenter(40, 30)),
            makeUnit('defender', UnitType.TANK, AI_ID, tileCenter(38, 30)),
            makeUnit('raider', UnitType.RIFLEMAN, HUMAN_PLAYER_ID, tileCenter(42, 30), { status: 'ATTACKING', targetId: `${AI_ID}_hq` }),
        );
        const action = getLocalAICommand(makeState({ entities }), AI_ID, balanced);

        expect(action.action).toBe('ATTACK');
        expect(action.attackTargetId).toBe('raider');
        expect(action.unitIds).toEqual(['defender']);
    });

    it('idles when the AI has nothing left', () => {
        const action = getLocalAICommand(makeState({ entities: {} }), AI_ID, balanced);
        expect(action.action).toBe('IDLE');
    });
});

describe('findBuildPlacement', () => {
    it('returns tile positions that pass the shared placement rules', () => {
        seedRandom(11);
        const state = startGame(INITIAL_STATE, [balanced], 99);
        const hq = state.entities[`${AI_ID}_hq`];
        const tile = findBuildPlacement(BuildingType.POWER_PLANT, AI_ID, hq.position, state);

        expect(tile).not.toBeNull();
        expect(getPlacementError(BuildingType.POWER_PLANT, tileCenter(tile!.x, tile!.y), state.terrain, state.entities, AI_ID)).toBeNull();
    });
});

describe('performAIAction', () => {
    const aiHq = makeBuilding(`${AI_ID}_hq`, BuildingType.HQ, AI_ID, tileCenter(40, 30));

    it('starts a valid build and charges the AI', () => {
        const state = makeState({ entities: entityMap(aiHq) });
        const action: AIAction = { playerId: AI_ID, action: 'BUILD', buildingType: BuildingType.POWER_PLANT, placementPosition: { x: 44, y: 30 } };
        const next = performAIAction(state, action);

        expect(next.players[AI_ID].credits).toBe(1000 - ENTITY_CONFIGS[BuildingType.POWER_PLANT].cost);
        const built = Object.values(next.entities).filter(e => e.type === BuildingType.POWER_PLANT) as Building[];
        expect(built).toHaveLength(1);
        expect(built[0].isConstructing).toBe(true);
        expect(next.nextId).toBe(state.nextId + 1);
        // The previous state must not be mutated.
        expect(Object.keys(state.entities)).toEqual([aiHq.id]);
        expect(state.players[AI_ID].credits).toBe(1000);
    });

    it('rejects a build that breaks placement rules', () => {
        const state = makeState({ entities: entityMap(aiHq) });
        const action: AIAction = { playerId: AI_ID, action: 'BUILD', buildingType: BuildingType.WAR_FACTORY, placementPosition: { x: 44, y: 30 } };
        const next = performAIAction(state, action);

        expect(next.players[AI_ID].credits).toBe(1000);
        expect(Object.keys(next.entities)).toEqual([aiHq.id]);
        expect(next.lastMessage).toMatch(/requires/i);
    });

    it('ignores attack orders for units that cannot hit the target', () => {
        const entities = entityMap(
            aiHq,
            makeUnit('tesla', UnitType.TESLA_TROOPER, AI_ID, tileCenter(40, 33)),
            makeUnit('jet', UnitType.FIGHTER_JET, HUMAN_PLAYER_ID, tileCenter(42, 33)),
        );
        const action: AIAction = { playerId: AI_ID, action: 'ATTACK', attackTargetId: 'jet', unitIds: ['tesla'] };
        const next = performAIAction(makeState({ entities }), action);

        expect((next.entities['tesla'] as { status: string }).status).toBe('IDLE');
    });

    it('resets the decision cooldown', () => {
        const state = makeState({ entities: entityMap(aiHq), players: { [HUMAN_PLAYER_ID]: makePlayer(HUMAN_PLAYER_ID), [AI_ID]: makePlayer(AI_ID, { aiActionCooldown: -50 }) } });
        const next = performAIAction(state, { playerId: AI_ID, action: 'IDLE' });
        expect(next.players[AI_ID].aiActionCooldown).toBeGreaterThan(0);
    });
});
