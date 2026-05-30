# Sideline Refresh — Phase 3: Live game (Blocks scoreboard) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Live game screen to the "Sideline" design — Blocks scoreboard, stadium-clock timer, kit-tinted scoring rows, play-by-play, line-icon actions — **preserving all behaviour**.

**Architecture:** Pure visual restyle. Components keep their logic; they newly consume the Phase-2 team kit colours via `teamAccent`/`inkOn`/`TeamKitChip` and the Phase-1 tokens/motion utilities (`.score-pop`, `.press`, `.live-dot`). No changes to hooks, queries, or the event model. The format helpers (`formatGaelicScore`, `formatTimer`, `formatEventTime`) are reused.

**Tech Stack:** Vite + React + TS, Tailwind v3 (Phase-1 tokens), the Phase-2 colour system.

**Spec:** `docs/superpowers/specs/2026-05-30-sideline-refresh-phase3-live-design.md`. Phase 3 of 7.

Reference (visual source): `docs/design-handoff/src/live.jsx` (`style === 'blocks'`). Adapt its nested `game.home`/`game.away` to the flat `Game` fields (`home_team`, `home_primary`, `home_secondary`, …) and the real event model.

---

## Tokens & utilities available (Phase 1 / 2)
- Colours: `bg-bg`/`text-bg`, `bg-surface`, `bg-surface-2`, `border-line`, `text-txt`/`text-txt-2`/`text-txt-3`, `bg-txt`, `text-danger`, `font-score`, `shadow-card`.
- Motion: `.score-pop` (one-shot pop), `.press`/`.press-score` (active-scale), `.live-dot` (element whose `::after` pings using `currentColor`).
- Helpers: `teamAccent(team, dark)`, `inkOn(hex)`, `isPale(hex)`, `rgba(hex, a)` from `src/utils/teamColors.ts`; `TeamKitChip` (default export) from `src/components/TeamKitChip.tsx`; icons from `src/components/icons` (`Play`, `Pause`, `Undo`, `Card`, `Sub`, `Whistle`, `Flag`, `Check`, `Close`, …); `useThemeContext()` from `src/hooks/useTheme` (`{ dark, toggle }`).

All commits include the project's co-author trailer:
`-m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task 1: Scoreboard → Blocks

**Files:** Rewrite `src/components/Scoreboard.tsx`; Create `src/components/Scoreboard.test.tsx`.

- [ ] **Step 1: Write the test** — create `src/components/Scoreboard.test.tsx`. First read `src/types/index.ts` for the exact `Game` and `GameEvent` shapes and adjust the fixtures if any field name differs:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Scoreboard from './Scoreboard';
import type { Game, GameEvent } from '../types';

function game(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1', sport: 'rugby_union', home_team: 'Sligo RFC', away_team: 'Ballina',
    home_score: 12, away_score: 7, status: 'in_progress',
    started_at: '2026-05-30T10:00:00.000Z', ended_at: null, notes: '',
    home_primary: '#15171C', home_secondary: '#FFFFFF',
    away_primary: '#1E63D6', away_secondary: '#FFFFFF',
    ...overrides,
  };
}

describe('Scoreboard (blocks)', () => {
  it('shows both team names and single-number scores', () => {
    render(<Scoreboard game={game()} events={[]} />);
    expect(screen.getByText('Sligo RFC')).toBeInTheDocument();
    expect(screen.getByText('Ballina')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders the Gaelic split score (G-PP) for split sports', () => {
    const events: GameEvent[] = [
      { id: 'e1', game_id: 'g1', player_id: null, team: 'home', event_type: 'goal', points: 3, half_or_period: 1, timestamp: '2026-05-30T10:05:00.000Z' },
      { id: 'e2', game_id: 'g1', player_id: null, team: 'home', event_type: 'point', points: 1, half_or_period: 1, timestamp: '2026-05-30T10:06:00.000Z' },
    ];
    render(<Scoreboard game={game({ sport: 'gaelic_football', home_score: 4, away_score: 0 })} events={events} />);
    expect(screen.getByText('1-01')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/components/Scoreboard.test.tsx`.

