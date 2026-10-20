import { AIConfiguration, BuildingType, FogState, GameState, PlayerId, PlayerState, PlayerStats } from '../../types';
import { DIFFICULTY_SETTINGS, ENTITY_CONFIGS, HUMAN_PLAYER_ID, MAP_HEIGHT, MAP_HEIGHT_TILES, MAP_WIDTH_TILES, STARTING_POSITIONS } from '../../constants';
import { generateMap } from '../../utils/map';
import { createRng } from '../../utils/random';
import { INITIAL_STATE } from '../initialState';
import { createInitialPlayerStats } from '../helpers';
import { updatePlayerPowerAndSuperweapons } from '../systems/power';
import { updateFogOfWar } from '../systems/fog';

export function startGame(state: GameState, opponents: AIConfiguration[], seed: number): GameState {
    const allPlayerIds = [HUMAN_PLAYER_ID, ...opponents.map(o => o.id)];
    const playerCount = allPlayerIds.length;

    const startingPositions = STARTING_POSITIONS[playerCount] || STARTING_POSITIONS[2];
    const { terrain, resourcePatches } = generateMap(startingPositions, createRng(seed));
    const fogOfWar = Array(MAP_HEIGHT_TILES).fill(0).map(() => Array(MAP_WIDTH_TILES).fill(FogState.UNEXPLORED));

    const newPlayers: Record<PlayerId, PlayerState> = {};
    const newEntities: GameState['entities'] = {};
    const newGameStats: Record<PlayerId, PlayerStats> = {};

    const hqConfig = ENTITY_CONFIGS[BuildingType.HQ];

    allPlayerIds.forEach((id, index) => {
        const difficulty = opponents.find(o => o.id === id)?.difficulty || 'NORMAL';
        const difficultySettings = DIFFICULTY_SETTINGS[difficulty];
        const hqId = `${id}_hq`;
        const startPos = startingPositions[index];

        newPlayers[id] = {
            id,
            credits: difficultySettings.startingCredits,
            power: { produced: 0, consumed: 0 },
            aiActionCooldown: difficultySettings.decisionInterval,
            hqId: hqId,
            superweapon: null,
        };

        newGameStats[id] = createInitialPlayerStats();

        newEntities[hqId] = {
            id: hqId,
            type: BuildingType.HQ,
            playerId: id,
            hp: hqConfig.hp,
            maxHp: hqConfig.hp,
            position: startPos,
            size: hqConfig.size,
            isPowered: true,
            productionQueue: [],
            productionProgress: 0,
        };
    });

    // Centre the camera on the human HQ, assuming a typical window; the scroll loop clamps it to the real size.
    const initialViewport = {
        x: Math.max(0, startingPositions[0].x - 500),
        y: Math.max(0, Math.min(MAP_HEIGHT - 700, startingPositions[0].y - 350)),
    };

    let startingState: GameState = {
        ...INITIAL_STATE,
        // Ids stay monotonic across games so the sound hook never mistakes new events for old ones.
        nextId: state.nextId,
        mapSeed: seed,
        players: newPlayers,
        aiOpponents: opponents,
        entities: newEntities,
        gameStatus: 'PLAYING',
        viewport: initialViewport,
        terrain,
        fogOfWar,
        resourcePatches,
        gameStats: newGameStats,
        gameSummary: null,
    };
    // Pre-tick to set initial power and fog
    startingState = updatePlayerPowerAndSuperweapons(startingState, { tick: 0, now: 0, emitSound: () => {} });
    startingState = updateFogOfWar(startingState);
    return startingState;
}

export function restartGame(state: GameState, seed: number): GameState {
    return startGame(state, state.aiOpponents, seed);
}

export function returnToMainMenu(state: GameState): GameState {
    // Keep terrain to avoid re-generating; keep the id counter monotonic.
    return { ...INITIAL_STATE, terrain: state.terrain, nextId: state.nextId };
}
