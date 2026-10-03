import { Stockfish, scoreNumber } from './engine.js';
export const LEVELS={
  400:{label:'Einstieg',time:400,tolerance:350,temperature:180},
  600:{label:'Grundlagen',time:500,tolerance:220,temperature:100},
  800:{label:'Aufbau',time:700,tolerance:140,temperature:55},
  1000:{label:'Geübt',time:800,tolerance:80,temperature:30},
  1200:{label:'Fortgeschritten',time:1000,tolerance:40,temperature:15},
  1400:{label:'Herausforderung',time:1000},
  1600:{label:'Stark',time:1200},
  1800:{label:'Sehr stark',time:1400},
  2000:{label:'Experte',time:1600},
  2200:{label:'Meister',time:1800},
  2400:{label:'Sehr anspruchsvoll',time:2000}
};
export function pickTrainingMove(result,level,random=Math.random){
  const lines=result.lines?.length?result.lines:[result];
  const sorted=[...lines].sort((a,b)=>scoreNumber(b)-scoreNumber(a)),best=sorted[0];
  // Never replace a forced mate with a casual move or select a known forced loss.
  if(best.kind==='mate')return best.pv[0];
  const candidates=sorted.filter(v=>v.kind!=='mate'&&scoreNumber(best)-scoreNumber(v)<=level.tolerance);
  const weights=candidates.map(v=>Math.exp((scoreNumber(v)-scoreNumber(best))/level.temperature));
  let cursor=random()*weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<candidates.length;i++){cursor-=weights[i];if(cursor<=0)return candidates[i].pv[0];}
  return best.pv[0];
}
export async function computerSearch(engine,fen,elo,history){
  const level=LEVELS[elo]||LEVELS[1400];
  await engine.ready;
  if(level.tolerance!==undefined){
    await engine.configure({'UCI_LimitStrength':false,'Skill Level':20,'MultiPV':4});
    const result=await engine.search(fen,level.time,null,history);
    return pickTrainingMove(result,level);
  }
  const bounds=engine.options.get('UCI_Elo');
  if(!bounds||elo<bounds.min||elo>bounds.max)throw new Error('Diese Spielstärke ist mit der Engine nicht verfügbar.');
  await engine.configure({'MultiPV':1,'UCI_LimitStrength':true,'UCI_Elo':elo});
  return (await engine.search(fen,level.time,null,history)).bestmove;
}
export function createComputer(){return new Stockfish();}
