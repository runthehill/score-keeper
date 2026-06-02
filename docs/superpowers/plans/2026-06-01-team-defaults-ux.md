# Team Defaults Cleanup + Live-Game Back Button — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the outgrown global "Default team names", rename "Default squads" → "Default teams" (label-only), clarify the new-game quick-select pill ("Use {team}"), and add a back button to the live game.

**Architecture:** Pure UI/settings changes. `AppSettings` loses two string fields (no migration — old keys in stored JSON are ignored on load). All other changes are JSX label/markup edits in three screens. No data-model or DB changes.

**Tech Stack:** React + TypeScript, Tailwind, vitest. Settings persist to localStorage via `src/utils/settings.ts`.

---

## File Structure

- `src/utils/settings.ts` — drop `defaultHomeTeam`/`defaultAwayTeam` from `AppSettings` + `loadSettings` defaults.
- `src/utils/settings.test.ts` — drop those fields from the round-trip test literal.
- `src/screens/GameSetup.tsx` — init team names to `''`; relabel the quick-select pill to "Use {team}".
- `src/screens/Settings.tsx` — remove the "Default team names" section; rename "Default squads" → "Default teams" (heading, description, row subtitle, editor title, Save button).
- `src/screens/LiveGame.tsx` — add a `ChevronLeft` back button left of the sport pill.

---

### Task A: Team-defaults overhaul (remove globals + rename + relabel pill)

**Files:**
- Modify: `src/utils/settings.ts`
- Test: `src/utils/settings.test.ts`
- Modify: `src/screens/GameSetup.tsx`
- Modify: `src/screens/Settings.tsx`

- [ ] **Step 1: Update the settings round-trip test to the new shape**

In `src/utils/settings.test.ts`, remove the two `default*Team` lines from the `AppSettings` literal so it matches the trimmed type. The literal becomes:

```ts
    const settings: AppSettings = {
      darkMode: true,
      squads: { soccer: { teamName: 'Strand', players: [], primary: '#1E8E4E', secondary: '#FFFFFF' } },
    };
```

(The rest of the test — `saveSettings` then assert `loadSettings().squads.soccer` deep-equals the squad — is unchanged.)

- [ ] **Step 2: Run the test — expect a TYPE/compile error (red)**

Run: `npx vitest run src/utils/settings.test.ts`
Expected: fails to typecheck/run because `AppSettings` still declares `defaultHomeTeam`/`defaultAwayTeam` as required but the literal no longer provides them. (This is the failing state that drives the next step.)

- [ ] **Step 3: Remove the fields from `AppSettings` and `loadSettings`**

In `src/utils/settings.ts`, the interface + both default objects drop the two fields:

```ts
export interface AppSettings {
  darkMode: boolean;
  squads: Partial<Record<Sport, DefaultSquad>>;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Older stored settings may still carry defaultHomeTeam/defaultAwayTeam — harmless; ignored.
      return { darkMode: true, squads: {}, ...parsed };
    }
  } catch {
    // Ignore malformed JSON or unavailable localStorage; fall back to defaults below.
  }
  return { darkMode: true, squads: {} };
}
```

(`saveSettings` is unchanged.)

- [ ] **Step 4: Run the test — expect PASS (green)**

Run: `npx vitest run src/utils/settings.test.ts`
Expected: PASS.

- [ ] **Step 5: Initialise GameSetup team names to empty**

In `src/screens/GameSetup.tsx`, lines 29-30, drop the removed settings reference (keep `appSettings`/`defaultSquad` for the squad lookup):

```tsx
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
```

- [ ] **Step 6: Relabel the new-game quick-select pill to "Use {team}"**

In `src/screens/GameSetup.tsx`, inside `teamField`, change the pill's text (currently `{defaultSquad.teamName}`) to read as an action. The button becomes:

```tsx
            {defaultSquad && (
              <button
                type="button"
                onClick={() => loadSquad(which)}
                className="shrink-0 bg-surface-2 border border-line rounded-lg px-2.5 py-1 text-[11px] font-semibold text-txt-2 press"
              >
                Use {defaultSquad.teamName}
              </button>
            )}
```

(No change to `loadSquad` — the pill stays on both Home and Away and loads onto either side.)

- [ ] **Step 7: Remove the "Default team names" section from Settings**

