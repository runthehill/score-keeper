# Shareable Score Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users share a branded image of the current score or final result via the native share sheet (with a download fallback), generated entirely client-side.

**Architecture:** A pure `buildShareModel` produces a view-model from game/events; a Canvas 2D `renderScoreCard` draws the bold-gradient hero card (square or story); `shareImage` does Web Share (files) → download fallback; a `ShareSheet` modal previews + shares; wired into GameSummary (final) and LiveGame (live). Zero new dependencies.

**Tech Stack:** Vite + React + TypeScript, Tailwind v3, Canvas 2D API, Web Share API Level 2, vitest.

---

## File structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/utils/shareCard.ts` | Pure `buildShareModel` view-model | Create |
| `src/utils/shareCard.test.ts` | Model tests | Create |
| `src/utils/renderScoreCard.ts` | Canvas 2D renderer + `cardToBlob` + `CARD_SIZES` | Create |
| `src/utils/shareImage.ts` | Web Share → download fallback | Create |
| `src/utils/shareImage.test.ts` | Share tests | Create |
| `src/utils/export.ts` | `downloadFile` widened to accept `Blob` | Modify |
| `src/components/ShareSheet.tsx` | Preview + format toggle + Share/Save modal | Create |
| `src/screens/GameSummary.tsx` | "Share result" button + sheet (final) | Modify |
| `src/screens/LiveGame.tsx` | "Share current score" button + sheet (live) | Modify |
| `package.json` / `CHANGELOG.md` | Version 1.1.4 + entry | Modify |

**Testability note:** `buildShareModel` and `shareImage` are unit-tested (TDD). The canvas renderer and the `ShareSheet` component **cannot** be unit-tested here — jsdom has no real Canvas 2D context or font metrics — so they are verified by `npm run build` (typecheck) plus a manual smoke test. This is intentional; do not add canvas unit tests.

All commit commands include the project's co-author trailer.

---

### Task 1: `buildShareModel` (pure view-model)

**Files:**
- Create: `src/utils/shareCard.ts`
- Test: `src/utils/shareCard.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/shareCard.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildShareModel } from './shareCard';
import { getSportConfig } from '../sports/configs';
import type { Game, GameEvent } from '../types';

function game(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1', sport: 'gaelic_football', home_team: 'Coolera', away_team: 'Tourlestrane',
    home_score: 0, away_score: 0, status: 'completed',
    started_at: '2026-05-29T12:00:00.000Z', ended_at: null, notes: '',
    ...overrides,
  };
}

const ev = (event_type: string, team: 'home' | 'away', points: number): Pick<GameEvent, 'event_type' | 'team' | 'points'> =>
  ({ event_type, team, points });

describe('buildShareModel', () => {
  it('builds a Gaelic final with goals-points scores and a winner', () => {
    const g = game({ home_score: 15, away_score: 11 });
    const events = [ev('goal', 'home', 3), ev('point', 'home', 1), ev('two_pointer', 'home', 2), ev('point', 'away', 1)];
    const m = buildShareModel(g, events, getSportConfig('gaelic_football'), { variant: 'final' });
    expect(m.isLive).toBe(false);
    expect(m.statusLabel).toBe('FULL TIME');
    expect(m.home.score).toBe('1-03');
    expect(m.away.score).toBe('0-01');
    expect(m.home.isWinner).toBe(true);
    expect(m.away.isWinner).toBe(false);
    expect(m.isDraw).toBe(false);
    expect(m.dateLabel).toBe('29 May 2026');
    expect(m.sport).toBe('Gaelic Football');
  });

  it('uses integer scores for single-score sports', () => {
    const g = game({ sport: 'soccer', home_score: 2, away_score: 1 });
    const events = [ev('goal', 'home', 1), ev('goal', 'home', 1), ev('goal', 'away', 1)];
    const m = buildShareModel(g, events, getSportConfig('soccer'), { variant: 'final' });
    expect(m.home.score).toBe('2');
    expect(m.away.score).toBe('1');
    expect(m.home.isWinner).toBe(true);
  });

  it('marks a draw with no winner', () => {
    const g = game({ sport: 'soccer', home_score: 1, away_score: 1 });
    const m = buildShareModel(g, [ev('goal', 'home', 1), ev('goal', 'away', 1)], getSportConfig('soccer'), { variant: 'final' });
    expect(m.isDraw).toBe(true);
    expect(m.statusLabel).toBe('DRAW');
    expect(m.home.isWinner).toBe(false);
    expect(m.away.isWinner).toBe(false);
  });

  it('builds a live model with the period label and no winner', () => {
    const g = game({ home_score: 8, away_score: 7 });
    const m = buildShareModel(g, [], getSportConfig('gaelic_football'), { variant: 'live', periodLabel: 'Half 2' });
    expect(m.isLive).toBe(true);
    expect(m.statusLabel).toBe('Half 2');
    expect(m.home.isWinner).toBe(false);
    expect(m.away.isWinner).toBe(false);
    expect(m.isDraw).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/utils/shareCard.test.ts`
