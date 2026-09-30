import Schema from '@deepseek-ai/schemastery';
/** Plugin configuration (validated at load; defaults apply). */
export interface Config {
    /** Root data directory (SQLite, markdown articles, notes, index.json). */
    dataDir: string;
    /** Allow DNS-resolved private-network feed addresses (SSRF bypass). */
    allowPrivateFeeds: boolean;
    /** Run a warm sync automatically at plugin startup. */
    startupSync: boolean;
    /** Warm sync article limit at startup. */
    startupSyncLimit: number;
    /** Minimum interval between two syncs of one feed, in milliseconds. */
    feedMinSyncIntervalMs: number;
    /** Enable HEAD validator checks before conditional GET. */
    feedHeadCheck: boolean;
    /** HEAD request timeout, in milliseconds. */
    feedHeadTimeoutMs: number;
    /** Concurrent feed fetches. */
    fetchConcurrency: number;
    /** Requests allowed per rate window. */
    fetchIntervalCap: number;
    /** Rate window length, in milliseconds. */
    fetchIntervalMs: number;
    /** HTTP User-Agent for feed/article requests. */
    userAgent: string;
    /** Feeds added when no OPML is present and the store is empty. */
    defaultFeeds: Array<{
        url: string;
        name: string;
    }>;
    /** OPML paths (absolute or relative to the process cwd) imported at startup. */
    opmlFiles: string[];
}
/** Validates configuration input and supplies all runtime defaults. */
export declare const Config: Schema<Config>;
