/* ZENO V2 — Shared Core JavaScript */
(function () {
  'use strict';

  /** Curated Unsplash photos (full CDN slugs — same set as zenodeployment v1) */
  const WALLPAPERS = [
    { label: 'Mountains', thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=60&fit=crop', full: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80&fit=crop' },
    { label: 'Nebula', thumb: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&q=60&fit=crop', full: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80&fit=crop' },
    { label: 'Prism', thumb: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&q=60&fit=crop', full: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80&fit=crop' },
    { label: 'City Night', thumb: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=400&q=60&fit=crop', full: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1920&q=80&fit=crop' },
    { label: 'Forest', thumb: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&q=60&fit=crop', full: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1920&q=80&fit=crop' },
    { label: 'Ocean', thumb: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=400&q=60&fit=crop', full: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=1920&q=80&fit=crop' },
    { label: 'Stars', thumb: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=400&q=60&fit=crop', full: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=1920&q=80&fit=crop' },
  ];

  const ACCENT_PRESETS = [
    { name: 'Neon Cyan', hex: '#00f5ff' },
    { name: 'Neon Pink', hex: '#ff006e' },
    { name: 'Neon Purple', hex: '#bf00ff' },
    { name: 'Neon Green', hex: '#00ff88' },
    { name: 'Apple Blue', hex: '#007AFF' },
    { name: 'Amber', hex: '#f5a623' },
  ];

  const AI_CHIPS = {
    index: ['Open Games', 'Open Stream', 'What time is it?', 'Change my theme'],
    games: ['Open my last played game', 'Show my favorites', "What's my most played game?"],
    movies: ['What should I watch?', 'Show my watchlist', 'Filter to Netflix'],
    settings: ['Switch to glass theme', 'Change accent to cyan', 'Reset all settings'],
    console: ['Go home', 'Open games'],
    ai: [],
    '404': [],
  };

  const cache = {};
  function ls(key, fallback) {
    if (!(key in cache)) cache[key] = localStorage.getItem(key);
    return cache[key] ?? fallback ?? null;
  }
  function setLs(key, val) {
    if (val == null) localStorage.removeItem(key);
    else localStorage.setItem(key, val);
    cache[key] = val;
  }

  window.ZenoStore = {
    get theme() { return ls('zeno_theme', 'default'); },
    get accent() { return ls('zeno_accent', '#00f5ff'); },
    get username() { return ls('zeno_username', 'Guest'); },
    get avatar() { return ls('zeno_avatar'); },
    get pinHash() { return ls('zeno_pin_hash'); },
    get setupComplete() { return ls('zeno_v2_setup_complete') === 'true'; },
    get wallpaperType() { return ls('zeno_wallpaper_type', 'none'); },
    get groqKey() { return ls('zeno_groq_key'); },
    get aiModel() { return ls('zeno_ai_model', 'llama-3.3-70b-versatile'); },
    get aiSystemPrompt() { return ls('zeno_ai_system_prompt', ''); },
    set: setLs,
    get: ls,
    json(key, fallback) {
      try { return JSON.parse(ls(key) || JSON.stringify(fallback)); } catch { return fallback; }
    },
    setJson(key, obj) { setLs(key, JSON.stringify(obj)); },
  };

  function applyTheme(theme, accent) {
    document.documentElement.className = 'theme-' + (theme || ZenoStore.theme);
    document.documentElement.style.setProperty('--accent', accent || ZenoStore.accent);
    const blur = ls('zeno_blur_intensity');
    if (blur) document.documentElement.style.setProperty('--blur', blur + 'px');
    const speed = ls('zeno_animation_speed', '1');
    const mult = speed === 'slow' ? 1.5 : speed === 'fast' ? 0.6 : 1;
    document.documentElement.style.setProperty('--transition-speed', String(mult));
    const grid = document.getElementById('zeno-grid');
    const scan = document.getElementById('zeno-scanlines');
    if (grid) grid.classList.toggle('show', ls('zeno_grid_enabled') !== 'false' && (theme || ZenoStore.theme) === 'default');
    if (scan) scan.classList.toggle('show', ls('zeno_scanlines_enabled') !== 'false' && ['default', 'blend'].includes(theme || ZenoStore.theme));
  }

  function ensureWallpaperEl() {
    let el = document.getElementById('zeno-wallpaper');
    if (!el) {
      el = document.createElement('div');
      el.id = 'zeno-wallpaper';
      document.body.prepend(el);
    }
    return el;
  }

  function isBrokenUnsplashUrl(url) {
    return url && /images\.unsplash\.com\/photo-\d+\?/i.test(url) && !/images\.unsplash\.com\/photo-\d+-[a-z0-9]/i.test(url);
  }

  function applyWallpaper() {
    const el = ensureWallpaperEl();
    const type = ZenoStore.wallpaperType;
    if (type === 'url') {
      let url = ls('zeno_wallpaper_url');
      if (isBrokenUnsplashUrl(url)) {
        setLs('zeno_wallpaper_type', 'none');
        setLs('zeno_wallpaper_url', null);
        url = null;
      }
      el.style.backgroundImage = url ? `url("${url}")` : 'none';
    } else if (type === 'local') {
      const b64 = ls('zeno_wallpaper');
      el.style.backgroundImage = b64 ? `url("${b64}")` : 'none';
    } else {
      el.style.backgroundImage = 'none';
    }
  }

  function applyCloak() {
    if (ls('zeno_cloak_active') !== 'true') return;
    const title = ls('zeno_cloak_title') || 'Google Classroom';
    document.title = title;
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    const fav = ls('zeno_cloak_favicon');
    if (fav) link.href = fav;
    else link.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect fill="%234285f4" width="16" height="16"/></svg>';
  }

  function timeGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'GOOD MORNING';
    if (h < 17) return 'GOOD AFTERNOON';
    if (h < 21) return 'GOOD EVENING';
    return 'GOOD NIGHT';
  }

  function relativeTime(ts) {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d >= 1) return d + ' day' + (d > 1 ? 's' : '') + ' ago';
    if (h >= 1) return h + ' hour' + (h > 1 ? 's' : '') + ' ago';
    if (m >= 1) return m + ' min ago';
    return 'just now';
  }

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  window.navigateTo = function (url) {
    document.body.classList.add('page-exit');
    setTimeout(() => { window.location.href = url; }, 200);
  };

  window.ZenoModal = {
    open(id) {
      const o = document.getElementById(id);
      if (o) o.classList.add('open');
    },
    close(id) {
      const o = document.getElementById(id);
      if (o) o.classList.remove('open');
    },
    bind(id) {
      const o = document.getElementById(id);
      if (!o) return;
      o.addEventListener('click', (e) => { if (e.target === o) ZenoModal.close(id); });
    },
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.zeno-modal-overlay.open').forEach((m) => m.classList.remove('open'));
  });

  function buildAccentPicker(container, onSelect) {
    container.innerHTML = '<div class="accent-grid"></div><input type="text" class="zeno-input" placeholder="#00f5ff" id="accentHexInput" style="margin-top:10px">';
    const grid = container.querySelector('.accent-grid');
    ACCENT_PRESETS.forEach((p) => {
      const d = document.createElement('div');
      d.className = 'accent-swatch';
      d.style.background = p.hex;
      d.title = p.name;
      d.onclick = () => { onSelect(p.hex); grid.querySelectorAll('.accent-swatch').forEach((s) => s.classList.remove('selected')); d.classList.add('selected'); };
      grid.appendChild(d);
    });
    const hex = container.querySelector('#accentHexInput');
    hex.oninput = () => { if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) onSelect(hex.value); };
  }

  function buildWallpaperPicker(container, onSelect) {
    container.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button type="button" class="zeno-btn zeno-btn-ghost wp-tab active" data-tab="gallery">Unsplash</button>
        <button type="button" class="zeno-btn zeno-btn-ghost wp-tab" data-tab="upload">Upload</button>
        <button type="button" class="zeno-btn zeno-btn-ghost wp-tab" data-tab="none">None</button>
      </div>
      <div id="wpPanel"></div>`;
    const panel = container.querySelector('#wpPanel');
    function showGallery() {
      panel.innerHTML = '<p class="wp-unsplash-note">Photos from <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">Unsplash</a></p><div class="wallpaper-grid"></div>';
      const g = panel.querySelector('.wallpaper-grid');
      WALLPAPERS.forEach((w) => {
        const d = document.createElement('div');
        d.className = 'wp-thumb';
        d.innerHTML = `<img src="${w.thumb}" alt="${w.label}" loading="lazy"><span>${w.label}</span>`;
        d.onclick = () => { setLs('zeno_wallpaper_type', 'url'); setLs('zeno_wallpaper_url', w.full); applyWallpaper(); onSelect(); };
        g.appendChild(d);
      });
    }
    function showUpload() {
      panel.innerHTML = '<input type="file" accept="image/*" class="zeno-input" id="wpFile">';
      panel.querySelector('#wpFile').onchange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => { setLs('zeno_wallpaper_type', 'local'); setLs('zeno_wallpaper', r.result); applyWallpaper(); onSelect(); };
        r.readAsDataURL(f);
      };
    }
    function showNone() {
      setLs('zeno_wallpaper_type', 'none');
      applyWallpaper();
      onSelect();
      panel.innerHTML = '<p style="color:var(--muted);text-align:center">Solid background active.</p>';
    }
    container.querySelectorAll('.wp-tab').forEach((b) => {
      b.onclick = () => {
        container.querySelectorAll('.wp-tab').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        if (b.dataset.tab === 'gallery') showGallery();
        else if (b.dataset.tab === 'upload') showUpload();
        else showNone();
      };
    });
    showGallery();
  }

  window.openAccentPickerModal = function () {
    let m = document.getElementById('zenoAccentModal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'zenoAccentModal';
      m.className = 'zeno-modal-overlay';
      m.innerHTML = '<div class="zeno-modal" style="min-width:320px"><div class="zeno-modal-title">ACCENT COLOR</div><div id="accentPickerBody"></div><button class="zeno-btn" style="margin-top:16px" onclick="ZenoModal.close(\'zenoAccentModal\')">DONE</button></div>';
      document.body.appendChild(m);
      ZenoModal.bind('zenoAccentModal');
      buildAccentPicker(m.querySelector('#accentPickerBody'), (hex) => {
        setLs('zeno_accent', hex);
        applyTheme(ZenoStore.theme, hex);
      });
    }
    ZenoModal.open('zenoAccentModal');
  };

  window.openWallpaperPickerModal = function () {
    let m = document.getElementById('zenoWallpaperModal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'zenoWallpaperModal';
      m.className = 'zeno-modal-overlay';
      m.innerHTML = '<div class="zeno-modal" style="min-width:480px"><div class="zeno-modal-title">WALLPAPER</div><p style="font-size:12px;color:var(--muted);margin:0 0 12px">Unsplash gallery, upload, or none</p><div id="wallpaperPickerBody"></div><button class="zeno-btn" style="margin-top:16px" onclick="ZenoModal.close(\'zenoWallpaperModal\')">DONE</button></div>';
      document.body.appendChild(m);
      ZenoModal.bind('zenoWallpaperModal');
      buildWallpaperPicker(m.querySelector('#wallpaperPickerBody'), () => {});
    }
    ZenoModal.open('zenoWallpaperModal');
  };

  window.initNavBar = function (pageName, opts) {
    opts = opts || {};
    const greet = timeGreeting();
    const name = ZenoStore.username;
    const av = ZenoStore.avatar;
    const avHtml = av
      ? `<a href="settings.html" onclick="navigateTo('settings.html');return false"><img class="zeno-nav-avatar" src="${av}" alt=""></a>`
      : `<a href="settings.html" class="zeno-nav-avatar-placeholder" onclick="navigateTo('settings.html');return false"><i class="fa-solid fa-user"></i></a>`;
    const searchHtml = opts.search
      ? `<div class="zeno-nav-center"><input type="search" class="zeno-input" id="zenoNavSearch" placeholder="Search..." style="max-width:360px"></div>`
      : '';
    let nav = document.getElementById('zeno-nav');
    if (!nav) {
      nav = document.createElement('header');
      nav.id = 'zeno-nav';
      nav.className = 'zeno-nav';
      document.body.prepend(nav);
    }
    nav.innerHTML = `
      <a href="index.html" class="zeno-nav-logo" onclick="navigateTo('index.html');return false">ZENO</a>
      <span class="zeno-nav-sep">/</span>
      <span class="zeno-nav-page">${pageName}</span>
      ${searchHtml}
      <div class="zeno-nav-right">
        <span class="zeno-nav-greet">${greet}, <strong>${name.toUpperCase()}</strong></span>
        <button type="button" class="zeno-btn zeno-auth-nav-btn" onclick="openAuthModal?.()"><i class="fa-solid fa-user"></i><span data-auth-label>SIGN IN</span></button>
        ${avHtml}
      </div>`;
    if (opts.search && opts.onSearch) {
      const si = document.getElementById('zenoNavSearch');
      if (si) si.addEventListener('input', (e) => opts.onSearch(e.target.value));
    }
  };

  const SESSION_UNLOCK = 'zeno_session_unlocked';
  const SESSION_UNLOCK_PIN = 'zeno_session_unlock_pin';

  window.clearZenoSessionUnlock = function () {
    sessionStorage.removeItem(SESSION_UNLOCK);
    sessionStorage.removeItem(SESSION_UNLOCK_PIN);
  };

  window.markZenoSessionUnlocked = function () {
    sessionStorage.setItem(SESSION_UNLOCK, 'true');
    if (ZenoStore.pinHash) sessionStorage.setItem(SESSION_UNLOCK_PIN, ZenoStore.pinHash);
  };

  window.initLockScreen = function () {
    if (!ZenoStore.pinHash) {
      clearZenoSessionUnlock();
      return;
    }
    if (
      sessionStorage.getItem(SESSION_UNLOCK) === 'true' &&
      sessionStorage.getItem(SESSION_UNLOCK_PIN) === ZenoStore.pinHash
    ) {
      document.getElementById('zeno-lock')?.remove();
      return;
    }
    let lock = document.getElementById('zeno-lock');
    if (!lock) {
      lock = document.createElement('div');
      lock.id = 'zeno-lock';
      lock.innerHTML = `
        <div class="lock-panel zeno-surface">
          <div class="lock-time" id="lockTime"></div>
          <div class="lock-date" id="lockDate"></div>
          <img class="lock-avatar" id="lockAvatar" alt="" style="display:none">
          <div class="lock-user" id="lockUser"></div>
          <input type="password" class="zeno-input lock-input" id="lockPass" placeholder="Password">
          <button class="zeno-btn" style="width:100%;margin-top:12px" id="lockBtn"><i class="fa-solid fa-unlock"></i> UNLOCK</button>
          <div class="lock-error" id="lockErr"></div>
        </div>`;
      document.body.appendChild(lock);
    }
    const tick = () => {
      const n = new Date();
      const t = document.getElementById('lockTime');
      const d = document.getElementById('lockDate');
      if (t) t.textContent = n.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (d) d.textContent = n.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    };
    tick();
    setInterval(tick, 1000);
    const av = document.getElementById('lockAvatar');
    if (ZenoStore.avatar && av) { av.src = ZenoStore.avatar; av.style.display = 'block'; }
    document.getElementById('lockUser').textContent = ZenoStore.username;
    document.getElementById('lockBtn').onclick = async () => {
      const pass = document.getElementById('lockPass').value;
      const hash = await sha256(pass);
      const inp = document.getElementById('lockPass');
      const err = document.getElementById('lockErr');
      if (hash === ZenoStore.pinHash) {
        markZenoSessionUnlocked();
        lock.classList.add('hidden');
        setTimeout(() => lock.remove(), 500);
      } else {
        inp.classList.add('shake');
        err.textContent = 'Incorrect password';
        setTimeout(() => inp.classList.remove('shake'), 400);
      }
    };
  };

  window.registerServiceWorker = function () {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return Promise.resolve(null);
    return navigator.serviceWorker
      .register('./zeno-game-sw.js', { scope: './' })
      .then((reg) => {
        window._zenoSwReg = reg;
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        return reg;
      })
      .catch(() => null);
  };

  window.ZenoAI = {
    history: [],
    actionHandlers: {},
    registerHandler(type, fn) { this.actionHandlers[type] = fn; },
    parseActions(text) {
      const actions = [];
      const re = /<zenoaction\s+([^>]+)\/>/gi;
      let m;
      while ((m = re.exec(text)) !== null) {
        const attrs = {};
        m[1].replace(/(\w+)="([^"]*)"/g, (_, k, v) => { attrs[k] = v; });
        if (attrs.type) actions.push(attrs);
      }
      return actions;
    },
    stripActions(text) {
      return text.replace(/<zenoaction\s+[^>]+\/>/gi, '').trim();
    },
    executeAction(action) {
      const h = this.actionHandlers[action.type];
      if (h) h(action);
    },
    buildPageContext(page, extra) {
      return JSON.stringify({
        page,
        username: ZenoStore.username,
        theme: ZenoStore.theme,
        accent: ZenoStore.accent,
        recentGames: ZenoStore.json('zeno_recent_games', []),
        favorites: ZenoStore.json('zeno_favorites', []),
        watchlist: ZenoStore.json('zeno_watchlist', []),
        ...extra,
      });
    },
    async send(userMessage, page, extraContext) {
      const key = ZenoStore.groqKey;
      if (!key) return { error: true, text: 'Set your Groq API key in Settings first.' };
      const sys = (ZenoStore.aiSystemPrompt || 'You are ZENO AI, a helpful assistant for the ZENO browser gaming platform. When performing actions, include <zenoaction type="..." /> tags as specified.') +
        '\n\nPage context: ' + this.buildPageContext(page, extraContext || {});
      this.history.push({ role: 'user', content: userMessage });
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
          body: JSON.stringify({
            model: ZenoStore.aiModel,
            messages: [{ role: 'system', content: sys }, ...this.history],
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'API error');
        let text = data.choices?.[0]?.message?.content || '';
        const actions = this.parseActions(text);
        actions.forEach((a) => this.executeAction(a));
        text = this.stripActions(text);
        this.history.push({ role: 'assistant', content: text });
        return { error: false, text };
      } catch (e) {
        return { error: true, text: e.message || 'Request failed' };
      }
    },
  };

  window.initAISidebar = function (page) {
    if (page === 'onboarding' || page === 'ai') return;
    let fab = document.getElementById('zeno-ai-fab');
    let panel = document.getElementById('zeno-ai-panel');
    if (!fab) {
      fab = document.createElement('button');
      fab.id = 'zeno-ai-fab';
      fab.type = 'button';
      fab.innerHTML = '<i class="fa-solid fa-robot"></i>';
      fab.setAttribute('aria-label', 'ZENO AI');
      document.body.appendChild(fab);
    }
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'zeno-ai-panel';
      panel.innerHTML = `
        <div class="ai-panel-head"><span>ZENO AI</span><small style="color:var(--muted);font-size:10px" id="aiModelLbl"></small>
          <button class="ai-panel-close" type="button"><i class="fa-solid fa-xmark"></i></button></div>
        <div class="ai-chips" id="aiChips"></div>
        <div class="ai-messages" id="aiMessages"></div>
        <div class="ai-input-wrap">
          <textarea class="zeno-input" id="aiSideInput" rows="1" placeholder="Ask ZENO..."></textarea>
          <button class="ai-send" type="button" id="aiSideSend"><i class="fa-solid fa-paper-plane"></i></button>
        </div>`;
      document.body.appendChild(panel);
      panel.querySelector('.ai-panel-close').onclick = () => panel.classList.remove('open');
    }
    document.getElementById('aiModelLbl').textContent = ZenoStore.aiModel;
    const chips = document.getElementById('aiChips');
    chips.innerHTML = '';
    (AI_CHIPS[page] || []).forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ai-chip';
      b.textContent = c;
      b.onclick = () => { document.getElementById('aiSideInput').value = c; };
      chips.appendChild(b);
    });
    fab.onclick = () => panel.classList.toggle('open');
    const send = async () => {
      const inp = document.getElementById('aiSideInput');
      const msg = inp.value.trim();
      if (!msg) return;
      inp.value = '';
      const box = document.getElementById('aiMessages');
      const u = document.createElement('div');
      u.className = 'ai-msg user';
      u.textContent = msg;
      box.appendChild(u);
      box.scrollTop = box.scrollHeight;
      const r = await ZenoAI.send(msg, page, window.zenoPageContextExtra || {});
      const b = document.createElement('div');
      b.className = 'ai-msg bot' + (r.error ? ' error' : '');
      if (typeof marked !== 'undefined' && !r.error) b.innerHTML = marked.parse(r.text);
      else b.textContent = r.text;
      box.appendChild(b);
      box.scrollTop = box.scrollHeight;
    };
    document.getElementById('aiSideSend').onclick = send;
    document.getElementById('aiSideInput').onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };
  };

  window.zenoBoot = function (opts) {
    opts = opts || {};
    if (!document.getElementById('zeno-grid')) {
      document.body.insertAdjacentHTML('afterbegin', '<div id="zeno-grid"></div><div id="zeno-scanlines"></div>');
    }
    applyTheme(ZenoStore.theme, ZenoStore.accent);
    applyWallpaper();
    applyCloak();
    document.body.classList.add('page-enter');
    if (opts.lock !== false) initLockScreen();
    if (opts.nav) initNavBar(opts.nav, opts.navOpts);
    if (opts.ai !== false) initAISidebar(opts.page || 'index');
    registerServiceWorker();
    const startup = ls('zeno_startup_app');
    if (startup && opts.page === 'index' && !sessionStorage.getItem('zeno_startup_done')) {
      sessionStorage.setItem('zeno_startup_done', '1');
      const map = { games: 'games.html', stream: 'movies.html', home: 'index.html' };
      if (map[startup] && map[startup] !== 'index.html') navigateTo(map[startup]);
    }
  };

  window.ZenoGameStats = {
    get() { return ZenoStore.json('zeno_game_stats', {}); },
    save(o) { ZenoStore.setJson('zeno_game_stats', o); },
    recordPlay(id, name, thumb, minutes) {
      const s = this.get();
      if (!s[id]) s[id] = { playCount: 0, totalMinutes: 0, lastPlayed: null, firstPlayed: Date.now() };
      s[id].playCount++;
      s[id].totalMinutes = (s[id].totalMinutes || 0) + minutes;
      s[id].lastPlayed = Date.now();
      this.save(s);
      let recent = ZenoStore.json('zeno_recent_games', []);
      recent = recent.filter((g) => g.id !== id);
      recent.unshift({ id, name, thumbnail: thumb || '', lastPlayed: new Date().toISOString() });
      recent = recent.slice(0, 12);
      ZenoStore.setJson('zeno_recent_games', recent);
    },
  };

  window.getFavorites = () => ZenoStore.json('zeno_favorites', []);
  window.toggleFavorite = (id) => {
    let f = getFavorites();
    if (f.includes(id)) f = f.filter((x) => x !== id);
    else f.push(id);
    ZenoStore.setJson('zeno_favorites', f);
    return f.includes(id);
  };

  window.applyTheme = applyTheme;
  window.applyWallpaper = applyWallpaper;
  window.applyCloak = applyCloak;
  window.buildAccentPicker = buildAccentPicker;
  window.buildWallpaperPicker = buildWallpaperPicker;

  applyTheme(ZenoStore.theme, ZenoStore.accent);
})();
