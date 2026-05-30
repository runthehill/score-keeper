# Sideline Refresh — Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the Sideline-refresh foundation — system-aware dark/light CSS-variable theming, self-hosted Hanken Grotesk + Saira Condensed fonts, motion utilities, and a line-icon set — additively, so existing screens keep working.

**Architecture:** New design tokens live as CSS variables that switch on a `.theme-dark`/`.theme-light` class; Tailwind colours point at the vars (legacy `surface-900` shades kept via `DEFAULT`+shades). A `useTheme` hook owns system-aware + manual-override state, exposed once via `ThemeProvider`. Fonts are self-hosted (offline). No screen is restyled.

**Tech Stack:** Vite + React + TS, Tailwind v3, CSS custom properties, `@fontsource`, `vite-plugin-pwa`, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-05-30-sideline-refresh-phase1-foundation-design.md`. Phase 1 of 7.

---

## File structure

| File | Responsibility | Change |
|------|----------------|--------|
| `docs/design-handoff/**` | Vendored design reference for all phases | Create |
| `src/index.css` | Theme token vars (both themes) + body + motion keyframes | Modify |
| `tailwind.config.js` | Additive token colours + fonts + card shadow | Modify |
| `src/hooks/useTheme.ts` (+ test) | System-aware theme state + class application | Create |
| `src/hooks/ThemeProvider.tsx` | Single-source context (`{dark,toggle}`) | Create |
| `src/main.tsx` | Wrap App in `ThemeProvider`; import fonts | Modify |
| `vite.config.ts` | PWA `globPatterns` += `woff2`; manifest colours | Modify |
| `index.html` | Default `theme-dark` class (no-FOUC) | Modify |
| `src/components/icons/**` | Typed line-icon set | Create |
| `package.json` / `CHANGELOG.md` | `@fontsource` deps + version 1.1.7 | Modify |

**Note on theming activation:** `useTheme` is built and unit-tested as fully system-aware (this phase). Because existing screens are still dark-only, light mode will look half-themed until Phases 3–7 — that is the expected incremental state. The default (`index.html` `theme-dark`) keeps first paint dark.

All commit commands include the project's co-author trailer.

---

### Task 0: Vendor the design handoff

**Files:** Create `docs/design-handoff/`

- [ ] **Step 1: Copy the reference bundle into the repo**

```bash
mkdir -p docs/design-handoff
SRC="/tmp/sk-design/design_handoff_score_keeper"
[ -d "$SRC" ] || { mkdir -p /tmp/sk-design && unzip -q "/Users/jonathanhill/Downloads/Score Keeper.zip" -d /tmp/sk-design; }
cp "$SRC/README.md" docs/design-handoff/
cp -r "$SRC/src" docs/design-handoff/src
cp -r "$SRC/screenshots" docs/design-handoff/screenshots
```

- [ ] **Step 2: Add a note file**

Create `docs/design-handoff/README-note.md`:
```markdown
# Design handoff (reference only)

These files are the "Sideline" refresh design reference (README spec, prototype `.jsx`,
and screenshots) for the 7-phase refresh. They are **references, not product code** — the
prototype uses Babel-in-browser + `window.*` globals. Recreate the designs in the real
codebase (Vite + React + TS + Tailwind + sql.js) per the per-phase specs in
`docs/superpowers/specs/`.
```

- [ ] **Step 3: Verify + commit**

Run: `ls docs/design-handoff && ls docs/design-handoff/screenshots`
Expected: `README.md README-note.md screenshots src` and the 6 PNGs.

```bash
git add docs/design-handoff
git commit -m "docs: vendor the Sideline design handoff as reference" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 1: Theme tokens (CSS variables) + Tailwind colours

**Files:** Modify `src/index.css`, `tailwind.config.js`, `index.html`

- [ ] **Step 1: Add the token blocks + themed body to `src/index.css`**

The file currently starts with the three `@tailwind` directives and a `@layer base` with
`body { @apply bg-surface-900 text-white antialiased; }`. Replace that `body` rule and add the
token blocks. After the `@tailwind utilities;` line, insert:

```css
:root,
.theme-dark {
  --bg: #0C0E12;
  --surface: #161A21;
  --surface-2: #1E232C;
  --line: rgba(255, 255, 255, 0.08);
  --line-2: rgba(255, 255, 255, 0.17);
  --txt: #F3F5F8;
  --txt-2: #A7B0BE;
  --txt-3: #6C7585;
  --danger: #FF6B6B;
  --shadow-card: 0 12px 30px rgba(0, 0, 0, 0.40);
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
}

.theme-light {
  --bg: #EDEFF3;
  --surface: #FFFFFF;
  --surface-2: #F4F6F9;
  --line: rgba(15, 23, 42, 0.09);
  --line-2: rgba(15, 23, 42, 0.18);
  --txt: #10131A;
  --txt-2: #515B6B;
  --txt-3: #8A93A2;
  --danger: #DC2626;
  --shadow-card: 0 10px 26px rgba(15, 23, 42, 0.08);
}
```

And change the existing `body` rule inside `@layer base` from:
```css
  body {
    @apply bg-surface-900 text-white antialiased;
  }
```
to:
```css
  body {
    @apply font-sans antialiased;
    background: var(--bg);
    color: var(--txt);
  }
```

- [ ] **Step 2: Add the Tailwind tokens**

Replace the `colors` and `fontFamily` blocks in `tailwind.config.js` `theme.extend` with:

```js
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
          // legacy (kept until each screen migrates in later phases):
          900: '#0f0f23',
          800: '#1a1a2e',
          700: '#16213e',
          600: '#2a2a3e',
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

- [ ] **Step 3: Default theme class (no-FOUC)**

In `index.html`, change the opening `<html ...>` tag to include the default dark theme class.
If it reads `<html lang="en">`, make it `<html lang="en" class="theme-dark">` (keep any existing
attributes; just add `class="theme-dark"`).

- [ ] **Step 4: Verify nothing breaks**

Run: `npm run build`
Expected: SUCCESS — `surface-800`/etc. still resolve (legacy shades retained), no Tailwind errors.

Run: `npx vitest run`
Expected: PASS — existing suites unaffected.

- [ ] **Step 5: Commit**

```bash
git add src/index.css tailwind.config.js index.html
git commit -m "feat: add Sideline theme tokens (CSS vars + Tailwind) additively" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `useTheme` hook

**Files:** Create `src/hooks/useTheme.ts`, `src/hooks/useTheme.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useTheme.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { resolveInitialTheme, useTheme } from './useTheme';

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mql = {
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    dispatch: (m: boolean) => listeners.forEach((cb) => cb({ matches: m } as MediaQueryListEvent)),
  };
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  return mql;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
});
afterEach(() => vi.restoreAllMocks());

describe('resolveInitialTheme', () => {
  it('uses a stored override over the system', () => {
    expect(resolveInitialTheme('dark', false)).toBe(true);
    expect(resolveInitialTheme('light', true)).toBe(false);
  });
  it('falls back to the system when nothing stored', () => {
    expect(resolveInitialTheme(null, true)).toBe(true);
    expect(resolveInitialTheme(null, false)).toBe(false);
  });
});

describe('useTheme', () => {
  it('applies theme-dark from the system and no stored override', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.dark).toBe(true);
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
  });

  it('toggle flips, persists, and applies the class', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.dark).toBe(false);
    expect(localStorage.getItem('sk-theme')).toBe('light');
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
  });

  it('honours a stored override over the system', () => {
    localStorage.setItem('sk-theme', 'light');
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.dark).toBe(false);
  });

  it('follows system changes until the user overrides', () => {
    const mql = mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    act(() => mql.dispatch(false));
    expect(result.current.dark).toBe(false); // followed system
    act(() => result.current.toggle()); // now dark=true, manual override
    act(() => mql.dispatch(false));
    expect(result.current.dark).toBe(true); // system change ignored after override
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/hooks/useTheme.test.ts`
Expected: FAIL — `useTheme`/`resolveInitialTheme` not defined.

- [ ] **Step 3: Implement `useTheme`**

Create `src/hooks/useTheme.ts`:

```ts
import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'sk-theme';

export function resolveInitialTheme(stored: string | null, systemDark: boolean): boolean {
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return systemDark;
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true;
}

function applyTheme(dark: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('theme-dark', dark);
  root.classList.toggle('theme-light', !dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0C0E12' : '#EDEFF3');
}

export function useTheme(): { dark: boolean; toggle: () => void } {
  const [dark, setDark] = useState(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return resolveInitialTheme(stored, systemPrefersDark());
  });
  const userSet = useRef(typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== null);

  useEffect(() => {
    applyTheme(dark);
  }, [dark]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      if (!userSet.current) setDark(e.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    setDark((d) => {
      const next = !d;
      userSet.current = true;
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      } catch {
        // localStorage unavailable — non-critical
      }
      return next;
    });
  };

  return { dark, toggle };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/hooks/useTheme.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTheme.ts src/hooks/useTheme.test.ts
git commit -m "feat: add system-aware useTheme hook with manual override" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `ThemeProvider` + wire fonts + PWA + main

**Files:** Create `src/hooks/ThemeProvider.tsx`; Modify `src/main.tsx`, `vite.config.ts`, `package.json`

- [ ] **Step 1: Install the self-hosted fonts**

Run:
```bash
npm install @fontsource/hanken-grotesk @fontsource/saira-condensed
```
Expected: both added to `dependencies` in `package.json`.

- [ ] **Step 2: Create the provider**

Create `src/hooks/ThemeProvider.tsx`:

```tsx
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useTheme } from './useTheme';

interface ThemeContextValue {
  dark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ dark: true, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}
```

- [ ] **Step 3: Wire the provider + fonts in `main.tsx`**

Replace the contents of `src/main.tsx` with:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/hanken-grotesk/800.css';
import '@fontsource/saira-condensed/600.css';
import '@fontsource/saira-condensed/700.css';
import App from './App';
import { ThemeProvider } from './hooks/ThemeProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
```

- [ ] **Step 4: Precache fonts + update manifest colours in `vite.config.ts`**

Change the workbox glob (currently `globPatterns: ['**/*.{js,css,html,wasm}']`) to include `woff2`:
```js
      workbox: { globPatterns: ['**/*.{js,css,html,wasm,woff2}'] },
```
And update the manifest colours (currently both `#0f0f23`):
```js
        theme_color: '#0C0E12',
        background_color: '#0C0E12',
```

