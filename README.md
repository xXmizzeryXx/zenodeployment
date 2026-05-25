# ZENO V2

Browser-native gaming and media platform (Eclipse Family). Pure HTML/CSS/JS — no build step.

## Quick start

```bash
npx serve .
# Open http://localhost:3000 (or the port shown)
```

Service Workers require HTTP — do not open via `file://`.

## First run

1. Complete **onboarding** (theme, accent, wallpaper, profile).
2. Add games via **Games** (folder upload, Git import, or R2).
3. Optional: add a **Groq API key** in Settings for AI features.

## Key files

| File | Purpose |
|------|---------|
| `css/zeno-v2-core.css` / `js/zeno-v2-core.js` | Themes, nav, AI, wallpaper, modals |
| `zeno-game-sw.js` | In-browser game file serving (site root — required for SW scope) |
| `games.html` + `js/games-page.js` | Game library (ported from v1) |
| `onboarding.html` | First-run setup |

## Deploy

Static hosting: GitHub Pages, Vercel, Netlify, Cloudflare Pages, Firebase Hosting.
