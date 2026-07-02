# Team & Player Refinements — Design

**Date:** 2026-07-02

## Summary

A set of refinements to how teams and players are managed, plus two new
sport events:

1. Edit players when adding them to a game (inline, no remove-and-re-add).
2. Reorder players.
3. Minor edits during a live game — team name, kit colours, and add/fix
   a player's details.
4. Gaelic Football: record **45's** (a zero-point stat sharing the row
   with the Penalty button).
5. Basketball: an **Assist** button.
6. Remember teams for reuse on-device — a **saved-teams library** (multiple
   named teams per sport), saved from setup and managed in Settings.

All of this is offline / device-only, consistent with the app's
event-sourced, config-driven architecture. No cloud sync.

## Shared building blocks

These are built once and reused across every surface that touches players.

### A. `PlayerRowsEditor` component

A presentational, reorderable, inline-editable player list. Props roughly:

```ts
interface PlayerRow { name: string; number: string }
interface PlayerRowsEditorProps {
  players: PlayerRow[];
  onChange: (next: PlayerRow[]) => void;
  allowRemove?: boolean; // default true; false for mid-game editing
}
```

Behaviour:

- Each existing row renders an always-editable `#` input and name input —
  there is no separate "edit mode"; fixing a detail is just typing in place.
- **▲ / ▼ move buttons** on each row reorder it (disabled at the ends).
  Chosen over drag-and-drop: reliable on touch, no new dependency.
- **✕** removes a row (hidden when `allowRemove` is false).
- A trailing "name + # + Add" control appends a new row (unchanged from the
  current add UX).

Consumers: `GameSetup` (per team), the Settings saved-team editor, and the
in-game Edit sheet.

### B. Saved-teams data model (device-only, localStorage)

New types in `src/types`:

```ts
export interface SavedTeamPlayer { name: string; number: string }
export interface SavedTeam {
  id: string;
  teamName: string;
  players: SavedTeamPlayer[]; // ordered
  primary?: string;
  secondary?: string;
}
```

`AppSettings` gains:

```ts
savedTeams?: Partial<Record<Sport, SavedTeam[]>>;
```

**Migration:** on load, if the legacy single `squads[sport]: DefaultSquad`
is present and `savedTeams[sport]` is not, convert it into a one-element
`savedTeams[sport]` array (generating an `id`). This preserves any team the
user has already saved. The `squads` key is read once for migration and then
superseded by `savedTeams`. `DefaultSquad` / `DefaultSquadPlayer` types are
retained (or aliased) for the migration path; `squadKit` continues to work
against a `SavedTeam` (same optional `primary`/`secondary` shape).

### C. Player ordering in the DB

`players` gains a `sort_order INTEGER NOT NULL DEFAULT 0` column (added via the
existing `addColumn` migration helper). `listPlayers` orders by
`sort_order, number`.

- Existing games are unaffected: their rows are all `sort_order = 0`, so
  ordering falls back to `number` exactly as today.
- New games write sequential `sort_order` values from the setup list order.
- `Player` interface gains an optional `sort_order?: number`.

New / changed queries:

- `insertPlayer` — include `sort_order`.
- `updatePlayer(db, id, { name, number })` — edit a player's details.
- `updatePlayerOrder(db, id, sortOrder)` — persist a reorder (called per
  affected row, or a small batch helper for a team).
- `updateGameTeamNames(db, id, home, away)` — rename teams mid-game.

## Feature detail

### 1 & 2. Edit + reorder players at setup

`GameSetup`'s per-team player list is replaced by `PlayerRowsEditor`. Names
and numbers are corrected in place; ▲▼ reorders; ✕ removes. The list order is
carried into the game: `startGame` assigns `sort_order` from array index when
inserting players, so the live game and player pickers show the chosen order.

### 3. Minor edits during a game

A pencil icon in the `LiveGame` top bar opens an **Edit game** bottom sheet:

