import type { Database } from 'sql.js';

// NOTE: `table` / `column` are interpolated into the SQL (PRAGMA and ALTER don't
// accept bound params). All call sites below pass hardcoded literals — never user
// input — so there is no injection surface. Keep it that way.
function hasColumn(db: Database, table: string, column: string): boolean {
  const stmt = db.prepare(`PRAGMA table_info(${table})`);
  let found = false;
  while (stmt.step()) {
    if ((stmt.getAsObject().name as string) === column) found = true;
  }
  stmt.free();
  return found;
}

function addColumn(db: Database, table: string, column: string, ddl: string): void {
  if (!hasColumn(db, table, column)) db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

export function createTables(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      sport TEXT NOT NULL,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      home_score INTEGER NOT NULL DEFAULT 0,
      away_score INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress',
      started_at TEXT NOT NULL,
      ended_at TEXT,
      notes TEXT NOT NULL DEFAULT '',
      home_primary TEXT NOT NULL DEFAULT '#15171C',
      home_secondary TEXT NOT NULL DEFAULT '#FFFFFF',
      away_primary TEXT NOT NULL DEFAULT '#1E63D6',
      away_secondary TEXT NOT NULL DEFAULT '#FFFFFF',
      clock_running INTEGER NOT NULL DEFAULT 0,
      clock_base_ms INTEGER NOT NULL DEFAULT 0,
      clock_anchor TEXT,
      clock_active INTEGER NOT NULL DEFAULT 0,
      current_period INTEGER NOT NULL DEFAULT 1,
      current_period_label TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id),
      team TEXT NOT NULL,
      name TEXT NOT NULL,
      number INTEGER,
      status TEXT NOT NULL DEFAULT 'active'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id),
      player_id TEXT REFERENCES players(id),
      team TEXT NOT NULL,
      event_type TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      half_or_period INTEGER NOT NULL DEFAULT 1,
      timestamp TEXT NOT NULL,
      clock_seconds INTEGER
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_events_game ON events(game_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_players_game ON players(game_id)');

  // Migration: existing DBs already have a `games` table without the colour columns
  // (CREATE TABLE IF NOT EXISTS is a no-op for them), so add them if missing.
  addColumn(db, 'games', 'home_primary', "TEXT NOT NULL DEFAULT '#15171C'");
  addColumn(db, 'games', 'home_secondary', "TEXT NOT NULL DEFAULT '#FFFFFF'");
  addColumn(db, 'games', 'away_primary', "TEXT NOT NULL DEFAULT '#1E63D6'");
  addColumn(db, 'games', 'away_secondary', "TEXT NOT NULL DEFAULT '#FFFFFF'");

  // Migration: persisted match-clock state (older DBs predate these columns).
  addColumn(db, 'games', 'clock_running', 'INTEGER NOT NULL DEFAULT 0');
  addColumn(db, 'games', 'clock_base_ms', 'INTEGER NOT NULL DEFAULT 0');
  addColumn(db, 'games', 'clock_anchor', 'TEXT');
  addColumn(db, 'games', 'clock_active', 'INTEGER NOT NULL DEFAULT 0');
  addColumn(db, 'games', 'current_period', 'INTEGER NOT NULL DEFAULT 1');
  addColumn(db, 'games', 'current_period_label', 'TEXT');
  addColumn(db, 'events', 'clock_seconds', 'INTEGER');
}
