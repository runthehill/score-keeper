# Play-by-Play Readability — Design Spec

Two related improvements to the live play-by-play (and the summary's player stats), bundled into one PR because they touch the same component:

- **#2 — Gaelic G-PP running tally.** The play-by-play's per-row running score should read as goals-points for Gaelic, not a misleading points total.
- **#3 — Proper stat labels.** Events should use the sport config's defined labels ("Throw-in", "Off-side", "Yellow Card") instead of the raw de-underscored event type.

## #2 — Gaelic G-PP in the running tally

**Today:** `EventLog` accumulates each team's `points` and shows a per-row running tally as `{homeTotal}-{awayTotal}`. For Gaelic this renders e.g. **"7-5"** — which looks like a goals-points scoreline but is actually home-total vs away-total. Misleading for the only sport with a G-PP scoreline.

**Change:** for split-score sports (`scoreDisplay === 'split'`, i.e. Gaelic), render each row's tally as **each team's running G-PP**, e.g. **"1-04 v 0-07"** (home `v` away). Non-split sports keep `{home}-{away}` exactly as now. The " v " separator is used for the split case specifically because `-` collides with the hyphen inside each G-PP score.

**Helper (`src/utils/format.ts`):**
```ts
export function runningTally(
  events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[],
  isSplit: boolean,
): { home: string; away: string }[]
```
Walks events forward; for each index returns the cumulative display per team — G-PP via the existing `formatGaelicScore` (on the slice up to and including that event) when `isSplit`, else the cumulative point total as a string. Pure and unit-tested. (Reusing `formatGaelicScore` keeps it consistent with the scoreboard/summary; the O(n²) slicing is negligible for game-sized event lists.)

`EventLog` computes `isSplit` once from the sport config, calls `runningTally(events, isSplit)`, zips it with the events (forward), reverses for newest-first display, and renders the tally span as `isSplit ? \`${t.home} v ${t.away}\` : \`${t.home}-${t.away}\``. The per-event `+{points}` delta on the right is unchanged.

## #3 — Proper stat labels

**Today:** `EventLog` (line 51) and `GameSummary` player stats (line 129) both label events with `event_type.replace(/_/g, ' ')` → "throw in", "offside", "card yellow", "drop goal". The nice labels already exist in `src/sports/configs.ts` (`throw_in → "Throw-in"`, `offside → "Off-side"`, `card_yellow → "Yellow Card"`, etc.) but aren't used here.

**Change — helper (`src/utils/format.ts`):**
```ts
export function eventLabel(sport: SportConfig, type: string): string
```
Looks the label up across the config's `scoringEvents`, `statEvents`, then `cardEvents` (all three have `type` + `label`). If found, returns the config label verbatim. Otherwise falls back to the de-underscored type with its first letter capitalised (e.g. a `substitution` event → "Substitution"). Used in both `EventLog` and `GameSummary`.

Because config labels are already correctly cased ("Throw-in", "Yellow Card"), **remove the `capitalize` CSS class** from `EventLog`'s label span — CSS `capitalize` would title-case hyphenated labels into "Throw-In" / "Off-Side", losing the config's intended casing. The helper's first-letter-capitalise fallback covers the un-configured cases.

`GameSummary` already has `sport` (from `getSportConfig`) and imports from `../utils/format`; line 129 becomes `${count} ${eventLabel(sport, type)}`. (Pluralisation — "2 Off-sides" — is out of scope; labels only.)

## Files
- `src/utils/format.ts` — add `runningTally` + `eventLabel`; add `SportConfig` to the `../types` import.
- `src/utils/format.test.ts` — add tests for both helpers.
- `src/components/EventLog.tsx` — import `getSportConfig` + the two helpers; use `runningTally` for the tally; `eventLabel` for the row label; drop `capitalize`; render tally per `isSplit`.
- `src/screens/GameSummary.tsx` — import `eventLabel`; use it for the player-stat `byType` labels.

## Testing
- `format.test.ts`:
  - `runningTally` non-split: e.g. `[home +1, away +1, home +1]` → `[{home:'1',away:'0'},{home:'1',away:'1'},{home:'2',away:'1'}]`.
  - `runningTally` split (Gaelic): `[home goal(3), home point(1), away point(1)]` → `[{home:'1-00',away:'0-00'},{home:'1-01',away:'0-00'},{home:'1-01',away:'0-01'}]`.
  - `eventLabel`: `getSportConfig('soccer')` + `'throw_in'` → "Throw-in"; `'offside'` → "Off-side"; `'card_yellow'` → "Yellow Card"; an unknown `'substitution'` → "Substitution".
- Existing suite stays green; `npm run build` + `npm run lint` clean.

## Out of scope
- Changing the scoreboard, share card, by-period breakdown, or cards display (already correct).
- Pluralising stat labels in the summary.
- Colouring the running tally per team (it stays a single muted span, as today).

## Versioning
Bump `package.json` → 1.1.22 (+ lockfile root), add a `CHANGELOG.md` `[1.1.22]` entry. (This PR stacks on #28/v1.1.21; the version + changelog ordering is reconciled when merging, after #28 lands.)
