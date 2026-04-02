import { describe, it, expect } from 'vitest';
import { exportGameCSV, exportGameJSON } from './export';
import type { Game, Player, GameEvent } from '../types';

const game: Game = {
  id: 'g1',
  sport: 'rugby_union',
  home_team: "St Mary's",
  away_team: 'Blackrock',
  home_score: 21,
  away_score: 14,
  status: 'completed',
  started_at: '2026-04-02T10:00:00.000Z',
  ended_at: '2026-04-02T11:20:00.000Z',
  notes: '',
};

const players: Player[] = [
  { id: 'p1', game_id: 'g1', team: 'home', name: 'John', number: 10, status: 'active' },
];

const events: GameEvent[] = [
  { id: 'e1', game_id: 'g1', player_id: 'p1', team: 'home', event_type: 'try', points: 5, half_or_period: 1, timestamp: '2026-04-02T10:15:00.000Z' },
  { id: 'e2', game_id: 'g1', player_id: null, team: 'away', event_type: 'penalty', points: 3, half_or_period: 1, timestamp: '2026-04-02T10:20:00.000Z' },
];

describe('exportGameCSV', () => {
  it('produces header row and one row per event', () => {
    const csv = exportGameCSV(game, events, players);
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('game_id');
    expect(lines[1]).toContain("St Mary's");
    expect(lines[1]).toContain('try');
    expect(lines[1]).toContain('John');
    expect(lines[2]).toContain('penalty');
  });
});

describe('exportGameJSON', () => {
  it('produces valid JSON with game, players, and events', () => {
    const json = exportGameJSON(game, events, players);
    const parsed = JSON.parse(json);
    expect(parsed.game.id).toBe('g1');
    expect(parsed.players).toHaveLength(1);
    expect(parsed.events).toHaveLength(2);
  });
});
