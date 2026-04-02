import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs, { Database } from 'sql.js';
import { createTables } from './schema';
import {
  insertGame, getGame, listGames, updateGameScore, endGame,
  insertPlayer, listPlayers, updatePlayerStatus,
  insertEvent, listEvents, deleteEvent, getLastEvent,
} from './queries';

let db: Database;

beforeEach(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  createTables(db);
});

describe('games', () => {
  it('inserts and retrieves a game', () => {
    insertGame(db, { id: 'g1', sport: 'rugby_union', home_team: "St Mary's", away_team: 'Blackrock', started_at: '2026-04-02T10:00:00.000Z' });
    const game = getGame(db, 'g1');
    expect(game).toBeDefined();
    expect(game!.sport).toBe('rugby_union');
    expect(game!.home_score).toBe(0);
    expect(game!.status).toBe('in_progress');
  });

  it('lists games by most recent first', () => {
    insertGame(db, { id: 'g1', sport: 'soccer', home_team: 'A', away_team: 'B', started_at: '2026-04-01T10:00:00.000Z' });
    insertGame(db, { id: 'g2', sport: 'soccer', home_team: 'C', away_team: 'D', started_at: '2026-04-02T10:00:00.000Z' });
    const games = listGames(db);
    expect(games).toHaveLength(2);
    expect(games[0].id).toBe('g2');
  });

  it('lists games filtered by sport', () => {
    insertGame(db, { id: 'g1', sport: 'soccer', home_team: 'A', away_team: 'B', started_at: '2026-04-01T10:00:00.000Z' });
    insertGame(db, { id: 'g2', sport: 'basketball', home_team: 'C', away_team: 'D', started_at: '2026-04-02T10:00:00.000Z' });
    const games = listGames(db, 'soccer');
    expect(games).toHaveLength(1);
    expect(games[0].sport).toBe('soccer');
  });

  it('updates cached score', () => {
    insertGame(db, { id: 'g1', sport: 'rugby_union', home_team: 'A', away_team: 'B', started_at: '2026-04-02T10:00:00.000Z' });
    updateGameScore(db, 'g1', 21, 14);
    const game = getGame(db, 'g1');
    expect(game!.home_score).toBe(21);
    expect(game!.away_score).toBe(14);
  });

  it('ends a game', () => {
    insertGame(db, { id: 'g1', sport: 'soccer', home_team: 'A', away_team: 'B', started_at: '2026-04-02T10:00:00.000Z' });
    endGame(db, 'g1', '2026-04-02T11:30:00.000Z');
    const game = getGame(db, 'g1');
    expect(game!.status).toBe('completed');
    expect(game!.ended_at).toBe('2026-04-02T11:30:00.000Z');
  });
});

describe('players', () => {
  beforeEach(() => {
    insertGame(db, { id: 'g1', sport: 'rugby_union', home_team: 'A', away_team: 'B', started_at: '2026-04-02T10:00:00.000Z' });
  });

  it('inserts and lists players for a game', () => {
    insertPlayer(db, { id: 'p1', game_id: 'g1', team: 'home', name: 'John', number: 10, status: 'active' });
    insertPlayer(db, { id: 'p2', game_id: 'g1', team: 'away', name: 'Mike', number: 7, status: 'active' });
    expect(listPlayers(db, 'g1')).toHaveLength(2);
  });

  it('filters players by team', () => {
    insertPlayer(db, { id: 'p1', game_id: 'g1', team: 'home', name: 'John', number: 10, status: 'active' });
    insertPlayer(db, { id: 'p2', game_id: 'g1', team: 'away', name: 'Mike', number: 7, status: 'active' });
    const homePlayers = listPlayers(db, 'g1', 'home');
    expect(homePlayers).toHaveLength(1);
    expect(homePlayers[0].name).toBe('John');
  });

  it('updates player status', () => {
    insertPlayer(db, { id: 'p1', game_id: 'g1', team: 'home', name: 'John', number: 10, status: 'active' });
    updatePlayerStatus(db, 'p1', 'subbed_off');
    expect(listPlayers(db, 'g1')[0].status).toBe('subbed_off');
  });
});

describe('events', () => {
  beforeEach(() => {
    insertGame(db, { id: 'g1', sport: 'rugby_union', home_team: 'A', away_team: 'B', started_at: '2026-04-02T10:00:00.000Z' });
  });

  it('inserts and lists events', () => {
    insertEvent(db, { id: 'e1', game_id: 'g1', player_id: null, team: 'home', event_type: 'try', points: 5, half_or_period: 1, timestamp: '2026-04-02T10:15:00.000Z' });
    const events = listEvents(db, 'g1');
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('try');
  });

  it('lists events in chronological order', () => {
    insertEvent(db, { id: 'e1', game_id: 'g1', player_id: null, team: 'home', event_type: 'try', points: 5, half_or_period: 1, timestamp: '2026-04-02T10:15:00.000Z' });
    insertEvent(db, { id: 'e2', game_id: 'g1', player_id: null, team: 'away', event_type: 'penalty', points: 3, half_or_period: 1, timestamp: '2026-04-02T10:20:00.000Z' });
    const events = listEvents(db, 'g1');
    expect(events[0].id).toBe('e1');
    expect(events[1].id).toBe('e2');
  });

  it('deletes an event', () => {
    insertEvent(db, { id: 'e1', game_id: 'g1', player_id: null, team: 'home', event_type: 'try', points: 5, half_or_period: 1, timestamp: '2026-04-02T10:15:00.000Z' });
    deleteEvent(db, 'e1');
    expect(listEvents(db, 'g1')).toHaveLength(0);
  });

  it('gets the last event', () => {
    insertEvent(db, { id: 'e1', game_id: 'g1', player_id: null, team: 'home', event_type: 'try', points: 5, half_or_period: 1, timestamp: '2026-04-02T10:15:00.000Z' });
    insertEvent(db, { id: 'e2', game_id: 'g1', player_id: null, team: 'away', event_type: 'penalty', points: 3, half_or_period: 1, timestamp: '2026-04-02T10:20:00.000Z' });
    const last = getLastEvent(db, 'g1');
    expect(last!.id).toBe('e2');
  });
});
