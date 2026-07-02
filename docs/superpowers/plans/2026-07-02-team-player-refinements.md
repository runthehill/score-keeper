# Team & Player Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users edit/reorder players when building a game, make minor edits during a game, remember teams on-device in a saved-teams library, and add a Gaelic "45" and a Basketball "Assist" stat.

**Architecture:** Sport events stay pure data in `src/sports/configs.ts`. Player ordering gets a `sort_order` DB column. A new reusable `PlayerRowsEditor` component powers every player-editing surface. Saved teams live in localStorage `AppSettings.savedTeams` (migrated from the legacy single-`squads` shape). In-game edits write to SQLite and call the existing `useGame.reload()`.

**Tech Stack:** Vite + React + TypeScript, Tailwind theme tokens, sql.js → IndexedDB, vitest + @testing-library/react.

## Global Constraints

- **Style with theme tokens, not hex** — `bg-surface`, `bg-surface-2`, `text-txt`/`text-txt-2`/`text-txt-3`, `border-line`, `text-danger`, `bg-txt text-bg`, etc.
- **TDD** — failing test first, then minimal implementation, then commit.
- **Persist after every DB write** — call `persist()` after inserts/updates.
- **Zero-point events** for stats (`points: 0`); score stays a pure sum of `events`.
- **No new dependencies.** Reorder uses ▲/▼ buttons (unicode), not drag-and-drop.
- **Device-only** — saved teams never leave localStorage.
- **Before the deploying push:** bump the patch version in `package.json` and the root `version` in `package-lock.json`, and add a `CHANGELOG.md` entry (Task 8).
- Test runner: `npx vitest run <path>` for a file; `npx vitest run` for all.

---

### Task 1: Gaelic "45" and Basketball "Assist" stat events

**Files:**
- Modify: `src/sports/configs.ts`
- Test: `src/sports/configs.test.ts`

**Interfaces:**
- Consumes: existing `StatEventConfig` (`{ type; label; icon }`).
- Produces: `gaelic_football.statEvents` contains a `45` entry; `basketball.statEvents` contains an `assist` entry. Both flow through the existing stat → team → player picker path in `LiveGame`, recorded with `points: 0`.

- [ ] **Step 1: Write the failing tests**

Add to the `describe('sport configs — stat tracking', ...)` block in `src/sports/configs.test.ts`:

```ts
it('Gaelic tracks a 45 stat alongside the penalty', () => {
  const types = getSportConfig('gaelic_football').statEvents.map((s) => s.type);
  expect(types).toEqual(expect.arrayContaining(['penalty', '45']));
});
it("Gaelic 45 is labelled 45'", () => {
  const forty5 = getSportConfig('gaelic_football').statEvents.find((s) => s.type === '45');
  expect(forty5?.label).toBe("45'");
});
it('Basketball tracks an assist stat', () => {
  const types = getSportConfig('basketball').statEvents.map((s) => s.type);
  expect(types).toContain('assist');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/sports/configs.test.ts`
Expected: FAIL — the `45` and `assist` stats don't exist yet.

- [ ] **Step 3: Add the stat events**

In `src/sports/configs.ts`, change the `gaelic_football` `statEvents` to:

```ts
    statEvents: [
      { type: 'penalty', label: 'Penalty', icon: '🎯' },
      { type: '45', label: "45'", icon: '🦵' },
    ],
```

And change the `basketball` `statEvents` to put Assist first:

```ts
    statEvents: [
      { type: 'assist', label: 'Assist', icon: '👟' },
      { type: 'rebound', label: 'Rebound', icon: '📊' },
      { type: 'steal', label: 'Steal', icon: '🤚' },
      { type: 'foul', label: 'Foul', icon: '⚠️' },
    ],
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/sports/configs.test.ts`
Expected: PASS (all, including the existing "penalty" and "rebound/steal" assertions).

- [ ] **Step 5: Commit**

```bash
git add src/sports/configs.ts src/sports/configs.test.ts
git commit -m "feat: add Gaelic 45 and Basketball assist stat events"
```

---

