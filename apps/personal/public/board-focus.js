const $=id=>document.getElementById(id);
export function setupBoardFocus(){
  let active=null,opener=null,previousScroll=0,nativePending=false;let inerted=[];
  const solo=document.querySelector('.play'),friend=$('friend-board').parentElement;
  const targets=[{node:solo,board:solo.querySelector('.board-shell'),name:'Dein Schachbrett'},{node:friend,board:$('friend-board'),name:'Gemeinsames Schachbrett'}];
  function fit(){
    if(!active)return;
    const node=active.node,landscape=innerWidth>innerHeight&&innerWidth>=600;
    node.classList.toggle('focus-landscape',landscape);
    const style=getComputedStyle(node),paddingX=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight),paddingY=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
    let width=node.clientWidth-paddingX,height=node.clientHeight-paddingY;
    if(landscape)width-=244;
    else{for(const child of node.children){if(child===active.board||getComputedStyle(child).display==='none')continue;const cs=getComputedStyle(child);height-=child.getBoundingClientRect().height+parseFloat(cs.marginTop)+parseFloat(cs.marginBottom)+8;}}
    node.style.setProperty('--focus-size',Math.max(150,Math.floor(Math.min(width,height)))+'px');
  }
  function reset(){
    if(!active)return;const old=active;active=null;old.node.classList.remove('focus-surface','focus-landscape');old.node.style.removeProperty('--focus-size');
    for(const node of inerted)node.inert=false;inerted=[];document.body.classList.remove('board-focus');old.button.textContent='⛶ Brett vergrößern';old.button.setAttribute('aria-pressed','false');old.note.textContent='Figur antippen, dann das Zielfeld.';
    window.scrollTo(0,previousScroll);opener?.focus({preventScroll:true});
  }
  async function leave(){reset();if(document.fullscreenElement){try{await document.exitFullscreen();}catch{}}}
  async function enter(target){
    if(active){await leave();return;}
    previousScroll=window.scrollY;opener=target.button;active=target;
    for(let node=target.node;node&&node!==document.body;node=node.parentElement){for(const sibling of node.parentElement.children){if(sibling===node||sibling.inert||sibling.matches('dialog,.promotion,script,style'))continue;sibling.inert=true;inerted.push(sibling);}}
    document.body.classList.add('board-focus');target.node.classList.add('focus-surface');target.button.textContent='✕ Vollbild verlassen';target.button.setAttribute('aria-pressed','true');target.note.textContent='Großes Brett · Figur und Zielfeld antippen.';fit();
    // Page-filling mode remains available on browsers without native fullscreen.
    if(document.fullscreenEnabled&&document.documentElement.requestFullscreen){nativePending=true;try{await document.documentElement.requestFullscreen();}catch{}finally{nativePending=false;if(!active&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});fit();}}
    target.button.focus({preventScroll:true});
  }
  for(const target of targets){
    const toolbar=document.createElement('div');toolbar.className='board-tools';
    const note=document.createElement('span');note.className='board-touch-note';note.textContent='Figur antippen, dann das Zielfeld.';
    const button=document.createElement('button');button.type='button';button.className='btn board-expand';button.textContent='⛶ Brett vergrößern';button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',target.name+' vergrößern oder Vollbild verlassen');button.onclick=()=>enter(target);
    toolbar.append(note,button);target.node.prepend(toolbar);Object.assign(target,{button,note});
    if(target===targets[1]){const status=document.createElement('p');status.className='focus-room-status';status.setAttribute('role','status');target.node.append(status);const sync=()=>{status.textContent=$('friend-title').textContent;if(active)fit();};new MutationObserver(sync).observe($('friend-title'),{childList:true,subtree:true,characterData:true});sync();const exit=document.createElement('button');exit.type='button';exit.className='btn focus-friend-actions';exit.textContent='Partie & weitere Aktionen';exit.onclick=leave;target.node.append(exit);}
  }
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&!nativePending)reset();else fit();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active){event.preventDefault();leave();}});
  document.addEventListener('coach-view',event=>{document.body.dataset.boardPage=event.detail;if(active)leave();if(event.detail==='play'&&matchMedia('(max-width:600px)').matches)requestAnimationFrame(()=>solo.scrollIntoView({block:'start',behavior:'instant'}));});
  window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);
  const observer=new MutationObserver(()=>{if(active){if(active.node.closest('[hidden]'))leave();else fit();}});
  observer.observe($('review-controls'),{attributes:true,attributeFilter:['hidden']});observer.observe($('play-controls'),{attributes:true,attributeFilter:['hidden']});observer.observe($('friend-game'),{attributes:true,attributeFilter:['hidden']});
  new ResizeObserver(()=>fit()).observe($('status'));
}
