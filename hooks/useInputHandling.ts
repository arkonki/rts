
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, BuildingType, Position, Unit, UnitType } from '../types';
import { soundService, SoundEffect } from '../services/soundService';

export function useInputHandling(state: GameState, dispatch: React.Dispatch<any>, humanPlayerId: string) {
  const [placingBuildingType, setPlacingBuildingType] = useState<BuildingType | null>(null);
  const [isAttackMovePending, setAttackMovePending] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<Position | null>(null);

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
    if (e.key === 'Escape') {
        setPlacingBuildingType(null);
        setAttackMovePending(false);
        if (state.isChronoTeleportPending) dispatch({ type: 'SELECT', payload: state.selectedIds }); // Resets chrono state
    }
    if (e.key.toLowerCase() === 'a' && state.selectedIds.some(id => state.entities[id] && 'status' in state.entities[id])) {
        setAttackMovePending(true);
        setPlacingBuildingType(null);
    }
  }, [state.selectedIds, state.entities, state.gameStatus, state.isChronoTeleportPending, dispatch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  const handleEntityClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const entity = state.entities[id];
    if (!entity) return;
    if (entity.playerId === humanPlayerId) {
        soundService.play('click');
        const newSelection = e.shiftKey ? state.selectedIds.includes(id) ? state.selectedIds.filter(sid => sid !== id) : [...state.selectedIds, id] : [id];
        dispatch({ type: 'SELECT', payload: newSelection });
    } else if (state.selectedIds.some(sid => state.entities[sid] && 'status' in state.entities[sid])) {
        dispatch({ type: 'COMMAND_ATTACK', payload: entity.id });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || placingBuildingType || isAttackMovePending) return;
    const mapCoords = getMapCoords(e.clientX, e.clientY);
    const clickedEntity = Object.values(state.entities).find(entity => {
        const dx = mapCoords.x - entity.position.x;
        const dy = mapCoords.y - entity.position.y;
        return (dx * dx + dy * dy) < (entity.size / 2) * (entity.size / 2);
    });
    if (clickedEntity) {
        handleEntityClick(e, clickedEntity.id);
    }
    else { 
        setIsDragging(true); 
        setDragStartPos(mapCoords); 
    }
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
        if (dragDistance < 10 && !e.shiftKey) { // Simple click deselects
            dispatch({ type: 'SELECT', payload: [] });
        } else {
            const startX = Math.min(dragStartPos.x, mapCoords.x); const startY = Math.min(dragStartPos.y, mapCoords.y);
            const endX = Math.max(dragStartPos.x, mapCoords.x); const endY = Math.max(dragStartPos.y, mapCoords.y);
            const selectedIds = Object.values(state.entities).filter(e => e.playerId === humanPlayerId && 'status' in e && e.position.x > startX && e.position.x < endX && e.position.y > startY && e.position.y < endY).map(e => e.id);
            dispatch({ type: 'SELECT', payload: selectedIds });
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

    if (state.isChronoTeleportPending && state.selectedIds.length > 0) {
        dispatch({ type: 'CHRONO_TELEPORT_UNITS', payload: { unitIds: state.selectedIds, targetPosition: mapCoords }});
        return;
    }

    const selectedUnits = state.selectedIds.map(id => state.entities[id]).filter(Boolean) as Unit[];
    const chronoMiners = selectedUnits.filter(u => u.type === UnitType.CHRONO_MINER);

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

        const targetEntity = Object.values(state.entities).find(e => Math.hypot(mapCoords.x - e.position.x, mapCoords.y - e.position.y) < e.size / 2);
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
      }
  };
}
