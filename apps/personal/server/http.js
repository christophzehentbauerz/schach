export function reply(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
export async function body(req, limit = 3000000) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new Error('JSON erwartet');
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > limit) throw new Error('Datei zu groß');
    return JSON.parse(raw);
  }
  let raw = '', size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw new Error('Datei zu groß'); raw += chunk; }
  return JSON.parse(raw);
}
export function validateState(input) {
  if (!input || !Number.isSafeInteger(input.revision) || input.revision < 0 || !input.data || Array.isArray(input.data) || typeof input.data !== 'object') throw new Error('Ungültiger Spielstand');
  const entries = Object.entries(input.data);
  if (entries.length > 10000) throw new Error('Zu viele Einträge');
  for (const [key, value] of entries) {
    if (!/^schachcoach-[a-zA-Z0-9_-]{1,100}$/.test(key) || typeof value !== 'string' || value.length > 2000000) throw new Error('Ungültige Speicherdaten');
    // Values are opaque JSON records, never interpreted as code or SQL.
    JSON.parse(value);
  }
  return input;
}
