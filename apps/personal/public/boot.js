import { initialize, setStatusListener, exportBackup, discardPending, flush } from './cloud.js';
const $ = id => document.getElementById(id);
setStatusListener((text, kind) => { for (const id of ['save-status', 'sync-status']) { const node = $(id); if (node) { node.textContent = text; node.dataset.kind = kind; } } });
let loaded = false;
async function boot() {
  $('gate-message').textContent = 'Deine Partien werden geladen …';
  $('login-form').hidden = true;
  try {
    await initialize();
    if (!loaded) { await import('./app.js'); loaded = true; }
    $('gate').hidden = true; $('workspace').hidden = false;
  } catch (error) {
    $('gate').hidden = false; $('gate-message').textContent = error.message;
    $('login-form').hidden = error.status !== 401;
    $('conflict-actions').hidden = error.status !== 409;
    $('gate-retry').hidden = error.status === 401 || error.status === 409;
  }
}
$('login-form').onsubmit = async event => {
  event.preventDefault(); const submit = $('login-submit'); submit.disabled = true;
  try {
    const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('password').value }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    $('password').value = ''; await boot();
  } catch (error) { $('gate-message').textContent = error.message; }
  finally { submit.disabled = false; }
};
$('gate-retry').onclick = boot;
$('pending-export').onclick = () => { exportBackup(true); $('load-server').disabled = false; };
$('load-server').onclick = () => { if (confirm('Die heruntergeladene Sicherung behalten. Jetzt den neueren Serverstand laden?')) discardPending(); };
$('retry-sync').onclick = () => flush();
boot();
