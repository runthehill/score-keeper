# Score Keeper

A mobile-first, offline-capable PWA for keeping score at kids' sports games.

**▶ Live app: https://runthehill.github.io/score-keeper/** — open it on your phone and add it to your home screen.

## Sports

- **Rugby Union** — tries, conversions, penalties, drop goals; yellow/red cards
- **Soccer** — goals, assists, throw-ins, corners, off-sides, penalties; yellow/red cards
- **Gaelic Football** — goals, points, two-pointers and wides, shown in the traditional split scoreline (e.g. 1-05); penalties; yellow/black/red cards
- **Basketball** — free throws, field goals, three-pointers, rebounds, steals, fouls (with team-foul bonus); halves or quarters

## Features

- **Works offline** — all data lives in on-device SQLite, so there's no connection needed at the pitch
- **Installable** — add it to your home screen and it runs full-screen like a native app
- **Event-sourced scoring** — every score is a recorded event, so the play-by-play is exact and there's one-tap undo
- **Per-game team kits** — pick each team's colours at setup; they carry through the scoreboard, cards, and share image
- **Optional player tracking** — squads, per-player stats, and substitutions
- **Shareable result** — export a clean, branded score card as an image
- **Dark & light themes** — follows your device with a manual toggle; tuned for outdoor sideline glare
- **Match flexibility** — extra time, overtime, and penalty shootouts, plus a period-by-period breakdown and CSV / JSON export
- **Live-game niceties** — keeps the screen awake during a game, and prompts you to reload when a new version ships

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Open the dev URL on your phone (same Wi-Fi network) to try it on a real device.

### Other commands

```bash
npm run build    # production build
npm run preview  # preview the production build
npm run lint     # eslint
npx vitest run   # run the test suite
```

## Tech stack

Vite · React + TypeScript · Tailwind CSS · sql.js (SQLite in the browser, persisted to IndexedDB) · react-router-dom (HashRouter) · vite-plugin-pwa · vitest. Deployed to GitHub Pages via GitHub Actions on every merge to `main`.
