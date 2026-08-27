const OWNER = 'owner';
const FIELD_NAMES = new Set([
  'prayers', 'runs', 'lifts', 'bookIdx', 'chapter', 'ideas', 'writing',
  'writeSeconds', 'day', 'done', 'seen', 'at'
]);

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'}
});

function authenticated(request) {
  const host = new URL(request.url).hostname;
  if (host === 'localhost' || host === '127.0.0.1') return true;
  return Boolean(request.headers.get('cf-access-jwt-assertion'));
}

async function snapshot(db) {
  const [meta, fields, chapters, drafts] = await Promise.all([
    db.prepare('SELECT revision, initialized, updated_at FROM sync_meta WHERE owner_id = ?').bind(OWNER).first(),
    db.prepare('SELECT field_name, value_json, revision FROM sync_fields WHERE owner_id = ?').bind(OWNER).all(),
    db.prepare('SELECT chapter_key, is_read, revision FROM sync_chapters WHERE owner_id = ?').bind(OWNER).all(),
    db.prepare('SELECT draft_id, text, created_at, revision, deleted FROM sync_drafts WHERE owner_id = ?').bind(OWNER).all()
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
    if (!row.deleted) state.drafts.push({id: row.draft_id, text: row.text, createdAt: row.created_at});
  }
  return {
    initialized: Boolean(meta?.initialized),
    revision: meta?.revision || 0,
    updatedAt: meta?.updated_at || null,
    state,
    fieldRevisions,
    chapterRevisions,
    draftRevisions
  };
}

export async function onRequestGet({request, env}) {
  if (!authenticated(request)) return json({error: 'Authentication required'}, 401);
  return json(await snapshot(env.DB));
}

export async function onRequestPatch({request, env}) {
  if (!authenticated(request)) return json({error: 'Authentication required'}, 401);
  let body;
  try { body = await request.json(); } catch { return json({error: 'Invalid JSON'}, 400); }
  const requestId = String(body.requestId || '');
  const baseRevision = Number(body.baseRevision);
  const changes = body.changes && typeof body.changes === 'object' ? body.changes : {};
  const chapterChanges = body.chapterChanges && typeof body.chapterChanges === 'object' ? body.chapterChanges : {};
  const draftChanges = body.draftChanges && typeof body.draftChanges === 'object' ? body.draftChanges : {};
  if (!requestId || requestId.length > 100 || !Number.isInteger(baseRevision) || baseRevision < 0) {
    return json({error: 'requestId and a valid baseRevision are required'}, 400);
  }
  const badField = Object.keys(changes).find(key => !FIELD_NAMES.has(key));
  const badChapter = Object.keys(chapterChanges).find(key => !/^\d{1,2}:\d{1,3}$/.test(key));
  const badDraft = Object.entries(draftChanges).find(([id, draft]) =>
    !/^[a-zA-Z0-9-]{8,100}$/.test(id) || !draft || typeof draft !== 'object' ||
    (!draft.deleted && (typeof draft.text !== 'string' || draft.text.length > 100000 || typeof draft.createdAt !== 'string'))
  );
  if (badField || badChapter || badDraft) return json({error: 'Unknown or invalid field, chapter, or draft'}, 400);
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
      statements.push(env.DB.prepare('INSERT INTO sync_drafts (owner_id, draft_id, text, created_at, revision, deleted, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?) ON CONFLICT(owner_id, draft_id) DO UPDATE SET revision=excluded.revision, deleted=1, updated_at=excluded.updated_at')
        .bind(OWNER, id, '', now, revision, now));
    } else {
      statements.push(env.DB.prepare('INSERT INTO sync_drafts (owner_id, draft_id, text, created_at, revision, deleted, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?) ON CONFLICT(owner_id, draft_id) DO UPDATE SET text=excluded.text, created_at=excluded.created_at, revision=excluded.revision, deleted=0, updated_at=excluded.updated_at')
        .bind(OWNER, id, draft.text, draft.createdAt, revision, now));
    }
  }
  statements.push(env.DB.prepare('INSERT INTO sync_requests (owner_id, request_id, revision, created_at) VALUES (?, ?, ?, ?)')
    .bind(OWNER, requestId, revision, now));
  await env.DB.batch(statements);
  return json(await snapshot(env.DB));
}

export function onRequestOptions() {
  return new Response(null, {status: 204, headers: {'allow': 'GET, PATCH, OPTIONS'}});
}
