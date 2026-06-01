# Gaelic Wides + Gaelic/Soccer Stat Tracking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Gaelic "Wide" (0-point, 4th scoring button), a Penalty stat for Gaelic + Soccer, and Throw-in/Corner/Off-side stats for Soccer.

**Architecture:** Mostly config (`configs.ts`). Plus: `ScoreButton` renders 0-point events as a de-emphasised tally; `LiveGame` fixes the player-picker wording for 0-point events; `ActionsRow`'s stat row wraps for ≥4 stats.

**Spec:** `docs/superpowers/specs/2026-06-01-gaelic-soccer-stats-design.md`.

All commits include: `-m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task 1: Config changes + tests

**Files:** Modify `src/sports/configs.ts`; Create `src/sports/configs.test.ts`; Modify `src/utils/format.test.ts`.

- [ ] **Step 1: Write the config test** — create `src/sports/configs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getSportConfig } from './configs';

describe('sport configs — stat tracking', () => {
  it('Gaelic has a 0-point Wide as a 4th scoring button', () => {
    const g = getSportConfig('gaelic_football');
    expect(g.scoringEvents).toHaveLength(4);
    const wide = g.scoringEvents.find((e) => e.type === 'wide');
    expect(wide).toBeDefined();
    expect(wide?.points).toBe(0);
  });
  it('Gaelic tracks a penalty stat', () => {
    expect(getSportConfig('gaelic_football').statEvents.map((s) => s.type)).toContain('penalty');
  });
  it('Soccer tracks assist, throw-in, corner, off-side, penalty', () => {
    const types = getSportConfig('soccer').statEvents.map((s) => s.type);
    expect(types).toEqual(expect.arrayContaining(['assist', 'throw_in', 'corner', 'offside', 'penalty']));
  });
});
```

- [ ] **Step 2: Add a formatGaelicScore test** — in `src/utils/format.test.ts`, add `formatGaelicScore` to the import from `./format` and append:

```ts
describe('formatGaelicScore', () => {
  const ev = (event_type: string, points: number) => ({ event_type, team: 'home' as const, points });
  it('shows goals-points and is unaffected by a wide (0 pts)', () => {
    const base = [ev('goal', 3), ev('point', 1), ev('two_pointer', 2)];
    expect(formatGaelicScore(base, 'home')).toBe('1-03');
    expect(formatGaelicScore([...base, ev('wide', 0)], 'home')).toBe('1-03');
  });
});
```

- [ ] **Step 3: Run → FAIL** — `npx vitest run src/sports/configs.test.ts` (wide/penalty/soccer-stats not present yet).

- [ ] **Step 4: Edit `src/sports/configs.ts`.**

In the **gaelic_football** entry, change `scoringEvents` to add Wide as the 4th, and set `statEvents`:
```ts
    scoringEvents: [
      { type: 'point', label: 'Point', points: 1, icon: '☝️', color: '#e5e7eb' },
      { type: 'two_pointer', label: 'Two-Pointer', points: 2, icon: '🟠', color: '#f97316' },
      { type: 'goal', label: 'Goal', points: 3, icon: '🥅', color: '#22c55e' },
      { type: 'wide', label: 'Wide', points: 0, icon: '🚩' },
    ],
    statEvents: [{ type: 'penalty', label: 'Penalty', icon: '🎯' }],
```

In the **soccer** entry, change `statEvents` to:
```ts
    statEvents: [
      { type: 'assist', label: 'Assist', icon: '👟' },
      { type: 'throw_in', label: 'Throw-in', icon: '🤾' },
      { type: 'corner', label: 'Corner', icon: '🚩' },
      { type: 'offside', label: 'Off-side', icon: '🚫' },
      { type: 'penalty', label: 'Penalty', icon: '🎯' },
    ],
