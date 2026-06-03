# Persistent Match Clock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the match clock a single, persisted source of truth that survives navigation/reload, keeps real time while away, pauses for half-time, and drives the event-log times.

**Architecture:** The clock is stored on the `games` row as an *anchored stopwatch* (`clock_base_ms` banked + `clock_anchor` wall-clock instant while running) so a running clock reflects true elapsed time with no per-second writes. Pure helpers in `src/utils/clock.ts` compute elapsed seconds and produce field patches for each transition; `useGame` owns the actions and a 1-second display tick; `EventLog` reads a per-event `clock_seconds` snapshot (taken only once the clock has been started), falling back to today's wall-clock time otherwise.

**Tech Stack:** Vite + React 19 + TypeScript, sql.js (SQLite WASM) persisted to IndexedDB, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-06-03-persistent-match-clock-design.md`

---

## Shared Reference (used across tasks)

These signatures are defined in Task 1 and consumed later. Keep names exact.

```ts
// src/utils/clock.ts
export interface ClockState {
  clock_running: number;   // 0 | 1
  clock_base_ms: number;
  clock_anchor: string | null;
  clock_active: number;    // 0 | 1
}
// `type` (not `interface`) so it is assignable to updateClock's Record<string, unknown> param.
export type ClockPatch = {
  clock_running?: number;
  clock_base_ms?: number;
  clock_anchor?: string | null;
  clock_active?: number;
  current_period?: number;
  current_period_label?: string | null;
};
```

New persisted columns:
- `games.clock_running INTEGER NOT NULL DEFAULT 0`
- `games.clock_base_ms INTEGER NOT NULL DEFAULT 0`
- `games.clock_anchor TEXT`
- `games.clock_active INTEGER NOT NULL DEFAULT 0`
- `games.current_period INTEGER NOT NULL DEFAULT 1`
- `games.current_period_label TEXT`
- `events.clock_seconds INTEGER`

New optional type fields (additive, so existing object literals keep compiling):
- `Game`: `clock_running?`, `clock_base_ms?`, `clock_anchor?: string | null`, `clock_active?`, `current_period?`, `current_period_label?: string | null`
- `GameEvent`: `clock_seconds?: number | null`
- `GameMetadata`: `periodLengthMinutes?: number`
- `AppSettings`: `periodLengths?: Partial<Record<Sport, number>>`

---

## Task 1: Pure clock helpers

**Files:**
- Create: `src/utils/clock.ts`
- Test: `src/utils/clock.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/clock.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  clockSeconds, periodStartMs, periodEndSeconds, isOvertime,
  computeStart, computePause, computeToggle, computeSetTime, computeNextPeriod,
  type ClockState,
} from './clock';

const paused = (base = 0): ClockState => ({ clock_running: 0, clock_base_ms: base, clock_anchor: null, clock_active: base > 0 ? 1 : 0 });
const running = (anchorMs: number, base = 0): ClockState => ({ clock_running: 1, clock_base_ms: base, clock_anchor: new Date(anchorMs).toISOString(), clock_active: 1 });

describe('clockSeconds', () => {
  it('reads banked time when paused', () => {
    expect(clockSeconds(paused(5000), 999_999)).toBe(5);
  });
  it('adds live elapsed time while running (anchored to wall-clock)', () => {
    const now = 1_000_000;
    expect(clockSeconds(running(now - 120_000), now)).toBe(120); // 2 min elapsed while "away"
  });
  it('adds live time on top of banked base', () => {
    const now = 1_000_000;
    expect(clockSeconds(running(now - 3000, 5000), now)).toBe(8);
  });
});

describe('period boundaries (timed mode)', () => {
  it('parks period N at (N-1)*length', () => {
    expect(periodStartMs(2, 30, 2)).toBe(30 * 60_000);
    expect(periodStartMs(1, 30, 2)).toBe(0);
  });
  it('resets extra periods to 0 even when a length is set', () => {
    expect(periodStartMs(3, 30, 2)).toBe(0);
  });
  it('free mode (no length) always starts at 0', () => {
    expect(periodStartMs(2, null, 2)).toBe(0);
  });
  it('period end is N*length in regulation, null in free mode / extra time', () => {
    expect(periodEndSeconds(1, 30, 2)).toBe(30 * 60);
    expect(periodEndSeconds(2, 30, 2)).toBe(60 * 60);
    expect(periodEndSeconds(3, 30, 2)).toBeNull();
    expect(periodEndSeconds(1, null, 2)).toBeNull();
  });
});

describe('isOvertime', () => {
  it('flips strictly after the period end', () => {
    const now = 0;
    expect(isOvertime(paused(30 * 60 * 1000), now, 1, 30, 2)).toBe(false);       // exactly at end
    expect(isOvertime(paused((30 * 60 + 1) * 1000), now, 1, 30, 2)).toBe(true);  // 1s past
  });
  it('never overtime in free mode', () => {
    expect(isOvertime(paused(99 * 60 * 1000), 0, 1, null, 2)).toBe(false);
  });
});

