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
  // remove from all game metas
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
    return `<div class="coll-item"><div class="coll-item-emoji">${c.emoji}</div><div class="coll-item-name">${esc(c.name)}</div><div class="coll-item-count">${count} GAME${count!==1?'S':''}</div><button class="coll-item-del" onclick="deleteCollection('${c.id}')"><i class="fa-solid fa-trash"></i></button></div>`;
  }).join('');
}
function renderCollFilterBtns() {
  const colls = loadCollections();
  const el = document.getElementById('collFilterBtns');
  const sep = document.getElementById('collFilterSep');
  if (!colls.length) { el.innerHTML=''; sep.style.display='none'; return; }
  sep.style.display='block';
  el.innerHTML = colls.map(c => `<button class="filter-coll-btn${activeCollFilter===c.id?' active':''}" onclick="setCollFilter('${c.id}')">${c.emoji} ${esc(c.name)}</button>`).join('');
}
function setCollFilter(id) {
  activeCollFilter = activeCollFilter===id ? null : id;
  renderCollFilterBtns();
  renderGrid();
}

// ── SORT & SIZE ──────────────────────────────────────────────────
let currentSort = 'default';
let currentSize = localStorage.getItem('zeno-card-size') || 'md';
function setSort(s) {
  currentSort = s;
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
document.addEventListener('click', () => document.querySelectorAll('.status-picker').forEach(p => p.classList.remove('open')));
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
// init bg
(function(){const t=localStorage.getItem(BG_KEY)||'none'; setBg(t);})();

// ── SW ───────────────────────────────────────────────────────────
let swReady = false;
async function initSW() {
  if (!('serviceWorker' in navigator)) { setSWState('error'); return; }
  try {
    await navigator.serviceWorker.register('./zeno-game-sw.js', { scope: './' });
    await navigator.serviceWorker.ready;
    swReady = true; setSWState('ready');
  } catch(e) { console.error(e); setSWState('error'); showToast('SW FAILED — use HTTP server', true); }
}
function setSWState(s) {
  const d = document.getElementById('swDot');
  d.className = 'sw-dot' + (s==='ready'?' ready':s==='error'?' error':'');
}
function getSW() { return navigator.serviceWorker?.controller || null; }
function postSW(msg, xfer=[]) {
  return new Promise((res, rej) => {
    const sw = getSW(); if (!sw) { rej(new Error('no controller')); return; }
    const ch = new MessageChannel(); ch.port1.onmessage = e => res(e.data);
    sw.postMessage(msg, [ch.port2, ...xfer]);
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
  document.getElementById('settingsModal').classList.add('open');
}
function closeSettingsModal() { document.getElementById('settingsModal').classList.remove('open'); }
document.getElementById('settingsModal').addEventListener('click', e => { if(e.target===document.getElementById('settingsModal')) closeSettingsModal(); });
function savePtGoalDefault() {
  localStorage.setItem('zeno-ptgoal-default', document.getElementById('ptgoalDefaultSelect').value);
}

// ── ADD MODAL ────────────────────────────────────────────────────
let pendingFolders = [];
function openAddModal(tab = 'folders') {
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab===tab));
  document.querySelectorAll('.modal-pane').forEach(p => p.classList.toggle('active', p.id==='pane-'+tab));
  if (tab==='zenoapps') buildZasGrid();
  document.getElementById('addModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAddModal() { document.getElementById('addModal').classList.remove('open'); document.body.style.overflow = ''; }
document.getElementById('addModal').addEventListener('click', e => { if(e.target===document.getElementById('addModal')) closeAddModal(); });
document.getElementById('addModalTabs').addEventListener('click', e => {
  const tab = e.target.closest('.modal-tab'); if (!tab) return;
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.modal-pane').forEach(p => p.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById('pane-'+tab.dataset.tab).classList.add('active');
  if (tab.dataset.tab==='zenoapps') buildZasGrid();
});

// ── FOLDER DROP ──────────────────────────────────────────────────
function handleFolderInput(fileList, fromMainDrop=false) {
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
    setProgress(Math.round((i/files.length)*80),`${folderName}: ${i+1}/${files.length}`);
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
  dz.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();dz.classList.add('dragover');});
  dz.addEventListener('dragleave',()=>dz.classList.remove('dragover'));
  dz.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();dz.classList.remove('dragover');const files=[...e.dataTransfer.files].filter(f=>f.name.endsWith('.zenopack'));if(files.length) importZenopackFiles(files);else{document.getElementById('zenopackStatus').textContent='DROP .ZENOPACK FILES';document.getElementById('zenopackStatus').className='status-line err';}});
})();

// ── RECENTLY PLAYED ROW ──────────────────────────────────────────
function renderRecentRow() {
  const meta = loadMeta();
  const recent = games
    .map(g => ({ game:g, lp:(meta[g.id]||{}).lastPlayed||0 }))
    .filter(x => x.lp > 0)
    .sort((a,b) => b.lp - a.lp)
    .slice(0,8);
  const row = document.getElementById('recentRow');
  const strip = document.getElementById('recentStrip');
  if (!recent.length) { row.style.display='none'; return; }
  row.style.display = 'block';
  strip.innerHTML = recent.map(({game:g, lp}) => `
    <div class="recent-chip" onclick="openGameModal(games.find(x=>x.id==='${g.id}'))">
      <div class="recent-chip-icon">${gameIconHtml(g.icon)}</div>
      <div class="recent-chip-name">${esc(g.name)}</div>
      <div class="recent-chip-time">${formatLastPlayed(lp)}</div>
    </div>`).join('');
}

