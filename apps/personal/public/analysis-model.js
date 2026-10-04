import { Chess } from './vendor/chess.js';
import { uci, scoreNumber } from './engine.js';
export function linePositions(fen,pv){
  const game=new Chess(fen),positions=[fen],moves=[];
  for(const token of pv||[]){try{const move=game.move({from:token.slice(0,2),to:token.slice(2,4),promotion:token[4]});moves.push(move);positions.push(game.fen());}catch{break;}}
  return {positions,moves};
}
export async function analyzeMove(engine,record,time=700,history=null){
  const best=await engine.search(record.before,time,null,history);
  const actual=uci(record);
  const played=best.bestmove===actual?best:await engine.search(record.before,time,actual,history);
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