- [ ] **Step 5: Verify build + tests**

Run: `npm run build`
Expected: SUCCESS — fonts bundled, no type errors.

Run: `npx vitest run`
Expected: PASS — all suites green.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/ThemeProvider.tsx src/main.tsx vite.config.ts package.json package-lock.json
git commit -m "feat: wire ThemeProvider + self-hosted fonts + font precache" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Motion utilities

**Files:** Modify `src/index.css`

- [ ] **Step 1: Add keyframes + utilities**

Append to `src/index.css` (after the `@layer` blocks):

```css
@layer utilities {
  @keyframes scorePop {
    0% { transform: scale(1); }
    40% { transform: scale(1.18); }
    100% { transform: scale(1); }
  }
  @keyframes livePing {
    0% { transform: scale(1); opacity: 0.7; }
    80%, 100% { transform: scale(2.4); opacity: 0; }
  }
  .score-pop { animation: scorePop 0.48s var(--ease); }
  .press { transition: transform 0.12s var(--ease); }
  .press:active { transform: scale(0.965); }
  .press-score:active { transform: scale(0.92); }
  .live-dot { position: relative; }
  .live-dot::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    background: currentColor;
    animation: livePing 1.7s var(--ease) infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .score-pop, .live-dot::after { animation: none !important; }
    .press, .press:active, .press-score:active { transition: none !important; transform: none !important; }
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add Sideline motion utilities (scorePop, live ping, press)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Line-icon set

**Files:** Create `src/components/icons/Icon.tsx`, `src/components/icons/index.tsx`

The reference paths are in `docs/design-handoff/src/icons.jsx` (vendored in Task 0). Port them to typed components. No unit test (static SVG; verified by `npm run build`).

- [ ] **Step 1: Create the base**

Create `src/components/icons/Icon.tsx`:

```tsx
import type { ReactNode, SVGProps } from 'react';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: number;
  children: ReactNode;
}

