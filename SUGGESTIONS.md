# Suggestions for Improvement

Analysis of the **AI RTS: Red Alert** codebase (React 19 + Vite + TypeScript, ~5k lines, 38 files). It is a Red Alert-style RTS with fog of war, three unit domains, superweapons and rule-based AI opponents.

The code is readable and has a sensible split between `state/`, `hooks/`, `components/`, `utils/` and `services/`. The issues below are mostly correctness gaps in the simulation, per-tick performance costs, and missing project hygiene.

Priority: **P0** = real bug or risk, fix first. **P1** = significant quality or performance win. **P2** = polish or longer-term.

---

## 1. Correctness bugs

| # | Pri | Issue | Where |
|---|-----|-------|-------|
| 1.1 | P0 | **Power has no gameplay effect.** `isPowered` is set `true` when construction finishes and never changes again. `updatePlayerPowerAndSuperweapons` computes `produced`/`consumed` but nothing flips `isPowered` on a deficit. The Sidebar "LOW POWER" label, the Power Plant description ("Buildings will shut down…") and the AI's `powerDeficit` logic all imply the mechanic exists. | `state/reducer.ts:52`, `:388-442` |
| 1.2 | P0 | **Entity ID collisions.** IDs are `${playerId}_${type}_${Date.now()}`. Two production buildings finishing the same unit type in one tick (or a refinery miner spawning with a unit) share an ID, so one entity silently overwrites the other. Ticks are 100 ms, so this is likely with several Barracks or War Factories. | `reducer.ts:68`, `:125`, `:823`, `:982` |
| 1.3 | P0 | **AI never builds a Naval Yard.** `isCoastalTile` in `aiHelpers.ts` has a typo: `y < MAP_HEIGHT_TILES` should be `y >= MAP_HEIGHT_TILES`. It returns `false` for nearly every tile. The identical function in `GameOverlay.tsx` is correct. | `utils/aiHelpers.ts:5` |
| 1.4 | P0 | **AI units only auto-engage what the human can see.** `findNearestEnemy` checks the *player's* fog (`FogState.VISIBLE`) for every attacker. AI units never auto-acquire targets outside the human's vision, and AI-vs-AI fights only happen on explicit ATTACK orders. Fog should gate only the human player's own units, or each player needs their own visibility. | `utils/entity.ts:21` |
| 1.5 | P0 | **No `.gitignore`.** The README tells users to put `GEMINI_API_KEY` in `.env.local`, and nothing stops `git add .` from committing it. `node_modules` and `dist` are also unprotected. | repo root |
| 1.6 | P1 | **Reducer mutates previous state.** `newState = { ...state }` is a shallow copy, but `newState.players[playerId] = …` and `newState.entities[producer.id] = …` write into the original `players`/`entities` objects. This breaks reducer purity and React's change detection, and it is the kind of bug that StrictMode and time-travel debugging surface. | `reducer.ts:989`, `:1009-1010` |
| 1.7 | P1 | **Side effects inside the reducer.** `soundService.play()` and `Date.now()`/`Math.random()` are called in `PLACE_BUILDING`, `QUEUE_PRODUCTION`, `CHRONO_TELEPORT_UNITS`, `LAUNCH_NUKE` and `GAME_TICK`. Under `<React.StrictMode>` (used in `index.tsx`) reducers are invoked twice in dev, so sounds play twice and IDs and timestamps differ between the two runs. Return events from the reducer, or play sounds from an effect that watches `state`. | `reducer.ts:756`, `:779`, `:843`, `:882`, `:952` |
| 1.8 | P1 | **Rule checks are UI-only.** `PLACE_BUILDING` does not check `requires`, `producedBy`, proximity to the player's base or footprint (only the centre tile is tested). `COMMAND_ATTACK` ignores `canAttack` (a Tesla Trooper can be ordered to attack a Fighter Jet it cannot hit, and will chase it indefinitely). The AI `BUILD` and `TRAIN` branches skip terrain, `placementRule` and `requires` validation. Any caller other than the UI, such as the dormant Gemini AI, can bypass the rules. Validate in the reducer. | `reducer.ts:771`, `:721`, `:968-1015` |
| 1.9 | P1 | **Win/loss logic is thin.** Defeat is "no buildings at all", even though the comment says HQ-like structures. A defeated AI keeps its units alive, and they keep fighting. Eliminated players are never removed from the match. | `reducer.ts:485-511` |
| 1.10 | P1 | **Sound config typos and external hosts.** `place_building` points at `.waw`, which is a typo and will always 404. Several sounds are hot-linked from `maantoa.ee`, so they can vanish or be CORS-blocked. The `/sounds/*` files referenced do not exist in the repo. Vendor the assets into `public/sounds` (and fix the extension). | `services/soundService.ts:32-55` |
| 1.11 | P2 | `SELECT_AND_CENTER_CONTROL_GROUP` hard-codes a 1000×800 viewport. The real size lives in `viewportSize`. | `reducer.ts:646-647` |
| 1.12 | P2 | `UI.tsx` casts an AI id to `AIPersonality` (`as AIPersonality`). The type is wrong and masks nothing. | `components/UI.tsx:65` |
| 1.13 | P2 | Escape cancels chrono teleport by re-dispatching `SELECT`, which is non-obvious. Add an explicit `CANCEL_CHRONO_TELEPORT` action. | `hooks/useInputHandling.ts:64` |

