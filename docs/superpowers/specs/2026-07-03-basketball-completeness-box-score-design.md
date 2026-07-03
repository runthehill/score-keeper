# Basketball Completeness + Box Score — Design

**Date:** 2026-07-03

## Summary

Round out basketball scoring/stat tracking and add an end-of-game box score,
plus a small Gaelic label fix:

1. **Gaelic 45** label `"45'"` → `"45"` (it's a 45-metre kick, not feet).
2. **Split scoring buttons** — each basketball scoring button (FT / 2PT / 3PT)
   splits into a large *made* area (records the score) and a thin *miss* strip
   (records a 0-point missed attempt).
3. **Split Rebound** into **Oreb** (`off_rebound`) and **Dreb** (`def_rebound`).
4. **Turnover** (`turnover`, "TO") stat — shares the foul row.
5. **Subs** button stays on the Undo / Next-Quarter line (already the case when
   the game has players; confirm/keep).
6. **End-of-game box score** for basketball (per-player table with team totals),
   **shareable as an image**. The live play-by-play is unchanged — it shows all
   events for every sport.

All config-driven and event-sourced: misses are 0-point events, so the score
stays a pure sum of `events`. Shared components get small, backward-compatible
extensions; other sports are untouched.

## Type changes (`src/types`)

`ScoringEventConfig` gains an optional miss descriptor:

```ts
export interface ScoringEventConfig {
  type: string;
  label: string;
  points: number;
  icon: string;
  color?: string;
  miss?: { type: string; label: string }; // when set, the button splits made/miss
}
```

No other type changes. `StatEventConfig` is unchanged.

## Config (`src/sports/configs.ts`)

- **Gaelic**: change the `45` stat `label` from `"45'"` to `"45"`.
- **Basketball scoring events** gain `miss`:
  - `free_throw` → `miss: { type: 'free_throw_miss', label: 'Missed FT' }`
  - `field_goal` → `miss: { type: 'field_goal_miss', label: 'Missed 2PT' }`
  - `three_pointer` → `miss: { type: 'three_pointer_miss', label: 'Missed 3PT' }`
- **Basketball stat events** become (in this order, so the 3-per-row wrap yields
  `[Assist · Oreb · Dreb]` / `[Steal · Foul · TO]`):

  ```ts
  statEvents: [
    { type: 'assist',       label: 'Assist', icon: '👟' },
    { type: 'off_rebound',  label: 'Oreb',   icon: '📈' },
    { type: 'def_rebound',  label: 'Dreb',   icon: '🛡️' },
    { type: 'steal',        label: 'Steal',  icon: '🤚' },
    { type: 'foul',         label: 'Foul',   icon: '⚠️' },
    { type: 'turnover',     label: 'TO',     icon: '🔄' },
  ]
  ```

  (`rebound` is removed; the team-foul bonus logic keys on `foul`, unchanged.)

## Made/miss split button

**`eventLabel` (`src/utils/format.ts`)** also resolves miss types: search
`scoringEvents` by `type`, then by `miss.type` (returning `miss.label`), then
`statEvents`, then `cardEvents`, then the humanized fallback. So `field_goal_miss`
renders as "Missed 2PT" in the log and stats.

**`ScoreButton` (`src/components/ScoreButton.tsx`)** gains an optional
`onMiss?: () => void`. When `event.miss` is set and `onMiss` is provided, it
renders a **split** button inside one rounded, `overflow-hidden` container:

- top *made* area — the existing filled style (`+points`, label), ~⅔ height,
  calls `onClick`;
- bottom *miss* strip — a subtle tinted bar (`✗ miss`), ~⅓ height, calls `onMiss`.

The existing 0-point (outline) and normal (filled) variants are unchanged, so
sports without `miss` look identical to today.

**`ScoringRow` (`src/components/ScoringRow.tsx`)** gains `onMiss: (missType: string) => void`
and passes `onMiss={event.miss ? () => onMiss(event.miss!.type) : undefined}` to each button.

**`LiveGame` (`src/screens/LiveGame.tsx`)** wires `onMiss` on both scoring rows to
`handleScore(team, missType, 0)` — reusing the existing scoring flow. Because
points are 0, no score flash fires and the score is unaffected; when the team has
a roster the player picker opens. The picker title becomes **"Who missed?"** for
miss types (detected via `eventType.endsWith('_miss')`); otherwise unchanged.

Misses appear in the live event log like any other event (0-point, so no `+pts`
shown), via the extended `eventLabel`.

## Box score (`src/components/BoxScore.tsx`, new)

Rendered in `GameSummary` for basketball only (other sports keep the current
per-player stat list). Props: `{ game, events, players }`.

Per-player row (attributed events only), grouped Home then Away, each group
ending with a **Team** totals row computed from *all* that team's events
(so unattributed plays still count in totals):

| Col | Derivation |
|-----|-----------|
| PTS | sum of `points` |
| 2PT | `field_goal` made – (made + `field_goal_miss`) → `m-a` |
| 3PT | `three_pointer` made – (made + `three_pointer_miss`) → `m-a` |
| FT  | `free_throw` made – (made + `free_throw_miss`) → `m-a` |
| OR  | count `off_rebound` |
| DR  | count `def_rebound` |
| AST | count `assist` |
| STL | count `steal` |
| TO  | count `turnover` |
| PF  | count `foul` |

Columns: `#  Player  PTS  2PT  3PT  FT  OR  DR  AST  STL  TO  PF`. All rostered
players are listed (zeros included). If a team has no roster, only its Team row
shows. The table lives in an `overflow-x-auto` container so it scrolls
horizontally on narrow screens; the body never scrolls sideways. Team accents
(`teamAccent`) tint the player names / group headers, consistent with the rest
of the summary. Styling uses theme tokens.

## Shareable box score

`GameSummary` adds a **"Share box score"** button (basketball only) beside the
existing "Share result". It reuses the existing `exportShareCard`
(html-to-image) pipeline against a `ref` on the box-score card, producing a PNG
that shares (Web Share) or downloads — the same offline-capable flow as the
score card. The box-score card gets a compact header (teams + final score +
date) so the shared image is self-explanatory. The existing "Share result"
(scoreline) button is unchanged.

## Architecture fit

- **Config-driven:** all new events live in `configs.ts`; no sport-specific code
  paths — screens read the config. The split button and box score are gated by
  data (`event.miss`, `sport.id === 'basketball'`).
- **Event-sourced:** misses/stats are 0-point events appended to `events`; score
  is still a pure sum; the box score is derived by counting event types.
- **Offline-first:** the box-score image export runs entirely client-side, like
  the existing share card.
- **Isolation:** `BoxScore` is one focused component (compute + render a table);
  `ScoreButton`'s split is an additive branch; `eventLabel` gains one lookup.

## Testing

- **Config:** Gaelic `45` label is `"45"`; basketball has `off_rebound`,
  `def_rebound`, `turnover` stats and no `rebound`; each basketball scoring event
  has a `miss` with the expected type/label.
- **`eventLabel`:** resolves `field_goal_miss` → "Missed 2PT", `off_rebound` →
  "Oreb", `turnover` → "TO".
- **`ScoreButton`:** with `event.miss` + `onMiss`, renders the miss strip and
  clicking it calls `onMiss`; clicking the made area calls `onClick`; without
  `miss` the button is unchanged (no strip).
- **`ScoringRow`:** forwards `onMiss(missType)` for missable events.
- **`BoxScore`:** computes made-attempts (`field_goal` ×3 + `field_goal_miss` ×2
  → `3-5`), rebounds O/D split, PTS sum, and team totals including an
  unattributed event; lists rostered players with zeros.
- **`LiveGame`** (light): the miss picker title reads "Who missed?" for a miss type.

## Out of scope

- Box scores for non-basketball sports (they keep the current stat list).
- Shot-percentage columns / advanced stats.
- Editing/undoing an individual stat from the box score.

## Delivery

Bump the patch version in `package.json` (and the root `version` in
`package-lock.json`) and add a `CHANGELOG.md` entry before the deploying push.
