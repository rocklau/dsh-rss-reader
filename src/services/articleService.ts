import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Service, type Context } from '@deepseek-ai/cordis'
import type { Config } from '../config.ts'
import { ACTIVITY_TYPES } from '../constants.ts'
import { downloadResources } from '../markdown/collector.ts'
import { htmlToMarkdown } from '../markdown/htmlToMd.ts'
import { queuedFetch } from '../rss/httpClient.ts'
import type { RssItem } from '../rss/reader.ts'
import type { ArticleRow } from '../db/repositories.ts'
import { safeFileName, stableId } from '../utils.ts'
import type { FeedService } from './feedService.ts'
import type { RssStore } from './rssStore.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Article listing, materialization, state, and notes. */
    rssArticle: ArticleService
  }
}

/** Article projection for UI/tools (DB row + feed name). */
export interface ArticleView {
  id: string
  feedUrl: string
  feedName: string
  title: string | null
  link: string | null
  guid: string | null
  pubDate: string | null
  author: string | null
  content: string | null
  contentSnippet: string | null
  markdownPath: string | null
  isRead: boolean
  isFavorite: boolean
}

/** Materialize an article from its HTML. */
export interface MaterializeRequest {
  url: string
  feedUrl?: string
  title?: string
  publishedAt?: string
}

/** Materialize outcome. */
export interface MaterializeResult {
  ok: boolean
  articleId?: string
  markdownPath?: string
  skipped?: boolean
  reason?: string
  error?: string
}

/** State update outcome. */
export interface StateUpdateResult {
  ok: boolean
  articleId: string
  isRead: boolean
  isFavorite: boolean
  skipped?: boolean
  reason?: string
}

/**
 * Owns article queries, idempotent materialization, state toggles, and notes.
 */
export class ArticleService extends Service {
  static inject = ['rssStore', 'rssFeed']

  private readonly userAgent: string
  private readonly materializeInFlight = new Map<string, Promise<MaterializeResult>>()
  private readonly stateUpdateInFlight = new Map<string, Promise<StateUpdateResult | undefined>>()

  constructor(ctx: Context, config: Config) {
    super(ctx, 'rssArticle')
    this.userAgent = config.userAgent
  }

  private get store(): RssStore {
    return this.ctx.rssStore
  }

  private get feeds(): FeedService {
    return this.ctx.rssFeed
  }

  private mapRow(row: ArticleRow): ArticleView {
    const feed = this.feeds.reader.feeds.find(item => item.url === row.feed_url)
    return {
      id: row.id,
      feedUrl: row.feed_url,
      feedName: feed?.name ?? row.feed_url,
      title: row.title,
      link: row.link,
      guid: row.guid,
      pubDate: row.published_at,
      author: row.author,
      content: row.content_html,
      contentSnippet: row.content_snippet,
      markdownPath: row.markdown_path,
      isRead: !!row.is_read,
      isFavorite: !!row.is_favorite,
    }
  }

  private mapRows(rows: readonly ArticleRow[]): ArticleView[] {
    return rows.map(row => this.mapRow(row))
  }

  /** Most recent articles from the database. */
  listArticlesRecent(limit = 50): ArticleView[] {
    return this.mapRows(this.store.repositories.listArticlesRecent(limit))
  }

  /** Articles published on one calendar day. */
  listArticlesByDate(date: string): ArticleView[] {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    return this.mapRows(
      this.store.repositories.listArticlesByDate(start.toISOString(), end.toISOString(), 500),
    )
  }

  /** Articles from one feed. */
  listArticlesByFeed(feedUrl: string, limit = 200): ArticleView[] {
    return this.mapRows(this.store.repositories.listArticlesByFeed(feedUrl, limit))
  }

  /** Full-text-ish search over title, snippet, and link. */
  searchArticles(query: string, limit = 50): ArticleView[] {
    return this.mapRows(this.store.repositories.searchArticles(query, limit))
  }

  /** One article by stable id. */
  getArticle(articleId: string): ArticleView | null {
    const row = this.store.repositories.getArticleById(articleId)
    return row ? this.mapRow(row) : null
  }

