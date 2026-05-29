# Shareable Score Image — Design Spec

Let users share a polished, branded image of the **current score** (mid-game) or the
**final result** of any game, straight to WhatsApp / Instagram / Messages via the native
share sheet (with a download fallback). The image is generated entirely client-side, so it
works offline like the rest of the app.

## Background

- The app is an offline-first PWA; no operation may depend on the network. Image generation
  must therefore be **client-side**.
- Scores are event-sourced. Team totals are `Σ points` (`game.home_score` / `away_score`).
  Gaelic Football shows a `goals-points` scoreline via `formatGaelicScore`; other sports show
  the integer total.
- There is already a Web Share pattern in `src/screens/Settings.tsx` (shares a URL, falls back
  to clipboard) and a `downloadFile(content, filename, mime)` helper in `src/utils/export.ts`.
- Theme: surface `#0f0f23`/`#1a1a2e`/`#16213e`, home blue `#60a5fa`, away amber `#fbbf24`,
  accent `#2563eb`, system-ui font. App name "Jonathan's Score Keeper", URL
  `https://runthehill.github.io/score-keeper/`.

## Design decisions (validated via visual companion)

| Decision | Choice |
|----------|--------|
| Visual direction | **Bold gradient hero** — gradient background, large type |
| Layout | **Stacked** — team name on its own line, large score centred below (never side-by-side, so long names can't push the score) |
| Formats | **Square 1080×1080** and **Story 1080×1920** (user toggles which to share) |
| Final variant | `FULL TIME` pill + 🏆 on the winner (`DRAW` + no trophy when level) |
| Live variant | red `● LIVE` pill + current period label, **no** trophy |
| Footer | `{sportIcon} {sport} · {date} · Jonathan's Score Keeper · runthehill.github.io/score-keeper` |
| Branding | App name + URL as **text** (no QR code → no new dependency) |
| Generation | **Canvas 2D, hand-drawn** (zero deps, offline, pixel-perfect) |
| Sharing | **Web Share API Level 2** (share file) → **download** fallback |
| UX | A **Share sheet** modal: live preview + Square/Story toggle + Share / Save image |

### Image layout detail
Background: linear gradient `140deg, #2563eb 0%, #1e3a5f 55%, #0f0f23 100%`.

Top: a centred status **pill** — final: `FULL TIME` (translucent white); live: `● LIVE` (translucent
red `#ef4444`) followed by the period label.

Middle (stacked, vertically centred): **home on top, away below**. Each team:
- team name in **white** for contrast on the gradient, preceded by a small **team-colour dot**
  (home `#60a5fa`, away `#fbbf24`) to preserve the app's home/away coding;
- the winner's name is also preceded by 🏆;
- the large score on its own line below the name;
- the **losing** team's block is drawn at ~0.82 opacity (final only); on a draw both are full
  opacity and neither shows a trophy.

The score shown is the sport's primary scoreline string — Gaelic `1-12`, others the integer
`21`. The parenthesised Gaelic total is **not** shown on the card (keeps the hero clean).

Bottom: the footer line (small, translucent white).

**Auto-fit:** team names are measured with `ctx.measureText`; the font shrinks from a base size
to a floor, then ellipsises if it still overflows the safe width. Scores use a fixed large size
(scores are short). This guarantees nothing wraps.

## Architecture

Four small, focused units plus two wiring points.

### 1. `src/utils/shareCard.ts` — pure view-model builder
```ts
export type ShareVariant = 'live' | 'final';

export interface ShareTeam {
  name: string;
  score: string;        // "1-12" (split) or "21" (single)
  side: 'home' | 'away';
  isWinner: boolean;    // always false when variant === 'live' or on a draw
}

export interface ShareModel {
  sport: string;        // "Gaelic Football"
  sportIcon: string;    // "🟢"
  isLive: boolean;
  statusLabel: string;  // "FULL TIME" | "DRAW" | period label e.g. "Half 2"
  dateLabel: string;    // "29 May 2026"
  home: ShareTeam;
  away: ShareTeam;
  isDraw: boolean;
  appName: string;      // "Jonathan's Score Keeper"
  appUrl: string;       // "runthehill.github.io/score-keeper"
}

export function buildShareModel(
  game: Game,
  events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[],
  sport: SportConfig,
  opts: { variant: ShareVariant; periodLabel?: string }
): ShareModel
```
Logic:
- `score`: split sports → `formatGaelicScore(events, side)`; single → `String(game.{side}_score)`.
- Winner (final only): higher of `game.home_score` / `game.away_score`; equal → `isDraw = true`,
  both `isWinner = false`. Live → both `isWinner = false`, `isDraw = false`.
- `statusLabel`: final → `isDraw ? 'DRAW' : 'FULL TIME'`; live → `opts.periodLabel` (caller passes
  the same label LiveGame shows, e.g. `Half 2` or an extra-time label).
- `dateLabel`: `game.started_at` → `D MMM YYYY` (e.g. `29 May 2026`).
- Pure and deterministic → fully unit-testable.

### 2. `src/utils/renderScoreCard.ts` — Canvas 2D renderer
```ts
export type ShareFormat = 'square' | 'story';
export const CARD_SIZES = {
  square: { w: 1080, h: 1080 },
  story:  { w: 1080, h: 1920 },
} as const;

export function renderScoreCard(
  canvas: HTMLCanvasElement,
  model: ShareModel,
  format: ShareFormat
): void
```
Sets `canvas.width/height` from `CARD_SIZES[format]`, paints the gradient, pill, stacked
teams (with dot, trophy, auto-fit name, score, loser dimming), and footer. Pure drawing, no
state. Verified visually (jsdom can't measure real fonts).

```ts
export function cardToBlob(canvas: HTMLCanvasElement): Promise<Blob>  // canvas.toBlob(png)
```

### 3. `src/utils/shareImage.ts` — share / fallback
```ts
export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'error';

export async function shareImage(
  blob: Blob,
  filename: string,
  meta: { title: string; text: string }
): Promise<ShareOutcome>
```
- Build `File([blob], filename, {type:'image/png'})`.
- If `navigator.canShare?.({ files:[file] })` → `await navigator.share({ files:[file], ...meta })`
  → `'shared'`; on `AbortError` → `'cancelled'`.
- Otherwise (or on non-abort error) → `downloadFile`-style anchor download of the blob → `'downloaded'`.
- Testable with a mocked `navigator`.

### 4. `src/components/ShareSheet.tsx` — the modal
Props: `{ game, events, sport, variant, periodLabel?, onClose }`.
- Builds the model with `buildShareModel`, holds `format` state (default `square`).
- Renders to a hidden/preview `<canvas>` via `renderScoreCard` whenever model/format change
  (effect keyed on `[model, format]`), shown scaled-down as the preview.
- **Square / Story** toggle; **Share** button (`cardToBlob` → `shareImage`); **Save image**
  button (download); a brief outcome toast ("Shared" / "Image saved"); Cancel.
- Bottom-sheet styling consistent with the existing card/stat pickers in `LiveGame.tsx`.

### Wiring
- `src/screens/GameSummary.tsx` — a **"Share result"** button beside Export CSV/JSON; opens
  `ShareSheet` with `variant="final"`.
- `src/screens/LiveGame.tsx` — a small **share icon** by the scoreboard; opens `ShareSheet`
  with `variant="live"` and `periodLabel` = the current period label (or `extraPeriodLabel`).

## Data flow
`game + events + sport` → `buildShareModel` → `ShareModel` → `renderScoreCard(canvas, model, format)`
→ `cardToBlob` → `shareImage` → native share sheet **or** file download.

## Sports handling
- **Gaelic Football** (`scoreDisplay: 'split'`): score string `goals-points` (`1-12`).
- **Rugby / Soccer / Basketball** (`scoreDisplay: 'single'`): integer total.
- Winner is always decided by the integer total regardless of display, so it's correct for both.

## Error handling / edge cases
- Web Share for files unsupported (most desktops) → download fallback.
- User cancels the share sheet (`AbortError`) → `'cancelled'`, no download, no error.
- `toBlob` returns null / throws → `'error'` + toast "Couldn't create image".
- Draw → `DRAW`, no trophy, both teams full opacity.
- Long names → auto-fit (shrink then ellipsise).
- Live with no events yet → `0-00` / `0`; still renders.
- Single-score sports → no parenthetical total line.

## Testing (TDD)
- **`src/utils/shareCard.test.ts`** — `buildShareModel`:
  - Gaelic final: `1-12` vs `0-11` → home winner, `isDraw=false`, status `FULL TIME`, not live.
  - Single-score final (soccer `2`–`1`) → scores `"2"`/`"1"`, home winner.
  - Draw (equal totals) → `isDraw=true`, neither `isWinner`, status `DRAW`.
  - Live variant → `isLive=true`, status = passed `periodLabel`, both `isWinner=false`.
  - `dateLabel` formats a known ISO date to `29 May 2026`.
- **`src/utils/shareImage.test.ts`** — mock `navigator`:
  - `canShare` true & `share` resolves → `'shared'`, `share` called with a file.
  - `share` rejects `AbortError` → `'cancelled'`, no download.
  - `canShare` absent → download path → `'downloaded'`.
  - `share` rejects non-abort → download fallback → `'downloaded'`.
- **Canvas / ShareSheet** — verified manually (jsdom lacks real font metrics & `toBlob`); keep
  logic out of the renderer that can't be eyeballed.

## Versioning (per CLAUDE.md, before push)
- Bump `package.json` `1.1.3` → `1.1.4`.
- Add a `CHANGELOG.md` `[1.1.4]` entry describing the shareable score image.

## Out of scope
- QR code / deep links on the image.
- Editing or annotating the image; multiple colour themes.
- Animated/video shares.
- Per-sport bespoke artwork (one template, theme-driven).
