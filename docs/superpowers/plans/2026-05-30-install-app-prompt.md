# Install-App Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dismissible Home install banner + a Settings "Install app" entry that triggers the native PWA install on Android/desktop and shows Add-to-Home-Screen instructions on iOS.

**Architecture:** A module (`installPrompt.ts`) captures `beforeinstallprompt` at import time and exposes a subscribe/snapshot store plus a pure `resolveInstallMode`; a `useInstallPrompt` hook reads it via `useSyncExternalStore`; `InstallBanner` and an `IosInstallSheet` render the UI, wired into Home and Settings.

**Tech Stack:** Vite + React + TypeScript, Web App Manifest (already present), `beforeinstallprompt`/`appinstalled` APIs, `useSyncExternalStore`, vitest + @testing-library/react (jsdom).

---

## File structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/utils/installPrompt.ts` | Event capture + store + pure `resolveInstallMode` + platform probes + dismissal helpers | Create |
| `src/utils/installPrompt.test.ts` | Tests for the pure logic + `promptInstall` | Create |
| `src/hooks/useInstallPrompt.ts` | Hook: `useSyncExternalStore` → `{ mode, promptInstall }` | Create |
| `src/components/IosInstallSheet.tsx` | Bottom-sheet "Add to Home Screen" instructions | Create |
| `src/components/InstallBanner.tsx` | Dismissible Home banner | Create |
| `src/components/InstallBanner.test.tsx` | Banner behaviour (mocks the hook) | Create |
| `src/screens/Home.tsx` | Render `<InstallBanner />` at the top | Modify |
| `src/screens/Settings.tsx` | "Install app" entry + iOS sheet | Modify |
| `package.json` / `CHANGELOG.md` | Version 1.1.5 + entry | Modify |

**Testability:** `resolveInstallMode`, the dismissal helpers, and `promptInstall` are unit-tested; `InstallBanner` is jsdom-tested (it mocks the hook). The hook and `IosInstallSheet` are thin/presentational — verified by `npm run build` and exercised through the `InstallBanner` test (which renders the iOS sheet). Do not add tests that depend on a real `beforeinstallprompt`/`matchMedia`.

**⚠️ Parallel-version note:** this branch is off `main` (v1.1.3); the open share PR #11 holds v1.1.4. Task 6 bumps to **1.1.5**. Whichever of #11 / this PR merges *second* will hit a trivial conflict on `package.json` and the top of `CHANGELOG.md` — resolve by keeping both version entries in descending order.

All commit commands include the project's co-author trailer.

---

### Task 1: `installPrompt.ts` — capture, store, and pure logic

**Files:**
- Create: `src/utils/installPrompt.ts`
- Test: `src/utils/installPrompt.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/installPrompt.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveInstallMode,
  isBannerDismissed,
  dismissBanner,
  promptInstall,
} from './installPrompt';

describe('resolveInstallMode', () => {
  it('is hidden when running standalone (even if installable)', () => {
    expect(resolveInstallMode({ hasPrompt: true, isStandalone: true, isIOS: true })).toBe('hidden');
  });
  it('is installable when a native prompt is available', () => {
    expect(resolveInstallMode({ hasPrompt: true, isStandalone: false, isIOS: false })).toBe('installable');
  });
  it('is ios when there is no prompt but the device is iOS', () => {
    expect(resolveInstallMode({ hasPrompt: false, isStandalone: false, isIOS: true })).toBe('ios');
  });
  it('is hidden when nothing applies', () => {
    expect(resolveInstallMode({ hasPrompt: false, isStandalone: false, isIOS: false })).toBe('hidden');
  });
});

describe('banner dismissal', () => {
  beforeEach(() => localStorage.clear());
  it('persists dismissal to localStorage', () => {
    expect(isBannerDismissed()).toBe(false);
    dismissBanner();
    expect(isBannerDismissed()).toBe(true);
  });
});

// These run in order — the module holds a single captured prompt.
describe('promptInstall', () => {
  function dispatchBeforeInstallPrompt(outcome: 'accepted' | 'dismissed') {
    const evt = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome }),
    });
    window.dispatchEvent(evt);
    return evt;
  }

  it('returns "unavailable" when no prompt has been captured', async () => {
    expect(await promptInstall()).toBe('unavailable');
  });
  it('fires the native prompt and returns "accepted"', async () => {
    const evt = dispatchBeforeInstallPrompt('accepted');
    const outcome = await promptInstall();
    expect(evt.prompt).toHaveBeenCalledOnce();
    expect(outcome).toBe('accepted');
  });
  it('returns "dismissed" when the user declines', async () => {
    dispatchBeforeInstallPrompt('dismissed');
    expect(await promptInstall()).toBe('dismissed');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/utils/installPrompt.test.ts`