### Task 2: Player ordering + edit/rename queries

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/db/queries.ts`
- Modify: `src/types/index.ts`
- Test: `src/db/queries.test.ts`

**Interfaces:**
- Consumes: existing `createTables`, `Database`, `Player`.
- Produces:
  - `players.sort_order INTEGER NOT NULL DEFAULT 0`; `listPlayers` orders by `sort_order, number`.
  - `Player` gains `sort_order?: number`.
  - `insertPlayer(db, player: Player)` writes `player.sort_order ?? 0`.
  - `updatePlayer(db, id: string, fields: { name: string; number: number | null })`.
  - `updatePlayerOrder(db, id: string, sortOrder: number)`.
  - `updateGameTeamNames(db, id: string, home: string, away: string)`.

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block to `src/db/queries.test.ts` (it already imports from `./queries`; extend the import line to include `updatePlayer, updatePlayerOrder, updateGameTeamNames`):

```ts
describe('player ordering and edits', () => {
  beforeEach(() => {
    insertGame(db, { id: 'g1', sport: 'soccer', home_team: 'A', away_team: 'B', started_at: '2026-04-02T10:00:00.000Z' });
  });

  it('lists players in sort_order, not insertion order', () => {
    insertPlayer(db, { id: 'p1', game_id: 'g1', team: 'home', name: 'First', number: null, status: 'active', sort_order: 2 });
    insertPlayer(db, { id: 'p2', game_id: 'g1', team: 'home', name: 'Second', number: null, status: 'active', sort_order: 0 });
    insertPlayer(db, { id: 'p3', game_id: 'g1', team: 'home', name: 'Third', number: null, status: 'active', sort_order: 1 });
    expect(listPlayers(db, 'g1', 'home').map((p) => p.name)).toEqual(['Second', 'Third', 'First']);
  });

  it('updates a player name and number', () => {
    insertPlayer(db, { id: 'p1', game_id: 'g1', team: 'home', name: 'Jon', number: 9, status: 'active', sort_order: 0 });
    updatePlayer(db, 'p1', { name: 'Jonathan', number: 10 });
    const p = listPlayers(db, 'g1', 'home')[0];
    expect(p.name).toBe('Jonathan');
    expect(p.number).toBe(10);
  });

  it('updates a player sort_order', () => {
    insertPlayer(db, { id: 'p1', game_id: 'g1', team: 'home', name: 'A', number: null, status: 'active', sort_order: 0 });
    insertPlayer(db, { id: 'p2', game_id: 'g1', team: 'home', name: 'B', number: null, status: 'active', sort_order: 1 });
    updatePlayerOrder(db, 'p1', 5);
    expect(listPlayers(db, 'g1', 'home').map((p) => p.name)).toEqual(['B', 'A']);
  });

  it('renames both teams on a game', () => {
    updateGameTeamNames(db, 'g1', 'Coolera', 'Strandhill');
    const g = getGame(db, 'g1')!;
    expect(g.home_team).toBe('Coolera');
    expect(g.away_team).toBe('Strandhill');
  });
});
```

Also add a migration test to `src/db/schema.test.ts`:

```ts
describe('schema player sort_order migration', () => {
  it('adds players.sort_order defaulting to 0 for legacy rows', () => {
    const db = new SQL.Database();
    db.run(`CREATE TABLE players (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, team TEXT NOT NULL, name TEXT NOT NULL, number INTEGER, status TEXT NOT NULL DEFAULT 'active')`);
    db.run("INSERT INTO players (id, game_id, team, name, status) VALUES ('p','g','home','Old','active')");
    createTables(db); // runs the migration
    const stmt = db.prepare('SELECT sort_order FROM players WHERE id = ?');
    stmt.bind(['p']);
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    expect(row.sort_order).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/db/queries.test.ts src/db/schema.test.ts`
Expected: FAIL — `updatePlayer`/`updatePlayerOrder`/`updateGameTeamNames` are not exported and `sort_order` is unknown.

- [ ] **Step 3: Add the `sort_order` column and ordering**

In `src/db/schema.ts`, add `sort_order` to the `players` CREATE TABLE (after `status`):

```ts
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id),
      team TEXT NOT NULL,
      name TEXT NOT NULL,
      number INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);
```

And add the migration next to the others (after the `events` `clock_seconds` line):

```ts
  addColumn(db, 'players', 'sort_order', 'INTEGER NOT NULL DEFAULT 0');
```

- [ ] **Step 4: Update the `Player` type**

In `src/types/index.ts`, add `sort_order?: number;` to the `Player` interface:

```ts
export interface Player {
  id: string;
  game_id: string;
  team: Team;
  name: string;
  number: number | null;
  status: PlayerStatus;
  sort_order?: number;
}
```

- [ ] **Step 5: Update queries**

In `src/db/queries.ts`:

Map `sort_order` in `rowToPlayer`:

```ts
function rowToPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string, game_id: row.game_id as string, team: row.team as Team,
    name: row.name as string, number: row.number as number | null, status: row.status as PlayerStatus,
    sort_order: (row.sort_order as number) ?? 0,
  };
}
```

Write `sort_order` in `insertPlayer` and order by it in `listPlayers`:

```ts
export function insertPlayer(db: Database, player: Player) {
  db.run('INSERT INTO players (id, game_id, team, name, number, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [player.id, player.game_id, player.team, player.name, player.number, player.status, player.sort_order ?? 0]);
}

export function listPlayers(db: Database, gameId: string, team?: Team): Player[] {
  if (team) return query(db, 'SELECT * FROM players WHERE game_id = ? AND team = ? ORDER BY sort_order, number', [gameId, team], rowToPlayer);
  return query(db, 'SELECT * FROM players WHERE game_id = ? ORDER BY team, sort_order, number', [gameId], rowToPlayer);
}
```

Add the new mutators (place after `updatePlayerStatus`):

```ts
export function updatePlayer(db: Database, id: string, fields: { name: string; number: number | null }) {
  db.run('UPDATE players SET name = ?, number = ? WHERE id = ?', [fields.name, fields.number, id]);
}

export function updatePlayerOrder(db: Database, id: string, sortOrder: number) {
  db.run('UPDATE players SET sort_order = ? WHERE id = ?', [sortOrder, id]);
}
```

And a team-rename mutator (place after `updateGameColors`):

```ts
export function updateGameTeamNames(db: Database, id: string, home: string, away: string) {
  db.run('UPDATE games SET home_team = ?, away_team = ? WHERE id = ?', [home, away, id]);
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/db/queries.test.ts src/db/schema.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/db/schema.ts src/db/queries.ts src/types/index.ts src/db/queries.test.ts src/db/schema.test.ts
git commit -m "feat: player sort_order column plus updatePlayer/rename queries"
```

---

### Task 3: Saved-teams data model + settings helpers

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/utils/settings.ts`
- Test: `src/utils/settings.test.ts`

**Interfaces:**
- Consumes: existing `AppSettings`, `loadSettings`, `saveSettings`, `Sport`, legacy `DefaultSquad`.
- Produces:
  - Types `SavedTeamPlayer { name: string; number: string }`, `SavedTeam { id: string; teamName: string; players: SavedTeamPlayer[]; primary?: string; secondary?: string }`.
  - `AppSettings.savedTeams?: Partial<Record<Sport, SavedTeam[]>>` and `squads?` (now optional/legacy).
  - `loadSettings()` migrates any legacy `squads[sport]` into `savedTeams[sport]` (one element, deterministic id `legacy-<sport>`).
  - Pure helpers `getSavedTeams(settings, sport): SavedTeam[]`, `upsertSavedTeam(settings, sport, team): AppSettings` (match by `id` or case-insensitive `teamName`), `deleteSavedTeam(settings, sport, teamId): AppSettings`.

- [ ] **Step 1: Add the new types**

In `src/types/index.ts`, add after the existing `DefaultSquad` interface:

```ts
export interface SavedTeamPlayer {
  name: string;
  number: string;
}

export interface SavedTeam {
  id: string;
  teamName: string;
  players: SavedTeamPlayer[];
  primary?: string;
  secondary?: string;
}
```

- [ ] **Step 2: Write the failing tests**

Replace the contents of `src/utils/settings.test.ts` with:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSettings, saveSettings, getSavedTeams, upsertSavedTeam, deleteSavedTeam,
  SETTINGS_KEY, type AppSettings,
} from './settings';
import type { SavedTeam } from '../types';

beforeEach(() => localStorage.clear());

const team = (over: Partial<SavedTeam> = {}): SavedTeam => ({
  id: 't1', teamName: 'Coolera', players: [{ name: 'Aoife', number: '7' }], primary: '#E03131', secondary: '#FFFFFF', ...over,
});

describe('savedTeams round-trip', () => {
  it('saves and loads saved teams per sport', () => {
    const settings: AppSettings = { darkMode: true, savedTeams: { gaelic_football: [team()] } };
    saveSettings(settings);
    expect(loadSettings().savedTeams?.gaelic_football).toEqual([team()]);
  });
});

describe('legacy squads migration', () => {
  it('migrates a single squad into a one-element savedTeams array', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      darkMode: true,
      squads: { soccer: { teamName: 'Strand', players: [{ name: 'Sam', number: '9' }], primary: '#1E8E4E', secondary: '#FFFFFF' } },
    }));
    const loaded = loadSettings();
    expect(loaded.savedTeams?.soccer).toEqual([
      { id: 'legacy-soccer', teamName: 'Strand', players: [{ name: 'Sam', number: '9' }], primary: '#1E8E4E', secondary: '#FFFFFF' },
    ]);
  });

  it('does not overwrite existing savedTeams when squads is also present', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      darkMode: true,
      squads: { soccer: { teamName: 'Old', players: [] } },
      savedTeams: { soccer: [team({ id: 's1', teamName: 'New' })] },
    }));
    expect(loadSettings().savedTeams?.soccer).toEqual([team({ id: 's1', teamName: 'New' })]);
  });
});

