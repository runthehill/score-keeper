import { describe, it, expect } from 'vitest';
import {
  clockSeconds, periodStartMs, periodEndSeconds, isOvertime,
  computeStart, computePause, computeToggle, computeSetTime, computeNextPeriod,
  type ClockState,
} from './clock';

const paused = (base = 0): ClockState => ({ clock_running: 0, clock_base_ms: base, clock_anchor: null, clock_active: base > 0 ? 1 : 0 });
const running = (anchorMs: number, base = 0): ClockState => ({ clock_running: 1, clock_base_ms: base, clock_anchor: new Date(anchorMs).toISOString(), clock_active: 1 });

describe('clockSeconds', () => {
  it('reads banked time when paused', () => {
    expect(clockSeconds(paused(5000), 999_999)).toBe(5);
  });
  it('adds live elapsed time while running (anchored to wall-clock)', () => {
    const now = 1_000_000;
    expect(clockSeconds(running(now - 120_000), now)).toBe(120); // 2 min elapsed while "away"
  });
  it('adds live time on top of banked base', () => {
    const now = 1_000_000;
    expect(clockSeconds(running(now - 3000, 5000), now)).toBe(8);
  });
});

describe('period boundaries (timed mode)', () => {
  it('parks period N at (N-1)*length', () => {
    expect(periodStartMs(2, 30, 2)).toBe(30 * 60_000);
    expect(periodStartMs(1, 30, 2)).toBe(0);
  });
  it('resets extra periods to 0 even when a length is set', () => {
    expect(periodStartMs(3, 30, 2)).toBe(0);
  });
  it('free mode (no length) always starts at 0', () => {
    expect(periodStartMs(2, null, 2)).toBe(0);
  });
  it('period end is N*length in regulation, null in free mode / extra time', () => {
    expect(periodEndSeconds(1, 30, 2)).toBe(30 * 60);
    expect(periodEndSeconds(2, 30, 2)).toBe(60 * 60);
    expect(periodEndSeconds(3, 30, 2)).toBeNull();
    expect(periodEndSeconds(1, null, 2)).toBeNull();
  });
});

describe('isOvertime', () => {
  it('flips strictly after the period end', () => {
    const now = 0;
    expect(isOvertime(paused(30 * 60 * 1000), now, 1, 30, 2)).toBe(false);       // exactly at end
    expect(isOvertime(paused((30 * 60 + 1) * 1000), now, 1, 30, 2)).toBe(true);  // 1s past
  });
  it('never overtime in free mode', () => {
    expect(isOvertime(paused(99 * 60 * 1000), 0, 1, null, 2)).toBe(false);
  });
});

describe('transitions', () => {
  it('computeStart anchors now and marks active', () => {
    const p = computeStart(paused(0), 1_000_000);
    expect(p).toEqual({ clock_running: 1, clock_anchor: new Date(1_000_000).toISOString(), clock_active: 1 });
  });
  it('computeStart is a no-op when already running', () => {
    expect(computeStart(running(0), 1_000_000)).toEqual({});
  });
  it('computePause banks elapsed and clears the anchor', () => {
    const now = 1_000_000;
    expect(computePause(running(now - 8000, 0), now)).toEqual({ clock_running: 0, clock_anchor: null, clock_base_ms: 8000 });
  });
  it('computeToggle pauses a running clock and starts a paused one', () => {
    const now = 1_000_000;
    expect(computeToggle(running(now - 1000), now).clock_running).toBe(0);
    expect(computeToggle(paused(0), now).clock_running).toBe(1);
  });
  it('computeSetTime sets base and re-anchors only while running', () => {
    const now = 1_000_000;
    expect(computeSetTime(paused(0), 750, now)).toEqual({ clock_base_ms: 750_000, clock_active: 1 });
    expect(computeSetTime(running(0), 750, now)).toEqual({ clock_base_ms: 750_000, clock_active: 1, clock_anchor: new Date(now).toISOString() });
  });
  it('computeNextPeriod parks the clock at the new period start, paused', () => {
    expect(computeNextPeriod(2, 30, 2, null)).toEqual({
      current_period: 2, current_period_label: null,
      clock_running: 0, clock_anchor: null, clock_base_ms: 30 * 60_000,
    });
    expect(computeNextPeriod(3, 30, 2, 'Extra Time')).toEqual({
      current_period: 3, current_period_label: 'Extra Time',
      clock_running: 0, clock_anchor: null, clock_base_ms: 0,
    });
  });
});
