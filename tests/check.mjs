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

if (!script.includes('const IDEA_CAP=10;')) throw new Error('Observation cap is not ten');
if (!html.includes('<h2>Observations</h2>') || /<h2>Organize<\/h2>/.test(html)) throw new Error('Organize card was not renamed to Observations');
if (!script.includes("state.ideas.push({text:v, at:clock()})") || !script.includes('const obsText=')) throw new Error('Observations are not timestamped or legacy strings are not handled');
if (!script.includes('`observations: ${state.ideas.length}/${IDEA_CAP}`') || !script.includes("'## Observations'")) throw new Error('Daily note export does not use Observations');
if (/state\.ideas\.length>=10|10-n|31\+n/.test(script)) throw new Error('Hardcoded observation limit or sample week count survives');
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
if (!script.includes("redirect:'manual'")) throw new Error("A gateway in front of the API 302s cross-origin; without redirect:'manual' that reads as a bare TypeError");
if (!script.includes("response.type==='opaqueredirect'") || !script.includes('error.stillGated=true')) throw new Error('A still-gated hostname is not distinguished from a rejected passphrase');
if (!sync.includes('crypto.subtle.timingSafeEqual')) throw new Error('Passphrase comparison must be constant time');
if (!sync.includes('const KEY_HEADER') || !script.includes("headers['x-power-key']=syncKey")) throw new Error('The passphrase is not sent as a header');
if (/[?&](key|secret|pass)/i.test(script.slice(script.indexOf('async function apiSync')))) throw new Error('The passphrase must never ride in a URL');
if (!sync.includes('if (!expected)') || !sync.includes("host === 'localhost'")) throw new Error('An unset secret must fail closed on any deployed origin');
if (sync.includes('cf-access-jwt-assertion')) throw new Error('Cloudflare Access check should be gone');
if (!html.includes('id="sync-key"') || !html.includes('type="password"')) throw new Error('There is no masked field to enter the passphrase');
if (!script.includes('if(!syncBlocked) setSyncStatus')) throw new Error('A blocked sync can still report "Synced" when there is nothing queued to push');
if (!script.includes('function saveSyncKey()') || !script.includes('store.set(KEY_STORE,syncKey)')) throw new Error('The passphrase is not persisted per device');
if (/SYNC_FIELDS.*KEY_STORE|'power\.key\.v1'.*SYNC_FIELDS/.test(script)) throw new Error('The passphrase must not be part of synced state');
if (script.includes('cloudBaseline.key') || script.includes('state.syncKey')) throw new Error('The passphrase must not live in the state blob');
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