Expected: FAIL — `buildShareModel` is not defined / module not found.

- [ ] **Step 3: Implement `buildShareModel`**

Create `src/utils/shareCard.ts`:

```ts
import type { Game, GameEvent, SportConfig, Team } from '../types';
import { formatGaelicScore } from './format';

export type ShareVariant = 'live' | 'final';

export interface ShareTeam {
  name: string;
  score: string;
  side: Team;
  isWinner: boolean;
}

export interface ShareModel {
  sport: string;
  sportIcon: string;
  isLive: boolean;
  statusLabel: string;
  dateLabel: string;
  home: ShareTeam;
  away: ShareTeam;
  isDraw: boolean;
  appName: string;
  appUrl: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Format the UTC calendar date of an ISO timestamp as "29 May 2026" (deterministic across timezones).
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function scoreFor(
  game: Game,
  events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[],
  sport: SportConfig,
  side: Team
): string {
  if (sport.scoreDisplay === 'split') return formatGaelicScore(events, side);
  return String(side === 'home' ? game.home_score : game.away_score);
}

export function buildShareModel(
  game: Game,
  events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[],
  sport: SportConfig,
  opts: { variant: ShareVariant; periodLabel?: string }
): ShareModel {
  const isLive = opts.variant === 'live';
  const isDraw = !isLive && game.home_score === game.away_score;
  const homeWins = !isLive && game.home_score > game.away_score;
  const awayWins = !isLive && game.away_score > game.home_score;

  return {
    sport: sport.name,
    sportIcon: sport.icon,
    isLive,
    statusLabel: isLive ? (opts.periodLabel ?? '') : isDraw ? 'DRAW' : 'FULL TIME',
    dateLabel: formatDate(game.started_at),
    home: { name: game.home_team, score: scoreFor(game, events, sport, 'home'), side: 'home', isWinner: homeWins },
    away: { name: game.away_team, score: scoreFor(game, events, sport, 'away'), side: 'away', isWinner: awayWins },
    isDraw,
    appName: "Jonathan's Score Keeper",
    appUrl: 'runthehill.github.io/score-keeper',
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/utils/shareCard.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/shareCard.ts src/utils/shareCard.test.ts
git commit -m "feat: add buildShareModel view-model for shareable score image" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `shareImage` (Web Share + download fallback)

**Files:**
- Modify: `src/utils/export.ts` (widen `downloadFile` to accept `Blob`)
- Create: `src/utils/shareImage.ts`
- Test: `src/utils/shareImage.test.ts`

- [ ] **Step 1: Widen `downloadFile` to accept a Blob**

In `src/utils/export.ts`, change the `downloadFile` signature (the `content` parameter) from `content: string` to `content: string | Blob`. The body already wraps it: `new Blob([content], { type: mimeType })` works for both. The final function reads:

```ts
export function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/utils/shareImage.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shareImage } from './shareImage';

const blob = new Blob(['x'], { type: 'image/png' });
const meta = { title: 'A v B', text: 'A 1 - 0 B' };

beforeEach(() => {
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => 'blob:mock');
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
});

afterEach(() => {
  delete (navigator as { share?: unknown }).share;
  delete (navigator as { canShare?: unknown }).canShare;
  vi.restoreAllMocks();
});

