import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

/**
 * Register the agent-readable "book" tools: JSON-shaped knowledge-base
 * queries for agents (the OpenBook CLI's `book * --json` surface).
 * @param ctx - plugin context with the OpenBook services injected.
 */
export function registerBookTools(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'book_index',
    description: 'Agent-readable knowledge base index: feed count, article counts, data dir, sync status (JSON).',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    execute: async () => {
      const index = ctx.rssStore.readJsonIndex()
      const status = ctx.rssSync.getSyncStatus()
      const payload = {
        feeds: index.feeds,
        articles: index.articles,
        generated_at: index.generated_at,
        data_dir: ctx.rssStore.dataDir,
        sync: status,
      }
      return JSON.stringify(payload, null, 2)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'book_recent',
    description: 'List recent articles as agent-readable JSON.',
    parameters: {
      limit: { type: 'number', description: 'Max articles (default 20).' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    execute: async (args) => {
      const articles = ctx.rssArticle.listArticlesRecent(args.limit ?? 20)
      return JSON.stringify(articles, null, 2)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'book_article',
    description: 'One article with its activity and markdown text, as JSON.',
    parameters: {
      articleId: { type: 'string', required: true, description: 'Stable article id.' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    execute: async (args) => {
      const article = ctx.rssArticle.getArticle(args.articleId)
      const notes = ctx.rssArticle.listNotes(args.articleId)
      return JSON.stringify({ article, notes }, null, 2)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'book_search',
    description: 'Search articles, notes, and highlights as JSON.',
    parameters: {
      query: { type: 'string', required: true, description: 'Search keywords.' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    execute: async (args) => {
      const articles = ctx.rssArticle.searchArticles(args.query, 50)
      return JSON.stringify(articles, null, 2)
    },
  }))
}
