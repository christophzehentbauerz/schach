import { identity, configured, sameOrigin, localMode } from '../server/identity.js';
import { getPlayer } from '../server/players.js';
import { body, reply, validateState } from '../server/http.js';
import { readState, writeState } from '../server/store.js';
export default async function handler(req, res) {
  if (!configured()) return reply(res, 503, { error: 'Der private Speicher ist noch nicht eingerichtet.' });
  try {
    const user=await getPlayer(identity(req));
    if (!user) return reply(res, 401, { error: 'Bitte deinen Zugangslink öffnen oder ein Profil anlegen.' });
    if (req.method === 'GET') return reply(res, 200, { ...await readState(user.id), user, storage: localMode() ? 'computer' : 'cloud' });
    if (req.method !== 'PUT') return reply(res, 405, { error: 'Methode nicht erlaubt' });
    if (!sameOrigin(req)) return reply(res, 403, { error: 'Ungültige Herkunft' });
    let input;
    try { input = validateState(await body(req)); } catch (error) { return reply(res, 400, { error: error.message }); }
    if(input.userId!==user.id)return reply(res,409,{error:'Das geöffnete Profil hat sich geändert. Bitte neu laden; ungesendete Änderungen bleiben im ursprünglichen Profil.'});
    const revision = await writeState(input.revision, input.data, user.id);
    if (revision === null) return reply(res, 409, { error: 'Auf einem anderen Gerät liegt ein neuerer Spielstand vor.' });
    return reply(res, 200, { revision });
  } catch (error) {
    console.error('Storage unavailable:', error.message);
    return reply(res, 503, { error: 'Speichern gerade nicht erreichbar. Deine Änderungen bleiben zur erneuten Übertragung vorgemerkt.' });
  }
}
