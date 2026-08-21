import type { DatabaseSync } from 'node:sqlite'

/**
 * Ported OpenBook schema. Versioned by the migration list order: append new
 * migrations, never edit shipped ones.
 */
const MIGRATIONS: readonly string[] = [
  // v1: initial schema
  `
  CREATE TABLE feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE fetch_cache (
    url TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    status INTEGER,
    content_type TEXT,
    etag TEXT,
    last_modified TEXT,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    body BLOB
  );
  CREATE INDEX IF NOT EXISTS idx_fetch_cache_kind_time ON fetch_cache(kind, fetched_at);

  CREATE TABLE feed_sync_state (
    feed_url TEXT PRIMARY KEY,
    last_checked_at TEXT,
    last_status INTEGER,
    etag TEXT,
    last_modified TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(feed_url) REFERENCES feeds(url) ON DELETE CASCADE
  );

  CREATE TABLE feed_sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feed_url TEXT NOT NULL,
    status INTEGER,
    from_cache INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(feed_url) REFERENCES feeds(url) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_feed_sync_log_feed_time ON feed_sync_log(feed_url, fetched_at DESC);

  CREATE TABLE articles (
    id TEXT PRIMARY KEY,
    feed_url TEXT NOT NULL,
    guid TEXT,
    link TEXT,
    title TEXT,
    author TEXT,
    published_at TEXT,
    content_html TEXT,
    content_snippet TEXT,
    markdown_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(feed_url) REFERENCES feeds(url) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_articles_feed_time ON articles(feed_url, published_at);
  CREATE INDEX IF NOT EXISTS idx_articles_link ON articles(link);

  CREATE TABLE article_state (
    article_id TEXT PRIMARY KEY,
    is_read INTEGER NOT NULL DEFAULT 0,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
  );

  CREATE TABLE article_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id TEXT NOT NULL,
    note_path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_article_notes_article ON article_notes(article_id);

  CREATE TABLE activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    article_id TEXT,
    payload_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_activity_log_time ON activity_log(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_activity_log_article ON activity_log(article_id);
  `,
]

/**
 * Guarded unique indexes that may fail on legacy databases with duplicates;
 * each is attempted independently and never fails the migration.
 */
const GUARDED_UNIQUE_INDEXES: readonly string[] = [
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_feed_guid_unique
    ON articles(feed_url, guid)
    WHERE guid IS NOT NULL AND guid != ''`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_feed_link_unguided_unique
    ON articles(feed_url, link)
    WHERE link IS NOT NULL AND link != '' AND (guid IS NULL OR guid = '')`,
]

/** Apply all pending migrations and guarded indexes. */
export function migrate(db: DatabaseSync): void {
  const table = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='_schema_version'`,
  ).get() as { name: string } | undefined

  if (table === undefined) {
    db.exec('CREATE TABLE _schema_version (version INTEGER NOT NULL)')
    db.prepare('INSERT INTO _schema_version (version) VALUES (0)').run()
  }

  const row = db.prepare('SELECT version FROM _schema_version').get() as { version: number }
  let version = row.version

  for (let index = version; index < MIGRATIONS.length; index++) {
    const sql = MIGRATIONS[index]
    if (sql === undefined) continue
    db.exec(sql)
    version = index + 1
  }

  if (version !== row.version) {
    db.prepare('UPDATE _schema_version SET version=?').run(version)
  }

  for (const sql of GUARDED_UNIQUE_INDEXES) {
    try {
      db.exec(sql)
    } catch (error) {
      // Legacy databases may contain duplicates; skip the index, keep going.
      console.warn('[openbook-rss] skipped unique index due to existing duplicates:', (error as Error).message)
    }
  }
}
