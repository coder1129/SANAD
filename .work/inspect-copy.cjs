const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const res = path.join(dir, e.name);
    return e.isDirectory() ? getFiles(res) : [res];
  });
}

const files = getFiles('frontend').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
const nonLiteral = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.matchAll(/_copy\(([^)]+)\)/g);
  for (const m of matches) {
    const arg = m[1].trim();
    if (!arg.startsWith('"') && !arg.startsWith("'")) {
      nonLiteral.push({ file: f, arg });
    }
  }
}

console.log('Total non-literal _copy calls:', nonLiteral.length);
console.log('Grouped by arg pattern:');
const counts = {};
for (const x of nonLiteral) {
  counts[x.arg] = (counts[x.arg] || 0) + 1;
}
const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
sorted.slice(0, 50).forEach(([arg, count]) => {
  console.log(`${count.toString().padStart(4)}: ${arg}`);
});
