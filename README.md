# Score Keeper

A mobile-first, offline-capable PWA for keeping score at kids' sports games.

## Sports Supported

- **Rugby Union** — tries, conversions, penalties, drop goals, yellow/red cards
- **Soccer** — goals, assists, yellow/red cards
- **Gaelic Football** — goals and points with traditional split display (e.g. 1-05), yellow/black/red cards
- **Basketball** — free throws, field goals, three pointers, rebounds, steals, fouls

## Features

- Offline-first — works without any internet connection
- Installable as a PWA on your phone's home screen
- Event-sourced scoring — full game replay and easy undo
- Optional player tracking with per-player stats and substitutions
- Export game data as CSV or JSON
- Dark theme optimized for outdoor sideline use
- Wake lock keeps your screen on during live games

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 on your phone (same Wi-Fi network) to use it.

## Tech Stack

Vite, React, TypeScript, Tailwind CSS, sql.js (SQLite in the browser), vite-plugin-pwa
