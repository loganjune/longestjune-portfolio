-- Database tables for the longest june API (Cloudflare D1, which is SQLite).
-- Safe to run more than once.

-- Messages sent through the contact form.
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  message    TEXT    NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS messages_created ON messages (created_at DESC);

-- Backup copies of the site's text content (notes and src/data/*.json), one snapshot per published commit.
CREATE TABLE IF NOT EXISTS snapshots (
  commit_sha   TEXT PRIMARY KEY,
  committed_at TEXT NOT NULL,
  message      TEXT NOT NULL DEFAULT '',
  author       TEXT NOT NULL DEFAULT '',
  saved_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  complete     INTEGER NOT NULL DEFAULT 0
);
-- Which files were in each snapshot. Identical file contents are stored only once (in blobs).
CREATE TABLE IF NOT EXISTS snapshot_files (
  commit_sha TEXT NOT NULL,
  path       TEXT NOT NULL,
  blob_sha   TEXT NOT NULL,
  PRIMARY KEY (commit_sha, path)
);
CREATE TABLE IF NOT EXISTS blobs (
  blob_sha TEXT PRIMARY KEY,
  content  TEXT NOT NULL
);

-- Ready for a future mailing list; nothing writes here yet.
CREATE TABLE IF NOT EXISTS signups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  email      TEXT NOT NULL UNIQUE
);
