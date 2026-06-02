# PWA Update Prompt + Offline-Ready Toast — Design Spec

A small in-app toast that tells the user when a new version of the app is available (with a one-tap **Reload**), and a one-time "ready to work offline" confirmation on first install. Solves the recurring "I deployed but don't see my changes" problem: an installed PWA currently auto-updates silently and only on a future full reload, so a kept-open app never signals anything.

## Confirmed decisions
- **Manual reload** — the update toast never auto-reloads (safe during live scoring); it only reloads when the user taps **Reload**. Dismiss hides it until the next detected update.
- **Include the offline-ready toast** — a one-time "Ready to work offline" notice on first install, auto-dismissing after a few seconds. Same hook, same component, extra variant.

## Mechanism
`vite-plugin-pwa` is already configured with `registerType: 'autoUpdate'`. Switch to **`registerType: 'prompt'`** and drive the UI from the plugin's `virtual:pwa-register/react` hook, `useRegisterSW`, which exposes:
- `needRefresh: [boolean, setter]` — a new build is waiting → show the **update** toast.
- `offlineReady: [boolean, setter]` — first precache complete → show the **offline-ready** toast.
- `updateServiceWorker(reloadPage)` — activate the waiting SW; `true` reloads the page.

**Active update checking (the crux).** The app uses `HashRouter`, so in-app navigation never triggers a service-worker re-check — a kept-open PWA would otherwise never see a new build. In `onRegisteredSW(swUrl, registration)` we call `registration.update()`:
- on **`visibilitychange` → `visible`** (the "I reopened the app" moment), and
- on an **hourly interval** (for an app left open during a long tournament).

Both guarded (`registration?.update()` wrapped so a rejected update — e.g. offline — is swallowed). The interval and listener are cleaned up on unmount.

**First-transition note:** existing users are on the old `autoUpdate` worker, which will auto-activate this one new build (its final auto-update). From then on they get the `'prompt'` behaviour. No migration, no data impact (everything is in IndexedDB regardless).

## Components

### `src/components/UpdateToast.tsx` — presentational (unit-tested)
Pure, no side effects, no virtual-module import. Props:
```ts
interface UpdateToastProps {
  kind: 'update' | 'offline-ready';
  onReload?: () => void;   // only used by kind="update"
  onDismiss: () => void;
}
```
- A floating pill, `fixed`, centred near the bottom, **above the TabBar** and safe-area aware (the TabBar is `fixed bottom-0` ~60px tall + safe area; offset the toast by `calc(env(safe-area-inset-bottom) + 84px)` so it never overlaps the nav, on tabbed and tab-less screens alike). High `z-index` (above the TabBar). `max-w` so it doesn't stretch on desktop.
- Styled like `InstallBanner`: `bg-surface border border-line rounded-2xl`, with a subtle shadow so it reads as floating.
- `kind="update"`: text **"New version available"**, a bold **Reload** button (`bg-txt text-bg`, calls `onReload`), and a `✕` dismiss (`onDismiss`).
- `kind="offline-ready"`: text **"Ready to work offline"**, **no** Reload button, just a `✕` dismiss.
- `role="status"` / polite live region so it's announced to screen readers; dismiss button has an `aria-label`.

### `src/components/PwaReloadPrompt.tsx` — container (NOT imported by any test)
The only file that imports `virtual:pwa-register/react`. Logic:
- `const { needRefresh: [needRefresh, setNeedRefresh], offlineReady: [offlineReady, setOfflineReady], updateServiceWorker } = useRegisterSW({ onRegisteredSW });`
- `onRegisteredSW(swUrl, r)`: sets the hourly `setInterval(() => void r?.update().catch(() => {}), 3600_000)` and a `visibilitychange` listener that calls `r?.update()` when visible.
- **Render priority:** if `needRefresh` → `<UpdateToast kind="update" onReload={() => void updateServiceWorker(true)} onDismiss={() => setNeedRefresh(false)} />`; else if `offlineReady` → `<UpdateToast kind="offline-ready" onDismiss={() => setOfflineReady(false)} />`; else `null`. (Update takes priority — it's the actionable one.)
- **Auto-dismiss** the offline-ready toast: a `useEffect` that, when `offlineReady` is true, starts a ~5s timer calling `setOfflineReady(false)`, cleared on unmount/!offlineReady. The update toast does NOT auto-dismiss.

### `src/App.tsx`
Render `<PwaReloadPrompt />` once at the shell level (inside the top-level `App`, so it shows on every screen including live game and summary).

### `src/vite-env.d.ts`
Add `/// <reference types="vite-plugin-pwa/react" />` so the virtual module typechecks.

### `vite.config.ts`
`registerType: 'autoUpdate'` → `'prompt'`. Everything else (manifest, workbox globs, includeAssets) unchanged.

## Testing
- `src/components/UpdateToast.test.tsx` (mirrors `InstallBanner.test.tsx` style — Testing Library + `userEvent`):
  - `kind="update"`: renders "New version available"; clicking **Reload** calls `onReload`; clicking `✕` calls `onDismiss`.
  - `kind="offline-ready"`: renders "Ready to work offline"; there is **no** Reload button (`queryByRole('button', { name: /reload/i })` is null); `✕` calls `onDismiss`.
- The container and the `onRegisteredSW` wiring can't be exercised in jsdom (no real service worker; `vitest.config.ts` doesn't load VitePWA so the virtual module is unresolved) — verified manually on-device after deploy. No test imports `PwaReloadPrompt` or `App`, so the unresolved virtual module never breaks the suite.
- Existing suite stays green; `npm run build` + `npm run lint` clean.

## Out of scope
- Changing what gets precached / the offline behaviour itself (the SW already precaches the app).
- A Settings "check for updates now" button (could add later).
- Release notes in the toast.

## Versioning
Bump `package.json` 1.1.20 → 1.1.21 (+ lockfile root), add a `CHANGELOG.md` `[1.1.21]` entry.
