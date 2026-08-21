import type { DatabaseSync } from 'node:sqlite'
import { withTransaction } from './database.ts'

/** Feed row (feeds table). */
export interface FeedRow {
  id: number
  url: string
  name: string | null
  created_at: string
}

/** Article row joined with state (articles ⋈ article_state). */
export interface ArticleRow {
  id: string
  feed_url: string
  guid: string | null
  link: string | null
  title: string | null
  author: string | null
  published_at: string | null
  content_html: string | null
  content_snippet: string | null
  markdown_path: string | null
  created_at: string
  updated_at: string
  is_read: number
  is_favorite: number
}

/** Article state row. */
export interface ArticleStateRow {
  article_id: string
  is_read: number
  is_favorite: number
  updated_at: string
}

/** Note row (article_notes). */
export interface NoteRow {
  id: number
  article_id: string
  note_path: string
  created_at: string
}

/** Activity row joined with article title/link. */
export interface ActivityRow {
  id: number
  type: string
  article_id: string | null
  payload_json: string | null
  created_at: string
  article_title: string | null
  article_link: string | null
  feed_url: string | null
  article_markdown_path: string | null
}

/** Upsert payload for one article. */
export interface ArticleUpsert {
  id: string
  feed_url: string
  guid: string | null
  link: string | null
  title: string | null
  author: string | null
  published_at: string | null
  content_html: string | null
  content_snippet: string | null
  markdown_path: string | null
}

/** SQLite row from a fetch_cache lookup. */
export interface FetchCacheRow {
  url: string
  kind: string
  status: number | null
  content_type: string | null
  etag: string | null
  last_modified: string | null
  fetched_at: string
  body: Uint8Array | null
}

/** SQLite row from feed_sync_state. */
export interface SyncStateRow {
  feed_url: string
  last_checked_at: string | null
  last_status: number | null
  etag: string | null
  last_modified: string | null
  updated_at: string
}

/** SQLite row casts: node:sqlite rows are loose records; typed views are ours. */
function rows<T>(value: unknown): T[] {
  return value as T[]
}

/**
 * Centralized prepared statements. All SQL lives here.
 */
export class Repositories {
  constructor(private readonly db: DatabaseSync) {
    this.buildStatements()
  }

  // feeds -------------------------------------------------------------------
  private stmtListFeeds!: ReturnType<DatabaseSync['prepare']>
  private stmtUpsertFeed!: ReturnType<DatabaseSync['prepare']>
  private stmtCheckFeed!: ReturnType<DatabaseSync['prepare']>
  private stmtCountFeeds!: ReturnType<DatabaseSync['prepare']>

  // fetch_cache -------------------------------------------------------------
  private stmtGetCache!: ReturnType<DatabaseSync['prepare']>
  private stmtUpsertCache!: ReturnType<DatabaseSync['prepare']>
  private stmtUpdateCacheMeta!: ReturnType<DatabaseSync['prepare']>

  // feed_sync_state/log -----------------------------------------------------
  private stmtGetSyncState!: ReturnType<DatabaseSync['prepare']>
  private stmtUpsertSyncState!: ReturnType<DatabaseSync['prepare']>
  private stmtInsertSyncLog!: ReturnType<DatabaseSync['prepare']>
  private stmtCountArticles!: ReturnType<DatabaseSync['prepare']>
  private stmtSyncSummary!: ReturnType<DatabaseSync['prepare']>

  // articles ----------------------------------------------------------------
  private stmtUpsertArticle!: ReturnType<DatabaseSync['prepare']>
  private stmtGetArticle!: ReturnType<DatabaseSync['prepare']>
  private stmtGetArticleByLink!: ReturnType<DatabaseSync['prepare']>
  private stmtListRecent!: ReturnType<DatabaseSync['prepare']>
  private stmtListByDate!: ReturnType<DatabaseSync['prepare']>
  private stmtListByFeed!: ReturnType<DatabaseSync['prepare']>
  private stmtSearchArticles!: ReturnType<DatabaseSync['prepare']>

  // article_state -----------------------------------------------------------
  private stmtSetState!: ReturnType<DatabaseSync['prepare']>
  private stmtGetState!: ReturnType<DatabaseSync['prepare']>

  // article_notes -----------------------------------------------------------
  private stmtInsertNote!: ReturnType<DatabaseSync['prepare']>
  private stmtListNotes!: ReturnType<DatabaseSync['prepare']>