describe('transitions', () => {
  it('computeStart anchors now and marks active', () => {
    const p = computeStart(paused(0), 1_000_000);
    expect(p).toEqual({ clock_running: 1, clock_anchor: new Date(1_000_000).toISOString(), clock_active: 1 });
  });
  it('computeStart is a no-op when already running', () => {
    expect(computeStart(running(0), 1_000_000)).toEqual({});
  });
  it('computePause banks elapsed and clears the anchor', () => {
    const now = 1_000_000;
    expect(computePause(running(now - 8000, 0), now)).toEqual({ clock_running: 0, clock_anchor: null, clock_base_ms: 8000 });
  });
  it('computeToggle pauses a running clock and starts a paused one', () => {
    const now = 1_000_000;
    expect(computeToggle(running(now - 1000), now).clock_running).toBe(0);
    expect(computeToggle(paused(0), now).clock_running).toBe(1);
  });
  it('computeSetTime sets base and re-anchors only while running', () => {
    const now = 1_000_000;
    expect(computeSetTime(paused(0), 750, now)).toEqual({ clock_base_ms: 750_000, clock_active: 1 });
    expect(computeSetTime(running(0), 750, now)).toEqual({ clock_base_ms: 750_000, clock_active: 1, clock_anchor: new Date(now).toISOString() });
  });
  it('computeNextPeriod parks the clock at the new period start, paused', () => {
    expect(computeNextPeriod(2, 30, 2, null)).toEqual({
      current_period: 2, current_period_label: null,
      clock_running: 0, clock_anchor: null, clock_base_ms: 30 * 60_000,
    });
    expect(computeNextPeriod(3, 30, 2, 'Extra Time')).toEqual({
      current_period: 3, current_period_label: 'Extra Time',
      clock_running: 0, clock_anchor: null, clock_base_ms: 0,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/clock.test.ts`
Expected: FAIL — `Failed to resolve import './clock'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/clock.ts`:

```ts
export interface ClockState {
  clock_running: number;   // 0 | 1
  clock_base_ms: number;
  clock_anchor: string | null;
  clock_active: number;    // 0 | 1
}

export type ClockPatch = {
  clock_running?: number;
  clock_base_ms?: number;
  clock_anchor?: string | null;
  clock_active?: number;
  current_period?: number;
  current_period_label?: string | null;
};

export function clockElapsedMs(state: ClockState, now: number): number {
  const live = state.clock_running && state.clock_anchor ? now - Date.parse(state.clock_anchor) : 0;
  return Math.max(0, state.clock_base_ms + live);
}

export function clockSeconds(state: ClockState, now: number): number {
  return Math.floor(clockElapsedMs(state, now) / 1000);
}

export function periodStartMs(period: number, lengthMin: number | null, periodCount: number): number {
  if (lengthMin && period <= periodCount) return (period - 1) * lengthMin * 60_000;
  return 0;
}

export function periodEndSeconds(period: number, lengthMin: number | null, periodCount: number): number | null {
  if (lengthMin && period <= periodCount) return period * lengthMin * 60;
  return null;
}

export function isOvertime(state: ClockState, now: number, period: number, lengthMin: number | null, periodCount: number): boolean {
  const end = periodEndSeconds(period, lengthMin, periodCount);
  return end != null && clockSeconds(state, now) > end;
}

export function computeStart(state: ClockState, now: number): ClockPatch {
  if (state.clock_running) return {};
  return { clock_running: 1, clock_anchor: new Date(now).toISOString(), clock_active: 1 };
}

export function computePause(state: ClockState, now: number): ClockPatch {
  if (!state.clock_running) return {};
  return { clock_running: 0, clock_anchor: null, clock_base_ms: clockElapsedMs(state, now) };
}

export function computeToggle(state: ClockState, now: number): ClockPatch {
  return state.clock_running ? computePause(state, now) : computeStart(state, now);
}

export function computeSetTime(state: ClockState, seconds: number, now: number): ClockPatch {
  const patch: ClockPatch = { clock_base_ms: Math.max(0, Math.floor(seconds)) * 1000, clock_active: 1 };
  if (state.clock_running) patch.clock_anchor = new Date(now).toISOString();
  return patch;
}

export function computeNextPeriod(newPeriod: number, lengthMin: number | null, periodCount: number, label: string | null): ClockPatch {
  return {
    current_period: newPeriod,
    current_period_label: label ?? null,
    clock_running: 0,
    clock_anchor: null,
    clock_base_ms: periodStartMs(newPeriod, lengthMin, periodCount),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/clock.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/utils/clock.ts src/utils/clock.test.ts
git commit -m "feat: pure anchored-stopwatch clock helpers"
```

---

## Task 2: Schema migration for clock columns

**Files:**
- Modify: `src/db/schema.ts`
- Test: `src/db/schema.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/db/schema.test.ts` (inside the file, after the existing `describe` block):

```ts
describe('schema clock migration', () => {
  function clockOf(db: Database, id: string) {
    const stmt = db.prepare('SELECT clock_running, clock_base_ms, clock_anchor, clock_active, current_period, current_period_label FROM games WHERE id = ?');
    stmt.bind([id]);
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }

  it('fresh DB has clock columns with defaults', () => {
    const db = new SQL.Database();
    createTables(db);
    db.run("INSERT INTO games (id, sport, home_team, away_team, started_at) VALUES ('g1','soccer','A','B','2026-01-01T00:00:00Z')");
    expect(clockOf(db, 'g1')).toEqual({
      clock_running: 0, clock_base_ms: 0, clock_anchor: null, clock_active: 0, current_period: 1, current_period_label: null,
    });
  });

  it('adds events.clock_seconds (null by default)', () => {
    const db = new SQL.Database();
    createTables(db);
    db.run("INSERT INTO games (id, sport, home_team, away_team, started_at) VALUES ('g1','soccer','A','B','2026-01-01T00:00:00Z')");
    db.run("INSERT INTO events (id, game_id, team, event_type, points, half_or_period, timestamp) VALUES ('e1','g1','home','goal',1,1,'2026-01-01T00:01:00Z')");
    const stmt = db.prepare('SELECT clock_seconds FROM events WHERE id = ?');
    stmt.bind(['e1']);
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    expect(row.clock_seconds).toBeNull();
  });

  it('migrates a legacy DB lacking the clock columns', () => {
    const db = new SQL.Database();
    db.run(`CREATE TABLE games (id TEXT PRIMARY KEY, sport TEXT NOT NULL, home_team TEXT NOT NULL, away_team TEXT NOT NULL, home_score INTEGER NOT NULL DEFAULT 0, away_score INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'in_progress', started_at TEXT NOT NULL, ended_at TEXT, notes TEXT NOT NULL DEFAULT '')`);
    db.run("INSERT INTO games (id, sport, home_team, away_team, started_at) VALUES ('old','rugby_union','X','Y','2026-01-01T00:00:00Z')");
    createTables(db); // runs the migration
    expect(clockOf(db, 'old')).toEqual({
      clock_running: 0, clock_base_ms: 0, clock_anchor: null, clock_active: 0, current_period: 1, current_period_label: null,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/db/schema.test.ts`
Expected: FAIL — `no such column: clock_running`.

- [ ] **Step 3: Write minimal implementation**

In `src/db/schema.ts`, add the new columns to the `games` and `events` `CREATE TABLE` statements, and add migration calls.

In the `games` `CREATE TABLE` (after the `away_secondary` line, before the closing `)`), add:

```
      ,clock_running INTEGER NOT NULL DEFAULT 0,
      clock_base_ms INTEGER NOT NULL DEFAULT 0,
      clock_anchor TEXT,
      clock_active INTEGER NOT NULL DEFAULT 0,
      current_period INTEGER NOT NULL DEFAULT 1,
      current_period_label TEXT
```

In the `events` `CREATE TABLE` (after the `timestamp TEXT NOT NULL` line), add:

```
      ,clock_seconds INTEGER
```

At the end of `createTables`, after the existing colour `addColumn` calls, add:

```ts
  // Migration: persisted match-clock state (older DBs predate these columns).
  addColumn(db, 'games', 'clock_running', 'INTEGER NOT NULL DEFAULT 0');
  addColumn(db, 'games', 'clock_base_ms', 'INTEGER NOT NULL DEFAULT 0');
  addColumn(db, 'games', 'clock_anchor', 'TEXT');
  addColumn(db, 'games', 'clock_active', 'INTEGER NOT NULL DEFAULT 0');
  addColumn(db, 'games', 'current_period', 'INTEGER NOT NULL DEFAULT 1');
  addColumn(db, 'games', 'current_period_label', 'TEXT');
  addColumn(db, 'events', 'clock_seconds', 'INTEGER');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/db/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/db/schema.test.ts
git commit -m "feat: persist match-clock columns in schema + migration"
```

---

## Task 3: Types + queries wiring

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/db/queries.ts`
- Test: `src/db/queries.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/db/queries.test.ts` (after the existing blocks; the `updateClock` import is added in Step 3):

```ts
describe('clock persistence', () => {
  it('round-trips clock fields and defaults on a fresh game', () => {
    insertGame(db, { id: 'gc', sport: 'gaelic_football', home_team: 'A', away_team: 'B', started_at: '2026-01-01T00:00:00.000Z' });
    const g = getGame(db, 'gc')!;
    expect(g.clock_running).toBe(0);
    expect(g.clock_base_ms).toBe(0);
    expect(g.clock_anchor).toBeNull();
    expect(g.clock_active).toBe(0);
    expect(g.current_period).toBe(1);
    expect(g.current_period_label).toBeNull();
  });

  it('updateClock applies a partial patch', () => {
    insertGame(db, { id: 'gc', sport: 'soccer', home_team: 'A', away_team: 'B', started_at: '2026-01-01T00:00:00.000Z' });
    updateClock(db, 'gc', { clock_running: 1, clock_anchor: '2026-01-01T00:05:00.000Z', clock_active: 1 });
    updateClock(db, 'gc', { current_period: 2, current_period_label: 'Extra Time' });
    const g = getGame(db, 'gc')!;
    expect(g.clock_running).toBe(1);
    expect(g.clock_anchor).toBe('2026-01-01T00:05:00.000Z');
    expect(g.clock_active).toBe(1);
    expect(g.current_period).toBe(2);
    expect(g.current_period_label).toBe('Extra Time');
  });

  it('stores and reads back an event clock_seconds snapshot, null when absent', () => {
    insertGame(db, { id: 'gc', sport: 'soccer', home_team: 'A', away_team: 'B', started_at: '2026-01-01T00:00:00.000Z' });
    insertEvent(db, { id: 'e1', game_id: 'gc', player_id: null, team: 'home', event_type: 'goal', points: 1, half_or_period: 1, timestamp: '2026-01-01T00:01:00.000Z', clock_seconds: 75 });
    insertEvent(db, { id: 'e2', game_id: 'gc', player_id: null, team: 'away', event_type: 'goal', points: 1, half_or_period: 1, timestamp: '2026-01-01T00:02:00.000Z' });
    const [a, b] = listEvents(db, 'gc');
    expect(a.clock_seconds).toBe(75);
    expect(b.clock_seconds).toBeNull();
  });
});
```

Add `updateClock` to the existing import from `./queries` at the top of the test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/db/queries.test.ts`
Expected: FAIL — `updateClock is not exported` / `clock_running` undefined.

- [ ] **Step 3: Write minimal implementation**

In `src/types/index.ts`, extend the interfaces (additive optional fields):

```ts
export interface Game {
  // ...existing fields...
  clock_running?: number;
  clock_base_ms?: number;
  clock_anchor?: string | null;
  clock_active?: number;
  current_period?: number;
  current_period_label?: string | null;
}

export interface GameEvent {
  // ...existing fields...
  clock_seconds?: number | null;
}

export interface GameMetadata {
  periodCount?: number;
  periodName?: string;
  periodLengthMinutes?: number;
}
```

In `src/db/queries.ts`:

Extend `rowToGame` (add to the returned object):

```ts
    clock_running: (row.clock_running as number) ?? 0,
    clock_base_ms: (row.clock_base_ms as number) ?? 0,
    clock_anchor: (row.clock_anchor as string) || null,
    clock_active: (row.clock_active as number) ?? 0,
    current_period: (row.current_period as number) ?? 1,
    current_period_label: (row.current_period_label as string) || null,
```

Extend `rowToEvent` (add to the returned object):

```ts
    clock_seconds: row.clock_seconds == null ? null : (row.clock_seconds as number),
```

Replace `insertEvent` to persist `clock_seconds`:

```ts
export function insertEvent(db: Database, event: GameEvent) {
  db.run('INSERT INTO events (id, game_id, player_id, team, event_type, points, half_or_period, timestamp, clock_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [event.id, event.game_id, event.player_id, event.team, event.event_type, event.points, event.half_or_period, event.timestamp, event.clock_seconds ?? null]);
}
```

Add `updateClock` (place after `updateGameColors`). The column allowlist mirrors the `schema.ts` "never interpolate untrusted input" convention:

```ts
const CLOCK_COLUMNS = new Set([
  'clock_running', 'clock_base_ms', 'clock_anchor', 'clock_active', 'current_period', 'current_period_label',
]);

export function updateClock(db: Database, id: string, patch: Record<string, unknown>) {
  const cols = Object.keys(patch).filter((c) => CLOCK_COLUMNS.has(c));
  if (cols.length === 0) return;
  const assignments = cols.map((c) => `${c} = ?`).join(', ');
  const values = cols.map((c) => patch[c] as BindParams[number]);
  db.run(`UPDATE games SET ${assignments} WHERE id = ?`, [...values, id]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/db/queries.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the whole project still type-checks**

Run: `npm run build`
Expected: PASS — the new `Game`/`GameEvent` fields are optional, so the `previewGame` literal in `GameSetup.tsx` and all test fixtures keep compiling unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/db/queries.ts src/db/queries.test.ts
git commit -m "feat: clock fields on types + updateClock/event snapshot queries"
```

---

## Task 4: Per-sport default period length in settings

**Files:**
- Modify: `src/utils/settings.ts`
- Test: `src/utils/settings.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/utils/settings.test.ts`:

```ts
describe('periodLengths setting', () => {
  it('defaults to an empty object when unset', () => {
    localStorage.clear();
    expect(loadSettings().periodLengths).toEqual({});
  });
  it('round-trips a per-sport length', () => {
    localStorage.clear();
    saveSettings({ darkMode: true, squads: {}, periodLengths: { gaelic_football: 30 } });
    expect(loadSettings().periodLengths).toEqual({ gaelic_football: 30 });
  });
});
```

(Confirm `loadSettings`/`saveSettings` are imported at the top of the file; add them if missing.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/settings.test.ts`
Expected: FAIL — `periodLengths` is `undefined`.

- [ ] **Step 3: Write minimal implementation**

In `src/utils/settings.ts`:

```ts
export interface AppSettings {
  darkMode: boolean;
  squads: Partial<Record<Sport, DefaultSquad>>;
  periodLengths?: Partial<Record<Sport, number>>;
}
```

In `loadSettings`, change both return sites to include `periodLengths: {}` before spreading/parsing:

```ts
      return { darkMode: true, squads: {}, periodLengths: {}, ...parsed };
```
```ts
  return { darkMode: true, squads: {}, periodLengths: {} };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/settings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/settings.ts src/utils/settings.test.ts
git commit -m "feat: per-sport default period length in settings"
```

---

## Task 5: Clock actions + display tick in useGame

**Files:**
- Modify: `src/hooks/useGame.ts`

No new unit test (this hook needs the `useDB` context and SQLite; its logic is the already-tested `clock.ts` helpers plus glue). Verified via build + lint here and manual checks in Task 8.

- [ ] **Step 1: Add imports**

In `src/hooks/useGame.ts`, add query import `updateClock`. Add a clock-helpers import (the existing React import line is unchanged — `useState`/`useCallback`/`useEffect`/`useMemo` are already imported):

```ts
// ...add updateClock to the existing '../db/queries' import...
import {
  clockSeconds as computeClockSeconds, isOvertime as computeIsOvertime,
  computeToggle, computeStart, computePause, computeSetTime, computeNextPeriod,
  type ClockState,
} from '../utils/clock';
```

- [ ] **Step 2: Build a ClockState from a game, and add the display tick**

After `periodName` is derived, add the period length and a helper:

```ts
  const periodLengthMinutes = metadata.periodLengthMinutes ?? null;

  function toClockState(g: Game): ClockState {
    return {
      clock_running: g.clock_running ?? 0,
      clock_base_ms: g.clock_base_ms ?? 0,
      clock_anchor: g.clock_anchor ?? null,
      clock_active: g.clock_active ?? 0,
    };
  }
```

Add a 1-second re-render tick that runs only while the clock is running:

```ts
  const [, setTick] = useState(0);
  const running = !!game?.clock_running;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
```

- [ ] **Step 3: Derive the live display values**

After the tick effect:

```ts
  const clockState = game ? toClockState(game) : { clock_running: 0, clock_base_ms: 0, clock_anchor: null, clock_active: 0 };
  const liveSeconds = computeClockSeconds(clockState, Date.now());
  const clockIsOvertime = game ? computeIsOvertime(clockState, Date.now(), currentPeriod, periodLengthMinutes, periodCount) : false;
  const clockActive = !!clockState.clock_active;
  const currentPeriodLabel = game?.current_period_label ?? null;
```

- [ ] **Step 4: Add the clock action dispatcher**

```ts
  const applyClockTransition = useCallback(
    (fn: (state: ClockState, now: number) => Parameters<typeof updateClock>[2]) => {
      const g = getGame(db, gameId);
      if (!g) return;
      updateClock(db, gameId, fn(toClockState(g), Date.now()));
      persist();
      reload();
    },
    [db, gameId, persist, reload]
  );

  const toggleClock = useCallback(() => applyClockTransition(computeToggle), [applyClockTransition]);
  const startClock = useCallback(() => applyClockTransition(computeStart), [applyClockTransition]);
  const pauseClock = useCallback(() => applyClockTransition(computePause), [applyClockTransition]);
  const setClockSeconds = useCallback(
    (seconds: number) => applyClockTransition((state, now) => computeSetTime(state, seconds, now)),
    [applyClockTransition]
  );
```

- [ ] **Step 5: Snapshot clock_seconds on every recorded event**

Add a helper and use it in `addEvent` and `substitute`:

```ts
  const snapshotClockSeconds = useCallback((): number | null => {
    const g = getGame(db, gameId);
    if (!g) return null;
    const state = toClockState(g);
    return state.clock_active ? computeClockSeconds(state, Date.now()) : null;
  }, [db, gameId]);
```

In `addEvent`, add `clock_seconds: snapshotClockSeconds(),` to the `event` object and add `snapshotClockSeconds` to its dependency array.

In `substitute`, compute `const cs = snapshotClockSeconds();` at the top of the callback and add `clock_seconds: cs,` to both `offEvent` and `onEvent`; add `snapshotClockSeconds` to its dependency array.

- [ ] **Step 6: Persist period + clock on period advance, and read period back on reload**

Replace `advancePeriod` with:

```ts
  const advancePeriod = useCallback(
    (label: string | null = null) => {
      const g = getGame(db, gameId);
      if (!g) return;
      const meta = parseMetadata(g);
      const cfg = getSportConfig(g.sport);
      const len = meta.periodLengthMinutes ?? null;
      const count = meta.periodCount ?? cfg.periods.count;
      const newPeriod = (g.current_period ?? 1) + 1;
      updateClock(db, gameId, computeNextPeriod(newPeriod, len, count, label));
      persist();
      reload();
    },
    [db, gameId, persist, reload]
  );
```

In `reload`, replace the period-derivation block with a preference for the persisted value:

```ts
      if (g.current_period != null) {
        setCurrentPeriod(g.current_period);
      } else if (evts.length > 0) {
        const maxPeriod = Math.max(...evts.map((e) => e.half_or_period));
        setCurrentPeriod(maxPeriod);
      }
```

- [ ] **Step 7: Export the new API**

Add to the returned object: `liveSeconds`, `clockRunning: running`, `clockActive`, `clockIsOvertime`, `currentPeriodLabel`, `periodLengthMinutes`, `toggleClock`, `startClock`, `pauseClock`, `setClockSeconds`. Keep `advancePeriod` (signature now accepts an optional label).

- [ ] **Step 8: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: PASS. (Existing `useGame` consumers still compile; new fields are additive.)

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useGame.ts
git commit -m "feat: persisted clock actions, display tick, and event snapshots in useGame"
```

---

## Task 6: Timer overtime/edit affordance + clock-edit modal

**Files:**
- Modify: `src/components/Timer.tsx`
- Create: `src/components/ClockEditModal.tsx`
- Test: `src/components/ClockEditModal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/ClockEditModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClockEditModal from './ClockEditModal';

describe('ClockEditModal', () => {
  it('pre-fills mm:ss from initialSeconds and returns total seconds on Set', async () => {
    const user = userEvent.setup();
    const onSet = vi.fn();
    render(<ClockEditModal initialSeconds={125} onSet={onSet} onClose={() => {}} />);

    const mins = screen.getByLabelText('Minutes') as HTMLInputElement;
    const secs = screen.getByLabelText('Seconds') as HTMLInputElement;
    expect(mins.value).toBe('2');
    expect(secs.value).toBe('5');

    await user.clear(mins);
    await user.type(mins, '12');
    await user.clear(secs);
    await user.type(secs, '30');
    await user.click(screen.getByRole('button', { name: 'Set' }));

    expect(onSet).toHaveBeenCalledWith(750);
  });

  it('clamps seconds into 0-59 and ignores negatives', async () => {
    const user = userEvent.setup();
    const onSet = vi.fn();
    render(<ClockEditModal initialSeconds={0} onSet={onSet} onClose={() => {}} />);
    await user.clear(screen.getByLabelText('Minutes'));
    await user.type(screen.getByLabelText('Minutes'), '5');
    await user.clear(screen.getByLabelText('Seconds'));
    await user.type(screen.getByLabelText('Seconds'), '90');
    await user.click(screen.getByRole('button', { name: 'Set' }));
    expect(onSet).toHaveBeenCalledWith(5 * 60 + 59);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ClockEditModal.test.tsx`
Expected: FAIL — cannot resolve `./ClockEditModal`.

- [ ] **Step 3: Write the modal**

Create `src/components/ClockEditModal.tsx`:

```tsx
import { useState } from 'react';

interface Props {
  initialSeconds: number;
  onSet: (seconds: number) => void;
  onClose: () => void;
}

export default function ClockEditModal({ initialSeconds, onSet, onClose }: Props) {
  const [mins, setMins] = useState(String(Math.floor(initialSeconds / 60)));
  const [secs, setSecs] = useState(String(initialSeconds % 60));

  const handleSet = () => {
    const m = Math.max(0, Math.floor(Number(mins) || 0));
    const s = Math.min(59, Math.max(0, Math.floor(Number(secs) || 0)));
    onSet(m * 60 + s);
    onClose();
  };

  const field = 'w-20 bg-surface-2 border border-line rounded-xl px-3 py-3 text-txt text-center text-2xl font-score tabular-nums focus:outline-none focus:border-txt-3';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-surface rounded-2xl border border-line p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold mb-4 text-txt">Set the clock</h3>
        <div className="flex items-center justify-center gap-3 mb-5">
          <label className="flex flex-col items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-txt-3">
            Minutes
            <input aria-label="Minutes" type="number" inputMode="numeric" min={0} value={mins} onChange={(e) => setMins(e.target.value)} className={field} />
          </label>
          <span className="text-2xl font-score text-txt-3 pt-5">:</span>
          <label className="flex flex-col items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-txt-3">
            Seconds
            <input aria-label="Seconds" type="number" inputMode="numeric" min={0} max={59} value={secs} onChange={(e) => setSecs(e.target.value)} className={field} />
          </label>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 border border-line rounded-xl text-sm font-medium text-txt-2 press">Cancel</button>
          <button type="button" onClick={handleSet} className="flex-1 py-3 bg-txt text-bg rounded-xl text-sm font-bold press">Set</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ClockEditModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add overtime + edit affordance to Timer**

Replace `src/components/Timer.tsx` with (adds `overtime` and `onEdit`; tapping the pencil does not toggle the clock):

```tsx
import { formatTimer } from '../utils/format';
import { Play, Pause, Edit } from './icons';

interface Props {
  seconds: number;
  running: boolean;
  overtime?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  periodLabel: string;
}

function LiveDot() {
  return (
    <span className="live-dot relative inline-block w-[7px] h-[7px] text-danger" aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-current" />
    </span>
  );
}

export default function Timer({ seconds, running, overtime = false, onToggle, onEdit, periodLabel }: Props) {
  return (
    <div className="w-full flex items-center gap-2">
      <button
        onClick={onToggle}
        aria-label={running ? 'Pause timer' : 'Start timer'}
        className="flex-1 flex items-center justify-center gap-3.5 bg-surface-2 border border-line rounded-2xl py-2.5 px-4 text-txt press"
      >
        <span
          className={`grid place-items-center w-[30px] h-[30px] rounded-full ${running ? 'bg-txt text-bg' : 'text-txt-2'}`}
          style={running ? undefined : { boxShadow: 'inset 0 0 0 1px var(--line-2)' }}
        >
          {running ? <Pause size={15} /> : <Play size={14} />}
        </span>
        <span className={`font-score font-semibold text-[30px] leading-none tabular-nums tracking-[0.01em] ${overtime ? 'text-danger' : ''}`}>
          {formatTimer(seconds)}
        </span>
        <span className="flex items-center gap-1.5 ml-0.5">
          {running && <LiveDot />}
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-txt-3">{periodLabel}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit clock"
        className="w-11 h-11 shrink-0 grid place-items-center rounded-2xl bg-surface-2 border border-line text-txt-2 press"
      >
        <Edit size={16} />
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Run full suite + build**

Run: `npx vitest run && npm run build`
Expected: PASS. (No existing test renders `Timer` directly; `LiveGame` is updated in Task 8.)

- [ ] **Step 7: Commit**

```bash
git add src/components/Timer.tsx src/components/ClockEditModal.tsx src/components/ClockEditModal.test.tsx
git commit -m "feat: overtime styling + clock edit affordance and modal"
```

---

## Task 7: Event-log times from the clock snapshot

**Files:**
- Modify: `src/components/EventLog.tsx`
- Test: `src/components/EventLog.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `src/components/EventLog.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventLog from './EventLog';
import type { Game, GameEvent } from '../types';

// Match the project convention (see GameCard.test.tsx): mock the theme hook rather than wrap a provider.
vi.mock('../hooks/useTheme', () => ({ useThemeContext: () => ({ dark: true, toggle: vi.fn() }) }));

const game: Game = {
  id: 'g1', sport: 'soccer', home_team: 'A', away_team: 'B', home_score: 1, away_score: 0,
  status: 'in_progress', started_at: '2026-01-01T00:00:00.000Z', ended_at: null, notes: '',
  home_primary: '#15171C', home_secondary: '#FFFFFF', away_primary: '#1E63D6', away_secondary: '#FFFFFF',
};

function renderLog(events: GameEvent[]) {
  return render(<EventLog events={events} players={[]} game={game} gameStartedAt={game.started_at} />);
}

describe('EventLog times', () => {
  it('uses the clock snapshot when present', () => {
    renderLog([
      { id: 'e1', game_id: 'g1', player_id: null, team: 'home', event_type: 'goal', points: 1, half_or_period: 1, timestamp: '2026-01-01T00:40:00.000Z', clock_seconds: 125 },
    ]);
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('falls back to wall-clock since kickoff when no snapshot', () => {
    renderLog([
      { id: 'e1', game_id: 'g1', player_id: null, team: 'home', event_type: 'goal', points: 1, half_or_period: 1, timestamp: '2026-01-01T00:03:00.000Z' },
    ]);
    expect(screen.getByText('03:00')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/EventLog.test.tsx`
Expected: FAIL — both events render `00:00`/wall-clock; the snapshot case shows the wrong value.

- [ ] **Step 3: Implement**

In `src/components/EventLog.tsx`, add `formatTimer` to the `format` import:

```ts
import { formatEventTime, formatTimer, runningTally, eventLabel } from '../utils/format';
```

Replace the time `<span>` (currently `{formatEventTime(e.timestamp, gameStartedAt)}`) with:

```tsx
              <span className="font-score font-semibold text-sm text-txt-3 w-[42px] tabular-nums shrink-0">
                {e.clock_seconds != null ? formatTimer(e.clock_seconds) : formatEventTime(e.timestamp, gameStartedAt)}
              </span>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/EventLog.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/EventLog.tsx src/components/EventLog.test.tsx
git commit -m "feat: event-log times read the clock snapshot with wall-clock fallback"
```

---

## Task 8: Wire the persisted clock into LiveGame

**Files:**
- Modify: `src/screens/LiveGame.tsx`
- Delete: `src/hooks/useTimer.ts`, `src/hooks/useTimer.test.ts`

- [ ] **Step 1: Swap the timer source**

In `src/screens/LiveGame.tsx`:

Remove the `useTimer` import (`import { useTimer } from '../hooks/useTimer';`) and add `ClockEditModal`:

```ts
import ClockEditModal from '../components/ClockEditModal';
```

Replace the `useGame` destructure + `useTimer()` lines with:

```ts
  const {
    game, events, players, currentPeriod, periodCount, periodName, periodLengthMinutes,
    currentPeriodLabel, addEvent, undoLastEvent, advancePeriod, substitute,
    liveSeconds, clockRunning, clockIsOvertime, toggleClock, setClockSeconds,
  } = useGame(gameId!);
```

(Remove the standalone `const timer = useTimer();`.)

- [ ] **Step 2: Replace the local extra-period label with the persisted one**

Delete the `const [extraPeriodLabel, setExtraPeriodLabel] = useState<string | null>(null);` line and add clock-edit state:

```ts
  const [showClockEdit, setShowClockEdit] = useState(false);
```

Replace every remaining use of `extraPeriodLabel` with `currentPeriodLabel`. There are four: the period text (`{extraPeriodLabel ? ... }`), the `ShareSheet` `periodLabel`, the `Timer` `periodLabel`, and the `ActionsRow` `extraPeriodLabel` prop. Use `currentPeriodLabel` in each. (`ActionsRow`'s prop name stays `extraPeriodLabel`; pass `extraPeriodLabel={currentPeriodLabel}`.)

- [ ] **Step 3: Replace the period-advance handlers (drop timer.reset)**

```ts
  const confirmAdvancePeriod = useCallback(() => {
    advancePeriod(null);
    setShowPeriodConfirm(false);
  }, [advancePeriod]);
```

In the end-of-regulation options, change the extra-period button handler from
`onClick={() => { setShowEndOptions(false); setExtraPeriodLabel(ep.label); advancePeriod(); timer.reset(); }}`
to:

```tsx
                  onClick={() => { setShowEndOptions(false); advancePeriod(ep.label); }}
```

- [ ] **Step 4: Update the Timer usage**

```tsx
      <Timer
        seconds={liveSeconds}
        running={clockRunning}
        overtime={clockIsOvertime}
        onToggle={toggleClock}
        onEdit={() => setShowClockEdit(true)}
        periodLabel={currentPeriodLabel ?? `${periodName} ${currentPeriod}`}
      />
```

- [ ] **Step 5: Make the next-half copy mode-aware and render the edit modal**

Change the period-advance confirm body line:

```tsx
            <p className="text-sm text-txt-3 mb-4">{periodLengthMinutes ? `The clock continues into ${periodName} ${currentPeriod + 1}.` : 'The timer will reset to 00:00.'}</p>
```

Add the modal near the other modals (e.g. just before the closing `</div>` of the screen):

```tsx
      {showClockEdit && (
        <ClockEditModal
          initialSeconds={liveSeconds}
          onSet={setClockSeconds}
          onClose={() => setShowClockEdit(false)}
        />
      )}
```

- [ ] **Step 6: Delete the retired timer hook**

```bash
git rm src/hooks/useTimer.ts src/hooks/useTimer.test.ts
```

- [ ] **Step 7: Verify build, lint, and the full suite**

Run: `npm run build && npm run lint && npx vitest run`
Expected: PASS. Grep to confirm nothing else imports the removed hook:

Run: `grep -rn "useTimer" src` — Expected: no results.

- [ ] **Step 8: Manual verification (the field-test scenarios)**

Run: `npm run dev`, then in the browser:
- Start a Gaelic game (no length set), start the clock, go Home, return → clock shows the real elapsed time, not `00:00`.
- Score, then pause the clock, wait, score again → both event-log rows show clock-based times and the second did **not** advance during the pause.
- "Next half" → clock resets to `00:00`, paused; the started 2nd half survives a Home round-trip.
- Tap the pencil → set `12:30` → clock shows `12:30`.
- A game where you never start the clock → event-log times look exactly as before (wall-clock since kickoff).

- [ ] **Step 9: Commit**

```bash
git add src/screens/LiveGame.tsx
git commit -m "feat: drive LiveGame from the persisted clock; retire useTimer"
```

---

## Task 9: Period-length field at game setup

**Files:**
- Modify: `src/screens/GameSetup.tsx`

- [ ] **Step 1: Seed the length from the per-sport default**

In `src/screens/GameSetup.tsx`, after `const defaultSquad = appSettings.squads[sport.id];` add:

```ts
  const defaultLength = appSettings.periodLengths?.[sport.id];
```

Add state alongside `selectedPeriod`:

```ts
  const [periodLength, setPeriodLength] = useState(defaultLength ? String(defaultLength) : '');
```

- [ ] **Step 2: Write the length into metadata at start**

In `startGame`, change the metadata construction to include the length when set:

```ts
    const lengthNum = Math.floor(Number(periodLength) || 0);
    const metadata: GameMetadata = {
      periodCount: selectedPeriod.count,
      periodName: selectedPeriod.name,
      ...(lengthNum > 0 ? { periodLengthMinutes: lengthNum } : {}),
    };
```

- [ ] **Step 3: Add the input to the UI**

Directly below the "Game format" block (the closing `)}` of the `sport.periodOptions` section), add a length field:

```tsx
      {/* Period length (optional) */}
      <div>
        <p className={`${eyebrow} mb-2`}>{selectedPeriod.name} length</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={periodLength}
            onChange={(e) => setPeriodLength(e.target.value)}
            placeholder="Optional"
            className="w-28 bg-surface-2 border border-line rounded-xl px-4 py-3 text-txt text-center placeholder-txt-3 focus:outline-none focus:border-txt-3"
          />
          <span className="text-sm text-txt-3">minutes — leave blank for a free-running clock</span>
        </div>
      </div>
```

- [ ] **Step 4: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 5: Manual check**

Run: `npm run dev` → start a game with length `30` → in the live game the clock reads continuous match time and turns red past `30:00`; "Next half" parks it at `30:00`. Start another with a blank length → resets each half, never red.

- [ ] **Step 6: Commit**

```bash
git add src/screens/GameSetup.tsx
git commit -m "feat: optional period-length field at game setup"
```

---

## Task 10: Per-sport default period length in Settings

**Files:**
- Modify: `src/screens/Settings.tsx`

- [ ] **Step 1: Add a setter for per-sport lengths**

In `src/screens/Settings.tsx`, add near the other handlers (e.g. after `deleteSquad`):

```ts
  const setPeriodLength = (sportId: Sport, value: string) => {
    const n = Math.floor(Number(value) || 0);
    setSettings((s) => {
      const periodLengths = { ...(s.periodLengths ?? {}) };
      if (n > 0) periodLengths[sportId] = n;
      else delete periodLengths[sportId];
      return { ...s, periodLengths };
    });
  };
```

- [ ] **Step 2: Add the section to the UI**

Add a new `<section>` after the "Default teams" section:

```tsx
      {/* Default period lengths */}
      <section>
        <h2 className={EYEBROW}>Match length defaults</h2>
        <p className="text-xs text-txt-3 mb-2.5">Default minutes per half/period for each sport. Pre-fills new games; leave blank for a free-running clock.</p>
        <div className="space-y-2">
          {SPORTS.map((sport) => (
            <div key={sport.id} className="w-full bg-surface border border-line rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl" aria-hidden="true">{sport.icon}</span>
                <p className="text-sm font-semibold text-txt">{sport.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-label={`${sport.name} default length in minutes`}
                  value={settings.periodLengths?.[sport.id] ?? ''}
                  onChange={(e) => setPeriodLength(sport.id, e.target.value)}
                  placeholder="—"
                  className="w-16 bg-surface-2 border border-line rounded-xl px-2 py-2 text-txt text-center placeholder-txt-3 focus:outline-none focus:border-txt-3"
                />
                <span className="text-xs text-txt-3">min</span>
              </div>
            </div>
          ))}
        </div>
      </section>
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: PASS. (`settings` is persisted by the existing `useEffect(() => saveSettings(settings), [settings])`.)

- [ ] **Step 4: Manual check**

Run: `npm run dev` → Settings → set Gaelic football to `30` → start a new Gaelic game → the setup length field is pre-filled with `30`.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Settings.tsx
git commit -m "feat: per-sport default match length in Settings"
```

---

## Task 11: Version bump, changelog, final verification

**Files:**
- Modify: `package.json`, `package-lock.json`, `CHANGELOG.md`

- [ ] **Step 1: Bump the patch version**

In `package.json` set `"version": "1.1.24"`. In `package-lock.json` update the root `"version": "1.1.24"` (the top-level field and the `""` package entry — there are two near the top).

- [ ] **Step 2: Add a changelog entry**

Add to `CHANGELOG.md` above the previous top entry:

```markdown
## [1.1.24] - 2026-06-03

### Added
- Persistent match clock: the live timer now survives leaving and returning to a game, keeps real time while you're away, and can be paused and edited.
- Optional per-half/period length (set per game, with a per-sport default in Settings) — the clock then reads continuous match time and turns red once a period runs over.

### Changed
- Event-log times now follow the match clock once you've started it (so they pause for half-time and stoppages); games where the clock is never started keep the previous wall-clock times.
```

- [ ] **Step 3: Final full verification**

Run: `npm run build && npm run lint && npx vitest run`
Expected: PASS — build succeeds, no lint errors, all tests green.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.24, update changelog"
```

---

## Final Review

After all tasks, dispatch a holistic code review over the whole branch diff (`git diff main...HEAD`), focusing on: clock-state transitions (no double-banking on pause, anchor cleared correctly), the `clock_active` gate on event snapshots, migration safety for existing saved games, and that the wall-clock fallback path is untouched for clock-never-started games. Then use superpowers:finishing-a-development-branch to open the PR.
