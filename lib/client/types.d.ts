/**
 * Wire types shared between the OpenBook client and the host Remote API.
 * These mirror src/services/*.ts JSON contracts; the RPC contribution in
 * remote.ts validates against them at the client boundary.
 */
export interface FeedInfo {
    url: string;
    name: string;
    lastCheckedAt: string | null;
    lastStatus: number | null;
}
export interface ArticleView {
    id: string;
    feedUrl: string;
    feedName: string;
    title: string | null;
    link: string | null;
    guid: string | null;
    pubDate: string | null;
    author: string | null;
    content: string | null;
    contentSnippet: string | null;
    markdownPath: string | null;
    isRead: boolean;
    isFavorite: boolean;
}
export interface RssSyncSummary {
    feeds_checked: number;
    network_fetch_count: number;
    cache_fallback_count: number;
    head_not_modified_count: number;
    conditional_not_modified_count: number;
    min_interval_skip_count: number;
    new_articles_count: number;
}
export interface SyncStatus {
    status: 'idle' | 'running' | 'success' | 'timeout' | 'error';
    reason: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    lastCount: number;
    lastError: string | null;
    lastSummary: RssSyncSummary | null;
    inFlight: boolean;
}
export interface SyncResult {
    ok: boolean;
    status: string;
    reason: string;
    count: number;
    startedAt: string;
    finishedAt?: string;
    summary?: RssSyncSummary;
    error?: string;
    fetchStats?: Record<string, number> | null;
}
export interface ActivityItem {
    id: number;
    type: string;
    articleId: string | null;
    createdAt: string;
    payload: Record<string, unknown>;
    article: {
        id: string;
        title: string | null;
        link: string | null;
        feedUrl: string | null;
        markdownPath: string | null;
    } | null;
}
export interface MaterializeResult {
    ok: boolean;
    articleId?: string;
    markdownPath?: string;
    skipped?: boolean;
    reason?: string;
    error?: string;
}
export interface StateUpdateResult {
    ok: boolean;
    articleId: string;
    isRead: boolean;
    isFavorite: boolean;
    skipped?: boolean;
    reason?: string;
}
