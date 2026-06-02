# PWA Update Prompt + Offline-Ready Toast — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a manual "New version available — Reload" toast when a new build is deployed, plus a one-time auto-dismissing "Ready to work offline" toast on first install.

**Architecture:** Switch `vite-plugin-pwa` from `autoUpdate` to `prompt` mode and drive a small floating toast from the `useRegisterSW` hook. A presentational `UpdateToast` (pure, unit-tested) is rendered by a thin `PwaReloadPrompt` container that owns the hook and the active update-checking (hourly + on app foreground, since a HashRouter SPA never re-checks the SW on its own).

**Tech Stack:** React + TypeScript, Tailwind (CSS-var theme tokens), vite-plugin-pwa v1.2.0 (`virtual:pwa-register/react`), vitest + Testing Library.

---

## File Structure

- Create `src/components/UpdateToast.tsx` — presentational toast (two variants). The ONLY new file imported by a test.
- Create `src/components/UpdateToast.test.tsx` — unit tests for both variants.
- Create `src/components/PwaReloadPrompt.tsx` — container; owns `useRegisterSW` + update-checking. NOT imported by any test (it imports the `virtual:pwa-register/react` module, which `vitest.config.ts` can't resolve).
- Modify `src/App.tsx` — render `<PwaReloadPrompt />` at the shell level.
- Modify `src/vite-env.d.ts` — add the plugin's React types reference.
- Modify `vite.config.ts` — `registerType: 'autoUpdate'` → `'prompt'`.

---

### Task 1: `UpdateToast` presentational component (TDD)

**Files:**
- Create: `src/components/UpdateToast.tsx`
- Test: `src/components/UpdateToast.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/UpdateToast.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpdateToast from './UpdateToast';

describe('UpdateToast', () => {
  it('update variant: shows the message, Reload fires onReload, ✕ fires onDismiss', async () => {
    const onReload = vi.fn();
    const onDismiss = vi.fn();
    render(<UpdateToast kind="update" onReload={onReload} onDismiss={onDismiss} />);

    expect(screen.getByText(/new version available/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reload/i }));
    expect(onReload).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('offline-ready variant: shows the message, has NO Reload button, ✕ fires onDismiss', async () => {
    const onDismiss = vi.fn();
    render(<UpdateToast kind="offline-ready" onDismiss={onDismiss} />);

    expect(screen.getByText(/ready to work offline/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reload/i })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/UpdateToast.test.tsx`
Expected: FAIL — `Cannot find module './UpdateToast'` (component not created yet).

- [ ] **Step 3: Write the component**

Create `src/components/UpdateToast.tsx` (props interface intentionally NOT exported, to satisfy the `react-refresh/only-export-components` lint rule):

```tsx
interface UpdateToastProps {
  kind: 'update' | 'offline-ready';
  onReload?: () => void; // used only by kind="update"
  onDismiss: () => void;
}

export default function UpdateToast({ kind, onReload, onDismiss }: UpdateToastProps) {
  const isUpdate = kind === 'update';
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 z-[60] px-4 flex justify-center pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 84px)' }}
    >
      <div className="pointer-events-auto w-full max-w-md bg-surface border border-line rounded-2xl p-3.5 flex items-center gap-3 shadow-lg">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-txt">
            {isUpdate ? '✨ New version available' : '✅ Ready to work offline'}
          </p>
          {isUpdate && <p className="text-xs text-txt-3 mt-0.5">Reload to get the latest.</p>}
        </div>
        {isUpdate && (
          <button
            type="button"
            onClick={onReload}
            className="flex-shrink-0 bg-txt text-bg text-sm font-bold rounded-xl px-4 py-2 press"
          >
            Reload
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-txt-3 text-lg leading-none px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/UpdateToast.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/UpdateToast.tsx src/components/UpdateToast.test.tsx
git commit -m "feat: add UpdateToast presentational component (update + offline-ready variants)"
```

---

### Task 2: Prompt mode + container + app wiring

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/vite-env.d.ts`
- Create: `src/components/PwaReloadPrompt.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Switch the plugin to prompt mode**

In `vite.config.ts`, change the one line inside `VitePWA({ … })`:

```ts
      registerType: 'prompt',
```

(Leave `includeAssets`, `manifest`, and `workbox` exactly as they are.)

- [ ] **Step 2: Add the plugin's React types reference**

In `src/vite-env.d.ts`, add the second reference line so the virtual module typechecks. The file becomes:

```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare const __APP_VERSION__: string;
```

- [ ] **Step 3: Create the container**

Create `src/components/PwaReloadPrompt.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import UpdateToast from './UpdateToast';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly
const OFFLINE_READY_TIMEOUT_MS = 5000;

export default function PwaReloadPrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swScriptUrl, r) {
      setRegistration(r);
    },
  });

  // A HashRouter SPA never re-checks the service worker on in-app navigation, so
  // poll for a new build hourly and whenever the app returns to the foreground.
  useEffect(() => {
    if (!registration) return;
    const check = () => { void registration.update().catch(() => {}); };
    const interval = setInterval(check, UPDATE_CHECK_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [registration]);

  // The offline-ready notice is purely informational — auto-dismiss it.
  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), OFFLINE_READY_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (needRefresh) {
    return (
      <UpdateToast
        kind="update"
        onReload={() => { void updateServiceWorker(true); }}
        onDismiss={() => setNeedRefresh(false)}
      />
    );
  }
  if (offlineReady) {
    return <UpdateToast kind="offline-ready" onDismiss={() => setOfflineReady(false)} />;
  }
  return null;
}
```

- [ ] **Step 4: Render it at the shell level**

In `src/App.tsx`, add the import and render the prompt once inside the app shell. Add near the other imports:

```tsx
import PwaReloadPrompt from './components/PwaReloadPrompt';
```

Then update the default export so the prompt is always mounted:

```tsx
export default function App() {
  return (
    <HashRouter>
      <DBProvider>
        <AppRoutes />
        <PwaReloadPrompt />
      </DBProvider>
    </HashRouter>
  );
}
```

- [ ] **Step 5: Build, lint, full test suite**

Run: `npm run build`
Expected: success. (`tsc -b` resolves the virtual module via the `vite-plugin-pwa/react` reference added in Step 2; `vite build` resolves the real module via the plugin. Confirm the generated SW is still emitted.)

Run: `npm run lint`
Expected: clean. (If lint flags the unused first callback param, note that `args: 'after-used'` should already allow it because `r` is used; do not add disable comments unless a real error appears.)

Run: `npx vitest run`
Expected: all green (UpdateToast's 2 new tests included; nothing imports the container so the virtual module never has to resolve under vitest).

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts src/vite-env.d.ts src/components/PwaReloadPrompt.tsx src/App.tsx
git commit -m "feat: switch PWA to prompt mode and surface update/offline-ready toasts"
```

---

## After both tasks

- [ ] Version bump `package.json` 1.1.20 → 1.1.21 (+ `package-lock.json` root `version`), add a `CHANGELOG.md` `[1.1.21]` entry.
- [ ] Final holistic review of the whole diff, then open the PR for the user's review.
- [ ] Note in the PR that the update-check wiring can only be verified on-device after deploy (jsdom has no real service worker).

## Self-Review

- **Spec coverage:** prompt-mode switch → Task 2 Step 1. Types reference → Task 2 Step 2. Active update checking (hourly + visibilitychange) → Task 2 Step 3 effect. `UpdateToast` two variants + positioning/styling → Task 1 Step 3. Container render-priority (update over offline-ready) + offline auto-dismiss → Task 2 Step 3. App wiring → Task 2 Step 4. Tests → Task 1. Versioning → After-both-tasks. All covered.
- **Placeholders:** none — every code step is complete.
- **Type consistency:** `UpdateToast` props (`kind`/`onReload`/`onDismiss`) are used identically in the test and the container; `useRegisterSW` destructuring matches the plugin's `react.d.ts` (`needRefresh`/`offlineReady` tuples, `updateServiceWorker`); `onRegisteredSW(swScriptUrl, registration)` matches `RegisterSWOptions`.
