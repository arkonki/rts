# AI RTS: Red Alert

A small Red Alert-style real-time strategy game built with React, TypeScript and Vite. You play against rule-based AI opponents on a generated map with fog of war, power, superweapons and ground, air and sea units.

## Run locally

Prerequisites: Node.js 20+.

```bash
npm install
npm run dev
```

The game needs no API keys: the opponents are rule-based (`services/localAIService.ts`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` (strict mode) |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (`tests/`) |
| `npm run check` | Typecheck, lint and tests |

## Controls

Left click or drag to select, right click to move, attack, repair or set a rally point, `Q` + click to attack-move, `X` to stop, `H` to hold position, `Ctrl+1..9` to set control groups and `1..9` to recall them (double-tap to centre), `Esc` to cancel. Scroll with the arrow keys, `WASD`, or by pushing the mouse to a screen edge. Click (or right-click) a queued item in the sidebar to cancel it and get a refund.

Dev views: add `?gallery` to the URL for a sprite sheet, or `?demo` to start a ready-made skirmish.

## Code layout

- `state/`: the game reducer. `reducer.ts` is a thin dispatcher over `commands/` (player and AI commands) and `systems/` (the per-tick simulation). `actions.ts` defines the typed action union. The reducer is pure: no sounds, clocks or randomness (see `hooks/useSoundEvents.ts` and `utils/random.ts`).
- `services/localAIService.ts`: rule-based AI opponents.
- `utils/`: pathfinding, placement rules, map generation, clustering and other helpers.
- `components/`, `hooks/`: React UI and input handling.
- `constants.ts`: balance data for every unit and building.
- `SUGGESTIONS.md`: review notes and a roadmap of remaining improvements.
