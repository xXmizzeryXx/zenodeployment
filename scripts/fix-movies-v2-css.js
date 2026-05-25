const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'css', 'movies-v2.css');
let css = fs.readFileSync(p, 'utf8');

// Hub "Switch profile" button (not the adult toggle)
css = css.replace(
  /body\.stream-v2 \.stream-profile-toggle \{\s*display: inline-flex;[\s\S]*?transition: all 0\.15s;\s*\}/,
  `body.stream-v2 .stream-hub-profile-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--surface-border);
  background: rgba(0, 0, 0, 0.25);
  color: var(--muted);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}`
);

// Remove duplicate :root-like block and global reset from scoped import
css = css.replace(
  /\/\* ── Stream content[\s\S]*?body\.stream-v2 \{\s*font-family: 'Rajdhani'[\s\S]*?overflow-x: hidden;\s*\}\s*/,
  '/* ── Stream content (hero, rows, player, detail) ── */\n'
);

// Scope box reset to stream UI only (not #zeno-nav)
const resetBlock = `body.stream-v2 .stream-page *,
body.stream-v2 .stream-page *::before,
body.stream-v2 .stream-page *::after,
body.stream-v2 .stream-profile-gate *,
body.stream-v2 .player-overlay *,
body.stream-v2 .detail-page *,
body.stream-v2 .trailer-modal *,
body.stream-v2 .ep-info-overlay *,
body.stream-v2 .card-hover-preview *,
body.stream-v2 .toast {
  box-sizing: border-box;
}`;

if (!css.includes('stream-page *,')) {
  css = css.replace(
    '/* ── Stream content',
    resetBlock + '\n\n/* ── Stream content'
  );
}

const overrides = `
/* ── V2 polish (layout, z-index, AI panel) ── */
body.stream-v2 .hero {
  height: min(58vh, 540px);
  min-height: 380px;
}

body.stream-v2 .hero-bg::after {
  background: linear-gradient(0deg, rgba(8, 8, 15, 0.98) 0%, rgba(8, 8, 15, 0.6) 42%, transparent 100%),
    linear-gradient(90deg, rgba(8, 8, 15, 0.92) 0%, rgba(8, 8, 15, 0.45) 50%, transparent 100%);
}

body.stream-v2 .hero-content {
  padding: 0 28px 44px;
  max-width: 680px;
}

body.stream-v2 .hero-overview {
  font-size: 16px;
  line-height: 1.7;
  color: rgba(238, 242, 255, 0.92);
}

body.stream-v2 .btn-hero-play {
  background: var(--accent);
}

body.stream-v2 .rows-container {
  background: linear-gradient(180deg, transparent, rgba(8, 8, 15, 0.5) 40px);
}

body.stream-v2 .player-overlay {
  z-index: 1200;
}

body.stream-v2 .detail-page {
  z-index: 1100;
  background: #08080f;
}

body.stream-v2 .trailer-modal,
body.stream-v2 .ep-info-overlay {
  z-index: 1300;
}

body.stream-v2 .toast {
  bottom: 88px;
  z-index: 950;
}

body.stream-v2 .back-to-top {
  bottom: 88px;
  z-index: 940;
}

body.stream-v2 #zeno-ai-panel {
  background: rgba(8, 8, 18, 0.98) !important;
  border-left: 1px solid var(--surface-border) !important;
  backdrop-filter: blur(20px) !important;
  color: var(--text);
}

body.stream-v2 #zeno-ai-panel .ai-panel-head {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

body.stream-v2 #zeno-ai-panel .ai-chips {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

body.stream-v2 #zeno-ai-panel .ai-chip {
  background: rgba(0, 0, 0, 0.35);
  color: var(--muted);
}

body.stream-v2 #zeno-ai-panel .ai-msg.user {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border-color: var(--accent);
  color: var(--text);
}

body.stream-v2 #zeno-ai-panel .ai-msg.bot {
  background: rgba(0, 0, 0, 0.4);
  color: #d8e0f8;
}

body.stream-v2 #zeno-ai-panel .ai-input-wrap {
  border-top-color: rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.25);
}

body.stream-v2 #zeno-ai-panel .zeno-input {
  background: rgba(0, 0, 0, 0.4);
  color: var(--text);
}

body.stream-v2 #zeno-ai-fab {
  bottom: 24px;
  left: auto;
  right: 24px;
  transform: none;
  background: rgba(8, 8, 18, 0.95) !important;
}

body.stream-v2 #zeno-ai-fab:hover {
  transform: scale(1.08);
}

@media (max-width: 768px) {
  body.stream-v2 .stream-page {
    padding: 6px 10px 88px;
  }

  body.stream-v2 .stream-hub {
    padding: 14px;
  }

  body.stream-v2 .stream-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  body.stream-v2 .stream-tab {
    justify-content: center;
  }

  body.stream-v2 .hero {
    min-height: 300px;
    height: 48vh;
  }

  body.stream-v2 .hero-content {
    padding: 0 16px 32px;
  }

  body.stream-v2 #zeno-ai-fab {
    right: 16px;
    bottom: 16px;
  }
}
`;

if (!css.includes('V2 polish')) {
  css = css.trimEnd() + overrides;
}

// Add stream tokens to top block
if (!css.includes('--card-radius')) {
  css = css.replace(
    'body.stream-v2 {',
    `body.stream-v2 {
  --card-radius: 6px;
  --card-blur: 16px;
  --neon-purple: #bf00ff;
  --neon-green: #00ff88;
  --neon-gold: #ffd700;`
  );
}

fs.writeFileSync(p, css);
console.log('movies-v2.css fixed');