// ── GRID ─────────────────────────────────────────────────────────
function renderGrid() {
  const grid=document.getElementById('gameGrid'),empty=document.getElementById('emptyState'),noRes=document.getElementById('noResults'),fb=document.getElementById('filterBar');
  if(!games.length){empty.style.display='flex';grid.style.display='none';fb.style.display='none';document.getElementById('gameCount').textContent='';document.getElementById('recentRow').style.display='none';return;}
  empty.style.display='none';grid.style.display='grid';fb.style.display='flex';
  grid.className='game-grid size-'+currentSize;
  document.querySelectorAll('.size-btn').forEach(b=>b.classList.toggle('active',b.dataset.size===currentSize));
  grid.querySelectorAll('.game-card,.add-card').forEach(el=>el.remove());
  const q=document.getElementById('searchInput').value.toLowerCase().trim();
  let filtered=q?games.filter(g=>g.name.toLowerCase().includes(q)):[...games];
  // collection filter
  if(activeCollFilter) filtered=filtered.filter(g=>(getGameMeta(g.id).collections||[]).includes(activeCollFilter));
  const meta=loadMeta();
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
    const statusLabels={playing:'PLAYING',completed:'DONE',backlog:'BACKLOG',dropped:'DROPPED'};
    const statusBadge=status?`<span class="game-status-badge ${status}">${statusLabels[status]||status}</span>`:'';
    const stars=[1,2,3,4,5].map(n=>`<span class="s${n<=rating?' lit':''}">★</span>`).join('');
    const card=document.createElement('div');card.className='game-card';card.style.animationDelay=(i*.018)+'s';
    card.innerHTML=`
      ${imgSrcTag(banner,'game-card-banner visible')}
      <button class="game-fav-btn${isFav?' active':''}" onclick="toggleFavorite(event,'${g.id}')" title="${isFav?'Unfavorite':'Favorite'}"><i class="fa-${isFav?'solid':'regular'} fa-star"></i></button>
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
      <div class="game-name">${esc(g.name)}</div>
      <div class="game-meta">
        ${statusBadge}
        ${rating>0?`<div class="game-stars">${stars}</div>`:''}
        ${lastPlayed?`<div class="game-last-played">${lastPlayed}</div>`:''}
        ${playtime?`<div class="game-playtime">${playtime}</div>`:''}
      </div>`;
    card.addEventListener('click',()=>openGameModal(g));
    grid.insertBefore(card,noRes);
  });
  const add=document.createElement('div');add.className='add-card';
  add.innerHTML='<i class="fa-solid fa-plus"></i><span>ADD GAMES</span>';
  add.addEventListener('click',()=>openAddModal('folders'));
  grid.insertBefore(add,noRes);
  noRes.style.display=filtered.length===0?'block':'none';
  document.getElementById('gameCount').textContent=games.length+' GAME'+(games.length!==1?'S':'');
  renderRecentRow();
  renderCollFilterBtns();
}
function filterGames(){renderGrid();}
function removeGame(e,id){
  e.stopPropagation();
  const sw=getSW();if(sw) sw.postMessage({type:'UNREGISTER_GAME',payload:{gameId:id}});
  games.splice(0,games.length,...games.filter(g=>g.id!==id));
  deleteGameFromDB(id).catch(console.error);
  renderGrid();showToast('GAME REMOVED');window._fbDeleteGame?.(id);
}

// ── RANDOM GAME ──────────────────────────────────────────────────
function launchRandomGame() {
  if (!games.length) { showToast('NO GAMES TO LAUNCH', true); return; }
  const g = games[Math.floor(Math.random()*games.length)];
  openGameModal(g);
  showToast('🎲 ' + g.name.toUpperCase());
}

