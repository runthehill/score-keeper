# Sideline Refresh — Phase 4: Game Setup — Design Spec

Restyle the **New Game / Setup screen** to the "Sideline" look and **wire in the `ColorKitPicker`** (built in Phase 2) so each team's kit colours are chosen at setup and saved with the game. Phase 4 of 7.

> **Authored while the owner is away** (autonomous, per their standing instruction). Faithful to the
> handoff (`docs/design-handoff/src/screens.jsx` `SetupScreen`). Judgement calls under **Decisions**.
> Lands as its own PR for review — not auto-merged.

## What this delivers
1. **Per-team kit colours at setup** — each team shows a `TeamKitChip` (with an edit badge); tapping it opens the `ColorKitPicker`. The chosen `{primary, secondary}` is passed to `insertGame` (which already accepts the four colour fields since Phase 2), so the game stores real kits instead of the DB defaults.
2. **Per-sport home kit defaults** — the home team pre-fills with its club kit (Rugby → Sligo RFC black/red, etc.); away defaults to Royal.
3. **A live Scoreboard preview** at the top, so you see the Blocks scoreboard in the chosen kits before starting.
4. **Sideline restyle** of the whole screen (header with a back button, team fields as cards, period selector, player section, Start button) onto the Phase-1 tokens.

## Preserve all existing behaviour
The current `GameSetup` has logic the prototype lacks — **keep all of it**, just restyled:
- Team **names** still come from settings (`appSettings.defaultHomeTeam`/`defaultAwayTeam`) / the sport placeholder; the **squad loader** (`loadSquad`, `defaultSquad`) buttons; the optional **player editor** (add/remove, home/away tabs, name+number); the **period format** selector (basketball halves/quarters); `startGame` still writes players via `insertPlayer` and navigates to `/game/:id`.
- Only **additions**: kit state + picker + preview, the four colour args on the `insertGame` call, and the restyle.

## Decisions (flag for review)
1. **Per-sport home kit colours** (from the handoff `DEFAULT_HOME`): rugby `#15171C`/`#E03131`, soccer `#1E8E4E`/`#FFFFFF`, gaelic `#16245A`/`#F4C430`, basketball `#F25F1F`/`#15171C`. Away = `#1E63D6`/`#FFFFFF` (Royal). These pair with the existing per-sport `defaultTeamName`s. Stored as colour-only (`{primary, secondary}`) keyed by sport in `kits.ts` (names stay settings-driven).
2. **Live preview** uses the Phase-3 `Scoreboard` with a synthetic preview `Game` (0–0). Reused, not reimplemented.
3. **Back button** added to the header (`ChevronLeft` → `navigate(-1)`), matching the handoff `SubHeader`. (The screen had no back affordance before; this is a small UX win and reversible.)
4. The kit state seeds from the defaults on mount; if the user has a saved default home team name in settings, the **name** still wins (colours are independent of name here — a club-colour map per name is out of scope; revisit in Settings/P7 if wanted).

## Data / module changes

### `src/sports/kits.ts`
Add per-sport home kit defaults:
```ts
import type { Sport } from '../types';  // add to imports
export const DEFAULT_HOME_KITS: Record<Sport, { primary: string; secondary: string }> = {
  rugby_union: { primary: '#15171C', secondary: '#E03131' },
  soccer: { primary: '#1E8E4E', secondary: '#FFFFFF' },
  gaelic_football: { primary: '#16245A', secondary: '#F4C430' },
  basketball: { primary: '#F25F1F', secondary: '#15171C' },
};
```
(`DEFAULT_AWAY_KIT` from Phase 2 stays the away default.)

### `src/screens/GameSetup.tsx`
- New state: `homeKit` (init `DEFAULT_HOME_KITS[sport.id]`), `awayKit` (init `DEFAULT_AWAY_KIT`), `picker: Team | null`.
- New imports: `Scoreboard`, `TeamKitChip`, `ColorKitPicker`, the `ChevronLeft`/`Whistle`/`Edit` icons, `DEFAULT_HOME_KITS`/`DEFAULT_AWAY_KIT`, and `Game` type (for the preview object).
- `startGame` adds `home_primary: homeKit.primary, home_secondary: homeKit.secondary, away_primary: awayKit.primary, away_secondary: awayKit.secondary` to the `insertGame` call.
- A `previewGame: Game` built from the current names + kits + zero scores, rendered via `<Scoreboard game={previewGame} events={[]} />` under a "Preview" eyebrow.
- A **team field** card per team: a kit-chip button (with a small `Edit` badge bottom-right) that sets `picker` to that team, beside the name input (and the existing squad-load button when a default squad exists). Restyle the label as a Sideline eyebrow.
- The `ColorKitPicker` mounts when `picker` is set, seeded with that team's kit, `onChange` updates the kit, `onClose` clears `picker`.
- Restyle everything to Sideline tokens (`bg-surface`/`bg-surface-2`/`border-line`/`text-txt`/`text-txt-2`/`text-txt-3`, `bg-txt text-bg` for the Start CTA, focus ring `focus:ring-txt-3` or a subtle ring, `press`), replacing `bg-surface-700`/`text-home`/`text-away`/`bg-home-dark`/`bg-away-dark`/`bg-accent`/`text-white`/`text-gray-*`.

## Testing
- Update `src/sports/kits.test.ts` to assert `DEFAULT_HOME_KITS` has an entry per sport, each a valid hex pair.
- `GameSetup` is integration-heavy (router + DB + settings); it has no existing unit test and we won't add a brittle one. Verify by `npm run build` + `npm run lint` (TypeScript proves the wiring) and a stale-token grep. The `insertGame` colour wiring is type-checked; the picker/preview are visual (reviewed by eye / in the PR).
- Keep the full suite green.

## Out of scope (later phases)
Home/History screens (P5); Summary + share-card rebuild (P6); Settings + theme/scoreboard-style/score-font tweaks (P7). The `SportTile`/`RecentCard`/`TabBar`/`AppHeader` from the handoff `screens.jsx` belong to Home (P5), not here.

## Versioning
Bump `package.json` 1.1.9 → 1.1.10 (+ lockfile root) and add a `CHANGELOG.md` `[1.1.10]` entry.
