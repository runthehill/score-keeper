import { describe, it, expect } from 'vitest';
import { computeBoxScore } from './boxScore';
import type { GameEvent, Player } from '../types';

const P = (id: string, team: 'home' | 'away', name: string): Player =>
  ({ id, game_id: 'g', team, name, number: null, status: 'active', sort_order: 0 });

const E = (team: 'home' | 'away', type: string, points: number, player_id: string | null): GameEvent =>
  ({ id: Math.random().toString(), game_id: 'g', player_id, team, event_type: type, points, half_or_period: 1, timestamp: '2026-07-03T00:00:00.000Z' });

describe('computeBoxScore', () => {
  it('computes made-attempts, rebounds, points and per-player rows', () => {
    const players = [P('p1', 'home', 'Aoife')];
    const events = [
      E('home', 'field_goal', 2, 'p1'),
      E('home', 'field_goal', 2, 'p1'),
      E('home', 'field_goal', 2, 'p1'),
      E('home', 'field_goal_miss', 0, 'p1'),
      E('home', 'field_goal_miss', 0, 'p1'),
      E('home', 'three_pointer', 3, 'p1'),
      E('home', 'off_rebound', 0, 'p1'),
      E('home', 'turnover', 0, 'p1'),
    ];
    const box = computeBoxScore(events, players);
    const line = box.home.rows[0].line;
    expect(line.twoM).toBe(3);
    expect(line.twoA).toBe(5);
    expect(line.threeM).toBe(1);
    expect(line.threeA).toBe(1);
    expect(line.orb).toBe(1);
    expect(line.to).toBe(1);
    expect(line.pts).toBe(9);
  });

  it('team totals include unattributed events; away rows list rostered players', () => {
    const players = [P('p1', 'home', 'Aoife'), P('a1', 'away', 'Zoe')];
    const events = [
      E('home', 'free_throw', 1, 'p1'),
      E('home', 'free_throw', 1, null), // unattributed — counts to team total only
    ];
    const box = computeBoxScore(events, players);
    expect(box.home.rows[0].line.ftM).toBe(1); // player row: only attributed
    expect(box.home.total.ftM).toBe(2);        // team total: both
    expect(box.away.rows).toHaveLength(1);
    expect(box.away.total.pts).toBe(0);
  });
});
