import { Chess } from './vendor/chess.js';
import { download } from './cloud.js';
const $=id=>document.getElementById(id),files='abcdefgh';
const pieceNames={k:'König',q:'Dame',r:'Turm',b:'Läufer',n:'Springer',p:'Bauer'};
export function setupMultiplayer({user,openReview}) {
  let room=null,game=new Chess(),selected=null,legal=[],sending=false,fetching=false,stamp=performance.now(),pollTimer,epoch=0;
  let savedRemaining={w:0,b:0},clockExpiredRefresh=false;
  const cells=new Map();
  const visible=()=>!document.querySelector('[data-page="friends"]').hidden&&!document.hidden;
  async function api(method,payload,id) {
    const response=await fetch('/api/rooms'+(id?'?id='+encodeURIComponent(id):''),{method,headers:{'Content-Type':'application/json'},...(payload?{body:JSON.stringify({...payload,userId:user.id})}:{}),signal:AbortSignal.timeout(12000)});
    const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error||'Partie gerade nicht erreichbar.'),{status:response.status});return result;
  }
  function message(text,error=false){$('friend-message').textContent=text;$('friend-message').dataset.kind=error?'error':'';}
  function switchView(){document.querySelector('[data-nav="friends"]').click();}
  function startPolling(){clearTimeout(pollTimer);pollTimer=setTimeout(async()=>{if(visible()){if(room)await refresh();else await loadList();}startPolling();},room?.status==='active'||room?.status==='waiting'?3000:15000);}
  function updateURL(id){const url=new URL(location.href);if(id)url.searchParams.set('room',id);else url.searchParams.delete('room');history.replaceState(null,'',url.pathname+url.search);}
  function accept(next){
    if(room?.id===next.id&&next.version<room.version)return;
    const changed=!room||room.id!==next.id||room.version!==next.version;
    room=next;savedRemaining={...(room.remaining||{w:0,b:0})};stamp=performance.now();clockExpiredRefresh=false;
    if(changed){selected=null;legal=[];game=new Chess();for(const move of room.moves||[])game.move(move);}
    $('friend-lobby').hidden=true;$('friend-game').hidden=room.status==='invitation';$('friend-invitation').hidden=room.status!=='invitation';
    if(room.status==='invitation'){$('invite-description').textContent=`${room.hostName} lädt dich ein. Du spielst ${room.color==='w'?'Weiß':'Schwarz'} · ${room.timeLabel}. Die Bedenkzeit beginnt, sobald du beitrittst.`;}
    else render();
    updateURL(room.id);startPolling();
  }
  async function openRoom(id){
    const ticket=++epoch;selected=null;legal=[];message('Partie wird geladen …');
    try{const result=await api('GET',null,id);if(ticket!==epoch)return;accept(result.room);message('');}
    catch(error){if(ticket===epoch)message(error.message,true);}
  }
  async function refresh(){
    if(!room||sending||fetching)return;
    const id=room.id,ticket=epoch;fetching=true;
    try{const result=await api('GET',null,id);if(ticket!==epoch||room?.id!==id)return;accept(result.room);message(navigator.onLine?'Aktueller Spielstand bestätigt.':'Verbindung unterbrochen.',!navigator.onLine);}
    catch(error){if(ticket===epoch)message(error.message,true);}
    finally{fetching=false;}
  }
  async function action(kind,extra={}){
    if(sending)return;const id=room?.id,ticket=epoch;sending=true;render();message('Wird bestätigt …');
    try{const result=await api('POST',{action:kind,id,version:room?.version,...extra});if(ticket!==epoch)return;accept(result.room);message('Gespeichert.');}
    catch(error){message(error.message,true);}
    finally{sending=false;if(room&&ticket===epoch){render();await refresh();}}
  }
  function resultText(value=room){
    if(value.status==='cancelled')return 'Einladung zurückgezogen';
    if(value.result==='1/2-1/2')return 'Remis';
    const winner=value.result==='1-0'?'w':value.result==='0-1'?'b':null;
    return winner?(winner===value.color?'Du gewinnst':'Du verlierst'):'';
  }
  function renderClocks(){
    if(!room||!room.remaining)return;
    const elapsed=room.status==='active'?performance.now()-stamp:0;
    const left={w:Math.max(0,savedRemaining.w-(room.turn==='w'?elapsed:0)),b:Math.max(0,savedRemaining.b-(room.turn==='b'?elapsed:0))};
    const format=ms=>{let sec=Math.ceil(ms/1000);const days=Math.floor(sec/86400);sec%=86400;const hours=Math.floor(sec/3600),minutes=Math.floor((sec%3600)/60),seconds=sec%60;return days?`${days} T ${hours} Std ${minutes} Min`:hours?`${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`:`${minutes}:${String(seconds).padStart(2,'0')}`;};
    for(const color of ['w','b']){const node=$(color==='w'?'white-clock':'black-clock');node.textContent=format(left[color]);node.classList.toggle('clock-active',room.status==='active'&&room.turn===color);}
    if(room.status==='active'&&left[room.turn]===0&&!clockExpiredRefresh){clockExpiredRefresh=true;refresh();}
  }
  function render(){
    if(!room||room.status==='invitation')return;
    $('friend-game').classList.toggle('as-black',room.color==='b');
    $('friend-title').textContent=room.status==='waiting'?'Warte auf deinen Mitspieler':room.status==='finished'?`${resultText()} · ${room.reason}`:room.status==='cancelled'?'Einladung zurückgezogen':game.turn()===room.color?'Du bist am Zug':'Dein Mitspieler ist am Zug';
    $('friend-time-label').textContent=room.timeLabel+(room.timeMode==='correspondence'?' · Frist beginnt nach jedem Zug neu.':' · Die eigene Uhr läuft während des eigenen Zuges.');
    $('white-name').textContent=(room.white.name||'Noch offen')+' · Weiß';$('black-name').textContent=(room.black.name||'Noch offen')+' · Schwarz';
    $('room-share').hidden=room.status!=='waiting';$('room-link').value=`${location.origin}/?room=${room.id}`;
    $('cancel-room').hidden=room.status!=='waiting';$('friend-resign').hidden=room.status!=='active';
    $('friend-resign').disabled=sending;
    $('draw-offer').hidden=room.status!=='active'||!!room.drawOffer;$('draw-offer').disabled=sending;
    $('draw-response').hidden=room.status!=='active'||!room.drawOffer||room.drawOffer===user.id;
    $('draw-pending').hidden=room.drawOffer!==user.id||room.status!=='active';
    $('friend-review').hidden=room.status!=='finished';$('friend-pgn').disabled=!(room.moves?.length);
    const last=game.history({verbose:true}).at(-1),targets=new Set(legal.map(m=>m.to));
    for(const [sq,cell]of cells){
      const piece=game.get(sq),key=piece?piece.color+piece.type:'';
      if(cell.dataset.piece!==key){cell.querySelector('svg')?.remove();if(piece){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 40 40');svg.classList.add('piece');svg.setAttribute('aria-hidden','true');const use=document.createElementNS(svg.namespaceURI,'use');use.setAttribute('href','./vendor/pieces.svg#'+key);svg.append(use);cell.append(svg);}cell.dataset.piece=key;}
      cell.setAttribute('aria-label',sq+(piece?' '+(piece.color==='w'?'Weiß ':'Schwarz ')+pieceNames[piece.type]:''));
      cell.classList.toggle('last',last?.from===sq||last?.to===sq);cell.classList.toggle('selected',selected===sq);cell.classList.toggle('legal',targets.has(sq)&&!piece);cell.classList.toggle('capture',targets.has(sq)&&!!piece);
      cell.disabled=sending||room.status!=='active'||game.turn()!==room.color;
    }
    $('friend-check').textContent=room.status==='active'&&game.isCheck()?'Schach!':'';
    const moves=$('friend-moves'),signature=room.moves.join(' ');if(moves.dataset.signature!==signature){moves.dataset.signature=signature;moves.replaceChildren();if(!room.moves.length)moves.textContent='Die Züge erscheinen hier.';for(let i=0;i<room.moves.length;i+=2){const row=document.createElement('div');row.className='move-row';for(const value of [(i/2+1)+'.',room.moves[i],room.moves[i+1]||'']){const span=document.createElement('span');span.textContent=value;row.append(span);}moves.append(row);}moves.scrollTop=moves.scrollHeight;}
    renderClocks();
  }
  function tap(sq){
    if(!room||sending||room.status!=='active'||game.turn()!==room.color)return;
    const options=selected?legal.filter(m=>m.to===sq):[];
    if(options.length){if(options.some(m=>m.promotion)){const dialog=$('friend-promotion');dialog.replaceChildren();const heading=document.createElement('h3');heading.textContent='In welche Figur umwandeln?';dialog.append(heading);for(const type of ['q','r','b','n']){const button=document.createElement('button');button.className='btn';button.textContent=pieceNames[type];button.onclick=()=>{dialog.close();action('move',{move:{from:selected,to:sq,promotion:type}});};dialog.append(button);}dialog.showModal();return;}action('move',{move:{from:selected,to:sq}});return;}
    const piece=game.get(sq);selected=piece?.color===room.color?sq:null;legal=selected?game.moves({square:selected,verbose:true}):[];render();
  }
  for(let rank=8;rank>=1;rank--)for(let file=0;file<8;file++){
    const sq=files[file]+rank,button=document.createElement('button');button.type='button';button.className='sq '+((rank+file)%2?'dark':'light');button.dataset.square=sq;button.setAttribute('role','gridcell');
    if(!file){const label=document.createElement('span');label.className='coords coord-rank';label.textContent=rank;button.append(label);}if(rank===1){const label=document.createElement('span');label.className='coords coord-file';label.textContent=files[file];button.append(label);}button.onclick=()=>tap(sq);cells.set(sq,button);$('friend-board').append(button);
  }
  async function loadList(){
    if(fetching)return;fetching=true;try{
      const response=await api('GET');const list=$('friend-list');list.replaceChildren();let wins=0,draws=0,losses=0;
      for(const item of response.rooms){
        if(item.status==='finished'){if(item.result==='1/2-1/2')draws++;else if((item.result==='1-0')===(item.color==='w'))wins++;else losses++;}
        const row=document.createElement('article');row.className='friend-list-row';const info=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('p');strong.textContent=`${item.whiteName||'Offen'} – ${item.blackName||'Offen'}`;small.textContent=`${item.status==='waiting'?'Einladung offen':item.status==='active'?'Laufend':item.status==='cancelled'?'Zurückgezogen':resultText(item)} · ${Math.ceil(item.moveCount/2)} Züge · ${new Date(item.updatedAt).toLocaleDateString('de-AT')}`;info.append(strong,small);const button=document.createElement('button');button.className='btn';button.textContent=item.status==='finished'?'Partie ansehen':'Öffnen';button.onclick=()=>openRoom(item.id);row.append(info,button);list.append(row);
      }
      if(!response.rooms.length)list.textContent='Noch keine gemeinsamen Partien. Erstelle eine Einladung und teile den Partielink.';
      $('friend-results').textContent=`${wins} Siege · ${draws} Remis · ${losses} Niederlagen`;
    }catch(error){message(error.message,true);}finally{fetching=false;}
  }
  async function createInvitation(color,timeControl){
    if(sending)return false;sending=true;$('create-room').disabled=true;const ticket=++epoch;
    try{const result=await api('POST',{action:'create',color,timeControl});if(ticket===epoch){accept(result.room);switchView();message('Einladung erstellt. Teile jetzt den Partielink.');return true;}}
    catch(error){message(error.message,true);throw error;}
    finally{sending=false;$('create-room').disabled=false;}
    return false;
  }
  $('create-room').onclick=()=>createInvitation($('friend-color').value,$('friend-time').value).catch(()=>{});
  $('join-room').onclick=()=>action('join');
  $('room-back').onclick=()=>{epoch++;room=null;$('friend-lobby').hidden=false;$('friend-game').hidden=true;$('friend-invitation').hidden=true;updateURL(null);message('');loadList();};
  $('invite-back').onclick=()=>$('room-back').click();
  $('copy-room').onclick=async()=>{try{await navigator.clipboard.writeText($('room-link').value);message('Partielink kopiert. Diesen Link kannst du deinem Mitspieler schicken.');}catch{$('room-link').select();message('Bitte den markierten Partielink kopieren.');}};
  $('friend-refresh').onclick=()=>room?refresh():loadList();
  $('friend-resign').onclick=()=>{if(confirm('Diese Partie aufgeben?'))action('resign');};
  $('cancel-room').onclick=()=>action('cancel');
  $('draw-offer').onclick=()=>action('offer-draw');$('accept-draw').onclick=()=>action('accept-draw');$('decline-draw').onclick=()=>action('decline-draw');
  $('friend-review').onclick=()=>{if(room?.status==='finished')openReview(room);};
  $('friend-pgn').onclick=()=>{if(room)download(room.pgn,`freundschaftspartie-${room.id}.pgn`,'application/x-chess-pgn');};
  document.addEventListener('coach-view',event=>{if(event.detail==='friends'){if(room)refresh();else loadList();}});
  document.addEventListener('visibilitychange',()=>{if(visible()){if(room)refresh();else loadList();}});
  window.addEventListener('online',()=>{if(visible()){if(room)refresh();else loadList();}});
  window.addEventListener('offline',()=>message('Offline · Die Bedenkzeit läuft weiter. Zum Ziehen bitte wieder verbinden.',true));
  setInterval(()=>{if(visible())renderClocks();},1000);startPolling();
  $('friend-new-setup').onclick=()=>document.querySelector('[data-nav=setup]').click();
  const invitation=new URLSearchParams(location.search).get('room');if(invitation){switchView();openRoom(invitation);}
  return {createInvitation};
}
