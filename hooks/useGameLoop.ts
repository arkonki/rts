
import { useEffect } from 'react';
import { GameState, Position } from '../types';
import { GAME_LOOP_INTERVAL, MAP_HEIGHT, MAP_WIDTH } from '../constants';

export function useGameLoop(
  state: GameState,
  dispatch: React.Dispatch<any>,
  mousePos: Position,
  mainRef: React.RefObject<HTMLDivElement>,
  viewportSize: React.MutableRefObject<{ width: number; height: number; }>
) {
  useEffect(() => {
    // Game tick interval
    if (state.gameStatus !== 'PLAYING') return;

    const gameInterval = setInterval(() => {
      dispatch({ type: 'GAME_TICK' });
    }, GAME_LOOP_INTERVAL);

    return () => clearInterval(gameInterval);
  }, [state.gameStatus, dispatch]);

  useEffect(() => {
    // Viewport scroll interval
    if (state.gameStatus !== 'PLAYING') return;
    
    const scrollInterval = setInterval(() => {
      const SCROLL_SPEED = 15;
      const EDGE_MARGIN = 40;
      let newViewport = { ...state.viewport };

      if (mousePos.x < EDGE_MARGIN) newViewport.x -= SCROLL_SPEED;
      if (mousePos.y < EDGE_MARGIN) newViewport.y -= SCROLL_SPEED;
      if (mainRef.current && mousePos.x > mainRef.current.clientWidth - EDGE_MARGIN) newViewport.x += SCROLL_SPEED;
      if (mainRef.current && mousePos.y > mainRef.current.clientHeight - EDGE_MARGIN) newViewport.y += SCROLL_SPEED;

      newViewport.x = Math.max(0, Math.min(newViewport.x, MAP_WIDTH - viewportSize.current.width));
      newViewport.y = Math.max(0, Math.min(newViewport.y, MAP_HEIGHT - viewportSize.current.height));

      if (newViewport.x !== state.viewport.x || newViewport.y !== state.viewport.y) {
        dispatch({ type: 'UPDATE_VIEWPORT', payload: newViewport });
      }
    }, GAME_LOOP_INTERVAL);

    return () => clearInterval(scrollInterval);
  }, [state.gameStatus, state.viewport, mousePos, dispatch, mainRef, viewportSize]);
}
