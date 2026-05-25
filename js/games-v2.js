/* ZENO V2 — Games page integration */
(function () {
  function initGamesV2() {
    document.body.classList.add('games-v2');

    if (localStorage.getItem('zeno_v2_setup_complete') === 'true') {
      document.getElementById('welcomeModal')?.remove();
    }

    document.querySelector('.scanlines')?.remove();

    if (typeof zenoBoot === 'function') {
      zenoBoot({
        page: 'games',
        nav: 'GAMES',
        lock: false,
        navOpts: {
          search: true,
          onSearch: (q) => {
            const si = document.getElementById('searchInput');
            if (si) {
              si.value = q;
              si.dispatchEvent(new Event('input'));
            }
            if (typeof filterGames === 'function') filterGames();
          },
        },
      });
    }

    const searchInput = document.getElementById('searchInput');
    const navSearch = document.getElementById('zenoNavSearch');
    if (searchInput && navSearch) {
      navSearch.value = searchInput.value || '';
      navSearch.addEventListener('input', (e) => {
        searchInput.value = e.target.value;
        searchInput.dispatchEvent(new Event('input'));
      });
      searchInput.addEventListener('input', () => {
        navSearch.value = searchInput.value;
      });
    }

    document.addEventListener('click', (e) => {
      const menu = document.getElementById('overflowMenu');
      const btn = document.getElementById('overflowBtn');
      if (menu?.classList.contains('open') && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
      }
    });

    if (window.ZenoAI) {
      ZenoAI.registerHandler('navigate', (a) => navigateTo(a.target));
      ZenoAI.registerHandler('launch_game', (a) => {
        const g = (window.games || []).find((x) => x.id === a.id);
        if (g && window.openGameModal) openGameModal(g);
      });
      ZenoAI.registerHandler('search', (a) => {
        const si = document.getElementById('searchInput');
        const ns = document.getElementById('zenoNavSearch');
        if (si) {
          si.value = a.query;
          si.dispatchEvent(new Event('input'));
        }
        if (ns) ns.value = a.query;
      });
      ZenoAI.registerHandler('open_add_games', () => {
        if (typeof openAddModal === 'function') openAddModal('zenoapps');
      });
    }

    window.zenoPageContextExtra = {
      totalGames: (window.games || []).length,
      favorites: typeof getFavorites === 'function' ? getFavorites() : [],
      availableActions: ['navigate', 'launch_game', 'search', 'open_add_games'],
    };

    syncUsernameFromV2();
    if (typeof syncGamesStats === 'function') syncGamesStats();
  }

  function syncUsernameFromV2() {
    const v2Name = localStorage.getItem('zeno_username');
    if (v2Name) {
      localStorage.setItem('zeno-username', v2Name);
      if (typeof window.updateGreeting === 'function') window.updateGreeting();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGamesV2);
  } else {
    initGamesV2();
  }
})();
