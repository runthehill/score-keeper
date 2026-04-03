# Score Keeper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first, offline-capable PWA for keeping score at Rugby Union, Soccer, Gaelic Football, and Basketball games.

**Architecture:** Vite + React SPA with sql.js (SQLite compiled to WASM) for local persistence via IndexedDB serialization. Event-sourced data model where scores are derived from an append-only events table. Sport-specific behavior driven entirely by config objects.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS v3, sql.js, react-router-dom v6, vite-plugin-pwa, vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-04-02-score-keeper-design.md`

---

## File Structure

```
src/
  types/index.ts                  # All TypeScript interfaces
  sports/configs.ts               # 4 sport configuration objects
  sports/configs.test.ts          # Sport config validation tests
  db/
    init.ts                       # sql.js initialization + IndexedDB persistence
    schema.ts                     # CREATE TABLE DDL + migrations
    queries.ts                    # All CRUD operations (games, players, events)
    queries.test.ts               # Query tests against in-memory SQLite
  hooks/
    useDB.tsx                     # React context provider for database access
    useGame.ts                    # Game state: scoring, events, period mgmt
    useTimer.ts                   # Count-up stopwatch hook
    useTimer.test.ts              # Timer hook tests
  utils/
    format.ts                     # Score formatting (Gaelic split display)
    format.test.ts                # Format tests
    export.ts                     # CSV + JSON export builders
    export.test.ts                # Export tests
  components/
    TabBar.tsx                    # Bottom navigation (3 tabs)
    SportCard.tsx                 # Sport selection tile for Home screen
    ScoreButton.tsx               # Single scoring action button
    ScoringRow.tsx                # Row of ScoreButtons for one team
    Scoreboard.tsx                # Score display with team names
    Timer.tsx                     # Timer display with tap-to-toggle
    EventLog.tsx                  # Scrollable recent events list
    ActionsRow.tsx                # Card / Sub / Undo / Half buttons
    PlayerPicker.tsx              # Bottom sheet for player attribution
    SubstitutionFlow.tsx          # Multi-step sub bottom sheet
    GameCard.tsx                  # Game summary card for History list
  screens/
    Home.tsx                      # Sport picker + in-progress/recent games
    GameSetup.tsx                 # Team names, optional players, start
    LiveGame.tsx                  # Main scoring screen (stacked layout)
    GameSummary.tsx               # End-of-game stats + export
    History.tsx                   # Past games list with filter
    Settings.tsx                  # Defaults, theme, data management
  App.tsx                         # Router + DB provider wrapper
  main.tsx                        # Entry point
  index.css                       # Tailwind imports + custom theme
index.html                        # HTML shell
tailwind.config.js                # Tailwind theme config
vite.config.ts                    # Vite + PWA config
vitest.config.ts                  # Test config
tsconfig.json                     # TypeScript config
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.gitignore`

- [ ] **Step 1: Scaffold Vite project**

```bash
cd /Users/jonathanhill/Projects/vibes/score-keeper
npm create vite@latest . -- --template react-ts
```

Select "Ignore files and continue" if prompted about existing directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install sql.js react-router-dom uuid
npm install -D tailwindcss @tailwindcss/vite postcss autoprefixer vite-plugin-pwa @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom workbox-window
npx tailwindcss init -p
```

- [ ] **Step 3: Install type packages**

```bash
npm install -D @types/uuid
```

- [ ] **Step 4: Configure Tailwind**

Replace `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#0f0f23',
          800: '#1a1a2e',
          700: '#16213e',
          600: '#2a2a3e',
        },
        home: {
          DEFAULT: '#4ecca3',
          dark: '#1a3a2e',
        },
        away: {
          DEFAULT: '#e94560',
          dark: '#2e1a1a',
        },
        accent: '#e94560',
      },
      fontFamily: {
        score: ['system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 5: Set up index.css**

Replace `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-surface-900 text-white antialiased;
  }
}
```

- [ ] **Step 6: Configure Vite with PWA plugin**

Replace `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['sql-wasm.wasm'],
      manifest: {
        name: 'Score Keeper',
        short_name: 'ScoreKeeper',
        description: 'Keep score at kids sports games',
        theme_color: '#0f0f23',
        background_color: '#0f0f23',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm}'],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['sql.js'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

- [ ] **Step 7: Configure vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
});
```

Create `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 8: Copy sql.js WASM file to public**

```bash
mkdir -p public/icons
cp node_modules/sql.js/dist/sql-wasm.wasm public/
```

- [ ] **Step 9: Set up minimal App and entry point**

Replace `src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <p className="p-4">Score Keeper</p>
    </div>
  );
}
```

Replace `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 10: Update .gitignore and add superpowers dir**

Append to `.gitignore`:

```
.superpowers/
```

- [ ] **Step 11: Verify build and dev server**

```bash
npm run dev -- --port 5173 &
sleep 2
curl -s http://localhost:5173 | head -5
kill %1
```

Expected: HTML response containing `<div id="root">`.

```bash
npm run build
```

Expected: builds successfully to `dist/`.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TS project with Tailwind and PWA"
```

---

### Task 2: TypeScript Types + Sport Configurations

**Files:**
- Create: `src/types/index.ts`, `src/sports/configs.ts`, `src/sports/configs.test.ts`

- [ ] **Step 1: Define all TypeScript types**

Create `src/types/index.ts`:

```ts
export type Sport = 'rugby_union' | 'soccer' | 'gaelic_football' | 'basketball';
export type Team = 'home' | 'away';
export type GameStatus = 'in_progress' | 'completed';
export type PlayerStatus = 'active' | 'bench' | 'subbed_off';
export type ScoreDisplay = 'single' | 'split';

export interface Game {
  id: string;
  sport: Sport;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  status: GameStatus;
  started_at: string;
  ended_at: string | null;
  notes: string;
}

export interface Player {
  id: string;
  game_id: string;
  team: Team;
  name: string;
  number: number | null;
  status: PlayerStatus;
}

export interface GameEvent {
  id: string;
  game_id: string;
  player_id: string | null;
  team: Team;
  event_type: string;
  points: number;
  half_or_period: number;
  timestamp: string;
}

export interface ScoringEventConfig {
  type: string;
  label: string;
  points: number;
  icon: string;
}

export interface StatEventConfig {
  type: string;
  label: string;
  icon: string;
}

export interface CardEventConfig {
  type: string;
  label: string;
  color: string;
}

export interface SportConfig {
  id: Sport;
  name: string;
  icon: string;
  periods: { count: number; name: string };
  scoreDisplay: ScoreDisplay;
  scoringEvents: ScoringEventConfig[];
  statEvents: StatEventConfig[];
  cardEvents: CardEventConfig[];
}
```

- [ ] **Step 2: Write sport config tests**

Create `src/sports/configs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SPORTS, getSportConfig } from './configs';

describe('sport configs', () => {
  it('defines exactly 4 sports', () => {
    expect(SPORTS).toHaveLength(4);
  });

  it.each(['rugby_union', 'soccer', 'gaelic_football', 'basketball'] as const)(
    '%s has valid config',
    (sportId) => {
      const config = getSportConfig(sportId);
      expect(config).toBeDefined();
      expect(config.id).toBe(sportId);
      expect(config.name).toBeTruthy();
      expect(config.icon).toBeTruthy();
      expect(config.periods.count).toBeGreaterThan(0);
      expect(config.periods.name).toBeTruthy();
      expect(config.scoringEvents.length).toBeGreaterThan(0);
    }
  );

  it('rugby union has correct scoring values', () => {
    const config = getSportConfig('rugby_union');
    const tryEvent = config.scoringEvents.find((e) => e.type === 'try');
    const conversion = config.scoringEvents.find((e) => e.type === 'conversion');
    const penalty = config.scoringEvents.find((e) => e.type === 'penalty');
    const dropGoal = config.scoringEvents.find((e) => e.type === 'drop_goal');
    expect(tryEvent?.points).toBe(5);
    expect(conversion?.points).toBe(2);
    expect(penalty?.points).toBe(3);
    expect(dropGoal?.points).toBe(3);
  });

  it('gaelic football uses split score display', () => {
    const config = getSportConfig('gaelic_football');
    expect(config.scoreDisplay).toBe('split');
    const goal = config.scoringEvents.find((e) => e.type === 'goal');
    const point = config.scoringEvents.find((e) => e.type === 'point');
    expect(goal?.points).toBe(3);
    expect(point?.points).toBe(1);
  });

  it('basketball has stat events for rebounds and steals', () => {
    const config = getSportConfig('basketball');
    expect(config.statEvents.find((e) => e.type === 'rebound')).toBeDefined();
    expect(config.statEvents.find((e) => e.type === 'steal')).toBeDefined();
  });

  it('gaelic football has black card', () => {
    const config = getSportConfig('gaelic_football');
    expect(config.cardEvents.find((e) => e.type === 'card_black')).toBeDefined();
  });

  it('all scoring events have positive points', () => {
    for (const sport of SPORTS) {
      for (const event of sport.scoringEvents) {
        expect(event.points, `${sport.id}.${event.type}`).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 3: Run tests — expect failure**

```bash
npx vitest run src/sports/configs.test.ts
```

Expected: FAIL — `configs` module does not exist yet.

- [ ] **Step 4: Implement sport configurations**

Create `src/sports/configs.ts`:

```ts
import { Sport, SportConfig } from '../types';

