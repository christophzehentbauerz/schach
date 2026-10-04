import { randomUUID } from 'node:crypto';
import { Chess } from '../public/vendor/chess.js';
import { database } from './store.js';

export class RoomError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const requireRoomId = id => { if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) throw new RoomError('Ungültiger Partielink.'); };
const isPlayer = (row, id) => row.white_id === id || row.black_id === id;
export const TIME_CONTROLS = {
  '30m': {mode:'clock',duration:1800000,label:'30 Min. pro Person'},
  '60m': {mode:'clock',duration:3600000,label:'60 Min. pro Person'},
  '1d': {mode:'correspondence',duration:86400000,label:'1 Tag pro Zug'},
  '3d': {mode:'correspondence',duration:259200000,label:'3 Tage pro Zug'}
};
const query = `SELECT r.*, w.name AS white_name, b.name AS black_name, h.name AS host_name
  FROM coach_rooms r LEFT JOIN coach_players w ON r.white_id=w.id
  LEFT JOIN coach_players b ON r.black_id=b.id JOIN coach_players h ON r.host_id=h.id`;
async function rowFor(id) {
  requireRoomId(id);
  const db = await database(), rows = await db.query(query + ' WHERE r.id=$1', [id]);
  if (!rows[0]) throw new RoomError('Diese Partie wurde nicht gefunden.', 404);
  return rows[0];
}
export function replay(moves) {
  const game = new Chess();
  for (const move of moves) game.move(move);
  return game;
}
export function remaining(row, game, now = Date.now()) {
  const elapsed=row.status==='active'?Math.max(0,now-Number(row.turn_started_at)):0;
  const white=Number(row.white_ms),black=Number(row.black_ms);
  return { w:Math.max(0,white-(game.turn()==='w'?elapsed:0)), b:Math.max(0,black-(game.turn()==='b'?elapsed:0)) };
}
export function canMate(game,color) {
  if(game.isInsufficientMaterial())return false;
  const pieces=game.board().flat().filter(p=>p&&p.color===color&&p.type!=='k');
  if(!pieces.length)return false;
  if(pieces.some(p=>'pqr'.includes(p.type))||pieces.length>=2)return true;
  return game.board().flat().some(p=>p&&p.color!==color&&p.type!=='k');
}
async function expire(row) {
  if(row.status!=='active')return row;
  const game=replay(JSON.parse(row.moves)),left=remaining(row,game);
  if(left[game.turn()]>0)return row;
  const winner=game.turn()==='w'?'b':'w',result=canMate(game,winner)?(winner==='w'?'1-0':'0-1'):'1/2-1/2';
  const db=await database();
  await db.query(`UPDATE coach_rooms SET status='finished',result=$1,reason=$2,draw_offer=NULL,
    white_ms=$3,black_ms=$4,version=version+1,updated_at=$5 WHERE id=$6 AND version=$7 RETURNING id`,
    [result,result==='1/2-1/2'?'Zeit abgelaufen · Gegner kann nicht mattsetzen':'Zeit abgelaufen',Math.floor(left.w),Math.floor(left.b),Date.now(),row.id,row.version]);
  return rowFor(row.id);
}
function present(row, playerId) {
  const moves = JSON.parse(row.moves), game = replay(moves);
  game.header('Event', 'Schachcoach · Freundschaftspartie', 'White', row.white_name || 'Weiß', 'Black', row.black_name || 'Schwarz', 'Result', row.result || '*');
  return {
    id: row.id, version: row.version, status: row.status,
    white: { id: row.white_id, name: row.white_name }, black: { id: row.black_id, name: row.black_name },
    color: row.white_id === playerId ? 'w' : row.black_id === playerId ? 'b' : null,
    hostId: row.host_id, hostName: row.host_name, moves, fen: game.fen(), pgn: game.pgn(),
    turn: game.turn(), inCheck: game.isCheck(), result: row.result, reason: row.reason,
    drawOffer: row.draw_offer, createdAt: Number(row.created_at), updatedAt: Number(row.updated_at),
    timeMode:row.time_mode,durationMs:Number(row.duration_ms),remaining:remaining(row,game),
    turnStartedAt:Number(row.turn_started_at),serverNow:Date.now(),
    timeLabel:Object.values(TIME_CONTROLS).find(v=>v.mode===row.time_mode&&v.duration===Number(row.duration_ms))?.label||'Bedenkzeit'
  };
}
export async function listRooms(playerId) {
  const db = await database();
  const rows = await db.query(query + ' WHERE r.white_id=$1 OR r.black_id=$1 ORDER BY r.updated_at DESC LIMIT 100', [playerId]);
  const current=await Promise.all(rows.map(expire));
  return current.map(row => ({ id: row.id, version: row.version, status: row.status, whiteName: row.white_name,
    blackName: row.black_name, color: row.white_id === playerId ? 'w' : 'b', result: row.result,
    updatedAt: Number(row.updated_at), moveCount: JSON.parse(row.moves).length }));
}
export async function createRoom(playerId, color = 'w', timeControl = '3d') {
  if (!['w', 'b'].includes(color)) throw new RoomError('Bitte Weiß oder Schwarz wählen.');
  const time=TIME_CONTROLS[timeControl];if(!time)throw new RoomError('Unbekannte Bedenkzeit.');
  const db = await database(), id = randomUUID(), now = Date.now();
  const waiting = await db.query("SELECT COUNT(*) AS total FROM coach_rooms WHERE host_id=$1 AND status='waiting'", [playerId]);
  if (Number(waiting[0].total) >= 10) throw new RoomError('Du hast bereits zehn offene Einladungen. Öffne eine davon oder ziehe sie zurück.');
  await db.query('INSERT INTO coach_rooms (id,host_id,white_id,black_id,created_at,updated_at,time_mode,duration_ms,white_ms,black_ms) VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$7,$7) RETURNING id',
    [id, playerId, color === 'w' ? playerId : null, color === 'b' ? playerId : null, now,time.mode,time.duration]);
  return present(await rowFor(id), playerId);
}
export async function getRoom(id, playerId) {
  const original=await rowFor(id);
  const row=isPlayer(original,playerId)?await expire(original):original;
  if (!isPlayer(row, playerId)) {
    if (row.status !== 'waiting') throw new RoomError('Diese Partie gehört anderen Spielern.', 403);
    return { id: row.id, status: 'invitation', hostName: row.host_name, color: row.white_id ? 'b' : 'w',timeLabel:Object.values(TIME_CONTROLS).find(v=>v.mode===row.time_mode&&v.duration===Number(row.duration_ms))?.label };
  }
  return present(row, playerId);
}
export async function joinRoom(id, playerId) {
  const row = await rowFor(id);
  if (isPlayer(row, playerId)) return present(row, playerId);
  if (row.status !== 'waiting') throw new RoomError('Diese Einladung wurde bereits angenommen.', 409);
  const db = await database();
  const updated = await db.query(`UPDATE coach_rooms SET white_id=$1,black_id=$2,status='active',version=version+1,updated_at=$3,turn_started_at=$3
    WHERE id=$4 AND status='waiting' AND version=$5 RETURNING id`,
    [row.white_id || playerId, row.black_id || playerId, Date.now(), id, row.version]);
  if (!updated.length) throw new RoomError('Jemand anderes hat die Einladung gerade angenommen.', 409);
  return present(await rowFor(id), playerId);
}
export async function actOnRoom(id, playerId, input) {
  const original=await rowFor(id);
  if(!isPlayer(original,playerId))throw new RoomError('Du spielst in dieser Partie nicht mit.',403);
  const row = await expire(original);
  if (!isPlayer(row, playerId)) throw new RoomError('Du spielst in dieser Partie nicht mit.', 403);
  if (!Number.isSafeInteger(input.version) || input.version !== row.version) throw new RoomError('Die Partie hat sich geändert. Der aktuelle Stand wird geladen.', 409);
  const moves = JSON.parse(row.moves), game = replay(moves), color = row.white_id === playerId ? 'w' : 'b';
  let result = row.result, reason = row.reason, status = row.status, offer = row.draw_offer;
  let whiteMs=Number(row.white_ms),blackMs=Number(row.black_ms),started=Number(row.turn_started_at);
  if (input.action === 'cancel') {
    if (row.host_id !== playerId || status !== 'waiting') throw new RoomError('Nur offene eigene Einladungen können zurückgezogen werden.');
    status = 'cancelled'; reason = 'Einladung zurückgezogen';
  } else {
    if (status !== 'active') throw new RoomError(status === 'waiting' ? 'Die andere Person ist noch nicht beigetreten.' : 'Diese Partie ist bereits beendet.', 409);
    switch (input.action) {
      case 'move': {
        if (game.turn() !== color) throw new RoomError('Du bist noch nicht am Zug.', 409);
        if (!input.move || !/^[a-h][1-8]$/.test(input.move.from) || !/^[a-h][1-8]$/.test(input.move.to) || (input.move.promotion && !/^[qrbn]$/.test(input.move.promotion))) throw new RoomError('Ungültiger Zug.');
        const now=Date.now(),left=remaining(row,game,now);
        if(left[color]<=0)throw new RoomError('Deine Bedenkzeit ist abgelaufen.',409);
        let move; try { move = game.move({ from: input.move.from, to: input.move.to, promotion: input.move.promotion }); } catch { throw new RoomError('Dieser Zug ist nicht legal.'); }
        whiteMs=row.time_mode==='correspondence'?Number(row.duration_ms):Math.floor(left.w);
        blackMs=row.time_mode==='correspondence'?Number(row.duration_ms):Math.floor(left.b);
        started=now;
        moves.push(move.san);
        // Moving declines an opponent's offer. The mover's own offer remains available.
        if (offer && offer !== playerId) offer = null;
        if (game.isCheckmate()) { status = 'finished'; result = color === 'w' ? '1-0' : '0-1'; reason = 'Schachmatt'; }
        else if (game.isDraw()) { status = 'finished'; result = '1/2-1/2'; reason = game.isStalemate() ? 'Patt' : game.isThreefoldRepetition() ? 'Dreifache Stellungswiederholung' : game.isInsufficientMaterial() ? 'Ungenügendes Material' : '50-Züge-Regel'; }
        break;
      }
      case 'resign': status = 'finished'; result = color === 'w' ? '0-1' : '1-0'; reason = 'Aufgabe'; break;
      case 'offer-draw':
        if (offer && offer !== playerId) throw new RoomError('Es liegt bereits ein Remisangebot vor. Nimm es an oder lehne es ab.');
        offer = playerId; break;
      case 'accept-draw':
        if (!offer || offer === playerId) throw new RoomError('Es liegt kein gegnerisches Remisangebot vor.');
        status = 'finished'; result = '1/2-1/2'; reason = 'Remis vereinbart'; break;
      case 'decline-draw': if (!offer || offer === playerId) throw new RoomError('Kein gegnerisches Remisangebot.'); offer = null; break;
      default: throw new RoomError('Unbekannte Aktion.');
    }
  }
  if (status === 'finished') offer = null;
  const db = await database();
  if(status==='finished'&&input.action!=='move'){const left=remaining(row,game);whiteMs=Math.floor(left.w);blackMs=Math.floor(left.b);}
  const changed = await db.query(`UPDATE coach_rooms SET moves=$1,status=$2,result=$3,reason=$4,draw_offer=$5,version=version+1,updated_at=$6,
    white_ms=$9,black_ms=$10,turn_started_at=$11 WHERE id=$7 AND version=$8 RETURNING id`,
    [JSON.stringify(moves), status, result, reason, offer, Date.now(), id, row.version,whiteMs,blackMs,started]);
  if (!changed.length) throw new RoomError('Die Partie hat sich gerade geändert. Bitte den neuen Stand ansehen.', 409);
  return present(await rowFor(id), playerId);
}
