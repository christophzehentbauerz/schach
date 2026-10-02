import { createHmac, timingSafeEqual, scryptSync } from 'node:crypto';
export const localMode = () => !process.env.VERCEL && process.env.NODE_ENV !== 'production';
const sign = value => createHmac('sha256', process.env.SESSION_SECRET).update(value).digest('base64url');
export function configured() { return localMode() || (process.env.SESSION_SECRET?.length >= 32 && !!process.env.PASSWORD_HASH && !!process.env.DATABASE_URL); }
export function authorized(req) {
  if (localMode()) return true;
  if (!configured()) return false;
  const token = String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('coach_session='))?.slice(14);
  if (!token) return false;
  const [expiry, signature] = token.split('.');
  if (!/^\d+$/.test(expiry) || Number(expiry) < Date.now() || !signature) return false;
  const expected = sign(expiry);
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
export function passwordMatches(password) {
  const [salt, hash] = String(process.env.PASSWORD_HASH || '').split(':');
  if (!salt || !/^[a-f0-9]{128}$/i.test(hash || '') || typeof password !== 'string' || password.length > 256) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}
export function sessionCookie(clear = false) {
  const expiry = String(Date.now() + 30 * 86400000);
  return `coach_session=${clear ? '' : expiry + '.' + sign(expiry)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${clear ? 0 : 30 * 86400}`;
}
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}