  // activity_log ------------------------------------------------------------
  private stmtLogActivity!: ReturnType<DatabaseSync['prepare']>
  private stmtGetActivity!: ReturnType<DatabaseSync['prepare']>
  private stmtActivitySince!: ReturnType<DatabaseSync['prepare']>

  private buildStatements(): void {
    this.stmtListFeeds = this.db.prepare('SELECT * FROM feeds ORDER BY id ASC')
    this.stmtUpsertFeed = this.db.prepare(`
      INSERT INTO feeds(url, name) VALUES (?, ?)
      ON CONFLICT(url) DO UPDATE SET name=excluded.name
    `)
    this.stmtCheckFeed = this.db.prepare('SELECT 1 AS ok FROM feeds WHERE url=?')
    this.stmtCountFeeds = this.db.prepare('SELECT COUNT(*) AS c FROM feeds')

    this.stmtGetCache = this.db.prepare(
      'SELECT url, kind, status, content_type, etag, last_modified, fetched_at, body FROM fetch_cache WHERE url=?',
    )
    this.stmtUpsertCache = this.db.prepare(`
      INSERT INTO fetch_cache(url, kind, status, content_type, etag, last_modified, fetched_at, body)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
      ON CONFLICT(url) DO UPDATE SET
        kind=excluded.kind,
        status=excluded.status,
        content_type=excluded.content_type,
        etag=excluded.etag,
        last_modified=excluded.last_modified,
        fetched_at=datetime('now'),
        body=excluded.body
    `)
    this.stmtUpdateCacheMeta = this.db.prepare(`
      UPDATE fetch_cache
      SET
        kind=COALESCE(?, kind),
        status=COALESCE(?, status),
        content_type=COALESCE(?, content_type),
        etag=COALESCE(?, etag),
        last_modified=COALESCE(?, last_modified),
        fetched_at=datetime('now')
      WHERE url=?
    `)

    this.stmtGetSyncState = this.db.prepare('SELECT * FROM feed_sync_state WHERE feed_url=?')
    this.stmtUpsertSyncState = this.db.prepare(`
      INSERT INTO feed_sync_state(feed_url, last_checked_at, last_status, etag, last_modified, updated_at)
      VALUES (?, datetime('now'), ?, ?, ?, datetime('now'))
      ON CONFLICT(feed_url) DO UPDATE SET
        last_checked_at=datetime('now'),
        last_status=excluded.last_status,
        etag=COALESCE(excluded.etag, feed_sync_state.etag),
        last_modified=COALESCE(excluded.last_modified, feed_sync_state.last_modified),
        updated_at=datetime('now')
    `)
    this.stmtInsertSyncLog = this.db.prepare(
      'INSERT INTO feed_sync_log(feed_url, status, from_cache, reason) VALUES (?, ?, ?, ?)',
    )
    this.stmtCountArticles = this.db.prepare('SELECT COUNT(*) AS c FROM articles')
    this.stmtSyncSummary = this.db.prepare(`
      SELECT
        COUNT(DISTINCT feed_url) AS feeds_checked,
        SUM(CASE WHEN reason='network_fetch' THEN 1 ELSE 0 END) AS network_fetch_count,
        SUM(CASE WHEN reason='cache_fallback' THEN 1 ELSE 0 END) AS cache_fallback_count,
        SUM(CASE WHEN reason='head_not_modified' THEN 1 ELSE 0 END) AS head_not_modified_count,
        SUM(CASE WHEN reason='conditional_not_modified' THEN 1 ELSE 0 END) AS conditional_not_modified_count,
        SUM(CASE WHEN reason='min_interval_skip' THEN 1 ELSE 0 END) AS min_interval_skip_count
      FROM feed_sync_log
      WHERE fetched_at >= datetime(?)
    `)

    this.stmtUpsertArticle = this.db.prepare(`
      INSERT INTO articles(id, feed_url, guid, link, title, author, published_at, content_html, content_snippet, markdown_path, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        author=excluded.author,
        published_at=excluded.published_at,
        content_html=excluded.content_html,
        content_snippet=excluded.content_snippet,
        markdown_path=COALESCE(excluded.markdown_path, articles.markdown_path),
        updated_at=datetime('now')
    `)
    this.stmtGetArticle = this.db.prepare('SELECT * FROM articles WHERE id=?')
    this.stmtGetArticleByLink = this.db.prepare(`
      SELECT * FROM articles
      WHERE link=?
      ORDER BY (markdown_path IS NOT NULL) DESC, updated_at DESC
      LIMIT 1
    `)
    this.stmtListRecent = this.db.prepare(`
      SELECT ar.*, st.is_read, st.is_favorite
      FROM articles ar
      LEFT JOIN article_state st ON st.article_id = ar.id
      ORDER BY datetime(ar.published_at) DESC, datetime(ar.updated_at) DESC
      LIMIT ?
    `)
    this.stmtListByDate = this.db.prepare(`
      SELECT ar.*, st.is_read, st.is_favorite
      FROM articles ar
      LEFT JOIN article_state st ON st.article_id = ar.id
      WHERE datetime(ar.published_at) >= datetime(?)
        AND datetime(ar.published_at) <= datetime(?)
      ORDER BY datetime(ar.published_at) DESC, datetime(ar.updated_at) DESC
      LIMIT ?
    `)
    this.stmtListByFeed = this.db.prepare(`
      SELECT ar.*, st.is_read, st.is_favorite
      FROM articles ar
      LEFT JOIN article_state st ON st.article_id = ar.id
      WHERE ar.feed_url = ?
      ORDER BY datetime(ar.published_at) DESC, datetime(ar.updated_at) DESC
      LIMIT ?
    `)
    this.stmtSearchArticles = this.db.prepare(`
      SELECT ar.*, st.is_read, st.is_favorite
      FROM articles ar
      LEFT JOIN article_state st ON st.article_id = ar.id
      WHERE ar.title LIKE ? OR ar.content_snippet LIKE ? OR ar.link LIKE ?
      ORDER BY datetime(ar.published_at) DESC
      LIMIT ?
    `)

    this.stmtSetState = this.db.prepare(`
      INSERT INTO article_state(article_id, is_read, is_favorite, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(article_id) DO UPDATE SET
        is_read=excluded.is_read,
        is_favorite=excluded.is_favorite,
        updated_at=datetime('now')
    `)
    this.stmtGetState = this.db.prepare(
      'SELECT article_id, is_read, is_favorite, updated_at FROM article_state WHERE article_id=?',
    )

    this.stmtInsertNote = this.db.prepare(
      'INSERT INTO article_notes(article_id, note_path) VALUES (?, ?)',
    )
    this.stmtListNotes = this.db.prepare(
      'SELECT id, article_id, note_path, created_at FROM article_notes WHERE article_id=? ORDER BY id DESC',
    )

    this.stmtLogActivity = this.db.prepare(
      'INSERT INTO activity_log(type, article_id, payload_json) VALUES (?, ?, ?)',
    )
    this.stmtGetActivity = this.db.prepare(`
      SELECT a.id, a.type, a.article_id, a.payload_json, a.created_at,
             ar.title AS article_title, ar.link AS article_link, ar.feed_url AS feed_url,
             ar.markdown_path AS article_markdown_path
      FROM activity_log a
      LEFT JOIN articles ar ON ar.id = a.article_id
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `)
    this.stmtActivitySince = this.db.prepare(`
      SELECT a.id, a.type, a.article_id, a.payload_json, a.created_at,
             ar.title AS article_title, ar.link AS article_link, ar.feed_url AS feed_url
      FROM activity_log a
      LEFT JOIN articles ar ON ar.id = a.article_id
      WHERE a.created_at >= ?
      ORDER BY a.created_at DESC
      LIMIT 2000
    `)
  }

