import { GameState } from '../types';

export const INITIAL_STATE: GameState = {
  entities: {},
  players: {},
  aiOpponents: [],
  selectedIds: [],
  gameStatus: 'MENU',
  lastMessage: "Welcome to Gemini RTS!",
  viewport: { x: 0, y: 0 },
  terrain: [],
  fogOfWar: [],
  visualEffects: [],
  isChronoTeleportPending: false,
  resourcePatches: {},
  controlGroups: {},
  gameStats: {},
  gameSummary: null,
  nextId: 1,
  tick: 0,
  mapSeed: 0,
  soundEvents: [],
};