- **Team names** — home/away text inputs → `updateGameTeamNames`.
- **Kit colours** — kit chips that open the existing `ColorKitPicker`
  → `updateGameColors` (already implemented).
- **Players** — per team, a `PlayerRowsEditor` with `allowRemove={false}`.
  On save: existing rows update name/number and `sort_order`; new rows are
  inserted (`status: 'active'`, next `sort_order`).

Deletion is deliberately *not* offered mid-game to protect the event log
(events reference `player_id`). Removing a player remains a setup-only action.

Saving performs the DB writes, `persist()`s, and calls the `reload()` already
exposed by `useGame`, so the scoreboard and pickers reflect changes at once.

### 4. Gaelic Football 45

Add a zero-point stat event to the `gaelic_football` config:

```ts
{ type: '45', label: "45'", icon: '🦵' }
```

Gaelic then has two stat events (Penalty, 45). The existing
`ActionsRow` stat row uses `flex-wrap` with `min-w-[30%]`, so the two lay out
side by side — splitting the row with the Penalty button. It flows through the
existing stat → team → player picker path and is recorded with `points: 0`, so
it is tracked without affecting the score (same treatment as a Gaelic "wide").

### 5. Basketball Assist

Add to the `basketball` config's `statEvents`:

```ts
{ type: 'assist', label: 'Assist', icon: '👟' }
```

Same zero-point stat flow. No other code paths needed — screens read the
config.

### 6. Saved-teams library

**At setup (`GameSetup`):** for each team,

- a **"Use saved team ▾"** control opens a sheet listing that sport's saved
  teams (kit chip, name, player count). Selecting one fills the team name,
  kit, and players (as editable draft rows). Replaces today's single
  "Use [team]" button. Hidden/empty-state when the sport has no saved teams.
- a **"Save team ★"** action stores the current team (name, kit, players) into
  `savedTeams[sport]`. Upsert **by team name**: re-saving an existing name
  updates that entry instead of duplicating. Requires a non-empty team name;
  shows brief "Saved ✓" feedback.

**In Settings:** the "Default teams" section becomes **"Saved teams"**. Per
sport it opens a manager listing that sport's saved teams with add / edit /
delete. Each team is edited with the shared `PlayerRowsEditor` plus the kit
picker and name field (the current single-team editor generalised to a list).

## Architecture fit

- **Config-driven:** features 4 and 5 are pure data additions to
  `src/sports/configs.ts`; no sport-specific code paths.
- **Event-sourced:** 45 and Assist are zero-point events appended to the
  `events` table like existing stats; the score remains a pure sum.
- **Offline-first:** saved teams live in localStorage; player edits persist to
  SQLite → IndexedDB after every write.
- **Isolation:** `PlayerRowsEditor` has one job (edit an ordered player list)
  and a small interface, so setup, Settings, and the in-game sheet share it
  without duplicating logic.

## Testing

- `PlayerRowsEditor`: add, inline edit, reorder (▲▼ incl. end-disabled),
  remove, and `allowRemove={false}` hides remove.
- Settings migration: legacy `squads[sport]` → one-element `savedTeams[sport]`;
  save/edit/delete across multiple teams per sport.
- DB: `sort_order` migration is idempotent; `listPlayers` order; `updatePlayer`
  and `updateGameTeamNames` round-trip.
- `GameSetup`: reorder persists into inserted players' `sort_order`; save-team
  upsert-by-name; use-saved-team fills name/kit/players.
- `LiveGame` Edit sheet: rename team, change colours, add/edit players reflect
  after `reload()`; remove is unavailable.
- Config: Gaelic exposes a `45` stat; Basketball exposes an `assist` stat; both
  record `points: 0`.

## Out of scope

- Mid-game player deletion.
- Drag-and-drop reordering (▲▼ instead).
- Cloud / cross-device sync (device-only, as requested).

## Delivery note

Per project conventions, bump the patch version in `package.json` (and the root
`version` in `package-lock.json`) and add a `CHANGELOG.md` entry before the
push that deploys these changes.
