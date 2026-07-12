# MightyScore — Native Mobile Fork — Implementation Plan

**Date:** 2026-07-12
**Spec:** `docs/superpowers/specs/2026-07-12-mightyscore-mobile-fork-design.md`

Each phase ends in something installable/testable. Phases 0–1 produce a
store-ready free app; 2–5 add the paid backend features. Work happens in the
new `runthehill/mightyscore` repo.

## Phase 0 — Fork & rebrand

1. Create `runthehill/mightyscore` seeded from `score-keeper@main`.
2. Rename: `package.json` name, app title, `AppHeader`, README, new
   `public/icons/icon.svg` → regenerate PNG set, splash art.
3. Strip PWA plumbing: `vite-plugin-pwa`, `PwaReloadPrompt`, `UpdateToast`
   usage for SW updates, `InstallBanner`, `IosInstallSheet`, `useInstallPrompt`
   (+ their tests). Set Vite `base: '/'`.
4. Verify: `npm run build`, `npx vitest run`, app works in a plain browser.

## Phase 1 — Capacitor shells (free app, store-ready)

1. `npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`;
   `npx cap init MightyScore com.runthehill.mightyscore --web-dir dist`.
2. Add native projects (`npx cap add ios|android`); wire icons/splash
   (`@capacitor/assets`).
3. Native polish, each behind a small wrapper so vitest/jsdom still runs:
   - `@capacitor/share` + `@capacitor/filesystem` replacing the Web Share API
     path in `exportShareCard` / `ShareSheet`.
   - `@capacitor/haptics` on `ScoreButton` press.
   - `@capacitor/status-bar` synced from `ThemeProvider`;
     `@capacitor-community/keep-awake` while a game is live.
4. Device QA pass on iPhone + a small Android phone: score a full game per
   sport, kill/relaunch mid-game (clock + state restore), dark/light.
5. Store setup: Apple Developer + Play Console accounts, bundle IDs, TestFlight
   and Play internal-testing builds, screenshots, privacy policy page,
   data-safety forms ("data not collected" at this phase).
6. **Milestone: submit the free app for review on both stores.** Everything
   after ships as updates.

## Phase 2 — Backend & accounts (Render)

1. Add a `server/` workspace to the repo: **Fastify** (TypeScript) API,
   deployed as an always-on Render web service; **Render Postgres**. Port the
   SQLite schema (`games`, `events`, `players`, …) with `user_id` ownership
   columns, managed with **Drizzle** migrations (better-auth ships a Drizzle
   adapter, so one schema toolchain covers both).
2. Auth: **better-auth** in the API — Sign in with Apple, Google, and email
   magic link delivered via **Postmark** (existing account). Sign-in UI in the
   app appears only from Pro feature touchpoints; a Settings "Account" row
   shows state.
3. In-app **account deletion** (API endpoint: delete auth user + owned rows).
4. TDD the sync layer: an outbox that POSTs local event rows to the API
   (UUID PKs → idempotent upserts) whenever online; no behaviour change for
   signed-out users. Authorization lives in the request handlers — vitest
   the "publishing requires Pro entitlement" path directly.

## Phase 3 — Live score sharing

1. "Share live" on `LiveGame` → API creates the game server-side, mints a
   short slug, starts the event outbox for that game; native share sheet with
   `https://mightyscore.app/g/<slug>`.
2. Viewer: a second Vite entry in the same repo — read-only page that loads
   the game + events from the API, subscribes to its WS/SSE stream, and reuses
   `format.ts`/scoreboard rendering. Deploy as a Render static site on
   **mightyscore.app** (registered); fan-out is in-process pub/sub on the
   single API instance, with Render Key Value (Redis) as the bridge if it
   ever runs multi-instance.
3. End the stream at final whistle; the page flips to "Full-time".
4. QA: airplane-mode mid-game → events queue and flush; two viewers see the
   same tally as the scorer's device; a viewer surviving an API deploy
   (reconnect + resync from the event log).

## Phase 4 — Post-game reports

1. "Share report" on `GameSummary` → ensures the full event log is synced,
   marks the game `published`; the `/g/<slug>` page in final mode renders the
   report (scoreline, timeline, box score, player stats, kits).
2. OpenGraph tags + share-card image (reuse `shareCard.ts` output) so links
   unfurl nicely in chats.
3. The existing free image share stays untouched.

## Phase 5 — Paywall & IAP

1. RevenueCat project; monthly + annual subscription products in App Store
   Connect / Play Console; `@revenuecat/purchases-capacitor` in the app.
2. RevenueCat webhook → Fastify API endpoint writing an `entitlements` table;
   the publish/report handlers check it server-side.
3. Paywall sheet at the two touchpoints (share live / share report):
   sign-in → trial or subscribe → proceed. Restore-purchases button.
4. Sandbox-test purchases on both platforms; then submit the update with IAP
   for review (expect extra scrutiny: demo account for reviewers, subscription
   terms copy in the listing).

## Cross-porting policy

Sport-config and scoring fixes discovered in either repo get cherry-picked to
the other; UI divergence is expected and not reconciled.
