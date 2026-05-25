const MAX_SLOTS = 5;
const MIME_MAP = {html:'text/html',htm:'text/html',js:'application/javascript',mjs:'application/javascript',cjs:'application/javascript',css:'text/css',json:'application/json',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',bmp:'image/bmp',ico:'image/x-icon',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',mp4:'video/mp4',webm:'video/webm',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',eot:'application/vnd.ms-fontobject',txt:'text/plain',xml:'application/xml',wasm:'application/wasm'};
const getMime = n => MIME_MAP[n.split('.').pop().toLowerCase()] || 'application/octet-stream';
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function gameIconHtml(icon) {
  if (!icon) return '<i class="fa-solid fa-gamepad"></i>';
  return '<img src="' + esc(String(icon)) + '" alt="">';
}
function imgSrcTag(src, className, extraAttrs) {
  if (!src) return '';
  let h = '<img src="' + esc(String(src)) + '" alt=""';
  if (className) h += ' class="' + esc(className) + '"';
  if (extraAttrs) h += ' ' + extraAttrs;
  return h + '>';
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const blobToDataUrl = b => new Promise(r => { const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(b); });

window.games = window.games || [];
let games = window.games;

/** ZENOAPPS catalog HTML files (from zenodeployment games/) */
const ZENOAPPS_BASE = 'games assets/zenoapps/';
function zenoAppEntryPath(id) {
  if (id === 'cine-cloud') return 'https://flux-worker.eclipseservice.workers.dev/fetch/aHR0cHM6Ly9jY2NpaWlubm5lZWUuYi1jZG4ubmV0Lw==';
  return ZENOAPPS_BASE + id + '.html';
}
function normalizeZenoAppPath(entryPath) {
  if (!entryPath || /^https?:\/\//i.test(entryPath)) return entryPath;
  if (entryPath.startsWith(ZENOAPPS_BASE)) return entryPath;
  if (entryPath.startsWith('./' + ZENOAPPS_BASE)) return entryPath.slice(2);
  if (entryPath.startsWith('games/')) return ZENOAPPS_BASE + entryPath.slice(6);
  return entryPath;
}
window.ZENOAPPS_BASE = ZENOAPPS_BASE;
window.zenoAppEntryPath = zenoAppEntryPath;
window.normalizeZenoAppPath = normalizeZenoAppPath;

// ── METADATA ────────────────────────────────────────────────────
const META_KEY = 'zeno-game-meta';
function loadMeta() { try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch(e) { return {}; } }
function saveMeta(m) { localStorage.setItem(META_KEY, JSON.stringify(m)); }
function getGameMeta(id) { const m = loadMeta(); return m[id] || {}; }
function setGameMeta(id, patch) { const m = loadMeta(); m[id] = { ...(m[id] || {}), ...patch }; saveMeta(m); }

// ── COLLECTIONS ─────────────────────────────────────────────────
const COLL_KEY = 'zeno-collections';
function loadCollections() { try { return JSON.parse(localStorage.getItem(COLL_KEY) || '[]'); } catch(e) { return []; } }
function saveCollections(c) { localStorage.setItem(COLL_KEY, JSON.stringify(c)); }
let activeCollFilter = null;

function openCollModal() {
  renderCollList();
  document.getElementById('collModal').classList.add('open');
}
function closeCollModal() { document.getElementById('collModal').classList.remove('open'); }
document.getElementById('collModal').addEventListener('click', e => { if(e.target===document.getElementById('collModal')) closeCollModal(); });

function addCollection() {
  const name = document.getElementById('collNameInput').value.trim();
  if (!name) return;
  const emoji = document.getElementById('collEmojiInput').value.trim() || '🎮';
  const colls = loadCollections();
  if (colls.find(c=>c.name===name)) { showToast('COLLECTION EXISTS', true); return; }
  colls.push({ id: 'c'+Date.now().toString(36), name, emoji });
  saveCollections(colls);
  document.getElementById('collNameInput').value = '';
  document.getElementById('collEmojiInput').value = '';
  renderCollList();
  renderCollFilterBtns();
  showToast('COLLECTION CREATED');
}
function deleteCollection(id) {
  const colls = loadCollections().filter(c=>c.id!==id);
  saveCollections(colls);
  const meta = loadMeta();
  for (const k of Object.keys(meta)) { if (meta[k].collections) meta[k].collections = meta[k].collections.filter(c=>c!==id); }
  saveMeta(meta);
  if (activeCollFilter===id) activeCollFilter=null;
  renderCollList(); renderCollFilterBtns(); renderGrid();
}
function renderCollList() {
  const colls = loadCollections();
  const el = document.getElementById('collList');
  if (!colls.length) { el.innerHTML = '<div style="text-align:center;padding:20px;font-family:\'Orbitron\',monospace;font-size:9px;letter-spacing:2px;color:var(--muted)">NO COLLECTIONS YET</div>'; return; }
  el.innerHTML = colls.map(c => {
    const count = games.filter(g => (getGameMeta(g.id).collections||[]).includes(c.id)).length;
    return `<div class="coll-item"><div class="coll-item-emoji">${esc(String(c.emoji||''))}</div><div class="coll-item-name">${esc(c.name)}</div><div class="coll-item-count">${count} GAME${count!==1?'S':''}</div><button class="coll-item-del" onclick="deleteCollection('${c.id}')"><i class="fa-solid fa-trash"></i></button></div>`;
  }).join('');
}
function renderCollFilterBtns() {
  const colls = loadCollections();
  const el = document.getElementById('collFilterBtns');
  const sep = document.getElementById('collFilterSep');
  if (!colls.length) { el.innerHTML=''; sep.style.display='none'; return; }
  sep.style.display='block';
  el.innerHTML = colls.map(c => `<button class="filter-coll-btn${activeCollFilter===c.id?' active':''}" onclick="setCollFilter('${c.id}')">${esc(String(c.emoji||''))} ${esc(c.name)}</button>`).join('');
}
function setCollFilter(id) {
  activeCollFilter = activeCollFilter===id ? null : id;
  renderCollFilterBtns();
  renderGrid();
}

// ── SORT & SIZE ──────────────────────────────────────────────────
let currentSort = localStorage.getItem('zeno-sort') || 'default';
let currentSize = localStorage.getItem('zeno-card-size') || 'md';
function setSort(s) {
  currentSort = s;
  localStorage.setItem('zeno-sort', s);
  document.querySelectorAll('.sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === s));
  renderGrid();
}
function setSize(s) {
  currentSize = s;
  localStorage.setItem('zeno-card-size', s);
  document.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('active', b.dataset.size === s));
  const grid = document.getElementById('gameGrid');
  grid.className = 'game-grid size-' + s;
}
function toggleFavorite(e, id) {
  e.stopPropagation();
  const meta = getGameMeta(id);
  setGameMeta(id, { fav: !meta.fav });
  renderGrid();
}
function openStatusPicker(e, id) {
  e.stopPropagation();
  document.querySelectorAll('.status-picker').forEach(p => p.classList.remove('open'));
  const picker = document.getElementById('sp-'+id);
  if (picker) picker.classList.add('open');
}
function setStatus(e, id, status) {
  e.stopPropagation();
  setGameMeta(id, { status: status || null });
  document.querySelectorAll('.status-picker').forEach(p => p.classList.remove('open'));
  renderGrid();
}
document.addEventListener('click', () => {
  document.querySelectorAll('.status-picker').forEach(p => p.classList.remove('open'));
  closeCtxMenu();
});
function formatTime(ms) {
  if (!ms) return null;
  const m = Math.floor(ms / 60000);
  if (m < 1) return '<1m';
  if (m < 60) return m + 'm';
  return Math.floor(m/60) + 'h ' + (m%60) + 'm';
}
function formatLastPlayed(ts) {
  if (!ts) return null;
  const diff = Date.now() - ts;
  const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24);
  if (d > 30) return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric'});
  if (d >= 1) return d + 'd ago';
  if (h >= 1) return h + 'h ago';
  if (m >= 1) return m + 'm ago';
  return 'just now';
}
function saveRecentGameForHome(game, lastPlayed) {
  const key = 'zeno_recent_games';
  let recent = readRecentGames();
  const entry = {
    id: game.id,
    name: game.name,
    icon: game.icon || '',
    thumbnail: game.icon || '',
    entryPath: game.entryPath || '',
    r2: !!game.r2,
    zenoapp: !!game.zenoapp,
    lastPlayed,
  };
  recent = [entry, ...recent.filter(g => g && g.id !== game.id)]
    .filter(g => g && g.id && g.name)
    .slice(0, 8);
  const payload = JSON.stringify(recent);
  try {
    localStorage.setItem(key, payload);
  } catch {
    try {
      localStorage.setItem(key, JSON.stringify(recent.slice(0, 3).map(g => ({
        id: g.id,
        name: g.name,
        entryPath: g.entryPath,
        r2: !!g.r2,
        zenoapp: !!g.zenoapp,
        lastPlayed: g.lastPlayed,
      }))));
    } catch {}
  }
  try { sessionStorage.setItem(key, payload); } catch {}
  try { document.cookie = key + '=' + encodeURIComponent(payload) + ';path=/;max-age=31536000;SameSite=Lax'; } catch {}
  try { window.name = 'zeno_recent_games:' + payload; } catch {}
  updateHomeRecentLinks(payload);
  document.documentElement.dataset.zenoRecentGame = game.id;
  window.dispatchEvent(new CustomEvent('zeno:recent-games-updated', { detail: { gameId: game.id } }));
  if (typeof renderRecentRow === 'function') renderRecentRow();
  syncResumeButton();
}
function updateHomeRecentLinks(payload) {
  const url = 'index.html?recent=' + encodeURIComponent(payload);
  document.querySelectorAll('a[href="index.html"], a[href="./index.html"]').forEach(link => {
    link.setAttribute('href', url);
  });
}
function readRecentGames() {
  const key = 'zeno_recent_games';
  const cookie = document.cookie.split('; ').find(row => row.startsWith(key + '='));
  const handoff = window.name?.startsWith('zeno_recent_games:') ? window.name.slice('zeno_recent_games:'.length) : '';
  const raw = localStorage.getItem(key) || sessionStorage.getItem(key) || (cookie ? decodeURIComponent(cookie.slice(key.length + 1)) : '') || handoff || '[]';
  try { const parsed = JSON.parse(raw || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function latestRecentGame() {
  const recent = readRecentGames();
  for (const item of recent) {
    const match = games.find(g => g.id === item.id);
    if (match) return match;
  }
  const meta = loadMeta();
  return games
    .map(g => ({ game: g, lastPlayed: (meta[g.id] || {}).lastPlayed || 0 }))
    .filter(x => x.lastPlayed)
    .sort((a, b) => b.lastPlayed - a.lastPlayed)[0]?.game || null;
}
function syncResumeButton() {
  const btn = document.getElementById('resumeGameBtn');
  if (!btn) return;
  const game = latestRecentGame();
  btn.disabled = !game;
  btn.title = game ? 'Resume ' + game.name : 'Resume last played';
}
function launchLastPlayedGame() {
  const game = latestRecentGame();
  if (!game) { showToast('NO RECENT GAME YET'); return; }
  openGameModal(game);
}

// ── CONTEXT MENU ─────────────────────────────────────────────────
let ctxGameId = null;
function openCtxMenu(e, id) {
  e.preventDefault();
  e.stopPropagation();
  ctxGameId = id;
  const menu = document.getElementById('ctxMenu');
  if (!menu) return;
  menu.style.display = 'flex';
  let x = e.clientX, y = e.clientY;
  const mw = 180, mh = 240;
  if (x + mw > window.innerWidth) x = window.innerWidth - mw - 8;
  if (y + mh > window.innerHeight) y = window.innerHeight - mh - 8;
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  const gm = getGameMeta(id);
  const isFav = !!gm.fav;
  document.getElementById('ctxFavLabel').textContent = isFav ? '★ UNFAVORITE' : '☆ FAVORITE';
}
function closeCtxMenu() {
  const m = document.getElementById('ctxMenu');
  if (m) m.style.display = 'none';
  ctxGameId = null;
}
function ctxAction(action) {
  const id = ctxGameId;
  closeCtxMenu();
  if (!id) return;
  const game = games.find(g=>g.id===id);
  if (action === 'play' && game) openGameModal(game);
  else if (action === 'fav') { const m=getGameMeta(id); setGameMeta(id,{fav:!m.fav}); renderGrid(); }
  else if (action === 'info') openSidebar({stopPropagation:()=>{}}, id);
  else if (action === 'export' && game) exportZenopack({stopPropagation:()=>{}}, id);
  else if (action === 'delete') removeGame({stopPropagation:()=>{}}, id);
}

// ── BULK SELECT MODE ─────────────────────────────────────────────
let bulkMode = false;
let bulkSelected = new Set();
function toggleBulkMode() {
  bulkMode = !bulkMode;
  bulkSelected.clear();
  renderGrid();
  const bar = document.getElementById('bulkBar');
  if (bar) bar.style.display = bulkMode ? 'flex' : 'none';
  if (!bulkMode) updateBulkBar();
}
function toggleBulkSelect(e, id) {
  e.stopPropagation();
  if (!bulkMode) return;
  if (bulkSelected.has(id)) bulkSelected.delete(id);
  else bulkSelected.add(id);
  updateBulkBar();
  renderGrid();
}
function updateBulkBar() {
  const bar = document.getElementById('bulkBar');
  if (!bar) return;
  const count = bulkSelected.size;
  const label = document.getElementById('bulkCount');
  if (label) label.textContent = count + ' SELECTED';
  const delBtn = document.getElementById('bulkDeleteBtn');
  if (delBtn) delBtn.disabled = count === 0;
}
function bulkDeleteSelected() {
  if (!bulkSelected.size) return;
  const count = bulkSelected.size;
  const sw = getSW();
  for (const id of bulkSelected) {
    if (sw) sw.postMessage({type:'UNREGISTER_GAME',payload:{gameId:id}});
    games.splice(0, games.length, ...games.filter(g=>g.id!==id));
    deleteGameFromDB(id).catch(console.error);
    window._fbDeleteGame?.(id);
  }
  bulkSelected.clear();
  toggleBulkMode();
  showToast(`${count} GAME${count>1?'S':''} REMOVED`);
  renderGrid();
}
function bulkSelectAll() {
  if (bulkSelected.size === games.length) bulkSelected.clear();
  else games.forEach(g => bulkSelected.add(g.id));
  updateBulkBar();
  renderGrid();
}

// ── ANIMATED BACKGROUNDS ─────────────────────────────────────────
let bgAnimFrame = null;
const BG_KEY = 'zeno-bg';
function setBg(type) {
  localStorage.setItem(BG_KEY, type);
  document.querySelectorAll('.bg-swatch').forEach(s => s.classList.toggle('active', s.dataset.bg === type));
  cancelAnimationFrame(bgAnimFrame);
  const canvas = document.getElementById('bgCanvas');
  const ctx = canvas.getContext('2d');
  if (type === 'none') { canvas.classList.remove('active'); document.body.style.removeProperty('--bg-override'); return; }
  canvas.classList.add('active');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  if (type === 'particles') animParticles(canvas, ctx);
  else if (type === 'waves') animWaves(canvas, ctx);
}
function animParticles(canvas, ctx) {
  const orbs = Array.from({length:18}, () => ({
    x: Math.random()*canvas.width, y: Math.random()*canvas.height,
    r: 40+Math.random()*120, vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.25,
    color: Math.random()>.5 ? 'rgba(0,245,255,' : 'rgba(191,0,255,', opacity: .04+Math.random()*.06
  }));
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (const o of orbs) {
      o.x += o.vx; o.y += o.vy;
      if (o.x < -o.r) o.x = canvas.width+o.r;
      if (o.x > canvas.width+o.r) o.x = -o.r;
      if (o.y < -o.r) o.y = canvas.height+o.r;
      if (o.y > canvas.height+o.r) o.y = -o.r;
      const g = ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r);
      g.addColorStop(0, o.color+o.opacity+')');
      g.addColorStop(1, o.color+'0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,Math.PI*2); ctx.fill();
    }
    bgAnimFrame = requestAnimationFrame(draw);
  }
  draw();
}
function animWaves(canvas, ctx) {
  let t = 0;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const lines = 6;
    for (let i=0;i<lines;i++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(0,245,255,${.015+i*.008})`;
      ctx.lineWidth = 1;
      for (let x=0;x<=canvas.width;x+=4) {
        const y = canvas.height*.3 + Math.sin((x/canvas.width)*Math.PI*4 + t + i*.5)*40*(1+i*.3) + i*(canvas.height*.08);
        x===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    t += .008;
    bgAnimFrame = requestAnimationFrame(draw);
  }
  draw();
}
window.addEventListener('resize', () => {
  const canvas = document.getElementById('bgCanvas');
  if (canvas.classList.contains('active')) {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    cancelAnimationFrame(bgAnimFrame);
    const type = localStorage.getItem(BG_KEY);
    if (type && type !== 'none') setBg(type);
  }
});
(function(){const t=localStorage.getItem(BG_KEY)||'none'; setBg(t);})();

// ── SW ───────────────────────────────────────────────────────────
let swReady = false;
window._zenoSwReg = null;

function getSW() {
  return navigator.serviceWorker?.controller || window._zenoSwReg?.active || null;
}

function waitForSwController(timeoutMs = 8000) {
  if (getSW()) return Promise.resolve(getSW());
  return new Promise((resolve) => {
    const finish = () => resolve(getSW());
    const t = setTimeout(finish, timeoutMs);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      clearTimeout(t);
      finish();
    }, { once: true });
  });
}

async function initSW() {
  if (!('serviceWorker' in navigator)) { setSWState('error'); return false; }
  if (location.protocol === 'file:') {
    setSWState('error');
    showToast('GAMES NEED A LOCAL SERVER (npx serve .)', true);
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.register('./zeno-game-sw.js', { scope: './', updateViaCache: 'none' });
    window._zenoSwReg = reg;
    try { await reg.update(); } catch {}
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    await navigator.serviceWorker.ready;
    await waitForSwController();
    swReady = !!getSW();
    setSWState(swReady ? 'ready' : 'error');
    if (!swReady) showToast('SW NOT ACTIVE — RELOAD PAGE', true);
    return swReady;
  } catch (e) {
    console.error(e);
    swReady = false;
    setSWState('error');
    showToast('SW FAILED — use HTTP server (npx serve .)', true);
    return false;
  }
}

function setSWState(s) {
  const cls = 'sw-dot' + (s === 'ready' ? ' ready' : s === 'error' ? ' error' : '');
  document.querySelectorAll('#swDot, .games-stat-sw .sw-dot').forEach((d) => { d.className = cls; });
}

function postSW(msg, xfer = []) {
  return new Promise((res, rej) => {
    const sw = getSW();
    if (!sw) { rej(new Error('no service worker controller')); return; }
    const ch = new MessageChannel();
    ch.port1.onmessage = (e) => res(e.data);
    ch.port1.onmessageerror = () => rej(new Error('SW message error'));
    const transfer = [ch.port2, ...xfer.filter((x) => x instanceof ArrayBuffer)];
    sw.postMessage(msg, transfer);
  });
}

// ── OVERFLOW MENU ────────────────────────────────────────────────
function toggleOverflow() { document.getElementById('overflowMenu').classList.toggle('open'); }
function closeOverflow() { document.getElementById('overflowMenu').classList.remove('open'); }
document.addEventListener('click', e => { if (!e.target.closest('#overflowBtn') && !e.target.closest('#overflowMenu')) closeOverflow(); });

// ── SETTINGS MODAL ───────────────────────────────────────────────
function openSettingsModal() {
  const def = localStorage.getItem('zeno-ptgoal-default') || '0';
  document.getElementById('ptgoalDefaultSelect').value = def;
  const rm = document.getElementById('zenoReducedMotion');
  if (rm) rm.checked = localStorage.getItem('zeno-reduced-motion') === '1';
  const snd = document.getElementById('zenoUiSounds');
  if (snd) snd.checked = localStorage.getItem('zeno-ui-sounds') === '1';
  const cp = document.getElementById('zenoCollPills');
  if (cp) cp.checked = localStorage.getItem('zeno-ui-coll-pills') === '1';
  document.getElementById('settingsModal').classList.add('open');
}
function closeSettingsModal() { document.getElementById('settingsModal').classList.remove('open'); }
document.getElementById('settingsModal').addEventListener('click', e => { if(e.target===document.getElementById('settingsModal')) closeSettingsModal(); });
function savePtGoalDefault() {
  localStorage.setItem('zeno-ptgoal-default', document.getElementById('ptgoalDefaultSelect').value);
}
function toggleReducedMotion(on) {
  localStorage.setItem('zeno-reduced-motion', on ? '1' : '0');
  document.body.classList.toggle('zeno-reduced-motion', on);
}

// ── ADD MODAL (hub) ──────────────────────────────────────────────
let pendingFolders = [];
const GAME_IMPORT_MODE_KEY = 'zeno_games_import_mode';
const GAME_IMPORT_MODES = {
  zenoapps: new Set(['zenoapps']),
  zenoapps_upload: new Set(['zenoapps', 'folders', 'file', 'zip', 'paste', 'zenopack']),
  full_upload: new Set(['zenoapps', 'folders', 'file', 'zip', 'paste', 'zenopack', 'url', 'git', 'r2']),
};
function getGameImportMode() {
  const mode = localStorage.getItem(GAME_IMPORT_MODE_KEY) || 'full_upload';
  return GAME_IMPORT_MODES[mode] ? mode : 'full_upload';
}
function isGameImportTabAllowed(tab) {
  return (GAME_IMPORT_MODES[getGameImportMode()] || GAME_IMPORT_MODES.full_upload).has(tab);
}
function firstAllowedGameImportTab() {
  const allowed = GAME_IMPORT_MODES[getGameImportMode()] || GAME_IMPORT_MODES.full_upload;
  return allowed.has('zenoapps') ? 'zenoapps' : [...allowed][0];
}
function applyGameImportMode() {
  const mode = getGameImportMode();
  document.body.dataset.gameImportMode = mode;
  document.querySelectorAll('[data-source="local"]').forEach(el => { el.hidden = mode === 'zenoapps'; });
  document.querySelectorAll('[data-source="remote"]').forEach(el => { el.hidden = mode !== 'full_upload'; });
  document.getElementById('mainDropZone')?.toggleAttribute('hidden', mode === 'zenoapps');
  document.querySelector('.games-empty-hint')?.toggleAttribute('hidden', mode === 'zenoapps');
  const emptyText = document.querySelector('.games-empty-text');
  if (emptyText) {
    emptyText.textContent = mode === 'zenoapps'
      ? 'Add built-in ZenoApps to start your library.'
      : mode === 'zenoapps_upload'
        ? 'Add built-in ZenoApps or upload local game files.'
        : 'Add built-in ZenoApps, drop a folder, or link a game from the web.';
  }
  const hubSub = document.querySelector('.add-hub-sub');
  if (hubSub) {
    hubSub.textContent = mode === 'zenoapps'
      ? 'Built-in catalog only'
      : mode === 'zenoapps_upload'
        ? 'Built-in catalog and local upload sources'
        : 'Pick a source - folders, catalog, cloud, or link';
  }
}
function switchAddTab(tab) {
  if (!isGameImportTabAllowed(tab)) tab = firstAllowedGameImportTab();
  document.querySelectorAll('.add-hub-item, .modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.modal-pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + tab));
  if (tab === 'zenoapps') buildZasGrid();
}
function openAddModal(tab = 'zenoapps') {
  applyGameImportMode();
  if (!isGameImportTabAllowed(tab)) tab = firstAllowedGameImportTab();
  switchAddTab(tab);
  document.getElementById('addModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAddModal() { document.getElementById('addModal').classList.remove('open'); document.body.style.overflow = ''; }
document.getElementById('addModal').addEventListener('click', e => { if (e.target === document.getElementById('addModal')) closeAddModal(); });
document.getElementById('addModalTabs').addEventListener('click', e => {
  const tab = e.target.closest('.add-hub-item, .modal-tab');
  if (!tab?.dataset.tab) return;
  if (!isGameImportTabAllowed(tab.dataset.tab)) return;
  switchAddTab(tab.dataset.tab);
});

// ── FOLDER DROP ──────────────────────────────────────────────────
function handleFolderInput(fileList, fromMainDrop=false) {
  if (!isGameImportTabAllowed('folders')) { showToast('UPLOADS ARE DISABLED IN SETUP', true); return; }
  if (!fileList?.length) return;
  const folders = {};
  for (const f of fileList) {
    const top = f.webkitRelativePath.split('/')[0];
    if (!folders[top]) folders[top] = [];
    folders[top].push(f);
  }
  let added = 0;
  for (const [name, files] of Object.entries(folders)) {
    if (pendingFolders.length >= MAX_SLOTS) break;
    const hasIdx = files.some(f => { const p=f.webkitRelativePath.split('/'); return p.length===2 && p[1].toLowerCase()==='index.html'; });
    if (!hasIdx) { showToast(`"${name}": NO INDEX.HTML`, true); continue; }
    if (pendingFolders.some(s=>s.folderName===name)) continue;
    pendingFolders.push({ folderName:name, files }); added++;
  }
  refreshFolderPills();
  if (fromMainDrop && pendingFolders.length) commitFolders();
  document.getElementById('folderInput').value = '';
  document.getElementById('mainDropInput').value = '';
}
function refreshFolderPills() {
  const pills = document.getElementById('slotPills');
  if (!pendingFolders.length) { pills.style.display='none'; document.getElementById('foldersGoBtn').disabled=true; return; }
  pills.style.display='flex';
  pills.innerHTML = pendingFolders.map((s,i) => `<div class="slot-pill"><i class="fa-solid fa-folder-open" style="font-size:10px"></i>${esc(s.folderName)}<button class="slot-pill-x" onclick="removePendingFolder(${i})"><i class="fa-solid fa-xmark"></i></button></div>`).join('');
  document.getElementById('foldersGoBtn').disabled = false;
}
function removePendingFolder(i) { pendingFolders.splice(i,1); refreshFolderPills(); }
function clearFolders() { pendingFolders=[]; refreshFolderPills(); }
async function commitFolders() {
  if (!pendingFolders.length) return;
  if (!swReady) { await initSW(); if (!swReady) return; }
  if (!getSW()) { showToast('ACTIVATING SW — reloading...'); setTimeout(()=>location.reload(),1200); return; }
  const toLoad = [...pendingFolders]; pendingFolders=[]; refreshFolderPills(); closeAddModal();
  buildPips(toLoad.length); showProgress(true, `Loading 1 of ${toLoad.length}...`);
  let added = 0;
  for (let i=0;i<toLoad.length;i++) {
    setPip(i,'active'); showProgress(true, `${toLoad[i].folderName} (${i+1}/${toLoad.length})`);
    const ok = await processFolder(toLoad[i].folderName, toLoad[i].files);
    setPip(i, ok?'done':'fail'); if(ok) added++;
  }
  showProgress(false);
  if (added>0) { showToast(`+${added} GAME${added>1?'S':''} ADDED`); renderGrid(); }
  else showToast('NO GAMES LOADED', true);
}

const folderDrop = document.getElementById('folderDrop');
folderDrop.addEventListener('dragover', e=>{e.preventDefault();e.stopPropagation();folderDrop.classList.add('dragover');});
folderDrop.addEventListener('dragleave', ()=>folderDrop.classList.remove('dragover'));
folderDrop.addEventListener('drop', async e=>{
  e.preventDefault();e.stopPropagation();folderDrop.classList.remove('dragover');
  const files=[]; await collectDroppedFolders(e.dataTransfer.items,files);
  if(files.length) handleFolderInput(files); else showToast('DROP GAME FOLDERS',true);
});
const mainDZ = document.getElementById('mainDropZone');
mainDZ.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();mainDZ.classList.add('dragover');});
mainDZ.addEventListener('dragleave',()=>mainDZ.classList.remove('dragover'));
mainDZ.addEventListener('drop',async e=>{
  e.preventDefault();e.stopPropagation();mainDZ.classList.remove('dragover');
  const files=[]; await collectDroppedFolders(e.dataTransfer.items,files);
  if(files.length) handleFolderInput(files,true); else showToast('DROP GAME FOLDERS',true);
});
document.addEventListener('dragover',e=>e.preventDefault());
document.addEventListener('drop',async e=>{
  if(e.target.closest('input[type="file"]')||e.target.closest('.drop-zone')||e.target.closest('.mdrop')||e.target.closest('.zdrop')) return;
  e.preventDefault();
  if (!isGameImportTabAllowed('folders')) { showToast('UPLOADS ARE DISABLED IN SETUP', true); return; }
  const files=[]; await collectDroppedFolders(e.dataTransfer.items,files);
  if(!files.length){showToast('DROP GAME FOLDERS',true);return;}
  if(document.getElementById('emptyState').style.display!=='none'){handleFolderInput(files,true);}
  else{openAddModal('folders');await sleep(50);handleFolderInput(files);}
});
async function collectDroppedFolders(items, results) {
  await Promise.all([...(items||[])].map(item=>{const en=item.webkitGetAsEntry?.();if(en?.isDirectory) return readDir(en,results,en.name);}).filter(Boolean));
}
async function readDir(dirEntry, results, basePath) {
  const entries = await getAllEntries(dirEntry);
  await Promise.all(entries.map(entry=>{
    const path=basePath+'/'+entry.name;
    if(entry.isFile) return new Promise(r=>entry.file(f=>{Object.defineProperty(f,'webkitRelativePath',{value:path,writable:false,configurable:true});results.push(f);r();}));
    else if(entry.isDirectory) return readDir(entry,results,path);
  }));
}
function getAllEntries(d) {
  return new Promise(res=>{const r=d.createReader();let a=[];const read=()=>r.readEntries(b=>{if(!b.length) return res(a);a=a.concat([...b]);read();});read();});
}

// ── PROCESS FOLDER ───────────────────────────────────────────────
async function processFolder(folderName, files) {
  const id = 'g'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const iconPriority=['favicon.png','favicon.ico','favicon.jpg','icon.png','apple-touch-icon.png','icon.jpg','icon.ico','icon.svg','logo.png','logo.jpg','thumbnail.png','thumbnail.jpg','cover.png','cover.jpg'];
  const iconNames=new Set(iconPriority); const fileRecords=[]; let iconUrl=null; const iconCandidates={};
  for(let i=0;i<files.length;i++) {
    const f=files[i]; const relPath=f.webkitRelativePath.split('/').slice(1).join('/'); const mime=getMime(f.name);
    setProgress(Math.round((i/files.length)*80),`${folderName}: ${f.name} (${i+1}/${files.length})`);
    if(iconNames.has(f.name.toLowerCase())) iconCandidates[f.name.toLowerCase()]={f,mime};
    fileRecords.push({file:f,path:relPath,mimeType:mime});
  }
  for(const name of iconPriority){if(iconCandidates[name]){const{f,mime}=iconCandidates[name];const buf=await f.arrayBuffer();iconUrl=await blobToDataUrl(new Blob([buf],{type:mime}));break;}}
  setProgress(88,`${folderName}: sending to SW...`);
  const ok=await registerGameWithSW(id,fileRecords);
  if(!ok){showToast(`FAILED: ${folderName}`,true);return false;}
  setProgress(100,`${folderName}: ready!`);await sleep(160);
  const gameEntry={id,name:folderName,icon:iconUrl,entryPath:`./zeno-games/${id}/index.html`,fileCount:files.length,fileRecords};
  games.push(gameEntry); saveGameToDB(gameEntry).catch(e=>console.error('DB save failed:',e));
  return true;
}
async function registerGameWithSW(gameId, fileRecords) {
  if (!getSW()) {
    await initSW();
    if (!getSW()) return false;
  }
  try {
    const meta=[],bufs=[];
    for(const r of fileRecords){const buf=await r.file.arrayBuffer();meta.push({path:r.path,mimeType:r.mimeType});bufs.push(buf);}
    const clones=bufs.map(b=>b.slice(0));
    const res=await postSW({type:'REGISTER_GAME',payload:{gameId,filesMeta:meta,buffers:clones}},clones);
    return res?.type==='GAME_REGISTERED';
  } catch(e){console.error('registerGameWithSW failed:',e);return false;}
}

// ── PASTE HTML ───────────────────────────────────────────────────
async function loadPastedGame() {
  const html=document.getElementById('pasteHtmlInput').value.trim();
  const name=document.getElementById('pasteGameName').value.trim()||'Pasted Game';
  if(!html){showToast('PASTE SOME HTML FIRST',true);return;}
  if(!swReady){await initSW();if(!swReady)return;}
  if(!getSW()){showToast('ACTIVATING SW — reloading...');setTimeout(()=>location.reload(),1200);return;}
  closeAddModal();
  buildPips(1);showProgress(true,`Loading: ${name}`);setPip(0,'active');
  const id='g'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const encoder=new TextEncoder();const buf=encoder.encode(html).buffer;const cloned=buf.slice(0);
  try {
    const res=await postSW({type:'REGISTER_GAME',payload:{gameId:id,filesMeta:[{path:'index.html',mimeType:'text/html'}],buffers:[cloned]}},[cloned]);
    if(res?.type!=='GAME_REGISTERED') throw new Error('no confirm');
  }catch(e){setPip(0,'fail');showProgress(false);showToast('FAILED TO REGISTER GAME',true);return;}
  setProgress(100,`${name}: ready!`);await sleep(180);
  const file=new File([html],'index.html',{type:'text/html'});
  Object.defineProperty(file,'webkitRelativePath',{value:name+'/index.html',writable:false,configurable:true});
  const gameEntry={id,name,icon:null,entryPath:`./zeno-games/${id}/index.html`,fileCount:1,fileRecords:[{file,path:'index.html',mimeType:'text/html'}]};
  games.push(gameEntry);saveGameToDB(gameEntry).catch(console.error);
  setPip(0,'done');showProgress(false);showToast('+1 GAME ADDED');renderGrid();
}

// ── SINGLE HTML FILE ─────────────────────────────────────────────
async function handleSingleHtmlInput(fileList) {
  const file = fileList?.length ? [...fileList].find(f => /\.html?$/i.test(f.name)) : null;
  const statusEl = document.getElementById('singleFileStatus');
  if (!file) { if (statusEl) { statusEl.textContent = 'CHOOSE AN .HTML FILE'; statusEl.className = 'status-line err'; } showToast('CHOOSE AN .HTML FILE', true); return; }
  const name = (document.getElementById('singleFileName')?.value.trim()) || file.name.replace(/\.html?$/i, '') || 'HTML Game';
  const html = await file.text();
  document.getElementById('pasteGameName').value = name;
  document.getElementById('pasteHtmlInput').value = html;
  if (statusEl) { statusEl.textContent = `Loading ${name}...`; statusEl.className = 'status-line info'; }
  document.getElementById('singleFileInput').value = '';
  await loadPastedGame();
  if (statusEl) { statusEl.textContent = ''; statusEl.className = 'status-line'; }
}
(function bindSingleFileDrop() {
  const dz = document.getElementById('singleFileDrop');
  if (!dz) return;
  dz.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation(); dz.classList.remove('dragover');
    if (e.dataTransfer.files?.length) handleSingleHtmlInput(e.dataTransfer.files);
  });
})();

// ── WEB URL ──────────────────────────────────────────────────────
function loadUrlGame() {
  const raw = document.getElementById('urlGameInput')?.value.trim();
  const name = document.getElementById('urlGameName')?.value.trim() || 'Web Game';
  const statusEl = document.getElementById('urlStatus');
  if (!raw) { if (statusEl) { statusEl.textContent = 'ENTER A URL'; statusEl.className = 'status-line err'; } showToast('ENTER A URL', true); return; }
  let url = raw;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try { new URL(url); } catch {
    if (statusEl) { statusEl.textContent = 'INVALID URL'; statusEl.className = 'status-line err'; }
    showToast('INVALID URL', true); return;
  }
  const id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const gameEntry = { id, name, icon: null, entryPath: url, fileCount: 0, fileRecords: [], r2: true };
  games.push(gameEntry);
  saveR2GameToDB(gameEntry).catch(console.error);
  window._fbSyncGame?.(gameEntry);
  document.getElementById('urlGameInput').value = '';
  document.getElementById('urlGameName').value = '';
  closeAddModal();
  renderGrid();
  showToast(name.toUpperCase() + ' ADDED');
}

// ── ZIP IMPORT ───────────────────────────────────────────────────
let _jsZipLoading = null;
function ensureJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (_jsZipLoading) return _jsZipLoading;
  _jsZipLoading = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = () => res(window.JSZip);
    s.onerror = () => rej(new Error('jszip load failed'));
    document.head.appendChild(s);
  });
  return _jsZipLoading;
}
async function zipFilesToFolder(zip, folderName) {
  const files = [];
  const entries = [];
  zip.forEach((rel, entry) => { if (!entry.dir) entries.push({ rel: rel.replace(/\\/g, '/'), entry }); });
  const indexEntry = entries.find(e => e.rel.toLowerCase() === 'index.html')
    || entries.find(e => e.rel.toLowerCase().endsWith('/index.html'));
  if (!indexEntry) return null;
  const prefix = indexEntry.rel.includes('/') ? indexEntry.rel.replace(/\/[^/]+$/, '') + '/' : '';
  for (const { rel, entry } of entries) {
    if (prefix && !rel.startsWith(prefix)) continue;
    const inner = prefix ? rel.slice(prefix.length) : rel;
    if (!inner || inner.includes('/../')) continue;
    const buf = await entry.async('arraybuffer');
    const mime = getMime(inner.split('/').pop());
    const blob = new Blob([buf], { type: mime });
    const f = new File([blob], inner.split('/').pop(), { type: mime });
    Object.defineProperty(f, 'webkitRelativePath', { value: folderName + '/' + inner, writable: false, configurable: true });
    files.push(f);
  }
  return files.length ? files : null;
}
async function importZipFiles(fileList) {
  const zips = [...(fileList || [])].filter(f => /\.zip$/i.test(f.name)).slice(0, 3);
  const statusEl = document.getElementById('zipStatus');
  if (!zips.length) {
    if (statusEl) { statusEl.textContent = 'NO .ZIP FILES FOUND'; statusEl.className = 'status-line err'; }
    showToast('DROP .ZIP FILES', true); return;
  }
  if (!swReady) { await initSW(); if (!swReady) return; }
  if (!getSW()) { showToast('ACTIVATING SW — reloading...'); setTimeout(() => location.reload(), 1200); return; }
  let JSZip;
  try { JSZip = await ensureJSZip(); } catch {
    if (statusEl) { statusEl.textContent = 'COULD NOT LOAD ZIP LIBRARY'; statusEl.className = 'status-line err'; }
    showToast('ZIP LIBRARY FAILED', true); return;
  }
  const toLoad = [];
  for (const zf of zips) {
    if (statusEl) { statusEl.textContent = `Reading ${zf.name}...`; statusEl.className = 'status-line info'; }
    try {
      const zip = await JSZip.loadAsync(await zf.arrayBuffer());
      const base = zf.name.replace(/\.zip$/i, '');
      const files = await zipFilesToFolder(zip, base);
      if (files) toLoad.push({ folderName: base, files });
      else showToast(`"${base}": NO INDEX.HTML`, true);
    } catch (e) { showToast(`ERROR: ${zf.name}`, true); }
  }
  document.getElementById('zipFileInput').value = '';
  if (!toLoad.length) {
    if (statusEl) { statusEl.textContent = 'NO VALID GAMES IN ZIP'; statusEl.className = 'status-line err'; }
    return;
  }
  closeAddModal();
  buildPips(toLoad.length);
  showProgress(true, `Loading 1 of ${toLoad.length}...`);
  let added = 0;
  for (let i = 0; i < toLoad.length; i++) {
    setPip(i, 'active'); showProgress(true, `${toLoad[i].folderName} (${i + 1}/${toLoad.length})`);
    const ok = await processFolder(toLoad[i].folderName, toLoad[i].files);
    setPip(i, ok ? 'done' : 'fail'); if (ok) added++;
  }
  showProgress(false);
  if (statusEl) { statusEl.textContent = added ? `${added} GAME${added !== 1 ? 'S' : ''} LOADED` : 'LOAD FAILED'; statusEl.className = 'status-line ' + (added ? 'ok' : 'err'); }
  if (added > 0) { showToast(`+${added} GAME${added > 1 ? 'S' : ''} ADDED`); renderGrid(); }
  else showToast('NO GAMES LOADED', true);
}
(function bindZipDrop() {
  const dz = document.getElementById('zipDrop');
  if (!dz) return;
  dz.addEventListener('dragenter', e => { e.preventDefault(); e.stopPropagation(); dz.classList.add('dragover'); });
  dz.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation(); dz.classList.remove('dragover');
    const files = [...e.dataTransfer.files].filter(f => /\.zip$/i.test(f.name));
    if (files.length) importZipFiles(files);
    else { const el = document.getElementById('zipStatus'); if (el) { el.textContent = 'DROP .ZIP FILES'; el.className = 'status-line err'; } }
  });
})();

// ── ZENOPACK ─────────────────────────────────────────────────────
async function exportZenopack(e, gameId) {
  e.stopPropagation();
  const game=games.find(g=>g.id===gameId);
  if(!game){showToast('GAME NOT FOUND',true);return;}
  if(!game.fileRecords?.length){showToast('R2/ZENOAPPS GAMES CANNOT BE EXPORTED',true);return;}
  showToast('PACKAGING...');
  const files=[];
  for(const r of game.fileRecords){const buf=await r.file.arrayBuffer();files.push({path:r.path,mimeType:r.mimeType,data:Array.from(new Uint8Array(buf))});}
  const pack={zenopack:'1.0',name:game.name,icon:game.icon||null,fileCount:files.length,files};
  const blob=new Blob([JSON.stringify(pack)],{type:'application/octet-stream'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=game.name.replace(/[^a-z0-9_\-]/gi,'_')+'.zenopack';a.click();
  URL.revokeObjectURL(url);showToast(`EXPORTED: ${game.name}`);
}
async function importZenopackFiles(fileList) {
  if(!fileList?.length) return;
  const files=[...fileList].filter(f=>f.name.endsWith('.zenopack')).slice(0,5);
  const statusEl=document.getElementById('zenopackStatus');
  if(!files.length){statusEl.textContent='NO .ZENOPACK FILES FOUND';statusEl.className='status-line err';return;}
  if(!swReady){await initSW();if(!swReady)return;}
  if(!getSW()){showToast('ACTIVATING SW — reloading...');setTimeout(()=>location.reload(),1200);return;}
  let added=0;
  for(let i=0;i<files.length;i++){
    statusEl.textContent=`LOADING ${i+1}/${files.length}: ${files[i].name.replace('.zenopack','')}`;statusEl.className='status-line info';
    try{
      const pack=JSON.parse(await files[i].text());
      if(!pack.zenopack||!pack.files?.length){showToast(`SKIPPED: ${files[i].name}`,true);continue;}
      const id='g'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
      const fileRecords=pack.files.map(f=>{const buf=new Uint8Array(f.data).buffer;const fileObj=new File([buf],f.path.split('/').pop(),{type:f.mimeType});Object.defineProperty(fileObj,'webkitRelativePath',{value:pack.name+'/'+f.path,writable:false,configurable:true});return{file:fileObj,path:f.path,mimeType:f.mimeType};});
      const ok=await registerGameWithSW(id,fileRecords);
      if(!ok){showToast(`FAILED: ${pack.name}`,true);continue;}
      const gameEntry={id,name:pack.name,icon:pack.icon,entryPath:`./zeno-games/${id}/index.html`,fileCount:fileRecords.length,fileRecords};
      games.push(gameEntry);saveGameToDB(gameEntry).catch(console.error);added++;
    }catch(e){showToast(`ERROR: ${files[i].name}`,true);}
  }
  statusEl.textContent=`${added} GAME${added!==1?'S':''} IMPORTED`;statusEl.className='status-line ok';
  document.getElementById('zenopackFileInput').value='';
  if(added>0){renderGrid();setTimeout(()=>closeAddModal(),700);showToast(`+${added} GAME${added!==1?'S':''} ADDED`);}
}
(function(){
  const dz=document.getElementById('zenopackDrop');
  dz.addEventListener('dragenter',e=>{e.preventDefault();e.stopPropagation();dz.classList.add('dragover','zdrop-animating');});
  dz.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();dz.classList.add('dragover');});
  dz.addEventListener('dragleave',()=>{dz.classList.remove('dragover','zdrop-animating');});
  dz.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();dz.classList.remove('dragover','zdrop-animating');const files=[...e.dataTransfer.files].filter(f=>f.name.endsWith('.zenopack'));if(files.length) importZenopackFiles(files);else{document.getElementById('zenopackStatus').textContent='DROP .ZENOPACK FILES';document.getElementById('zenopackStatus').className='status-line err';}});
})();

// ── RECENTLY PLAYED ROW ──────────────────────────────────────────
function renderRecentRow() {
  const meta = loadMeta();
  const recent = games
    .map(g => ({ game:g, lp:(meta[g.id]||{}).lastPlayed||0, pt:(meta[g.id]||{}).playtime||0 }))
    .filter(x => x.lp > 0)
    .sort((a,b) => b.lp - a.lp)
    .slice(0,8);
  const row = document.getElementById('recentRow');
  const strip = document.getElementById('recentStrip');
  if (!recent.length) { row.style.display='none'; return; }
  row.style.display = 'block';
  strip.innerHTML = recent.map(({game:g, lp, pt}) => `
    <div class="recent-chip" onclick="openGameModal(games.find(x=>x.id==='${g.id}'))">
      <div class="recent-chip-icon">${gameIconHtml(g.icon)}</div>
      <div>
        <div class="recent-chip-name">${esc(g.name)}</div>
        <div style="display:flex;gap:6px;align-items:center">
          <div class="recent-chip-time">${formatLastPlayed(lp)}</div>
          ${pt?`<div style="font-family:'Orbitron',monospace;font-size:7px;color:rgba(0,255,136,.5)">${formatTime(pt)}</div>`:''}
        </div>
      </div>
    </div>`).join('');
}

// ── HIGHLIGHT SEARCH (all matches) ──────────────────────────────
function highlightText(text, query) {
  if (!query) return esc(text);
  const lower = text.toLowerCase(), q = query.toLowerCase();
  let out = '', i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(q, i);
    if (idx < 0) { out += esc(text.slice(i)); break; }
    out += esc(text.slice(i, idx)) + '<mark class="search-hl">' + esc(text.slice(idx, idx + q.length)) + '</mark>';
    i = idx + q.length;
  }
  return out;
}
function fuzzyMatch(str, q) {
  if (!q) return true;
  const s = str.toLowerCase(), needle = q.toLowerCase();
  let si = 0;
  for (let i = 0; i < needle.length; i++) {
    const j = s.indexOf(needle[i], si);
    if (j < 0) return false;
    si = j + 1;
  }
  return true;
}
function playUiSound(kind) {
  if (localStorage.getItem('zeno-ui-sounds') !== '1') return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = kind === 'err' ? 180 : 880;
    g.gain.setValueAtTime(0.04, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o.start(); o.stop(ctx.currentTime + 0.12);
  } catch (e) {}
}
function zenoHaptic(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) {}
}

function renderFavoritesRail() {
  const row = document.getElementById('favRow'), strip = document.getElementById('favStrip');
  if (!row || !strip) return;
  const metaMap = loadMeta();
  const favs = games.filter(g => (metaMap[g.id] || {}).fav);
  if (!favs.length) { row.style.display = 'none'; return; }
  row.style.display = 'block';
  strip.innerHTML = favs.map(g => `
    <div class="fav-chip" onclick="openGameModal(games.find(x=>x.id==='${g.id}'))">
      <span class="fav-chip-icon">${gameIconHtml(g.icon)}</span>
      <span>${esc(g.name)}</span>
    </div>`).join('');
}

// ── GRID ─────────────────────────────────────────────────────────
function renderGrid() {
  const skel = document.getElementById('gameSkeletonRow');
  if (skel) { skel.style.display = 'none'; skel.innerHTML = ''; }
  const grid=document.getElementById('gameGrid'),empty=document.getElementById('emptyState'),noRes=document.getElementById('noResults'),fb=document.getElementById('filterBar');
  const favRowEl = document.getElementById('favRow');
  if(!games.length){empty.style.display='flex';grid.style.display='none';fb.style.display='none';const gc=document.getElementById('gameCount');if(gc)gc.textContent='';syncGamesStats();syncResumeButton();document.getElementById('recentRow').style.display='none';if(favRowEl)favRowEl.style.display='none';return;}
  syncResumeButton();
  empty.style.display='none';grid.style.display='grid';fb.style.display='flex';
  grid.className='game-grid size-'+currentSize;
  document.querySelectorAll('.size-btn').forEach(b=>b.classList.toggle('active',b.dataset.size===currentSize));
  document.querySelectorAll('.sort-btn').forEach(b=>b.classList.toggle('active',b.dataset.sort===currentSort));
  grid.querySelectorAll('.game-card,.add-card').forEach(el=>el.remove());
  const q=document.getElementById('searchInput').value.toLowerCase().trim();
  let filtered=q?games.filter(g=>g.name.toLowerCase().includes(q)):[...games];
  if(activeCollFilter) filtered=filtered.filter(g=>(getGameMeta(g.id).collections||[]).includes(activeCollFilter));
  const meta=loadMeta();
  const showCollPills = localStorage.getItem('zeno-ui-coll-pills') === '1';
  const collsList = loadCollections();
  if(currentSort==='name') filtered.sort((a,b)=>a.name.localeCompare(b.name));
  else if(currentSort==='recent') filtered.sort((a,b)=>((meta[b.id]||{}).lastPlayed||0)-((meta[a.id]||{}).lastPlayed||0));
  else if(currentSort==='playtime') filtered.sort((a,b)=>((meta[b.id]||{}).playtime||0)-((meta[a.id]||{}).playtime||0));
  else if(currentSort==='fav') filtered.sort((a,b)=>((meta[b.id]||{}).fav?1:0)-((meta[a.id]||{}).fav?1:0));
  else if(currentSort==='rating') filtered.sort((a,b)=>((meta[b.id]||{}).rating||0)-((meta[a.id]||{}).rating||0));
  else filtered.sort((a,b)=>((meta[b.id]||{}).fav?1:0)-((meta[a.id]||{}).fav?1:0));

  filtered.forEach((g,i)=>{
    const gm=meta[g.id]||{};
    const isFav=!!gm.fav,status=gm.status||null,lastPlayed=formatLastPlayed(gm.lastPlayed),playtime=formatTime(gm.playtime);
    const rating=gm.rating||0;
    const banner=gm.banner||null;
    const isBulkSel=bulkSelected.has(g.id);
    const statusLabels={playing:'PLAYING',completed:'DONE',backlog:'BACKLOG',dropped:'DROPPED'};
    const statusBadge=status?`<span class="game-status-badge ${status}">${statusLabels[status]||status}</span>`:'';
    const stars=[1,2,3,4,5].map(n=>`<span class="s${n<=rating?' lit':''}">★</span>`).join('');
    const collPillHtml = showCollPills && collsList.length ? (() => {
      const ids = gm.collections || [];
      const pills = ids.map(cid => { const c = collsList.find(x => x.id === cid); return c ? `<span class="coll-pill-mini" title="${esc(c.name)}">${esc(String(c.emoji || ''))}</span>` : ''; }).join('');
      return pills ? `<div class="coll-pills-on-card">${pills}</div>` : '';
    })() : '';
    const bannerExtra = gm.bannerFit === 'contain' ? ' style="object-fit:contain"' : '';
    const card=document.createElement('div');
    card.className='game-card'+(bulkMode?' bulk-mode':'')+(isBulkSel?' bulk-selected':'')+(status&&!bulkMode?' status-'+status:'');
    card.style.animationDelay=(i*.018)+'s';
    card.innerHTML=`
      ${imgSrcTag(banner,'game-card-banner visible',bannerExtra)}
      ${bulkMode?`<div class="bulk-check${isBulkSel?' checked':''}" onclick="toggleBulkSelect(event,'${g.id}')"><i class="fa-solid fa-${isBulkSel?'check':'square'}"></i></div>`:`<button class="game-fav-btn${isFav?' active':''}" onclick="toggleFavorite(event,'${g.id}')" title="${isFav?'Unfavorite':'Favorite'}"><i class="fa-${isFav?'solid':'regular'} fa-star"></i></button>`}
      <div class="game-actions">
        <button class="game-action-btn info-btn" title="Info / Edit" onclick="openSidebar(event,'${g.id}')"><i class="fa-solid fa-circle-info"></i></button>
        <button class="game-action-btn exp" title="Status" onclick="openStatusPicker(event,'${g.id}')"><i class="fa-solid fa-tag"></i></button>
        <button class="game-action-btn exp" title="Export .zenopack" onclick="exportZenopack(event,'${g.id}')"><i class="fa-solid fa-box-archive"></i></button>
        <button class="game-action-btn del" onclick="removeGame(event,'${g.id}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="status-picker" id="sp-${g.id}">
        <button class="status-opt" onclick="setStatus(event,'${g.id}','playing')">▶ PLAYING</button>
        <button class="status-opt" onclick="setStatus(event,'${g.id}','completed')">✓ COMPLETED</button>
        <button class="status-opt" onclick="setStatus(event,'${g.id}','backlog')">⏸ BACKLOG</button>
        <button class="status-opt" onclick="setStatus(event,'${g.id}','dropped')">✕ DROPPED</button>
        ${status?`<button class="status-opt clear" onclick="setStatus(event,'${g.id}',null)">✕ CLEAR</button>`:''}
      </div>
      <div class="game-icon">${gameIconHtml(g.icon)}</div>
      <div class="game-name">${highlightText(g.name, q)}</div>
      ${collPillHtml}
      <div class="game-meta">
        ${statusBadge}
        ${rating>0?`<div class="game-stars">${stars}</div>`:''}
        ${lastPlayed?`<div class="game-last-played">${lastPlayed}</div>`:''}
        ${playtime?`<div class="game-playtime">${playtime}</div>`:''}
      </div>
      ${bulkMode?'':`<div class="card-quickbar" onclick="event.stopPropagation()">
        <button type="button" onclick="event.stopPropagation();openSidebar({stopPropagation:function(){}},'${g.id}')">INFO</button>
        <button type="button" onclick="event.stopPropagation();openGameModal(games.find(x=>x.id==='${g.id}'))">PLAY</button>
      </div>`}`;
    card.addEventListener('click', () => {
      if (bulkMode) { toggleBulkSelect({stopPropagation:()=>{}}, g.id); return; }
      openGameModal(g);
    });
    card.addEventListener('contextmenu', e => openCtxMenu(e, g.id));
    grid.insertBefore(card,noRes);
  });

  if (!bulkMode) {
    const add=document.createElement('div');add.className='add-card';
    add.innerHTML='<i class="fa-solid fa-plus"></i><span>ADD GAMES</span>';
    add.addEventListener('click',()=>openAddModal('zenoapps'));
    grid.insertBefore(add,noRes);
  }

  noRes.style.display=filtered.length===0?'block':'none';
  const total = games.length;
  const countTxt = total + ' GAME' + (total !== 1 ? 'S' : '');
  const gc = document.getElementById('gameCount');
  if (gc) gc.textContent = countTxt;
  syncGamesStats();
  renderRecentRow();
  renderFavoritesRail();
  renderCollFilterBtns();
  updateBulkBar();
}
function syncGamesStats() {
  const meta = loadMeta();
  const total = games.length;
  const favs = games.filter(g => (meta[g.id] || {}).fav).length;
  const tEl = document.getElementById('gamesStatTotal');
  const fEl = document.getElementById('gamesStatFavs');
  if (tEl) tEl.textContent = String(total);
  if (fEl) fEl.textContent = String(favs);
}
function filterGames(){renderGrid();}
let _undoRemoveTimer = null, _undoRemovePayload = null;
function removeGame(e,id){
  e.stopPropagation();
  const idx = games.findIndex(g=>g.id===id);
  if (idx < 0) return;
  const removed = games[idx];
  const sw=getSW();if(sw) sw.postMessage({type:'UNREGISTER_GAME',payload:{gameId:id}});
  games.splice(idx,1);
  deleteGameFromDB(id).catch(console.error);
  window._fbDeleteGame?.(id);
  renderGrid();
  _undoRemovePayload = { removed, id };
  clearTimeout(_undoRemoveTimer);
  showToast('GAME REMOVED', false, () => undoRemoveGame());
  _undoRemoveTimer = setTimeout(() => { _undoRemovePayload = null; }, 8500);
}
function undoRemoveGame() {
  if (!_undoRemovePayload) return;
  const { removed } = _undoRemovePayload;
  _undoRemovePayload = null;
  clearTimeout(_undoRemoveTimer);
  if (games.some(g => g.id === removed.id)) return;
  games.push(removed);
  if (removed.fileRecords && removed.fileRecords.length) {
    registerGameWithSW(removed.id, removed.fileRecords).then(ok => {
      if (!ok) showToast('UNDO: SW REGISTER FAILED', true);
    });
  }
  saveGameToDB(removed).catch(console.error);
  window._fbSyncGame?.(removed);
  renderGrid();
  showToast('GAME RESTORED');
}

// ── RANDOM GAME ──────────────────────────────────────────────────
function launchRandomGame() {
  if (!games.length) { showToast('NO GAMES TO LAUNCH', true); return; }
  const g = games[Math.floor(Math.random()*games.length)];
  openGameModal(g);
  showToast('🎲 ' + g.name.toUpperCase());
}

function playtimeSparkHtml(gameId, pt) {
  let h = 0;
  for (let i = 0; i < gameId.length; i++) h = (h * 31 + gameId.charCodeAt(i)) | 0;
  const bars = [];
  for (let i = 0; i < 7; i++) {
    const base = 22 + (Math.abs(h >> (i * 3)) % 78);
    const scale = pt > 120000 ? 1 : pt > 0 ? 0.45 + Math.min(0.55, pt / 400000) : 0.32;
    bars.push(`<div class="bar" style="height:${Math.round(base * scale)}%"></div>`);
  }
  return `<div class="sidebar-section-title" style="margin-top:2px">ACTIVITY</div><div class="pt-mini-chart" title="Visual hint from playtime">${bars.join('')}</div>`;
}
function sidebarFooterPlay() {
  if (!sidebarGameId) return;
  const g = games.find(x => x.id === sidebarGameId);
  if (!g) return;
  closeSidebar();
  openGameModal(g);
}
function sidebarSetBannerFit(fit) {
  if (!sidebarGameId) return;
  setGameMeta(sidebarGameId, { bannerFit: fit });
  openSidebar({ stopPropagation: function() {} }, sidebarGameId);
  renderGrid();
}
function sidebarNotesSetMode(mode) {
  const ta = document.getElementById('sidebarNotes');
  const prev = document.getElementById('sidebarNotesPreview');
  const bEdit = document.getElementById('snTabEdit');
  const bPrev = document.getElementById('snTabPrev');
  if (!ta || !prev) return;
  if (mode === 'preview') {
    prev.innerHTML = (ta.value || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    ta.style.display = 'none';
    prev.classList.add('open');
    bEdit?.classList.remove('active');
    bPrev?.classList.add('active');
  } else {
    ta.style.display = 'block';
    prev.classList.remove('open');
    bEdit?.classList.add('active');
    bPrev?.classList.remove('active');
  }
}

// ── GAME INFO SIDEBAR ────────────────────────────────────────────
let sidebarGameId = null;
function openSidebar(e, id) {
  e.stopPropagation();
  sidebarGameId = id;
  const game = games.find(g=>g.id===id);
  if (!game) return;
  const gm = getGameMeta(id);
  document.getElementById('sidebarIcon').innerHTML = gameIconHtml(game.icon);
  document.getElementById('sidebarTitle').textContent = game.name;
  const colls = loadCollections();
  const gameCols = gm.collections || [];
  const playtime = gm.playtime||0;
  const rating = gm.rating||0;
  const stars = [1,2,3,4,5].map(n=>`<button class="star-btn${n<=rating?' active':''}" onclick="setSidebarRating(${n})">${n<=rating?'★':'☆'}</button>`).join('');
  const statusMap = {playing:'PLAYING',completed:'DONE',backlog:'BACKLOG',dropped:'DROPPED'};
  const statusBtns = ['playing','completed','backlog','dropped'].map(s=>`<button class="sidebar-status-btn${gm.status===s?' active-'+s:''}" onclick="setSidebarStatus('${s}')">${statusMap[s]}</button>`).join('');
  const collPills = colls.map(c=>`<div class="sidebar-coll-pill${gameCols.includes(c.id)?' active':''}" onclick="toggleSidebarColl('${c.id}')">${esc(String(c.emoji||''))} ${esc(c.name)}</div>`).join('');
  const bf = gm.bannerFit || 'cover';
  document.getElementById('sidebarBody').innerHTML = `
    <div>
      <div class="sidebar-section-title">STATS</div>
      <div class="sidebar-stat-grid">
        <div class="sidebar-stat"><div class="sidebar-stat-label">PLAYTIME</div><div class="sidebar-stat-val green">${formatTime(playtime)||'—'}</div></div>
        <div class="sidebar-stat"><div class="sidebar-stat-label">LAST PLAYED</div><div class="sidebar-stat-val">${formatLastPlayed(gm.lastPlayed)||'Never'}</div></div>
        <div class="sidebar-stat"><div class="sidebar-stat-label">STATUS</div><div class="sidebar-stat-val cyan">${gm.status?statusMap[gm.status]:'—'}</div></div>
        <div class="sidebar-stat"><div class="sidebar-stat-label">FILES</div><div class="sidebar-stat-val">${game.fileCount||'—'}</div></div>
      </div>
      ${playtimeSparkHtml(id, playtime)}
    </div>
    <div>
      <div class="sidebar-section-title">RATING</div>
      <div class="star-rating" id="sidebarStars">${stars}</div>
    </div>
    <div>
      <div class="sidebar-section-title">STATUS</div>
      <div class="sidebar-status-btns">${statusBtns}${gm.status?`<button class="sidebar-status-btn" onclick="setSidebarStatus(null)" style="color:rgba(255,0,110,.5)">✕ CLEAR</button>`:''}</div>
    </div>
    ${colls.length?`<div>
      <div class="sidebar-section-title">COLLECTIONS</div>
      <div class="sidebar-coll-list">${collPills||'<span style="font-size:11px;color:var(--muted)">No collections yet</span>'}</div>
    </div>`:''}
    <div>
      <div class="sidebar-section-title">BANNER IMAGE</div>
      <div class="banner-upload-zone">
        <input type="file" accept="image/*" onchange="handleBannerUpload(this)">
        ${imgSrcTag(gm.banner,'banner-preview',(bf==='contain'?'style="display:block;object-fit:contain"':'style="display:block;object-fit:cover"'))}
        <div class="banner-upload-label">${gm.banner?'Click to change banner':'Upload a banner image'}</div>
      </div>
      <div class="banner-fit-row">
        <button type="button" class="${bf==='cover'?'active':''}" onclick="sidebarSetBannerFit('cover')">COVER</button>
        <button type="button" class="${bf==='contain'?'active':''}" onclick="sidebarSetBannerFit('contain')">CONTAIN</button>
      </div>
    </div>
    <div>
      <div class="sidebar-section-title">NOTES</div>
      <div class="sidebar-notes-tabs">
        <button type="button" class="active" id="snTabEdit" onclick="sidebarNotesSetMode('edit')">EDIT</button>
        <button type="button" id="snTabPrev" onclick="sidebarNotesSetMode('preview')">PREVIEW</button>
      </div>
      <textarea class="sidebar-notes-input" id="sidebarNotes" placeholder="Your thoughts on this game...">${esc(gm.notes||'')}</textarea>
      <div class="sidebar-notes-preview" id="sidebarNotesPreview"></div>
      <button class="sidebar-save-btn" onclick="saveSidebarNotes()">SAVE NOTES</button>
    </div>
    <div>
      <button class="sidebar-screenshot-btn" onclick="openGameAndScreenshot('${id}')"><i class="fa-solid fa-camera"></i> OPEN & SCREENSHOT</button>
    </div>`;
  const foot = document.getElementById('sidebarFooter');
  if (foot) foot.classList.add('visible');
  document.getElementById('sidebarOverlay').classList.add('open');
  document.getElementById('sidebar').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebarOverlay').classList.remove('open');
  document.getElementById('sidebar').classList.remove('open');
  const foot = document.getElementById('sidebarFooter');
  if (foot) foot.classList.remove('visible');
  sidebarGameId = null;
}
function setSidebarRating(n) {
  if (!sidebarGameId) return;
  const cur = getGameMeta(sidebarGameId).rating||0;
  setGameMeta(sidebarGameId, { rating: cur===n?0:n });
  openSidebar({stopPropagation:()=>{}}, sidebarGameId);
  renderGrid();
}
function setSidebarStatus(s) {
  if (!sidebarGameId) return;
  setGameMeta(sidebarGameId, { status: s });
  openSidebar({stopPropagation:()=>{}}, sidebarGameId);
  renderGrid();
}
function toggleSidebarColl(collId) {
  if (!sidebarGameId) return;
  const gm = getGameMeta(sidebarGameId);
  const cols = gm.collections||[];
  const idx = cols.indexOf(collId);
  if(idx>=0) cols.splice(idx,1); else cols.push(collId);
  setGameMeta(sidebarGameId, { collections:cols });
  openSidebar({stopPropagation:()=>{}}, sidebarGameId);
  renderGrid();
}
function saveSidebarNotes() {
  if (!sidebarGameId) return;
  const notes = document.getElementById('sidebarNotes')?.value||'';
  setGameMeta(sidebarGameId, { notes });
  showToast('NOTES SAVED');
}
async function handleBannerUpload(input) {
  if (!sidebarGameId || !input.files[0]) return;
  const dataUrl = await blobToDataUrl(input.files[0]);
  setGameMeta(sidebarGameId, { banner: dataUrl });
  openSidebar({stopPropagation:()=>{}}, sidebarGameId);
  renderGrid();
  showToast('BANNER UPDATED');
}
function openGameAndScreenshot(id) {
  const game = games.find(g=>g.id===id);
  if (!game) return;
  closeSidebar();
  openGameModal(game);
}

// ── SCREENSHOT ───────────────────────────────────────────────────
function captureScreenshot() {
  const iframe = document.getElementById('gameModalFrame');
  try {
    const canvas = document.createElement('canvas');
    const iwin = iframe.contentWindow;
    const idoc = iframe.contentDocument||iwin.document;
    canvas.width = iframe.clientWidth; canvas.height = iframe.clientHeight;
    const ctx = canvas.getContext('2d');
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${canvas.width}' height='${canvas.height}'><foreignObject width='100%' height='100%'><body xmlns='http://www.w3.org/1999/xhtml'>${idoc.documentElement.outerHTML}</body></foreignObject></svg>`;
    const blob = new Blob([svg], {type:'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img,0,0);
      URL.revokeObjectURL(url);
      canvas.toBlob(b=>{
        const a=document.createElement('a');a.href=URL.createObjectURL(b);
        const name=(document.getElementById('gameModalTitle').textContent||'screenshot').replace(/[^a-z0-9]/gi,'_');
        a.download=name+'_screenshot.png';a.click();showToast('SCREENSHOT SAVED');
      });
    };
    img.onerror = () => { URL.revokeObjectURL(url); showToast('SCREENSHOT: CROSS-ORIGIN BLOCKED',true); };
    img.src = url;
  } catch(e) { showToast('SCREENSHOT UNAVAILABLE',true); }
}

// ── PLAYTIME GOAL ────────────────────────────────────────────────
let ptGoalMs = 0, ptGoalInterval = null, ptGoalStart = 0;
function openPtGoalSetup() {
  document.getElementById('ptgoalModal')?.classList.add('open');
  const inp = document.getElementById('ptgoalCustomInput');
  if (inp) { inp.value = ''; setTimeout(() => inp.focus(), 80); }
}
function closePtGoalModal() {
  document.getElementById('ptgoalModal')?.classList.remove('open');
}
function applyPtGoalPreset(mins) {
  closePtGoalModal();
  if (!mins || mins < 1) return;
  startPtGoal(mins);
}
function applyPtGoalCustom() {
  const v = parseInt(document.getElementById('ptgoalCustomInput')?.value || '0', 10);
  if (!v || v < 1 || v > 999) { showToast('ENTER 1–999 MINUTES', true); return; }
  closePtGoalModal();
  startPtGoal(v);
}
function startPtGoal(mins) {
  ptGoalMs = mins*60000; ptGoalStart = Date.now();
  document.getElementById('ptgoalOverlay').classList.add('visible');
  clearInterval(ptGoalInterval);
  ptGoalInterval = setInterval(updatePtGoal, 1000);
  updatePtGoal();
  showToast(`GOAL: ${mins} MIN SESSION`);
}
function updatePtGoal() {
  const elapsed = Date.now()-ptGoalStart;
  const remaining = Math.max(0, ptGoalMs-elapsed);
  const pct = Math.min(100, (elapsed/ptGoalMs)*100);
  const m = Math.floor(remaining/60000);
  const s = Math.floor((remaining%60000)/1000);
  const timerEl = document.getElementById('ptgoalTimer');
  timerEl.textContent = m+':'+(s<10?'0':'')+s;
  timerEl.className = 'ptgoal-timer'+(remaining<60000?' warning':'');
  document.getElementById('ptgoalBar').style.width = pct+'%';
  document.getElementById('ptgoalRemLabel').textContent = remaining<=0?'TIME\'S UP!':'remaining';
  if (remaining<=0) { clearInterval(ptGoalInterval); showToast('SESSION GOAL REACHED!'); }
}
function stopPtGoal() {
  clearInterval(ptGoalInterval); ptGoalInterval=null;
  document.getElementById('ptgoalOverlay').classList.remove('visible');
}

// ── KEYBOARD LAUNCHER ────────────────────────────────────────────
let klIndex = -1, klFiltered = [];
function openKL() {
  document.getElementById('klOverlay').classList.add('open');
  document.getElementById('klInput').value = '';
  klFilter();
  setTimeout(()=>document.getElementById('klInput').focus(),50);
}
function closeKL() { document.getElementById('klOverlay').classList.remove('open'); }
function klFilter() {
  const q = document.getElementById('klInput').value.toLowerCase();
  klFiltered = q ? games.filter(g => fuzzyMatch(g.name, q)) : [...games].slice(0, 12);
  klIndex = -1;
  const el = document.getElementById('klResults');
  if (!klFiltered.length) { el.innerHTML='<div class="kl-empty">NO GAMES FOUND</div>'; return; }
  const meta = loadMeta();
  el.innerHTML = klFiltered.map((g,i)=>{
    const gm = meta[g.id]||{};
    const st = gm.status ? String(gm.status).toUpperCase() : '';
    const cols = (gm.collections||[]).map(cid=>{const c=loadCollections().find(x=>x.id===cid);return c?c.emoji:'';}).filter(Boolean).join(' ');
    return `
    <div class="kl-item" id="kl-${i}" onclick="klLaunch(${i})">
      <div class="kl-item-icon">${gameIconHtml(g.icon)}</div>
      <div style="flex:1;min-width:0">
        <div class="kl-item-name">${highlightText(g.name, document.getElementById('klInput').value.trim())}</div>
        <div class="kl-item-sub">${cols ? cols + ' · ' : ''}${st ? st + ' · ' : ''}${formatLastPlayed(gm.lastPlayed)||'Never played'}</div>
      </div>
    </div>`;
  }).join('');
}
function klLaunch(i) {
  const g = klFiltered[i];
  if (!g) return;
  closeKL();
  openGameModal(g);
}
document.getElementById('klInput').addEventListener('keydown', e=>{
  if (e.key==='ArrowDown') { klIndex=Math.min(klIndex+1,klFiltered.length-1); klHighlight(); e.preventDefault(); }
  else if (e.key==='ArrowUp') { klIndex=Math.max(klIndex-1,0); klHighlight(); e.preventDefault(); }
  else if (e.key==='Enter' && (e.ctrlKey||e.metaKey)) {
    const g = klFiltered[klIndex >= 0 ? klIndex : 0];
    if (g) { closeKL(); openSidebar({stopPropagation:()=>{}}, g.id); }
    e.preventDefault();
  }
  else if (e.key==='Enter') { klLaunch(klIndex>=0?klIndex:0); }
  else if (e.key==='Escape') { closeKL(); }
});
function klHighlight() {
  document.querySelectorAll('.kl-item').forEach((el,i)=>el.classList.toggle('kl-active',i===klIndex));
  const active=document.getElementById('kl-'+klIndex);
  if(active) active.scrollIntoView({block:'nearest'});
}

// ── GAME MODAL ───────────────────────────────────────────────────
let _gameSessionStart=null,_gameSessionId=null;
let _gameModalChromeTimer = null;
async function openGameModal(g) {
  const frame=document.getElementById('gameModalFrame');
  const inner = document.getElementById('gameModalInner');
  if (inner) {
    inner.classList.remove('chrome-minimal');
    clearTimeout(_gameModalChromeTimer);
    const armChromeIdle = () => {
      clearTimeout(_gameModalChromeTimer);
      _gameModalChromeTimer = setTimeout(() => { inner.classList.add('chrome-minimal'); }, 4000);
    };
    inner.onmousemove = () => { inner.classList.remove('chrome-minimal'); armChromeIdle(); };
    armChromeIdle();
  }
  zenoHaptic(10);
  document.getElementById('gameModalTitle').textContent=g.name;
  document.getElementById('gameModalIcon').innerHTML=gameIconHtml(g.icon);
  document.getElementById('gameModalLoading').classList.remove('hidden');
  document.getElementById('gameModal').classList.add('open');
  document.body.style.overflow='hidden';
  const lastPlayed = Date.now();
  setGameMeta(g.id,{lastPlayed});
  saveRecentGameForHome(g, lastPlayed);
  _gameSessionStart=Date.now();_gameSessionId=g.id;
  frame.src='';
  try {
    const sw=getSW();
    if(!g.r2&&sw&&g.fileRecords){
      const probe=await new Promise((res,rej)=>{const ch=new MessageChannel();ch.port1.onmessage=e=>res(e.data);setTimeout(()=>rej(new Error('timeout')),2000);sw.postMessage({type:'PING_GAME',payload:{gameId:g.id}},[ch.port2]);}).catch(()=>null);
      if(!probe||probe.type!=='GAME_FOUND') await registerGameWithSW(g.id,g.fileRecords);
    }
  } catch(e){console.warn('SW re-register check failed:',e);}
  setTimeout(()=>{frame.src=g.entryPath;},100);
  frame.onload=()=>document.getElementById('gameModalLoading').classList.add('hidden');
  const def=parseInt(localStorage.getItem('zeno-ptgoal-default')||'0');
  if(def>0) startPtGoal(def);
}
function closeGameModal() {
  clearTimeout(_gameModalChromeTimer);
  const inner = document.getElementById('gameModalInner');
  if (inner) { inner.onmousemove = null; inner.classList.remove('chrome-minimal'); }
  if(_gameSessionStart&&_gameSessionId){
    const elapsed=Date.now()-_gameSessionStart;
    const cur=getGameMeta(_gameSessionId).playtime||0;
    setGameMeta(_gameSessionId,{playtime:cur+elapsed});
    const g=games.find(x=>x.id===_gameSessionId);
    if(g&&window.ZenoGameStats){
      const mins=Math.max(1,Math.round(elapsed/60000));
      ZenoGameStats.recordPlay(g.id,g.name,g.icon||'',mins);
      saveRecentGameForHome(g, Date.now());
    }
    _gameSessionStart=null;_gameSessionId=null;
    renderGrid();
  }
  stopPtGoal();
  document.getElementById('gameModal').classList.remove('open');
  document.getElementById('gameModalFrame').src='';
  document.body.style.overflow='';
  if(consoleOpen) toggleConsole();
}
function toggleFullscreen() {
  const m=document.querySelector('.game-modal');
  if(!document.fullscreenElement) m.requestFullscreen?.(); else document.exitFullscreen?.();
}
document.getElementById('gameModal').addEventListener('click',e=>{if(e.target===document.getElementById('gameModal')) closeGameModal();});

// ── MOBILE SWIPE TO CLOSE GAME MODAL ─────────────────────────────
(function(){
  let touchStartY=0, touchStartX=0;
  const modal = document.getElementById('gameModal');
  modal.addEventListener('touchstart', e=>{touchStartY=e.touches[0].clientY;touchStartX=e.touches[0].clientX;},{passive:true});
  modal.addEventListener('touchend', e=>{
    const dy=e.changedTouches[0].clientY-touchStartY;
    const dx=Math.abs(e.changedTouches[0].clientX-touchStartX);
    if(dy>80&&dx<60&&modal.classList.contains('open')) closeGameModal();
  },{passive:true});
})();

// ── CONSOLE ──────────────────────────────────────────────────────
let consoleErrors=[],consoleOpen=false,consoleFilterMode='all';
function toggleConsole(){consoleOpen=!consoleOpen;document.getElementById('consoleOverlay').classList.toggle('open',consoleOpen);if(consoleOpen){const b=document.getElementById('consoleBody');b.scrollTop=b.scrollHeight;applyConsoleFilter();}}
function setConsoleFilter(mode){
  consoleFilterMode=mode;
  document.querySelectorAll('#consoleFilters button').forEach(b=>b.classList.toggle('active',b.dataset.cf===mode));
  applyConsoleFilter();
}
function applyConsoleFilter(){
  document.querySelectorAll('#consoleBody .console-entry').forEach(el=>{
    const t=el.classList.contains('type-error')?'error':el.classList.contains('type-warn')?'warn':'log';
    const show=consoleFilterMode==='all'||(consoleFilterMode==='error'&&(t==='error'||t==='warn'));
    el.style.display=show?'':'none';
  });
}
function copyConsoleAll(){
  const lines=[...document.querySelectorAll('#consoleBody .console-entry')].filter(e=>e.style.display!=='none').map(e=>e.innerText.replace(/\s+/g,' ').trim());
  if(!lines.length){showToast('NOTHING TO COPY');return;}
  navigator.clipboard.writeText(lines.join('\n')).then(()=>showToast('COPIED LOG')).catch(()=>showToast('COPY FAILED',true));
}
function clearConsole(){consoleErrors=[];document.getElementById('consoleBody').innerHTML='<div class="console-empty" id="consoleEmpty"><i class="fa-solid fa-circle-check"></i>&nbsp;NO ERRORS</div>';document.getElementById('consoleCount').textContent='0';}
function consoleLog(type,msg,src,lineno,colno){
  consoleErrors.push({type,msg,src,lineno,colno,time:new Date()});
  const empty=document.getElementById('consoleEmpty');if(empty) empty.remove();
  const count=consoleErrors.length;document.getElementById('consoleCount').textContent=count;
  const t=consoleErrors[count-1].time;const timeStr=t.getHours().toString().padStart(2,'0')+':'+t.getMinutes().toString().padStart(2,'0')+':'+t.getSeconds().toString().padStart(2,'0');
  let srcShort=src||'';if(srcShort.length>65) srcShort='...'+srcShort.slice(-62);
  const loc=(lineno||colno)?(' '+(lineno||'')+(colno?':'+colno:'')):'' ;
  const icon=type==='error'?'fa-circle-xmark':type==='warn'?'fa-triangle-exclamation':'fa-circle-info';
  const entry=document.createElement('div');entry.className='console-entry type-'+type;
  entry.innerHTML=`<i class="fa-solid ${icon} console-entry-icon"></i><div class="console-entry-body"><div class="console-entry-msg">${esc(String(msg))}</div>${srcShort?`<div class="console-entry-src">${esc(srcShort)}${esc(loc)}</div>`:''}</div><div class="console-entry-time">${timeStr}</div>`;
  const body=document.getElementById('consoleBody');body.appendChild(entry);
  applyConsoleFilter();
  if(consoleOpen) body.scrollTop=body.scrollHeight;
  if(type==='error'&&!consoleOpen) toggleConsole();
}
(function(){['log','warn','error'].forEach(fn=>{const orig=console[fn].bind(console);console[fn]=function(){const args=Array.prototype.slice.call(arguments);if(document.getElementById('gameModal').classList.contains('open')) consoleLog(fn,args.map(a=>typeof a==='object'?JSON.stringify(a):String(a)).join(' '),'',0,0,false);orig.apply(console,args);};});})();
window.addEventListener('error',e=>{if(!document.getElementById('gameModal').classList.contains('open')) return;consoleLog('error',e.message,e.filename,e.lineno,e.colno,false);},true);
window.addEventListener('unhandledrejection',e=>{if(!document.getElementById('gameModal').classList.contains('open')) return;consoleLog('error','Promise rejection: '+(e.reason?.message||String(e.reason)),'',0,0,false);});
window.addEventListener('message',e=>{if(e.origin!==window.location.origin)return;if(!e.data?.__zenoConsole) return;consoleLog(e.data.level||'log',e.data.msg,e.data.src,e.data.lineno,e.data.colno,true);});
document.getElementById('gameModalFrame').addEventListener('load',function(){
  clearConsole();
  const src=this.src;if(!src||src==='about:blank'||src===window.location.href) return;
  try{const iwin=this.contentWindow;if(!iwin) return;const origin=window.location.origin;const script=iwin.document.createElement('script');script.textContent='(function(){var O='+JSON.stringify(origin)+';function send(l,m,s,ln,c){parent.postMessage({__zenoConsole:true,level:l,msg:m,src:s||"",lineno:ln||0,colno:c||0},O||"*");}window.addEventListener("error",function(e){send("error",e.message,e.filename,e.lineno,e.colno);},true);window.addEventListener("unhandledrejection",function(e){send("error","Promise: "+(e.reason&&e.reason.message?e.reason.message:String(e.reason)),"",0,0);});["log","warn","error"].forEach(function(fn){var orig=console[fn].bind(console);console[fn]=function(){var args=Array.prototype.slice.call(arguments);send(fn,args.map(function(a){return typeof a==="object"?JSON.stringify(a):String(a);}).join(" "),"",0,0);orig.apply(console,args);};});})();';iwin.document.head.appendChild(script);}catch(err){}
});

// ── PROGRESS ─────────────────────────────────────────────────────
function buildPips(n){const c=document.getElementById('progressPips');c.innerHTML='';for(let i=0;i<n;i++){const p=document.createElement('div');p.className='pip';p.id='pip-'+i;c.appendChild(p);}}
function setPip(i,s){const p=document.getElementById('pip-'+i);if(p)p.className='pip '+s;}
function showProgress(show,text=''){document.getElementById('progressOverlay').classList.toggle('open',show);if(text) document.getElementById('progressSub').textContent=text;if(!show){document.getElementById('progressBar').style.width='0%';document.getElementById('progressPips').innerHTML='';}}
function setProgress(pct,text){document.getElementById('progressBar').style.width=pct+'%';if(text) document.getElementById('progressSub').textContent=text;}

// ── GREETING / WELCOME ────────────────────────────────────────────
function updateGreeting(){const name=localStorage.getItem('zeno-username');const el=document.getElementById('greeting');if(!el||!name) return;const h=new Date().getHours();const sal=h<5?'UP LATE,':h<12?'MORNING,':h<18?'HELLO,':'EVENING,';el.innerHTML=sal+' <span>'+name.toUpperCase()+'</span>';}
window.updateGreeting=updateGreeting;updateGreeting();
function saveUsername(){localStorage.setItem('zeno-username',document.getElementById('welcomeInput').value.trim()||'Player');updateGreeting();document.getElementById('welcomeModal').classList.remove('open');}
function skipUsername(){localStorage.setItem('zeno-username','');document.getElementById('welcomeModal').classList.remove('open');}
document.getElementById('welcomeInput').addEventListener('keydown',e=>{if(e.key==='Enter') saveUsername();});
if(localStorage.getItem('zeno-username')===null){document.getElementById('welcomeModal').classList.add('open');setTimeout(()=>document.getElementById('welcomeInput').focus(),100);}

// ── TOAST (stacked) ─────────────────────────────────────────────
function showToast(msg, err, onUndo) {
  const stack = document.getElementById('toastStack');
  playUiSound(err ? 'err' : 'ok');
  if (!stack) {
    const t = document.getElementById('toast');
    if (t) { t.textContent = msg; t.className = 'toast' + (err ? ' error' : ''); void t.offsetWidth; t.classList.add('show'); }
    return;
  }
  const item = document.createElement('div');
  item.className = 'toast-item' + (err ? ' error' : '');
  const span = document.createElement('span');
  span.textContent = msg;
  item.appendChild(span);
  if (typeof onUndo === 'function') {
    const u = document.createElement('button');
    u.type = 'button';
    u.className = 'toast-undo';
    u.textContent = 'UNDO';
    u.onclick = () => { onUndo(); item.remove(); };
    item.appendChild(u);
  }
  stack.appendChild(item);
  setTimeout(() => { item.remove(); }, onUndo ? 8000 : 3800);
}
window.showToast = showToast;

// ── GIT IMPORT ────────────────────────────────────────────────────
let ghFoundGames=[],ghCurrentCfg=null,ghCurrentBranch=null;
function parseRepoUrl(raw){raw=raw.trim().replace(/\/+$/,'').replace(/\.git$/,'');const m=raw.match(/(?:https?:\/\/)?([^/\s]+\.[^/\s]+)\/([^/\s]+)\/([^/\s]+)/);if(m){const host=m[1],owner=m[2],repo=m[3];return{type:host==='github.com'?'github':host.includes('gitlab')?'gitlab':'forgejo',host,owner,repo};}const m2=raw.match(/^([^/\s]+)\/([^/\s]+)$/);if(m2) return{type:'forgejo',host:'git.gay',owner:m2[1],repo:m2[2]};return null;}
async function gitApiFetch(url,type){const headers=type==='github'?{'Accept':'application/vnd.github.v3+json'}:{};const res=await fetch(url,{headers});if(res.status===403) throw new Error('RATE LIMITED');if(res.status===404) throw new Error('REPO NOT FOUND');if(!res.ok) throw new Error(`API ERROR ${res.status}`);return res.json();}
async function getDefaultBranch(cfg){if(cfg.type==='github'){const d=await gitApiFetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`,'github');return d.default_branch||'main';}if(cfg.type==='gitlab'){const d=await gitApiFetch(`https://${cfg.host}/api/v4/projects/${encodeURIComponent(cfg.owner+'/'+cfg.repo)}`,'gitlab');return d.default_branch||'main';}const d=await gitApiFetch(`https://${cfg.host}/api/v1/repos/${cfg.owner}/${cfg.repo}`,'forgejo');return d.default_branch||'main';}
async function getRepoTree(cfg,branch){if(cfg.type==='github'){const d=await gitApiFetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/trees/${branch}?recursive=1`,'github');return(d.tree||[]).map(f=>({path:f.path,type:f.type==='blob'?'blob':'tree'}));}if(cfg.type==='gitlab'){const pid=encodeURIComponent(cfg.owner+'/'+cfg.repo);let page=1,items=[];while(true){const d=await gitApiFetch(`https://${cfg.host}/api/v4/projects/${pid}/repository/tree?recursive=true&per_page=100&page=${page}`,'gitlab');if(!Array.isArray(d)||!d.length) break;items=items.concat(d);if(d.length<100) break;page++;}return items.map(f=>({path:f.path,type:f.type==='blob'?'blob':'tree'}));}const d=await gitApiFetch(`https://${cfg.host}/api/v1/repos/${cfg.owner}/${cfg.repo}/git/trees/${branch}?recursive=true`,'forgejo');return(d.tree||[]).map(f=>({path:f.path,type:f.type}));}
function getRawUrl(cfg,branch,filePath){if(cfg.type==='github') return`https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${branch}/${filePath}`;if(cfg.type==='gitlab') return`https://${cfg.host}/api/v4/projects/${encodeURIComponent(cfg.owner+'/'+cfg.repo)}/repository/files/${encodeURIComponent(filePath)}/raw?ref=${branch}`;return`https://${cfg.host}/${cfg.owner}/${cfg.repo}/raw/branch/${branch}/${filePath}`;}
async function gitFetchFile(url,cfg,branch,filePath){try{const res=await fetch(url);if(res.ok) return res;}catch(e){}if(cfg?.type==='forgejo'){try{const apiUrl=`https://${cfg.host}/api/v1/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}?ref=${branch}`;const res=await fetch(apiUrl);if(res.ok){const json=await res.json();if(json.content){const binary=atob(json.content.replace(/\n/g,''));const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);return new Response(bytes.buffer,{status:200});}}}catch(e){}}return null;}
async function ghScan(){const raw=document.getElementById('ghUrlInput').value;const cfg=parseRepoUrl(raw);if(!cfg){setGHStatus('INVALID URL','err');return;}const btn=document.getElementById('ghScanBtn');btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>';setGHStatus(`SCANNING ${cfg.owner}/${cfg.repo}...`);document.getElementById('ghGameList').style.display='none';document.getElementById('ghActions').style.display='none';ghFoundGames=[];ghCurrentCfg=cfg;try{const branch=await getDefaultBranch(cfg);ghCurrentBranch=branch;const tree=await getRepoTree(cfg,branch);const folderMap={};for(const item of tree){if(item.type!=='blob') continue;const parts=item.path.split('/');if(parts.length===2&&parts[1].toLowerCase()==='index.html') folderMap[parts[0]]=[];}if(tree.some(f=>f.path==='index.html')) folderMap['[root]']=[];if(!Object.keys(folderMap).length){setGHStatus('NO GAME FOLDERS FOUND','err');btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-magnifying-glass"></i>&nbsp; SCAN';const gtp=document.getElementById('ghTreePreview');if(gtp){gtp.classList.remove('open');gtp.textContent='';}return;}for(const item of tree){if(item.type!=='blob') continue;const parts=item.path.split('/');if(parts.length===1&&'[root]' in folderMap) folderMap['[root]'].push({path:item.path,url:getRawUrl(cfg,branch,item.path)});else if(parts.length>=2&&parts[0] in folderMap) folderMap[parts[0]].push({path:parts.slice(1).join('/'),url:getRawUrl(cfg,branch,item.path)});}ghFoundGames=Object.entries(folderMap).map(([name,files])=>({name,files,selected:false}));setGHStatus(`${ghFoundGames.length} GAME${ghFoundGames.length!==1?'S':''} FOUND`,'ok');renderGHList();}catch(e){setGHStatus(e.message||'SCAN FAILED','err');const gtp2=document.getElementById('ghTreePreview');if(gtp2){gtp2.classList.remove('open');gtp2.textContent='';}}btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-magnifying-glass"></i>&nbsp; SCAN';}
function setGHStatus(msg,cls=''){const el=document.getElementById('ghStatus');el.textContent=msg;el.className='status-line'+(cls?' '+cls:'');}
function updateGhTreePreview(){
  const el=document.getElementById('ghTreePreview');if(!el)return;
  if(!ghFoundGames.length){el.classList.remove('open');el.textContent='';return;}
  el.textContent=ghFoundGames.map(g=>`📁 ${g.name==='[root]'?'[repo root]':g.name} — ${g.files.length} files`).join('\n');
  el.classList.add('open');
}
function renderGHList(){const list=document.getElementById('ghGameList');list.innerHTML='';list.style.display='grid';for(let i=0;i<ghFoundGames.length;i++){const g=ghFoundGames[i];const item=document.createElement('div');item.className='gh-item'+(g.selected?' selected':'');item.innerHTML=`<div class="gh-check">${g.selected?'<i class="fa-solid fa-check"></i>':''}</div><div class="gh-name">${esc(g.name==='[root]'?'Root':g.name)}</div><div class="gh-count">${g.files.length}F</div>`;item.addEventListener('click',()=>{ghFoundGames[i].selected=!ghFoundGames[i].selected;renderGHList();});list.appendChild(item);}document.getElementById('ghActions').style.display='flex';const sel=ghFoundGames.filter(g=>g.selected).length;document.getElementById('ghLoadBtn').disabled=sel===0;document.getElementById('ghLoadBtn').innerHTML=sel>0?`<i class="fa-solid fa-bolt"></i>&nbsp; LOAD ${sel}`:'<i class="fa-solid fa-bolt"></i>&nbsp; LOAD SELECTED';document.getElementById('ghSelectAll').textContent=ghFoundGames.every(g=>g.selected)?'DESELECT ALL':'SELECT ALL';updateGhTreePreview();}
function ghToggleAll(){const all=ghFoundGames.every(g=>g.selected);ghFoundGames.forEach(g=>g.selected=!all);renderGHList();}
async function ghLoadSelected(){const toLoad=ghFoundGames.filter(g=>g.selected);if(!toLoad.length) return;if(!swReady){await initSW();if(!swReady) return;}if(!getSW()){showToast('ACTIVATING SW — reloading...');setTimeout(()=>location.reload(),1200);return;}closeAddModal();buildPips(toLoad.length);showProgress(true,`Downloading ${toLoad.length} game${toLoad.length!==1?'s':''}...`);let added=0;for(let i=0;i<toLoad.length;i++){const g=toLoad[i];const displayName=g.name==='[root]'?(ghCurrentCfg?.repo||'Game'):g.name;setPip(i,'active');showProgress(true,`Downloading: ${displayName} (${i+1}/${toLoad.length})`);const ok=await ghDownloadAndLoad(displayName,g.files,i,toLoad.length);setPip(i,ok?'done':'fail');if(ok) added++;}showProgress(false);if(added>0){showToast(`+${added} GAME${added>1?'S':''} ADDED`);renderGrid();}else showToast('NO GAMES LOADED',true);}
async function ghDownloadAndLoad(name,fileList,gameIdx,total){const id='g'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);const iconNames=new Set(['favicon.ico','favicon.png','icon.png','logo.png','thumbnail.png','cover.png','icon.jpg']);const fileRecords=[];let iconUrl=null;for(let i=0;i<fileList.length;i++){const f=fileList[i];setProgress(Math.round((i/fileList.length)*80),`${name}: ${i+1}/${fileList.length}`);try{const repoPath=name==='[root]'?f.path:`${name}/${f.path}`;const res=await gitFetchFile(f.url,ghCurrentCfg,ghCurrentBranch,repoPath);if(!res) continue;const buf=await res.arrayBuffer();const mime=getMime(f.path.split('/').pop());const fileName=f.path.split('/').pop();const file=new File([buf],fileName,{type:mime});Object.defineProperty(file,'webkitRelativePath',{value:name+'/'+f.path,writable:false,configurable:true});fileRecords.push({file,path:f.path,mimeType:mime});if(!iconUrl&&iconNames.has(fileName.toLowerCase())) iconUrl=await blobToDataUrl(new Blob([buf],{type:mime}));}catch(e){}}if(!fileRecords.some(r=>r.path.split('/').pop().toLowerCase()==='index.html')){showToast(`FAILED: ${name}`,true);return false;}setProgress(88,`${name}: registering...`);const ok=await registerGameWithSW(id,fileRecords);if(!ok) return false;setProgress(100,`${name}: ready!`);await sleep(150);const gameEntry={id,name,icon:iconUrl,entryPath:`./zeno-games/${id}/index.html`,fileCount:fileRecords.length,fileRecords};games.push(gameEntry);saveGameToDB(gameEntry).catch(console.error);return true;}

// ── R2 IMPORT ────────────────────────────────────────────────────
const R2_BASE_KEY='zeno-r2-base';let r2Queue=[],r2DragIdx=null;
document.getElementById('r2BaseInput').value=localStorage.getItem(R2_BASE_KEY)||'';
function r2ParseLink(raw){raw=raw.trim().replace(/\/+$/,'');const baseRaw=document.getElementById('r2BaseInput').value.trim().replace(/\/+$/,'');if(baseRaw) localStorage.setItem(R2_BASE_KEY,baseRaw);if(raw.startsWith('http')){try{const u=new URL(raw);const parts=u.pathname.split('/').filter(Boolean);const idxPos=parts.findIndex(p=>p.toLowerCase()==='index.html');const name=idxPos>0?parts[idxPos-1]:parts[parts.length-1];return{name,indexUrl:raw.endsWith('index.html')?raw:raw.replace(/\/?$/,'/index.html')};}catch(e){return null;}}if(!baseRaw) return{error:'PASTE A BASE URL FIRST'};return{name:raw,indexUrl:`${baseRaw}/${raw}/index.html`};}
function r2AddLink(){const raw=document.getElementById('r2LinkInput').value;if(!raw.trim()) return;const parsed=r2ParseLink(raw);if(!parsed){setR2Status('INVALID LINK','err');return;}if(parsed.error){setR2Status(parsed.error,'err');return;}if(r2Queue.some(g=>g.name===parsed.name)){setR2Status(`"${parsed.name}" ALREADY QUEUED`,'err');return;}r2Queue.push(parsed);document.getElementById('r2LinkInput').value='';setR2Status('');renderR2Queue();}
function r2RemoveItem(i){r2Queue.splice(i,1);renderR2Queue();}
function r2DragStart(e,i){r2DragIdx=i;e.dataTransfer.effectAllowed='move';}
function r2DragOver(e){e.preventDefault();}
function r2Drop(e,toIdx){e.preventDefault();if(r2DragIdx===null||r2DragIdx===toIdx)return;const[m]=r2Queue.splice(r2DragIdx,1);r2Queue.splice(toIdx,0,m);r2DragIdx=null;renderR2Queue();}
function renderR2Queue(){const el=document.getElementById('r2Queue');if(!r2Queue.length){el.innerHTML='';document.getElementById('r2Actions').style.display='none';return;}el.innerHTML=r2Queue.map((g,i)=>`<div class="r2-item" draggable="true" data-r2i="${i}" ondragstart="r2DragStart(event,${i})" ondragover="r2DragOver(event)" ondrop="r2Drop(event,${i})"><i class="fa-solid fa-cloud" style="color:#f6821f;font-size:12px;flex-shrink:0"></i><div style="flex:1;min-width:0"><div class="r2-item-name">${esc(g.name)}</div><div class="r2-item-url">${esc(g.indexUrl)}</div></div><button type="button" class="r2-remove" onclick="event.stopPropagation();r2RemoveItem(${i})"><i class="fa-solid fa-xmark"></i></button></div>`).join('');document.getElementById('r2Actions').style.display='flex';document.getElementById('r2LoadBtn').innerHTML=`<i class="fa-solid fa-bolt"></i>&nbsp; LOAD ${r2Queue.length} GAME${r2Queue.length!==1?'S':''}`;}
function setR2Status(msg,cls=''){const el=document.getElementById('r2Status');el.textContent=msg;el.className='status-line'+(cls?' '+cls:'');}
function r2LoadAll(){if(!r2Queue.length) return;const toLoad=[...r2Queue];closeAddModal();let added=0;for(const g of toLoad){const id='g'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);const gameEntry={id,name:g.name,icon:null,entryPath:g.indexUrl,fileCount:0,fileRecords:[],r2:true};games.push(gameEntry);saveR2GameToDB(gameEntry).catch(console.error);added++;}if(added>0){showToast(`+${added} GAME${added>1?'S':''} ADDED`);renderGrid();}}
async function saveR2GameToDB(game){backupGameMeta?.(game);const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE_META,'readwrite');tx.oncomplete=()=>res();tx.onerror=e=>rej(e.target.error);tx.objectStore(STORE_META).put({id:game.id,name:game.name,icon:game.icon,entryPath:game.entryPath,fileCount:0,r2:true});});}

// ── ZENOAPPS GRID ─────────────────────────────────────────────────
const ZAS_FA_ICONS = {
  '10-minutes-till-dawn': 'fa-moon', '2048-cupcakes': 'fa-cake-candles', '9007199254740992': 'fa-hashtag',
  '99-balls': 'fa-circle', 'a-small-world-cup': 'fa-futbol', 'achievement-unlocked': 'fa-trophy',
  'animal-crossing-wild-world': 'fa-leaf', 'aqua-park-io': 'fa-water', 'backrooms-2d': 'fa-door-open',
  'backrooms-3d': 'fa-dungeon', 'bacon-may-die': 'fa-bacon', 'bad-icecream': 'fa-ice-cream',
  'bad-icecream-2': 'fa-ice-cream', 'bad-icecream-3': 'fa-ice-cream', 'bad-parenting': 'fa-baby',
  'bad-piggies': 'fa-piggy-bank', 'baldis-basics': 'fa-ruler', 'ball-maze': 'fa-circle-notch',
  'basket-random': 'fa-basketball', 'basketball-legends': 'fa-basketball', 'basketball-stars': 'fa-basketball',
  'battle-karts': 'fa-flag-checkered', 'big-flappy-tower-tiny-square': 'fa-dove',
  'big-ice-tower-tiny-square': 'fa-snowflake', 'big-neon-tower-tiny-square': 'fa-square',
  'big-tower-tiny-square-2': 'fa-layer-group', 'block-blast': 'fa-table-cells', 'block-blast-2': 'fa-table-cells',
  'blood-money': 'fa-sack-dollar', 'bloxorz': 'fa-cube', 'brawl-stars': 'fa-star', 'buckshot-roulette': 'fa-dice',
  'burrito-bison-launch-alibre': 'fa-burger', 'celeste': 'fa-mountain', 'celeste-2': 'fa-mountain',
  'cluster-rush': 'fa-truck-fast', 'cookie-clicker': 'fa-cookie', 'core-ball': 'fa-bullseye',
  'crazy-cars': 'fa-car-side', 'crazy-cattle-3d': 'fa-cow', 'crossy-road': 'fa-road',
  'deltarune': 'fa-gem', 'drift-boss': 'fa-car', 'drive-mad': 'fa-truck-monster', 'duck-life': 'fa-feather',
  'duck-life-2': 'fa-feather', 'duck-life-3': 'fa-feather', 'eggy-car': 'fa-egg', 'fire-boy-and-water-girl': 'fa-fire',
  'flappy-bird': 'fa-crow', 'fnaf': 'fa-mask', 'fnaf-2': 'fa-mask', 'fnaf-3': 'fa-mask', 'fnaw': 'fa-ghost',
  'free-rider': 'fa-bicycle', 'funny-shooter-2': 'fa-gun', 'geometry-dash-3d': 'fa-shapes',
  'granny': 'fa-house-chimney', 'grow-a-garden': 'fa-seedling', 'gta-2': 'fa-city', 'happy-wheels': 'fa-wheelchair',
  'hextris': 'fa-hexagon', 'learn-to-fly': 'fa-plane', 'learn-to-fly-2': 'fa-plane', 'learn-to-fly-3': 'fa-plane',
  'minecraft-1.5.2': 'fa-cube', 'minecraft-indev': 'fa-cube', 'minecraft-parkour': 'fa-person-running',
  'minecraft-tower-defence': 'fa-shield', 'minecraft-zeta-client': 'fa-cube', 'motox3m': 'fa-motorcycle',
  'motox3m-2': 'fa-motorcycle', 'motox3m-3': 'fa-motorcycle', 'motox3m-spookyland': 'fa-motorcycle',
  'motox3m-winter': 'fa-motorcycle', 'plants-vs-zombies': 'fa-sun', 'retro-bowl': 'fa-football',
  'short-life': 'fa-person-falling', 'slither-io': 'fa-staff-snake', 'slope-3': 'fa-chart-line',
  'slow-roads': 'fa-road', 'snow-rider-3d': 'fa-skiing', 'soccer-random': 'fa-futbol',
  'subway-surfers': 'fa-train-subway', 'super-hot': 'fa-stopwatch', 'the-binding-of-isaac': 'fa-heart-crack',
  'the-legend-of-zelda-the-minish-cap': 'fa-hat-wizard', 'the-worlds-hardest-game': 'fa-brain',
  'tiny-fishing': 'fa-fish', 'ultrakill': 'fa-bolt', 'vex': 'fa-person-running', 'vex-2': 'fa-person-running',
  'vex-3': 'fa-person-running', 'vex-6': 'fa-person-running', 'vex-7': 'fa-person-running', 'vex-8': 'fa-person-running',
  'volly-random': 'fa-volleyball', 'word-wonders': 'fa-spell-check', 'wordle': 'fa-font',
  'yohoho-io': 'fa-skull-crossbones', 'you-vs-100-skibidi-toilets': 'fa-toilet',
  'zombocalypse-2': 'fa-biohazard', 'cine-cloud': 'fa-clapperboard',
};
function zasFaIcon(id) {
  if (ZAS_FA_ICONS[id]) return ZAS_FA_ICONS[id];
  if (/minecraft|minish-cap|zelda/i.test(id)) return 'fa-cube';
  if (/fnaf|granny|backrooms|isaac|horror|skibidi/i.test(id)) return 'fa-ghost';
  if (/basket|soccer|football|volly|ball-maze|retro-bowl/i.test(id)) return 'fa-basketball';
  if (/moto|drift|drive|car|road|kart|gta/i.test(id)) return 'fa-car';
  if (/io$|-io\b|slither|yohoho/i.test(id)) return 'fa-globe';
  if (/word|hextris|2048|puzzle|blox/i.test(id)) return 'fa-puzzle-piece';
  if (/shooter|hot|gun/i.test(id)) return 'fa-crosshairs';
  if (/tower|vex|celeste|flappy|slope|platform/i.test(id)) return 'fa-person-running';
  return 'fa-gamepad';
}
function zasIsAdded(id) { return games.some(g => g.id === 'zas-' + id); }
function zasActionHtml(id, added) {
  if (added) {
    return '<i class="fa-solid fa-circle-play" aria-hidden="true"></i><span>Play</span>';
  }
  return '<i class="fa-solid fa-plus" aria-hidden="true"></i><span>Add</span>';
}
function zasCardHtml(id) {
  const name = fmt(id);
  const added = zasIsAdded(id);
  const icon = zasFaIcon(id);
  const desc = esc(DESC_MAP[id] || 'Ready to play in your library.');
  return `<div class="zas-card${added ? ' is-added' : ''}" data-id="${id}" data-name="${esc(name.toLowerCase())}" data-added="${added ? '1' : '0'}">
    <div class="zas-card-icon" aria-hidden="true"><i class="fa-solid ${icon}"></i></div>
    <div class="zas-card-main">
      <div class="zas-card-head">
        <h3 class="zas-name">${esc(name)}</h3>
        ${added ? '<span class="zas-badge"><i class="fa-solid fa-check"></i> Added</span>' : ''}
      </div>
      <p class="zas-desc">${desc}</p>
    </div>
    <button type="button" class="zas-action${added ? ' is-play' : ''}" data-id="${id}" onclick="zasAdd(this,'${id}')">${zasActionHtml(id, added)}</button>
  </div>`;
}
const DESC_MAP={'10-minutes-till-dawn':'Survive waves of enemies for 10 minutes','2048-cupcakes':'Sweet twist on 2048 with cupcake tiles','9007199254740992':'Reach the largest safe JavaScript integer','99-balls':'Break bricks with bouncing balls','a-small-world-cup':'Fast-paced ragdoll soccer','achievement-unlocked':'Collect every achievement in this meta-platformer','animal-crossing-wild-world':'Classic life sim on a peaceful island','aqua-park-io':'Slide down waterslides and race to the bottom','backrooms-2d':'Explore the eerie infinite backrooms in 2D','backrooms-3d':'First-person horror exploration of the backrooms','bacon-may-die':'Beat up enemies as a bacon-wielding warrior','bad-icecream':'Freeze enemies and collect fruit in icy mazes','bad-icecream-2':'More icy puzzle action','bad-icecream-3':'The third chilly chapter','bad-parenting':'Hilarious physics parenting gone wrong','bad-piggies':'Build contraptions to help the pigs','baldis-basics':'Survive the school of Baldi\'s wrath','ball-maze':'Tilt and roll your ball through mazes','basket-random':'Wacky two-button basketball','basket-bros':'Basketball for the bros','basketball-legends':'Play as legendary stars in 1v1 matches','basketball-stars':'Street basketball with trick shots','battle-karts':'Mario Kart-style racing with weapons','big-flappy-tower-tiny-square':'Flap through a massive tower','big-ice-tower-tiny-square':'Climb a giant ice tower','big-neon-tower-tiny-square':'Neon-lit tower climbing','big-tower-tiny-square-2':'Sequel to the beloved tiny square tower','block-blast':'Blast and clear blocks in this puzzle','block-blast-2':'More explosive block-clearing action','blood-money':'Action-packed heist experience','bloxorz':'Roll a block to the goal without falling','brawl-stars':'Fast-paced multiplayer brawler','buckshot-roulette':'Intense game of chance with a shotgun twist','burrito-bison-launch-alibre':'Launch a wrestler into candy land','celeste':'Precision platformer about climbing a mountain','celeste-2':'More challenging precision platforming','cluster-rush':'Jump between speeding trucks','cookie-clicker':'Click cookies and build a cookie empire','core-ball':'Attach balls to a spinning core','crazy-cars':'High-speed racing with crazy physics','crazy-cattle-3d':'Chaotic 3D cattle physics battle royale','crossy-road':'Hop across roads without getting squashed','deltarune':'RPG adventure from the creator of Undertale','drift-boss':'Master drifting around endless curves','drive-mad':'Navigate impossible obstacle courses','duck-life':'Train your duck to become a racing champion','duck-life-2':'More duck training adventures','duck-life-3':'The third chapter of duck training','eggy-car':'Balance an egg on a car over bumpy terrain','fire-boy-and-water-girl':'Cooperative elemental puzzle platformer','flappy-bird':'Tap to keep your bird flying through pipes','fnaf':'Survive the night at a haunted pizza place','fnaf-2':'The terrifying sequel','fnaf-3':'The third night of animatronic horror','fnaw':'Five Nights at Wario\'s fan-made horror','free-rider':'Draw your own tracks and ride them','funny-shooter-2':'Hilarious FPS with absurd enemies','geometry-dash-3d':'Rhythm-based obstacle course in 3D','granny':'Escape from Granny\'s house','grow-a-garden':'Cultivate and expand your dream garden','gta-2':'Top-down crime sandbox classic','happy-wheels':'Brutal ragdoll physics obstacle courses','hextris':'Fast-paced hexagonal Tetris','learn-to-fly':'Train a penguin to fly','learn-to-fly-2':'More penguin flight training','learn-to-fly-3':'Ultimate penguin flight evolution','minecraft-1.5.2':'Classic Minecraft 1.5.2 in browser','minecraft-indev':'Play the original indev Minecraft','minecraft-parkour':'Test your Minecraft parkour skills','minecraft-tower-defence':'Defend your base in MC Tower Defence','minecraft-zeta-client':'Minecraft Zeta browser edition','motox3m':'Stunt motorcycle racing','motox3m-2':'More insane moto stunt tracks','motox3m-3':'Third chapter of moto stunt madness','motox3m-spookyland':'Halloween themed moto racing','motox3m-winter':'Winter wonderland moto racing','plants-vs-zombies':'Defend your garden from zombie hordes','retro-bowl':'American football management sim','short-life':'Ragdoll platformer with deadly obstacles','slither-io':'Grow your snake by eating others','slope-3':'Race a ball down an endless neon slope','slow-roads':'Relaxing endless driving','snow-rider-3d':'Sled down snowy slopes','soccer-random':'Wacky two-button soccer','subway-surfers':'Run from the inspector across subway tracks','super-hot':'Time moves only when you move','the-binding-of-isaac':'Roguelike dungeon crawler','the-legend-of-zelda-the-minish-cap':'Classic GBA Zelda adventure','the-worlds-hardest-game':'Navigate brutally difficult maze levels','tiny-fishing':'Cast your line and reel in rare fish','ultrakill':'Ultra-fast retro FPS','vex':'Stickman parkour through deadly stages','vex-2':'More intense stickman challenges','vex-3':'Third chapter of Vex parkour','vex-6':'Vex series chapter six','vex-7':'Vex series chapter seven','vex-8':'Latest chapter in the Vex series','volly-random':'Wacky volleyball with random physics','word-wonders':'A world built entirely from words','wordle':'Guess the five-letter word in six tries','yohoho-io':'Battle royale on a pirate island','you-vs-100-skibidi-toilets':'Survive waves of skibidi toilets','zombocalypse-2':'Survive endless zombie hordes','cine-cloud':'Play AAA cloud games streamed instantly to your browser — no downloads needed'};
const ZAS_GAMES=['1','10-minutes-till-dawn','2048-cupcakes','9007199254740992','99-balls','a-small-world-cup','achievement-unlocked','animal-crossing-wild-world','aqua-park-io','backrooms-2d','backrooms-3d','bacon-may-die','bad-icecream','bad-icecream-2','bad-icecream-3','bad-parenting','bad-piggies','baldis-basics','ball-maze','basket-bros','basket-random','basketball-legends','basketball-stars','battle-karts','big-flappy-tower-tiny-square','big-ice-tower-tiny-square','big-neon-tower-tiny-square','big-tower-tiny-square-2','block-blast','block-blast-2','blood-money','bloxorz','brawl-stars','buckshot-roulette','burrito-bison-launch-alibre','celeste','celeste-2','cluster-rush','cookie-clicker','core-ball','crazy-cars','crazy-cattle-3d','crossy-road','deltarune','drift-boss','drive-mad','duck-life','duck-life-2','duck-life-3','eggy-car','fire-boy-and-water-girl','flappy-bird','fnaf','fnaf-2','fnaf-3','fnaw','free-rider','funny-shooter-2','geometry-dash-3d','granny','grow-a-garden','gta-2','happy-wheels','hextris','learn-to-fly','learn-to-fly-2','learn-to-fly-3','minecraft-1.5.2','minecraft-indev','minecraft-parkour','minecraft-tower-defence','minecraft-zeta-client','motox3m','motox3m-2','motox3m-3','motox3m-spookyland','motox3m-winter','plants-vs-zombies','retro-bowl','short-life','slither-io','slope-3','slow-roads','snow-rider-3d','soccer-random','subway-surfers','super-hot','the-binding-of-isaac','the-legend-of-zelda-the-minish-cap','the-worlds-hardest-game','tiny-fishing','ultrakill','vex','vex-2','vex-3','vex-6','vex-7','vex-8','volly-random','word-wonders','wordle','yohoho-io','you-vs-100-skibidi-toilets','zombocalypse-2','cine-cloud'];
DESC_MAP['1'] = 'Divide the numbers and get to the 1 tile';
let zasBuilt = false;
let zasHubBound = false;
function fmt(s) { return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function bindZasHub() {
  if (zasHubBound) return;
  zasHubBound = true;
  const search = document.getElementById('zasSearchInput');
  if (search) search.addEventListener('input', () => zasApplyFilters());
  document.querySelectorAll('.zas-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.zas-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      zasApplyFilters();
    });
  });
  const grid = document.getElementById('zasGrid');
  if (grid) {
    grid.addEventListener('click', e => {
      const card = e.target.closest('.zas-card');
      if (!card || e.target.closest('.zas-action')) return;
      const id = card.dataset.id;
      if (!id || !zasIsAdded(id)) return;
      const g = games.find(x => x.id === 'zas-' + id);
      if (g) { closeAddModal(); openGameModal(g); }
    });
  }
}
function zasUpdateCount(visible, total) {
  const el = document.getElementById('zasCountLabel');
  if (!el) return;
  const inLib = ZAS_GAMES.filter(zasIsAdded).length;
  if (visible === total) {
    el.textContent = `${total} apps · ${inLib} in your library`;
  } else {
    el.textContent = `Showing ${visible} of ${total} · ${inLib} in library`;
  }
}
function zasApplyFilters() {
  const q = (document.getElementById('zasSearchInput')?.value || '').toLowerCase().trim();
  const filter = document.querySelector('.zas-filter.active')?.dataset.filter || 'all';
  let vis = 0;
  const total = ZAS_GAMES.length;
  document.querySelectorAll('.zas-card').forEach(c => {
    const name = c.dataset.name || '';
    const added = c.dataset.added === '1';
    const matchQ = !q || name.includes(q);
    const matchF = filter === 'all' || (filter === 'added' ? added : !added);
    const show = matchQ && matchF;
    c.classList.toggle('is-hidden', !show);
    if (show) vis++;
  });
  const empty = document.getElementById('zasNoResults');
  if (empty) empty.hidden = vis > 0;
  zasUpdateCount(vis, total);
}
function zasFilterGrid() { zasApplyFilters(); }
function zasClearSearch() {
  const si = document.getElementById('zasSearchInput');
  if (si) si.value = '';
  document.querySelector('.zas-filter[data-filter="all"]')?.click();
}
function buildZasGrid() {
  bindZasHub();
  if (zasBuilt) { refreshZasCards(); zasApplyFilters(); return; }
  zasBuilt = true;
  const grid = document.getElementById('zasGrid');
  if (!grid) return;
  grid.innerHTML = ZAS_GAMES.map(id => zasCardHtml(id)).join('');
  zasApplyFilters();
}
function refreshZasCards() {
  document.querySelectorAll('.zas-card').forEach(card => {
    const id = card.dataset.id;
    if (!id) return;
    const added = zasIsAdded(id);
    card.dataset.added = added ? '1' : '0';
    card.classList.toggle('is-added', added);
    const badge = card.querySelector('.zas-badge');
    const head = card.querySelector('.zas-card-head');
    if (added && !badge && head) {
      head.insertAdjacentHTML('beforeend', '<span class="zas-badge"><i class="fa-solid fa-check"></i> Added</span>');
    } else if (!added && badge) badge.remove();
    const btn = card.querySelector('.zas-action');
    if (btn) {
      btn.className = 'zas-action' + (added ? ' is-play' : '');
      btn.innerHTML = zasActionHtml(id, added);
    }
  });
}
function refreshZasButtons() { refreshZasCards(); zasApplyFilters(); }
async function zasAdd(btn, id) {
  if (zasIsAdded(id)) {
    closeAddModal();
    openGameModal(games.find(g => g.id === 'zas-' + id));
    return;
  }
  const name = fmt(id);
  const entryPath = zenoAppEntryPath(id);
  const entry = { id: 'zas-' + id, name, icon: null, entryPath, fileCount: 0, fileRecords: null, r2: false, zenoapp: true };
  games.push(entry);
  await saveGameToDB(entry).catch(console.error);
  window._fbSyncGame?.(entry);
  const card = btn.closest('.zas-card');
  if (card) {
    card.dataset.added = '1';
    card.classList.add('is-added');
    const head = card.querySelector('.zas-card-head');
    if (head && !card.querySelector('.zas-badge')) {
      head.insertAdjacentHTML('beforeend', '<span class="zas-badge"><i class="fa-solid fa-check"></i> Added</span>');
    }
    btn.className = 'zas-action is-play';
    btn.innerHTML = zasActionHtml(id, true);
  }
  zasApplyFilters();
  renderGrid();
  showToast(name.toUpperCase() + ' ADDED');
}

