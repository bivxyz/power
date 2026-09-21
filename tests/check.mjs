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
if (!script.includes("'meditationVerse','chaptersToday','marriage','day','week'")) throw new Error('Daily rollover or meditation verse keys are not synchronized');

if (!script.includes("timerManuallyPaused") || !script.includes("e.inputType?e.inputType.startsWith('insert')")) throw new Error('Automatic writing timer behavior is missing');
if (!script.includes('draftChanges') || !script.includes('function saveDraft()') || !script.includes('function continueDraft(id)')) throw new Error('Draft lifecycle or synchronization behavior is missing');
if (!html.includes('id="draft-save"') || !html.includes('id="draft-list"')) throw new Error('Draft controls are missing');
if (!html.includes('id="clear-day"') || !script.includes('function clearDay()')) throw new Error('Clear day control is missing');
if (!script.includes('state.done={...DEFAULTS.done}') || !script.includes('state.seen={...DEFAULTS.seen}')) throw new Error('Clear day completion reset is missing');
if (!html.includes('id="meditation-find"') || !html.includes('id="meditation-verse"')) throw new Error('Meditation verse controls are missing');
if (!script.includes("'meditationVerse','chaptersToday','marriage','day','week'") || !script.includes('async function findMeditationVerse()')) throw new Error('Meditation verse lookup or synchronization is missing');
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

if (!script.includes('function toggles(') || !script.includes('toggles($(\'pray-taps\')')) throw new Error('Prayer slots are not independent toggles');
if (!script.includes('function normalizePrayers(') || !script.includes('prayers:normalizePrayers(saved.prayers)')) throw new Error('Legacy prayer counts are not converted on load');
if (!script.includes('state.prayers=normalizePrayers(state.prayers)')) throw new Error('A legacy prayer count from the cloud is not converted');
if (!script.includes('p:()=>prayerCount()>=1')) throw new Error('One prayer should be enough to complete P');
if (/state\.prayers\s*>=\s*3|state\.prayers\s*=\s*0\b/.test(script)) throw new Error('Prayer is still treated as a cumulative count');
if (!script.includes("taps($('run-taps')") || !script.includes("taps($('lift-taps')")) throw new Error('Exercise should keep the cumulative tap model');

