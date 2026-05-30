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
