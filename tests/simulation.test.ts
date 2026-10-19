import { afterEach, describe, expect, it, vi } from 'vitest';
import { gameReducer } from '../state/reducer';
import { INITIAL_STATE } from '../state/initialState';
import { getLocalAICommand } from '../services/localAIService';
import { GameState, AIConfiguration, Building, BuildingType } from '../types';
import { createRng } from '../utils/random';

/** Plays the same loop the browser does (GAME_TICK plus useAI) without any UI. */
function simulate(opponents: AIConfiguration[], seed: number, ticks: number): GameState {
    let state = gameReducer(INITIAL_STATE, { type: 'START_GAME', payload: { opponents, seed } });
    for (let i = 0; i < ticks; i++) {
        state = gameReducer(state, { type: 'GAME_TICK' });
        for (const ai of state.aiOpponents) {
            if (state.gameStatus === 'PLAYING' && state.players[ai.id]?.aiActionCooldown <= 0) {
                state = gameReducer(state, { type: 'PERFORM_AI_ACTION', payload: getLocalAICommand(state, ai.id, ai) });
            }
        }
    }
    return state;
}

const completed = (state: GameState, playerId: string, type: BuildingType) =>
    Object.values(state.entities).filter(e => e.playerId === playerId && e.type === type && !(e as Building).isConstructing);

describe('headless simulation', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('lets an AI build an economy and an army with power enforced', () => {
        vi.spyOn(Math, 'random').mockImplementation(createRng(5));
        const ai: AIConfiguration = { id: 'AI_1', personality: 'BALANCED', difficulty: 'NORMAL' };
        const state = simulate([ai], 77, 3000); // 5 minutes of game time

        const summary = {
            status: state.gameStatus,
            credits: Math.round(state.players['AI_1'].credits),
            power: state.players['AI_1'].power,
            buildings: Object.values(state.entities).filter(e => e.playerId === 'AI_1' && 'isPowered' in e).map(e => e.type),
            units: Object.values(state.entities).filter(e => e.playerId === 'AI_1' && 'status' in e).map(e => e.type),
            stats: state.gameStats['AI_1'],
            message: state.lastMessage,
        };
        expect(Number.isFinite(state.players['AI_1'].credits)).toBe(true);
        expect(completed(state, 'AI_1', BuildingType.POWER_PLANT).length).toBeGreaterThan(0);
        expect(completed(state, 'AI_1', BuildingType.BARRACKS).length).toBeGreaterThan(0);
        // Power is kept up, so production buildings keep running and an army appears.
        expect(state.players['AI_1'].power.produced).toBeGreaterThanOrEqual(state.players['AI_1'].power.consumed);
        expect(summary.stats.unitsBuilt.TANK ?? 0).toBeGreaterThan(0);
    });

    it('lets an AI destroy an idle human base and end the game', () => {
        vi.spyOn(Math, 'random').mockImplementation(createRng(5));
        const ai: AIConfiguration = { id: 'AI_1', personality: 'AGGRESSIVE', difficulty: 'NORMAL' };
        const state = simulate([ai], 77, 9000); // 15 minutes of game time

        console.log('final status', state.gameStatus, 'tick', state.tick, 'human buildings', Object.values(state.entities).filter(e => e.playerId === 'PLAYER_1' && 'isPowered' in e).length);
        expect(state.gameStatus).toBe('AI_WIN');
        expect(state.gameSummary).not.toBeNull();
    });
});
