const fs = require('fs');
const path = require('path');
const tr = require('../messages/tr.json');
const en = require('../messages/en.json');

function hasKey(obj, dotted) {
  let cur = obj;
  for (const p of dotted.split('.')) {
    if (cur && typeof cur === 'object' && p in cur) { cur = cur[p]; }
    else return false;
  }
  return true;
}

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) files.push(p);
  }
  return files;
}

const files = walk(path.join(__dirname, '..', 'src'));
const missing = new Set();

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const nsRegex = /useTranslations\(\s*["']([^"']+)["']\s*\)/g;
  let nsMatch;
  const namespaces = [];
  while ((nsMatch = nsRegex.exec(src))) namespaces.push(nsMatch[1]);
  if (!namespaces.length) continue;
  const tRegex = /\b(?:t|tSection|tEquipment|tUnits|tCat|tForm|tIngredients|tTypes|tChange|tLogin|tMembership)\(\s*["']([^"'`{}\$]+)["']/g;
  let tMatch;
  while ((tMatch = tRegex.exec(src))) {
    const key = tMatch[1];
    let foundIn = null;
    for (const ns of namespaces) {
      if (hasKey(tr, `${ns}.${key}`) && hasKey(en, `${ns}.${key}`)) { foundIn = ns; break; }
    }
    if (!foundIn) {
      missing.add(`${file.replace(/\\/g, '/')}: t("${key}") tried [${namespaces.join(', ')}]`);
    }
  }
}

console.log(`Potential missing/mis-namespaced keys (${missing.size}):`);
for (const m of [...missing].sort()) console.log(m);