---

## 2. Performance

The simulation ticks every 100 ms and the whole `GameState` flows through React, so per-tick allocations and renders dominate.

| # | Pri | Issue | Suggested fix |
|---|-----|-------|---------------|
| 2.1 | P0 | **Fog of war invalidates itself every tick.** `updateFogOfWar` first downgrades every `VISIBLE` cell to `EXPLORED`, then re-marks visible cells. Each re-mark counts as a change, so `fogChanged` is always true while the player owns anything. The result is a new fog array every tick, which means `FogCanvas` (80×60 tiles) and the `Minimap` (terrain + fog loops) fully redraw 10×/s. | Compute the new visible set first and diff it against the previous one. Only produce a new array (and only redraw) when it differs. |
| 2.2 | P0 | **Every mouse move re-renders the whole game.** `mousePos` is `useState` inside `useInputHandling`, called from `App`. Each `mousemove` re-renders `App`, re-runs `clusterEntities` (O(n²) BFS, not memoized, `App.tsx:54`) and reconciles every entity. | Keep mouse position in a ref and only store it in state where needed (ghost building, selection box). Memoize `clusterEntities` on `state.entities`. Consider a Zustand-style store with selectors. |
| 2.3 | P1 | **A\* is slow and uncapped.** `openList.sort()` runs every iteration and `find()` scans the open list per neighbour, so it is roughly O(n² log n). String keys are used for the closed set. An unreachable or blocked destination (e.g. right-click on a mountain) floods the entire 4800-tile map. Chasing units call `findPath` again whenever their path has <2 nodes. | Use a binary heap and numeric indices (`y * W + x`). Reject non-walkable goals up front (or snap to the nearest walkable tile). Add an iteration cap. Cache paths for group moves. |
| 2.4 | P1 | **Per-tick deep clones and stringify diffs.** `JSON.parse(JSON.stringify(state.gameStats))` runs three times per tick, and `JSON.stringify(unit) !== JSON.stringify(currentUnit)` runs for every unit every tick. | Copy-on-write only the stats entry that changes. Track a `dirty` flag per unit instead of serializing. |
| 2.5 | P1 | **Minimap redraws everything per tick.** It iterates terrain and fog tile-by-tile on every `entities` change (`Minimap.tsx:101`). | Pre-render terrain to an offscreen canvas once, draw fog only when it changes, and draw entities in a separate lightweight pass. |
| 2.6 | P1 | **Timing uses `setInterval` with an assumed 100 ms step.** Background-tab throttling or a slow frame slows the game down. Unit speed is `2` px per tick. | Use `requestAnimationFrame` plus a fixed-timestep accumulator driven by `performance.now()`. Make unit speed a per-unit config value in `ENTITY_CONFIGS`. |
| 2.7 | P2 | `useGameLoop` tears down and recreates the scroll interval on every mouse move (`mousePos` is a dependency). | Read `mousePos` from a ref inside one stable interval or `rAF` loop. |
| 2.8 | P2 | Entities are DOM `<div>`s with Tailwind classes, plus an SVG per attack line. This will struggle past a few hundred units. | Render units and effects to a single `<canvas>` (the terrain and fog already use canvas). There is a `utils/canvasIconRenderer.ts` that is unused and could help. |
| 2.9 | P2 | `SpatialGrid` is rebuilt from scratch every tick, and `findNearestEnemy` is called for each idle unit. | Fine at the current scale. Revisit if unit counts grow. Only rebuild moved entities. |

