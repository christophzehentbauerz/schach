import { Chess } from './vendor/chess.js';
import { uci, scoreNumber } from './engine.js';
export function linePositions(fen,pv){
  const game=new Chess(fen),positions=[fen],moves=[];
  for(const token of pv||[]){try{const move=game.move({from:token.slice(0,2),to:token.slice(2,4),promotion:token[4]});moves.push(move);positions.push(game.fen());}catch{break;}}
  return {positions,moves};
}
export async function analyzeMove(engine,record,time=300){
  const best=await engine.search(record.before,time);
  const actual=uci(record);
  const played=best.bestmove===actual?best:await engine.search(record.before,time,actual);
  const same=best.bestmove===actual,loss=same?0:Math.max(0,scoreNumber(best)-scoreNumber(played));
  return {best,played,loss,same,depth:Math.min(best.depth,played.depth),time};
}
export function grade(result,record=null){
  if(!result)return {label:'Noch nicht analysiert',symbol:'·',className:'pending'};
  const move=record?.san||'';
  // A check or capture alone does not establish a brilliant sacrifice.
  if(result.same)return {label:'Sehr gut',symbol:'★',className:'verygood'};
  if(result.loss<30)return {label:'Gut',symbol:'✓',className:'good'};
  if(result.loss<80)return {label:'Ungenauigkeit',symbol:'?!',className:'inaccuracy'};
  if(result.loss<160)return {label:'Fehler',symbol:'?',className:'mistake'};
  return {label:'Grober Fehler',symbol:'??',className:'blunder'};
}
export function whiteScore(score,color){if(!score)return null;return {...score,value:score.value*(color==='w'?1:-1)};}
export function scoreText(score){if(!score)return '–';if(score.kind==='mate')return (score.value<0?'−':'')+'M'+Math.abs(score.value);return (score.value>0?'+':'')+(score.value/100).toFixed(2).replace('.',',');}
const names={p:'Bauer',n:'Springer',b:'Läufer',r:'Turm',q:'Dame',k:'König'},values={p:1,n:3,b:3,r:5,q:9,k:0};
function balance(fen,color){const g=new Chess(fen);return g.board().flat().filter(Boolean).reduce((sum,p)=>sum+(p.color===color?1:-1)*values[p.type],0);}
export function explanation(record,result){
  if(!result)return 'Stockfish prüft die Stellung. Du kannst die Partie schon am Brett durchgehen.';
  const best=linePositions(record.before,result.best.pv),played=linePositions(record.before,result.played.pv);
  const side=record.color==='w'?'Weiß':'Schwarz',bestMove=best.moves[0];
  if(!bestMove)return 'Für diese Stellung liegt noch keine gültige Variante vor.';
  const paragraphs=[];
  if(result.same)paragraphs.push(`${record.san} ist bei dieser Rechentiefe Stockfishs erste Wahl.`);
  else if(result.loss<30)paragraphs.push(`${record.san} ist gut spielbar. ${bestMove.san} wird knapp bevorzugt; der Unterschied ist klein.`);
  else if(result.best.kind==='mate'&&result.best.value>0)paragraphs.push(`${bestMove.san} führt laut Berechnung bei bestem Gegenspiel zum Matt in ${result.best.value}.`);
  else if(result.played.kind==='mate'&&result.played.value<0)paragraphs.push(`Nach ${record.san} findet Stockfish eine Mattfolge gegen ${side}. Die bessere Variante zeigt, was stattdessen möglich war.`);
  else paragraphs.push(`${bestMove.san} hält die Stellung für ${side} um etwa ${(result.loss/100).toFixed(1).replace('.',',')} Bauerneinheiten besser als ${record.san}.`);
  if(!result.same&&played.moves.length>1){
    paragraphs.push(`Die berechnete Antwort auf ${record.san} ist ${played.moves[1].san}${played.moves[2]?', dann '+played.moves[2].san:''}.`);
    const end=played.positions[Math.min(played.positions.length-1,6)],material=balance(end,record.color)-balance(record.before,record.color);
    if(material<=-1)paragraphs.push(`In den ersten ${Math.min(played.moves.length,6)} Halbzügen dieser Variante verliert ${side} netto etwa ${Math.abs(material)} Materialpunkte. Spiele „Gespielt“ vorwärts, um den Ablauf zu sehen.`);
  }
  if(bestMove.flags.includes('k')||bestMove.flags.includes('q'))paragraphs.push('Die Rochade bringt den König aus dem Zentrum und den Turm näher ins Spiel.');
  else if(bestMove.captured)paragraphs.push(`Der bessere Zug schlägt auf ${bestMove.to} einen gegnerischen ${names[bestMove.captured]}. Die Variante zeigt auch das mögliche Zurückschlagen.`);
  else if(['n','b'].includes(bestMove.piece)&&bestMove.from[1]===(record.color==='w'?'1':'8'))paragraphs.push(`Der ${names[bestMove.piece]} wird von der Grundreihe nach ${bestMove.to} entwickelt.`);
  else if(bestMove.san.includes('+'))paragraphs.push('Mit diesem Schach muss der Gegner zunächst auf die Bedrohung seines Königs reagieren.');
  return paragraphs.join(' ');
}
