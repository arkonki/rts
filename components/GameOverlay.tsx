import React from 'react';
import { BuildingType, Position, TerrainType, GameEntity } from '../types';
import { ENTITY_CONFIGS, MAP_WIDTH, MAP_HEIGHT, HUMAN_PLAYER_ID, TEAM_COLORS } from '../constants';
import { getPlacementError } from '../utils/placement';
import { EntitySprite } from './sprites';

interface GhostBuildingProps {
    placingBuildingType: BuildingType | null;
    mousePos: Position;
    viewport: Position;
    mainRef: React.RefObject<HTMLDivElement | null>;
    terrain: TerrainType[][];
    entities: Record<string, GameEntity>;
    playerCredits: number;
}

export const GhostBuilding = ({ placingBuildingType, mousePos, viewport, mainRef, terrain, entities, playerCredits }: GhostBuildingProps) => {
    if (!placingBuildingType || !mainRef.current) return null;
    const config = ENTITY_CONFIGS[placingBuildingType];

    const getMapCoords = (screenX: number, screenY: number): Position => {
        if (!mainRef.current) return { x: 0, y: 0 };
        const rect = mainRef.current.getBoundingClientRect();
        return { x: screenX - rect.left + viewport.x, y: screenY - rect.top + viewport.y };
    };
    const mapCoords = getMapCoords(mousePos.x + mainRef.current!.getBoundingClientRect().left, mousePos.y + mainRef.current!.getBoundingClientRect().top);

    // Same rules the reducer enforces, so the ghost colour always matches what will happen on click.
    const isPlacementValid = terrain.length === 0 || getPlacementError(placingBuildingType, mapCoords, terrain, entities, HUMAN_PLAYER_ID) === null;
    const canAfford = playerCredits >= config.cost;

    const outline = !canAfford ? '#facc15' : !isPlacementValid ? '#ef4444' : '#4ade80';

    return (
        <div className="absolute pointer-events-none" style={{ left: mapCoords.x, top: mapCoords.y, width: config.size, height: config.size, transform: 'translate(-50%, -50%)', zIndex: 30 }}>
            <div className="w-full h-full" style={{ opacity: 0.6 }}>
                <EntitySprite type={placingBuildingType} team={TEAM_COLORS[0]} />
            </div>
            <div className="absolute inset-0" style={{ border: `2px dashed ${outline}`, background: `${outline}22`, borderRadius: 4 }} />
        </div>
    );
};

interface SelectionBoxProps {
    isDragging: boolean;
    dragStartPos: Position | null;
    mousePos: Position;
    viewport: Position;
    mainRef: React.RefObject<HTMLDivElement | null>;
}

export const SelectionBox = ({ isDragging, dragStartPos, mousePos, viewport, mainRef }: SelectionBoxProps) => {
    if (!isDragging || !dragStartPos || !mainRef.current) return null;

    const getMapCoords = (screenX: number, screenY: number): Position => {
        if (!mainRef.current) return { x: 0, y: 0 };
        const rect = mainRef.current.getBoundingClientRect();
        return { x: screenX - rect.left + viewport.x, y: screenY - rect.top + viewport.y };
    };
    const mapCoords = getMapCoords(mousePos.x + mainRef.current.getBoundingClientRect().left, mousePos.y + mainRef.current.getBoundingClientRect().top);
    
    const left = Math.min(dragStartPos.x, mapCoords.x); 
    const top = Math.min(dragStartPos.y, mapCoords.y);
    const width = Math.abs(dragStartPos.x - mapCoords.x); 
    const height = Math.abs(dragStartPos.y - mapCoords.y);
    
    return <div className="absolute pointer-events-none" style={{ left, top, width, height, zIndex: 30, border: '1px solid #e8ffe8', background: 'rgba(120,255,140,0.12)', boxShadow: '0 0 0 1px rgba(0,0,0,0.5)' }} />
};

export const RallyPointFlag = ({ position, from }: { position: Position, from: Position }) => (
    <>
      <svg className="absolute pointer-events-none" style={{ left: 0, top: 0, width: MAP_WIDTH, height: MAP_HEIGHT, zIndex: 30 }}>
         <line x1={from.x} y1={from.y} x2={position.x} y2={position.y} strokeDasharray="6,6" stroke="rgba(255, 220, 120, 0.85)" strokeWidth="1.5" />
      </svg>
      <div className="absolute pointer-events-none" style={{ left: position.x, top: position.y, zIndex: 30, transform: 'translate(-50%, -100%)' }}>
          <svg width="26" height="34" viewBox="0 0 26 34">
              <line x1="5" y1="3" x2="5" y2="32" stroke="#e5e7eb" strokeWidth="2" />
              <path d="M5 3 h16 l-4 5 l4 5 h-16z" fill="#e0242b" stroke="#7f1219" strokeWidth="1" />
              <ellipse cx="5" cy="32" rx="5" ry="2" fill="#000" opacity="0.35" />
          </svg>
      </div>
    </>
);