---

## 3. AI

- **`services/geminiService.ts` is dead code.** Nothing imports `getAICommand`. `metadata.json` says "powered by OpenRouter", the README says Gemini, and the running AI is the rule-based `localAIService`. Either delete the Gemini path (and `@google/genai`, the importmap entry and the `process.env.API_KEY` defines in `vite.config.ts`) or wire it up properly as an optional "LLM commander" with these fixes:
  - Add `REPAIR` to the schema enum (it exists in `AIActionType` but not in `aiActionSchema`).
  - Validate the model's output with a runtime schema before dispatching.
  - Add timeouts and rate limiting.
  - Proxy the call through a server so the API key is not baked into the client bundle (`vite.config.ts` inlines it via `define`).
- **Local AI cheats on visibility.** `localAIService` reads all enemy entities and ignores fog. `geminiService` respects fog, so the two behave differently. Decide on one rule.
- **`DIFFICULTY_SETTINGS.aggressionThreshold` is never used.** Difficulty only changes starting credits (HARD gets *fewer*, 500 vs 1500 on EASY) and decision interval. Add an income multiplier, build-order tweaks and army-size scaling, and use the threshold or remove it.
- **Single-action-per-decision pacing.** With a 3–8 s decision interval and one action per decision, the AI is slow to queue units and rarely multitasks. Let each decision emit a small batch of actions (one economy, one military).
- **Weak tactical behaviour.** Attacks send the whole army at one target. There is no retreat for damaged units, no scouting, no defence of expansions, and no use of Chrono Sphere (only the nuke is handled).
- **Placement uses random sampling** (`findBuildPlacement`, 100 tries). A deterministic ring or grid search around the base would be more reliable and testable.

---

## 4. Architecture and code quality

- **Split `state/reducer.ts` (1074 lines).** It mixes the tick pipeline, commands, AI action application and superweapons. Suggested layout: `state/systems/{construction,production,combat,movement,economy,fog,power}.ts`, `state/commands.ts`, and a thin `reducer.ts`.
- **Type the actions.** `gameReducer(state, action: any)` and `React.Dispatch<any>` appear everywhere. Define a discriminated `GameAction` union so payloads are checked and `switch` is exhaustive.
- **Model entities with a discriminant.** The code distinguishes units from buildings via `'status' in e` / `'isPowered' in e` and many `as Unit` / `as Building` casts. Add `kind: 'unit' | 'building'` to `BaseEntity` so TypeScript can narrow.
- **Extract helpers that are repeated.**
  - The `requires` normalization (`Array.isArray(...) ? ... : ...`) appears in the reducer, `logic.ts`, `Sidebar.tsx` (twice) and `localAIService.ts`.
  - `isCoastalTile` exists in three places (reducer, `GameOverlay`, `aiHelpers`), and the copies have already drifted (see 1.3).
  - The tile↔pixel conversions are inlined all over the place.
  - `ProductionButton` and `BuildButton` in `Sidebar.tsx` are near-duplicates.
