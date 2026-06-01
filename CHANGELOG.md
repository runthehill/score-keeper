# Changelog

All notable changes to this project will be documented in this file.

## [1.1.20] - 2026-06-01

### Added
- A back button (chevron) in the live game header — tap it to return Home; the game keeps running and resumes from the "In progress" list. Useful as an installed PWA, where there's no browser back button.

### Changed
- "Default squads" is now "Default teams" throughout Settings — a saved team is a name, kit colours, and *optional* players, so it works even when you only set a name and colours.
- The quick-select chip in a new game now reads "Use {team}" (instead of just the team name), making it clearer that tapping it fills that side. It still works for either side.

### Removed
- The global "Default team names" setting (Home/Away). It predated per-sport default teams and was redundant; new games now start with empty name fields (with the usual placeholders).

### Fixed
- The game summary's "By half/quarter" breakdown now shows the Gaelic Football goals-points score per period (e.g. "1-03"), matching the rest of the app — it previously showed the raw points total.

## [1.1.18] - 2026-06-01

### Added
- Gaelic Football: a **Wide** button alongside the scoring buttons (tracked per team/player, doesn't change the score), and a **Penalty** stat.
- Soccer: **Throw-in**, **Corner**, **Off-side**, and **Penalty** stats alongside Assist.
- New stats appear in the play-by-play and the game summary's player stats.

## [1.1.17] - 2026-06-01

### Fixed
- Gaelic Football games now show the goals-points score (e.g. "1-05") on the Home and History cards, matching the live game and result/share views — previously the cards showed the raw points total.

## [1.1.16] - 2026-05-31

### Fixed
- The shared result image no longer crops the bottom (the "Score Keeper" footer / result line). The score font could fall back to a taller font on the first capture, pushing the footer past the edge; the card now waits for its fonts and warms up the render so the full card is captured.

## [1.1.15] - 2026-05-31

### Added
- Set a default squad's team kit colours in Settings (tap the colour chip in the squad editor). When you load that squad in Game Setup, its colours come with it — falling back to the sport's default kit for squads saved before this.

## [1.1.14] - 2026-05-31

### Fixed
- Light mode now applies to the whole app — the screen background follows the selected theme instead of staying dark (so the toggle added in 1.1.13 takes full effect).

### Changed
- Brought the last surfaces onto the "Sideline" design (refresh polish): the player picker, the substitution flow (now with team kit chips), the install prompts, and the app shell. The whole app is now on the new look.

## [1.1.13] - 2026-05-30

### Added
- A Dark / Light mode toggle in Settings (Sideline refresh, Phase 7). The app still follows your device theme by default; the toggle is a manual override that sticks.

### Changed
- Settings screen restyled to the "Sideline" look. Default squads, default team names, data export/clear, share, and install are unchanged.

## [1.1.12] - 2026-05-30

### Changed
- Rebuilt the shareable score image (Sideline refresh, Phase 6): it's now a single crisp card in the teams' kit colours (rendered from HTML), replacing the old canvas image and its Square/Story sizes — fixing the earlier proportion issues. The Game Summary screen is restyled with the share card as its centrepiece; period breakdown, player stats, and CSV/JSON export are unchanged.

## [1.1.11] - 2026-05-30

### Changed
- Home and History screens restyled to the "Sideline" look (Phase 5): game cards now show each team's kit colours with a live/winner emphasis, sport tiles for starting a new game, a logo header, and a cleaner tab bar. Routing, recent/in-progress lists, and the History sport filter are unchanged.

## [1.1.10] - 2026-05-30

### Added
- Choose each team's kit colours when setting up a game (Sideline refresh, Phase 4): tap a team's colour chip to pick a primary + secondary, with a live scoreboard preview and sensible per-sport home defaults. The chosen colours are saved with the game and shown throughout.

### Changed
- Game Setup screen restyled to the "Sideline" look. Team names, saved squads, optional players, and game format are unchanged.

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
