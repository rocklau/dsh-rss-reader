import Parser from 'rss-parser'
import type { FetchQueue } from './httpClient.ts'
import { queuedFetch } from './httpClient.ts'
import type { Repositories } from '../db/repositories.ts'
import { USER_AGENT } from '../constants.ts'

/** One parsed RSS item. */
export interface RssItem {
  title: string
  link: string | undefined
  guid: string | undefined
  pubDate: string | undefined
  content: string | undefined
  contentSnippet: string | undefined
  author: string | undefined
  feedUrl: string
}

/** One parsed feed. */
export interface ParsedFeed {
  title: string
  description: string | undefined
  link: string | undefined
  items: RssItem[]
}

/** Feed handle held by the reader (feeds table + in-memory mirror). */
export interface FeedHandle {
  url: string
  name: string
}

/** Tuning for the reader; every value has a default, none is required. */
export interface ReaderConfig {
  allowPrivateFeeds: boolean
  feedMinSyncIntervalMs: number
  feedHeadCheck: boolean
  feedHeadTimeoutMs: number
  userAgent: string
}

/** Sync statistics accumulated during one getAllArticles pass. */
export interface FetchStats {
  feeds_seen: number
  network_fetch: number
  cache_fallback: number
  head_not_modified: number
  conditional_not_modified: number
  min_interval_skip: number
  memory_cache_hit: number
  parse_error: number
}

const DEFAULT_STATS: FetchStats = {
  feeds_seen: 0,
  network_fetch: 0,
  cache_fallback: 0,
  head_not_modified: 0,
  conditional_not_modified: 0,
  min_interval_skip: 0,
  memory_cache_hit: 0,
  parse_error: 0,
}

const MEMORY_CACHE_EXPIRY_MS = 5 * 60 * 1000
const BATCH_SIZE = 10

interface HeadResult {
  checked: boolean
  unchanged: boolean
  reason: string
  status?: number
  meta?: { status: number; content_type: string | null; etag: string | null; last_modified: string | null }
  error?: string
}

/**
 * RSS fetch/parse engine with the layered cache from OpenBook:
 * in-memory short cache -> min-interval skip -> HEAD validators ->
 * conditional GET -> SQLite BLOB fallback.
 */
export class RssReader {
  feeds: FeedHandle[] = []

  private readonly cache = new Map<string, { data: ParsedFeed; timestamp: number }>()
  private readonly feedInFlight = new Map<string, Promise<ParsedFeed | null>>()
  private lastFetchStats: FetchStats | null = null
  private readonly parser: Parser<unknown, unknown>

  constructor(
    private readonly repositories: Repositories,
    private readonly fetchQueue: FetchQueue,
    private readonly config: ReaderConfig,
  ) {
    this.parser = new Parser({
      timeout: 10000,
      headers: { 'User-Agent': config.userAgent || USER_AGENT },
    })
  }

  /** Load the in-memory feed mirror from the feeds table. */
  loadFeeds(): void {
    this.feeds = this.repositories.listFeeds().map(row => ({
      url: row.url,
      name: row.name ?? row.url,
    }))
  }

  getLastFetchStats(): FetchStats | null {
    return this.lastFetchStats
  }

  async addFeed(url: string, name?: string): Promise<boolean> {
    const normalizedUrl = new URL(url).toString()
    if (this.feeds.some(feed => feed.url === normalizedUrl)) return false
    this.repositories.upsertFeed(normalizedUrl, (name ?? '').trim())
    this.feeds.push({ url: normalizedUrl, name: (name || normalizedUrl).trim() })
    return true
  }

