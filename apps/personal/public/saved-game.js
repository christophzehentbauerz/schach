import { Chess } from './vendor/chess.js';
export const SAVE_KEY='schachcoach-game-v1';
export const BACKUP_KEY=SAVE_KEY+'-backup', ARCHIVE_KEY=SAVE_KEY+'-previous';
export function recordMove(game,move,before){return {before,after:game.fen(),san:move.san,color:move.color,from:move.from,to:move.to,piece:move.piece,captured:move.captured||null,promotion:move.promotion||null};}
export function saveGame(storage,game,mode,elo,records){
  let savedAt=Date.now();for(const key of [SAVE_KEY,BACKUP_KEY]){try{const previous=JSON.parse(storage.getItem(key));if(Number.isFinite(previous?.savedAt))savedAt=Math.max(savedAt,previous.savedAt+1);}catch{}}
  const raw=JSON.stringify({version:1,startFen:records?.[0]?.before,moves:records?records.map(r=>r.san):game.history(),mode,elo,savedAt});
  let saved=false;for(const key of [BACKUP_KEY,SAVE_KEY]){try{storage.setItem(key,raw);saved=true;}catch{}}
  if(!saved)throw new Error('Speicher nicht verfügbar');
}
export function decode(raw){
  const data=JSON.parse(raw);
  if(data.version!==1||!Array.isArray(data.moves)||data.moves.length>3000||!['ai','two'].includes(data.mode))throw new Error('Ungültiger Spielstand');
  const game=new Chess(data.startFen),records=[];
  for(const san of data.moves){if(typeof san!=='string'||san.length>20)throw new Error('Ungültiger Zug');const before=game.fen(),move=game.move(san);records.push(recordMove(game,move,before));}
  return {game,records,mode:data.mode,elo:data.elo,savedAt:data.savedAt||0};
}
export function archiveGame(storage,game,mode,elo,records){
  if(!records.length)return;
  storage.setItem(ARCHIVE_KEY,JSON.stringify({version:1,startFen:records[0]?.before,moves:records.map(r=>r.san),mode,elo,savedAt:Date.now()}));
}
export function restoreGame(storage,previous=false){
  let found=false;const candidates=[];
  for(const key of (previous?[ARCHIVE_KEY,BACKUP_KEY,SAVE_KEY]:[SAVE_KEY,BACKUP_KEY])){
    const raw=storage.getItem(key);if(!raw)continue;found=true;
    try{const saved=decode(raw);if(previous)return saved;candidates.push(saved);}catch{}
  }
  if(candidates.length)return candidates.sort((a,b)=>b.savedAt-a.savedAt)[0];
  if(found)throw new Error('Spielstand beschädigt; vorhandene Daten bleiben erhalten');
  return null;
}