export function Icon({ size = 22, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
      {...props}
    >
      {children}
    </svg>
  );
}
```

- [ ] **Step 2: Create the icon set**

Create `src/components/icons/index.tsx` (paths copied verbatim from the vendored `icons.jsx`):

```tsx
import { Icon } from './Icon';

type P = { size?: number; className?: string };

export const Undo = (p: P) => <Icon {...p}><path d="M3 8h11a5 5 0 0 1 0 10H8" /><path d="M6 4 3 8l3 4" /></Icon>;
export const Plus = (p: P) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const Minus = (p: P) => <Icon {...p}><path d="M5 12h14" /></Icon>;
export const Play = (p: P) => <Icon {...p} stroke="none"><path d="M7 4.5v15l13-7.5z" fill="currentColor" /></Icon>;
export const Pause = (p: P) => <Icon {...p} stroke="none"><rect x="6.5" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" /><rect x="14" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" /></Icon>;
export const Card = (p: P) => <Icon {...p}><rect x="5" y="3.5" width="14" height="17" rx="2.2" /></Icon>;
export const Sub = (p: P) => <Icon {...p}><path d="M4 7h11l-3-3M4 7l3 3" /><path d="M20 17H9l3-3M20 17l-3 3" /></Icon>;
export const Flag = (p: P) => <Icon {...p}><path d="M6 21V4" /><path d="M6 4h11l-2 4 2 4H6" /></Icon>;
export const Share = (p: P) => <Icon {...p}><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="5.5" r="2.6" /><circle cx="18" cy="18.5" r="2.6" /><path d="M8.3 10.8 15.7 6.7M8.3 13.2l7.4 4.1" /></Icon>;
export const Whistle = (p: P) => <Icon {...p}><path d="M3 10h9l4 2v0a5 5 0 1 1-5 5v-2" /><path d="M12 6V3" /></Icon>;
export const Clock = (p: P) => <Icon {...p}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 3h6" /></Icon>;
export const ChevronLeft = (p: P) => <Icon {...p}><path d="M15 5l-7 7 7 7" /></Icon>;
export const ChevronRight = (p: P) => <Icon {...p}><path d="M9 5l7 7-7 7" /></Icon>;
export const Close = (p: P) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>;
export const Check = (p: P) => <Icon {...p}><path d="M5 12.5l4.5 4.5L19 7" /></Icon>;
export const Edit = (p: P) => <Icon {...p}><path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></Icon>;
export const History = (p: P) => <Icon {...p}><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4.5V9H8" /><path d="M12 8v4.5l3 2" /></Icon>;
export const Settings = (p: P) => <Icon {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3" /></Icon>;
export const Star = (p: P) => <Icon {...p}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" /></Icon>;
export const Trophy = (p: P) => <Icon {...p}><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" /><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M9 19h6M10 15.5V19M14 15.5V19M8 21h8" /></Icon>;

export function SportGlyph({ size = 26, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }} className={className}>
      <circle cx="16" cy="16" r="11" />
      <path d="M16 5v22M5 16h22" />
      <path d="M9 9c3 2.2 3 11.8 0 14M23 9c-3 2.2-3 11.8 0 14" strokeWidth={1.4} />
    </svg>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: SUCCESS — components typecheck.

- [ ] **Step 4: Commit**

```bash
git add src/components/icons
git commit -m "feat: add Sideline line-icon set + Gaelic sport glyph" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Version bump + changelog + final verification

**Files:** Modify `package.json`, `package-lock.json`, `CHANGELOG.md`

- [ ] **Step 1: Bump version**

In `package.json`, change `"version": "1.1.6",` → `"version": "1.1.7",`. In `package-lock.json`, change the **root** `"version": "1.1.6"` (line 3) and the `packages[""]` `"version": "1.1.6"` (near line 9) → `"1.1.7"` (do not touch dependency versions).

- [ ] **Step 2: Changelog entry**

In `CHANGELOG.md`, replace:
```md
All notable changes to this project will be documented in this file.

## [1.1.6] - 2026-05-30
```
with:
```md
All notable changes to this project will be documented in this file.

## [1.1.7] - 2026-05-30

### Changed
- Foundation for the "Sideline" visual refresh: system-aware dark/light theming (CSS-variable tokens), new Hanken Grotesk + Saira Condensed fonts (self-hosted, offline-ready), motion utilities, and a line-icon set. Existing screens are unchanged; they restyle in later phases.

## [1.1.6] - 2026-05-30
```

- [ ] **Step 3: Full verification**

Run: `npx vitest run`
Expected: PASS — all suites green (incl. `useTheme`).

Run: `npm run build`
Expected: SUCCESS.

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.7 and update changelog" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Plan self-review

**Spec coverage:**
- Vendor handoff → Task 0 ✅
- CSS-variable tokens (both themes) + body → Task 1 ✅
- Tailwind additive tokens (surface DEFAULT+shades collision fix, fonts, shadow) → Task 1 ✅
- `useTheme` (init/system-listener/override/persist) + `resolveInitialTheme` → Task 2 ✅
- `ThemeProvider` single-source context + main wiring → Task 3 ✅
- Self-hosted fonts + PWA `woff2` precache + manifest colours → Task 3 ✅
- Motion utilities + reduced-motion → Task 4 ✅
- Line-icon set + Gaelic glyph → Task 5 ✅
- Testing (`useTheme`) → Task 2 ✅; versioning → Task 6 ✅
- No-FOUC default theme class → Task 1 Step 3 ✅
- Out of scope (screen restyles, team colours) — respected ✅

**Placeholder scan:** none — every code step has complete code; the icon paths are copied verbatim from the vendored reference; no-test tasks (1,3,4,5) state build-verification deliberately.

**Type/name consistency:** `useTheme` → `{ dark, toggle }`; `resolveInitialTheme(stored, systemDark)`; `ThemeProvider`/`useThemeContext`; storage key `sk-theme`; Tailwind keys `bg`/`surface`(+`2`,`900`..)/`line`(+`2`)/`txt`(+`2`,`3`)/`danger`, `font-sans`/`font-score`, `shadow-card`; CSS vars `--bg/--surface/--surface-2/--line/--line-2/--txt/--txt-2/--txt-3/--danger/--shadow-card/--ease` — all consistent across tasks.