- [ ] **Step 3: Implement** — replace `src/components/Scoreboard.tsx` with:

```tsx
import type { Game, GameEvent, Team } from '../types';
import { getSportConfig } from '../sports/configs';
import { formatGaelicScore } from '../utils/format';
import { inkOn } from '../utils/teamColors';

interface Props {
  game: Game;
  events: GameEvent[];
  flash?: Team | null;
}

export default function Scoreboard({ game, events, flash = null }: Props) {
  const sport = getSportConfig(game.sport);
  const isSplit = sport.scoreDisplay === 'split';

  const half = (side: Team) => {
    const isHome = side === 'home';
    const primary = isHome ? game.home_primary : game.away_primary;
    const secondary = isHome ? game.home_secondary : game.away_secondary;
    const name = isHome ? game.home_team : game.away_team;
    const score = isHome ? game.home_score : game.away_score;
    const ink = inkOn(primary);
    const scoreText = isSplit ? formatGaelicScore(events, side) : String(score);
    return (
      <div
        className="relative flex-1 min-w-0 flex flex-col px-4 pt-[18px] pb-5"
        style={{ background: primary, alignItems: isHome ? 'flex-start' : 'flex-end', textAlign: isHome ? 'left' : 'right' }}
      >
        <div className="absolute top-0 left-0 right-0 h-[5px]" style={{ background: secondary, opacity: 0.95 }} />
        <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] mb-0.5" style={{ color: ink, opacity: 0.92 }}>
          {isHome ? 'Home' : 'Away'}
        </span>
        <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] font-bold -tracking-[0.01em]" style={{ color: ink }}>
          {name}
        </span>
        <span
          className={`font-score font-bold tabular-nums leading-[0.92] mt-1.5 ${flash === side ? 'score-pop' : ''} ${isSplit ? 'text-[56px]' : 'text-[76px] -tracking-[0.02em]'}`}
          style={{ color: ink }}
        >
          {scoreText}
        </span>
        {isSplit && (
          <span className="text-xs font-semibold" style={{ color: ink, opacity: 0.7 }}>
            {score} pts
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex rounded-[20px] overflow-hidden shadow-card">
      {half('home')}
      <div className="w-0 relative z-[2]">
        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-full grid place-items-center bg-surface shadow-card text-[11px] font-extrabold text-txt-2 tracking-[0.02em]">
          VS
        </div>
      </div>
      {half('away')}
    </div>
  );
}
```

- [ ] **Step 4: Run → PASS** — `npx vitest run src/components/Scoreboard.test.tsx`, then `npm run build` + `npm run lint` (0 errors).

- [ ] **Step 5: Commit**
```bash
git add src/components/Scoreboard.tsx src/components/Scoreboard.test.tsx
git commit -m "feat: restyle Scoreboard as colour-blocked halves (Sideline)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Timer → stadium clock

**Files:** Rewrite `src/components/Timer.tsx`.

- [ ] **Step 1: Implement** — replace `src/components/Timer.tsx` with:

```tsx
import { formatTimer } from '../utils/format';
import { Play, Pause } from './icons';

interface Props {
  seconds: number;
  running: boolean;
  onToggle: () => void;
  periodLabel: string;
}

function LiveDot() {
  return (
    <span className="live-dot relative inline-block w-[7px] h-[7px] text-danger" aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-current" />
    </span>
  );
}

