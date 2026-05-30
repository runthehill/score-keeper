# Sideline Refresh — Phase 3: Live game (Blocks scoreboard) — Design Spec

Restyle the **Live game screen** — the app's hero — to the "Sideline" look: a colour-blocked
**Blocks scoreboard**, a stadium-clock timer, kit-tinted scoring rows, a clean play-by-play, and
line-icon actions. Phase 3 of 7.

> **Authored while the owner is away** (autonomous, per their standing instruction). Faithful to the
> handoff (`docs/design-handoff/src/live.jsx` + `ui.jsx`). The few judgement calls are under
> **Decisions**. Lands as its own PR for review — not auto-merged.

## Hard rule: restyle only, preserve all behaviour
This is a **visual** change. Every existing Live behaviour stays exactly as-is: event-sourced scoring,
the player-picker flow (score/stat/card → pick player or skip), stat team-picker, card flow,
substitutions, period advance + extra periods, basketball team fouls + bonus, wake-lock, share sheet,
end-game → summary. No changes to `useGame`, `useTimer`, `db/queries`, or the event model. Hooks,
props' data, and the format helpers (`formatGaelicScore`, `formatTimer`, `formatEventTime`) are reused.

The only data the components newly consume is **team kit colour** (already on `Game`:
`home_primary`/`home_secondary`/`away_primary`/`away_secondary`) via `teamAccent`/`inkOn`/`TeamKitChip`
from Phase 2. Existing screens already render — this just makes Live match the new design.

## Decisions (flag for review)
1. **Blocks scoreboard only.** The handoff `Scoreboard` has `bars`/`blocks`/`minimal` variants; the
   decomposition specifies Blocks. Build Blocks as *the* scoreboard. A user-selectable style can come
   with Settings (Phase 7) if wanted. (YAGNI on the other two now.)
2. **Score source:** keep using the persisted `game.home_score`/`game.away_score` for the single-number
   display (the app already maintains these on every event), and `formatGaelicScore(events, team)` for
   the Gaelic split — rather than recomputing from events as the prototype does. Same result, less risk.
3. **Score-pop flash:** wire the Phase-1 `.score-pop` animation — the scored team's half pops briefly.
   Cheap, on-brand, and the keyframe already exists. A small `flash` state in `LiveGame`.
4. **Icons replace emoji** in the actions row and modals (the Phase-1 line-icon set). Sport `icon`
   emoji in configs are left as-is (used elsewhere); the Live actions use `Undo`/`Card`/`Sub`/`Whistle`/
   `Flag`/`Share` line icons.

## Component changes

### `Scoreboard` — Blocks (`src/components/Scoreboard.tsx`)
Two colour-blocked halves with a centre VS badge (handoff `style === 'blocks'`). Same props
`{ game, events }`. For each side build `team = { name, primary, secondary }` from the flat `Game`
fields; `accent` is unused in blocks (the half uses the true `primary` as background, `inkOn(primary)`
as text). Each half: `background: primary`, a 5px top stripe in `secondary`, an uppercase HOME/AWAY
eyebrow, the team name (ellipsised), and the score in `font-score` (76px single, 56px split,
`tabular-nums`); split adds a faint "`{home_score}` pts" subline. Home aligns left, away right. The
centre is a 30px round `VS` badge on `var(--surface)` with `shadow-card`, overlapping the seam. Wrap
in `rounded-[20px] overflow-hidden shadow-card`. The scored half gets `score-pop` when `flash === side`
(new optional prop `flash?: 'home' | 'away' | null`). Tailwind for layout where clean; inline `style`
for the dynamic colours (as Phase 2 components do).

### `Timer` — stadium clock (`src/components/Timer.tsx`)
A full-width pill button (handoff `Timer`). Props become
`{ seconds, running, onToggle, periodLabel }` (add `periodLabel: string`). Layout: a 30px circle
(filled `var(--txt)` with `var(--bg)` ink + `Pause` when running; outlined with `Play` when paused),
the time in `font-score` 30px `tabular-nums`, then a `LiveDot` (only when running) + the uppercase
`periodLabel`. Background `var(--surface-2)`, `border-line`, `rounded-2xl`, `press`. `LiveDot` is a
small inline element using the Phase-1 `live-dot` ping animation (a 6px dot) — define it inline in
`Timer.tsx` (no separate component needed yet).

