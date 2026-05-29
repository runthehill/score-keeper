# Gaelic Football — Two-Point Score — Design Spec

Add support for the Gaelic Football "2-pointer" to the score keeper. Under the rules, a
point scored from outside the 40m arc is worth **2 points** (umpire raises an **orange**
flag), alongside the existing goal (**green** flag, 3 points) and point (**white** flag,
1 point).

This is a small, contained feature: a new scoring event plus the rendering changes needed
to display it correctly. The event-sourced data model means most totals update on their own.

## Background

The score keeper is event-sourced: every score is an append-only row in the `events`
table carrying a `points` value. A team's integer total (`games.home_score` /
`games.away_score`) is recomputed by **summing `points`** across that team's events
(`recalcScore` in `src/hooks/useGame.ts`). Gaelic Football additionally shows the
traditional **goals–points** scoreline (e.g. `1-07`) built by `formatGaelicScore` in
`src/utils/format.ts`.

Sport behaviour is data-driven: all sport-specific rules live in `src/sports/configs.ts`
as `SportConfig` objects. There are no sport-specific code paths.

## Design decisions

| Decision | Choice |
|----------|--------|
| Scoreline display | Fold the 2-pointer into the **points figure** (official GAA convention). A 2-pointer adds 2, so the scoreline stays `goals-points` and the parenthesised total stays correct. No separate breakdown. |
| Button styling | Keep the team colour (home blue / away amber) as the button base; add a small **flag-coloured dot** per score type. |
| Flag colours | Applied to **all three** Gaelic buttons: goal = green, point = white, two-pointer = orange. |
| Button label | "Two-Pointer" |
| Event type | `two_pointer` (snake_case, consistent with basketball's `three_pointer`) |

## Changes

### 1. Types — `src/types/index.ts`

Add one optional field to `ScoringEventConfig`:

```ts
export interface ScoringEventConfig {
  type: string;
  label: string;
  points: number;
  icon: string;
  color?: string; // optional flag/indicator colour; renders a dot on the score button
}
```

`color` is optional, so the other sports' configs are unaffected.

### 2. Sport config — `src/sports/configs.ts`

Gaelic Football's `scoringEvents` becomes three entries, each with a flag colour:

```ts
scoringEvents: [
  { type: 'goal',        label: 'Goal',        points: 3, icon: '🥅',  color: '#22c55e' }, // green flag
  { type: 'point',       label: 'Point',       points: 1, icon: '☝️', color: '#e5e7eb' }, // white flag
  { type: 'two_pointer', label: 'Two-Pointer', points: 2, icon: '🟠', color: '#f97316' }, // orange flag
],
```

### 3. Scoreline — `src/utils/format.ts`

`formatGaelicScore` currently counts `point` events. Change it so the points figure is the
**sum of `points` from all non-goal events**:

```
goals  = count(event_type === 'goal')
points = Σ points  for events where event_type !== 'goal'
```

This is robust and self-consistent: the integer total is itself `Σ points`, so
`goals × 3 + points-figure` always equals the parenthesised total — the scoreline and the
total can never disagree. Non-scoring events (cards, substitutions) carry `points: 0` and
contribute nothing.

The signature gains `'points'`:

```ts
formatGaelicScore(events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[], team: Team): string
```

Worked example — 1 goal, 5 points, 1 two-pointer: `goals = 1`, `points = 5 + 2 = 7`,
total `= 3 + 5 + 2 = 10` → displays **`1-07`** with **`(10)`** beneath.

### 4. Score button — `src/components/ScoreButton.tsx`

When `event.color` is set, render a small coloured dot before the label, reusing the inline
`<span style={{ color }}>●</span>` pattern already used by the card picker in
`src/screens/LiveGame.tsx`. The button keeps its home/away background tint. Buttons whose
config has no `color` (all other sports) render exactly as before.

`ScoringRow` already maps over every `sport.scoringEvents` entry, so the third Gaelic button
appears automatically — the same three-in-a-row layout basketball already uses.

## Unchanged by design

These already operate on `points` and arbitrary `event_type`s, so they handle a 2-pointer
with no change:

- **Integer totals** — `recalcScore` sums `points`; feeds the scoreboard total, history
  cards (`GameCard`), period breakdown, and end-game dialogs.
- **Undo** — `undoLastEvent` removes the last event and recalculates.
- **Player attribution** — the existing "Who scored?" pending-score flow passes through any
  event type.
- **Export** — CSV/JSON (`src/utils/export.ts`) are generic over event type and points.
- **Event log** — `EventLog` derives its label from the event type, so a `two_pointer`
  event renders as "two pointer".

## Testing (TDD)

- **`src/utils/format.test.ts`** — add a case with a `two_pointer` asserting `1-07`
  (1 goal + 5 points + 1 two-pointer); update the existing fixtures to include `points` for
  the new signature. Keep the zero/padding cases.
- **`src/sports/configs.test.ts`** — assert Gaelic Football has a `two_pointer` scoring
  event worth 2 points.

Existing tests for the count-based behaviour continue to pass (no `two_pointer` events →
identical results).

## Versioning (per CLAUDE.md, before push)

- Bump `package.json` version `1.1.2` → `1.1.3`.
- Add a `CHANGELOG.md` entry describing the Gaelic Football 2-point score.

## Out of scope

- Distinguishing two-point frees from two-point scores from play (one button covers both).
- Any geometry/arc detection — the user decides which button to tap.
- Changes to other sports.