export default function Timer({ seconds, running, onToggle, periodLabel }: Props) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-center gap-3.5 bg-surface-2 border border-line rounded-2xl py-2.5 px-4 text-txt press"
    >
      <span
        className={`grid place-items-center w-[30px] h-[30px] rounded-full ${running ? 'bg-txt text-bg' : 'text-txt-2'}`}
        style={running ? undefined : { boxShadow: 'inset 0 0 0 1px var(--line-2)' }}
      >
        {running ? <Pause size={15} /> : <Play size={14} />}
      </span>
      <span className="font-score font-semibold text-[30px] leading-none tabular-nums tracking-[0.01em]">
        {formatTimer(seconds)}
      </span>
      <span className="flex items-center gap-1.5 ml-0.5">
        {running && <LiveDot />}
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-txt-3">{periodLabel}</span>
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Verify** — `npm run build` → SUCCESS, `npm run lint` → 0. (No unit test — presentational; `LiveGame` passes the new `periodLabel` in Task 6. The full suite stays green because `Timer` isn't unit-tested.)

- [ ] **Step 3: Commit**
```bash
git add src/components/Timer.tsx
git commit -m "feat: restyle Timer as a stadium-clock pill with live dot" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: ScoringRow + ScoreButton → kit-tinted

**Files:** Rewrite `src/components/ScoringRow.tsx`, `src/components/ScoreButton.tsx`, `src/components/ScoreButton.test.tsx`.

- [ ] **Step 1: Update the test** — first read the existing `src/components/ScoreButton.test.tsx` to mirror its style, then replace it with one for the new `{ event, accent, onClick }` props:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScoreButton from './ScoreButton';
import type { ScoringEventConfig } from '../types';

const event: ScoringEventConfig = { type: 'try', label: 'Try', points: 5, icon: '🏉' };

describe('ScoreButton', () => {
  it('renders the label and +points and fires onClick', async () => {
    const onClick = vi.fn();
    render(<ScoreButton event={event} accent="#1E63D6" onClick={onClick} />);
    expect(screen.getByText('Try')).toBeInTheDocument();
    expect(screen.getByText('+5')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/components/ScoreButton.test.tsx`.

- [ ] **Step 3: Implement `ScoreButton`** — replace `src/components/ScoreButton.tsx` with:

```tsx
import type { ScoringEventConfig } from '../types';
import { inkOn, rgba } from '../utils/teamColors';

interface Props {
  event: ScoringEventConfig;
  accent: string;
  onClick: () => void;
}

export default function ScoreButton({ event, accent, onClick }: Props) {
  return (
    <button
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

- [ ] **Step 4: Implement `ScoringRow`** — replace `src/components/ScoringRow.tsx` with:

```tsx
import type { GameEvent, ScoringEventConfig, Team } from '../types';
import { useThemeContext } from '../hooks/useTheme';
import { teamAccent } from '../utils/teamColors';
import { formatGaelicScore } from '../utils/format';
import TeamKitChip from './TeamKitChip';
import ScoreButton from './ScoreButton';

interface Props {
  events: ScoringEventConfig[];
  team: Team;
  teamName: string;
  primary: string;
  secondary: string;
  score: number;
  isSplit: boolean;
  gameEvents: GameEvent[];
  onScore: (eventType: string, points: number) => void;
}

export default function ScoringRow({ events, team, teamName, primary, secondary, score, isSplit, gameEvents, onScore }: Props) {
  const { dark } = useThemeContext();
  const accent = teamAccent({ primary, secondary }, dark);
  const scoreText = isSplit ? formatGaelicScore(gameEvents, team) : String(score);
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2.5">
        <TeamKitChip primary={primary} secondary={secondary} size={22} radius={7} />
        <span className="text-[13px] font-extrabold text-txt -tracking-[0.01em]">{teamName}</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-txt-3">{team}</span>
        <span className="ml-auto font-score font-semibold text-xl tabular-nums" style={{ color: accent }}>{scoreText}</span>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${events.length}, minmax(0, 1fr))` }}>
        {events.map((event) => (
          <ScoreButton key={event.type} event={event} accent={accent} onClick={() => onScore(event.type, event.points)} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run → PASS + verify** — `npx vitest run src/components/ScoreButton.test.tsx`, then `npm run build` (will FAIL until Task 6 updates the `ScoringRow` call sites — that's expected; if you want a green build now, you may proceed knowing Task 6 fixes the call site, OR jump to Task 6's ScoringRow edit. For this task, confirm the two component files + the test typecheck in isolation via `npx tsc --noEmit` is not required; just run the unit test green and `npm run lint`).

  > NOTE: `ScoringRow`'s prop signature changed, so `src/screens/LiveGame.tsx` won't compile until Task 6. Commit this task anyway (the component + test are correct); the branch build goes green at Task 6. Run `npm run lint` (0 errors) before committing.

- [ ] **Step 6: Commit**
```bash
git add src/components/ScoringRow.tsx src/components/ScoreButton.tsx src/components/ScoreButton.test.tsx
git commit -m "feat: restyle scoring rows with kit chip header + accent-filled buttons" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: EventLog → play-by-play

**Files:** Rewrite `src/components/EventLog.tsx`.

- [ ] **Step 1: Implement** — replace `src/components/EventLog.tsx` with:

```tsx
import type { Game, GameEvent, Player, Team } from '../types';
import { useThemeContext } from '../hooks/useTheme';
import { teamAccent } from '../utils/teamColors';
import { formatEventTime } from '../utils/format';

interface Props {
  events: GameEvent[];
  players: Player[];
  game: Game;
  gameStartedAt: string;
}

export default function EventLog({ events, players, game, gameStartedAt }: Props) {
  const { dark } = useThemeContext();
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const accentFor = (team: Team) =>
    team === 'home'
      ? teamAccent({ primary: game.home_primary, secondary: game.home_secondary }, dark)
      : teamAccent({ primary: game.away_primary, secondary: game.away_secondary }, dark);

  if (events.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-line p-5 text-center text-[13px] text-txt-3">
        No plays yet — tap a button above to log the first score.
      </div>
    );
  }

  const recent = [...events].slice(-8).reverse();

  return (
    <div className="bg-surface rounded-2xl border border-line p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-1.5 px-1">Recent</p>
      <div className="flex flex-col">
        {recent.map((e) => {
          const isHome = e.team === 'home';
          const accent = accentFor(e.team);
          const teamName = isHome ? game.home_team : game.away_team;
          const player = e.player_id ? playerMap.get(e.player_id) : undefined;
          const label = e.event_type.replace(/_/g, ' ');
          return (
            <div key={e.id} className="flex items-center gap-3 py-2 px-1">
              <span className="font-score font-semibold text-sm text-txt-3 w-[42px] tabular-nums">{formatEventTime(e.timestamp, gameStartedAt)}</span>
              <span className="w-[3px] h-[22px] rounded-full" style={{ background: accent }} />
              <span className="text-[13.5px] font-bold text-txt capitalize">{label}</span>
              <span className="text-[12.5px] text-txt-3 truncate">{teamName}{player ? ` · ${player.name}` : ''}</span>
              {e.points > 0 && <span className="ml-auto font-score font-bold text-[15px]" style={{ color: accent }}>+{e.points}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `npm run build` will FAIL until Task 6 passes `game` to `EventLog` (expected — the prop is now required). Run `npm run lint` (0 errors). Commit; the build goes green at Task 6.

- [ ] **Step 3: Commit**
```bash
git add src/components/EventLog.tsx
git commit -m "feat: restyle EventLog as a kit-tinted play-by-play" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: ActionsRow → line icons

**Files:** Rewrite `src/components/ActionsRow.tsx`.

- [ ] **Step 1: Implement** — replace `src/components/ActionsRow.tsx` with (keeps all props/logic; swaps emoji for line icons + new tokens):

```tsx
import type { SportConfig } from '../types';
import { Card, Sub, Undo, Whistle } from './icons';

interface Props {
  sport: SportConfig;
  hasPlayers: boolean;
  onCard: () => void;
  onSub: () => void;
  onUndo: () => void;
  onAdvancePeriod: () => void;
  onStat: (eventType: string) => void;
  currentPeriod: number;
  periodCount: number;
  periodName: string;
  extraPeriodLabel: string | null;
}

export default function ActionsRow({
  sport, hasPlayers, onCard, onSub, onUndo, onAdvancePeriod, onStat,
  currentPeriod, periodCount, periodName, extraPeriodLabel,
}: Props) {
  const isExtra = currentPeriod > periodCount;
  const btnClass = 'flex-1 flex items-center justify-center gap-1.5 bg-surface-2 border border-line rounded-xl py-2.5 text-center text-xs font-semibold text-txt-2 press';

  let periodButtonLabel: string;
  if (isExtra || currentPeriod >= periodCount) {
    periodButtonLabel = extraPeriodLabel ? `End ${extraPeriodLabel}` : 'Full Time';
  } else {
    periodButtonLabel = `Next ${periodName}`;
  }

  return (
    <div className="space-y-2">
      {sport.statEvents.length > 0 && (
        <div className="flex gap-2">
          {sport.statEvents.map((stat) => (
            <button key={stat.type} onClick={() => onStat(stat.type)} className={btnClass}>
              {stat.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {sport.cardEvents.length > 0 && (
          <button onClick={onCard} className={btnClass}><Card size={15} /> Card</button>
        )}
        {hasPlayers && (
          <button onClick={onSub} className={btnClass}><Sub size={15} /> Sub</button>
        )}
        <button onClick={onUndo} className={btnClass}><Undo size={15} /> Undo</button>
        <button onClick={onAdvancePeriod} className={btnClass}><Whistle size={15} /> {periodButtonLabel}</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `npm run build` → SUCCESS (ActionsRow's props are unchanged, so this compiles independently), `npm run lint` → 0.

- [ ] **Step 3: Commit**
```bash
git add src/components/ActionsRow.tsx
git commit -m "feat: restyle ActionsRow with line icons + Sideline tokens" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: LiveGame screen — chrome, modals, flash, wiring

**Files:** Modify `src/screens/LiveGame.tsx`. Preserve every hook/handler (lines ~1–199). Apply these edits.

- [ ] **Step 1: Add the flash state.** After the other `useState` declarations (near line 40), add:
```tsx
  const [flash, setFlash] = useState<Team | null>(null);
```
And add a helper after `handleEndGame` (before the `if (!game || !sport)` guard):
```tsx
  const triggerFlash = useCallback((team: Team) => {
    setFlash(team);
    setTimeout(() => setFlash((f) => (f === team ? null : f)), 450);
  }, []);
```

- [ ] **Step 2: Flash on scoring.** In `handleScore`, call `triggerFlash(team)` whenever a point-scoring event is logged. Replace the body of `handleScore` with:
```tsx
    (team: Team, eventType: string, points: number) => {
      if (points > 0) triggerFlash(team);
      if (teamHasPlayers(team)) {
        setPendingScore({ team, eventType, points });
      } else {
        addEvent(team, eventType, points);
      }
    },
```
and add `triggerFlash` to its dependency array: `[teamHasPlayers, addEvent, triggerFlash]`.

- [ ] **Step 3: Replace the `return (...)` JSX** (everything from `return (` near line 201 to the final `);` at line 474) with the restyled markup below. **Only markup/props change** — the same components, handlers, and conditionals.

```tsx
  return (
    <div className="p-3 space-y-3 pb-8">
      {/* Sport badge + period */}
      <div className="flex items-center justify-between">
        <span className="bg-surface-2 border border-line text-txt-2 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-[0.06em]">
          {sport.name}
        </span>
        <span className="text-xs text-txt-3">
          {extraPeriodLabel ? extraPeriodLabel : `${periodName} ${currentPeriod} of ${periodCount}`}
        </span>
      </div>

      {/* Scoreboard */}
      <Scoreboard game={game} events={events} flash={flash} />

      <button
        onClick={() => setShowShare(true)}
        className="w-full py-2 text-center text-xs font-semibold text-txt-3 border border-line rounded-xl press"
      >
        Share current score
      </button>

      {showShare && (
        <ShareSheet
          game={game}
          events={events}
          sport={sport}
          variant="live"
          periodLabel={extraPeriodLabel ?? `${periodName} ${currentPeriod}`}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Basketball team fouls */}
      {teamFouls && (
        <div className="flex justify-between px-4 text-xs">
          <span className={`font-semibold ${teamFouls.home >= 5 ? 'text-danger' : 'text-txt-3'}`}>
            Team Fouls: {teamFouls.home}{teamFouls.home >= 5 ? ' BONUS' : ''}
          </span>
          <span className={`font-semibold ${teamFouls.away >= 5 ? 'text-danger' : 'text-txt-3'}`}>
            Team Fouls: {teamFouls.away}{teamFouls.away >= 5 ? ' BONUS' : ''}
          </span>
        </div>
      )}

      {/* Timer */}
      <Timer
        seconds={timer.seconds}
        running={timer.running}
        onToggle={timer.toggle}
        periodLabel={extraPeriodLabel ?? `${periodName} ${currentPeriod}`}
      />

      {/* Home scoring */}
      <ScoringRow
        events={sport.scoringEvents}
        team="home"
        teamName={game.home_team}
        primary={game.home_primary}
        secondary={game.home_secondary}
        score={game.home_score}
        isSplit={sport.scoreDisplay === 'split'}
        gameEvents={events}
        onScore={(type, pts) => handleScore('home', type, pts)}
      />

      {/* Away scoring */}
      <ScoringRow
        events={sport.scoringEvents}
        team="away"
        teamName={game.away_team}
        primary={game.away_primary}
        secondary={game.away_secondary}
        score={game.away_score}
        isSplit={sport.scoreDisplay === 'split'}
        gameEvents={events}
        onScore={(type, pts) => handleScore('away', type, pts)}
      />

      {/* Actions */}
      <ActionsRow
        sport={sport}
        hasPlayers={hasAnyPlayers}
        onCard={() => setShowCardPicker(true)}
        onSub={() => setShowSub(true)}
        onUndo={undoLastEvent}
        onAdvancePeriod={handleAdvancePeriod}
        onStat={handleStat}
        currentPeriod={currentPeriod}
        periodCount={periodCount}
        periodName={periodName}
        extraPeriodLabel={extraPeriodLabel}
      />

      {/* Event log */}
      <EventLog events={events} players={players} game={game} gameStartedAt={game.started_at} />

      {/* End game */}
      <button
        onClick={() => setShowEndOptions(true)}
        className="w-full py-3 text-center text-sm text-txt-3 border border-line rounded-xl press"
      >
        End Game
      </button>

      {/* Player picker (unchanged) */}
      {pendingAction && pendingTeam && teamHasPlayers(pendingTeam) && (
        <PlayerPicker
          players={players.filter((p) => p.team === pendingTeam)}
          title={pendingTitle}
          onSelect={handlePlayerSelected}
          onSkip={handleSkipPlayer}
          onClose={() => { setPendingScore(null); setPendingStatTeam(null); setPendingCard(null); }}
        />
      )}

      {/* Substitution (unchanged) */}
      {showSub && (
        <SubstitutionFlow
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          homeTeamName={game.home_team}
          awayTeamName={game.away_team}
          onSubstitute={substitute}
          onClose={() => setShowSub(false)}
        />
      )}

      {/* Card picker */}
      {showCardPicker && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowCardPicker(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full bg-surface rounded-t-2xl border-t border-line p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-3">Issue Card</p>
            <div className="space-y-2">
              {sport.cardEvents.map((card) => (
                <div key={card.type} className="flex gap-2">
                  <button
                    onClick={() => handleCardTeamSelected('home', card.type)}
                    className="flex-1 flex items-center gap-2 bg-surface-2 border border-line rounded-xl py-3 px-3 text-sm font-semibold text-txt press"
                  >
                    <TeamKitChip primary={game.home_primary} secondary={game.home_secondary} size={18} radius={5} />
                    <span style={{ color: card.color }} aria-hidden="true">●</span> {card.label} — {game.home_team}
                  </button>
                  <button
                    onClick={() => handleCardTeamSelected('away', card.type)}
                    className="flex-1 flex items-center gap-2 bg-surface-2 border border-line rounded-xl py-3 px-3 text-sm font-semibold text-txt press"
                  >
                    <TeamKitChip primary={game.away_primary} secondary={game.away_secondary} size={18} radius={5} />
                    <span style={{ color: card.color }} aria-hidden="true">●</span> {card.label} — {game.away_team}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowCardPicker(false)} className="w-full mt-3 py-3 text-center text-sm text-txt-3">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stat team picker */}
      {showStatTeamPicker && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowStatTeamPicker(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full bg-surface rounded-t-2xl border-t border-line p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-3">Which team?</p>
            <div className="space-y-2">
              <button
                onClick={() => handleStatTeamSelected('home', showStatTeamPicker)}
                className="w-full flex items-center gap-2.5 bg-surface-2 border border-line rounded-xl py-3 px-3 font-semibold text-txt press"
              >
                <TeamKitChip primary={game.home_primary} secondary={game.home_secondary} size={20} radius={6} />
                {game.home_team}
              </button>
              <button
                onClick={() => handleStatTeamSelected('away', showStatTeamPicker)}
                className="w-full flex items-center gap-2.5 bg-surface-2 border border-line rounded-xl py-3 px-3 font-semibold text-txt press"
              >
                <TeamKitChip primary={game.away_primary} secondary={game.away_secondary} size={20} radius={6} />
                {game.away_team}
              </button>
            </div>
            <button onClick={() => setShowStatTeamPicker(null)} className="w-full mt-3 py-3 text-center text-sm text-txt-3">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Period advance confirm */}
      {showPeriodConfirm && sport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowPeriodConfirm(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface rounded-2xl border border-line p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold mb-2 text-txt">Start {periodName} {currentPeriod + 1}?</h3>
            <p className="text-sm text-txt-3 mb-4">The timer will reset to 00:00.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowPeriodConfirm(false)} className="flex-1 py-3 border border-line rounded-xl text-sm font-medium text-txt-2 press">Cancel</button>
              <button onClick={confirmAdvancePeriod} className="flex-1 py-3 bg-txt text-bg rounded-xl text-sm font-bold press">Next {periodName}</button>
            </div>
          </div>
        </div>
      )}

      {/* End-of-regulation options */}
      {showEndOptions && sport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowEndOptions(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface rounded-2xl border border-line p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold mb-1 text-txt">
              {isExtraPeriod ? `End of ${extraPeriodLabel}` : `End of ${periodName} ${currentPeriod}`}
            </h3>
            <p className="text-sm text-txt-3 mb-4">
              {game.home_team} {game.home_score} - {game.away_score} {game.away_team}
            </p>
            <div className="space-y-2">
              {sport.extraPeriods.map((ep) => (
                <button
                  key={ep.type}
                  onClick={() => { setShowEndOptions(false); setExtraPeriodLabel(ep.label); advancePeriod(); timer.reset(); }}
                  className="w-full py-3 bg-surface-2 border border-line rounded-xl text-sm font-semibold text-txt press"
                >
                  {ep.label}
                </button>
              ))}
              <button onClick={() => { setShowEndOptions(false); setShowEndConfirm(true); }} className="w-full py-3 bg-txt text-bg rounded-xl text-sm font-bold press">
                End Game
              </button>
              <button onClick={() => setShowEndOptions(false)} className="w-full py-3 text-center text-sm text-txt-3">
                Continue Playing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End-game confirm */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowEndConfirm(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface rounded-2xl border border-line p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold mb-2 text-txt">End Game?</h3>
            <p className="text-sm text-txt-3 mb-4">
              Final score: {game.home_team} {game.home_score} - {game.away_score} {game.away_team}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-3 border border-line rounded-xl text-sm font-medium text-txt-2 press">Cancel</button>
              <button onClick={handleEndGame} className="flex-1 py-3 bg-txt text-bg rounded-xl text-sm font-bold press">End Game</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
```

- [ ] **Step 4: Add the `TeamKitChip` import** at the top of `LiveGame.tsx` (with the other component imports):
```tsx
import TeamKitChip from '../components/TeamKitChip';
```
(`Team` is already imported from `../types`.)

- [ ] **Step 5: Verify the whole screen** — now the branch compiles end-to-end:
  - `npx vitest run` → all green (94+ tests; the new `Scoreboard.test` + updated `ScoreButton.test` pass; nothing else regressed)
  - `npm run build` → SUCCESS
  - `npm run lint` → 0 errors

- [ ] **Step 6: Commit**
```bash
git add src/screens/LiveGame.tsx
git commit -m "feat: restyle Live screen — Sideline chrome, kit modals, score flash" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Stale-token sweep + version + changelog + final verification

**Files:** Modify `package.json`, `package-lock.json`, `CHANGELOG.md`.

- [ ] **Step 1: Grep for leftover legacy tokens** in the Live surface:
```bash
grep -rn "text-home\|text-away\|bg-home\|bg-away\|bg-accent\|surface-600\|surface-700\|surface-800\|text-gray-" src/screens/LiveGame.tsx src/components/Scoreboard.tsx src/components/Timer.tsx src/components/ScoringRow.tsx src/components/ScoreButton.tsx src/components/EventLog.tsx src/components/ActionsRow.tsx
```
Expected: **no matches.** If any remain, replace with the Sideline equivalent (`text-txt-3`, `bg-surface-2`, `border-line`, etc.) and re-verify.

- [ ] **Step 2: Bump version** — `package.json` `1.1.8` → `1.1.9`; `package-lock.json` root + `packages[""]` `1.1.8` → `1.1.9` (do NOT touch dependency versions).

- [ ] **Step 3: Changelog** — in `CHANGELOG.md`, replace:
```md
All notable changes to this project will be documented in this file.

## [1.1.8] - 2026-05-30
```
with:
```md
All notable changes to this project will be documented in this file.

## [1.1.9] - 2026-05-30

### Changed
- Live game screen restyled to the "Sideline" look (Phase 3): colour-blocked scoreboard in each team's kit colours, stadium-clock timer with live indicator, kit-tinted scoring buttons, a cleaner play-by-play, line-icon actions, and a score-pop animation. No change to scoring, timing, cards, subs, or any game behaviour.

## [1.1.8] - 2026-05-30
```

- [ ] **Step 4: Full verification** — `npx vitest run` (all green), `npm run build` (SUCCESS), `npm run lint` (0 errors).

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.9 + changelog for Live restyle" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Plan self-review

**Spec coverage:**
- Blocks scoreboard (kit halves, VS badge, Saira scores, split pts, flash) → Task 1 ✅
- Stadium-clock Timer (+`periodLabel`, LiveDot) → Task 2 ✅
- Kit-tinted ScoringRow + accent ScoreButton (+test) → Task 3 ✅
- Play-by-play EventLog (+`game`, dark) → Task 4 ✅
- Line-icon ActionsRow → Task 5 ✅
- LiveGame chrome + 5 modals + flash + new prop wiring → Task 6 ✅
- Stale-token sweep + version 1.1.9 → Task 7 ✅
- Behaviour preserved (hooks/handlers untouched; only markup/props) → Task 6 edits are markup-only ✅

**Placeholder scan:** none — complete code in every implementing step. The intra-branch build-red note (Tasks 3 & 4 change required props, build goes green at Task 6) is called out explicitly so it isn't mistaken for an error.

**Type/name consistency:** `ScoringRow` new props (`primary`,`secondary`,`score`,`isSplit`,`gameEvents`) match the Task 6 call sites; `ScoreButton` `{event,accent,onClick}` matches Task 3's row + test; `EventLog` `game` prop matches Task 6; `Timer` `periodLabel` matches Task 6; `Scoreboard` `flash` matches Task 6; `triggerFlash`/`flash` state consistent. All icons used (`Play`,`Pause`,`Undo`,`Card`,`Sub`,`Whistle`) exist in the Phase-1 set. Tokens used (`bg-surface`,`bg-surface-2`,`border-line`,`text-txt`/`-2`/`-3`,`bg-txt`,`text-bg`,`text-danger`,`font-score`,`shadow-card`,`press`,`press-score`,`score-pop`,`live-dot`) all exist.

**Ordering note:** Tasks 3 and 4 intentionally leave the branch build red (changed required props) until Task 6 updates the call sites — each component + its unit test still pass in isolation, and lint stays clean. This is standard for a coordinated multi-file restyle; the final task guarantees green build + lint + tests.