export const SPORTS: SportConfig[] = [
  {
    id: 'rugby_union',
    name: 'Rugby Union',
    icon: '🏉',
    periods: { count: 2, name: 'Half' },
    scoreDisplay: 'single',
    scoringEvents: [
      { type: 'try', label: 'Try', points: 5, icon: '🏉' },
      { type: 'conversion', label: 'Conv', points: 2, icon: '🥅' },
      { type: 'penalty', label: 'Pen', points: 3, icon: '🦵' },
      { type: 'drop_goal', label: 'Drop', points: 3, icon: '🦶' },
    ],
    statEvents: [],
    cardEvents: [
      { type: 'card_yellow', label: 'Yellow Card', color: '#facc15' },
      { type: 'card_red', label: 'Red Card', color: '#ef4444' },
    ],
  },
  {
    id: 'soccer',
    name: 'Soccer',
    icon: '⚽',
    periods: { count: 2, name: 'Half' },
    scoreDisplay: 'single',
    scoringEvents: [
      { type: 'goal', label: 'Goal', points: 1, icon: '⚽' },
    ],
    statEvents: [
      { type: 'assist', label: 'Assist', icon: '👟' },
    ],
    cardEvents: [
      { type: 'card_yellow', label: 'Yellow Card', color: '#facc15' },
      { type: 'card_red', label: 'Red Card', color: '#ef4444' },
    ],
  },
  {
    id: 'gaelic_football',
    name: 'Gaelic Football',
    icon: '🟢',
    periods: { count: 2, name: 'Half' },
    scoreDisplay: 'split',
    scoringEvents: [
      { type: 'goal', label: 'Goal', points: 3, icon: '🥅' },
      { type: 'point', label: 'Point', points: 1, icon: '☝️' },
    ],
    statEvents: [],
    cardEvents: [
      { type: 'card_yellow', label: 'Yellow Card', color: '#facc15' },
      { type: 'card_black', label: 'Black Card', color: '#1a1a2e' },
      { type: 'card_red', label: 'Red Card', color: '#ef4444' },
    ],
  },
  {
    id: 'basketball',
    name: 'Basketball',
    icon: '🏀',
    periods: { count: 4, name: 'Quarter' },
    scoreDisplay: 'single',
    scoringEvents: [
      { type: 'free_throw', label: 'FT', points: 1, icon: '🏀' },
      { type: 'field_goal', label: '2PT', points: 2, icon: '🏀' },
      { type: 'three_pointer', label: '3PT', points: 3, icon: '🎯' },
    ],
    statEvents: [
      { type: 'rebound', label: 'Rebound', icon: '📊' },
      { type: 'steal', label: 'Steal', icon: '🤚' },
      { type: 'foul', label: 'Foul', icon: '⚠️' },
    ],
    cardEvents: [],
  },
];

export function getSportConfig(id: Sport): SportConfig {
  const config = SPORTS.find((s) => s.id === id);
  if (!config) throw new Error(`Unknown sport: ${id}`);
  return config;
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run src/sports/configs.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types/ src/sports/
git commit -m "feat: add TypeScript types and sport configurations"
```

---

### Task 3: Utility Functions

**Files:**
- Create: `src/utils/format.ts`, `src/utils/format.test.ts`, `src/utils/export.ts`, `src/utils/export.test.ts`

- [ ] **Step 1: Write format utility tests**

Create `src/utils/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatScore, formatGaelicScore, formatTimer, formatEventTime } from './format';
import { GameEvent } from '../types';

describe('formatScore', () => {
  it('formats single score as plain number', () => {
    expect(formatScore('single', 21, [])).toBe('21');
  });

  it('formats gaelic split score as goals-points', () => {
    const events: Pick<GameEvent, 'event_type' | 'team'>[] = [
      { event_type: 'goal', team: 'home' },
      { event_type: 'point', team: 'home' },
      { event_type: 'point', team: 'home' },
      { event_type: 'point', team: 'home' },
      { event_type: 'point', team: 'home' },
      { event_type: 'point', team: 'home' },
    ];
    expect(formatGaelicScore(events, 'home')).toBe('1-05');
  });

  it('pads gaelic points to two digits', () => {
    const events: Pick<GameEvent, 'event_type' | 'team'>[] = [
      { event_type: 'point', team: 'home' },
    ];
    expect(formatGaelicScore(events, 'home')).toBe('0-01');
  });

  it('handles zero gaelic score', () => {
    expect(formatGaelicScore([], 'home')).toBe('0-00');
  });
});

describe('formatTimer', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatTimer(0)).toBe('00:00');
  });

  it('formats 65 seconds as 01:05', () => {
    expect(formatTimer(65)).toBe('01:05');
  });

  it('formats 3661 seconds as 61:01', () => {
    expect(formatTimer(3661)).toBe('61:01');
  });
});

