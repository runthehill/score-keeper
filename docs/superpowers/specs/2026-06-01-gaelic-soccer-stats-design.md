# Gaelic Wides + Gaelic/Soccer Stat Tracking — Design Spec

Track more events during a game: a **Wide** for Gaelic Football (a 4th button in the scoring row), and additional **stats** — a Penalty for both Gaelic and Soccer, plus Throw-in / Corner / Off-side for Soccer.

## Confirmed decisions
- **Penalty** stat on **both** Gaelic Football and Soccer.
- The Gaelic **Wide** button **attributes to a player** (same flow as a score) when the team has a squad.

## Architecture
The app is data-driven: scoring buttons come from `sport.scoringEvents`, stat buttons from `sport.statEvents`. Almost everything is config; only two small UI tweaks (a 0-point button style + a stat-row layout) and one wording fix are needed.

## Config changes (`src/sports/configs.ts`)
- **Gaelic Football** `scoringEvents` gains a 4th entry: `{ type: 'wide', label: 'Wide', points: 0, icon: '🚩' }`. `statEvents` becomes `[{ type: 'penalty', label: 'Penalty', icon: '🎯' }]`.
- **Soccer** `statEvents` becomes `[ Assist, { type: 'throw_in', label: 'Throw-in', icon: '🤾' }, { type: 'corner', label: 'Corner', icon: '🚩' }, { type: 'offside', label: 'Off-side', icon: '🚫' }, { type: 'penalty', label: 'Penalty', icon: '🎯' } ]`.

(The `icon` field is required by `ScoringEventConfig`/`StatEventConfig` but isn't shown in the live UI — the buttons render labels — so the emoji choices are immaterial.)

## The Gaelic "Wide" button (`src/components/ScoreButton.tsx`)
`ScoringRow` already renders one `ScoreButton` per `scoringEvents` entry, so adding Wide makes Gaelic a 4-button row automatically (`grid-cols-4`). But Wide has `points: 0`, and the current `ScoreButton` always shows `+{points}` in the filled team-accent style — `+0 Wide` would look like a score.

So `ScoreButton` gets a **0-point branch**: when `event.points === 0`, render a **de-emphasised outline button** — transparent background, `inset 0 0 0 1px var(--line-2)` border, `var(--txt-2)` text, the label centred (e.g. "Wide"), and **no "+N"**. Points-scoring buttons keep their existing filled-accent look. This makes Wide read as a tally/miss sitting alongside the three score buttons, not a fourth score.

Tapping Wide uses the existing scoring flow (`handleScore` → player picker when the team has a squad), recording a 0-point `wide` event optionally attributed to a player. Because it's 0 points it does **not** change the score, the persisted `home_score`/`away_score`, or the Gaelic `formatGaelicScore` G-PP (which sums points; a wide adds 0).

## Player-picker wording (`src/screens/LiveGame.tsx`)
The picker title is currently `Who scored the {event}?`. For a 0-point event that reads wrong ("Who scored the wide?"). Change the title to branch on points: `points > 0 ? 'Who scored the {event}?' : 'Who hit the {event}?'` → "Who hit the wide?". (The `pendingScore` already carries `points`.)

## Stat-row layout (`src/components/ActionsRow.tsx`)
Stats render via the existing flow: tap a stat button → `handleStat` → stat-team picker → optional player (or skip — the natural choice for team events like throw-ins/corners). No flow change.

Soccer now has **5** stat buttons (Assist + 4); the current single flex row would be cramped. Change the stat-button container to **`flex flex-wrap gap-2`** and give each stat button **`flex-1 min-w-[30%]`**, so the buttons size to fit and wrap (5 → ~3 then 2; 3 for basketball → one row; 1 for Gaelic → full width). The action buttons row (Card/Sub/Undo/period) is unchanged.

## Where the new events surface (no extra work)
Because they're recorded `GameEvent`s, the new events automatically appear in:
- the **play-by-play** (`EventLog`) — `event_type` shown label-ised (e.g. "wide", "throw in"), and
- the **summary's per-player stats** (`GameSummary` groups events by `event_type`, e.g. "3 wides, 1 penalty").

Scores, the scoreboard, and G-PP are unaffected (all new events are 0 points). Basketball/rugby are untouched.

## Testing
- **`ScoreButton.test.tsx`** — add a case: a 0-point event renders its label and **no `+`**; a points-scoring event still shows `+N` (keep the existing case).
- **`configs`** (extend an existing test or add one): Gaelic `scoringEvents` has 4 entries including a 0-point `wide`; Gaelic `statEvents` includes `penalty`; Soccer `statEvents` includes `throw_in`, `corner`, `offside`, `penalty`.
- **`format.test.ts`** — a `formatGaelicScore` case proving a `wide` event (0 points) doesn't change the G-PP.
- The `ActionsRow`/`LiveGame` wiring is verified by `npm run build` + `npm run lint`.
- Full suite stays green.

## Out of scope
Reordering existing buttons; stat editing/removal beyond the existing Undo; per-stat icons in the live UI; new sports.

## Versioning
Bump `package.json` 1.1.17 → 1.1.18 (+ lockfile root) and add a `CHANGELOG.md` `[1.1.18]` entry.
