CREATE TABLE IF NOT EXISTS sync_drafts (
  owner_id TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revision INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, draft_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_drafts_owner_created
  ON sync_drafts (owner_id, created_at);
