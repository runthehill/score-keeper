# Persistent, Authoritative Match Clock — Design

**Date:** 2026-06-03
**Status:** Approved (brainstorming)

## Problem

Two field-tested bugs share one root cause: the match clock is not the source of truth for anything.

1. **The clock resets on navigation.** `useTimer` (`src/hooks/useTimer.ts`) keeps the elapsed seconds purely in React state. Leaving `LiveGame` (e.g. to the Home screen) unmounts the component, so the value is lost and returns to `00:00`. The current period has the same class of bug — it is re-derived from the max event period on reload, so a started-but-scoreless 2nd half snaps back to the 1st.

2. **Event-log times don't stop for half-time.** The log renders each event's time as wall-clock minutes since kickoff (`formatEventTime(e.timestamp, gameStartedAt)`, `src/utils/format.ts:56`). This ignores the clock entirely, so pausing the timer or breaking for half-time does nothing — event times keep climbing in real-world time.

The fix is to make **one persisted clock the single source of truth**, stored on the game, that survives navigation/reload and feeds the event log.

## Goals

- The live clock survives navigation, reload, a locked phone, and a closed/reopened PWA.
- A *running* clock reflects the **real time that elapsed** while away; only an explicit pause stops it.
- Pausing the clock and half-time genuinely stop time — including event-time accrual.
- Optional per-period length: when set, the clock reads continuous match time and signals overtime; when unset, each half is an independent stopwatch.
- Controls: pause/resume, edit the clock, advance to next half.
- Event-log times come from the clock **once it has been started**; otherwise they fall back to today's wall-clock behaviour (zero change for anyone who never starts the clock).

## Non-Goals

- No auto-start of the clock, no automatic half-time detection, no whistle sounds.
- No countdown display — the clock counts up; overtime is a visual nudge only.
- No per-second persistence — clock state is reconstructable from its anchor.

## The Clock Model (anchored stopwatch)

The clock is stored as an anchored stopwatch rather than a ticking counter. A ticking counter freezes when a mobile tab is backgrounded; an anchored clock stays correct because a running clock is pinned to wall-clock time.

### Persisted fields (on `games`)

| Field | Type | Meaning |
|---|---|---|
| `clock_running` | INTEGER 0/1, default 0 | Is the clock currently running? |
| `clock_base_ms` | INTEGER, default 0 | Elapsed milliseconds banked as of the last pause/edit/boundary. |
| `clock_anchor` | TEXT (ISO) nullable | Wall-clock instant the clock was last started; `null` when paused. |
| `clock_active` | INTEGER 0/1, default 0 | Has the clock ever been started this game? Gates the event-log time source. |
| `current_period` | INTEGER, default 1 | Persisted period (replaces the ephemeral derive-from-events value). |
| `current_period_label` | TEXT nullable | Extra-period label (e.g. "Extra Time") so extra time survives navigation; `null` in regulation. |

### Elapsed-seconds computation

```
clockSeconds(game, now) =
  max(0, floor((clock_base_ms + (clock_running && clock_anchor ? now - parse(clock_anchor) : 0)) / 1000))
```

Because a running clock is anchored to `now`, returning from Home / a locked phone / a relaunch shows the true elapsed time with no per-second writes. Writes happen only on state transitions.

### Transitions (each returns a field patch, then persists)

- **start / resume** (when paused): `clock_anchor = nowISO`, `clock_running = 1`, `clock_active = 1`.
- **pause** (when running): `clock_base_ms += now - parse(anchor)`, `clock_anchor = null`, `clock_running = 0`.
- **toggle**: start or pause as appropriate.
- **setTime(seconds)** (edit): `clock_base_ms = seconds * 1000`, `clock_active = 1`; if running, `clock_anchor = nowISO` (continue from the edited value).
- **next period** (advance): increment `current_period`; set `current_period_label`; `clock_running = 0`, `clock_anchor = null`, and `clock_base_ms = periodStartMs(newPeriod)`.

`periodStartMs(period)` = `timed && period <= periodCount ? (period - 1) * lengthMs : 0`. Entering an extra period (`period > periodCount`) resets to `0` even in timed mode, since extra-time length is undefined.

## Timed vs Free Mode

Driven entirely by whether a per-period length is configured for the game.

- **Free mode (no length):** each half is a fresh stopwatch; "next half" resets to `00:00`. No overtime threshold.
- **Timed mode (length L set):** the clock reads continuous match time. Period N occupies `[(N-1)·L, N·L]`; "next half" parks the clock at `(N-1)·L`, paused. When the displayed time passes the current period's end (`N·L`, regulation only), the timer numerals turn **red** as an overtime nudge.

