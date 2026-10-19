import { AIAction, AIConfiguration, BuildingType, Position, UnitType } from '../types';

/** Every action the game reducer understands. */
export type GameAction =
    // Game lifecycle. Seeds are chosen by the caller so the reducer stays deterministic.
    | { type: 'START_GAME'; payload: { opponents: AIConfiguration[]; seed: number } }
    | { type: 'RESTART_GAME'; payload: { seed: number } }
    | { type: 'MAIN_MENU' }
    | { type: 'PAUSE_GAME' }
    | { type: 'RESUME_GAME' }
    | { type: 'GAME_TICK' }
    // Selection and camera
    | { type: 'SELECT'; payload: string[] }
    | { type: 'UPDATE_VIEWPORT'; payload: Position }
    | { type: 'CREATE_CONTROL_GROUP'; payload: { key: string; ids: string[] } }
    | { type: 'SELECT_CONTROL_GROUP'; payload: { key: string } }
    | { type: 'SELECT_AND_CENTER_CONTROL_GROUP'; payload: { key: string } }
    // Unit commands
    | { type: 'SET_RALLY_POINT'; payload: { buildingId: string; position: Position } }
    | { type: 'COMMAND_REPAIR'; payload: { unitId: string; targetId: string } }
    | { type: 'COMMAND_GATHER'; payload: { unitId: string; resourceId: string } }
    | { type: 'COMMAND_MOVE'; payload: Position }
    | { type: 'COMMAND_ATTACK_MOVE'; payload: Position }
    | { type: 'COMMAND_ATTACK'; payload: string }
    // Building and production
    | { type: 'QUEUE_PRODUCTION'; payload: { buildingId: string; itemType: UnitType | BuildingType } }
    | { type: 'PLACE_BUILDING'; payload: { buildingType: BuildingType; position: Position } }
    // Superweapons
    | { type: 'ACTIVATE_CHRONO_TELEPORT' }
    | { type: 'CHRONO_TELEPORT_UNITS'; payload: { unitIds: string[]; targetPosition: Position } }
    | { type: 'LAUNCH_NUKE'; payload: { playerId: string; targetPosition: Position } }
    // AI
    | { type: 'PERFORM_AI_ACTION'; payload: AIAction };
