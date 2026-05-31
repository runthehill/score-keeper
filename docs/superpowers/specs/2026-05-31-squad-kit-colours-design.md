# Default Squad Kit Colours — Design Spec

Let users set a default squad's **team kit colours** (primary + secondary) when creating/editing a squad in Settings, and apply those colours when the squad is loaded in Game Setup. A small post-refresh feature.

## Goal
A saved squad is a team; a team has colours. Today a squad stores `{ teamName, players }`; this adds its kit, so loading a squad brings its colours (not just its name + players).

## Behaviour (confirmed)
Squad colours apply **when you tap the squad's load button** in Game Setup — the same moment the name + players load today (not auto-applied per-sport). The per-game kit can still be tweaked afterward via the existing picker.

## Data model
- **`DefaultSquad`** (`src/types/index.ts`) gains two optional fields: `primary?: string; secondary?: string`. Optional keeps **back-compat** with squads already saved in `localStorage` (they simply have no colours yet).
- **`AppSettings.squads`** (`src/utils/settings.ts`) currently inlines `{ teamName; players }` — change it to `Partial<Record<Sport, DefaultSquad>>` (import the named type). No migration code needed: `loadSettings` already spreads stored JSON over defaults, and the new fields are optional.
- **Fallback helper** — add `squadKit(squad: DefaultSquad | undefined, sportId: Sport): { primary: string; secondary: string }` to `src/sports/kits.ts`: returns the squad's `{ primary, secondary }` when both are set, else `DEFAULT_HOME_KITS[sportId]`. One place for the "use saved colours, else the sport's club default" rule; unit-testable.

## Settings — squad editor (`src/screens/Settings.tsx`)
- New state in the editor: `squadKit` (`{ primary, secondary }`) + a `showKitPicker` boolean.
- On `openSquadEditor(sportId)`, seed `squadKit` from `squadKit(settings.squads[sportId], sportId)` (saved colours, or the sport default for a new/colourless squad).
- Add a **kit row** to the modal (above or beside Team name): a `TeamKitChip` button with the little edit badge that opens the **`ColorKitPicker`** (`team={squadName || sport name}`, `value={squadKit}`, `onChange` updates `squadKit`, `onClose` clears `showKitPicker`).
- `saveSquad` writes `primary: squadKit.primary, secondary: squadKit.secondary` alongside `teamName`/`players`.
- The **squad-list rows** show a `TeamKitChip` of the squad's colours (via `squadKit(squad, sport.id)`) next to the sport, so colours are visible at a glance.

## Game Setup (`src/screens/GameSetup.tsx`)
- `loadSquad(team)` already sets that side's name + players + `showPlayers`. Add: set that side's kit — `const kit = squadKit(defaultSquad, sport.id); team === 'home' ? setHomeKit(kit) : setAwayKit(kit)`. (`defaultSquad` is already in scope; `squadKit` handles the fallback.) Per the confirmed behaviour, this only runs on the load button.

## Reuse / no new components
`ColorKitPicker`, `TeamKitChip`, `DEFAULT_HOME_KITS` all exist. The only new code is the optional type fields, the `squadKit` helper, and wiring in two screens.

## Testing
- **`src/sports/kits.test.ts`** — add `squadKit` cases: a squad with both colours → returns them; a squad missing colours (or `undefined`) → returns `DEFAULT_HOME_KITS[sport]`.
- **Settings round-trip** — a settings test (or extend an existing one) that a `DefaultSquad` with `primary`/`secondary` survives `saveSettings` → `loadSettings`. (If no settings test exists, a small one; otherwise rely on the type + `squadKit` test, since `saveSettings` is a thin `JSON.stringify`.)
- Settings editor + Game Setup wiring: verified by `npm run build` + `npm run lint` (presentational/integration) + a stale-token check on the touched lines.
- Full suite stays green.

## Out of scope
Auto-applying a squad's kit without loading it (the rejected option); per-game colour persistence back to the squad; colours on the ad-hoc (non-squad) default team-name inputs.

## Versioning
Bump `package.json` 1.1.14 → 1.1.15 (+ lockfile root) and add a `CHANGELOG.md` `[1.1.15]` entry.