- **Pull magic numbers into `constants.ts`.** Examples: movement speed `2`, nuke radius and damage (`TILE_SIZE * 5`, `1000`), cluster size `35`, scroll speed and edge margin, AI queue limits (`< 2`, `< 3`, `< 5`), `Math.random() < 0.1` effect throttles.
- **Combat model is flat.** Damage is a fixed number with no armour or damage types, and no unit-vs-unit counters beyond `canAttack`. The Prism Tank (100 dmg, 10-tile range, 100 HP) and Apocalypse Tank look balanced mostly by cost. Consider armour classes and a damage multiplier table.
- **Production model.** Costs are charged when queued, with no way to cancel or refund. Only the front item progresses. The sidebar queue shows no progress bar. Buildings are placed and charged up front instead of being "built" from the HQ queue.
- **Movement has no collision or separation.** Units stack on the same tile, buildings are not obstacles in pathfinding (units walk through them), and diagonal moves can cut corners around mountains. A simple separation steering pass plus marking building footprints as blocked would fix most of it.
- **Pathfinding heuristic.** `findPath` uses Manhattan distance with 8-way movement and uniform diagonal cost. It is inadmissible, so paths are not guaranteed shortest. Use octile distance with √2 diagonals (as `map.ts` already does with Euclidean).
- **Duplicate A\*.** `utils/map.ts` has its own pathfinder. Share one generic implementation with a cost function.
- **Unused code to remove or use:** `utils/canvasIconRenderer.ts` (nothing imports it), `DIFFICULTY_SETTINGS.aggressionThreshold`, `services/geminiService.ts`, and the `'LOADING'` game status (never set).

---

## 5. Tooling, build and project hygiene

- **No tests.** The deterministic parts are ideal for unit tests: `findPath`, `findBuildPlacement`, `getProducibleItems`, `clusterEntities`, `checkWinLossConditions`, production/construction ticks, and `getLocalAICommand`. Add Vitest. A seeded RNG for `generateMap` would also make map tests and bug reproduction possible (it currently uses `Math.random` throughout).
- **No lint, format or typecheck scripts.** `package.json` only has `dev`/`build`/`preview`, and `vite build` does not typecheck. Add `"typecheck": "tsc --noEmit"`, ESLint (with `react-hooks`) and Prettier, and run them in CI.
- **TypeScript is not in strict mode.** Enable `"strict": true` (and `noUncheckedIndexedAccess` if you like). The many `!` assertions and `any` payloads suggest there are latent null bugs.
- **No CI.** A basic GitHub Actions workflow (install, typecheck, test, build) would catch regressions.
- **`index.html` fights the bundler.**
  - It declares an `importmap` pointing `react`, `react-dom` and `react-icons` at `esm.sh` while `package.json` also installs them. Under Vite the importmap is irrelevant (or causes duplicate React copies). It looks like a leftover from AI Studio.
  - Tailwind is loaded from `cdn.tailwindcss.com`, which is explicitly not for production and adds a runtime JIT. Install Tailwind as a PostCSS plugin.
  - It links `/index.css` and `/vite.svg`, and neither file exists in the repo, so both 404.
  - Fonts are pulled with a CSS `@import` inside a `<style>` block (render-blocking); use `<link rel="preconnect">` + `<link rel="stylesheet">`.
- **Stale docs/metadata.**
  - `README.md` is AI Studio boilerplate and says nothing about the game, controls, architecture or how to add units.
  - `metadata.json` mentions OpenRouter.
  - `package.json` name `ai-rts:-red-alert` contains a colon, which is unusual for an npm name.
  - Add a proper README with screenshot, controls, tech overview and a short "how to add a unit/building" guide (edit `types.ts`, `constants.ts`, `icons.tsx`).
- **Dependencies.** `react-icons` is pinned while the others use carets; whole icon sets can bloat the bundle if imported broadly (currently only `fa` and `gi` subpaths, which is fine). Add a lockfile if it is missing from the repo (none is committed).

---

## 6. UX and gameplay features

Quick wins:

