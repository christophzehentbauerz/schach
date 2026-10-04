import { LEVELS } from './computer.js';
const $=id=>document.getElementById(id);
export function setupStart({app,multiplayer}){
  let opponent='computer',busy=false;
  for(const [value,level]of Object.entries(LEVELS)){const option=document.createElement('option');option.value=value;option.textContent=`${value} · ${level.label}${value==='1400'?' · Empfehlung':''}`;$('setup-strength').append(option);}
  $('setup-strength').value='1400';
  const color=()=>{const value=$('setup-color').value;return value==='random'?(crypto.getRandomValues(new Uint8Array(1))[0]%2?'w':'b'):value;};
  function update(){
    const strength=Number($('setup-strength').value),level=LEVELS[strength],friend=opponent==='friend';
    document.querySelectorAll('[data-opponent]').forEach(button=>{const selected=button.dataset.opponent===opponent;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
    $('setup-computer-options').hidden=friend;$('setup-friend-options').hidden=!friend;
    $('strength-description').textContent=strength<1400?'Stockfish bewertet mehrere gute Züge. Niedrigere Stufen erlauben größere Ungenauigkeiten.':'Stockfish mit begrenzter Zielstärke. Höhere Werte bieten eine stärkere Herausforderung.';
    $('setup-summary-title').textContent=friend?'Deine Freundschaftspartie':'Deine Computerpartie';
    const colorText=$('setup-color').selectedOptions[0].textContent;
    $('setup-summary-text').textContent=friend?`${$('setup-time').selectedOptions[0].textContent} · ${colorText}`:`Stockfish · ${strength} · ${level.label} · ${colorText}`;
    $('setup-save-note').textContent=friend?'Nach dem Erstellen erhältst du einen Partielink. Teile ihn mit einer Person. Jeder spielt mit seinem eigenen Profil.':'Ohne Uhr. Deine Züge werden gespeichert. Tipps und Rücknahmen machen die Partie zu einer ungewerteten Trainingspartie.';
    $('start-game').textContent=friend?'Einladung erstellen':'Computerpartie starten';
    const current=app.activeGame();$('resume-card').hidden=!current.available;
    $('resume-description').textContent=`${current.mode==='ai'?'Computer · '+current.strength:'Freies Brett'} · ${current.color==='w'?'Weiß':'Schwarz'} · ${Math.ceil(current.moves/2)} Züge`;
  }
  for(const button of document.querySelectorAll('[data-opponent]'))button.onclick=()=>{if(busy)return;opponent=button.dataset.opponent;$('setup-message').textContent='';update();};
  for(const id of ['setup-strength','setup-time','setup-color'])$(id).onchange=update;
  $('start-game').onclick=async()=>{
    if(busy)return;busy=true;$('start-game').disabled=true;$('setup-message').textContent=opponent==='friend'?'Einladung wird gespeichert …':'';
    try{if(opponent==='friend')await multiplayer.createInvitation(color(),$('setup-time').value);else app.beginGame({strength:Number($('setup-strength').value),color:color(),opponent:'computer'});}
    catch(error){$('setup-message').textContent=error.message;}
    finally{busy=false;$('start-game').disabled=false;}
  };
  $('resume-current').onclick=()=>app.resumeGame();
  $('setup-open-friends').onclick=()=>document.querySelector('[data-nav=friends]').click();
  $('setup-free-board').onclick=()=>app.beginGame({strength:Number($('setup-strength').value),color:color(),opponent:'board'});
  document.addEventListener('coach-view',event=>{if(event.detail==='setup')update();});
  update();if(!new URLSearchParams(location.search).has('room'))app.showStart();
}
