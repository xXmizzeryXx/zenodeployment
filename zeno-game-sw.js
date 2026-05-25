// Zeno Game Service Worker - v2.1.0
// Created by Mizzery for Zeno Services - Eclipse Developers - https://eclipsesuite.org
// Must live at site root so scope "./" can cover /zeno-games/* and all pages.

const SW_VERSION = '2.1.0';
const GAME_CACHE = 'zeno-game-files';
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

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('zeno-v') && key !== `zeno-v${SW_VERSION}`)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
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
    event.waitUntil(
      registerGame(payload)
        .then(() => {
          if (port) port.postMessage({ type: 'GAME_REGISTERED', gameId: payload.gameId });
        })
        .catch((error) => {
          if (port) {
            port.postMessage({
              type: 'GAME_REGISTER_FAILED',
              gameId: payload?.gameId,
              error: String(error),
            });
          }
        })
    );
    return;
  }

  if (type === 'PING_GAME') {
    const { gameId } = payload || {};
    event.waitUntil(
      hasGame(gameId).then((found) => {
        if (port) port.postMessage({ type: found ? 'GAME_FOUND' : 'GAME_MISSING', gameId });
      })
    );
    return;
  }

  if (type === 'UNREGISTER_GAME') {
    event.waitUntil(unregisterGame(payload?.gameId));
    return;
  }

  if (type === 'CLEAR_ALL') {
    fileStore.clear();
    event.waitUntil(clearGameCache());
    return;
  }

  if (type === 'LIST_GAMES') {
    event.waitUntil(
      listGames().then((gameIds) => {
        if (port) port.postMessage({ type: 'GAMES_LIST', gameIds });
      })
    );
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.includes('/zeno-games/')) return;
  event.respondWith(resolveGameRequest(url));
});

async function registerGame(payload) {
  const { gameId, filesMeta, buffers } = payload || {};
  if (!gameId || !Array.isArray(filesMeta) || !Array.isArray(buffers)) {
    throw new Error('invalid game payload');
  }

  await unregisterGame(gameId);
  const cache = await caches.open(GAME_CACHE);
  await Promise.all(filesMeta.map(async ({ path, mimeType }, index) => {
    const safePath = normalizePath('/' + String(path || '').replace(/\\/g, '/')).replace(/^\/+/, '');
    const key = `/zeno-games/${gameId}/${safePath}`;
    const type = mimeType || extMime(safePath);
    const buffer = buffers[index];

    fileStore.set(key, { buffer, mimeType: type });
    await cache.put(toRequest(key), new Response(buffer.slice(0), {
      status: 200,
      headers: gameHeaders(type),
    }));
  }));
}

async function resolveGameRequest(url) {
  const normalized = normalizePath(url.pathname);
  const entry = fileStore.get(normalized);
  if (entry) {
    return new Response(entry.buffer.slice(0), {
      status: 200,
      headers: gameHeaders(entry.mimeType),
    });
  }

  const cache = await caches.open(GAME_CACHE);
  const cached = await cache.match(toRequest(normalized));
  if (cached) return cached;

  const fallbackKey = normalized.replace(/\/[^/]+$/, '/index.html');
  const fallbackEntry = fileStore.get(fallbackKey);
  if (fallbackEntry) {
    return new Response(fallbackEntry.buffer.slice(0), {
      status: 200,
      headers: gameHeaders('text/html'),
    });
  }

  const fallback = await cache.match(toRequest(fallbackKey));
  if (fallback) return fallback;

  return new Response(`404: ${normalized}`, {
    status: 404,
    headers: gameHeaders('text/plain'),
  });
}

async function hasGame(gameId) {
  if (!gameId) return false;
  const prefix = `/zeno-games/${gameId}/`;
  if ([...fileStore.keys()].some((key) => key.startsWith(prefix))) return true;

  const cache = await caches.open(GAME_CACHE);
  const keys = await cache.keys();
  return keys.some((request) => new URL(request.url).pathname.startsWith(prefix));
}

async function unregisterGame(gameId) {
  if (!gameId) return;
  const prefix = `/zeno-games/${gameId}/`;
  for (const key of [...fileStore.keys()]) {
    if (key.startsWith(prefix)) fileStore.delete(key);
  }

  const cache = await caches.open(GAME_CACHE);
  const keys = await cache.keys();
  await Promise.all(keys.map((request) => (
    new URL(request.url).pathname.startsWith(prefix) ? cache.delete(request) : Promise.resolve(false)
  )));
}

async function clearGameCache() {
  const cache = await caches.open(GAME_CACHE);
  const keys = await cache.keys();
  await Promise.all(keys.map((request) => (
    new URL(request.url).pathname.includes('/zeno-games/') ? cache.delete(request) : Promise.resolve(false)
  )));
}

async function listGames() {
  const gameIds = new Set();
  for (const key of fileStore.keys()) {
    const match = key.match(/^\/zeno-games\/([^/]+)\//);
    if (match) gameIds.add(match[1]);
  }

  const cache = await caches.open(GAME_CACHE);
  for (const request of await cache.keys()) {
    const match = new URL(request.url).pathname.match(/^\/zeno-games\/([^/]+)\//);
    if (match) gameIds.add(match[1]);
  }
  return [...gameIds];
}

function toRequest(path) {
  return new Request(new URL(path, self.location.origin).href);
}

function gameHeaders(mimeType) {
  return {
    'Content-Type': mimeType || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  };
}

function normalizePath(path) {
  const parts = path.split('/');
  const out = [];
  for (const part of parts) {
    if (part === '..') {
      if (out.length > 1) out.pop();
    } else if (part !== '.') {
      out.push(part);
    }
  }
  return out.join('/');
}
