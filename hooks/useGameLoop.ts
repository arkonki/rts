
import { useEffect } from 'react';
import { GameState, Position } from '../types';
import { GAME_LOOP_INTERVAL, MAP_HEIGHT, MAP_WIDTH } from '../constants';
import { GameAction } from '../state/actions';

export function useGameLoop(
  state: GameState,
  dispatch: React.Dispatch<GameAction>,
  mousePosRef: React.MutableRefObject<Position>,
  keysDownRef: React.MutableRefObject<Set<string>>,
  mainRef: React.RefObject<HTMLDivElement | null>,
  viewportSize: React.MutableRefObject<{ width: number; height: number; }>,
  isMouseOverSidebar: boolean
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
      // Read the cursor from a ref so mouse movement doesn't tear down and recreate this interval.
      const mousePos = mousePosRef.current;
      const SCROLL_SPEED = 15;
      const EDGE_MARGIN = 40;
      let newViewport = { ...state.viewport };

      const keys = keysDownRef.current;
      if (keys.has('arrowleft') || keys.has('a')) newViewport.x -= SCROLL_SPEED;
      if (keys.has('arrowright') || keys.has('d')) newViewport.x += SCROLL_SPEED;
      if (keys.has('arrowup') || keys.has('w')) newViewport.y -= SCROLL_SPEED;
      if (keys.has('arrowdown') || keys.has('s')) newViewport.y += SCROLL_SPEED;

      if (!isMouseOverSidebar) { // edge scrolling
        if (mousePos.x < EDGE_MARGIN) newViewport.x -= SCROLL_SPEED;
        if (mousePos.y < EDGE_MARGIN) newViewport.y -= SCROLL_SPEED;
        if (mainRef.current && mousePos.x > mainRef.current.clientWidth - EDGE_MARGIN) newViewport.x += SCROLL_SPEED;
        if (mainRef.current && mousePos.y > mainRef.current.clientHeight - EDGE_MARGIN) newViewport.y += SCROLL_SPEED;
      }

      newViewport.x = Math.max(0, Math.min(newViewport.x, MAP_WIDTH - viewportSize.current.width));
      newViewport.y = Math.max(0, Math.min(newViewport.y, MAP_HEIGHT - viewportSize.current.height));

      if (newViewport.x !== state.viewport.x || newViewport.y !== state.viewport.y) {
        dispatch({ type: 'UPDATE_VIEWPORT', payload: newViewport });
      }
    }, GAME_LOOP_INTERVAL);

    return () => clearInterval(scrollInterval);
  }, [state.gameStatus, state.viewport, mousePosRef, keysDownRef, dispatch, mainRef, viewportSize, isMouseOverSidebar]);
}
