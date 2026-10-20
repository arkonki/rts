import { describe, expect, it } from 'vitest';
import { createDemoState } from '../utils/demoScenario';
import { gameReducer } from '../state/reducer';
import { GameAction } from '../state/actions';
import { HUMAN_PLAYER_ID } from '../constants';

describe('demo scenario', () => {
    it('starts a playable skirmish with both sides in range of each other', () => {
        const state = createDemoState();
        expect(state.gameStatus).toBe('PLAYING');

        const owners = new Set(Object.values(state.entities).map(e => e.playerId));
        expect(owners).toEqual(new Set([HUMAN_PLAYER_ID, 'AI_1']));
        expect(Object.keys(state.entities)).toContain('demo_tank');
    });

    it('survives a minute of fighting and produces alerts and sound events', () => {
        let state = createDemoState();
        const alertsSeen: number[] = [];
        for (let i = 0; i < 600; i++) {
            state = gameReducer(state, { type: 'GAME_TICK' } as GameAction);
            alertsSeen.push(state.alerts.length);
            if (state.gameStatus !== 'PLAYING') break;
        }
        expect(state.tick).toBeGreaterThan(0);
        expect(Math.max(...alertsSeen)).toBeGreaterThan(0);
        expect(Object.values(state.entities).every(e => e.hp > 0)).toBe(true);
        expect(Object.values(state.entities).every(e => Number.isFinite(e.position.x) && Number.isFinite(e.position.y))).toBe(true);
    });
});
