# ZENO V2 — Complete Build Prompt
### For any AI system, developer, or builder tasked with constructing ZENO V2 from scratch

---

# PART 1 — WHAT ZENO IS

Before writing a single line of code, internalize what ZENO actually is. This is not optional context. This defines every decision you will make.

## The One-Sentence Definition

**ZENO is a premium browser-native gaming and media operating system that transforms a website into a personalized digital vault where users can organize, launch, and expand their own ecosystem of games, apps, and media with a modern, platform-like experience.**

## What ZENO Is Not

ZENO is not a game website. It is not a media aggregator. It is not a dashboard template. It is not a portal. It does not feel like a webpage. It does not behave like a webpage.

ZENO is a **platform**. It is a **browser-based operating environment**. When users open it, they feel like they have entered software — not loaded a URL.

## What ZENO Combines

ZENO simultaneously functions as:
- A game launcher (like Steam Big Picture or Xbox dashboard)
- A media vault (like a personal streaming library)
- A browser-based operating system (like a lightweight OS in the browser)
- A self-hosted game ecosystem (user-owned content, not preloaded)
- A modern app platform (ZENOAPPS live inside it like native apps)

## The Core Philosophy — Four Pillars

Every design decision, every feature, every animation, every line of CSS must serve these four principles. They are not aspirational. They are requirements.

### 1. FAST
Everything must feel immediate. There should be minimal loading, fast transitions, lightweight rendering, and instant interactions. The platform should feel closer to opening apps than loading webpages. If something feels slow, it is wrong.

### 2. MINIMAL
The interface must avoid clutter. Users should never feel overwhelmed. Everything exists for a reason. Whitespace, spacing, and visual hierarchy are not decoration — they are structure. If an element does not serve a clear purpose, remove it.

### 3. BEAUTIFUL
Visual quality is non-negotiable. ZENO must feel premium. The UI leans toward rounded corners, glassmorphism, soft blur, meaningful motion, large visuals, smooth transitions, and high polish. Inspirations include iOS, Xbox dashboard, Steam Big Picture, Apple TV, and console launchers — but ZENO must maintain its own visual identity. It must not look like any of those. It must look like ZENO.

### 4. PERSONAL
ZENO belongs to the user. Instead of forcing prebuilt content, users shape the experience. The platform becomes their own vault. Their games. Their media. Their settings. Their wallpaper. Their identity. The more a user uses ZENO, the more it feels like theirs.

## How ZENO Works — Core Architecture

ZENO is a **frontend-driven platform**. It requires no backend server. It deploys on GitHub Pages, Vercel, Netlify, Cloudflare Pages, or any static host. This is intentional. Portability is a feature.

The frontend acts as the operating environment. Game data and configuration determine what appears in the UI. Everything persists client-side via `localStorage` and `IndexedDB`. A Service Worker handles in-browser game file serving.

**ZENO is part of the Eclipse Family.** The Eclipse family is a suite of browser-based tools and experiences. ZENO is the gaming and media arm. References to "Eclipse" in UI copy (e.g. "Eclipse Services", "Eclipse Suite") are correct and intentional.

## What Makes ZENO Different

Most game sites dump content, feel cluttered, and have poor organization. ZENO focuses on experience, polish, personalization, ownership, and ecosystem building. The goal is not to become another game website. The goal is to become the browser-native gaming platform.

## The User Experience Goal

When users open ZENO, they should immediately feel like they entered a digital platform. The startup should include smooth loading animations, polished transitions, immediate responsiveness, and strong visual identity. Opening ZENO should feel intentional — like booting into a system, not refreshing a browser tab.

## ZENOAPPS

ZENOAPPS are modular experiences that function like native applications inside the ZENO ecosystem. Examples include utility apps, browsers, media players, custom tools, and internal platform features. Launching a ZENOAPP should feel like opening a window or entering a mode — not navigating to a new page.

## The Empty State Philosophy

An empty ZENO installation should still feel intentional. Instead of a blank screen, users receive onboarding that teaches them what the platform is. The empty state flow is: **ZENOAPPS → YOUR OWN GAMES → PLAY**. This teaches: install apps, add games, start playing. Setup becomes onboarding.

## Navigation Philosophy

Navigation must feel app-like. No clunky reloads. No traditional webpage feeling. Expected behaviors include smooth transitions, instant page changes, preserved state, and responsive interaction. Users should feel like they are operating software, not clicking links.

## Context Rules for Any AI Building ZENO

- Treat it as a platform, not a website
- Prioritize premium UX above all else
- Focus on smoothness and responsiveness
- Assume frontend-first architecture always
- Prefer modular, expandable systems
- Avoid clutter ruthlessly
- Think operating system, think launcher, think console dashboard
- Treat customization as a core feature, not a bonus
- Design for scalability
- Maintain modern visuals
- ZENO must always feel: **Minimal + Premium + Fast + Personal**

---

# PART 2 — ZENO V1 EXISTING FEATURES

V2 is built on top of V1. Every V1 feature must be preserved unless explicitly upgraded. This section documents what already exists and must carry forward.

## V1 Dashboard (index.html)
- Live clock and date display, updates every second
- Personalized greeting pulled from `localStorage` (username)
- App grid with icon links: Games, Browser, Terminal, Movies, Settings
- **Cloak System** — disguises the browser tab with a fake title and favicon
  - Presets: Google Classroom, Khan Academy, Google Docs, Desmos, Wikipedia, Quizlet
  - Custom title input
  - Cloak state persists in `localStorage` across page reloads

## V1 Game Library (games.html)

### Loading Games — Three Methods

**Manual Upload**
- Drag and drop up to 5 game folders into a slot grid
- ADD GAMES button opens a 5-slot modal
- Each slot validates that an `index.html` exists before accepting
- Bulk drop zone auto-fills multiple slots from a single drop

**Git Import**
- Import games from any Git forge by pasting a repo URL
- Supported forges:
  - GitHub (`github.com`)
  - GitLab (`gitlab.com` or any self-hosted instance)
  - Forgejo / Gitea (`git.gay`, `codeberg.org`, `gitea.com`, any compatible instance)
  - Bare `owner/repo` shorthand defaults to `git.gay`
- Scans the repo tree for top-level folders containing `index.html`
- Shows a checklist of found games — downloads only the ones selected
- Fallback to Forgejo contents API (base64) if raw file fetching fails
- Uses 2 API requests per repo — within GitHub's 60 unauthenticated requests/hour limit
- GitLab tree API is paginated — fetches up to 100 files per page automatically
- Only top-level folders with `index.html` are detected. Nested games are not picked up.
- Single-game repos (root `index.html`) are detected and listed as the repo name