describe('formatEventTime', () => {
  it('formats ISO timestamp to mm:ss from game start', () => {
    const start = '2026-04-02T10:00:00.000Z';
    const event = '2026-04-02T10:32:15.000Z';
    expect(formatEventTime(event, start)).toBe("32:15");
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/utils/format.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement format utilities**

Create `src/utils/format.ts`:

```ts
import { GameEvent, ScoreDisplay, Team } from '../types';

export function formatScore(display: ScoreDisplay, totalPoints: number, events: Pick<GameEvent, 'event_type' | 'team'>[], team?: Team): string {
  if (display === 'split' && team) {
    return formatGaelicScore(events, team);
  }
  return String(totalPoints);
}

export function formatGaelicScore(events: Pick<GameEvent, 'event_type' | 'team'>[], team: Team): string {
  const teamEvents = events.filter((e) => e.team === team);
  const goals = teamEvents.filter((e) => e.event_type === 'goal').length;
  const points = teamEvents.filter((e) => e.event_type === 'point').length;
  return `${goals}-${String(points).padStart(2, '0')}`;
}

export function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatEventTime(eventTimestamp: string, gameStartTimestamp: string): string {
  const diff = Math.floor((new Date(eventTimestamp).getTime() - new Date(gameStartTimestamp).getTime()) / 1000);
  return formatTimer(Math.max(0, diff));
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/utils/format.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Write export utility tests**

Create `src/utils/export.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { exportGameCSV, exportGameJSON } from './export';
import { Game, Player, GameEvent } from '../types';

const game: Game = {
  id: 'g1',
  sport: 'rugby_union',
  home_team: "Sligo RFC",
  away_team: 'Blackrock',
  home_score: 21,
  away_score: 14,
  status: 'completed',
  started_at: '2026-04-02T10:00:00.000Z',
  ended_at: '2026-04-02T11:20:00.000Z',
  notes: '',
};

const players: Player[] = [
  { id: 'p1', game_id: 'g1', team: 'home', name: 'John', number: 10, status: 'active' },
];

const events: GameEvent[] = [
  { id: 'e1', game_id: 'g1', player_id: 'p1', team: 'home', event_type: 'try', points: 5, half_or_period: 1, timestamp: '2026-04-02T10:15:00.000Z' },
  { id: 'e2', game_id: 'g1', player_id: null, team: 'away', event_type: 'penalty', points: 3, half_or_period: 1, timestamp: '2026-04-02T10:20:00.000Z' },
];

describe('exportGameCSV', () => {
  it('produces header row and one row per event', () => {
    const csv = exportGameCSV(game, events, players);
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(3); // header + 2 events
    expect(lines[0]).toContain('game_id');
    expect(lines[1]).toContain("Sligo RFC");
    expect(lines[1]).toContain('try');
    expect(lines[1]).toContain('John');
    expect(lines[2]).toContain('penalty');
  });
});

describe('exportGameJSON', () => {
  it('produces valid JSON with game, players, and events', () => {
    const json = exportGameJSON(game, events, players);
    const parsed = JSON.parse(json);
    expect(parsed.game.id).toBe('g1');
    expect(parsed.players).toHaveLength(1);
    expect(parsed.events).toHaveLength(2);
  });
});
```

- [ ] **Step 6: Run tests — expect failure**

```bash
npx vitest run src/utils/export.test.ts
```

Expected: FAIL.

- [ ] **Step 7: Implement export utilities**

Create `src/utils/export.ts`:

```ts
import { Game, Player, GameEvent } from '../types';

export function exportGameCSV(game: Game, events: GameEvent[], players: Player[]): string {
  const header = 'game_id,sport,home_team,away_team,timestamp,period,event_type,team,player_name,player_number,points,home_score_after,away_score_after';
  const playerMap = new Map(players.map((p) => [p.id, p]));

  let homeRunning = 0;
  let awayRunning = 0;

  const rows = events.map((e) => {
    if (e.team === 'home') homeRunning += e.points;
    else awayRunning += e.points;

    const player = e.player_id ? playerMap.get(e.player_id) : undefined;
    const fields = [
      game.id,
      game.sport,
      game.home_team,
      game.away_team,
      e.timestamp,
      e.half_or_period,
      e.event_type,
      e.team,
      player?.name ?? '',
      player?.number ?? '',
      e.points,
      homeRunning,
      awayRunning,
    ];
    return fields.map((f) => {
      const str = String(f);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

export function exportGameJSON(game: Game, events: GameEvent[], players: Player[]): string {
  return JSON.stringify({ game, players, events }, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 8: Run tests — expect pass**

```bash
npx vitest run src/utils/export.test.ts
```

Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add src/utils/
git commit -m "feat: add score formatting and CSV/JSON export utilities"
```

---

### Task 4: Database Layer

**Files:**
- Create: `src/db/init.ts`, `src/db/schema.ts`, `src/db/queries.ts`, `src/db/queries.test.ts`

- [ ] **Step 1: Write database query tests**

Create `src/db/queries.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs, { Database } from 'sql.js';
import { createTables } from './schema';
import {
  insertGame,
  getGame,
  listGames,
  updateGameScore,
  endGame,
  insertPlayer,
  listPlayers,
  updatePlayerStatus,
  insertEvent,
  listEvents,
  deleteEvent,
  getLastEvent,
} from './queries';

let db: Database;

beforeEach(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  createTables(db);
});

describe('games', () => {
  it('inserts and retrieves a game', () => {
    insertGame(db, {
      id: 'g1',
      sport: 'rugby_union',
      home_team: "Sligo RFC",
      away_team: 'Blackrock',
      started_at: '2026-04-02T10:00:00.000Z',
    });
    const game = getGame(db, 'g1');
    expect(game).toBeDefined();
    expect(game!.sport).toBe('rugby_union');
    expect(game!.home_score).toBe(0);
    expect(game!.status).toBe('in_progress');
  });

  it('lists games by most recent first', () => {
    insertGame(db, { id: 'g1', sport: 'soccer', home_team: 'A', away_team: 'B', started_at: '2026-04-01T10:00:00.000Z' });
    insertGame(db, { id: 'g2', sport: 'soccer', home_team: 'C', away_team: 'D', started_at: '2026-04-02T10:00:00.000Z' });
    const games = listGames(db);
    expect(games).toHaveLength(2);
    expect(games[0].id).toBe('g2');
  });

  it('lists games filtered by sport', () => {
    insertGame(db, { id: 'g1', sport: 'soccer', home_team: 'A', away_team: 'B', started_at: '2026-04-01T10:00:00.000Z' });
    insertGame(db, { id: 'g2', sport: 'basketball', home_team: 'C', away_team: 'D', started_at: '2026-04-02T10:00:00.000Z' });
    const games = listGames(db, 'soccer');
    expect(games).toHaveLength(1);
    expect(games[0].sport).toBe('soccer');
  });

  it('updates cached score', () => {
    insertGame(db, { id: 'g1', sport: 'rugby_union', home_team: 'A', away_team: 'B', started_at: '2026-04-02T10:00:00.000Z' });
    updateGameScore(db, 'g1', 21, 14);
    const game = getGame(db, 'g1');
    expect(game!.home_score).toBe(21);
    expect(game!.away_score).toBe(14);
  });

  it('ends a game', () => {
    insertGame(db, { id: 'g1', sport: 'soccer', home_team: 'A', away_team: 'B', started_at: '2026-04-02T10:00:00.000Z' });
    endGame(db, 'g1', '2026-04-02T11:30:00.000Z');
    const game = getGame(db, 'g1');
    expect(game!.status).toBe('completed');
    expect(game!.ended_at).toBe('2026-04-02T11:30:00.000Z');
  });
});

describe('players', () => {
  beforeEach(() => {
    insertGame(db, { id: 'g1', sport: 'rugby_union', home_team: 'A', away_team: 'B', started_at: '2026-04-02T10:00:00.000Z' });
  });

  it('inserts and lists players for a game', () => {
    insertPlayer(db, { id: 'p1', game_id: 'g1', team: 'home', name: 'John', number: 10, status: 'active' });
    insertPlayer(db, { id: 'p2', game_id: 'g1', team: 'away', name: 'Mike', number: 7, status: 'active' });
    const players = listPlayers(db, 'g1');
    expect(players).toHaveLength(2);
  });

  it('filters players by team', () => {
    insertPlayer(db, { id: 'p1', game_id: 'g1', team: 'home', name: 'John', number: 10, status: 'active' });
    insertPlayer(db, { id: 'p2', game_id: 'g1', team: 'away', name: 'Mike', number: 7, status: 'active' });
    const homePlayers = listPlayers(db, 'g1', 'home');
    expect(homePlayers).toHaveLength(1);
    expect(homePlayers[0].name).toBe('John');
  });

  it('updates player status', () => {
    insertPlayer(db, { id: 'p1', game_id: 'g1', team: 'home', name: 'John', number: 10, status: 'active' });
    updatePlayerStatus(db, 'p1', 'subbed_off');
    const players = listPlayers(db, 'g1');
    expect(players[0].status).toBe('subbed_off');
  });
});

describe('events', () => {
  beforeEach(() => {
    insertGame(db, { id: 'g1', sport: 'rugby_union', home_team: 'A', away_team: 'B', started_at: '2026-04-02T10:00:00.000Z' });
  });

  it('inserts and lists events', () => {
    insertEvent(db, { id: 'e1', game_id: 'g1', player_id: null, team: 'home', event_type: 'try', points: 5, half_or_period: 1, timestamp: '2026-04-02T10:15:00.000Z' });
    const events = listEvents(db, 'g1');
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('try');
  });

  it('lists events in chronological order', () => {
    insertEvent(db, { id: 'e1', game_id: 'g1', player_id: null, team: 'home', event_type: 'try', points: 5, half_or_period: 1, timestamp: '2026-04-02T10:15:00.000Z' });
    insertEvent(db, { id: 'e2', game_id: 'g1', player_id: null, team: 'away', event_type: 'penalty', points: 3, half_or_period: 1, timestamp: '2026-04-02T10:20:00.000Z' });
    const events = listEvents(db, 'g1');
    expect(events[0].id).toBe('e1');
    expect(events[1].id).toBe('e2');
  });

  it('deletes an event', () => {
    insertEvent(db, { id: 'e1', game_id: 'g1', player_id: null, team: 'home', event_type: 'try', points: 5, half_or_period: 1, timestamp: '2026-04-02T10:15:00.000Z' });
    deleteEvent(db, 'e1');
    expect(listEvents(db, 'g1')).toHaveLength(0);
  });

  it('gets the last event', () => {
    insertEvent(db, { id: 'e1', game_id: 'g1', player_id: null, team: 'home', event_type: 'try', points: 5, half_or_period: 1, timestamp: '2026-04-02T10:15:00.000Z' });
    insertEvent(db, { id: 'e2', game_id: 'g1', player_id: null, team: 'away', event_type: 'penalty', points: 3, half_or_period: 1, timestamp: '2026-04-02T10:20:00.000Z' });
    const last = getLastEvent(db, 'g1');
    expect(last!.id).toBe('e2');
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/db/queries.test.ts
```

Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement schema**

Create `src/db/schema.ts`:

```ts
import { Database } from 'sql.js';

export function createTables(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      sport TEXT NOT NULL,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      home_score INTEGER NOT NULL DEFAULT 0,
      away_score INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress',
      started_at TEXT NOT NULL,
      ended_at TEXT,
      notes TEXT NOT NULL DEFAULT ''
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id),
      team TEXT NOT NULL,
      name TEXT NOT NULL,
      number INTEGER,
      status TEXT NOT NULL DEFAULT 'active'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id),
      player_id TEXT REFERENCES players(id),
      team TEXT NOT NULL,
      event_type TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      half_or_period INTEGER NOT NULL DEFAULT 1,
      timestamp TEXT NOT NULL
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_events_game ON events(game_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_players_game ON players(game_id)');
}
```

- [ ] **Step 4: Implement queries**

Create `src/db/queries.ts`:

```ts
import { Database } from 'sql.js';
import { Game, Player, GameEvent, Sport, Team, PlayerStatus } from '../types';

function rowToGame(row: Record<string, unknown>): Game {
  return {
    id: row.id as string,
    sport: row.sport as Sport,
    home_team: row.home_team as string,
    away_team: row.away_team as string,
    home_score: row.home_score as number,
    away_score: row.away_score as number,
    status: row.status as Game['status'],
    started_at: row.started_at as string,
    ended_at: (row.ended_at as string) || null,
    notes: (row.notes as string) || '',
  };
}

function rowToPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    game_id: row.game_id as string,
    team: row.team as Team,
    name: row.name as string,
    number: row.number as number | null,
    status: row.status as PlayerStatus,
  };
}

function rowToEvent(row: Record<string, unknown>): GameEvent {
  return {
    id: row.id as string,
    game_id: row.game_id as string,
    player_id: (row.player_id as string) || null,
    team: row.team as Team,
    event_type: row.event_type as string,
    points: row.points as number,
    half_or_period: row.half_or_period as number,
    timestamp: row.timestamp as string,
  };
}

function query<T>(db: Database, sql: string, params: unknown[], mapper: (row: Record<string, unknown>) => T): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(mapper(stmt.getAsObject()));
  }
  stmt.free();
  return results;
}

// Games

export function insertGame(db: Database, game: { id: string; sport: string; home_team: string; away_team: string; started_at: string }) {
  db.run(
    'INSERT INTO games (id, sport, home_team, away_team, started_at) VALUES (?, ?, ?, ?, ?)',
    [game.id, game.sport, game.home_team, game.away_team, game.started_at]
  );
}

export function getGame(db: Database, id: string): Game | undefined {
  return query(db, 'SELECT * FROM games WHERE id = ?', [id], rowToGame)[0];
}

export function listGames(db: Database, sport?: Sport): Game[] {
  if (sport) {
    return query(db, 'SELECT * FROM games WHERE sport = ? ORDER BY started_at DESC', [sport], rowToGame);
  }
  return query(db, 'SELECT * FROM games ORDER BY started_at DESC', [], rowToGame);
}

export function updateGameScore(db: Database, id: string, homeScore: number, awayScore: number) {
  db.run('UPDATE games SET home_score = ?, away_score = ? WHERE id = ?', [homeScore, awayScore, id]);
}

export function endGame(db: Database, id: string, endedAt: string) {
  db.run("UPDATE games SET status = 'completed', ended_at = ? WHERE id = ?", [endedAt, id]);
}

// Players

export function insertPlayer(db: Database, player: Player) {
  db.run(
    'INSERT INTO players (id, game_id, team, name, number, status) VALUES (?, ?, ?, ?, ?, ?)',
    [player.id, player.game_id, player.team, player.name, player.number, player.status]
  );
}

export function listPlayers(db: Database, gameId: string, team?: Team): Player[] {
  if (team) {
    return query(db, 'SELECT * FROM players WHERE game_id = ? AND team = ? ORDER BY number', [gameId, team], rowToPlayer);
  }
  return query(db, 'SELECT * FROM players WHERE game_id = ? ORDER BY team, number', [gameId], rowToPlayer);
}

export function updatePlayerStatus(db: Database, id: string, status: PlayerStatus) {
  db.run('UPDATE players SET status = ? WHERE id = ?', [status, id]);
}

// Events

export function insertEvent(db: Database, event: GameEvent) {
  db.run(
    'INSERT INTO events (id, game_id, player_id, team, event_type, points, half_or_period, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [event.id, event.game_id, event.player_id, event.team, event.event_type, event.points, event.half_or_period, event.timestamp]
  );
}

export function listEvents(db: Database, gameId: string): GameEvent[] {
  return query(db, 'SELECT * FROM events WHERE game_id = ? ORDER BY timestamp ASC', [gameId], rowToEvent);
}

export function deleteEvent(db: Database, id: string) {
  db.run('DELETE FROM events WHERE id = ?', [id]);
}

export function getLastEvent(db: Database, gameId: string): GameEvent | undefined {
  return query(db, 'SELECT * FROM events WHERE game_id = ? ORDER BY timestamp DESC LIMIT 1', [gameId], rowToEvent)[0];
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run src/db/queries.test.ts
```

Expected: all PASS.

- [ ] **Step 6: Implement database initialization with IndexedDB persistence**

Create `src/db/init.ts`:

```ts
import initSqlJs, { Database } from 'sql.js';
import { createTables } from './schema';

const DB_KEY = 'score-keeper-db';
const DB_STORE = 'sqlitedb';

async function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_KEY, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIDB(): Promise<Uint8Array | null> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get('db');
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIDB(data: Uint8Array): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(data, 'db');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let _db: Database | null = null;

export async function getDB(): Promise<Database> {
  if (_db) return _db;

  const SQL = await initSqlJs({
    locateFile: (file: string) => `/${file}`,
  });

  const saved = await loadFromIDB();
  _db = saved ? new SQL.Database(saved) : new SQL.Database();
  createTables(_db);

  return _db;
}

export async function persistDB(): Promise<void> {
  if (!_db) return;
  const data = _db.export();
  await saveToIDB(data);
}

export async function clearDB(): Promise<void> {
  if (_db) {
    _db.close();
    _db = null;
  }
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete('db');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
```

- [ ] **Step 7: Commit**

```bash
git add src/db/
git commit -m "feat: add SQLite database layer with schema, queries, and IndexedDB persistence"
```

---

### Task 5: React Context and Hooks

**Files:**
- Create: `src/hooks/useDB.tsx`, `src/hooks/useTimer.ts`, `src/hooks/useTimer.test.ts`, `src/hooks/useGame.ts`

- [ ] **Step 1: Implement database context provider**

Create `src/hooks/useDB.tsx`:

```tsx
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Database } from 'sql.js';
import { getDB, persistDB } from '../db/init';

interface DBContextValue {
  db: Database | null;
  ready: boolean;
  persist: () => Promise<void>;
}

const DBContext = createContext<DBContextValue>({ db: null, ready: false, persist: async () => {} });

export function DBProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getDB().then((database) => {
      setDb(database);
      setReady(true);
    });
  }, []);

  const persist = useCallback(async () => {
    await persistDB();
  }, []);

  return (
    <DBContext.Provider value={{ db, ready, persist }}>
      {children}
    </DBContext.Provider>
  );
}

export function useDB() {
  const ctx = useContext(DBContext);
  if (!ctx.ready) throw new Error('Database not ready');
  return { db: ctx.db!, persist: ctx.persist };
}

export function useDBReady() {
  return useContext(DBContext).ready;
}
```

- [ ] **Step 2: Write timer hook tests**

Create `src/hooks/useTimer.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from './useTimer';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTimer', () => {
  it('starts at 0', () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current.seconds).toBe(0);
    expect(result.current.running).toBe(false);
  });

  it('counts up when started', () => {
    const { result } = renderHook(() => useTimer());
    act(() => result.current.toggle());
    expect(result.current.running).toBe(true);
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.seconds).toBe(3);
  });

  it('pauses when toggled again', () => {
    const { result } = renderHook(() => useTimer());
    act(() => result.current.toggle());
    act(() => vi.advanceTimersByTime(5000));
    act(() => result.current.toggle());
    expect(result.current.running).toBe(false);
    const frozenTime = result.current.seconds;
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.seconds).toBe(frozenTime);
  });

  it('resets to 0', () => {
    const { result } = renderHook(() => useTimer());
    act(() => result.current.toggle());
    act(() => vi.advanceTimersByTime(5000));
    act(() => result.current.reset());
    expect(result.current.seconds).toBe(0);
    expect(result.current.running).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests — expect failure**

```bash
npx vitest run src/hooks/useTimer.test.ts
```

Expected: FAIL.

- [ ] **Step 4: Implement timer hook**

Create `src/hooks/useTimer.ts`:

```ts
import { useState, useRef, useCallback, useEffect } from 'react';

export function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const toggle = useCallback(() => setRunning((r) => !r), []);
  const reset = useCallback(() => {
    setRunning(false);
    setSeconds(0);
  }, []);

  return { seconds, running, toggle, reset };
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run src/hooks/useTimer.test.ts
```

Expected: all PASS.

- [ ] **Step 6: Implement game management hook**

Create `src/hooks/useGame.ts`:

```ts
import { useState, useCallback, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { Game, GameEvent, Player, Team } from '../types';
import { getSportConfig } from '../sports/configs';
import { useDB } from './useDB';
import {
  getGame,
  insertEvent,
  listEvents,
  deleteEvent,
  getLastEvent,
  updateGameScore,
  listPlayers,
  updatePlayerStatus,
} from '../db/queries';

export function useGame(gameId: string) {
  const { db, persist } = useDB();
  const [game, setGame] = useState<Game | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState(1);

  const reload = useCallback(() => {
    const g = getGame(db, gameId);
    if (g) {
      setGame(g);
      setEvents(listEvents(db, gameId));
      setPlayers(listPlayers(db, gameId));
    }
  }, [db, gameId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const recalcScore = useCallback(() => {
    const evts = listEvents(db, gameId);
    const homeScore = evts.filter((e) => e.team === 'home').reduce((s, e) => s + e.points, 0);
    const awayScore = evts.filter((e) => e.team === 'away').reduce((s, e) => s + e.points, 0);
    updateGameScore(db, gameId, homeScore, awayScore);
    persist();
  }, [db, gameId, persist]);

  const addEvent = useCallback(
    (team: Team, eventType: string, points: number, playerId?: string) => {
      const event: GameEvent = {
        id: uuid(),
        game_id: gameId,
        player_id: playerId ?? null,
        team,
        event_type: eventType,
        points,
        half_or_period: currentPeriod,
        timestamp: new Date().toISOString(),
      };
      insertEvent(db, event);
      recalcScore();
      reload();
    },
    [db, gameId, currentPeriod, recalcScore, reload]
  );

  const undoLastEvent = useCallback(() => {
    const last = getLastEvent(db, gameId);
    if (last) {
      deleteEvent(db, last.id);
      recalcScore();
      reload();
    }
  }, [db, gameId, recalcScore, reload]);

  const advancePeriod = useCallback(() => {
    setCurrentPeriod((p) => p + 1);
  }, []);

  const substitute = useCallback(
    (team: Team, offPlayerId: string, onPlayerId: string) => {
      const now = new Date().toISOString();
      const offEvent: GameEvent = {
        id: uuid(),
        game_id: gameId,
        player_id: offPlayerId,
        team,
        event_type: 'substitution_off',
        points: 0,
        half_or_period: currentPeriod,
        timestamp: now,
      };
      const onEvent: GameEvent = {
        id: uuid(),
        game_id: gameId,
        player_id: onPlayerId,
        team,
        event_type: 'substitution_on',
        points: 0,
        half_or_period: currentPeriod,
        timestamp: now,
      };
      insertEvent(db, offEvent);
      insertEvent(db, onEvent);
      updatePlayerStatus(db, offPlayerId, 'subbed_off');
      updatePlayerStatus(db, onPlayerId, 'active');
      persist();
      reload();
    },
    [db, gameId, currentPeriod, persist, reload]
  );

  return {
    game,
    events,
    players,
    currentPeriod,
    addEvent,
    undoLastEvent,
    advancePeriod,
    substitute,
    reload,
  };
}
```

- [ ] **Step 7: Commit**

```bash
git add src/hooks/
git commit -m "feat: add database context, timer hook, and game management hook"
```

---

### Task 6: App Shell, Router, and Tab Bar

**Files:**
- Create: `src/components/TabBar.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`
- Create placeholder screens: `src/screens/Home.tsx`, `src/screens/GameSetup.tsx`, `src/screens/LiveGame.tsx`, `src/screens/GameSummary.tsx`, `src/screens/History.tsx`, `src/screens/Settings.tsx`

- [ ] **Step 1: Create TabBar component**

Create `src/components/TabBar.tsx`:

```tsx
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'New Game', icon: '🏟️' },
  { to: '/history', label: 'History', icon: '📋' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function TabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-800 border-t border-surface-600 safe-area-pb">
      <div className="flex">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 text-xs font-semibold transition-colors ${
                isActive ? 'text-accent' : 'text-gray-400'
              }`
            }
          >
            <span className="text-lg mb-0.5">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create placeholder screens**

Create `src/screens/Home.tsx`:

```tsx
export default function Home() {
  return <div className="p-4"><h1 className="text-2xl font-bold">Score Keeper</h1></div>;
}
```

Create `src/screens/GameSetup.tsx`:

```tsx
export default function GameSetup() {
  return <div className="p-4"><h1 className="text-xl font-bold">Game Setup</h1></div>;
}
```

Create `src/screens/LiveGame.tsx`:

```tsx
export default function LiveGame() {
  return <div className="p-4"><h1 className="text-xl font-bold">Live Game</h1></div>;
}
```

Create `src/screens/GameSummary.tsx`:

```tsx
export default function GameSummary() {
  return <div className="p-4"><h1 className="text-xl font-bold">Game Summary</h1></div>;
}
```

Create `src/screens/History.tsx`:

```tsx
export default function History() {
  return <div className="p-4"><h1 className="text-xl font-bold">History</h1></div>;
}
```

Create `src/screens/Settings.tsx`:

```tsx
export default function Settings() {
  return <div className="p-4"><h1 className="text-xl font-bold">Settings</h1></div>;
}
```

- [ ] **Step 3: Wire up App with router and DB provider**

Replace `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DBProvider, useDBReady } from './hooks/useDB';
import TabBar from './components/TabBar';
import Home from './screens/Home';
import GameSetup from './screens/GameSetup';
import LiveGame from './screens/LiveGame';
import GameSummary from './screens/GameSummary';
import History from './screens/History';
import Settings from './screens/Settings';

function AppRoutes() {
  const ready = useDBReady();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900 pb-20">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setup/:sportId" element={<GameSetup />} />
        <Route path="/game/:gameId" element={<LiveGame />} />
        <Route path="/summary/:gameId" element={<GameSummary />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <TabBar />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DBProvider>
        <AppRoutes />
      </DBProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Add safe area padding to index.css**

Append to `src/index.css`:

```css
@layer utilities {
  .safe-area-pb {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
}
```

- [ ] **Step 5: Verify dev server loads with routing**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: add app shell with router, tab bar, and placeholder screens"
```

---

### Task 7: Home Screen

**Files:**
- Create: `src/components/SportCard.tsx`, `src/components/GameCard.tsx`
- Modify: `src/screens/Home.tsx`

- [ ] **Step 1: Create SportCard component**

Create `src/components/SportCard.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { SportConfig } from '../types';

interface Props {
  sport: SportConfig;
}

export default function SportCard({ sport }: Props) {
  return (
    <Link
      to={`/setup/${sport.id}`}
      className="bg-surface-800 rounded-xl p-4 flex items-center gap-4 active:bg-surface-700 transition-colors"
    >
      <span className="text-3xl">{sport.icon}</span>
      <div>
        <h3 className="font-bold text-base">{sport.name}</h3>
        <p className="text-xs text-gray-400">
          {sport.periods.count} {sport.periods.name.toLowerCase()}s
        </p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create GameCard component**

Create `src/components/GameCard.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { Game } from '../types';
import { getSportConfig } from '../sports/configs';

interface Props {
  game: Game;
}

export default function GameCard({ game }: Props) {
  const sport = getSportConfig(game.sport);
  const isLive = game.status === 'in_progress';
  const linkTo = isLive ? `/game/${game.id}` : `/summary/${game.id}`;

  return (
    <Link
      to={linkTo}
      className={`block bg-surface-800 rounded-xl p-4 transition-colors active:bg-surface-700 ${
        isLive ? 'border border-accent/50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">
          {sport.icon} {sport.name}
        </span>
        {isLive && (
          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-semibold">
            LIVE
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-semibold text-home">{game.home_team}</p>
          <p className="font-semibold text-away">{game.away_team}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-xl text-home">{game.home_score}</p>
          <p className="font-bold text-xl text-away">{game.away_score}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {new Date(game.started_at).toLocaleDateString()}
      </p>
    </Link>
  );
}
```

- [ ] **Step 3: Implement Home screen**

Replace `src/screens/Home.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { SPORTS } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { listGames } from '../db/queries';
import { Game } from '../types';
import SportCard from '../components/SportCard';
import GameCard from '../components/GameCard';

export default function Home() {
  const { db } = useDB();
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    setGames(listGames(db));
  }, [db]);

  const liveGames = games.filter((g) => g.status === 'in_progress');
  const recentGames = games.filter((g) => g.status === 'completed').slice(0, 5);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Score Keeper</h1>

      {liveGames.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            In Progress
          </h2>
          <div className="space-y-3">
            {liveGames.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          New Game
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {SPORTS.map((sport) => (
            <SportCard key={sport.id} sport={sport} />
          ))}
        </div>
      </section>

      {recentGames.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Recent
          </h2>
          <div className="space-y-3">
            {recentGames.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: implement Home screen with sport picker and recent games"
```

---

### Task 8: Game Setup Screen

**Files:**
- Modify: `src/screens/GameSetup.tsx`

- [ ] **Step 1: Implement Game Setup screen**

Replace `src/screens/GameSetup.tsx`:

```tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { Sport, Player, Team } from '../types';
import { getSportConfig } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { insertGame, insertPlayer } from '../db/queries';

interface DraftPlayer {
  name: string;
  number: string;
  status: 'active' | 'bench';
}

export default function GameSetup() {
  const { sportId } = useParams<{ sportId: string }>();
  const navigate = useNavigate();
  const { db, persist } = useDB();
  const sport = getSportConfig(sportId as Sport);

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [showPlayers, setShowPlayers] = useState(false);
  const [homePlayers, setHomePlayers] = useState<DraftPlayer[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<DraftPlayer[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [addingFor, setAddingFor] = useState<Team>('home');

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const player: DraftPlayer = {
      name: newPlayerName.trim(),
      number: newPlayerNumber,
      status: 'active',
    };
    if (addingFor === 'home') {
      setHomePlayers((p) => [...p, player]);
    } else {
      setAwayPlayers((p) => [...p, player]);
    }
    setNewPlayerName('');
    setNewPlayerNumber('');
  };

  const removePlayer = (team: Team, index: number) => {
    if (team === 'home') {
      setHomePlayers((p) => p.filter((_, i) => i !== index));
    } else {
      setAwayPlayers((p) => p.filter((_, i) => i !== index));
    }
  };

  const startGame = () => {
    if (!homeTeam.trim() || !awayTeam.trim()) return;

    const gameId = uuid();
    insertGame(db, {
      id: gameId,
      sport: sport.id,
      home_team: homeTeam.trim(),
      away_team: awayTeam.trim(),
      started_at: new Date().toISOString(),
    });

    const savePlayers = (drafts: DraftPlayer[], team: Team) => {
      drafts.forEach((d) => {
        const player: Player = {
          id: uuid(),
          game_id: gameId,
          team,
          name: d.name,
          number: d.number ? parseInt(d.number, 10) : null,
          status: d.status,
        };
        insertPlayer(db, player);
      });
    };

    savePlayers(homePlayers, 'home');
    savePlayers(awayPlayers, 'away');
    persist();
    navigate(`/game/${gameId}`, { replace: true });
  };

  const inputClass =
    'w-full bg-surface-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{sport.icon}</span>
        <h1 className="text-xl font-bold">{sport.name}</h1>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-home uppercase tracking-wider font-semibold mb-1 block">
            Home Team
          </label>
          <input
            type="text"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            placeholder="Home team name"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs text-away uppercase tracking-wider font-semibold mb-1 block">
            Away Team
          </label>
          <input
            type="text"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            placeholder="Away team name"
            className={inputClass}
          />
        </div>
      </div>

      {!showPlayers ? (
        <button
          onClick={() => setShowPlayers(true)}
          className="text-sm text-gray-400 underline"
        >
          + Add players (optional)
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setAddingFor('home')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                addingFor === 'home' ? 'bg-home-dark text-home border border-home' : 'bg-surface-700 text-gray-400'
              }`}
            >
              {homeTeam || 'Home'}
            </button>
            <button
              onClick={() => setAddingFor('away')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                addingFor === 'away' ? 'bg-away-dark text-away border border-away' : 'bg-surface-700 text-gray-400'
              }`}
            >
              {awayTeam || 'Away'}
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Player name"
              className={`${inputClass} flex-1`}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
            />
            <input
              type="number"
              value={newPlayerNumber}
              onChange={(e) => setNewPlayerNumber(e.target.value)}
              placeholder="#"
              className={`${inputClass} w-16 text-center`}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
            />
            <button onClick={addPlayer} className="bg-accent rounded-lg px-4 font-semibold">
              Add
            </button>
          </div>

          {[
            { team: 'home' as Team, players: homePlayers, label: homeTeam || 'Home' },
            { team: 'away' as Team, players: awayPlayers, label: awayTeam || 'Away' },
          ].map(({ team, players, label }) =>
            players.length > 0 ? (
              <div key={team}>
                <p className={`text-xs uppercase tracking-wider font-semibold mb-2 ${team === 'home' ? 'text-home' : 'text-away'}`}>
                  {label}
                </p>
                <div className="space-y-1">
                  {players.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-surface-700 rounded-lg px-3 py-2">
                      <span className="text-sm">
                        {p.number && <span className="text-gray-400 mr-2">#{p.number}</span>}
                        {p.name}
                      </span>
                      <button onClick={() => removePlayer(team, i)} className="text-gray-500 text-xs">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      <button
        onClick={startGame}
        disabled={!homeTeam.trim() || !awayTeam.trim()}
        className="w-full bg-accent rounded-xl py-4 font-bold text-lg disabled:opacity-40 active:opacity-80 transition-opacity"
      >
        Start Game
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/GameSetup.tsx
git commit -m "feat: implement Game Setup screen with team names and optional players"
```

---

### Task 9: Live Game — Scoring Components

**Files:**
- Create: `src/components/Scoreboard.tsx`, `src/components/ScoreButton.tsx`, `src/components/ScoringRow.tsx`, `src/components/Timer.tsx`, `src/components/EventLog.tsx`, `src/components/ActionsRow.tsx`

- [ ] **Step 1: Create Scoreboard component**

Create `src/components/Scoreboard.tsx`:

```tsx
import { Game, GameEvent, Team } from '../types';
import { getSportConfig } from '../sports/configs';
import { formatGaelicScore } from '../utils/format';

interface Props {
  game: Game;
  events: GameEvent[];
}

export default function Scoreboard({ game, events }: Props) {
  const sport = getSportConfig(game.sport);
  const isSplit = sport.scoreDisplay === 'split';

  const renderScore = (score: number, team: Team) => {
    if (isSplit) {
      return (
        <div>
          <div className="text-4xl font-extrabold font-score tabular-nums">
            {formatGaelicScore(events, team)}
          </div>
          <div className="text-xs text-gray-500">({score})</div>
        </div>
      );
    }
    return <div className="text-5xl font-extrabold font-score tabular-nums">{score}</div>;
  };

  return (
    <div className="bg-surface-800 rounded-xl p-4 text-center">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs text-home uppercase tracking-widest font-semibold">Home</p>
          <p className="text-sm font-semibold mt-0.5 truncate">{game.home_team}</p>
          <div className="text-home mt-1">{renderScore(game.home_score, 'home')}</div>
        </div>
        <div className="text-sm text-gray-600 font-semibold px-3">VS</div>
        <div className="flex-1">
          <p className="text-xs text-away uppercase tracking-widest font-semibold">Away</p>
          <p className="text-sm font-semibold mt-0.5 truncate">{game.away_team}</p>
          <div className="text-away mt-1">{renderScore(game.away_score, 'away')}</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ScoreButton component**

Create `src/components/ScoreButton.tsx`:

```tsx
import { ScoringEventConfig } from '../types';

interface Props {
  event: ScoringEventConfig;
  team: 'home' | 'away';
  onClick: () => void;
}

export default function ScoreButton({ event, team, onClick }: Props) {
  const isHome = team === 'home';
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg py-3 px-2 text-center border transition-transform active:scale-95 ${
        isHome
          ? 'bg-home-dark border-home text-white'
          : 'bg-away-dark border-away text-white'
      }`}
    >
      <div className="text-sm font-bold">{event.label}</div>
      <div className={`text-xs ${isHome ? 'text-home' : 'text-away'}`}>+{event.points}</div>
    </button>
  );
}
```

- [ ] **Step 3: Create ScoringRow component**

Create `src/components/ScoringRow.tsx`:

```tsx
import { ScoringEventConfig, Team } from '../types';
import ScoreButton from './ScoreButton';

interface Props {
  events: ScoringEventConfig[];
  team: Team;
  teamName: string;
  onScore: (eventType: string, points: number) => void;
}

export default function ScoringRow({ events, team, teamName, onScore }: Props) {
  return (
    <div>
      <p className={`text-xs uppercase tracking-widest font-semibold mb-2 ${team === 'home' ? 'text-home' : 'text-away'}`}>
        {teamName}
      </p>
      <div className="flex gap-2">
        {events.map((event) => (
          <ScoreButton
            key={event.type}
            event={event}
            team={team}
            onClick={() => onScore(event.type, event.points)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Timer display component**

Create `src/components/Timer.tsx`:

```tsx
import { formatTimer } from '../utils/format';

interface Props {
  seconds: number;
  running: boolean;
  onToggle: () => void;
}

export default function Timer({ seconds, running, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-center gap-2 py-2"
    >
      <span className="text-2xl font-bold tabular-nums font-score">{formatTimer(seconds)}</span>
      <span className="text-xs text-gray-500">{running ? '⏸ tap to pause' : '▶ tap to start'}</span>
    </button>
  );
}
```

- [ ] **Step 5: Create EventLog component**

Create `src/components/EventLog.tsx`:

```tsx
import { GameEvent, Player } from '../types';
import { formatEventTime } from '../utils/format';

interface Props {
  events: GameEvent[];
  players: Player[];
  gameStartedAt: string;
}

export default function EventLog({ events, players, gameStartedAt }: Props) {
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Calculate running scores forward, then display most recent first
  let homeRunning = 0;
  let awayRunning = 0;
  const withScores = events.map((event) => {
    if (event.team === 'home') homeRunning += event.points;
    else awayRunning += event.points;
    return { event, home: homeRunning, away: awayRunning };
  });

  const rows = [...withScores].reverse().map(({ event, home, away }) => {
    const player = event.player_id ? playerMap.get(event.player_id) : undefined;
    const isHome = event.team === 'home';
    const label = event.event_type.replace(/_/g, ' ');

    return (
      <div key={event.id} className="text-xs text-gray-400 py-1.5 border-b border-surface-700 last:border-0">
        <span className="text-gray-600">{formatEventTime(event.timestamp, gameStartedAt)}</span>
        {' · '}
        <span className="capitalize">{label}</span>
        {player && <span> · {player.name}</span>}
        {' · '}
        <span className={isHome ? 'text-home' : 'text-away'}>
          {home}-{away}
        </span>
      </div>
    );
  });

  if (events.length === 0) {
    return (
      <div className="bg-surface-800 rounded-xl p-4">
        <p className="text-xs text-gray-600 text-center">No events yet</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-800 rounded-xl p-3">
      <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Recent</p>
      <div className="max-h-40 overflow-y-auto">{rows}</div>
    </div>
  );
}
```

- [ ] **Step 6: Create ActionsRow component**

Create `src/components/ActionsRow.tsx`:

```tsx
import { SportConfig } from '../types';

interface Props {
  sport: SportConfig;
  hasPlayers: boolean;
  onCard: () => void;
  onSub: () => void;
  onUndo: () => void;
  onAdvancePeriod: () => void;
  onStat: (eventType: string) => void;
  currentPeriod: number;
}

export default function ActionsRow({
  sport,
  hasPlayers,
  onCard,
  onSub,
  onUndo,
  onAdvancePeriod,
  onStat,
  currentPeriod,
}: Props) {
  const periodLabel = `${sport.periods.name} ${currentPeriod}`;
  const btnClass = 'flex-1 bg-surface-600 rounded-lg py-2.5 text-center text-xs font-medium text-gray-300 active:bg-surface-700';

  return (
    <div className="space-y-2">
      {sport.statEvents.length > 0 && (
        <div className="flex gap-2">
          {sport.statEvents.map((stat) => (
            <button key={stat.type} onClick={() => onStat(stat.type)} className={btnClass}>
              {stat.icon} {stat.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {sport.cardEvents.length > 0 && (
          <button onClick={onCard} className={btnClass}>⚠ Card</button>
        )}
        {hasPlayers && (
          <button onClick={onSub} className={btnClass}>🔄 Sub</button>
        )}
        <button onClick={onUndo} className={btnClass}>↩ Undo</button>
        <button onClick={onAdvancePeriod} className={btnClass}>
          ▶ {currentPeriod < sport.periods.count ? `Next ${sport.periods.name}` : periodLabel}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/
git commit -m "feat: add Scoreboard, ScoreButton, ScoringRow, Timer, EventLog, ActionsRow components"
```

---

### Task 10: Live Game — Player Picker and Substitution Flow

**Files:**
- Create: `src/components/PlayerPicker.tsx`, `src/components/SubstitutionFlow.tsx`

- [ ] **Step 1: Create PlayerPicker bottom sheet**

Create `src/components/PlayerPicker.tsx`:

```tsx
import { Player } from '../types';

interface Props {
  players: Player[];
  title: string;
  onSelect: (playerId: string) => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function PlayerPicker({ players, title, onSelect, onSkip, onClose }: Props) {
  const activePlayers = players.filter((p) => p.status === 'active');

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-surface-800 rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-gray-400 mb-3">{title}</p>
        <div className="space-y-2">
          {activePlayers.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="w-full bg-surface-700 rounded-lg px-4 py-3 text-left flex items-center gap-3 active:bg-surface-600"
            >
              {p.number != null && (
                <span className="text-sm text-gray-400 font-mono w-8">#{p.number}</span>
              )}
              <span className="font-medium">{p.name}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onSkip}
          className="w-full mt-3 py-3 text-center text-sm text-gray-500 border border-surface-600 rounded-lg"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create SubstitutionFlow bottom sheet**

Create `src/components/SubstitutionFlow.tsx`:

```tsx
import { useState } from 'react';
import { Player, Team } from '../types';

interface Props {
  homePlayers: Player[];
  awayPlayers: Player[];
  homeTeamName: string;
  awayTeamName: string;
  onSubstitute: (team: Team, offPlayerId: string, onPlayerId: string) => void;
  onClose: () => void;
}

type Step = 'pick_team' | 'pick_off' | 'pick_on';

export default function SubstitutionFlow({
  homePlayers,
  awayPlayers,
  homeTeamName,
  awayTeamName,
  onSubstitute,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('pick_team');
  const [team, setTeam] = useState<Team>('home');
  const [offPlayerId, setOffPlayerId] = useState<string>('');

  const players = team === 'home' ? homePlayers : awayPlayers;
  const activePlayers = players.filter((p) => p.status === 'active');
  const benchPlayers = players.filter((p) => p.status === 'bench');

  const handlePickTeam = (t: Team) => {
    setTeam(t);
    setStep('pick_off');
  };

  const handlePickOff = (playerId: string) => {
    setOffPlayerId(playerId);
    setStep('pick_on');
  };

  const handlePickOn = (playerId: string) => {
    onSubstitute(team, offPlayerId, playerId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-surface-800 rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'pick_team' && (
          <>
            <p className="text-sm font-semibold text-gray-400 mb-3">Which team?</p>
            <div className="space-y-2">
              <button
                onClick={() => handlePickTeam('home')}
                className="w-full bg-home-dark border border-home rounded-lg py-3 font-semibold text-home active:opacity-80"
              >
                {homeTeamName}
              </button>
              <button
                onClick={() => handlePickTeam('away')}
                className="w-full bg-away-dark border border-away rounded-lg py-3 font-semibold text-away active:opacity-80"
              >
                {awayTeamName}
              </button>
            </div>
          </>
        )}

        {step === 'pick_off' && (
          <>
            <p className="text-sm font-semibold text-gray-400 mb-3">Player coming OFF</p>
            <div className="space-y-2">
              {activePlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePickOff(p.id)}
                  className="w-full bg-surface-700 rounded-lg px-4 py-3 text-left flex items-center gap-3 active:bg-surface-600"
                >
                  {p.number != null && <span className="text-sm text-gray-400 font-mono w-8">#{p.number}</span>}
                  <span className="font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'pick_on' && (
          <>
            <p className="text-sm font-semibold text-gray-400 mb-3">Player coming ON</p>
            <div className="space-y-2">
              {benchPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePickOn(p.id)}
                  className="w-full bg-surface-700 rounded-lg px-4 py-3 text-left flex items-center gap-3 active:bg-surface-600"
                >
                  {p.number != null && <span className="text-sm text-gray-400 font-mono w-8">#{p.number}</span>}
                  <span className="font-medium">{p.name}</span>
                </button>
              ))}
              {benchPlayers.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No players on bench</p>
              )}
            </div>
          </>
        )}

        <button onClick={onClose} className="w-full mt-3 py-3 text-center text-sm text-gray-500 border border-surface-600 rounded-lg">
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/PlayerPicker.tsx src/components/SubstitutionFlow.tsx
git commit -m "feat: add PlayerPicker and SubstitutionFlow bottom sheet components"
```

---

### Task 11: Live Game Screen Assembly

**Files:**
- Modify: `src/screens/LiveGame.tsx`

- [ ] **Step 1: Implement full Live Game screen**

Replace `src/screens/LiveGame.tsx`:

```tsx
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Team } from '../types';
import { getSportConfig } from '../sports/configs';
import { useGame } from '../hooks/useGame';
import { useTimer } from '../hooks/useTimer';
import { useDB } from '../hooks/useDB';
import { endGame } from '../db/queries';
import Scoreboard from '../components/Scoreboard';
import ScoringRow from '../components/ScoringRow';
import Timer from '../components/Timer';
import EventLog from '../components/EventLog';
import ActionsRow from '../components/ActionsRow';
import PlayerPicker from '../components/PlayerPicker';
import SubstitutionFlow from '../components/SubstitutionFlow';

export default function LiveGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { db, persist } = useDB();
  const { game, events, players, currentPeriod, addEvent, undoLastEvent, advancePeriod, substitute } =
    useGame(gameId!);
  const timer = useTimer();

  const [pendingScore, setPendingScore] = useState<{
    team: Team;
    eventType: string;
    points: number;
  } | null>(null);
  const [showSub, setShowSub] = useState(false);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [pendingStatTeam, setPendingStatTeam] = useState<{ team: Team; eventType: string } | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const sport = game ? getSportConfig(game.sport) : null;
  const hasPlayers = players.length > 0;
  const homePlayers = players.filter((p) => p.team === 'home');
  const awayPlayers = players.filter((p) => p.team === 'away');

  const handleScore = useCallback(
    (team: Team, eventType: string, points: number) => {
      if (hasPlayers) {
        setPendingScore({ team, eventType, points });
      } else {
        addEvent(team, eventType, points);
      }
    },
    [hasPlayers, addEvent]
  );

  const handlePlayerSelected = useCallback(
    (playerId: string) => {
      if (pendingScore) {
        addEvent(pendingScore.team, pendingScore.eventType, pendingScore.points, playerId);
        setPendingScore(null);
      }
      if (pendingStatTeam) {
        addEvent(pendingStatTeam.team, pendingStatTeam.eventType, 0, playerId);
        setPendingStatTeam(null);
      }
    },
    [pendingScore, pendingStatTeam, addEvent]
  );

  const handleSkipPlayer = useCallback(() => {
    if (pendingScore) {
      addEvent(pendingScore.team, pendingScore.eventType, pendingScore.points);
      setPendingScore(null);
    }
    if (pendingStatTeam) {
      addEvent(pendingStatTeam.team, pendingStatTeam.eventType, 0);
      setPendingStatTeam(null);
    }
  }, [pendingScore, pendingStatTeam, addEvent]);

  const handleStat = useCallback(
    (eventType: string) => {
      // For stats, we need to pick a team first, then optionally a player
      // Simple approach: show team picker then player picker
      // For now, use home team — we'll add team selection via the card picker pattern
      if (hasPlayers) {
        setPendingStatTeam({ team: 'home', eventType });
      } else {
        addEvent('home', eventType, 0);
      }
    },
    [hasPlayers, addEvent]
  );

  const handleAdvancePeriod = useCallback(() => {
    if (sport && currentPeriod >= sport.periods.count) {
      setShowEndConfirm(true);
    } else {
      advancePeriod();
      timer.reset();
    }
  }, [sport, currentPeriod, advancePeriod, timer]);

  const handleEndGame = useCallback(() => {
    endGame(db, gameId!, new Date().toISOString());
    persist();
    navigate(`/summary/${gameId}`, { replace: true });
  }, [db, gameId, persist, navigate]);

  if (!game || !sport) {
    return <div className="p-4 text-gray-400">Loading game...</div>;
  }

  return (
    <div className="p-3 space-y-3 pb-24">
      {/* Sport badge + period */}
      <div className="flex items-center justify-between">
        <span className="bg-accent px-3 py-1 rounded-full text-xs font-semibold">
          {sport.name.toUpperCase()}
        </span>
        <span className="text-xs text-gray-400">
          {sport.periods.name} {currentPeriod} of {sport.periods.count}
        </span>
      </div>

      {/* Scoreboard */}
      <Scoreboard game={game} events={events} />

      {/* Timer */}
      <Timer seconds={timer.seconds} running={timer.running} onToggle={timer.toggle} />

      {/* Home scoring buttons */}
      <ScoringRow
        events={sport.scoringEvents}
        team="home"
        teamName={game.home_team}
        onScore={(type, pts) => handleScore('home', type, pts)}
      />

      {/* Away scoring buttons */}
      <ScoringRow
        events={sport.scoringEvents}
        team="away"
        teamName={game.away_team}
        onScore={(type, pts) => handleScore('away', type, pts)}
      />

      {/* Actions row */}
      <ActionsRow
        sport={sport}
        hasPlayers={hasPlayers}
        onCard={() => setShowCardPicker(true)}
        onSub={() => setShowSub(true)}
        onUndo={undoLastEvent}
        onAdvancePeriod={handleAdvancePeriod}
        onStat={handleStat}
        currentPeriod={currentPeriod}
      />

      {/* Event log */}
      <EventLog
        events={events}
        players={players}
        gameStartedAt={game.started_at}
      />

      {/* End game button */}
      <button
        onClick={() => setShowEndConfirm(true)}
        className="w-full py-3 text-center text-sm text-gray-500 border border-surface-600 rounded-lg"
      >
        End Game
      </button>

      {/* Player picker for scoring */}
      {(pendingScore || pendingStatTeam) && hasPlayers && (
        <PlayerPicker
          players={pendingScore ? players.filter((p) => p.team === pendingScore.team) : players}
          title={pendingScore ? `Who scored the ${pendingScore.eventType.replace(/_/g, ' ')}?` : 'Which player?'}
          onSelect={handlePlayerSelected}
          onSkip={handleSkipPlayer}
          onClose={() => { setPendingScore(null); setPendingStatTeam(null); }}
        />
      )}

      {/* Substitution flow */}
      {showSub && (
        <SubstitutionFlow
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          homeTeamName={game.home_team}
          awayTeamName={game.away_team}
          onSubstitute={substitute}
          onClose={() => setShowSub(false)}
        />
      )}

      {/* Card picker — simplified: pick team, then player */}
      {showCardPicker && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowCardPicker(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full bg-surface-800 rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-400 mb-3">Issue Card</p>
            <div className="space-y-2">
              {sport.cardEvents.map((card) => (
                <div key={card.type} className="flex gap-2">
                  <button
                    onClick={() => { addEvent('home', card.type, 0); setShowCardPicker(false); }}
                    className="flex-1 bg-home-dark border border-home rounded-lg py-3 text-sm font-medium"
                  >
                    <span style={{ color: card.color }}>●</span> {card.label} — {game.home_team}
                  </button>
                  <button
                    onClick={() => { addEvent('away', card.type, 0); setShowCardPicker(false); }}
                    className="flex-1 bg-away-dark border border-away rounded-lg py-3 text-sm font-medium"
                  >
                    <span style={{ color: card.color }}>●</span> {card.label} — {game.away_team}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowCardPicker(false)} className="w-full mt-3 py-3 text-center text-sm text-gray-500">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* End game confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowEndConfirm(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface-800 rounded-2xl p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">End Game?</h3>
            <p className="text-sm text-gray-400 mb-4">
              {game.home_team} {game.home_score} - {game.away_score} {game.away_team}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 border border-surface-600 rounded-lg text-sm font-medium"
              >
                Continue
              </button>
              <button
                onClick={handleEndGame}
                className="flex-1 py-3 bg-accent rounded-lg text-sm font-bold"
              >
                End Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/LiveGame.tsx
git commit -m "feat: assemble Live Game screen with all scoring, timer, and player interactions"
```

---

### Task 12: Game Summary Screen

**Files:**
- Modify: `src/screens/GameSummary.tsx`

- [ ] **Step 1: Implement Game Summary screen**

Replace `src/screens/GameSummary.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Game, GameEvent, Player } from '../types';
import { getSportConfig } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { getGame, listEvents, listPlayers } from '../db/queries';
import { formatGaelicScore } from '../utils/format';
import { exportGameCSV, exportGameJSON, downloadFile } from '../utils/export';

export default function GameSummary() {
  const { gameId } = useParams<{ gameId: string }>();
  const { db } = useDB();
  const [game, setGame] = useState<Game | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!gameId) return;
    setGame(getGame(db, gameId) ?? null);
    setEvents(listEvents(db, gameId));
    setPlayers(listPlayers(db, gameId));
  }, [db, gameId]);

  if (!game) {
    return <div className="p-4 text-gray-400">Game not found</div>;
  }

  const sport = getSportConfig(game.sport);
  const isSplit = sport.scoreDisplay === 'split';

  // Period breakdown
  const periodScores = Array.from({ length: sport.periods.count }, (_, i) => {
    const periodEvents = events.filter((e) => e.half_or_period === i + 1);
    const home = periodEvents.filter((e) => e.team === 'home').reduce((s, e) => s + e.points, 0);
    const away = periodEvents.filter((e) => e.team === 'away').reduce((s, e) => s + e.points, 0);
    return { period: i + 1, home, away };
  });

  // Player stats
  const playerStats = players.map((p) => {
    const playerEvents = events.filter((e) => e.player_id === p.id);
    const points = playerEvents.reduce((s, e) => s + e.points, 0);
    const byType = new Map<string, number>();
    playerEvents.forEach((e) => {
      byType.set(e.event_type, (byType.get(e.event_type) ?? 0) + 1);
    });
    return { player: p, points, byType };
  }).filter((s) => s.byType.size > 0);

  const handleExportCSV = () => {
    const csv = exportGameCSV(game, events, players);
    downloadFile(csv, `${game.home_team}-vs-${game.away_team}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    const json = exportGameJSON(game, events, players);
    downloadFile(json, `${game.home_team}-vs-${game.away_team}.json`, 'application/json');
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{sport.icon}</span>
        <div>
          <h1 className="text-lg font-bold">{sport.name}</h1>
          <p className="text-xs text-gray-500">{new Date(game.started_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Final score */}
      <div className="bg-surface-800 rounded-xl p-6 text-center">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-home uppercase tracking-widest font-semibold">{game.home_team}</p>
            <p className="text-4xl font-extrabold text-home mt-2">
              {isSplit ? formatGaelicScore(events, 'home') : game.home_score}
            </p>
            {isSplit && <p className="text-xs text-gray-500">({game.home_score})</p>}
          </div>
          <div className="text-gray-600 font-bold text-lg px-4">-</div>
          <div className="flex-1">
            <p className="text-xs text-away uppercase tracking-widest font-semibold">{game.away_team}</p>
            <p className="text-4xl font-extrabold text-away mt-2">
              {isSplit ? formatGaelicScore(events, 'away') : game.away_score}
            </p>
            {isSplit && <p className="text-xs text-gray-500">({game.away_score})</p>}
          </div>
        </div>
      </div>

      {/* Period breakdown */}
      <div className="bg-surface-800 rounded-xl p-4">
        <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
          By {sport.periods.name}
        </h2>
        <div className="space-y-2">
          {periodScores.map((ps) => (
            <div key={ps.period} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {sport.periods.name} {ps.period}
              </span>
              <span>
                <span className="text-home font-semibold">{ps.home}</span>
                <span className="text-gray-600 mx-2">-</span>
                <span className="text-away font-semibold">{ps.away}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Player stats */}
      {playerStats.length > 0 && (
        <div className="bg-surface-800 rounded-xl p-4">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
            Player Stats
          </h2>
          <div className="space-y-3">
            {playerStats.map(({ player, points, byType }) => (
              <div key={player.id} className="flex items-start justify-between">
                <div>
                  <p className={`font-medium text-sm ${player.team === 'home' ? 'text-home' : 'text-away'}`}>
                    {player.number != null && <span className="text-gray-500 mr-1">#{player.number}</span>}
                    {player.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Array.from(byType.entries())
                      .map(([type, count]) => `${count} ${type.replace(/_/g, ' ')}`)
                      .join(', ')}
                  </p>
                </div>
                {points > 0 && (
                  <span className="text-sm font-bold">{points} pts</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export */}
      <div className="flex gap-3">
        <button onClick={handleExportCSV} className="flex-1 bg-surface-800 border border-surface-600 rounded-xl py-3 text-sm font-semibold active:bg-surface-700">
          📊 Export CSV
        </button>
        <button onClick={handleExportJSON} className="flex-1 bg-surface-800 border border-surface-600 rounded-xl py-3 text-sm font-semibold active:bg-surface-700">
          📋 Export JSON
        </button>
      </div>

      <Link to="/" className="block text-center text-sm text-gray-500 underline py-2">
        Back to Home
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/GameSummary.tsx
git commit -m "feat: implement Game Summary screen with stats breakdown and export"
```

---

### Task 13: History Screen

**Files:**
- Modify: `src/screens/History.tsx`

- [ ] **Step 1: Implement History screen**

Replace `src/screens/History.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Game, Sport } from '../types';
import { SPORTS } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { listGames } from '../db/queries';
import GameCard from '../components/GameCard';

export default function History() {
  const { db } = useDB();
  const [games, setGames] = useState<Game[]>([]);
  const [filter, setFilter] = useState<Sport | 'all'>('all');

  useEffect(() => {
    const sportFilter = filter === 'all' ? undefined : filter;
    setGames(listGames(db, sportFilter));
  }, [db, filter]);

  const completedGames = games.filter((g) => g.status === 'completed');

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">History</h1>

      {/* Sport filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
            filter === 'all' ? 'bg-accent text-white' : 'bg-surface-700 text-gray-400'
          }`}
        >
          All
        </button>
        {SPORTS.map((sport) => (
          <button
            key={sport.id}
            onClick={() => setFilter(sport.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
              filter === sport.id ? 'bg-accent text-white' : 'bg-surface-700 text-gray-400'
            }`}
          >
            {sport.icon} {sport.name}
          </button>
        ))}
      </div>

      {/* Game list */}
      {completedGames.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No completed games yet</p>
          <p className="text-xs text-gray-600 mt-1">Start a game from the home screen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedGames.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/History.tsx
git commit -m "feat: implement History screen with sport filtering"
```

---

### Task 14: Settings Screen

**Files:**
- Modify: `src/screens/Settings.tsx`

- [ ] **Step 1: Implement Settings screen**

Replace `src/screens/Settings.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { useDB } from '../hooks/useDB';
import { listGames, listEvents, listPlayers } from '../db/queries';
import { exportGameCSV, exportGameJSON, downloadFile } from '../utils/export';
import { clearDB } from '../db/init';

const SETTINGS_KEY = 'score-keeper-settings';

interface AppSettings {
  defaultHomeTeam: string;
  defaultAwayTeam: string;
  darkMode: boolean;
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { defaultHomeTeam: '', defaultAwayTeam: '', darkMode: true };
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export default function Settings() {
  const { db } = useDB();
  const [settings, setSettings] = useState(loadSettings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handleExportAll = () => {
    const games = listGames(db);
    const allData = games.map((game) => {
      const events = listEvents(db, game.id);
      const players = listPlayers(db, game.id);
      return { game, events, players };
    });
    const json = JSON.stringify(allData, null, 2);
    downloadFile(json, 'score-keeper-all-data.json', 'application/json');
  };

  const handleClearAll = async () => {
    await clearDB();
    setShowClearConfirm(false);
    window.location.reload();
  };

  const inputClass =
    'w-full bg-surface-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Default Teams
        </h2>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Home Team</label>
          <input
            type="text"
            value={settings.defaultHomeTeam}
            onChange={(e) => setSettings((s) => ({ ...s, defaultHomeTeam: e.target.value }))}
            placeholder="e.g. Sligo RFC"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Away Team</label>
          <input
            type="text"
            value={settings.defaultAwayTeam}
            onChange={(e) => setSettings((s) => ({ ...s, defaultAwayTeam: e.target.value }))}
            placeholder="e.g. Ballina RFC"
            className={inputClass}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Data</h2>
        <button
          onClick={handleExportAll}
          className="w-full bg-surface-800 border border-surface-600 rounded-xl py-3 text-sm font-semibold active:bg-surface-700"
        >
          📦 Export All Data (JSON)
        </button>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="w-full bg-surface-800 border border-red-900/50 rounded-xl py-3 text-sm font-semibold text-red-400 active:bg-surface-700"
        >
          🗑 Clear All Data
        </button>
      </section>

      <p className="text-xs text-gray-600 text-center pt-4">Score Keeper v1.0</p>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowClearConfirm(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface-800 rounded-2xl p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Clear All Data?</h3>
            <p className="text-sm text-gray-400 mb-4">
              This will permanently delete all games, players, and events. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 border border-surface-600 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-3 bg-red-600 rounded-lg text-sm font-bold"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire default team names into GameSetup**

In `src/screens/GameSetup.tsx`, update the `useState` initializers:

Replace the `useState` lines for `homeTeam` and `awayTeam`:

```tsx
// At the top of the GameSetup component, replace:
const [homeTeam, setHomeTeam] = useState('');
const [awayTeam, setAwayTeam] = useState('');

// With:
const [homeTeam, setHomeTeam] = useState(() => {
  try {
    const s = localStorage.getItem('score-keeper-settings');
    return s ? JSON.parse(s).defaultHomeTeam || '' : '';
  } catch { return ''; }
});
const [awayTeam, setAwayTeam] = useState(() => {
  try {
    const s = localStorage.getItem('score-keeper-settings');
    return s ? JSON.parse(s).defaultAwayTeam || '' : '';
  } catch { return ''; }
});
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Settings.tsx src/screens/GameSetup.tsx
git commit -m "feat: implement Settings screen with default teams and data management"
```

---

### Task 15: PWA Polish and Wake Lock

**Files:**
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png` (placeholder SVG-based)
- Modify: `src/screens/LiveGame.tsx` (add wake lock)
- Modify: `index.html` (meta tags)

- [ ] **Step 1: Generate placeholder PWA icons**

```bash
# Create simple SVG-based PNG placeholders using a canvas script
# We'll use a simple HTML approach to generate them
cat > /tmp/gen-icon.html << 'ICONEOF'
<!DOCTYPE html>
<html><body><canvas id="c"></canvas><script>
const size = parseInt(location.hash.slice(1)) || 192;
const c = document.getElementById('c');
c.width = c.height = size;
const ctx = c.getContext('2d');
ctx.fillStyle = '#0f0f23';
ctx.fillRect(0, 0, size, size);
ctx.fillStyle = '#e94560';
ctx.font = `bold ${size * 0.4}px system-ui`;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('SK', size/2, size/2);
document.title = c.toDataURL();
</script></body></html>
ICONEOF
```

For now, create minimal placeholder icons. The user can replace them later.

```bash
# Use a simple approach: create a 1x1 pixel PNG as placeholder
# Real icons should be designed properly
python3 -c "
import struct, zlib
def png(w, h, r, g, b):
    def chunk(ty, data):
        c = ty + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    raw = b''
    for _ in range(h):
        raw += b'\x00' + bytes([r, g, b]) * w
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
open('public/icons/icon-192.png', 'wb').write(png(192, 192, 15, 15, 35))
open('public/icons/icon-512.png', 'wb').write(png(512, 512, 15, 15, 35))
print('Icons created')
"
```

- [ ] **Step 2: Add wake lock to LiveGame**

Add the following `useEffect` to `src/screens/LiveGame.tsx`, after the existing hooks at the top of the component:

```tsx
// Add this useEffect inside the LiveGame component, after the existing state declarations:
useEffect(() => {
  let wakeLock: WakeLockSentinel | null = null;
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch {}
  }
  requestWakeLock();
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') requestWakeLock();
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => {
    wakeLock?.release();
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}, []);
```

Also add the import for `useEffect` if not already present (it should already be imported).

- [ ] **Step 3: Update index.html with meta tags**

Replace `index.html`:

```html
<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
    <meta name="theme-color" content="#0f0f23" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="icon" type="image/png" href="/icons/icon-192.png" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <title>Score Keeper</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Verify full build**

```bash
npm run build
```

Expected: builds without errors, `dist/` contains service worker and manifest.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add PWA icons, meta tags, and wake lock for Live Game screen"
```

---

### Task 16: Final Integration Test

**Files:** (no new files — verification only)

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 2: Build production bundle**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 3: Preview production build**

```bash
npm run preview -- --port 4173 &
sleep 2
curl -s http://localhost:4173 | grep -o "Score Keeper"
kill %1
```

Expected: "Score Keeper" appears in the HTML response.

- [ ] **Step 4: Verify PWA manifest is served**

```bash
npm run preview -- --port 4173 &
sleep 2
curl -s http://localhost:4173/manifest.webmanifest | head -5
kill %1
```

Expected: JSON containing `"name": "Score Keeper"`.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git status
# If clean: no commit needed
# If changes exist:
git add -A
git commit -m "fix: address integration test issues"
```
