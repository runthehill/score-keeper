# Gaelic Football Two-Point Score — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Gaelic Football "2-pointer" score (worth 2 points) to the score keeper, folded into the goals–points scoreline and shown with umpire-flag colours on the score buttons.

**Architecture:** Data-driven via the sport config. Add a `two_pointer` scoring event to Gaelic Football; the event-sourced totals already sum `points`, so integer totals update for free. Two rendering paths need changes: the goals–points string builder (`formatGaelicScore`) must count a 2-pointer as 2 in the points figure, and the score button must render a flag-coloured dot driven by a new optional `color` field.

**Tech Stack:** Vite + React + TypeScript, Tailwind CSS v3, vitest + @testing-library/react (jsdom env via `vitest.config.ts`).

---

## File structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/types/index.ts` | TS interfaces | Add optional `color?: string` to `ScoringEventConfig` |
| `src/sports/configs.ts` | Sport config data | Add `two_pointer` to Gaelic + flag colours on all three Gaelic scoring events |
| `src/sports/configs.test.ts` | Config tests | Assert the new event + colours |
| `src/utils/format.ts` | Score formatting | `formatGaelicScore` sums non-goal points; widen `formatScore` signature |
| `src/utils/format.test.ts` | Format tests | Add 2-pointer case; update fixtures for new signature |
| `src/components/ScoreButton.tsx` | Score button UI | Render flag-coloured dot when `event.color` is set |
| `src/components/ScoreButton.test.tsx` | Button tests (new) | Dot present/absent + click |
| `package.json` | Version | Bump `1.1.2` → `1.1.3` |
| `CHANGELOG.md` | Changelog | New `[1.1.3]` entry |

**Note for the engineer:** `vitest` does **not** typecheck. The signature widening in Task 2 is only fully validated by `npm run build` (which runs `tsc -b`). Task 5 runs that build — do not skip it.

All commit commands include the project's co-author trailer.

---

### Task 1: Add the `two_pointer` scoring event + flag colours to Gaelic Football

**Files:**
- Modify: `src/types/index.ts:40-45` (`ScoringEventConfig`)
- Modify: `src/sports/configs.ts:50-53` (Gaelic `scoringEvents`)
- Test: `src/sports/configs.test.ts:35-42` (extend) and add one new test

- [ ] **Step 1: Write the failing tests**

In `src/sports/configs.test.ts`, replace the existing `gaelic football uses split score display` test (lines 35–42) with this version, and add the new colour test immediately after it:

```ts
  it('gaelic football uses split score display', () => {
    const config = getSportConfig('gaelic_football');
    expect(config.scoreDisplay).toBe('split');
    const goal = config.scoringEvents.find((e) => e.type === 'goal');
    const point = config.scoringEvents.find((e) => e.type === 'point');
    const twoPointer = config.scoringEvents.find((e) => e.type === 'two_pointer');
    expect(goal?.points).toBe(3);
    expect(point?.points).toBe(1);
    expect(twoPointer?.points).toBe(2);
    expect(twoPointer?.label).toBe('Two-Pointer');
  });

  it('gaelic football scoring events carry umpire flag colours', () => {
    const config = getSportConfig('gaelic_football');
    const colourOf = (type: string) =>
      config.scoringEvents.find((e) => e.type === type)?.color;
    expect(colourOf('goal')).toBe('#22c55e'); // green flag
    expect(colourOf('point')).toBe('#e5e7eb'); // white flag
    expect(colourOf('two_pointer')).toBe('#f97316'); // orange flag
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/sports/configs.test.ts`
Expected: FAIL — `twoPointer` is `undefined` (so `.points` is `undefined`, not `2`) and `colourOf(...)` returns `undefined`.

- [ ] **Step 3: Add the optional `color` field to the type**

In `src/types/index.ts`, update `ScoringEventConfig` (currently lines 40–45):

```ts
export interface ScoringEventConfig {
  type: string;
  label: string;
  points: number;
  icon: string;
  color?: string;
}
```

- [ ] **Step 4: Add the event + colours to the Gaelic config**

In `src/sports/configs.ts`, replace the Gaelic Football `scoringEvents` array (currently lines 50–53):

```ts
    scoringEvents: [
      { type: 'goal', label: 'Goal', points: 3, icon: '🥅', color: '#22c55e' },
      { type: 'point', label: 'Point', points: 1, icon: '☝️', color: '#e5e7eb' },
      { type: 'two_pointer', label: 'Two-Pointer', points: 2, icon: '🟠', color: '#f97316' },
    ],
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/sports/configs.test.ts`
Expected: PASS (all config tests green).

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/sports/configs.ts src/sports/configs.test.ts
git commit -m "feat: add Gaelic Football two-pointer scoring event with flag colours" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Fold the 2-pointer into the goals–points scoreline

