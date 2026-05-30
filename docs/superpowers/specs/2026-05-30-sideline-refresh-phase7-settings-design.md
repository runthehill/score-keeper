# Sideline Refresh — Phase 7: Settings — Design Spec

Restyle the **Settings** screen to the "Sideline" look and finally surface a **Dark / Light theme toggle** wired to the Phase-1 theme system. Phase 7 of 7 — the finale.

> **Authored while the owner is away** (autonomous). Faithful to the handoff (`screens2.jsx` `SettingsScreen` — sectioned grouped cards + a pill toggle). Lands as its own PR for review — not auto-merged.

## What this delivers
1. **Appearance section with a Dark mode toggle** — the headline new functionality. Phases 1–6 made the app system-aware (it follows the OS scheme) but gave the user no manual control. This wires a pill toggle to `useThemeContext()`'s `{ dark, toggle }`, so tapping it sets a persisted override (the Phase-1 `useTheme` already handles persistence + the system-follow-until-override logic).
2. **Sideline restyle** of the whole screen onto the Phase-1 tokens, with an `AppHeader` ("Preferences") and grouped section cards.

## Preserve all existing behaviour
Keep every current feature, restyled — nothing removed:
- **Default squads** per sport (the list + the squad-editor modal: team name, add/remove players, save, clear).
- **Default team names** (home/away inputs → `settings.defaultHomeTeam`/`defaultAwayTeam`).
- **Data:** Export all data (JSON) + Clear all data (→ confirm modal → `clearDB` + reload).
- **Share this app** (Web Share / clipboard fallback).
- **Install** (the install-prompt / iOS sheet via `useInstallPrompt`).
- **Footer:** version (`__APP_VERSION__`) + GitHub link.
- The `loadSettings`/`saveSettings` persistence (the `useEffect` autosave) is unchanged.

## Component notes
- **`useThemeContext`** already exists (`src/hooks/useTheme.ts`) and is provided app-wide by `ThemeProvider` (Phase 1). Add `const { dark, toggle } = useThemeContext();` to Settings.
- **Toggle (pill switch):** a small inline helper in `Settings.tsx` (used once, for dark mode) — `on ? bg-txt : bg-line-2` track with a sliding `var(--surface)` knob, `aria-pressed`, `type="button"`, `aria-label="Dark mode"`. (No need for a shared component yet — YAGNI.)
- **Grouped section pattern:** an eyebrow (`text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3`) + a `bg-surface border border-line rounded-2xl` card; rows separated by `border-line`. Squad list items, the data/share/install buttons, and inputs use Sideline tokens (`bg-surface`/`bg-surface-2`/`border-line`/`text-txt`/`-2`/`-3`/`bg-txt text-bg` for primary actions, `text-danger`/`border-danger`-ish for destructive). Replace `bg-surface-700/800/600`, `text-white`, `text-gray-*`, `bg-accent`/`text-accent`, `focus:ring-accent`, `red-*`.
- **Destructive styling:** "Clear all data" and "Delete everything" use `text-danger` (and a danger-tinted border/fill for the final confirm) instead of `red-600`/`red-400`/`red-900`.
- The squad-editor and clear-confirm **modals** restyle to `bg-surface border-line rounded-t-2xl`/`rounded-2xl`, primary actions `bg-txt text-bg`, cancel `text-txt-3` — matching the other phases' sheets.

## Decisions (flag for review)
1. **Simple on/off dark toggle** (matching the handoff), not a 3-way System/Dark/Light control. The underlying `useTheme` stays system-aware until the user flips this, then the choice persists — so "follow system" is still the default on a fresh install; the toggle is the manual override. (A 3-state control is out of scope; revisit if you want an explicit "follow system" reset.)
2. **No scoreboard-style / score-font tweaks** (the prototype's Tweaks panel had them). The app ships only the Blocks scoreboard + Saira numerals (Phases 3/1), so there's nothing to toggle yet. Out of scope unless those variants are added later.

## Testing
- Settings is integration-heavy (DB, settings persistence, install prompt) and has no existing unit test; verify by `npm run build` + `npm run lint` + a stale-token grep. The theme toggle is exercised by the existing `useTheme` tests (the hook is already covered).
- Keep the full suite green.

## Versioning
Bump `package.json` 1.1.12 → 1.1.13 (+ lockfile root) and add a `CHANGELOG.md` `[1.1.13]` entry. This completes the Sideline refresh.
