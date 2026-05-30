# Sideline Refresh — Phase 2: Team-colour system — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-game team "kit" colours — DB migration + `Game` fields, theme-aware colour helpers, the kit presets/swatches, and the `TeamKitChip` + `ColorKitPicker` components (unwired; consumed by later phases).

**Architecture:** Flat colour columns on `games` (with an `ALTER TABLE` migration for existing DBs); pure colour helpers (`teamAccent`/`inkOn`/luminance) in `src/utils/teamColors.ts`; kit data in `src/sports/kits.ts`; two presentational components on the Phase-1 tokens.

**Tech Stack:** Vite + React + TS, Tailwind v3 (Phase-1 tokens), sql.js, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-05-30-sideline-refresh-phase2-team-colors-design.md`. Phase 2 of 7.

---

## File structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/utils/teamColors.ts` (+test) | Pure colour helpers | Create |
| `src/sports/kits.ts` (+test) | `KITS`, `SWATCHES`, defaults | Create |
| `src/db/schema.ts` | Colour columns + migration | Modify |
| `src/db/schema.test.ts` | Migration tests | Create |
| `src/types/index.ts` | `Game` colour fields | Modify |
| `src/db/queries.ts` | rowToGame, insertGame colours, `updateGameColors` | Modify |
| `src/utils/shareCard.test.ts` | Update the `game()` factory literal | Modify |
| `src/components/TeamKitChip.tsx` (+test) | Two-tone kit chip | Create |
| `src/components/ColorKitPicker.tsx` (+test) | Kit picker sheet | Create |
| `CLAUDE.md` / `package.json` / `CHANGELOG.md` | Convention note + version 1.1.8 | Modify |

All commit commands include the project's co-author trailer.

---

### Task 1: Colour helpers

**Files:** Create `src/utils/teamColors.ts`, `src/utils/teamColors.test.ts`

- [ ] **Step 1: Write the failing tests** — create `src/utils/teamColors.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hexToRgb, rgba, relLuminance, inkOn, isPale, teamAccent } from './teamColors';

describe('teamColors', () => {
  it('hexToRgb handles 6- and 3-digit hex', () => {
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#1E63D6')).toEqual({ r: 30, g: 99, b: 214 });
  });
  it('rgba formats', () => {
    expect(rgba('#000000', 0.5)).toBe('rgba(0,0,0,0.5)');
  });
  it('relLuminance: white≈1, black=0', () => {
    expect(relLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(relLuminance('#000000')).toBe(0);
  });
  it('inkOn: dark ink on pale, white ink on dark', () => {
    expect(inkOn('#FFFFFF')).toBe('#0C0E12');
    expect(inkOn('#15171C')).toBe('#FFFFFF');
  });
  it('isPale', () => {
    expect(isPale('#FFFFFF')).toBe(true);
    expect(isPale('#1E63D6')).toBe(false);
  });
  it('teamAccent picks a readable accent', () => {
    expect(teamAccent({ primary: '#E03131', secondary: '#FFFFFF' }, true)).toBe('#E03131');
    expect(teamAccent({ primary: '#15171C', secondary: '#FFFFFF' }, true)).toBe('#FFFFFF');
    expect(teamAccent({ primary: '#15171C', secondary: '#0C0E12' }, true)).toBe('#E8ECF2');
  });
});
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/utils/teamColors.test.ts` (module not found).

- [ ] **Step 3: Implement** — create `src/utils/teamColors.ts`:

```ts
export interface RGB { r: number; g: number; b: number; }

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgba(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function relLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const f = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

// Best-contrast ink (near-black / white) for text drawn ON a given colour.
export function inkOn(hex: string): string {
  return relLuminance(hex) > 0.42 ? '#0C0E12' : '#FFFFFF';
}

// A pale colour that needs a hairline to read on the bg.
export function isPale(hex: string): boolean {
  return relLuminance(hex) > 0.7;
}

// Theme-aware accent for UI tint: the kit colour that reads against the bg, else a neutral.
export function teamAccent(team: { primary: string; secondary: string }, dark: boolean): string {
  const bgL = relLuminance(dark ? '#0C0E12' : '#EDEFF3');
  const ratio = (c: string): number => {
    const cl = relLuminance(c);
    return (Math.max(cl, bgL) + 0.05) / (Math.min(cl, bgL) + 0.05);
  };
  if (ratio(team.primary) >= 2.3) return team.primary;
  if (ratio(team.secondary) >= 2.3) return team.secondary;
  return dark ? '#E8ECF2' : '#15171C';
}
```