**Files:**
- Modify: `src/utils/format.ts:3-15` (`formatScore` + `formatGaelicScore`)
- Test: `src/utils/format.test.ts:10-32` (update fixtures + add cases)

- [ ] **Step 1: Write the failing test + update fixtures for the new signature**

In `src/utils/format.test.ts`, replace the three Gaelic tests (the `formats gaelic split score as goals-points`, `pads gaelic points to two digits`, and `handles zero gaelic score` blocks, lines 10–31) with the following. The fixtures now include `points`, and two new cases are added:

```ts
  it('formats gaelic split score as goals-points', () => {
    const events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[] = [
      { event_type: 'goal', team: 'home', points: 3 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
    ];
    expect(formatGaelicScore(events, 'home')).toBe('1-05');
  });

  it('counts a two-pointer as 2 in the points figure', () => {
    const events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[] = [
      { event_type: 'goal', team: 'home', points: 3 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'two_pointer', team: 'home', points: 2 },
    ];
    expect(formatGaelicScore(events, 'home')).toBe('1-07');
  });

  it('ignores non-goal events with zero points (cards, subs)', () => {
    const events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[] = [
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'card_black', team: 'home', points: 0 },
      { event_type: 'substitution_on', team: 'home', points: 0 },
    ];
    expect(formatGaelicScore(events, 'home')).toBe('0-01');
  });

  it('pads gaelic points to two digits', () => {
    const events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[] = [
      { event_type: 'point', team: 'home', points: 1 },
    ];
    expect(formatGaelicScore(events, 'home')).toBe('0-01');
  });

  it('handles zero gaelic score', () => {
    expect(formatGaelicScore([], 'home')).toBe('0-00');
  });
```

- [ ] **Step 2: Run the tests to verify the new case fails**

Run: `npx vitest run src/utils/format.test.ts`
Expected: FAIL on `counts a two-pointer as 2 in the points figure` — the current count-based implementation ignores `two_pointer` events, producing `1-05` instead of `1-07`. (The other Gaelic tests still pass because the old implementation counts by event type.)

- [ ] **Step 3: Rewrite `formatGaelicScore` to sum non-goal points, and widen `formatScore`**

In `src/utils/format.ts`, replace `formatScore` and `formatGaelicScore` (currently lines 3–15) with:

```ts
export function formatScore(display: ScoreDisplay, totalPoints: number, events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[], team?: Team): string {
  if (display === 'split' && team) {
    return formatGaelicScore(events, team);
  }
  return String(totalPoints);
}

export function formatGaelicScore(events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[], team: Team): string {
  const teamEvents = events.filter((e) => e.team === team);
  const goals = teamEvents.filter((e) => e.event_type === 'goal').length;
  const points = teamEvents
    .filter((e) => e.event_type !== 'goal')
    .reduce((sum, e) => sum + e.points, 0);
  return `${goals}-${String(points).padStart(2, '0')}`;
}
```

The points figure is now `Σ points` over every non-goal event. Because the integer total is itself `Σ points`, `goals × 3 + points-figure` always equals the parenthesised total — they can never disagree. Cards and substitutions carry `points: 0`, so they contribute nothing.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/utils/format.test.ts`
Expected: PASS (all format tests green).

- [ ] **Step 5: Commit**

```bash
git add src/utils/format.ts src/utils/format.test.ts
git commit -m "feat: fold Gaelic two-pointer into the goals-points scoreline" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Render a flag-coloured dot on the score button

**Files:**
- Modify: `src/components/ScoreButton.tsx` (whole file)
- Test: `src/components/ScoreButton.test.tsx` (new file)

- [ ] **Step 1: Write the failing test**

Create `src/components/ScoreButton.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScoreButton from './ScoreButton';
import type { ScoringEventConfig } from '../types';

const twoPointer: ScoringEventConfig = {
  type: 'two_pointer',
  label: 'Two-Pointer',
  points: 2,
  icon: '🟠',
  color: '#f97316',
};

describe('ScoreButton', () => {
  it('renders the label and points', () => {
    render(<ScoreButton event={twoPointer} team="home" onClick={() => {}} />);
    expect(screen.getByText('Two-Pointer')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('renders a flag-coloured dot when the event has a colour', () => {
    render(<ScoreButton event={twoPointer} team="home" onClick={() => {}} />);
    const dot = screen.getByText('●');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveStyle({ color: '#f97316' });
  });

  it('renders no dot when the event has no colour', () => {
    const noColour: ScoringEventConfig = {
      type: 'try',
      label: 'Try',
      points: 5,
      icon: '🏉',
    };
    render(<ScoreButton event={noColour} team="away" onClick={() => {}} />);
    expect(screen.queryByText('●')).not.toBeInTheDocument();
  });

  it('calls onClick when pressed', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ScoreButton event={twoPointer} team="home" onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ScoreButton.test.tsx`
