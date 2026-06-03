import type { Database, BindParams, SqlValue } from 'sql.js';
import type { Game, Player, GameEvent, Sport, Team, PlayerStatus } from '../types';
import { DEFAULT_HOME_KIT, DEFAULT_AWAY_KIT } from '../sports/kits';

function rowToGame(row: Record<string, unknown>): Game {
  return {
    id: row.id as string, sport: row.sport as Sport,
    home_team: row.home_team as string, away_team: row.away_team as string,
    home_score: row.home_score as number, away_score: row.away_score as number,
    status: row.status as Game['status'], started_at: row.started_at as string,
    ended_at: (row.ended_at as string) || null, notes: (row.notes as string) || '',
    home_primary: row.home_primary as string, home_secondary: row.home_secondary as string,
    away_primary: row.away_primary as string, away_secondary: row.away_secondary as string,
    clock_running: (row.clock_running as number) ?? 0,
    clock_base_ms: (row.clock_base_ms as number) ?? 0,
    clock_anchor: (row.clock_anchor as string) || null,
    clock_active: (row.clock_active as number) ?? 0,
    current_period: (row.current_period as number) ?? 1,
    current_period_label: (row.current_period_label as string) || null,
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
    clock_seconds: row.clock_seconds == null ? null : (row.clock_seconds as number),
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

export function insertGame(db: Database, game: { id: string; sport: string; home_team: string; away_team: string; started_at: string; notes?: string; home_primary?: string; home_secondary?: string; away_primary?: string; away_secondary?: string }) {
  db.run(
    `INSERT INTO games (id, sport, home_team, away_team, started_at, notes, home_primary, home_secondary, away_primary, away_secondary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [game.id, game.sport, game.home_team, game.away_team, game.started_at, game.notes ?? '',
      game.home_primary ?? DEFAULT_HOME_KIT.primary, game.home_secondary ?? DEFAULT_HOME_KIT.secondary,
      game.away_primary ?? DEFAULT_AWAY_KIT.primary, game.away_secondary ?? DEFAULT_AWAY_KIT.secondary]
  );
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

export function updateGameColors(db: Database, id: string, colors: { home_primary: string; home_secondary: string; away_primary: string; away_secondary: string }) {
  db.run('UPDATE games SET home_primary = ?, home_secondary = ?, away_primary = ?, away_secondary = ? WHERE id = ?',
    [colors.home_primary, colors.home_secondary, colors.away_primary, colors.away_secondary, id]);
}

const CLOCK_COLUMNS = new Set([
  'clock_running', 'clock_base_ms', 'clock_anchor', 'clock_active', 'current_period', 'current_period_label',
]);

export function updateClock(db: Database, id: string, patch: Record<string, unknown>) {
  const cols = Object.keys(patch).filter((c) => CLOCK_COLUMNS.has(c));
  if (cols.length === 0) return;
  const assignments = cols.map((c) => `${c} = ?`).join(', ');
  const values = cols.map((c) => patch[c] as SqlValue);
  db.run(`UPDATE games SET ${assignments} WHERE id = ?`, [...values, id]);
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
  db.run('INSERT INTO events (id, game_id, player_id, team, event_type, points, half_or_period, timestamp, clock_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [event.id, event.game_id, event.player_id, event.team, event.event_type, event.points, event.half_or_period, event.timestamp, event.clock_seconds ?? null]);
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
