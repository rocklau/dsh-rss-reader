import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { Context } from '@deepseek-ai/cordis';
import type { ArticleView, MaterializeResult, StateUpdateResult } from './articleService.ts';
import type { ActivityItem } from './activityService.ts';
import type { FeedInfo } from './feedService.ts';
import type { SyncResult, SyncStatus } from './syncService.ts';
declare module '@deepseek-ai/dsh-llm/types' {
    interface MessageSourceMap {
        /** Article context and discussion submitted by the RSS reader. */
        'openbook-rss': {
            readonly kind: 'openbook-rss';
        };
    }
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Remote API surface consumed by the OpenBook web client. */
        rssApi: RssApi;
    }
}
/** Request payloads (JSON-serializable; the wire contract with the client). */
export interface MaterializeRequestJson {
    url: string;
    feedUrl?: string;
    title?: string;
    publishedAt?: string;
}
export interface StateUpdateRequestJson {
    articleId: string;
    isRead?: boolean;
    isFavorite?: boolean;
}
export interface NoteCreateRequestJson {
    articleId: string;
    title?: string;
    content?: string;
}
export interface DiscussRequestJson {
    sessionId: string;
    articleId: string;
    /** Free-form question or a preset command (summarize/translate/key-points). */
    prompt?: string;
    /** A text range the user highlighted in the reader. */
    highlight?: string;
}
export interface SetReadingRequestJson {
    sessionId: string;
    articleId: string;
}
/**
 * Remote API for the OpenBook web client. Every method is a plain-JSON
 * contract; the matching client-side descriptors live in client/remote.ts.
 */
export declare class RssApi extends TypertRemoteService {
    static inject: string[];
    constructor(ctx: Context);
    private get store();
    private get feeds();
    private get articles();
    private get activities();
    private get sync();
    /** Resolve only an already-live Agent; reading does not resume stored Sessions. */
    private resolveAgent;
    /** List feeds with latest sync metadata. */
    listFeeds(): FeedInfo[];
    /** Add a feed (SSRF validated). */
    addFeed(url: string, name?: string): Promise<{
        ok: boolean;
        reason?: string;
    }>;
    /** Most recent articles. */
    listArticles(limit?: number): ArticleView[];
    /** Articles published on one calendar day (local time). */
    listArticlesByDate(date: string): ArticleView[];
    /** Articles from one feed. */
    listArticlesByFeed(feedUrl: string, limit?: number): ArticleView[];
    /** Search articles. */
    searchArticles(query: string, limit?: number): ArticleView[];
    /** One article by stable id. */
    getArticle(articleId: string): ArticleView | null;
    /** Materialize an article to local markdown (idempotent). */
    materialize(request: MaterializeRequestJson): Promise<MaterializeResult>;
    /** Toggle read/favorite state. */
    updateState(request: StateUpdateRequestJson): Promise<StateUpdateResult>;
    /** Write a note for an article. */
    createNote(request: NoteCreateRequestJson): {
        ok: boolean;
        articleId: string;
        notePath: string;
    };
    /** Notes attached to one article. */
    listNotes(articleId: string): {
        articleId: string;
        notes: Array<{
            id: number;
            notePath: string;
            createdAt: string;
        }>;
    };
    /** Activity timeline. */
    activity(limit?: number, offset?: number): {
        limit: number;
        offset: number;
        items: ActivityItem[];
    };
    /** Weekly review markdown. */
    exportReview(days?: number): string;
    /** Live sync status. */
    syncStatus(): SyncStatus;
    /**
     * Trigger a warm sync. The optional Session id is accepted but unused;
     * progress is available through {@link syncStatus}, not Session telemetry.
     */
    warmSync(limit?: number, timeoutMs?: number, reason?: string, _sessionId?: string): Promise<SyncResult>;
    /** Orphan articles whose markdown file is missing. */
    orphanArticles(): ArticleView[];
    /**
     * Inject the currently-reading article as ambient context into the session's
     * agent. `agent.inject()` parks the context without triggering a response;
     * the agent consumes it on its next turn, so the conversation "knows" what
     * the user is reading without a chat round-trip.
     */
    setReading(request: SetReadingRequestJson): {
        ok: boolean;
        reason?: string;
    };
    /**
     * Push the selected article into the session as a user turn so the agent
     * discusses it. Carries an optional highlight range and a prompt (a preset
     * command or a free-form question), plus the article's readable content.
     */
    discussArticle(request: DiscussRequestJson): {
        ok: boolean;
        reason?: string;
    };
}