Expected: FAIL on `renders a flag-coloured dot when the event has a colour` — the current button renders no `●` element, so `getByText('●')` throws "Unable to find an element with the text: ●". (The label/points and click tests pass against the current implementation.)

- [ ] **Step 3: Add the dot to the button**

Replace the entire contents of `src/components/ScoreButton.tsx` with:

```tsx
import type { ScoringEventConfig } from '../types';

interface Props {
  event: ScoringEventConfig;
  team: 'home' | 'away';
  onClick: () => void;
}

export default function ScoreButton({ event, team, onClick }: Props) {
  const isHome = team === 'home';
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg py-3 px-2 text-center border transition-transform active:scale-95 ${
        isHome
          ? 'bg-home-dark border-home text-white'
          : 'bg-away-dark border-away text-white'
      }`}
    >
      <div className="text-sm font-bold">
        {event.color && (
          <span className="mr-1" style={{ color: event.color }}>
            ●
          </span>
        )}
        {event.label}
      </div>
      <div className={`text-xs ${isHome ? 'text-home' : 'text-away'}`}>+{event.points}</div>
    </button>
  );
}
```

This mirrors the colour-dot pattern already used by the card picker in `src/screens/LiveGame.tsx` (`<span style={{ color: card.color }}>●</span>`). The button keeps its home/away background; the dot only appears when `event.color` is set, so all other sports are visually unchanged.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ScoreButton.test.tsx`
Expected: PASS (all four tests green).

- [ ] **Step 5: Commit**

```bash
git add src/components/ScoreButton.tsx src/components/ScoreButton.test.tsx
git commit -m "feat: show flag-coloured dot on Gaelic score buttons" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Version bump + changelog (pre-push, per CLAUDE.md)

**Files:**
- Modify: `package.json:4`
- Modify: `CHANGELOG.md:3-5`

- [ ] **Step 1: Bump the patch version**

In `package.json`, change line 4:

```json
  "version": "1.1.3",
```

(from `"version": "1.1.2",`)

- [ ] **Step 2: Add the changelog entry**

In `CHANGELOG.md`, insert a new entry between the intro line and the `## [1.1.1]` heading. Replace:

```md
All notable changes to this project will be documented in this file.

## [1.1.1] - 2026-04-03
```

with:

```md
All notable changes to this project will be documented in this file.

## [1.1.3] - 2026-05-29

### Added
- Gaelic Football two-point score — new "Two-Pointer" button (2 points) for scores from outside the 40m arc; folds into the goals–points scoreline (e.g. 1-07) and the running total
- Umpire flag colours on Gaelic Football score buttons (green = goal, white = point, orange = two-pointer)

## [1.1.1] - 2026-04-03
```

- [ ] **Step 3: Commit**

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.3 and update changelog" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Final verification (full suite + typecheck + lint)

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all suites green, including the existing `queries`, `useTimer`, and `export` tests.

- [ ] **Step 2: Typecheck + production build**

Run: `npm run build`
Expected: SUCCESS — `tsc -b` reports no type errors (this is what validates the widened `formatScore`/`formatGaelicScore` signatures) and Vite produces a build.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4 (optional manual smoke test):**

Run: `npm run dev`, start a Gaelic Football game, and confirm: three score buttons (Goal/Point/Two-Pointer) each show a coloured dot; tapping Two-Pointer moves the scoreline (e.g. `0-00` → `0-02`) and the parenthesised total by 2; Undo reverses it.

---

## Plan self-review

**Spec coverage** (against `docs/superpowers/specs/2026-05-29-gaelic-football-two-pointer-design.md`):
- Types — `color?` field → Task 1, Step 3 ✅
- Sport config — `two_pointer` + flag colours → Task 1, Step 4 ✅
- Scoreline — sum of non-goal points → Task 2 ✅
- Score button — flag-coloured dot → Task 3 ✅
- Unchanged-by-design (totals/undo/attribution/export/event log) — no code change; covered by Task 5 full-suite + manual smoke test ✅
- Testing (format + config) → Tasks 1 & 2; plus new button test (Task 3) ✅
- Versioning (1.1.2 → 1.1.3 + CHANGELOG) → Task 4 ✅
- Out of scope (frees vs play, arc geometry, other sports) — respected; no tasks ✅

**Placeholder scan:** none — every code step shows complete code; every run step shows the exact command and expected result.

**Type/name consistency:** `two_pointer` (event type), `Two-Pointer` (label), `color` (field), `#22c55e`/`#e5e7eb`/`#f97316` (colours) used identically across the config, tests, button, and changelog.