describe('savedTeams helpers', () => {
  it('getSavedTeams returns [] when none', () => {
    expect(getSavedTeams({ darkMode: true }, 'basketball')).toEqual([]);
  });

  it('upsertSavedTeam adds a new team', () => {
    const next = upsertSavedTeam({ darkMode: true }, 'soccer', team());
    expect(getSavedTeams(next, 'soccer')).toEqual([team()]);
  });

  it('upsertSavedTeam updates by matching id', () => {
    const start = upsertSavedTeam({ darkMode: true }, 'soccer', team());
    const next = upsertSavedTeam(start, 'soccer', team({ teamName: 'Coolera U14s' }));
    expect(getSavedTeams(next, 'soccer')).toEqual([team({ teamName: 'Coolera U14s' })]);
  });

  it('upsertSavedTeam updates by case-insensitive name when id differs', () => {
    const start = upsertSavedTeam({ darkMode: true }, 'soccer', team({ id: 'a' }));
    const next = upsertSavedTeam(start, 'soccer', team({ id: 'b', teamName: 'COOLERA', players: [] }));
    const list = getSavedTeams(next, 'soccer');
    expect(list).toHaveLength(1);
    expect(list[0].players).toEqual([]);
  });

  it('deleteSavedTeam removes by id', () => {
    const start = upsertSavedTeam({ darkMode: true }, 'soccer', team());
    const next = deleteSavedTeam(start, 'soccer', 't1');
    expect(getSavedTeams(next, 'soccer')).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/utils/settings.test.ts`
Expected: FAIL — helpers not exported, `savedTeams` unknown, migration absent.

- [ ] **Step 4: Rewrite `settings.ts`**

Replace `src/utils/settings.ts` with:

```ts
import type { Sport, DefaultSquad, SavedTeam } from '../types';

export const SETTINGS_KEY = 'score-keeper-settings';

export interface AppSettings {
  darkMode: boolean;
  squads?: Partial<Record<Sport, DefaultSquad>>; // legacy — migrated into savedTeams on load
  savedTeams?: Partial<Record<Sport, SavedTeam[]>>;
  periodLengths?: Partial<Record<Sport, number>>;
}

// Convert any legacy single-squad-per-sport entries into one-element savedTeams
// arrays. Only fills a sport that has no savedTeams yet, so it never clobbers
// teams saved by the current app. Deterministic id keeps it stable across loads
// until the next saveSettings persists it.
function migrateSquads(s: AppSettings): AppSettings {
  const squads = s.squads ?? {};
  const savedTeams = { ...(s.savedTeams ?? {}) };
  let changed = false;
  for (const key of Object.keys(squads) as Sport[]) {
    const squad = squads[key];
    const existing = savedTeams[key];
    if (squad && !(existing && existing.length)) {
      savedTeams[key] = [{
        id: `legacy-${key}`,
        teamName: squad.teamName,
        players: squad.players,
        primary: squad.primary,
        secondary: squad.secondary,
      }];
      changed = true;
    }
  }
  return changed ? { ...s, savedTeams } : s;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return migrateSquads({ darkMode: true, savedTeams: {}, periodLengths: {}, ...parsed });
    }
  } catch {
    // Ignore malformed JSON or unavailable localStorage; fall back to defaults below.
  }
  return { darkMode: true, savedTeams: {}, periodLengths: {} };
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getSavedTeams(settings: AppSettings, sport: Sport): SavedTeam[] {
  return settings.savedTeams?.[sport] ?? [];
}

export function upsertSavedTeam(settings: AppSettings, sport: Sport, team: SavedTeam): AppSettings {
  const list = settings.savedTeams?.[sport] ?? [];
  const idx = list.findIndex(
    (t) => t.id === team.id || t.teamName.toLowerCase() === team.teamName.toLowerCase()
  );
  const next = idx >= 0 ? list.map((t, i) => (i === idx ? team : t)) : [...list, team];
  return { ...settings, savedTeams: { ...(settings.savedTeams ?? {}), [sport]: next } };
}

export function deleteSavedTeam(settings: AppSettings, sport: Sport, teamId: string): AppSettings {
  const list = (settings.savedTeams?.[sport] ?? []).filter((t) => t.id !== teamId);
  return { ...settings, savedTeams: { ...(settings.savedTeams ?? {}), [sport]: list } };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/utils/settings.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/utils/settings.ts src/utils/settings.test.ts
git commit -m "feat: saved-teams data model, migration, and settings helpers"
```

---

### Task 4: `PlayerRowsEditor` component

**Files:**
- Create: `src/components/PlayerRowsEditor.tsx`
- Test: `src/components/PlayerRowsEditor.test.tsx`

**Interfaces:**
- Produces (generic over `T extends PlayerRowBase`):
  ```ts
  export interface PlayerRowBase { name: string; number: string }
  interface Props<T extends PlayerRowBase> {
    players: T[];
    onChange: (next: T[]) => void;
    allowRemove?: boolean;      // default true
    createRow?: (name: string, number: string) => T; // default () => ({ name, number })
  }
  ```
  Renders each row as always-editable `#` + name inputs with ▲/▼ move buttons and (when `allowRemove`) a ✕ remove button; a trailing "name + # + Add" control appends a row. Reordering/editing preserves any extra fields on `T` (e.g. an `id`), so in-game callers keep their DB linkage.

- [ ] **Step 1: Write the failing tests**

Create `src/components/PlayerRowsEditor.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayerRowsEditor from './PlayerRowsEditor';

const rows = [
  { name: 'Aoife', number: '7' },
  { name: 'Niamh', number: '9' },
];

describe('PlayerRowsEditor', () => {
  it('renders existing rows as editable inputs', () => {
    render(<PlayerRowsEditor players={rows} onChange={() => {}} />);
    expect(screen.getByDisplayValue('Aoife')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Niamh')).toBeInTheDocument();
  });

  it('editing a name calls onChange with the updated row', async () => {
    const onChange = vi.fn();
    render(<PlayerRowsEditor players={rows} onChange={onChange} />);
    await userEvent.setup().type(screen.getByDisplayValue('Aoife'), 'X');
    expect(onChange).toHaveBeenLastCalledWith([{ name: 'AoifeX', number: '7' }, { name: 'Niamh', number: '9' }]);
  });

  it('adds a new row', async () => {
    const onChange = vi.fn();
    render(<PlayerRowsEditor players={rows} onChange={onChange} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('New player name'), 'Roisin');
    await user.type(screen.getByLabelText('New player number'), '12');
    await user.click(screen.getByText('Add'));
    expect(onChange).toHaveBeenLastCalledWith([...rows, { name: 'Roisin', number: '12' }]);
  });

  it('moves a row down', async () => {
    const onChange = vi.fn();
    render(<PlayerRowsEditor players={rows} onChange={onChange} />);
    await userEvent.setup().click(screen.getByLabelText('Move Aoife down'));
    expect(onChange).toHaveBeenLastCalledWith([{ name: 'Niamh', number: '9' }, { name: 'Aoife', number: '7' }]);
  });

  it('disables move-up on the first row and move-down on the last', () => {
    render(<PlayerRowsEditor players={rows} onChange={() => {}} />);
    expect(screen.getByLabelText('Move Aoife up')).toBeDisabled();
    expect(screen.getByLabelText('Move Niamh down')).toBeDisabled();
  });

  it('removes a row', async () => {
    const onChange = vi.fn();
    render(<PlayerRowsEditor players={rows} onChange={onChange} />);
    await userEvent.setup().click(screen.getByLabelText('Remove Aoife'));
    expect(onChange).toHaveBeenLastCalledWith([{ name: 'Niamh', number: '9' }]);
  });

  it('hides remove buttons when allowRemove is false', () => {
    render(<PlayerRowsEditor players={rows} onChange={() => {}} allowRemove={false} />);
    expect(screen.queryByLabelText('Remove Aoife')).not.toBeInTheDocument();
  });

  it('preserves extra fields (e.g. id) when reordering', async () => {
    const onChange = vi.fn();
    const withIds = [{ id: 'a', name: 'Aoife', number: '7' }, { id: 'b', name: 'Niamh', number: '9' }];
    render(<PlayerRowsEditor players={withIds} onChange={onChange} createRow={(name, number) => ({ id: '', name, number })} />);
    await userEvent.setup().click(screen.getByLabelText('Move Aoife down'));
    expect(onChange).toHaveBeenLastCalledWith([{ id: 'b', name: 'Niamh', number: '9' }, { id: 'a', name: 'Aoife', number: '7' }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/PlayerRowsEditor.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the component**

Create `src/components/PlayerRowsEditor.tsx`:

```tsx
import { useState } from 'react';

export interface PlayerRowBase {
  name: string;
  number: string;
}

interface Props<T extends PlayerRowBase> {
  players: T[];
  onChange: (next: T[]) => void;
  allowRemove?: boolean;
  createRow?: (name: string, number: string) => T;
}

export default function PlayerRowsEditor<T extends PlayerRowBase>({
  players, onChange, allowRemove = true, createRow,
}: Props<T>) {
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');

  const add = () => {
    if (!newName.trim()) return;
    const row = createRow ? createRow(newName.trim(), newNumber) : ({ name: newName.trim(), number: newNumber } as T);
    onChange([...players, row]);
    setNewName('');
    setNewNumber('');
  };

  const editRow = (i: number, patch: Partial<PlayerRowBase>) =>
    onChange(players.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const remove = (i: number) => onChange(players.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= players.length) return;
    const next = [...players];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const numInput = 'w-12 shrink-0 bg-surface-2 border border-line rounded-lg px-1.5 py-2 text-txt text-center placeholder-txt-3 focus:outline-none focus:border-txt-3';
  const nameInput = 'min-w-0 flex-1 bg-surface-2 border border-line rounded-lg px-3 py-2 text-txt placeholder-txt-3 focus:outline-none focus:border-txt-3';
  const iconBtn = 'shrink-0 w-8 h-8 grid place-items-center rounded-lg bg-surface-2 border border-line text-txt-2 text-xs press disabled:opacity-30';

  return (
    <div className="space-y-2">
      {players.length > 0 && (
        <div className="space-y-1.5">
          {players.map((p, i) => {
            const who = p.name || `player ${i + 1}`;
            return (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  value={p.number}
                  onChange={(e) => editRow(i, { number: e.target.value })}
                  placeholder="#"
                  aria-label={`${who} number`}
                  className={numInput}
                />
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => editRow(i, { name: e.target.value })}
                  placeholder="Player name"
                  aria-label={`${who} name`}
                  className={nameInput}
                />
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${who} up`} className={iconBtn}>▲</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === players.length - 1} aria-label={`Move ${who} down`} className={iconBtn}>▼</button>
                {allowRemove && (
                  <button type="button" onClick={() => remove(i)} aria-label={`Remove ${who}`} className={iconBtn}>✕</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Player name"
          aria-label="New player name"
          className="min-w-0 flex-1 bg-surface-2 border border-line rounded-xl px-4 py-3 text-txt placeholder-txt-3 focus:outline-none focus:border-txt-3"
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <input
          type="number"
          inputMode="numeric"
          value={newNumber}
          onChange={(e) => setNewNumber(e.target.value)}
          placeholder="#"
          aria-label="New player number"
          className="w-16 shrink-0 bg-surface-2 border border-line rounded-xl px-2 py-3 text-txt text-center placeholder-txt-3 focus:outline-none focus:border-txt-3"
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button type="button" onClick={add} className="shrink-0 bg-txt text-bg rounded-xl px-4 font-semibold press">Add</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/PlayerRowsEditor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PlayerRowsEditor.tsx src/components/PlayerRowsEditor.test.tsx
git commit -m "feat: reusable PlayerRowsEditor (inline edit, reorder, remove)"
```

---

### Task 5: GameSetup — editable/reorderable players + saved-teams picker + save

**Files:**
- Create: `src/components/SavedTeamPicker.tsx`
- Modify: `src/screens/GameSetup.tsx`
- Test: `src/components/SavedTeamPicker.test.tsx`

**Interfaces:**
- Consumes: `PlayerRowsEditor`, `getSavedTeams`/`upsertSavedTeam`/`loadSettings`/`saveSettings`, `squadKit`, `insertPlayer` (now with `sort_order`), `SavedTeam`, `Team`.
- Produces:
  - `SavedTeamPicker` component: `{ teams: SavedTeam[]; sportId: Sport; onSelect: (t: SavedTeam) => void; onClose: () => void }` — a bottom sheet listing saved teams (kit chip + name + player count).
  - `GameSetup` uses `PlayerRowsEditor` per team, a "Use saved team" button that opens `SavedTeamPicker`, and a "Save ★" button that upserts the current team into `savedTeams[sport]`. On start, players are inserted with `sort_order` = list index.

- [ ] **Step 1: Write the failing test for SavedTeamPicker**

Create `src/components/SavedTeamPicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SavedTeamPicker from './SavedTeamPicker';
import type { SavedTeam } from '../types';

const teams: SavedTeam[] = [
  { id: 't1', teamName: 'Coolera U12s', players: [{ name: 'A', number: '1' }, { name: 'B', number: '2' }] },
  { id: 't2', teamName: 'Strandhill', players: [] },
];

describe('SavedTeamPicker', () => {
  it('lists saved teams with player counts', () => {
    render(<SavedTeamPicker teams={teams} sportId="gaelic_football" onSelect={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Coolera U12s')).toBeInTheDocument();
    expect(screen.getByText('2 players')).toBeInTheDocument();
    expect(screen.getByText('Strandhill')).toBeInTheDocument();
    expect(screen.getByText('No players')).toBeInTheDocument();
  });

  it('selecting a team calls onSelect with it', async () => {
    const onSelect = vi.fn();
    render(<SavedTeamPicker teams={teams} sportId="gaelic_football" onSelect={onSelect} onClose={() => {}} />);
    await userEvent.setup().click(screen.getByText('Coolera U12s'));
    expect(onSelect).toHaveBeenCalledWith(teams[0]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/SavedTeamPicker.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement SavedTeamPicker**

Create `src/components/SavedTeamPicker.tsx`:

```tsx
import type { SavedTeam, Sport } from '../types';
import { squadKit } from '../sports/kits';
import TeamKitChip from './TeamKitChip';

interface Props {
  teams: SavedTeam[];
  sportId: Sport;
  onSelect: (team: SavedTeam) => void;
  onClose: () => void;
}

export default function SavedTeamPicker({ teams, sportId, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full bg-surface rounded-t-2xl border-t border-line p-4 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-3">Use a saved team</p>
        <div className="space-y-2">
          {teams.map((t) => {
            const kit = squadKit(t, sportId);
            const count = t.players.length;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t)}
                className="w-full flex items-center gap-3 bg-surface-2 border border-line rounded-xl py-3 px-3 text-left press"
              >
                <TeamKitChip primary={kit.primary} secondary={kit.secondary} size={20} radius={6} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-txt truncate">{t.teamName}</p>
                  <p className="text-xs text-txt-3">{count > 0 ? `${count} player${count === 1 ? '' : 's'}` : 'No players'}</p>
                </div>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={onClose} className="w-full mt-3 py-3 text-center text-sm text-txt-3">Cancel</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/components/SavedTeamPicker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Rewrite GameSetup**

Replace `src/screens/GameSetup.tsx` with:

```tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import type { Sport, Player, Team, GameMetadata, PeriodConfig, Game, SavedTeam } from '../types';
import { getSportConfig } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { insertGame, insertPlayer } from '../db/queries';
import { loadSettings, saveSettings, getSavedTeams, upsertSavedTeam } from '../utils/settings';
import { DEFAULT_HOME_KITS, DEFAULT_AWAY_KIT, squadKit } from '../sports/kits';
import Scoreboard from '../components/Scoreboard';
import TeamKitChip from '../components/TeamKitChip';
import ColorKitPicker from '../components/ColorKitPicker';
import PlayerRowsEditor, { type PlayerRowBase } from '../components/PlayerRowsEditor';
import SavedTeamPicker from '../components/SavedTeamPicker';
import { ChevronLeft, Whistle, Edit, Star } from '../components/icons';

export default function GameSetup() {
  const { sportId } = useParams<{ sportId: string }>();
  const navigate = useNavigate();
  const { db, persist } = useDB();
  const sport = getSportConfig(sportId as Sport);
  const [settings, setSettings] = useState(loadSettings);
  const savedTeams = getSavedTeams(settings, sport.id);
  const defaultLength = settings.periodLengths?.[sport.id];

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [homeKit, setHomeKit] = useState(DEFAULT_HOME_KITS[sport.id]);
  const [awayKit, setAwayKit] = useState(DEFAULT_AWAY_KIT);
  const [picker, setPicker] = useState<Team | null>(null);
  const [showPlayers, setShowPlayers] = useState(false);
  const [homePlayers, setHomePlayers] = useState<PlayerRowBase[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<PlayerRowBase[]>([]);
  const [teamPicker, setTeamPicker] = useState<Team | null>(null);
  const [savedMsg, setSavedMsg] = useState<Team | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodConfig>(sport.periods);
  const [periodLength, setPeriodLength] = useState(defaultLength ? String(defaultLength) : '');

  const applyTeam = (team: Team, saved: SavedTeam) => {
    const kit = squadKit(saved, sport.id);
    const rows: PlayerRowBase[] = saved.players.map((p) => ({ name: p.name, number: p.number }));
    if (team === 'home') { setHomeTeam(saved.teamName); setHomePlayers(rows); setHomeKit(kit); }
    else { setAwayTeam(saved.teamName); setAwayPlayers(rows); setAwayKit(kit); }
    setShowPlayers(true);
  };

  const saveTeam = (team: Team) => {
    const name = (team === 'home' ? homeTeam : awayTeam).trim();
    if (!name) return;
    const kit = team === 'home' ? homeKit : awayKit;
    const rows = team === 'home' ? homePlayers : awayPlayers;
    const existing = savedTeams.find((t) => t.teamName.toLowerCase() === name.toLowerCase());
    const saved: SavedTeam = {
      id: existing?.id ?? uuid(),
      teamName: name,
      players: rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), number: r.number })),
      primary: kit.primary,
      secondary: kit.secondary,
    };
    const next = upsertSavedTeam(settings, sport.id, saved);
    setSettings(next);
    saveSettings(next);
    setSavedMsg(team);
    setTimeout(() => setSavedMsg((t) => (t === team ? null : t)), 1600);
  };

  const startGame = () => {
    if (!homeTeam.trim() || !awayTeam.trim()) return;
    const gameId = uuid();
    const lengthNum = Math.floor(Number(periodLength) || 0);
    const metadata: GameMetadata = {
      periodCount: selectedPeriod.count,
      periodName: selectedPeriod.name,
      ...(lengthNum > 0 ? { periodLengthMinutes: lengthNum } : {}),
    };
    insertGame(db, {
      id: gameId,
      sport: sport.id,
      home_team: homeTeam.trim(),
      away_team: awayTeam.trim(),
      started_at: new Date().toISOString(),
      notes: JSON.stringify(metadata),
      home_primary: homeKit.primary,
      home_secondary: homeKit.secondary,
      away_primary: awayKit.primary,
      away_secondary: awayKit.secondary,
    });

    const savePlayers = (rows: PlayerRowBase[], team: Team) => {
      rows.filter((r) => r.name.trim()).forEach((r, i) => {
        const player: Player = {
          id: uuid(),
          game_id: gameId,
          team,
          name: r.name.trim(),
          number: r.number ? parseInt(r.number, 10) : null,
          status: 'active',
          sort_order: i,
        };
        insertPlayer(db, player);
      });
    };
    savePlayers(homePlayers, 'home');
    savePlayers(awayPlayers, 'away');
    persist();
    navigate(`/game/${gameId}`, { replace: true });
  };

  const previewGame: Game = {
    id: 'preview',
    sport: sport.id,
    home_team: homeTeam.trim() || sport.defaultTeamName,
    away_team: awayTeam.trim() || 'Opponent',
    home_score: 0,
    away_score: 0,
    status: 'in_progress',
    started_at: '',
    ended_at: null,
    notes: '',
    home_primary: homeKit.primary,
    home_secondary: homeKit.secondary,
    away_primary: awayKit.primary,
    away_secondary: awayKit.secondary,
  };

  const eyebrow = 'text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3';

  const teamField = (label: string, which: Team) => {
    const name = which === 'home' ? homeTeam : awayTeam;
    const setName = which === 'home' ? setHomeTeam : setAwayTeam;
    const kit = which === 'home' ? homeKit : awayKit;
    return (
      <div className="bg-surface border border-line rounded-2xl p-3.5 flex items-center gap-3">
        <button type="button" onClick={() => setPicker(which)} className="relative shrink-0 press" aria-label={`Choose ${label.toLowerCase()} kit`}>
          <TeamKitChip primary={kit.primary} secondary={kit.secondary} size={42} radius={12} />
          <span className="absolute -right-1 -bottom-1 w-[18px] h-[18px] rounded-full bg-txt text-bg grid place-items-center">
            <Edit size={11} />
          </span>
        </button>
        <div className="flex-1 min-w-0">
          <div className={`${eyebrow} mb-1`}>{label}</div>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={which === 'home' ? sport.defaultTeamName : 'Opponent'}
              className="min-w-0 flex-1 bg-transparent text-txt font-bold text-[15.5px] placeholder-txt-3 focus:outline-none -tracking-[0.01em]"
            />
            {savedTeams.length > 0 && (
              <button
                type="button"
                onClick={() => setTeamPicker(which)}
                className="shrink-0 bg-surface-2 border border-line rounded-lg px-2.5 py-1 text-[11px] font-semibold text-txt-2 press"
              >
                Use saved ▾
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const playerBlock = (which: Team) => {
    const label = which === 'home' ? (homeTeam || 'Home') : (awayTeam || 'Away');
    const rows = which === 'home' ? homePlayers : awayPlayers;
    const setRows = which === 'home' ? setHomePlayers : setAwayPlayers;
    const name = which === 'home' ? homeTeam : awayTeam;
    return (
      <div key={which}>
        <div className="flex items-center justify-between mb-2">
          <p className={eyebrow}>{label} players</p>
          <button
            type="button"
            onClick={() => saveTeam(which)}
            disabled={!name.trim()}
            className="shrink-0 flex items-center gap-1 bg-surface-2 border border-line rounded-lg px-2.5 py-1 text-[11px] font-semibold text-txt-2 disabled:opacity-40 press"
          >
            <Star size={12} /> {savedMsg === which ? 'Saved ✓' : 'Save team'}
          </button>
        </div>
        <PlayerRowsEditor players={rows} onChange={setRows} />
      </div>
    );
  };

  return (
    <div className="p-4 space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-surface-2 border border-line text-txt press"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0">
          <div className={eyebrow}>New game</div>
          <h1 className="text-xl font-extrabold text-txt -tracking-[0.02em] truncate">{sport.name}</h1>
        </div>
      </div>

      {/* Live preview */}
      <div>
        <p className={`${eyebrow} mb-2`}>Preview</p>
        <Scoreboard game={previewGame} events={[]} />
      </div>

      {/* Teams */}
      <div className="space-y-2.5">
        <p className={eyebrow}>Teams</p>
        {teamField('Home', 'home')}
        {teamField('Away', 'away')}
      </div>

      {/* Period selector */}
      {sport.periodOptions && sport.periodOptions.length > 1 && (
        <div>
          <p className={`${eyebrow} mb-2`}>Game format</p>
          <div className="flex gap-2">
            {sport.periodOptions.map((opt) => {
              const active = selectedPeriod.count === opt.count && selectedPeriod.name === opt.name;
              return (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() => setSelectedPeriod(opt)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold press ${active ? 'bg-txt text-bg' : 'bg-surface-2 border border-line text-txt-2'}`}
                >
                  {opt.count} {opt.name}s
                </button>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Players (optional) */}
      {!showPlayers ? (
        <button type="button" onClick={() => setShowPlayers(true)} className="text-sm text-txt-3 underline">
          + Add players (optional)
        </button>
      ) : (
        <div className="space-y-5">
          {playerBlock('home')}
          {playerBlock('away')}
        </div>
      )}

      {/* Start */}
      <button
        type="button"
        onClick={startGame}
        disabled={!homeTeam.trim() || !awayTeam.trim()}
        className="w-full flex items-center justify-center gap-2 bg-txt text-bg rounded-xl py-4 font-bold text-lg disabled:opacity-40 press"
      >
        <Whistle size={19} /> Start Game
      </button>

      {/* Kit picker */}
      {picker && (
        <ColorKitPicker
          team={picker === 'home' ? (homeTeam.trim() || sport.defaultTeamName) : (awayTeam.trim() || 'Opponent')}
          value={picker === 'home' ? homeKit : awayKit}
          onChange={(kit) => (picker === 'home' ? setHomeKit(kit) : setAwayKit(kit))}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Saved team picker */}
      {teamPicker && (
        <SavedTeamPicker
          teams={savedTeams}
          sportId={sport.id}
          onSelect={(t) => { applyTeam(teamPicker, t); setTeamPicker(null); }}
          onClose={() => setTeamPicker(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run the full test suite + typecheck to catch regressions**

Run: `npx vitest run && npx tsc -b`
Expected: PASS / no type errors. (No existing test references the removed `loadSquad`/`addPlayer` internals.)

- [ ] **Step 7: Commit**

```bash
git add src/components/SavedTeamPicker.tsx src/components/SavedTeamPicker.test.tsx src/screens/GameSetup.tsx
git commit -m "feat: editable/reorderable players and saved-teams in game setup"
```

---

### Task 6: Settings — saved-teams library (multiple per sport)

**Files:**
- Modify: `src/screens/Settings.tsx`
- Test: `src/screens/Settings.test.tsx` (create)

**Interfaces:**
- Consumes: `getSavedTeams`/`upsertSavedTeam`/`deleteSavedTeam`, `PlayerRowsEditor`, `ColorKitPicker`, `TeamKitChip`, `squadKit`, `SavedTeam`, `SavedTeamPlayer`, `uuid`.
- Produces: a "Saved teams" section where each sport opens a list of its saved teams (add / edit / delete), each edited with name + kit + `PlayerRowsEditor`.

- [ ] **Step 1: Write the failing test**

Create `src/screens/Settings.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from './Settings';
import { loadSettings } from '../utils/settings';

// Settings pulls DB + theme from context hooks; stub them so the screen renders.
vi.mock('../hooks/useDB', () => ({ useDB: () => ({ db: {}, persist: () => {} }) }));
vi.mock('../hooks/useTheme', () => ({ useThemeContext: () => ({ dark: true, toggle: () => {} }) }));
vi.mock('../hooks/useInstallPrompt', () => ({ useInstallPrompt: () => ({ mode: 'hidden', promptInstall: async () => {} }) }));
vi.mock('../db/queries', () => ({ listGames: () => [], listEvents: () => [], listPlayers: () => [] }));

beforeEach(() => localStorage.clear());

describe('Settings saved teams', () => {
  it('adds a saved team for a sport and persists it', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByText('Gaelic Football'));           // open the sport's team list
    await user.click(screen.getByText('+ New team'));                 // open the editor
    await user.clear(screen.getByLabelText('Team name'));
    await user.type(screen.getByLabelText('Team name'), 'Coolera U12s');
    await user.type(screen.getByLabelText('New player name'), 'Aoife');
    await user.type(screen.getByLabelText('New player number'), '7');
    await user.click(screen.getByText('Add'));
    await user.click(screen.getByText('Save team'));
    const saved = loadSettings().savedTeams?.gaelic_football;
    expect(saved).toHaveLength(1);
    expect(saved![0].teamName).toBe('Coolera U12s');
    expect(saved![0].players).toEqual([{ name: 'Aoife', number: '7' }]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/screens/Settings.test.tsx`
Expected: FAIL — the new "Saved teams" flow / labels don't exist yet.

- [ ] **Step 3: Rewrite the Settings team-management code**

In `src/screens/Settings.tsx`:

**(a) Update imports** — replace the `DefaultSquadPlayer` type import and add helpers, `PlayerRowsEditor`, `SavedTeam`, and `uuid`:

```tsx
import { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import type { Sport, SavedTeam, SavedTeamPlayer } from '../types';
import { SPORTS, getSportConfig } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { useThemeContext } from '../hooks/useTheme';
import { listGames, listEvents, listPlayers } from '../db/queries';

const APP_VERSION = __APP_VERSION__;
import { downloadFile } from '../utils/export';
import { clearDB } from '../db/init';
import { loadSettings, saveSettings, getSavedTeams, upsertSavedTeam, deleteSavedTeam } from '../utils/settings';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import IosInstallSheet from '../components/IosInstallSheet';
import AppHeader from '../components/AppHeader';
import { squadKit } from '../sports/kits';
import ColorKitPicker from '../components/ColorKitPicker';
import TeamKitChip from '../components/TeamKitChip';
import PlayerRowsEditor, { type PlayerRowBase } from '../components/PlayerRowsEditor';
import { Edit } from '../components/icons';
```

**(b) Replace the squad-editor state and handlers.** Remove the old block (`editingSport`, `squadName`, `squadPlayers`, `newName`, `newNumber`, `squadKitColors`, `showKitPicker`, `openSquadEditor`, `addSquadPlayer`, `removeSquadPlayer`, `saveSquad`, `deleteSquad`) and replace with:

```tsx
  const [managingSport, setManagingSport] = useState<Sport | null>(null);
  const [editing, setEditing] = useState<{ sport: Sport; team: SavedTeam } | null>(null);
  const [showKitPicker, setShowKitPicker] = useState(false);

  const newTeam = (): SavedTeam => ({ id: uuid(), teamName: '', players: [], primary: undefined, secondary: undefined });

  const openEditor = (sport: Sport, team: SavedTeam) => {
    setEditing({ sport, team });
    setShowKitPicker(false);
  };

  const patchEditing = (patch: Partial<SavedTeam>) =>
    setEditing((e) => (e ? { ...e, team: { ...e.team, ...patch } } : e));

  const saveEditing = () => {
    if (!editing || !editing.team.teamName.trim()) return;
    const team: SavedTeam = { ...editing.team, teamName: editing.team.teamName.trim() };
    setSettings((s) => {
      const next = upsertSavedTeam(s, editing.sport, team);
      saveSettings(next);
      return next;
    });
    setEditing(null);
  };

  const removeTeam = (sport: Sport, teamId: string) => {
    setSettings((s) => {
      const next = deleteSavedTeam(s, sport, teamId);
      saveSettings(next);
      return next;
    });
  };
```

Note: the existing `useEffect(() => saveSettings(settings), [settings])` at the top can stay — it harmlessly re-persists; the explicit `saveSettings(next)` calls keep localStorage correct even before the effect runs. Keep `const [settings, setSettings] = useState(loadSettings);`.

**(c) Replace the "Default teams" `<section>`** with a "Saved teams" section that opens the per-sport list:

```tsx
      {/* Saved teams */}
      <section>
        <h2 className={EYEBROW}>Saved teams</h2>
        <p className="text-xs text-txt-3 mb-2.5">Save any team — name, colours, and optional players. Load them in one tap when starting a game.</p>
        <div className="space-y-2">
          {SPORTS.map((sport) => {
            const teams = getSavedTeams(settings, sport.id);
            return (
              <button key={sport.id} type="button" onClick={() => setManagingSport(sport.id)} className="w-full bg-surface border border-line rounded-2xl px-4 py-3 flex items-center justify-between press">
                <div className="flex items-center gap-3">
                  <span className="text-xl" aria-hidden="true">{sport.icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-txt">{sport.name}</p>
                    <p className="text-xs text-txt-3">{teams.length > 0 ? `${teams.length} saved team${teams.length === 1 ? '' : 's'}` : 'No teams yet'}</p>
                  </div>
                </div>
                <span className="text-txt-3 text-sm">Manage</span>
              </button>
            );
          })}
        </div>
      </section>
```

**(d) Replace the old team-editor modal** (the `{editingSport && (...)}` block) with a per-sport list sheet plus the team editor sheet:

```tsx
      {/* Per-sport saved-team list */}
      {managingSport && !editing && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setManagingSport(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full bg-surface rounded-t-2xl border-t border-line p-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-txt flex items-center gap-2 mb-4">
              <span aria-hidden="true">{getSportConfig(managingSport).icon}</span> {getSportConfig(managingSport).name} teams
            </h3>
            <div className="space-y-2">
              {getSavedTeams(settings, managingSport).map((t) => {
                const kit = squadKit(t, managingSport);
                return (
                  <div key={t.id} className="flex items-center gap-2 bg-surface-2 border border-line rounded-xl px-3 py-2.5">
                    <TeamKitChip primary={kit.primary} secondary={kit.secondary} size={18} radius={5} />
                    <button type="button" onClick={() => openEditor(managingSport, t)} className="flex-1 min-w-0 text-left press">
                      <p className="text-sm font-semibold text-txt truncate">{t.teamName}</p>
                      <p className="text-xs text-txt-3">{t.players.length > 0 ? `${t.players.length} player${t.players.length === 1 ? '' : 's'}` : 'Name & colours'}</p>
                    </button>
                    <button type="button" onClick={() => removeTeam(managingSport, t.id)} className="shrink-0 text-xs text-danger px-2 py-1" aria-label={`Delete ${t.teamName}`}>Delete</button>
                  </div>
                );
              })}
              {getSavedTeams(settings, managingSport).length === 0 && (
                <p className="text-xs text-txt-3 text-center py-2">No teams saved yet</p>
              )}
            </div>
            <button type="button" onClick={() => openEditor(managingSport, newTeam())} className="w-full mt-3 py-3 bg-surface-2 border border-line rounded-xl text-sm font-semibold text-txt-2 press">+ New team</button>
            <button type="button" onClick={() => setManagingSport(null)} className="w-full mt-2 py-3 text-center text-sm text-txt-3">Done</button>
          </div>
        </div>
      )}

      {/* Team editor */}
      {editing && (
        <>
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setEditing(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full bg-surface rounded-t-2xl border-t border-line p-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-txt flex items-center gap-2 mb-4">
              <span aria-hidden="true">{getSportConfig(editing.sport).icon}</span> {getSportConfig(editing.sport).name} team
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-txt-3 mb-1 block">Kit colours</label>
                <button type="button" onClick={() => setShowKitPicker(true)} aria-label="Choose team kit" className="relative inline-block press">
                  <TeamKitChip primary={squadKit(editing.team, editing.sport).primary} secondary={squadKit(editing.team, editing.sport).secondary} size={42} radius={12} />
                  <span className="absolute -right-1 -bottom-1 w-[18px] h-[18px] rounded-full bg-txt text-bg grid place-items-center">
                    <Edit size={11} />
                  </span>
                </button>
              </div>

              <div>
                <label htmlFor="team-name" className="text-xs text-txt-3 mb-1 block">Team name</label>
                <input id="team-name" aria-label="Team name" type="text" value={editing.team.teamName} onChange={(e) => patchEditing({ teamName: e.target.value })} placeholder="e.g. Coolera U12s" className={INPUT} />
              </div>

              <div>
                <label className="text-xs text-txt-3 mb-1 block">Players</label>
                <PlayerRowsEditor
                  players={editing.team.players as PlayerRowBase[]}
                  onChange={(rows) => patchEditing({ players: rows as SavedTeamPlayer[] })}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 py-3 border border-line rounded-xl text-sm font-medium text-txt-2 press">Cancel</button>
              <button type="button" onClick={saveEditing} disabled={!editing.team.teamName.trim()} className="flex-1 py-3 bg-txt text-bg rounded-xl text-sm font-bold disabled:opacity-40 press">Save team</button>
            </div>
          </div>
        </div>
        {showKitPicker && (
          <ColorKitPicker
            team={editing.team.teamName || getSportConfig(editing.sport).name}
            value={squadKit(editing.team, editing.sport)}
            onChange={(kit) => patchEditing({ primary: kit.primary, secondary: kit.secondary })}
            onClose={() => setShowKitPicker(false)}
          />
        )}
        </>
      )}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/screens/Settings.test.tsx`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: no errors. (If `DefaultSquadPlayer` is now unused anywhere, that's fine — it remains exported from `types` for the migration path.)

- [ ] **Step 6: Commit**

```bash
git add src/screens/Settings.tsx src/screens/Settings.test.tsx
git commit -m "feat: manage a saved-teams library per sport in Settings"
```

---

### Task 7: LiveGame — in-game Edit sheet (team name, colours, players)

**Files:**
- Create: `src/components/EditGameSheet.tsx`
- Modify: `src/screens/LiveGame.tsx`
- Test: `src/components/EditGameSheet.test.tsx`

**Interfaces:**
- Consumes: `PlayerRowsEditor`, `ColorKitPicker`, `TeamKitChip`, `Game`, `Player`, `Team`.
- Produces:
  - `EditGameSheet` with props:
    ```ts
    interface EditRow { id?: string; name: string; number: string }
    interface Props {
      game: Game;
      players: Player[];
      onSave: (data: {
        homeTeam: string; awayTeam: string;
        homeKit: { primary: string; secondary: string };
        awayKit: { primary: string; secondary: string };
        homeRows: EditRow[]; awayRows: EditRow[];
      }) => void;
      onClose: () => void;
    }
    ```
    Existing players carry `id`; new rows omit it. Remove is disabled (`allowRemove={false}`).
  - `LiveGame` gains an Edit button that opens the sheet and, on save, writes team names/colours/players to the DB and calls `reload()`.

- [ ] **Step 1: Write the failing test**

Create `src/components/EditGameSheet.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditGameSheet from './EditGameSheet';
import type { Game, Player } from '../types';

const game: Game = {
  id: 'g1', sport: 'gaelic_football', home_team: 'Coolera', away_team: 'Strandhill',
  home_score: 0, away_score: 0, status: 'in_progress', started_at: '', ended_at: null, notes: '',
  home_primary: '#E03131', home_secondary: '#FFFFFF', away_primary: '#1E63D6', away_secondary: '#FFFFFF',
};
const players: Player[] = [
  { id: 'p1', game_id: 'g1', team: 'home', name: 'Aoife', number: 7, status: 'active', sort_order: 0 },
];

describe('EditGameSheet', () => {
  it('prefills team names and saves edits + a new player', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<EditGameSheet game={game} players={players} onSave={onSave} onClose={() => {}} />);

    expect(screen.getByDisplayValue('Coolera')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Home team name'));
    await user.type(screen.getByLabelText('Home team name'), 'Coolera Strandhill');

    // add a home player
    const addNames = screen.getAllByLabelText('New player name');
    await user.type(addNames[0], 'Niamh');
    await user.click(screen.getAllByText('Add')[0]);

    await user.click(screen.getByText('Save changes'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const arg = onSave.mock.calls[0][0];
    expect(arg.homeTeam).toBe('Coolera Strandhill');
    expect(arg.homeRows).toEqual([
      { id: 'p1', name: 'Aoife', number: '7' },
      { name: 'Niamh', number: '' },
    ]);
  });

  it('does not offer to remove players', () => {
    render(<EditGameSheet game={game} players={players} onSave={() => {}} onClose={() => {}} />);
    expect(screen.queryByLabelText('Remove Aoife')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/EditGameSheet.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement EditGameSheet**

Create `src/components/EditGameSheet.tsx`:

```tsx
import { useState } from 'react';
import type { Game, Player, Team } from '../types';
import PlayerRowsEditor, { type PlayerRowBase } from './PlayerRowsEditor';
import ColorKitPicker from './ColorKitPicker';
import TeamKitChip from './TeamKitChip';
import { Edit } from './icons';

export interface EditRow extends PlayerRowBase { id?: string }
interface Kit { primary: string; secondary: string }

interface Props {
  game: Game;
  players: Player[];
  onSave: (data: {
    homeTeam: string; awayTeam: string;
    homeKit: Kit; awayKit: Kit;
    homeRows: EditRow[]; awayRows: EditRow[];
  }) => void;
  onClose: () => void;
}

const rowsFor = (players: Player[], team: Team): EditRow[] =>
  players.filter((p) => p.team === team).map((p) => ({ id: p.id, name: p.name, number: p.number == null ? '' : String(p.number) }));

export default function EditGameSheet({ game, players, onSave, onClose }: Props) {
  const [homeTeam, setHomeTeam] = useState(game.home_team);
  const [awayTeam, setAwayTeam] = useState(game.away_team);
  const [homeKit, setHomeKit] = useState<Kit>({ primary: game.home_primary, secondary: game.home_secondary });
  const [awayKit, setAwayKit] = useState<Kit>({ primary: game.away_primary, secondary: game.away_secondary });
  const [homeRows, setHomeRows] = useState<EditRow[]>(() => rowsFor(players, 'home'));
  const [awayRows, setAwayRows] = useState<EditRow[]>(() => rowsFor(players, 'away'));
  const [picker, setPicker] = useState<Team | null>(null);

  const save = () => {
    if (!homeTeam.trim() || !awayTeam.trim()) return;
    onSave({ homeTeam: homeTeam.trim(), awayTeam: awayTeam.trim(), homeKit, awayKit, homeRows, awayRows });
  };

  const INPUT = 'w-full bg-surface-2 border border-line rounded-xl px-4 py-3 text-txt placeholder-txt-3 focus:outline-none focus:border-txt-3';

  const teamSection = (team: Team) => {
    const name = team === 'home' ? homeTeam : awayTeam;
    const setName = team === 'home' ? setHomeTeam : setAwayTeam;
    const kit = team === 'home' ? homeKit : awayKit;
    const rows = team === 'home' ? homeRows : awayRows;
    const setRows = team === 'home' ? setHomeRows : setAwayRows;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setPicker(team)} className="relative shrink-0 press" aria-label={`Choose ${team} kit`}>
            <TeamKitChip primary={kit.primary} secondary={kit.secondary} size={38} radius={11} />
            <span className="absolute -right-1 -bottom-1 w-[18px] h-[18px] rounded-full bg-txt text-bg grid place-items-center">
              <Edit size={11} />
            </span>
          </button>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label={`${team === 'home' ? 'Home' : 'Away'} team name`}
            className={`${INPUT} flex-1`}
          />
        </div>
        <PlayerRowsEditor players={rows as PlayerRowBase[]} onChange={(r) => setRows(r as EditRow[])} allowRemove={false} createRow={(nm, num) => ({ name: nm, number: num })} />
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative w-full bg-surface rounded-t-2xl border-t border-line p-4 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-extrabold text-txt mb-4">Edit game</h3>
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-2">Home</p>
              {teamSection('home')}
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-2">Away</p>
              {teamSection('away')}
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-line rounded-xl text-sm font-medium text-txt-2 press">Cancel</button>
            <button type="button" onClick={save} disabled={!homeTeam.trim() || !awayTeam.trim()} className="flex-1 py-3 bg-txt text-bg rounded-xl text-sm font-bold disabled:opacity-40 press">Save changes</button>
          </div>
        </div>
      </div>
      {picker && (
        <ColorKitPicker
          team={picker === 'home' ? homeTeam : awayTeam}
          value={picker === 'home' ? homeKit : awayKit}
          onChange={(kit) => (picker === 'home' ? setHomeKit(kit) : setAwayKit(kit))}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/EditGameSheet.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire EditGameSheet into LiveGame**

In `src/screens/LiveGame.tsx`:

Add imports and queries:

```tsx
import EditGameSheet from '../components/EditGameSheet';
import { endGame, updateGameTeamNames, updateGameColors, updatePlayer, updatePlayerOrder, insertPlayer } from '../db/queries';
import { v4 as uuid } from 'uuid';
import { Edit } from '../components/icons';
```

(Adjust the existing `import { endGame } from '../db/queries';` line to the combined import above; keep the existing `ChevronLeft` import — add `Edit` alongside it or import from the same module.)

Pull `reload` from the hook (it is already returned by `useGame`). Update the destructure to include it:

```tsx
  const {
    game, events, players, currentPeriod, periodCount, periodName, periodLengthMinutes,
    currentPeriodLabel, addEvent, undoLastEvent, advancePeriod, substitute, reload,
    liveSeconds, clockRunning, clockIsOvertime, toggleClock, setClockSeconds,
  } = useGame(gameId!);
```

Add sheet state near the other `useState` calls:

```tsx
  const [showEdit, setShowEdit] = useState(false);
```

Add the save handler (place near `handleEndGame`):

```tsx
  const handleSaveEdit = useCallback(
    (data: {
      homeTeam: string; awayTeam: string;
      homeKit: { primary: string; secondary: string };
      awayKit: { primary: string; secondary: string };
      homeRows: { id?: string; name: string; number: string }[];
      awayRows: { id?: string; name: string; number: string }[];
    }) => {
      updateGameTeamNames(db, gameId!, data.homeTeam, data.awayTeam);
      updateGameColors(db, gameId!, {
        home_primary: data.homeKit.primary, home_secondary: data.homeKit.secondary,
        away_primary: data.awayKit.primary, away_secondary: data.awayKit.secondary,
      });
      const applyRows = (rows: { id?: string; name: string; number: string }[], team: Team) => {
        rows.filter((r) => r.name.trim()).forEach((r, i) => {
          const number = r.number ? parseInt(r.number, 10) : null;
          if (r.id) {
            updatePlayer(db, r.id, { name: r.name.trim(), number });
            updatePlayerOrder(db, r.id, i);
          } else {
            insertPlayer(db, { id: uuid(), game_id: gameId!, team, name: r.name.trim(), number, status: 'active', sort_order: i });
          }
        });
      };
      applyRows(data.homeRows, 'home');
      applyRows(data.awayRows, 'away');
      persist();
      reload();
      setShowEdit(false);
    },
    [db, gameId, persist, reload]
  );
```

Replace the header's right-hand period `<span>` with a period label + Edit button. Change:

```tsx
        <span className="text-xs text-txt-3">
          {currentPeriodLabel ? currentPeriodLabel : `${periodName} ${currentPeriod} of ${periodCount}`}
        </span>
```

to:

```tsx
        <div className="flex items-center gap-2">
          <span className="text-xs text-txt-3">
            {currentPeriodLabel ? currentPeriodLabel : `${periodName} ${currentPeriod} of ${periodCount}`}
          </span>
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            aria-label="Edit game"
            className="w-8 h-8 shrink-0 grid place-items-center rounded-full bg-surface-2 border border-line text-txt press"
          >
            <Edit size={15} />
          </button>
        </div>
```

Render the sheet near the other modals (e.g. just before `{showClockEdit && (`):

```tsx
      {showEdit && (
        <EditGameSheet
          game={game}
          players={players}
          onSave={handleSaveEdit}
          onClose={() => setShowEdit(false)}
        />
      )}
```

- [ ] **Step 6: Run the full suite + typecheck**

Run: `npx vitest run && npx tsc -b`
Expected: PASS / no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/EditGameSheet.tsx src/components/EditGameSheet.test.tsx src/screens/LiveGame.tsx
git commit -m "feat: in-game Edit sheet for team name, colours, and players"
```

---

### Task 8: Verify, version bump, changelog

**Files:**
- Modify: `package.json`, `package-lock.json`, `CHANGELOG.md`

- [ ] **Step 1: Full verification**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all tests pass, no lint errors, build succeeds. Fix anything that fails before continuing.

- [ ] **Step 2: Bump the patch version**

Set `version` to `1.1.25` in `package.json`, and update the root `"version": "1.1.25"` in `package-lock.json` (the top-level one and the `packages[""].version`). Confirm:

Run: `node -p "require('./package.json').version"`
Expected: `1.1.25`

- [ ] **Step 3: Add a CHANGELOG entry**

Prepend an entry to `CHANGELOG.md` (match the existing format) covering:

```
## 1.1.25

- Edit and reorder players when setting up a game (no more remove-and-re-add).
- Minor edits during a live game: correct a team name or colours, and add or fix a player's details from a new Edit button.
- Saved-teams library: save any team you build at setup and reuse it later; manage multiple teams per sport in Settings (upgrades the old single "default team").
- Gaelic Football: record 45's (shares the actions row with the Penalty button).
- Basketball: added an Assist button.
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump to 1.1.25, changelog for team & player refinements"
```

---

## Self-Review

**Spec coverage:**
- Edit players at setup → Task 4 (editor) + Task 5 (wired into GameSetup). ✓
- Reorder players → Task 2 (`sort_order`) + Task 4 (▲▼) + Task 5 (persisted on start) + Task 7 (persisted mid-game). ✓
- In-game minor edits (team name, colours, player details) → Task 2 (queries) + Task 7 (sheet + wiring). ✓
- Gaelic 45 → Task 1. ✓
- Basketball Assist → Task 1. ✓
- Remember teams (saved-teams library) → Task 3 (model + helpers + migration) + Task 5 (save/use at setup) + Task 6 (manage in Settings). ✓
- Not-in-scope (mid-game delete disabled, no drag-drop, device-only) → honoured (Task 7 `allowRemove={false}`, ▲▼ throughout, localStorage only). ✓
- Version bump + changelog → Task 8. ✓

**Placeholder scan:** none — every step has concrete code/commands.

**Type consistency:** `PlayerRowBase { name; number }` used consistently; `EditRow extends PlayerRowBase { id? }`; `SavedTeam`/`SavedTeamPlayer` consistent across Tasks 3/5/6; query signatures (`updatePlayer`, `updatePlayerOrder`, `updateGameTeamNames`, `insertPlayer` with `sort_order`) match between Task 2 definitions and Tasks 5/7 call sites; `getSavedTeams`/`upsertSavedTeam`/`deleteSavedTeam` signatures consistent across Tasks 3/5/6.
