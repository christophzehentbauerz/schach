export const RATING_KEY='schachcoach-learning-elo-v1';
const DEFAULT={version:1,rating:500,games:0,wins:0,draws:0,losses:0,history:[]};

function clean(value){
  const state={...DEFAULT,...value};
  state.rating=Math.max(100,Math.min(2400,Math.round(Number(state.rating)||DEFAULT.rating)));
  state.games=Math.max(0,Math.round(Number(state.games)||0));
  state.wins=Math.max(0,Math.round(Number(state.wins)||0));
  state.draws=Math.max(0,Math.round(Number(state.draws)||0));
  state.losses=Math.max(0,Math.round(Number(state.losses)||0));
  state.history=Array.isArray(state.history)?state.history.filter(item=>item&&typeof item.signature==='string').slice(-100):[];
  return state;
}

export function loadRating(storage){
  try{return clean(JSON.parse(storage.getItem(RATING_KEY)||'null'));}catch{return {...DEFAULT,history:[]};}
}

export function saveRating(storage,state){storage.setItem(RATING_KEY,JSON.stringify(clean(state)));}

export function outcomeFromGame(game,color='w'){
  if(game.isCheckmate())return game.turn()===color?'loss':'win';
  if(game.isDraw()||game.isStalemate())return 'draw';
  return null;
}

export function resultLabel(outcome){return outcome==='win'?'Sieg':outcome==='loss'?'Niederlage':'Remis';}

export function rateGame(state,{outcome,opponent=800,signature,playedAt=Date.now()}){
  if(!outcome||!signature)return {state:clean(state),entry:null,changed:false};
  const current=clean(state),existing=current.history.find(item=>item.signature===signature&&item.opponent===Number(opponent));
  if(existing)return {state:current,entry:existing,changed:false};
  const opponentRating=Math.max(100,Math.min(2400,Number(opponent)||800));
  const expected=1/(1+10**((opponentRating-current.rating)/400));
  const score=outcome==='win'?1:outcome==='loss'?0:.5;
  const delta=Math.max(-40,Math.min(40,Math.round(24*(score-expected))));
  const entry={signature,outcome,opponent:opponentRating,before:current.rating,after:current.rating+delta,delta,at:Number(playedAt)||Date.now()};
  const next={...current,rating:entry.after,games:current.games+1,wins:current.wins+(outcome==='win'?1:0),draws:current.draws+(outcome==='draw'?1:0),losses:current.losses+(outcome==='loss'?1:0),history:[...current.history,entry].slice(-100)};
  return {state:clean(next),entry,changed:true};
}