describe('shareImage', () => {
  it('uses Web Share when files are shareable', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    (navigator as { share?: unknown }).share = share;
    (navigator as { canShare?: unknown }).canShare = vi.fn(() => true);
    const outcome = await shareImage(blob, 'card.png', meta);
    expect(outcome).toBe('shared');
    expect(share).toHaveBeenCalledOnce();
    expect(share.mock.calls[0][0].files[0]).toBeInstanceOf(File);
  });

  it('returns cancelled when the user aborts the share sheet', async () => {
    (navigator as { share?: unknown }).share = vi.fn().mockRejectedValue(
      Object.assign(new Error('user abort'), { name: 'AbortError' })
    );
    (navigator as { canShare?: unknown }).canShare = vi.fn(() => true);
    const outcome = await shareImage(blob, 'card.png', meta);
    expect(outcome).toBe('cancelled');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('downloads when Web Share for files is unavailable', async () => {
    const outcome = await shareImage(blob, 'card.png', meta);
    expect(outcome).toBe('downloaded');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('falls back to download on a non-abort share error', async () => {
    (navigator as { share?: unknown }).share = vi.fn().mockRejectedValue(new Error('boom'));
    (navigator as { canShare?: unknown }).canShare = vi.fn(() => true);
    const outcome = await shareImage(blob, 'card.png', meta);
    expect(outcome).toBe('downloaded');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/utils/shareImage.test.ts`
Expected: FAIL — `shareImage` is not defined.

- [ ] **Step 4: Implement `shareImage`**

Create `src/utils/shareImage.ts`:

```ts
import { downloadFile } from './export';

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'error';

interface ShareMeta {
  title: string;
  text: string;
}

export async function shareImage(blob: Blob, filename: string, meta: ShareMeta): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };

  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: meta.title, text: meta.text });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
      // any other share error → fall through to download
    }
  }

  try {
    downloadFile(blob, filename, 'image/png');
    return 'downloaded';
  } catch {
    return 'error';
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/utils/shareImage.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/utils/export.ts src/utils/shareImage.ts src/utils/shareImage.test.ts
git commit -m "feat: add shareImage (Web Share files with download fallback)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `renderScoreCard` (Canvas 2D) + `cardToBlob`

**Files:**
- Create: `src/utils/renderScoreCard.ts`

**No unit tests** — jsdom has no Canvas 2D context. Verified by `npm run build` (typecheck) and a manual smoke test.

- [ ] **Step 1: Implement the renderer**

Create `src/utils/renderScoreCard.ts`:

```ts
import type { ShareModel, ShareTeam } from './shareCard';

export type ShareFormat = 'square' | 'story';

export const CARD_SIZES: Record<ShareFormat, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
};

const HOME_DOT = '#60a5fa';
const AWAY_DOT = '#fbbf24';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Shrink the font from baseSize toward minSize until the text fits maxWidth; then ellipsize.
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, baseSize: number, minSize: number): { text: string; size: number } {
  let size = baseSize;
  while (size > minSize) {
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return { text, size };
    size -= 4;
  }
  ctx.font = `800 ${minSize}px system-ui, sans-serif`;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return { text: t.length < text.length ? `${t}…` : t, size: minSize };
}

function drawTeam(ctx: CanvasRenderingContext2D, team: ShareTeam, w: number, y: number, dotColor: string, dimmed: boolean, maxNameWidth: number): void {
  ctx.save();
  ctx.globalAlpha = dimmed ? 0.82 : 1;

  // Name row (optional trophy prefix), auto-fit, with a leading team-colour dot.
  const label = `${team.isWinner ? '🏆 ' : ''}${team.name}`;
  const fitted = fitText(ctx, label, maxNameWidth - w * 0.06, w * 0.05, w * 0.03);
  ctx.font = `800 ${fitted.size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const nameWidth = ctx.measureText(fitted.text).width;
  const dotR = w * 0.013;
  const gap = w * 0.022;
  const startX = (w - (dotR * 2 + gap + nameWidth)) / 2;
  const nameY = y - w * 0.05;

  ctx.beginPath();
  ctx.fillStyle = dotColor;
  ctx.arc(startX + dotR, nameY, dotR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(fitted.text, startX + dotR * 2 + gap, nameY);

  // Score (large, centred).
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${w * 0.12}px system-ui, sans-serif`;
  ctx.fillText(team.score, w / 2, y + w * 0.055);

  ctx.restore();
}

export function renderScoreCard(canvas: HTMLCanvasElement, model: ShareModel, format: ShareFormat): void {
  const { w, h } = CARD_SIZES[format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background gradient (Direction B).
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#2563eb');
  g.addColorStop(0.55, '#1e3a5f');
  g.addColorStop(1, '#0f0f23');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Status pill (top).
  const pillY = h * (format === 'story' ? 0.16 : 0.18);
  const pillText = model.isLive
    ? `● LIVE${model.statusLabel ? `   ${model.statusLabel.toUpperCase()}` : ''}`
    : model.statusLabel;
  ctx.font = `800 ${w * 0.034}px system-ui, sans-serif`;
  const pillW = ctx.measureText(pillText).width + w * 0.08;
  const pillH = w * 0.085;
  roundRect(ctx, (w - pillW) / 2, pillY - pillH / 2, pillW, pillH, pillH / 2);
  ctx.fillStyle = model.isLive ? 'rgba(239,68,68,0.22)' : 'rgba(255,255,255,0.16)';
  ctx.fill();
  ctx.fillStyle = model.isLive ? '#fecaca' : '#ffffff';
  ctx.fillText(pillText, w / 2, pillY);

  // Teams (stacked, centred). Loser dimmed only on a decided final.
  const centerY = h * 0.5;
  const blockGap = h * (format === 'story' ? 0.18 : 0.19);
  const decided = !model.isLive && !model.isDraw;
  drawTeam(ctx, model.home, w, centerY - blockGap / 2, HOME_DOT, decided && !model.home.isWinner, w * 0.82);
  drawTeam(ctx, model.away, w, centerY + blockGap / 2, AWAY_DOT, decided && !model.away.isWinner, w * 0.82);

  // Footer (two lines).
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = `600 ${w * 0.028}px system-ui, sans-serif`;
  const footY = h * (format === 'story' ? 0.9 : 0.88);
  ctx.fillText(`${model.sportIcon}  ${model.sport}   ·   ${model.dateLabel}`, w / 2, footY);
  ctx.fillText(`${model.appName}   ·   ${model.appUrl}`, w / 2, footY + w * 0.05);
}

export function cardToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to create image'))), 'image/png');
  });
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run build`
Expected: SUCCESS — `tsc -b` reports no type errors and Vite builds.

- [ ] **Step 3: Manual smoke test (optional but recommended)**

Run `npm run dev`, then in the browser devtools console on any page:
```js
const c = document.createElement('canvas');
// (paste a quick model or just confirm the import builds; full visual check happens in Task 4)
```
The real visual check happens once the `ShareSheet` exists (Task 4). It's fine to defer the eyeball check to then.

- [ ] **Step 4: Commit**

```bash
git add src/utils/renderScoreCard.ts
git commit -m "feat: add Canvas 2D renderScoreCard for the shareable score image" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `ShareSheet` modal

**Files:**
- Create: `src/components/ShareSheet.tsx`

**No unit tests** (renders a canvas; jsdom has no 2D context). Verified by `npm run build` + manual smoke in Task 5 wiring.

- [ ] **Step 1: Implement the component**

Create `src/components/ShareSheet.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Game, GameEvent, SportConfig } from '../types';
import { buildShareModel, type ShareVariant } from '../utils/shareCard';
import { renderScoreCard, cardToBlob, CARD_SIZES, type ShareFormat } from '../utils/renderScoreCard';
import { shareImage } from '../utils/shareImage';
import { downloadFile } from '../utils/export';

interface Props {
  game: Game;
  events: GameEvent[];
  sport: SportConfig;
  variant: ShareVariant;
  periodLabel?: string;
  onClose: () => void;
}

export default function ShareSheet({ game, events, sport, variant, periodLabel, onClose }: Props) {
  const [format, setFormat] = useState<ShareFormat>('square');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const model = useMemo(
    () => buildShareModel(game, events, sport, { variant, periodLabel }),
    [game, events, sport, variant, periodLabel]
  );

  useEffect(() => {
    if (canvasRef.current) renderScoreCard(canvasRef.current, model, format);
  }, [model, format]);

  const filename = `${game.home_team}-v-${game.away_team}.png`.replace(/\s+/g, '-');

  const handleShare = async () => {
    if (!canvasRef.current) return;
    setBusy(true);
    try {
      const blob = await cardToBlob(canvasRef.current);
      const outcome = await shareImage(blob, filename, {
        title: `${game.home_team} v ${game.away_team}`,
        text: `${model.home.name} ${model.home.score} – ${model.away.name} ${model.away.score}`,
      });
      if (outcome === 'error') setToast("Couldn't create image");
      else if (outcome === 'downloaded') setToast('Image saved');
      else if (outcome === 'shared') setToast('Shared');
      if (outcome === 'shared' || outcome === 'downloaded') setTimeout(onClose, 800);
    } catch {
      setToast("Couldn't create image");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;
    setBusy(true);
    try {
      const blob = await cardToBlob(canvasRef.current);
      downloadFile(blob, filename, 'image/png');
      setToast('Image saved');
    } catch {
      setToast("Couldn't create image");
    } finally {
      setBusy(false);
    }
  };

  const isPortrait = CARD_SIZES[format].h > CARD_SIZES[format].w;

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full bg-surface-800 rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold text-gray-400 mb-3">
          Share {variant === 'final' ? 'result' : 'current score'}
        </p>

        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            className="rounded-xl border border-surface-600"
            style={{ height: isPortrait ? '260px' : 'auto', width: isPortrait ? 'auto' : '70%', maxWidth: '70%' }}
          />
        </div>

        <div className="flex gap-2 mb-3">
          {(['square', 'story'] as ShareFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${
                format === f ? 'bg-accent border-accent text-white' : 'bg-surface-700 border-surface-600 text-gray-400'
              }`}
            >
              {f === 'square' ? 'Square' : 'Story'}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={handleShare} disabled={busy} className="flex-1 py-3 bg-accent rounded-lg text-sm font-bold disabled:opacity-50">
            {busy ? '…' : 'Share'}
          </button>
          <button onClick={handleSave} disabled={busy} className="flex-1 py-3 bg-surface-700 border border-surface-600 rounded-lg text-sm font-semibold disabled:opacity-50">
            Save image
          </button>
        </div>

        {toast && <p className="text-center text-xs text-gray-400 mt-3">{toast}</p>}
        <button onClick={onClose} className="w-full mt-2 py-3 text-center text-sm text-gray-500">Close</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run build`
Expected: SUCCESS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ShareSheet.tsx
git commit -m "feat: add ShareSheet modal (preview + format toggle + share/save)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Wire into GameSummary (final) and LiveGame (live)

**Files:**
- Modify: `src/screens/GameSummary.tsx`
- Modify: `src/screens/LiveGame.tsx`

- [ ] **Step 1: GameSummary — imports + state**

In `src/screens/GameSummary.tsx`, change the first import line from:
```tsx
import { useMemo } from 'react';
```
to:
```tsx
import { useMemo, useState } from 'react';
```
And add this import after the existing `formatGaelicScore` import line (`import { formatGaelicScore } from '../utils/format';`):
```tsx
import ShareSheet from '../components/ShareSheet';
```

Then add share state. Find the three `useMemo` lines (they derive `game`, `events`, `players`) and immediately after the `players` one, add:
```tsx
  const [showShare, setShowShare] = useState(false);
```
(It must be above the `if (!game)` early return so the hook always runs.)

- [ ] **Step 2: GameSummary — Share button + sheet**

In `src/screens/GameSummary.tsx`, find:
```tsx
      {/* Export */}
      <div className="flex gap-3">
```
Replace it with:
```tsx
      {/* Share */}
      <button
        onClick={() => setShowShare(true)}
        className="w-full bg-accent rounded-xl py-3 text-sm font-bold active:opacity-90"
      >
        Share result
      </button>

      {showShare && (
        <ShareSheet
          game={game}
          events={events}
          sport={sport}
          variant="final"
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Export */}
      <div className="flex gap-3">
```

- [ ] **Step 3: LiveGame — import**

In `src/screens/LiveGame.tsx`, add after the `SubstitutionFlow` import (`import SubstitutionFlow from '../components/SubstitutionFlow';`):
```tsx
import ShareSheet from '../components/ShareSheet';
```

- [ ] **Step 4: LiveGame — state**

In `src/screens/LiveGame.tsx`, find:
```tsx
  const [extraPeriodLabel, setExtraPeriodLabel] = useState<string | null>(null);
```
Add immediately after it:
```tsx
  const [showShare, setShowShare] = useState(false);
```

- [ ] **Step 5: LiveGame — share button + sheet**

In `src/screens/LiveGame.tsx`, find:
```tsx
      <Scoreboard game={game} events={events} />
```
Replace it with:
```tsx
      <Scoreboard game={game} events={events} />

      <button
        onClick={() => setShowShare(true)}
        className="w-full py-2 text-center text-xs font-semibold text-gray-400 border border-surface-600 rounded-lg active:bg-surface-700"
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
```

- [ ] **Step 6: Verify typecheck + build**

Run: `npm run build`
Expected: SUCCESS — no type errors.

- [ ] **Step 7: Manual smoke test**

Run `npm run dev`. Then:
1. Start a Gaelic Football game, add a few scores, tap **Share current score** → the sheet shows a LIVE card (red badge, period label, no trophy). Toggle Square/Story. Tap **Save image** → a PNG downloads; open it and confirm it looks right (gradient, stacked names with home-blue/away-amber dots, big scores, footer).
2. End the game → on the summary, tap **Share result** → FULL TIME card with 🏆 on the winner; the loser row is dimmed. Try a long team name (e.g. rename to "St Joseph's Aughamore") and confirm it auto-fits without wrapping the score.
3. Confirm a single-score sport (e.g. Soccer 2–1) shows integer scores.

- [ ] **Step 8: Commit**

```bash
git add src/screens/GameSummary.tsx src/screens/LiveGame.tsx
git commit -m "feat: wire ShareSheet into GameSummary (final) and LiveGame (live)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Version bump + changelog + final verification

**Files:**
- Modify: `package.json`, `CHANGELOG.md`

- [ ] **Step 1: Bump version**

In `package.json`, change `"version": "1.1.3",` to:
```json
  "version": "1.1.4",
```

- [ ] **Step 2: Changelog entry**

In `CHANGELOG.md`, insert between the intro line and the most recent `##` heading. Replace:
```md
All notable changes to this project will be documented in this file.

## [1.1.3] - 2026-05-29
```
with:
```md
All notable changes to this project will be documented in this file.

## [1.1.4] - 2026-05-29

### Added
- Share the current score or final result as a branded image — bold gradient card in Square (1080×1080) or Story (1080×1920) format, shared via the native share sheet with a download fallback. Generated entirely on-device.

## [1.1.3] - 2026-05-29
```

- [ ] **Step 3: Full verification**

Run: `npx vitest run`
Expected: PASS — all suites green, including the new `shareCard` and `shareImage` tests.

Run: `npm run build`
Expected: SUCCESS.

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.4 and update changelog" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Plan self-review

**Spec coverage** (against `docs/superpowers/specs/2026-05-29-shareable-score-image-design.md`):
- `buildShareModel` (split vs single score, winner/draw, live/final, date) → Task 1 ✅
- `shareImage` (Web Share files → download fallback, abort handling) → Task 2 ✅
- `downloadFile` Blob support → Task 2 ✅
- `renderScoreCard` + `cardToBlob` + `CARD_SIZES` (gradient, pill, stacked teams, dots, trophy, loser dim, auto-fit, footer) → Task 3 ✅
- `ShareSheet` (preview, Square/Story toggle, Share/Save, toast) → Task 4 ✅
- Wiring: GameSummary final + LiveGame live with period label → Task 5 ✅
- White names + home/away dots + winner trophy + dimmed loser (approved refinement) → Task 3 `drawTeam` ✅
- Sports handling (split vs single) → Tasks 1 & 3 ✅
- Edge cases (draw, long names, unsupported share, cancel) → Tasks 1/2/3 + manual ✅
- Versioning 1.1.3 → 1.1.4 + changelog → Task 6 ✅
- Out of scope (QR, editing, animation) — respected ✅

**Placeholder scan:** none — every code step contains complete code; canvas/component tasks explicitly state build+manual verification (not a placeholder, a deliberate choice the spec calls out).

**Type/name consistency:** `ShareModel`, `ShareTeam`, `ShareVariant`, `ShareFormat`, `ShareOutcome`, `CARD_SIZES`, `buildShareModel`, `renderScoreCard`, `cardToBlob`, `shareImage` are used identically across tasks. `ShareSheet` props (`game`, `events`, `sport`, `variant`, `periodLabel?`, `onClose`) match both wiring call sites. `downloadFile(content: string | Blob, ...)` matches its new Blob callers.
