import { storage, flush, isConflict } from './cloud.js';
import { readMeta, freshMeta, saveMeta, saveToLibrary, setupLibrary } from './library.js';
import { Chess } from './vendor/chess.js';
import { LEVELS } from './computer.js';
import { Stockfish } from './engine.js';
import { grade } from './analysis-model.js';
import { createReview } from './review.js';
import { parsePGN } from './pgn.js';
import { loadRating, saveRating, outcomeFromGame, rateGame, resultLabel } from './rating.js';
let review=null,library=null; let meta=readMeta()||freshMeta(); let playerColor=meta.color||'w'; const ended=()=>game.isGameOver()||!!meta.result;
import { saveGame, restoreGame, recordMove, archiveGame } from './saved-game.js';
const $=id=>document.getElementById(id);let game=new Chess(),selected=null,legal=[],records=[],mode='ai',thinking=false,lastMove=null,pendingPromo=null,aiTimer=null,aiWorker=null,generation=0;
let saveBlocked=false;const jobs=new Set();
let elo=800;try{const saved=Number(storage.getItem('schachcoach-elo'));if(LEVELS[saved])elo=saved;}catch{}
let learningRating=loadRating(storage),currentRatingResult=null;
function pieceImage(color,type){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 40 40');svg.setAttribute('class','piece');svg.setAttribute('aria-hidden','true');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href',`./vendor/pieces.svg#${color}${type}`);svg.append(use);return svg;}
function ensureImportUI(){
  const style=document.createElement('style');style.textContent='.heading-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.import-dialog{position:fixed;inset:0;background:#0e1825aa;display:grid;place-items:center;z-index:20;padding:18px}.import-panel{background:#fff;width:min(620px,100%);border-radius:16px;padding:22px;box-shadow:0 24px 80px #10203055}.import-head{display:flex;align-items:center;justify-content:space-between}.import-head h2{margin:0 0 12px}.close-import{border:0;background:transparent;font-size:28px;color:#637487;line-height:1}.import-panel p{color:#627486;font-size:14px;margin:0 0 12px}.import-panel textarea{display:block;width:100%;min-height:220px;resize:vertical;border:1px solid #cbd6dc;border-radius:10px;padding:12px;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:#263847}.import-file-row{display:flex;align-items:center;gap:10px;margin-top:10px;color:#718392;font-size:13px}.import-error{color:#b34431!important;background:#fbe8e4;padding:9px;border-radius:7px}.import-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}@media(max-width:520px){.heading-actions{width:100%}.heading-actions .btn{flex:1}.import-panel{padding:16px}.import-panel textarea{min-height:180px}}';document.head.append(style);
  const open=document.createElement('button');open.className='btn';open.id='import-pgn';open.textContent='PGN importieren';$('open-review').before(open);
  const heading=$('open-review').parentElement,actions=document.createElement('div');actions.className='heading-actions';heading.append(actions);actions.append(open,$('open-review'),$('back-to-game'));
  const dialog=document.createElement('div');dialog.id='import-dialog';dialog.className='import-dialog';dialog.hidden=true;dialog.innerHTML=`<div class="import-panel" role="dialog" aria-modal="true" aria-labelledby="import-title"><div class="import-head"><h2 id="import-title">Partie importieren</h2><button class="close-import" aria-label="Import schließen">×</button></div><p>Füge die PGN aus Chess.com, Lichess oder einer anderen Plattform ein. Danach werden die Züge beider Seiten am Brett mit Stockfish geprüft.</p><textarea id="pgn-input" spellcheck="false" placeholder="[Event &quot;Meine Partie&quot;]\n\n1. e4 e5 2. Nf3 Nc6 ..."></textarea><div class="import-file-row"><label class="btn" for="pgn-file">PGN-Datei laden</label><input id="pgn-file" type="file" accept=".pgn,.txt,text/plain" hidden><span id="pgn-file-name">oder Text oben einfügen</span></div><p class="import-error" id="import-error" hidden></p><div class="import-actions"><button class="btn" id="cancel-import">Abbrechen</button><button class="btn primary" id="load-pgn">Partie laden und analysieren</button></div></div>`;document.body.append(dialog);
  const close=()=>{dialog.hidden=true;};open.onclick=()=>{dialog.hidden=false;setTimeout(()=>$('pgn-input').focus(),0)};dialog.querySelector('.close-import').onclick=close;$('cancel-import').onclick=close;dialog.onclick=e=>{if(e.target===dialog)close();};
  $('pgn-file').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;$('pgn-file-name').textContent=file.name;$('pgn-input').value=await file.text();};
  $('load-pgn').onclick=()=>{try{const parsed=parsePGN($('pgn-input').value);if(records.length)persistGame();meta=freshMeta(playerColor);meta.result='imported';review?.reset();cancelComputer();game=parsed.game;records=parsed.records;mode='two';selected=null;legal=[];lastMove=records.at(-1)?{from:records.at(-1).from,to:records.at(-1).to}:null;saveBlocked=false;persistGame();movesSignature=null;close();render();review.open(0);if(parsed.skipped.length||parsed.reversed)$('save-status').textContent=`Partie geladen · ${parsed.skipped.length?parsed.skipped.length+' Angaben übersprungen':''}${parsed.reversed?' Zugfolge automatisch umgedreht':''}`;}catch(error){$('import-error').hidden=false;$('import-error').textContent=error.message;}};
}
function ensureAnalysisStyles(){
  if(document.getElementById('analysis-quality-styles'))return;
  const style=document.createElement('style');style.id='analysis-quality-styles';style.textContent='.grade.brilliant,.coach-symbol.brilliant{background:#d9f2df;color:#16834f}.grade.verygood,.coach-symbol.verygood{background:#e3f1e8;color:#2c7c58}.grade.inaccuracy,.coach-symbol.inaccuracy{background:#fff2d5;color:#a47b1d}.move-grade.brilliant{color:#16834f}.move-grade.verygood{color:#2c7c58}.coach-grade.brilliant,.coach-grade.verygood{color:#2c7c58}.quality-key{display:flex;flex-wrap:wrap;gap:5px;margin:12px 0 2px}.quality-key span{border-radius:5px;padding:3px 6px;font-size:11px;font-weight:700;background:#eef2f4;color:#566878}.quality-key .q-brilliant{background:#d9f2df;color:#16834f}.quality-key .q-error{background:#fbe5df;color:#b34f3e}';document.head.append(style);
  if(!$('quality-key')){const key=document.createElement('div');key.id='quality-key';key.className='quality-key';key.innerHTML='<span class="q-brilliant">!! Brillant</span><span>★ Sehr gut</span><span>✓ Gut</span><span>?! Ungenau</span><span class="q-error">? Fehler</span><span class="q-error">?? Grob</span>';$('review-totals').after(key);}
}
function ensureRatingUI(){
  if(!document.getElementById('rating-styles')){const style=document.createElement('style');style.id='rating-styles';style.textContent='.learning-elo-header{display:inline-flex;align-items:center;gap:5px;margin-left:12px;padding:5px 9px;border:1px solid #ffffff2b;border-radius:999px;color:#dce8ef;font-size:12px;font-weight:700;white-space:nowrap}.rating-panel{margin:14px 0 2px;padding:13px 14px;border:1px solid #d8e5dc;border-radius:12px;background:#f1f8f3}.rating-panel-head{display:flex;align-items:baseline;gap:10px}.rating-kicker{font-size:12px;color:#557265;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.rating-value{font-size:26px;line-height:1;color:#1e6948}.rating-change{font-size:14px;font-weight:750;color:#347b56}.rating-change.down{color:#b34f3e}.rating-panel p{margin:7px 0 0!important;color:#5c7367!important;font-size:13px!important}.rating-panel.neutral{background:#f5f8f9;border-color:#dce5e9}.rating-panel.neutral .rating-value{color:#2b5868}.rating-panel.neutral p{color:#647888!important}@media(max-width:520px){.learning-elo-header{margin-left:5px;padding:4px 7px;font-size:11px}.rating-value{font-size:24px}}';document.head.append(style);}
  const tag=document.querySelector('header .tag');if(tag&&!$('learning-elo-header')){const pill=document.createElement('span');pill.id='learning-elo-header';pill.className='learning-elo-header';tag.after(pill);}
  if(!$('rating-panel')){const panel=document.createElement('div');panel.id='rating-panel';panel.className='rating-panel neutral';panel.innerHTML='<div class="rating-panel-head"><span class="rating-kicker">Deine Lern-Elo</span><strong id="learning-elo-value" class="rating-value">500</strong><span id="learning-elo-change" class="rating-change"></span></div><p id="rating-message">Noch keine gewertete Partie. Dieser Wert startet bei 500.</p>';const coachHeading=document.querySelector('.coach-heading');$('analysis-card').insertBefore(panel,coachHeading||null);}
}
function renderRating(){
  const header=$('learning-elo-header');if(header)header.textContent=`Lern-Elo ${learningRating.rating}`;
  const value=$('learning-elo-value'),change=$('learning-elo-change'),message=$('rating-message'),panel=$('rating-panel');if(!value||!change||!message||!panel)return;
  value.textContent=learningRating.rating;
  if(currentRatingResult){const delta=currentRatingResult.delta;change.textContent=`${delta>0?'+':''}${delta} Elo`;change.className='rating-change '+(delta<0?'down':'');message.textContent=`${resultLabel(currentRatingResult.outcome)} gegen Computer ca. ${currentRatingResult.opponent} Elo · ${currentRatingResult.before} → ${currentRatingResult.after}`;panel.className='rating-panel';}
  else{change.textContent=`${learningRating.games} ${learningRating.games===1?'Partie':'Partien'}`;change.className='rating-change';message.textContent='Lern-Elo startet bei 500 und verändert sich nach beendeten Computerpartien.';panel.className='rating-panel neutral';}
}
function gameSignature(){return records.map(record=>record.san).join(' ');}
function settleLearningRating(){
  if(meta.ratingResult){currentRatingResult=meta.ratingResult;renderRating();return;}
  const outcome=mode==='ai'&&!meta.assisted?(meta.result||outcomeFromGame(game,playerColor)):null;if(!outcome||!records.length){currentRatingResult=null;renderRating();return;}
  const result=rateGame(learningRating,{outcome,opponent:elo,signature:meta.id});learningRating=result.state;currentRatingResult=result.entry;
  if(result.changed){try{saveRating(storage,learningRating);meta.ratingResult=result.entry;persistGame();}catch{}}
  renderRating();
}
function cancelComputer(){for(const stop of [...jobs])stop();$('hint').disabled=false;clearTimeout(aiTimer);if(aiWorker){aiWorker.terminate();aiWorker=null;}generation++;thinking=false;}
function renderStrength(){$('elo').value=String(elo);$('elo').disabled=thinking||records.length>0;$('strength-control').classList.toggle('hidden',mode!=='ai');$('opponent-name').textContent=mode==='ai'?`Computer · ca. ${elo} Elo`:'Schwarz';}
const files='abcdefgh',glyph={wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟'};
const material={p:1,n:3.1,b:3.25,r:5,q:9,k:0};
const startingMaterial={p:8,n:2,b:2,r:2,q:1},materialValue={p:1,n:3,b:3,r:5,q:9};
function ensureMaterialUI(){
  const bars=document.querySelectorAll('.playerbar');
  if(bars.length<2)return;
  if(!document.getElementById('material-styles')){const style=document.createElement('style');style.id='material-styles';style.textContent='.material-loss{display:block;color:#738493;font-size:11px;font-weight:500;margin-top:1px;white-space:nowrap}.player{align-items:flex-start!important}.material-balance{font-size:12px;color:#6e7f8d;margin-top:2px}.material-balance.ahead{color:#34765a;font-weight:650}.material-balance.behind{color:#a65a4d}.material-piece{font-size:12px;margin-right:3px}@media(max-width:520px){.material-loss{font-size:10px}.material-balance{font-size:11px}}';document.head.append(style);}
  const add=(bar,id)=>{if(document.getElementById(id))return;const el=document.createElement('span');el.id=id;el.className='material-loss';bar.querySelector('.player').append(el);};
  add(bars[0],'material-loss-black');add(bars[1],'material-loss-white');
  if(!document.getElementById('material-balance')){const balance=document.createElement('span');balance.id='material-balance';balance.className='material-balance';$('status').parentElement.append(balance);}
}
function materialState(position,color){
  const counts={p:0,n:0,b:0,r:0,q:0};for(const row of position.board())for(const piece of row)if(piece?.color===color&&piece.type!=='k')counts[piece.type]++;
  const lost=Object.fromEntries(Object.keys(startingMaterial).map(type=>[type,Math.max(0,startingMaterial[type]-counts[type])]));
  const points=Object.entries(lost).reduce((sum,[type,count])=>sum+count*materialValue[type],0);return {lost,points};
}
function materialText(state){const order=['q','r','b','n','p'],icons={q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};const pieces=order.filter(type=>state.lost[type]).map(type=>`${icons[type]}${state.lost[type]}`).join(' ');return `Verloren: ${pieces||'–'} · ${state.points.toFixed(1).replace('.',',')} Pkt.`;}
function renderMaterial(position){
  ensureMaterialUI();const white=materialState(position,'w'),black=materialState(position,'b');
  if(!$('material-loss-white'))return;
  $('material-loss-white').textContent=materialText(white);$('material-loss-black').textContent=materialText(black);
  const edge=white.points-black.points,balance=$('material-balance');balance.textContent=Math.abs(edge)<.01?'Material: ausgeglichen':`Material: ${edge<0?'Weiß':'Schwarz'} +${Math.abs(edge).toFixed(1).replace('.',',')}`;balance.className='material-balance '+(Math.abs(edge)<.01?'':edge<0?'ahead':'behind');
}
const squares=new Map();let movesSignature=null;
function initializeBoard(){
  const board=$('board'),fragment=document.createDocumentFragment();
  for(let r=7;r>=0;r--)for(let f=0;f<8;f++){
    const sq=files[f]+(r+1),el=document.createElement('div');
    el.className='sq '+((r+f)%2?'light':'dark');el.dataset.square=sq;el.setAttribute('role','gridcell');el.tabIndex=0;el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();tap(sq);}});
    if(f===0){const c=document.createElement('span');c.className='coords coord-rank';c.textContent=r+1;el.append(c);}
    if(r===0){const c=document.createElement('span');c.className='coords coord-file';c.textContent=files[f];el.append(c);}
    el.addEventListener('click',()=>tap(sq));squares.set(sq,el);fragment.append(el);
  }
  board.append(fragment);
}
function render(){
  review?.renderView();
  if(!squares.size)initializeBoard();
  const shown=review?.active?review.shown():game;if(!shown)return;
  renderMaterial(shown);document.body.classList.toggle('black-player',playerColor==='b');$('you-name').textContent='Du · '+(playerColor==='b'?'Schwarz':'Weiß');$('resign').disabled=ended()||!records.length||mode!=='ai';$('elo').disabled=thinking||records.length>0;
  const legalTargets=new Set(review?.active?[]:legal.map(m=>m.to));
  const changed=[];
  for(const [sq,el] of squares){const piece=shown.get(sq),key=piece?piece.color+piece.type:'';if(el.dataset.piece!==key)changed.push({sq,el,piece,key,oldKey:el.dataset.piece,node:el.querySelector('.piece'),rect:el.getBoundingClientRect()});}
  const oldPieces=changed.filter(c=>c.node);
  changed.forEach(c=>c.node?.remove());
  for(const c of changed){
    if(c.piece){
      const from=oldPieces.find(p=>p.oldKey===c.key&&!p.used);if(from)from.used=true;
      const node=from?.node||pieceImage(c.piece.color,c.piece.type);c.el.append(node);
      if(from&&from.sq!==c.sq&&node.animate&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
        node.getAnimations?.().forEach(animation=>animation.cancel());const dx=from.rect.left-c.rect.left,dy=from.rect.top-c.rect.top;
        c.el.style.zIndex='3';const animation=node.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:150,easing:'cubic-bezier(.2,.7,.3,1)'});animation.onfinish=()=>{c.el.style.zIndex='';};
      }
    }
    c.el.dataset.piece=c.key;c.el.setAttribute('aria-label',`${c.sq}${c.piece?' '+(c.piece.color==='w'?'Weißer ':'Schwarzer ')+pieceName(c.piece.type):''}`);
  }
  const marked=review?.active?review.arrow():lastMove;
  for(const [sq,el] of squares){const piece=shown.get(sq);el.classList.toggle('last',!!marked&&(marked.from===sq||marked.to===sq));el.classList.toggle('selected',!review?.active&&selected===sq);el.classList.toggle('legal',legalTargets.has(sq)&&!piece);el.classList.toggle('capture',legalTargets.has(sq)&&!!piece);}
  const over=ended();
  $('turn-label').textContent=review?.active?'Analyse':over?'Partie beendet':game.turn()==='w'?'Weiß am Zug':'Schwarz am Zug';
  $('eval').textContent=review?.active?'Stellung prüfen':over?'Partie beendet':game.isCheck()?'Schach!':game.turn()===playerColor?'Dein Zug':mode==='ai'?(thinking?'Computer denkt …':'Computer pausiert'):'Schwarz am Zug';
  $('vs-ai').classList.toggle('active',mode==='ai');$('two-player').classList.toggle('active',mode==='two');
  if(!review?.active)$('open-review').textContent=ended()?'Partie analysieren':records.length?'Warum?':'Analysieren';
  drawMoves();updateStatus();renderStrength();
  const badge=review?.badge,stamp=$('move-badge');stamp.hidden=!badge?.to;if(badge?.to){stamp.className='move-stamp '+badge.className;stamp.textContent=badge.symbol;stamp.title=badge.label;stamp.style.left=`${(files.indexOf(badge.to[0])+1)*12.5-1}%`;stamp.style.top=`${(8-Number(badge.to[1]))*12.5}%`;}
  if(review?.active&&marked){const center=sq=>[(files.indexOf(sq[0])+.5)*100,(8-Number(sq[1])+.5)*100];const [x1,y1]=center(marked.from),[x2,y2]=center(marked.to),arrow=$('move-arrow');for(const [key,value] of Object.entries({x1,y1,x2,y2,stroke:marked.color}))arrow.setAttribute(key,String(value));document.querySelector('#arrowhead path').setAttribute('fill',marked.color);}
}
function drawMoves(){
  const signature=records.map(r=>r.san).join(' ')+'|'+(review?.active?review.results.map(r=>grade(r).symbol).join(''):'');
  const node=$('moves');
  if(signature!==movesSignature){
    movesSignature=signature;
    if(!records.length){node.innerHTML='<div class="empty">Ziehe eine Figur.<br>Nach der Partie erklärt dir Stockfish die Züge.</div>';return;}
    const fragment=document.createDocumentFragment();
    for(let i=0;i<records.length;i+=2){
      const row=document.createElement('div');row.className='move-row';const number=document.createElement('span');number.className='move-no';number.textContent=i/2+1+'.';row.append(number);
      for(let j=i;j<Math.min(i+2,records.length);j++){
        const button=document.createElement('button');button.className='san';button.dataset.index=j;button.setAttribute('aria-label',`Zug ${Math.floor(j/2)+1} ${records[j].san} analysieren`);button.append(document.createTextNode(records[j].san));
        if(review?.active){const g=grade(review.results[j],records[j]),badge=document.createElement('span');badge.className='move-grade '+g.className;badge.textContent=g.symbol;button.append(badge);}
        button.onclick=()=>review.active?review.choose(j):review.open(j);row.append(button);
      }
      fragment.append(row);
    }
    const previousScroll=node.scrollTop;node.replaceChildren(fragment);node.scrollTop=review?.active?previousScroll:node.scrollHeight;
  }
  node.querySelectorAll('.san').forEach(button=>button.classList.toggle('current',!!review?.active&&Number(button.dataset.index)===review.index));
}
function persistGame(){
  if(saveBlocked||isConflict())return;
  try{if(game.isGameOver()&&!meta.result)meta.result=outcomeFromGame(game,playerColor);saveGame(storage,game,mode,elo,records);saveToLibrary(meta,game,mode,elo,records);}
  catch{$('save-status').textContent='Speichern nicht möglich – bitte die Seite geöffnet lassen.';}
}
function scheduleComputer(){
  clearTimeout(aiTimer);
  if(!review?.active&&mode==='ai'&&game.turn()!==playerColor&&!ended()){thinking=true;aiTimer=setTimeout(computerMove,140);}
}
function updateStatus(){let s='Wähle eine Figur und dann ein Feld.';if(meta.result==='loss'&&!game.isGameOver())s='Du hast aufgegeben. Die Partie ist gespeichert.';else if(game.isCheckmate())s=`Schachmatt – ${game.turn()==='w'?'Schwarz':'Weiß'} gewinnt.`;else if(game.isStalemate())s='Patt – die Partie ist remis.';else if(game.isDraw())s='Remis – die Partie ist unentschieden.';else if(game.isCheck())s='Schach! Der König muss aus dem Schach.';else if(thinking)s='Der Computer sucht einen Zug …';$('status').textContent=s}
function tap(sq){if(review?.active||saveBlocked||isConflict()||thinking||ended()||(mode==='ai'&&game.turn()!==playerColor))return;const p=game.get(sq);if(selected&&legal.some(m=>m.to===sq)){const opts=legal.filter(m=>m.to===sq);if(opts.length>1){showPromotion(opts);return}playMove(opts[0]);return}if(p&&p.color===game.turn()){selected=sq;legal=game.moves({square:sq,verbose:true});render()}else{selected=null;legal=[];render()}}
function playMove(m){
  review?.reset();
  const before=game.fen(),move=game.move({from:m.from,to:m.to,promotion:m.promotion||'q'});
  records.push(recordMove(game,move,before));lastMove={from:move.from,to:move.to};selected=null;legal=[];
  persistGame();scheduleComputer();render();if(ended())finishGame();
}
function showPromotion(opts){const box=$('promobox');box.innerHTML='';for(const type of ['q','r','b','n']){const b=document.createElement('button');b.append(pieceImage(game.turn(),type));b.setAttribute('aria-label','Umwandeln in '+({q:'Dame',r:'Turm',b:'Läufer',n:'Springer'}[type]));b.onclick=()=>{const m=opts[0];m.promotion=type;$('promotion').classList.remove('show');playMove(m)};box.append(b)}$('promotion').classList.add('show')}
$('promotion').addEventListener('click',e=>{if(e.target===$('promotion'))$('promotion').classList.remove('show')});
function startJob(file,payload,onData,onFailure){
  let worker,timer,stopped=false;
  const stop=()=>{if(stopped)return;stopped=true;clearTimeout(timer);worker?.terminate();jobs.delete(stop);};
  const fail=()=>{stop();onFailure();};
  const arm=()=>{clearTimeout(timer);timer=setTimeout(fail,12000);};
  jobs.add(stop);
  try{
    worker=new Worker(new URL(file,import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{if(stopped)return;if(data.error){fail();return;}arm();if(data.done||file==='./computer-worker.js')stop();onData(data);};
    worker.onerror=fail;worker.onmessageerror=fail;arm();worker.postMessage(payload);
  }catch{fail();}
  return stop;
}
function computerMove(){
  if(ended()||mode!=='ai'||game.turn()===playerColor)return;
  const fen=game.fen(),requestGeneration=generation;
  startJob('./computer-worker.js',{fen,elo,generation},result=>{
    if(requestGeneration!==generation||game.fen()!==fen||mode!=='ai')return;
    thinking=false;if(result.move)playMove(result.move);else render();
  },()=>{if(requestGeneration!==generation)return;thinking=false;render();$('status').textContent='Berechnung unterbrochen. Die Partie bleibt erhalten.';$('retry-computer').hidden=false;});
}
$('retry-computer').onclick=()=>{$('retry-computer').hidden=true;cancelComputer();scheduleComputer();render();};
function pieceName(p){return ({k:'König',q:'Dame',r:'Turm',b:'Läufer',n:'Springer',p:'Bauer'})[p]||'Figur'}
function outcome(){if(game.isCheckmate())return game.turn()==='w'?'Computer gewinnt durch Schachmatt.':'Du gewinnst durch Schachmatt!';if(game.isStalemate()||game.isDraw())return 'Die Partie endet remis.';return 'Partie beendet.'}
function finishGame(){if(!meta.result)meta.result=outcomeFromGame(game,playerColor);persistGame();thinking=false;selected=null;legal=[];settleLearningRating();review.open(0);}
function newGame(){if((records.length&&!ended()||saveBlocked)&&!window.confirm('Neue Partie beginnen? Alle gespielten Züge bleiben im Partienarchiv erhalten.'))return;try{archiveGame(storage,game,mode,elo,records);}catch{if(!window.confirm('Sicherung nicht möglich. Trotzdem eine neue Partie beginnen?'))return;}if(records.length)persistGame();meta=freshMeta($('play-color').value);playerColor=meta.color;saveBlocked=false;review?.reset();cancelComputer();$('retry-computer').hidden=true;$('retry-analysis').hidden=true;$('promotion').classList.remove('show');game=new Chess();records=[];selected=null;legal=[];lastMove=null;thinking=false;currentRatingResult=null;$('analysis-card').classList.remove('show');persistGame();scheduleComputer();render();renderRating()}
$('new').onclick=newGame;
$('undo').onclick=()=>{if(thinking||ended())return;if(!records.length)return;meta.assisted=true;review?.reset();cancelComputer();game.undo();records.pop();if(mode==='ai'&&records.length&&game.turn()!==playerColor){game.undo();records.pop()}const last=records[records.length-1];lastMove=last?{from:last.from,to:last.to}:null;selected=null;legal=[];$('analysis-card').classList.remove('show');persistGame();scheduleComputer();render()};
$('hint').onclick=async()=>{
  if(review?.active||thinking||ended()||(mode==='ai'&&game.turn()!==playerColor))return;
  meta.assisted=true;persistGame();const fen=game.fen(),requestGeneration=generation;$('hint').disabled=true;$('status').textContent='Stockfish sucht einen Tipp …';
  let engine;const stop=()=>{engine?.dispose();jobs.delete(stop);};jobs.add(stop);
  try{
    engine=new Stockfish();const result=await engine.search(fen,600);
    if(requestGeneration!==generation||game.fen()!==fen)return;
    const copy=new Chess(fen),move=copy.move({from:result.bestmove.slice(0,2),to:result.bestmove.slice(2,4),promotion:result.bestmove[4]});
    selected=move.from;legal=game.moves({square:move.from,verbose:true});render();squares.get(move.to)?.classList.add('selected');$('status').textContent=`Stockfish-Tipp: ${move.san}`;
  }catch{if(requestGeneration===generation)$('status').textContent='Tipp derzeit nicht verfügbar. Du kannst weiterspielen.';}
  finally{stop();$('hint').disabled=false;}
};
function loadSaved(saved){review?.reset();cancelComputer();game=saved.game;records=saved.records;mode=saved.mode;if(LEVELS[saved.elo])elo=saved.elo;const last=records.at(-1);lastMove=last?{from:last.from,to:last.to}:null;selected=null;legal=[];saveBlocked=false;$('analysis-card').classList.remove('show');$('retry-computer').hidden=true;scheduleComputer();render();if(ended())settleLearningRating();}
$('restore-game').onclick=()=>{
  try{const saved=restoreGame(storage,true);if(!saved){$('save-status').textContent='Keine Sicherung gefunden.';return;}if(records.length&&!window.confirm('Die gespeicherte Sicherung öffnen?'))return;meta=freshMeta(playerColor);meta.assisted=true;loadSaved(saved);persistGame();$('save-status').textContent='Sicherung wiederhergestellt.';}
  catch{$('save-status').textContent='Keine lesbare Sicherung gefunden. Vorhandene Daten bleiben erhalten.';}
};
function setMode(next){
  if(next===mode)return;
  review?.reset();cancelComputer();mode=next;meta.assisted=true;selected=null;legal=[];persistGame();scheduleComputer();render();
  if(ended())finishGame();
}
$('vs-ai').onclick=()=>setMode('ai');$('two-player').onclick=()=>setMode('two');
$('elo').onchange=()=>{const next=Number($('elo').value);if(!LEVELS[next])return;elo=next;if(records.length)meta.assisted=true;try{storage.setItem('schachcoach-elo',String(elo));}catch{}persistGame();renderStrength();};
ensureImportUI();
ensureAnalysisStyles();
ensureRatingUI();
review=createReview({getRecords:()=>records,getId:()=>meta.id,pauseGame:()=>{if(!ended()){meta.assisted=true;persistGame();}cancelComputer();selected=null;legal=[];},resumeGame:()=>{scheduleComputer();render();},refresh:render});
let restored=false;
try{
  const saved=restoreGame(storage);
  if(saved){game=saved.game;records=saved.records;mode=saved.mode;if(LEVELS[saved.elo])elo=saved.elo;const last=records.at(-1);lastMove=last?{from:last.from,to:last.to}:null;restored=true;$('save-status').textContent='Gespeicherte Partie wiederhergestellt';}
}catch{saveBlocked=true;$('save-status').textContent='Spielstand konnte nicht geladen werden. Bitte Sicherung wiederherstellen; gespeicherte Daten bleiben erhalten.';}
scheduleComputer();render();renderRating();
if(restored&&ended())settleLearningRating();
library=setupLibrary({progress:()=>learningRating,getCurrent:()=>({game,meta}),open:(item,saved,index)=>{persistGame();meta={id:item.id,color:item.color,createdAt:item.createdAt,result:item.result,assisted:item.assisted,ratingResult:item.ratingResult,opponentName:item.opponentName};playerColor=meta.color||'w';loadSaved(saved);persistGame();if(item.result||index!==undefined)review.open(index||0);}});
$('resign').onclick=()=>{if(ended()||!records.length||mode!=='ai')return;if(!confirm('Diese Partie aufgeben? Sie bleibt im Archiv.'))return;cancelComputer();meta.result='loss';persistGame();finishGame();render();};
$('flip-board').onclick=()=>{document.body.classList.toggle('flipped');render();};
$('play-color').value=playerColor;
$('play-color').onchange=()=>{$('color-note').textContent='Gilt für die nächste neue Partie.';};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&review?.busy){$('pause-analysis').click();}});
window.addEventListener('pagehide',()=>{cancelComputer();review?.reset();});
window.addEventListener('pageshow',event=>{if(event.persisted){scheduleComputer();render();}});
document.addEventListener('coach-view',event=>{if(event.detail!=='play'){cancelComputer();if(review?.busy)$('pause-analysis').click();}else if(!review?.active){scheduleComputer();render();}});
export function openFriendReview(room){
  if(room.status!=='finished')return;
  if(records.length)persistGame();review?.reset();cancelComputer();
  game=new Chess();records=[];
  for(const san of room.moves){const before=game.fen(),move=game.move(san);records.push(recordMove(game,move,before));}
  game.header('Event','Schachcoach · Freundschaftspartie','White',room.white.name,'Black',room.black.name,'Result',room.result);
  playerColor=room.color;mode='two';
  const winner=room.result==='1-0'?'w':room.result==='0-1'?'b':null;
  meta={id:'friend-'+room.id,color:playerColor,createdAt:room.createdAt,result:winner?(winner===playerColor?'win':'loss'):'draw',assisted:false,opponentName:playerColor==='w'?room.black.name:room.white.name};
  lastMove=records.at(-1)||null;selected=null;legal=[];currentRatingResult=null;persistGame();
  library.setView('play');render();renderRating();if(records.length)review.open(0);
}

