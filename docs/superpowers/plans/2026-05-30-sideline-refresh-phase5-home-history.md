# Sideline Refresh — Phase 5: Home + History — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle Home + History to "Sideline" — kit-chip game cards, sport tiles, a logo header, a line-icon tab bar — preserving routing, data, and History's sport filter.

**Architecture:** Add a `formatRelativeDay` helper + an `AppHeader` component; restyle `GameCard` (kit chips + `teamAccent`), `SportCard` (tinted tile), `TabBar` (line icons), and the two screens. No data/routing changes.

**Tech Stack:** Vite + React + TS, Tailwind v3 (Phase-1 tokens), Phase-2 colours, Phase-1 icons.

**Spec:** `docs/superpowers/specs/2026-05-30-sideline-refresh-phase5-home-history-design.md`. Phase 5 of 7. Visual source: `screens.jsx` (HomeScreen/SportTile/RecentCard/AppHeader/TabBar), `screens2.jsx` (HistoryScreen).

All commits include: `-m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

Tokens/utilities available: `bg-surface`/`bg-surface-2`/`border-line`/`text-txt`/`-2`/`-3`/`bg-txt`/`text-bg`/`text-danger`/`font-score`/`press`/`live-dot`; helpers `teamAccent`/`rgba` (`src/utils/teamColors.ts`); `TeamKitChip` (default export); icons `Plus`/`History`/`Settings` (`src/components/icons`); `useThemeContext()`.

---

### Task 1: `formatRelativeDay` helper

**Files:** Modify `src/utils/format.ts`, `src/utils/format.test.ts` (create if absent).

- [ ] **Step 1: Write the test** — add to `src/utils/format.test.ts` (create the file with this if it doesn't exist; if it exists, add the import + describe):

```ts
import { describe, it, expect } from 'vitest';
import { formatRelativeDay } from './format';

