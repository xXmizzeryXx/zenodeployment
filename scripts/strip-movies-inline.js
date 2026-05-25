const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'movies.html');
let h = fs.readFileSync(p, 'utf8');
const start = h.indexOf('<style id="stream-legacy-removed">');
if (start < 0) {
  const alt = h.indexOf('<!-- Stream styles:');
  console.error('style block not found', start, alt);
  process.exit(1);
}
const end = h.indexOf('</style>', start) + 8;
h = h.slice(0, start) + h.slice(end);
h = h.replace(
  '<label class="stream-profile-switch">',
  '<label class="stream-profile-toggle">'
);
h = h.replace(
  'class="stream-profile-switch" id="streamProfileSwitch"',
  'class="stream-hub-profile-btn" id="streamProfileSwitch"'
);
fs.writeFileSync(p, h);
console.log('movies.html: removed inline CSS, fixed profile classes');
