
export type PlayerId = string;

export enum UnitDomain {
  GROUND = 'GROUND',
  AIR = 'AIR',
  SEA = 'SEA',
}

export enum UnitType {
  // Base
  RIFLEMAN = 'RIFLEMAN',
  TANK = 'TANK',
  FIGHTER_JET = 'FIGHTER_JET',
  DESTROYER = 'DESTROYER',

  // New RA2 Units
  TESLA_TROOPER = 'TESLA_TROOPER',
  PRISM_TANK = 'PRISM_TANK',
  ROCKETEER = 'ROCKETEER',
  KIROV_AIRSHIP = 'KIROV_AIRSHIP',
  APOCALYPSE_TANK = 'APOCALYPSE_TANK',
  SEA_SCORPION = 'SEA_SCORPION',
  CHRONO_MINER = 'CHRONO_MINER',

  // New Support Unit
  ENGINEER = 'ENGINEER',
}

export enum BuildingType {
  HQ = 'HQ',
  REFINERY = 'REFINERY',
  POWER_PLANT = 'POWER_PLANT',
  BARRACKS = 'BARRACKS',
  WAR_FACTORY = 'WAR_FACTORY',
  AIRFIELD = 'AIRFIELD',
  NAVAL_YARD = 'NAVAL_YARD',
  REPAIR_BAY = 'REPAIR_BAY',

  // Superweapons
  CHRONO_SPHERE = 'CHRONO_SPHERE',
  NUCLEAR_MISSILE_SILO = 'NUCLEAR_MISSILE_SILO',
}

export enum TerrainType {
  GROUND = 0,
  MOUNTAIN = 1, // Replaces ROCK
  TREES = 2,
  SHALLOW_WATER = 3,
  DEEP_WATER = 4,
}

export enum FogState {
  UNEXPLORED,
  EXPLORED,
  VISIBLE,
}

export type AIDifficulty = 'EASY' | 'NORMAL' | 'HARD';
export type AIPersonality = 'BALANCED' | 'AGGRESSIVE' | 'ECONOMIC';

export interface Position {
  x: number;
  y: number;
}

export interface BaseEntity {
  id: string;
  playerId: PlayerId;
  hp: number;
  maxHp: number;
  position: Position;
  size: number;
  attackRange?: number;
  damage?: number;
  lastAttackTime?: number;
}

export interface Unit extends BaseEntity {
  type: UnitType;
  domain: UnitDomain;
  status: 'IDLE' | 'MOVING' | 'ATTACKING' | 'ATTACK_MOVING' | 'MOVING_TO_ORE' | 'GATHERING' | 'RETURNING_TO_REFINERY' | 'MOVING_TO_REPAIR' | 'REPAIRING';
  targetPosition?: Position;
  targetId?: string;
  path?: Position[];
  cargoAmount?: number;
  gatherTargetId?: string;
  refineryTargetId?: string;
  repairTargetId?: string;
}

export interface Building extends BaseEntity {
  type: BuildingType;
  isPowered: boolean;
  productionQueue: (UnitType | BuildingType)[];
  productionProgress: number;
  isConstructing?: boolean;
  rallyPoint?: Position;
}

export type GameEntity = Unit | Building;

export interface ResourcePatch {
    id: string;
    position: Position;
    amount: number;
    maxAmount: number;
    size: number;
}

export interface SuperweaponState {
    type: BuildingType.CHRONO_SPHERE | BuildingType.NUCLEAR_MISSILE_SILO;
    isReady: boolean;
    cooldown: number; // in milliseconds
}

export interface PlayerState {
  id: PlayerId;
  credits: number;
  power: {
    produced: number;
    consumed: number;
  };
  aiActionCooldown: number;
  hqId: string;
  superweapon: SuperweaponState | null;
}

export type GameStatus = 'MENU' | 'LOADING' | 'PLAYING' | 'PAUSED' | 'PLAYER_WIN' | 'AI_WIN';

export type VisualEffectType = 'DAMAGE_TEXT' | 'ATTACK_VISUAL' | 'EXPLOSION' | 'CHRONO_VORTEX' | 'NUKE_IMPACT' | 'REPAIR_TEXT';

export interface BaseVisualEffect {
    id: string;
    type: VisualEffectType;
    creationTime: number;
}

export interface DamageTextEffect extends BaseVisualEffect {
    type: 'DAMAGE_TEXT';
    text: string;
    position: Position;
}

export interface RepairTextEffect extends BaseVisualEffect {
    type: 'REPAIR_TEXT';
    text: string;
    position: Position;
}

export interface AttackVisualEffect extends BaseVisualEffect {
    type: 'ATTACK_VISUAL';
    attackerId: string;
    targetId: string;
}

export interface ExplosionEffect extends BaseVisualEffect {
    type: 'EXPLOSION';
    position: Position;
    size: number;
}

export interface ChronoVortexEffect extends BaseVisualEffect {
    type: 'CHRONO_VORTEX';
    position: Position;
    size: number;
}

export interface NukeImpactEffect extends BaseVisualEffect {
    type: 'NUKE_IMPACT';
    position: Position;
}

export type VisualEffect = DamageTextEffect | AttackVisualEffect | ExplosionEffect | ChronoVortexEffect | NukeImpactEffect | RepairTextEffect;

export interface AIConfiguration {
    id: PlayerId;
    personality: AIPersonality;
    difficulty: AIDifficulty;
}

export interface GameState {
  entities: Record<string, GameEntity>;
  players: Record<PlayerId, PlayerState>;
  aiOpponents: AIConfiguration[];
  selectedIds: string[];
  gameStatus: GameStatus;
  lastMessage: string | null;
  viewport: Position;
  terrain: TerrainType[][];
  fogOfWar: FogState[][];
  visualEffects: VisualEffect[];
  isChronoTeleportPending: boolean;
  resourcePatches: Record<string, ResourcePatch>;
  controlGroups: Record<string, string[]>;
}

export type AIActionType = 'BUILD' | 'TRAIN' | 'ATTACK' | 'IDLE' | 'LAUNCH_SUPERWEAPON' | 'GATHER' | 'REPAIR';

export interface AIAction {
    playerId: PlayerId;
    thought?: string;
    action: AIActionType;
    unitType?: UnitType;
    buildingType?: BuildingType;
    attackTargetId?: string;
    placementPosition?: Position;
    unitIds?: string[];
    targetPosition?: Position; // For superweapon
    gatherTargetId?: string; // For GATHER action
    repairTargetId?: string; // For REPAIR action
}

export type EntityCategory = 'INFANTRY' | 'VEHICLE_COMBAT' | 'VEHICLE_SUPPORT' | 'AIRCRAFT' | 'VESSEL' | 'BUILDING_BASE' | 'BUILDING_SUPERWEAPON';

export interface EntityConfig {
  name: string;
  cost: number;
  buildTime: number;
  hp: number;
  size: number;
  visionRange: number; // in tiles
  description: string;
  category: EntityCategory;

  // Unit specific
  damage?: number;
  attackRange?: number;
  attackSpeed?: number;
  aggroRange?: number;
  domain?: UnitDomain;
  canAttack?: UnitDomain[];
  gatherCapacity?: number;
  gatherAmount?: number;
  repairPower?: number; // HP per second
  repairCostMultiplier?: number; // Cost per HP repaired

  // Building specific
  powerConsumed?: number;
  powerProduced?: number;
  placementRule?: 'COASTAL';
  requires?: BuildingType | BuildingType[];
  superweaponCooldown?: number; // in milliseconds
  producedBy?: BuildingType;
}
