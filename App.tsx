import React, { useReducer, useState, useMemo } from 'react';
import { gameReducer } from './state/reducer';
import { MainMenu, GameOverScreen, PauseMenu, ControlsModal, SuperweaponIndicator, ControlGroupsBar, AlertBanner } from './components/UI';
import { Sidebar } from './components/Sidebar';
import { TerrainCanvas, FogCanvas } from './components/Canvas';
import { GhostBuilding, SelectionBox, RallyPointFlag } from './components/GameOverlay';
import { useGameLoop } from './hooks/useGameLoop';
import { useAI } from './hooks/useAI';
import { useInputHandling } from './hooks/useInputHandling';
import { useSoundEvents } from './hooks/useSoundEvents';
import { newSeed } from './utils/random';
import { createInitialState } from './utils/demoScenario';
import { MAP_WIDTH, MAP_HEIGHT, TEAM_COLORS, TILE_SIZE } from './constants';
import { GameEntity, FogState, Position } from './types';
import { VisualEffectsLayer } from './components/VisualEffects';
import { GameEntityComponent } from './components/GameEntityComponent';
import { UnitClusterComponent } from './components/UnitClusterComponent';
import { ResourcePatchComponent } from './components/ResourceComponent';
import { clusterEntities } from './utils/clustering';
import { SpriteDefs } from './components/sprites';
import { SpriteGallery } from './components/SpriteGallery';