**R2 Import**
- Import games hosted on Cloudflare R2
- Paste a full R2 link (`https://pub-xxx.r2.dev/game-name/index.html`) or just a folder name if base URL is saved
- Games are iframed directly from R2 — no downloading or SW registration needed
- Queue multiple games before loading
- Base URL saved to `localStorage` so it only needs to be entered once
- R2 games do not use the Service Worker and do not require re-registration
- R2 bucket must have public access enabled and CORS configured

### Game Persistence
- All manually uploaded and Git-imported games saved to **IndexedDB** (`zeno-games-db`)
- On next page open, games are automatically restored and re-registered with the Service Worker
- No re-uploading needed after browser restart
- R2 games persist as a URL reference only (no files stored in IndexedDB)

### Playing Games
- Click any game card to launch it in a fullscreen modal iframe
- Fullscreen toggle button in modal header
- Modal loading spinner hides once the game is ready
- Before loading, the page pings the Service Worker to check if files are still registered
- If the SW was restarted (browser killed it), files are automatically re-registered from stored `File` objects before the iframe loads — eliminating 404 errors on SW restart

### Other V1 Game Features
- Game search and filter bar
- Delete individual games (removes from IndexedDB and SW)
- Service Worker status badge: PENDING / SW LIVE / SW ERR
- Time-of-day greeting with saved username

## V1 Service Worker (zeno-game-sw.js)

`zeno-game-sw.js` intercepts all fetch requests to `/zeno-games/{gameId}/*` and serves files from an in-memory `Map` called `fileStore`.

**Registration flow:** When a game is registered, all file buffers are transferred to the SW via `postMessage`. The SW responds with `GAME_REGISTERED`.

**SW restart handling:** Because `fileStore` is in-memory only, it resets when the browser kills and restarts the SW. ZENO handles this by:
1. Storing original `File` objects in the `games` array in page memory
2. Before launching a game, sending `PING_GAME` to check if files are present
3. If SW responds `GAME_MISSING`, re-reading the files and re-registering before loading the iframe

File buffers are always cloned (`.slice(0)`) before transfer so originals stay intact for re-sending.

**Message types:** `REGISTER_GAME`, `PING_GAME`, `UNREGISTER_GAME`, `CLEAR_ALL`

**Fetch fallback:** If a specific file is not found, tries an `index.html` fallback for SPA-style games. Returns a proper 404 response if nothing matches.

## V1 Browser Storage Map

| Storage | Used for |
|---|---|
| `localStorage` | Username, cloak settings, R2 base URL |
| `IndexedDB` (`zeno-games-db`) | Game metadata + all file buffers for uploaded/Git-imported games |
| Service Worker memory | Active file serving during the current session |

## V1 Known Limitations (to be addressed or acknowledged in V2)
- Games stored in IndexedDB for the lifetime of the browser profile — clearing site data removes all games
- Very large games (hundreds of MB) may hit IndexedDB storage quotas
- Git import on GitHub may be rate-limited (60 requests/hour unauthenticated) if scanning many repos quickly
- Network-restricted environments (e.g. school networks) may block `raw.githubusercontent.com` — use `git.gay` or another accessible Forgejo instance instead

## V1 Setup Requirements
- Requires an HTTP server — will not work from `file://` because Service Workers need HTTPS or `localhost`
- Works with any static server: `npx serve .` or `python3 -m http.server 8080`
- Requires a modern browser with Service Worker support: Chrome, Edge, Firefox, Safari 16.4+

## V1 Game Folder Structure (must be preserved)
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

# PART 3 — ABSOLUTE TECHNICAL CONSTRAINTS

These are non-negotiable. Every file in V2 must comply.

- **Pure HTML, CSS, and vanilla JavaScript only**
- **No React. No Vue. No Svelte. No frameworks of any kind.**
- **No Vite. No TypeScript. No build tools. No npm. No bundlers.**
- **No component libraries.**
- Every page is a **self-contained `.html` file** — same architecture as V1
- Shared styles in `zeno-v2-core.css` — linked in every page
- Shared JS utilities in `zeno-v2-core.js` — linked in every page before `</body>`
- Icons are **Font Awesome 6 exclusively** — loaded via CDN. Zero emojis anywhere in the UI.
- Fonts loaded from Google Fonts
- External CDN libraries (e.g. `cdnjs.cloudflare.com`) are allowed only for specific utilities (e.g. `marked.js` for markdown rendering in the AI terminal)
- Service Worker file (`zeno-game-sw.js`) must be preserved and extended from V1, never replaced wholesale

---

# PART 4 — FILE STRUCTURE

Produce the following files:

```
index.html           — Dashboard / Home
games.html           — Game library and launcher
movies.html          — ZENO Stream (movies + TV)
ai.html              — AI terminal / assistant (full page)
settings.html        — System settings (ZENO Core)
console.html         — Browser / console app
404.html             — Not found page
onboarding.html      — First-run OOBE (runs once, gated by localStorage)
zeno-v2-core.css     — Shared CSS variables, resets, layout primitives, theme classes
zeno-v2-core.js      — Shared JS utilities: theme, localStorage, AI bridge (ZenoAI)
zeno-game-sw.js      — Enhanced Service Worker (V1 logic preserved + V2 additions)
```

---

# PART 5 — VISUAL IDENTITY & THEME SYSTEM

## Three Themes

ZV2 ships with three distinct visual modes, chosen during onboarding and changeable in Settings.

### Theme 1: `default` — Refined Cyberpunk

The evolved V1 aesthetic. Dark backgrounds, neon accents, grid overlays, scanline textures, glitch micro-animations. More premium and intentional than V1 — less visual noise, more deliberate polish. Sharp geometry, high contrast. This is the "ZENO classic" mode.

Design properties:
- Background: near-black `#050508`
- Secondary background: `#0a0a12`
- Primary accent: neon cyan `#00f5ff`
- Secondary accent: neon pink `#ff006e`
- Tertiary accent: neon purple `#bf00ff`
- Card surfaces: `rgba(255,255,255,0.03)` with `rgba(0,245,255,0.12)` borders
- Text: `#e0e8ff`
- Muted text: `#4a5068`
- Grid overlay: `rgba(0,245,255,0.025)` lines at 60px intervals
- Scanlines present at low opacity
- Glitch animations on key headings and the 404 number
- Neon glow effects on interactive elements on hover
- Fonts: Orbitron (headings, logo, labels) + Rajdhani (body, UI text) + JetBrains Mono (terminal/AI)

### Theme 2: `glass` — Liquid Glass macOS Mode

A translucent, frosted-glass aesthetic inspired by macOS Sequoia / visionOS. The wallpaper is always visible behind all panels. UI elements are rendered as floating glass surfaces with real `backdrop-filter` blur, soft shadows, and subtle light refraction borders. Feels premium, calm, and modern.