  /** Articles whose markdown file is missing on disk (orphan check). */
  findOrphanArticles(): ArticleView[] {
    return this.mapRows(this.store.repositories.listArticlesRecent(500)).filter(
      article => article.markdownPath !== null && !existsSync(article.markdownPath),
    )
  }

  /** Persist parsed items into the articles table and backfill state flags. */
  async processArticles(items: readonly RssItem[]): Promise<void> {
    const repositories = this.store.repositories
    const upserts: Array<{
      id: string
      feed_url: string
      guid: string | null
      link: string | null
      title: string | null
      author: string | null
      published_at: string | null
      content_html: string | null
      content_snippet: string | null
      markdown_path: string | null
    }> = []

    for (const item of items) {
      const feedUrl = item.feedUrl
      if (!feedUrl) continue
      const id = stableId(feedUrl, item.guid || item.link || item.title)
      upserts.push({
        id,
        feed_url: feedUrl,
        guid: item.guid ?? null,
        link: item.link ?? null,
        title: item.title ?? null,
        author: item.author ?? null,
        published_at: item.pubDate ?? null,
        content_html: item.content ?? null,
        content_snippet: item.contentSnippet ?? null,
        markdown_path: null,
      })
    }

    if (upserts.length > 0) repositories.upsertArticles(upserts)
  }

  /**
   * Materialize one article to local markdown, idempotently (by normalized
   * URL), with in-flight de-duplication.
   */
  async materializeArticle(request: MaterializeRequest): Promise<MaterializeResult> {
    const normalizedUrl = new URL(request.url).toString()

    const inFlight = this.materializeInFlight.get(normalizedUrl)
    if (inFlight) return inFlight

    const run = (async (): Promise<MaterializeResult> => {
      const store = this.store
      const repositories = store.repositories
      try {
        const parsedUrl = new URL(normalizedUrl)

        const existingByLink = repositories.getArticleByLink(normalizedUrl)
        if (existingByLink?.markdown_path && existsSync(existingByLink.markdown_path)) {
          return {
            ok: true,
            articleId: existingByLink.id,
            markdownPath: existingByLink.markdown_path,
            skipped: true,
            reason: 'already_materialized',
          }
        }

        const htmlRes = await queuedFetch(store.fetchQueue, normalizedUrl, {
          headers: { 'User-Agent': this.userAgent },
        })
        const html = await htmlRes.text()
        const mdBody = htmlToMarkdown(html, { baseUrl: normalizedUrl })

        const now = new Date()
        const year = String(now.getFullYear())
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const dir = join(store.articlesDir, year, month)
        mkdirSync(dir, { recursive: true })

        const slug = safeFileName(
          request.title || `${parsedUrl.hostname}-${parsedUrl.pathname.split('/').filter(Boolean).pop()}`,
        )
        const filePath = join(dir, `${slug}.md`)

        const frontMatter: Record<string, string | null> = {
          title: request.title ?? null,
          url: normalizedUrl,
          feed_url: request.feedUrl ?? null,
          published_at: request.publishedAt ?? null,
          fetched_at: new Date().toISOString(),
          source: 'html',
        }
        const yaml = Object.entries(frontMatter)
          .filter(([, value]) => value != null && value !== '')
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join('\n')

        writeFileSync(filePath, `---\n${yaml}\n---\n\n${mdBody}\n`, 'utf-8')

        const articleFeedUrl = request.feedUrl ?? parsedUrl.origin
        repositories.ensureFeedExists(articleFeedUrl, parsedUrl.hostname)

        const articleId = stableId(articleFeedUrl, normalizedUrl)
        repositories.upsertArticles([{
          id: articleId,
          feed_url: articleFeedUrl,
          guid: null,
          link: normalizedUrl,
          title: request.title ?? null,
          author: null,
          published_at: request.publishedAt ?? null,
          content_html: null,
          content_snippet: null,
          markdown_path: filePath,
        }])

        const state = repositories.getArticleState(articleId)
        if (state && state.is_favorite) {
          void downloadResources(store.fetchQueue, filePath, articleId).catch(error => {
            console.error(`[openbook-rss] resource download failed for ${articleId}:`, (error as Error).message)
          })
        }

        repositories.logActivity(
          ACTIVITY_TYPES.MATERIALIZE,
          articleId,
          JSON.stringify({ url: normalizedUrl, markdownPath: filePath, title: request.title ?? null }),
        )

        return { ok: true, articleId, markdownPath: filePath }
      } catch (error) {
        return { ok: false, error: (error as Error).message }
      }
    })()

    this.materializeInFlight.set(normalizedUrl, run)
    try {
      return await run
    } finally {
      this.materializeInFlight.delete(normalizedUrl)
    }
  }