```
(Leave rugby_union and basketball unchanged.)

- [ ] **Step 5: Run → PASS** — `npx vitest run src/sports/configs.test.ts src/utils/format.test.ts`. Then `npm run build` + `npm run lint`.

- [ ] **Step 6: Commit**
```bash
git add src/sports/configs.ts src/sports/configs.test.ts src/utils/format.test.ts
git commit -m "feat: add Gaelic wide + penalty and soccer throw-in/corner/off-side/penalty events"
```

---

### Task 2: ScoreButton renders 0-point events as a tally

**Files:** Rewrite `src/components/ScoreButton.tsx`; Modify `src/components/ScoreButton.test.tsx`.

- [ ] **Step 1: Update the test** — in `src/components/ScoreButton.test.tsx`, keep the existing points-scoring case and add a 0-point case:

```tsx
  it('renders a 0-point event as a label-only tally (no +N)', () => {
    const wide: ScoringEventConfig = { type: 'wide', label: 'Wide', points: 0, icon: '🚩' };
    const onClick = vi.fn();
    render(<ScoreButton event={wide} accent="#1E63D6" onClick={onClick} />);
    expect(screen.getByText('Wide')).toBeInTheDocument();
    expect(screen.queryByText('+0')).not.toBeInTheDocument();
  });
```
(Add it inside the existing `describe('ScoreButton', ...)`.)

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/components/ScoreButton.test.tsx` (current code renders `+0`).

- [ ] **Step 3: Implement** — replace `src/components/ScoreButton.tsx` with:

```tsx
import type { ScoringEventConfig } from '../types';
import { inkOn, rgba } from '../utils/teamColors';

interface Props {
  event: ScoringEventConfig;
  accent: string;
  onClick: () => void;
}

export default function ScoreButton({ event, accent, onClick }: Props) {
  // 0-point events (e.g. a Gaelic wide) are tallies, not scores — a de-emphasised
  // outline button with just the label, alongside the filled scoring buttons.
  if (event.points === 0) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative flex-1 flex items-center justify-center rounded-[15px] px-2 py-3 press-score text-txt-2"
        style={{ boxShadow: 'inset 0 0 0 1px var(--line-2)' }}
      >
        <span className="text-[13px] font-bold">{event.label}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex-1 flex flex-col items-center gap-0.5 rounded-[15px] px-2 pt-3 pb-2.5 press-score"
      style={{ background: accent, color: inkOn(accent), boxShadow: `0 5px 14px ${rgba(accent, 0.3)}` }}
    >
      <span className="font-score font-bold text-[26px] leading-none">+{event.points}</span>
      <span className="text-[11.5px] font-bold">{event.label}</span>
    </button>
  );
}
```

- [ ] **Step 4: Run → PASS** — `npx vitest run src/components/ScoreButton.test.tsx`. Then `npm run build` + `npm run lint`.

- [ ] **Step 5: Commit**
```bash
git add src/components/ScoreButton.tsx src/components/ScoreButton.test.tsx
git commit -m "feat: render 0-point scoring events (wides) as a de-emphasised tally"
```

---

### Task 3: Player-picker wording + stat-row wrap

**Files:** Modify `src/screens/LiveGame.tsx`, `src/components/ActionsRow.tsx`. Read each first.

- [ ] **Step 1: Fix the picker title in `LiveGame.tsx`.** Find:
```tsx
  const pendingTitle = pendingScore
    ? `Who scored the ${pendingScore.eventType.replace(/_/g, ' ')}?`
    : pendingCard
      ? `Who received the card?`
      : 'Which player?';
```
Replace the first branch so 0-point events read correctly:
```tsx
  const pendingTitle = pendingScore
    ? `${pendingScore.points > 0 ? 'Who scored' : 'Who hit'} the ${pendingScore.eventType.replace(/_/g, ' ')}?`
    : pendingCard
      ? `Who received the card?`
      : 'Which player?';
```

