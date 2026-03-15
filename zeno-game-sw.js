// Zeno Game Service Worker (v2.1)
// Intercepts fetches to /zeno-games/{gameId}/* and serves from in-memory store

const fileStore = new Map(); // key: "/zeno-games/{id}/{relPath}" -> { buffer: ArrayBuffer, mimeType: string }

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  const port = event.ports[0];

  if (type === 'REGISTER_GAME') {
    const { gameId, filesMeta, buffers } = payload;
    for (let i = 0; i < filesMeta.length; i++) {
      const { path, mimeType } = filesMeta[i];
      const key = `/zeno-games/${gameId}/${path}`;
      fileStore.set(key, { buffer: buffers[i], mimeType });
    }
    if (port) port.postMessage({ type: 'GAME_REGISTERED', gameId });
    return;
  }

  if (type === 'PING_GAME') {
    // Check if at least one file for this game is still in the store
    const { gameId } = payload;
    const prefix = `/zeno-games/${gameId}/`;
    const found = [...fileStore.keys()].some(k => k.startsWith(prefix));
    if (port) port.postMessage({ type: found ? 'GAME_FOUND' : 'GAME_MISSING', gameId });
    return;
  }

  if (type === 'UNREGISTER_GAME') {
    const { gameId } = payload;
    const prefix = `/zeno-games/${gameId}/`;
    for (const key of fileStore.keys()) {
      if (key.startsWith(prefix)) fileStore.delete(key);
    }
    return;
  }

  if (type === 'CLEAR_ALL') {
    fileStore.clear();
    return;
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.includes('/zeno-games/')) return;

  const normalized = normalizePath(url.pathname);
  const entry = fileStore.get(normalized);

  if (entry) {
    event.respondWith(
      new Response(entry.buffer, {
        status: 200,
        headers: {
          'Content-Type': entry.mimeType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      })
    );
  } else {
    // Try index.html fallback for SPA-style games
    const fallbackKey = normalized.replace(/\/[^/]+$/, '/index.html');
    const fallback = fileStore.get(fallbackKey);
    if (fallback) {
      event.respondWith(
        new Response(fallback.buffer, {
          status: 200,
          headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' },
        })
      );
    } else {
      event.respondWith(new Response(`404: ${normalized}`, { status: 404 }));
    }
  }
});

function normalizePath(p) {
  const parts = p.split('/');
  const out = [];
  for (const part of parts) {
    if (part === '..') { if (out.length > 1) out.pop(); }
    else if (part !== '.') out.push(part);
  }
  return out.join('/');
}