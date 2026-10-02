import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../public/vendor/chess.js';
import { saveGame, restoreGame, recordMove } from '../public/saved-game.js';
import { outcomeFromGame, rateGame } from '../public/rating.js';
import { grade } from '../public/analysis-model.js';
import { validateState } from '../server/http.js';
import { authorized, sameOrigin, sessionCookie } from '../server/identity.js';


test('special starting position survives save and reload',()=>{
  const game=new Chess('7k/8/8/8/8/8/6P1/6K1 w - - 0 1');
  const before=game.fen(),move=game.move('g3'),records=[recordMove(game,move,before)];
  const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  game.header('White','Anna','Black','Chris','Result','1-0');
  saveGame(storage,game,'two',800,records);
  const restored=restoreGame(storage);
  assert.equal(restored.game.getHeaders().White,'Anna');assert.equal(restored.game.getHeaders().Result,'1-0');assert.equal(restored.game.fen(),game.fen());assert.equal(restored.records[0].before,before);
});
test('black player victory and draw are rated correctly',()=>{
  const game=new Chess();['f3','e5','g4','Qh4#'].forEach(m=>game.move(m));
  assert.equal(outcomeFromGame(game,'b'),'win');assert.equal(outcomeFromGame(game,'w'),'loss');
  const first=rateGame({}, {outcome:'win',signature:'unique-game',opponent:800});
  assert.equal(first.state.games,1);
  assert.equal(rateGame(first.state,{outcome:'win',signature:'unique-game',opponent:800}).changed,false);
  assert.equal(rateGame(first.state,{outcome:'win',signature:'another-game',opponent:800}).state.games,2);
});
test('ordinary checking move is not automatically brilliant',()=>{assert.equal(grade({same:true,loss:0},{san:'Bb5+'}).className,'verygood');});
test('state API rejects malformed payloads and prototype keys',()=>{
  assert.throws(()=>validateState({revision:-1,data:{}}));
  assert.throws(()=>validateState({revision:0,data:{'schachcoach-test':'not json'}}));
  assert.throws(()=>validateState({revision:0,data:JSON.parse('{"__proto__":"{}"}')}));
  assert.deepEqual(validateState({revision:0,data:{'schachcoach-game':'{}'}}).revision,0);
});
test('private API requires signed unexpired cookie and same-origin writes',()=>{
  process.env.VERCEL='1';process.env.DATABASE_URL='configured';process.env.SESSION_SECRET='a'.repeat(64);
  assert.equal(authorized({headers:{}}),false);
  const cookie=sessionCookie('personal').split(';')[0];
  assert.equal(authorized({headers:{cookie}}),true);
  assert.equal(authorized({headers:{cookie:cookie+'tampered'}}),false);
  assert.equal(sameOrigin({headers:{origin:'https://evil.test',host:'coach.test'}}),false);
  assert.equal(sameOrigin({headers:{origin:'https://coach.test',host:'coach.test'}}),true);
  delete process.env.VERCEL;delete process.env.DATABASE_URL;
});