Design properties:
- All cards/panels (dark variant): `backdrop-filter: blur(24px) saturate(180%)`, `background: rgba(255,255,255,0.08)`
- All cards/panels (light variant): `background: rgba(255,255,255,0.55)`
- Borders: `1px solid rgba(255,255,255,0.2)` with inner highlight `box-shadow: inset 0 1px 0 rgba(255,255,255,0.3)`
- Outer shadow: `0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)`
- Accent: user-chosen (from onboarding), defaulting to Apple blue `#007AFF`
- No scanlines, no grid overlays, no glitch effects
- Transitions use smooth spring-like easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` for interactive elements
- Wallpaper always renders full-bleed and blurred behind all panels
- Fonts: Orbitron (ZENO wordmark only) + Plus Jakarta Sans (all body/UI text) + JetBrains Mono (terminal)

### Theme 3: `blend` — Neon Glass Hybrid

A hybrid mode combining the liquid glass panel structure of `glass` mode with cyberpunk neon colors as accents. The wallpaper shows through glass panels, but neon glows, neon borders, and cyberpunk typography are preserved. Best of both worlds.

Design properties:
- Panels: same `backdrop-filter: blur(24px) saturate(180%)` structure as glass mode
- Accent colors: neon cyan `#00f5ff` + neon pink `#ff006e` (same palette as default mode)
- Scanlines present at reduced opacity (0.03)
- Grid overlay present at reduced opacity (0.015)
- Neon glow effects on hover preserved
- Fonts: Orbitron (headings) + Plus Jakarta Sans (body) + JetBrains Mono (terminal)

## CSS Variables Architecture

All three themes are CSS classes on `<html>`: `theme-default`, `theme-glass`, `theme-blend`. All colors, blur values, border styles, shadow values, and radius values reference CSS variables. Switching themes is a single class swap with no further DOM manipulation.

```css
:root {
  --bg: ;
  --bg2: ;
  --surface: ;
  --surface-border: ;
  --surface-shadow: ;
  --surface-blur: ;
  --accent: ;
  --accent2: ;
  --accent-glow: ;
  --text: ;
  --muted: ;
  --radius: ;
  --radius-lg: ;
  --transition: ;
}
```

The theme class populates all of these. The accent color is additionally overridden inline on `<html>` by JS from `localStorage` before first render.

**Critical:** Apply theme class AND accent color to `<html>` in a `<script>` tag in `<head>` — before any rendering — to prevent flash of wrong theme.

```html
<head>
  <script>
    const t = localStorage.getItem('zeno_theme') || 'default';
    const a = localStorage.getItem('zeno_accent') || '#00f5ff';
    document.documentElement.className = 'theme-' + t;
    document.documentElement.style.setProperty('--accent', a);
  </script>
  <link rel="stylesheet" href="zeno-v2-core.css">
  ...
</head>
```

## Accent Color System

Users pick a primary accent color during onboarding. Stored in `localStorage` as `zeno_accent`. Injected as `--accent` at runtime. Presets:

| Name | Hex |
|---|---|
| Neon Cyan | `#00f5ff` |
| Neon Pink | `#ff006e` |
| Neon Purple | `#bf00ff` |
| Neon Green | `#00ff88` |
| Apple Blue | `#007AFF` |
| Amber | `#f5a623` |
| Custom | hex input |

---

# PART 6 — ONBOARDING (onboarding.html)

## Gate Logic

On every page load, each `.html` file checks `localStorage.getItem('zeno_v2_setup_complete')` in a `<head>` script. If not set, immediately redirect to `onboarding.html`. On completion of onboarding, set `localStorage.setItem('zeno_v2_setup_complete', 'true')` and navigate to `index.html`.

## Design Rules for Onboarding

- Each step occupies the full viewport
- Step indicator dots at the bottom — clickable to go back to earlier steps
- Forward / back navigation buttons on every step
- Animated progress bar across the top of the screen
- The wallpaper selected in Step 5 renders full-bleed and blurred behind all subsequent steps
- All step transitions are horizontal slide animations (current slides left, next slides in from right; back slides right)
- The ZENO logo is always present in the top-left corner of every step

## Step 1 — Welcome

Full-screen splash. Large animated ZENO V2 wordmark (Orbitron, heavy weight). Staggered fade-in for tagline and subtitle. Single CTA button.

Content:
- ZENO wordmark with subtle glow animation
- Tagline: `"Your platform. Your rules."`
- Subtitle: `"Let's set up your environment."`
- CTA button: `BEGIN SETUP` with Font Awesome `fa-arrow-right` icon

## Step 2 — Profile

