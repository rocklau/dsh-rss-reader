import { Service, type Context } from '@deepseek-ai/cordis';
import type { Config } from '../config.ts';
import type { RssItem } from '../rss/reader.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Article listing, materialization, state, and notes. */
        rssArticle: ArticleService;
    }
}
/** Article projection for UI/tools (DB row + feed name). */
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
/** Materialize an article from its HTML. */
export interface MaterializeRequest {
    url: string;
    feedUrl?: string;
    title?: string;
    publishedAt?: string;
}
/** Materialize outcome. */
export interface MaterializeResult {
    ok: boolean;
    articleId?: string;
    markdownPath?: string;
    skipped?: boolean;
    reason?: string;
    error?: string;
}
/** State update outcome. */
export interface StateUpdateResult {
    ok: boolean;
    articleId: string;
    isRead: boolean;
    isFavorite: boolean;
    skipped?: boolean;
    reason?: string;
}
/**
 * Owns article queries, idempotent materialization, state toggles, and notes.
 */
export declare class ArticleService extends Service {
    static inject: string[];
    private readonly userAgent;
    private readonly materializeInFlight;
    private readonly stateUpdateInFlight;
    constructor(ctx: Context, config: Config);
    private get store();
    private get feeds();
    private mapRow;
    private mapRows;
    /** Most recent articles from the database. */
    listArticlesRecent(limit?: number): ArticleView[];
    /** Articles published on one calendar day. */
    listArticlesByDate(date: string): ArticleView[];
    /** Articles from one feed. */
    listArticlesByFeed(feedUrl: string, limit?: number): ArticleView[];
    /** Full-text-ish search over title, snippet, and link. */
    searchArticles(query: string, limit?: number): ArticleView[];
    /** One article by stable id. */
    getArticle(articleId: string): ArticleView | null;
    /** Articles whose markdown file is missing on disk (orphan check). */
    findOrphanArticles(): ArticleView[];
    /** Persist parsed items into the articles table and backfill state flags. */
    processArticles(items: readonly RssItem[]): Promise<void>;
    /**
     * Materialize one article to local markdown, idempotently (by normalized
     * URL), with in-flight de-duplication.
     */
    materializeArticle(request: MaterializeRequest): Promise<MaterializeResult>;
    /** Toggle read/favorite state, serialized per article. */
    updateArticleState(request: {
        articleId: string;
        isRead?: boolean;
        isFavorite?: boolean;
    }): Promise<StateUpdateResult>;
    /** Write one note markdown for an article and log activity. */
    createNote(request: {
        articleId: string;
        title?: string;
        content?: string;
    }): {
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
}
