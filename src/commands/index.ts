import { writeFileSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'

/**
 * Register the OpenBook chat commands (the dsh-native replacement of the
 * legacy `cli.js` surface). Every legacy CLI command has a mapping:
 *
 *   list / read <i> / search <q> / recent [n]      -> /feeds, /read, /search, /recent
 *   notes / highlights / favorites / activity [n]  -> /notes, /favorites, /activity
 *   open <i> / materialize <i> / sync [n] [ms]     -> /open, /materialize, /sync
 *   export [days] / review [days] / stats          -> /export-review, /review, /stats
 *   doctor / book *                                -> /doctor, /book <index|recent|article|search>
 *
 * @param ctx - plugin context with the OpenBook services injected.
 */
export function registerCommands(ctx: Context): void {
  const command = (
    name: string,
    description: string,
    handler: (rawInput: string, invocation: CommandInvocation) => CommandResult | Promise<CommandResult>,
  ) => {
    // Input hint derives from the usage clause after the first ": " in the
    // description; commands without a usage clause register no input field.
    const hint = description.includes(': ')
      ? description.split(': ').slice(1).join(': ')
      : undefined
    ctx.commands.register({
      name,
      description,
      ...(hint === undefined ? {} : { input: { hint } }),
      handler: async invocation => handler(invocation.rawInput.trim(), invocation),
    })
  }

  const ok = (text: string): CommandResult => ({ kind: 'success', text })
  const fail = (text: string): CommandResult => ({ kind: 'error', text })

  const firstToken = (raw: string): string => raw.split(/\s+/)[0] ?? ''
  const restAfter = (raw: string): string => raw.replace(/^\S+\s*/, '')

  command('feeds', 'List RSS feeds, or add one: /feeds add <url> [name]', async raw => {
    if (firstToken(raw) === 'add') {
      const args = restAfter(raw).split(/\s+/)
      const url = args[0]
      if (!url) return fail('Usage: /feeds add <url> [name]')
      const name = args.slice(1).join(' ')
      const result = await ctx.rssFeed.addFeed(url, name)
      return result.ok ? ok(`Added feed: ${name || url}`) : fail(result.reason ?? 'Failed to add feed')
    }
    const feeds = ctx.rssFeed.listFeeds()
    if (feeds.length === 0) return ok('No feeds configured.')
    return ok(feeds.map((feed, index) => `${index + 1}. ${feed.name}\n   ${feed.url}`).join('\n'))
  })

  command('read', 'Read articles from a feed by index: /read <index>', async raw => {
    const index = parseInt(firstToken(raw), 10)
    const feeds = ctx.rssFeed.listFeeds()
    if (Number.isNaN(index) || index < 1 || index > feeds.length) return fail(`Invalid feed index (1..${feeds.length})`)
    const feed = feeds[index - 1]!
    const articles = ctx.rssArticle.listArticlesByFeed(feed.url, 20)
    if (articles.length === 0) return ok(`No articles for ${feed.name}.`)
    return ok(articles.map((article, i) =>
      `${i + 1}. ${article.title ?? 'Untitled'}${article.pubDate ? ` (${article.pubDate})` : ''}\n   ${article.link ?? ''}`,
    ).join('\n'))
  })

  command('search', 'Search articles by keyword: /search <query>', raw => {
    if (!raw) return fail('Usage: /search <query>')
    const articles = ctx.rssArticle.searchArticles(raw, 20)
    if (articles.length === 0) return ok(`No articles match "${raw}".`)
    return ok(articles.map((article, i) =>
      `${i + 1}. ${article.title ?? 'Untitled'} [${article.feedName}]\n   ${article.link ?? ''}`,
    ).join('\n'))
  })

  command('recent', 'Show the last n articles (default 10): /recent [n]', raw => {
    const n = parseInt(firstToken(raw), 10) || 10
    const articles = ctx.rssArticle.listArticlesRecent(n)
    if (articles.length === 0) return ok('No articles yet.')
    return ok(articles.map((article, i) =>
      `${i + 1}. ${article.title ?? 'Untitled'} [${article.feedName}]${article.isRead ? '' : ' (unread)'}\n   ${article.link ?? ''}`,
    ).join('\n'))
  })

  command('notes', 'List all notes and highlights', () => {
    const items = ctx.rssActivity.listActivity({ limit: 100 }).items.filter(item => item.type === 'note')
    if (items.length === 0) return ok('No notes yet.')
    return ok(items.map(item =>
      `- ${item.createdAt} ${item.payload.title ?? ''} (${item.articleId ?? ''})\n  ${item.payload.notePath ?? ''}`,
    ).join('\n'))
  })

  command('favorites', 'List all favorited articles', () => {
    const articles = ctx.rssArticle.listArticlesRecent(500).filter(article => article.isFavorite)
    if (articles.length === 0) return ok('No favorites yet.')
    return ok(articles.map((article, i) =>
      `${i + 1}. ${article.title ?? 'Untitled'} [${article.feedName}]\n   ${article.link ?? ''}`,
    ).join('\n'))
  })

  command('stats', 'Show database statistics', () => {
    const feeds = ctx.rssFeed.listFeeds()
    const articles = ctx.rssArticle.listArticlesRecent(1)
    const total = articles.length === 1 ? '<recent only>' : '0'
    const notes = ctx.rssActivity.listActivity({ limit: 1000 }).items.filter(item => item.type === 'note').length
    const status = ctx.rssSync.getSyncStatus()
    return ok([
      `Feeds: ${feeds.length}`,
      `Recent articles: ${articles.length}`,
      `Notes: ${notes}`,
      `Data dir: ${ctx.rssStore.dataDir}`,
      `Sync: ${status.status}${status.lastCount ? ` (last ${status.lastCount})` : ''}`,
    ].join('\n'))
  })

  command('open', 'Open an article by index in the browser: /open <index>', raw => {
    const index = parseInt(firstToken(raw), 10)
    const articles = ctx.rssArticle.listArticlesRecent(200)
    const article = articles[index - 1]
    if (!article?.link) return fail('Invalid index or article has no link.')
    return ok(`Open: ${article.title ?? article.link}\n${article.link}`)
  })

  command('materialize', 'Save an article as Markdown: /materialize <index|url>', async raw => {
    const token = firstToken(raw)
    if (!token) return fail('Usage: /materialize <index|url>')
    let url = token
    let title: string | undefined
    const index = parseInt(token, 10)
    if (!Number.isNaN(index)) {
      const articles = ctx.rssArticle.listArticlesRecent(200)
      const article = articles[index - 1]
      if (!article?.link) return fail('Invalid article index.')
      url = article.link
      title = article.title ?? undefined
    }
    const result = await ctx.rssArticle.materializeArticle({ url, title })
    return result.ok
      ? ok(`${result.skipped ? 'Already materialized' : 'Materialized'}: ${result.markdownPath}`)
      : fail(result.error ?? 'Materialize failed')
  })

  command('sync', 'Fetch feeds and persist new articles: /sync [limit] [timeoutMs]', async (raw, invocation) => {
    const tokens = raw.split(/\s+/)
    const limit = parseInt(tokens[0] ?? '', 10) || 50
    const timeoutMs = parseInt(tokens[1] ?? '', 10) || 0
    const result = await ctx.rssSync.warmSync({
      limit,
      timeoutMs,
      reason: 'command',
    })
    if (!result.ok) return fail(`Sync failed (${result.status}): ${result.error ?? ''}`)
    const s = result.summary
    return ok(`Sync done: ${result.count} articles. ${s ? `feeds=${s.feeds_checked} new=${s.new_articles_count}` : ''}`)
  })

  command('export-review', 'Export the activity timeline to a Markdown file: /export-review [days]', raw => {
    const days = parseInt(firstToken(raw), 10) || 7
    const markdown = ctx.rssActivity.exportMarkdown(days)
    const filePath = `${ctx.rssStore.dataDir}/export-${Date.now()}.md`
    writeFileSync(filePath, markdown, 'utf-8')
    return ok(`Exported ${days}d review to ${filePath}`)
  })

  command('review', 'Print the local weekly review Markdown: /review [days]', raw => {
    const days = parseInt(firstToken(raw), 10) || 7
    return ok(ctx.rssActivity.exportMarkdown(days))
  })

  command('activity', 'Show the recent activity log: /activity [n]', raw => {
    const n = parseInt(firstToken(raw), 10) || 20
    const items = ctx.rssActivity.listActivity({ limit: n }).items
    if (items.length === 0) return ok('No activity yet.')
    return ok(items.map(item =>
      `- ${item.createdAt} [${item.type}] ${item.article?.title ?? item.payload.title ?? item.articleId ?? ''}`,
    ).join('\n'))
  })

  command('book', 'Agent-readable knowledge base: /book <index|recent [n]|article <id>|search <q>>', raw => {
    const sub = firstToken(raw)
    const arg = restAfter(raw)
    if (sub === 'index') {
      return ok(JSON.stringify({
        feeds: ctx.rssStore.readJsonIndex().feeds,
        articles: ctx.rssStore.readJsonIndex().articles,
        data_dir: ctx.rssStore.dataDir,
        sync: ctx.rssSync.getSyncStatus(),
      }, null, 2))
    }
    if (sub === 'recent') {
      const n = parseInt(firstToken(arg), 10) || 20
      return ok(JSON.stringify(ctx.rssArticle.listArticlesRecent(n), null, 2))
    }
    if (sub === 'article') {
      const id = firstToken(arg)
      if (!id) return fail('Usage: /book article <id>')
      return ok(JSON.stringify({
        article: ctx.rssArticle.getArticle(id),
        notes: ctx.rssArticle.listNotes(id),
      }, null, 2))
    }
    if (sub === 'search') {
      if (!arg) return fail('Usage: /book search <query>')
      return ok(JSON.stringify(ctx.rssArticle.searchArticles(arg, 50), null, 2))
    }
    return fail('Usage: /book <index|recent [n]|article <id>|search <q>>')
  })

  command('doctor', 'Local-first health check: DB, feeds, sync status', () => {
    const checks: string[] = []
    try {
      const feeds = ctx.rssFeed.listFeeds()
      const status = ctx.rssSync.getSyncStatus()
      const orphans = ctx.rssArticle.findOrphanArticles()
      checks.push(`db: ok (${ctx.rssStore.dbPath})`)
      checks.push(`feeds: ${feeds.length} configured`)
      checks.push(`sync: ${status.status}${status.lastError ? ` (${status.lastError})` : ''}`)
      checks.push(`orphans: ${orphans.length}`)
      checks.push(`data_dir: ${ctx.rssStore.dataDir}`)
      return ok(checks.join('\n'))
    } catch (error) {
      checks.push(`error: ${(error as Error).message}`)
      return fail(checks.join('\n'))
    }
  })
}
