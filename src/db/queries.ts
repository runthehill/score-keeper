import type { Database, BindParams } from 'sql.js';
import type { Game, Player, GameEvent, Sport, Team, PlayerStatus } from '../types';

function rowToGame(row: Record<string, unknown>): Game {
  return {
    id: row.id as string, sport: row.sport as Sport,
    home_team: row.home_team as string, away_team: row.away_team as string,
    home_score: row.home_score as number, away_score: row.away_score as number,
    status: row.status as Game['status'], started_at: row.started_at as string,
    ended_at: (row.ended_at as string) || null, notes: (row.notes as string) || '',
  };
}

function rowToPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string, game_id: row.game_id as string, team: row.team as Team,
    name: row.name as string, number: row.number as number | null, status: row.status as PlayerStatus,
  };
}

function rowToEvent(row: Record<string, unknown>): GameEvent {
  return {
    id: row.id as string, game_id: row.game_id as string,
    player_id: (row.player_id as string) || null, team: row.team as Team,
    event_type: row.event_type as string, points: row.points as number,
    half_or_period: row.half_or_period as number, timestamp: row.timestamp as string,
  };
}

function query<T>(db: Database, sql: string, params: BindParams, mapper: (row: Record<string, unknown>) => T): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) { results.push(mapper(stmt.getAsObject())); }
  stmt.free();
  return results;
}

export function insertGame(db: Database, game: { id: string; sport: string; home_team: string; away_team: string; started_at: string; notes?: string }) {
  db.run('INSERT INTO games (id, sport, home_team, away_team, started_at, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [game.id, game.sport, game.home_team, game.away_team, game.started_at, game.notes ?? '']);
}

export function getGame(db: Database, id: string): Game | undefined {
  return query(db, 'SELECT * FROM games WHERE id = ?', [id], rowToGame)[0];
}

export function listGames(db: Database, sport?: Sport): Game[] {
  if (sport) return query(db, 'SELECT * FROM games WHERE sport = ? ORDER BY started_at DESC', [sport], rowToGame);
  return query(db, 'SELECT * FROM games ORDER BY started_at DESC', [], rowToGame);
}

export function updateGameScore(db: Database, id: string, homeScore: number, awayScore: number) {
  db.run('UPDATE games SET home_score = ?, away_score = ? WHERE id = ?', [homeScore, awayScore, id]);
}

export function endGame(db: Database, id: string, endedAt: string) {
  db.run("UPDATE games SET status = 'completed', ended_at = ? WHERE id = ?", [endedAt, id]);
}

export function insertPlayer(db: Database, player: Player) {
  db.run('INSERT INTO players (id, game_id, team, name, number, status) VALUES (?, ?, ?, ?, ?, ?)',
    [player.id, player.game_id, player.team, player.name, player.number, player.status]);
}

export function listPlayers(db: Database, gameId: string, team?: Team): Player[] {
  if (team) return query(db, 'SELECT * FROM players WHERE game_id = ? AND team = ? ORDER BY number', [gameId, team], rowToPlayer);
  return query(db, 'SELECT * FROM players WHERE game_id = ? ORDER BY team, number', [gameId], rowToPlayer);
}

export function updatePlayerStatus(db: Database, id: string, status: PlayerStatus) {
  db.run('UPDATE players SET status = ? WHERE id = ?', [status, id]);
}

export function insertEvent(db: Database, event: GameEvent) {
  db.run('INSERT INTO events (id, game_id, player_id, team, event_type, points, half_or_period, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [event.id, event.game_id, event.player_id, event.team, event.event_type, event.points, event.half_or_period, event.timestamp]);
}

export function listEvents(db: Database, gameId: string): GameEvent[] {
  return query(db, 'SELECT * FROM events WHERE game_id = ? ORDER BY timestamp ASC', [gameId], rowToEvent);
}

export function deleteEvent(db: Database, id: string) {
  db.run('DELETE FROM events WHERE id = ?', [id]);
}

export function getLastEvent(db: Database, gameId: string): GameEvent | undefined {
  return query(db, 'SELECT * FROM events WHERE game_id = ? ORDER BY timestamp DESC LIMIT 1', [gameId], rowToEvent)[0];
}
