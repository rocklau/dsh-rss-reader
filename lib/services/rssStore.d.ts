import { Service, type Context } from '@deepseek-ai/cordis';
import type { DatabaseSync } from 'node:sqlite';
import type { Config } from '../config.ts';
import { Repositories } from '../db/repositories.ts';
import { FetchQueue } from '../rss/httpClient.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** OpenBook data root: database, repositories, fetch queue, file layout. */
        rssStore: RssStore;
    }
}
/** JSON grep index shape. */
export interface JsonIndex {
    version: number;
    generated_at: string | null;
    feeds: Array<{
        url: string;
        name: string;
    }>;
    articles: Array<Record<string, unknown>>;
}
/**
 * Owns the SQLite database, the prepared repositories, the shared fetch
 * queue, and the markdown/JSON file layout. Everything else injects this.
 */
export declare class RssStore extends Service {
    readonly db: DatabaseSync;
    readonly repositories: Repositories;
    readonly fetchQueue: FetchQueue;
    readonly dataDir: string;
    readonly dbPath: string;
    readonly jsonIndexPath: string;
    readonly articlesDir: string;
    readonly notesDir: string;
    constructor(ctx: Context, config: Config);
    /** Read the JSON grep index, tolerating a missing or corrupt file. */
    readJsonIndex(): JsonIndex;
    /** Write the JSON grep index. */
    writeJsonIndex(index: JsonIndex): void;
}
