import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

/**
 * Register the OpenBook RSS model-facing tools. Tools are effects: they are
 * unregistered automatically when the plugin fiber unloads.
 * @param ctx - plugin context with the OpenBook services injected.
 */
export function registerRssTools(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'rss_list_feeds',
    description: 'List all configured RSS feeds with their latest sync status.',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    execute: async () => {
      const feeds = ctx.rssFeed.listFeeds()
      if (feeds.length === 0) return 'No feeds configured.'
      return feeds.map((feed, index) =>
        `${index + 1}. ${feed.name} — ${feed.url}${feed.lastCheckedAt ? ` (checked ${feed.lastCheckedAt})` : ''}`,
      ).join('\n')
    },
  }))

  ctx.tools.register(defineTool({
    name: 'rss_sync',
    description: 'Fetch all RSS feeds, persist new articles, and report what changed.',
    parameters: {
      limit: { type: 'number', description: 'Max articles to process (default 50).' },
      reason: { type: 'string', description: 'Sync reason, e.g. "daily" or "user request".' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      const result = await ctx.rssSync.warmSync({
        limit: args.limit ?? 50,
        reason: args.reason ?? 'agent',
        session: exec.agent?.session ?? null,
      })
      if (!result.ok) return `Sync failed (${result.status}): ${result.error ?? 'unknown error'}`
      const summary = result.summary
      const parts = [
        `Sync ${result.status} in ${result.reason}: ${result.count} articles processed.`,
      ]
      if (summary) {
        parts.push(
          `feeds_checked=${summary.feeds_checked}`,
          `new_articles=${summary.new_articles_count}`,
          `network_fetch=${summary.network_fetch_count}`,
          `cache_fallback=${summary.cache_fallback_count}`,
          `head_not_modified=${summary.head_not_modified_count}`,
          `conditional_not_modified=${summary.conditional_not_modified_count}`,
          `min_interval_skip=${summary.min_interval_skip_count}`,
        )
      }
      return parts.join('\n')
    },
  }))

  ctx.tools.register(defineTool({
    name: 'rss_search',
    description: 'Search the local article database by keyword (title, snippet, link).',
    parameters: {
      query: { type: 'string', required: true, description: 'Search keywords.' },
      limit: { type: 'number', description: 'Max results (default 20).' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    execute: async (args) => {
      const results = ctx.rssArticle.searchArticles(args.query, args.limit ?? 20)
      if (results.length === 0) return `No articles match "${args.query}".`
      return results.map((article, index) =>
        `${index + 1}. ${article.title ?? 'Untitled'}${article.feedName ? ` [${article.feedName}]` : ''}${article.pubDate ? ` ${article.pubDate}` : ''}\n   ${article.link ?? ''}${article.isRead ? '' : ' (unread)'}`,
      ).join('\n')
    },
  }))

  ctx.tools.register(defineTool({
    name: 'rss_read_article',
    description: 'Read one article from the local database by id; includes markdown body when materialized.',
    parameters: {
      articleId: { type: 'string', required: true, description: 'Stable article id (64 hex chars).' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    execute: async (args) => {
      const article = ctx.rssArticle.getArticle(args.articleId)
      if (!article) return `Article not found: ${args.articleId}`
      const lines = [
        `# ${article.title ?? 'Untitled'}`,
        `Feed: ${article.feedName}`,
        `Published: ${article.pubDate ?? 'unknown'}`,
        `Link: ${article.link ?? ''}`,
        `Materialized: ${article.markdownPath ?? 'no'}`,
        '',
        article.contentSnippet ?? 'No snippet available.',
      ]
      if (article.markdownPath) {
        lines.push('', `Markdown: ${article.markdownPath}`)
      }
      return lines.join('\n')
    },
  }))

  ctx.tools.register(defineTool({
    name: 'rss_materialize',
    description: 'Save an article (by URL) as local Markdown with YAML front matter. Idempotent.',
    parameters: {
      url: { type: 'string', required: true, description: 'Article URL.' },
      title: { type: 'string', description: 'Optional title override.' },
      feedUrl: { type: 'string', description: 'Optional feed URL for grouping.' },
      publishedAt: { type: 'string', description: 'Optional ISO publish time.' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      const result = await ctx.rssArticle.materializeArticle({
        url: args.url,
        title: args.title,
        feedUrl: args.feedUrl,
        publishedAt: args.publishedAt,
      })
      if (!result.ok) return `Materialize failed: ${result.error ?? 'unknown error'}`
      const base = result.skipped ? 'Already materialized' : 'Materialized'
      exec.agent?.session?.append('openbook-rss/article-materialized', {
        articleId: result.articleId ?? '',
        title: args.title ?? '',
        url: args.url,
        feedUrl: args.feedUrl ?? '',
        markdownPath: result.markdownPath ?? '',
        skipped: result.skipped ?? false,
        reason: result.reason ?? 'materialized',
      })
      return `${base}: ${result.markdownPath} (${result.reason ?? 'ok'})`
    },
  }))

  ctx.tools.register(defineTool({
    name: 'rss_save_note',
    description: 'Save a note or highlight for an article as local Markdown.',
    parameters: {
      articleId: { type: 'string', required: true, description: 'Stable article id.' },
      content: { type: 'string', required: true, description: 'Note content.' },
      title: { type: 'string', description: 'Optional note title.' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    execute: async (args) => {
      const result = ctx.rssArticle.createNote({ articleId: args.articleId, title: args.title, content: args.content })
      return `Note saved: ${result.notePath}`
    },
  }))

  ctx.tools.register(defineTool({
    name: 'rss_export_review',
    description: 'Export the activity timeline of the last N days as Markdown (weekly review).',
    parameters: {
      days: { type: 'number', description: 'Days to cover (default 7).' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    execute: async (args) => ctx.rssActivity.exportMarkdown(args.days ?? 7),
  }))
}
