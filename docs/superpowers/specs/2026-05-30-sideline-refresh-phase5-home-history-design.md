# Sideline Refresh — Phase 5: Home + History — Design Spec

Restyle the two navigation screens — **Home** (new game + in-progress + recent) and **History** — to the "Sideline" look, with kit-chip game cards, sport tiles, a logo header, and a line-icon tab bar. Phase 5 of 7.

> **Authored while the owner is away** (autonomous). Faithful to the handoff (`screens.jsx` HomeScreen/SportTile/RecentCard, `screens2.jsx` HistoryScreen, AppHeader/TabBar). Decisions flagged below. Lands as its own PR for review — not auto-merged.

## Preserve behaviour
Routing, data, and existing features stay: `listGames(db)`, the live-vs-completed split, links to `/game/:id` (live) / `/summary/:id` (completed) / `/setup/:id` (new), the `InstallBanner`, and **History's sport filter** (All + per-sport pills — the prototype lacks it; keep it, restyled). Only visuals change, plus the small additions below.

## Decisions (flag for review)
1. **One unified `GameCard`** (not separate Resume/Recent components). It already serves Home (in-progress + recent) and History; I restyle it to the handoff's `RecentCard` look — sport name + relative day, a **LIVE** pill when in-progress, two team rows (kit chip + name + score) with the winner emphasised for completed games. The handoff's bigger "ResumeCard" is folded into this (LIVE pill + accent) to avoid a second component. Reversible if you want the larger resume treatment.
2. **`SportTile`** keeps the sport **emoji** (the app has no full per-sport glyph set) inside a tinted rounded square, with name + period summary. A decorative per-sport tint (rugby red, soccer green, gaelic navy, basketball orange) — purely cosmetic, independent of team kits.
3. **`AppHeader`** (new shared component): the 4-dot logo mark + "Jonathan's Score Keeper" + a subtitle (today's date on Home, "Past games" on History).
4. **`TabBar`** restyled with the Phase-1 line icons (`Plus`/`History`/`Settings`) — keeps the existing `NavLink` routing.

## Module changes

### `src/utils/format.ts` — add a relative-day helper
```ts
export function formatRelativeDay(iso: string): string;
// Today / Yesterday / "N days ago" (<7) / else locale date (e.g. "May 24, 2026")
```
(Ported from the handoff `relDay`/`fmtDate`.)

### `src/components/AppHeader.tsx` (new)
`{ subtitle?: string }` → a row: four 7px dots (`#2b9ad5`, `#ea493c`, `#f4c720`, `#47b26c`), then the title (`text-txt`, extrabold) + optional subtitle (`text-txt-3`).

### `src/components/GameCard.tsx` — restyle (RecentCard look)
Same prop `{ game }`. Reads `dark` from `useThemeContext` for `teamAccent`. A `Link` (to `/game/:id` if `in_progress` else `/summary/:id`) styled `bg-surface border border-line rounded-2xl p-3.5 press`:
- Header row: the sport emoji + `sport.name` (uppercase eyebrow, `text-txt-3`); right side — a **LIVE** pill (`bg-danger/15 text-danger`, with a `live-dot`) when in-progress, else `formatRelativeDay(game.started_at)` in `text-txt-3`.
- Two team rows via a helper: `TeamKitChip` (size 20) + team name (truncate; bold `text-txt` if winner, else `text-txt-2`) + score on the right (`font-score`, `teamAccent` for live / winner-emphasis for completed). For completed games the winner (higher score) is bold + full-colour; the loser is muted. Split sports show `formatGaelicScore(... )` — but `GameCard` has no events; it shows the numeric `home_score`/`away_score` (the summary/live screens show the split). Keep the numeric score here (consistent with the current card).

### `src/components/SportCard.tsx` — restyle (SportTile)
`Link` to `/setup/:id`, `bg-surface border border-line rounded-2xl p-4`. A tinted rounded square (`rgba(tint,0.14)` bg) holding the sport emoji, then name (`text-txt`, extrabold) + `"{count} {name}s"` (`text-txt-3`). Tint map keyed by sport id (rugby `#ea493c`, soccer `#47b26c`, gaelic `#16245A`, basketball `#F25F1F`).

### `src/components/TabBar.tsx` — restyle
`bg-surface border-t border-line`, line icons (`Plus` for New Game, `History`, `Settings`), active `text-txt` / inactive `text-txt-3`, labels `text-[10.5px] font-bold`.

### `src/screens/Home.tsx` — restyle
`AppHeader` (subtitle = today's date via `formatRelativeDay(new Date().toISOString())` → "Today", or a formatted date — use a date string) → `InstallBanner` → sections: **In progress** (live `GameCard`s, only if any), **New game** (2-col `SportCard` grid), **Recent** (completed `GameCard`s). Section labels become Sideline eyebrows (`text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3`).

### `src/screens/History.tsx` — restyle
`AppHeader` subtitle "Past games" → the sport filter pills restyled (active `bg-txt text-bg`, inactive `bg-surface-2 border-line text-txt-2`, drop emoji or keep small) → an eyebrow "All games · {count}" → `GameCard` list, or the empty state (`text-txt-3`).

## Testing
- `src/utils/format.test.ts` (or wherever format is tested): add `formatRelativeDay` cases — a same-day ISO → "Today", yesterday → "Yesterday", 3 days → "3 days ago", 30 days → a date string. (Use fixed `iso` values relative to a stubbed "now" — pass `new Date()` is non-deterministic; instead test the boundaries by constructing ISO strings from `Date.now()` offsets at runtime, or accept locale-formatted output loosely. Keep assertions robust to timezone.)
- The screens/components are presentational; verify by `npm run build` + `npm run lint` + a stale-token grep across the 5 files.
- Keep the full suite green.

## Out of scope (later phases)
Summary + the share-card rebuild (P6 — `ShareCard`/`SummaryScreen` in `screens2.jsx`, html-to-image); Settings (P7 — theme toggle, scoreboard style, score-font, export). `ResumeCard` as a distinct large component (folded into `GameCard` here).

## Versioning
Bump `package.json` 1.1.10 → 1.1.11 (+ lockfile root) and add a `CHANGELOG.md` `[1.1.11]` entry.
