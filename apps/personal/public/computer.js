import { Chess } from './vendor/chess.js';
export const LEVELS = {
  400: {depth:1, budget:180, temperature:2, random:.35},
  600: {depth:2, budget:280, temperature:1, random:.18},
  800: {depth:2, budget:450, temperature:.5, random:.07},
  1000:{depth:3, budget:750, temperature:.2, random:.025},
  1200:{depth:3, budget:1100,temperature:.08,random:0},
  1400:{depth:4, budget:1500,temperature:.025,random:0},
  1600:{depth:4, budget:2100,temperature:.005,random:0}
};
const values={p:100,n:310,b:325,r:500,q:900,k:0};
function evaluate(g){
  let score=0;
  for(const row of g.board())for(const p of row){
    if(!p)continue;
    const x=p.square.charCodeAt(0)-97,y=Number(p.square[1])-1;
    const advance=p.color==='w'?y:7-y;
    const center=3.5-(Math.abs(3.5-x)+Math.abs(3.5-y))/2;
    let v=values[p.type];
    if(p.type==='p')v+=advance*6+center*3;
    if('nb'.includes(p.type))v+=center*12-(advance===0?12:0);
    if(p.type==='k'&&advance===0&&(x===6||x===2))v+=25;
    score+=(p.color==='w'?1:-1)*v;
  }
  return (g.turn()==='w'?1:-1)*score;
}
function ordered(g){return g.moves({verbose:true}).sort((a,b)=>priority(b)-priority(a));}
function priority(m){return (m.captured?values[m.captured]*10-values[m.piece]:0)+(m.promotion?values[m.promotion]:0)+(m.san.includes('+')?25:0);}
const timeout=Symbol('search timeout');
export function chooseComputerMove(fen,elo=800,random=Math.random){
  const g=new Chess(fen),level=LEVELS[elo]||LEVELS[800];
  const deadline=performance.now()+level.budget;
  let nodes=0;
  function search(depth,alpha,beta,ply){
    if((++nodes%16)===0&&performance.now()>deadline)throw timeout;
    const moves=ordered(g);
    if(!moves.length)return g.isCheck()?-100000+ply:0;
    if(g.isInsufficientMaterial()||g.isDrawByFiftyMoves()||g.isThreefoldRepetition())return 0;
    if(depth===0)return evaluate(g);
    let best=-Infinity;
    for(const move of moves){
      g.move(move);let score;
      try{score=-search(depth-1,-beta,-alpha,ply+1);}finally{g.undo();}
      best=Math.max(best,score);alpha=Math.max(alpha,score);
      if(alpha>=beta)break;
    }
    return best;
  }
  let candidates=ordered(g).map(move=>({move,score:0})),completedDepth=0;
  if(!candidates.length)return {move:null,depth:0};
  for(let depth=1;depth<=level.depth;depth++){
    const next=[];
    try{
      for(const {move} of candidates){
        g.move(move);let score;
        try{score=-search(depth-1,-Infinity,Infinity,1);}finally{g.undo();}
        next.push({move,score});
      }
      candidates=next.sort((a,b)=>b.score-a.score);completedDepth=depth;
    }catch(e){if(e!==timeout)throw e;break;}
  }
  let chosen;
  if(random()<level.random)chosen=candidates[Math.floor(random()*candidates.length)];
  else {
    const best=candidates[0].score;
    const weights=candidates.map(c=>Math.exp(Math.max(-700,(c.score-best)/(level.temperature*100))));
    let pick=random()*weights.reduce((a,b)=>a+b,0);
    chosen=candidates.at(-1);
    for(let i=0;i<candidates.length;i++){pick-=weights[i];if(pick<=0){chosen=candidates[i];break;}}
  }
  return {move:{from:chosen.move.from,to:chosen.move.to,promotion:chosen.move.promotion},depth:completedDepth,elo:Number(elo)};
}
