import { mkdirSync } from 'node:fs';
let connection;
export const schema = [
  `CREATE TABLE IF NOT EXISTS coach_state (id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL DEFAULT '{}')`,
  `CREATE TABLE IF NOT EXISTS coach_attempts (id TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, until_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS coach_players (id TEXT PRIMARY KEY, name TEXT NOT NULL, access_hash TEXT NOT NULL UNIQUE, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS coach_rooms (
    id TEXT PRIMARY KEY, host_id TEXT NOT NULL REFERENCES coach_players(id),
    white_id TEXT REFERENCES coach_players(id), black_id TEXT REFERENCES coach_players(id),
    status TEXT NOT NULL DEFAULT 'waiting', moves TEXT NOT NULL DEFAULT '[]',
    version INTEGER NOT NULL DEFAULT 0, result TEXT, reason TEXT, draw_offer TEXT,
    created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL,
    time_mode TEXT NOT NULL DEFAULT 'correspondence', duration_ms BIGINT NOT NULL DEFAULT 259200000,
    white_ms BIGINT NOT NULL DEFAULT 259200000, black_ms BIGINT NOT NULL DEFAULT 259200000,
    turn_started_at BIGINT NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS coach_rooms_white_updated ON coach_rooms (white_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS coach_rooms_black_updated ON coach_rooms (black_id, updated_at)`
];
export async function database() {
  if (connection) return connection;
  if (process.env.DATABASE_URL) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    connection = { query: (query, values = []) => sql.query(query, values) };
  } else {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL fehlt');
    const { DatabaseSync } = await import('node:sqlite');
    mkdirSync('.data', { recursive: true });
    const db = new DatabaseSync(process.env.COACH_TEST_DB || '.data/coach.sqlite');
    db.exec('PRAGMA journal_mode=WAL;');
    for (const query of schema) db.exec(query);
    connection = { query: async (query, values = []) => db.prepare(query).all(Object.fromEntries(values.map((value,i)=>[String(i+1),value]))) };
  }
  return connection;
}
export async function readState(playerId = 'personal') {
  const db = await database();
  const rows = await db.query('SELECT revision, data FROM coach_state WHERE id = $1', [playerId]);
  return rows[0] ? { revision: rows[0].revision, data: JSON.parse(rows[0].data) } : { revision: 0, data: {} };
}
export async function writeState(revision, data, playerId = 'personal') {
  const db = await database();
  // Compare-and-swap: an old tab can never silently overwrite a newer save.
  const rows = revision === 0
    ? await db.query('INSERT INTO coach_state (id, revision, data) VALUES ($1, 1, $2) ON CONFLICT (id) DO NOTHING RETURNING revision', [playerId, JSON.stringify(data)])
    : await db.query('UPDATE coach_state SET data = $1, revision = revision + 1 WHERE id = $2 AND revision = $3 RETURNING revision', [JSON.stringify(data), playerId, revision]);
  return rows[0]?.revision ?? null;
}
export async function takeAttempt(key = 'login', limit = 20, windowMs = 15 * 60 * 1000) {
  const db = await database(), now = Date.now();
  const rows = await db.query(`INSERT INTO coach_attempts (id, attempts, until_at) VALUES ($1, 1, $2)
    ON CONFLICT (id) DO UPDATE SET
    attempts = CASE WHEN coach_attempts.until_at < $3 THEN 1 ELSE coach_attempts.attempts + 1 END,
    until_at = CASE WHEN coach_attempts.until_at < $3 THEN $2 ELSE coach_attempts.until_at END
    RETURNING attempts`, [key, now + windowMs, now]);
  return rows[0].attempts <= limit;
}
export const takeLoginAttempt = () => takeAttempt();
