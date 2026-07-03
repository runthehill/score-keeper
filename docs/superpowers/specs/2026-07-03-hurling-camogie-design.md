# Add Hurling & Camogie — Design

**Date:** 2026-07-03

## Summary

Add two GAA stick codes as new sports. Both are near-clones of the existing
Gaelic Football config (split goals-points score display, 2 halves + Extra Time,
per-game kit colours), differing only in scoring, the long-range free stat, and
cards:

| | Scoring buttons | Stat buttons | Cards | Icon |
|---|---|---|---|---|
| **Hurling** | Point (1) · Goal (3) · Wide (0) | Penalty · 65 | Yellow · Black · Red | 🔵 |
| **Camogie** | Point (1) · Goal (3) · Wide (0) | Penalty · 45 | Yellow · Red | 🟣 |

Neither has the two-pointer. Hurling keeps a black card (like football); Camogie
does not. Adding a sport is data-driven, so the change is small.

## Files

- **`src/types/index.ts`** — extend the `Sport` union:
  `'rugby_union' | 'soccer' | 'gaelic_football' | 'basketball' | 'hurling' | 'camogie'`.
- **`src/sports/configs.ts`** — two new `SportConfig` entries after
  `gaelic_football`:

  ```ts
  {
    id: 'hurling',
    name: 'Hurling',
    icon: '🔵',
    defaultTeamName: 'Coolera Strandhill',
    periods: { count: 2, name: 'Half' },
    extraPeriods: [{ type: 'extra_time', label: 'Extra Time' }],
    scoreDisplay: 'split',
    scoringEvents: [
      { type: 'point', label: 'Point', points: 1, icon: '☝️', color: '#e5e7eb' },
      { type: 'goal', label: 'Goal', points: 3, icon: '🥅', color: '#22c55e' },
      { type: 'wide', label: 'Wide', points: 0, icon: '🚩' },
    ],
    statEvents: [
      { type: 'penalty', label: 'Penalty', icon: '🎯' },
      { type: '65', label: '65', icon: '🦵' },
    ],
    cardEvents: [
      { type: 'card_yellow', label: 'Yellow Card', color: '#facc15' },
      { type: 'card_black', label: 'Black Card', color: '#1a1a2e' },
      { type: 'card_red', label: 'Red Card', color: '#ef4444' },
    ],
  },
  {
    id: 'camogie',
    name: 'Camogie',
    icon: '🟣',
    defaultTeamName: 'Coolera Strandhill',
    periods: { count: 2, name: 'Half' },
    extraPeriods: [{ type: 'extra_time', label: 'Extra Time' }],
    scoreDisplay: 'split',
    scoringEvents: [
      { type: 'point', label: 'Point', points: 1, icon: '☝️', color: '#e5e7eb' },
      { type: 'goal', label: 'Goal', points: 3, icon: '🥅', color: '#22c55e' },
      { type: 'wide', label: 'Wide', points: 0, icon: '🚩' },
    ],
    statEvents: [
      { type: 'penalty', label: 'Penalty', icon: '🎯' },
      { type: '45', label: '45', icon: '🦵' },
    ],
    cardEvents: [
      { type: 'card_yellow', label: 'Yellow Card', color: '#facc15' },
      { type: 'card_red', label: 'Red Card', color: '#ef4444' },
    ],
  },
  ```

- **`src/sports/kits.ts`** — `DEFAULT_HOME_KITS` is a total `Record<Sport, …>`, so
  TypeScript **requires** both new keys:
  - `hurling: { primary: '#1E63D6', secondary: '#FFFFFF' }`
  - `camogie: { primary: '#5B2A86', secondary: '#F4C430' }`
- **`src/components/SportCard.tsx`** — `TINTS` is also a total `Record<Sport, …>`:
  - `hurling: '#1E63D6'`
  - `camogie: '#5B2A86'`
- **`src/sports/configs.test.ts`** — bump `SPORTS` length 4 → 6, extend the
  per-sport `it.each` list, and add Hurling/Camogie assertions.

## Why it just works elsewhere

- **Score display:** `formatGaelicScore` counts `event_type === 'goal'` as goals
  and sums the remaining points; Hurling/Camogie use the same `goal`/`point`
  types, so the goals-points scoreline (`G-PP`) is correct with no changes.
- **Home / setup / live game:** screens map over `SPORTS` and read the config;
  the new sports appear and behave automatically. The 65/45 are zero-point stat
  events that sit beside Penalty in the actions row and resolve to clean labels
  via `eventLabel` (found in `statEvents`).
- **Settings/saved teams/period lengths:** these are `Partial<Record<Sport, …>>`,
  so no new entries are required.

## Testing

- Config: `SPORTS` has length 6; `getSportConfig('hurling')` and `('camogie')`
  are valid (id, name, icon, split display).
- Hurling scoring is `point, goal, wide` (no `two_pointer`); stats include `65`
  and `penalty` but not `45`; cards include `card_black`.
- Camogie scoring is `point, goal, wide`; stats include `45` and `penalty` but
  not `65`; cards are `card_yellow`/`card_red` only (no `card_black`).
- The existing "all scoring events have non-negative points" and
  "all sports have extraPeriods array" invariants still hold for the new sports.

## Out of scope

- Any sport-specific code paths (there are none — everything reads the config).
- Changing Gaelic Football, or the two-pointer/45 already there.

## Delivery

Bump the patch version in `package.json` (and the root `version` in
`package-lock.json`) and add a `CHANGELOG.md` entry before the deploying push.
