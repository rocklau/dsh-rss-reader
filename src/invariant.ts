/**
 * Package invariant companion. The host plugin registers its RPC surface on
 * ctx; the loading-time invariant is that the rssApi service is reachable.
 */
export const invariant = {
  /** Verify the OpenBook services are registered on the root context. */
  check(context: unknown): string[] {
    const failures: string[] = []
    const ctx = context as { rssStore?: unknown; rssApi?: unknown; rssSync?: unknown } | null
    if (ctx == null) {
      failures.push('openbook-rss: root context missing')
      return failures
    }
    if (ctx.rssStore === undefined) failures.push('openbook-rss: rssStore service not registered')
    if (ctx.rssSync === undefined) failures.push('openbook-rss: rssSync service not registered')
    if (ctx.rssApi === undefined) failures.push('openbook-rss: rssApi service not registered')
    return failures
  },
}

export default invariant
