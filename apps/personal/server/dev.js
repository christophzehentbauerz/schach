import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import state from '../api/state.js';
import session from '../api/session.js';
import rooms from '../api/rooms.js';
const root = path.resolve('public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.txt': 'text/plain', '.json': 'application/json' };
createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/state') return state(req, res);
  if (pathname === '/api/session') return session(req, res);
  if (pathname === '/api/rooms') return rooms(req, res);
  const filename = path.resolve(root, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try { const content = await readFile(filename); res.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream'); res.setHeader('Cache-Control', 'no-cache'); res.end(content); }
  catch { res.writeHead(404).end('Nicht gefunden'); }
}).listen(5173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:5173'));