Expected: FAIL — module/exports not found.

- [ ] **Step 3: Implement `installPrompt.ts`**

Create `src/utils/installPrompt.ts`:

```ts
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMode = 'installable' | 'ios' | 'hidden';
export interface InstallSnapshot {
  hasPrompt: boolean;
  installed: boolean;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let snapshot: InstallSnapshot = { hasPrompt: false, installed: false };
const listeners = new Set<() => void>();

function update(next: InstallSnapshot): void {
  snapshot = next;
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    update({ hasPrompt: true, installed: snapshot.installed });
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    update({ hasPrompt: false, installed: true });
  });
}

export function subscribeInstall(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getInstallSnapshot(): InstallSnapshot {
  return snapshot;
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  update({ hasPrompt: false, installed: snapshot.installed });
  return outcome;
}

export function resolveInstallMode(s: { hasPrompt: boolean; isStandalone: boolean; isIOS: boolean }): InstallMode {
  if (s.isStandalone) return 'hidden';
  if (s.hasPrompt) return 'installable';
  if (s.isIOS) return 'ios';
  return 'hidden';
}

export function isStandalone(): boolean {
  const mql = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(display-mode: standalone)').matches
    : false;
  const iosStandalone = typeof navigator !== 'undefined' && (navigator as { standalone?: boolean }).standalone === true;
  return mql || iosStandalone;
}

export function isIOS(): boolean {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

const DISMISS_KEY = 'sk-install-dismissed';
export function isBannerDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}
export function dismissBanner(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // localStorage unavailable (private mode) — non-critical
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/utils/installPrompt.test.ts`
Expected: PASS (all describes green).

- [ ] **Step 5: Commit**

```bash
git add src/utils/installPrompt.ts src/utils/installPrompt.test.ts
git commit -m "feat: add installPrompt store + resolveInstallMode for PWA install" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `useInstallPrompt` hook

**Files:**
- Create: `src/hooks/useInstallPrompt.ts`

No unit test (thin glue over the tested store + `resolveInstallMode`; verified by `npm run build` and the `InstallBanner` test). Do not add a test that mocks `matchMedia`.

- [ ] **Step 1: Implement the hook**

Create `src/hooks/useInstallPrompt.ts`:

```ts
import { useSyncExternalStore } from 'react';
import {
  subscribeInstall,
  getInstallSnapshot,
  promptInstall,
  resolveInstallMode,
  isStandalone,
  isIOS,
  type InstallMode,
} from '../utils/installPrompt';

export function useInstallPrompt(): {
  mode: InstallMode;
  promptInstall: typeof promptInstall;
} {
  const snapshot = useSyncExternalStore(subscribeInstall, getInstallSnapshot, getInstallSnapshot);
  const mode = resolveInstallMode({
    hasPrompt: snapshot.hasPrompt && !snapshot.installed,
    isStandalone: isStandalone(),
    isIOS: isIOS(),
  });
  return { mode, promptInstall };
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run build`
Expected: SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useInstallPrompt.ts
git commit -m "feat: add useInstallPrompt hook" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `IosInstallSheet` instructions modal

**Files:**
- Create: `src/components/IosInstallSheet.tsx`

No unit test (static markup; exercised by the `InstallBanner` test in Task 4 and verified by `npm run build`).

- [ ] **Step 1: Implement the component**

Create `src/components/IosInstallSheet.tsx`:

```tsx
interface Props {
  onClose: () => void;
}

const STEPS = [
  'Tap the Share button (the square with an upward arrow) in Safari’s toolbar.',
  'Scroll down and tap “Add to Home Screen”.',
  'Tap “Add” in the top corner.',
];

export default function IosInstallSheet({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full bg-surface-800 rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold text-gray-400 mb-3">Add to Home Screen</p>
        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-sm text-gray-200">{step}</span>
            </li>
          ))}
        </ol>
        <button onClick={onClose} className="w-full mt-4 py-3 bg-accent rounded-lg text-sm font-bold">
          Got it
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run build`
Expected: SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add src/components/IosInstallSheet.tsx
git commit -m "feat: add iOS Add-to-Home-Screen instructions sheet" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `InstallBanner` component

**Files:**
- Create: `src/components/InstallBanner.tsx`
- Test: `src/components/InstallBanner.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/InstallBanner.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallBanner from './InstallBanner';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { isBannerDismissed, dismissBanner } from '../utils/installPrompt';

