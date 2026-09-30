import { Service, type Context } from '@deepseek-ai/cordis';
import type { RssSyncSummary } from '../events/rssEvents.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Warm sync orchestration and status. */
        rssSync: SyncService;
    }
}
/** Warm sync options. */
export interface SyncOptions {
    limit?: number;
    timeoutMs?: number;
    reason?: string;
    verbose?: boolean;
    force?: boolean;
}
/** Sync run outcome. */
export interface SyncResult {
    ok: boolean;
    status: 'success' | 'timeout' | 'error' | 'running';
    reason: string;
    count: number;
    startedAt: string;
    finishedAt?: string;
    summary?: RssSyncSummary;
    error?: string;
    fetchStats?: Record<string, number> | null;
}
/** Live sync status snapshot. */
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
/**
 * Runs warm syncs (feed fetch + article persistence) and publishes live status.
 */
export declare class SyncService extends Service {
    static inject: string[];
    private readonly state;
    constructor(ctx: Context);
    private get store();
    private get feeds();
    private get articles();
    /** Live status snapshot (serializable; safe for Remote calls). */
    getSyncStatus(): SyncStatus;
    /**
     * Fetch feeds, persist new articles, and summarize. Re-entrant: a second
     * call while one run is in flight returns the in-flight run.
     *
     * Sync telemetry is not appended to Session logs. The Remote status API
     * remains available without a live Agent and without installing custom
     * Session event decoders on detached history readers.
     */
    warmSync(options?: SyncOptions): Promise<SyncResult>;
}
