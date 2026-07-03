# Basketball Completeness + Box Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete basketball tracking — split made/miss scoring buttons, Oreb/Dreb + Turnover stats, a shareable end-of-game box score — plus fix the Gaelic "45" label.

**Architecture:** Everything is config-driven data in `src/sports/configs.ts` read by shared components. Misses are 0-point events (score stays a pure sum). `ScoringEventConfig` gains an optional `miss`, which makes `ScoreButton` render a split made/miss control; a new `BoxScore` component derives a per-player table from events and is exported to a PNG via the existing `exportShareCard` pipeline.

**Tech Stack:** Vite + React + TypeScript, Tailwind theme tokens, sql.js, html-to-image, vitest + @testing-library/react.

## Global Constraints

- **Style with theme tokens, not hex** for on-screen UI (`bg-surface`, `text-txt`, `border-line`, …). The box-score card is an exported image, so — like `ShareCard` — it uses literal colours on a dark background (`#0A0C10`).
- **TDD** — failing test first, minimal implementation, commit.
- **Event-sourced:** misses/stats are `points: 0` events; never mutate score directly.
- **Config-driven:** no sport-specific code paths beyond the `sport.id === 'basketball'` gate for the box score. Other sports must render unchanged.
- **No new dependencies.**
- **Before the deploying push:** bump the patch version in `package.json` and the root `version` in `package-lock.json`, and add a `CHANGELOG.md` entry (Task 7).
- Test runner: `npx vitest run <path>` for one file; `npx vitest run` for all. Typecheck: `npx tsc -b`.

---

