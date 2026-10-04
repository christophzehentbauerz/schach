import { storage } from './cloud.js';
import { Chess } from './vendor/chess.js';
import { Stockfish } from './engine.js';
import { analyzeMove, grade, linePositions, whiteScore, scoreText } from './analysis-model.js';
import { buildReport } from './coach-report.js';
const $=id=>document.getElementById(id);
const REPORT_VERSION=2;
export function createReview({getId,getRecords,pauseGame,resumeGame,refresh}){
  let active=false,index=0,branch='played',step=1,results=[],signature='',engine=null,runId=0,busy=false,error='',progress='',deep=false;
  const records=()=>getRecords();
  let reportKey='',reportResult=null;
  const historyFor=target=>({startFen:records()[0].before,moves:records().slice(0,target).map(m=>m.from+m.to+(m.promotion||''))});
  function ensureMobileNav(){
    if($('review-mobile-nav'))return;
    const nav=document.createElement('div');nav.id='review-mobile-nav';nav.className='review-mobile-nav';nav.innerHTML='<button id="review-mobile-first" aria-label="Erster Zug">|‹</button><button id="review-mobile-prev" aria-label="Vorheriger Zug">‹</button><span id="review-mobile-position"></span><button id="review-mobile-next" aria-label="Nächster Zug">›</button><button id="review-mobile-last" aria-label="Letzter Zug">›|</button>';
    $('analysis-card').insertBefore(nav,$('rating-panel')||$('coach-heading'));
    $('review-mobile-first').onclick=()=>choose(0);$('review-mobile-prev').onclick=()=>choose(index-1);$('review-mobile-next').onclick=()=>choose(index+1);$('review-mobile-last').onclick=()=>choose(records().length-1);
  }
  function sync(){const next=JSON.stringify([getId(),records()[0]?.before,records().map(r=>r.san)]);if(next===signature)return;signature=next;results=[];try{const saved=JSON.parse(storage.getItem('schachcoach-analysis-'+getId()));if(saved?.version===REPORT_VERSION&&saved?.signature===signature&&Array.isArray(saved.results))results=saved.results;}catch{}}
  function save(){try{storage.setItem('schachcoach-analysis-'+getId(),JSON.stringify({version:REPORT_VERSION,signature,results}));}catch{}}
  function stop(){runId++;engine?.dispose();engine=null;busy=false;deep=false;}
  function line(){const rec=records()[index];if(!rec)return null;const result=results[index];if(!result)return {positions:[rec.before,rec.after],moves:[{from:rec.from,to:rec.to,san:rec.san}]};return linePositions(rec.before,(branch==='best'?result.best:result.played).pv);}
  function shown(){const sequence=line();if(!sequence)return null;const at=Math.min(step,sequence.positions.length-1);return new Chess(sequence.positions[Math.max(0,at)]);}
  function arrow(){const sequence=line();if(!sequence)return null;const move=sequence.moves[Math.max(0,Math.min(step-1,sequence.moves.length-1))];return move?{...move,color:branch==='best'?'#24936f':'#db8b35'}:null;}
  function choose(next){index=Math.max(0,Math.min(records().length-1,next));branch='played';step=1;refresh();}
  function open(next=0){if(!records().length)return;pauseGame();active=true;sync();index=Math.max(0,Math.min(next,records().length-1));branch='played';step=1;error='';refresh();start();}
  function close(){stop();active=false;refresh();resumeGame();}
  function reset(){stop();active=false;results=[];signature='';error='';}
  async function start(deeper=false){
    stop();if(!active||!records().length)return;if(!deeper&&results.filter(Boolean).length===records().length){refresh();return;}
    const token=runId;busy=true;deep=deeper;error='';progress='Stockfish wird geladen …';refresh();
    let local;
    try{
      local=new Stockfish();engine=local;
      await local.ready;
      if(deeper){
        const target=index;progress='Genauere Analyse der ausgewählten Stellung …';refresh();
        const result=await analyzeMove(local,records()[target],3500,historyFor(target));
        if(token!==runId)return;results[target]=result;save();refresh();
      }else{
        while(token===runId){
          const target=!results[index]?index:records().findIndex((_,i)=>!results[i]);if(target<0)break;
          progress=`${results.filter(Boolean).length} von ${records().length} Zügen geprüft`;refresh();
          const result=await analyzeMove(local,records()[target],700,historyFor(target));
          if(token!==runId)return;results[target]=result;save();refresh();
          await new Promise(resolve=>setTimeout(resolve,0));
        }
      }
      if(token===runId){busy=false;deep=false;progress='Analyse abgeschlossen';local.dispose();engine=null;refresh();}
    }catch(e){if(token!==runId)return;busy=false;deep=false;error=e.message;local?.dispose();engine=null;refresh();}
  }
  function renderReport(rec,result){
    const key=signature+'|'+index+'|'+branch;
    if(reportKey!==key||reportResult!==result){
      reportKey=key;reportResult=result;
      const report=buildReport(rec,result,branch),container=$('coach-details');
      $('coach-text').textContent=report.summary;container.replaceChildren();
      for(const section of report.sections){
        if(!section.paragraphs.length)continue;
        const block=document.createElement('section'),heading=document.createElement('h3');heading.textContent=section.title;block.append(heading);
        for(const text of section.paragraphs){const p=document.createElement('p');p.textContent=text;block.append(p);}
        if(section.line&&report.line){
          const list=document.createElement('ol');list.className='coach-steps';
          for(const item of report.line.items){
            const li=document.createElement('li'),button=document.createElement('button');
            button.type='button';button.className='coach-step';button.dataset.step=item.step;button.textContent=item.title+' · Am Brett zeigen';button.onclick=()=>{step=item.step;refresh();};
            li.append(button);for(const text of item.paragraphs){const p=document.createElement('p');p.textContent=text;li.append(p);}list.append(li);
          }
          block.append(list);
        }
        container.append(block);
      }
    }
    $('coach-details').querySelectorAll('[data-step]').forEach(button=>{button.classList.toggle('active',Number(button.dataset.step)===step);button.setAttribute('aria-pressed',String(Number(button.dataset.step)===step));});
    const sequence=line(),shownMove=sequence?.moves[step-1];
    $('coach-board-context').textContent=step===0?'Am Brett: Ausgangsstellung vor dem untersuchten Zug.':shownMove?'Am Brett: '+(branch==='best'?'Engine-Alternative':'Variante nach dem gespielten Zug')+' · Halbzug '+step+': '+shownMove.san+'. Die Erklärung darunter bezieht sich auf den ursprünglichen Zug '+rec.san+'.':'';
  }
  function renderView(){
    ensureMobileNav();
    document.body.classList.toggle('reviewing',active);
    $('analysis-card').classList.toggle('show',active);$('review-controls').hidden=!active;$('play-controls').hidden=active;
    $('back-to-game').hidden=!active;$('open-review').disabled=!records().length;$('open-review').hidden=active;$('back-to-game').textContent=records().at(-1)?.san.includes('#')?'Zur Partie':'Weiter spielen';
    $('eval-rail').hidden=!active;$('arrows').toggleAttribute('hidden',!active);
    if(!active)return;
    const rec=records()[index],result=results[index],g=grade(result,rec),sequence=line();
    if(!rec)return;step=Math.min(step,sequence.positions.length-1);
    $('review-position').textContent=`Zug ${Math.floor(index/2)+1}${rec.color==='w'?'.':'…'} ${rec.san}`;
    $('review-prev').disabled=index===0;$('review-first').disabled=index===0;$('review-next').disabled=index===records().length-1;$('review-last').disabled=index===records().length-1;
    $('review-mobile-position').textContent=`Zug ${Math.floor(index/2)+1}${rec.color==='w'?'.':'…'} ${rec.san}`;
    $('review-mobile-prev').disabled=index===0;$('review-mobile-first').disabled=index===0;$('review-mobile-next').disabled=index===records().length-1;$('review-mobile-last').disabled=index===records().length-1;
    const detail=!result?'wird berechnet …':result.same?'erste Wahl bei dieser Berechnung':result.best.kind==='mate'||result.played.kind==='mate'?'Mattfolge im Variantenvergleich':result.played.value>result.best.value?'Rangfolge noch unsicher':`Bewertungsunterschied: ${(result.loss/100).toFixed(2).replace('.',',')} Bauerneinheiten`;
    $('coach-grade').textContent=`${g.label} · ${detail}`;$('coach-grade').className='coach-grade '+g.className;
    $('coach-symbol').textContent=g.symbol;$('coach-symbol').className='coach-symbol '+g.className;
    $('coach-move').textContent=`${Math.floor(index/2)+1}${rec.color==='w'?'.':'…'} ${rec.san}`;
    $('coach-prompt').textContent=!result?'Überlege zuerst: Welche gegnerische Drohung und welcher Plan sind hier wichtig?':result.same?'Coach-Frage: Welche Idee macht diesen Zug so stark?':result.loss>=80?'Coach-Frage: Welche gegnerische Antwort wurde nach deinem Zug möglich?':'Coach-Frage: Was verbessert die Stellung – Königssicherheit, Material oder Aktivität?';
    renderReport(rec,result);
    $('played-choice').classList.toggle('active',branch==='played');$('best-choice').classList.toggle('active',branch==='best');$('best-choice').disabled=!result;
    const bestLine=result?linePositions(rec.before,result.best.pv):null;
    $('played-choice').textContent='Gespielt: '+rec.san;$('best-choice').textContent=(result?.loss>=30?'Alternative: ':'Vergleich: ')+(bestLine?.moves[0]?.san||'…');
    if(result?.same)$('best-choice').textContent='Bester Zug: '+rec.san;
    $('line-back').disabled=step===0;$('line-forward').disabled=step>=sequence.positions.length-1;
    $('line-label').textContent=step===0?'Stellung vor dem Zug':`${branch==='best'?'Beste Variante':'Gespielte Variante'} · ${Math.min(step,sequence.moves.length)} / ${sequence.moves.length}`;
    $('line-moves').replaceChildren();
    sequence.moves.forEach((m,i)=>{const button=document.createElement('button');button.className='line-chip'+(step===i+1?' active':'');button.textContent=m.san;button.onclick=()=>{step=i+1;refresh();};$('line-moves').append(button);});
    const score=whiteScore(result?(branch==='best'||step===0?result.best:result.played):null,rec.color);
    $('position-score').textContent=scoreText(score);
    const cp=score?(score.kind==='mate'?Math.sign(score.value)*1500:score.value):0;
    $('eval-fill').style.height=`${Math.max(3,Math.min(97,50+45*Math.tanh(cp/500)))}%`;
    $('eval-rail').setAttribute('aria-label','Bewertung für Weiß '+scoreText(score));
    $('score-explainer').textContent=score?`Bewertung für Weiß · ${scoreText(score)}${step>1?' am Variantenbeginn':''}`:'Bewertung für Weiß';
    $('engine-depth').textContent=result?`Stockfish 17.1 Lite · Tiefe ${result.depth}`:'Stockfish 17.1 Lite';
    $('analysis-progress').hidden=!busy;$('analysis-progress-text').textContent=progress;
    $('analysis-error').textContent=error;$('analysis-error').hidden=!error;
    $('deepen').disabled=busy;$('pause-analysis').hidden=!busy;$('retry-analysis').hidden=busy||(!error&&results.filter(Boolean).length===records().length);
    $('review-summary').textContent=`${results.filter(Boolean).length} / ${records().length} Züge analysiert`;
    const count={brilliant:0,verygood:0,good:0,inaccuracy:0,mistake:0,blunder:0};results.forEach((r,i)=>{if(r)count[grade(r,records()[i]).className]++;});
    $('review-totals').textContent=`${count.brilliant} brillant · ${count.verygood} sehr gut · ${count.good} gut · ${count.inaccuracy} ungenau · ${count.mistake+count.blunder} Fehler`;
  }
  $('open-review').onclick=()=>open(Math.max(0,records().length-1));$('back-to-game').onclick=close;
  ensureMobileNav();
  $('review-first').onclick=()=>choose(0);$('review-prev').onclick=()=>choose(index-1);$('review-next').onclick=()=>choose(index+1);$('review-last').onclick=()=>choose(records().length-1);
  $('played-choice').onclick=()=>{branch='played';step=1;refresh();};$('best-choice').onclick=()=>{branch='best';step=0;refresh();};
  $('line-start').onclick=()=>{step=0;refresh();};$('line-back').onclick=()=>{step=Math.max(0,step-1);refresh();};$('line-forward').onclick=()=>{step=Math.min(line().positions.length-1,step+1);refresh();};
  $('deepen').onclick=()=>start(true);$('pause-analysis').onclick=()=>{stop();progress='Analyse pausiert';refresh();};$('retry-analysis').onclick=()=>start();
  document.addEventListener('keydown',event=>{if(!active||['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;if(event.key==='ArrowLeft'){event.preventDefault();choose(index-1);}if(event.key==='ArrowRight'){event.preventDefault();choose(index+1);}});
  return {get active(){return active;},get index(){return index;},get busy(){return busy;},get results(){return results;},get badge(){if(!active||step!==1||!results[index])return null;return {to:line()?.moves[0]?.to,...(branch==='best'?{symbol:'★',label:'Bester Zug',className:'verygood'}:grade(results[index],records()[index]))};},open,close,reset,choose,shown,arrow,renderView};
}
