import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { database } from './store.js';
const hash = token => createHash('sha256').update(token).digest('hex');
export function validName(value) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 2 || name.length > 30 || /[\x00-\x1f<>]/.test(name)) throw new Error('Bitte einen Namen mit 2–30 Zeichen eingeben.');
  return name;
}
export async function getPlayer(id) {
  if (!id) return null;
  const db = await database(), rows = await db.query('SELECT id,name FROM coach_players WHERE id=$1', [id]);
  return rows[0] || null;
}
export async function createPlayer(name) {
  const db = await database(), token = randomBytes(32).toString('base64url'), id = randomUUID();
  name = validName(name);
  await db.query('INSERT INTO coach_players (id,name,access_hash,created_at) VALUES ($1,$2,$3,$4) RETURNING id', [id, name, hash(token), Date.now()]);
  return { user: { id, name }, token };
}
export async function redeemLink(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const db = await database(), rows = await db.query('SELECT id,name FROM coach_players WHERE access_hash=$1', [hash(token)]);
  return rows[0] || null;
}
export async function replaceLink(id) {
  const db = await database(), token = randomBytes(32).toString('base64url');
  const rows = await db.query('UPDATE coach_players SET access_hash=$1 WHERE id=$2 RETURNING id', [hash(token), id]);
  if (!rows.length) throw new Error('Profil nicht gefunden.');
  return token;
}
