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
if (!script.includes("'meditationVerse','chaptersToday','day','week'")) throw new Error('Daily rollover or meditation verse keys are not synchronized');

if (!script.includes("timerManuallyPaused") || !script.includes("e.inputType?e.inputType.startsWith('insert')")) throw new Error('Automatic writing timer behavior is missing');
if (!script.includes('draftChanges') || !script.includes('function saveDraft()') || !script.includes('function continueDraft(id)')) throw new Error('Draft lifecycle or synchronization behavior is missing');
if (!html.includes('id="draft-save"') || !html.includes('id="draft-list"')) throw new Error('Draft controls are missing');
if (!html.includes('id="clear-day"') || !script.includes('function clearDay()')) throw new Error('Clear day control is missing');
if (!script.includes('state.done={...DEFAULTS.done}') || !script.includes('state.seen={...DEFAULTS.seen}')) throw new Error('Clear day completion reset is missing');
if (!html.includes('id="meditation-find"') || !html.includes('id="meditation-verse"')) throw new Error('Meditation verse controls are missing');
if (!script.includes("'meditationVerse','chaptersToday','day','week'") || !script.includes('async function findMeditationVerse()')) throw new Error('Meditation verse lookup or synchronization is missing');
const sync = fs.readFileSync(new URL('../functions/api/sync.js', import.meta.url), 'utf8');

if (!html.includes('data-view="week"') || !html.includes('id="view-week"') || !html.includes('id="week-grid"')) throw new Error('Week view markup is missing');
if (!script.includes('function renderWeek()') || !script.includes('function mirrorToday()') || !script.includes('function weekKeys()')) throw new Error('Week rendering or history mirroring is missing');
if (!script.includes('function letterStreak(k)') || !script.includes('function letterLongest(k)') || !html.includes('id="week-streaks"')) throw new Error('Streak tracking is missing');
if (!script.includes('const WEEK_TARGETS=') || !html.includes('id="week-targets"')) throw new Error('Weekly targets are missing');
if (!script.includes('renderWeek()') || !script.includes('renderTimer(); renderCards(); renderWeek()')) throw new Error('Week view is not in the render chain');

if (!script.includes('const IDEA_CAP=5;')) throw new Error('Idea cap is not five');
if (/state\.ideas\.length>=10|10-n|31\+n/.test(script)) throw new Error('Hardcoded ten-idea limit or sample week count survives');
if (/placeholder="[^"]*Shopify|Done for today/.test(html + script)) throw new Error('Idea placeholder text survives');

if (!html.includes('id="write-title"') || !script.includes("'writing','writeTitle'")) throw new Error('Write subject line is missing or unsynchronized');
if (!script.includes('function draftLabel(draft)') || !script.includes('title:state.writeTitle')) throw new Error('Drafts do not carry the subject line');

if (!script.includes('historyChanges') || !sync.includes('historyChanges') || !sync.includes('sync_history')) throw new Error('History synchronization is missing');
if (!sync.includes("'chaptersToday'") || !script.includes('chaptersToday')) throw new Error('Daily chapter counter is missing');
if (!script.includes('function hasPatch(patch)') || !script.includes('patch.historyChanges')) throw new Error('History changes are not counted in the sync patch');

if (!script.includes('function rollWeeklyState()') || !script.includes('function rollState()')) throw new Error('Weekly rollover is missing');
if (!script.includes('state.runs=0;\n  state.lifts=0;')) throw new Error('Weekly rollover does not clear the exercise counts');
if (/rollDailyState\(\)/.test(script.replace(/function rollDailyState\(\)/, '').replace('const rolledDay=rollDailyState();', ''))) throw new Error('A rollDailyState call bypasses the weekly rollover');

const migrations = fs.readdirSync(new URL('../migrations', import.meta.url));
if (!migrations.includes('0003_week.sql')) throw new Error('Week migration is missing');

console.log('Inline syntax, DOM references, Bible data, daily clearing, automatic timer, drafts, meditation verses, week view, streaks, weekly targets, and history sync are valid.');
