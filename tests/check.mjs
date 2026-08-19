import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error('Inline script not found');
new Function(script);

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) throw new Error(`Duplicate DOM ids: ${[...new Set(duplicates)].join(', ')}`);
const known = new Set(ids);
const missing = [...script.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]).filter(id => !known.has(id));
if (missing.length) throw new Error(`Missing DOM references: ${[...new Set(missing)].join(', ')}`);

const bibleLiteral = script.match(/const BIBLE=(\[.*\]);/)?.[1];
if (!bibleLiteral) throw new Error('Bible data not found');
const bible = JSON.parse(bibleLiteral);
const chapterCount = bible.reduce((sum, [, chapters]) => sum + chapters, 0);
if (bible.length !== 66 || chapterCount !== 1189) throw new Error(`Bible data mismatch: ${bible.length} books, ${chapterCount} chapters`);

console.log('Inline syntax, DOM references, and Bible data are valid.');