// ── GAME INFO SIDEBAR ────────────────────────────────────────────
let sidebarGameId = null;
function openSidebar(e, id) {
  e.stopPropagation();
  sidebarGameId = id;
  const game = games.find(g=>g.id===id);
  if (!game) return;
  const gm = getGameMeta(id);
  // header
  document.getElementById('sidebarIcon').innerHTML = gameIconHtml(game.icon);
  document.getElementById('sidebarTitle').textContent = game.name;
  // body
  const colls = loadCollections();
  const gameCols = gm.collections || [];
  const playtime = gm.playtime||0;
  const sessions = gm.sessions||0;
  const rating = gm.rating||0;
  const stars = [1,2,3,4,5].map(n=>`<button class="star-btn${n<=rating?' active':''}" onclick="setSidebarRating(${n})">${n<=rating?'★':'☆'}</button>`).join('');
  const statusMap = {playing:'PLAYING',completed:'DONE',backlog:'BACKLOG',dropped:'DROPPED'};
  const statusBtns = ['playing','completed','backlog','dropped'].map(s=>`<button class="sidebar-status-btn${gm.status===s?' active-'+s:''}" onclick="setSidebarStatus('${s}')">${statusMap[s]}</button>`).join('');
  const collPills = colls.map(c=>`<div class="sidebar-coll-pill${gameCols.includes(c.id)?' active':''}" onclick="toggleSidebarColl('${c.id}')">${c.emoji} ${esc(c.name)}</div>`).join('');
  document.getElementById('sidebarBody').innerHTML = `
    <div>
      <div class="sidebar-section-title">STATS</div>
      <div class="sidebar-stat-grid">
        <div class="sidebar-stat"><div class="sidebar-stat-label">PLAYTIME</div><div class="sidebar-stat-val green">${formatTime(playtime)||'—'}</div></div>
        <div class="sidebar-stat"><div class="sidebar-stat-label">LAST PLAYED</div><div class="sidebar-stat-val">${formatLastPlayed(gm.lastPlayed)||'Never'}</div></div>
        <div class="sidebar-stat"><div class="sidebar-stat-label">STATUS</div><div class="sidebar-stat-val cyan">${gm.status?statusMap[gm.status]:'—'}</div></div>
        <div class="sidebar-stat"><div class="sidebar-stat-label">FILES</div><div class="sidebar-stat-val">${game.fileCount||'—'}</div></div>
      </div>
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
        ${imgSrcTag(gm.banner,'banner-preview','style="display:block"')}
        <div class="banner-upload-label">${gm.banner?'Click to change banner':'Upload a banner image'}</div>
      </div>
    </div>
    <div>
      <div class="sidebar-section-title">NOTES</div>
      <textarea class="sidebar-notes-input" id="sidebarNotes" placeholder="Your thoughts on this game...">${esc(gm.notes||'')}</textarea>
      <button class="sidebar-save-btn" onclick="saveSidebarNotes()">SAVE NOTES</button>
    </div>
    <div>
      <button class="sidebar-screenshot-btn" onclick="openGameAndScreenshot('${id}')"><i class="fa-solid fa-camera"></i> OPEN & SCREENSHOT</button>
    </div>`;
  document.getElementById('sidebarOverlay').classList.add('open');
  document.getElementById('sidebar').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebarOverlay').classList.remove('open');
  document.getElementById('sidebar').classList.remove('open');
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
    // try html2canvas-style capture via foreignObject
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
  const def = parseInt(localStorage.getItem('zeno-ptgoal-default')||'0');
  const mins = def || parseInt(prompt('Set session goal (minutes):', '30')||'0');
  if (!mins || isNaN(mins) || mins<=0) return;
  startPtGoal(mins);
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
  klFiltered = q ? games.filter(g=>g.name.toLowerCase().includes(q)) : [...games].slice(0,12);
  klIndex = -1;
  const el = document.getElementById('klResults');
  if (!klFiltered.length) { el.innerHTML='<div class="kl-empty">NO GAMES FOUND</div>'; return; }
  el.innerHTML = klFiltered.map((g,i)=>`
    <div class="kl-item" id="kl-${i}" onclick="klLaunch(${i})">
      <div class="kl-item-icon">${gameIconHtml(g.icon)}</div>
      <div class="kl-item-name">${esc(g.name)}</div>
      <div class="kl-item-meta">${formatLastPlayed((loadMeta()[g.id]||{}).lastPlayed)||''}</div>
    </div>`).join('');
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
async function openGameModal(g) {
  const frame=document.getElementById('gameModalFrame');
  document.getElementById('gameModalTitle').textContent=g.name;
  document.getElementById('gameModalIcon').innerHTML=gameIconHtml(g.icon);
  document.getElementById('gameModalLoading').classList.remove('hidden');
  document.getElementById('gameModal').classList.add('open');
  document.body.style.overflow='hidden';
  setGameMeta(g.id,{lastPlayed:Date.now()});
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
  // auto start playtime goal if default set
  const def=parseInt(localStorage.getItem('zeno-ptgoal-default')||'0');
  if(def>0) startPtGoal(def);
}
function closeGameModal() {
  if(_gameSessionStart&&_gameSessionId){
    const elapsed=Date.now()-_gameSessionStart;
    const cur=getGameMeta(_gameSessionId).playtime||0;
    setGameMeta(_gameSessionId,{playtime:cur+elapsed});
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

// ── CONSOLE ──────────────────────────────────────────────────────
let consoleErrors=[],consoleOpen=false;
function toggleConsole(){consoleOpen=!consoleOpen;document.getElementById('consoleOverlay').classList.toggle('open',consoleOpen);if(consoleOpen){const b=document.getElementById('consoleBody');b.scrollTop=b.scrollHeight;}}
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
  if(consoleOpen) body.scrollTop=body.scrollHeight;
  if(type==='error'&&!consoleOpen) toggleConsole();
}
(function(){['log','warn','error'].forEach(fn=>{const orig=console[fn].bind(console);console[fn]=function(){const args=Array.prototype.slice.call(arguments);if(document.getElementById('gameModal').classList.contains('open')) consoleLog(fn,args.map(a=>typeof a==='object'?JSON.stringify(a):String(a)).join(' '),'',0,0,false);orig.apply(console,args);};});})();
window.addEventListener('error',e=>{if(!document.getElementById('gameModal').classList.contains('open')) return;consoleLog('error',e.message,e.filename,e.lineno,e.colno,false);},true);
window.addEventListener('unhandledrejection',e=>{if(!document.getElementById('gameModal').classList.contains('open')) return;consoleLog('error','Promise rejection: '+(e.reason?.message||String(e.reason)),'',0,0,false);});
window.addEventListener('message',e=>{if(!e.data?.__zenoConsole) return;consoleLog(e.data.level||'log',e.data.msg,e.data.src,e.data.lineno,e.data.colno,true);});
document.getElementById('gameModalFrame').addEventListener('load',function(){
  clearConsole();
  const src=this.src;if(!src||src==='about:blank'||src===window.location.href) return;
  try{const iwin=this.contentWindow;if(!iwin) return;const script=iwin.document.createElement('script');script.textContent='(function(){function send(l,m,s,ln,c){parent.postMessage({__zenoConsole:true,level:l,msg:m,src:s||"",lineno:ln||0,colno:c||0},"*");}window.addEventListener("error",function(e){send("error",e.message,e.filename,e.lineno,e.colno);},true);window.addEventListener("unhandledrejection",function(e){send("error","Promise: "+(e.reason&&e.reason.message?e.reason.message:String(e.reason)),"",0,0);});["log","warn","error"].forEach(function(fn){var orig=console[fn].bind(console);console[fn]=function(){var args=Array.prototype.slice.call(arguments);send(fn,args.map(function(a){return typeof a==="object"?JSON.stringify(a):String(a);}).join(" "),"",0,0);orig.apply(console,args);};});})();';iwin.document.head.appendChild(script);}catch(err){}
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

// ── TOAST ─────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg,err=false){const t=document.getElementById('toast');t.textContent=msg;t.className='toast'+(err?' error':'');void t.offsetWidth;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3000);}
window.showToast=showToast;

// ── GIT IMPORT ────────────────────────────────────────────────────
let ghFoundGames=[],ghCurrentCfg=null,ghCurrentBranch=null;
function parseRepoUrl(raw){raw=raw.trim().replace(/\/+$/,'').replace(/\.git$/,'');const m=raw.match(/(?:https?:\/\/)?([^/\s]+\.[^/\s]+)\/([^/\s]+)\/([^/\s]+)/);if(m){const host=m[1],owner=m[2],repo=m[3];return{type:host==='github.com'?'github':host.includes('gitlab')?'gitlab':'forgejo',host,owner,repo};}const m2=raw.match(/^([^/\s]+)\/([^/\s]+)$/);if(m2) return{type:'forgejo',host:'git.gay',owner:m2[1],repo:m2[2]};return null;}
async function gitApiFetch(url,type){const headers=type==='github'?{'Accept':'application/vnd.github.v3+json'}:{};const res=await fetch(url,{headers});if(res.status===403) throw new Error('RATE LIMITED');if(res.status===404) throw new Error('REPO NOT FOUND');if(!res.ok) throw new Error(`API ERROR ${res.status}`);return res.json();}
async function getDefaultBranch(cfg){if(cfg.type==='github'){const d=await gitApiFetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`,'github');return d.default_branch||'main';}if(cfg.type==='gitlab'){const d=await gitApiFetch(`https://${cfg.host}/api/v4/projects/${encodeURIComponent(cfg.owner+'/'+cfg.repo)}`,'gitlab');return d.default_branch||'main';}const d=await gitApiFetch(`https://${cfg.host}/api/v1/repos/${cfg.owner}/${cfg.repo}`,'forgejo');return d.default_branch||'main';}
async function getRepoTree(cfg,branch){if(cfg.type==='github'){const d=await gitApiFetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/trees/${branch}?recursive=1`,'github');return(d.tree||[]).map(f=>({path:f.path,type:f.type==='blob'?'blob':'tree'}));}if(cfg.type==='gitlab'){const pid=encodeURIComponent(cfg.owner+'/'+cfg.repo);let page=1,items=[];while(true){const d=await gitApiFetch(`https://${cfg.host}/api/v4/projects/${pid}/repository/tree?recursive=true&per_page=100&page=${page}`,'gitlab');if(!Array.isArray(d)||!d.length) break;items=items.concat(d);if(d.length<100) break;page++;}return items.map(f=>({path:f.path,type:f.type==='blob'?'blob':'tree'}));}const d=await gitApiFetch(`https://${cfg.host}/api/v1/repos/${cfg.owner}/${cfg.repo}/git/trees/${branch}?recursive=true`,'forgejo');return(d.tree||[]).map(f=>({path:f.path,type:f.type}));}
function getRawUrl(cfg,branch,filePath){if(cfg.type==='github') return`https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${branch}/${filePath}`;if(cfg.type==='gitlab') return`https://${cfg.host}/api/v4/projects/${encodeURIComponent(cfg.owner+'/'+cfg.repo)}/repository/files/${encodeURIComponent(filePath)}/raw?ref=${branch}`;return`https://${cfg.host}/${cfg.owner}/${cfg.repo}/raw/branch/${branch}/${filePath}`;}
async function gitFetchFile(url,cfg,branch,filePath){try{const res=await fetch(url);if(res.ok) return res;}catch(e){}if(cfg?.type==='forgejo'){try{const apiUrl=`https://${cfg.host}/api/v1/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}?ref=${branch}`;const res=await fetch(apiUrl);if(res.ok){const json=await res.json();if(json.content){const binary=atob(json.content.replace(/\n/g,''));const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);return new Response(bytes.buffer,{status:200});}}}catch(e){}}return null;}
async function ghScan(){const raw=document.getElementById('ghUrlInput').value;const cfg=parseRepoUrl(raw);if(!cfg){setGHStatus('INVALID URL','err');return;}const btn=document.getElementById('ghScanBtn');btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>';setGHStatus(`SCANNING ${cfg.owner}/${cfg.repo}...`);document.getElementById('ghGameList').style.display='none';document.getElementById('ghActions').style.display='none';ghFoundGames=[];ghCurrentCfg=cfg;try{const branch=await getDefaultBranch(cfg);ghCurrentBranch=branch;const tree=await getRepoTree(cfg,branch);const folderMap={};for(const item of tree){if(item.type!=='blob') continue;const parts=item.path.split('/');if(parts.length===2&&parts[1].toLowerCase()==='index.html') folderMap[parts[0]]=[];}if(tree.some(f=>f.path==='index.html')) folderMap['[root]']=[];if(!Object.keys(folderMap).length){setGHStatus('NO GAME FOLDERS FOUND','err');btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-magnifying-glass"></i>&nbsp; SCAN';return;}for(const item of tree){if(item.type!=='blob') continue;const parts=item.path.split('/');if(parts.length===1&&'[root]' in folderMap) folderMap['[root]'].push({path:item.path,url:getRawUrl(cfg,branch,item.path)});else if(parts.length>=2&&parts[0] in folderMap) folderMap[parts[0]].push({path:parts.slice(1).join('/'),url:getRawUrl(cfg,branch,item.path)});}ghFoundGames=Object.entries(folderMap).map(([name,files])=>({name,files,selected:false}));setGHStatus(`${ghFoundGames.length} GAME${ghFoundGames.length!==1?'S':''} FOUND`,'ok');renderGHList();}catch(e){setGHStatus(e.message||'SCAN FAILED','err');}btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-magnifying-glass"></i>&nbsp; SCAN';}
function setGHStatus(msg,cls=''){const el=document.getElementById('ghStatus');el.textContent=msg;el.className='status-line'+(cls?' '+cls:'');}
function renderGHList(){const list=document.getElementById('ghGameList');list.innerHTML='';list.style.display='grid';for(let i=0;i<ghFoundGames.length;i++){const g=ghFoundGames[i];const item=document.createElement('div');item.className='gh-item'+(g.selected?' selected':'');item.innerHTML=`<div class="gh-check">${g.selected?'<i class="fa-solid fa-check"></i>':''}</div><div class="gh-name">${esc(g.name==='[root]'?'Root':g.name)}</div><div class="gh-count">${g.files.length}F</div>`;item.addEventListener('click',()=>{ghFoundGames[i].selected=!ghFoundGames[i].selected;renderGHList();});list.appendChild(item);}document.getElementById('ghActions').style.display='flex';const sel=ghFoundGames.filter(g=>g.selected).length;document.getElementById('ghLoadBtn').disabled=sel===0;document.getElementById('ghLoadBtn').innerHTML=sel>0?`<i class="fa-solid fa-bolt"></i>&nbsp; LOAD ${sel}`:'<i class="fa-solid fa-bolt"></i>&nbsp; LOAD SELECTED';document.getElementById('ghSelectAll').textContent=ghFoundGames.every(g=>g.selected)?'DESELECT ALL':'SELECT ALL';}
function ghToggleAll(){const all=ghFoundGames.every(g=>g.selected);ghFoundGames.forEach(g=>g.selected=!all);renderGHList();}
async function ghLoadSelected(){const toLoad=ghFoundGames.filter(g=>g.selected);if(!toLoad.length) return;if(!swReady){await initSW();if(!swReady) return;}if(!getSW()){showToast('ACTIVATING SW — reloading...');setTimeout(()=>location.reload(),1200);return;}closeAddModal();buildPips(toLoad.length);showProgress(true,`Downloading ${toLoad.length} game${toLoad.length!==1?'s':''}...`);let added=0;for(let i=0;i<toLoad.length;i++){const g=toLoad[i];const displayName=g.name==='[root]'?(ghCurrentCfg?.repo||'Game'):g.name;setPip(i,'active');showProgress(true,`Downloading: ${displayName} (${i+1}/${toLoad.length})`);const ok=await ghDownloadAndLoad(displayName,g.files,i,toLoad.length);setPip(i,ok?'done':'fail');if(ok) added++;}showProgress(false);if(added>0){showToast(`+${added} GAME${added>1?'S':''} ADDED`);renderGrid();}else showToast('NO GAMES LOADED',true);}
async function ghDownloadAndLoad(name,fileList,gameIdx,total){const id='g'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);const iconNames=new Set(['favicon.ico','favicon.png','icon.png','logo.png','thumbnail.png','cover.png','icon.jpg']);const fileRecords=[];let iconUrl=null;for(let i=0;i<fileList.length;i++){const f=fileList[i];setProgress(Math.round((i/fileList.length)*80),`${name}: ${i+1}/${fileList.length}`);try{const repoPath=name==='[root]'?f.path:`${name}/${f.path}`;const res=await gitFetchFile(f.url,ghCurrentCfg,ghCurrentBranch,repoPath);if(!res) continue;const buf=await res.arrayBuffer();const mime=getMime(f.path.split('/').pop());const fileName=f.path.split('/').pop();const file=new File([buf],fileName,{type:mime});Object.defineProperty(file,'webkitRelativePath',{value:name+'/'+f.path,writable:false,configurable:true});fileRecords.push({file,path:f.path,mimeType:mime});if(!iconUrl&&iconNames.has(fileName.toLowerCase())) iconUrl=await blobToDataUrl(new Blob([buf],{type:mime}));}catch(e){}}if(!fileRecords.some(r=>r.path.split('/').pop().toLowerCase()==='index.html')){showToast(`FAILED: ${name}`,true);return false;}setProgress(88,`${name}: registering...`);const ok=await registerGameWithSW(id,fileRecords);if(!ok) return false;setProgress(100,`${name}: ready!`);await sleep(150);const gameEntry={id,name,icon:iconUrl,entryPath:`./zeno-games/${id}/index.html`,fileCount:fileRecords.length,fileRecords};games.push(gameEntry);saveGameToDB(gameEntry).catch(console.error);return true;}

// ── R2 IMPORT ────────────────────────────────────────────────────
const R2_BASE_KEY='zeno-r2-base';let r2Queue=[];
document.getElementById('r2BaseInput').value=localStorage.getItem(R2_BASE_KEY)||'';
function r2ParseLink(raw){raw=raw.trim().replace(/\/+$/,'');const baseRaw=document.getElementById('r2BaseInput').value.trim().replace(/\/+$/,'');if(baseRaw) localStorage.setItem(R2_BASE_KEY,baseRaw);if(raw.startsWith('http')){try{const u=new URL(raw);const parts=u.pathname.split('/').filter(Boolean);const idxPos=parts.findIndex(p=>p.toLowerCase()==='index.html');const name=idxPos>0?parts[idxPos-1]:parts[parts.length-1];return{name,indexUrl:raw.endsWith('index.html')?raw:raw.replace(/\/?$/,'/index.html')};}catch(e){return null;}}if(!baseRaw) return{error:'PASTE A BASE URL FIRST'};return{name:raw,indexUrl:`${baseRaw}/${raw}/index.html`};}
function r2AddLink(){const raw=document.getElementById('r2LinkInput').value;if(!raw.trim()) return;const parsed=r2ParseLink(raw);if(!parsed){setR2Status('INVALID LINK','err');return;}if(parsed.error){setR2Status(parsed.error,'err');return;}if(r2Queue.some(g=>g.name===parsed.name)){setR2Status(`"${parsed.name}" ALREADY QUEUED`,'err');return;}r2Queue.push(parsed);document.getElementById('r2LinkInput').value='';setR2Status('');renderR2Queue();}
function r2RemoveItem(i){r2Queue.splice(i,1);renderR2Queue();}
function renderR2Queue(){const el=document.getElementById('r2Queue');if(!r2Queue.length){el.innerHTML='';document.getElementById('r2Actions').style.display='none';return;}el.innerHTML=r2Queue.map((g,i)=>`<div class="r2-item"><i class="fa-solid fa-cloud" style="color:#f6821f;font-size:12px;flex-shrink:0"></i><div style="flex:1;min-width:0"><div class="r2-item-name">${esc(g.name)}</div><div class="r2-item-url">${esc(g.indexUrl)}</div></div><button class="r2-remove" onclick="r2RemoveItem(${i})"><i class="fa-solid fa-xmark"></i></button></div>`).join('');document.getElementById('r2Actions').style.display='flex';document.getElementById('r2LoadBtn').innerHTML=`<i class="fa-solid fa-bolt"></i>&nbsp; LOAD ${r2Queue.length} GAME${r2Queue.length!==1?'S':''}`;}
function setR2Status(msg,cls=''){const el=document.getElementById('r2Status');el.textContent=msg;el.className='status-line'+(cls?' '+cls:'');}
function r2LoadAll(){if(!r2Queue.length) return;const toLoad=[...r2Queue];closeAddModal();let added=0;for(const g of toLoad){const id='g'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);const gameEntry={id,name:g.name,icon:null,entryPath:g.indexUrl,fileCount:0,fileRecords:[],r2:true};games.push(gameEntry);saveR2GameToDB(gameEntry).catch(console.error);added++;}if(added>0){showToast(`+${added} GAME${added>1?'S':''} ADDED`);renderGrid();}}
async function saveR2GameToDB(game){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE_META,'readwrite');tx.oncomplete=()=>res();tx.onerror=e=>rej(e.target.error);tx.objectStore(STORE_META).put({id:game.id,name:game.name,icon:game.icon,entryPath:game.entryPath,fileCount:0,r2:true});});}

// ── ZENOAPPS GRID ─────────────────────────────────────────────────
const ICON_MAP={'10-minutes-till-dawn':'🌙','2048-cupcakes':'🧁','99-balls':'🎱','a-small-world-cup':'⚽','achievement-unlocked':'🏆','animal-crossing-wild-world':'🍃','aqua-park-io':'💧','backrooms-2d':'😨','backrooms-3d':'😨','bacon-may-die':'🥓','bad-icecream':'🍦','bad-icecream-2':'🍦','bad-icecream-3':'🍦','bad-parenting':'👶','bad-piggies':'🐷','baldis-basics':'📏','ball-maze':'⚽','basket-random':'🏀','basketball-legends':'🏀','basketball-stars':'🏀','battle-karts':'🏎️','big-flappy-tower-tiny-square':'🐦','big-ice-tower-tiny-square':'🧊','big-neon-tower-tiny-square':'🟩','big-tower-tiny-square-2':'🟦','block-blast':'💥','block-blast-2':'💥','blood-money':'💰','bloxorz':'📦','brawl-stars':'⭐','buckshot-roulette':'🎲','burrito-bison-launch-alibre':'🌯','celeste':'🍓','celeste-2':'🍓','cluster-rush':'🚛','cookie-clicker':'🍪','core-ball':'🔵','crazy-cars':'🚗','crazy-cattle-3d':'🐄','crossy-road':'🐔','deltarune':'💎','drift-boss':'🚗','drive-mad':'🚙','duck-life':'🦆','duck-life-2':'🦆','duck-life-3':'🦆','eggy-car':'🥚','fire-boy-and-water-girl':'🔥','flappy-bird':'🐦','fnaf':'🐻','fnaf-2':'🐻','fnaf-3':'🐻','fnaw':'🐭','free-rider':'🚲','funny-shooter-2':'🔫','geometry-dash-3d':'📐','granny':'👴','grow-a-garden':'🌱','gta-2':'🏙️','happy-wheels':'☠️','hextris':'🔷','learn-to-fly':'🐧','learn-to-fly-2':'🐧','learn-to-fly-3':'🐧','minecraft-1.5.2':'⛏️','minecraft-indev':'⛏️','minecraft-parkour':'⛏️','minecraft-tower-defence':'⛏️','minecraft-zeta-client':'⛏️','motox3m':'🏍️','motox3m-2':'🏍️','motox3m-3':'🏍️','motox3m-spookyland':'🏍️','motox3m-winter':'🏍️','plants-vs-zombies':'🌻','retro-bowl':'🏈','short-life':'💀','slither-io':'🐍','slope-3':'🏔️','slow-roads':'🛣️','snow-rider-3d':'🛷','soccer-random':'⚽','subway-surfers':'🛹','super-hot':'🔴','the-binding-of-isaac':'😢','the-legend-of-zelda-the-minish-cap':'🗡️','the-worlds-hardest-game':'😤','tiny-fishing':'🎣','ultrakill':'⚡','vex':'🏃','vex-2':'🏃','vex-3':'🏃','vex-6':'🏃','vex-7':'🏃','vex-8':'🏃','volly-random':'🏐','word-wonders':'📝','wordle':'🔤','yohoho-io':'🏴','you-vs-100-skibidi-toilets':'🚽','zombocalypse-2':'🧟'};
const DESC_MAP={'10-minutes-till-dawn':'Survive waves of enemies for 10 minutes','2048-cupcakes':'Sweet twist on 2048 with cupcake tiles','99-balls':'Break bricks with bouncing balls','a-small-world-cup':'Fast-paced ragdoll soccer','achievement-unlocked':'Collect every achievement in this meta-platformer','animal-crossing-wild-world':'Classic life sim on a peaceful island','aqua-park-io':'Slide down waterslides and race to the bottom','backrooms-2d':'Explore the eerie infinite backrooms in 2D','backrooms-3d':'First-person horror exploration of the backrooms','bacon-may-die':'Beat up enemies as a bacon-wielding warrior','bad-icecream':'Freeze enemies and collect fruit in icy mazes','bad-icecream-2':'More icy puzzle action','bad-icecream-3':'The third chilly chapter','bad-parenting':'Hilarious physics parenting gone wrong','bad-piggies':'Build contraptions to help the pigs','baldis-basics':'Survive the school of Baldi\'s wrath','ball-maze':'Tilt and roll your ball through mazes','basket-random':'Wacky two-button basketball','basketball-legends':'Play as legendary stars in 1v1 matches','basketball-stars':'Street basketball with trick shots','battle-karts':'Mario Kart-style racing with weapons','big-flappy-tower-tiny-square':'Flap through a massive tower','big-ice-tower-tiny-square':'Climb a giant ice tower','big-neon-tower-tiny-square':'Neon-lit tower climbing','big-tower-tiny-square-2':'Sequel to the beloved tiny square tower','block-blast':'Blast and clear blocks in this puzzle','block-blast-2':'More explosive block-clearing action','blood-money':'Action-packed heist experience','bloxorz':'Roll a block to the goal without falling','brawl-stars':'Fast-paced multiplayer brawler','buckshot-roulette':'Intense game of chance with a shotgun twist','burrito-bison-launch-alibre':'Launch a wrestler into candy land','celeste':'Precision platformer about climbing a mountain','celeste-2':'More challenging precision platforming','cluster-rush':'Jump between speeding trucks','cookie-clicker':'Click cookies and build a cookie empire','core-ball':'Attach balls to a spinning core','crazy-cars':'High-speed racing with crazy physics','crazy-cattle-3d':'Chaotic 3D cattle physics battle royale','crossy-road':'Hop across roads without getting squashed','deltarune':'RPG adventure from the creator of Undertale','drift-boss':'Master drifting around endless curves','drive-mad':'Navigate impossible obstacle courses','duck-life':'Train your duck to become a racing champion','duck-life-2':'More duck training adventures','duck-life-3':'The third chapter of duck training','eggy-car':'Balance an egg on a car over bumpy terrain','fire-boy-and-water-girl':'Cooperative elemental puzzle platformer','flappy-bird':'Tap to keep your bird flying through pipes','fnaf':'Survive the night at a haunted pizza place','fnaf-2':'The terrifying sequel','fnaf-3':'The third night of animatronic horror','fnaw':'Five Nights at Wario\'s fan-made horror','free-rider':'Draw your own tracks and ride them','funny-shooter-2':'Hilarious FPS with absurd enemies','geometry-dash-3d':'Rhythm-based obstacle course in 3D','granny':'Escape from Granny\'s house','grow-a-garden':'Cultivate and expand your dream garden','gta-2':'Top-down crime sandbox classic','happy-wheels':'Brutal ragdoll physics obstacle courses','hextris':'Fast-paced hexagonal Tetris','learn-to-fly':'Train a penguin to fly','learn-to-fly-2':'More penguin flight training','learn-to-fly-3':'Ultimate penguin flight evolution','minecraft-1.5.2':'Classic Minecraft 1.5.2 in browser','minecraft-indev':'Play the original indev Minecraft','minecraft-parkour':'Test your Minecraft parkour skills','minecraft-tower-defence':'Defend your base in MC Tower Defence','minecraft-zeta-client':'Minecraft Zeta browser edition','motox3m':'Stunt motorcycle racing','motox3m-2':'More insane moto stunt tracks','motox3m-3':'Third chapter of moto stunt madness','motox3m-spookyland':'Halloween themed moto racing','motox3m-winter':'Winter wonderland moto racing','plants-vs-zombies':'Defend your garden from zombie hordes','retro-bowl':'American football management sim','short-life':'Ragdoll platformer with deadly obstacles','slither-io':'Grow your snake by eating others','slope-3':'Race a ball down an endless neon slope','slow-roads':'Relaxing endless driving','snow-rider-3d':'Sled down snowy slopes','soccer-random':'Wacky two-button soccer','subway-surfers':'Run from the inspector across subway tracks','super-hot':'Time moves only when you move','the-binding-of-isaac':'Roguelike dungeon crawler','the-legend-of-zelda-the-minish-cap':'Classic GBA Zelda adventure','the-worlds-hardest-game':'Navigate brutally difficult maze levels','tiny-fishing':'Cast your line and reel in rare fish','ultrakill':'Ultra-fast retro FPS','vex':'Stickman parkour through deadly stages','vex-2':'More intense stickman challenges','vex-3':'Third chapter of Vex parkour','vex-6':'Vex series chapter six','vex-7':'Vex series chapter seven','vex-8':'Latest chapter in the Vex series','volly-random':'Wacky volleyball with random physics','word-wonders':'A world built entirely from words','wordle':'Guess the five-letter word in six tries','yohoho-io':'Battle royale on a pirate island','you-vs-100-skibidi-toilets':'Survive waves of skibidi toilets','zombocalypse-2':'Survive endless zombie hordes'};
const ZAS_GAMES=['10-minutes-till-dawn','2048-cupcakes','9007199254740992','99-balls','a-small-world-cup','achievement-unlocked','animal-crossing-wild-world','aqua-park-io','backrooms-2d','backrooms-3d','bacon-may-die','bad-icecream','bad-icecream-2','bad-icecream-3','bad-parenting','bad-piggies','baldis-basics','ball-maze','basket-random','basketball-legends','basketball-stars','battle-karts','big-flappy-tower-tiny-square','big-ice-tower-tiny-square','big-neon-tower-tiny-square','big-tower-tiny-square-2','block-blast','block-blast-2','blood-money','bloxorz','brawl-stars','buckshot-roulette','burrito-bison-launch-alibre','celeste','celeste-2','cluster-rush','cookie-clicker','core-ball','crazy-cars','crazy-cattle-3d','crossy-road','deltarune','drift-boss','drive-mad','duck-life','duck-life-2','duck-life-3','eggy-car','fire-boy-and-water-girl','flappy-bird','fnaf','fnaf-2','fnaf-3','fnaw','free-rider','funny-shooter-2','geometry-dash-3d','granny','grow-a-garden','gta-2','happy-wheels','hextris','learn-to-fly','learn-to-fly-2','learn-to-fly-3','minecraft-1.5.2','minecraft-indev','minecraft-parkour','minecraft-tower-defence','minecraft-zeta-client','motox3m','motox3m-2','motox3m-3','motox3m-spookyland','motox3m-winter','plants-vs-zombies','retro-bowl','short-life','slither-io','slope-3','slow-roads','snow-rider-3d','soccer-random','subway-surfers','super-hot','the-binding-of-isaac','the-legend-of-zelda-the-minish-cap','the-worlds-hardest-game','tiny-fishing','ultrakill','vex','vex-2','vex-3','vex-6','vex-7','vex-8','volly-random','word-wonders','wordle','yohoho-io','you-vs-100-skibidi-toilets','zombocalypse-2'];
let zasBuilt=false;
function fmt(s){return s.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
function buildZasGrid(){if(zasBuilt){refreshZasButtons();return;}zasBuilt=true;const grid=document.getElementById('zasGrid');ZAS_GAMES.forEach((id,i)=>{const card=document.createElement('div');card.className='zas-card';card.dataset.name=fmt(id).toLowerCase();card.dataset.id=id;const alreadyAdded=games.some(g=>g.id==='zas-'+id);card.innerHTML=`<div class="zas-card-top"><div class="zas-icon">${ICON_MAP[id]||'🎮'}</div><div class="zas-info"><div class="zas-name">${fmt(id)}</div></div></div><div class="zas-desc">${esc(DESC_MAP[id]||'Play on Zeno.')}</div><button class="zas-get${alreadyAdded?' added':''}" data-id="${id}" onclick="zasAdd(this,'${id}')">${alreadyAdded?'Added':'Get'}</button>`;grid.appendChild(card);});}
function refreshZasButtons(){document.querySelectorAll('.zas-get').forEach(btn=>{const id=btn.dataset.id;const added=games.some(g=>g.id==='zas-'+id);btn.textContent=added?'Added':'Get';btn.className='zas-get'+(added?' added':'');});}
function zasFilterGrid(val){const q=val.toLowerCase();let vis=0;document.querySelectorAll('.zas-card').forEach(c=>{const show=!q||c.dataset.name.includes(q);c.style.display=show?'':'none';if(show) vis++;});document.getElementById('zasNoResults').style.display=vis===0?'block':'none';}
function zasAdd(btn,id){if(games.some(g=>g.id==='zas-'+id)){closeAddModal();openGameModal(games.find(g=>g.id==='zas-'+id));return;}const name=fmt(id);const entry={id:'zas-'+id,name,icon:null,entryPath:'games/'+id+'.html',fileCount:0,fileRecords:null,r2:false,zenoapp:true};games.push(entry);saveGameToDB(entry).catch(console.error);window._fbSyncGame?.(entry);btn.textContent='Added';btn.className='zas-get added';renderGrid();showToast(name.toUpperCase()+' ADDED');}

// ── INDEXEDDB ────────────────────────────────────────────────────
const DB_NAME='zeno-games-db',DB_VERSION=1,STORE_META='game-meta',STORE_FILES='game-files';
function openDB(){return new Promise((res,rej)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=e=>{const db=e.target.result;if(!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META,{keyPath:'id'});if(!db.objectStoreNames.contains(STORE_FILES)){const fs=db.createObjectStore(STORE_FILES,{keyPath:'id'});fs.createIndex('gameId','gameId',{unique:false});}};req.onsuccess=e=>res(e.target.result);req.onerror=e=>rej(e.target.error);});}
function idbGetAll(store){return new Promise((res,rej)=>{const r=store.getAll();r.onsuccess=()=>res(r.result);r.onerror=e=>rej(e.target.error);});}
function idbGetAllByIndex(store,idx,val){return new Promise((res,rej)=>{const r=store.index(idx).getAll(val);r.onsuccess=()=>res(r.result);r.onerror=e=>rej(e.target.error);});}
function idbDelete(store,key){return new Promise((res,rej)=>{const r=store.delete(key);r.onsuccess=()=>res();r.onerror=e=>rej(e.target.error);});}
async function saveGameToDB(game){const fileData=[];if(game.fileRecords&&game.fileRecords.length) for(const r of game.fileRecords){const buf=await r.file.arrayBuffer();fileData.push({path:r.path,mimeType:r.mimeType,buffer:buf});}const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction([STORE_META,STORE_FILES],'readwrite');tx.oncomplete=()=>res();tx.onerror=e=>rej(e.target.error);tx.onabort=e=>rej(e.target.error);tx.objectStore(STORE_META).put({id:game.id,name:game.name,icon:game.icon,entryPath:game.entryPath,fileCount:game.fileCount,r2:game.r2||false,zenoapp:game.zenoapp||false});for(const f of fileData) tx.objectStore(STORE_FILES).put({id:game.id+':'+f.path,gameId:game.id,path:f.path,mimeType:f.mimeType,buffer:f.buffer});});}
window.saveGameToDB=saveGameToDB;
async function deleteGameFromDB(gameId){const db=await openDB();const tx=db.transaction([STORE_META,STORE_FILES],'readwrite');const metaStore=tx.objectStore(STORE_META);const fileStore=tx.objectStore(STORE_FILES);await idbDelete(metaStore,gameId);const fileEntries=await idbGetAllByIndex(fileStore,'gameId',gameId);for(const f of fileEntries) await idbDelete(fileStore,f.id);}
async function loadGamesFromDB(){try{const db=await openDB();const tx=db.transaction([STORE_META,STORE_FILES],'readonly');const metas=await idbGetAll(tx.objectStore(STORE_META));if(!metas.length) return;showProgress(true,'Restoring saved games...');buildPips(metas.length);for(let i=0;i<metas.length;i++){const meta=metas[i];setPip(i,'active');showProgress(true,`Restoring: ${meta.name}`);try{if(meta.r2){games.push({...meta,fileRecords:[]});setPip(i,'done');continue;}if(meta.zenoapp){games.push({...meta,fileRecords:null});setPip(i,'done');continue;}const tx2=db.transaction(STORE_FILES,'readonly');const fileEntries=await idbGetAllByIndex(tx2.objectStore(STORE_FILES),'gameId',meta.id);const fileRecords=fileEntries.map(fe=>({path:fe.path,mimeType:fe.mimeType,file:new File([fe.buffer],fe.path.split('/').pop(),{type:fe.mimeType})}));const ok=await registerGameWithSW(meta.id,fileRecords);if(ok){games.push({...meta,fileRecords});setPip(i,'done');}else setPip(i,'fail');}catch(e){console.error('Restore failed:',meta.name,e);setPip(i,'fail');}}showProgress(false);renderGrid();if(games.length) showToast(`${games.length} GAME${games.length>1?'S':''} RESTORED`);}catch(e){console.error('loadGamesFromDB failed:',e);showProgress(false);}}

// ── KEYBOARD SHORTCUTS ────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  const active=document.activeElement;
  const inInput=active&&(active.tagName==='INPUT'||active.tagName==='TEXTAREA'||active.tagName==='SELECT');
  if(e.key==='Escape'){closeGameModal();closeAddModal();closeCollModal();closeSettingsModal();closeSidebar();if(consoleOpen)toggleConsole();closeOverflow();closeKL();}
  if(e.key==='|'&&!inInput){e.preventDefault();toggleConsole();}
  if((e.key==='/'||e.key==='k'&&(e.metaKey||e.ctrlKey))&&!inInput&&!document.getElementById('gameModal').classList.contains('open')){e.preventDefault();openKL();}
});

// ── INIT ─────────────────────────────────────────────────────────
initSW();
loadGamesFromDB().then(()=>{if(!games.length) renderGrid();});
