import { Building, BuildingType, FogState, GameEntity, GameState, PlayerId, PlayerState, Position, TerrainType, Unit, UnitType } from '../types';
import { ENTITY_CONFIGS, HUMAN_PLAYER_ID, MAP_HEIGHT_TILES, MAP_WIDTH_TILES, TILE_SIZE } from '../constants';
import { INITIAL_STATE } from '../state/initialState';
import { TickContext, createInitialPlayerStats } from '../state/helpers';

export const AI_ID = 'AI_1';

export const tileCenter = (tileX: number, tileY: number): Position => ({
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
});

export function makeTerrain(fill: TerrainType = TerrainType.GROUND): TerrainType[][] {
    return Array.from({ length: MAP_HEIGHT_TILES }, () => Array<TerrainType>(MAP_WIDTH_TILES).fill(fill));
}

export function makePlayer(id: PlayerId, overrides: Partial<PlayerState> = {}): PlayerState {
    return {
        id,
        credits: 1000,
        power: { produced: 0, consumed: 0 },
        aiActionCooldown: 0,
        hqId: `${id}_hq`,
        superweapon: null,
        ...overrides,
    };
}

export function makeBuilding(id: string, type: BuildingType, playerId: PlayerId, position: Position, overrides: Partial<Building> = {}): Building {
    const config = ENTITY_CONFIGS[type];
    return {
        id, type, playerId, position,
        hp: config.hp, maxHp: config.hp, size: config.size,
        isPowered: true, productionQueue: [], productionProgress: 0,
        ...overrides,
    };
}

export function makeUnit(id: string, type: UnitType, playerId: PlayerId, position: Position, overrides: Partial<Unit> = {}): Unit {
    const config = ENTITY_CONFIGS[type];
    return {
        id, type, playerId, position,
        hp: config.hp, maxHp: config.hp, size: config.size,
        domain: config.domain!, status: 'IDLE',
        damage: config.damage, attackRange: config.attackRange, lastAttackTime: 0,
        ...overrides,
    };
}

export const entityMap = (...entities: GameEntity[]): Record<string, GameEntity> =>
    Object.fromEntries(entities.map(e => [e.id, e] as const));

/** A PLAYING game on open ground with a human and one AI opponent, and no entities unless given. */
export function makeState(overrides: Partial<GameState> = {}): GameState {
    return {
        ...INITIAL_STATE,
        gameStatus: 'PLAYING',
        terrain: makeTerrain(),
        fogOfWar: Array.from({ length: MAP_HEIGHT_TILES }, () => Array<FogState>(MAP_WIDTH_TILES).fill(FogState.UNEXPLORED)),
        players: {
            [HUMAN_PLAYER_ID]: makePlayer(HUMAN_PLAYER_ID),
            [AI_ID]: makePlayer(AI_ID),
        },
        aiOpponents: [{ id: AI_ID, personality: 'BALANCED', difficulty: 'NORMAL' }],
        gameStats: {
            [HUMAN_PLAYER_ID]: createInitialPlayerStats(),
            [AI_ID]: createInitialPlayerStats(),
        },
        ...overrides,
    };
}

export function makeTickContext(tick = 1): { ctx: TickContext; sounds: string[] } {
    const sounds: string[] = [];
    return { ctx: { tick, now: tick * 100, emitSound: sound => { sounds.push(sound); } }, sounds };
}
