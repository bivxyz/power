// GET /api/verse?translation=ESV&book=42&chapter=3&start=16&end=17
//
// One endpoint in front of four publishers, so API keys stay server-side. ESV's terms
// forbid publishing your key, and anything in the page source is published. The
// passphrase check in ./_middleware.js runs first, which also keeps strangers from
// spending these quotas.
//
// Provider key problems answer 502/503, never 401. A 401 tells the client the sync
// passphrase is wrong and it would ask for it again.

// [name, chapters, NLT code, USFM code]. Names match BIBLE in index.html. The NLT
// codes were checked one by one against the live API: it takes OSIS abbreviations,
// except 1Th/2Th and 1Jn/2Jn/3Jn, where the standard 1Thess and 1John return nothing.
const BOOKS = [
  ["Genesis", 50, "Gen", "GEN"],
  ["Exodus", 40, "Exod", "EXO"],
  ["Leviticus", 27, "Lev", "LEV"],
  ["Numbers", 36, "Num", "NUM"],
  ["Deuteronomy", 34, "Deut", "DEU"],
  ["Joshua", 24, "Josh", "JOS"],
  ["Judges", 21, "Judg", "JDG"],
  ["Ruth", 4, "Ruth", "RUT"],
  ["1 Samuel", 31, "1Sam", "1SA"],
  ["2 Samuel", 24, "2Sam", "2SA"],
  ["1 Kings", 22, "1Kgs", "1KI"],
  ["2 Kings", 25, "2Kgs", "2KI"],
  ["1 Chronicles", 29, "1Chr", "1CH"],
  ["2 Chronicles", 36, "2Chr", "2CH"],
  ["Ezra", 10, "Ezra", "EZR"],
  ["Nehemiah", 13, "Neh", "NEH"],
  ["Esther", 10, "Esth", "EST"],
  ["Job", 42, "Job", "JOB"],
  ["Psalms", 150, "Ps", "PSA"],
  ["Proverbs", 31, "Prov", "PRO"],
  ["Ecclesiastes", 12, "Eccl", "ECC"],
  ["Song of Solomon", 8, "Song", "SNG"],
  ["Isaiah", 66, "Isa", "ISA"],
  ["Jeremiah", 52, "Jer", "JER"],
  ["Lamentations", 5, "Lam", "LAM"],
  ["Ezekiel", 48, "Ezek", "EZK"],
  ["Daniel", 12, "Dan", "DAN"],
  ["Hosea", 14, "Hos", "HOS"],
  ["Joel", 3, "Joel", "JOL"],
  ["Amos", 9, "Amos", "AMO"],
  ["Obadiah", 1, "Obad", "OBA"],
  ["Jonah", 4, "Jonah", "JON"],
  ["Micah", 7, "Mic", "MIC"],
  ["Nahum", 3, "Nah", "NAM"],
  ["Habakkuk", 3, "Hab", "HAB"],
  ["Zephaniah", 3, "Zeph", "ZEP"],
  ["Haggai", 2, "Hag", "HAG"],
  ["Zechariah", 14, "Zech", "ZEC"],
  ["Malachi", 4, "Mal", "MAL"],
  ["Matthew", 28, "Matt", "MAT"],
  ["Mark", 16, "Mark", "MRK"],
  ["Luke", 24, "Luke", "LUK"],
  ["John", 21, "John", "JHN"],
  ["Acts", 28, "Acts", "ACT"],
  ["Romans", 16, "Rom", "ROM"],
  ["1 Corinthians", 16, "1Cor", "1CO"],
  ["2 Corinthians", 13, "2Cor", "2CO"],
  ["Galatians", 6, "Gal", "GAL"],
  ["Ephesians", 6, "Eph", "EPH"],
  ["Philippians", 4, "Phil", "PHP"],
  ["Colossians", 4, "Col", "COL"],
  ["1 Thessalonians", 5, "1Th", "1TH"],
  ["2 Thessalonians", 3, "2Th", "2TH"],
  ["1 Timothy", 6, "1Tim", "1TI"],
  ["2 Timothy", 4, "2Tim", "2TI"],
  ["Titus", 3, "Titus", "TIT"],
  ["Philemon", 1, "Phlm", "PHM"],
  ["Hebrews", 13, "Heb", "HEB"],
  ["James", 5, "Jas", "JAS"],
  ["1 Peter", 5, "1Pet", "1PE"],
  ["2 Peter", 3, "2Pet", "2PE"],
  ["1 John", 5, "1Jn", "1JN"],
  ["2 John", 1, "2Jn", "2JN"],
  ["3 John", 1, "3Jn", "3JN"],
  ["Jude", 1, "Jude", "JUD"],
  ["Revelation", 22, "Rev", "REV"]
];

