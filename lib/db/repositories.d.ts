import type { DatabaseSync } from 'node:sqlite';
/** Feed row (feeds table). */
export interface FeedRow {
    id: number;
    url: string;
    name: string | null;
    created_at: string;
}
/** Article row joined with state (articles ⋈ article_state). */
export interface ArticleRow {
    id: string;
    feed_url: string;
    guid: string | null;
    link: string | null;
    title: string | null;
    author: string | null;
    published_at: string | null;
    content_html: string | null;
    content_snippet: string | null;
    markdown_path: string | null;
    created_at: string;
    updated_at: string;
    is_read: number;
    is_favorite: number;
}
/** Article state row. */
export interface ArticleStateRow {
    article_id: string;
    is_read: number;
    is_favorite: number;
    updated_at: string;
}
/** Note row (article_notes). */
export interface NoteRow {
    id: number;
    article_id: string;
    note_path: string;
    created_at: string;
}
/** Activity row joined with article title/link. */
export interface ActivityRow {
    id: number;
    type: string;
    article_id: string | null;
    payload_json: string | null;
    created_at: string;
    article_title: string | null;
    article_link: string | null;
    feed_url: string | null;
    article_markdown_path: string | null;
}
/** Upsert payload for one article. */
export interface ArticleUpsert {
    id: string;
    feed_url: string;
    guid: string | null;
    link: string | null;
    title: string | null;
    author: string | null;
    published_at: string | null;
    content_html: string | null;
    content_snippet: string | null;
    markdown_path: string | null;
}
/** SQLite row from a fetch_cache lookup. */
export interface FetchCacheRow {
    url: string;
    kind: string;
    status: number | null;
    content_type: string | null;
    etag: string | null;
    last_modified: string | null;
    fetched_at: string;
    body: Uint8Array | null;
}
/** SQLite row from feed_sync_state. */
export interface SyncStateRow {
    feed_url: string;
    last_checked_at: string | null;
    last_status: number | null;
    etag: string | null;
    last_modified: string | null;
    updated_at: string;
}
/**
 * Centralized prepared statements. All SQL lives here.
 */
export declare class Repositories {
    private readonly db;
    constructor(db: DatabaseSync);
    private stmtListFeeds;
    private stmtUpsertFeed;
    private stmtCheckFeed;
    private stmtCountFeeds;
    private stmtGetCache;
    private stmtUpsertCache;
    private stmtUpdateCacheMeta;
    private stmtGetSyncState;
    private stmtUpsertSyncState;
    private stmtInsertSyncLog;
    private stmtCountArticles;
    private stmtSyncSummary;
    private stmtUpsertArticle;
    private stmtGetArticle;
    private stmtGetArticleByLink;
    private stmtListRecent;
    private stmtListByDate;
    private stmtListByFeed;
    private stmtSearchArticles;
    private stmtSetState;
    private stmtGetState;
    private stmtInsertNote;
    private stmtListNotes;
    private stmtLogActivity;
    private stmtGetActivity;
    private stmtActivitySince;
    private buildStatements;
    listFeeds(): FeedRow[];
    upsertFeed(url: string, name: string): void;
    feedExists(url: string): boolean;
    ensureFeedExists(url: string, name: string): void;
    countFeeds(): number;
    getCache(url: string): FetchCacheRow | undefined;
    upsertCache(row: {
        url: string;
        kind: string;
        status: number | null;
        content_type: string | null;
        etag: string | null;
        last_modified: string | null;
        body: Uint8Array;
    }): void;
    updateCacheMeta(url: string, meta: {
        kind: string;
        status: number | null;
        content_type: string | null;
        etag: string | null;
        last_modified: string | null;
    }): void;
    getSyncState(feedUrl: string): SyncStateRow | undefined;
    logFeedSync(feedUrl: string, options?: {
        status?: number | null;
        fromCache?: boolean;
        reason?: string | null;
        etag?: string | null;
        lastModified?: string | null;
    }): void;
    countArticles(): number;
    syncSummarySince(startedAtIso: string): {
        feeds_checked: number;
        network_fetch_count: number;
        cache_fallback_count: number;
        head_not_modified_count: number;
        conditional_not_modified_count: number;
        min_interval_skip_count: number;
    };
    upsertArticles(articles: readonly ArticleUpsert[]): void;
    getArticleById(articleId: string): ArticleRow | undefined;
    getArticleByLink(link: string): ArticleRow | undefined;
    listArticlesRecent(limit: number): ArticleRow[];
    listArticlesByDate(fromIso: string, toIso: string, limit?: number): ArticleRow[];
    listArticlesByFeed(feedUrl: string, limit?: number): ArticleRow[];
    searchArticles(query: string, limit?: number): ArticleRow[];
    setArticleState(articleId: string, isRead: number, isFavorite: number): void;
    getArticleState(articleId: string): ArticleStateRow | undefined;
    insertNote(articleId: string, notePath: string): void;
    listNotesByArticle(articleId: string): NoteRow[];
    logActivity(type: string, articleId: string | null, payloadJson: string): void;
    listActivity(limit: number, offset: number): ActivityRow[];
    listActivitySince(isoDate: string): ActivityRow[];
}
