import type { FetchQueue } from './httpClient.ts';
import type { Repositories } from '../db/repositories.ts';
/** One parsed RSS item. */
export interface RssItem {
    title: string;
    link: string | undefined;
    guid: string | undefined;
    pubDate: string | undefined;
    content: string | undefined;
    contentSnippet: string | undefined;
    author: string | undefined;
    feedUrl: string;
}
/** One parsed feed. */
export interface ParsedFeed {
    title: string;
    description: string | undefined;
    link: string | undefined;
    items: RssItem[];
}
/** Feed handle held by the reader (feeds table + in-memory mirror). */
export interface FeedHandle {
    url: string;
    name: string;
}
/** Tuning for the reader; every value has a default, none is required. */
export interface ReaderConfig {
    allowPrivateFeeds: boolean;
    feedMinSyncIntervalMs: number;
    feedHeadCheck: boolean;
    feedHeadTimeoutMs: number;
    userAgent: string;
}
/** Sync statistics accumulated during one getAllArticles pass. */
export interface FetchStats {
    feeds_seen: number;
    network_fetch: number;
    cache_fallback: number;
    head_not_modified: number;
    conditional_not_modified: number;
    min_interval_skip: number;
    memory_cache_hit: number;
    parse_error: number;
}
/**
 * RSS fetch/parse engine with the layered cache from OpenBook:
 * in-memory short cache -> min-interval skip -> HEAD validators ->
 * conditional GET -> SQLite BLOB fallback.
 */
export declare class RssReader {
    private readonly repositories;
    private readonly fetchQueue;
    private readonly config;
    feeds: FeedHandle[];
    private readonly cache;
    private readonly feedInFlight;
    private lastFetchStats;
    private readonly parser;
    constructor(repositories: Repositories, fetchQueue: FetchQueue, config: ReaderConfig);
    /** Load the in-memory feed mirror from the feeds table. */
    loadFeeds(): void;
    getLastFetchStats(): FetchStats | null;
    addFeed(url: string, name?: string): Promise<boolean>;
    private buildFeedHeaders;
    private getHeaderMeta;
    private isUnchangedByValidators;
    private checkFeedFreshnessWithHead;
    private fetchWithCache;
    /**
     * Parse one feed, applying the cache layers. Returns null on parse errors.
     */
    parseFeed(url: string, options?: {
        stats?: Partial<FetchStats>;
        verbose?: boolean;
        force?: boolean;
    }): Promise<ParsedFeed | null>;
    private parseXml;
    /**
     * Fetch every feed (batched) and return merged items sorted by pubDate.
     */
    getAllArticles(limit: number | undefined, options?: {
        stats?: FetchStats;
        verbose?: boolean;
        force?: boolean;
    }): Promise<Array<RssItem & {
        feedTitle: string;
        feedName: string;
    }>>;
    /** Articles published within [date 00:00, date 23:59]. */
    getArticlesByDate(date: string | Date, daysWindow?: number): Promise<Array<RssItem & {
        feedTitle: string;
        feedName: string;
    }>>;
}
