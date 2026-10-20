import { GameState } from '../types';
import { GameAction } from './actions';
import { INITIAL_STATE } from './initialState';
import { gameTick } from './systems/tick';
import { restartGame, returnToMainMenu, startGame } from './commands/game';
import { createControlGroup, select, selectAndCenterControlGroup, selectControlGroup } from './commands/selection';
import { commandAttack, commandGather, commandMove, commandRepair, holdPosition, setRallyPoint, stopUnits } from './commands/unitCommands';
import { cancelProduction, placeBuilding, queueProduction } from './commands/buildCommands';
import { activateChronoTeleport, chronoTeleportUnits, launchNuke } from './commands/superweapons';
import { performAIAction } from './commands/aiActions';

export { INITIAL_STATE };

/**
 * The game reducer is a pure function of (state, action): no sounds, clocks or randomness in here.
 * Sounds are queued in state.soundEvents (see useSoundEvents), time is state.tick, and map
 * generation takes its seed from the START_GAME / RESTART_GAME payload.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return startGame(state, action.payload.opponents, action.payload.seed);
    case 'RESTART_GAME':
      return restartGame(state, action.payload.seed);
    case 'MAIN_MENU':
      return returnToMainMenu(state);
    case 'PAUSE_GAME':
      return state.gameStatus === 'PLAYING' ? { ...state, gameStatus: 'PAUSED' } : state;
    case 'RESUME_GAME':
      return state.gameStatus === 'PAUSED' ? { ...state, gameStatus: 'PLAYING' } : state;
    case 'GAME_TICK':
      return gameTick(state);

    case 'SELECT':
      return select(state, action.payload);
    case 'UPDATE_VIEWPORT':
      return { ...state, viewport: action.payload };
    case 'CREATE_CONTROL_GROUP':
      return createControlGroup(state, action.payload.key, action.payload.ids);
    case 'SELECT_CONTROL_GROUP':
      return selectControlGroup(state, action.payload.key);
    case 'SELECT_AND_CENTER_CONTROL_GROUP':
      return selectAndCenterControlGroup(state, action.payload.key);

    case 'SET_RALLY_POINT':
      return setRallyPoint(state, action.payload.buildingId, action.payload.position);
    case 'COMMAND_REPAIR':
      return commandRepair(state, action.payload.unitId, action.payload.targetId);
    case 'COMMAND_GATHER':
      return commandGather(state, action.payload.unitId, action.payload.resourceId);
    case 'COMMAND_MOVE':
      return commandMove(state, action.payload, false);
    case 'COMMAND_ATTACK_MOVE':
      return commandMove(state, action.payload, true);
    case 'COMMAND_ATTACK':
      return commandAttack(state, action.payload);
    case 'STOP_UNITS':
      return stopUnits(state);
    case 'HOLD_POSITION':
      return holdPosition(state);

    case 'QUEUE_PRODUCTION':
      return queueProduction(state, action.payload.buildingId, action.payload.itemType);
    case 'CANCEL_PRODUCTION':
      return cancelProduction(state, action.payload.buildingId, action.payload.index);
    case 'PLACE_BUILDING':
      return placeBuilding(state, action.payload.buildingType, action.payload.position);

    case 'ACTIVATE_CHRONO_TELEPORT':
      return activateChronoTeleport(state);
    case 'CHRONO_TELEPORT_UNITS':
      return chronoTeleportUnits(state, action.payload.unitIds, action.payload.targetPosition);
    case 'LAUNCH_NUKE':
      return launchNuke(state, action.payload.playerId, action.payload.targetPosition);

    case 'PERFORM_AI_ACTION':
      return performAIAction(state, action.payload);

    default:
      return state;
  }
}
