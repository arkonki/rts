import React from 'react';
import { BuildingType, Position, TerrainType, GameEntity } from '../types';
import { ENTITY_CONFIGS, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, MAP_HEIGHT_TILES, MAP_WIDTH_TILES } from '../constants';
import { EntityIcon } from './icons';

interface GhostBuildingProps {
    placingBuildingType: BuildingType | null;
    mousePos: Position;
    viewport: Position;
    mainRef: React.RefObject<HTMLDivElement>;
    terrain: TerrainType[][];
    entities: Record<string, GameEntity>;
    playerCredits: number;
}

const isCoastalTile = (x: number, y: number, terrain: TerrainType[][]): boolean => {
    if (x < 0 || x >= MAP_WIDTH_TILES || y < 0 || y >= MAP_HEIGHT_TILES) return false;
    if (terrain[y]?.[x] !== TerrainType.GROUND) return false;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const neighborTerrain = terrain[y + dy]?.[x + dx];
            if (neighborTerrain === TerrainType.SHALLOW_WATER || neighborTerrain === TerrainType.DEEP_WATER) {
                return true;
            }
        }
    }
    return false;
};


export const GhostBuilding = ({ placingBuildingType, mousePos, viewport, mainRef, terrain, entities, playerCredits }: GhostBuildingProps) => {
    if (!placingBuildingType || !mainRef.current) return null;
    const config = ENTITY_CONFIGS[placingBuildingType];

    const getMapCoords = (screenX: number, screenY: number): Position => {
        if (!mainRef.current) return { x: 0, y: 0 };
        const rect = mainRef.current.getBoundingClientRect();
        return { x: screenX - rect.left + viewport.x, y: screenY - rect.top + viewport.y };
    };
    const mapCoords = getMapCoords(mousePos.x + mainRef.current!.getBoundingClientRect().left, mousePos.y + mainRef.current!.getBoundingClientRect().top);

    const tileX = Math.floor(mapCoords.x / TILE_SIZE); 
    const tileY = Math.floor(mapCoords.y / TILE_SIZE);

    let isPlacementValid = true;
    if(terrain.length > 0) {
        if (config.placementRule === 'COASTAL') {
            isPlacementValid = isCoastalTile(tileX, tileY, terrain);
        } else {
            isPlacementValid = terrain[tileY]?.[tileX] === TerrainType.GROUND;
        }
    }
    
    const isOccupied = Object.values(entities).some(e => Math.hypot(e.position.x - mapCoords.x, e.position.y - mapCoords.y) < (e.size / 2 + config.size / 2));
    const canAfford = playerCredits >= config.cost;
    
    const borderColor = !canAfford ? 'border-yellow-500' : isOccupied || !isPlacementValid ? 'border-red-500' : 'border-green-500';
    
    return (
        <div className="absolute pointer-events-none opacity-50 z-10" style={{ left: mapCoords.x, top: mapCoords.y, width: config.size, height: config.size, transform: 'translate(-50%, -50%)' }}> 
            <div className={`w-full h-full border-4 ${borderColor}`}> 
                <EntityIcon type={placingBuildingType} size="full" /> 
            </div> 
        </div>
    );
};

interface SelectionBoxProps {
    isDragging: boolean;
    dragStartPos: Position | null;
    mousePos: Position;
    viewport: Position;
    mainRef: React.RefObject<HTMLDivElement>;
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
    
    return <div className="absolute border-2 border-cyan-400 bg-cyan-400/20 pointer-events-none z-10" style={{ left, top, width, height }} />
};

export const RallyPointFlag = ({ position, from }: { position: Position, from: Position }) => (
    <>
      <svg className="absolute w-full h-full pointer-events-none z-10" style={{ left: 0, top: 0, width: MAP_WIDTH, height: MAP_HEIGHT }}>
         <line x1={from.x} y1={from.y} x2={position.x} y2={position.y} strokeDasharray="5,5" stroke="rgba(0, 255, 255, 0.7)" strokeWidth="1" />
      </svg>
      <div className="absolute transform -translate-x-1/2 -translate-y-full pointer-events-none z-10" style={{ left: position.x, top: position.y }}>
          <div className="w-0.5 h-6 bg-white animate-pulse"></div>
          <div className="w-4 h-3 bg-cyan-400 border border-white -translate-x-full -translate-y-full absolute top-0 left-0"></div>
      </div>
    </>
);