vi.mock('../hooks/useInstallPrompt', () => ({ useInstallPrompt: vi.fn() }));
const mockHook = vi.mocked(useInstallPrompt);

beforeEach(() => {
  localStorage.clear();
  mockHook.mockReset();
});

describe('InstallBanner', () => {
  it('renders nothing when mode is hidden', () => {
    mockHook.mockReturnValue({ mode: 'hidden', promptInstall: vi.fn() });
    const { container } = render(<InstallBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the banner and calls promptInstall on Install (installable)', async () => {
    const promptInstall = vi.fn().mockResolvedValue('accepted');
    mockHook.mockReturnValue({ mode: 'installable', promptInstall });
    render(<InstallBanner />);
    expect(screen.getByText('📲 Install Score Keeper')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Install' }));
    expect(promptInstall).toHaveBeenCalledOnce();
  });

  it('dismiss hides the banner and persists the choice', async () => {
    mockHook.mockReturnValue({ mode: 'installable', promptInstall: vi.fn() });
    const { container } = render(<InstallBanner />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(container).toBeEmptyDOMElement();
    expect(isBannerDismissed()).toBe(true);
  });

  it('does not render when already dismissed', () => {
    dismissBanner();
    mockHook.mockReturnValue({ mode: 'installable', promptInstall: vi.fn() });
    const { container } = render(<InstallBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the iOS instructions on Install (ios mode)', async () => {
    mockHook.mockReturnValue({ mode: 'ios', promptInstall: vi.fn() });
    render(<InstallBanner />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Install' }));
    expect(screen.getByText('Add to Home Screen')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/InstallBanner.test.tsx`
Expected: FAIL — `InstallBanner` not found.

- [ ] **Step 3: Implement the component**

Create `src/components/InstallBanner.tsx`:

```tsx
import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { isBannerDismissed, dismissBanner } from '../utils/installPrompt';
import IosInstallSheet from './IosInstallSheet';

export default function InstallBanner() {
  const { mode, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(isBannerDismissed);
  const [showIos, setShowIos] = useState(false);

  if (mode === 'hidden' || dismissed) return null;

  const handleInstall = () => {
    if (mode === 'ios') setShowIos(true);
    else promptInstall();
  };

  const handleDismiss = () => {
    dismissBanner();
    setDismissed(true);
  };

  return (
    <>
      <div className="bg-surface-800 border border-accent/40 rounded-xl p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">📲 Install Score Keeper</p>
          <p className="text-xs text-gray-400 mt-0.5">Add it to your home screen for one-tap, offline access.</p>
        </div>
        <button
          onClick={handleInstall}
          className="flex-shrink-0 bg-accent text-white text-sm font-bold rounded-lg px-4 py-2"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-gray-500 text-lg leading-none px-1"
        >
          ✕
        </button>
      </div>
      {showIos && <IosInstallSheet onClose={() => setShowIos(false)} />}
    </>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/InstallBanner.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/InstallBanner.tsx src/components/InstallBanner.test.tsx
git commit -m "feat: add dismissible InstallBanner" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Wire into Home and Settings

**Files:**
- Modify: `src/screens/Home.tsx`
- Modify: `src/screens/Settings.tsx`

- [ ] **Step 1: Home — import**

In `src/screens/Home.tsx`, add after the line `import GameCard from '../components/GameCard';`:
```tsx
import InstallBanner from '../components/InstallBanner';
```

- [ ] **Step 2: Home — render the banner**

In `src/screens/Home.tsx`, find:
```tsx
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Jonathan's Score Keeper</h1>
```
Replace with:
```tsx
    <div className="p-4 space-y-6">
      <InstallBanner />
      <h1 className="text-2xl font-bold">Jonathan's Score Keeper</h1>
```

- [ ] **Step 3: Settings — imports**

In `src/screens/Settings.tsx`, add after the line `import { loadSettings, saveSettings } from '../utils/settings';`:
```tsx
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import IosInstallSheet from '../components/IosInstallSheet';
```

- [ ] **Step 4: Settings — state**

In `src/screens/Settings.tsx`, find:
```tsx
  const [newNumber, setNewNumber] = useState('');
```
Add immediately after it:
```tsx
  const { mode: installMode, promptInstall } = useInstallPrompt();
  const [showIosInstall, setShowIosInstall] = useState(false);
```

- [ ] **Step 5: Settings — Install section + iOS sheet**

In `src/screens/Settings.tsx`, find (the end of the Share section):
```tsx
          {shareMessage || 'Share this app'}
        </button>
      </section>
```
Replace with:
```tsx
          {shareMessage || 'Share this app'}
        </button>
      </section>

      {installMode !== 'hidden' && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Install</h2>
          <button
            onClick={() => {
              if (installMode === 'ios') setShowIosInstall(true);
              else promptInstall();
            }}
            className="w-full bg-surface-800 border border-surface-600 rounded-xl py-3 text-sm font-semibold active:bg-surface-700"
          >
            {installMode === 'ios' ? 'Add to home screen' : 'Install app'}
          </button>
        </section>
      )}

      {showIosInstall && <IosInstallSheet onClose={() => setShowIosInstall(false)} />}
```

- [ ] **Step 6: Verify typecheck + build**

Run: `npm run build`
Expected: SUCCESS.

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all green, including the new install tests.

- [ ] **Step 8: Commit**

```bash
git add src/screens/Home.tsx src/screens/Settings.tsx
git commit -m "feat: wire InstallBanner into Home and an Install entry into Settings" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Version bump + changelog + final verification

**Files:**
- Modify: `package.json`, `CHANGELOG.md`

**Note:** this branch is at 1.1.3; bump to **1.1.5** (1.1.4 is taken by the parallel share PR #11). See the parallel-version note above.

- [ ] **Step 1: Bump version**

In `package.json`, change `"version": "1.1.3",` to:
```json
  "version": "1.1.5",
```

- [ ] **Step 2: Changelog entry**

In `CHANGELOG.md`, insert between the intro line and the most recent `##` heading. Replace:
```md
All notable changes to this project will be documented in this file.

## [1.1.3] - 2026-05-29
```
with:
```md
All notable changes to this project will be documented in this file.

## [1.1.5] - 2026-05-30

### Added
- "Install" prompt — a dismissible banner on the Home screen and an entry in Settings to add the app to your home screen. Triggers the native install dialog on Android/desktop and shows Add-to-Home-Screen instructions on iOS.

## [1.1.3] - 2026-05-29
```

- [ ] **Step 3: Full verification**

Run: `npx vitest run`
Expected: PASS — all suites green, including `installPrompt` and `InstallBanner` tests.

Run: `npm run build`
Expected: SUCCESS.

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.5 and update changelog" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Plan self-review

**Spec coverage** (against `docs/superpowers/specs/2026-05-30-install-app-prompt-design.md`):
- `installPrompt.ts` capture + `resolveInstallMode` + probes + dismissal helpers + `promptInstall` → Task 1 ✅
- `useInstallPrompt` via `useSyncExternalStore` → Task 2 ✅
- `IosInstallSheet` → Task 3 ✅
- `InstallBanner` (dismissible, localStorage, iOS sheet) → Task 4 ✅
- Wiring: Home banner + Settings entry (ignores dismissal) → Task 5 ✅
- Behaviour matrix (installable/ios/hidden, appinstalled hides) → `resolveInstallMode` + `installed` flag (Tasks 1–2) ✅
- Testing (resolveInstallMode, dismissal, promptInstall, InstallBanner) → Tasks 1 & 4 ✅
- Versioning + changelog → Task 6 ✅
- Out of scope (analytics, re-prompt timing, webview detection, manifest/SW changes) — respected ✅

**Placeholder scan:** none — every code step has complete code; the no-test tasks (2, 3) explicitly state build-verification, which is deliberate (thin/presentational code), not a placeholder.

**Type/name consistency:** `InstallMode` (`'installable' | 'ios' | 'hidden'`), `InstallSnapshot`, `BeforeInstallPromptEvent`, `resolveInstallMode`, `subscribeInstall`, `getInstallSnapshot`, `promptInstall`, `isStandalone`, `isIOS`, `isBannerDismissed`, `dismissBanner`, and the hook's `{ mode, promptInstall }` shape are used identically across Tasks 1, 2, 4, 5. The Settings hook destructure aliases `mode` → `installMode` to avoid any local clash.