  // feeds -------------------------------------------------------------------
  listFeeds(): FeedRow[] {
    return rows<FeedRow>(this.stmtListFeeds.all())
  }

  upsertFeed(url: string, name: string): void {
    this.stmtUpsertFeed.run(url, name)
  }

  feedExists(url: string): boolean {
    return (this.stmtCheckFeed.get(url) as { ok: number } | undefined) !== undefined
  }

  ensureFeedExists(url: string, name: string): void {
    if (!this.feedExists(url)) this.stmtUpsertFeed.run(url, name)
  }

  countFeeds(): number {
    return ((this.stmtCountFeeds.get() as { c: number }).c)
  }

  // fetch_cache -------------------------------------------------------------
  getCache(url: string): FetchCacheRow | undefined {
    return this.stmtGetCache.get(url) as FetchCacheRow | undefined
  }

  upsertCache(row: {
    url: string
    kind: string
    status: number | null
    content_type: string | null
    etag: string | null
    last_modified: string | null
    body: Uint8Array
  }): void {
    this.stmtUpsertCache.run(
      row.url, row.kind, row.status, row.content_type, row.etag, row.last_modified, row.body,
    )
  }

  updateCacheMeta(
    url: string,
    meta: { kind: string; status: number | null; content_type: string | null; etag: string | null; last_modified: string | null },
  ): void {
    this.stmtUpdateCacheMeta.run(
      meta.kind, meta.status, meta.content_type, meta.etag, meta.last_modified, url,
    )
  }

