import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, BuildingType, Position, Unit, UnitType, GameEntity } from '../types';
import { soundService, SoundEffect } from '../services/soundService';
import { TILE_SIZE } from '../constants';
import { Renderable } from '../utils/clustering';

export function useInputHandling(state: GameState, dispatch: React.Dispatch<any>, humanPlayerId: string) {
  const [placingBuildingType, setPlacingBuildingType] = useState<BuildingType | null>(null);
  const [isAttackMovePending, setAttackMovePending] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<Position | null>(null);
  const [lastKeyPress, setLastKeyPress] = useState({ key: '', time: 0 });

  const mainRef = useRef<HTMLDivElement>(null);
  const viewportSize = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const updateViewportSize = () => {
        if(mainRef.current) {
            viewportSize.current = { width: mainRef.current.clientWidth, height: mainRef.current.clientHeight };
        }
    }
    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    return () => window.removeEventListener('resize', updateViewportSize);
  }, []);

  const getMapCoords = useCallback((screenX: number, screenY: number): Position => {
    if (!mainRef.current) return { x: 0, y: 0 };
    const rect = mainRef.current.getBoundingClientRect();
    return { x: screenX - rect.left + state.viewport.x, y: screenY - rect.top + state.viewport.y };
  }, [state.viewport.x, state.viewport.y]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (state.gameStatus !== 'PLAYING') return;

    // Handle number keys for control groups
    if (!isNaN(parseInt(e.key)) && e.key !== '0') {
      if (e.ctrlKey) {
        // Create control group
        soundService.play('click', 0.5);
        dispatch({ type: 'CREATE_CONTROL_GROUP', payload: { key: e.key, ids: state.selectedIds } });
        return; // Prevent further processing
      } else {
        // Select control group
        const now = Date.now();
        if (lastKeyPress.key === e.key && now - lastKeyPress.time < 300) {
          // Double press
          dispatch({ type: 'SELECT_AND_CENTER_CONTROL_GROUP', payload: { key: e.key } });
        } else {
          // Single press
          dispatch({ type: 'SELECT_CONTROL_GROUP', payload: { key: e.key } });
        }
        setLastKeyPress({ key: e.key, time: now });
        soundService.play('click', 0.3);
        return;
      }
    }

    if (e.key === 'Escape') {
        setPlacingBuildingType(null);
        setAttackMovePending(false);
        if (state.isChronoTeleportPending) dispatch({ type: 'SELECT', payload: state.selectedIds }); // Resets chrono state
    }
    if (e.key.toLowerCase() === 'a' && state.selectedIds.some(id => state.entities[id] && 'status' in state.entities[id])) {
        setAttackMovePending(true);
        setPlacingBuildingType(null);
    }
  }, [state.selectedIds, state.entities, state.gameStatus, state.isChronoTeleportPending, dispatch, lastKeyPress]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleEntityClick = (e: React.MouseEvent, item: Renderable) => {
      e.stopPropagation();
      const clickedIsEnemy = item.playerId !== humanPlayerId;

      if (clickedIsEnemy) {
          if (state.selectedIds.some(sid => state.entities[sid] && 'status' in state.entities[sid])) {
              soundService.play('move_confirm_1', 0.4);
              dispatch({ type: 'COMMAND_ATTACK', payload: item.id });
          }
      } else {
          // Friendly click logic
          soundService.play('click');
          const idsToSelect = ('isCluster' in item && item.isCluster) ? item.units.map(u => u.id) : [item.id];
          const newSelection = e.shiftKey
              ? Array.from(new Set([...state.selectedIds, ...idsToSelect]))
              : idsToSelect;
          dispatch({ type: 'SELECT', payload: newSelection });
      }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // This handler is now for the background element, so any click here is a ground click.
    if (e.button !== 0 || placingBuildingType || isAttackMovePending) return;
    
    const mapCoords = getMapCoords(e.clientX, e.clientY);
    setIsDragging(true);
    setDragStartPos(mapCoords);
  };
  
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    const mapCoords = getMapCoords(e.clientX, e.clientY);
    if (placingBuildingType) {
        if (e.button === 0) dispatch({ type: 'PLACE_BUILDING', payload: { buildingType: placingBuildingType, position: mapCoords } });
        setPlacingBuildingType(null); return;
    }
    if (isAttackMovePending) {
        if (e.button === 0) dispatch({ type: 'COMMAND_ATTACK_MOVE', payload: mapCoords });
        setAttackMovePending(false); return;
    }
    if (isDragging && dragStartPos) {
        const dragDistance = Math.hypot(mapCoords.x - dragStartPos.x, mapCoords.y - dragStartPos.y);
        if (dragDistance < 10) { // Simple click on ground deselects
            if (!e.shiftKey) dispatch({ type: 'SELECT', payload: [] });
        } else {
            const startX = Math.min(dragStartPos.x, mapCoords.x); const startY = Math.min(dragStartPos.y, mapCoords.y);
            const endX = Math.max(dragStartPos.x, mapCoords.x); const endY = Math.max(dragStartPos.y, mapCoords.y);
            // Select all player units within the drag box
            const selectedIds = Object.values(state.entities)
              .filter(entity => 
                  entity.playerId === humanPlayerId && 
                  'status' in entity && 
                  entity.position.x > startX && entity.position.x < endX && 
                  entity.position.y > startY && entity.position.y < endY
              )
              .map(e => e.id);
            
            const newSelection = e.shiftKey
              ? Array.from(new Set([...state.selectedIds, ...selectedIds]))
              : selectedIds;

            dispatch({ type: 'SELECT', payload: newSelection });
        }
    }
    setIsDragging(false); setDragStartPos(null);
  };
  
  const handleRightClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (state.gameStatus !== 'PLAYING') return;
    if (placingBuildingType) { setPlacingBuildingType(null); return; }
    if (isAttackMovePending) { setAttackMovePending(false); return; }

    const mapCoords = getMapCoords(e.clientX, e.clientY);
    const targetEntity = Object.values(state.entities).find(e => Math.hypot(mapCoords.x - e.position.x, mapCoords.y - e.position.y) < e.size / 2);

    if (state.isChronoTeleportPending && state.selectedIds.length > 0) {
        dispatch({ type: 'CHRONO_TELEPORT_UNITS', payload: { unitIds: state.selectedIds, targetPosition: mapCoords }});
        return;
    }

    const selectedUnits = state.selectedIds.map(id => state.entities[id]).filter(Boolean) as (Unit | GameEntity)[];
    const engineers = selectedUnits.filter(u => 'type' in u && u.type === UnitType.ENGINEER) as Unit[];

    // Engineer repair command
    if (engineers.length > 0 && targetEntity && targetEntity.playerId === humanPlayerId && targetEntity.hp < targetEntity.maxHp) {
      engineers.forEach(engineer => {
        dispatch({ type: 'COMMAND_REPAIR', payload: { unitId: engineer.id, targetId: targetEntity.id } });
      });
      soundService.play('move_confirm_1', 0.4);
      return;
    }

    const chronoMiners = selectedUnits.filter(u => 'type' in u && u.type === UnitType.CHRONO_MINER) as Unit[];
    const targetResource = Object.values(state.resourcePatches).find(p => Math.hypot(mapCoords.x - p.position.x, mapCoords.y - p.position.y) < p.size / 2);

    if (chronoMiners.length > 0 && targetResource) {
        chronoMiners.forEach(miner => {
            dispatch({ type: 'COMMAND_GATHER', payload: { unitId: miner.id, resourceId: targetResource.id }});
        });
        soundService.play('move_confirm_2', 0.3);
        return;
    }

    const selectedBuilding = state.selectedIds.length === 1 ? state.entities[state.selectedIds[0]] : null;
    
    if (selectedBuilding && 'productionQueue' in selectedBuilding && [BuildingType.BARRACKS, BuildingType.WAR_FACTORY, BuildingType.HQ].includes(selectedBuilding.type)) {
        soundService.play('click');
        dispatch({ type: 'SET_RALLY_POINT', payload: { buildingId: selectedBuilding.id, position: mapCoords }}); return;
    }

    if (state.selectedIds.some(id => state.entities[id]?.playerId === humanPlayerId && 'status' in state.entities[id])) {
        const moveSounds: SoundEffect[] = ['move_confirm_1', 'move_confirm_2'];
        const randomMoveSound = moveSounds[Math.floor(Math.random() * moveSounds.length)];
        soundService.play(randomMoveSound, 0.3);

        if (targetEntity && targetEntity.playerId !== humanPlayerId) dispatch({ type: 'COMMAND_ATTACK', payload: targetEntity.id });
        else dispatch({ type: 'COMMAND_MOVE', payload: mapCoords });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (mainRef.current) {
        const rect = mainRef.current.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  return {
      mainRef,
      viewportSize,
      placingBuildingType,
      isAttackMovePending,
      isDragging,
      dragStartPos,
      mousePos,
      setPlacingBuildingType,
      gameEventHandlers: {
          handleMouseDown,
          handleMouseUp,
          handleRightClick,
          handleMouseMove,
          handleEntityClick,
      }
  };
}