import test from 'node:test';
import assert from 'node:assert/strict';
import {Stockfish} from '../public/engine.js';
import {computerSearch,pickTrainingMove,LEVELS} from '../public/computer.js';
const line=(value,move,kind='cp')=>({value,kind,pv:[move],depth:10});
test('training 800 never chooses a hanging-queen candidate or discards forced mate',()=>{
 const result={lines:[line(20,'e2e4'),line(-70,'d2d4'),line(-900,'d1h5')]};
 for(const random of [()=>0,()=>.4,()=>.999])assert.notEqual(pickTrainingMove(result,LEVELS[800],random),'d1h5');
 assert.equal(pickTrainingMove({lines:[line(2,'d8h4','mate'),line(500,'a7a6')]},LEVELS[800],()=>.999),'d8h4');
});
test('actual UCI strength and game history are passed to Stockfish',async()=>{
 const commands=[];let worker;
 const engine=new Stockfish(()=>worker={postMessage:cmd=>commands.push(cmd),terminate(){}});
 for(const text of ['option name MultiPV type spin default 1 min 1 max 256','option name UCI_LimitStrength type check default false','option name UCI_Elo type spin default 1320 min 1320 max 3190','option name Skill Level type spin default 20 min 0 max 20','uciok','readyok'])worker.onmessage({data:text});
 const promise=computerSearch(engine,'position-fen',1800,{startFen:'start-fen',moves:['e2e4','e7e5']});
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(commands.includes('setoption name UCI_Elo value 1800'));assert.ok(commands.includes('setoption name UCI_LimitStrength value true'));
 assert.ok(commands.includes('position fen start-fen moves e2e4 e7e5'));
 worker.onmessage({data:'info depth 10 score cp 20 pv g1f3'});worker.onmessage({data:'bestmove g1f3'});
 assert.equal(await promise,'g1f3');engine.dispose();
});
test('MultiPV lines keep the main evaluation and exclude unfinished depths',async()=>{
 let worker;const engine=new Stockfish(()=>worker={postMessage(){},terminate(){}});worker.onmessage({data:'readyok'});
 const result=engine.search('fen',100);await new Promise(resolve=>setImmediate(resolve));
 for(const msg of ['info depth 9 multipv 2 score cp -10 pv d2d4','info depth 10 multipv 1 score cp 50 pv e2e4','bestmove e2e4'])worker.onmessage({data:msg});
 const search=await result;assert.equal(search.value,50);assert.equal(search.lines.length,1);engine.dispose();
});