```
periodEndSeconds = timed && current_period <= periodCount ? current_period * L : null
isOvertime       = periodEndSeconds != null && clockSeconds > periodEndSeconds
```

## Controls

- **Pause / resume** — the existing tappable Timer card (play/pause icon). Now authoritative: pausing truly stops match time and freezes event-time accrual. This is "stop the half".
- **Edit** — a pencil affordance on the Timer card opens a minimal `mm:ss` setter (forgot to start, sync to the referee, correct drift). Writes via `setTime`.
- **Next half** — existing control; the confirm copy reads "The clock continues into {periodName} {n+1}." in timed mode vs "The clock resets to 00:00." in free mode.

## Event-Log Times

Add `clock_seconds` (INTEGER, nullable) to `events`.

- **On record:** `clock_seconds = clock_active ? clockSeconds(game, now) : null`.
- **On display (`EventLog`):** show `formatTimer(clock_seconds)` when non-null, else fall back to `formatEventTime(timestamp, gameStartedAt)` (today's behaviour).

Events logged before the clock was first started keep the wall-clock fallback; events after use the clock. Mixed within a game is acceptable and correct.

## Period-Length Configuration

- **Settings (default):** a per-sport default length in minutes (`AppSettings.periodLengths?: Partial<Record<Sport, number>>`). Empty/0 = free mode for that sport.
- **Game setup (per game):** a length field beside "Game format", pre-filled from the per-sport default, overridable. Stored in game metadata (`GameMetadata.periodLengthMinutes?`), alongside the existing `periodCount` / `periodName`.

## Architecture & File Structure

- **`src/utils/clock.ts` (new):** pure, fully unit-tested helpers — `clockSeconds(game, now)`, `periodStartMs(period, lengthMin, periodCount)`, `periodEndSeconds(...)`, `isOvertime(...)`, and the transition computations (`computeStart`, `computePause`, `computeSetTime`, `computeNextPeriod`) that each return a `ClockPatch`. No React, `now` injected for testability.
- **`src/db/schema.ts`:** add the new `games` columns and the `events.clock_seconds` column via the existing `addColumn` migration helper.
- **`src/db/queries.ts`:** `updateClock(db, id, patch)`; extend `rowToGame`, `rowToEvent`, `insertEvent`, and the `INSERT`/mapping for the new columns.
- **`src/hooks/useGame.ts`:** own the clock actions (`startClock`/`pauseClock`/`toggleClock`/`setClockSeconds`); `advancePeriod` uses `computeNextPeriod`; `addEvent` snapshots `clock_seconds`; expose a ticking `clockSeconds` via a 1-second interval that runs only while `clock_running` (re-renders for display; never writes).
- **`src/hooks/useTimer.ts`:** removed/retired (superseded by the persisted clock).
- **`src/components/Timer.tsx`:** add `overtime` (red numerals) and `onEdit` props + the edit affordance; keep tap-to-toggle.
- **Clock-edit modal:** minimal `mm:ss` setter (new small component or inline in `LiveGame`).
- **`src/components/EventLog.tsx`:** use `clock_seconds` when present, else wall-clock fallback.
- **`src/screens/GameSetup.tsx`:** length field + write `periodLengthMinutes` into metadata.
- **`src/screens/Settings.tsx`:** per-sport default length controls.
- **`src/utils/settings.ts`:** `periodLengths` in `AppSettings` + load defaults.
- **`src/types/index.ts`:** `Game` clock fields, `GameEvent.clock_seconds`, `GameMetadata.periodLengthMinutes`, `AppSettings.periodLengths`.
- **`src/screens/LiveGame.tsx`:** wire the persisted clock in place of `useTimer`; persist the period label; updated next-half copy; remove `timer.reset()` calls.

## Testing Strategy

TDD the pure helpers in `clock.ts`:
- Elapsed across start → pause → resume (banking is correct, injected `now`).
- Anchored-while-away: running clock with an anchor in the past returns the real elapsed time.
- Timed-mode boundaries: `periodStartMs` parks period N at `(N-1)·L`; extra period resets to 0.
- Overtime threshold flips exactly at `N·L`.
- `computeSetTime` continues from the edited value when running vs paused.
- Event snapshot gating: `null` when `clock_active` is false, clock value when true.

Component tests:
- The `mm:ss` edit setter writes the expected seconds.
- `EventLog` falls back to wall-clock when `clock_seconds` is null and uses the clock when present.
- Timer renders red numerals when `overtime` is true.

## Migration / Backwards Compatibility

- New columns are added by `addColumn`; existing games default to a paused, inactive clock at `00:00`, `current_period = 1`. Legacy event rows have `clock_seconds = null` → wall-clock fallback. No data loss; no behaviour change until the clock is started.
