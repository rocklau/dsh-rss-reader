/**
 * Package invariant companion. The host plugin registers its RPC surface on
 * ctx; the loading-time invariant is that the rssApi service is reachable.
 */
export declare const invariant: {
    /** Verify the OpenBook services are registered on the root context. */
    check(context: unknown): string[];
};
export default invariant;