- [ ] **Step 4: Run → PASS** — `npx vitest run src/utils/teamColors.test.ts`.

- [ ] **Step 5: Commit**
```bash
git add src/utils/teamColors.ts src/utils/teamColors.test.ts
git commit -m "feat: add theme-aware team colour helpers (teamAccent, inkOn, luminance)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Kit presets + swatches

**Files:** Create `src/sports/kits.ts`, `src/sports/kits.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/sports/kits.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { KITS, SWATCHES, DEFAULT_HOME_KIT, DEFAULT_AWAY_KIT } from './kits';

describe('kits', () => {
  it('has 10 named kits, each with hex primary + secondary', () => {
    expect(KITS).toHaveLength(10);
    for (const k of KITS) {
      expect(k.name).toBeTruthy();
      expect(k.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(k.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
  it('has 18 swatches', () => {
    expect(SWATCHES).toHaveLength(18);
  });
  it('exposes sensible defaults', () => {
    expect(DEFAULT_HOME_KIT).toEqual({ primary: '#15171C', secondary: '#FFFFFF' });
    expect(DEFAULT_AWAY_KIT).toEqual({ primary: '#1E63D6', secondary: '#FFFFFF' });
  });
});
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/sports/kits.test.ts`.

- [ ] **Step 3: Implement** — create `src/sports/kits.ts`:

```ts
export interface Kit {
  name: string;
  primary: string;
  secondary: string;
}

export const KITS: Kit[] = [
  { name: 'Crimson', primary: '#E03131', secondary: '#FFFFFF' },
  { name: 'Royal', primary: '#1E63D6', secondary: '#FFFFFF' },
  { name: 'Forest', primary: '#1E8E4E', secondary: '#F4C430' },
  { name: 'Midnight', primary: '#16245A', secondary: '#E03131' },
  { name: 'Tangerine', primary: '#F25F1F', secondary: '#15171C' },
  { name: 'Sky', primary: '#2B9AD5', secondary: '#16245A' },
  { name: 'Maroon', primary: '#7A1F3D', secondary: '#E0A92E' },
  { name: 'Violet', primary: '#5B2A86', secondary: '#F4C430' },
  { name: 'Emerald', primary: '#0F9D72', secondary: '#FFFFFF' },
  { name: 'Slate', primary: '#15171C', secondary: '#FFFFFF' },
];

export const SWATCHES: string[] = [
  '#E03131', '#F25F1F', '#F59E0B', '#F4C430', '#86C61A', '#1E8E4E',
  '#0F9D72', '#0FB5B0', '#2B9AD5', '#1E63D6', '#16245A', '#5B2A86',
  '#A21CAF', '#D6336C', '#7A1F3D', '#8B5E34', '#15171C', '#FFFFFF',
];

export const DEFAULT_HOME_KIT = { primary: '#15171C', secondary: '#FFFFFF' };
export const DEFAULT_AWAY_KIT = { primary: '#1E63D6', secondary: '#FFFFFF' };
```

- [ ] **Step 4: Run → PASS** — `npx vitest run src/sports/kits.test.ts`.

- [ ] **Step 5: Commit**
```bash
git add src/sports/kits.ts src/sports/kits.test.ts
git commit -m "feat: add team kit presets + swatch palette" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: DB migration + Game fields + queries

**Files:** Modify `src/db/schema.ts`, `src/types/index.ts`, `src/db/queries.ts`, `src/utils/shareCard.test.ts`; Create `src/db/schema.test.ts`

- [ ] **Step 1: Write the failing migration tests** — create `src/db/schema.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import { createTables } from './schema';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
beforeEach(async () => { SQL = await initSqlJs(); });

function colorsOf(db: Database, id: string) {
  const stmt = db.prepare('SELECT home_primary, home_secondary, away_primary, away_secondary FROM games WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

describe('schema team-colour migration', () => {
  it('fresh DB has colour columns with defaults', () => {
    const db = new SQL.Database();
    createTables(db);
    db.run("INSERT INTO games (id, sport, home_team, away_team, started_at) VALUES ('g1','soccer','A','B','2026-01-01T00:00:00Z')");
    expect(colorsOf(db, 'g1')).toEqual({
      home_primary: '#15171C', home_secondary: '#FFFFFF', away_primary: '#1E63D6', away_secondary: '#FFFFFF',
    });
  });

  it('migrates an existing DB lacking the colour columns and backfills defaults', () => {
    const db = new SQL.Database();
    db.run(`CREATE TABLE games (id TEXT PRIMARY KEY, sport TEXT NOT NULL, home_team TEXT NOT NULL, away_team TEXT NOT NULL, home_score INTEGER NOT NULL DEFAULT 0, away_score INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'in_progress', started_at TEXT NOT NULL, ended_at TEXT, notes TEXT NOT NULL DEFAULT '')`);
    db.run("INSERT INTO games (id, sport, home_team, away_team, started_at) VALUES ('old','rugby_union','X','Y','2026-01-01T00:00:00Z')");
    createTables(db); // runs the migration
    expect(colorsOf(db, 'old')).toEqual({
      home_primary: '#15171C', home_secondary: '#FFFFFF', away_primary: '#1E63D6', away_secondary: '#FFFFFF',
    });
  });
});
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/db/schema.test.ts` (columns don't exist yet).

- [ ] **Step 3: Update the schema** — replace `src/db/schema.ts` with:

```ts
import type { Database } from 'sql.js';

function hasColumn(db: Database, table: string, column: string): boolean {
  const stmt = db.prepare(`PRAGMA table_info(${table})`);
  let found = false;
  while (stmt.step()) {
    if ((stmt.getAsObject().name as string) === column) found = true;
  }
  stmt.free();
  return found;
}

function addColumn(db: Database, table: string, column: string, ddl: string): void {
  if (!hasColumn(db, table, column)) db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

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
      notes TEXT NOT NULL DEFAULT '',
      home_primary TEXT NOT NULL DEFAULT '#15171C',
      home_secondary TEXT NOT NULL DEFAULT '#FFFFFF',
      away_primary TEXT NOT NULL DEFAULT '#1E63D6',
      away_secondary TEXT NOT NULL DEFAULT '#FFFFFF'
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

  // Migration: existing DBs already have a `games` table without the colour columns
  // (CREATE TABLE IF NOT EXISTS is a no-op for them), so add them if missing.
  addColumn(db, 'games', 'home_primary', "TEXT NOT NULL DEFAULT '#15171C'");
  addColumn(db, 'games', 'home_secondary', "TEXT NOT NULL DEFAULT '#FFFFFF'");
  addColumn(db, 'games', 'away_primary', "TEXT NOT NULL DEFAULT '#1E63D6'");
  addColumn(db, 'games', 'away_secondary', "TEXT NOT NULL DEFAULT '#FFFFFF'");
}
```

- [ ] **Step 4: Add the `Game` fields** — in `src/types/index.ts`, add to the `Game` interface (after `notes: string;`):
```ts
  home_primary: string;
  home_secondary: string;
  away_primary: string;
  away_secondary: string;
```

- [ ] **Step 5: Update `queries.ts`** — in `src/db/queries.ts`:

Add the import at the top (after the existing type import):
```ts
import { DEFAULT_HOME_KIT, DEFAULT_AWAY_KIT } from '../sports/kits';
```

In `rowToGame`, add the four fields to the returned object (after `notes: ...,`):
```ts
    home_primary: row.home_primary as string, home_secondary: row.home_secondary as string,
    away_primary: row.away_primary as string, away_secondary: row.away_secondary as string,
```

Replace `insertGame` with:
```ts
export function insertGame(db: Database, game: { id: string; sport: string; home_team: string; away_team: string; started_at: string; notes?: string; home_primary?: string; home_secondary?: string; away_primary?: string; away_secondary?: string }) {
  db.run(
    `INSERT INTO games (id, sport, home_team, away_team, started_at, notes, home_primary, home_secondary, away_primary, away_secondary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [game.id, game.sport, game.home_team, game.away_team, game.started_at, game.notes ?? '',
      game.home_primary ?? DEFAULT_HOME_KIT.primary, game.home_secondary ?? DEFAULT_HOME_KIT.secondary,
      game.away_primary ?? DEFAULT_AWAY_KIT.primary, game.away_secondary ?? DEFAULT_AWAY_KIT.secondary]
  );
}
```

Add (e.g. after `updateGameScore`):
```ts
export function updateGameColors(db: Database, id: string, colors: { home_primary: string; home_secondary: string; away_primary: string; away_secondary: string }) {
  db.run('UPDATE games SET home_primary = ?, home_secondary = ?, away_primary = ?, away_secondary = ? WHERE id = ?',
    [colors.home_primary, colors.home_secondary, colors.away_primary, colors.away_secondary, id]);
}
```

- [ ] **Step 6: Fix the `Game` literal in tests** — first grep for other literals: `grep -rn ": Game = {\|): Game {\|as Game" src` (the known one is the `game()` factory in `src/utils/shareCard.test.ts`). In that factory, add to the returned object (before `...overrides,`):
```ts
    home_primary: '#15171C', home_secondary: '#FFFFFF', away_primary: '#1E63D6', away_secondary: '#FFFFFF',
```
If the grep finds other `Game` literals, add the four fields to each.

- [ ] **Step 7: Run → PASS + no regressions**
Run: `npx vitest run src/db/schema.test.ts` → PASS.
Run: `npx vitest run` → all green (existing `queries.test.ts`, `shareCard.test.ts` still pass).
Run: `npm run build` → SUCCESS (the `Game` type change typechecks everywhere).

- [ ] **Step 8: Commit**
```bash
git add src/db/schema.ts src/db/schema.test.ts src/types/index.ts src/db/queries.ts src/utils/shareCard.test.ts
git commit -m "feat: persist per-game team colours (migration + Game fields + queries)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: TeamKitChip component

**Files:** Create `src/components/TeamKitChip.tsx`, `src/components/TeamKitChip.test.tsx`

- [ ] **Step 1: Write the failing test** — create `src/components/TeamKitChip.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamKitChip from './TeamKitChip';

describe('TeamKitChip', () => {
  it('renders the chip with a secondary slash overlay', () => {
    render(<TeamKitChip primary="#E03131" secondary="#FFFFFF" />);
    expect(screen.getByTestId('team-kit-chip')).toBeInTheDocument();
    const slash = screen.getByTestId('team-kit-slash');
    expect(slash).toHaveStyle({ clipPath: 'polygon(100% 0, 100% 100%, 38% 100%)' });
  });
});
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/components/TeamKitChip.test.tsx`.

- [ ] **Step 3: Implement** — create `src/components/TeamKitChip.tsx`:

```tsx
import { isPale } from '../utils/teamColors';

interface Props {
  primary: string;
  secondary: string;
  size?: number;
  radius?: number;
  ring?: boolean;
}

export default function TeamKitChip({ primary, secondary, size = 34, radius = 10, ring = true }: Props) {
  const ringColor = isPale(primary) ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.14)';
  return (
    <div
      data-testid="team-kit-chip"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        background: primary,
        boxShadow: ring ? `inset 0 0 0 1px ${ringColor}` : 'none',
      }}
    >
      <div
        data-testid="team-kit-slash"
        style={{ position: 'absolute', inset: 0, background: secondary, clipPath: 'polygon(100% 0, 100% 100%, 38% 100%)' }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run → PASS** — `npx vitest run src/components/TeamKitChip.test.tsx`.

- [ ] **Step 5: Commit**
```bash
git add src/components/TeamKitChip.tsx src/components/TeamKitChip.test.tsx
git commit -m "feat: add TeamKitChip (two-tone kit swatch)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: ColorKitPicker component

**Files:** Create `src/components/ColorKitPicker.tsx`, `src/components/ColorKitPicker.test.tsx`

- [ ] **Step 1: Write the failing test** — create `src/components/ColorKitPicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColorKitPicker from './ColorKitPicker';

const value = { primary: '#15171C', secondary: '#FFFFFF' };

describe('ColorKitPicker', () => {
  it('shows the team kit title', () => {
    render(<ColorKitPicker team="Sligo RFC" value={value} onChange={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Sligo RFC kit')).toBeInTheDocument();
  });

  it('selecting a quick kit calls onChange with that kit', async () => {
    const onChange = vi.fn();
    render(<ColorKitPicker team="A" value={value} onChange={onChange} onClose={() => {}} />);
    await userEvent.setup().click(screen.getByText('Crimson'));
    expect(onChange).toHaveBeenCalledWith({ primary: '#E03131', secondary: '#FFFFFF' });
  });

  it('selecting a primary swatch calls onChange with the new primary', async () => {
    const onChange = vi.fn();
    render(<ColorKitPicker team="A" value={value} onChange={onChange} onClose={() => {}} />);
    await userEvent.setup().click(screen.getAllByLabelText('#1E63D6')[0]);
    expect(onChange).toHaveBeenCalledWith({ primary: '#1E63D6', secondary: '#FFFFFF' });
  });

  it('Done calls onClose', async () => {
    const onClose = vi.fn();
    render(<ColorKitPicker team="A" value={value} onChange={() => {}} onClose={onClose} />);
    await userEvent.setup().click(screen.getByText('Done'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/components/ColorKitPicker.test.tsx`.

- [ ] **Step 3: Implement** — create `src/components/ColorKitPicker.tsx`:

```tsx
import { useState } from 'react';
import { KITS, SWATCHES } from '../sports/kits';
import { isPale, inkOn } from '../utils/teamColors';
import TeamKitChip from './TeamKitChip';
import { Check, Close } from './icons';

interface Kit {
  primary: string;
  secondary: string;
}

interface Props {
  team: string;
  value: Kit;
  onChange: (kit: Kit) => void;
  onClose: () => void;
}

function SwatchGrid({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  return (
    <div className="grid grid-cols-9 gap-2">
      {SWATCHES.map((c) => {
        const active = value.toLowerCase() === c.toLowerCase();
        const pale = isPale(c);
        return (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            aria-label={c}
            className="aspect-square rounded-md relative press"
            style={{
              background: c,
              boxShadow: active
                ? '0 0 0 2px var(--surface), 0 0 0 4px var(--txt)'
                : `inset 0 0 0 1px ${pale ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.12)'}`,
            }}
          >
            {active && (
              <span className="absolute inset-0 grid place-items-center" style={{ color: inkOn(c) }}>
                <Check size={15} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function ColorKitPicker({ team, value, onChange, onClose }: Props) {
  const [primary, setPrimary] = useState(value.primary);
  const [secondary, setSecondary] = useState(value.secondary);

  const commit = (p: string, s: string) => {
    setPrimary(p);
    setSecondary(s);
    onChange({ primary: p, secondary: s });
  };

  const eyebrow = 'text-[11px] font-extrabold uppercase tracking-[0.09em] text-txt-3 mb-2.5';

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-surface rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto border-t border-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold text-txt">{team} kit</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-full bg-surface-2 border border-line text-txt-2">
            <Close size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-2 border border-line mb-5">
          <TeamKitChip primary={primary} secondary={secondary} size={46} radius={13} />
          <div className="flex-1 min-w-0">
            <div className="text-base font-extrabold text-txt truncate">{team}</div>
            <div className="text-xs text-txt-3 mt-0.5 tracking-wide">{primary.toUpperCase()} · {secondary.toUpperCase()}</div>
          </div>
          <div className="font-score font-bold text-3xl leading-none" style={{ color: primary }}>14</div>
        </div>

        <p className={eyebrow}>Quick kits</p>
        <div className="grid grid-cols-5 gap-2 mb-5">
          {KITS.map((k) => {
            const active = k.primary === primary && k.secondary === secondary;
            return (
              <button key={k.name} type="button" onClick={() => commit(k.primary, k.secondary)} className="flex flex-col items-center gap-1.5 press">
                <div className="rounded-xl p-0.5" style={{ boxShadow: active ? '0 0 0 2px var(--txt)' : 'none' }}>
                  <TeamKitChip primary={k.primary} secondary={k.secondary} size={40} radius={10} />
                </div>
                <span className={`text-[10.5px] font-semibold ${active ? 'text-txt' : 'text-txt-3'}`}>{k.name}</span>
              </button>
            );
          })}
        </div>

        <p className={eyebrow}>Primary</p>
        <div className="mb-5"><SwatchGrid value={primary} onPick={(c) => commit(c, secondary)} /></div>
        <p className={eyebrow}>Secondary</p>
        <div className="mb-6"><SwatchGrid value={secondary} onPick={(c) => commit(primary, c)} /></div>

        <button type="button" onClick={onClose} className="w-full py-4 rounded-xl bg-txt text-bg text-base font-bold">
          Done
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run → PASS** — `npx vitest run src/components/ColorKitPicker.test.tsx` (4 tests).

- [ ] **Step 5: Commit**
```bash
git add src/components/ColorKitPicker.tsx src/components/ColorKitPicker.test.tsx
git commit -m "feat: add ColorKitPicker (kit presets + swatch grids)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: CLAUDE.md update + version + final verification

**Files:** Modify `CLAUDE.md`, `package.json`, `package-lock.json`, `CHANGELOG.md`

- [ ] **Step 1: Update the team-colour convention in `CLAUDE.md`**

Find the line under "## Conventions" that reads (the exact hex may differ slightly — match the "Team colors" line):
```md
- Team colors: home = blue (#3b82f6), away = amber (#f59e0b) — neutral, no good/bad connotation
```
Replace with:
```md
- Team colours are **per-game kits** (a primary + secondary, chosen at setup, stored on the game). UI tints use `teamAccent(team, dark)` (theme-aware, in `src/utils/teamColors.ts`); the true kit shows via `TeamKitChip`. (Superseded the old fixed home=blue/away=amber convention in the Sideline refresh.)
```

- [ ] **Step 2: Bump version**

In `package.json`, change `"version": "1.1.7",` → `"version": "1.1.8",`. In `package-lock.json`, change the root `"version": "1.1.7"` (line 3) and the `packages[""]` `"version": "1.1.7"` (near line 9) → `"1.1.8"` (do not touch dependency versions).

- [ ] **Step 3: Changelog entry**

In `CHANGELOG.md`, replace:
```md
All notable changes to this project will be documented in this file.

## [1.1.7] - 2026-05-30
```
with:
```md
All notable changes to this project will be documented in this file.

## [1.1.8] - 2026-05-30

### Added
- Per-game team "kit" colours (Sideline refresh, Phase 2): each team gets a primary + secondary colour stored with the game, plus theme-aware colour helpers, the kit presets/swatches, and the kit chip + colour picker. Wired into the screens in later phases.

## [1.1.7] - 2026-05-30
```

- [ ] **Step 4: Full verification**

Run: `npx vitest run` → PASS (all suites, incl. `teamColors`, `kits`, `schema`, `TeamKitChip`, `ColorKitPicker`).
Run: `npm run build` → SUCCESS.
Run: `npm run lint` → 0 errors.

- [ ] **Step 5: Commit**
```bash
git add CLAUDE.md package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.8 + note per-game kit colours in CLAUDE.md" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Plan self-review

**Spec coverage:**
- Colour helpers (`teamAccent`/`inkOn`/luminance/`isPale`/`rgba`/`hexToRgb`) → Task 1 ✅
- KITS/SWATCHES + defaults → Task 2 ✅
- Schema migration (ALTER + PRAGMA guard) + defaults → Task 3 ✅
- `Game` colour fields (required) + update `Game` literals → Task 3 (Steps 4, 6) ✅
- queries: rowToGame, insertGame optional colours, `updateGameColors` → Task 3 ✅
- `TeamKitChip` → Task 4 ✅
- `ColorKitPicker` (preview, quick kits, swatch grids, Done) → Task 5 ✅
- Testing (helpers, migration, chip, picker) → Tasks 1–5 ✅
- CLAUDE.md convention update → Task 6 ✅
- Versioning 1.1.8 → Task 6 ✅
- Out of scope (Setup wiring, Blocks scoreboard, share card) — respected ✅

**Placeholder scan:** none — complete code in every step; the `Game`-literal grep (Task 3 Step 6) names the known target and instructs adding the fields to any others found.

**Type/name consistency:** `Kit { name, primary, secondary }`, `teamAccent`/`inkOn`/`isPale`/`rgba`/`relLuminance`/`hexToRgb`, `KITS`/`SWATCHES`/`DEFAULT_HOME_KIT`/`DEFAULT_AWAY_KIT`, `Game.home_primary/home_secondary/away_primary/away_secondary`, `insertGame(...optional colours)`, `updateGameColors`, `TeamKitChip` props, `ColorKitPicker` props (`team`,`value`,`onChange`,`onClose`) — consistent across tasks. Default hexes (`#15171C`/`#FFFFFF`/`#1E63D6`) match between schema, `insertGame`, `kits.ts`, and the `Game`-literal fixtures.
