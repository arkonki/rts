
import { GameEntity, BuildingType, UnitType, PlayerState, Building } from '../types';
import { ENTITY_CONFIGS } from '../constants';

/**
 * Determines which units and buildings a player can produce based on their current buildings.
 * @param playerState - The state of the player.
 * @param playerEntities - All entities belonging to the player.
 * @returns An object containing arrays of producible units and buildings.
 */
export function getProducibleItems(playerState: PlayerState, playerEntities: GameEntity[]): { producibleUnits: UnitType[], producibleBuildings: BuildingType[] } {
    const playerBuildingTypes = playerEntities
        .filter(e => 'isPowered' in e && !(e as Building).isConstructing)
        .map(e => e.type);
        
    const hasBuilding = (type: BuildingType) => playerBuildingTypes.includes(type);

    const producibleUnits: UnitType[] = [];
    const producibleBuildings: BuildingType[] = [];

    Object.entries(ENTITY_CONFIGS).forEach(([itemStr, config]) => {
        const itemType = itemStr as UnitType | BuildingType;
        
        // Items with no cost aren't directly produced from a menu (e.g., HQ at start)
        if(config.cost === 0) return;

        // Check if all prerequisite buildings have been constructed.
        const requirements = config.requires ? (Array.isArray(config.requires) ? config.requires : [config.requires]) : [];
        const requirementsMet = requirements.every(req => hasBuilding(req));

        if (!requirementsMet && requirements.length > 0) {
            return;
        }

        // If prerequisites are met (or there are none), add to the appropriate list.
        if (Object.values(UnitType).includes(itemType as UnitType)) {
            producibleUnits.push(itemType as UnitType);
        } else if (Object.values(BuildingType).includes(itemType as BuildingType)) {
            const isSuperweapon = itemType === BuildingType.CHRONO_SPHERE || itemType === BuildingType.NUCLEAR_MISSILE_SILO;
            
            // Allow building if it's NOT a superweapon, OR if it IS a superweapon and the player DOESN'T have it yet.
            if (!isSuperweapon || (isSuperweapon && !hasBuilding(itemType as BuildingType))) {
                producibleBuildings.push(itemType as BuildingType);
            }
        }
    });
    
    return { producibleUnits, producibleBuildings };
}
