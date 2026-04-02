import { describe, it, expect } from 'vitest';
import { formatScore, formatGaelicScore, formatTimer, formatEventTime } from './format';
import { GameEvent } from '../types';

describe('formatScore', () => {
  it('formats single score as plain number', () => {
    expect(formatScore('single', 21, [])).toBe('21');
  });

  it('formats gaelic split score as goals-points', () => {
    const events: Pick<GameEvent, 'event_type' | 'team'>[] = [
      { event_type: 'goal', team: 'home' },
      { event_type: 'point', team: 'home' },
      { event_type: 'point', team: 'home' },
      { event_type: 'point', team: 'home' },
      { event_type: 'point', team: 'home' },
      { event_type: 'point', team: 'home' },
    ];
    expect(formatGaelicScore(events, 'home')).toBe('1-05');
  });

  it('pads gaelic points to two digits', () => {
    const events: Pick<GameEvent, 'event_type' | 'team'>[] = [
      { event_type: 'point', team: 'home' },
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
