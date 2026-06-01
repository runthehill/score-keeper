import { describe, it, expect } from 'vitest';
import { formatScore, formatGaelicScore, formatTimer, formatEventTime, formatRelativeDay } from './format';
import type { GameEvent } from '../types';

describe('formatScore', () => {
  it('formats single score as plain number', () => {
    expect(formatScore('single', 21, [])).toBe('21');
  });

  it('formats gaelic split score as goals-points', () => {
    const events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[] = [
      { event_type: 'goal', team: 'home', points: 3 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
    ];
    expect(formatGaelicScore(events, 'home')).toBe('1-05');
  });

  it('counts a two-pointer as 2 in the points figure', () => {
    const events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[] = [
      { event_type: 'goal', team: 'home', points: 3 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'two_pointer', team: 'home', points: 2 },
    ];
    expect(formatGaelicScore(events, 'home')).toBe('1-07');
  });

  it('ignores non-goal events with zero points (cards, subs)', () => {
    const events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[] = [
      { event_type: 'point', team: 'home', points: 1 },
      { event_type: 'card_black', team: 'home', points: 0 },
      { event_type: 'substitution_on', team: 'home', points: 0 },
    ];
    expect(formatGaelicScore(events, 'home')).toBe('0-01');
  });

  it('pads gaelic points to two digits', () => {
    const events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[] = [
      { event_type: 'point', team: 'home', points: 1 },
    ];
    expect(formatGaelicScore(events, 'home')).toBe('0-01');
  });

  it('handles zero gaelic score', () => {
    expect(formatGaelicScore([], 'home')).toBe('0-00');
  });
});

describe('formatTimer', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatTimer(0)).toBe('00:00');
  });

  it('formats 65 seconds as 01:05', () => {
    expect(formatTimer(65)).toBe('01:05');
  });

  it('formats 3661 seconds as 61:01', () => {
    expect(formatTimer(3661)).toBe('61:01');
  });
});

describe('formatEventTime', () => {
  it('formats ISO timestamp to mm:ss from game start', () => {
    const start = '2026-04-02T10:00:00.000Z';
    const event = '2026-04-02T10:32:15.000Z';
    expect(formatEventTime(event, start)).toBe("32:15");
  });
});

describe('formatRelativeDay', () => {
  it('returns Today for now', () => {
    expect(formatRelativeDay(new Date().toISOString())).toBe('Today');
  });
  it('returns Yesterday for ~1 day ago', () => {
    expect(formatRelativeDay(new Date(Date.now() - (86400000 + 2 * 3600000)).toISOString())).toBe('Yesterday');
  });
  it('returns "N days ago" within a week', () => {
    expect(formatRelativeDay(new Date(Date.now() - (3 * 86400000 + 2 * 3600000)).toISOString())).toBe('3 days ago');
  });
  it('returns a dated string beyond a week', () => {
    const out = formatRelativeDay(new Date(Date.now() - 40 * 86400000).toISOString());
    expect(out).toMatch(/\d{4}/);
  });
});

describe('formatGaelicScore', () => {
  const ev = (event_type: string, points: number) => ({ event_type, team: 'home' as const, points });
  it('shows goals-points and is unaffected by a wide (0 pts)', () => {
    const base = [ev('goal', 3), ev('point', 1), ev('two_pointer', 2)];
    expect(formatGaelicScore(base, 'home')).toBe('1-03');
    expect(formatGaelicScore([...base, ev('wide', 0)], 'home')).toBe('1-03');
  });
});
