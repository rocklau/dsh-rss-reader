import { Service, type Context } from '@deepseek-ai/cordis'
import { ACTIVITY_TYPES } from '../constants.ts'
import type { ActivityType } from '../constants.ts'
import type { RssStore } from './rssStore.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Activity timeline and weekly review export. */
    rssActivity: ActivityService
  }
}

/** One activity timeline item with its joined article. */
export interface ActivityItem {
  id: number
  type: ActivityType
  articleId: string | null
  createdAt: string
  payload: Record<string, unknown>
  article: {
    id: string
    title: string | null
    link: string | null
    feedUrl: string | null
    markdownPath: string | null
  } | null
}

function mdEscape(text: string): string {
  return String(text || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

/**
 * Owns the append-only activity feed and the markdown review export.
 */
export class ActivityService extends Service {
  static inject = ['rssStore']

  constructor(ctx: Context) {
    super(ctx, 'rssActivity')
  }

  private get store(): RssStore {
    return this.ctx.rssStore
  }

  /** Latest activity items with pagination. */
  listActivity(options: { limit?: number; offset?: number } = {}): { limit: number; offset: number; items: ActivityItem[] } {
    const limit = options.limit ?? 50
    const offset = options.offset ?? 0
    const items = this.store.repositories.listActivity(limit, offset).map(row => ({
      id: row.id,
      type: row.type as ActivityType,
      articleId: row.article_id,
      createdAt: row.created_at,
      payload: (() => {
        try {
          return row.payload_json ? (JSON.parse(row.payload_json) as Record<string, unknown>) : {}
        } catch {
          return {}
        }
      })(),
      article: row.article_id
        ? {
            id: row.article_id,
            title: row.article_title,
            link: row.article_link,
            feedUrl: row.feed_url,
            markdownPath: row.article_markdown_path,
          }
        : null,
    }))
    return { limit, offset, items }
  }

  /** Append one activity row. */
  logActivity(type: ActivityType, articleId: string | null, payload: Record<string, unknown>): void {
    this.store.repositories.logActivity(type, articleId, JSON.stringify(payload))
  }

  /** Build a markdown weekly-review document covering the last `days`. */
  exportMarkdown(days: number): string {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000)
    const rows = this.store.repositories.listActivitySince(since.toISOString())

    const header = [
      '---',
      `title: ${JSON.stringify(`OpenBook Weekly Review (${days}d)`)}`,
      `generated_at: ${JSON.stringify(new Date().toISOString())}`,
      `days: ${days}`,
      '---',
      '',
      `# OpenBook Review (${days} days)`,
      '',
      `Generated at: ${new Date().toISOString()}`,
      '',
    ].join('\n')

    const lines = [header, '## Activity', '']
    lines.push('| Time | Type | Title | Link | Details |')
    lines.push('|---|---|---|---|---|')

    for (const row of rows) {
      let payload: Record<string, unknown> = {}
      try {
        payload = row.payload_json ? (JSON.parse(row.payload_json) as Record<string, unknown>) : {}
      } catch {
        // keep empty payload
      }

      const type = row.type
      const title = row.article_title ?? (payload.title as string | undefined) ?? ''
      const link = row.article_link ?? (payload.url as string | undefined) ?? ''

      let details = ''
      if (type === ACTIVITY_TYPES.STATE) {
        details = `read=${payload.isRead ? 'yes' : 'no'}, fav=${payload.isFavorite ? 'yes' : 'no'}`
      } else if (type === ACTIVITY_TYPES.NOTE) {
        details = `note=${payload.notePath ?? ''}`
      } else if (type === ACTIVITY_TYPES.MATERIALIZE) {
        details = `md=${payload.markdownPath ?? ''}`
      }

      lines.push(`| ${mdEscape(row.created_at)} | ${mdEscape(type)} | ${mdEscape(title)} | ${mdEscape(link)} | ${mdEscape(details)} |`)
    }

    return lines.join('\n') + '\n'
  }
}
