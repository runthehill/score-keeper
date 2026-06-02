# Score Keeper

Mobile-first, offline-capable PWA for keeping score at kids' sports games. Live at https://runthehill.github.io/score-keeper/.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS v3 with CSS-variable theme tokens (see Theming below)
- sql.js (SQLite via WASM), persisted to IndexedDB
- react-router-dom v7 — `HashRouter` (the app is served under the `/score-keeper/` base path)
- vite-plugin-pwa (`registerType: 'prompt'` — surfaces an in-app "update available" toast)
- vitest + @testing-library/react

## Architecture

- **Event-sourced scoring** — the score is derived by summing an append-only `events` table; never mutate a score directly, record an event. Zero-point events (e.g. a Gaelic "wide") are tracked but don't change the score.
- **Sport configs drive behaviour** — all sport-specific logic (scoring events, periods, stat events, cards, score display) lives as data in `src/sports/configs.ts`. There are no sport-specific code paths; screens read the config.
- **Offline-first** — every operation runs against local SQLite with no network dependency. Persist to IndexedDB after every write.
- **Theming** — system-aware dark/light via CSS-variable tokens on `<html>` (`.theme-dark` / `.theme-light`), managed by `useTheme` / `ThemeProvider` (manual override persists to localStorage).

## Project Structure

```
src/
  types/        # TypeScript interfaces
  sports/       # Sport configs (configs.ts) + kit presets (kits.ts)
  db/           # SQLite init, schema, queries
  hooks/        # useDB, useGame, useTimer, useTheme, useInstallPrompt
  components/   # Shared UI (Scoreboard, EventLog, ShareCard, icons, …)
  screens/      # Route-level screens (Home, GameSetup, LiveGame, GameSummary, History, Settings)
  utils/        # format, export, settings, teamColors, shareCard helpers
public/icons/   # App icon source (icon.svg) + generated PNGs
```

## Commands

```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # tsc -b && vite build
npm run preview  # Preview the production build
npm run lint     # eslint
npx vitest run   # Run all tests once
npx vitest       # Watch mode
```

## Conventions

- Use the `gh` CLI for all GitHub operations (PRs, issues).
- **Style with theme tokens, not hex.** Use the CSS-variable classes — `bg-bg`, `bg-surface`, `bg-surface-2`, `text-txt` / `text-txt-2` / `text-txt-3`, `border-line` / `border-line-2`, `text-danger` (defined in `src/index.css`). They adapt to dark/light automatically.
- **Team colours are per-game kits** (a primary + secondary, chosen at setup, stored on the game). UI tints use `teamAccent(team, dark)` (theme-aware, `src/utils/teamColors.ts`); the true kit shows via `TeamKitChip`. (Superseded the old fixed home=blue/away=amber convention in the Sideline refresh.)
- All DB primary keys are UUIDs; timestamps are ISO 8601.
- TDD: write a failing test, implement, verify it passes.
- Persist the DB to IndexedDB after every write operation.
- **Before every push that changes the built app:** bump the patch version in `package.json` (and the root `version` in `package-lock.json`) and add a `CHANGELOG.md` entry describing what changed. Skip the bump for docs-only changes (README/CLAUDE.md/specs) — a bump fires the in-app "update available" prompt, so don't trigger it for a no-op deploy.
- Merging to `main` auto-deploys to GitHub Pages. Because of the service worker, users get a new build via the in-app reload prompt (or a hard refresh), not instantly.

## Key Files

- `src/sports/configs.ts` — the sport definitions that drive all behaviour; start here to add or change a sport.
- `src/utils/format.ts` — score formatting (incl. the Gaelic goals-points scoreline) and the play-by-play running tally.
- `src/utils/teamColors.ts` + `src/sports/kits.ts` — kit colours and theme-aware accents.
- `docs/superpowers/specs/` and `docs/superpowers/plans/` — design specs and implementation plans (one per feature, dated; the original 2026-04-02 pair covers the initial build).
