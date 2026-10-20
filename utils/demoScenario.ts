import { AIConfiguration, Building, BuildingType, GameEntity, GameState, Unit, UnitType } from '../types';
import { ENTITY_CONFIGS, HUMAN_PLAYER_ID } from '../constants';
import { INITIAL_STATE } from '../state/initialState';
import { startGame } from '../state/commands/game';

const AI_ID = 'AI_1';

function unit(id: string, type: UnitType, playerId: string, x: number, y: number, facing = 0): Unit {
    const config = ENTITY_CONFIGS[type];
    return {
        id, type, playerId, position: { x, y }, hp: config.hp, maxHp: config.hp, size: config.size,
        domain: config.domain!, status: 'IDLE', damage: config.damage, attackRange: config.attackRange,
        lastAttackTime: 0, cargoAmount: 0, facing,
    };
}

function building(id: string, type: BuildingType, playerId: string, x: number, y: number, overrides: Partial<Building> = {}): Building {
    const config = ENTITY_CONFIGS[type];
    return {
        id, type, playerId, position: { x, y }, hp: config.hp, maxHp: config.hp, size: config.size,
        isPowered: true, productionQueue: [], productionProgress: 0, ...overrides,
    };
}

/**
 * A ready-made skirmish for looking at the art and effects: the human has a few buildings and one of
 * every combat unit, and an enemy squad is already in weapon range. Open the game with `?demo`.
 */
export function createDemoState(): GameState {
    const opponents: AIConfiguration[] = [{ id: AI_ID, personality: 'BALANCED', difficulty: 'NORMAL' }];
    const started = startGame(INITIAL_STATE, opponents, 2024);
    const hq = started.entities[`${HUMAN_PLAYER_ID}_hq`];
    const { x, y } = hq.position;

    const extra: GameEntity[] = [
        building('demo_plant', BuildingType.POWER_PLANT, HUMAN_PLAYER_ID, x + 130, y - 90),
        building('demo_barracks', BuildingType.BARRACKS, HUMAN_PLAYER_ID, x + 130, y + 80, { productionQueue: [UnitType.RIFLEMAN, UnitType.TANK] , productionProgress: 1200 }),
        building('demo_refinery', BuildingType.REFINERY, HUMAN_PLAYER_ID, x - 20, y - 130, { hp: 300 }),
        building('demo_factory', BuildingType.WAR_FACTORY, HUMAN_PLAYER_ID, x - 110, y + 120, { hp: 250 }),
        building('demo_building', BuildingType.REPAIR_BAY, HUMAN_PLAYER_ID, x + 20, y + 150, { hp: 300, isConstructing: true }),

        unit('demo_tank', UnitType.TANK, HUMAN_PLAYER_ID, x + 190, y - 10, 90),
        unit('demo_tank2', UnitType.TANK, HUMAN_PLAYER_ID, x + 190, y + 40, 90),
        unit('demo_rifle', UnitType.RIFLEMAN, HUMAN_PLAYER_ID, x + 175, y - 50, 90),
        unit('demo_rifle2', UnitType.RIFLEMAN, HUMAN_PLAYER_ID, x + 175, y + 80, 90),
        unit('demo_tesla', UnitType.TESLA_TROOPER, HUMAN_PLAYER_ID, x + 215, y + 15, 90),
        unit('demo_prism', UnitType.PRISM_TANK, HUMAN_PLAYER_ID, x + 150, y + 10, 90),
        unit('demo_apoc', UnitType.APOCALYPSE_TANK, HUMAN_PLAYER_ID, x + 120, y + 130, 90),
        unit('demo_miner', UnitType.CHRONO_MINER, HUMAN_PLAYER_ID, x - 60, y - 40),
        unit('demo_engineer', UnitType.ENGINEER, HUMAN_PLAYER_ID, x + 60, y + 60),
        unit('demo_jet', UnitType.FIGHTER_JET, HUMAN_PLAYER_ID, x + 160, y - 110, 90),

        unit('foe_tank', UnitType.TANK, AI_ID, x + 380, y + 5, -90),
        unit('foe_tank2', UnitType.TANK, AI_ID, x + 390, y + 45, -90),
        unit('foe_rifle', UnitType.RIFLEMAN, AI_ID, x + 360, y - 40, -90),
        unit('foe_tesla', UnitType.TESLA_TROOPER, AI_ID, x + 340, y + 20, -90),
        unit('foe_apoc', UnitType.APOCALYPSE_TANK, AI_ID, x + 400, y - 20, -90),
        unit('foe_rocketeer', UnitType.ROCKETEER, AI_ID, x + 350, y - 80, -90),
        unit('foe_destroyer', UnitType.DESTROYER, AI_ID, x + 410, y + 90, -90),
    ];

    const entities = { ...started.entities };
    extra.forEach(e => { entities[e.id] = e; });
    return {
        ...started,
        entities,
        nextId: started.nextId + extra.length,
        players: { ...started.players, [HUMAN_PLAYER_ID]: { ...started.players[HUMAN_PLAYER_ID], credits: 5000 } },
    };
}

/** The reducer's starting state: the demo skirmish when the URL has `?demo`, otherwise the main menu. */
export function createInitialState(): GameState {
    const wantsDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo');
    return wantsDemo ? createDemoState() : INITIAL_STATE;
}
