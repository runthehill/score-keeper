# Sideline Refresh — Phase 2: Team-colour system — Design Spec

The headline of the refresh: **per-game team "kit" colours**. Each team gets a primary +
secondary colour, persisted with the game, plus the colour helpers and the picker UI that later
phases (Live, Setup, Share) consume. Phase 2 of 7.

> **Authored while the owner was away.** The interactive brainstorm was skipped — this spec is
> faithful to the design handoff (`docs/design-handoff/`, which the owner provided and approved at
> the decomposition level). The few judgement calls are flagged under **Decisions** for review.

## Decisions (flag for review)
1. **Flat colour fields**, not the handoff's nested `home: { name, primary, secondary }`. The
   existing schema/`Game` is flat (`home_team`, `home_score`), and code reads `game.home_team`
   everywhere — adding flat `home_primary` / `home_secondary` / `away_primary` / `away_secondary`
   is additive and non-disruptive. (Reversible later if you prefer nesting.)
2. **DB defaults:** home = Slate `#15171C` / `#FFFFFF`, away = Royal `#1E63D6` / `#FFFFFF` (the
   handoff's away default, chosen to contrast most homes). **Per-sport** home defaults (e.g. Rugby
   → Sligo RFC black/red) belong to Game Setup → **Phase 4**; Phase 2 just needs sane column
   defaults so existing + new games always have colours.
3. **This replaces the neutral home=blue / away=amber convention** (and the note in CLAUDE.md) —
   the whole design is per-game kits. CLAUDE.md is updated here.
4. The picker is built **unwired** in Phase 2 (a standalone component). Wiring it into Setup is
   **Phase 4**.

## Data model

### Schema migration (`src/db/schema.ts`)
Existing user DBs (loaded from IndexedDB) already have a `games` table without the new columns, and
`CREATE TABLE IF NOT EXISTS` won't add them — so we need an **`ALTER TABLE ADD COLUMN`** migration
guarded by `PRAGMA table_info`. Fresh DBs get the columns from the `CREATE TABLE`.

- Add to the `games` `CREATE TABLE`: `home_primary TEXT NOT NULL DEFAULT '#15171C'`,
  `home_secondary TEXT NOT NULL DEFAULT '#FFFFFF'`, `away_primary TEXT NOT NULL DEFAULT '#1E63D6'`,
  `away_secondary TEXT NOT NULL DEFAULT '#FFFFFF'`.
- Add a migration run inside `createTables` (after the `CREATE TABLE`s):
```ts
function hasColumn(db: Database, table: string, column: string): boolean {
  const stmt = db.prepare(`PRAGMA table_info(${table})`);
  let found = false;
  while (stmt.step()) { if ((stmt.getAsObject().name as string) === column) found = true; }
  stmt.free();
  return found;
}
function addColumn(db: Database, table: string, column: string, ddl: string): void {
  if (!hasColumn(db, table, column)) db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}
// after CREATE TABLEs:
addColumn(db, 'games', 'home_primary', "TEXT NOT NULL DEFAULT '#15171C'");
addColumn(db, 'games', 'home_secondary', "TEXT NOT NULL DEFAULT '#FFFFFF'");
addColumn(db, 'games', 'away_primary', "TEXT NOT NULL DEFAULT '#1E63D6'");
addColumn(db, 'games', 'away_secondary', "TEXT NOT NULL DEFAULT '#FFFFFF'");
```
(SQLite `ALTER TABLE ADD COLUMN ... NOT NULL DEFAULT` backfills existing rows.)

### Types (`src/types/index.ts`)
`Game` gains: `home_primary: string; home_secondary: string; away_primary: string; away_secondary: string;`.
These are **required** (the DB columns always have a value via the defaults, and `rowToGame` always
reads them). Adding required fields means every `Game` object **literal** must be updated — grep for
them; the known one is the `game()` factory in `src/utils/shareCard.test.ts`. Update each to include
the four fields.

### Queries (`src/db/queries.ts`)
- `rowToGame` maps the 4 new columns.
- `insertGame` accepts optional `home_primary?`, `home_secondary?`, `away_primary?`, `away_secondary?`
  and, when provided, includes them in the INSERT (otherwise the column defaults apply). Keep
  back-compat with current callers (which omit them).
- Add `updateGameColors(db, id, { home_primary, home_secondary, away_primary, away_secondary })`
  (used when the picker changes a kit; wired in Phase 4).

