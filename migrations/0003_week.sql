CREATE TABLE IF NOT EXISTS sync_history (
  owner_id TEXT NOT NULL,
  day TEXT NOT NULL,
  day_json TEXT NOT NULL,
  revision INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, day)
);

CREATE INDEX IF NOT EXISTS idx_sync_history_owner_day
  ON sync_history (owner_id, day);

ALTER TABLE sync_drafts ADD COLUMN title TEXT NOT NULL DEFAULT '';
