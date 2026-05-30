# Sideline Refresh — Phase 1: Foundation — Design Spec

The first of **seven** sub-projects implementing the "Sideline" visual refresh (design handoff
in `docs/design-handoff/`). Phase 1 lays the infrastructure everything else needs:
**system-aware dark/light theming** (CSS-variable tokens), the **fonts** (Hanken Grotesk + Saira
Condensed, self-hosted for offline), **motion utilities**, and the **line-icon set**. It
deliberately does **not** restyle any screen — that happens in Phases 2–7.

## Phased decomposition (context)
1. **Foundation** ← *this spec* · 2. Team-colour system · 3. Live game · 4. Game Setup ·
5. Home + History · 6. Summary + Share card · 7. Settings. Each phase is its own
spec → plan → PR.

## Migration strategy (avoid broken intermediate states)
Phase 1 **adds** the new token system **alongside** the existing `surface-{900..}` / `home` /
`away` / `accent` palette. Existing screens keep working on the old tokens until their own phase
restyles them; the app shell (body) adopts the new tokens. Dead legacy tokens are removed in the
final phase. The one name collision (`--surface` vs the existing `surface-900` shades) is resolved
with Tailwind's `DEFAULT` + numbered-shades object, so both coexist.

## Vendor the design handoff
Copy the reference bundle into the repo so every phase (and its subagents) can read it:
`docs/design-handoff/` ← `README.md`, `src/*.jsx` (prototype references), `screenshots/*.png`.
Skip the prototype scaffolding (`frames/`, `tweaks-panel.jsx`, the standalone HTML). Add a short
`docs/design-handoff/README-note.md` clarifying these are references, not product code.

## 1. Theme tokens (CSS variables)

In `src/index.css`, define both themes (exact values from the handoff):

```css
:root, .theme-dark {
  --bg:#0C0E12; --surface:#161A21; --surface-2:#1E232C;
  --line:rgba(255,255,255,.08); --line-2:rgba(255,255,255,.17);
  --txt:#F3F5F8; --txt-2:#A7B0BE; --txt-3:#6C7585; --danger:#FF6B6B;
  --shadow-card:0 12px 30px rgba(0,0,0,.40);
  --ease:cubic-bezier(0.16,1,0.3,1);
}
.theme-light {
  --bg:#EDEFF3; --surface:#FFFFFF; --surface-2:#F4F6F9;
  --line:rgba(15,23,42,.09); --line-2:rgba(15,23,42,.18);
  --txt:#10131A; --txt-2:#515B6B; --txt-3:#8A93A2; --danger:#DC2626;
  --shadow-card:0 10px 26px rgba(15,23,42,.08);
}
body { background:var(--bg); color:var(--txt); }
```

The theme is selected by a `.theme-dark` / `.theme-light` class on `<html>` (default mirrors the
existing dark via `:root`).

## 2. Tailwind tokens (additive)

In `tailwind.config.js`, **add** new colour keys that point at the vars; the `surface` collision
is handled with `DEFAULT` + legacy shades:

```js
colors: {
  bg: 'var(--bg)',
  surface: {
    DEFAULT: 'var(--surface)', 2: 'var(--surface-2)',
    // legacy (kept until each screen migrates):
    900: '#0f0f23', 800: '#1a1a2e', 700: '#16213e', 600: '#2a2a3e',
  },
  line: { DEFAULT: 'var(--line)', 2: 'var(--line-2)' },
  txt: { DEFAULT: 'var(--txt)', 2: 'var(--txt-2)', 3: 'var(--txt-3)' },
  danger: 'var(--danger)',
  // legacy, unchanged:
  home: { DEFAULT: '#60a5fa', dark: '#1e3a5f' },
  away: { DEFAULT: '#fbbf24', dark: '#2e2a14' },
  accent: '#2563eb',
},
fontFamily: {
  sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
  score: ['"Saira Condensed"', 'system-ui', 'sans-serif'],
},
boxShadow: { card: 'var(--shadow-card)' },
```

Result: new components use `bg-surface`, `bg-surface-2`, `text-txt`, `text-txt-2`, `text-txt-3`,
`border-line`, `border-line-2`, `text-danger`, `shadow-card`; legacy `bg-surface-800` etc. still
resolve. `bg-bg` is available but the app background is set on `body` in CSS.

## 3. `useTheme` hook

`src/hooks/useTheme.ts` — owns theme state and applies it.

```ts
export type ThemePref = 'dark' | 'light';
export function useTheme(): { dark: boolean; toggle: () => void };
```
Behaviour:
- **Init:** if `localStorage['sk-theme']` is `'dark'`/`'light'`, use it (manual override). Else
  follow the system: `matchMedia('(prefers-color-scheme: dark)').matches` (default `true` if
  `matchMedia` is absent).
