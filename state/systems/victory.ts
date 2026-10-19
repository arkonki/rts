import { GameState, GameStatus, PlayerId, PlayerState } from '../../types';
import { GAME_LOOP_INTERVAL, HUMAN_PLAYER_ID } from '../../constants';

export function checkWinLossConditions(state: GameState): GameStatus {
    // A player is defeated if they have no buildings left that can produce other buildings (i.e., HQ-like structures).
    // For simplicity, we'll stick to "no buildings at all".
    const playerHasBuildings = (playerId: PlayerId) => {
        return Object.values(state.entities).some(e => e.playerId === playerId && 'isPowered' in e);
    };

    // Check if game has already concluded
    if (state.gameStatus === 'PLAYER_WIN' || state.gameStatus === 'AI_WIN') {
        return state.gameStatus;
    }
    
    const humanIsAlive = playerHasBuildings(HUMAN_PLAYER_ID);
    const liveAiOpponents = state.aiOpponents.filter(opp => playerHasBuildings(opp.id));

    if (!humanIsAlive) {
        return 'AI_WIN';
    }

    if (humanIsAlive && liveAiOpponents.length === 0 && state.aiOpponents.length > 0) {
        return 'PLAYER_WIN';
    }
    
    return state.gameStatus;
}

export function updateAICooldowns(players: Record<PlayerId, PlayerState>): Record<PlayerId, PlayerState> {
    const newPlayers = { ...players };
    Object.keys(newPlayers).forEach(playerId => {
        if (playerId !== HUMAN_PLAYER_ID) {
            const player = newPlayers[playerId];
            newPlayers[playerId] = { ...player, aiActionCooldown: player.aiActionCooldown - GAME_LOOP_INTERVAL };
        }
    });
    return newPlayers;
}
