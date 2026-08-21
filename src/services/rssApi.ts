import { existsSync, readFileSync } from 'node:fs'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { ArticleService, ArticleView, MaterializeResult, StateUpdateResult } from './articleService.ts'
import type { ActivityService, ActivityItem } from './activityService.ts'
import type { FeedService, FeedInfo } from './feedService.ts'
import type { SyncResult, SyncService, SyncStatus } from './syncService.ts'
import type { RssStore } from './rssStore.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Remote API surface consumed by the OpenBook web client. */
    rssApi: RssApi
  }
}

/** Request payloads (JSON-serializable; the wire contract with the client). */
export interface MaterializeRequestJson {
  url: string
  feedUrl?: string
  title?: string
  publishedAt?: string
}

export interface StateUpdateRequestJson {
  articleId: string
  isRead?: boolean
  isFavorite?: boolean
}

export interface NoteCreateRequestJson {
  articleId: string
  title?: string
  content?: string
}

export interface DiscussRequestJson {
  sessionId: string
  articleId: string
  /** Free-form question or a preset command (summarize/translate/key-points). */
  prompt?: string
  /** A text range the user highlighted in the reader. */
  highlight?: string
}

export interface SetReadingRequestJson {
  sessionId: string
  articleId: string
}

/**
 * Remote API for the OpenBook web client. Every method is a plain-JSON
 * contract; the matching client-side descriptors live in client/remote.ts.
 */
export class RssApi extends TypertRemoteService {
  static inject = ['rssStore', 'rssFeed', 'rssArticle', 'rssActivity', 'rssSync', 'agents']

