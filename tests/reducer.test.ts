import { afterEach, describe, expect, it, vi } from 'vitest';
import { gameReducer } from '../state/reducer';
import { INITIAL_STATE } from '../state/initialState';
import { GameAction } from '../state/actions';
import { AIConfiguration, BuildingType, FogState, GameState } from '../types';

const opponents: AIConfiguration[] = [{ id: 'AI_1', personality: 'BALANCED', difficulty: 'NORMAL' }];

const start = (seed: number, state: GameState = INITIAL_STATE) =>
    gameReducer(state, { type: 'START_GAME', payload: { opponents, seed } });

const reduce = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state);

const ticks = (count: number): GameAction[] => Array.from({ length: count }, () => ({ type: 'GAME_TICK' as const }));

afterEach(() => {
    vi.restoreAllMocks();
});

describe('gameReducer purity', () => {
    it('does not read the clock or use Math.random', () => {
        const fail = () => { throw new Error('reducer must be pure'); };
        vi.spyOn(Date, 'now').mockImplementation(fail);
        vi.spyOn(Math, 'random').mockImplementation(fail);

        let state: GameState;
        try {
            state = reduce(start(1), ...ticks(50), { type: 'PAUSE_GAME' }, { type: 'RESUME_GAME' });
        } finally {
            vi.restoreAllMocks(); // restore before asserting so the test runner's own clock use is unaffected
        }
        expect(state.tick).toBe(50);
    });

    it('is deterministic for the same seed and actions', () => {
        const a = reduce(start(123), ...ticks(40));
        const b = reduce(start(123), ...ticks(40));
        expect(a).toEqual(b);
    });

    it('generates different maps for different seeds', () => {
        expect(start(1).terrain).not.toEqual(start(2).terrain);
        expect(start(1).mapSeed).toBe(1);
    });

    it('restarts with a new seed while keeping opponents and a monotonic id counter', () => {
        const playing = reduce(start(1), ...ticks(5));
        const restarted = gameReducer(playing, { type: 'RESTART_GAME', payload: { seed: 2 } });
        expect(restarted.mapSeed).toBe(2);
        expect(restarted.tick).toBe(0);
        expect(restarted.aiOpponents).toEqual(opponents);
        expect(restarted.nextId).toBeGreaterThanOrEqual(playing.nextId);
    });

    it('does not advance the simulation while paused', () => {
        const paused = reduce(start(1), ...ticks(3), { type: 'PAUSE_GAME' });
        expect(reduce(paused, ...ticks(10)).tick).toBe(3);
    });

    it('prunes old sound events', () => {
        const state = reduce(start(1), { type: 'COMMAND_MOVE', payload: { x: 0, y: 0 } });
        const withSound: GameState = { ...state, soundEvents: [{ id: 999, sound: 'click', tick: state.tick }] };
        const later = reduce(withSound, ...ticks(10));
        expect(later.soundEvents.find(e => e.id === 999)).toBeUndefined();
    });
});

describe('game lifecycle', () => {
    it('starts with an HQ per player, powered, and fog revealed around the human', () => {
        const state = start(5);
        expect(Object.keys(state.players).sort()).toEqual(['AI_1', 'PLAYER_1']);
        expect(Object.values(state.entities).filter(e => e.type === BuildingType.HQ)).toHaveLength(2);
        expect(state.gameStatus).toBe('PLAYING');
        expect(state.fogOfWar.flat().some(cell => cell !== FogState.UNEXPLORED)).toBe(true);
    });

    it('returns to the menu without losing the id counter', () => {
        const playing = reduce(start(5), ...ticks(3));
        const menu = gameReducer(playing, { type: 'MAIN_MENU' });
        expect(menu.gameStatus).toBe('MENU');
        expect(menu.nextId).toBe(playing.nextId);
    });
});