  // feed_sync_state/log -----------------------------------------------------
  getSyncState(feedUrl: string): SyncStateRow | undefined {
    return this.stmtGetSyncState.get(feedUrl) as SyncStateRow | undefined
  }

  logFeedSync(
    feedUrl: string,
    options: { status?: number | null; fromCache?: boolean; reason?: string | null; etag?: string | null; lastModified?: string | null } = {},
  ): void {
    this.stmtUpsertSyncState.run(
      feedUrl, options.status ?? null, options.etag ?? null, options.lastModified ?? null,
    )
    this.stmtInsertSyncLog.run(feedUrl, options.status ?? null, options.fromCache ? 1 : 0, options.reason ?? null)
  }

  countArticles(): number {
    return ((this.stmtCountArticles.get() as { c: number }).c)
  }

  syncSummarySince(startedAtIso: string): {
    feeds_checked: number
    network_fetch_count: number
    cache_fallback_count: number
    head_not_modified_count: number
    conditional_not_modified_count: number
    min_interval_skip_count: number
  } {
    const row = this.stmtSyncSummary.get(startedAtIso) as Record<string, number | null>
    return {
      feeds_checked: row.feeds_checked ?? 0,
      network_fetch_count: row.network_fetch_count ?? 0,
      cache_fallback_count: row.cache_fallback_count ?? 0,
      head_not_modified_count: row.head_not_modified_count ?? 0,
      conditional_not_modified_count: row.conditional_not_modified_count ?? 0,
      min_interval_skip_count: row.min_interval_skip_count ?? 0,
    }
  }

  // articles ----------------------------------------------------------------
  upsertArticles(articles: readonly ArticleUpsert[]): void {
    withTransaction(this.db, () => {
      for (const a of articles) {
        this.stmtUpsertArticle.run(
          a.id, a.feed_url, a.guid, a.link, a.title, a.author, a.published_at,
          a.content_html, a.content_snippet, a.markdown_path,
        )
      }
    })
  }

  getArticleById(articleId: string): ArticleRow | undefined {
    return this.stmtGetArticle.get(articleId) as ArticleRow | undefined
  }

  getArticleByLink(link: string): ArticleRow | undefined {
    return this.stmtGetArticleByLink.get(link) as ArticleRow | undefined
  }

  listArticlesRecent(limit: number): ArticleRow[] {
    return rows<ArticleRow>(this.stmtListRecent.all(limit))
  }

  listArticlesByDate(fromIso: string, toIso: string, limit = 500): ArticleRow[] {
    return rows<ArticleRow>(this.stmtListByDate.all(fromIso, toIso, limit))
  }

  listArticlesByFeed(feedUrl: string, limit = 200): ArticleRow[] {
    return rows<ArticleRow>(this.stmtListByFeed.all(feedUrl, limit))
  }

  searchArticles(query: string, limit = 50): ArticleRow[] {
    const pattern = `%${query}%`
    return rows<ArticleRow>(this.stmtSearchArticles.all(pattern, pattern, pattern, limit))
  }

  // article_state -----------------------------------------------------------
  setArticleState(articleId: string, isRead: number, isFavorite: number): void {
    this.stmtSetState.run(articleId, isRead, isFavorite)
  }

  getArticleState(articleId: string): ArticleStateRow | undefined {
    return this.stmtGetState.get(articleId) as ArticleStateRow | undefined
  }

  // article_notes -----------------------------------------------------------
  insertNote(articleId: string, notePath: string): void {
    this.stmtInsertNote.run(articleId, notePath)
  }

  listNotesByArticle(articleId: string): NoteRow[] {
    return rows<NoteRow>(this.stmtListNotes.all(articleId))
  }

  // activity_log ------------------------------------------------------------
  logActivity(type: string, articleId: string | null, payloadJson: string): void {
    this.stmtLogActivity.run(type, articleId, payloadJson)
  }

  listActivity(limit: number, offset: number): ActivityRow[] {
    return rows<ActivityRow>(this.stmtGetActivity.all(limit, offset))
  }

  listActivitySince(isoDate: string): ActivityRow[] {
    return rows<ActivityRow>(this.stmtActivitySince.all(isoDate))
  }
}