  constructor(ctx: Context) {
    super(ctx, 'rssApi')
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

  private get activities(): ActivityService {
    return this.ctx.rssActivity
  }

  private get sync(): SyncService {
    return this.ctx.rssSync
  }

  /**
   * Resolve the session's agent through the global service store. `ctx.get()`
   * bypasses the inject-sensitive ctx property proxy — the `agents` registry is
   * a framework service this remote surface did not declare, and `@Remote`
   * invocations run outside any fiber that declared it.
   */
  private resolveAgent(sessionId: string): { followup(message: unknown): void; inject(message: unknown): void } | undefined {
    const agents = this.ctx.get('agents') as { get: (id: string) => { followup(message: unknown): void; inject(message: unknown): void } | undefined } | undefined
    if (agents === undefined) return undefined
    return agents.get(sessionId)
  }

  /** List feeds with latest sync metadata. */
  @Remote
  listFeeds(): FeedInfo[] {
    return this.feeds.listFeeds()
  }

  /** Add a feed (SSRF validated). */
  @Remote
  async addFeed(url: string, name?: string): Promise<{ ok: boolean; reason?: string }> {
    return this.feeds.addFeed(url, name)
  }

  /** Most recent articles. */
  @Remote
  listArticles(limit?: number): ArticleView[] {
    return this.articles.listArticlesRecent(limit ?? 50)
  }

  /** Articles published on one calendar day (local time). */
  @Remote
  listArticlesByDate(date: string): ArticleView[] {
    return this.articles.listArticlesByDate(date)
  }

  /** Articles from one feed. */
  @Remote
  listArticlesByFeed(feedUrl: string, limit?: number): ArticleView[] {
    return this.articles.listArticlesByFeed(feedUrl, limit ?? 200)
  }

  /** Search articles. */
  @Remote
  searchArticles(query: string, limit?: number): ArticleView[] {
    return this.articles.searchArticles(query, limit ?? 50)
  }

  /** One article by stable id. */
  @Remote
  getArticle(articleId: string): ArticleView | null {
    return this.articles.getArticle(articleId)
  }

  /** Materialize an article to local markdown (idempotent). */
  @Remote
  async materialize(request: MaterializeRequestJson): Promise<MaterializeResult> {
    return this.articles.materializeArticle(request)
  }

  /** Toggle read/favorite state. */
  @Remote
  async updateState(request: StateUpdateRequestJson): Promise<StateUpdateResult> {
    return this.articles.updateArticleState(request)
  }

  /** Write a note for an article. */
  @Remote
  createNote(request: NoteCreateRequestJson): { ok: boolean; articleId: string; notePath: string } {
    return this.articles.createNote(request)
  }

  /** Notes attached to one article. */
  @Remote
  listNotes(articleId: string): { articleId: string; notes: Array<{ id: number; notePath: string; createdAt: string }> } {
    return this.articles.listNotes(articleId)
  }

  /** Activity timeline. */
  @Remote
  activity(limit?: number, offset?: number): { limit: number; offset: number; items: ActivityItem[] } {
    return this.activities.listActivity({ limit, offset })
  }

  /** Weekly review markdown. */
  @Remote
  exportReview(days?: number): string {
    return this.activities.exportMarkdown(days ?? 7)
  }

  /** Live sync status. */
  @Remote
  syncStatus(): SyncStatus {
    return this.sync.getSyncStatus()
  }

  /**
   * Trigger a warm sync. Pass the current sessionId to receive durable
   * rss/sync-* events in that conversation.
   */
  @Remote
  async warmSync(limit?: number, timeoutMs?: number, reason?: string, sessionId?: string): Promise<SyncResult> {
    const session = sessionId ? (this.ctx.sessions.get(sessionId as SessionId) ?? null) : null
    return this.sync.warmSync({
      limit: limit ?? 50,
      timeoutMs: timeoutMs ?? 0,
      reason: reason ?? 'manual',
      session: session as never,
    })
  }

  /** Orphan articles whose markdown file is missing. */
  @Remote
  orphanArticles(): ArticleView[] {
    return this.articles.findOrphanArticles()
  }

  /**
   * Inject the currently-reading article as ambient context into the session's
   * agent. `agent.inject()` parks the context without triggering a response;
   * the agent consumes it on its next turn, so the conversation "knows" what
   * the user is reading without a chat round-trip.
   */
  @Remote
  setReading(request: SetReadingRequestJson): { ok: boolean; reason?: string } {
    const agent = this.resolveAgent(request.sessionId)
    if (agent === undefined) return { ok: false, reason: 'session not found' }
    const article = this.articles.getArticle(request.articleId)
    if (article === null) return { ok: false, reason: 'article not found' }

    const text = [
      `[OpenBook] Currently reading: "${article.title ?? 'Untitled'}"`,
      `Source: ${article.feedName}${article.pubDate ? ` · ${article.pubDate}` : ''}`,
      article.link ? `Link: ${article.link}` : '',
    ].filter(Boolean).join('\n')

    agent.inject(createUserMessage({
      content: [{ type: 'text', text }],
      source: { kind: 'plugin', plugin: 'openbook-rss' },
    }))
    return { ok: true }
  }

  /**
   * Push the selected article into the session as a user turn so the agent
   * discusses it. Carries an optional highlight range and a prompt (a preset
   * command or a free-form question), plus the article's readable content.
   */
  @Remote
  discussArticle(request: DiscussRequestJson): { ok: boolean; reason?: string } {
    const agent = this.resolveAgent(request.sessionId)
    if (agent === undefined) return { ok: false, reason: 'session not found' }
    const article = this.articles.getArticle(request.articleId)
    if (article === null) return { ok: false, reason: 'article not found' }

    const body = readArticleContent(article, 8000)
    const lines: string[] = [
      `[OpenBook] Discussing an article from the RSS reader.`,
      `Title: ${article.title ?? 'Untitled'}`,
      `Source: ${article.feedName}${article.pubDate ? ` · ${article.pubDate}` : ''}`,
      article.link ? `Link: ${article.link}` : '',
    ]
    if (request.highlight && request.highlight.trim() !== '') {
      lines.push('', `Highlighted passage the user selected:`, `> ${request.highlight.trim()}`)
    }
    if (request.prompt && request.prompt.trim() !== '') {
      lines.push('', `The user asks: ${request.prompt.trim()}`)
    }
    lines.push('', `Article content:`, body)

    agent.followup(createUserMessage({
      content: [{ type: 'text', text: lines.filter(l => l !== undefined).join('\n') }],
      source: { kind: 'plugin', plugin: 'openbook-rss' },
    }))
    return { ok: true }
  }
}

/**
 * Extract readable text for an article: prefer the materialized markdown
 * (front matter stripped), then the HTML content (tags stripped), then the
 * snippet. Capped to `maxChars`.
 */
function readArticleContent(article: ArticleView, maxChars: number): string {
  let text = ''
  if (article.markdownPath && existsSync(article.markdownPath)) {
    try {
      text = readFileSync(article.markdownPath, 'utf-8').replace(/^---\n[\s\S]*?\n---\n*/, '')
    } catch {
      text = ''
    }
  }
  if (text.trim() === '' && article.content) {
    text = article.content.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
  }
  if (text.trim() === '' && article.contentSnippet) {
    text = article.contentSnippet
  }
  text = text.replace(/\s{3,}/g, '\n\n').trim()
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars)}\n\n[content truncated]`
  }
  return text === '' ? '(no readable content available)' : text
}
