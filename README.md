<div align="center">

# ⚡ ZENO V2

**A browser-native gaming and media operating system.**

*Your platform. Your rules.*

![Version](https://img.shields.io/badge/version-2.0.0-00f5ff?style=flat-square)
![License](https://img.shields.io/badge/license-GPL%20v3-bf00ff?style=flat-square)
![No Build Tools](https://img.shields.io/badge/build%20tools-none-ff006e?style=flat-square)
![Static Deploy](https://img.shields.io/badge/deploy-static-00f5ff?style=flat-square)

</div>

---

ZENO is a premium, browser-native platform that transforms a static website into a personalized digital vault — a place to organize, launch, and expand your own ecosystem of games, apps, and media. It feels like software, not a webpage. When you open it, you boot into a system.

ZENO is part of the **Eclipse Family** — a suite of browser-based tools and experiences.

---

## What ZENO Is

ZENO simultaneously functions as:

- **A game launcher** — like Steam Big Picture or an Xbox dashboard, for the browser
- **A media vault** — your personal streaming and watchlist library
- **A browser-based OS** — a lightweight operating environment inside any tab
- **A self-hosted game ecosystem** — you own your content, nothing is preloaded

## What ZENO Is Not

ZENO is not a game website. It is not a media aggregator. It is not a dashboard template. It does not behave like a webpage. It is a **platform**.

---

## Features

### Game Library
- **Manual upload** — drag and drop up to 5 game folders at a time; each is validated for an `index.html` entry point
- **Git import** — paste any GitHub, GitLab, Forgejo, Gitea, or Codeberg repo URL; ZENO scans the tree, shows a checklist of found games, and downloads only what you select
- **R2 import** — stream games directly from Cloudflare R2 with no downloading required
- **Persistent storage** — all uploaded and imported games are saved to IndexedDB and survive browser restarts with no re-uploading
- **Service Worker serving** — a custom SW intercepts game requests and serves all assets (JS, CSS, images, audio, WASM, fonts) with correct MIME types, with automatic re-registration if the SW is ever restarted

### Dashboard
- Personalized greeting and live clock
- App grid with instant navigation to all ZENO sections
- Recently played row pulled from your session history
- Lock screen with optional SHA-256 hashed local password
- Full-bleed wallpaper on every page

### ZENO Stream
- Movies and TV watchlist with filter and search
- Watchlist count badge on the dashboard

### AI Assistant (ZenoAI)
- Groq-powered AI built into the platform via a floating robot button on every page
- Users provide their own Groq API key to use ZenoAI. Users also have the option to add custom instructions to the AI.
- Full AI terminal page (`ai.html`) with markdown rendering

### Themes
Three distinct visual modes, chosen at setup and changeable at any time in Settings:

| Theme | Description |
|---|---|
| **Default** | Refined cyberpunk — near-black background, neon cyan/pink/purple accents, grid overlay, scanlines, glitch micro-animations |
| **Glass** | Liquid glass — frosted panels with real `backdrop-filter` blur, wallpaper always visible behind everything, clean and calm |
| **Blend** | Neon glass hybrid — glass panel structure with cyberpunk neon accents; best of both worlds |

Switching themes is a single CSS class swap — no DOM manipulation, no flash.

### Onboarding (OOBE)
A first-run setup experience that rivals a real OS:
1. Welcome splash with animated ZENO wordmark
2. Display name, profile picture, optional local password
3. Theme selection — each card self-demonstrates its own aesthetic
4. Accent color picker with live preview
5. Wallpaper selection — curated Unsplash gallery, local upload, or none
6. Confirmation screen with setup summary

### Tab Cloaking
Disguise the browser tab with a fake title and favicon. Presets include Google Classroom, Khan Academy, Google Docs, Desmos, Wikipedia, and Quizlet. Custom titles supported. Cloak state persists across reloads.

---

## Tech Stack

ZENO has no build step and no dependencies.

- **Pure HTML, CSS, and vanilla JavaScript** — no React, no Vue, no TypeScript, no bundlers
- **Service Worker** for in-browser game file serving
- **IndexedDB** for persistent game storage
- **localStorage** for all user preferences and state
- **Groq API** for AI assistant functionality
- **Font Awesome 6** (CDN) for all iconography — no emojis anywhere
- **Google Fonts** — Orbitron, Rajdhani, Plus Jakarta Sans, JetBrains Mono

---

## File Structure

```
index.html           — Dashboard / Home
games.html           — Game library and launcher
movies.html          — ZENO Stream (movies + TV)
ai.html              — AI terminal / assistant
settings.html        — System settings (ZENO Core)
console.html         — Browser / console app
onboarding.html      — First-run OOBE (runs once)
404.html             — Not found page
zeno-v2-core.css     — Shared CSS variables, theme classes, layout primitives
zeno-v2-core.js      — Shared utilities: theme engine, localStorage, ZenoAI bridge
zeno-game-sw.js      — Service Worker for game file serving
```

---

## Getting Started

ZENO requires an HTTP server — Service Workers do not work from `file://`. Any static server will do:

```bash
# Node
npx serve .

# Python
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

**Browser requirements:** Chrome, Edge, Firefox, or Safari 16.4+ (Service Worker support required).

### Deployment

ZENO is a fully static frontend — deploy anywhere:

- GitHub Pages
- Vercel
- Netlify
- Cloudflare Pages
- Any static host

No server-side configuration needed.

---

## Game Folder Format

Games must be self-contained folders with an `index.html` entry point:

```
my-game/
├── index.html      ← required
├── game.js
├── style.css
└── assets/
    ├── sprite.png
    └── sound.ogg
```

All assets are served by the Service Worker with correct MIME types. Relative paths in `index.html` work as normal.

---

## Known Limitations

- Games stored in IndexedDB are tied to the browser profile — clearing site data removes all games
- Very large games (hundreds of MB) may hit IndexedDB storage quotas
- GitHub Git import is subject to a 60 unauthenticated API requests/hour rate limit
- Network-restricted environments (e.g. school networks) may block `raw.githubusercontent.com` — use a Forgejo/Gitea instance (e.g. `git.gay`, `codeberg.org`) as an alternative

---

## Design Philosophy

Every decision in ZENO serves four principles:

- **Fast** — immediate interactions, lightweight rendering, instant transitions
- **Minimal** — no clutter, no noise, everything exists for a reason
- **Beautiful** — rounded corners, glassmorphism, meaningful motion, high polish
- **Personal** — your games, your media, your wallpaper, your identity; the more you use it, the more it feels like yours

---

## License

ZENO is licensed under the [GNU General Public License v3.0](LICENSE).

This means you are free to use, study, modify, and distribute ZENO — but any derivative work must also be released under the GPL v3, with source code made available.

---

<div align="center">

*ZENO is not a website. It is an experience. It is a platform. It is yours.*

**Part of the Eclipse Family.**

</div>