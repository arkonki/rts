import React, { useReducer, useState, useEffect } from 'react';
import { INITIAL_STATE } from './state/reducer';
import { gameReducer } from './state/reducer';
import { MainMenu, GameOverScreen, PauseMenu, ControlsModal, SuperweaponIndicator, ControlGroupsBar } from './components/UI';
import { Sidebar } from './components/Sidebar';
import { TerrainCanvas, FogCanvas } from './components/Canvas';
import { GhostBuilding, SelectionBox, RallyPointFlag } from './components/GameOverlay';
import { useGameLoop } from './hooks/useGameLoop';
import { useAI } from './hooks/useAI';
import { useInputHandling } from './hooks/useInputHandling';
import { MAP_WIDTH, MAP_HEIGHT, PLAYER_COLORS, TILE_SIZE } from './constants';
import { GameEntity, FogState } from './types';
import { soundService } from './services/soundService';
import { VisualEffectsLayer } from './components/VisualEffects';
import { GameEntityComponent } from './components/GameEntityComponent';
import { UnitClusterComponent } from './components/UnitClusterComponent';
import { ResourcePatchComponent } from './components/ResourceComponent';
import { clusterEntities, Renderable } from './utils/clustering';

function App() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
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
    setPlacingBuildingType,
    gameEventHandlers
  } = useInputHandling(state, dispatch, humanPlayerId);

  useGameLoop(state, dispatch, mousePos, mainRef, viewportSize, isMouseOverSidebar);
  useAI(state, dispatch);

  const humanPlayerState = state.players[humanPlayerId];
  const selectedEntity = state.selectedIds.length === 1 ? state.entities[state.selectedIds[0]] as GameEntity : null;
  const cursorClass = state.isChronoTeleportPending ? 'cursor-grab' : isAttackMovePending ? 'cursor-cell' : placingBuildingType ? 'cursor-copy' : 'cursor-crosshair';
  
  if (state.gameStatus === 'MENU') {
    return <MainMenu onStartGame={(options) => dispatch({ type: 'START_GAME', payload: options })} />;
  }

  if (state.gameStatus === 'LOADING' || state.terrain.length === 0) {
    return <div className="w-screen h-screen flex items-center justify-center bg-black text-white">Generating Map...</div>;
  }
  
  const playerIds = Object.keys(state.players);
  const renderableItems = clusterEntities(state.entities, TILE_SIZE * 0.8);

  const GameUI = (
      <div className="flex h-screen w-screen bg-black font-mono overflow-hidden">
        <main ref={mainRef} onMouseMove={gameEventHandlers.handleMouseMove} className="flex-1 relative bg-gray-900 overflow-hidden">
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
                const borderColor = PLAYER_COLORS[playerIndex] || 'border-gray-400';
                
                if ('isCluster' in item && item.isCluster) {
                     const isSelected = item.units.some(u => state.selectedIds.includes(u.id));
                     return <UnitClusterComponent key={item.id} cluster={item} isSelected={isSelected} borderColor={borderColor} onEntityClick={gameEventHandlers.handleEntityClick} />;
                } else {
                    const isSelected = state.selectedIds.includes(item.id);
                    return <GameEntityComponent key={item.id} entity={item as GameEntity} isSelected={isSelected} borderColor={borderColor} onEntityClick={gameEventHandlers.handleEntityClick} />;
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
          <div className="absolute top-2 right-2 bg-black/50 p-2 rounded-md font-bold text-lg text-yellow-300 shadow-lg pointer-events-none z-20">
              {state.lastMessage}
          </div>
          <SuperweaponIndicator 
            playerState={humanPlayerState} 
            onActivate={() => dispatch({ type: 'ACTIVATE_CHRONO_TELEPORT' })} 
          />
          <div className="absolute top-2 left-2 z-20">
            <button onClick={() => dispatch({ type: 'PAUSE_GAME' })} className="px-4 py-2 bg-gray-800/80 border border-cyan-400 text-cyan-300 hover:bg-cyan-900 font-bold rounded">
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
        {humanPlayerState && GameUI}
        {state.gameStatus === 'PAUSED' && <PauseMenu 
            onResume={() => dispatch({ type: 'RESUME_GAME' })}
            onRestart={() => dispatch({ type: 'RESTART_GAME' })}
            onShowControls={() => setShowControls(true)}
            onMainMenu={() => dispatch({ type: 'MAIN_MENU' })}
        />}
        {(state.gameStatus === 'PLAYER_WIN' || state.gameStatus === 'AI_WIN') && <GameOverScreen 
            status={state.gameStatus}
            gameSummary={state.gameSummary}
            onRestart={() => dispatch({ type: 'RESTART_GAME' })}
            onMainMenu={() => dispatch({ type: 'MAIN_MENU' })}
        />}
        {showControls && <ControlsModal onClose={() => setShowControls(false)} />}
    </>
  );
}

export default App;