import { randomUUID } from 'node:crypto'
import { Service, type Context } from '@deepseek-ai/cordis'
import type { Session } from '@deepseek-ai/dsh-session'
import type { RssSyncSummary } from '../events/rssEvents.ts'
import type { ArticleService } from './articleService.ts'
import type { FeedService } from './feedService.ts'
import type { RssStore } from './rssStore.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Warm sync orchestration and status. */
    rssSync: SyncService
  }
}

/** Warm sync options. */
export interface SyncOptions {
  limit?: number
  timeoutMs?: number
  reason?: string
  verbose?: boolean
  force?: boolean
  /** Optional session to emit durable rss/sync-* events into. */
  session?: Session | null
}

/** Sync run outcome. */
export interface SyncResult {
  ok: boolean
  status: 'success' | 'timeout' | 'error' | 'running'
  reason: string
  count: number
  startedAt: string
  finishedAt?: string
  summary?: RssSyncSummary
  error?: string
  fetchStats?: Record<string, number> | null
}

/** Live sync status snapshot. */
export interface SyncStatus {
  status: 'idle' | 'running' | 'success' | 'timeout' | 'error'
  reason: string | null
  startedAt: string | null
  finishedAt: string | null
  lastCount: number
  lastError: string | null
  lastSummary: RssSyncSummary | null
  inFlight: boolean
}

interface SyncState {
  status: SyncStatus['status']
  reason: string | null
  startedAt: string | null
  finishedAt: string | null
  lastCount: number
  lastError: string | null
  lastSummary: RssSyncSummary | null
  inFlight: Promise<SyncResult> | null
}

function emptySyncState(): SyncState {
  return {
    status: 'idle',
    reason: null,
    startedAt: null,
    finishedAt: null,
    lastCount: 0,
    lastError: null,
    lastSummary: null,
    inFlight: null,
  }
}

/**
 * Runs warm syncs (feed fetch + article persistence) with a status machine,
 * and emits durable session events when a session is supplied.
 */
export class SyncService extends Service {
  static inject = ['rssStore', 'rssFeed', 'rssArticle']

  private readonly state: SyncState = emptySyncState()

  constructor(ctx: Context) {
    super(ctx, 'rssSync')
  }

  private get store(): RssStore {
    return this.ctx.rssStore
  }

  private get feeds(): FeedService {
    return this.ctx.rssFeed
  }

  private get articles(): ArticleService {
    return this.ctx.rssArticle
  }

  /** Live status snapshot (serializable; safe for Remote calls). */
  getSyncStatus(): SyncStatus {
    const state = this.state
    return {
      status: state.status,
      reason: state.reason,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
      lastCount: state.lastCount,
      lastError: state.lastError,
      lastSummary: state.lastSummary,
      inFlight: state.inFlight !== null,
    }
  }

  /**
   * Fetch feeds, persist new articles, and summarize. Re-entrant: a second
   * call while one run is in flight returns the in-flight run.
   */
  async warmSync(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.state.inFlight) return this.state.inFlight

    const reason = options.reason ?? 'manual'
    const limit = options.limit ?? 50
    const timeoutMs = options.timeoutMs ?? 0
    const session = options.session ?? null
    const syncId = randomUUID()

    this.state.status = 'running'
    this.state.reason = reason
    this.state.startedAt = new Date().toISOString()
    this.state.finishedAt = null
    this.state.lastError = null

    session?.append('openbook-rss/sync-start', {
      syncId,
      reason,
      startedAt: this.state.startedAt,
      feedCount: this.feeds.reader.feeds.length,
    })

    const countArticles = () => this.store.repositories.countArticles()

    const summarize = (beforeCount: number, afterCount: number): RssSyncSummary => {
      const counts = this.store.repositories.syncSummarySince(this.state.startedAt ?? '')
      return {
        ...counts,
        new_articles_count: Math.max(0, afterCount - beforeCount),
      }
    }

    const run = (async (): Promise<SyncResult> => {
      const beforeCount = countArticles()
      try {
        const loadAndPersist = async (): Promise<number> => {
          const articles = await this.feeds.reader.getAllArticles(limit, {
            verbose: options.verbose,
            force: options.force,
          })
          await this.articles.processArticles(articles)
          for (const article of articles) {
            session?.append('openbook-rss/sync-progress', {
              syncId,
              feedUrl: article.feedUrl,
              feedTitle: article.feedTitle,
              status: 200,
              fromCache: false,
              reason: 'persisted',
            })
          }
          return articles.length
        }

        const count = timeoutMs > 0
          ? await runWithTimeout(loadAndPersist, timeoutMs)
          : await loadAndPersist()

        const afterCount = countArticles()
        const summary = summarize(beforeCount, afterCount)
        const fetchStats = this.feeds.reader.getLastFetchStats() as Record<string, number> | null

        this.state.status = 'success'
        this.state.lastCount = count
        this.state.lastSummary = summary

        session?.append('openbook-rss/sync-end', { syncId, status: 'success', count, summary })
        return {
          ok: true,
          status: 'success',
          reason,
          count,
          startedAt: this.state.startedAt ?? '',
          summary,
          fetchStats,
        }
      } catch (error) {
        const timedOut = (error as Error).message === 'openbook_rss_sync_timeout'
        this.state.status = timedOut ? 'timeout' : 'error'
        this.state.lastError = (error as Error).message
        this.state.lastSummary = null

        session?.append('openbook-rss/sync-end', {
          syncId,
          status: timedOut ? 'timeout' : 'error',
          count: 0,
          summary: summarize(beforeCount, countArticles()),
          error: this.state.lastError,
        })
        return {
          ok: false,
          status: this.state.status,
          reason,
          count: 0,
          startedAt: this.state.startedAt ?? '',
          error: this.state.lastError,
        }
      } finally {
        this.state.finishedAt = new Date().toISOString()
        this.state.inFlight = null
      }
    })()

    this.state.inFlight = run
    return run
  }
}

async function runWithTimeout<T>(task: () => Promise<T>, timeoutMs: number): Promise<T> {
  const timer = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('openbook_rss_sync_timeout')), timeoutMs)
  })
  return Promise.race([task(), timer])
}
