# Play-by-Play Readability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the Gaelic goals-points scoreline in the live play-by-play's running tally, and label events with their proper sport-config names everywhere they appear ("Throw-in", "Off-side", "Yellow Card").

**Architecture:** Two pure helpers in `format.ts` (`runningTally`, `eventLabel`), unit-tested, then wired into `EventLog` (the live play-by-play) and `GameSummary` (player stats). No data-model change.

**Tech Stack:** React + TypeScript, vitest. Scores stay event-sourced; `runningTally` reuses the existing `formatGaelicScore`.

---

## File Structure
- `src/utils/format.ts` — add `runningTally` + `eventLabel` (import `SportConfig`).
- `src/utils/format.test.ts` — unit tests for both.
- `src/components/EventLog.tsx` — use both helpers; drop the `capitalize` class; render tally per `isSplit`.
- `src/screens/GameSummary.tsx` — use `eventLabel` for player-stat labels.

---

### Task 1: `runningTally` + `eventLabel` helpers (TDD)

**Files:**
- Modify: `src/utils/format.ts`
- Test: `src/utils/format.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/utils/format.test.ts`, update the top import line to add the two new helpers, and add an import for `getSportConfig`:

```ts
import { formatScore, formatGaelicScore, formatTimer, formatEventTime, formatRelativeDay, runningTally, eventLabel } from './format';
import { getSportConfig } from '../sports/configs';
```

Then append these two describe blocks to the end of the file:

```ts
describe('runningTally', () => {
  it('non-split: cumulative point totals as strings', () => {
    const events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[] = [
      { event_type: 'goal', team: 'home', points: 1 },
      { event_type: 'goal', team: 'away', points: 1 },
      { event_type: 'goal', team: 'home', points: 1 },
    ];
    expect(runningTally(events, false)).toEqual([
      { home: '1', away: '0' },
      { home: '1', away: '1' },
      { home: '2', away: '1' },
    ]);
  });

  it('split: cumulative goals-points per team', () => {
    const events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[] = [
      { event_type: 'goal', team: 'home', points: 3 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'away', points: 1 },
    ];
    expect(runningTally(events, true)).toEqual([
      { home: '1-00', away: '0-00' },
      { home: '1-01', away: '0-00' },
      { home: '1-01', away: '0-01' },
    ]);
  });
});

describe('eventLabel', () => {
  const soccer = getSportConfig('soccer');
  it('uses the config label for a stat type', () => {
    expect(eventLabel(soccer, 'throw_in')).toBe('Throw-in');
    expect(eventLabel(soccer, 'offside')).toBe('Off-side');
  });
  it('uses the config label for a card type', () => {
    expect(eventLabel(soccer, 'card_yellow')).toBe('Yellow Card');
  });
  it('falls back to a capitalised de-underscored type when unknown', () => {
    expect(eventLabel(soccer, 'substitution')).toBe('Substitution');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/utils/format.test.ts`
Expected: FAIL — `runningTally`/`eventLabel` are not exported yet.

- [ ] **Step 3: Implement the helpers**

In `src/utils/format.ts`, add `SportConfig` to the types import:

```ts
import type { GameEvent, ScoreDisplay, SportConfig, Team } from '../types';
```

Then add these two functions (place them after `formatGaelicScore`, which `runningTally` reuses):

```ts
export function runningTally(
  events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[],
  isSplit: boolean,
): { home: string; away: string }[] {
  let homeTotal = 0;
  let awayTotal = 0;
  return events.map((e, i) => {
    if (e.team === 'home') homeTotal += e.points;
    else awayTotal += e.points;
    if (isSplit) {
      const soFar = events.slice(0, i + 1);
      return { home: formatGaelicScore(soFar, 'home'), away: formatGaelicScore(soFar, 'away') };
    }
    return { home: String(homeTotal), away: String(awayTotal) };
  });
}

export function eventLabel(sport: SportConfig, type: string): string {
  const match =
    sport.scoringEvents.find((e) => e.type === type) ??
    sport.statEvents.find((e) => e.type === type) ??
    sport.cardEvents.find((e) => e.type === type);
  if (match) return match.label;
  const words = type.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/utils/format.test.ts`
Expected: PASS (all existing + 5 new assertions).

- [ ] **Step 5: Commit**

```bash
git add src/utils/format.ts src/utils/format.test.ts
git commit -m "feat: add runningTally + eventLabel format helpers"
```

---

### Task 2: Wire helpers into EventLog + GameSummary

**Files:**
- Modify: `src/components/EventLog.tsx`
- Modify: `src/screens/GameSummary.tsx`

- [ ] **Step 1: Update EventLog imports**

In `src/components/EventLog.tsx`, change the format import and add the config import:

```tsx
import { formatEventTime, runningTally, eventLabel } from '../utils/format';
import { getSportConfig } from '../sports/configs';
```

