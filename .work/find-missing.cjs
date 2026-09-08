const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const res = path.join(dir, e.name);
    return e.isDirectory() ? getFiles(res) : [res];
  });
}

const dict = JSON.parse(fs.readFileSync('frontend/messages/interface-ar.json', 'utf8'));
const files = getFiles('frontend').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
const missing = new Map();

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.matchAll(/_copy\(\s*("([^"]+)"|'([^']+)')\s*(\)|,)/g);
  for (const m of matches) {
    const str = (m[2] || m[3]).replace(/\s+/g, ' ').trim();
    if (!str || /^[\d\s.,\-·%#\(\)\/:]+$/.test(str)) continue;
    if (dict[str] === undefined) {
      if (!missing.has(str)) missing.set(str, []);
      missing.get(str).push(f.replace(/frontend[\\/]/, ''));
    }
  }
}

console.log('Total missing string literals:', missing.size);
for (const [s, occurrences] of missing.entries()) {
  console.log(`"${s}" (${occurrences.length} times): e.g. in ${occurrences[0]}`);
}
