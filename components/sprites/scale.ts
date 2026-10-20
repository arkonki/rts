import { BuildingType, EntityCategory, UnitType } from '../../types';
import { ENTITY_CONFIGS } from '../../constants';

const MAP_SCALE: Record<EntityCategory, number> = {
    INFANTRY: 2.3,
    VEHICLE_COMBAT: 1.5,
    VEHICLE_SUPPORT: 1.5,
    AIRCRAFT: 1.8,
    VESSEL: 1.55,
    BUILDING_BASE: 1,
    BUILDING_SUPERWEAPON: 1,
};

const CAMEO_SCALE: Record<EntityCategory, number> = {
    INFANTRY: 1.9,
    VEHICLE_COMBAT: 1.12,
    VEHICLE_SUPPORT: 1.12,
    AIRCRAFT: 1.05,
    VESSEL: 1.1,
    BUILDING_BASE: 0.95,
    BUILDING_SUPERWEAPON: 0.95,
};

/** How much bigger than its footprint a unit's artwork is drawn on the map (infantry sprites are tiny in their box). */
export const mapScale = (type: UnitType | BuildingType) => MAP_SCALE[ENTITY_CONFIGS[type].category];

/** Zoom for the same artwork when shown as a sidebar cameo. */
export const cameoScale = (type: UnitType | BuildingType) => CAMEO_SCALE[ENTITY_CONFIGS[type].category];
