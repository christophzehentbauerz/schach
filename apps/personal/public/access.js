import { initialize, setStatusListener, exportBackup, discardPending, flush, hasPending, download } from './cloud.js';
const $=id=>document.getElementById(id);
let user=null,appLoaded=false,personalLink='';
setStatusListener((text,kind)=>{for(const id of ['save-status','sync-status']){const node=$(id);if(node){node.textContent=text;node.dataset.kind=kind;}}});
async function session(payload,method='POST') {
  const response=await fetch('/api/session',{method,headers:{'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(15000)});
  const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error),{status:response.status});return result;
}
const linkFor=token=>`${location.origin}/#access=${token}`;
function showLink(token) {
  personalLink=linkFor(token);$('personal-link').value=personalLink;$('link-ready').hidden=false;$('replace-access').hidden=true;$('access-message').textContent='Bewahre diesen Link privat auf. Er öffnet dein Profil auf anderen Geräten. Teile zum Spielen nur den Partielink.';
  $('access-dialog').showModal();
}
async function boot() {
  $('gate-message').textContent='Deine Partien werden geladen …';$('login-form').hidden=true;$('gate-retry').hidden=true;
  try {
    const state=await initialize();user=state.user;
    $('profile-name').textContent=user.name;
    if(!appLoaded){const app=await import('./app.js');const {setupMultiplayer}=await import('./multiplayer.js');const multiplayer=setupMultiplayer({user,openReview:app.openFriendReview});const {setupStart}=await import('./setup.js');setupStart({app,multiplayer});appLoaded=true;}
    $('gate').hidden=true;$('workspace').hidden=false;
  }catch(error){$('gate').hidden=false;$('gate-message').textContent=error.message;$('login-form').hidden=error.status!==401;$('conflict-actions').hidden=error.status!==409;$('gate-retry').hidden=error.status===401||error.status===409;}
}
$('login-form').onsubmit=async event=>{
  event.preventDefault();$('login-submit').disabled=true;
  try{const created=await session({action:'create',name:$('player-name').value});await boot();showLink(created.token);}
  catch(error){$('gate-message').textContent=error.message;}finally{$('login-submit').disabled=false;}
};
$('gate-retry').onclick=boot;
$('pending-export').onclick=()=>{exportBackup(true);$('load-server').disabled=false;};
$('load-server').onclick=()=>{if(confirm('Die heruntergeladene Sicherung behalten. Jetzt den neueren Serverstand laden?'))discardPending();};
$('retry-sync').onclick=()=>flush();
$('open-access').onclick=()=>{
  $('link-ready').hidden=!personalLink;$('replace-access').hidden=!!personalLink;
  $('access-message').textContent=personalLink?'Diesen persönlichen Zugangslink privat behalten. Zum Spielen einen Partielink teilen.':'Du bist auf diesem Gerät angemeldet. Bei Bedarf kannst du einen neuen persönlichen Zugangslink erstellen; ältere Zugangslinks werden dadurch ungültig.';
  $('access-dialog').showModal();
};
$('close-access').onclick=()=>$('access-dialog').close();
$('replace-access').onclick=async()=>{try{if(!confirm('Neuen Zugangslink erstellen? Bisherige Zugangslinks funktionieren danach nicht mehr.'))return;const result=await session({action:'new-link'});showLink(result.token);}catch(error){$('access-message').textContent=error.message;}};
$('copy-access').onclick=async()=>{try{await navigator.clipboard.writeText(personalLink);$('access-message').textContent='Zugangslink kopiert. Bitte privat aufbewahren.';}catch{$('personal-link').select();$('access-message').textContent='Markierten Link kopieren oder als Datei speichern.';}};
$('save-access').onclick=()=>download(`${user?.name||'Schachcoach'} – persönlicher Zugang\n\n${personalLink}\n\nPrivat aufbewahren. Zum Spielen einen Partielink teilen.\n`,'Schachcoach-Zugangslink.txt');
$('logout').onclick=async()=>{
  if(!confirm('Profil auf diesem Gerät schließen? Halte deinen persönlichen Zugangslink bereit.'))return;
  if(hasPending()&&!await flush()){$('access-message').textContent='Änderungen sind noch nicht gespeichert. Bitte zuerst synchronisieren oder sichern.';return;}
  try{await session(null,'DELETE');location.assign('/');}catch(error){$('access-message').textContent=error.message;}
};
const fragment=new URLSearchParams(location.hash.slice(1)),token=fragment.get('access');
if(token){
  history.replaceState(null,'',location.pathname+location.search);
  try{await session({action:'redeem',token});personalLink=linkFor(token);$('personal-link').value=personalLink;await boot();}
  catch(error){$('gate-message').textContent=error.message;$('login-form').hidden=false;}
}else await boot();
