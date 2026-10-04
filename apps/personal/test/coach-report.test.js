import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../public/vendor/chess.js';
import {recordMove} from '../public/saved-game.js';
import {buildReport,moveFacts,sequenceReport} from '../public/coach-report.js';
const record=(fen,san)=>{const game=new Chess(fen),before=game.fen(),move=game.move(san);return recordMove(game,move,before);};
const scored=(pv,value=0,kind='cp')=>({pv,value,kind,depth:14,bestmove:pv[0]});
const reportText=r=>[r.summary,...r.sections.flatMap(s=>s.paragraphs)].join('\n');
test('ordinary moves explain real controlled squares and do not require engine output',()=>{
 const r=record(undefined,'e4'),report=buildReport(r,null),text=reportText(report);
 assert.equal(report.sections.length,3);assert.match(text,/Bauern von e2 nach e4/);assert.match(text,/d5, f5/);assert.match(text,/Linien von Läufer auf f1/);assert.match(text,/Linien von Dame auf d1/);assert.doesNotMatch(text,/keinen legalen Zug/);
});
test('en passant identifies the captured square and preserves real material accounting',()=>{
 const r=record('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1','exd6');
 const text=reportText(buildReport(r,null));assert.match(text,/Bauer auf d5/);
 const line=sequenceReport(r,['e5d6','e8d7']);assert.equal(line.change,1);assert.equal(line.items.length,2);
});
test('promotion includes promotion material rather than just the capture',()=>{
 const r=record('7k/P7/8/8/8/8/8/7K w - - 0 1','a8=Q+');
 assert.match(reportText(buildReport(r,null)),/8 Materialpunkte/);assert.equal(sequenceReport(r,['a7a8q']).change,8);
});
test('castling explains both king and rook without guaranteeing safety',()=>{
 const r=record('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1','O-O');
 const text=reportText(buildReport(r,null));assert.match(text,/Turm von h1 nach f1/);assert.match(text,/Ob er dort sicherer steht/);
});
test('pinned geometric attackers are not claimed to have a legal capture',()=>{
 const r=record('4k3/4n3/8/8/2B5/8/8/4R1K1 w - - 0 1','Bd5');
 const text=reportText(buildReport(r,null));assert.match(text,/Keine legale unmittelbare Antwort schlägt/);assert.match(text,/Fesselung/);
});
test('mate explanation names decisive check and absence of legal defenses',()=>{
 const game=new Chess();['f3','e5','g4'].forEach(m=>game.move(m));const r=record(game.fen(),'Qh4#');
 const best=scored(['d8h4'],1,'mate');const report=buildReport(r,{best,played:best,same:true,loss:0,depth:14,time:700});
 assert.match(reportText(report),/Schachmatt/);assert.match(reportText(report),/keinen legalen Zug/);assert.doesNotMatch(reportText(report),/100 Bauerneinheiten/);
});
test('black evaluation uses white sign for display but mover sign for comparison',()=>{
 const r=record('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1','e5');
 const result={best:scored(['c7c5'],100),played:scored(['e7e5'],-100),same:false,loss:200,depth:14,time:700};
 const report=buildReport(r,result);assert.equal(report.sections.length,7);assert.match(reportText(report),/2 Bauerneinheiten/);assert.match(reportText(report),/Weiß: -1,00/);assert.match(reportText(report),/Weiß: \+1,00/);
});
test('search reversal is disclosed instead of declaring the alternative better',()=>{
 const r=record(undefined,'e4'),result={best:scored(['d2d4'],20),played:scored(['e2e4'],50),same:false,loss:0,depth:14,time:700};
 assert.match(buildReport(r,result).summary,/Rangfolge.*nicht gesichert/);
});
test('every legal PV half-move receives a board-linked explanation; exchanges are netted',()=>{
 const r=record(undefined,'e4');const report=sequenceReport(r,['e2e4','d7d5','e4d5','d8d5']);assert.equal(report.items.length,4);assert.equal(report.change,0);assert.match(report.items[3].text,/direktes Zurückschlagen/);assert.equal(report.items[3].step,4);
});

test('capturing a just-moved piece is not mislabeled as recapture',()=>{
 const r=record(undefined,'e4'),line=sequenceReport(r,['e2e4','d7d5','e4d5']);assert.doesNotMatch(line.items[2].text,/Zurückschlagen/);
});

test('Fools mate explains the diagonal, blocked king squares and g3 defense after the alternative',()=>{
 const game=new Chess();['f3','e5'].forEach(m=>game.move(m));const r=record(game.fen(),'g4');
 const result={best:scored(['b1c3'], -50),played:scored(['g2g4','d8h4'],-1,'mate'),same:false,loss:9950,depth:16,time:700};
 const report=buildReport(r,result),text=reportText(report);assert.match(text,/Gegenprobe/);assert.match(text,/g3/);
 const mate=report.line.items[1].text;assert.match(mate,/h4 über g3 → f2 → e1/);assert.match(mate,/kein legales Fluchtfeld/);assert.match(mate,/d1: von einer eigenen Figur besetzt/);assert.match(mate,/f2: angegriffen von Dame h4/);
});
