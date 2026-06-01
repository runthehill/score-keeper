# Team Defaults Cleanup + Live-Game Back Button — Design Spec

Four UX improvements: a back button in the live game, removing the now-redundant global default team names, renaming "Default squads" → "Default teams", and clarifying the new-game quick-select pill.

## Confirmed decisions
- **Remove** the global "Default team names"; per-sport "Default teams" become the one concept.
- The quick-select pill stays on **both** home and away (loadable on either); **relabel** for clarity rather than restricting it.

## 1. Back button in a live game (`src/screens/LiveGame.tsx`)
The Live screen has no nav back (the tab bar is hidden on `/game/:id`, and a PWA has no browser chrome). Add a small round **`ChevronLeft`** button immediately left of the sport pill in the header; tapping it `navigate('/')` (Home). The game is unaffected — it stays `in_progress` and appears under Home's "In progress" to resume.

- Wrap the back button + sport pill in a left flex group inside the existing `flex items-center justify-between` header; the period text stays on the right.
- Button style mirrors the other back buttons (`w-8 h-8 grid place-items-center rounded-full bg-surface-2 border border-line text-txt press`, `aria-label="Back to home"`). Import `ChevronLeft` from `../components/icons`.

## 2. Remove the global "Default team names"
They predate per-sport teams + kits and are redundant.
- **`src/utils/settings.ts`**: drop `defaultHomeTeam` / `defaultAwayTeam` from `AppSettings` and from both default objects in `loadSettings` (keep `darkMode` and `squads`). Stored JSON may still contain the old keys — harmless (ignored); no migration.
- **`src/screens/GameSetup.tsx`**: `homeTeam`/`awayTeam` initialise to `''` (not `appSettings.defaultHomeTeam`). The inputs keep their placeholders (`sport.defaultTeamName` for home, `"Opponent"` for away).
- **`src/screens/Settings.tsx`**: remove the entire "Default team names" `<section>` (heading + the two inputs).
- **`src/utils/settings.test.ts`**: remove `defaultHomeTeam`/`defaultAwayTeam` from the `AppSettings` literal in the round-trip test.

## 3. "Default squads" → "Default teams" (`src/screens/Settings.tsx`)
A saved team is **name + kit colours + optional players** — players are optional, so "team" fits better than "squad".
- Rename the section heading "Default squads" → **"Default teams"**; reword the description to "Save a team per sport — name, colours, and optional players. Load it in one tap when starting a game."
- Row empty state "No squad set" → **"No team set"**; the populated row keeps the kit chip + name; show **"{n} players"** when there are players, else **"Name & colours"** (so a name-only team reads sensibly).
- Editor modal: title "{sport} squad" → **"{sport} team"**; the "Save squad" button → **"Save team"**. ("Team name" / "Kit colours" / "Players" field labels stay.)
- **Internal naming unchanged**: the settings key stays `settings.squads`, and `DefaultSquad` / `squadKit` / `openSquadEditor` / `saveSquad` etc. keep their names — this is a label-only rename, so no stored-data migration. (A short comment notes the UI says "team".)
- The quick-select pill already renders whenever a saved team exists (it gates on `defaultSquad`, not on players), so **name-only teams already get a pill** — point 3 is satisfied by the rename + the relabel below; no logic change to that condition.

## 4. Relabel the quick-select pill (`src/screens/GameSetup.tsx`)
The pill currently shows the bare team name (e.g. "Sligo RFC") on both the home and away rows, which reads ambiguously (and you can load it onto both). Change the pill label to **"Use {teamName}"** so it clearly reads as an action that fills *that* side. It stays on both rows and remains loadable onto either (per the confirmed decision); `loadSquad(which)` is unchanged.

## Testing
- Label/wiring changes — verified by `npm run build` + `npm run lint` and the existing suite staying green.
- `settings.test.ts` updated for the removed fields (still round-trips a squad with colours).
- A stale-token / dangling-reference check: `grep defaultHomeTeam|defaultAwayTeam src` returns nothing after the change.

## Out of scope
Renaming the internal `squads` data key (would force a localStorage migration for no user benefit); auto-loading a default team on open (the load-on-tap behaviour is unchanged); changing the editor's player/colour functionality.

## Versioning
Bump `package.json` 1.1.19 → 1.1.20 (+ lockfile root) and add a `CHANGELOG.md` `[1.1.20]` entry.
