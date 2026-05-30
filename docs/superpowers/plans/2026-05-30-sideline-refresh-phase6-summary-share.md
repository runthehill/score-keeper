# Sideline Refresh — Phase 6: Summary + Share-card rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the canvas share renderer with an HTML `ShareCard` captured via `html-to-image`, and restyle Game Summary around it — preserving period breakdown, player stats, and CSV/JSON export.

**Architecture:** Keep `buildShareModel` + `shareImage`; add `html-to-image` + `exportShareCard` (toPng → blob → shareImage); new always-dark `ShareCard` component; rewrite `ShareSheet` to render+capture it; restyle `GameSummary` with `ShareCard` as hero; delete `renderScoreCard.ts`. `LiveGame` is untouched (uses `ShareSheet`).

**Tech Stack:** Vite + React + TS, Tailwind v3, `html-to-image`.

**Spec:** `docs/superpowers/specs/2026-05-30-sideline-refresh-phase6-summary-share-design.md`. Phase 6 of 7. Visual source: `screens2.jsx` `ShareCard`/`SummaryScreen`, `ui.jsx` `exportShareCard`.

All commits include: `-m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

Available: `buildShareModel`/`ShareVariant` (`src/utils/shareCard.ts`), `shareImage`/`ShareOutcome` (`src/utils/shareImage.ts`), `teamAccent`/`rgba` (`src/utils/teamColors.ts`), `TeamKitChip` (default export), icons `ChevronLeft`/`Share` (`src/components/icons`), `useThemeContext()`, `font-sans`/`font-score` + Sideline tokens.

---

### Task 1: html-to-image dependency + exportShareCard util

**Files:** `package.json`/`package-lock.json` (via npm), Create `src/utils/exportShareCard.ts`.

- [ ] **Step 1: Install the dependency**
```bash
npm install html-to-image
```
(This adds `html-to-image` to `dependencies` + the lockfile. Do not edit those by hand.)

- [ ] **Step 2: Create `src/utils/exportShareCard.ts`:**

```ts
import { toPng } from 'html-to-image';
import { shareImage, type ShareOutcome } from './shareImage';