// ── INDEXEDDB ────────────────────────────────────────────────────
const DB_NAME='zeno-games-db',DB_VERSION=3,STORE_META='game-meta',STORE_FILES='game-files';
function openDB(){return new Promise((res,rej)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=e=>{const db=e.target.result;const tx=e.target.transaction;if(!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META,{keyPath:'id'});let fs;if(db.objectStoreNames.contains(STORE_FILES)) fs=tx.objectStore(STORE_FILES);else fs=db.createObjectStore(STORE_FILES,{keyPath:'id'});if(!fs.indexNames.contains('gameId')) fs.createIndex('gameId','gameId',{unique:false});};req.onsuccess=e=>res(e.target.result);req.onerror=e=>rej(e.target.error);});}
function idbGetAll(store){return new Promise((res,rej)=>{const r=store.getAll();r.onsuccess=()=>res(r.result);r.onerror=e=>rej(e.target.error);});}
function idbGetAllByIndex(store,idx,val){return new Promise((res,rej)=>{const r=store.index(idx).getAll(val);r.onsuccess=()=>res(r.result);r.onerror=e=>rej(e.target.error);});}
function idbDelete(store,key){return new Promise((res,rej)=>{const r=store.delete(key);r.onsuccess=()=>res();r.onerror=e=>rej(e.target.error);});}
const LIB_BACKUP_KEY='zeno-games-library-backup';
function backupGameMeta(game){if(!game?.id)return;let list=[];try{list=JSON.parse(localStorage.getItem(LIB_BACKUP_KEY)||'[]');}catch{}const meta={id:game.id,name:game.name,icon:game.icon||null,entryPath:game.entryPath,fileCount:game.fileCount||0,r2:game.r2||false,zenoapp:game.zenoapp||false,updatedAt:Date.now()};list=[meta,...list.filter(g=>g&&g.id!==game.id)].slice(0,500);localStorage.setItem(LIB_BACKUP_KEY,JSON.stringify(list));}
function removeGameMetaBackup(gameId){let list=[];try{list=JSON.parse(localStorage.getItem(LIB_BACKUP_KEY)||'[]');}catch{}localStorage.setItem(LIB_BACKUP_KEY,JSON.stringify(list.filter(g=>g&&g.id!==gameId)));}
function loadGameMetaBackup(){try{return JSON.parse(localStorage.getItem(LIB_BACKUP_KEY)||'[]').filter(g=>g&&g.id&&g.entryPath);}catch{return[];}}
function restoreFromMetaBackup(){const metas=loadGameMetaBackup();let restored=0;for(const meta of metas){if(games.some(g=>g.id===meta.id))continue;if(meta.r2){games.push({...meta,fileRecords:[]});restored++;continue;}if(meta.zenoapp){games.push({...meta,entryPath:normalizeZenoAppPath(meta.entryPath),fileRecords:null});restored++;}}if(restored){renderGrid();showToast(`${restored} GAME${restored>1?'S':''} RESTORED`);}return restored;}
function restoreFromRecentGames(){const recent=readRecentGames();let restored=0;for(const item of recent){if(!item?.id||games.some(g=>g.id===item.id))continue;const zasId=item.id.startsWith('zas-')?item.id.slice(4):null;const entryPath=item.entryPath||(zasId?zenoAppEntryPath(zasId):'');if(!entryPath)continue;const entry={id:item.id,name:item.name||fmt(zasId||item.id),icon:item.icon||item.thumbnail||null,entryPath:normalizeZenoAppPath(entryPath),fileCount:item.fileCount||0,r2:!!item.r2,zenoapp:item.zenoapp!==false||!!zasId,fileRecords:item.r2?[]:null};if(entry.r2||entry.zenoapp){games.push(entry);backupGameMeta(entry);restored++;}}if(restored){renderGrid();showToast(`${restored} GAME${restored>1?'S':''} RESTORED`);}return restored;}
async function saveGameToDB(game){backupGameMeta(game);const fileData=[];if(game.fileRecords&&game.fileRecords.length) for(const r of game.fileRecords){const buf=await r.file.arrayBuffer();fileData.push({path:r.path,mimeType:r.mimeType,buffer:buf});}const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction([STORE_META,STORE_FILES],'readwrite');tx.oncomplete=()=>res();tx.onerror=e=>rej(e.target.error);tx.onabort=e=>rej(e.target.error);tx.objectStore(STORE_META).put({id:game.id,name:game.name,icon:game.icon,entryPath:game.entryPath,fileCount:game.fileCount,r2:game.r2||false,zenoapp:game.zenoapp||false});for(const f of fileData) tx.objectStore(STORE_FILES).put({id:game.id+':'+f.path,gameId:game.id,path:f.path,mimeType:f.mimeType,buffer:f.buffer});});}
window.saveGameToDB=saveGameToDB;
async function deleteGameFromDB(gameId){removeGameMetaBackup(gameId);const db=await openDB();const tx=db.transaction([STORE_META,STORE_FILES],'readwrite');const metaStore=tx.objectStore(STORE_META);const fileStore=tx.objectStore(STORE_FILES);await idbDelete(metaStore,gameId);const fileEntries=await idbGetAllByIndex(fileStore,'gameId',gameId);for(const f of fileEntries) await idbDelete(fileStore,f.id);}
async function loadGamesFromDB(){try{const db=await openDB();const tx=db.transaction([STORE_META,STORE_FILES],'readonly');let metas=await idbGetAll(tx.objectStore(STORE_META));if(!metas.length) metas=loadGameMetaBackup();if(!metas.length){restoreFromRecentGames();return;}const skel=document.getElementById('gameSkeletonRow');if(skel){skel.style.display='grid';skel.innerHTML=Array(Math.min(metas.length,12)).fill(0).map(()=>'<div class="skeleton-card"></div>').join('');}showProgress(true,'Restoring saved games...');buildPips(metas.length);for(let i=0;i<metas.length;i++){const meta=metas[i];setPip(i,'active');showProgress(true,`Restoring: ${meta.name}`);try{if(games.some(g=>g.id===meta.id)){setPip(i,'done');continue;}if(meta.r2){const entry={...meta,fileRecords:[]};games.push(entry);backupGameMeta(entry);setPip(i,'done');continue;}if(meta.zenoapp){const entryPath=normalizeZenoAppPath(meta.entryPath);const entry={...meta,entryPath,fileRecords:null};games.push(entry);if(entryPath!==meta.entryPath) saveGameToDB(entry).catch(console.error);else backupGameMeta(entry);setPip(i,'done');continue;}const tx2=db.transaction(STORE_FILES,'readonly');const fileEntries=await idbGetAllByIndex(tx2.objectStore(STORE_FILES),'gameId',meta.id);const fileRecords=fileEntries.map(fe=>({path:fe.path,mimeType:fe.mimeType,file:new File([fe.buffer],fe.path.split('/').pop(),{type:fe.mimeType})}));if(!fileRecords.length){setPip(i,'fail');continue;}const ok=await registerGameWithSW(meta.id,fileRecords);if(ok){games.push({...meta,fileRecords});setPip(i,'done');}else setPip(i,'fail');}catch(e){console.error('Restore failed:',meta.name,e);setPip(i,'fail');}}showProgress(false);renderGrid();if(games.length) showToast(`${games.length} GAME${games.length>1?'S':''} RESTORED`);}catch(e){console.error('loadGamesFromDB failed:',e);if(!restoreFromMetaBackup())restoreFromRecentGames();showProgress(false);}}

