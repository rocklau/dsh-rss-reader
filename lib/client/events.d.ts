export interface RssSyncStartData {
    syncId: string;
    reason: string;
    startedAt: string;
    feedCount: number;
}
export interface RssSyncProgressData {
    syncId: string;
    feedUrl: string;
    feedTitle: string;
    status: number | null;
    fromCache: boolean;
    reason: string;
}
export interface RssSyncEndData {
    syncId: string;
    status: 'success' | 'timeout' | 'error';
    count: number;
    summary: {
        feeds_checked: number;
        network_fetch_count: number;
        cache_fallback_count: number;
        head_not_modified_count: number;
        conditional_not_modified_count: number;
        min_interval_skip_count: number;
        new_articles_count: number;
    };
    error?: string;
}
export interface RssArticleMaterializedData {
    articleId: string;
    title: string;
    url: string;
    feedUrl: string;
    markdownPath: string;
    skipped: boolean;
    reason: string;
}
declare module '@deepseek-ai/dsh-session/types' {
    interface SessionEventMap {
        'openbook-rss/sync-start': RssSyncStartData;
        'openbook-rss/sync-progress': RssSyncProgressData;
        'openbook-rss/sync-end': RssSyncEndData;
        'openbook-rss/article-materialized': RssArticleMaterializedData;
    }
}