describe('formatRelativeDay', () => {
  it('returns Today for now', () => {
    expect(formatRelativeDay(new Date().toISOString())).toBe('Today');
  });
  it('returns Yesterday for ~1 day ago', () => {
    expect(formatRelativeDay(new Date(Date.now() - (86400000 + 2 * 3600000)).toISOString())).toBe('Yesterday');
  });
  it('returns "N days ago" within a week', () => {
    expect(formatRelativeDay(new Date(Date.now() - (3 * 86400000 + 2 * 3600000)).toISOString())).toBe('3 days ago');
  });
  it('returns a dated string beyond a week', () => {
    const out = formatRelativeDay(new Date(Date.now() - 40 * 86400000).toISOString());
    expect(out).toMatch(/\d{4}/); // includes a year
  });
});
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/utils/format.test.ts`.

- [ ] **Step 3: Implement** — append to `src/utils/format.ts`:

```ts
export function formatRelativeDay(iso: string): string {
  const then = new Date(iso);
  const days = Math.round((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
```

- [ ] **Step 4: Run → PASS** — `npx vitest run src/utils/format.test.ts`; then `npm run lint` (0).

- [ ] **Step 5: Commit**
```bash
git add src/utils/format.ts src/utils/format.test.ts
git commit -m "feat: add formatRelativeDay helper for game cards"
```

---

### Task 2: `GameCard` → RecentCard look

**Files:** Rewrite `src/components/GameCard.tsx`.

- [ ] **Step 1: Implement** — replace `src/components/GameCard.tsx` with:

```tsx
import { Link } from 'react-router-dom';
import type { Game, Team } from '../types';
import { getSportConfig } from '../sports/configs';
import { useThemeContext } from '../hooks/useTheme';
import { teamAccent } from '../utils/teamColors';
import { formatRelativeDay } from '../utils/format';
import TeamKitChip from './TeamKitChip';

interface Props {
  game: Game;
}

export default function GameCard({ game }: Props) {
  const sport = getSportConfig(game.sport);
  const { dark } = useThemeContext();
  const isLive = game.status === 'in_progress';
  const linkTo = isLive ? `/game/${game.id}` : `/summary/${game.id}`;
  const homeWin = game.home_score > game.away_score;
  const awayWin = game.away_score > game.home_score;

  const row = (team: Team) => {
    const isHome = team === 'home';
    const name = isHome ? game.home_team : game.away_team;
    const score = isHome ? game.home_score : game.away_score;
    const primary = isHome ? game.home_primary : game.away_primary;
    const secondary = isHome ? game.home_secondary : game.away_secondary;
    const win = isHome ? homeWin : awayWin;
    const accent = teamAccent({ primary, secondary }, dark);
    const scoreColor = isLive ? accent : win ? 'var(--txt)' : 'var(--txt-3)';
    return (
      <div className="flex items-center gap-2.5">
        <TeamKitChip primary={primary} secondary={secondary} size={20} radius={6} />
        <span className={`flex-1 min-w-0 truncate text-sm ${isLive || win ? 'font-extrabold text-txt' : 'font-semibold text-txt-2'}`}>{name}</span>
        <span className="font-score font-bold text-xl tabular-nums" style={{ color: scoreColor }}>{score}</span>
      </div>
    );
  };

  return (
    <Link to={linkTo} className="block bg-surface border border-line rounded-2xl p-3.5 press">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[15px]" aria-hidden="true">{sport.icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-txt-3">{sport.name}</span>
        <span className="ml-auto">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-danger">
              <span className="live-dot relative inline-block w-1.5 h-1.5 text-danger" aria-hidden="true">
                <span className="absolute inset-0 rounded-full bg-current" />
              </span>
              Live
            </span>
          ) : (
            <span className="text-[11.5px] text-txt-3">{formatRelativeDay(game.started_at)}</span>
          )}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {row('home')}
        {row('away')}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Verify** — `npm run build` → SUCCESS, `npm run lint` → 0. (No unit test — presentational; build proves the wiring. The full suite stays green.)

- [ ] **Step 3: Commit**
```bash
git add src/components/GameCard.tsx
git commit -m "feat: restyle GameCard with kit chips + teamAccent (Sideline)"
```

---

### Task 3: `SportCard` (tile) + `TabBar` (line icons)

**Files:** Rewrite `src/components/SportCard.tsx`, `src/components/TabBar.tsx`.

- [ ] **Step 1: Implement `SportCard`** — replace `src/components/SportCard.tsx` with:

```tsx
import { Link } from 'react-router-dom';
import type { SportConfig, Sport } from '../types';
import { rgba } from '../utils/teamColors';

const TINTS: Record<Sport, string> = {
  rugby_union: '#ea493c',
  soccer: '#47b26c',
  gaelic_football: '#16245A',
  basketball: '#F25F1F',
};

interface Props {
  sport: SportConfig;
}

export default function SportCard({ sport }: Props) {
  const tint = TINTS[sport.id];
  return (
    <Link to={`/setup/${sport.id}`} className="bg-surface border border-line rounded-2xl p-4 flex flex-col gap-3 press">
      <div className="w-12 h-12 rounded-[13px] grid place-items-center text-2xl" style={{ background: rgba(tint, 0.14) }}>
        <span aria-hidden="true">{sport.icon}</span>
      </div>
      <div>
        <h3 className="font-extrabold text-[15px] text-txt -tracking-[0.01em]">{sport.name}</h3>
        <p className="text-[11.5px] text-txt-3 mt-0.5">{sport.periods.count} {sport.periods.name.toLowerCase()}s</p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Implement `TabBar`** — replace `src/components/TabBar.tsx` with:

```tsx
import { NavLink } from 'react-router-dom';
import { Plus, History, Settings } from './icons';

const tabs = [
  { to: '/', label: 'New Game', Icon: Plus },
  { to: '/history', label: 'History', Icon: History },
  { to: '/settings', label: 'Settings', Icon: Settings },
];

export default function TabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line safe-area-pb">
      <div className="flex">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-bold transition-colors ${isActive ? 'text-txt' : 'text-txt-3'}`
            }
          >
            <tab.Icon size={22} />
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Verify** — `npm run build` → SUCCESS, `npm run lint` → 0. Confirm `Plus`/`History`/`Settings` exist in `src/components/icons/index.tsx`.

- [ ] **Step 4: Commit**
```bash
git add src/components/SportCard.tsx src/components/TabBar.tsx
git commit -m "feat: restyle SportCard as a tinted tile + TabBar with line icons"
```

---

### Task 4: `AppHeader` (new) + `Home` restyle

**Files:** Create `src/components/AppHeader.tsx`; Rewrite `src/screens/Home.tsx`.

- [ ] **Step 1: Create `src/components/AppHeader.tsx`:**

```tsx
interface Props {
  subtitle?: string;
}

const DOTS = ['#2b9ad5', '#ea493c', '#f4c720', '#47b26c'];

export default function AppHeader({ subtitle }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-[3px] shrink-0" aria-hidden="true">
        {DOTS.map((c) => (
          <span key={c} className="w-[7px] h-[7px] rounded-full" style={{ background: c }} />
        ))}
      </div>
      <div className="min-w-0">
        <div className="text-[17px] font-extrabold text-txt -tracking-[0.02em] leading-tight">Jonathan's Score Keeper</div>
        {subtitle && <div className="text-xs text-txt-3 mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/screens/Home.tsx`:**

```tsx
import { useMemo } from 'react';
import { SPORTS } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { listGames } from '../db/queries';
import SportCard from '../components/SportCard';
import GameCard from '../components/GameCard';
import AppHeader from '../components/AppHeader';
import InstallBanner from '../components/InstallBanner';

const eyebrow = 'text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-3';

export default function Home() {
  const { db } = useDB();
  const games = useMemo(() => listGames(db), [db]);

  const liveGames = games.filter((g) => g.status === 'in_progress');
  const recentGames = games.filter((g) => g.status === 'completed').slice(0, 5);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="p-4 space-y-6">
      <AppHeader subtitle={today} />
      <InstallBanner />

      {liveGames.length > 0 && (
        <section>
          <h2 className={eyebrow}>In progress</h2>
          <div className="space-y-3">
            {liveGames.map((g) => <GameCard key={g.id} game={g} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className={eyebrow}>New game</h2>
        <div className="grid grid-cols-2 gap-3">
          {SPORTS.map((sport) => <SportCard key={sport.id} sport={sport} />)}
        </div>
      </section>

      {recentGames.length > 0 && (
        <section>
          <h2 className={eyebrow}>Recent</h2>
          <div className="space-y-3">
            {recentGames.map((g) => <GameCard key={g.id} game={g} />)}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify** — `npx vitest run` (all green), `npm run build` (SUCCESS), `npm run lint` (0).

- [ ] **Step 4: Commit**
```bash
git add src/components/AppHeader.tsx src/screens/Home.tsx
git commit -m "feat: restyle Home with AppHeader + Sideline sections"
```

---

### Task 5: `History` restyle

**Files:** Rewrite `src/screens/History.tsx`.

- [ ] **Step 1: Implement** — replace `src/screens/History.tsx` with:

```tsx
import { useMemo, useState } from 'react';
import type { Sport } from '../types';
import { SPORTS } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { listGames } from '../db/queries';
import GameCard from '../components/GameCard';
import AppHeader from '../components/AppHeader';

export default function History() {
  const { db } = useDB();
  const [filter, setFilter] = useState<Sport | 'all'>('all');
  const games = useMemo(
    () => listGames(db, filter === 'all' ? undefined : filter),
    [db, filter]
  );
  const completedGames = games.filter((g) => g.status === 'completed');

  const pill = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap press ${active ? 'bg-txt text-bg' : 'bg-surface-2 border border-line text-txt-2'}`;

  return (
    <div className="p-4 space-y-4">
      <AppHeader subtitle="Past games" />

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setFilter('all')} className={pill(filter === 'all')}>All</button>
        {SPORTS.map((sport) => (
          <button key={sport.id} type="button" onClick={() => setFilter(sport.id)} className={pill(filter === sport.id)}>
            {sport.icon} {sport.name}
          </button>
        ))}
      </div>

      {completedGames.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-txt-3">No completed games yet</p>
          <p className="text-xs text-txt-3 mt-1">Start a game from the home screen</p>
        </div>
      ) : (
        <>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3">All games · {completedGames.length}</p>
          <div className="space-y-3">
            {completedGames.map((g) => <GameCard key={g.id} game={g} />)}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `npx vitest run` (all green), `npm run build` (SUCCESS), `npm run lint` (0).

- [ ] **Step 3: Commit**
```bash
git add src/screens/History.tsx
git commit -m "feat: restyle History with AppHeader + kit-chip cards"
```

---

### Task 6: Stale-token sweep + version + changelog + final verification

**Files:** Modify `package.json`, `package-lock.json`, `CHANGELOG.md`.

- [ ] **Step 1: Grep for leftover legacy tokens:**
```bash
grep -rn "text-home\|text-away\|bg-home\|bg-away\|bg-accent\|surface-600\|surface-700\|surface-800\|text-white\|text-gray-" src/screens/Home.tsx src/screens/History.tsx src/components/GameCard.tsx src/components/SportCard.tsx src/components/TabBar.tsx src/components/AppHeader.tsx
```
Expected: **no matches.** Fix any and re-verify.

- [ ] **Step 2: Bump version** — `package.json` `1.1.10` → `1.1.11`; `package-lock.json` root + `packages[""]` `1.1.10` → `1.1.11` (do NOT touch dependency versions).

- [ ] **Step 3: Changelog** — in `CHANGELOG.md`, replace:
```md
All notable changes to this project will be documented in this file.

## [1.1.10] - 2026-05-30
```
with:
```md
All notable changes to this project will be documented in this file.

## [1.1.11] - 2026-05-30

### Changed
- Home and History screens restyled to the "Sideline" look (Phase 5): game cards now show each team's kit colours with a live/winner emphasis, sport tiles for starting a new game, a logo header, and a cleaner tab bar. Routing, recent/in-progress lists, and the History sport filter are unchanged.

## [1.1.10] - 2026-05-30
```

- [ ] **Step 4: Full verification** — `npx vitest run` (all green), `npm run build` (SUCCESS), `npm run lint` (0 errors).

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.11 + changelog for Home/History restyle"
```

---

## Plan self-review

**Spec coverage:**
- `formatRelativeDay` → Task 1 ✅
- `GameCard` RecentCard look (kit chips, teamAccent, LIVE pill, winner emphasis) → Task 2 ✅
- `SportCard` tile + `TabBar` line icons → Task 3 ✅
- `AppHeader` + Home restyle → Task 4 ✅
- History restyle (keeps filter) → Task 5 ✅
- Stale-token sweep + version 1.1.11 → Task 6 ✅
- Preserve routing/data/filter → Tasks keep `listGames`, link targets, `InstallBanner`, filter logic ✅

**Placeholder scan:** none — complete code in every step.

**Type/name consistency:** `GameCard`/`SportCard` keep their `{ game }`/`{ sport }` props (Home/History call sites unchanged); `AppHeader` `{ subtitle? }` matches both screen usages; `TINTS: Record<Sport,string>` is exhaustive; `formatRelativeDay(iso: string): string` matches the GameCard call; icons `Plus`/`History`/`Settings` exist in the Phase-1 set (`History`/`Settings` confirmed in the icon index); tokens all exist. `GameCard` reads `dark` from `useThemeContext` for `teamAccent`. `Home`/`History` container classes (`p-4 space-y-*`) are unchanged from the originals, so tab-bar clearance behaviour is preserved.

**Note:** `GameCard` shows numeric `home_score`/`away_score` (not the Gaelic split) on cards — consistent with the pre-refresh card, which had no events to compute the split. The split shows on Live/Summary where events are available.