- **System listener:** subscribe to the media query's `change`; update `dark` **only while there
  is no stored manual override**.
- **`toggle()`:** flips `dark`, writes `'dark'`/`'light'` to `localStorage['sk-theme']` (manual
  override), and stops following the system.
- **Apply (effect):** set `<html>` class to `theme-dark`/`theme-light`, and update
  `<meta name="theme-color">` to the resolved `--bg`.

A pure helper makes the decision testable:
```ts
export function resolveInitialTheme(stored: string | null, systemDark: boolean): boolean
  // stored==='dark'→true; stored==='light'→false; else systemDark
```

**Single source of truth:** `useTheme` has side effects (applies the `<html>` class, subscribes
to the media query), so it must run exactly once. Wrap the app in a `ThemeProvider` that calls
`useTheme()` once and exposes `{ dark, toggle }` via context; consumers (App shell, and the
Settings toggle in Phase 7) read it with a `useThemeContext()` hook — they do **not** call
`useTheme()` themselves. `main.tsx` renders `<ThemeProvider><App/></ThemeProvider>`.

## 4. Fonts — self-hosted (offline-first)

Add dev deps `@fontsource/hanken-grotesk` and `@fontsource/saira-condensed`. Import the needed
weights in `src/main.tsx`:
```ts
import '@fontsource/hanken-grotesk/400.css'; // +500,600,700,800
import '@fontsource/saira-condensed/600.css'; // +700
```
Vite bundles + fingerprints the woff2; `vite-plugin-pwa`'s `globPatterns` already precache
`**/*.{js,css,html,wasm}` — **add `woff2`** so fonts work offline. Headings: weight 800,
`letter-spacing:-0.02em`. Score/timer: `font-score` + `tabular-nums`.

## 5. Motion utilities

In `src/index.css`:
```css
@keyframes scorePop { 0%{transform:scale(1)} 40%{transform:scale(1.18)} 100%{transform:scale(1)} }
@keyframes livePing { 0%{transform:scale(1);opacity:.7} 80%,100%{transform:scale(2.4);opacity:0} }
.score-pop { animation: scorePop .48s var(--ease); }
.live-ping::after { /* 1.7s ping ring */ }
@media (prefers-reduced-motion: reduce) {
  .score-pop, .live-ping::after, * { animation: none !important; transition: none !important; }
}
```
`:active` press scales (buttons `scale(.965)`, scoring buttons `scale(.92)`) via a utility class
or Tailwind `active:scale-95`. Durations 120/200ms with `--ease`.

## 6. Line icons

Port the handoff's inline SVGs (`docs/design-handoff/src/icons.jsx`) into a typed set at
`src/components/icons/` — one component per icon, 2px stroke, round caps, `currentColor`,
default `size={24}`:
`Undo, Plus, Minus, Play, Pause, Card, Sub, Flag, Share, Whistle, Clock, ChevronLeft,
ChevronRight, Close, Check, Edit, History, Settings, Star`, plus a `SportGlyph` for the Gaelic
`gaa` ball. Exported from `src/components/icons/index.ts`. (No Heroicons dependency.)

## What Phase 1 changes vs leaves alone
- **Changes:** `tailwind.config.js`, `src/index.css`, `src/main.tsx` (font + theme wiring),
  `vite.config.ts` (PWA `globPatterns` + manifest `theme_color`/`background_color` → `#0C0E12`),
  adds `useTheme` + icon set, vendors the handoff. The app now follows OS dark/light and renders
  in Hanken Grotesk.
- **Leaves alone:** every screen/component keeps its current look (still on legacy tokens) — they
  restyle in their own phases.

## Testing (TDD)
- **`src/hooks/useTheme.test.ts`** — `resolveInitialTheme` (stored dark/light wins; else system);
  and the hook: applies `theme-dark`/`theme-light` to `<html>`; `toggle()` flips + persists to
  `localStorage`; a system `change` is ignored once a manual override is stored. (`matchMedia` +
  `localStorage` mocked.)
- Fonts / CSS / icons → verified by `npm run build` + eyeball (dark and light).

## Versioning
Bump `package.json` 1.1.6 → 1.1.7 (+ lockfile root) and add a `CHANGELOG.md` `[1.1.7]` entry.

## Out of scope (later phases)
Team colours + kit picker (P2), the Blocks scoreboard / live / setup / home / history / summary /
settings restyles (P3–7), the new share card (P6), removing the legacy tokens (final phase).