// Snapshot an on-screen node to a PNG, then share (Web Share API) or download.
export async function exportShareCard(
  node: HTMLElement,
  filename: string,
  meta: { title: string; text: string }
): Promise<ShareOutcome> {
  const dataUrl = await toPng(node, { pixelRatio: 2.5, cacheBust: true, backgroundColor: '#0A0C10' });
  const blob = await (await fetch(dataUrl)).blob();
  return shareImage(blob, filename, meta);
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` (or `npm run build`) → SUCCESS (html-to-image types resolve), `npm run lint` → 0. `npx vitest run` → still green.

- [ ] **Step 4: Commit**
```bash
git add package.json package-lock.json src/utils/exportShareCard.ts
git commit -m "feat: add html-to-image + exportShareCard (PNG snapshot → share/download)"
```

---

### Task 2: `ShareCard` component (HTML artifact)

**Files:** Create `src/components/ShareCard.tsx`.

- [ ] **Step 1: Implement** — create `src/components/ShareCard.tsx`:

```tsx
import { forwardRef } from 'react';
import type { Game, GameEvent, SportConfig } from '../types';
import { buildShareModel, type ShareVariant } from '../utils/shareCard';
import { teamAccent, rgba } from '../utils/teamColors';
import TeamKitChip from './TeamKitChip';

interface Props {
  game: Game;
  events: GameEvent[];
  sport: SportConfig;
  variant: ShareVariant;
  periodLabel?: string;
}

const LOGO_DOTS = ['#2b9ad5', '#ea493c', '#f4c720', '#47b26c'];

// The shareable score artifact. Always dark (it's exported as an image), so it
// uses literal colours rather than theme tokens.
const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard(
  { game, events, sport, variant, periodLabel },
  ref
) {
  const model = buildShareModel(game, events, sport, { variant, periodLabel });
  const isSplit = sport.scoreDisplay === 'split';
  const margin = Math.abs(game.home_score - game.away_score);

  const side = (which: 'home' | 'away') => {
    const isHome = which === 'home';
    const team = isHome ? model.home : model.away;
    const primary = isHome ? game.home_primary : game.away_primary;
    const secondary = isHome ? game.home_secondary : game.away_secondary;
    const accent = teamAccent({ primary, secondary }, true);
    const highlight = team.isWinner || model.isDraw;
    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isHome ? 'flex-start' : 'flex-end' }}>
        <TeamKitChip primary={primary} secondary={secondary} size={34} radius={10} />
        <div className="font-sans" style={{ marginTop: 9, width: '100%', textAlign: isHome ? 'left' : 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800, fontSize: 13.5, color: '#fff', letterSpacing: '-0.01em' }}>{team.name}</div>
        <div className="font-sans" style={{ marginTop: 2, fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>{isHome ? 'Home' : 'Away'}{team.isWinner && !model.isDraw ? ' · Win' : ''}</div>
        <div className="font-score" style={{ marginTop: 8, fontWeight: 700, fontSize: isSplit ? 46 : 62, lineHeight: 0.9, color: highlight ? accent : 'rgba(255,255,255,0.45)', fontVariantNumeric: 'tabular-nums', letterSpacing: isSplit ? 0 : '-0.02em' }}>{team.score}</div>
      </div>
    );
  };

  return (
    <div ref={ref} style={{ position: 'relative', borderRadius: 22, overflow: 'hidden', background: '#0A0C10', boxShadow: '0 18px 50px rgba(0,0,0,0.5)', padding: '18px 18px 16px' }}>
      <div style={{ position: 'absolute', top: -60, left: -40, width: 200, height: 200, borderRadius: 999, background: rgba(game.home_primary, 0.4), filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 999, background: rgba(game.away_primary, 0.4), filter: 'blur(60px)' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span className="font-sans" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: model.isLive ? '#FF5A5A' : '#47b26c' }} />
            {model.statusLabel}
          </span>
          <span className="font-sans" style={{ fontWeight: 600, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{model.sport} · {model.dateLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {side('home')}
          <div className="font-score" style={{ fontWeight: 600, fontSize: 22, color: 'rgba(255,255,255,0.3)', alignSelf: 'center', paddingTop: 30 }}>–</div>
          {side('away')}
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '16px 0 12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'flex', gap: 2.5 }}>{LOGO_DOTS.map((c) => <span key={c} style={{ width: 5, height: 5, borderRadius: 999, background: c }} />)}</span>
            <span className="font-sans" style={{ fontWeight: 700, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Score Keeper</span>
          </span>
          <span className="font-sans" style={{ fontWeight: 600, fontSize: 11.5, color: 'rgba(255,255,255,0.6)' }}>
            {model.isDraw ? 'Full-time draw' : `${model.home.isWinner ? model.home.name : model.away.name} by ${margin}`}
          </span>
        </div>
      </div>
    </div>
  );
});

export default ShareCard;
```

- [ ] **Step 2: Verify** — `npm run build` → SUCCESS, `npm run lint` → 0. (Presentational; no unit test.)

- [ ] **Step 3: Commit**
```bash
git add src/components/ShareCard.tsx
git commit -m "feat: add HTML ShareCard artifact (kit colours, winner accent)"
```

---

### Task 3: Rewrite `ShareSheet` + delete the canvas renderer

**Files:** Rewrite `src/components/ShareSheet.tsx`; Delete `src/utils/renderScoreCard.ts`.

- [ ] **Step 1: Replace `src/components/ShareSheet.tsx`** with:

```tsx
import { useRef, useState } from 'react';
import type { Game, GameEvent, SportConfig } from '../types';
import { buildShareModel, type ShareVariant } from '../utils/shareCard';
import { exportShareCard } from '../utils/exportShareCard';
import ShareCard from './ShareCard';

interface Props {
  game: Game;
  events: GameEvent[];
  sport: SportConfig;
  variant: ShareVariant;
  periodLabel?: string;
  onClose: () => void;
}

export default function ShareSheet({ game, events, sport, variant, periodLabel, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const model = buildShareModel(game, events, sport, { variant, periodLabel });
  const filename = `${game.home_team}-v-${game.away_team}.png`.replace(/\s+/g, '-');

  const handleShare = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    setToast('');
    const outcome = await exportShareCard(cardRef.current, filename, {
      title: `${game.home_team} v ${game.away_team}`,
      text: `${model.home.name} ${model.home.score} – ${model.away.name} ${model.away.score}`,
    });
    setBusy(false);
    if (outcome === 'error') setToast("Couldn't create image");
    else if (outcome === 'downloaded') setToast('Image saved');
    else if (outcome === 'shared') setToast('Shared');
    if (outcome === 'shared' || outcome === 'downloaded') setTimeout(onClose, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-h-[92vh] overflow-y-auto bg-surface rounded-t-2xl border-t border-line p-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-3">
          Share {variant === 'final' ? 'result' : 'current score'}
        </p>
        <div className="mb-4">
          <ShareCard ref={cardRef} game={game} events={events} sport={sport} variant={variant} periodLabel={periodLabel} />
        </div>
        <button type="button" onClick={handleShare} disabled={busy} className="w-full py-3 bg-txt text-bg rounded-xl text-sm font-bold disabled:opacity-50 press">
          {busy ? 'Preparing…' : 'Share image'}
        </button>
        {toast && <p className="text-center text-xs text-txt-3 mt-3">{toast}</p>}
        <button type="button" onClick={onClose} className="w-full mt-2 py-3 text-center text-sm text-txt-3">Close</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete the canvas renderer**
```bash
git rm src/utils/renderScoreCard.ts
```

- [ ] **Step 3: Verify no dangling imports** — `grep -rn "renderScoreCard\|cardToBlob" src` → expect **no matches**. Then `npm run build` → SUCCESS, `npm run lint` → 0, `npx vitest run` → all green (the `shareImage`/`shareCard`/`export` tests still pass; nothing imported the deleted file except the old ShareSheet).

- [ ] **Step 4: Commit**
```bash
git add src/components/ShareSheet.tsx src/utils/renderScoreCard.ts
git commit -m "feat: rebuild ShareSheet on the HTML ShareCard; drop canvas renderer"
```

---

### Task 4: Restyle `GameSummary` (ShareCard hero + direct share)

**Files:** Rewrite `src/screens/GameSummary.tsx`.

Preserve the period breakdown, player stats, CSV/JSON export, and Back. Replace the old "final score" card with the `ShareCard` hero; share it directly (no `ShareSheet` here).

- [ ] **Step 1: Replace `src/screens/GameSummary.tsx`** with:

```tsx
import { useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { GameMetadata } from '../types';
import { getSportConfig } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { useThemeContext } from '../hooks/useTheme';
import { getGame, listEvents, listPlayers } from '../db/queries';
import { teamAccent } from '../utils/teamColors';
import { buildShareModel } from '../utils/shareCard';
import { exportShareCard } from '../utils/exportShareCard';
import { exportGameCSV, exportGameJSON, downloadFile } from '../utils/export';
import ShareCard from '../components/ShareCard';
import { ChevronLeft, Share } from '../components/icons';

export default function GameSummary() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { db } = useDB();
  const { dark } = useThemeContext();
  const game = useMemo(() => (gameId ? getGame(db, gameId) ?? null : null), [db, gameId]);
  const events = useMemo(() => (gameId ? listEvents(db, gameId) : []), [db, gameId]);
  const players = useMemo(() => (gameId ? listPlayers(db, gameId) : []), [db, gameId]);
  const cardRef = useRef<HTMLDivElement>(null);
  const [shareState, setShareState] = useState('');

  if (!game) {
    return <div className="p-4 text-txt-3">Game not found</div>;
  }

  const sport = getSportConfig(game.sport);
  const aHome = teamAccent({ primary: game.home_primary, secondary: game.home_secondary }, dark);
  const aAway = teamAccent({ primary: game.away_primary, secondary: game.away_secondary }, dark);

  let metadata: GameMetadata = {};
  try { if (game.notes) metadata = JSON.parse(game.notes) as GameMetadata; } catch { /* malformed notes JSON — keep default metadata */ }
  const periodCount = metadata.periodCount ?? sport.periods.count;
  const periodName = metadata.periodName ?? sport.periods.name;

  const maxPeriod = events.length > 0 ? Math.max(...events.map((e) => e.half_or_period)) : periodCount;
  const periodScores = Array.from({ length: maxPeriod }, (_, i) => {
    const periodEvents = events.filter((e) => e.half_or_period === i + 1);
    const home = periodEvents.filter((e) => e.team === 'home').reduce((s, e) => s + e.points, 0);
    const away = periodEvents.filter((e) => e.team === 'away').reduce((s, e) => s + e.points, 0);
    return { period: i + 1, home, away };
  });

  const playerStats = players.map((p) => {
    const playerEvents = events.filter((e) => e.player_id === p.id);
    const points = playerEvents.reduce((s, e) => s + e.points, 0);
    const byType = new Map<string, number>();
    playerEvents.forEach((e) => { byType.set(e.event_type, (byType.get(e.event_type) ?? 0) + 1); });
    return { player: p, points, byType };
  }).filter((s) => s.byType.size > 0);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setShareState('Preparing…');
    const model = buildShareModel(game, events, sport, { variant: 'final' });
    const outcome = await exportShareCard(
      cardRef.current,
      `${game.home_team}-v-${game.away_team}.png`.replace(/\s+/g, '-'),
      { title: `${game.home_team} v ${game.away_team}`, text: `${model.home.name} ${model.home.score} – ${model.away.name} ${model.away.score}` }
    );
    setShareState(outcome === 'shared' ? 'Shared' : outcome === 'downloaded' ? 'Image saved' : outcome === 'cancelled' ? '' : "Couldn't create image");
  };

  const handleExportCSV = () => downloadFile(exportGameCSV(game, events, players), `${game.home_team}-vs-${game.away_team}.csv`, 'text/csv');
  const handleExportJSON = () => downloadFile(exportGameJSON(game, events, players), `${game.home_team}-vs-${game.away_team}.json`, 'application/json');

  const eyebrow = 'text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-3';

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/')} aria-label="Back" className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-surface-2 border border-line text-txt press">
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3">Full time</div>
          <h1 className="text-xl font-extrabold text-txt -tracking-[0.02em] truncate flex items-center gap-2"><span aria-hidden="true">{sport.icon}</span> {sport.name}</h1>
        </div>
      </div>

      {/* Hero share card */}
      <ShareCard ref={cardRef} game={game} events={events} sport={sport} variant="final" />

      {/* By period */}
      <section>
        <h2 className={eyebrow}>By {periodName.toLowerCase()}</h2>
        <div className="bg-surface border border-line rounded-2xl p-4 space-y-2">
          {periodScores.map((ps) => (
            <div key={ps.period} className="flex items-center justify-between text-sm">
              <span className="text-txt-3">{ps.period <= periodCount ? `${periodName} ${ps.period}` : `Extra ${ps.period - periodCount}`}</span>
              <span className="font-score tabular-nums">
                <span className="font-bold" style={{ color: aHome }}>{ps.home}</span>
                <span className="text-txt-3 mx-2">-</span>
                <span className="font-bold" style={{ color: aAway }}>{ps.away}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Player stats */}
      {playerStats.length > 0 && (
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
                    {Array.from(byType.entries()).map(([type, count]) => `${count} ${type.replace(/_/g, ' ')}`).join(', ')}
                  </p>
                </div>
                {points > 0 && <span className="text-sm font-bold text-txt shrink-0 ml-3">{points} pts</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Share */}
      <div>
        <button type="button" onClick={handleShare} className="w-full flex items-center justify-center gap-2 bg-txt text-bg rounded-xl py-3.5 text-sm font-bold press">
          <Share size={16} /> Share result
        </button>
        {shareState && <p className="text-center text-xs text-txt-3 mt-2">{shareState}</p>}
      </div>

      {/* Export */}
      <div className="flex gap-3">
        <button type="button" onClick={handleExportCSV} className="flex-1 bg-surface-2 border border-line rounded-xl py-3 text-sm font-semibold text-txt-2 press">Export CSV</button>
        <button type="button" onClick={handleExportJSON} className="flex-1 bg-surface-2 border border-line rounded-xl py-3 text-sm font-semibold text-txt-2 press">Export JSON</button>
      </div>

      <Link to="/" className="block text-center text-sm text-txt-3 underline py-2">Back to Home</Link>
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `npx vitest run` (all green), `npm run build` (SUCCESS), `npm run lint` (0). Read the current `src/screens/GameSummary.tsx` first to confirm `getGame`/`listEvents`/`listPlayers`, `exportGameCSV`/`exportGameJSON`/`downloadFile`, and `GameMetadata` match (the data logic — period breakdown, player stats, exports — is unchanged from the original).

- [ ] **Step 3: Commit**
```bash
git add src/screens/GameSummary.tsx
git commit -m "feat: restyle GameSummary with ShareCard hero + direct share"
```

---

### Task 5: Stale-token sweep + version + changelog + final verification

**Files:** Modify `package.json`, `package-lock.json`, `CHANGELOG.md`.

- [ ] **Step 1: Grep for leftover legacy tokens:**
```bash
grep -rn "text-home\|text-away\|bg-home\|bg-away\|bg-accent\|surface-600\|surface-700\|surface-800\|text-white\|text-gray-" src/components/ShareSheet.tsx src/screens/GameSummary.tsx
```
Expected: **no matches.** (`ShareCard.tsx` deliberately uses literal `#fff`/`rgba(255,255,255,…)` — it's the always-dark artifact, not theme-bound; do NOT flag those.) Fix any in ShareSheet/GameSummary and re-verify.

- [ ] **Step 2: Bump version** — `package.json` `1.1.11` → `1.1.12`; `package-lock.json` root + `packages[""]` `1.1.11` → `1.1.12`. (Leave the `html-to-image` dependency entries from Task 1 alone.)

- [ ] **Step 3: Changelog** — in `CHANGELOG.md`, replace:
```md
All notable changes to this project will be documented in this file.

## [1.1.11] - 2026-05-30
```
with:
```md
All notable changes to this project will be documented in this file.

## [1.1.12] - 2026-05-30

### Changed
- Rebuilt the shareable score image (Sideline refresh, Phase 6): it's now a single crisp card in the teams' kit colours (rendered from HTML), replacing the old canvas image and its Square/Story sizes — fixing the earlier proportion issues. The Game Summary screen is restyled with the share card as its centrepiece; period breakdown, player stats, and CSV/JSON export are unchanged.

## [1.1.11] - 2026-05-30
```

- [ ] **Step 4: Full verification** — `npx vitest run` (all green), `npm run build` (SUCCESS — confirm `html-to-image` is bundled), `npm run lint` (0 errors).

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.12 + changelog for share-card rebuild"
```

---

## Plan self-review

**Spec coverage:**
- html-to-image + `exportShareCard` → Task 1 ✅
- `ShareCard` HTML artifact (glows, sides, winner accent, footer, always-dark) → Task 2 ✅
- `ShareSheet` rewrite (renders+captures ShareCard, no canvas/Square-Story) + delete `renderScoreCard.ts` → Task 3 ✅
- `GameSummary` restyle (ShareCard hero, direct share, period/stats/export preserved) → Task 4 ✅
- Stale-token sweep + version 1.1.12 → Task 5 ✅
- `LiveGame` unchanged (ShareSheet API preserved) ✅; `buildShareModel`/`shareImage` kept + tests intact ✅

**Placeholder scan:** none — full code in every step.

**Type/name consistency:** `ShareCard` is `forwardRef<HTMLDivElement, Props>` with `{game,events,sport,variant,periodLabel?}`; `ShareSheet`/`GameSummary` pass `ref={cardRef}` (a `useRef<HTMLDivElement>`); `exportShareCard(node, filename, {title,text})` → `ShareOutcome`; `buildShareModel(... {variant, periodLabel})` matches; `ShareSheet` keeps its prop signature so `LiveGame` compiles unchanged; icons `ChevronLeft`/`Share` exist; `Game` colour fields + `home_score`/`away_score` exist. `ShareCard` literal whites are intentional (excluded from the token grep in Task 5 Step 1).

**Risk note:** `html-to-image`'s `toPng` needs a real browser (won't run in jsdom), so `exportShareCard`/`ShareCard` aren't unit-tested — covered by build + manual PR capture. The deletion of `renderScoreCard.ts` is safe (only `ShareSheet` imported it; Task 3 rewrites `ShareSheet` first, then deletes, then greps for dangling refs).