- **Keyboard map scrolling** (WASD or arrow keys). Currently the only way to scroll is pushing the mouse to the screen edge, which is awkward in windowed mode.
- **Cancel / refund queue items**, and show a progress bar for the item being built.
- **Hotkeys for build menu and common commands** (stop, hold position, select all of a type, double-click to select all visible of a type).
- **Hover feedback and attention cues:** "base under attack" alert and minimap ping, low-power warning, "unit idle" notification, and an idle-miner indicator.
- **Minimap right-click to move/attack**, and a drawn viewport rectangle that updates on window resize (it uses a ref that does not trigger a re-render).
- **Stop, hold and patrol commands** and unit stances.
- **Last-seen markers.** Enemy buildings stay rendered in explored fog, which is good, but units vanish with no hint of where they were last seen.
- **Accessibility:** the whole game surface is mouse-only. At minimum make sidebar buttons keyboard-focusable (they already are) and expose key game state (credits, power, selection) to screen readers via `aria-live` regions.
- **Persistence:** save/load, settings (volume, edge-scroll on/off) in `localStorage`, and a mute toggle. Sound currently has no volume control.

Larger ideas:

- Map options in the menu (size, seed, water amount) and a skirmish "seed" shown in the end screen for sharing or replays.
- Veterancy, unit abilities, tech tree view, and capture mechanics.
- Replays: because the reducer is (almost) a pure function of actions, recording the action stream plus a seed would give replays and deterministic bug reports almost for free, once 1.7 and the RNG point in section 5 are addressed.
- Multiplayer or lockstep sync is feasible later for the same reason, but needs deterministic simulation first (fixed timestep, seeded RNG, no `Date.now()` in the sim).

---

## 7. Suggested order of work

1. **Quick correctness pass** (hours): 1.3 typo, 1.10 sound `.waw`, add `.gitignore`, 1.4 fog gating for AI units, 1.2 ID generator (monotonic counter in state).
2. **Make power real** (1.1) and validate rules in the reducer (1.8).
3. **Perf pass:** fog diffing (2.1), mouse-move re-renders (2.2), A\* with a heap (2.3), remove JSON clones (2.4).
4. **Purify the reducer** (1.6, 1.7), add the typed `GameAction` union, then split the file by system.
5. **Tooling:** strict TS, ESLint, Vitest with tests for pathfinding, production, win conditions and AI, GitHub Actions, and cleaning up `index.html` (bundled Tailwind, drop `importmap`).
6. **Decide the fate of the Gemini AI** (delete, or finish it behind a server proxy).
7. **Gameplay depth:** movement collision, armour types, better AI tactics, QoL controls from section 6.

---

## 8. Status

Done so far: 1.1 (power now disables power-drawing buildings; HQ and Power Plants always stay online), 1.2, 1.3, 1.4, 1.5, 1.8 (shared `utils/placement.ts` validator, producer/requirement checks on queueing, `canAttack` checks on attack orders), 1.10 (extension typo only; assets are still hot-linked), and the AI-action state mutations from 1.6. Not yet verified at runtime: no Node toolchain was available when these changes were made.

Behaviour changes to be aware of: players now start in low power (HQ draws 10, nothing produces) until a Power Plant is built, buildings must be placed within 15 tiles of an existing building (`BASE_BUILD_RADIUS_TILES`), and the whole footprint of a building must sit on ground.

Performance pass done (still unprofiled and untested at runtime): 2.1 fog is diffed and only reallocated when a tile changes, 2.2 mouse position lives in a ref unless a ghost or selection box needs it, entity click handlers are stable so `React.memo` on entities works, and `clusterEntities` is memoized, 2.3 A* now uses a binary heap, typed arrays, octile distance and fails fast on non-walkable goals, 2.4 the JSON deep clones and stringify comparisons in the tick are replaced by copy-on-write stats and shallow comparison, 2.7 the edge-scroll interval no longer restarts on mouse movement. Still open from section 2: 2.5 (minimap redraws), 2.6 (fixed-timestep loop), 2.8 (canvas rendering).
