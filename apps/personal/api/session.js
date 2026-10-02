import { configured, authorized, passwordMatches, sessionCookie, sameOrigin } from '../server/auth.js';
import { takeLoginAttempt } from '../server/store.js';
import { body, reply } from '../server/http.js';
export default async function handler(req, res) {
  if (!configured()) return reply(res, 503, { error: 'Privater Zugang noch nicht eingerichtet.' });
  if (req.method === 'GET') return reply(res, 200, { authenticated: authorized(req) });
  if (!sameOrigin(req)) return reply(res, 403, { error: 'Ungültige Herkunft' });
  try {
    if (req.method === 'DELETE') { res.setHeader('Set-Cookie', sessionCookie(true)); return reply(res, 200, { ok: true }); }
    if (req.method !== 'POST') return reply(res, 405, { error: 'Methode nicht erlaubt' });
    if (!await takeLoginAttempt()) return reply(res, 429, { error: 'Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.' });
    const data = await body(req, 1024);
    if (!passwordMatches(data.password)) return reply(res, 401, { error: 'Das Passwort stimmt nicht.' });
    res.setHeader('Set-Cookie', sessionCookie());
    return reply(res, 200, { ok: true });
  } catch { return reply(res, 503, { error: 'Anmeldung momentan nicht verfügbar.' }); }
}
