# Default Squad Kit Colours — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set a default squad's kit colours (primary + secondary) in the Settings squad editor, and apply them when the squad is loaded in Game Setup.

**Architecture:** Add two optional colour fields to `DefaultSquad`; a `squadKit(squad, sport)` fallback helper (saved colours, else the sport's `DEFAULT_HOME_KITS`); wire the existing `ColorKitPicker` into the Settings editor; have `loadSquad` set the side's kit. No new components.

**Tech Stack:** Vite + React + TS, Tailwind v3, existing Phase-2/4 colour system.

**Spec:** `docs/superpowers/specs/2026-05-31-squad-kit-colours-design.md`.

All commits include: `-m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task 1: Data model + `squadKit` helper (TDD)

**Files:** Modify `src/types/index.ts`, `src/utils/settings.ts`, `src/sports/kits.ts`; Create `src/utils/settings.test.ts`; Modify `src/sports/kits.test.ts`.

- [ ] **Step 1: Extend `DefaultSquad`** — in `src/types/index.ts`, change the interface to:
```ts
export interface DefaultSquad {
  teamName: string;
  players: DefaultSquadPlayer[];
  primary?: string;
  secondary?: string;
}
```

- [ ] **Step 2: Point `AppSettings.squads` at the named type** — in `src/utils/settings.ts`:
  - Change the import line `import type { Sport, DefaultSquadPlayer } from '../types';` → `import type { Sport, DefaultSquad } from '../types';`
  - Change the field `squads: Partial<Record<Sport, { teamName: string; players: DefaultSquadPlayer[] }>>;` → `squads: Partial<Record<Sport, DefaultSquad>>;`
  (No migration code: `loadSettings` already spreads stored JSON; the new fields are optional.)

- [ ] **Step 3: Write the failing `squadKit` test** — in `src/sports/kits.test.ts`, add `squadKit` to the import from `./kits`, add `import type { DefaultSquad } from '../types';`, and append:
```ts
describe('squadKit', () => {
  it('returns the squad colours when both are set', () => {
    const squad: DefaultSquad = { teamName: 'X', players: [], primary: '#111111', secondary: '#222222' };
    expect(squadKit(squad, 'soccer')).toEqual({ primary: '#111111', secondary: '#222222' });
  });
  it('falls back to the sport default when colours are missing or the squad is undefined', () => {
    expect(squadKit({ teamName: 'X', players: [] }, 'rugby_union')).toEqual(DEFAULT_HOME_KITS.rugby_union);
    expect(squadKit(undefined, 'soccer')).toEqual(DEFAULT_HOME_KITS.soccer);
  });
});
```
(Ensure `DEFAULT_HOME_KITS` is in the import from `./kits`.)

- [ ] **Step 4: Run → FAIL** — `npx vitest run src/sports/kits.test.ts`.

- [ ] **Step 5: Implement `squadKit`** — in `src/sports/kits.ts`, add `DefaultSquad` to the type import (`import type { Sport, DefaultSquad } from '../types';`) and append:
```ts
// The kit to use for a saved squad: its own colours when set, else the sport's club default.
export function squadKit(squad: DefaultSquad | undefined, sportId: Sport): { primary: string; secondary: string } {
  if (squad?.primary && squad?.secondary) {
    return { primary: squad.primary, secondary: squad.secondary };
  }
  return DEFAULT_HOME_KITS[sportId];
}
```

- [ ] **Step 6: Add the settings round-trip test** — create `src/utils/settings.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, type AppSettings } from './settings';

beforeEach(() => localStorage.clear());