  /** Toggle read/favorite state, serialized per article. */
  async updateArticleState(request: { articleId: string; isRead?: boolean; isFavorite?: boolean }): Promise<StateUpdateResult> {
    const articleId = request.articleId
    const previous = this.stateUpdateInFlight.get(articleId) ?? Promise.resolve()

    const run = previous.then(async () => {
      const store = this.store
      const repositories = store.repositories
      const existing = repositories.getArticleState(articleId) ?? { is_read: 0, is_favorite: 0 }
      const nextRead = typeof request.isRead === 'boolean' ? (request.isRead ? 1 : 0) : existing.is_read
      const nextFav = typeof request.isFavorite === 'boolean' ? (request.isFavorite ? 1 : 0) : existing.is_favorite

      if (nextRead === existing.is_read && nextFav === existing.is_favorite) {
        return {
          ok: true,
          articleId,
          isRead: !!nextRead,
          isFavorite: !!nextFav,
          skipped: true,
          reason: 'state_unchanged',
        }
      }

      repositories.setArticleState(articleId, nextRead, nextFav)

      if (nextFav && !existing.is_favorite) {
        const article = repositories.getArticleById(articleId)
        if (article?.markdown_path) {
          void downloadResources(store.fetchQueue, article.markdown_path, articleId).catch(error => {
            console.error(`[openbook-rss] resource download failed for ${articleId}:`, (error as Error).message)
          })
        }
      }

      repositories.logActivity(
        ACTIVITY_TYPES.STATE,
        articleId,
        JSON.stringify({ isRead: !!nextRead, isFavorite: !!nextFav }),
      )

      return { ok: true, articleId, isRead: !!nextRead, isFavorite: !!nextFav }
    })

    const tail = run.catch(() => undefined)
    this.stateUpdateInFlight.set(articleId, tail)

    try {
      return await run
    } finally {
      if (this.stateUpdateInFlight.get(articleId) === tail) {
        this.stateUpdateInFlight.delete(articleId)
      }
    }
  }

  /** Write one note markdown for an article and log activity. */
  createNote(request: { articleId: string; title?: string; content?: string }): { ok: boolean; articleId: string; notePath: string } {
    const store = this.store
    const now = new Date()
    const year = String(now.getFullYear())
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const dir = join(store.notesDir, year, month)
    mkdirSync(dir, { recursive: true })

    const slug = safeFileName(request.title || `note-${request.articleId.slice(0, 8)}`)
    const filePath = join(dir, `${slug}.md`)

    const yaml = [
      `article_id: ${JSON.stringify(request.articleId)}`,
      `title: ${JSON.stringify(request.title ?? '')}`,
      `created_at: ${JSON.stringify(now.toISOString())}`,
    ].join('\n')

    writeFileSync(filePath, `---\n${yaml}\n---\n\n${request.content ?? ''}\n`, 'utf-8')

    store.repositories.insertNote(request.articleId, filePath)
    store.repositories.logActivity(
      ACTIVITY_TYPES.NOTE,
      request.articleId,
      JSON.stringify({ notePath: filePath, title: request.title ?? null, content: request.content ?? null }),
    )

    return { ok: true, articleId: request.articleId, notePath: filePath }
  }

  /** Notes attached to one article. */
  listNotes(articleId: string): { articleId: string; notes: Array<{ id: number; notePath: string; createdAt: string }> } {
    const notes = this.store.repositories.listNotesByArticle(articleId).map(note => ({
      id: note.id,
      notePath: note.note_path,
      createdAt: note.created_at,
    }))
    return { articleId, notes }
  }
}
