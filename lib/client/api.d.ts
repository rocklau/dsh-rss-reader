import type { TypertRemoteNamespaceMap } from '@deepseek-ai/dsh-typert-protocol';
import type { ActivityItem, ArticleView, FeedInfo, MaterializeResult, StateUpdateResult, SyncResult, SyncStatus } from './types.ts';
export interface RssDataApi {
    listFeeds(): Promise<FeedInfo[]>;
    addFeed(url: string, name?: string): Promise<{
        ok: boolean;
        reason?: string;
    }>;
    listArticlesRecent(limit: number): Promise<ArticleView[]>;
    listArticlesByDate(date: string): Promise<ArticleView[]>;
    listArticlesByFeed(feedUrl: string, limit?: number): Promise<ArticleView[]>;
    searchArticles(query: string): Promise<ArticleView[]>;
    getArticle(articleId: string): Promise<ArticleView | null>;
    materialize(request: {
        url: string;
        title?: string;
        feedUrl?: string;
        publishedAt?: string;
    }): Promise<MaterializeResult>;
    updateState(request: {
        articleId: string;
        isRead?: boolean;
        isFavorite?: boolean;
    }): Promise<StateUpdateResult>;
    createNote(request: {
        articleId: string;
        title?: string;
        content?: string;
    }): Promise<{
        ok: boolean;
        articleId: string;
        notePath: string;
    }>;
    listNotes(articleId: string): Promise<{
        articleId: string;
        notes: Array<{
            id: number;
            notePath: string;
            createdAt: string;
        }>;
    }>;
    activity(limit: number): Promise<{
        limit: number;
        offset: number;
        items: ActivityItem[];
    }>;
    exportReview(days: number): Promise<string>;
    syncStatus(): Promise<SyncStatus>;
    warmSync(limit?: number, timeoutMs?: number, reason?: string, sessionId?: string): Promise<SyncResult>;
    /** Inject the currently-reading article as ambient context into the session's agent. */
    setReading(request: {
        sessionId: string;
        articleId: string;
    }): Promise<{
        ok: boolean;
        reason?: string;
    }>;
    /** Push the article into the session as a user turn so the agent discusses it. */
    discussArticle(request: {
        sessionId: string;
        articleId: string;
        prompt?: string;
        highlight?: string;
    }): Promise<{
        ok: boolean;
        reason?: string;
    }>;
}
/** The wire namespace as declared by the client-side TypertRemoteMap merge. */
export type RssApiFace = TypertRemoteNamespaceMap['rssApi'];
/**
 * Build the injected data API over the mounted rssApi namespace service.
 *
 * The `remote` object is the gateway's namespace service, obtained through
 * `ctx.get('remote.rssApi')` after `ctx.remote.$mount()` has registered it.
 * That lookup bypasses the inject-sensitive ctx property proxy, and method
 * calls on the returned service are plain RPC dispatches, so component-level
 * calls carry no proxy check.
 * @param remote - the mounted rssApi namespace service.
 */
export declare function createRssDataApi(remote: RssApiFace): RssDataApi;
