# ZENO
### Part of the Eclipse Family

A browser-based game launcher and dashboard that runs entirely client-side. No server required. Games are served through a Service Worker, persisted in IndexedDB, and survive browser restarts without re-uploading. Zeno lets users decide the parameters of how many files are stored, preventing a fixed number.

---

## Files

| File | Description |
|------|-------------|
| `index.html` | Main dashboard / home screen |
| `games.html` | Game library and launcher |
| `zeno-game-sw.js` | Service Worker — intercepts fetches and serves game files from memory |

---

## Features

### Dashboard (`index.html`)
- Live clock and date
- Personalized greeting stored in `localStorage`
- App grid with links to Games, Browser, Terminal, GBA, Settings
- **Cloak system** — disguises the browser tab with a fake title and favicon. Includes presets (Google Classroom, Khan Academy, Google Docs, Desmos, Wikipedia, Quizlet) and a custom title input. Cloak state persists across page reloads.

### Game Library (`games.html`)

#### Loading Games
**Manual upload** — drag and drop up to 5 game folders at once into the slot grid, or use the ADD GAMES button which opens a 5-slot modal. Each slot validates that an `index.html` exists before accepting. A bulk drop zone auto-fills multiple slots from a single drop.

**Git Import** — import games directly from any Git forge by pasting a repo URL. Supports:
- **GitHub** (`github.com`)
- **GitLab** (`gitlab.com` or any self-hosted instance)
- **Forgejo / Gitea** (`git.gay`, `codeberg.org`, `gitea.com`, and any compatible instance)
- Bare `owner/repo` shorthand defaults to `git.gay`

Scans the repo tree for top-level folders containing `index.html`, shows a checklist of found games, and downloads only the ones you select. Includes a fallback to the Forgejo contents API (base64) if raw file fetching fails.

**R2 Import** — import games hosted on Cloudflare R2. Paste a full R2 link (`https://pub-xxx.r2.dev/game-name/index.html`) or just a folder name if the base URL is already saved. Games are iframed directly from R2 — no downloading or SW registration needed. Queue multiple games before loading.

#### Persistence
All manually uploaded and Git-imported games are saved to **IndexedDB** after loading. On next page open, games are automatically restored and re-registered with the Service Worker — no re-uploading needed. R2 games persist as a URL reference only (no files stored).

#### Playing Games
Click any game card to launch it in a fullscreen modal iframe. A fullscreen toggle button is available in the modal header. The modal loading spinner hides once the game is ready.

Before loading, the page pings the Service Worker to check if the game's files are still registered. If the SW was restarted (browser killed it to save memory), files are automatically re-registered from the stored `File` objects before the iframe loads — eliminating the 404 errors that happen when the SW restarts.

#### Other
- Game search / filter bar
- Delete individual games (removes from IndexedDB and SW)
- Service Worker status badge (PENDING / SW LIVE / SW ERR)
- Time-of-day greeting with saved username

---

## How the Service Worker Works

`zeno-game-sw.js` intercepts all fetch requests to `/zeno-games/{gameId}/*` and serves files from an in-memory `Map`. When the page registers a game, it transfers all file buffers to the SW via `postMessage`. The SW responds with a `GAME_REGISTERED` confirmation.

Because the SW's `fileStore` is in-memory only, it resets every time the browser kills and restarts the SW. Zeno handles this by:
1. Storing original `File` objects in the `games` array in page memory
2. Before launching a game, sending a `PING_GAME` message to check if files are present
3. If the SW responds `GAME_MISSING`, re-reading the files and re-registering before loading the iframe

File buffers are always **cloned** (`.slice(0)`) before transfer so the originals in `fileRecords` stay intact and can be re-sent as many times as needed.

---

## Setup

Zeno requires an HTTP server — it won't work from `file://` because Service Workers need HTTPS or `localhost`.

```bash
# Any static server works, e.g.:
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080` (or whatever port) in your browser.

### Requirements
- A modern browser with Service Worker support (Chrome, Edge, Firefox, Safari 16.4+)
- Served over HTTP/HTTPS — not `file://`

---

## Game Folder Structure

For manual uploads and Git imports, each game must be a folder with an `index.html` at the top level:

```
my-game/
├── index.html      ← required
├── game.js
├── style.css
├── assets/
│   ├── sprite.png
│   └── sound.ogg
└── ...
```

All assets (JS, CSS, images, audio, fonts, WASM) are served by the SW with correct MIME types. Relative paths in `index.html` work as normal.

---

## Git Import Notes

- The scan uses **2 API requests** per repo (repo info + file tree), well within GitHub's 60 unauthenticated requests/hour limit
- GitLab tree API is paginated — Zeno fetches up to 100 files per page automatically
- Only **top-level** folders with an `index.html` are detected as games. Nested games (e.g. `games/subgame/index.html`) are not picked up
- Single-game repos (root `index.html`) are detected and listed as the repo name

---

## R2 Import Notes

- R2 games are served as direct iframes — the R2 bucket must have public access enabled and CORS configured to allow the page's origin
- The base URL is saved to `localStorage` so you only need to enter it once
- R2 games do not use the Service Worker and do not require re-registration after SW restarts

---

## Browser Storage

| Storage | Used for |
|---------|----------|
| `localStorage` | Username, cloak settings, R2 base URL |
| `IndexedDB` (`zeno-games-db`) | Game metadata + all file buffers for uploaded/Git-imported games |
| Service Worker memory | Active file serving during the session |

---

## Known Limitations

- Games are stored in IndexedDB for the lifetime of the browser profile. Clearing site data will remove all saved games.
- Very large games (hundreds of MB) may hit IndexedDB storage quotas depending on the browser and available disk space.
- The SW in-memory store resets on SW restart, but Zeno automatically re-registers games on next launch so this is transparent to the user.
- Git import on GitHub may be rate-limited (60 requests/hour unauthenticated) if scanning many repos in quick succession.
- Network-restricted environments (e.g. school networks) may block `raw.githubusercontent.com` for Git downloads — use `git.gay` or another accessible Forgejo instance instead.