
import { useEffect } from 'react';
import { GameState } from '../types';
import { getLocalAICommand } from '../services/localAIService';

export function useAI(state: GameState, dispatch: React.Dispatch<any>) {
  useEffect(() => {
    if (state.gameStatus !== 'PLAYING') {
      return;
    }

    // Check all AI opponents
    state.aiOpponents.forEach(aiConfig => {
      const playerState = state.players[aiConfig.id];

      // Condition to act: player exists and cooldown is over.
      if (playerState && playerState.aiActionCooldown <= 0) {
        // Get command synchronously from the local AI service
        const action = getLocalAICommand(state, aiConfig.id, aiConfig);
        dispatch({ type: 'PERFORM_AI_ACTION', payload: action });
      }
    });

  // Rerunning this effect whenever players state changes is correct,
  // because AI cooldowns are part of the player state object.
  }, [state.gameStatus, state.players, state.aiOpponents, dispatch]);
}