describe('settings squad colours', () => {
  it('round-trips a squad with kit colours through save/load', () => {
    const settings: AppSettings = {
      defaultHomeTeam: '',
      defaultAwayTeam: '',
      darkMode: true,
      squads: { soccer: { teamName: 'Strand', players: [], primary: '#1E8E4E', secondary: '#FFFFFF' } },
    };
    saveSettings(settings);
    expect(loadSettings().squads.soccer).toEqual({
      teamName: 'Strand', players: [], primary: '#1E8E4E', secondary: '#FFFFFF',
    });
  });
});
```
(If `AppSettings` is not exported as a type, add `export` to its declaration in `settings.ts`. It already is `export interface AppSettings`.)

- [ ] **Step 7: Run → PASS + verify** — `npx vitest run src/sports/kits.test.ts src/utils/settings.test.ts` → PASS; `npm run build` → SUCCESS; `npm run lint` → 0.

- [ ] **Step 8: Commit**
```bash
git add src/types/index.ts src/utils/settings.ts src/sports/kits.ts src/sports/kits.test.ts src/utils/settings.test.ts
git commit -m "feat: add optional kit colours to DefaultSquad + squadKit fallback helper"
```

---

### Task 2: Settings squad editor — kit picker

**Files:** Modify `src/screens/Settings.tsx`. Read it first.

- [ ] **Step 1: Imports** — add to the imports:
```ts
import { squadKit } from '../sports/kits';
import ColorKitPicker from '../components/ColorKitPicker';
import TeamKitChip from '../components/TeamKitChip';
import { Edit } from '../components/icons';
```

- [ ] **Step 2: State** — alongside the other squad-editor `useState`s (near `squadPlayers`), add:
```ts
  const [squadKitColors, setSquadKitColors] = useState({ primary: '#15171C', secondary: '#FFFFFF' });
  const [showKitPicker, setShowKitPicker] = useState(false);
```

- [ ] **Step 3: Seed on open** — in `openSquadEditor`, after `setSquadPlayers(...)`, add:
```ts
    setSquadKitColors(squadKit(squad, sportId));
```
(`squad` and `sportId` are already in scope there.)

- [ ] **Step 4: Persist on save** — in `saveSquad`, update the written object to include the colours:
```ts
        [editingSport]: { teamName: squadName.trim(), players: squadPlayers, primary: squadKitColors.primary, secondary: squadKitColors.secondary },
```

- [ ] **Step 5: Show the chip on each squad-list row** — in the `SPORTS.map((sport) => { ... })` block, compute the kit and render a chip. Replace the row's leading icon area so it reads (keep the existing `onClick`/classes):
  - After `const squad = settings.squads[sport.id];`, add: `const kit = squadKit(squad, sport.id);`
  - In the row's left cluster, add a chip next to the sport emoji:
```tsx
                  <span className="text-xl" aria-hidden="true">{sport.icon}</span>
                  <TeamKitChip primary={kit.primary} secondary={kit.secondary} size={18} radius={5} />
```
  (Place the `TeamKitChip` immediately after the existing sport-icon `<span>` inside the `flex items-center gap-3` div.)

- [ ] **Step 6: Add the kit row to the editor modal** — inside the `{editingSport && (...)}` modal, in the `space-y-3` form, add this as the FIRST field (before the "Team name" field):
```tsx
              <div>
                <label className="text-xs text-txt-3 mb-1 block">Kit colours</label>
                <button
                  type="button"
                  onClick={() => setShowKitPicker(true)}
                  aria-label="Choose squad kit"
                  className="relative inline-block press"
                >
                  <TeamKitChip primary={squadKitColors.primary} secondary={squadKitColors.secondary} size={42} radius={12} />
                  <span className="absolute -right-1 -bottom-1 w-[18px] h-[18px] rounded-full bg-txt text-bg grid place-items-center">
                    <Edit size={11} />
                  </span>
                </button>
              </div>
```

- [ ] **Step 7: Mount the picker** — at the end of the `{editingSport && (...)}` block (just before its closing `</div>` that wraps the modal — i.e. as the last child inside the modal panel, or as a sibling within the conditional), add:
```tsx
            {showKitPicker && (
              <ColorKitPicker
                team={squadName || getSportConfig(editingSport).name}
                value={squadKitColors}
                onChange={(kit) => setSquadKitColors(kit)}
                onClose={() => setShowKitPicker(false)}
              />
            )}
