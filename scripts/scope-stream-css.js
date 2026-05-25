const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'movies.html');
const shellPath = path.join(__dirname, '..', 'css', 'movies-v2-shell.css');
const compPath = path.join(__dirname, '..', 'css', 'movies-v2-components.css');
const outPath = path.join(__dirname, '..', 'css', 'movies-v2.css');

let html = fs.readFileSync(htmlPath, 'utf8');
const m = html.match(/<style id="stream-legacy-removed">([\s\S]*?)<\/style>/);
if (!m) {
  console.error('No inline style block in movies.html');
  process.exit(1);
}

let raw = m[1].trim();

// Remove obsolete v1 chrome blocks
raw = raw.replace(/\/\* ── NAV ── \*\/[\s\S]*?(?=\/\* ── LAYOUT)/, '');
raw = raw.replace(/\/\* ── LAYOUT ── \*\/[\s\S]*?(?=\/\* ── MAIN CONTENT)/, '');
raw = raw.replace(/\/\* ── SIDEBAR ── \*\/[\s\S]*?(?=\/\* ── MAIN CONTENT)/, '');

function scopeCss(css) {
  const chunks = [];
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf('@', i);
    const brace = css.indexOf('{', i);
    if (brace === -1) break;
    if (at !== -1 && at < brace) {
      const key = css.slice(at).match(/^@(keyframes|media)[^{]*/)?.[0] || '';
      const open = css.indexOf('{', at);
      let depth = 0;
      let j = open;
      for (; j < css.length; j++) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      chunks.push(css.slice(at, j));
      i = j;
      continue;
    }

    const selEnd = brace;
    const selector = css.slice(i, selEnd).trim();
    let depth = 0;
    let j = brace;
    for (; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    const body = css.slice(brace + 1, j - 1);
    chunks.push({ selector, body });
    i = j;
  }

  const out = [];
  for (const c of chunks) {
    if (typeof c === 'string') {
      out.push(c);
      continue;
    }
    let { selector, body } = c;
    if (!selector) continue;

    if (selector.startsWith(':root')) {
      out.push(`body.stream-v2 {\n${body}\n}`);
      continue;
    }

    if (selector === '*,*::before,*::after') {
      out.push(`body.stream-v2 *,\nbody.stream-v2 *::before,\nbody.stream-v2 *::after {\n${body}\n}`);
      continue;
    }

    if (selector === 'html') {
      out.push(`body.stream-v2 {\n  scroll-behavior: smooth;\n}`);
      continue;
    }

    if (selector === 'body') {
      out.push(
        `body.stream-v2 {\n  font-family: 'Rajdhani', var(--font-body), sans-serif;\n  color: var(--text);\n  min-height: 100vh;\n  overflow-x: hidden;\n}`
      );
      continue;
    }

    const scoped = selector
      .split(',')
      .map((s) => {
        s = s.trim();
        if (s.startsWith('body.stream-v2')) return s;
        return `body.stream-v2 ${s}`;
      })
      .join(',\n');

    let block = body;
    if (scoped.includes('.main-content')) {
      block = block.replace(/margin-left:\s*var\(--sidebar-w\)[^;]*;?/g, 'margin-left: 0;');
    }

    out.push(`${scoped} {\n${block}\n}`);
  }

  return out.join('\n\n');
}

const components = scopeCss(raw);
const shell = fs.readFileSync(shellPath, 'utf8');

// Fix class collision in shell: toggle vs hub button
const shellFixed = shell
  .replace(/body\.stream-v2 \.stream-profile-switch \{/g, 'body.stream-v2 .stream-profile-toggle {')
  .replace(
    /body\.stream-v2 \.stream-profile-switch input/g,
    'body.stream-v2 .stream-profile-toggle input'
  )
  .replace(
    /body\.stream-v2 \.stream-profile-switch input:checked/g,
    'body.stream-v2 .stream-profile-toggle input:checked'
  )
  .replace(
    /body\.stream-v2 \.stream-hub-profile-btn/g,
    'body.stream-v2 .stream-hub-profile-btn'
  )
  .replace(
    /body\.stream-v2 \.stream-profile-switch:hover/g,
    'body.stream-v2 .stream-hub-profile-btn:hover'
  )
  .replace(
    /body\.stream-v2 \.stream-profile-switch i/g,
    'body.stream-v2 .stream-hub-profile-btn i'
  );

// Rename hub button block - read shell file for exact duplicate at 399
let merged = shellFixed.replace(
  /\/\* ── Hero readability[\s\S]*$/,
  ''
);

merged =
  merged.trimEnd() +
  '\n\n/* ── Stream content (hero, rows, player, detail) ── */\n' +
  components +
  '\n';

fs.writeFileSync(compPath, components);
fs.writeFileSync(outPath, merged);
console.log('movies-v2.css rebuilt');
