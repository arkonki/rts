
import { useEffect, useState, useRef } from 'react';
import { GameState, PlayerId } from '../types';
import { getAICommand } from '../services/geminiService';

export function useAI(state: GameState, dispatch: React.Dispatch<any>) {
  // Use a state to track which AIs have a pending API request.
  const [thinkingAIs, setThinkingAIs] = useState<Set<PlayerId>>(new Set());
  
  // Use a ref to get the latest state inside the async function without adding it as a dependency.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    if (state.gameStatus !== 'PLAYING') {
      return;
    }
    
    // Check all AI opponents
    state.aiOpponents.forEach(aiConfig => {
      const playerState = state.players[aiConfig.id];

      // Condition to act: player exists, cooldown is over, and not already thinking.
      if (playerState && playerState.aiActionCooldown <= 0 && !thinkingAIs.has(aiConfig.id)) {
        
        // Add this AI to the "thinking" set to prevent duplicate requests.
        setThinkingAIs(prev => new Set(prev).add(aiConfig.id));

        const fetchAICommand = async (id: PlayerId) => {
          try {
            // Use the state from the ref to ensure it's the most current.
            const action = await getAICommand(stateRef.current, id, aiConfig);
            dispatch({ type: 'PERFORM_AI_ACTION', payload: action });
          } catch (error) {
            console.error(`Failed to get AI command for ${id}:`, error);
            // Dispatch an idle action to prevent the AI from getting stuck.
            dispatch({ type: 'PERFORM_AI_ACTION', payload: { action: 'IDLE', thought: 'Critical error fetching command.', playerId: id } });
          } finally {
            // Once the request is complete (success or fail), remove the AI from the thinking set.
            setThinkingAIs(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
          }
        };

        fetchAICommand(aiConfig.id);
      }
    });

  // Dependencies: The effect should run when the game status or player cooldowns change.
  // We don't need the full 'state' object here to avoid excessive re-runs.
  }, [state.gameStatus, state.players, state.aiOpponents, dispatch, thinkingAIs]);
}