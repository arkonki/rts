import { Building, GameState, Position, Unit, UnitType } from '../../types';
import { findPath } from '../../utils/pathfinding';
import { canUnitAttack } from '../../utils/entity';

export function setRallyPoint(state: GameState, buildingId: string, position: Position): GameState {
    const building = state.entities[buildingId] as Building;
    if (!building) return state;
    const newBuilding = { ...building, rallyPoint: position };
    return { ...state, entities: { ...state.entities, [buildingId]: newBuilding } };
}

export function commandRepair(state: GameState, unitId: string, targetId: string): GameState {
    const unit = state.entities[unitId] as Unit;
    const target = state.entities[targetId];
    if (!unit || !target || unit.type !== UnitType.ENGINEER || target.hp >= target.maxHp) return state;

    const path = findPath(unit.position, target.position, state.terrain, unit.domain);
    if (path) {
        const newUnit: Unit = { ...unit, status: 'MOVING_TO_REPAIR', repairTargetId: targetId, path, targetPosition: target.position, targetId: undefined };
        return { ...state, entities: { ...state.entities, [unitId]: newUnit } };
    }
    return state;
}

export function commandGather(state: GameState, unitId: string, resourceId: string): GameState {
    const unit = state.entities[unitId] as Unit;
    const resource = state.resourcePatches[resourceId];
    if (!unit || !resource || unit.type !== UnitType.CHRONO_MINER) return state;

    const path = findPath(unit.position, resource.position, state.terrain, unit.domain);
    if (path) {
        const newUnit = {
            ...unit,
            status: 'MOVING_TO_ORE',
            gatherTargetId: resourceId,
            refineryTargetId: undefined,
            path,
            targetId: undefined,
            targetPosition: resource.position,
        } as Unit;
        return { ...state, entities: { ...state.entities, [unitId]: newUnit } };
    }
    return state;
}

/** Move or attack-move every selected combat unit to a position. */
export function commandMove(state: GameState, position: Position, attackMove: boolean): GameState {
    const newState = { ...state, entities: { ...state.entities } };
    state.selectedIds.forEach(id => {
        const entity = newState.entities[id];
        if (entity && 'status' in entity) {
            const unit = { ...entity } as Unit;
            if (unit.type === UnitType.CHRONO_MINER || unit.type === UnitType.ENGINEER) return;
            const path = findPath(unit.position, position, state.terrain, unit.domain);
            if (path) {
                unit.path = path;
                unit.status = attackMove ? 'ATTACK_MOVING' : 'MOVING';
                unit.targetPosition = position; // Store final destination
                unit.targetId = undefined;
                newState.entities[id] = unit;
            }
        }
    });
    return newState;
}

/** Order every selected combat unit that can hit the target to attack it. */
export function commandAttack(state: GameState, targetId: string): GameState {
    const newState = { ...state, entities: { ...state.entities } };
    const targetEntity = state.entities[targetId];
    if (!targetEntity) return state;

    state.selectedIds.forEach(id => {
        const entity = newState.entities[id];
        if (entity && 'status' in entity) {
            const unit = { ...entity } as Unit;
            if (unit.type === UnitType.CHRONO_MINER || unit.type === UnitType.ENGINEER) return;
            if (unit.playerId === targetEntity.playerId || !canUnitAttack(unit, targetEntity)) return;
            unit.status = 'ATTACKING';
            unit.targetId = targetId;
            unit.targetPosition = undefined;
            unit.path = undefined; // Clear path when given direct attack order
            newState.entities[id] = unit;
        }
    });
    return newState;
}
