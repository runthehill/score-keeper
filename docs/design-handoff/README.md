# Handoff: Score Keeper — "Sideline" visual refresh

## Overview
A full visual refresh of the Score Keeper PWA. Same information architecture and
features as today (Home / New Game, Game Setup, Live scoring, Game Summary,
History, Settings), restyled into a sportier, smarter, broadcast-inspired look —
**without becoming childish**.

The headline new capability: **per-game team colors**. Each team gets a
primary + secondary "kit" chosen at setup, and those colors drive the scoreboard,
the scoring buttons, the play-by-play, and a genuinely shareable final-score card.

Picked directions (confirmed with the design owner):
- **Scoreboard style: Blocks** — two color-blocked team halves. (Default.)
- **Score numerals: Saira Condensed** (tabular).
- **Theme: system-aware** — follows the OS `prefers-color-scheme`, with manual override. Dark is the on-field default for sideline glare.

---

## Screenshots
Reference renders are in `screenshots/` (the device chrome is the prototype's iPhone frame — ignore it):
- `01-home.png` — Home / New Game (light theme, system-aware)
- `02-setup.png` — Game Setup with live scoreboard preview
- `03-color-picker.png` — the per-team kit picker (presets + custom swatches)
- `04-live-blocks.png` — Live scoring, Blocks scoreboard (light)
- `05-summary-share.png` — Full-time summary + shareable result card
- `06-live-dark.png` — Live scoring in **dark** (the on-field default)

> Note on the share/export: the prototype renders the result card to a real PNG via
> `html-to-image` and hands it to the Web Share API (`navigator.share({files})`),
> falling back to a download. In your app, prefer your platform's native share +
> a server-side or canvas render if you need higher fidelity.

## About the design files
The files in this bundle are **design references created in HTML/React-via-Babel** —
a working prototype that shows the intended look and behavior. They are **not**
production code to copy directly.

Your job is to **recreate these designs inside the existing Score Keeper codebase**
(Vite + React + TypeScript + Tailwind + sql.js) using its established patterns —
the component structure under `src/components`, the screens under `src/screens`,
the sport configs in `src/sports/configs.ts`, the SQLite schema in `src/db`, and
`tailwind.config.js`. Where the prototype hand-rolls something the codebase already
has a home for, use the codebase's version.

The prototype is organized so it maps almost 1:1 onto your existing files (see
**Component mapping** below).

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, shadows and interactions are
final. Recreate pixel-for-pixel using Tailwind + your existing component patterns.
Exact values are in **Design tokens**.

---

## Design tokens

Add these to `tailwind.config.js` (replacing the current `surface` / `home` / `away`
/ `accent` palette) and/or expose them as CSS custom properties on a theme wrapper.
The prototype drives everything off CSS variables that switch on a `.theme-dark` /
`.theme-light` class — mirror that, or use Tailwind's `dark:` variant.

### Theme colors

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0C0E12` | `#EDEFF3` | App background |
| `--surface` | `#161A21` | `#FFFFFF` | Cards, sheets |
| `--surface-2` | `#1E232C` | `#F4F6F9` | Wells, secondary buttons, timer plate |
| `--line` | `rgba(255,255,255,.08)` | `rgba(15,23,42,.09)` | Hairlines |
| `--line-2` | `rgba(255,255,255,.17)` | `rgba(15,23,42,.18)` | Visible borders |
| `--txt` | `#F3F5F8` | `#10131A` | Primary text / headings |
| `--txt-2` | `#A7B0BE` | `#515B6B` | Body / secondary |
| `--txt-3` | `#6C7585` | `#8A93A2` | Meta / eyebrows |
| `--danger` | `#FF6B6B` | `#DC2626` | Destructive (End game) |

Shadows: `--shadow-card` dark `0 12px 30px rgba(0,0,0,.40)`, light `0 10px 26px rgba(15,23,42,.08)`.

### Team-color kits (presets) — `KITS`
`name / primary / secondary`:
Crimson `#E03131`/`#FFFFFF` · Royal `#1E63D6`/`#FFFFFF` · Forest `#1E8E4E`/`#F4C430` ·
Midnight `#16245A`/`#E03131` · Tangerine `#F25F1F`/`#15171C` · Sky `#2B9AD5`/`#16245A` ·
Maroon `#7A1F3D`/`#E0A92E` · Violet `#5B2A86`/`#F4C430` · Emerald `#0F9D72`/`#FFFFFF` ·
Slate `#15171C`/`#FFFFFF`.

Full custom swatch palette (`SWATCHES`, 18 values):
`#E03131 #F25F1F #F59E0B #F4C430 #86C61A #1E8E4E #0F9D72 #0FB5B0 #2B9AD5 #1E63D6 #16245A #5B2A86 #A21CAF #D6336C #7A1F3D #8B5E34 #15171C #FFFFFF`

### Typography
- **UI sans:** `Hanken Grotesk` (400/500/600/700/800). Headings `font-weight:800`, `letter-spacing:-0.02em`.
- **Score numerals + timer:** `Saira Condensed` (600/700), always `font-variant-numeric: tabular-nums`. Big scores `letter-spacing:-0.02em`.
- Both load from Google Fonts. (Sport tile emoji stay as system emoji.)
- Eyebrows: 11px, weight 800, `letter-spacing:0.09em`, uppercase, color `--txt-3`.

Type scale used: score numerals 76px (Blocks scoreboard) / 26px (button `+pts`) / 30px (timer);
team names 13–15px; body 13–15px; meta/eyebrow 11px.

### Radius & spacing
Radii: cards 18–20px, scoreboard 20px, buttons 14–15px, sheets 26px (top corners),
pills/chips `9999px`, kit chips 6–13px. Spacing on a 4px grid (gaps mostly 8/10/12/16/18).

### Motion
- Easing `cubic-bezier(0.16, 1, 0.3, 1)`; durations 120ms (hover), 200ms (transforms).
- `:active` press = `scale(0.965)`; scoring buttons `scale(0.92)`.
- Score change = a brief `scorePop` (`scale(1)→1.18→1`, 480ms) on the changed score.
- LIVE dot = a 1.7s ping. **No bouncing / spring.** Respect `prefers-reduced-motion`.

---

## The team-color system (most important detail)

### Data model
Persist each team's two colors **per game**. In `src/db/schema.ts`, add to the
`games` table: `home_primary`, `home_secondary`, `away_primary`, `away_secondary`
(TEXT, hex strings). Default to a sensible kit if not chosen. Surface them on the
`Game` type in `src/types/index.ts` (e.g. `home: { name, primary, secondary }`).

### Readable-accent helper (ship this exactly)
A near-black kit on dark mode (or near-white on light mode) would vanish. Resolve a
**theme-aware accent** for any UI tint, while the kit chip always shows the *true*
colors:

```ts
function teamAccent(team: {primary:string; secondary:string}, dark: boolean) {
  const L = (hex:string) => { /* WCAG relative luminance */ };
  const bgL = L(dark ? '#0C0E12' : '#EDEFF3');
  const ratio = (c:string) => (Math.max(L(c),bgL)+0.05) / (Math.min(L(c),bgL)+0.05);
  if (ratio(team.primary)   >= 2.3) return team.primary;
  if (ratio(team.secondary) >= 2.3) return team.secondary;
  return dark ? '#E8ECF2' : '#15171C';
}
```
Use `teamAccent` for: scoreboard numerals (Bars/Minimal), scoring-button tint &
label, play-by-play tick, score totals, the share-card winner number.
(See `src/live.jsx` and `src/data.jsx` in this bundle for the exact functions:
`teamAccent`, `inkOn`, `isPale`, `rgba`, `relLuminance`.)

### Kit chip
A rounded square: primary fill + a secondary diagonal slash
(`clip-path: polygon(100% 0, 100% 100%, 38% 100%)`), with a 1px inset ring (darker
ring if the color is pale). This is the team's visual ID everywhere a logo would go.

### Color picker
Bottom sheet opened from each team row in Setup. Contains: a live preview chip,
a 5-wide grid of preset kits, then a 9-wide Primary swatch grid and a 9-wide
Secondary swatch grid (selected swatch shows a check in its contrast ink). See
`ColorKitPicker` in `src/ui.jsx`.

---

## Screens / views

### Home (`src/screens/Home.tsx`)
- **Header:** four brand dots (`#2b9ad5 #ea493c #f4c720 #47b26c`) + "Jonathan's Score Keeper" (800, -0.02em) + today's date in `--txt-3`.
- **Resume card** (only if a game is in progress): live pill + pulsing dot, both kit chips, names, scores in each team's accent, "Resume ›". Maps to a restyled `GameCard` live state.
- **New game grid:** 2-col `SportTile`s (replaces `SportCard.tsx`). Each: a 46px rounded tile tinted with a per-sport color holding the sport emoji (or the Gaelic line glyph), name (800), and a one-line format blurb; a faint tinted blob top-right.
- **Recent:** list of `RecentCard`s (replaces `GameCard.tsx`): sport mark + name eyebrow + date; two rows (home/away) each with kit chip, name (winner bold), and score in Saira (winner `--txt`, loser `--txt-3`).
- **Tab bar** (`TabBar.tsx`): New Game / History / Settings, **line icons** (not emoji), active = `--txt`, inactive = `--txt-3`.

### Game Setup (`src/screens/GameSetup.tsx`)
- Header: back chevron pill + eyebrow "New game" + sport name & mark.
- **Live scoreboard preview** at top (Blocks style, 0–0) that reflects current kit choices in real time.
- Two team rows: tappable kit chip (with a small pencil badge) + an inline editable team name field. Tapping the chip opens the `ColorKitPicker`.
- Format line (e.g. "2 halves") + helper copy.
- Primary CTA "**Start game**" with a whistle icon (full-width, `--txt` fill, `--bg` ink).
- Defaults: home pre-filled per sport (e.g. Rugby → Sligo RFC black/red); away = "Opponent" Royal blue/white (chosen to contrast most home kits).

### Live Game (`src/screens/LiveGame.tsx`) — the hero
- Header: back, sport name, period pill `n / count` in the home accent.
- **Scoreboard — Blocks** (`Scoreboard.tsx`): one rounded container, two halves filled with each team's **primary**; a 5px **secondary** stripe along the top of each half; HOME/AWAY eyebrow + team name in `inkOn(primary)`; huge Saira score (76px, split-score 56px) in `inkOn(primary)`; a 30px circular "VS" chip (surface) straddling the centre seam. Gaelic shows `G-PP` split (e.g. `1-05`) + a small "N pts".
- **Stadium clock** (`Timer.tsx`): full-width `--surface-2` plate; play/pause glyph (filled circle when running), 30px Saira tabular time, period label, live dot when running. Tap toggles.
- Basketball only: a "Team fouls n · bonus" row that turns red at ≥5.
- **Scoring rows** (`ScoringRow.tsx` + `ScoreButton.tsx`), one per team: kit chip + name + HOME/AWAY + current total; then a button per `scoringEvent`. **Blocks style = buttons filled with the team accent**, `inkOn` label, big Saira `+pts` over the event label, soft colored shadow.
- **Actions row**: line-icon tiles — Card (if `cardEvents`), Stat (if `statEvents`), Undo, and Full time / Next. Plus a dashed "Share current score" button.
- **Play-by-play** (`EventLog.tsx`): newest-first; time (Saira) + accent tick + event label + team + `+pts`.
- "End game" (danger outline) at the bottom.
- Bottom sheets for: Issue card (card type × team), Log stat (stat → team), Next period confirm, End game confirm, and Share (renders the share card).

### Game Summary (`src/screens/GameSummary.tsx`)
- Header: back + "Full time".
- **Share card** (new component, see below) — the payoff artifact.
- "Scoring summary" = `EventLog` filtered to point-scoring events.
- Actions: "Done" (ghost) + "Share result" (primary, share icon).

### Share card (new — used in Summary + the live Share sheet)
A **fixed dark** graphic (always dark, regardless of theme, so it reads as a
broadcast lower-third when screenshotted): `#0A0C10`, two blurred radial glows in
the two teams' primaries (top-left / top-right), status eyebrow ("FULL TIME" / live),
sport · date, both teams (kit chip, name, HOME/AWAY·WIN, big Saira score with the
winner in `teamAccent(team,true)` and loser at `rgba(255,255,255,.45)`), a hairline,
then a footer: four brand dots + "Score Keeper" wordmark and a result line
("Strand Celtic by 1" / "Full-time draw"). See `ShareCard` in `src/screens2.jsx`.
Recommend rendering to an actual image via `html-to-image`/canvas for the Web Share API.

### History (`src/screens/History.tsx`)
Header + "All games · n" + a list of `RecentCard`s. Tab bar.

### Settings (`src/screens/Settings.tsx`)
Grouped rows (Appearance / Game / Data) on `--surface` cards with iOS-style pill
toggles. "Dark mode" toggle here flips the theme **and** marks a manual override
(see Theme). "Scoreboard style" points users to the in-app option.

---

## Interactions & behavior
- **Scoring** is event-sourced (unchanged): each tap appends an event `{team, type, points, period, t, label}`; team scores are derived by summing points. Keep your existing undo/replay model — the prototype mirrors it.
- Tapping a score button: append event → `scorePop` on that side's number.
- Timer: tap toggles run/pause (your existing wake-lock stays). Advancing a period resets the clock to 00:00, paused; scores carry.
- Player attribution / substitutions: out of scope for this refresh visually but keep the existing flows; route them through the same bottom-sheet styling.
- Navigation flows: Home → (sport) Setup → Start → Live → End → Summary → Home. Live "back" keeps the game in progress (it reappears as the Resume card).

## State
- Theme: `dark: boolean`, initialized from `matchMedia('(prefers-color-scheme: dark)')`, **live-updated** by a `change` listener **until** the user toggles it manually (track a `userSetTheme` flag; see `src/app.jsx`). Persist the manual override.
- Scoreboard style (`'blocks' | 'bars' | 'minimal'`) and score font are prototype tweaks; ship **Blocks + Saira** as the product default. Bars/Minimal are included in the prototype as alternates if you ever want a setting.
- Per-game team colors persisted with the game (see Data model).

## Iconography
- **Actions** = line icons (2px stroke, round caps, `currentColor`): undo, plus/minus, play/pause, card, sub, flag (next/full-time), share, whistle, clock, chevrons, close, check, edit, history, settings, star. Exact SVG paths in `src/icons.jsx` — or swap for the equivalent **Heroicons** your app already uses.
- **Sports** keep emoji (🏉 ⚽ 🏀). Gaelic football has no clean emoji → use the custom round-ball line glyph in `src/icons.jsx` (`SportGlyph glyph="gaa"`).

## Assets
No image assets required. Brand "four dots" are inline `<span>`s. All icons are inline SVG. Fonts via Google Fonts (Hanken Grotesk, Saira Condensed).

---

## Component mapping (prototype → your codebase)

| Prototype (this bundle) | Your file | Notes |
|---|---|---|
| `Scoreboard` (`src/live.jsx`) | `src/components/Scoreboard.tsx` | Implement **Blocks** layout |
| `ScoringRow` / score buttons | `src/components/ScoringRow.tsx`, `ScoreButton.tsx` | Team-accent filled buttons |
| `Timer` | `src/components/Timer.tsx` | Stadium-clock plate |
| `EventLog` | `src/components/EventLog.tsx` | Accent-tick timeline |
| `SportTile` | `src/components/SportCard.tsx` | Tinted tile + blurb |
| `RecentCard` / Resume | `src/components/GameCard.tsx` | Kit chips + Saira scores |
| `TabBar` | `src/components/TabBar.tsx` | Line icons |
| `ColorKitPicker`, `TeamKitChip`, `Sheet`, `Button`, `Pill` | new shared components | From `src/ui.jsx` |
| `ShareCard` | new | Summary + share sheet |
| `HomeScreen/SetupScreen/LiveScreen/SummaryScreen/HistoryScreen/SettingsScreen` | `src/screens/*` | Restyle in place |
| `teamAccent/inkOn/isPale/KITS/SWATCHES/SPORTS` | `src/data.jsx` → `src/sports/configs.ts` + a `colors` util | Helpers + kits |

## Files in this bundle
- `Score Keeper Refresh.html` — open in a browser to interact with the full prototype (use the Tweaks toolbar to compare Blocks/Bars/Minimal, themes, and score fonts).
- `src/data.jsx` — sports, kits, swatches, color helpers, seed games.
- `src/icons.jsx` — line icons + sport glyphs.
- `src/ui.jsx` — TeamKitChip, Button, Pill, LiveDot, Sheet, ColorKitPicker.
- `src/live.jsx` — Scoreboard, Timer, ScoringRow, EventLog, `teamAccent`.
- `src/screens.jsx` — Home, Setup, chrome (TabBar/headers/RecentCard).
- `src/screens2.jsx` — LiveScreen, ShareCard, Summary, History, Settings.
- `src/app.jsx` — state, navigation, system-aware theme, tweak defaults.
- `frames/ios-frame.jsx`, `tweaks-panel.jsx` — prototype scaffolding only; **do not** port (your app is the real device + has no tweak panel in production).

> The `.jsx` files use Babel-in-browser and `window.*` globals for the prototype.
> In your codebase use real ESM imports, TypeScript types, and your existing
> component conventions — treat these as readable references, not drop-ins.