const TRANSLATIONS = ['WEB', 'ESV', 'NLT', 'NIV'];

const NOTICES = {
  WEB: 'World English Bible. Public domain.',
  ESV: 'Scripture quotations are from The ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.',
  NLT: 'Scripture quotations are taken from the Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.'
};

// FUMS wants a stable, non-personal device id. This is a single-user dashboard.
const FUMS_DEVICE = 'power-dashboard';
const NIV_DEFAULT_BIBLE = '78a9f6124f344018-01';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'}
});

class Fail extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    Object.assign(this, {status, code, extra});
  }
}
const unconfigured = t => new Fail(503, 'translation_unconfigured',
  `${t} is not set up on this deployment yet.`, {translation: t});
const keyRejected = t => new Fail(502, 'provider_key_rejected',
  `The ${t} provider rejected this deployment's API key.`, {translation: t});
const notFound = () => new Fail(404, 'not_found', 'Verse not found. Check the reference and try again.');

const tidy = text => String(text || '').replace(/\s+/g, ' ').trim();

async function web(ref) {
  const q = `${ref.name} ${ref.chapter}:${ref.start}${ref.end !== ref.start ? '-' + ref.end : ''}`;
  const response = await fetch(`https://bible-api.com/${encodeURIComponent(q)}?translation=web`);
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok || data.error || !tidy(data.text)) throw notFound();
  return {reference: data.reference || q, text: tidy(data.text), copyright: NOTICES.WEB};
}

async function esv(ref, env) {
  if (!env.ESV_API_KEY) throw unconfigured('ESV');
  const params = new URLSearchParams({
    q: `${ref.name} ${ref.chapter}:${ref.start}-${ref.end}`,
    'include-passage-references': 'false',
    'include-verse-numbers': 'false',
    'include-first-verse-numbers': 'false',
    'include-footnotes': 'false',
    'include-footnote-body': 'false',
    'include-headings': 'false',
    'include-short-copyright': 'false',
    'include-copyright': 'false',
    'indent-paragraphs': '0',
    'indent-poetry': 'false',
    'indent-declares': '0',
    'indent-psalm-doxology': '0'
  });
  const response = await fetch(`https://api.esv.org/v3/passage/text/?${params}`, {
    headers: {Authorization: `Token ${env.ESV_API_KEY}`}
  });
  if (response.status === 401 || response.status === 403) throw keyRejected('ESV');
  let data = {};
  try { data = await response.json(); } catch {}
  const text = tidy((data.passages || []).join(' '));
  if (!response.ok || !text) throw notFound();
  return {reference: data.canonical, text, copyright: NOTICES.ESV, link: 'https://www.esv.org'};
}

