# Changelog

All notable changes to this project will be documented in this file.

## [1.1.9] - 2026-05-30

### Changed
- Live game screen restyled to the "Sideline" look (Phase 3): colour-blocked scoreboard in each team's kit colours, stadium-clock timer with live indicator, kit-tinted scoring buttons, a cleaner play-by-play, line-icon actions, and a score-pop animation. No change to scoring, timing, cards, subs, or any game behaviour.

## [1.1.8] - 2026-05-30

### Added
- Per-game team "kit" colours (Sideline refresh, Phase 2): each team gets a primary + secondary colour stored with the game, plus theme-aware colour helpers, the kit presets/swatches, and the kit chip + colour picker. Wired into the screens in later phases.

## [1.1.7] - 2026-05-30

### Changed
- Foundation for the "Sideline" visual refresh: system-aware dark/light theming (CSS-variable tokens), new Hanken Grotesk + Saira Condensed fonts (self-hosted, offline-ready), motion utilities, and a line-icon set. Existing screens are unchanged; they restyle in later phases.

## [1.1.6] - 2026-05-30

### Changed
- Gaelic Football scoring buttons reordered to Point, 2-Pointer, Goal (ascending by value).

## [1.1.5] - 2026-05-30

### Added
- "Install" prompt — a dismissible banner on the Home screen and an entry in Settings to add the app to your home screen. Triggers the native install dialog on Android/desktop and shows Add-to-Home-Screen instructions on iOS.

## [1.1.4] - 2026-05-29

### Added
- Share the current score or final result as a branded image — bold gradient card in Square (1080×1080) or Story (1080×1920) format, shared via the native share sheet with a download fallback. Generated entirely on-device.

## [1.1.3] - 2026-05-29

### Added
- Gaelic Football two-point score — new "Two-Pointer" button (2 points) for scores from outside the 40m arc; folds into the goals–points scoreline (e.g. 1-07) and the running total
- Umpire flag colours on Gaelic Football score buttons (green = goal, white = point, orange = two-pointer)

## [1.1.2] - 2026-04-03

### Changed
- Default home team name set to Sligo RFC; updated team-name placeholders in Settings

## [1.1.1] - 2026-04-03

### Fixed
- Page headings overlapping device status bar / Dynamic Island in standalone PWA mode
- Added safe area top padding to body so content clears the system UI

## [1.1.0] - 2026-04-03

### Added
- Per-sport default squads in Settings — save team name + full player list per sport
- Load default squad onto either side (home/away) in Game Setup with one tap
- Basketball period choice — select Halves or Quarters at game setup
- Extra Time support for Soccer, Rugby Union, and Gaelic Football
- Overtime support for Basketball
- Penalties support for Soccer (cup games)
- End-of-regulation dialog with options: End Game / Extra Time / Overtime / Penalties / Continue
- Basketball team fouls display per quarter with BONUS indicator at 5 fouls
- Card events now support player attribution
- Smart player picker bypass — skips picker for teams with no registered players
- Sport-specific placeholder team names (Sligo All Stars, Strand Celtic, etc.)
- Share button in Settings (Web Share API on mobile, clipboard on desktop)
- GitHub repo link in Settings footer
- App version displayed in Settings (pulled from package.json)

### Changed
- Renamed app to "Jonathan's Score Keeper"
- Team colours changed from green/red to blue/amber — neutral, no good/bad connotation
- Brightened team colours for WCAG AA/AAA contrast compliance
- Tab bar hidden on Live Game and Game Summary screens
- Period advance now requires confirmation dialog
- Current period derived from events (survives page refresh)
- Game Summary shows extra time/overtime periods with correct labels

### Fixed
- Bulk export was producing double-encoded JSON
- Stat events were hardcoded to home team
- sql.js ESM import error in browser
- WASM file not found (wrong variant for Vite pre-bundler)
- React hooks ordering violation in AppRoutes
- Player name/number input field sizing
- COOP/COEP headers file for production deployments
- Favicon replaced with visible SK monogram (transparent background)

## [1.0.0] - 2026-04-02

### Added
- Initial release
- Support for Rugby Union, Soccer, Gaelic Football, and Basketball
- Event-sourced data model with SQLite (sql.js) persistence via IndexedDB
- Offline-first PWA — installable, works without internet
- Live Game screen with stacked layout: scoreboard, timer, scoring buttons, event log
- Optional player tracking with scoring attribution and substitutions
- Game history with sport filtering
- CSV and JSON export per game and bulk export
- Gaelic Football split score display (goals-points format)
- Wake lock on Live Game screen
- Settings with default team names
- GitHub Pages deployment via GitHub Actions
