import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Service, type Context } from '@deepseek-ai/cordis'
import type { DatabaseSync } from 'node:sqlite'
import type { Config } from '../config.ts'
import { JSON_INDEX_VERSION } from '../constants.ts'
import { openRssDatabase } from '../db/database.ts'
import { Repositories } from '../db/repositories.ts'
import { FetchQueue } from '../rss/httpClient.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** OpenBook data root: database, repositories, fetch queue, file layout. */
    rssStore: RssStore
  }
}

/** JSON grep index shape. */
export interface JsonIndex {
  version: number
  generated_at: string | null
  feeds: Array<{ url: string; name: string }>
  articles: Array<Record<string, unknown>>
}

/** Derive the plugin's file layout under the configured data dir. */
function layoutFor(dataDir: string) {
  return {
    dataDir,
    dbPath: join(dataDir, 'openbook.db'),
    jsonIndexPath: join(dataDir, 'index.json'),
    articlesDir: join(dataDir, 'articles'),
    notesDir: join(dataDir, 'notes'),
  }
}

/**
 * Owns the SQLite database, the prepared repositories, the shared fetch
 * queue, and the markdown/JSON file layout. Everything else injects this.
 */
export class RssStore extends Service {
  readonly db: DatabaseSync
  readonly repositories: Repositories
  readonly fetchQueue: FetchQueue
  readonly dataDir: string
  readonly dbPath: string
  readonly jsonIndexPath: string
  readonly articlesDir: string
  readonly notesDir: string

  constructor(ctx: Context, config: Config) {
    super(ctx, 'rssStore')
    const layout = layoutFor(config.dataDir)
    this.dataDir = layout.dataDir
    this.dbPath = layout.dbPath
    this.jsonIndexPath = layout.jsonIndexPath
    this.articlesDir = layout.articlesDir
    this.notesDir = layout.notesDir
    mkdirSync(this.articlesDir, { recursive: true })
    mkdirSync(this.notesDir, { recursive: true })
    this.db = openRssDatabase(this.dbPath)
    this.repositories = new Repositories(this.db)
    this.fetchQueue = new FetchQueue({
      concurrency: config.fetchConcurrency,
      intervalCap: config.fetchIntervalCap,
      intervalMs: config.fetchIntervalMs,
    })
  }

  /** Read the JSON grep index, tolerating a missing or corrupt file. */
  readJsonIndex(): JsonIndex {
    try {
      const raw = readFileSync(this.jsonIndexPath, 'utf-8')
      return JSON.parse(raw) as JsonIndex
    } catch {
      return { version: JSON_INDEX_VERSION, generated_at: null, feeds: [], articles: [] }
    }
  }

  /** Write the JSON grep index. */
  writeJsonIndex(index: JsonIndex): void {
    const out: JsonIndex = {
      ...index,
      version: JSON_INDEX_VERSION,
      generated_at: new Date().toISOString(),
    }
    writeFileSync(this.jsonIndexPath, JSON.stringify(out, null, 2), 'utf-8')
  }
}
