# MightyScore — Native Mobile Fork — Design

**Date:** 2026-07-12

## Summary

Fork Score Keeper into **MightyScore**, a native mobile app distributed through
the Apple App Store and Google Play. The app is free; a single in-app purchase
("MightyScore Pro") unlocks the two features that need a backend and user
accounts:

1. **Live score sharing** — a public link that shows the score and play-by-play
   updating in real time while the game is scored.
2. **Post-game reports** — a shareable, hosted match report (score, timeline,
   box score, stats) generated after the final whistle.

Everything the app does today — offline scoring, all six sports, kits, box
scores, local history — stays free and works with no account and no network.

## Fork strategy

Create a new repository (`runthehill/mightyscore`) seeded from this codebase,
rather than a long-lived branch here. The two products will diverge (store
metadata, native projects, backend) and share no release cadence. Score Keeper
keeps living as the PWA; genuinely shared fixes (e.g. a sport-config bug) are
cherry-picked across. Don't attempt a shared-core monorepo yet — extract a
shared package only if cross-porting becomes a recurring cost.

## Native approach — decision

**Recommendation: Capacitor** (wrap the existing Vite + React app in native
iOS/Android shells).

| Option | Reuse | Effort to first store build | Trade-off |
|---|---|---|---|
| **Capacitor** (recommended) | ~95% of the 6.3k-line codebase | Days–weeks | WebView UI; fine for this app (it's already a tuned mobile PWA) |
| Expo / React Native | Types, configs, db/queries, utils (~40%); every screen/component rewritten | Months | Best native feel; big rewrite of a UI that already works |
| Flutter / native Swift+Kotlin | ~0% | Months+ | Two new stacks; no reason given the team and codebase |

Why Capacitor wins here: the app is already mobile-first, touch-tuned,
offline-first, and theme-aware. There is no map/camera/animation-heavy surface
where a WebView underperforms. Capacitor gives real store distribution, real
native plugins (SQLite, share sheet, haptics, IAP), and keeps one codebase —
the web build even keeps working, which matters below (the live-share viewer is
a web page).

### What changes in the app itself

- **Base path & router:** serve from `/` instead of `/score-keeper/`;
  `HashRouter` can stay (works fine inside Capacitor's local server).
- **PWA plumbing goes:** `vite-plugin-pwa`, `PwaReloadPrompt`, `UpdateToast`
  (update flow), `InstallBanner`, `IosInstallSheet`, `useInstallPrompt` — app
  updates ship through the stores instead.
- **Storage:** keep sql.js + IndexedDB persistence for v1 (zero code change;
  inside Capacitor the WebView storage is app-scoped and not subject to
  Safari's eviction). Planned follow-up: migrate to
  `@capacitor-community/sqlite` (native SQLite files, faster, backup-friendly).
  The event-sourced schema makes that migration a data copy, not a redesign.
- **Sharing:** replace the Web Share API path in the share-card flow with
  `@capacitor/share` + `@capacitor/filesystem` (native share sheet with the
  image attached). `html-to-image` still generates the card.
- **Nice natives:** `@capacitor/haptics` on score buttons, `@capacitor/status-bar`
  matched to the theme, keep-awake during a live game.
- **Everything else stays:** sport configs, event sourcing, screens, theming,
  kits, tests. No sport-specific code paths exist to port.

### Rebranding

Name, icon set (regenerate from a new `icon.svg`), splash screens, app IDs
(`com.runthehill.mightyscore`), store listings. One pass, all cosmetic.

## Backend — decision

**Recommendation: Supabase** (Postgres + Auth + Realtime + Edge Functions +
Storage). Firebase is the credible alternative; Supabase wins because the data
model is already relational/event-sourced (it's SQLite today — the schema ports
almost 1:1 to Postgres) and Realtime channels map directly onto "broadcast
score events for game X". Free tier covers development and early usage.

### Accounts

- **Scoring never requires an account.** Sign-in is asked for only when the
  user first touches a Pro feature (App Store guideline 5.1.1 also demands
  this).
- Auth methods: **Sign in with Apple** (mandatory on iOS once any third-party
  login is offered), **Google**, and email magic-link.
- **In-app account deletion** is required by Apple — build it with accounts,
  not as an afterthought.

### Live score sharing (Pro)

The event-sourced architecture is the whole design:

- Publisher (the scorer) pushes each appended event row to Supabase as it
  happens; offline-tolerant — events queue locally (they're already in the
  local `events` table with UUIDs and timestamps) and sync when connectivity
  returns. UUID PKs make sync idempotent upserts; no conflict resolution
  needed because only one device writes a given game.
- A shared game gets a short public slug → `https://mightyscore.app/g/<slug>`.
- The viewer is a **read-only web page** (no app install needed by grandparents
  on the far side of the world) that subscribes to the game's Realtime channel
  and derives the score exactly the way the app does — the existing `format.ts`
  / scoreboard code is reused in a small public web build from the same repo.
- Viewers are anonymous; publishing requires account + Pro entitlement,
  enforced by Postgres row-level security.

### Post-game reports (Pro)

- On "share report", the app uploads the final event log + metadata; an Edge
  Function (or the same web viewer in "final" mode) renders a hosted report
  page at the same slug — scoreline, timeline, box score, per-player stats,
  kit colours.
- The existing share-card image remains free; the hosted, full report page is
  the Pro artifact.

## Monetization — decision

- **Product:** one auto-renewing **subscription** (monthly + a discounted
  annual/"season" tier), not a one-off unlock — live sharing and hosted reports
  carry ongoing backend cost. Include a free trial (e.g. first shared game
  free) so the value is felt before the paywall.
- **Plumbing: RevenueCat** (`@revenuecat/purchases-capacitor`) rather than raw
  StoreKit 2 + Play Billing — one API for both stores, server-side receipt
  validation, and a webhook that stamps the entitlement into Supabase so RLS
  can check "is Pro" server-side. Free below $2.5k MTR.
- Rule to respect: on-device digital features must be purchasable only via IAP
  on iOS — no external checkout links.

## Store requirements checklist

- Apple Developer Program ($99/yr), Google Play Console ($25 once).
- Privacy policy URL + App Store privacy "nutrition labels" / Play data-safety
  form (local-only by default; account data only for Pro users).
- Sign in with Apple; in-app account deletion.
- Not a "Kids Category" app — it's a tool for adults (coaches/parents) at
  kids' games; rate 4+ and say so in review notes.
- Screenshots per device class, review builds via TestFlight / Play internal
  testing.

## Out of scope (v1)

- Multi-device co-scoring of one game (single-writer keeps sync trivial).
- Native rewrite (React Native) — revisit only if WebView performance ever
  becomes a real, measured problem.
- Migrating existing Score Keeper PWA users' local history into MightyScore.
- Android-only or iOS-only staged launch decisions, marketing site content.

## Delivery

The fork work happens in the new `mightyscore` repository per the phased plan
(`docs/superpowers/plans/2026-07-12-mightyscore-mobile-fork.md`). This spec is
docs-only in this repo — no version bump.