- [ ] **Step 2: Make the stat row wrap in `ActionsRow.tsx`.** Find the stat-events block:
```tsx
      {sport.statEvents.length > 0 && (
        <div className="flex gap-2">
          {sport.statEvents.map((stat) => (
            <button key={stat.type} onClick={() => onStat(stat.type)} className={btnClass}>
              {stat.label}
            </button>
          ))}
        </div>
      )}
```
Replace with (wrap + a min width so ≥4 stats flow onto multiple rows; `type="button"` added):
```tsx
      {sport.statEvents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sport.statEvents.map((stat) => (
            <button key={stat.type} type="button" onClick={() => onStat(stat.type)} className={`${btnClass} min-w-[30%]`}>
              {stat.label}
            </button>
          ))}
        </div>
      )}
```
(`btnClass` already includes `flex-1`; combined with `flex-wrap` + `min-w-[30%]` the buttons grow to fit and wrap — 1 stat → full width, 3 → one row, 5 → ~3 then 2.)

- [ ] **Step 3: Verify** — `npx vitest run` (all green), `npm run build` (SUCCESS), `npm run lint` (0). (No new test — `LiveGame`/`ActionsRow` are integration; the picker title + wrap are visual.)

- [ ] **Step 4: Commit**
```bash
git add src/screens/LiveGame.tsx src/components/ActionsRow.tsx
git commit -m "feat: word the player picker for wides + wrap the stat-button row"
```

---

### Task 4: Version + changelog + final verification

**Files:** Modify `package.json`, `package-lock.json`, `CHANGELOG.md`.

- [ ] **Step 1: Bump version** — `package.json` `1.1.17` → `1.1.18`; `package-lock.json` root + `packages[""]` `1.1.17` → `1.1.18` (do NOT touch dependency versions).

- [ ] **Step 2: Changelog** — in `CHANGELOG.md`, replace:
```md
All notable changes to this project will be documented in this file.

## [1.1.17] - 2026-06-01
```
with:
```md
All notable changes to this project will be documented in this file.

## [1.1.18] - 2026-06-01

### Added
- Gaelic Football: a **Wide** button alongside the scoring buttons (tracked per team/player, doesn't change the score), and a **Penalty** stat.
- Soccer: **Throw-in**, **Corner**, **Off-side**, and **Penalty** stats alongside Assist.
- New stats appear in the play-by-play and the game summary's player stats.

## [1.1.17] - 2026-06-01
```

- [ ] **Step 3: Full verification** — `npx vitest run` (all green; expect ~111 tests), `npm run build` (SUCCESS), `npm run lint` (0 errors).

- [ ] **Step 4: Commit**
```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.18 + changelog for stat tracking"
```

---

## Plan self-review

**Spec coverage:**
- Gaelic Wide (0-point, 4th scoring button) → Task 1 config + Task 2 render ✅
- Gaelic Penalty stat → Task 1 ✅
- Soccer throw-in/corner/off-side/penalty stats → Task 1 ✅
- 0-point button de-emphasised, no "+0" → Task 2 ✅
- Picker wording for wides → Task 3 ✅
- Stat-row wrap for 5 buttons → Task 3 ✅
- Tests (config, formatGaelicScore-with-wide, ScoreButton 0-point) → Tasks 1–2 ✅
- Version 1.1.18 → Task 4 ✅
- Scores/G-PP unaffected (0-point events) — inherent; covered by the formatGaelicScore test ✅

**Placeholder scan:** none — complete code in every step.

**Type/name consistency:** new events match `ScoringEventConfig` (`{type,label,points,icon,color?}`) and `StatEventConfig` (`{type,label,icon}`); `ScoreButton` props unchanged (`{event,accent,onClick}`) so `ScoringRow` call site is untouched; `pendingScore.points` exists on the `LiveGame` pending-score state; `btnClass`/`onStat` unchanged in `ActionsRow`. `wide`/`penalty`/`throw_in`/`corner`/`offside` are new `event_type` strings — the events table stores arbitrary strings, and `EventLog`/`GameSummary` render `event_type` generically, so they surface with no further change.

**Note:** the Gaelic scoring row goes from 3 to 4 columns (`ScoringRow` uses `grid-cols-{events.length}`); 4 compact buttons fit a phone row. The Wide is visually distinct (outline) so it won't be mistaken for a score.