### Task 1: Config — Gaelic 45 label, basketball misses, Oreb/Dreb, Turnover

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/sports/configs.ts`
- Test: `src/sports/configs.test.ts`

**Interfaces:**
- Produces: `ScoringEventConfig.miss?: { type: string; label: string }`. Basketball `scoringEvents` each carry a `miss` (`free_throw_miss`/`field_goal_miss`/`three_pointer_miss`). Basketball `statEvents` = `assist, off_rebound, def_rebound, steal, foul, turnover` (no `rebound`). Gaelic `45` label is `"45"`.

- [ ] **Step 1: Write the failing tests**

Add to `src/sports/configs.test.ts` inside the `describe('sport configs — stat tracking', ...)` block:

```ts
it("Gaelic 45 label is 45 (no prime)", () => {
  const forty5 = getSportConfig('gaelic_football').statEvents.find((s) => s.type === '45');
  expect(forty5?.label).toBe('45');
});
it('Basketball splits rebound into Oreb and Dreb, and has a turnover', () => {
  const types = getSportConfig('basketball').statEvents.map((s) => s.type);
  expect(types).toEqual(expect.arrayContaining(['off_rebound', 'def_rebound', 'turnover']));
  expect(types).not.toContain('rebound');
});
it('Basketball scoring buttons carry miss descriptors', () => {
  const cfg = getSportConfig('basketball');
  const miss = (t: string) => cfg.scoringEvents.find((e) => e.type === t)?.miss;
  expect(miss('free_throw')).toEqual({ type: 'free_throw_miss', label: 'Missed FT' });
  expect(miss('field_goal')).toEqual({ type: 'field_goal_miss', label: 'Missed 2PT' });
  expect(miss('three_pointer')).toEqual({ type: 'three_pointer_miss', label: 'Missed 3PT' });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/sports/configs.test.ts`
Expected: FAIL — `45` label is still `"45'"`, `off_rebound`/`turnover`/`miss` don't exist.

- [ ] **Step 3: Add the `miss` field to the type**

In `src/types/index.ts`, extend `ScoringEventConfig`:

```ts
export interface ScoringEventConfig {
  type: string;
  label: string;
  points: number;
  icon: string;
  color?: string;
  miss?: { type: string; label: string };
}
```

- [ ] **Step 4: Update the config**

In `src/sports/configs.ts`:

Change the Gaelic `45` stat label:

```ts
      { type: '45', label: '45', icon: '🦵' },
```

Replace the basketball `scoringEvents` with miss-carrying versions:

```ts
    scoringEvents: [
      { type: 'free_throw', label: 'FT', points: 1, icon: '🏀', miss: { type: 'free_throw_miss', label: 'Missed FT' } },
      { type: 'field_goal', label: '2PT', points: 2, icon: '🏀', miss: { type: 'field_goal_miss', label: 'Missed 2PT' } },
      { type: 'three_pointer', label: '3PT', points: 3, icon: '🎯', miss: { type: 'three_pointer_miss', label: 'Missed 3PT' } },
    ],
```

Replace the basketball `statEvents`:

```ts
    statEvents: [
      { type: 'assist', label: 'Assist', icon: '👟' },
      { type: 'off_rebound', label: 'Oreb', icon: '📈' },
      { type: 'def_rebound', label: 'Dreb', icon: '🛡️' },
      { type: 'steal', label: 'Steal', icon: '🤚' },
      { type: 'foul', label: 'Foul', icon: '⚠️' },
      { type: 'turnover', label: 'TO', icon: '🔄' },
    ],
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/sports/configs.test.ts`
Expected: PASS. (The existing "rebounds and steals" test checks `steal` only for basketball plus `rebound` — verify that test; the pre-existing test only asserts `rebound`/`steal` *defined*. If a test asserts `rebound` exists, update it to `off_rebound`.)

- [ ] **Step 6: Reconcile any existing rebound assertion**

Run: `npx vitest run src/sports/configs.test.ts` and if the pre-existing test `basketball has stat events for rebounds and steals` fails on `rebound`, change that test to:

```ts
  it('basketball has stat events for rebounds and steals', () => {
    const config = getSportConfig('basketball');
    expect(config.statEvents.find((e) => e.type === 'off_rebound')).toBeDefined();
    expect(config.statEvents.find((e) => e.type === 'def_rebound')).toBeDefined();
    expect(config.statEvents.find((e) => e.type === 'steal')).toBeDefined();
  });
```

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/sports/configs.ts src/sports/configs.test.ts
git commit -m "feat: basketball misses, Oreb/Dreb, turnover; fix Gaelic 45 label"
```

---

### Task 2: `eventLabel` resolves miss types

**Files:**
- Modify: `src/utils/format.ts`
- Test: `src/utils/format.test.ts`

**Interfaces:**
- Consumes: `ScoringEventConfig.miss` (Task 1).
- Produces: `eventLabel(sport, type)` returns a scoring event's `miss.label` when `type` matches a `miss.type` (e.g. `field_goal_miss` → "Missed 2PT").

- [ ] **Step 1: Write the failing test**

Add to `src/utils/format.test.ts`:

```ts
import { getSportConfig } from '../sports/configs';

describe('eventLabel', () => {
  const basketball = getSportConfig('basketball');
  it('labels a missed field goal from its miss descriptor', () => {
    expect(eventLabel(basketball, 'field_goal_miss')).toBe('Missed 2PT');
  });
  it('labels new stat types', () => {
    expect(eventLabel(basketball, 'off_rebound')).toBe('Oreb');
    expect(eventLabel(basketball, 'turnover')).toBe('TO');
  });
});
```

(If `format.test.ts` does not already import `eventLabel`, add it to the existing import from `./format`.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/utils/format.test.ts`
Expected: FAIL — `field_goal_miss` currently humanizes to "Field goal miss".

- [ ] **Step 3: Implement**

In `src/utils/format.ts`, replace `eventLabel` with:

```ts
export function eventLabel(sport: SportConfig, type: string): string {
  const scoring = sport.scoringEvents.find((e) => e.type === type);
  if (scoring) return scoring.label;
  const miss = sport.scoringEvents.find((e) => e.miss?.type === type)?.miss;
  if (miss) return miss.label;
  const stat = sport.statEvents.find((e) => e.type === type);
  if (stat) return stat.label;
  const card = sport.cardEvents.find((e) => e.type === type);
  if (card) return card.label;
  const words = type.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/utils/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/format.ts src/utils/format.test.ts
git commit -m "feat: eventLabel resolves miss types to their labels"
```

---

### Task 3: `ScoreButton` split made/miss + `ScoringRow` wiring

**Files:**
- Modify: `src/components/ScoreButton.tsx`
- Modify: `src/components/ScoringRow.tsx`
- Test: `src/components/ScoreButton.test.tsx`

**Interfaces:**
- Consumes: `ScoringEventConfig.miss` (Task 1), existing `inkOn`, `rgba` from `../utils/teamColors`.
- Produces: `ScoreButton` accepts `onMiss?: () => void`; when `event.miss && onMiss`, renders a split control (made area → `onClick`; `✗ miss` strip → `onMiss`, `aria-label={event.miss.label}`). `ScoringRow` accepts `onMiss: (missType: string) => void` and forwards it per missable event.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/ScoreButton.test.tsx` (inside the existing `describe('ScoreButton', …)`):

```ts
  const missable: ScoringEventConfig = {
    type: 'field_goal', label: '2PT', points: 2, icon: '🏀',
    miss: { type: 'field_goal_miss', label: 'Missed 2PT' },
  };

  it('renders a miss strip and fires onMiss (not onClick) when the strip is tapped', async () => {
    const onClick = vi.fn();
    const onMiss = vi.fn();
    render(<ScoreButton event={missable} accent="#F25F1F" onClick={onClick} onMiss={onMiss} />);
    await userEvent.setup().click(screen.getByLabelText('Missed 2PT'));
    expect(onMiss).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('fires onClick when the made area is tapped', async () => {
    const onClick = vi.fn();
    const onMiss = vi.fn();
    render(<ScoreButton event={missable} accent="#F25F1F" onClick={onClick} onMiss={onMiss} />);
    await userEvent.setup().click(screen.getByText('2PT'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onMiss).not.toHaveBeenCalled();
  });

  it('renders no miss strip when the event has no miss descriptor', () => {
    render(<ScoreButton event={event} accent="#1E63D6" onClick={() => {}} />);
    expect(screen.queryByText('✗ miss')).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/components/ScoreButton.test.tsx`
Expected: FAIL — no `onMiss` prop / miss strip yet.

- [ ] **Step 3: Implement the split in `ScoreButton`**

Replace `src/components/ScoreButton.tsx` with:

```tsx
import type { ScoringEventConfig } from '../types';
import { inkOn, rgba } from '../utils/teamColors';

interface Props {
  event: ScoringEventConfig;
  accent: string;
  onClick: () => void;
  onMiss?: () => void;
}

export default function ScoreButton({ event, accent, onClick, onMiss }: Props) {
  // Missable scoring button (basketball): a filled "made" area over a thin "miss"
  // strip, joined in one rounded container. Made records the score; miss records
  // a 0-point attempt.
  if (event.miss && onMiss) {
    return (
      <div className="relative flex flex-col rounded-[15px] overflow-hidden" style={{ boxShadow: `0 5px 14px ${rgba(accent, 0.3)}` }}>
        <button
          type="button"
          onClick={onClick}
          className="flex flex-col items-center gap-0.5 px-2 pt-3 pb-2 press-score"
          style={{ background: accent, color: inkOn(accent) }}
        >
          <span className="font-score font-bold text-[24px] leading-none">+{event.points}</span>
          <span className="text-[11.5px] font-bold">{event.label}</span>
        </button>
        <button
          type="button"
          onClick={onMiss}
          aria-label={event.miss.label}
          className="flex items-center justify-center py-1.5 press-score"
          style={{ background: rgba(accent, 0.16), color: accent }}
        >
          <span className="text-[11px] font-bold">✗ miss</span>
        </button>
      </div>
    );
  }

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

- [ ] **Step 4: Wire `onMiss` through `ScoringRow`**

In `src/components/ScoringRow.tsx`, add `onMiss` to `Props` and pass it down. Change the `Props` interface to add:

```ts
  onMiss: (missType: string) => void;
```

Update the destructure to include `onMiss`, and change the button map to:

```tsx
        {events.map((event) => (
          <ScoreButton
            key={event.type}
            event={event}
            accent={accent}
            onClick={() => onScore(event.type, event.points)}
            onMiss={event.miss ? () => onMiss(event.miss!.type) : undefined}
          />
        ))}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run src/components/ScoreButton.test.tsx && npx tsc -b`
Expected: ScoreButton tests PASS. `tsc` will report errors in `LiveGame.tsx` (missing `onMiss` prop on `<ScoringRow>`) — that is fixed in Task 4.

- [ ] **Step 6: Commit**

```bash
git add src/components/ScoreButton.tsx src/components/ScoringRow.tsx src/components/ScoreButton.test.tsx
git commit -m "feat: split made/miss scoring button and ScoringRow onMiss"
```

---

### Task 4: `LiveGame` miss wiring

**Files:**
- Modify: `src/screens/LiveGame.tsx`

**Interfaces:**
- Consumes: `ScoringRow`'s `onMiss` (Task 3), existing `handleScore(team, eventType, points)` and `pendingScore` state.
- Produces: both scoring rows pass `onMiss={(missType) => handleScore(team, missType, 0)}`; the player-picker title reads "Who missed?" for miss event types.

- [ ] **Step 1: Pass `onMiss` to both scoring rows**

In `src/screens/LiveGame.tsx`, on the home `<ScoringRow>` add:

```tsx
        onScore={(type, pts) => handleScore('home', type, pts)}
        onMiss={(missType) => handleScore('home', missType, 0)}
```

and on the away `<ScoringRow>` add:

```tsx
        onScore={(type, pts) => handleScore('away', type, pts)}
        onMiss={(missType) => handleScore('away', missType, 0)}
```

- [ ] **Step 2: Make the picker title miss-aware**

In `src/screens/LiveGame.tsx`, replace the `pendingTitle` computation:

```tsx
  const pendingTitle = pendingScore
    ? (pendingScore.eventType.endsWith('_miss')
        ? 'Who missed?'
        : `${pendingScore.points > 0 ? 'Who scored' : 'Who hit'} the ${pendingScore.eventType.replace(/_/g, ' ')}?`)
    : pendingCard
      ? `Who received the card?`
      : 'Which player?';
```

- [ ] **Step 3: Typecheck + full test run**

Run: `npx tsc -b && npx vitest run`
Expected: no type errors; all tests pass.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, start a Basketball game **with players on one team**, tap the `✗ miss` strip on 2PT for that team → the picker asks "Who missed?"; pick a player → score unchanged, and the miss appears in the Recent log as "Missed 2PT". Tap `✗ miss` for the team **without** players → logs directly, score unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/screens/LiveGame.tsx
git commit -m "feat: record missed shots from the split scoring buttons"
```

---

### Task 5: `computeBoxScore` + `BoxScore` component

**Files:**
- Create: `src/utils/boxScore.ts`
- Create: `src/components/BoxScore.tsx`
- Test: `src/utils/boxScore.test.ts`

**Interfaces:**
- Consumes: `GameEvent`, `Player`, `Game` types; `teamAccent` from `../utils/teamColors`.
- Produces:
  - `computeBoxScore(events: GameEvent[], players: Player[]): { home: TeamBox; away: TeamBox }` where
    ```ts
    interface BoxLine { pts: number; twoM: number; twoA: number; threeM: number; threeA: number; ftM: number; ftA: number; orb: number; drb: number; ast: number; stl: number; to: number; pf: number }
    interface TeamBox { rows: { player: Player; line: BoxLine }[]; total: BoxLine }
    ```
    `rows` = one per rostered player of that team (attributed events); `total` = computed from **all** that team's events (attributed or not).
  - `BoxScore` — a `forwardRef<HTMLDivElement>` dark card rendering both teams' tables; the ref points at the full-width card (for image export).

- [ ] **Step 1: Write the failing tests**

Create `src/utils/boxScore.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeBoxScore } from './boxScore';
import type { GameEvent, Player } from '../types';

const P = (id: string, team: 'home' | 'away', name: string): Player =>
  ({ id, game_id: 'g', team, name, number: null, status: 'active', sort_order: 0 });

const E = (team: 'home' | 'away', type: string, points: number, player_id: string | null): GameEvent =>
  ({ id: Math.random().toString(), game_id: 'g', player_id, team, event_type: type, points, half_or_period: 1, timestamp: '2026-07-03T00:00:00.000Z' });

describe('computeBoxScore', () => {
  it('computes made-attempts, rebounds, points and per-player rows', () => {
    const players = [P('p1', 'home', 'Aoife')];
    const events = [
      E('home', 'field_goal', 2, 'p1'),
      E('home', 'field_goal', 2, 'p1'),
      E('home', 'field_goal', 2, 'p1'),
      E('home', 'field_goal_miss', 0, 'p1'),
      E('home', 'field_goal_miss', 0, 'p1'),
      E('home', 'three_pointer', 3, 'p1'),
      E('home', 'off_rebound', 0, 'p1'),
      E('home', 'turnover', 0, 'p1'),
    ];
    const box = computeBoxScore(events, players);
    const line = box.home.rows[0].line;
    expect(line.twoM).toBe(3);
    expect(line.twoA).toBe(5);
    expect(line.threeM).toBe(1);
    expect(line.threeA).toBe(1);
    expect(line.orb).toBe(1);
    expect(line.to).toBe(1);
    expect(line.pts).toBe(9);
  });

  it('team totals include unattributed events; away rows list rostered players', () => {
    const players = [P('p1', 'home', 'Aoife'), P('a1', 'away', 'Zoe')];
    const events = [
      E('home', 'free_throw', 1, 'p1'),
      E('home', 'free_throw', 1, null), // unattributed — counts to team total only
    ];
    const box = computeBoxScore(events, players);
    expect(box.home.rows[0].line.ftM).toBe(1); // player row: only attributed
    expect(box.home.total.ftM).toBe(2);        // team total: both
    expect(box.away.rows).toHaveLength(1);
    expect(box.away.total.pts).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/utils/boxScore.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `computeBoxScore`**

Create `src/utils/boxScore.ts`:

```ts
import type { GameEvent, Player, Team } from '../types';

export interface BoxLine {
  pts: number;
  twoM: number; twoA: number;
  threeM: number; threeA: number;
  ftM: number; ftA: number;
  orb: number; drb: number;
  ast: number; stl: number; to: number; pf: number;
}

export interface TeamBox {
  rows: { player: Player; line: BoxLine }[];
  total: BoxLine;
}

const empty = (): BoxLine => ({
  pts: 0, twoM: 0, twoA: 0, threeM: 0, threeA: 0, ftM: 0, ftA: 0,
  orb: 0, drb: 0, ast: 0, stl: 0, to: 0, pf: 0,
});

function lineFrom(events: GameEvent[]): BoxLine {
  const l = empty();
  for (const e of events) {
    l.pts += e.points;
    switch (e.event_type) {
      case 'field_goal': l.twoM++; l.twoA++; break;
      case 'field_goal_miss': l.twoA++; break;
      case 'three_pointer': l.threeM++; l.threeA++; break;
      case 'three_pointer_miss': l.threeA++; break;
      case 'free_throw': l.ftM++; l.ftA++; break;
      case 'free_throw_miss': l.ftA++; break;
      case 'off_rebound': l.orb++; break;
      case 'def_rebound': l.drb++; break;
      case 'assist': l.ast++; break;
      case 'steal': l.stl++; break;
      case 'turnover': l.to++; break;
      case 'foul': l.pf++; break;
    }
  }
  return l;
}

function teamBox(events: GameEvent[], players: Player[], team: Team): TeamBox {
  const teamEvents = events.filter((e) => e.team === team);
  const rows = players
    .filter((p) => p.team === team)
    .map((player) => ({ player, line: lineFrom(teamEvents.filter((e) => e.player_id === player.id)) }));
  return { rows, total: lineFrom(teamEvents) };
}

export function computeBoxScore(events: GameEvent[], players: Player[]): { home: TeamBox; away: TeamBox } {
  return { home: teamBox(events, players, 'home'), away: teamBox(events, players, 'away') };
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/utils/boxScore.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the `BoxScore` card**

Create `src/components/BoxScore.tsx`:

```tsx
import { forwardRef } from 'react';
import type { Game, GameEvent, Player } from '../types';
import { teamAccent } from '../utils/teamColors';
import { computeBoxScore, type BoxLine, type TeamBox } from '../utils/boxScore';

interface Props {
  game: Game;
  events: GameEvent[];
  players: Player[];
}

const COLS = ['PTS', '2PT', '3PT', 'FT', 'OR', 'DR', 'AST', 'STL', 'TO', 'PF'] as const;

const cells = (l: BoxLine): string[] => [
  String(l.pts),
  `${l.twoM}-${l.twoA}`,
  `${l.threeM}-${l.threeA}`,
  `${l.ftM}-${l.ftA}`,
  String(l.orb), String(l.drb), String(l.ast), String(l.stl), String(l.to), String(l.pf),
];

const th: React.CSSProperties = { padding: '4px 8px', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', textAlign: 'right', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '5px 8px', fontSize: 12, textAlign: 'right', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums' };
const nameCell: React.CSSProperties = { padding: '5px 8px', fontSize: 12, textAlign: 'left', whiteSpace: 'nowrap', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' };

const BoxScore = forwardRef<HTMLDivElement, Props>(function BoxScore({ game, events, players }, ref) {
  const box = computeBoxScore(events, players);

  const section = (which: 'home' | 'away', tb: TeamBox) => {
    const name = which === 'home' ? game.home_team : game.away_team;
    const primary = which === 'home' ? game.home_primary : game.away_primary;
    const secondary = which === 'home' ? game.home_secondary : game.away_secondary;
    const accent = teamAccent({ primary, secondary }, true);
    return (
      <div style={{ marginTop: which === 'away' ? 14 : 0 }}>
        <div className="font-sans" style={{ fontWeight: 800, fontSize: 12.5, color: accent, padding: '0 8px 4px' }}>{name}</div>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Player</th>
              {COLS.map((c) => <th key={c} style={th}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {tb.rows.map(({ player, line }) => (
              <tr key={player.id} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <td className="font-sans" style={{ ...nameCell, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                  {player.number != null ? `${player.number} ` : ''}{player.name}
                </td>
                {cells(line).map((v, i) => <td key={i} className="font-score" style={td}>{v}</td>)}
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <td className="font-sans" style={{ ...nameCell, color: accent, fontWeight: 800 }}>Team</td>
              {cells(tb.total).map((v, i) => <td key={i} className="font-score" style={{ ...td, color: '#fff', fontWeight: 700 }}>{v}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <div ref={ref} style={{ width: 'max-content', minWidth: '100%', background: '#0A0C10', borderRadius: 18, padding: '16px 10px' }}>
        <div className="font-sans" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 8px 12px' }}>
          <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff' }}>Box Score</span>
          <span className="font-score" style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>
            {game.home_team} {game.home_score} – {game.away_score} {game.away_team}
          </span>
        </div>
        {section('home', box.home)}
        {section('away', box.away)}
      </div>
    </div>
  );
});

export default BoxScore;
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/utils/boxScore.ts src/utils/boxScore.test.ts src/components/BoxScore.tsx
git commit -m "feat: box-score derivation and dark box-score card"
```

---

### Task 6: `GameSummary` — show + share the box score

**Files:**
- Modify: `src/screens/GameSummary.tsx`

**Interfaces:**
- Consumes: `BoxScore` (Task 5), existing `exportShareCard`, `shareFilename`.
- Produces: basketball games render `<BoxScore>` in place of the per-player stat list, with a "Share box score" button; other sports unchanged.

- [ ] **Step 1: Add imports and a ref/handler**

In `src/screens/GameSummary.tsx`, add:

```tsx
import BoxScore from '../components/BoxScore';
```

Add a ref and share-state near the existing `cardRef`/`shareState`:

```tsx
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxShareState, setBoxShareState] = useState('');
```

Add a handler near `handleShare`:

```tsx
  const handleShareBox = async () => {
    if (!boxRef.current) return;
    setBoxShareState('Preparing…');
    try {
      const outcome = await exportShareCard(
        boxRef.current,
        `${game.home_team}-vs-${game.away_team}-boxscore`.replace(/\s+/g, '-'),
        { title: `${game.home_team} v ${game.away_team} — box score`, text: `${game.home_team} ${game.home_score} – ${game.away_score} ${game.away_team}` }
      );
      setBoxShareState(outcome === 'shared' ? 'Shared' : outcome === 'downloaded' ? 'Image saved' : outcome === 'cancelled' ? '' : "Couldn't create image");
    } catch {
      setBoxShareState("Couldn't create image");
    }
  };
```

- [ ] **Step 2: Render the box score for basketball**

In `src/screens/GameSummary.tsx`, replace the entire `{/* Player stats */}` `{playerStats.length > 0 && ( … )}` section with a basketball branch plus the existing list for other sports:

```tsx
      {/* Player stats / box score */}
      {sport.id === 'basketball' && events.length > 0 ? (
        <section>
          <h2 className={eyebrow}>Box score</h2>
          <BoxScore ref={boxRef} game={game} events={events} players={players} />
          <button
            type="button"
            onClick={handleShareBox}
            className="w-full mt-3 flex items-center justify-center gap-2 bg-surface-2 border border-line rounded-xl py-3 text-sm font-semibold text-txt-2 press"
          >
            <Share size={15} /> {boxShareState || 'Share box score'}
          </button>
        </section>
      ) : playerStats.length > 0 ? (
        <section>
          <h2 className={eyebrow}>Player stats</h2>
          <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
            {playerStats.map(({ player, points, byType }) => (
              <div key={player.id} className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-sm" style={{ color: player.team === 'home' ? aHome : aAway }}>
                    {player.number != null && <span className="text-txt-3 mr-1">#{player.number}</span>}
                    {player.name}
                  </p>
                  <p className="text-xs text-txt-3">
                    {Array.from(byType.entries()).map(([type, count]) => `${count} ${eventLabel(sport, type)}`).join(', ')}
                  </p>
                </div>
                {points > 0 && <span className="text-sm font-bold text-txt shrink-0 ml-3">{points} pts</span>}
              </div>
            ))}
          </div>
        </section>
      ) : null}
```

- [ ] **Step 3: Typecheck + full test run**

Run: `npx tsc -b && npx vitest run`
Expected: no type errors; all tests pass.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Play a short Basketball game with a few players, some made and missed shots, a couple of rebounds/turnovers, then End Game. On the summary: the **Box score** table shows per-player made-attempts (e.g. `2-4`), OR/DR, TO, PF and a **Team** row; the table scrolls sideways on a narrow window without the page scrolling. Tap **Share box score** → a PNG is shared/saved. Confirm a non-basketball game still shows the old **Player stats** list.

- [ ] **Step 5: Commit**

```bash
git add src/screens/GameSummary.tsx
git commit -m "feat: basketball box score in game summary, shareable as image"
```

---

### Task 7: Verify, version bump, changelog

**Files:**
- Modify: `package.json`, `package-lock.json`, `CHANGELOG.md`

- [ ] **Step 1: Full verification**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all tests pass, no `src` lint errors, build succeeds. (`npm run lint` may report an error in the git-ignored `.remember/tmp/*` scratch file — ignore that; confirm `npx eslint src` is clean.)

- [ ] **Step 2: Bump the patch version**

Set `version` to `1.1.26` in `package.json`, and the two root `"version": "1.1.26"` entries in `package-lock.json` (top-level and `packages[""]`). Confirm:

Run: `node -p "require('./package.json').version"`
Expected: `1.1.26`

- [ ] **Step 3: Add a CHANGELOG entry**

Prepend to `CHANGELOG.md` (match existing format):

```
## [1.1.26] - 2026-07-03

### Added
- Basketball: record missed shots — each FT/2PT/3PT button now splits into a "made" area and a "✗ miss" strip.
- Basketball: split Rebound into Offensive (Oreb) and Defensive (Dreb), and added a Turnover (TO) button.
- Basketball: an end-of-game box score (per-player made-attempts, rebounds, assists, steals, turnovers, fouls) that you can share as an image.

### Fixed
- Gaelic Football: the 45 button now reads "45" (a 45-metre kick), not "45'".
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump to 1.1.26, changelog for basketball box score"
```

---

## Self-Review

**Spec coverage:**
- Gaelic 45 label → Task 1. ✓
- Split made/miss scoring buttons (`miss` on config, `ScoreButton` split, `ScoringRow`/`LiveGame` wiring) → Tasks 1, 3, 4. ✓
- Oreb/Dreb + Turnover stats (foul-row layout via 3-per-row wrap) → Task 1. ✓
- Subs on the Undo/Next-Quarter line → unchanged existing behaviour; verified in Task 4/6 manual steps (basketball's actions row is [Sub · Undo · Next Quarter] when players exist). ✓
- Misses appear in the live log via `eventLabel` → Task 2. ✓
- End-of-game box score, basketball-only, shareable → Tasks 5, 6. ✓
- Live log shows all events for every sport (no hideFromLog) → nothing removed; EventLog untouched. ✓

**Placeholder scan:** none — every step has concrete code/commands.

**Type consistency:** `ScoringEventConfig.miss: { type; label }` used consistently across Tasks 1/3; `onMiss: (missType: string) => void` matches between `ScoringRow` (Task 3) and `LiveGame` (Task 4); `computeBoxScore` return shape (`BoxLine`/`TeamBox`) consistent between Task 5 definition and `BoxScore`/tests; `exportShareCard(node, filename, meta)` signature matches its real definition.
