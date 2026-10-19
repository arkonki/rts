import { Building, BuildingType, GameState, Position, UnitType } from '../../types';
import { ENTITY_CONFIGS, HUMAN_PLAYER_ID } from '../../constants';
import { getPlacementError } from '../../utils/placement';
import { meetsRequirements } from '../../utils/logic';
import { makeEntityId, withSound } from '../helpers';

export function queueProduction(state: GameState, buildingId: string, itemType: UnitType | BuildingType): GameState {
    const producer = state.entities[buildingId] as Building;
    if (!producer || !producer.isPowered) return state;

    const playerState = state.players[producer.playerId];
    const config = ENTITY_CONFIGS[itemType];

    const requirementsMet = meetsRequirements(config, state.entities, playerState.id);
    const isRightProducer = config.producedBy === producer.type;

    if (playerState.credits < config.cost || !requirementsMet || !isRightProducer) {
        return producer.playerId === HUMAN_PLAYER_ID ? withSound(state, 'insufficient_funds') : state;
    }

    const newPlayerState = { ...playerState, credits: playerState.credits - config.cost };
    const newProducer = { ...producer, productionQueue: [...producer.productionQueue, itemType] };

    return {
        ...state,
        players: { ...state.players, [producer.playerId]: newPlayerState },
        entities: { ...state.entities, [buildingId]: newProducer },
    };
}

export function placeBuilding(state: GameState, buildingType: BuildingType, position: Position): GameState {
    const config = ENTITY_CONFIGS[buildingType];
    const humanPlayerState = state.players[HUMAN_PLAYER_ID];

    if (humanPlayerState.credits < config.cost) {
        return withSound({ ...state, lastMessage: `Not enough credits for a ${config.name}.` }, 'insufficient_funds');
    }

    const placementError = getPlacementError(buildingType, position, state.terrain, state.entities, HUMAN_PLAYER_ID);
    if (placementError) {
        return withSound({ ...state, lastMessage: placementError }, 'insufficient_funds');
    }

    const newPlayerState = { ...humanPlayerState, credits: humanPlayerState.credits - config.cost };
    const newId = makeEntityId(HUMAN_PLAYER_ID, buildingType, state.nextId);
    const newBuilding: Building = {
        id: newId, type: buildingType, playerId: HUMAN_PLAYER_ID, hp: 1, maxHp: config.hp, position,
        size: config.size, isPowered: false, productionQueue: [], productionProgress: 0, isConstructing: true,
    };
    return withSound({
        ...state,
        players: { ...state.players, [HUMAN_PLAYER_ID]: newPlayerState },
        entities: { ...state.entities, [newId]: newBuilding },
        nextId: state.nextId + 1,
        lastMessage: `Constructing ${config.name}...`,
    }, 'place_building');
}
