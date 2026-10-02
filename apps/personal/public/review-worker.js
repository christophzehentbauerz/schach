import { Chess } from './vendor/chess.js';
const material={p:1,n:3.1,b:3.25,r:5,q:9,k:0};
function valuePosition(g){let score=0;const b=g.board();for(let r=0;r<8;r++)for(let f=0;f<8;f++){const p=b[r][f];if(!p)continue;const sign=p.color==='w'?1:-1;let v=material[p.type];const center=3.5-(Math.abs(3.5-f)+Math.abs(3.5-r))/2; if(p.type==='p')v+=((p.color==='w'?6-r:r-1)*.055)+center*.025;if('nb'.includes(p.type))v+=center*.075;if(p.type==='k'&&g.isCheck())v-=.18;score+=sign*v}return score}
function negamax(g,depth,alpha,beta){if(depth===0||g.isGameOver()){if(g.isCheckmate())return -1000-depth;return g.isDraw()?0:(g.turn()==='w'?1:-1)*valuePosition(g)}let best=-Infinity;const moves=g.moves({verbose:true}).sort((a,b)=>(b.captured?material[b.captured]:0)-(a.captured?material[a.captured]:0)+(b.san.includes('+')?.2:0));for(const m of moves){g.move(m);const val=-negamax(g,depth-1,-beta,-alpha);g.undo();if(val>best)best=val;if(val>alpha)alpha=val;if(alpha>=beta)break}return best===-Infinity?0:best}
function findBest(g,depth=2){const color=g.turn(),moves=g.moves({verbose:true});let best=-Infinity,bestMoves=[];for(const m of moves){g.move(m);const score=-negamax(g,depth-1,-Infinity,Infinity);g.undo();if(score>best+.015){best=score;bestMoves=[m]}else if(Math.abs(score-best)<=.015)bestMoves.push(m)}return {move:bestMoves[Math.floor(Math.random()*bestMoves.length)],score:best,color}}

self.onmessage=({data})=>{
 try{
  if(data.type==='hint'){self.postMessage({done:true,move:findBest(new Chess(data.fen),2).move});return;}
  let index=0;
  function next(){
   try{
    if(index>=data.records.length){self.postMessage({done:true});return;}
    const rec=data.records[index],g=new Chess(rec.before);let best=-Infinity,bestMove=null,actual=-Infinity;
    for(const m of g.moves({verbose:true})){
     g.move(m);const score=-negamax(g,1,-Infinity,Infinity);g.undo();
     if(m.from===rec.from&&m.to===rec.to&&(m.promotion||null)===(rec.promotion||null))actual=score;
     if(score>best){best=score;bestMove=m;}
    }
    if(!Number.isFinite(actual))actual=best;
    self.postMessage({index,bestMove,best,actual});index++;setTimeout(next,0);
   }catch(error){self.postMessage({error:String(error)});}
  }
  next();
 }catch(error){self.postMessage({error:String(error)});}
};
