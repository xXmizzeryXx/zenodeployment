/* ZENO V2 — Stream page integration */
(function () {
  const SERVICES = [
    { id: 'all', label: 'All' },
    { id: 'netflix', label: 'Netflix', svc: 'netflix' },
    { id: 'hulu', label: 'Hulu', svc: 'hulu' },
    { id: 'hbo', label: 'HBO Max', svc: 'hbomax' },
    { id: 'peacock', label: 'Peacock', svc: 'peacock' },
    { id: 'prime', label: 'Prime', svc: 'prime' },
  ];

  const PROFILES_KEY = 'zeno_stream_profiles';
  const PROFILE_COLORS = ['#00f5ff', '#ff006e', '#bf00ff', '#00ff88', '#fbbf24', '#60a5fa', '#f472b6', '#fb923c'];
  const PROFILE_ICONS = ['user', 'users', 'child', 'ghost', 'star', 'film', 'heart', 'rocket', 'cat', 'dog'];
  const ADULT_TV_GENRE = 10768;

  let editProfileId = null;
  let editDraft = null;

  const StreamProfiles = {
    normalize(p) {
      if (p.allowAdult === undefined) p.allowAdult = p.icon !== 'child' && !/^kids?$/i.test(p.name);
      if (!p.color) p.color = PROFILE_COLORS[0];
      if (!p.icon) p.icon = 'user';
      return p;
    },
    getAll() {
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]');
      } catch (_) {}
      list = list.map((p) => this.normalize(p));
      if (!list.length) list = this.seedDefaults();
      return list;
    },
    saveAll(list) {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(list.map((p) => this.normalize(p))));
    },
    seedDefaults() {
      const name = typeof ZenoStore !== 'undefined' && ZenoStore.username ? ZenoStore.username : 'You';
      const list = [
        { id: 'p_' + Date.now(), name, color: PROFILE_COLORS[0], icon: 'user', allowAdult: true },
        { id: 'p_' + (Date.now() + 1), name: 'Family', color: PROFILE_COLORS[2], icon: 'users', allowAdult: true },
        { id: 'p_' + (Date.now() + 2), name: 'Kids', color: PROFILE_COLORS[3], icon: 'child', allowAdult: false },
      ];
      this.saveAll(list);
      return list;
    },
    getActiveId() {
      return sessionStorage.getItem('zeno_stream_profile') || '';
    },
    getActive() {
      const id = this.getActiveId();
      return this.getAll().find((p) => p.id === id) || null;
    },
    setActive(id) {
      sessionStorage.setItem('zeno_stream_profile', id);
      this.migrateLegacyWatchlist(id);
    },
    migrateLegacyWatchlist(profileId) {
      const legacy = localStorage.getItem('zeno_watchlist');
      const key = 'zeno_watchlist_' + profileId;
      if (legacy && !localStorage.getItem(key)) localStorage.setItem(key, legacy);
    },
    allowAdult() {
      const p = this.getActive();
      return p ? p.allowAdult !== false : true;
    },
    add(name, opts = {}) {
      const list = this.getAll();
      const p = this.normalize({
        id: 'p_' + Date.now().toString(36),
        name: name.trim() || 'Profile',
        color: opts.color || PROFILE_COLORS[list.length % PROFILE_COLORS.length],
        icon: opts.icon || PROFILE_ICONS[list.length % PROFILE_ICONS.length],
        allowAdult: opts.allowAdult !== false,
      });
      list.push(p);
      this.saveAll(list);
      return p;
    },
    save(id, data) {
      const list = this.getAll();
      const p = list.find((x) => x.id === id);
      if (!p) return null;
      if (data.name !== undefined) p.name = String(data.name).trim() || p.name;
      if (data.color !== undefined) p.color = data.color;
      if (data.icon !== undefined) p.icon = data.icon;
      if (data.allowAdult !== undefined) p.allowAdult = !!data.allowAdult;
      this.saveAll(list);
      return p;
    },
    remove(id) {
      let list = this.getAll();
      if (list.length <= 1) return false;
      list = list.filter((p) => p.id !== id);
      this.saveAll(list);
      localStorage.removeItem('zeno_watchlist_' + id);
      if (this.getActiveId() === id) sessionStorage.removeItem('zeno_stream_profile');
      return true;
    },
  };

  window.StreamProfiles = StreamProfiles;

  window.streamAllowsAdult = function () {
    return StreamProfiles.allowAdult();
  };

  window.streamIsBlockedItem = function (item) {
    if (!item || StreamProfiles.allowAdult()) return false;
    if (item.adult) return true;
    const genres = item.genre_ids || (item.genres || []).map((g) => g.id).filter(Boolean);
    if (genres.includes(ADULT_TV_GENRE)) return true;
    return false;
  };

  window.streamFilterItems = function (items) {
    if (!items || StreamProfiles.allowAdult()) return items || [];
    return items.filter((item) => !streamIsBlockedItem(item));
  };

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function profileCardHtml(p) {
    const kidsBadge = p.allowAdult === false ? '<span class="stream-profile-kids-badge">Kids</span>' : '';
    return `
      <div class="stream-profile-card-wrap">
        <button type="button" class="stream-profile-card" data-profile-id="${p.id}" style="--profile-color:${p.color}">
          <span class="stream-profile-avatar"><i class="fa-solid fa-${p.icon}"></i></span>
          <span class="stream-profile-name">${escHtml(p.name)}</span>
          ${kidsBadge}
        </button>
        <button type="button" class="stream-profile-card-edit" data-edit-id="${p.id}" title="Edit profile" aria-label="Edit ${escHtml(p.name)}">
          <i class="fa-solid fa-pen"></i>
        </button>
      </div>`;
  }

  function renderProfileGate() {
    const grid = document.getElementById('streamProfileGrid');
    if (!grid) return;
    grid.innerHTML = StreamProfiles.getAll().map(profileCardHtml).join('');

    grid.querySelectorAll('.stream-profile-card').forEach((btn) => {
      btn.addEventListener('click', () => selectProfile(btn.dataset.profileId));
    });
    grid.querySelectorAll('.stream-profile-card-edit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openProfileEditModal(btn.dataset.editId);
      });
    });
  }

  function updateActiveProfileLabel() {
    const p = StreamProfiles.getActive();
    const el = document.getElementById('streamActiveProfileLabel');
    if (el) el.textContent = p ? p.name : 'Profile';
  }

  function selectProfile(id) {
    StreamProfiles.setActive(id);
    document.body.classList.remove('stream-profile-pending');
    document.getElementById('streamProfileGate')?.setAttribute('hidden', '');
    updateActiveProfileLabel();
    closeProfileEditModal();
    streamBootContent();
  }

  function showProfileGate() {
    window._streamBooted = false;
    document.body.classList.add('stream-profile-pending');
    document.getElementById('streamProfileGate')?.removeAttribute('hidden');
    renderProfileGate();
  }

  function updateEditPreview() {
    if (!editDraft) return;
    const av = document.getElementById('streamProfileEditAvatar');
    if (av) {
      av.style.setProperty('--profile-color', editDraft.color);
      av.innerHTML = `<i class="fa-solid fa-${editDraft.icon}"></i>`;
    }
  }

  function buildEditPickerGrids() {
    const iconGrid = document.getElementById('streamProfileIconGrid');
    const colorGrid = document.getElementById('streamProfileColorGrid');
    if (!iconGrid || !colorGrid || !editDraft) return;

    iconGrid.innerHTML = PROFILE_ICONS.map(
      (icon) =>
        `<button type="button" class="stream-profile-pick ${editDraft.icon === icon ? 'selected' : ''}" data-icon="${icon}" title="${icon}">
          <i class="fa-solid fa-${icon}"></i>
        </button>`
    ).join('');

    colorGrid.innerHTML = PROFILE_COLORS.map(
      (color) =>
        `<button type="button" class="stream-profile-color-pick ${editDraft.color === color ? 'selected' : ''}" data-color="${color}" style="background:${color}" title="${color}"></button>`
    ).join('');

    iconGrid.querySelectorAll('[data-icon]').forEach((btn) => {
      btn.addEventListener('click', () => {
        editDraft.icon = btn.dataset.icon;
        if (editDraft.icon === 'child' && editProfileId) {
          const p = StreamProfiles.getAll().find((x) => x.id === editProfileId);
          if (p?.name?.toLowerCase().includes('kid')) editDraft.allowAdult = false;
        }
        buildEditPickerGrids();
        updateEditPreview();
        syncAdultToggleUi();
      });
    });

    colorGrid.querySelectorAll('[data-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        editDraft.color = btn.dataset.color;
        buildEditPickerGrids();
        updateEditPreview();
      });
    });
  }

  function syncAdultToggleUi() {
    const toggle = document.getElementById('streamProfileAllowAdult');
    const hint = document.getElementById('streamProfileAdultHint');
    if (!toggle || !editDraft) return;
    toggle.checked = editDraft.allowAdult !== false;
    if (hint) {
      hint.textContent =
        editDraft.allowAdult === false
          ? 'Adult and R-rated titles are hidden for this profile'
          : 'When off, adult-rated movies and mature TV are hidden';
    }
  }

  function openProfileEditModal(profileId, isNew = false) {
    const modal = document.getElementById('streamProfileEditModal');
    if (!modal) return;

    editProfileId = profileId;
    const existing = profileId ? StreamProfiles.getAll().find((p) => p.id === profileId) : null;

    if (isNew || !existing) {
      editDraft = {
        name: '',
        color: PROFILE_COLORS[StreamProfiles.getAll().length % PROFILE_COLORS.length],
        icon: 'user',
        allowAdult: true,
      };
      document.getElementById('streamProfileEditTitle').textContent = 'NEW PROFILE';
      document.getElementById('streamProfileDelete')?.style.setProperty('display', 'none');
    } else {
      editDraft = { name: existing.name, color: existing.color, icon: existing.icon, allowAdult: existing.allowAdult !== false };
      document.getElementById('streamProfileEditTitle').textContent = 'EDIT PROFILE';
      document.getElementById('streamProfileDelete')?.style.removeProperty('display');
    }

    document.getElementById('streamProfileEditName').value = editDraft.name;
    buildEditPickerGrids();
    updateEditPreview();
    syncAdultToggleUi();

    document.getElementById('streamProfileAllowAdult').onchange = (e) => {
      editDraft.allowAdult = e.target.checked;
      syncAdultToggleUi();
    };

    if (typeof ZenoModal !== 'undefined') ZenoModal.open('streamProfileEditModal');
    else modal.classList.add('open');
  }

  function closeProfileEditModal() {
    editProfileId = null;
    editDraft = null;
    if (typeof ZenoModal !== 'undefined') ZenoModal.close('streamProfileEditModal');
    else document.getElementById('streamProfileEditModal')?.classList.remove('open');
  }

  function saveProfileEdit() {
    if (!editDraft) return;
    const name = document.getElementById('streamProfileEditName')?.value?.trim() || editDraft.name || 'Profile';
    editDraft.name = name;
    editDraft.allowAdult = document.getElementById('streamProfileAllowAdult')?.checked !== false;

    if (editProfileId) {
      StreamProfiles.save(editProfileId, editDraft);
      if (StreamProfiles.getActiveId() === editProfileId) {
        updateActiveProfileLabel();
        if (window._streamBooted && typeof loadHome === 'function') loadHome();
      }
    } else {
      const p = StreamProfiles.add(name, editDraft);
      renderProfileGate();
      selectProfile(p.id);
      return;
    }

    renderProfileGate();
    updateActiveProfileLabel();
    closeProfileEditModal();
    if (typeof showToast === 'function') showToast('Profile saved', 'gold');
  }

  function deleteProfileEdit() {
    if (!editProfileId) return;
    if (!confirm('Delete this profile? Its watchlist will be removed.')) return;
    const wasActive = StreamProfiles.getActiveId() === editProfileId;
    StreamProfiles.remove(editProfileId);
    closeProfileEditModal();
    if (wasActive) {
      showProfileGate();
    } else {
      renderProfileGate();
    }
    if (typeof showToast === 'function') showToast('Profile deleted', 'gold');
  }

  window.streamBootContent = function () {
    if (window._streamBooted) return;
    window._streamBooted = true;
    if (typeof updateWLBadge === 'function') updateWLBadge();
    if (typeof loadHome === 'function') loadHome();
    refreshStreamPageContext();
  };

  function initProfileEditModal() {
    document.getElementById('streamProfileEditSave')?.addEventListener('click', saveProfileEdit);
    document.getElementById('streamProfileEditCancel')?.addEventListener('click', closeProfileEditModal);
    document.getElementById('streamProfileDelete')?.addEventListener('click', deleteProfileEdit);
    if (typeof ZenoModal !== 'undefined') ZenoModal.bind('streamProfileEditModal');
    else {
      document.getElementById('streamProfileEditModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'streamProfileEditModal') closeProfileEditModal();
      });
    }
  }

  function initStreamProfiles() {
    renderProfileGate();
    initProfileEditModal();

    document.getElementById('streamProfileAdd')?.addEventListener('click', () => {
      openProfileEditModal(null, true);
    });

    document.getElementById('streamProfileManage')?.addEventListener('click', () => {
      const first = StreamProfiles.getAll()[0];
      if (first) openProfileEditModal(first.id);
    });

    document.getElementById('streamProfileSwitch')?.addEventListener('click', () => {
      showProfileGate();
    });

    const activeId = StreamProfiles.getActiveId();
    if (activeId && StreamProfiles.getAll().some((p) => p.id === activeId)) {
      document.body.classList.remove('stream-profile-pending');
      document.getElementById('streamProfileGate')?.setAttribute('hidden', '');
      updateActiveProfileLabel();
      streamBootContent();
    } else {
      showProfileGate();
    }
  }

  function initStreamV2() {
    document.body.classList.add('stream-v2');
    document.querySelector('.scanlines')?.remove();

    initStreamProfiles();

    if (typeof zenoBoot === 'function') {
      zenoBoot({
        page: 'stream',
        nav: 'STREAM',
        lock: false,
        navOpts: {
          search: true,
          onSearch: (q) => syncSearchToLegacy(q),
        },
      });
    }

    wireSearchSync();
    buildServicePills();

    if (window.ZenoAI) {
      ZenoAI.registerHandler('navigate', (a) => navigateTo(a.target));
      ZenoAI.registerHandler('open_watchlist', () => {
        document.querySelector('.stream-tab[data-tab="watchlist"]')?.click();
      });
      ZenoAI.registerHandler('filter_service', (a) => {
        const svc = a.service || a.id;
        const pill = document.querySelector(`.service-pill[data-svc="${svc}"]`);
        if (pill) pill.click();
        else {
          const mapped = SERVICES.find((s) => s.svc === svc)?.id;
          const p2 = mapped ? document.querySelector(`.service-pill[data-svc="${mapped}"]`) : null;
          if (p2) p2.click();
          else document.querySelector(`.sb-service[data-svc="${svc}"]`)?.click();
        }
      });
    }
  }

  window.refreshStreamPageContext = function () {
    const p = StreamProfiles.getActive();
    window.zenoPageContextExtra = {
      profile: p ? p.name : null,
      kidsMode: p ? p.allowAdult === false : false,
      watchlistCount: (typeof getWL === 'function' ? getWL() : []).length,
      availableActions: ['navigate', 'open_watchlist', 'filter_service'],
    };
  };

  function syncSearchToLegacy(q) {
    const legacy = document.getElementById('searchInput');
    const nav = document.getElementById('zenoNavSearch');
    if (legacy && legacy.value !== q) {
      legacy.value = q;
      legacy.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (nav && nav.value !== q) nav.value = q;
  }

  function wireSearchSync() {
    const legacy = document.getElementById('searchInput');
    const nav = document.getElementById('zenoNavSearch');
    if (!legacy || !nav) return;
    nav.addEventListener('input', () => {
      if (legacy.value !== nav.value) {
        legacy.value = nav.value;
        legacy.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    legacy.addEventListener('input', () => {
      if (nav.value !== legacy.value) nav.value = legacy.value;
    });
    nav.value = legacy.value || '';
  }

  function setActivePill(svcId) {
    document.querySelectorAll('.service-pill').forEach((p) => {
      p.classList.toggle('active', p.dataset.svc === svcId);
    });
  }

  function onServicePillClick(s) {
    setActivePill(s.id);
    if (s.id === 'all') {
      const active = document.querySelector('.stream-tab.active');
      const tab = window.currentTab || 'home';
      if (typeof switchTab === 'function') switchTab(tab, active);
      return;
    }
    const btn = document.querySelector(`.sb-service[data-svc="${s.svc}"]`);
    if (typeof switchService === 'function') switchService(s.svc, btn);
  }

  function buildServicePills() {
    const row = document.getElementById('streamServicePills');
    if (!row || row.dataset.built === '1') return;
    row.dataset.built = '1';
    row.innerHTML = '';
    SERVICES.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'service-pill' + (i === 0 ? ' active' : '');
      b.dataset.svc = s.id;
      b.textContent = s.label;
      b.addEventListener('click', () => onServicePillClick(s));
      row.appendChild(b);
    });

    const origSwitch = window.switchService;
    if (origSwitch) {
      window.switchService = function (svc, btn) {
        origSwitch(svc, btn);
        const pillId = SERVICES.find((x) => x.svc === svc)?.id;
        if (pillId) setActivePill(pillId);
      };
    }
    const origSwitchTab = window.switchTab;
    if (origSwitchTab) {
      window.switchTab = function (tab, btn) {
        origSwitchTab(tab, btn);
        if (!window.currentService) setActivePill('all');
        refreshStreamPageContext();
      };
    }

    const origToggleWL = window.toggleWL;
    if (origToggleWL) {
      window.toggleWL = function (item) {
        const r = origToggleWL(item);
        refreshStreamPageContext();
        return r;
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStreamV2);
  } else {
    initStreamV2();
  }
})();