if (!script.includes("const MERGE_FIELDS=['done','seen','at','prayers']")) throw new Error('Per-key merge fields are missing');
if (!script.includes('function mergeContainer(base,sub)') || !script.includes('function subDiff(')) throw new Error('Container merge helpers are missing');
if (script.includes('Object.assign(state,localChanges.changes)')) throw new Error('applyCloud still replaces merge fields wholesale, which drops one device\'s letters');
if (!script.includes('state[key]=mergeContainer(state[key],sub)')) throw new Error('Local sub-key changes are not merged over the cloud container');
if (!/return \{changes,keyed,/.test(script)) throw new Error('diffFromBaseline does not return per-key changes');
if (!script.includes("redirect:'manual'")) throw new Error("An expired Access session 302s cross-origin; without redirect:'manual' it surfaces as a bare TypeError");
if (!script.includes("response.type==='opaqueredirect'") || !script.includes('error.needsLogin=true')) throw new Error('An expired Access session is not distinguished from the cloud being down');
if (!script.includes('const rejectionMessage=')) throw new Error('Expired-session and misconfigured-Access need different messages');
if (!html.includes('id="sync-blocked"') || !script.includes('function setSyncBlocked(')) throw new Error('A rejected sync has no visible banner');
if (!script.includes('lastFocusPull') || !script.includes('startCloudSync();')) throw new Error('The tab does not re-sync when it regains focus');
if (script.includes('Sign in through Cloudflare Access')) throw new Error('Stale status copy: a 401 here is a misconfiguration, not a sign-in prompt');

const seed = fs.readFileSync(new URL('../marriage-items.js', import.meta.url), 'utf8');
const items = new Function(seed + '; return MARRIAGE_ITEMS;')();
if (items.length !== 35) throw new Error(`Gottman seed should hold 35 items, found ${items.length}`);
for (let w = 1; w <= 7; w++) {
  const n = items.filter(item => item.week === w).length;
  if (n !== 5) throw new Error(`Week ${w} should hold 5 items, found ${n}`);
}
if (items.some(item => !item.belief || !item.task)) throw new Error('Every item needs a separate belief and task');
if (items.some(item => item.type)) throw new Error('Seed items should carry no type tag; date ideas are entered by hand');
if (!/personal use/i.test(seed) || !/[Nn]ot for distribution/.test(seed) || !/Gottman/.test(seed)) throw new Error('Seed file is missing its personal-use licence notice');

if (!html.includes('data-view="marriage"') || !html.includes('id="view-marriage"')) throw new Error('Marriage tab is missing');
if (!html.includes('marriage-items.js')) throw new Error('Seed file is not loaded by the page');
if (!script.includes('function renderMarriage()') || !script.includes('function rollMarriage()')) throw new Error('Marriage rendering or daily advance is missing');
if (!script.includes('function saveMarriageResponse()') || !html.includes('id="mx-response"')) throw new Error('Response capture is missing');
if (!html.includes('id="mx-history-list"') || !script.includes('function renderMarriageHistory()')) throw new Error('Response history is missing');
if (script.includes('MX_DATE_INDEXES') || script.includes('function monthOptions')) throw new Error('Gottman date rotation should be gone');
if (!html.includes('id="mx-idea-input"') || !html.includes('id="mx-pool"') || !html.includes('id="mx-slots"')) throw new Error('Date idea pool or shortlist markup is missing');
if (!script.includes('function addDateIdea()') || !script.includes('function slotIdea(id,slot)') || !script.includes('function unslotIdea(slot)')) throw new Error('Date idea capture or shortlisting is missing');
if (!script.includes('function dateNights()') || !script.includes('function mxDateEntry(')) throw new Error('Date nights do not reach the history tab');
if (!script.includes("addEventListener('pointerdown',startIdeaDrag)") || !script.includes('setPointerCapture')) throw new Error('Idea dragging is not built on pointer events');
if (/\bdragstart\b|\bdropEffect\b|\bdataTransfer\b/.test(script)) throw new Error('HTML5 drag-and-drop does not fire on touch; use pointer events');
if (!/touch-action:\s*none/.test(html)) throw new Error('Drag handle needs touch-action:none or the phone will scroll instead of dragging');
if (!script.includes('marriageChanges') || !sync.includes('sync_marriage')) throw new Error('Marriage responses are not synchronized');
if (!script.includes("'chaptersToday','marriage'")) throw new Error('Marriage state is not in the sync field list');

const mxLogic = script.slice(script.indexOf('const MX_SLOTS='), script.indexOf('function renderMeter()'));
const mxListeners = script.slice(script.indexOf("$('mx-save').addEventListener"), script.indexOf("document.querySelectorAll('.tab')"));
const mxMarkup = html.slice(html.indexOf('id="view-marriage"'), html.indexOf('id="view-bible"'));
if (!mxLogic || !mxListeners || !mxMarkup) throw new Error('Could not isolate the marriage feature for its content checks');
const marriageSurface = seed + mxLogic + mxListeners + mxMarkup;

if (/generate/i.test(marriageSurface)) throw new Error('The word "generate" appears in the marriage feature');
if (/\u2665|\u2764|heart|pink|crimson|magenta/i.test(marriageSurface)) throw new Error('Marriage feature introduced hearts or pink');
if (/fetch\(|XMLHttpRequest|https?:\/\//.test(mxLogic + mxListeners)) throw new Error('Marriage feature makes a network call');

const migrations = fs.readdirSync(new URL('../migrations', import.meta.url));
if (!migrations.includes('0003_week.sql')) throw new Error('Week migration is missing');
if (!migrations.includes('0004_marriage.sql')) throw new Error('Marriage migration is missing');

console.log('Inline syntax, DOM references, Bible data, daily clearing, automatic timer, drafts, meditation verses, week view, streaks, weekly targets, history sync, and the marriage tab are valid.');