### `ScoringRow` + `ScoreButton` (`src/components/ScoringRow.tsx`, `ScoreButton.tsx`)
`ScoringRow` props add the kit: `{ events, team, teamName, primary, secondary, onScore }`. Header row:
`TeamKitChip` (size 22) + team name + uppercase side label + the team's score (in `accent`,
`font-score`). Below, a grid `grid-cols-{n}` of `ScoreButton`s. `ScoreButton` props become
`{ event, accent, onClick }`: an **accent-filled** button — `background: accent`, `color: inkOn(accent)`,
`boxShadow: 0 5px 14px rgba(accent,.3)`, `rounded-[15px]`, `press`/`score-btn`; content is `+{points}`
in `font-score` (26px) over the `event.label`. Compute `accent = teamAccent({primary, secondary}, dark)`
once in `ScoringRow` and pass down (read `dark` from `useThemeContext`). Update
`src/components/ScoreButton.test.tsx` for the new props (assert it renders the label + `+points` and
fires `onClick`).

### `EventLog` — play-by-play (`src/components/EventLog.tsx`)
Props add the game for colours/names: `{ events, players, game, gameStartedAt }`. Keep the running-score
calc. Show the most recent 8, newest first, each a row: elapsed time (`formatEventTime`, `font-score`,
`var(--txt-3)`), a 3px accent bar (the event team's `teamAccent`), the event label
(`event_type.replace(/_/g,' ')`, capitalised), the team name (`var(--txt-3)`), player name if present,
and `+{points}` in the accent when `points > 0`. Empty state: the handoff's "No plays yet — tap a
button above to log the first score." Card container `bg-surface rounded-2xl border-line`. Header
eyebrow "Recent". Reads `dark` from `useThemeContext()` for the per-event `teamAccent` calls.

### `ActionsRow` (`src/components/ActionsRow.tsx`)
Same props/logic; restyle to `bg-surface-2 border-line text-txt-2 rounded-xl press` buttons with
**line icons** instead of emoji: stats keep their label (drop emoji, optional small dot), `Card` →
`Card` icon, `Sub` → `Sub` icon, `Undo` → `Undo` icon, the period button → `Whistle`/`Flag` icon +
label. Icons sized ~16, inline with the label.

### `LiveGame` screen (`src/screens/LiveGame.tsx`)
Restyle the inline chrome and wire new props; keep ALL state/handlers:
- **Header:** the sport pill → `bg-surface-2 text-txt-2 border-line rounded-full` (drop `bg-accent`);
  period text → `text-txt-3`.
- **Share button / End Game button:** `border-line text-txt-3` (drop `surface-600`/`surface-700`).
- **Basketball fouls:** `text-txt-3`, bonus → `text-danger`.
- **Timer:** pass `periodLabel={extraPeriodLabel ?? `${periodName} ${currentPeriod}`}`.
- **ScoringRow:** pass `primary`/`secondary` from `game.home_primary…`/`game.away_primary…`.
- **EventLog:** pass `game`.
- **Flash:** add `const [flash, setFlash] = useState<Team | null>(null)`; in `handleScore` (and the
  picker-confirm paths that call `addEvent` with points) set the flash to the scoring team and clear it
  after 450ms; pass `flash` to `Scoreboard`. (Only flash on point-scoring events, not stats/cards.)
- **The 5 modals** (card picker, stat team picker, period confirm, end options, end confirm): restyle to
  `bg-surface border-line`, primary actions → `bg-txt text-bg` (the inverted CTA), the team buttons in
  the card/stat pickers → use each team's kit (`TeamKitChip` + name, tinted with `teamAccent`) instead
  of `bg-home-dark`/`bg-away-dark`. Cancel/secondary → `text-txt-3`.

## Out of scope (later phases)
Game Setup wiring the picker (P4); Home/History (P5); Summary + the share-card rebuild (P6); Settings +
any scoreboard-style preference (P7). `ShareSheet` itself is untouched here (rebuilt in P6).

## Testing
- Restyle of presentational components is verified primarily by `npm run build` + `npm run lint`
  (TypeScript proves prop wiring; the visuals are reviewed by eye / in the PR).
- **Update** `src/components/ScoreButton.test.tsx` to the new `{ event, accent, onClick }` props.
- Keep the full suite green (no behaviour changed). Add a light render test for the Blocks `Scoreboard`
  (renders both team names + scores) since it now has branching (split vs single) — assert it shows the
  home/away names and the single-number score for a non-split sport, and the Gaelic `G-PP` for a split
  sport.
- Manually confirm (reviewer/build) no remaining `text-home`/`text-away`/`bg-home`/`bg-away`/`bg-accent`/
  `surface-600/700/800` classes survive in the Live screen + its components (grep).

## Versioning
Bump `package.json` 1.1.8 → 1.1.9 (+ lockfile root) and add a `CHANGELOG.md` `[1.1.9]` entry.