## Colour helpers (`src/utils/teamColors.ts`) — pure, tested
Ported **exactly** from the handoff (`docs/design-handoff/src/data.jsx` + the README `teamAccent`):
```ts
export function hexToRgb(hex: string): { r: number; g: number; b: number };
export function rgba(hex: string, a: number): string;            // "rgba(r,g,b,a)"
export function relLuminance(hex: string): number;               // WCAG relative luminance
export function inkOn(hex: string): string;                      // luminance>0.42 ? '#0C0E12' : '#FFFFFF'
export function isPale(hex: string): boolean;                    // luminance > 0.7
export function teamAccent(team: { primary: string; secondary: string }, dark: boolean): string;
  // bgL = relLuminance(dark ? '#0C0E12' : '#EDEFF3'); ratio(c) = (max(L(c),bgL)+.05)/(min(L(c),bgL)+.05)
  // ratio(primary) >= 2.3 → primary; else ratio(secondary) >= 2.3 → secondary; else dark?'#E8ECF2':'#15171C'
```

## Kits data (`src/sports/kits.ts`)
```ts
export interface Kit { name: string; primary: string; secondary: string; }
export const KITS: Kit[];        // the 10 presets (Crimson…Slate), exact hexes from the handoff
export const SWATCHES: string[]; // the 18 swatch hexes
export const DEFAULT_HOME_KIT = { primary: '#15171C', secondary: '#FFFFFF' };
export const DEFAULT_AWAY_KIT = { primary: '#1E63D6', secondary: '#FFFFFF' };
```

## Components

### `TeamKitChip` (`src/components/TeamKitChip.tsx`)
A rounded square: `primary` fill + a `secondary` diagonal slash
(`clipPath: 'polygon(100% 0, 100% 100%, 38% 100%)'`) + a 1px inset ring (darker if `isPale(primary)`).
Props: `{ primary, secondary, size?=34, radius?=10, ring?=true }`. The team's visual ID everywhere.

### `ColorKitPicker` (`src/components/ColorKitPicker.tsx`)
A bottom sheet (matching the app's modal style on the new tokens — `bg-surface`, `border-line`,
`rounded-t-2xl`, scrim, grab handle, `Close` icon). Props: `{ team: string, value: { primary, secondary },
onChange: (kit: { primary, secondary }) => void, onClose: () => void }`. Local `primary`/`secondary`
state; `commit(p,s)` updates state + calls `onChange`. Contents (per the handoff screenshot):
- **Live preview row:** `TeamKitChip` (size 46) + team name + `PRIMARY · SECONDARY` hex + a sample
  score numeral in the primary.
- **Quick kits:** a 5-wide grid of the 10 `KITS` (each a `TeamKitChip` + name; selected ring).
- **Primary** and **Secondary**: each a 9-wide `SwatchGrid` of `SWATCHES` (selected shows a `Check`
  in `inkOn(colour)`; pale swatches get a hairline).
- **Done** button (closes).
A small internal `SwatchGrid` helper (9-wide grid) is fine within this file.

## Testing (TDD)
- **`src/utils/teamColors.test.ts`** — `relLuminance` (white≈1, black=0), `inkOn` (dark ink on pale,
  white on dark), `isPale`, `hexToRgb` (3- and 6-digit), `rgba`, and `teamAccent` (near-black primary
  on dark → falls back to secondary or neutral; a vivid primary → returns primary).
- **`src/db/schema.test.ts`** — using `initSqlJs()` + `new SQL.Database()` (as `queries.test.ts` does):
  (a) fresh DB → `games` has the 4 colour columns; (b) simulate an "old" DB (create a `games` table
  **without** the colour columns + insert a row), run `createTables`, assert the columns were added
  and the existing row got the defaults.
- **`src/components/TeamKitChip.test.tsx`** — renders; the primary element has the primary background;
  the slash element is present.
- **`src/components/ColorKitPicker.test.tsx`** — shows the team title; clicking a Quick-kit calls
  `onChange` with that kit's `{primary,secondary}`; clicking a Primary swatch calls `onChange` with
  the new primary; **Done** calls `onClose`. (Mock nothing — pure render + `userEvent`.)

## CLAUDE.md update
Replace the "Team colors: home = blue / away = amber — neutral" convention note with: team colours
are now **per-game kits** (primary + secondary), chosen at setup and stored on the game; UI tints use
`teamAccent` (theme-aware), the true kit shows in `TeamKitChip`.

## Versioning
Bump `package.json` 1.1.7 → 1.1.8 (+ lockfile root) and add a `CHANGELOG.md` `[1.1.8]` entry.

## Out of scope (later phases)
Wiring the picker into Game Setup + per-sport home defaults (P4); the Blocks scoreboard / scoring
buttons / play-by-play consuming `teamAccent` (P3); the share card (P6); the reusable `Sheet`/`Button`/
`Pill` primitives (extract when more screens need them).
