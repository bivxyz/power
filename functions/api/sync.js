const OWNER = 'owner';
const FIELD_NAMES = new Set([
  'prayers', 'runs', 'lifts', 'bookIdx', 'chapter', 'ideas', 'writing', 'writeTitle',
  'writeSeconds', 'meditationVerse', 'chaptersToday', 'marriage', 'day', 'week', 'done', 'seen', 'at'
]);
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const LETTER_KEYS = new Set(['p', 'o', 'w', 'e', 'r']);
const COUNT_KEYS = new Set(['ideas', 'writeSeconds', 'chapters']);

function validResponse(r) {
  return Boolean(r) && typeof r === 'object' && !Array.isArray(r) &&
    Number.isInteger(r.itemIndex) && r.itemIndex >= 0 && r.itemIndex < 500 &&
    Number.isInteger(r.pass) && r.pass >= 1 && r.pass < 100000 &&
    typeof r.text === 'string' && r.text.length <= 100000 &&
    typeof r.day === 'string' && DAY_KEY.test(r.day) &&
    typeof r.savedAt === 'string' && r.savedAt.length <= 40;
}

function validDayRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
  return Object.entries(row).every(([key, value]) => {
    if (LETTER_KEYS.has(key)) return typeof value === 'boolean';
    if (COUNT_KEYS.has(key)) return Number.isInteger(value) && value >= 0 && value <= 1000000;
    return false;
  });
}

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'}
});

const KEY_HEADER = 'x-power-key';

const sha256 = value => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

// Hashing both sides first means the comparison is over two fixed-length buffers,
// so a wrong passphrase cannot be narrowed down by how long the check takes.
async function authenticated(request, env) {
  const expected = env.SYNC_SECRET;
  if (!expected) {
    // No secret configured. Allow local development, never a deployed origin.
    const host = new URL(request.url).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  }
  const presented = request.headers.get(KEY_HEADER);
  if (!presented) return false;
  const [a, b] = await Promise.all([sha256(presented), sha256(expected)]);
  return crypto.subtle.timingSafeEqual(a, b);
}

const unauthorized = presented => json({
  error: presented ? 'That passphrase is not right.' : 'A sync passphrase is required.',
  code: presented ? 'key_rejected' : 'key_required'
}, 401);

async function snapshot(db) {
  const [meta, fields, chapters, drafts, history, marriage] = await Promise.all([
    db.prepare('SELECT revision, initialized, updated_at FROM sync_meta WHERE owner_id = ?').bind(OWNER).first(),
    db.prepare('SELECT field_name, value_json, revision FROM sync_fields WHERE owner_id = ?').bind(OWNER).all(),
    db.prepare('SELECT chapter_key, is_read, revision FROM sync_chapters WHERE owner_id = ?').bind(OWNER).all(),
    db.prepare('SELECT draft_id, title, text, created_at, revision, deleted FROM sync_drafts WHERE owner_id = ?').bind(OWNER).all(),
    db.prepare('SELECT day, day_json, revision FROM sync_history WHERE owner_id = ?').bind(OWNER).all(),
    db.prepare('SELECT response_id, item_index, pass, text, day, saved_at, revision FROM sync_marriage WHERE owner_id = ?').bind(OWNER).all()
  ]);
  const state = {};
  const fieldRevisions = {};
  for (const row of fields.results || []) {
    try { state[row.field_name] = JSON.parse(row.value_json); } catch {}
    fieldRevisions[row.field_name] = row.revision;
  }
  const readChapters = [];
  const chapterRevisions = {};
  for (const row of chapters.results || []) {
    if (row.is_read) readChapters.push(row.chapter_key);
    chapterRevisions[row.chapter_key] = row.revision;
  }
  state.readChapters = readChapters;
  state.drafts = [];
  const draftRevisions = {};
  for (const row of drafts.results || []) {
    draftRevisions[row.draft_id] = row.revision;
    if (!row.deleted) state.drafts.push({id: row.draft_id, title: row.title || '', text: row.text, createdAt: row.created_at});
  }
  state.history = {};
  const historyRevisions = {};
  for (const row of history.results || []) {
    try { state.history[row.day] = JSON.parse(row.day_json); } catch {}
    historyRevisions[row.day] = row.revision;
  }
  state.marriageResponses = [];
  const marriageRevisions = {};
  for (const row of marriage.results || []) {
    marriageRevisions[row.response_id] = row.revision;
    state.marriageResponses.push({
      id: row.response_id, itemIndex: row.item_index, pass: row.pass,
      text: row.text, day: row.day, savedAt: row.saved_at
    });
  }
  return {
    initialized: Boolean(meta?.initialized),
    revision: meta?.revision || 0,
    updatedAt: meta?.updated_at || null,
    state,
    fieldRevisions,
    chapterRevisions,
    draftRevisions,
    historyRevisions,
    marriageRevisions
  };
}