Inputs:
- **Display Name** — text input, stored as `localStorage.setItem('zeno_username', value)`
- **Profile Picture** — file input (accepts image/*), converted to base64, stored as `localStorage.setItem('zeno_avatar', base64String)`. Shows circular preview immediately on file select.
- **Local Password** (optional) — two fields: "Set password" + "Confirm password". Hashed via SHA-256 using the Web Crypto API. Stored as `localStorage.setItem('zeno_pin_hash', hashHex)`. If set, ZENO shows a lock screen overlay on future loads before revealing the dashboard. "Skip" link available — skipping stores nothing.

## Step 3 — Choose Your Theme

Three large interactive cards, one per theme. Each card is visually distinct and self-demonstrates its own aesthetic (the card itself renders in that theme's style). Animated on hover — lift + glow in theme's accent color. Clicking selects it with a clear highlighted state and checkmark icon.

Cards:
- **Default** — dark card, neon cyan border glow, grid lines in background, Orbitron text
- **Glass** — frosted glass card with a blurred mountain landscape behind it, clean sans-serif text
- **Blend** — frosted glass card with neon cyan/pink border glow, grid lines at low opacity

Selection stored as `localStorage.setItem('zeno_theme', 'default'|'glass'|'blend')`. Selecting a theme immediately applies its CSS class to `<html>` so the onboarding itself transforms.

## Step 4 — Accent Color

Swatch picker grid of preset colors + a hex input field. Selecting a preset or typing a hex immediately updates `document.documentElement.style.setProperty('--accent', value)` so the user sees the change live across the entire onboarding UI. Stored as `localStorage.setItem('zeno_accent', value)`.

## Step 5 — Wallpaper

Three sub-tabs:

**Unsplash Gallery**
No API key required. Use a hardcoded curated list of 12 free Unsplash photos (landscape orientation, no watermark, freely usable). Each entry is an object with a `thumb` URL (for the picker grid thumbnail) and a `full` URL (for actual wallpaper use). Use Unsplash's source URLs in this format:

- Thumb: `https://images.unsplash.com/photo-{PHOTO_ID}?w=400&q=80&fit=crop`
- Full: `https://images.unsplash.com/photo-{PHOTO_ID}?w=1920&q=90&fit=crop`

Use the following 12 photo IDs — all are free-to-use Unsplash stock photos with no watermark:

```javascript
const WALLPAPERS = [
  { id: '1419242902474', label: 'Dark Mountains' },
  { id: '1446776811106', label: 'Space Nebula' },
  { id: '1464822759023', label: 'Night Forest' },
  { id: '1451187580459', label: 'Galaxy' },
  { id: '1506905925346', label: 'Ocean Cliffs' },
  { id: '1493514789931', label: 'Snowy Peaks' },
  { id: '1542273917363', label: 'Abstract Dark' },
  { id: '1531297484001', label: 'Cyberpunk City' },
  { id: '1520034475321', label: 'Aurora' },
  { id: '1475274047050', label: 'Dark Valley' },
  { id: '1534796636912', label: 'Misty Forest' },
  { id: '1462275646964', label: 'Night Sky' },
];
// Thumb URL pattern: `https://images.unsplash.com/photo-${id}?w=400&q=80&fit=crop`
// Full URL pattern:  `https://images.unsplash.com/photo-${id}?w=1920&q=90&fit=crop`
```

Display all 12 as thumbnail cards in a 4×3 grid. Each card shows the thumbnail image and the label beneath it. Clicking one selects it (highlighted border + checkmark overlay), stores the full URL as `localStorage.setItem('zeno_wallpaper_url', fullUrl)` and `localStorage.setItem('zeno_wallpaper_type', 'url')`.

**Upload Local Image**
File input (accepts image/*). On select, convert to base64 and store as `localStorage.setItem('zeno_wallpaper', base64)` and `localStorage.setItem('zeno_wallpaper_type', 'local')`. Show preview thumbnail.

**None**
Stores `localStorage.setItem('zeno_wallpaper_type', 'none')`. Solid dark background used.

Once a wallpaper is selected (any type), it renders immediately as the blurred full-bleed background of onboarding steps 5 and 6.

## Step 6 — Complete

Animated confirmation screen.

Content:
- Large checkmark icon (`fa-circle-check`) with accent-colored glow, scale-in animation
- Heading: `"YOU'RE ALL SET"`
- Summary card showing: avatar thumbnail, username, theme name, accent color swatch
- CTA button: `ENTER ZENO` with `fa-arrow-right` icon
- On click: applies the selected theme class and accent to `<html>`, sets `zeno_v2_setup_complete`, navigates to `index.html` with a full-screen fade-out transition

---

# PART 7 — DASHBOARD (index.html)

## Lock Screen

If `localStorage.getItem('zeno_pin_hash')` is set, render a lock screen overlay that covers the entire page on load (rendered before the dashboard is visible via a fixed overlay div with `z-index: 9999`).

Lock screen contents:
- Full-bleed wallpaper (same as dashboard background)
- Current time (large, live) and date
- Circular avatar thumbnail (from `zeno_avatar`)
- Username
- Password input field (type="password")
- Unlock button: `UNLOCK` with `fa-unlock` icon
- On submit: hash the input with SHA-256 and compare to `zeno_pin_hash`. On match: fade out the overlay with CSS transition and reveal the dashboard. On mismatch: shake animation on the input, show error text `"Incorrect password"`.

## Wallpaper

The active wallpaper renders full-bleed as a `position: fixed` background image on every page (not just dashboard). Applied in `zeno-v2-core.js` on page load by reading `zeno_wallpaper_type` and either `zeno_wallpaper` (base64) or `zeno_wallpaper_url`. In `default` and `blend` themes, the wallpaper is heavily blurred and darkened (`brightness(0.3) blur(12px)`). In `glass` theme, it's moderately blurred (`brightness(0.6) blur(16px)`) to remain more visible through the glass panels.

## Dashboard Layout

A floating central panel over the wallpaper. Uses the active theme's surface style. The panel should feel like a floating window — not a full-page layout.

### Header Section
- `HELLO,` in muted text (small, Rajdhani or Plus Jakarta Sans)
- `[USERNAME]` in accent color (Orbitron or relevant display font, large)
- Live digital clock (large, neon/accent colored, updates every second via `setInterval`)
- Date below clock (day of week, month, date)
- Avatar thumbnail (top-right of panel, circular, clicking navigates to `settings.html`)

### App Grid

Icon grid of all ZENO sections. Each app is a card with a large Font Awesome icon and a label beneath it. On hover: card lifts (`transform: translateY(-4px)`), icon glows in accent color. On click: page transition then navigate.

| Label | Font Awesome Icon | Link |
|---|---|---|
| GAMES | `fa-gamepad` | games.html |
| STREAM | `fa-film` | movies.html |
| BROWSER | `fa-globe` | console.html |
| TERMINAL | `fa-terminal` | console.html |
| AI | `fa-robot` | ai.html |
| SETTINGS | `fa-gear` | settings.html |

### Recent Activity Row

Below the app grid: a horizontal scrollable row labeled `RECENTLY PLAYED`. Populated from `localStorage.getItem('zeno_recent_games')` — an array of `{id, name, thumbnail, lastPlayed}`. Each item is a small card showing the game thumbnail (or a placeholder icon if none), game name, and relative time (`"2 hours ago"`). Clicking launches the game. If the array is empty, the row is hidden entirely — no empty state shown here (the games page handles that).

### Cloak System (enhanced from V1)

The tab disguise system. In V2, moved to a collapsible section within the dashboard panel (or accessible via a small icon in the panel footer). Features:

- Toggle switch to activate/deactivate the cloak
- Presets dropdown: Google Classroom, Khan Academy, Google Docs, Desmos, Wikipedia, Quizlet
- Custom title text input
- **New in V2:** Custom favicon URL input (paste any image URL to use as the fake favicon)
- State persists in `localStorage` keys: `zeno_cloak_active`, `zeno_cloak_title`, `zeno_cloak_favicon`, `zeno_cloak_preset`
- On page load, if cloak is active, apply the fake title and favicon immediately in `<head>` before render

### Bottom Bar

Three text buttons in the panel footer:
- `CREDITS` — opens a small modal with credits/attribution text
- `WALLPAPER` — opens an inline wallpaper picker (same UI as onboarding Step 5, rendered as a modal overlay)
- `ACCENTS` — opens an inline accent color picker (same swatch picker as onboarding Step 4, rendered as a modal overlay)

Both pickers apply changes live and persist to `localStorage`.

---

# PART 8 — GAMES LIBRARY (games.html)

## Preserve All V1 Features — Exact Behavior

Every V1 games feature listed in Part 2 must be preserved with identical behavior. This includes:
- Manual folder upload (drag-and-drop + 5-slot modal with `index.html` validation)
- Git import (GitHub, GitLab, Forgejo/Gitea, bare shorthand, checklist, fallback API)
- R2 import (direct iframe, URL persistence, multiple queue)
- IndexedDB persistence with SW re-registration on restart
- PING_GAME / GAME_MISSING / re-registration flow
- Game search and filter bar
- Delete individual games
- SW status badge (PENDING / SW LIVE / SW ERR)
- Fullscreen modal iframe launcher with loading spinner
- File buffer cloning before transfer

## V2 Page Layout

**Top bar:** ZENO wordmark → GAMES breadcrumb (slash-separated) | Search bar (center) | Greeting + avatar + SW status badge + ADD GAMES button (right)

**Main area:** Responsive card grid (`display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`)

**Empty state:** Three-step onboarding cards (ZENOAPPS → YOUR OWN GAMES → PLAY) in V2 visual style, plus three action buttons: `ZENOAPPS` / `ADD FOLDER` / `GIT / R2`

## V2 New Game Features

### Enhanced Game Cards

Each card displays:
- Game thumbnail (placeholder icon `fa-gamepad` if no thumbnail is set)
- Game title
- Play count (e.g. `12 plays`)
- Total playtime (e.g. `4h 23m`)
- Last played relative time (e.g. `"Yesterday"`)

On hover, a full-card overlay appears with:
- Large `PLAY` button (`fa-play`) centered
- Top-right `...` options menu (Font Awesome `fa-ellipsis`) expanding to: Rename, Set Thumbnail, View Stats, Delete

### Favorite / Pin System

- Star icon (`fa-star`) appears on card hover (top-left corner)
- Clicking pins the game — star fills with accent color, card moves to a pinned `FAVORITES` row at the top of the grid
- Favorites stored in `localStorage` as `zeno_favorites` (array of game IDs)
- Pinned row labeled `★ FAVORITES` with horizontal scroll

### Playtime Tracking

- On game modal open: record `sessionStart = Date.now()` in page memory
- On game modal close: calculate `elapsed = Date.now() - sessionStart`, update per-game stats
- Stats stored in `localStorage` as `zeno_game_stats` — object keyed by game ID: `{playCount, totalMinutes, lastPlayed}`
- Recent games list (`zeno_recent_games`) updated on each play with the game's `{id, name, thumbnail, lastPlayed}`
- Stats modal (accessible from the `...` menu): shows a breakdown card with total plays, total time, last played, first played, average session length

### Categories / Tags

- Users can assign tags to any game from the `...` options menu
- Tag input supports creating new tags and selecting existing ones
- Tags stored in IndexedDB alongside game metadata
- Tag filter pills appear below the search bar — clicking a pill filters the grid to show only matching games
- Multiple pills can be active simultaneously (AND logic)

### Sort Options

Sort dropdown (top-right of main area, `fa-sort` icon):
- Default (date added)
- Alphabetical A–Z
- Recently Played
- Most Played
- Favorites First

### Add Games Modal — V2 Tabs

The ADD GAMES modal keeps all V1 tabs plus new ones:

| Tab | Description |
|---|---|
| FOLDERS | V1 drag-and-drop upload (preserved) |
| PASTE HTML | Paste raw HTML to create a single-file game |
| ZENOPACK | Curated game catalog (see below) |
| ZENOAPPS | App installation (see below) |
| GIT IMPORT | V1 Git import (preserved) |
| R2 IMPORT | V1 R2 import (preserved) |

**ZENOPACK tab:** Shows a grid of pre-packaged games available for one-click install. For V2, populate with 6 placeholder cards showing game title, thumbnail placeholder, genre tag, and a `COMING SOON` badge. The UI should be fully built out (card grid, install button per card, progress indicator) even if the actual install logic is a stub.

**ZENOAPPS tab:** Shows a grid of installable ZENOAPPS (utility apps native to the ecosystem). For V2, show 4 placeholder apps: Browser, GBA Emulator, File Manager, Media Player — each with a `COMING SOON` badge. Same card+install-button layout as ZENOPACK.

### Bulk Git Import Queue

The Git Import tab now supports queuing multiple repo URLs before importing. A text area accepts one URL per line. The importer processes them sequentially with a progress indicator per repo.

---

# PART 9 — ZENO STREAM (movies.html)

## Preserve All V1 Features

- Left sidebar with: Browse section (Home, Movies, TV Shows, Watchlist), Streaming services list (Netflix, Hulu, HBO Max, Peacock, Prime Video) each with a colored dot, Genres list (Action, Comedy, Horror, Sci-Fi, Thriller, Romance, Animation, Documentary, Drama (TV), Crime (TV)), Sort By options (Default, Rating, Newest, A–Z)
- Hero carousel (featured content with backdrop, title, rating, year, type badge, synopsis, WATCH NOW / MORE INFO / WATCHLIST buttons, dot indicators, prev/next arrows)
- Horizontal scroll rows: Trending Now, Popular Movies, Top Rated TV, All-Time Greats, Continue Watching
- Movie/show cards with: poster thumbnail, title, rating (star + number), year, content type badge (FILM / TV), NEW badge
- Search bar top-right
- ZENO // STREAM wordmark in top-left

## V2 New Stream Features

### Content Detail Modal

Clicking any card opens a full detail modal (not a new page). The modal renders over the current page with a blurred backdrop.

Modal contents:
- Full-bleed backdrop image (movie/show artwork, heavily blurred and darkened)
- Poster thumbnail (left side, sharp, rounded corners)
- Title (large, Orbitron or display font)
- Rating badge, year, genre tags (pills), runtime (e.g. `1h 52m`), content rating badge (color-coded: G=green, PG=yellow, PG-13=orange, R=red, TV-MA=red)
- Synopsis paragraph
- Cast row (horizontal scroll of cast name chips — placeholder data for V2 like `"John Doe"`, `"Jane Smith"`)
- Three action buttons: `WATCH NOW` (opens streaming service link in new tab), `ADD TO WATCHLIST` (`fa-bookmark`), `TRAILER` (opens a YouTube embed inline below the buttons)
- Related content horizontal scroll row at the bottom of the modal

### Watchlist

- Bookmark icon (`fa-bookmark`) on every card (appears on hover in the grid, always visible in detail modal)
- Clicking adds/removes from watchlist — icon fills in accent color when active
- Watchlist data stored in `localStorage` as `zeno_watchlist` — array of content objects `{id, title, type, poster, rating, year}`
- Sidebar "Watchlist" link navigates to a filtered view showing only watchlisted content
- Watchlist item count badge displayed next to the sidebar link

### Continue Watching — Enhanced

- Each card in the Continue Watching row shows a thin progress bar at the bottom of the thumbnail (e.g. `65%` viewed)
- Progress stored in `localStorage` as `zeno_continue_watching` — array of `{id, title, poster, progress, lastWatched}`
- Hover state on Continue Watching cards shows an `×` button (`fa-xmark`) to remove from the row
- Progress bar color uses `--accent`

### Service Filter Pills

A row of filter pills appearing above the main content grid, between the hero and the first row. Pills: All, Netflix, Hulu, HBO Max, Peacock, Prime Video. Clicking a pill filters all visible rows to that service. Active pill filled with `--accent` color.

---

# PART 10 — AI ASSISTANT

## Provider & Configuration

- **Groq API** — not Claude, not OpenAI. Groq only.
- Base URL: `https://api.groq.com/openai/v1/chat/completions`
- Default model: `llama-3.3-70b-versatile`
- API key stored in `localStorage` as `zeno_groq_key`
- If no key is set when the user opens the AI sidebar or ai.html, show a setup modal: a clean dialog with a single API key input, a link to `https://console.groq.com`, and a SAVE button

## Full AI Page (ai.html)

Full-page terminal-style interface.

**Layout:**
- Top bar: path label `zeno@eclipse / ai` (monospace, left), model selector dropdown (center), token count display (right), CLEAR button (`fa-trash`), EXPORT button (`fa-download` — downloads chat as `.txt`)
- Chat history area (scrollable, takes remaining height): messages rendered with `marked.js` for markdown support — code blocks with syntax highlighting styling, bold, lists, inline code, all formatted
- Input bar (fixed at bottom): full-width textarea (auto-resizes), send button (`fa-paper-plane`), Shift+Enter for newline, Enter to send
- Keyboard shortcuts panel (shown on `?` keypress): semi-transparent overlay listing all shortcuts

**In `default`/`blend` themes:** Dark terminal aesthetic. Monospace font throughout. Message bubbles styled like terminal output (user messages in accent color, AI responses in `--text`).

**In `glass` theme:** Frosted glass panel for the chat area. Clean modern chat bubble style. User messages right-aligned in accent-colored bubble, AI messages left-aligned in glass surface bubble.

**Message timestamps:** Rendered in muted color on hover over each message.

**System prompt:** Configurable in Settings (stored as `zeno_ai_system_prompt`). Automatically prepended to every conversation. Not shown to the user in the chat history.

## Global AI Sidebar (every page)

A persistent floating button appears on every page of ZENO.

**The button:**
- Position: `fixed`, bottom-center of the viewport (`bottom: 28px`, `left: 50%`, `transform: translateX(-50%)`)
- Shape: circular pill or circle
- Icon: `fa-robot` (Font Awesome)
- In `default` theme: neon accent-colored ring glow, dark background
- In `glass` theme: frosted glass surface, subtle shadow, no glow
- In `blend` theme: frosted glass surface with neon accent ring
- A subtle idle pulse animation (scale 1.0 → 1.04 → 1.0, slow, accent color glow pulses)
- On hover: scale up slightly, glow intensifies

**The panel (opens on button click):**
- Slides up from the bottom on mobile (full width, ~60vh height)
- Slides in from the right on desktop (~380px wide, full viewport height)
- CSS transition: `transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)`
- Panel uses active theme's surface style (glass surface in glass/blend, dark card in default)

**Panel header:**
- `ZENO AI` label (Orbitron)
- Model indicator (small, muted)
- Close button (`fa-xmark`)

**Suggested action chips:**
Contextual chips rendered above the input bar. These are pre-written prompt starters that auto-fill the input on click. Chips are contextual to the current page:

- `index.html`: `"Open Games"`, `"Open Stream"`, `"What time is it?"`, `"Change my theme"`
- `games.html`: `"Open my last played game"`, `"Show my favorites"`, `"What's my most played game?"`
- `movies.html`: `"What should I watch?"`, `"Show my watchlist"`, `"Filter to Netflix"`
- `settings.html`: `"Switch to glass theme"`, `"Change accent to cyan"`, `"Reset all settings"`
- `ai.html` (full page only, no sidebar): no chips needed

**Compact chat interface:** Same Groq integration as the full ai.html page. Message history shared with the full page via a `window.ZenoAI.history` array in `zeno-v2-core.js` (persists for the page session, not between page navigations).

## AI Action System — ZenoAction Protocol

The AI can perform real actions on the current page. This is the most critical feature of V2's AI system.

**How it works:**

1. Each page's system prompt (injected automatically, not visible to the user) tells the AI exactly what actions are available on this page and provides serialized context from `localStorage` (recent games list, watchlist, current theme, current accent, etc.)

2. When the AI determines an action should be performed, it includes a `<zenoaction>` XML tag in its response text alongside its natural language reply

3. The `ZenoAI.parseActions(responseText)` function scans the response for these tags, extracts their attributes, and dispatches them to page-registered handlers

4. The action executes, the `<zenoaction>` tag is stripped from the displayed response text before rendering

**Action tag syntax:**
```
<zenoaction type="ACTION_TYPE" ATTRIBUTE="VALUE" />
```

**Supported actions by page:**

`index.html`:
```
<zenoaction type="navigate" target="games.html" />
<zenoaction type="navigate" target="movies.html" />
<zenoaction type="navigate" target="settings.html" />
<zenoaction type="navigate" target="ai.html" />
<zenoaction type="set_theme" value="default|glass|blend" />
<zenoaction type="set_accent" value="#00f5ff" />
<zenoaction type="open_wallpaper_picker" />
<zenoaction type="open_accent_picker" />
```

`games.html`:
```
<zenoaction type="navigate" target="PAGE" />
<zenoaction type="launch_game" id="GAME_ID" />
<zenoaction type="search" query="QUERY" />
<zenoaction type="filter_tag" tag="TAG_NAME" />
<zenoaction type="sort" by="recent|alpha|plays|favorites" />
<zenoaction type="open_add_games" />
```

`movies.html`:
```
<zenoaction type="navigate" target="PAGE" />
<zenoaction type="search" query="QUERY" />
<zenoaction type="filter_service" service="netflix|hulu|hbo|peacock|prime" />
<zenoaction type="open_watchlist" />
<zenoaction type="add_to_watchlist" title="TITLE" />
<zenoaction type="open_detail" title="TITLE" />
```

`settings.html`:
```
<zenoaction type="set_theme" value="default|glass|blend" />
<zenoaction type="set_accent" value="#HEX" />
<zenoaction type="toggle_setting" key="SETTING_KEY" value="true|false" />
<zenoaction type="navigate" target="PAGE" />
```

**ZenoAI system prompt injection (per page):**

Each page calls `ZenoAI.buildPageContext()` which returns a JSON object of relevant state. This is serialized and prepended to the system prompt automatically. Example for games.html:

```json
{
  "page": "games",
  "username": "Eclipse Services",
  "recentGames": [{"id": "abc123", "name": "Mario", "lastPlayed": "2026-05-24T20:00:00Z"}],
  "totalGames": 5,
  "favorites": ["abc123"],
  "currentSort": "recent",
  "availableActions": ["navigate", "launch_game", "search", "filter_tag", "sort", "open_add_games"]
}
```

**`ZenoAI` object structure in zeno-v2-core.js:**

```javascript
window.ZenoAI = {
  groqKey: localStorage.getItem('zeno_groq_key'),
  model: localStorage.getItem('zeno_ai_model') || 'llama-3.3-70b-versatile',
  history: [], // array of {role, content} message objects
  actionHandlers: {}, // registered by each page

  async send(userMessage, pageSystemPrompt) {
    // Builds messages array: system prompt + history + new user message
    // POSTs to Groq API
    // Parses response, extracts and executes zenoactions, strips tags from display text
    // Appends to history
    // Returns cleaned display text
  },

  parseActions(text) {
    // Regex scan for <zenoaction ... /> tags
    // Returns array of {type, ...attributes}
  },

  executeAction(action) {
    const handler = this.actionHandlers[action.type];
    if (handler) handler(action);
  },

  registerHandler(type, fn) {
    this.actionHandlers[type] = fn;
  },

  buildPageContext() {
    // Returns page-relevant localStorage state as object
    // Called by each page and passed as part of the system prompt
  }
};
```

---

# PART 11 — SETTINGS (settings.html)

## Layout

- Top bar: `← HOME` button (`fa-arrow-left`, links to index.html) | `SYSTEM SETTINGS` title (centered) | `SAVE CHANGES` button (`fa-floppy-disk`, right)
- Header section below top bar: `// CONFIGURATION TERMINAL` label (small, accent color, Orbitron) | `ZENO CORE` heading (large) | subtitle: `"Global preferences for the Eclipse environment."`
- Content: single-column scrollable settings list, sections separated by labeled dividers

## Sections

### PERSONALIZATION
- **Display Name** — text input → `zeno_username`
- **Profile Picture** — file upload (circular preview) → `zeno_avatar`
- **Change Password** — "Current password" + "New password" + "Confirm" fields. On save, re-hash with SHA-256 and update `zeno_pin_hash`. If current field is blank and no hash exists, allows setting a new password. Clear password button (sets `zeno_pin_hash` to null, disabling the lock screen).
- **System Accent Color** — swatch picker (same as onboarding Step 4)
- **Active Theme** — three option cards (same as onboarding Step 3). Switching applies instantly.
- **Grid Background** — toggle (`fa-grip`) — `default` theme only. Stored as `zeno_grid_enabled`.
- **Scanlines Effect** — toggle — `default` and `blend` themes only. Stored as `zeno_scanlines_enabled`.
- **Interface Blur** — range slider (0–20px) — `glass` and `blend` themes only. Stored as `zeno_blur_intensity`. Adjusts `--blur` variable live.
- **Wallpaper** — shows current wallpaper thumbnail, CHANGE button (opens wallpaper picker modal)

### STREAMING & MEDIA
- **Preferred Service** — dropdown: Netflix, Hulu, HBO Max, Peacock, Prime Video → `zeno_preferred_service`
- **Continue Watching Row** — toggle → `zeno_continue_watching_enabled`
- **Episode Info Cards** — toggle → `zeno_episode_info_enabled`
- **Auto-play Next Episode** — toggle → `zeno_autoplay_next`

### GAMES
- **Default Launch Mode** — radio: Fullscreen / Windowed Modal → `zeno_launch_mode`
- **Show Playtime on Cards** — toggle → `zeno_show_playtime`
- **Show Play Count on Cards** — toggle → `zeno_show_playcount`
- **Clear All Game Stats** — button (`fa-eraser`) → shows a confirmation modal before clearing `zeno_game_stats` and `zeno_recent_games`

### AI
- **Groq API Key** — masked input with show/hide toggle (`fa-eye` / `fa-eye-slash`) → `zeno_groq_key`
- **Default Model** — dropdown: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768` → `zeno_ai_model`
- **Custom System Prompt** — textarea (tall) → `zeno_ai_system_prompt`
- **Clear Conversation History** — button → clears `ZenoAI.history` array (page memory only, no localStorage to clear)

### INTERFACE
- **Default Startup App** — dropdown: Home Dashboard, Games, Stream → `zeno_startup_app`
- **Animation Speed** — slider: Slow / Normal / Fast. Adjusts a `--transition-speed` CSS variable multiplier. Stored as `zeno_animation_speed`.
- **Show Clock on Dashboard** — toggle → `zeno_show_clock`
- **Cloak System** — collapsible sub-section. All cloak controls (presets, custom title, custom favicon URL, enable toggle). Mirror of dashboard cloak UI.

### DANGER ZONE

Visually distinct section with a red/warning-colored header.

- **Export All Settings** — button (`fa-file-export`). Serializes all `zeno_*` localStorage keys to a JSON object, downloads as `zeno-settings.json`
- **Import Settings** — file input (accepts `.json`). On file select, parse and apply all keys to `localStorage`, then reload the page
- **Reset to Defaults** — button (`fa-rotate-left`). Shows confirmation modal: `"This will reset all settings to their defaults. Your games will not be affected."` On confirm: clears all `zeno_*` localStorage keys except `zeno_v2_setup_complete`, reloads to onboarding
- **Clear All ZENO Data** — button (`fa-trash`, styled in warning red). Shows a double-confirmation modal (user must type `"DELETE"` into an input to confirm). On confirm: clears all `localStorage`, deletes `zeno-games-db` from IndexedDB, unregisters Service Worker, reloads to onboarding

---

# PART 12 — 404 PAGE (404.html)

Redesign of the V1 404 page. Preserve the core concept (404 glitch effect, SIGNAL LOST, return home + go back buttons) with V2 visual improvements.

## V2 Changes

**Independent digit glitch:** Instead of the entire "404" glitching together, each digit (4, 0, 4) animates independently on a staggered timing schedule. Each uses a slightly different clip-path glitch keyframe sequence.

**Theme awareness:** Renders correctly in all three themes. In `default`/`blend`: full neon grid/scanlines treatment. In `glass`: the 404 and buttons render inside a glass panel over the wallpaper. The glitch effect uses accent color instead of hardcoded pink when in `glass` mode.

**AI Suggestion Chip:** A small chip at the bottom of the page (above the status bar) styled as a glass/surface card:
- Label: `ZENO AI SUGGESTS:` (small, muted, Orbitron)
- Content: `"Try navigating home or checking your games library."` (static text — no API call on the 404 page)
- Icon: `fa-robot` (left of text, accent colored)

**Preserve from V1:**
- ZENO logo badge top-left (links to index.html)
- SIGNAL LOST label above the 404
- RETURN HOME button and GO BACK button
- Status bar at bottom: ERROR 404 (blinking dot), SYSTEM ONLINE (green dot), ECLIPSE SUITE (green dot)
- Background grid, glow, scanlines, noise overlay

---

# PART 13 — SHARED LAYOUT ELEMENTS

## Navigation Bar (all pages except onboarding and 404)

A consistent top navigation bar rendered in every page's `<body>`.

**Left:** `ZENO` wordmark (Orbitron, accent colored, links to index.html) + `/` separator + current page name (e.g. `GAMES`, `STREAM`, `SETTINGS`) in muted color

**Center:** Page-specific. On games.html and movies.html: full search bar. On other pages: page title or empty.

**Right:** Greeting text (`GOOD EVENING, [USERNAME]` — changes by time of day: GOOD MORNING / GOOD AFTERNOON / GOOD EVENING / GOOD NIGHT) | Avatar thumbnail (circular, 32px, links to settings.html) | Notification dot if applicable (accent colored, appears when SW has an issue)

## Page Transitions

On navigate:
1. Add class `page-exit` to `<body>` (CSS: `opacity: 0; transform: translateY(8px); transition: all 0.2s ease`)
2. After 200ms delay: set `window.location.href`
3. New page renders with class `page-enter` on `<body>` (CSS: starts at `opacity: 0; transform: translateY(8px)`, transitions to `opacity: 1; transform: translateY(0)`)

Implement via a `navigateTo(url)` function in `zeno-v2-core.js`. All navigation links call `navigateTo()` instead of direct href.

## Modals

All modals:
- Fixed overlay (`position: fixed; inset: 0; z-index: 1000`)
- Backdrop: `background: rgba(0,0,0,0.6); backdrop-filter: blur(4px)`
- Modal panel: centered, uses active theme's surface style
- Open animation: scale from 0.95 to 1.0 + opacity 0 to 1 (`0.25s cubic-bezier(0.34, 1.56, 0.64, 1)`)
- Close animation: reverse
- Close on backdrop click
- Close on `Escape` key
- Focus trap (Tab key cycles only within the modal)

## Scrollbars

Custom styled in all themes:
- `default`/`blend`: width 4px, track transparent, thumb `--accent` at 40% opacity, thumb on hover at 70%
- `glass`: width 4px, track transparent, thumb `rgba(255,255,255,0.2)`, thumb on hover `rgba(255,255,255,0.4)`

## Selection

```css
::selection {
  background: var(--accent);
  color: #000;
}
```

---

# PART 14 — ENHANCED SERVICE WORKER (zeno-game-sw.js)

Preserve all V1 logic exactly. Add in V2:

**Version constant:**
```javascript
const SW_VERSION = '2.0.0';
```

**LIST_GAMES message handler:**
```javascript
if (type === 'LIST_GAMES') {
  const gameIds = new Set();
  for (const key of fileStore.keys()) {
    const match = key.match(/^\/zeno-games\/([^/]+)\//);
    if (match) gameIds.add(match[1]);
  }
  if (port) port.postMessage({ type: 'GAMES_LIST', gameIds: [...gameIds] });
  return;
}
```

**Extended MIME type map:**
```javascript
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
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
```

**Cache cleanup on activate:**
```javascript
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== `zeno-v${SW_VERSION}`).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
```

---

# PART 15 — PERFORMANCE & POLISH RULES

- All animations use `will-change: transform, opacity` where appropriate
- Prefer `transform` and `opacity` for all animations (GPU composited, no layout recalc)
- `@media (prefers-reduced-motion: reduce)` must disable all non-essential animations sitewide (add to `zeno-v2-core.css`)
- Images use `loading="lazy"` where applicable
- `localStorage` reads cached in JS variables at page load — do not call `localStorage.getItem` twice for the same key in a single page session
- All modals trap focus (keyboard accessibility, Tab cycles within modal only)
- All interactive elements have `:focus-visible` styles matching the active theme's accent color
- No console errors on page load in any supported browser
- No layout shift (CLS) — wallpaper and theme applied before first render via `<head>` script
- Groq API calls made with `async/await` and wrapped in `try/catch` — errors shown inline in the chat UI, never logged to console only

---

# PART 16 — TYPOGRAPHY SYSTEM

## Default / Blend Themes
- Display / Logo: `Orbitron` (Google Fonts) — weights 400, 700, 900
- Body / UI: `Rajdhani` (Google Fonts) — weights 300, 400, 600
- Monospace (AI terminal, code): `JetBrains Mono` (Google Fonts) — weights 400, 500

## Glass Theme
- Display / Logo: `Orbitron` (ZENO wordmark and logo labels only)
- Body / UI: `Plus Jakarta Sans` (Google Fonts) — weights 300, 400, 500, 600, 700
- Monospace: `JetBrains Mono`

## Google Fonts Link (all families in one request)
```html
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

# PART 17 — MISCELLANEOUS REQUIREMENTS

- Every page includes `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- Every page includes `<meta charset="UTF-8">`
- Desktop-first (1280px+ viewport is the primary target). Basic mobile responsiveness is a secondary requirement — at minimum, the layout should not break below 768px.
- Font Awesome loaded via: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css`
- `marked.js` loaded via CDN for AI markdown rendering only: `https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js`
- `zeno-v2-core.css` linked in every page's `<head>`
- `zeno-v2-core.js` linked in every page just before `</body>`
- Service Worker registered in every page that needs game launching. Registration code: `navigator.serviceWorker.register('/zeno-game-sw.js')`
- ZENO is part of the Eclipse Family — use "Eclipse" and "Eclipse Services" in UI copy where appropriate (status bars, greetings, system labels). This is correct and intentional.
- No external analytics, tracking, or third-party scripts beyond: Groq API, Font Awesome CDN, Google Fonts, marked.js CDN. Unsplash wallpapers are loaded as direct image URLs (no API key, no API calls — just `<img>` src attributes pointing to free Unsplash photo URLs)
- No emojis anywhere in the UI — Font Awesome icons only for all iconography

---

# PART 18 — THE EXPERIENCE GOAL (READ THIS LAST)

When a user opens ZENO V2 for the first time, they go through a premium OOBE that rivals a real OS setup. They choose their identity, their visual world, their accent, their wallpaper. They enter a platform that feels like nothing else on the web.

When they return, they are greeted by name. Their wallpaper wraps the interface. Their theme renders immediately with no flash. The AI robot button pulses at the bottom. Their recent games are on the dashboard. Their watchlist has a count badge. It remembers them.

When they speak to the AI — *"Zeno, open my last game"* — something actually happens. The game launches. When they say *"Switch to glass theme"* — the interface transforms. The platform responds to language. It feels alive.

The games library is their vault. Every game they add is remembered forever. Every session tracked. Every favorite pinned. The library grows into something personal.

The stream section is their media hub. Not a static list — a curated, filterable, watchlisted collection that adapts to their preferences.

ZENO V2 is not a website. It is an experience. It is a platform. It is theirs.

**Build it that way.**