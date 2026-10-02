import { storage, download, exportBackup, flush, isConflict } from './cloud.js';
import { decode } from './saved-game.js';
import { Chess } from './vendor/chess.js';
const META = 'schachcoach-active-v2', PREFIX = 'schachcoach-partie-';
const $ = id => document.getElementById(id);
export function readMeta() { try { return JSON.parse(storage.getItem(META)); } catch { return null; } }
export function freshMeta(color = 'w') { return { id: crypto.randomUUID(), color, createdAt: Date.now(), result: null, assisted: false }; }
export function saveMeta(meta) { storage.setItem(META, JSON.stringify(meta)); }
export function saveToLibrary(meta, game, mode, elo, records) {
  saveMeta(meta);
  if (!records.length && !meta.result) return;
  const old = JSON.parse(storage.getItem(PREFIX + meta.id) || 'null');
  const snapshot = { version: 1, moves: records.map(r => r.san), startFen: records[0]?.before, mode, elo, savedAt: Date.now() };
  storage.setItem(PREFIX + meta.id, JSON.stringify({ ...old, ...meta, snapshot, pgn: game.pgn(), updatedAt: Date.now() }));
}
export function allGames() { return storage.keys().filter(k => k.startsWith(PREFIX)).map(k => { try { return JSON.parse(storage.getItem(k)); } catch { return null; } }).filter(Boolean).sort((a,b) => b.updatedAt - a.updatedAt); }
export function setupLibrary({ open, progress, getCurrent }) {
  const labels = { win: 'Sieg', loss: 'Niederlage', draw: 'Remis', imported: 'Importiert' };
  const format = time => new Date(time).toLocaleDateString('de-AT', { day: '2-digit', month: 'short', year: 'numeric' });
  function setView(name) {
    document.querySelectorAll('[data-page]').forEach(node => { node.hidden = node.dataset.page !== name; });
    document.querySelectorAll('[data-nav]').forEach(node => { node.classList.toggle('active', node.dataset.nav === name); node.setAttribute('aria-current', node.dataset.nav === name ? 'page' : 'false'); });
    if (name === 'archive') renderArchive();
    if (name === 'progress') renderProgress();
  }
  function renderArchive() {
    const list = $('archive-list'), filter = $('archive-filter').value, items = allGames().filter(g => !filter || (filter === 'active' ? !g.result : g.result === filter));
    list.replaceChildren();
    $('archive-count').textContent = `${items.length} ${items.length === 1 ? 'Partie' : 'Partien'}`;
    if (!items.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'Hier erscheinen deine gespeicherten Partien. Jeder gespielte Zug zählt.'; list.append(empty); return; }
    for (const item of items) {
      const row = document.createElement('article'); row.className = 'archive-row';
      const icon = document.createElement('span'); icon.className = 'result-icon ' + (item.result || 'active'); icon.textContent = item.result === 'win' ? '1' : item.result === 'loss' ? '0' : item.result === 'draw' ? '½' : '♟';
      const info = document.createElement('div'), title = document.createElement('strong'), detail = document.createElement('p');
      title.textContent = `${item.snapshot.mode === 'ai' ? 'Computer · Stufe ' + item.snapshot.elo : 'Freies Brett / Import'} · ${labels[item.result] || 'Laufend'}`;
      detail.textContent = `${format(item.createdAt)} · ${Math.ceil(item.snapshot.moves.length/2)} Züge · ${item.color === 'b' ? 'Schwarz' : 'Weiß'}${item.assisted ? ' · mit Hilfe' : ''}`;
      info.append(title, detail);
      const button = document.createElement('button'); button.className = 'btn'; button.textContent = item.result ? 'Analysieren' : 'Fortsetzen';
      button.onclick = async () => { if (isConflict()) { alert('Bitte zuerst den Speicherkonflikt lösen.'); return; } await flush(); open(item, decode(JSON.stringify(item.snapshot))); setView('play'); };
      const pgn = document.createElement('button'); pgn.className = 'btn quiet'; pgn.textContent = 'PGN'; pgn.setAttribute('aria-label', `Partie vom ${format(item.createdAt)} als PGN herunterladen`); pgn.onclick = () => download(item.pgn, `partie-${item.id}.pgn`, 'application/x-chess-pgn');
      row.append(icon, info, button, pgn); list.append(row);
    }
  }
  function renderProgress() {
    const rating = progress();
    $('stat-rating').textContent = rating.rating; $('stat-games').textContent = rating.games;
    $('stat-wins').textContent = rating.wins; $('stat-draws').textContent = rating.draws; $('stat-losses').textContent = rating.losses;
    const chart = $('rating-chart'); chart.replaceChildren();
    const history = rating.history.slice(-24);
    if (!history.length) { chart.textContent = 'Nach deiner ersten gewerteten Computerpartie siehst du hier deine Entwicklung.'; }
    else {
    const minimum = Math.min(500, ...history.map(g => g.after)) - 25, maximum = Math.max(500, ...history.map(g => g.after)) + 25;
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox','0 0 800 200'); svg.setAttribute('role','img'); svg.setAttribute('aria-label',`Lern-Elo der letzten ${history.length} Partien: ${history.map(g=>g.after).join(', ')}`);
    const points = [history[0].before, ...history.map(g=>g.after)].map((v,i) => `${20+i*(760/history.length)},${175-(v-minimum)/(maximum-minimum)*150}`).join(' ');
    const line = document.createElementNS(ns, 'polyline'); line.setAttribute('points',points); line.setAttribute('fill','none'); line.setAttribute('stroke','#b9db71'); line.setAttribute('stroke-width','3'); svg.append(line); chart.append(svg);
    const caption = document.createElement('p'); caption.textContent = `${history[0].before} → ${history.at(-1).after} Lern-Elo · letzte ${history.length} Partien`; chart.append(caption);
    }
    const problems = [];
    for (const item of allGames()) {
      const cache = JSON.parse(storage.getItem('schachcoach-analysis-' + item.id) || 'null');
      cache?.results?.forEach((result,index) => { if (result?.loss >= 80 && index % 2 === (item.color === 'b' ? 1 : 0)) problems.push({item,index,loss:result.loss}); });
    }
    const practice = $('practice-list'); practice.replaceChildren();
    if (!problems.length) practice.textContent = 'Analysiere eine Partie. Anschließend findest du hier die Stellungen, in denen du am meisten verbessern kannst.';
    problems.sort((a,b)=>b.loss-a.loss).slice(0,8).forEach(({item,index,loss}) => {
      const button = document.createElement('button'); button.className='practice-item'; button.textContent = `${format(item.createdAt)} · Zug ${Math.floor(index/2)+1}: ${item.snapshot.moves[index]} · ${(loss/100).toFixed(1)} Bauerneinheiten`;
      button.onclick=()=>{open(item,decode(JSON.stringify(item.snapshot)),index);setView('play');}; practice.append(button);
    });
  }
  document.querySelectorAll('[data-nav]').forEach(button => button.onclick = () => setView(button.dataset.nav));
  $('archive-filter').onchange = renderArchive;
  $('export-backup').onclick = () => exportBackup();
  $('export-pgn').onclick = () => { const { game, meta } = getCurrent(); download(game.pgn(), `schachcoach-${meta.id}.pgn`, 'application/x-chess-pgn'); };
  $('import-backup').onchange = async event => {
    try {
      const file=event.target.files[0]; if(!file)return; if(file.size>3000000)throw new Error('Sicherung ist zu groß.');
      const input=JSON.parse(await file.text()); if(input.version!==2||!input.data)throw new Error('Keine Schachcoach-Sicherung.');
      const games=Object.entries(input.data).filter(([key])=>key.startsWith(PREFIX));
      for(const [,raw] of games){const item=JSON.parse(raw);decode(JSON.stringify(item.snapshot));if(!/^[a-zA-Z0-9-]+$/.test(item.id))throw new Error('Ungültige Partie.');}
      if(!games.length)throw new Error('Keine archivierten Partien in der Sicherung.');
      let count=0;for(const [key,value] of games)if(!storage.getItem(key)){storage.setItem(key,value);count++;}
      const ok=await flush();$('backup-message').textContent=`${count} zusätzliche Partien übernommen${ok?' und gespeichert.':'; Speicherung noch ausstehend.'}`;renderArchive();
    }catch(error){$('backup-message').textContent=error.message;} finally {event.target.value='';}
  };
  return { setView, renderArchive, renderProgress };
}
