import { describe, expect, it } from 'vitest';
import { checkWinLossConditions } from '../state/systems/victory';
import { BuildingType, UnitType } from '../types';
import { HUMAN_PLAYER_ID } from '../constants';
import { AI_ID, entityMap, makeBuilding, makeState, makeUnit, tileCenter } from './helpers';

const humanHq = makeBuilding('human_hq', BuildingType.HQ, HUMAN_PLAYER_ID, tileCenter(5, 5));
const aiHq = makeBuilding('ai_hq', BuildingType.HQ, AI_ID, tileCenter(50, 50));

describe('checkWinLossConditions', () => {
    it('keeps playing while both sides have buildings', () => {
        expect(checkWinLossConditions(makeState({ entities: entityMap(humanHq, aiHq) }))).toBe('PLAYING');
    });

    it('is a defeat when the human has no buildings, even with units left', () => {
        const state = makeState({
            entities: entityMap(aiHq, makeUnit('tank', UnitType.TANK, HUMAN_PLAYER_ID, tileCenter(6, 6))),
        });
        expect(checkWinLossConditions(state)).toBe('AI_WIN');
    });

    it('is a victory when every AI opponent has no buildings left', () => {
        const state = makeState({
            entities: entityMap(humanHq, makeUnit('tank', UnitType.TANK, AI_ID, tileCenter(40, 40))),
        });
        expect(checkWinLossConditions(state)).toBe('PLAYER_WIN');
    });

    it('needs all opponents eliminated in a multi-AI game', () => {
        const state = makeState({
            aiOpponents: [
                { id: 'AI_1', personality: 'BALANCED', difficulty: 'NORMAL' },
                { id: 'AI_2', personality: 'BALANCED', difficulty: 'NORMAL' },
            ],
            entities: entityMap(humanHq, aiHq),
        });
        expect(checkWinLossConditions(state)).toBe('PLAYING');
    });

    it('never declares a winner when there are no opponents', () => {
        expect(checkWinLossConditions(makeState({ aiOpponents: [], entities: entityMap(humanHq) }))).toBe('PLAYING');
    });

    it('keeps a finished result sticky', () => {
        expect(checkWinLossConditions(makeState({ gameStatus: 'PLAYER_WIN', entities: {} }))).toBe('PLAYER_WIN');
        expect(checkWinLossConditions(makeState({ gameStatus: 'AI_WIN', entities: entityMap(aiHq) }))).toBe('AI_WIN');
    });
});
