import { describe, it, expect } from 'vitest';
import { buildShareModel } from './shareCard';
import { getSportConfig } from '../sports/configs';
import type { Game, GameEvent } from '../types';

function game(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1', sport: 'gaelic_football', home_team: 'Coolera', away_team: 'Tourlestrane',
    home_score: 0, away_score: 0, status: 'completed',
    started_at: '2026-05-29T12:00:00.000Z', ended_at: null, notes: '',
    ...overrides,
  };
}

const ev = (event_type: string, team: 'home' | 'away', points: number): Pick<GameEvent, 'event_type' | 'team' | 'points'> =>
  ({ event_type, team, points });

describe('buildShareModel', () => {
  it('builds a Gaelic final with goals-points scores and a winner', () => {
    const g = game({ home_score: 15, away_score: 11 });
    const events = [ev('goal', 'home', 3), ev('point', 'home', 1), ev('two_pointer', 'home', 2), ev('point', 'away', 1)];
    const m = buildShareModel(g, events, getSportConfig('gaelic_football'), { variant: 'final' });
    expect(m.isLive).toBe(false);
    expect(m.statusLabel).toBe('FULL TIME');
    expect(m.home.score).toBe('1-03');
    expect(m.away.score).toBe('0-01');
    expect(m.home.isWinner).toBe(true);
    expect(m.away.isWinner).toBe(false);
    expect(m.isDraw).toBe(false);
    expect(m.dateLabel).toBe('29 May 2026');
    expect(m.sport).toBe('Gaelic Football');
  });

  it('uses integer scores for single-score sports', () => {
    const g = game({ sport: 'soccer', home_score: 2, away_score: 1 });
    const events = [ev('goal', 'home', 1), ev('goal', 'home', 1), ev('goal', 'away', 1)];
    const m = buildShareModel(g, events, getSportConfig('soccer'), { variant: 'final' });
    expect(m.home.score).toBe('2');
    expect(m.away.score).toBe('1');
    expect(m.home.isWinner).toBe(true);
  });

  it('marks a draw with no winner', () => {
    const g = game({ sport: 'soccer', home_score: 1, away_score: 1 });
    const m = buildShareModel(g, [ev('goal', 'home', 1), ev('goal', 'away', 1)], getSportConfig('soccer'), { variant: 'final' });
    expect(m.isDraw).toBe(true);
    expect(m.statusLabel).toBe('DRAW');
    expect(m.home.isWinner).toBe(false);
    expect(m.away.isWinner).toBe(false);
  });

  it('builds a live model with the period label and no winner', () => {
    const g = game({ home_score: 8, away_score: 7 });
    const m = buildShareModel(g, [], getSportConfig('gaelic_football'), { variant: 'live', periodLabel: 'Half 2' });
    expect(m.isLive).toBe(true);
    expect(m.statusLabel).toBe('Half 2');
    expect(m.home.isWinner).toBe(false);
    expect(m.away.isWinner).toBe(false);
    expect(m.isDraw).toBe(false);
  });
});