(Keep the existing `import type { Game, GameEvent, Player, Team } from '../types';`, `useThemeContext`, and `teamAccent` imports.)

- [ ] **Step 2: Replace the running-score block**

In `EventLog`, replace this block:

```tsx
  // Running score forward, then show newest first. The full log stays reachable in a
  // scroll area (preserving the pre-refresh behaviour) with the running tally per row.
  const withScores: { event: GameEvent; home: number; away: number }[] = [];
  let homeRunning = 0;
  let awayRunning = 0;
  for (const event of events) {
    if (event.team === 'home') homeRunning += event.points;
    else awayRunning += event.points;
    withScores.push({ event, home: homeRunning, away: awayRunning });
  }
  const rows = [...withScores].reverse();
```

with:

```tsx
  const sport = getSportConfig(game.sport);
  const isSplit = sport.scoreDisplay === 'split';
  // Running tally forward (Gaelic shows goals-points; other sports a point total),
  // then show newest first in the scroll area.
  const tallies = runningTally(events, isSplit);
  const rows = events.map((event, i) => ({ event, tally: tallies[i] })).reverse();
```

- [ ] **Step 3: Update the row render**

In the `rows.map(...)` body, change the destructure, the `label`, the label span (drop `capitalize`), and the tally span. Replace the whole `rows.map` block:

```tsx
        {rows.map(({ event: e, tally }) => {
          const isHome = e.team === 'home';
          const accent = accentFor(e.team);
          const teamName = isHome ? game.home_team : game.away_team;
          const player = e.player_id ? playerMap.get(e.player_id) : undefined;
          const label = eventLabel(sport, e.event_type);
          return (
            <div key={e.id} className="flex items-center gap-3 py-2 px-1">
              <span className="font-score font-semibold text-sm text-txt-3 w-[42px] tabular-nums shrink-0">{formatEventTime(e.timestamp, gameStartedAt)}</span>
              <span className="w-[3px] h-[22px] rounded-full shrink-0" style={{ background: accent }} />
              <span className="text-[13.5px] font-bold text-txt shrink-0">{label}</span>
              <span className="text-[12.5px] text-txt-3 truncate flex-1 min-w-0">{teamName}{player ? ` · ${player.name}` : ''}</span>
              <span className="flex items-center gap-2.5 shrink-0">
                <span className="font-score text-[13px] text-txt-3 tabular-nums">{isSplit ? `${tally.home} v ${tally.away}` : `${tally.home}-${tally.away}`}</span>
                {e.points > 0 && <span className="font-score font-bold text-[15px]" style={{ color: accent }}>+{e.points}</span>}
              </span>
            </div>
          );
        })}
```

(The only changes vs the original: `{ event: e, tally }` destructure, `label` via `eventLabel(sport, …)`, the label span no longer has `capitalize`, and the tally span branches on `isSplit`.)

- [ ] **Step 4: Use eventLabel in GameSummary player stats**

In `src/screens/GameSummary.tsx`, add `eventLabel` to the format import (line 9):

```tsx
import { formatGaelicScore, eventLabel } from '../utils/format';
```

Then change the player-stats label line (currently line ~129):

```tsx
                    {Array.from(byType.entries()).map(([type, count]) => `${count} ${eventLabel(sport, type)}`).join(', ')}
```

(`sport` is already in scope from `getSportConfig(game.sport)` higher in the component.)

- [ ] **Step 5: Build, lint, full suite**

Run: `npm run build && npm run lint`
Expected: both succeed.
Run: `npx vitest run`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/components/EventLog.tsx src/screens/GameSummary.tsx
git commit -m "feat: Gaelic G-PP running tally + proper stat labels in play-by-play and summary"
```

---

## After both tasks

- [ ] Version bump `package.json` → 1.1.22 (+ `package-lock.json` root `version`), add a `CHANGELOG.md` `[1.1.22]` entry (insert above the current top entry on this branch).
- [ ] Final holistic review of the whole diff, then open the PR for the user's review. Note the PR stacks on #28 (v1.1.21) — version/changelog ordering reconciled at merge.

## Self-Review
- **Spec coverage:** #2 running tally → Task 1 `runningTally` + Task 2 Steps 2-3. #3 labels → Task 1 `eventLabel` + Task 2 Steps 3-4. Drop `capitalize` → Task 2 Step 3. Tests → Task 1. Versioning → After-both-tasks. All covered.
- **Placeholders:** none — every code step is complete.
- **Type consistency:** `runningTally(events, isSplit)` and `eventLabel(sport, type)` signatures match between format.ts, the tests, and both call sites; `SportConfig` has `scoringEvents`/`statEvents`/`cardEvents` (all with `type`+`label`); `getSportConfig(game.sport)` returns `SportConfig`.
