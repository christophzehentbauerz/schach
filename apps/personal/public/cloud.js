let OUTBOX = 'schachcoach-outbox-v2', userId = null;
let data = {}, revision = 0, serial = 0, dirty = false, inFlight = null, timer, conflict = false, ready = false, location = 'cloud';
let notification = () => {};
function status(message, kind = '') { notification(message, kind); }
function backup() { try { localStorage.setItem(OUTBOX, JSON.stringify({ revision, data, dirty })); return true; } catch { return false; } }
async function request(method, payload) {
  const response = await fetch('/api/state', { method, headers: { 'Content-Type': 'application/json' }, ...(payload ? { body: JSON.stringify(payload) } : {}), signal: AbortSignal.timeout(12000) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || 'Speicher nicht erreichbar'), { status: response.status });
  return result;
}
export const storage = {
  getItem(key) { return data[key] ?? null; },
  setItem(key, value) {
    if (!ready || conflict) throw new Error('Speicher noch nicht bereit');
    data[key] = String(value); serial++; dirty = true;
    const backed = backup();
    status(backed ? 'Speichern …' : 'Noch nicht gesichert · Seite geöffnet lassen', backed ? 'pending' : 'error');
    clearTimeout(timer); timer = setTimeout(() => flush(), 600);
  },
  removeItem(key) { delete data[key]; serial++; dirty = true; backup(); clearTimeout(timer); timer = setTimeout(() => flush(), 600); },
  keys() { return Object.keys(data); }
};
export function setStatusListener(callback) { notification = callback; }
export function isConflict() { return conflict; }
export function hasPending() { return dirty; }
export async function initialize() {
  const server = await request('GET'); location = server.storage;
  userId=server.user.id;OUTBOX='schachcoach-outbox-v3-'+userId;
  let pending; try { pending = JSON.parse(localStorage.getItem(OUTBOX)); } catch {}
  if(!pending&&userId==='personal'){try{pending=JSON.parse(localStorage.getItem('schachcoach-outbox-v2'));if(pending){localStorage.setItem(OUTBOX,JSON.stringify(pending));localStorage.removeItem('schachcoach-outbox-v2');}}catch{}}
  data = server.data; revision = server.revision; ready = true;
  if (pending?.dirty && pending.data) {
    if (pending.revision === revision) { data = pending.data; dirty = true; await flush(); }
    else { conflict = true; ready = false; throw Object.assign(new Error('Ein anderes Fenster hat einen neueren Stand gespeichert. Lade zuerst deine ungesendete Sicherung herunter und lade anschließend den Serverstand.'), { status: 409 }); }
  }
  // Import only old device-local records, and only into an empty account.
  if (userId==='personal'&&!Object.keys(data).length) {
    for (const key of ['schachcoach-game-v1', 'schachcoach-game-v1-backup', 'schachcoach-game-v1-previous', 'schachcoach-learning-elo-v1']) {
      try { const value = localStorage.getItem(key); if (value) { JSON.parse(value); data[key] = value; dirty = true; } } catch {}
    }
    if (dirty) await flush();
  }
  if (!dirty) status(location === 'computer' ? 'Auf deinem Computer gespeichert' : 'Im privaten Konto gespeichert', 'saved');
  return server;
}
export async function flush() {
  clearTimeout(timer);
  if (!ready || conflict) return false;
  if (inFlight) { const ok=await inFlight; return ok && dirty && !conflict ? flush() : !dirty; }
  if (!dirty) return true;
  const version = serial, snapshot = { ...data };
  inFlight = (async () => {
    try {
      const saved = await request('PUT', { revision, data: snapshot, userId }); revision = saved.revision;
      if (serial === version) dirty = false;
      backup();
      status(dirty ? 'Speichern …' : location === 'computer' ? 'Auf deinem Computer gespeichert' : 'Im privaten Konto gespeichert', dirty ? 'pending' : 'saved');
      return true;
    } catch (error) {
      conflict = error.status === 409;
      status(conflict ? 'Anderer Spielstand erkannt · Sicherung exportieren und neu laden' : error.status === 401 ? 'Anmeldung abgelaufen · Änderungen vorgemerkt' : 'Verbindung unterbrochen · Änderungen noch nicht übertragen', 'error');
      return false;
    } finally { inFlight = null; }
  })();
  const success = await inFlight;
  if (success && dirty) return flush();
  return success;
}
export function exportBackup(pending = false) {
  let value = { version: 2, data };
  if (pending) { try { value = { version: 2, data: JSON.parse(localStorage.getItem(OUTBOX))?.data || data }; } catch {} }
  download(JSON.stringify(value, null, 2), `schachcoach-sicherung-${new Date().toISOString().slice(0,10)}.json`, 'application/json');
}
export function discardPending() { localStorage.removeItem(OUTBOX); window.location.reload(); }
export function download(content, name, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type })), link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
window.addEventListener('online', () => flush());
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
setInterval(() => { if (dirty && !conflict) flush(); }, 15000);
