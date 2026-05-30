# Score Keeper

Mobile-first, offline-capable PWA for keeping score at kids' sports games.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS v3
- sql.js (SQLite via WASM) with IndexedDB persistence
- react-router-dom v6
- vite-plugin-pwa
- vitest + @testing-library/react

## Architecture

- **Event-sourced data model** — scores derived from an append-only events table. Never mutate score directly; always record an event.
- **Sport configs drive behavior** — all sport-specific logic (scoring rules, periods, stat types, cards) lives in `src/sports/configs.ts` as data. No sport-specific code paths.
- **Offline-first** — all data in local SQLite. No network dependency for any operation.

## Project Structure

```
src/
  types/          # TypeScript interfaces
  sports/         # Sport config objects
  db/             # SQLite init, schema, queries
  hooks/          # React hooks (useDB, useGame, useTimer)
  components/     # Shared UI components
  screens/        # Route-level screens
  utils/          # Format + export helpers
```

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npx vitest run       # Run all tests
npx vitest           # Watch mode
```

## Conventions

- Use `gh` CLI for all GitHub operations (PRs, issues, etc.)
- Dark theme colors: surface-900 (#0f0f23), surface-800 (#1a1a2e), surface-700 (#16213e)
- Team colours are **per-game kits** (a primary + secondary, chosen at setup, stored on the game). UI tints use `teamAccent(team, dark)` (theme-aware, in `src/utils/teamColors.ts`); the true kit shows via `TeamKitChip`. (Superseded the old fixed home=blue/away=amber convention in the Sideline refresh.)
- All DB primary keys are UUIDs, timestamps are ISO 8601
- TDD: write failing test, implement, verify pass
- Persist DB to IndexedDB after every write operation
- **Before every push**: bump the patch version in `package.json` and update `CHANGELOG.md` with what changed

## Key Files

- `docs/superpowers/specs/2026-04-02-score-keeper-design.md` — Full design spec
- `docs/superpowers/plans/2026-04-02-score-keeper.md` — Implementation plan
