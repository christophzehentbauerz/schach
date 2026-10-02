import { mkdirSync } from 'node:fs';
let connection;
export const schema = [
  `CREATE TABLE IF NOT EXISTS coach_state (id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL DEFAULT '{}')`,
  `CREATE TABLE IF NOT EXISTS coach_attempts (id TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, until_at BIGINT NOT NULL)`
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
export async function readState() {
  const db = await database();
  const rows = await db.query('SELECT revision, data FROM coach_state WHERE id = $1', ['personal']);
  return rows[0] ? { revision: rows[0].revision, data: JSON.parse(rows[0].data) } : { revision: 0, data: {} };
}
export async function writeState(revision, data) {
  const db = await database();
  // Compare-and-swap: an old tab can never silently overwrite a newer save.
  const rows = revision === 0
    ? await db.query('INSERT INTO coach_state (id, revision, data) VALUES ($1, 1, $2) ON CONFLICT (id) DO NOTHING RETURNING revision', ['personal', JSON.stringify(data)])
    : await db.query('UPDATE coach_state SET data = $1, revision = revision + 1 WHERE id = $2 AND revision = $3 RETURNING revision', [JSON.stringify(data), 'personal', revision]);
  return rows[0]?.revision ?? null;
}
export async function takeLoginAttempt() {
  const db = await database(), now = Date.now();
  const rows = await db.query(`INSERT INTO coach_attempts (id, attempts, until_at) VALUES ($1, 1, $2)
    ON CONFLICT (id) DO UPDATE SET
    attempts = CASE WHEN coach_attempts.until_at < $3 THEN 1 ELSE coach_attempts.attempts + 1 END,
    until_at = CASE WHEN coach_attempts.until_at < $3 THEN $2 ELSE coach_attempts.until_at END
    RETURNING attempts`, ['login', now + 15 * 60 * 1000, now]);
  return rows[0].attempts <= 20;
}
