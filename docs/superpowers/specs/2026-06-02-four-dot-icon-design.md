# App Icon / Logo Refresh — Design Spec

Replace the generic flat-blue "SK" placeholder icon with the **four-dot mark**: the four kit-colour dots from the in-app header, promoted to the app icon. Direction and arrangement were chosen with the user in the brainstorming visual companion.

## Confirmed decisions
- **Direction:** four-dot mark (over the scoreboard-tile and refined-monogram alternatives).
- **Arrangement:** **bold 2×2** (over balanced 2×2, a header-style row, and a diamond) — bigger dots that read clearly even at favicon size.
- **Surface:** the dark "Sideline" tile (subtle `#15181f → #0a0c10` vertical gradient), matching the app's `theme_color` (`#0C0E12`).
- **Colours:** the existing header dots — `#2b9ad5` (blue), `#ea493c` (red), `#f4c720` (yellow), `#47b26c` (green) — so the icon and the in-app logo share one identity.

## Why
The old icon (a flat blue circle with white "SK") was a placeholder: generic, unrelated to scoring or to the Sideline look. The four dots are already the app's in-header identity — colourful (good for a kids' app), sport-neutral, and crisp at small sizes.

## Assets
- **`public/icons/icon.svg`** — full-bleed 512 master: gradient dark square + bold 2×2 dots (centres 176/336, r 74), centred within the maskable safe zone.
- **`public/icons/icon-192.png`, `icon-512.png`** — rasterised from `icon.svg` (full-bleed, so Android/iOS apply their own corner mask).
- **`public/favicon.svg`** — the same mark on a **rounded** dark tile (rx 29), for the browser tab; replaces the orphaned purple-swoosh template SVG.
- **Removed `public/icons.svg`** — orphaned starter-template sprite (Bluesky/Discord/GitHub glyphs), referenced nowhere.

## Wiring
- **`index.html`** — add an SVG favicon (`<link rel="icon" type="image/svg+xml" href="/favicon.svg">`) ahead of the PNG fallback; `apple-touch-icon` stays on `icon-192.png`. (Vite base-prefixes these to `/score-keeper/…` at build.)
- **`vite.config.ts`** — the manifest's two PNG icons gain `purpose: 'any maskable'` (the full-bleed art is maskable-safe), so Android adaptive icons render without clipping.

## Generation (reproducible)
PNGs are rendered from the SVG with headless Chrome (no CLI rasteriser is installed):
`chrome --headless=new --screenshot=out.png --window-size=N,N --force-device-scale-factor=1 <html-embedding-icon.svg-at-Npx>`.

## Out of scope
- The in-app `AppHeader` (already a four-dot row + wordmark — on-brand, unchanged).
- Service-worker precaching of icons (workbox globs already exclude png/svg; pre-existing, unchanged).
- The scoreboard-tile and monogram directions (not chosen).

## Versioning
Bump `package.json` 1.1.22 → 1.1.23 (+ lockfile root) and add a `CHANGELOG.md` `[1.1.23]` entry.
