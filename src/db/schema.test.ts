import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import { createTables } from './schema';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
beforeEach(async () => { SQL = await initSqlJs(); });

function colorsOf(db: Database, id: string) {
  const stmt = db.prepare('SELECT home_primary, home_secondary, away_primary, away_secondary FROM games WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

describe('schema team-colour migration', () => {
  it('fresh DB has colour columns with defaults', () => {
    const db = new SQL.Database();
    createTables(db);
    db.run("INSERT INTO games (id, sport, home_team, away_team, started_at) VALUES ('g1','soccer','A','B','2026-01-01T00:00:00Z')");
    expect(colorsOf(db, 'g1')).toEqual({
      home_primary: '#15171C', home_secondary: '#FFFFFF', away_primary: '#1E63D6', away_secondary: '#FFFFFF',
    });
  });

  it('migrates an existing DB lacking the colour columns and backfills defaults', () => {
    const db = new SQL.Database();
    db.run(`CREATE TABLE games (id TEXT PRIMARY KEY, sport TEXT NOT NULL, home_team TEXT NOT NULL, away_team TEXT NOT NULL, home_score INTEGER NOT NULL DEFAULT 0, away_score INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'in_progress', started_at TEXT NOT NULL, ended_at TEXT, notes TEXT NOT NULL DEFAULT '')`);
    db.run("INSERT INTO games (id, sport, home_team, away_team, started_at) VALUES ('old','rugby_union','X','Y','2026-01-01T00:00:00Z')");
    createTables(db); // runs the migration
    expect(colorsOf(db, 'old')).toEqual({
      home_primary: '#15171C', home_secondary: '#FFFFFF', away_primary: '#1E63D6', away_secondary: '#FFFFFF',
    });
  });
});

describe('schema clock migration', () => {
  function clockOf(db: Database, id: string) {
    const stmt = db.prepare('SELECT clock_running, clock_base_ms, clock_anchor, clock_active, current_period, current_period_label FROM games WHERE id = ?');
    stmt.bind([id]);
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }

  it('fresh DB has clock columns with defaults', () => {
    const db = new SQL.Database();
    createTables(db);
    db.run("INSERT INTO games (id, sport, home_team, away_team, started_at) VALUES ('g1','soccer','A','B','2026-01-01T00:00:00Z')");
    expect(clockOf(db, 'g1')).toEqual({
      clock_running: 0, clock_base_ms: 0, clock_anchor: null, clock_active: 0, current_period: 1, current_period_label: null,
    });
  });

  it('adds events.clock_seconds (null by default)', () => {
    const db = new SQL.Database();
    createTables(db);
    db.run("INSERT INTO games (id, sport, home_team, away_team, started_at) VALUES ('g1','soccer','A','B','2026-01-01T00:00:00Z')");
    db.run("INSERT INTO events (id, game_id, team, event_type, points, half_or_period, timestamp) VALUES ('e1','g1','home','goal',1,1,'2026-01-01T00:01:00Z')");
    const stmt = db.prepare('SELECT clock_seconds FROM events WHERE id = ?');
    stmt.bind(['e1']);
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    expect(row.clock_seconds).toBeNull();
  });

  it('migrates a legacy DB lacking the clock columns', () => {
    const db = new SQL.Database();
    db.run(`CREATE TABLE games (id TEXT PRIMARY KEY, sport TEXT NOT NULL, home_team TEXT NOT NULL, away_team TEXT NOT NULL, home_score INTEGER NOT NULL DEFAULT 0, away_score INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'in_progress', started_at TEXT NOT NULL, ended_at TEXT, notes TEXT NOT NULL DEFAULT '')`);
    db.run("INSERT INTO games (id, sport, home_team, away_team, started_at) VALUES ('old','rugby_union','X','Y','2026-01-01T00:00:00Z')");
    createTables(db); // runs the migration
    expect(clockOf(db, 'old')).toEqual({
      clock_running: 0, clock_base_ms: 0, clock_anchor: null, clock_active: 0, current_period: 1, current_period_label: null,
    });
  });
});
