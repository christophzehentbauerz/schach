import { authorized, configured, sameOrigin, localMode } from '../server/auth.js';
import { body, reply, validateState } from '../server/http.js';
import { readState, writeState } from '../server/store.js';
export default async function handler(req, res) {
  if (!configured()) return reply(res, 503, { error: 'Der private Speicher ist noch nicht eingerichtet.' });
  if (!authorized(req)) return reply(res, 401, { error: 'Bitte anmelden.' });
  try {
    if (req.method === 'GET') return reply(res, 200, { ...await readState(), storage: localMode() ? 'computer' : 'cloud' });
    if (req.method !== 'PUT') return reply(res, 405, { error: 'Methode nicht erlaubt' });
    if (!sameOrigin(req)) return reply(res, 403, { error: 'Ungültige Herkunft' });
    let input;
    try { input = validateState(await body(req)); } catch (error) { return reply(res, 400, { error: error.message }); }
    const revision = await writeState(input.revision, input.data);
    if (revision === null) return reply(res, 409, { error: 'Auf einem anderen Gerät liegt ein neuerer Spielstand vor.' });
    return reply(res, 200, { revision });
  } catch (error) {
    console.error('Storage unavailable:', error.message);
    return reply(res, 503, { error: 'Speichern gerade nicht erreichbar. Deine Änderungen bleiben zur erneuten Übertragung vorgemerkt.' });
  }
}
