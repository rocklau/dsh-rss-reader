import Schema from '@deepseek-ai/schemastery'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import { DEFAULT_FEEDS } from './constants.ts'

/** Plugin configuration (validated at load; defaults apply). */
export interface Config {
  /** Root data directory (SQLite, markdown articles, notes, index.json). */
  dataDir: string
  /** Allow DNS-resolved private-network feed addresses (SSRF bypass). */
  allowPrivateFeeds: boolean
  /** Run a warm sync automatically at plugin startup. */
  startupSync: boolean
  /** Warm sync article limit at startup. */
  startupSyncLimit: number
  /** Minimum interval between two syncs of one feed, in milliseconds. */
  feedMinSyncIntervalMs: number
  /** Enable HEAD validator checks before conditional GET. */
  feedHeadCheck: boolean
  /** HEAD request timeout, in milliseconds. */
  feedHeadTimeoutMs: number
  /** Concurrent feed fetches. */
  fetchConcurrency: number
  /** Requests allowed per rate window. */
  fetchIntervalCap: number
  /** Rate window length, in milliseconds. */
  fetchIntervalMs: number
  /** HTTP User-Agent for feed/article requests. */
  userAgent: string
  /** Feeds added when no OPML is present and the store is empty. */
  defaultFeeds: Array<{ url: string; name: string }>
  /** OPML paths (absolute or relative to the process cwd) imported at startup. */
  opmlFiles: string[]
}

/** Default data directory: $DSH_HOME/openbook-rss/v1. */
const DEFAULT_DATA_DIR = dshHomePath('openbook-rss', 'v1')

export const Config: Schema<Config> = Schema.object({
  dataDir: Schema.string().default(DEFAULT_DATA_DIR),
  allowPrivateFeeds: Schema.boolean().default(false),
  startupSync: Schema.boolean().default(true),
  startupSyncLimit: Schema.number().default(50),
  feedMinSyncIntervalMs: Schema.number().default(120000),
  feedHeadCheck: Schema.boolean().default(true),
  feedHeadTimeoutMs: Schema.number().default(3000),
  fetchConcurrency: Schema.number().default(4),
  fetchIntervalCap: Schema.number().default(10),
  fetchIntervalMs: Schema.number().default(1000),
  userAgent: Schema.string().default('OpenBook RSS Reader (+https://github.com/rocklau/dsh-rss-reader)'),
  defaultFeeds: Schema.array(Schema.object({
    url: Schema.string().required(),
    name: Schema.string().default(''),
  })).default(DEFAULT_FEEDS.map(feed => ({ url: feed.url, name: feed.name }))),
  // No OPML bundled by default; point this at your own .opml files to import.
  opmlFiles: Schema.array(Schema.string()).default([]),
})
