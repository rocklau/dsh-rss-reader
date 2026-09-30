/**
 * Shared fetch queue with retry: bounds concurrency and rate to avoid 429s.
 * Ported from OpenBook's queue.js / http.js.
 */
export interface FetchQueueOptions {
    concurrency: number;
    intervalCap: number;
    intervalMs: number;
}
export interface FetchOptions extends RequestInit {
    /** Timeout for the whole attempt, in milliseconds. */
    timeoutMs?: number;
    /** Retry count (default 3). */
    retries?: number;
}
export declare class FetchError extends Error {
    readonly status?: number | undefined;
    readonly url?: string | undefined;
    constructor(message: string, status?: number | undefined, url?: string | undefined);
}
/**
 * A rate-limited, concurrency-bounded fetch scheduler with exponential
 * backoff retry on 429 / 5xx / network errors.
 */
export declare class FetchQueue {
    private readonly options;
    private readonly pending;
    private running;
    private windowCount;
    private windowStart;
    constructor(options: FetchQueueOptions);
    /** Run a task through the queue; resolves with the task's result. */
    run<T>(task: () => Promise<T>): Promise<T>;
    private acquire;
    private next;
    private pump;
}
/**
 * Queue + retry wrapper around fetch. Non-2xx responses throw FetchError
 * carrying the status code; 304 is surfaced as a FetchError with status 304.
 */
export declare function queuedFetch(queue: FetchQueue, url: string, options?: FetchOptions): Promise<Response>;