// ── KEYBOARD SHORTCUTS ────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  const active=document.activeElement;
  const inInput=active&&(active.tagName==='INPUT'||active.tagName==='TEXTAREA'||active.tagName==='SELECT');
  if(e.key==='Escape'){
    if(document.getElementById('ptgoalModal')?.classList.contains('open')){closePtGoalModal();return;}
    if(bulkMode){toggleBulkMode();return;}
    closeGameModal();closeAddModal();closeCollModal();closeSettingsModal();closeSidebar();
    if(consoleOpen)toggleConsole();closeOverflow();closeKL();closeCtxMenu();
  }
  if(e.key==='|'&&!inInput){e.preventDefault();toggleConsole();}
  if((e.key==='/'||e.key==='k'&&(e.metaKey||e.ctrlKey))&&!inInput&&!document.getElementById('gameModal').classList.contains('open')){e.preventDefault();openKL();}
  if(e.key==='b'&&!inInput&&!document.getElementById('gameModal').classList.contains('open')&&games.length){e.preventDefault();toggleBulkMode();}
  if(e.key==='?'&&!inInput){e.preventDefault();openShortcutsModal();}
});

// ── SHORTCUTS MODAL ───────────────────────────────────────────────
function openShortcutsModal() {
  let overlay = document.getElementById('shortcutsOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'shortcutsOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(16px);z-index:500;display:flex;align-items:center;justify-content:center';
    overlay.innerHTML = `
      <div style="background:var(--bg2);border:1px solid rgba(0,245,255,.18);border-radius:14px;padding:28px 32px;width:360px;max-width:95vw;animation:slideIn .2s ease">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:3px;color:var(--neon-cyan)">KEYBOARD SHORTCUTS</div>
          <button onclick="closeShortcutsModal()" style="background:none;border:1px solid rgba(0,245,255,.12);border-radius:4px;color:var(--muted);width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${[
            ['/','Open game launcher'],
            ['Ctrl+K','Open game launcher'],
            ['Ctrl+Enter','Game info (launcher)'],
            ['B','Toggle bulk select mode'],
            ['|','Toggle error console'],
            ['?','Show this help'],
            ['Esc','Close any modal / exit bulk mode'],
          ].map(([k,d])=>`
            <div style="display:flex;align-items:center;gap:12px">
              <kbd style="font-family:'Orbitron',monospace;font-size:9px;background:rgba(0,245,255,.07);border:1px solid rgba(0,245,255,.2);border-radius:4px;padding:4px 8px;color:var(--neon-cyan);white-space:nowrap;flex-shrink:0;min-width:60px;text-align:center">${k}</kbd>
              <span style="font-size:12px;color:var(--muted)">${d}</span>
            </div>`).join('')}
          <div style="height:1px;background:rgba(0,245,255,.07);margin:4px 0"></div>
          <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:2px;color:var(--muted);margin-bottom:4px">IN-GAME</div>
          ${[
            ['Swipe ↓','Close game (mobile)'],
            ['Right-click','Context menu on any card'],
          ].map(([k,d])=>`
            <div style="display:flex;align-items:center;gap:12px">
              <kbd style="font-family:'Orbitron',monospace;font-size:9px;background:rgba(0,245,255,.07);border:1px solid rgba(0,245,255,.2);border-radius:4px;padding:4px 8px;color:var(--neon-cyan);white-space:nowrap;flex-shrink:0;min-width:60px;text-align:center">${k}</kbd>
              <span style="font-size:12px;color:var(--muted)">${d}</span>
            </div>`).join('')}
        </div>
      </div>`;
    overlay.addEventListener('click', e => { if(e.target===overlay) closeShortcutsModal(); });
    document.body.appendChild(overlay);
  } else {
    overlay.style.display = 'flex';
  }
}
function closeShortcutsModal() {
  const overlay = document.getElementById('shortcutsOverlay');
  if (overlay) overlay.style.display = 'none';
}

