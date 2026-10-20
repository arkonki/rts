import { GameState, SoundEffect } from '../../types';
import { ALERT_LIFETIME_TICKS, GAME_LOOP_INTERVAL, TILE_SIZE } from '../../constants';
import { SpatialGrid } from '../../utils/spatialGrid';
import { SOUND_RETENTION_TICKS, TickContext } from '../helpers';
import { updateBuildingConstruction } from './construction';
import { updateBuildingProduction } from './production';
import { updateUnits } from './units';
import { updatePlayerPowerAndSuperweapons } from './power';
import { updateFogOfWar } from './fog';
import { updateVisualEffects } from './effects';
import { checkWinLossConditions, updateAICooldowns } from './victory';

/** Advances the simulation by one tick. Pure: time comes from state.tick, sounds are returned as state. */
export function gameTick(state: GameState): GameState {
    if (state.gameStatus !== 'PLAYING') return state;

    const tick = state.tick + 1;
    const now = tick * GAME_LOOP_INTERVAL;

    const newSounds: { sound: SoundEffect; volume?: number }[] = [];
    const ctx: TickContext = { tick, now, emitSound: (sound, volume) => { newSounds.push({ sound, volume }); } };

    const spatialGrid = new SpatialGrid(TILE_SIZE * 5);
    Object.values(state.entities).forEach(e => spatialGrid.insert(e));

    let nextState = state;
    nextState = updateBuildingConstruction(nextState, ctx);
    nextState = updateBuildingProduction(nextState, ctx);
    nextState = updateUnits(nextState, ctx, spatialGrid);
    nextState = updatePlayerPowerAndSuperweapons(nextState, ctx);
    nextState = updateFogOfWar(nextState);

    const newGameStatus = checkWinLossConditions(nextState);
    const gameJustEnded = (newGameStatus === 'PLAYER_WIN' || newGameStatus === 'AI_WIN') && state.gameStatus === 'PLAYING';

    // Keep recent sounds (the sound hook dedupes by id) and append this tick's.
    const keptSounds = nextState.soundEvents.filter(e => e.tick > tick - SOUND_RETENTION_TICKS);
    let nextId = nextState.nextId;
    const soundEvents = [...keptSounds, ...newSounds.map(s => ({ id: nextId++, sound: s.sound, volume: s.volume, tick }))];

    return {
        ...nextState,
        tick,
        nextId,
        soundEvents,
        visualEffects: updateVisualEffects(nextState.visualEffects, now),
        alerts: nextState.alerts.some(a => tick - a.tick >= ALERT_LIFETIME_TICKS)
            ? nextState.alerts.filter(a => tick - a.tick < ALERT_LIFETIME_TICKS)
            : nextState.alerts,
        players: updateAICooldowns(nextState.players),
        gameStatus: newGameStatus,
        // If the game just ended, capture the stats for the summary screen.
        gameSummary: gameJustEnded ? nextState.gameStats : state.gameSummary,
    };
}
