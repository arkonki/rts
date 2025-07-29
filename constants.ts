
import { UnitType, BuildingType, EntityConfig, AIDifficulty, UnitDomain, Position } from './types';

export const TILE_SIZE = 40;
export const MAP_WIDTH_TILES = 80;
export const MAP_HEIGHT_TILES = 60;

export const MAP_WIDTH = MAP_WIDTH_TILES * TILE_SIZE;
export const MAP_HEIGHT = MAP_HEIGHT_TILES * TILE_SIZE;

export const GAME_LOOP_INTERVAL = 100; // ms

export const ATTACK_VISUAL_DURATION = 300; // ms
export const EXPLOSION_DURATION = 400; // ms
export const DAMAGE_TEXT_DURATION = 1000; // ms
export const REPAIR_TEXT_DURATION = 1000; // ms
export const CHRONO_VORTEX_DURATION = 1500; // ms
export const NUKE_IMPACT_DURATION = 5000; // ms


export const PLAYER_COLORS = [
    'border-blue-500',   // Player 1 (Human)
    'border-red-500',    // Player 2 (AI 1)
    'border-green-500',  // Player 3 (AI 2)
    'border-yellow-500', // Player 4 (AI 3)
];

export const STARTING_POSITIONS: Record<number, Position[]> = {
    2: [
        { x: TILE_SIZE * 5, y: MAP_HEIGHT - TILE_SIZE * 5 }, // Bottom-left
        { x: MAP_WIDTH - TILE_SIZE * 5, y: TILE_SIZE * 5 }, // Top-right
    ],
    3: [
        { x: TILE_SIZE * 5, y: MAP_HEIGHT - TILE_SIZE * 5 }, // Bottom-left
        { x: MAP_WIDTH - TILE_SIZE * 5, y: TILE_SIZE * 5 }, // Top-right
        { x: TILE_SIZE * 5, y: TILE_SIZE * 5 },             // Top-left
    ],
    4: [
        { x: TILE_SIZE * 5, y: MAP_HEIGHT - TILE_SIZE * 5 }, // Bottom-left
        { x: MAP_WIDTH - TILE_SIZE * 5, y: TILE_SIZE * 5 }, // Top-right
        { x: TILE_SIZE * 5, y: TILE_SIZE * 5 },             // Top-left
        { x: MAP_WIDTH - TILE_SIZE * 5, y: MAP_HEIGHT - TILE_SIZE * 5 }, // Bottom-right
    ],
};


export const DIFFICULTY_SETTINGS: Record<AIDifficulty, { startingCredits: number; decisionInterval: number; aggressionThreshold: number; }> = {
  EASY: {
    startingCredits: 1500,
    decisionInterval: 8000,
    aggressionThreshold: 12,
  },
  NORMAL: {
    startingCredits: 1000,
    decisionInterval: 5000,
    aggressionThreshold: 8,
  },
  HARD: {
    startingCredits: 500,
    decisionInterval: 3000,
    aggressionThreshold: 5,
  }
};