// ── INJECT EXTRA STYLES ───────────────────────────────────────────
(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Context menu */
    #ctxMenu {
      position: fixed;
      display: none;
      flex-direction: column;
      gap: 2px;
      background: rgba(8,8,18,.98);
      border: 1px solid rgba(0,245,255,.15);
      border-radius: 9px;
      padding: 5px;
      z-index: 900;
      min-width: 160px;
      box-shadow: 0 8px 32px rgba(0,0,0,.6), 0 0 20px rgba(0,245,255,.04);
      animation: slideIn .1s ease;
    }
    .ctx-item {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 8px 10px;
      border-radius: 5px;
      cursor: pointer;
      font-family: 'Orbitron', monospace;
      font-size: 8px;
      letter-spacing: 2px;
      color: var(--muted);
      transition: all .12s;
      border: none;
      background: transparent;
      width: 100%;
      text-align: left;
    }
    .ctx-item:hover { background: rgba(0,245,255,.07); color: var(--text); }
    .ctx-item i { width: 14px; text-align: center; font-size: 11px; }
    .ctx-item.ctx-danger:hover { color: var(--neon-pink); background: rgba(255,0,110,.06); }
    .ctx-sep { height: 1px; background: rgba(0,245,255,.07); margin: 3px 0; }

    /* Bulk mode */
    .bulk-bar {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 460;
      background: rgba(8,8,18,.97);
      border: 1px solid rgba(0,245,255,.25);
      border-radius: 10px;
      padding: 10px 18px;
      display: none;
      align-items: center;
      gap: 14px;
      box-shadow: 0 0 30px rgba(0,245,255,.1);
      animation: slideIn .2s ease;
    }
    .bulk-check {
      position: absolute;
      top: 5px;
      left: 5px;
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 1px solid rgba(0,245,255,.25);
      background: rgba(0,245,255,.05);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      color: rgba(0,245,255,.4);
      cursor: pointer;
      z-index: 10;
      transition: all .15s;
    }
    .bulk-check.checked {
      background: rgba(0,245,255,.2);
      border-color: var(--neon-cyan);
      color: var(--neon-cyan);
    }
    .game-card.bulk-mode { cursor: pointer; }
    .game-card.bulk-selected { border-color: rgba(0,245,255,.45); background: rgba(0,245,255,.06); }
    .game-card.bulk-mode .game-actions { display: none; }
    .game-card.bulk-mode .game-fav-btn { display: none; }

    /* Shortcut hint in top bar */
    .shortcut-hint {
      font-family: 'Orbitron', monospace;
      font-size: 7px;
      letter-spacing: 1.5px;
      color: rgba(0,245,255,.2);
      cursor: pointer;
      transition: color .2s;
      padding: 4px 6px;
      border-radius: 4px;
    }
    .shortcut-hint:hover { color: rgba(0,245,255,.5); }

    /* Recent chip playtime glow */
    .recent-chip:hover .recent-chip-icon { box-shadow: 0 0 10px rgba(0,245,255,.2); }
  `;
  document.head.appendChild(style);
})();

// ── INJECT CONTEXT MENU & BULK BAR DOM ────────────────────────────
(function injectDom() {
  const ctx = document.createElement('div');
  ctx.id = 'ctxMenu';
  ctx.innerHTML = `
    <button class="ctx-item" onclick="ctxAction('play')"><i class="fa-solid fa-play"></i> PLAY</button>
    <button class="ctx-item" id="ctxFavLabel" onclick="ctxAction('fav')"><i class="fa-regular fa-star"></i> FAVORITE</button>
    <button class="ctx-item" onclick="ctxAction('info')"><i class="fa-solid fa-circle-info"></i> INFO / EDIT</button>
    <div class="ctx-sep"></div>
    <button class="ctx-item" onclick="ctxAction('export')"><i class="fa-solid fa-box-archive"></i> EXPORT</button>
    <button class="ctx-item ctx-danger" onclick="ctxAction('delete')"><i class="fa-solid fa-trash"></i> REMOVE</button>`;
  document.body.appendChild(ctx);

  const bulkBar = document.createElement('div');
  bulkBar.id = 'bulkBar';
  bulkBar.className = 'bulk-bar';
  bulkBar.innerHTML = `
    <span id="bulkCount" style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--neon-cyan)">0 SELECTED</span>
    <button onclick="bulkSelectAll()" style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:2px;padding:6px 12px;border-radius:5px;cursor:pointer;border:1px solid rgba(0,245,255,.2);background:rgba(0,245,255,.04);color:var(--muted);transition:all .2s">ALL</button>
    <button id="bulkDeleteBtn" onclick="bulkDeleteSelected()" disabled style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:2px;padding:6px 14px;border-radius:5px;cursor:pointer;border:1px solid rgba(255,0,110,.25);background:rgba(255,0,110,.06);color:var(--neon-pink);transition:all .2s;opacity:.4">DELETE</button>
    <button onclick="toggleBulkMode()" style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:2px;padding:6px 12px;border-radius:5px;cursor:pointer;border:1px solid rgba(255,255,255,.08);background:transparent;color:var(--muted)">CANCEL</button>`;
  document.body.appendChild(bulkBar);

  const hintBtn = document.createElement('button');
  hintBtn.className = 'shortcut-hint';
  hintBtn.title = 'Keyboard shortcuts';
  hintBtn.innerHTML = '? SHORTCUTS';
  hintBtn.onclick = openShortcutsModal;
  const tbRight = document.querySelector('.tb-right');
  if (tbRight) tbRight.insertBefore(hintBtn, tbRight.firstChild);

  const overflowMenu = document.getElementById('overflowMenu');
  if (overflowMenu) {
    const sep = document.createElement('div');
    sep.className = 'overflow-sep';
    const bulkBtn = document.createElement('button');
    bulkBtn.className = 'overflow-item';
    bulkBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> BULK SELECT';
    bulkBtn.onclick = () => { toggleBulkMode(); closeOverflow(); };
    overflowMenu.appendChild(sep);
    overflowMenu.appendChild(bulkBtn);
  }
})();

