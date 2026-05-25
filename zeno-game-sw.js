// Zeno Game Service Worker — v2.0.1
// Created by Mizzery for Zeno Services - Eclipse Developers - https://eclipsesuite.org
// Must live at site root so scope "./" can cover /zeno-games/* and all pages.

const SW_VERSION = '2.0.1';
const fileStore = new Map();

const MIME_TYPES = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

function extMime(path) {
  const i = path.lastIndexOf('.');
  if (i < 0) return 'application/octet-stream';
  return MIME_TYPES[path.slice(i).toLowerCase()] || 'application/octet-stream';
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== `zeno-v${SW_VERSION}`).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  const port = event.ports[0];

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (type === 'REGISTER_GAME') {
    const { gameId, filesMeta, buffers } = payload;
    for (let i = 0; i < filesMeta.length; i++) {
      const { path, mimeType } = filesMeta[i];
      const key = `/zeno-games/${gameId}/${path}`;
      fileStore.set(key, { buffer: buffers[i], mimeType: mimeType || extMime(path) });
    }
    if (port) port.postMessage({ type: 'GAME_REGISTERED', gameId });
    return;
  }

  if (type === 'PING_GAME') {
    const { gameId } = payload;
    const prefix = `/zeno-games/${gameId}/`;
    const found = [...fileStore.keys()].some((k) => k.startsWith(prefix));
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

  if (type === 'LIST_GAMES') {
    const gameIds = new Set();
    for (const key of fileStore.keys()) {
      const match = key.match(/^\/zeno-games\/([^/]+)\//);
      if (match) gameIds.add(match[1]);
    }
    if (port) port.postMessage({ type: 'GAMES_LIST', gameIds: [...gameIds] });
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
    if (part === '..') {
      if (out.length > 1) out.pop();
    } else if (part !== '.') out.push(part);
  }
  return out.join('/');
}
