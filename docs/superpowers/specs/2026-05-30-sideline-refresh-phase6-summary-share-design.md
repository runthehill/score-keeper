# Sideline Refresh — Phase 6: Summary + Share-card rebuild — Design Spec

Rebuild the shareable score image as an **HTML card captured with `html-to-image`** (replacing the canvas renderer), and restyle the **Game Summary** screen around it. Phase 6 of 7.

> **Authored while the owner is away** (autonomous). The owner explicitly chose to **rebuild the share card as the prototype does** (HTML + html-to-image) rather than keep the canvas renderer. Faithful to the handoff (`screens2.jsx` `ShareCard`/`SummaryScreen`, `ui.jsx` `exportShareCard`). Lands as its own PR for review — not auto-merged.

## Why rebuild (context)
The old share image is drawn on a `<canvas>` (`src/utils/renderScoreCard.ts`) with **Square/Story** size variants — which caused the proportion problems the owner reported earlier (Square too large / off-screen, Story tiny, bunched names). The rebuild renders **one** responsive HTML card and snapshots it with `html-to-image`, so there are no fixed-canvas dimension mismatches.

## Keep / replace
- **Keep:** `src/utils/shareCard.ts` (`buildShareModel` — names/scores/winner/status/date, tested) and `src/utils/shareImage.ts` (`shareImage(blob, …)` → Web Share API with download fallback, tested). `src/utils/export.ts` (CSV/JSON + `downloadFile`).
- **Replace/remove:** `src/utils/renderScoreCard.ts` (canvas; used only by `ShareSheet`) → deleted. The **Square/Story** format toggle → gone (one card).
- **Add:** `html-to-image` dependency; `src/utils/exportShareCard.ts`; `src/components/ShareCard.tsx`.

## New dependency
`npm install html-to-image` (bundled into the app JS → precached by the existing PWA glob → works offline; no `vite.config` change).

## `src/utils/exportShareCard.ts` (new)
```ts
import { toPng } from 'html-to-image';
import { shareImage, type ShareOutcome } from './shareImage';

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
(Thin glue over the already-tested `shareImage`; verified by build + manual capture.)

## `src/components/ShareCard.tsx` (new — the always-dark artifact)
A `forwardRef<HTMLDivElement>` so the export util can snapshot the root node. Props: `{ game, events, sport, variant, periodLabel? }` (same inputs as `buildShareModel`). It builds the model internally and reads kit colours from `game`. **Always dark** (fixed `#0A0C10` background, `teamAccent(team, true)`), independent of the app theme — this is the exported artifact and the Summary hero.

Layout (from the handoff `ShareCard`):
- Root: `rounded-[22px] overflow-hidden`, dark bg, padding, big shadow. Two **blur glows** — `rgba(home_primary, 0.4)` top-left and `rgba(away_primary, 0.4)` top-right (`filter: blur(60px)`, behind content).
- Header row: status — a `LiveDot` (when `variant==='live'`) or a green dot, then the status label (`model.statusLabel`: period label when live, else `FULL TIME`/`DRAW`); right side `"{sport} · {date}"`.
- Two **TeamSide**s (home left-aligned, away right-aligned): `TeamKitChip` (size 34) + team name (white, ellipsised) + `"Home/Away · Win"` eyebrow + score in `font-score` (62 single / 46 split), coloured `teamAccent(team, true)` for the winner-or-draw else muted white. A faint `–` separator between.
- Divider, then footer: the 4-dot logo + "Score Keeper" + the result line (`isDraw ? 'Full-time draw' : '{winner} by {margin}'`).

Score values + winner/draw + status come from `buildShareModel(game, events, sport, { variant, periodLabel })`; `margin = Math.abs(game.home_score - game.away_score)`.

## `src/components/ShareSheet.tsx` (rewrite — used by LiveGame)
Same props (`{ game, events, sport, variant, periodLabel?, onClose }`) so `LiveGame`'s call is unchanged. Bottom sheet on Sideline tokens (`bg-surface`/`border-line`/`rounded-t-2xl`). Renders `<ShareCard ref={cardRef} … />` (a live preview), then a **Share image** button and a **Close** button. Share builds the model for the share text and calls `exportShareCard(cardRef.current, filename, { title, text })`, surfacing a small toast for the outcome (`shared`/`downloaded`/`error`). No Square/Story toggle, no canvas.

## `src/screens/GameSummary.tsx` (restyle)
Preserve every existing feature — the **period breakdown**, **player stats**, **CSV/JSON export**, and **Back to Home** — restyled to Sideline tokens. Changes:
- Header: a back chevron + sport mark + "Full time" / the sport name (Sideline `SubHeader`-style inline).
- **Hero:** render `<ShareCard ref={cardRef} game events sport variant="final" />` as the score hero (the artifact doubles as the result display). This replaces the old plain "Final score" card.
- **Share result** button → directly `exportShareCard(cardRef.current, …)` (no `ShareSheet` needed here — the card is already on screen). A small "Preparing… / Shared / Saved" state.
- **By period** + **Player stats** sections restyled (`bg-surface`/`border-line`, `text-txt`/`-2`/`-3`, team colours via `teamAccent` where the old code used `text-home`/`text-away`).
- **Export CSV / JSON** + **Done/Back** restyled.
`GameSummary` no longer imports `ShareSheet` (it shares its hero card directly); `ShareSheet` remains for `LiveGame`'s "share current score".

## `src/screens/LiveGame.tsx`
**Unchanged** — it keeps `<ShareSheet variant="live" periodLabel=… />`; only `ShareSheet`'s internals changed.

## Testing
- `buildShareModel` + `shareImage` keep their existing tests (untouched).
- `exportShareCard` and `ShareCard`/`ShareSheet`/`GameSummary` are not unit-tested (html-to-image needs a real DOM/canvas; the card is visual). Verify via `npm run build` + `npm run lint` + manual capture in the PR. Keep the full suite green (remove `renderScoreCard`'s usages cleanly; it has no test file).
- Confirm no dangling imports after deleting `renderScoreCard.ts` (grep).

## Out of scope
Settings (P7). Animations beyond what exists. The CSV/JSON export format is unchanged.

## Versioning
Bump `package.json` 1.1.11 → 1.1.12 (+ lockfile root — `npm install html-to-image` will also add it to the lockfile; that's expected) and add a `CHANGELOG.md` `[1.1.12]` entry.
