import { Service, type Context } from '@deepseek-ai/cordis';
import type { Config } from '../config.ts';
import { RssReader, type FeedHandle } from '../rss/reader.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Feed registry and RSS fetch/parse engine. */
        rssFeed: FeedService;
    }
}
/** Feed + its latest sync status (for UI list). */
export interface FeedInfo extends FeedHandle {
    lastCheckedAt: string | null;
    lastStatus: number | null;
}
/**
 * Owns the feed list, OPML import, and the RssReader engine.
 */
export declare class FeedService extends Service {
    static inject: string[];
    readonly reader: RssReader;
    private readonly opmlFiles;
    private readonly allowPrivateFeeds;
    constructor(ctx: Context, config: Config);
    /** Import OPML files; fall back to default feeds when none are present. */
    private bootstrapFeeds;
    private onFeedsChanged;
    /** List feeds with their latest sync metadata. */
    listFeeds(): FeedInfo[];
    private readerSyncState;
    private getStore;
    /** Add one feed after SSRF validation; returns false when already present. */
    addFeed(url: string, name?: string): Promise<{
        ok: boolean;
        reason?: string;
    }>;
    /** Reload the feed mirror from the database (used after OPML import). */
    reload(): void;
    feedCount(): number;
}
