import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { Service, type Context } from '@deepseek-ai/cordis'
import type { Config } from '../config.ts'
import { DEFAULT_FEEDS } from '../constants.ts'
import { loadFromOPML } from '../rss/opml.ts'
import { RssReader, type FeedHandle } from '../rss/reader.ts'
import { validateHttpUrl } from '../rss/ssrf.ts'
import type { RssStore } from './rssStore.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Feed registry and RSS fetch/parse engine. */
    rssFeed: FeedService
  }
}

/** Feed + its latest sync status (for UI list). */
export interface FeedInfo extends FeedHandle {
  lastCheckedAt: string | null
  lastStatus: number | null
}

/**
 * Owns the feed list, OPML import, and the RssReader engine.
 */
export class FeedService extends Service {
  static inject = ['rssStore']

  readonly reader: RssReader
  private readonly opmlFiles: readonly string[]
  private readonly allowPrivateFeeds: boolean

  constructor(ctx: Context, config: Config) {
    super(ctx, 'rssFeed')
    const store = ctx.rssStore
    this.allowPrivateFeeds = config.allowPrivateFeeds
    this.opmlFiles = config.opmlFiles
    this.reader = new RssReader(store.repositories, store.fetchQueue, {
      allowPrivateFeeds: config.allowPrivateFeeds,
      feedMinSyncIntervalMs: config.feedMinSyncIntervalMs,
      feedHeadCheck: config.feedHeadCheck,
      feedHeadTimeoutMs: config.feedHeadTimeoutMs,
      userAgent: config.userAgent,
    })
    this.reader.loadFeeds()
    this.bootstrapFeeds(config)
  }

  /** Import OPML files; fall back to default feeds when none are present. */
  private bootstrapFeeds(config: Config): void {
    let imported = 0
    for (const file of this.opmlFiles) {
      const resolved = isAbsolute(file) ? file : join(process.cwd(), file)
      if (!existsSync(resolved)) continue
      try {
        const content = readFileSync(resolved, 'utf-8')
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        void loadFromOPML(this.reader, content).then(() => { this.onFeedsChanged() })
        imported += 1
      } catch (error) {
        console.warn(`[openbook-rss] failed to import OPML ${file}:`, (error as Error).message)
      }
    }
    if (imported === 0 && this.reader.feeds.length === 0) {
      for (const feed of config.defaultFeeds.length > 0 ? config.defaultFeeds : DEFAULT_FEEDS) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        void this.addFeed(feed.url, feed.name)
      }
    }
  }

  private onFeedsChanged(): void {
    this.reader.loadFeeds()
  }

  /** List feeds with their latest sync metadata. */
  listFeeds(): FeedInfo[] {
    return this.reader.feeds.map(feed => {
      const state = this.readerSyncState(feed.url)
      return {
        ...feed,
        lastCheckedAt: state?.last_checked_at ?? null,
        lastStatus: state?.last_status ?? null,
      }
    })
  }

  private readerSyncState(feedUrl: string) {
    const store = this.getStore()
    return store.repositories.getSyncState(feedUrl) ?? null
  }

  private getStore(): RssStore {
    return this.ctx.rssStore
  }

  /** Add one feed after SSRF validation; returns false when already present. */
  async addFeed(url: string, name?: string): Promise<{ ok: boolean; reason?: string }> {
    const validated = await validateHttpUrl(url, this.allowPrivateFeeds)
    if (!validated.ok) return { ok: false, reason: `Feed URL rejected: ${validated.reason}` }
    await this.reader.addFeed(url, name)
    return { ok: true }
  }

  /** Reload the feed mirror from the database (used after OPML import). */
  reload(): void {
    this.reader.loadFeeds()
  }

  feedCount(): number {
    return this.reader.feeds.length
  }
}