function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [showControls, setShowControls] = useState(false);
  const [isMouseOverSidebar, setIsMouseOverSidebar] = useState(false);
  const humanPlayerId = 'PLAYER_1';

  const {
    mainRef,
    viewportSize,
    placingBuildingType,
    isAttackMovePending,
    isDragging,
    dragStartPos,
    mousePos,
    mousePosRef,
    keysDownRef,
    setPlacingBuildingType,
    gameEventHandlers
  } = useInputHandling(state, dispatch, humanPlayerId);

  useGameLoop(state, dispatch, mousePosRef, keysDownRef, mainRef, viewportSize, isMouseOverSidebar);
  useAI(state, dispatch);
  useSoundEvents(state.soundEvents);

  // Clustering is O(n²); only recompute when entities actually change, not on every re-render.
  const renderableItems = useMemo(() => clusterEntities(state.entities, TILE_SIZE * 0.8), [state.entities]);

  // `?gallery` in the URL shows every sprite instead of the game (handy for checking artwork).
  const showGallery = useMemo(() => new URLSearchParams(window.location.search).has('gallery'), []);

  const jumpTo = (position: Position) => {
    const { width, height } = viewportSize.current;
    dispatch({
      type: 'UPDATE_VIEWPORT',
      payload: {
        x: Math.max(0, Math.min(position.x - width / 2, MAP_WIDTH - width)),
        y: Math.max(0, Math.min(position.y - height / 2, MAP_HEIGHT - height)),
      },
    });
  };

  const humanPlayerState = state.players[humanPlayerId];
  const selectedEntity = state.selectedIds.length === 1 ? state.entities[state.selectedIds[0]] as GameEntity : null;
  const cursorClass = state.isChronoTeleportPending ? 'cursor-grab' : isAttackMovePending ? 'cursor-cell' : placingBuildingType ? 'cursor-copy' : 'cursor-crosshair';
  
  if (showGallery) {
    return <SpriteGallery />;
  }

  if (state.gameStatus === 'MENU') {
    return <MainMenu onStartGame={(options) => dispatch({ type: 'START_GAME', payload: { ...options, seed: newSeed() } })} />;
  }

  if (state.gameStatus === 'LOADING' || state.terrain.length === 0) {
    return <div className="w-screen h-screen flex items-center justify-center bg-black text-white tracking-widest">GENERATING MAP...</div>;
  }
  
  const playerIds = Object.keys(state.players);

  const GameUI = (
      <div className="flex h-screen w-screen bg-black overflow-hidden">
        <main ref={mainRef} onMouseMove={gameEventHandlers.handleMouseMove} onMouseLeave={gameEventHandlers.handleMouseLeave} className="flex-1 relative overflow-hidden" style={{ background: '#0b0d0f' }}>
          <div className={`absolute ${cursorClass}`} style={{ width: MAP_WIDTH, height: MAP_HEIGHT, transform: `translate(${-state.viewport.x}px, ${-state.viewport.y}px)`}}
            onMouseDown={gameEventHandlers.handleMouseDown} onMouseUp={gameEventHandlers.handleMouseUp} onContextMenu={gameEventHandlers.handleRightClick} >
            
            <TerrainCanvas terrain={state.terrain} />

            {Object.values(state.resourcePatches).map(patch => {
                 const tileX = Math.floor(patch.position.x / TILE_SIZE);
                 const tileY = Math.floor(patch.position.y / TILE_SIZE);
                 if (state.fogOfWar[tileY]?.[tileX] !== FogState.UNEXPLORED) {
                     return <ResourcePatchComponent key={patch.id} patch={patch} />;
                 }
                 return null;
            })}
            
            {renderableItems.map(item => {
                const tileX = Math.floor(item.position.x / TILE_SIZE);
                const tileY = Math.floor(item.position.y / TILE_SIZE);
                const isVisible = item.playerId === humanPlayerId || 
                                  state.fogOfWar[tileY]?.[tileX] === FogState.VISIBLE ||
                                  (state.fogOfWar[tileY]?.[tileX] === FogState.EXPLORED && 'isPowered' in item);

                if (!isVisible) return null;

                const playerIndex = playerIds.indexOf(item.playerId);
                const teamColor = TEAM_COLORS[playerIndex] ?? '#9ca3af';
                
                if ('isCluster' in item && item.isCluster) {
                     const isSelected = item.units.some(u => state.selectedIds.includes(u.id));
                     return <UnitClusterComponent key={item.id} cluster={item} isSelected={isSelected} teamColor={teamColor} onEntityClick={gameEventHandlers.handleEntityClick} />;
                } else {
                    const isSelected = state.selectedIds.includes(item.id);
                    return <GameEntityComponent key={item.id} entity={item as GameEntity} isSelected={isSelected} teamColor={teamColor} onEntityClick={gameEventHandlers.handleEntityClick} />;
                }
            })}

            <FogCanvas fog={state.fogOfWar} />
            <VisualEffectsLayer state={state} />

            <GhostBuilding 
              placingBuildingType={placingBuildingType}
              mousePos={mousePos}
              viewport={state.viewport}
              mainRef={mainRef}
              terrain={state.terrain}
              entities={state.entities}
              playerCredits={humanPlayerState?.credits ?? 0}
            />
            <SelectionBox 
              isDragging={isDragging}
              dragStartPos={dragStartPos}
              mousePos={mousePos}
              viewport={state.viewport}
              mainRef={mainRef}
            />
            {selectedEntity && 'rallyPoint' in selectedEntity && selectedEntity.rallyPoint && (
              <RallyPointFlag position={selectedEntity.rallyPoint} from={selectedEntity.position} />
            )}
          </div>
          {state.lastMessage && (
            <div className="message-bar absolute top-2 right-2 pointer-events-none z-20">
                {state.lastMessage}
            </div>
          )}
          <AlertBanner alerts={state.alerts} onJump={jumpTo} />
          <SuperweaponIndicator 
            playerState={humanPlayerState} 
            onActivate={() => dispatch({ type: 'ACTIVATE_CHRONO_TELEPORT' })} 
          />
          <div className="absolute top-2 left-2 z-20">
            <button onClick={() => dispatch({ type: 'PAUSE_GAME' })} className="btn-ra btn-small">
                Menu
            </button>
          </div>
          <ControlGroupsBar controlGroups={state.controlGroups} dispatch={dispatch} />
        </main>

        <Sidebar 
          playerState={humanPlayerState}
          state={state}
          dispatch={dispatch}
          viewportSize={viewportSize}
          setPlacingBuildingType={setPlacingBuildingType}
          onMouseEnter={() => setIsMouseOverSidebar(true)}
          onMouseLeave={() => setIsMouseOverSidebar(false)}
        />
      </div>
  );

  return (
    <>
        <SpriteDefs />
        {humanPlayerState && GameUI}
        {state.gameStatus === 'PAUSED' && <PauseMenu 
            onResume={() => dispatch({ type: 'RESUME_GAME' })}
            onRestart={() => dispatch({ type: 'RESTART_GAME', payload: { seed: newSeed() } })}
            onShowControls={() => setShowControls(true)}
            onMainMenu={() => dispatch({ type: 'MAIN_MENU' })}
        />}
        {(state.gameStatus === 'PLAYER_WIN' || state.gameStatus === 'AI_WIN') && <GameOverScreen 
            status={state.gameStatus}
            gameSummary={state.gameSummary}
            onRestart={() => dispatch({ type: 'RESTART_GAME', payload: { seed: newSeed() } })}
            onMainMenu={() => dispatch({ type: 'MAIN_MENU' })}
        />}
        {showControls && <ControlsModal onClose={() => setShowControls(false)} />}
    </>
  );
}

export default App;