function syncSearchClear() {
  const w = document.getElementById('searchWrap');
  const inp = document.getElementById('searchInput');
  if (w && inp) w.classList.toggle('has-text', !!inp.value.trim());
}
function clearSearch() {
  const inp = document.getElementById('searchInput');
  if (inp) { inp.value = ''; filterGames(); syncSearchClear(); }
}
(function initZenoUiExtras() {
  if (localStorage.getItem('zeno-reduced-motion') === '1') document.body.classList.add('zeno-reduced-motion');
  applyGameImportMode();
  const si = document.getElementById('searchInput');
  if (si) si.addEventListener('input', syncSearchClear);
})();

window.renderGrid = renderGrid;
window.clearSearch = clearSearch;
window.copyConsoleAll = copyConsoleAll;
window.setConsoleFilter = setConsoleFilter;
window.r2DragStart = r2DragStart;
window.r2DragOver = r2DragOver;
window.r2Drop = r2Drop;
window.closePtGoalModal = closePtGoalModal;
window.applyPtGoalPreset = applyPtGoalPreset;
window.applyPtGoalCustom = applyPtGoalCustom;
window.toggleReducedMotion = toggleReducedMotion;
window.syncSearchClear = syncSearchClear;
window.openAddModal = openAddModal;
window.loadUrlGame = loadUrlGame;
window.handleSingleHtmlInput = handleSingleHtmlInput;
window.importZipFiles = importZipFiles;
window.syncGamesStats = syncGamesStats;
window.zasClearSearch = zasClearSearch;
window.zasApplyFilters = zasApplyFilters;

function launchGameFromUrlParam() {
  const params = new URLSearchParams(location.search);
  const id = params.get('play');
  if (!id) return;
  const game = games.find(g => g.id === id);
  if (!game) { showToast('GAME NOT FOUND', true); return; }
  setTimeout(() => openGameModal(game), 250);
  params.delete('play');
  const next = `${location.pathname}${params.toString() ? '?' + params.toString() : ''}${location.hash}`;
  history.replaceState(null, '', next);
}

// ── INIT ─────────────────────────────────────────────────────────
(async function bootGamesPage() {
  await initSW();
  await loadGamesFromDB();
  if (!games.length) renderGrid();
  launchGameFromUrlParam();
})();