  private buildFeedHeaders(cached: { etag?: string | null; last_modified?: string | null } | null): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': this.config.userAgent || USER_AGENT,
    }
    if (cached?.etag) headers['If-None-Match'] = cached.etag
    if (cached?.last_modified) headers['If-Modified-Since'] = cached.last_modified
    return headers
  }

  private getHeaderMeta(res: Response): {
    status: number
    content_type: string | null
    etag: string | null
    last_modified: string | null
  } {
    return {
      status: res.status,
      content_type: res.headers.get('content-type'),
      etag: res.headers.get('etag'),
      last_modified: res.headers.get('last-modified'),
    }
  }

  private isUnchangedByValidators(
    cached: { etag?: string | null; last_modified?: string | null } | undefined,
    meta: { etag: string | null; last_modified: string | null },
  ): boolean {
    if (meta.etag && cached?.etag) return meta.etag.trim() === cached.etag.trim()
    if (meta.last_modified && cached?.last_modified) return meta.last_modified.trim() === cached.last_modified.trim()
    return false
  }

  private async checkFeedFreshnessWithHead(
    url: string,
    cached: { etag?: string | null; last_modified?: string | null } | null,
  ): Promise<HeadResult> {
    if (!this.config.feedHeadCheck || !cached) {
      return { checked: false, unchanged: false, reason: 'head_disabled' }
    }

    try {
      const res = await queuedFetch(this.fetchQueue, url, {
        method: 'HEAD',
        headers: this.buildFeedHeaders(cached),
        timeoutMs: this.config.feedHeadTimeoutMs,
        retries: 0,
      })
      const meta = this.getHeaderMeta(res)

      if (this.isUnchangedByValidators(cached, meta)) {
        this.repositories.updateCacheMeta(url, { kind: 'rss', status: meta.status, content_type: meta.content_type, etag: meta.etag, last_modified: meta.last_modified })
        return { checked: true, unchanged: true, reason: 'head_not_modified', status: res.status, meta }
      }

      if (meta.etag || meta.last_modified) {
        return { checked: true, unchanged: false, reason: 'head_modified', status: res.status, meta }
      }

      return { checked: true, unchanged: false, reason: 'head_no_validators', status: res.status, meta }
    } catch (error) {
      const status = (error as { status?: number }).status
      if (status === 304) {
        return {
          checked: true,
          unchanged: true,
          reason: 'head_not_modified',
          status: 304,
          meta: { status: 304, content_type: null, etag: cached.etag ?? null, last_modified: cached.last_modified ?? null },
        }
      }
      return {
        checked: false,
        unchanged: false,
        reason: status !== undefined ? `head_fallback:${status}` : 'head_fallback',
        error: (error as Error).message,
      }
    }
  }

  private async fetchWithCache(url: string, kind: 'rss' | 'html'): Promise<{
    status: number
    body: Uint8Array
    fromCache: boolean
    reason: string
    error?: string
  }> {
    const normalizedUrl = new URL(url).toString()
    const cached = this.repositories.getCache(normalizedUrl)

    const headFreshness = await this.checkFeedFreshnessWithHead(normalizedUrl, cached ?? null)
    if (headFreshness.unchanged && cached?.body) {
      return {
        status: headFreshness.status ?? cached.status ?? 304,
        body: cached.body,
        fromCache: true,
        reason: 'head_not_modified',
      }
    }

    const headers = this.buildFeedHeaders(cached ?? null)

    try {
      const res = await queuedFetch(this.fetchQueue, normalizedUrl, { headers })
      const body = new Uint8Array(await res.arrayBuffer())
      this.repositories.upsertCache({
        url: normalizedUrl,
        kind,
        status: res.status,
        content_type: res.headers.get('content-type'),
        etag: res.headers.get('etag'),
        last_modified: res.headers.get('last-modified'),
        body,
      })
      return { status: res.status, body, fromCache: false, reason: 'network_fetch' }
    } catch (error) {
      const status = (error as { status?: number }).status
      if (status === 304 && cached?.body) {
        return { status: 304, body: cached.body, fromCache: true, reason: 'conditional_not_modified' }
      }
      if (cached?.body) {
        return {
          status: cached.status ?? 200,
          body: cached.body,
          fromCache: true,
          reason: 'cache_fallback',
          error: (error as Error).message,
        }
      }
      throw error
    }
  }

  /**
   * Parse one feed, applying the cache layers. Returns null on parse errors.
   */
  async parseFeed(url: string, options: { stats?: Partial<FetchStats>; verbose?: boolean; force?: boolean } = {}): Promise<ParsedFeed | null> {
    const normalizedUrl = new URL(url).toString()
    const stats = options.stats
    const inFlight = this.feedInFlight.get(normalizedUrl)
    if (inFlight) return inFlight

    const run = (async (): Promise<ParsedFeed | null> => {
      try {
        const cachedMem = this.cache.get(normalizedUrl)
        if (!options.force && cachedMem && Date.now() - cachedMem.timestamp < MEMORY_CACHE_EXPIRY_MS) {
          if (stats) stats.memory_cache_hit = (stats.memory_cache_hit ?? 0) + 1
          return cachedMem.data
        }

        const syncState = this.repositories.getSyncState(normalizedUrl)
        if (!options.force && syncState?.last_checked_at) {
          const ageMs = Date.now() - new Date(`${syncState.last_checked_at}Z`).getTime()
          const cachedBody = this.repositories.getCache(normalizedUrl)?.body
          if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < this.config.feedMinSyncIntervalMs && cachedBody) {
            const parsed = await this.parseXml(Buffer.from(cachedBody).toString('utf-8'), normalizedUrl)
            this.cache.set(normalizedUrl, { data: parsed, timestamp: Date.now() })
            this.repositories.logFeedSync(normalizedUrl, { status: syncState.last_status ?? 200, fromCache: true, reason: 'min_interval_skip' })
            if (stats) stats.min_interval_skip = (stats.min_interval_skip ?? 0) + 1
            return parsed
          }
        }

        const { body, status, fromCache, reason } = await this.fetchWithCache(normalizedUrl, 'rss')
        const parsed = await this.parseXml(Buffer.from(body).toString('utf-8'), normalizedUrl)
        this.cache.set(normalizedUrl, { data: parsed, timestamp: Date.now() })

        const cachedMeta = this.repositories.getCache(normalizedUrl)
        this.repositories.logFeedSync(normalizedUrl, {
          status: status ?? 200,
          fromCache,
          reason: reason ?? (fromCache ? 'cache_fallback' : 'network_fetch'),
          etag: cachedMeta?.etag ?? null,
          lastModified: cachedMeta?.last_modified ?? null,
        })

        if (stats) {
          const statReason = reason ?? (fromCache ? 'cache_fallback' : 'network_fetch')
          stats[statReason as keyof FetchStats] = ((stats[statReason as keyof FetchStats] ?? 0) as number) + 1
        }
        if (options.verbose) console.log(`[feed] ${reason ?? 'network_fetch'} status=${status ?? 200} ${normalizedUrl}`)

        return parsed
      } catch (error) {
        this.repositories.logFeedSync(normalizedUrl, {
          status: (error as { status?: number }).status ?? null,
          fromCache: false,
          reason: `error:${(error as Error).message}`,
        })
        if (stats) stats.parse_error = (stats.parse_error ?? 0) + 1
        if (options.verbose) console.log(`[feed] parse_error ${normalizedUrl}: ${(error as Error).message}`)
        console.error(`Error parsing ${normalizedUrl}:`, (error as Error).message)
        return null
      }
    })()

    this.feedInFlight.set(normalizedUrl, run)
    try {
      return await run
    } finally {
      this.feedInFlight.delete(normalizedUrl)
    }
  }

  private async parseXml(xml: string, feedUrl: string): Promise<ParsedFeed> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feed: any = await this.parser.parseString(xml)
    return {
      title: feed?.title || 'Untitled Feed',
      description: feed?.description,
      link: feed?.link,
      items: (feed?.items ?? []).map((item: Record<string, string | undefined>) => ({
        title: item.title || 'Untitled',
        link: item.link,
        guid: item.guid,
        pubDate: item.pubDate || item.isoDate,
        content: item['content:encoded'] || item.content,
        contentSnippet: item.contentSnippet,
        author: item.author || item.creator,
        feedUrl,
      })),
    }
  }

  /**
   * Fetch every feed (batched) and return merged items sorted by pubDate.
   */
  async getAllArticles(limit: number | undefined, options: { stats?: FetchStats; verbose?: boolean; force?: boolean } = {}): Promise<Array<RssItem & { feedTitle: string; feedName: string }>> {
    const allArticles: Array<RssItem & { feedTitle: string; feedName: string }> = []
    const stats = options.stats ?? { ...DEFAULT_STATS }

    for (let index = 0; index < this.feeds.length; index += BATCH_SIZE) {
      const batch = this.feeds.slice(index, index + BATCH_SIZE)
      const results = await Promise.all(batch.map(feed => {
        stats.feeds_seen += 1
        return this.parseFeed(feed.url, { ...options, stats })
      }))

      results.forEach((parsed, idx) => {
        if (!parsed) return
        const feed = batch[idx]!
        for (const item of parsed.items) {
          allArticles.push({ ...item, feedTitle: parsed.title, feedName: feed.name })
        }
      })

      if (allArticles.length >= (limit ?? 50) * 3) break
    }

    const sorted = allArticles
      .sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime())
      .slice(0, (limit ?? 50) * 2)

    this.lastFetchStats = stats
    return sorted
  }

  /** Articles published within [date 00:00, date 23:59]. */
  async getArticlesByDate(date: string | Date, daysWindow = 1): Promise<Array<RssItem & { feedTitle: string; feedName: string }>> {
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)
    const endDate = new Date(targetDate)
    endDate.setDate(endDate.getDate() + daysWindow)
    endDate.setHours(23, 59, 59, 999)

    const allArticles = await this.getAllArticles(100)
    return allArticles.filter(article => {
      if (!article.pubDate) return false
      const articleDate = new Date(article.pubDate)
      return articleDate >= targetDate && articleDate <= endDate
    })
  }
}
