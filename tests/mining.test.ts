import { describe, expect, it } from 'vitest';
import { gameTick } from '../state/systems/tick';
import { updateUnits } from '../state/systems/units';
import { stopUnits } from '../state/commands/unitCommands';
import { SpatialGrid } from '../utils/spatialGrid';
import { BuildingType, GameState, ResourcePatch, Unit, UnitType } from '../types';
import { ENTITY_CONFIGS, HUMAN_PLAYER_ID, TILE_SIZE } from '../constants';
import { entityMap, makeBuilding, makeState, makeTickContext, makeUnit, tileCenter } from './helpers';

const capacity = ENTITY_CONFIGS[UnitType.CHRONO_MINER].gatherCapacity!;

const ore = (id: string, tileX: number, tileY: number, amount = 4000): ResourcePatch => ({
    id, position: tileCenter(tileX, tileY), amount, maxAmount: amount, size: TILE_SIZE * 0.8,
});

const gridOf = (state: GameState) => {
    const grid = new SpatialGrid(TILE_SIZE * 5);
    Object.values(state.entities).forEach(e => grid.insert(e));
    return grid;
};

const hq = makeBuilding('hq', BuildingType.HQ, HUMAN_PLAYER_ID, tileCenter(4, 10));

describe('miners and refineries', () => {
    it('return to a refinery even when low power has switched it off', () => {
        const refinery = makeBuilding('refinery', BuildingType.REFINERY, HUMAN_PLAYER_ID, tileCenter(8, 10), { isPowered: false });
        const miner = makeUnit('miner', UnitType.CHRONO_MINER, HUMAN_PLAYER_ID, tileCenter(14, 10), {
            status: 'GATHERING', gatherTargetId: 'ore1', cargoAmount: capacity - 10,
        });
        const state = makeState({ entities: entityMap(hq, refinery, miner), resourcePatches: { ore1: ore('ore1', 14, 10) } });

        const next = updateUnits(state, makeTickContext(1).ctx, gridOf(state));
        const after = next.entities['miner'] as Unit;
        expect(after.status).toBe('RETURNING_TO_REFINERY');
        expect(after.refineryTargetId).toBe('refinery');
    });

    it('keep trying when no refinery exists yet, then return once one is finished', () => {
        const miner = makeUnit('miner', UnitType.CHRONO_MINER, HUMAN_PLAYER_ID, tileCenter(14, 10), {
            status: 'GATHERING', gatherTargetId: 'ore1', cargoAmount: capacity - 10,
        });
        let state = makeState({ entities: entityMap(hq, miner), resourcePatches: { ore1: ore('ore1', 14, 10) } });

        state = updateUnits(state, makeTickContext(1).ctx, gridOf(state));
        expect((state.entities['miner'] as Unit).status).toBe('IDLE'); // nowhere to unload

        const refinery = makeBuilding('refinery', BuildingType.REFINERY, HUMAN_PLAYER_ID, tileCenter(8, 10));
        state = { ...state, entities: { ...state.entities, refinery } };

        state = updateUnits(state, makeTickContext(10).ctx, gridOf(state)); // retries every 10 ticks
        expect((state.entities['miner'] as Unit).status).toBe('RETURNING_TO_REFINERY');
    });

    it('does not use a refinery that is still being built', () => {
        const refinery = makeBuilding('refinery', BuildingType.REFINERY, HUMAN_PLAYER_ID, tileCenter(8, 10), { isConstructing: true, isPowered: false });
        const miner = makeUnit('miner', UnitType.CHRONO_MINER, HUMAN_PLAYER_ID, tileCenter(14, 10), {
            status: 'GATHERING', gatherTargetId: 'ore1', cargoAmount: capacity - 10,
        });
        const state = makeState({ entities: entityMap(hq, refinery, miner), resourcePatches: { ore1: ore('ore1', 14, 10) } });
        const next = updateUnits(state, makeTickContext(1).ctx, gridOf(state));
        expect((next.entities['miner'] as Unit).status).toBe('IDLE');
    });

    it('resume mining after being left idle', () => {
        const refinery = makeBuilding('refinery', BuildingType.REFINERY, HUMAN_PLAYER_ID, tileCenter(8, 10));
        const miner = makeUnit('miner', UnitType.CHRONO_MINER, HUMAN_PLAYER_ID, tileCenter(8, 12), {
            status: 'IDLE', gatherTargetId: 'ore1', cargoAmount: 0,
        });
        const state = makeState({ entities: entityMap(hq, refinery, miner), resourcePatches: { ore1: ore('ore1', 14, 10) } });
        const next = updateUnits(state, makeTickContext(10).ctx, gridOf(state));
        expect((next.entities['miner'] as Unit).status).toBe('MOVING_TO_ORE');
    });

    it('stay put after the player gives a stop order', () => {
        const refinery = makeBuilding('refinery', BuildingType.REFINERY, HUMAN_PLAYER_ID, tileCenter(8, 10));
        const miner = makeUnit('miner', UnitType.CHRONO_MINER, HUMAN_PLAYER_ID, tileCenter(14, 10), {
            status: 'GATHERING', gatherTargetId: 'ore1', cargoAmount: 200,
        });
        let state = makeState({ entities: entityMap(hq, refinery, miner), resourcePatches: { ore1: ore('ore1', 14, 10) }, selectedIds: ['miner'] });
        state = stopUnits(state);
        state = updateUnits(state, makeTickContext(10).ctx, gridOf(state));
        expect((state.entities['miner'] as Unit).status).toBe('IDLE');
    });

    it('earn credits in a full mining loop while the base is short of power', () => {
        // HQ plus a refinery draw 20 power and nothing produces any, so the refinery is switched off.
        const refinery = makeBuilding('refinery', BuildingType.REFINERY, HUMAN_PLAYER_ID, tileCenter(8, 10));
        const miner = makeUnit('miner', UnitType.CHRONO_MINER, HUMAN_PLAYER_ID, tileCenter(12, 10), {
            status: 'GATHERING', gatherTargetId: 'ore1',
        });
        let state = makeState({
            aiOpponents: [],
            entities: entityMap(hq, refinery, miner),
            resourcePatches: { ore1: ore('ore1', 12, 10, 100000) },
        });
        const startCredits = state.players[HUMAN_PLAYER_ID].credits;

        for (let i = 0; i < 600; i++) state = gameTick(state);

        expect((state.entities['refinery'] as { isPowered: boolean }).isPowered).toBe(false);
        expect(state.players[HUMAN_PLAYER_ID].credits).toBeGreaterThan(startCredits);
        expect(state.gameStats[HUMAN_PLAYER_ID].creditsEarned).toBeGreaterThanOrEqual(capacity * 2);
    });
});
