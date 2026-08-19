CREATE TABLE IF NOT EXISTS sync_meta (
  owner_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL DEFAULT 0,
  initialized INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_fields (
  owner_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  value_json TEXT NOT NULL,
  revision INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, field_name)
);

CREATE TABLE IF NOT EXISTS sync_chapters (
  owner_id TEXT NOT NULL,
  chapter_key TEXT NOT NULL,
  is_read INTEGER NOT NULL,
  revision INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, chapter_key)
);

CREATE TABLE IF NOT EXISTS sync_requests (
  owner_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_requests_created
  ON sync_requests (created_at);