// NLT answers with HTML. Footnote bodies (.tn) nest spans inside spans, so they are
// removed with a real parser before the remaining flat tags are stripped.
async function nlt(ref, env) {
  const url = new URL('https://api.nlt.to/api/passages');
  url.searchParams.set('ref', `${ref.nlt}.${ref.chapter}.${ref.start}${ref.end !== ref.start ? '-' + ref.end : ''}`);
  // Without a key NLT meters by IP, and Workers share egress IPs with everyone else.
  if (env.NLT_API_KEY) url.searchParams.set('key', env.NLT_API_KEY);
  const response = await fetch(url);
  if (response.status === 401 || response.status === 403) throw keyRejected('NLT');
  if (!response.ok) throw new Fail(502, 'provider_error', 'The NLT service did not answer.');
  const header = {text: ''};
  const verses = [];
  const cleaned = await new HTMLRewriter()
    .on('h2.bk_ch_vs_header', {text(chunk) { header.text += chunk.text; }})
    .on('verse_export', {element(el) { verses.push(Number(el.getAttribute('vn'))); }})
    // headings, psalm superscriptions and book divisions are not the verse asked for
    .on('h1, h2, h3, h4, h5, h6, .psa-title, .psa-book, .vn, .a-tn, .tn', {element(el) { el.remove(); }})
    .transform(response).text();
  // NLT clamps a verse past the end of a chapter to its last verse instead of erroring,
  // so John 3:150 comes back as John 3:36. Refuse anything that does not start where asked.
  if (!verses.includes(ref.start)) throw notFound();
  const body = cleaned.match(/<div id="bibletext"[\s\S]*<\/div>/)?.[0] || '';
  const text = tidy(body.replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' '));
  if (!text) throw notFound();
  return {reference: tidy(header.text).replace(/,\s*NLT$/, '') || null, text, copyright: NOTICES.NLT};
}

// NIV is licensed through API.Bible. Its terms require each displayed passage to be
// reported to FUMS; done here, server-side, so no tracking script loads on the page.
async function niv(ref, env, context) {
  if (!env.API_BIBLE_KEY) throw unconfigured('NIV');
  const bible = env.NIV_BIBLE_ID || NIV_DEFAULT_BIBLE;
  const first = `${ref.usfm}.${ref.chapter}.${ref.start}`;
  const id = ref.end === ref.start ? first : `${first}-${ref.usfm}.${ref.chapter}.${ref.end}`;
  const params = new URLSearchParams({
    'content-type': 'text',
    'include-notes': 'false',
    'include-titles': 'false',
    'include-chapter-numbers': 'false',
    'include-verse-numbers': 'false',
    'include-verse-spans': 'false',
    'fums-version': '3'
  });
  const response = await fetch(`https://api.scripture.api.bible/v1/bibles/${bible}/passages/${id}?${params}`, {
    headers: {'api-key': env.API_BIBLE_KEY}
  });
  if (response.status === 401 || response.status === 403) throw keyRejected('NIV');
  if (response.status === 404) throw notFound();
  let data = {};
  try { data = await response.json(); } catch {}
  const text = tidy(data.data?.content);
  if (!response.ok || !text) throw new Fail(502, 'provider_error', 'The NIV service did not return a passage.');
  const token = data.meta?.fumsToken;
  if (token) {
    const fums = `https://fums.api.bible/f3?t=${encodeURIComponent(token)}&dId=${FUMS_DEVICE}&sId=${crypto.randomUUID()}`;
    context.waitUntil(fetch(fums).catch(() => {}));
  }
  return {reference: data.data.reference, text, copyright: tidy(data.data.copyright)};
}

const PROVIDERS = {WEB: web, ESV: esv, NLT: nlt, NIV: niv};

function parse(url) {
  const p = url.searchParams;
  const translation = String(p.get('translation') || 'WEB').toUpperCase();
  const book = Number(p.get('book'));
  const chapter = Number(p.get('chapter'));
  const start = Number(p.get('start'));
  const end = Number(p.get('end') || start);
  const row = BOOKS[book];
  if (!TRANSLATIONS.includes(translation)) throw new Fail(400, 'bad_request', 'Unknown translation.');
  if (!Number.isInteger(book) || !row) throw new Fail(400, 'bad_request', 'Unknown book.');
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > row[1]) throw new Fail(400, 'bad_request', 'Enter a valid chapter for the selected book.');
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > 200) {
    throw new Fail(400, 'bad_request', 'Enter one verse or a range such as 28-30.');
  }
  return {translation, name: row[0], nlt: row[2], usfm: row[3], chapter, start, end};
}

export async function onRequestGet(context) {
  try {
    const ref = parse(new URL(context.request.url));
    const passage = await PROVIDERS[ref.translation](ref, context.env, context);
    return json({translation: ref.translation, ...passage});
  } catch (error) {
    if (error instanceof Fail) return json({error: error.message, code: error.code, ...error.extra}, error.status);
    return json({error: 'Could not reach the verse service.', code: 'provider_error'}, 502);
  }
}
