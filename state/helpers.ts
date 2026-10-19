import { BuildingType, GameState, PlayerId, PlayerStats, SoundEffect, UnitType } from '../types';
import { GAME_LOOP_INTERVAL } from '../constants';

export type SoundEmitter = (sound: SoundEffect, volume?: number) => void;

/** Per-tick context handed to every simulation system. */
export interface TickContext {
    tick: number;
    /** Game time in ms (tick * GAME_LOOP_INTERVAL). Pauses with the game, unlike Date.now(). */
    now: number;
    emitSound: SoundEmitter;
}

/** Game time in ms for a state, for code that runs outside the tick (commands). */
export const gameTime = (state: GameState) => state.tick * GAME_LOOP_INTERVAL;

/** How many ticks a sound event stays in state; plenty for the sound hook's effect to have played it. */
export const SOUND_RETENTION_TICKS = 3;

/** Returns a new state with a sound queued for the sound hook to play. */
export function withSound(state: GameState, sound: SoundEffect, volume?: number): GameState {
    return {
        ...state,
        soundEvents: [...state.soundEvents, { id: state.nextId, sound, volume, tick: state.tick }],
        nextId: state.nextId + 1,
    };
}

export const createInitialPlayerStats = (): PlayerStats => ({
    unitsBuilt: {},
    buildingsConstructed: {},
    unitsLost: 0,
    enemiesKilled: 0,
    creditsEarned: 0,
});

/** Immutable update of one player's stats; returns the same object when the player has no stats. */
export function withStats(all: Record<PlayerId, PlayerStats>, playerId: PlayerId, update: (stats: PlayerStats) => PlayerStats): Record<PlayerId, PlayerStats> {
    const stats = all[playerId];
    return stats ? { ...all, [playerId]: update(stats) } : all;
}

/** Shallow field comparison; cheap stand-in for JSON.stringify equality on flat entity/player objects. */
export function shallowChanged<T extends object>(a: T, b: T): boolean {
    const ra = a as Record<string, unknown>;
    const rb = b as Record<string, unknown>;
    for (const key in ra) if (ra[key] !== rb[key]) return true;
    for (const key in rb) if (ra[key] !== rb[key]) return true;
    return false;
}

export const makeEntityId = (playerId: PlayerId, type: UnitType | BuildingType, counter: number) =>
    `${playerId}_${type.toLowerCase()}_${counter}`;
