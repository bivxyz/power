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
if (!script.includes("e:()=>false") || !script.includes("if(added&&!state.done.e)")) throw new Error('Daily Exercise completion behavior is missing');
if (!script.includes("'meditationVerse','day'")) throw new Error('Daily rollover or meditation verse keys are not synchronized');

if (!script.includes("timerManuallyPaused") || !script.includes("e.inputType?e.inputType.startsWith('insert')")) throw new Error('Automatic writing timer behavior is missing');
if (!script.includes('draftChanges') || !script.includes('function saveDraft()') || !script.includes('function continueDraft(id)')) throw new Error('Draft lifecycle or synchronization behavior is missing');
if (!html.includes('id="draft-save"') || !html.includes('id="draft-list"')) throw new Error('Draft controls are missing');
if (!html.includes('id="clear-day"') || !script.includes('function clearDay()')) throw new Error('Clear day control is missing');
if (!script.includes('state.done={...DEFAULTS.done}') || !script.includes('state.seen={...DEFAULTS.seen}')) throw new Error('Clear day completion reset is missing');
if (!html.includes('id="meditation-find"') || !html.includes('id="meditation-verse"')) throw new Error('Meditation verse controls are missing');
if (!script.includes("'meditationVerse','day'") || !script.includes('async function findMeditationVerse()')) throw new Error('Meditation verse lookup or synchronization is missing');
console.log('Inline syntax, DOM references, Bible data, daily clearing, automatic timer, drafts, and meditation verses are valid.');
