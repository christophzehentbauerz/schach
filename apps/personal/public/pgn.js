import { Chess } from './vendor/chess.js';
import { recordMove } from './saved-game.js';

export function parsePGN(text) {
  const source = String(text || '').trim();
  if (!source) throw new Error('Bitte eine PGN einfügen oder eine Datei laden.');
  const headers = {};
  for (const match of source.matchAll(/^\s*\[([^\s]+)\s+"((?:\\.|[^"])*)"\]\s*$/gm)) headers[match[1]] = match[2].replace(/\\"/g, '"');
  let startFen;
  if (headers.SetUp === '1' && headers.FEN) startFen = headers.FEN;
  const start = new Chess();
  if (startFen) { try { start.load(startFen); } catch { startFen = undefined; } }
  const clean = source
    .replace(/^\s*\[[^\n]*\]\s*$/gm, ' ')
    .replace(/\{[^}]*\}/gs, ' ')
    .replace(/;[^\n]*/g, ' ')
    .replace(/\([^()]*\)/g, ' ')
    .replace(/\$\d+/g, ' ')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const tokens = clean ? clean.split(' ') : [];
  const replay = list => {
    const next = new Chess(start.fen()), parsed = [], ignored = [];
    for (let token of list) {
      if (!token) continue;
      token = token.replace(/^(?:\.{2,}|…)+/, '').replace(/[!?]+$/g, '');
      if (!token) continue;
      let move = null;
      try { move = next.move(token, { sloppy: true }); } catch {}
      if (!move) {
        const coordinate = token.replace(/[-–—x:]/g, '').match(/^([a-h][1-8])([a-h][1-8])([qrbnQRBN])?$/);
        if (coordinate) { try { move = next.move({ from: coordinate[1], to: coordinate[2], promotion: coordinate[3]?.toLowerCase() }); } catch {} }
      }
      if (!move) { const relaxed = token.replace(/e\.p\.?$/i, '').replace(/[+#]/g, ''); try { move = next.move(relaxed, { sloppy: true }); } catch {} }
      if (!move) { ignored.push(token); continue; }
      const before = parsed.length ? parsed.at(-1).after : start.fen();parsed.push(recordMove(next, move, before));
    }
    return {game:next,records:parsed,skipped:ignored};
  };
  let result = replay(tokens), reversed=false;
  if (result.records.length<2 && tokens.length>1) {
    const backwards = replay([...tokens].reverse());
    if (backwards.records.length>result.records.length) { result=backwards;reversed=true; }
  }
  const {game,records,skipped}=result;
  if (!records.length) throw new Error('Keine verwertbaren Züge gefunden. Die PGN kann beschädigt oder rückwärts kopiert sein.');
  return { game, records, headers, skipped, reversed };
}

export function pgnFromRecords(records) {
  const game = new Chess();
  const moves = records.map(record => record.san).join(' ');
  return moves ? `${moves}` : '';
}