export async function onRequestGet({request, env}) {
  if (!await authenticated(request, env)) return unauthorized(request.headers.get(KEY_HEADER));
  return json(await snapshot(env.DB));
}

export async function onRequestPatch({request, env}) {
  if (!await authenticated(request, env)) return unauthorized(request.headers.get(KEY_HEADER));
  let body;
  try { body = await request.json(); } catch { return json({error: 'Invalid JSON'}, 400); }
  const requestId = String(body.requestId || '');
  const baseRevision = Number(body.baseRevision);
  const changes = body.changes && typeof body.changes === 'object' ? body.changes : {};
  const chapterChanges = body.chapterChanges && typeof body.chapterChanges === 'object' ? body.chapterChanges : {};
  const draftChanges = body.draftChanges && typeof body.draftChanges === 'object' ? body.draftChanges : {};
  const historyChanges = body.historyChanges && typeof body.historyChanges === 'object' ? body.historyChanges : {};
  const marriageChanges = body.marriageChanges && typeof body.marriageChanges === 'object' ? body.marriageChanges : {};
  if (!requestId || requestId.length > 100 || !Number.isInteger(baseRevision) || baseRevision < 0) {
    return json({error: 'requestId and a valid baseRevision are required'}, 400);
  }
  const badField = Object.keys(changes).find(key => !FIELD_NAMES.has(key));
  const badChapter = Object.keys(chapterChanges).find(key => !/^\d{1,2}:\d{1,3}$/.test(key));
  const badDraft = Object.entries(draftChanges).find(([id, draft]) =>
    !/^[a-zA-Z0-9-]{8,100}$/.test(id) || !draft || typeof draft !== 'object' ||
    (!draft.deleted && (typeof draft.text !== 'string' || draft.text.length > 100000 || typeof draft.createdAt !== 'string' ||
      (draft.title !== undefined && (typeof draft.title !== 'string' || draft.title.length > 500))))
  );
  const badHistory = Object.entries(historyChanges).find(([day, row]) => !DAY_KEY.test(day) || !validDayRow(row));
  const badMarriage = Object.entries(marriageChanges).find(([id, r]) =>
    !/^[a-zA-Z0-9-]{8,100}$/.test(id) || !validResponse(r));
  if (badField || badChapter || badDraft || badHistory || badMarriage) {
    return json({error: 'Unknown or invalid field, chapter, draft, history day, or response'}, 400);
  }
  if (JSON.stringify(body).length > 250000) return json({error: 'Payload too large'}, 413);

  const prior = await env.DB.prepare('SELECT revision FROM sync_requests WHERE owner_id = ? AND request_id = ?')
    .bind(OWNER, requestId).first();
  if (prior) return json(await snapshot(env.DB));

  const current = await snapshot(env.DB);
  if (!current.initialized && !body.initialize) return json({error: 'Sync has not been initialized'}, 428);
  if (current.initialized && body.initialize) return json({error: 'Sync is already initialized', current}, 409);

  const conflicts = [];
  if (!body.force && baseRevision < current.revision) {
    for (const key of Object.keys(changes)) {
      if ((current.fieldRevisions[key] || 0) > baseRevision) conflicts.push(`field:${key}`);
    }
    for (const key of Object.keys(chapterChanges)) {
      if ((current.chapterRevisions[key] || 0) > baseRevision) conflicts.push(`chapter:${key}`);
    }
    for (const key of Object.keys(historyChanges)) {
      if ((current.historyRevisions[key] || 0) > baseRevision) conflicts.push(`history:${key}`);
    }
    for (const key of Object.keys(marriageChanges)) {
      if ((current.marriageRevisions[key] || 0) > baseRevision) conflicts.push(`response:${key}`);
    }
  }
  if (conflicts.length) return json({error: 'Conflict', conflicts, current}, 409);

  const now = new Date().toISOString();
  const revision = current.revision + 1;
  const statements = [
    env.DB.prepare(`INSERT INTO sync_meta (owner_id, revision, initialized, updated_at) VALUES (?, ?, 1, ?)
      ON CONFLICT(owner_id) DO UPDATE SET revision=excluded.revision, initialized=1, updated_at=excluded.updated_at`)
      .bind(OWNER, revision, now)
  ];
  for (const [key, value] of Object.entries(changes)) {
    statements.push(env.DB.prepare(`INSERT INTO sync_fields (owner_id, field_name, value_json, revision, updated_at)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(owner_id, field_name) DO UPDATE SET
      value_json=excluded.value_json, revision=excluded.revision, updated_at=excluded.updated_at`)
      .bind(OWNER, key, JSON.stringify(value), revision, now));
  }
  for (const [key, value] of Object.entries(chapterChanges)) {
    statements.push(env.DB.prepare(`INSERT INTO sync_chapters (owner_id, chapter_key, is_read, revision, updated_at)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(owner_id, chapter_key) DO UPDATE SET
      is_read=excluded.is_read, revision=excluded.revision, updated_at=excluded.updated_at`)
      .bind(OWNER, key, value ? 1 : 0, revision, now));
  }
  for (const [id, draft] of Object.entries(draftChanges)) {
    if (draft.deleted) {
      statements.push(env.DB.prepare('INSERT INTO sync_drafts (owner_id, draft_id, title, text, created_at, revision, deleted, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT(owner_id, draft_id) DO UPDATE SET revision=excluded.revision, deleted=1, updated_at=excluded.updated_at')
        .bind(OWNER, id, '', '', now, revision, now));
    } else {
      statements.push(env.DB.prepare('INSERT INTO sync_drafts (owner_id, draft_id, title, text, created_at, revision, deleted, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?) ON CONFLICT(owner_id, draft_id) DO UPDATE SET title=excluded.title, text=excluded.text, created_at=excluded.created_at, revision=excluded.revision, deleted=0, updated_at=excluded.updated_at')
        .bind(OWNER, id, draft.title || '', draft.text, draft.createdAt, revision, now));
    }
  }
  for (const [day, row] of Object.entries(historyChanges)) {
    statements.push(env.DB.prepare(`INSERT INTO sync_history (owner_id, day, day_json, revision, updated_at)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(owner_id, day) DO UPDATE SET
      day_json=excluded.day_json, revision=excluded.revision, updated_at=excluded.updated_at`)
      .bind(OWNER, day, JSON.stringify(row), revision, now));
  }
  for (const [id, r] of Object.entries(marriageChanges)) {
    statements.push(env.DB.prepare(`INSERT INTO sync_marriage
      (owner_id, response_id, item_index, pass, text, day, saved_at, revision, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(owner_id, response_id) DO UPDATE SET
      item_index=excluded.item_index, pass=excluded.pass, text=excluded.text, day=excluded.day,
      saved_at=excluded.saved_at, revision=excluded.revision, updated_at=excluded.updated_at`)
      .bind(OWNER, id, r.itemIndex, r.pass, r.text, r.day, r.savedAt, revision, now));
  }
  statements.push(env.DB.prepare('INSERT INTO sync_requests (owner_id, request_id, revision, created_at) VALUES (?, ?, ?, ?)')
    .bind(OWNER, requestId, revision, now));
  await env.DB.batch(statements);
  return json(await snapshot(env.DB));
}

export function onRequestOptions() {
  return new Response(null, {status: 204, headers: {'allow': 'GET, PATCH, OPTIONS'}});
}
