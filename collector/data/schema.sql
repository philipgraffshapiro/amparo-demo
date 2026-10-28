PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY, source_id TEXT NOT NULL, started_at TEXT NOT NULL,
  completed_at TEXT, status TEXT NOT NULL, receipt_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS captures (
  id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id),
  source_id TEXT NOT NULL, url TEXT NOT NULL, fetched_at TEXT NOT NULL,
  status INTEGER NOT NULL, headers_json TEXT NOT NULL,
  sha256 TEXT NOT NULL, body BLOB NOT NULL, error TEXT
);
CREATE TABLE IF NOT EXISTS versions (
  id TEXT PRIMARY KEY, item_id TEXT NOT NULL, parser_version TEXT NOT NULL,
  capture_id TEXT NOT NULL REFERENCES captures(id), ordinal INTEGER NOT NULL,
  source_json TEXT NOT NULL, payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY, source_id TEXT NOT NULL, external_id TEXT NOT NULL,
  version_id TEXT NOT NULL REFERENCES versions(id), kind TEXT NOT NULL,
  title TEXT NOT NULL, published_at TEXT, review_status TEXT NOT NULL DEFAULT 'pending',
  UNIQUE(source_id, external_id)
);
CREATE TABLE IF NOT EXISTS occurrences (
  capture_id TEXT NOT NULL REFERENCES captures(id), ordinal INTEGER NOT NULL,
  item_id TEXT NOT NULL, version_id TEXT NOT NULL REFERENCES versions(id),
  PRIMARY KEY(capture_id, ordinal)
);
CREATE TABLE IF NOT EXISTS quarantine (
  capture_id TEXT NOT NULL REFERENCES captures(id), ordinal INTEGER NOT NULL,
  reason TEXT NOT NULL, source_json TEXT NOT NULL,
  PRIMARY KEY(capture_id, ordinal)
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES items(id),
  version_id TEXT NOT NULL REFERENCES versions(id), decision TEXT NOT NULL,
  note TEXT NOT NULL, actor TEXT NOT NULL, reviewed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS items_source_date ON items(source_id, published_at DESC);
CREATE INDEX IF NOT EXISTS captures_run ON captures(run_id);
CREATE INDEX IF NOT EXISTS captures_source_url ON captures(source_id,url);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, topic TEXT NOT NULL,
  area_id TEXT, consent_at TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  item_id TEXT NOT NULL REFERENCES items(id), version_id TEXT NOT NULL REFERENCES versions(id),
  status TEXT NOT NULL, created_at TEXT NOT NULL, payload_json TEXT NOT NULL,
  UNIQUE(subscription_id, item_id, version_id)
);
CREATE INDEX IF NOT EXISTS subscriptions_owner ON subscriptions(owner_id);

CREATE TABLE IF NOT EXISTS source_jobs (
  source_id TEXT PRIMARY KEY, status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, last_attempt_at TEXT NOT NULL,
  next_run_at TEXT NOT NULL, last_success_at TEXT, last_result_json TEXT
);
CREATE TABLE IF NOT EXISTS operation_locks (
  name TEXT PRIMARY KEY, owner TEXT NOT NULL, expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS source_releases (
  id TEXT PRIMARY KEY, source_id TEXT NOT NULL, origin TEXT NOT NULL,
  file_name TEXT NOT NULL, data_through TEXT, captured_at TEXT NOT NULL,
  sha256 TEXT NOT NULL, format TEXT NOT NULL, body BLOB NOT NULL
);
