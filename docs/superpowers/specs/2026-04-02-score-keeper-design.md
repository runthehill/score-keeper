# Score Keeper — Design Spec

A mobile-first, offline-capable PWA for keeping score at kids' sports games. Supports Rugby Union, Soccer, Gaelic Football, and Basketball with optional player tracking and stats.

## Tech Stack

- **Vite + React + TypeScript** — fast build, strong typing
- **Tailwind CSS** — utility-first, mobile-first styling
- **wa-sqlite with OPFS** — persistent SQLite in the browser, survives tab close
- **vite-plugin-pwa** — service worker, installable, full offline support
- **React Router** — client-side SPA routing

## Project Structure

```
src/
  components/     # Shared UI (ScoreButton, Timer, PlayerList, EventLog, etc.)
  screens/        # Top-level views (Home, GameSetup, LiveGame, GameSummary, History)
  db/             # SQLite schema, queries, migration helpers
  sports/         # Sport-specific config objects
  hooks/          # React hooks (useGame, useTimer, useStats, useDB)
  utils/          # Export helpers (CSV, JSON), formatters
  types/          # TypeScript type definitions
public/
  icons/          # PWA icons and manifest assets
```

## Data Model

Three SQLite tables. All primary keys are UUIDs. All timestamps are ISO 8601 strings.

### games

| Column     | Type        | Notes                                                        |
|------------|-------------|--------------------------------------------------------------|
| id         | TEXT (UUID) | Primary key                                                  |
| sport      | TEXT        | 'rugby_union' / 'soccer' / 'gaelic_football' / 'basketball' |
| home_team  | TEXT        | Team name                                                    |
| away_team  | TEXT        | Team name                                                    |
| home_score | INTEGER     | Running total (derived from events, cached for quick access) |
| away_score | INTEGER     | Running total (derived from events, cached for quick access) |
| status     | TEXT        | 'in_progress' / 'completed'                                 |
| started_at | TEXT (ISO)  |                                                              |
| ended_at   | TEXT (ISO)  | Nullable                                                     |
| notes      | TEXT        | Optional game notes                                          |

### players

| Column  | Type        | Notes                                           |
|---------|-------------|-------------------------------------------------|
| id      | TEXT (UUID) | Primary key                                     |
| game_id | TEXT        | FK to games                                     |
| team    | TEXT        | 'home' / 'away'                                 |
| name    | TEXT        |                                                 |
| number  | INTEGER     | Jersey number, nullable                         |
| status  | TEXT        | 'active' / 'bench' / 'subbed_off'               |

### events

| Column         | Type        | Notes                                                                  |
|----------------|-------------|------------------------------------------------------------------------|
| id             | TEXT (UUID) | Primary key                                                            |
| game_id        | TEXT        | FK to games                                                            |
| player_id      | TEXT        | FK to players, nullable                                                |
| team           | TEXT        | 'home' / 'away'                                                       |
| event_type     | TEXT        | Sport-specific (see Sport Configurations below)                        |
| points         | INTEGER     | Score value of the event (0 for non-scoring events)                    |
| half_or_period | INTEGER     | Half/quarter/period number                                             |
| timestamp      | TEXT (ISO)  | When it happened                                                       |

Score is derived by summing `points` from events grouped by team. The `home_score`/`away_score` fields on the games table are cached totals updated on each event for quick display.

## Sport Configurations

Each sport is a config object — no sport-specific code paths, just data:

```typescript
interface SportConfig {
  id: string
  name: string
  icon: string
  periods: { count: number; name: string }
  scoreDisplay: 'single' | 'split'
  scoringEvents: { type: string; label: string; points: number; icon: string }[]
  statEvents: { type: string; label: string; icon: string }[]
  cardEvents?: { type: string; label: string; color: string }[]
}
```

### Rugby Union
- **Periods:** 2 halves
- **Score display:** single total
- **Scoring:** try (5), conversion (2), penalty (3), drop goal (3)
- **Cards:** yellow, red

### Soccer
- **Periods:** 2 halves
- **Score display:** single total
- **Scoring:** goal (1)
- **Stats:** assist
- **Cards:** yellow, red