In `src/screens/Settings.tsx`, delete the entire block (the `{/* Default team names */}` comment plus the `<section>…</section>` containing the two inputs bound to `settings.defaultHomeTeam`/`settings.defaultAwayTeam`). Nothing else references those inputs; the `INPUT` constant is still used by the squad editor, so leave it.

- [ ] **Step 8: Rename "Default squads" → "Default teams" (labels only)**

In `src/screens/Settings.tsx`, make these label edits (internal `squads`/`DefaultSquad`/`squadKit`/`openSquadEditor`/`saveSquad` names are intentionally unchanged — UI-label-only rename, no stored-data migration):

- Section heading: `Default squads` → `Default teams`.
- Description `<p>`: replace with `Save a team per sport — name, colours, and optional players. Load it in one tap when starting a game.`
- Row subtitle (currently `squad ? \`${squad.teamName} — ${squad.players.length} players\` : 'No squad set'`) → so a name-only team reads sensibly:

```tsx
                    <p className="text-xs text-txt-3">{squad ? `${squad.teamName} — ${squad.players.length > 0 ? `${squad.players.length} players` : 'Name & colours'}` : 'No team set'}</p>
```

- Editor modal title (currently `{getSportConfig(editingSport).name} squad`) → `{getSportConfig(editingSport).name} team`.
- Save button label `Save squad` → `Save team`.

Add a one-line comment above the section noting the UI says "team" while the data key stays `squads`:

```tsx
      {/* Default teams (stored internally as `squads` — label-only rename, no migration) */}
```

- [ ] **Step 9: Build, lint, and check for dangling references**

Run: `npm run build && npm run lint`
Expected: both succeed.
Run: `grep -rn "defaultHomeTeam\|defaultAwayTeam\|Default squads\|No squad set\|Save squad" src`
Expected: no output (all removed/renamed).

- [ ] **Step 10: Commit**

```bash
git add src/utils/settings.ts src/utils/settings.test.ts src/screens/GameSetup.tsx src/screens/Settings.tsx
git commit -m "feat: remove global default team names, rename Default squads -> Default teams, relabel new-game pill"
```

---

### Task B: Live-game back button

**Files:**
- Modify: `src/screens/LiveGame.tsx`

- [ ] **Step 1: Import the chevron icon**

In `src/screens/LiveGame.tsx`, add the icon import (after the `TeamKitChip` import, line ~17):

```tsx
import { ChevronLeft } from '../components/icons';
```

- [ ] **Step 2: Add the back button left of the sport pill**

Replace the header block (the `{/* Sport badge + period */}` div, currently lines ~211-219) so the back button + sport pill sit together on the left and the period text stays on the right:

```tsx
      {/* Sport badge + period */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Back to home"
            className="w-8 h-8 shrink-0 grid place-items-center rounded-full bg-surface-2 border border-line text-txt press"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="bg-surface-2 border border-line text-txt-2 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-[0.06em]">
            {sport.name}
          </span>
        </div>
        <span className="text-xs text-txt-3">
          {extraPeriodLabel ? extraPeriodLabel : `${periodName} ${currentPeriod} of ${periodCount}`}
        </span>
      </div>
```

(`navigate` is already in scope via `useNavigate`. The game stays `in_progress` and resumes from Home's "In progress" list.)

- [ ] **Step 3: Build and lint**

Run: `npm run build && npm run lint`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/screens/LiveGame.tsx
git commit -m "feat: add back-to-home button to the live game header"
```

---

## After both tasks

- [ ] Full suite green: `npx vitest run`
- [ ] Version bump `package.json` 1.1.19 → 1.1.20 (+ `package-lock.json` root `version`), add `CHANGELOG.md` `[1.1.20]` entry.
- [ ] Final holistic review of the whole diff, then open the PR for the user's review.

## Self-Review

- **Spec coverage:** Part 1 (back button) → Task B. Part 2 (remove globals) → Task A steps 1-7. Part 3 (rename + name-only teams) → Task A step 8 (the pill already shows for name-only; row subtitle now reads "Name & colours"). Part 4 (relabel pill, allow both) → Task A step 6. Versioning → After-both-tasks. All covered.
- **Placeholders:** none — every code step shows the exact before/after.
- **Type consistency:** `AppSettings` (trimmed) is referenced consistently in settings.ts + settings.test.ts; `loadSquad`/`defaultSquad`/`squadKit` signatures unchanged; `ChevronLeft`/`navigate` confirmed in scope.
