CREATE TABLE IF NOT EXISTS sync_marriage (
  owner_id TEXT NOT NULL,
  response_id TEXT NOT NULL,
  item_index INTEGER NOT NULL,
  pass INTEGER NOT NULL,
  text TEXT NOT NULL,
  day TEXT NOT NULL,
  saved_at TEXT NOT NULL,
  revision INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, response_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_marriage_owner_day
  ON sync_marriage (owner_id, day);