export const ENTITY_CONFIGS: Record<UnitType | BuildingType, EntityConfig> = {
  // --- GROUND UNITS ---
  [UnitType.RIFLEMAN]: {
    name: 'Rifleman',
    cost: 50,
    buildTime: 3000,
    hp: 50,
    damage: 5,
    attackRange: 4 * TILE_SIZE,
    attackSpeed: 1000, // ms per attack
    aggroRange: 5 * TILE_SIZE,
    size: 20,
    visionRange: 6,
    producedBy: BuildingType.BARRACKS,
    domain: UnitDomain.GROUND,
    canAttack: [UnitDomain.GROUND, UnitDomain.AIR],
    description: 'Basic infantry, effective in groups. Can attack both ground and air targets.',
    category: 'INFANTRY',
  },
  [UnitType.TESLA_TROOPER]: {
    name: 'Tesla Trooper',
    cost: 150,
    buildTime: 5000,
    hp: 80,
    damage: 30,
    attackRange: 1.5 * TILE_SIZE,
    attackSpeed: 1500,
    aggroRange: 3 * TILE_SIZE,
    size: 22,
    visionRange: 4,
    producedBy: BuildingType.BARRACKS,
    domain: UnitDomain.GROUND,
    canAttack: [UnitDomain.GROUND],
    description: 'Armored shock trooper with a powerful short-range Tesla weapon.',
    category: 'INFANTRY',
  },
    [UnitType.ENGINEER]: {
    name: 'Engineer',
    cost: 200,
    buildTime: 4000,
    hp: 60,
    size: 20,
    visionRange: 4,
    producedBy: BuildingType.BARRACKS,
    domain: UnitDomain.GROUND,
    description: 'Can repair damaged buildings and vehicles. Costs credits to repair.',
    category: 'INFANTRY',
    repairPower: 20, // HP per second
    repairCostMultiplier: 0.1, // credits per HP repaired
  },
  [UnitType.TANK]: {
    name: 'Grizzly Tank',
    cost: 200,
    buildTime: 8000,
    hp: 200,
    damage: 25,
    attackRange: 6 * TILE_SIZE,
    attackSpeed: 2000,
    aggroRange: 7 * TILE_SIZE,
    size: 35,
    visionRange: 5,
    producedBy: BuildingType.WAR_FACTORY,
    domain: UnitDomain.GROUND,
    canAttack: [UnitDomain.GROUND],
    description: 'Standard battle tank. A versatile backbone for any ground assault.',
    category: 'VEHICLE_COMBAT',
  },
  [UnitType.PRISM_TANK]: {
    name: 'Prism Tank',
    cost: 1200,
    buildTime: 15000,
    hp: 100,
    damage: 100,
    attackRange: 10 * TILE_SIZE,
    attackSpeed: 3000,
    aggroRange: 11 * TILE_SIZE,
    size: 35,
    visionRange: 6,
    producedBy: BuildingType.WAR_FACTORY,
    domain: UnitDomain.GROUND,
    canAttack: [UnitDomain.GROUND],
    description: 'Long-range artillery that fires a devastating energy beam. Fragile but deadly.',
    category: 'VEHICLE_COMBAT',
  },
  [UnitType.APOCALYPSE_TANK]: {
    name: 'Apocalypse Tank',
    cost: 1750,
    buildTime: 25000,
    hp: 800,
    damage: 100,
    attackRange: 7 * TILE_SIZE,
    attackSpeed: 3000,
    aggroRange: 8 * TILE_SIZE,
    size: 45,
    visionRange: 5,
    producedBy: BuildingType.WAR_FACTORY,
    domain: UnitDomain.GROUND,
    canAttack: [UnitDomain.GROUND, UnitDomain.AIR],
    description: 'The ultimate heavy tank. Extremely durable and powerful against all targets.',
    category: 'VEHICLE_COMBAT',
  },
  [UnitType.CHRONO_MINER]: {
    name: 'Chrono Miner',
    cost: 1400,
    buildTime: 10000,
    hp: 150,
    size: 30,
    visionRange: 4,
    producedBy: BuildingType.WAR_FACTORY,
    domain: UnitDomain.GROUND,
    description: 'Resource harvester. The first is free with a new Refinery. Build more at the War Factory.',
    gatherCapacity: 500,
    gatherAmount: 25,
    category: 'VEHICLE_SUPPORT',
  },

  // --- AIR UNITS ---
  [UnitType.ROCKETEER]: {
    name: 'Rocketeer',
    cost: 600,
    buildTime: 7000,
    hp: 75,
    damage: 20,
    attackRange: 5 * TILE_SIZE,
    attackSpeed: 1200,
    aggroRange: 6 * TILE_SIZE,
    size: 20,
    visionRange: 7,
    producedBy: BuildingType.AIRFIELD,
    domain: UnitDomain.AIR,
    canAttack: [UnitDomain.GROUND, UnitDomain.AIR],
    description: 'Fast and agile flying infantry, effective against a variety of targets.',
    category: 'AIRCRAFT',
  },
  [UnitType.FIGHTER_JET]: {
    name: 'Fighter Jet',
    cost: 500,
    buildTime: 12000,
    hp: 150,
    damage: 40,
    attackRange: 7 * TILE_SIZE,
    attackSpeed: 1800,
    aggroRange: 8 * TILE_SIZE,
    size: 30,
    visionRange: 9,
    producedBy: BuildingType.AIRFIELD,
    domain: UnitDomain.AIR,
    canAttack: [UnitDomain.GROUND, UnitDomain.AIR, UnitDomain.SEA],
    description: 'Superior air-to-air fighter that can also perform strafing runs on ground and sea targets.',
    category: 'AIRCRAFT',
  },
  [UnitType.KIROV_AIRSHIP]: {
    name: 'Kirov Airship',
    cost: 2000,
    buildTime: 30000,
    hp: 2000,
    damage: 500,
    attackRange: 1 * TILE_SIZE,
    attackSpeed: 5000,
    aggroRange: 3 * TILE_SIZE, // It's not smart, it just plods along
    size: 60,
    visionRange: 8,
    producedBy: BuildingType.AIRFIELD,
    domain: UnitDomain.AIR,
    canAttack: [UnitDomain.GROUND, UnitDomain.SEA],
    description: '"Kirov reporting." A slow but incredibly tough siege airship that drops massive bombs.',
    category: 'AIRCRAFT',
  },
  
  // --- SEA UNITS ---
  [UnitType.DESTROYER]: {
    name: 'Destroyer',
    cost: 800,
    buildTime: 15000,
    hp: 400,
    damage: 50,
    attackRange: 8 * TILE_SIZE,
    attackSpeed: 2500,
    aggroRange: 9 * TILE_SIZE,
    size: 45,
    visionRange: 7,
    producedBy: BuildingType.NAVAL_YARD,
    domain: UnitDomain.SEA,
    canAttack: [UnitDomain.GROUND, UnitDomain.SEA],
    description: 'Primary warship for naval combat and coastal bombardment.',
    category: 'VESSEL',
  },
  [UnitType.SEA_SCORPION]: {
    name: 'Sea Scorpion',
    cost: 600,
    buildTime: 9000,
    hp: 250,
    damage: 20,
    attackRange: 7 * TILE_SIZE,
    attackSpeed: 1500,
    aggroRange: 8 * TILE_SIZE,
    size: 30,
    visionRange: 8,
    producedBy: BuildingType.NAVAL_YARD,
    domain: UnitDomain.SEA,
    canAttack: [UnitDomain.AIR, UnitDomain.SEA],
    description: 'Anti-air and anti-ship patrol boat. Fast and versatile.',
    category: 'VESSEL',
  },

  // --- BUILDINGS ---
  [BuildingType.HQ]: {
    name: 'HQ',
    cost: 2000,
    buildTime: 0,
    hp: 2000,
    powerConsumed: 10,
    size: TILE_SIZE * 2,
    visionRange: 10,
    description: 'Your command center. Produces basic buildings. Protect it at all costs.',
    category: 'BUILDING_BASE',
  },
  [BuildingType.REFINERY]: {
    name: 'Refinery',
    cost: 600,
    buildTime: 5000,
    hp: 800,
    powerConsumed: 10,
    size: TILE_SIZE * 1.5,
    visionRange: 4,
    producedBy: BuildingType.HQ,
    description: 'Grants one free Chrono Miner upon completion. Acts as a resource drop-off point.',
    category: 'BUILDING_BASE',
  },
  [BuildingType.POWER_PLANT]: {
    name: 'Power Plant',
    cost: 200,
    buildTime: 2000,
    hp: 500,
    powerProduced: 50,
    powerConsumed: 0,
    size: TILE_SIZE,
    visionRange: 4,
    producedBy: BuildingType.HQ,
    description: 'Provides power to your base. Buildings will shut down without enough power.',
    category: 'BUILDING_BASE',
  },
  [BuildingType.BARRACKS]: {
    name: 'Barracks',
    cost: 300,
    buildTime: 4000,
    hp: 600,
    powerConsumed: 10,
    size: TILE_SIZE * 1.25,
    visionRange: 5,
    producedBy: BuildingType.HQ,
    description: 'Trains all infantry units.',
    category: 'BUILDING_BASE',
  },
  [BuildingType.WAR_FACTORY]: {
    name: 'War Factory',
    cost: 800,
    buildTime: 10000,
    hp: 1000,
    powerConsumed: 20,
    size: TILE_SIZE * 1.5,
    visionRange: 5,
    requires: [BuildingType.BARRACKS, BuildingType.POWER_PLANT],
    producedBy: BuildingType.HQ,
    description: 'Constructs all ground vehicles.',
    category: 'BUILDING_BASE',
  },
  [BuildingType.AIRFIELD]: {
    name: 'Airfield',
    cost: 700,
    buildTime: 8000,
    hp: 800,
    powerConsumed: 15,
    size: TILE_SIZE * 1.75,
    visionRange: 6,
    requires: [BuildingType.BARRACKS, BuildingType.POWER_PLANT],
    producedBy: BuildingType.HQ,
    description: 'Builds and maintains all air units.',
    category: 'BUILDING_BASE',
  },
  [BuildingType.NAVAL_YARD]: {
    name: 'Naval Yard',
    cost: 1000,
    buildTime: 12000,
    hp: 1200,
    powerConsumed: 25,
    size: TILE_SIZE * 2,
    visionRange: 6,
    placementRule: 'COASTAL',
    requires: [BuildingType.BARRACKS, BuildingType.POWER_PLANT],
    producedBy: BuildingType.HQ,
    description: 'Constructs all naval vessels. Must be placed on a coastline.',
    category: 'BUILDING_BASE',
  },
  [BuildingType.REPAIR_BAY]: {
    name: 'Repair Bay',
    cost: 1000,
    buildTime: 12000,
    hp: 1000,
    powerConsumed: 25,
    size: TILE_SIZE * 1.75,
    visionRange: 5,
    requires: [BuildingType.WAR_FACTORY],
    producedBy: BuildingType.HQ,
    description: 'Automatically repairs nearby damaged vehicles. Costs credits.',
    category: 'BUILDING_BASE',
    repairPower: 30, // HP per second
    repairCostMultiplier: 0.2, // credits per HP repaired
  },

  // --- SUPERWEAPONS ---
  [BuildingType.CHRONO_SPHERE]: {
    name: 'Chrono Sphere',
    cost: 3000,
    buildTime: 45000,
    hp: 1000,
    powerConsumed: 100,
    size: TILE_SIZE * 2.5,
    visionRange: 5,
    requires: [BuildingType.WAR_FACTORY, BuildingType.AIRFIELD],
    superweaponCooldown: 300000, // 5 minutes
    producedBy: BuildingType.HQ,
    description: 'Allows you to teleport a squad of units anywhere on the map.',
    category: 'BUILDING_SUPERWEAPON',
  },
  [BuildingType.NUCLEAR_MISSILE_SILO]: {
    name: 'Nuclear Missile Silo',
    cost: 5000,
    buildTime: 60000,
    hp: 1500,
    powerConsumed: 150,
    size: TILE_SIZE * 2.5,
    visionRange: 5,
    requires: [BuildingType.WAR_FACTORY],
    superweaponCooldown: 420000, // 7 minutes
    producedBy: BuildingType.HQ,
    description: 'Launches a devastating nuclear missile to obliterate a target area.',
    category: 'BUILDING_SUPERWEAPON',
  },
};
