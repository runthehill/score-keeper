# Install-App Prompt — Design Spec

Make it easy for people to install the PWA to their home screen. Show a dismissible
**Install** banner on the Home screen and a permanent **Install app** entry in Settings.
On Android/desktop Chromium this triggers the real native install dialog; on iOS Safari
(which has no programmatic install) it shows short **Add to Home Screen** instructions.

## Background

- The app is an installable PWA: the manifest is already complete (`name`, `short_name`,
  192/512 icons, `display: standalone`, theme colour) and a service worker is generated in
  production by `vite-plugin-pwa`. So installability prerequisites are met; this feature only
  adds the **UI to trigger/guide** installation. No manifest or SW changes.
- There is no existing install handling (only a CSS `display-mode: standalone` tweak for
  safe-area padding).
- App shell: `Home` / `History` / `Settings` screens + a bottom `TabBar`. `Settings` already
  has a "Share this app" button — a natural sibling for an install entry. Existing modals
  (card picker, share sheet) use a bottom-sheet style we'll match.

## Platform reality (drives the whole design)

| Situation | Detection | UI | Action |
|---|---|---|---|
| Android / desktop Chromium, installable | `beforeinstallprompt` captured | Banner + Settings button | Native install dialog (`prompt()`) |
| iOS Safari, not installed | iOS UA + not standalone | Banner + Settings button | Open "Add to Home Screen" instructions sheet |
| Already installed | `display-mode: standalone` (or `navigator.standalone`) | Hidden | — |
| Unsupported (Firefox, in-app webview) | no prompt + not iOS | Hidden | — |

`beforeinstallprompt` can fire **before React mounts**, so it must be captured at module load
(outside React) and stored, or the button would sometimes do nothing.

## Architecture

### 1. `src/utils/installPrompt.ts` — capture + pure mode logic
Module-level capture (runs on import):
```ts
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// module state
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
// window 'beforeinstallprompt' → e.preventDefault(); deferredPrompt = e; notify()
// window 'appinstalled'        → deferredPrompt = null; installed = true; notify()

export type InstallSnapshot = { hasPrompt: boolean; installed: boolean };
export function getInstallSnapshot(): InstallSnapshot   // cached reference; new object only on change
export function subscribeInstall(cb: () => void): () => void
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'>
  // no deferredPrompt → 'unavailable'; else prompt(), await userChoice, clear, notify, return outcome
```

Pure, unit-tested helpers (no globals):
```ts
export type InstallMode = 'installable' | 'ios' | 'hidden';
export function resolveInstallMode(s: { hasPrompt: boolean; isStandalone: boolean; isIOS: boolean }): InstallMode {
  if (s.isStandalone) return 'hidden';
  if (s.hasPrompt) return 'installable';
  if (s.isIOS) return 'ios';
  return 'hidden';
}
```

Platform probes (thin wrappers over browser APIs):
```ts
export function isStandalone(): boolean
  // matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
export function isIOS(): boolean
  // /iphone|ipad|ipod/i.test(navigator.userAgent)
```

### 2. `src/hooks/useInstallPrompt.ts`
```ts
export function useInstallPrompt(): { mode: InstallMode; promptInstall: () => Promise<...> }
```
Reads the module store via `useSyncExternalStore(subscribeInstall, getInstallSnapshot)` (idiomatic
external-store read — avoids the `set-state-in-effect` lint rule), computes `isStandalone()` /
`isIOS()`, returns `mode = resolveInstallMode({ hasPrompt: snapshot.hasPrompt && !snapshot.installed, isStandalone, isIOS })` and `promptInstall`.

### 3. `src/components/IosInstallSheet.tsx`
Bottom-sheet modal (matches existing modal style) with the three steps — tap Share → "Add to
Home Screen" → Add — and a "Got it" / close. Props: `{ onClose }`. Shared by banner and Settings.

### 4. `src/components/InstallBanner.tsx`
The dismissible Home banner. Uses `useInstallPrompt`. Renders nothing when `mode === 'hidden'`
or previously dismissed (`localStorage` key `sk-install-dismissed`). Tap **Install** →
`promptInstall()` when `mode === 'installable'`, or open `IosInstallSheet` when `mode === 'ios'`.
The ✕ sets dismissed (persisted). The dismissal helpers live in `installPrompt.ts` (alongside
the other install utilities, so they're unit-testable and the banner stays thin):
```ts
const DISMISS_KEY = 'sk-install-dismissed';
export function isBannerDismissed(): boolean   // localStorage.getItem(DISMISS_KEY) === '1'
export function dismissBanner(): void          // localStorage.setItem(DISMISS_KEY, '1')
```

### 5. Wiring
- `Home.tsx` — render `<InstallBanner />` at the top (above the heading / first section).
- `Settings.tsx` — an "Install app" row near "Share this app", using the same hook; shown when
  `mode !== 'hidden'`. Tap behaves like the banner (prompt or iOS sheet). Settings **ignores**
  the dismissed flag (it's the permanent fallback).

## Behaviour details
- Banner copy: title "📲 Install Score Keeper", subtitle "Add it to your home screen for
  one-tap, offline access", an **Install** button, and a ✕ dismiss.
- After a successful install, `appinstalled` clears the prompt → `mode` becomes `hidden` →
  banner and Settings entry disappear.
- Dismissal is permanent per device (until `localStorage` is cleared); Settings remains the
  fallback. The banner never re-nags.
- iOS instructions are Safari-focused; if opened in an in-app webview the steps still read
  sensibly ("open in Safari, then…"). No special webview detection (YAGNI).

## Testing (TDD)
- **`src/utils/installPrompt.test.ts`** — `resolveInstallMode` matrix:
  standalone → `hidden` (even with a prompt); `hasPrompt` → `installable`; iOS + no prompt →
  `ios`; neither → `hidden`. Plus `promptInstall` with a mocked deferred event
  (accepted / dismissed / unavailable).
- **`src/components/InstallBanner.test.tsx`** (jsdom; mock `useInstallPrompt` + `localStorage`):
  `mode='hidden'` renders nothing; `mode='installable'` + not dismissed shows the banner and
  **Install** calls `promptInstall`; ✕ hides it and persists dismissal; `mode='ios'` → **Install**
  opens the instructions sheet.

## Dev caveat
`beforeinstallprompt` only fires on HTTPS with an active service worker, which is **off in
`vite dev`**. So the real native-install button only appears on the **deployed** site; locally
we verify the iOS-instructions path and the logic via tests. (Worth a line in the PR.)

## Versioning (per CLAUDE.md, before push)
- Bump `package.json` `1.1.4` → `1.1.5`.
- Add a `CHANGELOG.md` `[1.1.5]` entry.

## Out of scope
- Custom install analytics / counting installs.
- Re-prompting after N days, or A/B timing of the banner.
- In-app-browser ("open in Safari/Chrome") detection beyond the static instruction text.
- Changes to the manifest, icons, or service worker.