```
(`ColorKitPicker` is a `fixed inset-0 z-50` sheet, so it correctly overlays the editor when open. `getSportConfig` is already imported.)

- [ ] **Step 8: Verify** — `npx vitest run` (all green), `npm run build` (SUCCESS — confirms the wiring + that `saveSquad`'s object matches `DefaultSquad`), `npm run lint` (0). Manually confirm no legacy tokens were introduced (the new JSX uses `text-txt-3`/`bg-txt`/`text-bg`).

- [ ] **Step 9: Commit**
```bash
git add src/screens/Settings.tsx
git commit -m "feat: choose a default squad's kit colours in the Settings editor"
```

---

### Task 3: Apply squad colours on load in Game Setup

**Files:** Modify `src/screens/GameSetup.tsx`. Read it first.

- [ ] **Step 1: Import** — add `squadKit` to the existing kits import. The line `import { DEFAULT_HOME_KITS, DEFAULT_AWAY_KIT } from '../sports/kits';` becomes:
```ts
import { DEFAULT_HOME_KITS, DEFAULT_AWAY_KIT, squadKit } from '../sports/kits';
```

- [ ] **Step 2: Set the kit in `loadSquad`** — replace the `loadSquad` function body with (adds `setHomeKit`/`setAwayKit` from the squad's kit; everything else identical):
```tsx
  const loadSquad = (team: Team) => {
    if (!defaultSquad) return;
    const kit = squadKit(defaultSquad, sport.id);
    if (team === 'home') {
      setHomeTeam(defaultSquad.teamName);
      setHomePlayers(defaultSquad.players.map((p) => ({ ...p, status: 'active' as const })));
      setHomeKit(kit);
    } else {
      setAwayTeam(defaultSquad.teamName);
      setAwayPlayers(defaultSquad.players.map((p) => ({ ...p, status: 'active' as const })));
      setAwayKit(kit);
    }
    setShowPlayers(true);
  };
```
(`setHomeKit`/`setAwayKit` already exist from Phase 4; `defaultSquad` and `sport` are already in scope.)

- [ ] **Step 3: Verify** — `npx vitest run` (all green), `npm run build` (SUCCESS), `npm run lint` (0).

- [ ] **Step 4: Commit**
```bash
git add src/screens/GameSetup.tsx
git commit -m "feat: apply a squad's saved kit colours when loaded in Game Setup"
```

---

### Task 4: Version + changelog + final verification

**Files:** Modify `package.json`, `package-lock.json`, `CHANGELOG.md`.

- [ ] **Step 1: Bump version** — `package.json` `1.1.14` → `1.1.15`; `package-lock.json` root + `packages[""]` `1.1.14` → `1.1.15` (do NOT touch dependency versions).

- [ ] **Step 2: Changelog** — in `CHANGELOG.md`, replace:
```md
All notable changes to this project will be documented in this file.

## [1.1.14] - 2026-05-31
```
with:
```md
All notable changes to this project will be documented in this file.

## [1.1.15] - 2026-05-31

### Added
- Set a default squad's team kit colours in Settings (tap the colour chip in the squad editor). When you load that squad in Game Setup, its colours come with it — falling back to the sport's default kit for squads saved before this.

## [1.1.14] - 2026-05-31
```

- [ ] **Step 3: Full verification** — `npx vitest run` (all green; expect ~104 tests), `npm run build` (SUCCESS), `npm run lint` (0 errors).

- [ ] **Step 4: Commit**
```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.15 + changelog for squad kit colours"
```

---

## Plan self-review

**Spec coverage:**
- `DefaultSquad` colour fields + `AppSettings.squads` → named type → Task 1 ✅
- `squadKit` fallback helper + tests → Task 1 ✅
- Settings round-trip test → Task 1 ✅
- Settings editor: state, seed, save, list-row chip, kit row + `ColorKitPicker` → Task 2 ✅
- Game Setup `loadSquad` sets the kit (on load only) → Task 3 ✅
- Version 1.1.15 → Task 4 ✅
- Reuse `ColorKitPicker`/`TeamKitChip`/`DEFAULT_HOME_KITS`; no new components ✅

**Placeholder scan:** none — complete code/edits in every step.

**Type/name consistency:** `squadKit(squad: DefaultSquad | undefined, sportId: Sport): { primary, secondary }` matches its uses in Settings (seed + list chip) and GameSetup (load); `ColorKitPicker` `value`/`onChange` use `{ primary, secondary }` which matches `squadKitColors`; `saveSquad`'s written object matches the extended `DefaultSquad` (the build enforces this); `Edit`/`TeamKitChip`/`ColorKitPicker`/`getSportConfig` all imported. `setHomeKit`/`setAwayKit` exist from Phase 4.

**Ordering note:** Task 1 (types) lands first so Tasks 2–3 compile against the extended `DefaultSquad`. Each task's build is green on its own (no cross-task red, unlike the Phase-3 restyle).
