/**
 * Payload shapes for OpenBook RSS sync activity. These records are pure
 * telemetry: they are intentionally NOT written into the shared session log
 * (custom event families there refuse cold history reads — see
 * SyncService.warmSync), so this file carries no SessionEventMap
 * augmentation. The client half keeps its own copy of these types for
 * rendering historical rows in already-healed logs.
 */

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

