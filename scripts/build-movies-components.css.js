const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'movies.html');
const outPath = path.join(__dirname, '..', 'css', 'movies-components-scoped.css');

let html = fs.readFileSync(htmlPath, 'utf8');
const m = html.match(/<style id="stream-legacy-removed">([\s\S]*?)<\/style>/);
if (!m) {
  console.error('inline style block missing — run after restore or keep backup');
  process.exit(1);
}

let css = m[1].trim();
// Drop v1-only chrome (hidden in v2 anyway)
css = css.replace(/\/\* ── NAV ── \*\/[\s\S]*?\/\* ── LAYOUT ── \*\//, '/* layout */');
css = css.replace(/\/\* ── SIDEBAR ── \*\/[\s\S]*?\/\* ── MAIN CONTENT ── \*\//, '/* main */');

const lines = css.split('\n');
const out = [];
let buf = [];

function flushRule() {
  if (!buf.length) return;
  const block = buf.join('\n');
  buf = [];
  if (!block.trim()) return;

  const selectors = block.split('{')[0].trim();
  if (!selectors || selectors.startsWith('@') || selectors.startsWith(':root')) {
    if (selectors.startsWith(':root')) {
      out.push('body.stream-v2 {');
      out.push(block.replace(/^:root\s*\{/, '').replace(/\}\s*$/, ''));
      out.push('}');
    } else {
      out.push(`body.stream-v2 ${block}`);
    }
    return;
  }

  const parts = selectors.split(',').map((s) => {
    s = s.trim();
    if (!s) return s;
    if (s.startsWith('body.stream-v2')) return s;
    if (s === '*' || s === '*,*::before,*::after' || s === 'html') {
      return `body.stream-v2 ${s}`;
    }
    if (s.startsWith('body')) return `body.stream-v2${s.slice(4)}`;
    return `body.stream-v2 ${s}`;
  });
  out.push(`${parts.join(',\n')} {${block.split('{').slice(1).join('{')}`);
}

for (const line of lines) {
  const t = line.trim();
  if (t.startsWith('@keyframes') || t.startsWith('@media')) {
    flushRule();
    out.push(line);
    continue;
  }
  if (t.includes('{') && !buf.length) {
    buf.push(line);
    continue;
  }
  if (buf.length) {
    buf.push(line);
    if (t === '}' || (t.endsWith('}') && !t.includes('{'))) {
      flushRule();
    }
    continue;
  }
  if (t) out.push(line);
}

// Fix main-content sidebar offset
const joined = out.join('\n');
const fixed = joined
  .replace(
    /body\.stream-v2 \.main-content\s*\{[^}]*margin-left:\s*var\(--sidebar-w\)[^}]*\}/,
    'body.stream-v2 .main-content {\n  margin-left: 0;\n  flex: 1;\n  min-width: 0;\n  width: 100%;\n}'
  )
  .replace(
    /body\.stream-v2\s*\{[^}]*background:\s*var\(--bg\)[^}]*display:\s*flex[^}]*\}/,
    `body.stream-v2.page-stream {
  background: transparent;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}`
  );

fs.writeFileSync(outPath, `/* Auto-scoped stream components — do not edit by hand */\n${fixed}\n`);
console.log('wrote', outPath);
