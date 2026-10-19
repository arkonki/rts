import { GameState } from '../../types';
import { MAP_HEIGHT, MAP_WIDTH } from '../../constants';

export function select(state: GameState, ids: string[]): GameState {
    return { ...state, selectedIds: ids, isChronoTeleportPending: false };
}

export function createControlGroup(state: GameState, key: string, ids: string[]): GameState {
    const newControlGroups = { ...state.controlGroups };
    if (ids.length > 0) {
        newControlGroups[key] = ids;
    } else {
        delete newControlGroups[key];
    }
    return { ...state, controlGroups: newControlGroups };
}

export function selectControlGroup(state: GameState, key: string): GameState {
    const groupIds = state.controlGroups[key] || [];
    const existingIds = groupIds.filter(id => state.entities[id]);
    return { ...state, selectedIds: existingIds, isChronoTeleportPending: false };
}

export function selectAndCenterControlGroup(state: GameState, key: string): GameState {
    const groupIds = state.controlGroups[key] || [];
    const existingIds = groupIds.filter(id => state.entities[id]);
    if (existingIds.length === 0) {
        return { ...state, selectedIds: [] };
    }

    const units = existingIds.map(id => state.entities[id]);
    let totalX = 0, totalY = 0;
    units.forEach(u => {
        totalX += u.position.x;
        totalY += u.position.y;
    });
    const centerPos = { x: totalX / units.length, y: totalY / units.length };

    // This logic should be in a hook, but for simplicity, we assume a viewport size
    const viewportWidth = 1000;
    const viewportHeight = 800;
    let newX = centerPos.x - viewportWidth / 2;
    let newY = centerPos.y - viewportHeight / 2;
    newX = Math.max(0, Math.min(newX, MAP_WIDTH - viewportWidth));
    newY = Math.max(0, Math.min(newY, MAP_HEIGHT - viewportHeight));

    return { ...state, selectedIds: existingIds, viewport: { x: newX, y: newY }, isChronoTeleportPending: false };
}