### Gaelic Football
- **Periods:** 2 halves
- **Score display:** split — "1-05" format (goals-points), total derived as goals×3 + points
- **Scoring:** goal (3), point (1)
- **Cards:** yellow, black, red

### Basketball
- **Periods:** 4 quarters
- **Score display:** single total
- **Scoring:** free throw (1), field goal (2), three pointer (3)
- **Stats:** rebound, steal, foul

Adding a new sport is just adding a new config object.

## Screens & Navigation

Bottom tab bar with 3 tabs: **New Game | History | Settings**

### Home
- Sport picker (4 sport cards)
- Any in-progress game shown prominently with "Resume" action
- Recent completed games list

### Game Setup
- Select sport (pre-selected if coming from Home sport picker)
- Home and away team names (with defaults from settings)
- Optional: add players with name and jersey number, mark as starting or bench
- Start game button

### Live Game (Stacked Layout)
The primary screen. Top to bottom:
1. **Sport badge + current period** — top bar
2. **Scoreboard** — large score numbers, team names, centered. Team colors: home = green (#4ecca3), away = red (#e94560)
3. **Timer** — count-up stopwatch below the score. Tap to start/pause. Not official match time, just a reference. Timer value recorded on each event
4. **Home team scoring buttons** — horizontal row, labeled with event type and point value, colored green
5. **Away team scoring buttons** — horizontal row, colored red
6. **Actions row** — Card, Sub, Undo, Half/Quarter buttons
7. **Recent events log** — scrollable list showing timestamp, event type, team, running score

### Game Summary
- Shown when game is ended
- Final score, period-by-period breakdown
- Per-player stats (if players were tracked)
- Export buttons: CSV and JSON
- Share sheet integration on mobile

### History
- List of all past games, newest first
- Filterable by sport
- Tap to open Game Detail — same layout as Game Summary (final score, period breakdown, per-player stats, export) but for a historical game

### Settings
- Default team names
- Dark/light mode toggle (dark by default)
- Data management: export all data, clear all data

## Key Interactions

### Scoring
- Tap scoring button → event recorded immediately, score updates
- If players are set up: quick bottom sheet slides up with player names/numbers for attribution. "Skip" option always available — never blocks scoring flow

### Substitutions
- Sub button in actions row → team picker (Home/Away) → bottom sheet showing active players for that team
- Tap player coming off → tap player coming on (from bench list or type new name)
- Records paired `substitution_off` and `substitution_on` events with same timestamp
- Player status updates: off player → 'subbed_off', on player → 'active'
- Player picker for scoring only shows currently active players

### Undo
- Removes the most recent event
- Confirmation toast with brief delay to cancel
- Recalculates cached score

### Period Management
- Half/Quarter button advances the period with confirmation prompt
- Timer resets to 0:00 on period advance

### End Game
- Long-press or menu option
- Confirmation dialog
- Transitions to Game Summary

## Export

### CSV Format
One row per event:
```
game_id, sport, home_team, away_team, timestamp, period, event_type, team, player_name, player_number, points, home_score_after, away_score_after
```

### JSON Format
Full game object with nested arrays:
```json
{
  "game": { "id", "sport", "home_team", "away_team", "started_at", "ended_at", "final_score" },
  "players": [...],
  "events": [...]
}
```

Both formats available per-game from Game Summary and Game Detail, plus bulk export of all data from Settings.

## PWA & Offline Behavior

- Service worker caches all app assets on first load — fully functional offline thereafter
- All data stored in local SQLite via OPFS — no network required for any operation
- Installable to home screen (standalone display mode, no browser chrome)
- Wake lock requested on Live Game screen to prevent phone sleeping mid-match
- Schema uses UUIDs and ISO timestamps throughout — sync-ready for future backend integration

## Visual Design

- **Dark theme by default** — better for outdoor sideline use, with light mode option
- **Mobile-first** — designed for one-handed phone use
- **Sporty, clean aesthetic** — dark backgrounds (#0f0f23, #1a1a2e), accent colors for teams
- **Large touch targets** — scoring buttons minimum 44px tall, easy to hit with cold fingers
- **High contrast scores** — oversized score numbers, easily readable at a glance
- **Color-coded teams** — green (#4ecca3) for home, red (#e94560) for away, consistent throughout
