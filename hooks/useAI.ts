
import { useEffect, useRef } from 'react';
import { GameState } from '../types';
import { getAICommand } from '../services/geminiService';
import { getLocalAICommand } from '../services/localAIService';

export function useAI(state: GameState, dispatch: React.Dispatch<any>) {
  const isThinkingRef = useRef(false);

  useEffect(() => {
    if (state.gameStatus !== 'PLAYING' || isThinkingRef.current) {
      return;
    }
    
    // Find the first AI opponent that is ready to act
    const readyAI = state.aiOpponents.find(opp => {
        const playerState = state.players[opp.id];
        return playerState && playerState.aiActionCooldown <= 0;
    });

    if (!readyAI) {
        return;
    }
    
    isThinkingRef.current = true;
    const aiPlayerId = readyAI.id;

    if (readyAI.type === 'LOCAL') {
        const action = getLocalAICommand(state, aiPlayerId, readyAI);
        dispatch({ type: 'PERFORM_AI_ACTION', payload: action });
        isThinkingRef.current = false;
    } else { // GEMINI
        let isCancelled = false;
        
        const fetchAIAction = async () => {
          dispatch({ type: 'AI_THINKING', payload: { playerId: aiPlayerId } });
          
          try {
            const action = await getAICommand(state, aiPlayerId, readyAI);
            if (!isCancelled) {
              dispatch({ type: 'PERFORM_AI_ACTION', payload: action });
            }
          } catch (e) {
            console.error("AI action failed:", e);
            if (!isCancelled) {
              dispatch({ type: 'PERFORM_AI_ACTION', payload: { action: 'IDLE', thought: 'A critical error occurred in my command module.', playerId: aiPlayerId } });
            }
          } finally {
            if(!isCancelled) {
                isThinkingRef.current = false;
            }
          }
        };

        fetchAIAction();

        return () => {
          isCancelled = true;
          isThinkingRef.current = false;
        };
    }

  }, [state.gameStatus, state.players, state.aiOpponents, state, dispatch]);
}
