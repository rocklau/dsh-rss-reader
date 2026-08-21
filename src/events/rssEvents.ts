/**
 * Durable session events emitted by the OpenBook RSS plugin. The client
 * assembles these into conversation nodes (see client/nodes/syncDefinition.ts).
 */
import type { SessionId } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session/types'

/** Summary counters for one sync run. */
export interface RssSyncSummary {
  feeds_checked: number
  network_fetch_count: number
  cache_fallback_count: number
  head_not_modified_count: number
  conditional_not_modified_count: number
  min_interval_skip_count: number
  new_articles_count: number
}

/** One sync run opens with this event. */
export interface RssSyncStartData {
  /** Stable business id: one per sync run. */
  syncId: string
  reason: string
  startedAt: string
  feedCount: number
}

/** One feed check during a sync run. */
export interface RssSyncProgressData {
  /** Same business id as the opening start event. */
  syncId: string
  feedUrl: string
  feedTitle: string
  status: number | null
  fromCache: boolean
  reason: string
}

/** One sync run closes with this event. */
export interface RssSyncEndData {
  /** Same business id as the opening start event. */
  syncId: string
  status: 'success' | 'timeout' | 'error'
  count: number
  summary: RssSyncSummary
  error?: string
}

/** One article became available as local markdown. */
export interface RssArticleMaterializedData {
  articleId: string
  title: string
  url: string
  feedUrl: string
  markdownPath: string
  skipped: boolean
  reason: string
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * Opens one OpenBook RSS sync run.
     * @mode emit
     * @param data - stable identity, reason, and feed count.
     */
    'openbook-rss/sync-start': RssSyncStartData
    /**
     * Records one checked feed within a sync run.
     * @mode emit
     * @param data - stable identity plus the feed's fetch outcome.
     */
    'openbook-rss/sync-progress': RssSyncProgressData
    /**
     * Closes one sync run with its summary.
     * @mode emit
     * @param data - stable identity plus the final outcome.
     */
    'openbook-rss/sync-end': RssSyncEndData
    /**
     * One article was materialized to local markdown.
     * @mode emit
     * @param data - article identity and markdown path.
     */
    'openbook-rss/article-materialized': RssArticleMaterializedData
  }
}

export type RssSessionId = SessionId
