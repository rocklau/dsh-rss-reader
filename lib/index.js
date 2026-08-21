var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __knownSymbol = (name2, symbol) => (symbol = Symbol[name2]) ? symbol : Symbol.for("Symbol." + name2);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __decoratorStart = (base) => [, , , __create(base?.[__knownSymbol("metadata")] ?? null)];
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError("Function expected") : fn;
var __decoratorContext = (kind, name2, done, metadata, fns) => ({ kind: __decoratorStrings[kind], name: name2, metadata, addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null)) });
var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
var __runInitializers = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) flags & 1 ? fns[i].call(self) : value = fns[i].call(self, value);
  return value;
};
var __decorateElement = (array, flags, name2, decorators, target, extra) => {
  var fn, it, done, ctx, access, k = flags & 7, s = !!(flags & 8), p = !!(flags & 16);
  var j = k > 3 ? array.length + 1 : k ? s ? 1 : 2 : 0, key = __decoratorStrings[k + 5];
  var initializers = k > 3 && (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  var desc = k && (!p && !s && (target = target.prototype), k < 5 && (k > 3 || !p) && __getOwnPropDesc(k < 4 ? target : { get [name2]() {
    return __privateGet(this, extra);
  }, set [name2](x) {
    return __privateSet(this, extra, x);
  } }, name2));
  k ? p && k < 4 && __name(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name2) : __name(target, name2);
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name2, done = {}, array[3], extraInitializers);
    if (k) {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: p ? (x) => __privateIn(target, x) : (x) => name2 in x };
      if (k ^ 3) access.get = p ? (x) => (k ^ 1 ? __privateGet : __privateMethod)(x, target, k ^ 4 ? extra : desc.get) : (x) => x[name2];
      if (k > 2) access.set = p ? (x, y) => __privateSet(x, target, y, k ^ 4 ? extra : desc.set) : (x, y) => x[name2] = y;
    }
    it = (0, decorators[i])(k ? k < 4 ? p ? extra : desc[key] : k > 4 ? void 0 : { get: desc.get, set: desc.set } : target, ctx), done._ = 1;
    if (k ^ 4 || it === void 0) __expectFn(it) && (k > 4 ? initializers.unshift(it) : k ? p ? extra = it : desc[key] = it : target = it);
    else if (typeof it !== "object" || it === null) __typeError("Object expected");
    else __expectFn(fn = it.get) && (desc.get = fn), __expectFn(fn = it.set) && (desc.set = fn), __expectFn(fn = it.init) && initializers.unshift(fn);
  }
  return k || __decoratorMetadata(array, target), desc && __defProp(target, name2, desc), p ? k ^ 4 ? extra : desc : target;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateIn = (member, obj) => Object(obj) !== obj ? __typeError('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

// src/constants.ts
var PLUGIN_NAME = "openbook-rss";
var USER_AGENT = "OpenBook RSS Reader (+https://github.com/rocklau/OpenBook)";
var ACTIVITY_TYPES = {
  STATE: "state",
  NOTE: "note",
  MATERIALIZE: "materialize"
};
var DEFAULT_FEEDS = [
  { url: "https://news.ycombinator.com/rss", name: "Hacker News" },
  { url: "https://www.reddit.com/r/programming/.rss", name: "r/programming" },
  { url: "https://techcrunch.com/feed/", name: "TechCrunch" }
];
var JSON_INDEX_VERSION = 1;

// src/config.ts
import Schema from "@deepseek-ai/schemastery";
import { dshHomePath } from "@deepseek-ai/dsh-home-paths";
var DEFAULT_DATA_DIR = dshHomePath("openbook-rss", "v1");
var Config = Schema.object({
  dataDir: Schema.string().default(DEFAULT_DATA_DIR),
  allowPrivateFeeds: Schema.boolean().default(false),
  startupSync: Schema.boolean().default(true),
  startupSyncLimit: Schema.number().default(50),
  feedMinSyncIntervalMs: Schema.number().default(12e4),
  feedHeadCheck: Schema.boolean().default(true),
  feedHeadTimeoutMs: Schema.number().default(3e3),
  fetchConcurrency: Schema.number().default(4),
  fetchIntervalCap: Schema.number().default(10),
  fetchIntervalMs: Schema.number().default(1e3),
  userAgent: Schema.string().default("OpenBook RSS Reader (+https://github.com/rocklau/dsh-rss-reader)"),
  defaultFeeds: Schema.array(Schema.object({
    url: Schema.string().required(),
    name: Schema.string().default("")
  })).default(DEFAULT_FEEDS.map((feed) => ({ url: feed.url, name: feed.name }))),
  // No OPML bundled by default; point this at your own .opml files to import.
  opmlFiles: Schema.array(Schema.string()).default([])
});

// src/commands/index.ts
import { writeFileSync } from "node:fs";
function registerCommands(ctx) {
  const command = (name2, description, handler) => {
    const hint = description.includes(": ") ? description.split(": ").slice(1).join(": ") : void 0;
    ctx.commands.register({
      name: name2,
      description,
      ...hint === void 0 ? {} : { input: { hint } },
      handler: async (invocation) => handler(invocation.rawInput.trim(), invocation)
    });
  };
  const ok = (text) => ({ kind: "success", text });
  const fail = (text) => ({ kind: "error", text });
  const firstToken = (raw) => raw.split(/\s+/)[0] ?? "";
  const restAfter = (raw) => raw.replace(/^\S+\s*/, "");
  command("feeds", "List RSS feeds, or add one: /feeds add <url> [name]", async (raw) => {
    if (firstToken(raw) === "add") {
      const args = restAfter(raw).split(/\s+/);
      const url = args[0];
      if (!url) return fail("Usage: /feeds add <url> [name]");
      const name2 = args.slice(1).join(" ");
      const result = await ctx.rssFeed.addFeed(url, name2);
      return result.ok ? ok(`Added feed: ${name2 || url}`) : fail(result.reason ?? "Failed to add feed");
    }
    const feeds = ctx.rssFeed.listFeeds();
    if (feeds.length === 0) return ok("No feeds configured.");
    return ok(feeds.map((feed, index) => `${index + 1}. ${feed.name}
   ${feed.url}`).join("\n"));
  });
  command("read", "Read articles from a feed by index: /read <index>", async (raw) => {
    const index = parseInt(firstToken(raw), 10);
    const feeds = ctx.rssFeed.listFeeds();
    if (Number.isNaN(index) || index < 1 || index > feeds.length) return fail(`Invalid feed index (1..${feeds.length})`);
    const feed = feeds[index - 1];
    const articles = ctx.rssArticle.listArticlesByFeed(feed.url, 20);
    if (articles.length === 0) return ok(`No articles for ${feed.name}.`);
    return ok(articles.map(
      (article, i) => `${i + 1}. ${article.title ?? "Untitled"}${article.pubDate ? ` (${article.pubDate})` : ""}
   ${article.link ?? ""}`
    ).join("\n"));
  });
  command("search", "Search articles by keyword: /search <query>", (raw) => {
    if (!raw) return fail("Usage: /search <query>");
    const articles = ctx.rssArticle.searchArticles(raw, 20);
    if (articles.length === 0) return ok(`No articles match "${raw}".`);
    return ok(articles.map(
      (article, i) => `${i + 1}. ${article.title ?? "Untitled"} [${article.feedName}]
   ${article.link ?? ""}`
    ).join("\n"));
  });
  command("recent", "Show the last n articles (default 10): /recent [n]", (raw) => {
    const n = parseInt(firstToken(raw), 10) || 10;
    const articles = ctx.rssArticle.listArticlesRecent(n);
    if (articles.length === 0) return ok("No articles yet.");
    return ok(articles.map(
      (article, i) => `${i + 1}. ${article.title ?? "Untitled"} [${article.feedName}]${article.isRead ? "" : " (unread)"}
   ${article.link ?? ""}`
    ).join("\n"));
  });
  command("notes", "List all notes and highlights", () => {
    const items = ctx.rssActivity.listActivity({ limit: 100 }).items.filter((item) => item.type === "note");
    if (items.length === 0) return ok("No notes yet.");
    return ok(items.map(
      (item) => `- ${item.createdAt} ${item.payload.title ?? ""} (${item.articleId ?? ""})
  ${item.payload.notePath ?? ""}`
    ).join("\n"));
  });
  command("favorites", "List all favorited articles", () => {
    const articles = ctx.rssArticle.listArticlesRecent(500).filter((article) => article.isFavorite);
    if (articles.length === 0) return ok("No favorites yet.");
    return ok(articles.map(
      (article, i) => `${i + 1}. ${article.title ?? "Untitled"} [${article.feedName}]
   ${article.link ?? ""}`
    ).join("\n"));
  });
  command("stats", "Show database statistics", () => {
    const feeds = ctx.rssFeed.listFeeds();
    const articles = ctx.rssArticle.listArticlesRecent(1);
    const total = articles.length === 1 ? "<recent only>" : "0";
    const notes = ctx.rssActivity.listActivity({ limit: 1e3 }).items.filter((item) => item.type === "note").length;
    const status = ctx.rssSync.getSyncStatus();
    return ok([
      `Feeds: ${feeds.length}`,
      `Recent articles: ${articles.length}`,
      `Notes: ${notes}`,
      `Data dir: ${ctx.rssStore.dataDir}`,
      `Sync: ${status.status}${status.lastCount ? ` (last ${status.lastCount})` : ""}`
    ].join("\n"));
  });
  command("open", "Open an article by index in the browser: /open <index>", (raw) => {
    const index = parseInt(firstToken(raw), 10);
    const articles = ctx.rssArticle.listArticlesRecent(200);
    const article = articles[index - 1];
    if (!article?.link) return fail("Invalid index or article has no link.");
    return ok(`Open: ${article.title ?? article.link}
${article.link}`);
  });
  command("materialize", "Save an article as Markdown: /materialize <index|url>", async (raw) => {
    const token = firstToken(raw);
    if (!token) return fail("Usage: /materialize <index|url>");
    let url = token;
    let title;
    const index = parseInt(token, 10);
    if (!Number.isNaN(index)) {
      const articles = ctx.rssArticle.listArticlesRecent(200);
      const article = articles[index - 1];
      if (!article?.link) return fail("Invalid article index.");
      url = article.link;
      title = article.title ?? void 0;
    }
    const result = await ctx.rssArticle.materializeArticle({ url, title });
    return result.ok ? ok(`${result.skipped ? "Already materialized" : "Materialized"}: ${result.markdownPath}`) : fail(result.error ?? "Materialize failed");
  });
  command("sync", "Fetch feeds and persist new articles: /sync [limit] [timeoutMs]", async (raw, invocation) => {
    const tokens = raw.split(/\s+/);
    const limit = parseInt(tokens[0] ?? "", 10) || 50;
    const timeoutMs = parseInt(tokens[1] ?? "", 10) || 0;
    const result = await ctx.rssSync.warmSync({
      limit,
      timeoutMs,
      reason: "command",
      session: invocation.agent.session ?? null
    });
    if (!result.ok) return fail(`Sync failed (${result.status}): ${result.error ?? ""}`);
    const s = result.summary;
    return ok(`Sync done: ${result.count} articles. ${s ? `feeds=${s.feeds_checked} new=${s.new_articles_count}` : ""}`);
  });
  command("export-review", "Export the activity timeline to a Markdown file: /export-review [days]", (raw) => {
    const days = parseInt(firstToken(raw), 10) || 7;
    const markdown = ctx.rssActivity.exportMarkdown(days);
    const filePath = `${ctx.rssStore.dataDir}/export-${Date.now()}.md`;
    writeFileSync(filePath, markdown, "utf-8");
    return ok(`Exported ${days}d review to ${filePath}`);
  });
  command("review", "Print the local weekly review Markdown: /review [days]", (raw) => {
    const days = parseInt(firstToken(raw), 10) || 7;
    return ok(ctx.rssActivity.exportMarkdown(days));
  });
  command("activity", "Show the recent activity log: /activity [n]", (raw) => {
    const n = parseInt(firstToken(raw), 10) || 20;
    const items = ctx.rssActivity.listActivity({ limit: n }).items;
    if (items.length === 0) return ok("No activity yet.");
    return ok(items.map(
      (item) => `- ${item.createdAt} [${item.type}] ${item.article?.title ?? item.payload.title ?? item.articleId ?? ""}`
    ).join("\n"));
  });
  command("book", "Agent-readable knowledge base: /book <index|recent [n]|article <id>|search <q>>", (raw) => {
    const sub = firstToken(raw);
    const arg = restAfter(raw);
    if (sub === "index") {
      return ok(JSON.stringify({
        feeds: ctx.rssStore.readJsonIndex().feeds,
        articles: ctx.rssStore.readJsonIndex().articles,
        data_dir: ctx.rssStore.dataDir,
        sync: ctx.rssSync.getSyncStatus()
      }, null, 2));
    }
    if (sub === "recent") {
      const n = parseInt(firstToken(arg), 10) || 20;
      return ok(JSON.stringify(ctx.rssArticle.listArticlesRecent(n), null, 2));
    }
    if (sub === "article") {
      const id = firstToken(arg);
      if (!id) return fail("Usage: /book article <id>");
      return ok(JSON.stringify({
        article: ctx.rssArticle.getArticle(id),
        notes: ctx.rssArticle.listNotes(id)
      }, null, 2));
    }
    if (sub === "search") {
      if (!arg) return fail("Usage: /book search <query>");
      return ok(JSON.stringify(ctx.rssArticle.searchArticles(arg, 50), null, 2));
    }
    return fail("Usage: /book <index|recent [n]|article <id>|search <q>>");
  });
  command("doctor", "Local-first health check: DB, feeds, sync status", () => {
    const checks = [];
    try {
      const feeds = ctx.rssFeed.listFeeds();
      const status = ctx.rssSync.getSyncStatus();
      const orphans = ctx.rssArticle.findOrphanArticles();
      checks.push(`db: ok (${ctx.rssStore.dbPath})`);
      checks.push(`feeds: ${feeds.length} configured`);
      checks.push(`sync: ${status.status}${status.lastError ? ` (${status.lastError})` : ""}`);
      checks.push(`orphans: ${orphans.length}`);
      checks.push(`data_dir: ${ctx.rssStore.dataDir}`);
      return ok(checks.join("\n"));
    } catch (error) {
      checks.push(`error: ${error.message}`);
      return fail(checks.join("\n"));
    }
  });
}

// src/tools/bookTools.ts
import { defineTool } from "@deepseek-ai/dsh-tools";
function registerBookTools(ctx) {
  ctx.tools.register(defineTool({
    name: "book_index",
    description: "Agent-readable knowledge base index: feed count, article counts, data dir, sync status (JSON).",
    parameters: {},
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    execute: async () => {
      const index = ctx.rssStore.readJsonIndex();
      const status = ctx.rssSync.getSyncStatus();
      const payload = {
        feeds: index.feeds,
        articles: index.articles,
        generated_at: index.generated_at,
        data_dir: ctx.rssStore.dataDir,
        sync: status
      };
      return JSON.stringify(payload, null, 2);
    }
  }));
  ctx.tools.register(defineTool({
    name: "book_recent",
    description: "List recent articles as agent-readable JSON.",
    parameters: {
      limit: { type: "number", description: "Max articles (default 20)." }
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    execute: async (args) => {
      const articles = ctx.rssArticle.listArticlesRecent(args.limit ?? 20);
      return JSON.stringify(articles, null, 2);
    }
  }));
  ctx.tools.register(defineTool({
    name: "book_article",
    description: "One article with its activity and markdown text, as JSON.",
    parameters: {
      articleId: { type: "string", required: true, description: "Stable article id." }
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    execute: async (args) => {
      const article = ctx.rssArticle.getArticle(args.articleId);
      const notes = ctx.rssArticle.listNotes(args.articleId);
      return JSON.stringify({ article, notes }, null, 2);
    }
  }));
  ctx.tools.register(defineTool({
    name: "book_search",
    description: "Search articles, notes, and highlights as JSON.",
    parameters: {
      query: { type: "string", required: true, description: "Search keywords." }
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    execute: async (args) => {
      const articles = ctx.rssArticle.searchArticles(args.query, 50);
      return JSON.stringify(articles, null, 2);
    }
  }));
}

// src/tools/rssTools.ts
import { defineTool as defineTool2 } from "@deepseek-ai/dsh-tools";
function registerRssTools(ctx) {
  ctx.tools.register(defineTool2({
    name: "rss_list_feeds",
    description: "List all configured RSS feeds with their latest sync status.",
    parameters: {},
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    execute: async () => {
      const feeds = ctx.rssFeed.listFeeds();
      if (feeds.length === 0) return "No feeds configured.";
      return feeds.map(
        (feed, index) => `${index + 1}. ${feed.name} \u2014 ${feed.url}${feed.lastCheckedAt ? ` (checked ${feed.lastCheckedAt})` : ""}`
      ).join("\n");
    }
  }));
  ctx.tools.register(defineTool2({
    name: "rss_sync",
    description: "Fetch all RSS feeds, persist new articles, and report what changed.",
    parameters: {
      limit: { type: "number", description: "Max articles to process (default 50)." },
      reason: { type: "string", description: 'Sync reason, e.g. "daily" or "user request".' }
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    async execute(args, exec) {
      const result = await ctx.rssSync.warmSync({
        limit: args.limit ?? 50,
        reason: args.reason ?? "agent",
        session: exec.agent?.session ?? null
      });
      if (!result.ok) return `Sync failed (${result.status}): ${result.error ?? "unknown error"}`;
      const summary = result.summary;
      const parts = [
        `Sync ${result.status} in ${result.reason}: ${result.count} articles processed.`
      ];
      if (summary) {
        parts.push(
          `feeds_checked=${summary.feeds_checked}`,
          `new_articles=${summary.new_articles_count}`,
          `network_fetch=${summary.network_fetch_count}`,
          `cache_fallback=${summary.cache_fallback_count}`,
          `head_not_modified=${summary.head_not_modified_count}`,
          `conditional_not_modified=${summary.conditional_not_modified_count}`,
          `min_interval_skip=${summary.min_interval_skip_count}`
        );
      }
      return parts.join("\n");
    }
  }));
  ctx.tools.register(defineTool2({
    name: "rss_search",
    description: "Search the local article database by keyword (title, snippet, link).",
    parameters: {
      query: { type: "string", required: true, description: "Search keywords." },
      limit: { type: "number", description: "Max results (default 20)." }
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    execute: async (args) => {
      const results = ctx.rssArticle.searchArticles(args.query, args.limit ?? 20);
      if (results.length === 0) return `No articles match "${args.query}".`;
      return results.map(
        (article, index) => `${index + 1}. ${article.title ?? "Untitled"}${article.feedName ? ` [${article.feedName}]` : ""}${article.pubDate ? ` ${article.pubDate}` : ""}
   ${article.link ?? ""}${article.isRead ? "" : " (unread)"}`
      ).join("\n");
    }
  }));
  ctx.tools.register(defineTool2({
    name: "rss_read_article",
    description: "Read one article from the local database by id; includes markdown body when materialized.",
    parameters: {
      articleId: { type: "string", required: true, description: "Stable article id (64 hex chars)." }
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    execute: async (args) => {
      const article = ctx.rssArticle.getArticle(args.articleId);
      if (!article) return `Article not found: ${args.articleId}`;
      const lines = [
        `# ${article.title ?? "Untitled"}`,
        `Feed: ${article.feedName}`,
        `Published: ${article.pubDate ?? "unknown"}`,
        `Link: ${article.link ?? ""}`,
        `Materialized: ${article.markdownPath ?? "no"}`,
        "",
        article.contentSnippet ?? "No snippet available."
      ];
      if (article.markdownPath) {
        lines.push("", `Markdown: ${article.markdownPath}`);
      }
      return lines.join("\n");
    }
  }));
  ctx.tools.register(defineTool2({
    name: "rss_materialize",
    description: "Save an article (by URL) as local Markdown with YAML front matter. Idempotent.",
    parameters: {
      url: { type: "string", required: true, description: "Article URL." },
      title: { type: "string", description: "Optional title override." },
      feedUrl: { type: "string", description: "Optional feed URL for grouping." },
      publishedAt: { type: "string", description: "Optional ISO publish time." }
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    async execute(args, exec) {
      const result = await ctx.rssArticle.materializeArticle({
        url: args.url,
        title: args.title,
        feedUrl: args.feedUrl,
        publishedAt: args.publishedAt
      });
      if (!result.ok) return `Materialize failed: ${result.error ?? "unknown error"}`;
      const base = result.skipped ? "Already materialized" : "Materialized";
      exec.agent?.session?.append("openbook-rss/article-materialized", {
        articleId: result.articleId ?? "",
        title: args.title ?? "",
        url: args.url,
        feedUrl: args.feedUrl ?? "",
        markdownPath: result.markdownPath ?? "",
        skipped: result.skipped ?? false,
        reason: result.reason ?? "materialized"
      });
      return `${base}: ${result.markdownPath} (${result.reason ?? "ok"})`;
    }
  }));
  ctx.tools.register(defineTool2({
    name: "rss_save_note",
    description: "Save a note or highlight for an article as local Markdown.",
    parameters: {
      articleId: { type: "string", required: true, description: "Stable article id." },
      content: { type: "string", required: true, description: "Note content." },
      title: { type: "string", description: "Optional note title." }
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    execute: async (args) => {
      const result = ctx.rssArticle.createNote({ articleId: args.articleId, title: args.title, content: args.content });
      return `Note saved: ${result.notePath}`;
    }
  }));
  ctx.tools.register(defineTool2({
    name: "rss_export_review",
    description: "Export the activity timeline of the last N days as Markdown (weekly review).",
    parameters: {
      days: { type: "number", description: "Days to cover (default 7)." }
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    execute: async (args) => ctx.rssActivity.exportMarkdown(args.days ?? 7)
  }));
}

// src/services/activityService.ts
import { Service } from "@deepseek-ai/cordis";
function mdEscape(text) {
  return String(text || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}
var ActivityService = class extends Service {
  static inject = ["rssStore"];
  constructor(ctx) {
    super(ctx, "rssActivity");
  }
  get store() {
    return this.ctx.rssStore;
  }
  /** Latest activity items with pagination. */
  listActivity(options = {}) {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const items = this.store.repositories.listActivity(limit, offset).map((row) => ({
      id: row.id,
      type: row.type,
      articleId: row.article_id,
      createdAt: row.created_at,
      payload: (() => {
        try {
          return row.payload_json ? JSON.parse(row.payload_json) : {};
        } catch {
          return {};
        }
      })(),
      article: row.article_id ? {
        id: row.article_id,
        title: row.article_title,
        link: row.article_link,
        feedUrl: row.feed_url,
        markdownPath: row.article_markdown_path
      } : null
    }));
    return { limit, offset, items };
  }
  /** Append one activity row. */
  logActivity(type, articleId, payload) {
    this.store.repositories.logActivity(type, articleId, JSON.stringify(payload));
  }
  /** Build a markdown weekly-review document covering the last `days`. */
  exportMarkdown(days) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1e3);
    const rows2 = this.store.repositories.listActivitySince(since.toISOString());
    const header = [
      "---",
      `title: ${JSON.stringify(`OpenBook Weekly Review (${days}d)`)}`,
      `generated_at: ${JSON.stringify((/* @__PURE__ */ new Date()).toISOString())}`,
      `days: ${days}`,
      "---",
      "",
      `# OpenBook Review (${days} days)`,
      "",
      `Generated at: ${(/* @__PURE__ */ new Date()).toISOString()}`,
      ""
    ].join("\n");
    const lines = [header, "## Activity", ""];
    lines.push("| Time | Type | Title | Link | Details |");
    lines.push("|---|---|---|---|---|");
    for (const row of rows2) {
      let payload = {};
      try {
        payload = row.payload_json ? JSON.parse(row.payload_json) : {};
      } catch {
      }
      const type = row.type;
      const title = row.article_title ?? payload.title ?? "";
      const link = row.article_link ?? payload.url ?? "";
      let details = "";
      if (type === ACTIVITY_TYPES.STATE) {
        details = `read=${payload.isRead ? "yes" : "no"}, fav=${payload.isFavorite ? "yes" : "no"}`;
      } else if (type === ACTIVITY_TYPES.NOTE) {
        details = `note=${payload.notePath ?? ""}`;
      } else if (type === ACTIVITY_TYPES.MATERIALIZE) {
        details = `md=${payload.markdownPath ?? ""}`;
      }
      lines.push(`| ${mdEscape(row.created_at)} | ${mdEscape(type)} | ${mdEscape(title)} | ${mdEscape(link)} | ${mdEscape(details)} |`);
    }
    return lines.join("\n") + "\n";
  }
};

// src/services/articleService.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync2, writeFileSync as writeFileSync3 } from "node:fs";
import { join as join2 } from "node:path";
import { Service as Service2 } from "@deepseek-ai/cordis";

// src/markdown/collector.ts
import { createHash as createHash2 } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync as writeFileSync2 } from "node:fs";
import { basename, dirname, extname, join, posix } from "node:path";

// src/rss/httpClient.ts
var FetchError = class extends Error {
  constructor(message, status, url) {
    super(message);
    this.status = status;
    this.url = url;
    this.name = "FetchError";
  }
};
var FetchQueue = class {
  constructor(options) {
    this.options = options;
  }
  pending = [];
  running = 0;
  windowCount = 0;
  windowStart = Date.now();
  /** Run a task through the queue; resolves with the task's result. */
  async run(task) {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.running -= 1;
      this.next();
    }
  }
  acquire() {
    return new Promise((resolve) => {
      this.pending.push(resolve);
      this.pump();
    });
  }
  next() {
    this.pump();
  }
  pump() {
    while (this.running < this.options.concurrency && this.pending.length > 0) {
      const slot = this.options.intervalCap > 0 && this.windowCount >= this.options.intervalCap;
      if (slot) {
        const elapsed = Date.now() - this.windowStart;
        if (elapsed < this.options.intervalMs) return;
        this.windowCount = 0;
        this.windowStart = Date.now();
      }
      const task = this.pending.shift();
      if (task === void 0) return;
      this.running += 1;
      this.windowCount += 1;
      task();
    }
  }
};
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function fetchOnce(url, options) {
  const { timeoutMs, retries: _retries, ...init } = options;
  const controller = new AbortController();
  const timer = timeoutMs === void 0 ? void 0 : setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      const error = new FetchError(`HTTP ${res.status}`, res.status, url);
      throw error;
    }
    return res;
  } finally {
    if (timer !== void 0) clearTimeout(timer);
  }
}
async function queuedFetch(queue, url, options = {}) {
  const retries = options.retries ?? 3;
  const baseDelayMs = 800;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await queue.run(() => fetchOnce(url, options));
    } catch (error) {
      lastError = error;
      const status = error.status;
      const shouldRetry = status === 429 || status !== void 0 && status >= 500 && status <= 599 || status === void 0;
      if (!shouldRetry || attempt === retries) break;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}

// src/utils.ts
import { createHash } from "node:crypto";
function stableId(feedUrl, guidOrLink) {
  return createHash("sha256").update(`${feedUrl}::${guidOrLink || ""}`).digest("hex");
}
function safeFileName(name2) {
  const slug = String(name2).trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-._]/g, "").replace(/-+/g, "-").slice(0, 120);
  return slug || "untitled";
}
function parseSourceUrlFromFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return null;
  const urlLine = match[1].split("\n").find((line) => line.startsWith("url: "));
  if (!urlLine) return null;
  try {
    return JSON.parse(urlLine.slice(5).trim());
  } catch {
    return null;
  }
}

// src/markdown/collector.ts
var IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
function isAlreadyCollected(rawUrl, assetsDirName) {
  const normalized = String(rawUrl || "").replace(/\\/g, "/");
  return normalized.startsWith(`${assetsDirName}/`) || normalized.startsWith(`./${assetsDirName}/`);
}
function resolveResourceUrl(rawUrl, sourceUrl) {
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  if (!sourceUrl) return null;
  try {
    return new URL(rawUrl, sourceUrl).toString();
  } catch {
    return null;
  }
}
function pickExtension(contentType, resourceUrl) {
  const type = (contentType || "").toLowerCase();
  if (type.includes("image/jpeg")) return ".jpg";
  if (type.includes("image/png")) return ".png";
  if (type.includes("image/gif")) return ".gif";
  if (type.includes("image/webp")) return ".webp";
  if (type.includes("image/svg+xml")) return ".svg";
  if (type.includes("image/avif")) return ".avif";
  try {
    return extname(new URL(resourceUrl).pathname || "").toLowerCase() || "";
  } catch {
    return "";
  }
}
function collectImageMatches(markdown, assetsDirName, sourceUrl) {
  const matches = [];
  const stats = { totalImageLinks: 0, alreadyCollected: 0, unresolvedRelative: 0 };
  for (const match of markdown.matchAll(IMAGE_REGEX)) {
    const [fullMatch, altText, rawUrl, title] = match;
    stats.totalImageLinks += 1;
    if (fullMatch === void 0 || rawUrl === void 0) continue;
    if (isAlreadyCollected(rawUrl, assetsDirName)) {
      stats.alreadyCollected += 1;
      continue;
    }
    const resolvedUrl = resolveResourceUrl(rawUrl, sourceUrl);
    if (!resolvedUrl) {
      stats.unresolvedRelative += 1;
      continue;
    }
    matches.push({ fullMatch, altText: altText ?? "", rawUrl, title: title ?? "", resolvedUrl });
  }
  return { matches, stats };
}
async function ensureLocalAsset(fetchQueue, options) {
  const { resolvedUrl, altText, assetsDir, assetsDirName } = options;
  const urlHash = createHash2("md5").update(resolvedUrl).digest("hex").slice(0, 12);
  const existing = readdirSync(assetsDir).find((file) => file.includes(`-${urlHash}`));
  if (existing) {
    return posix.join(assetsDirName, existing);
  }
  const res = await queuedFetch(fetchQueue, resolvedUrl, {
    headers: { "User-Agent": USER_AGENT },
    retries: 2
  });
  const extension = pickExtension(res.headers.get("content-type"), resolvedUrl);
  const baseName = safeFileName(altText || "image") || "image";
  const filename = `${baseName}-${urlHash}${extension}`;
  writeFileSync2(join(assetsDir, filename), Buffer.from(await res.arrayBuffer()));
  return posix.join(assetsDirName, filename);
}
async function downloadResources(fetchQueue, markdownPath, articleId) {
  if (!markdownPath || !existsSync(markdownPath)) {
    console.log(`[Collector] Markdown file not found: ${markdownPath}`);
    return;
  }
  const content = readFileSync(markdownPath, "utf-8");
  const sourceUrl = parseSourceUrlFromFrontmatter(content);
  const articleDir = dirname(markdownPath);
  const assetsDirName = `${basename(markdownPath, ".md")}-assets`;
  const assetsDir = join(articleDir, assetsDirName);
  const { matches: imageMatches, stats } = collectImageMatches(content, assetsDirName, sourceUrl);
  if (imageMatches.length === 0) {
    console.log(
      `[Collector] Skipped article ${articleId}: no collectable images (total=${stats.totalImageLinks}, localized=${stats.alreadyCollected}, unresolved=${stats.unresolvedRelative})`
    );
    return;
  }
  if (!existsSync(assetsDir)) {
    mkdirSync(assetsDir, { recursive: true });
  }
  const resolvedToLocal = /* @__PURE__ */ new Map();
  for (const item of imageMatches) {
    if (resolvedToLocal.has(item.resolvedUrl)) continue;
    try {
      const localPath = await ensureLocalAsset(fetchQueue, {
        resolvedUrl: item.resolvedUrl,
        altText: item.altText,
        assetsDir,
        assetsDirName
      });
      resolvedToLocal.set(item.resolvedUrl, localPath);
    } catch (error) {
      console.error(`[Collector] Failed to download ${item.resolvedUrl}:`, error.message);
    }
  }
  let updatedContent = content;
  for (const item of imageMatches) {
    const localPath = resolvedToLocal.get(item.resolvedUrl);
    if (!localPath) continue;
    const titlePart = item.title ? ` "${item.title}"` : "";
    updatedContent = updatedContent.replace(item.fullMatch, `![${item.altText}](${localPath}${titlePart})`);
  }
  if (updatedContent !== content) {
    writeFileSync2(markdownPath, updatedContent, "utf-8");
  } else {
    console.log(`[Collector] Skipped markdown rewrite for ${articleId}: no content changes`);
  }
}

// src/markdown/htmlToMd.ts
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
function htmlToMarkdown(html, { baseUrl } = {}) {
  const dom = new JSDOM(html, { url: baseUrl || "https://example.com" });
  const document = dom.window.document;
  document.querySelectorAll("script,style,noscript,iframe").forEach((node) => node.remove());
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced"
  });
  turndown.addRule("image", {
    filter: "img",
    replacement(_content, node) {
      const alt = node.getAttribute("alt") || "";
      const src = node.getAttribute("src") || "";
      if (!src) return "";
      return `![${alt}](${src})`;
    }
  });
  const main = document.querySelector("article") ?? document.body;
  return turndown.turndown(main).trim();
}

// src/services/articleService.ts
var ArticleService = class extends Service2 {
  static inject = ["rssStore", "rssFeed"];
  userAgent;
  materializeInFlight = /* @__PURE__ */ new Map();
  stateUpdateInFlight = /* @__PURE__ */ new Map();
  constructor(ctx, config) {
    super(ctx, "rssArticle");
    this.userAgent = config.userAgent;
  }
  get store() {
    return this.ctx.rssStore;
  }
  get feeds() {
    return this.ctx.rssFeed;
  }
  mapRow(row) {
    const feed = this.feeds.reader.feeds.find((item) => item.url === row.feed_url);
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
      isFavorite: !!row.is_favorite
    };
  }
  mapRows(rows2) {
    return rows2.map((row) => this.mapRow(row));
  }
  /** Most recent articles from the database. */
  listArticlesRecent(limit = 50) {
    return this.mapRows(this.store.repositories.listArticlesRecent(limit));
  }
  /** Articles published on one calendar day. */
  listArticlesByDate(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return this.mapRows(
      this.store.repositories.listArticlesByDate(start.toISOString(), end.toISOString(), 500)
    );
  }
  /** Articles from one feed. */
  listArticlesByFeed(feedUrl, limit = 200) {
    return this.mapRows(this.store.repositories.listArticlesByFeed(feedUrl, limit));
  }
  /** Full-text-ish search over title, snippet, and link. */
  searchArticles(query, limit = 50) {
    return this.mapRows(this.store.repositories.searchArticles(query, limit));
  }
  /** One article by stable id. */
  getArticle(articleId) {
    const row = this.store.repositories.getArticleById(articleId);
    return row ? this.mapRow(row) : null;
  }
  /** Articles whose markdown file is missing on disk (orphan check). */
  findOrphanArticles() {
    return this.mapRows(this.store.repositories.listArticlesRecent(500)).filter(
      (article) => article.markdownPath !== null && !existsSync2(article.markdownPath)
    );
  }
  /** Persist parsed items into the articles table and backfill state flags. */
  async processArticles(items) {
    const repositories = this.store.repositories;
    const upserts = [];
    for (const item of items) {
      const feedUrl = item.feedUrl;
      if (!feedUrl) continue;
      const id = stableId(feedUrl, item.guid || item.link || item.title);
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
        markdown_path: null
      });
    }
    if (upserts.length > 0) repositories.upsertArticles(upserts);
  }
  /**
   * Materialize one article to local markdown, idempotently (by normalized
   * URL), with in-flight de-duplication.
   */
  async materializeArticle(request) {
    const normalizedUrl = new URL(request.url).toString();
    const inFlight = this.materializeInFlight.get(normalizedUrl);
    if (inFlight) return inFlight;
    const run = (async () => {
      const store = this.store;
      const repositories = store.repositories;
      try {
        const parsedUrl = new URL(normalizedUrl);
        const existingByLink = repositories.getArticleByLink(normalizedUrl);
        if (existingByLink?.markdown_path && existsSync2(existingByLink.markdown_path)) {
          return {
            ok: true,
            articleId: existingByLink.id,
            markdownPath: existingByLink.markdown_path,
            skipped: true,
            reason: "already_materialized"
          };
        }
        const htmlRes = await queuedFetch(store.fetchQueue, normalizedUrl, {
          headers: { "User-Agent": this.userAgent }
        });
        const html = await htmlRes.text();
        const mdBody = htmlToMarkdown(html, { baseUrl: normalizedUrl });
        const now = /* @__PURE__ */ new Date();
        const year = String(now.getFullYear());
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const dir = join2(store.articlesDir, year, month);
        mkdirSync2(dir, { recursive: true });
        const slug = safeFileName(
          request.title || `${parsedUrl.hostname}-${parsedUrl.pathname.split("/").filter(Boolean).pop()}`
        );
        const filePath = join2(dir, `${slug}.md`);
        const frontMatter = {
          title: request.title ?? null,
          url: normalizedUrl,
          feed_url: request.feedUrl ?? null,
          published_at: request.publishedAt ?? null,
          fetched_at: (/* @__PURE__ */ new Date()).toISOString(),
          source: "html"
        };
        const yaml = Object.entries(frontMatter).filter(([, value]) => value != null && value !== "").map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n");
        writeFileSync3(filePath, `---
${yaml}
---

${mdBody}
`, "utf-8");
        const articleFeedUrl = request.feedUrl ?? parsedUrl.origin;
        repositories.ensureFeedExists(articleFeedUrl, parsedUrl.hostname);
        const articleId = stableId(articleFeedUrl, normalizedUrl);
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
          markdown_path: filePath
        }]);
        const state = repositories.getArticleState(articleId);
        if (state && state.is_favorite) {
          void downloadResources(store.fetchQueue, filePath, articleId).catch((error) => {
            console.error(`[openbook-rss] resource download failed for ${articleId}:`, error.message);
          });
        }
        repositories.logActivity(
          ACTIVITY_TYPES.MATERIALIZE,
          articleId,
          JSON.stringify({ url: normalizedUrl, markdownPath: filePath, title: request.title ?? null })
        );
        return { ok: true, articleId, markdownPath: filePath };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    })();
    this.materializeInFlight.set(normalizedUrl, run);
    try {
      return await run;
    } finally {
      this.materializeInFlight.delete(normalizedUrl);
    }
  }
  /** Toggle read/favorite state, serialized per article. */
  async updateArticleState(request) {
    const articleId = request.articleId;
    const previous = this.stateUpdateInFlight.get(articleId) ?? Promise.resolve();
    const run = previous.then(async () => {
      const store = this.store;
      const repositories = store.repositories;
      const existing = repositories.getArticleState(articleId) ?? { is_read: 0, is_favorite: 0 };
      const nextRead = typeof request.isRead === "boolean" ? request.isRead ? 1 : 0 : existing.is_read;
      const nextFav = typeof request.isFavorite === "boolean" ? request.isFavorite ? 1 : 0 : existing.is_favorite;
      if (nextRead === existing.is_read && nextFav === existing.is_favorite) {
        return {
          ok: true,
          articleId,
          isRead: !!nextRead,
          isFavorite: !!nextFav,
          skipped: true,
          reason: "state_unchanged"
        };
      }
      repositories.setArticleState(articleId, nextRead, nextFav);
      if (nextFav && !existing.is_favorite) {
        const article = repositories.getArticleById(articleId);
        if (article?.markdown_path) {
          void downloadResources(store.fetchQueue, article.markdown_path, articleId).catch((error) => {
            console.error(`[openbook-rss] resource download failed for ${articleId}:`, error.message);
          });
        }
      }
      repositories.logActivity(
        ACTIVITY_TYPES.STATE,
        articleId,
        JSON.stringify({ isRead: !!nextRead, isFavorite: !!nextFav })
      );
      return { ok: true, articleId, isRead: !!nextRead, isFavorite: !!nextFav };
    });
    const tail = run.catch(() => void 0);
    this.stateUpdateInFlight.set(articleId, tail);
    try {
      return await run;
    } finally {
      if (this.stateUpdateInFlight.get(articleId) === tail) {
        this.stateUpdateInFlight.delete(articleId);
      }
    }
  }
  /** Write one note markdown for an article and log activity. */
  createNote(request) {
    const store = this.store;
    const now = /* @__PURE__ */ new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const dir = join2(store.notesDir, year, month);
    mkdirSync2(dir, { recursive: true });
    const slug = safeFileName(request.title || `note-${request.articleId.slice(0, 8)}`);
    const filePath = join2(dir, `${slug}.md`);
    const yaml = [
      `article_id: ${JSON.stringify(request.articleId)}`,
      `title: ${JSON.stringify(request.title ?? "")}`,
      `created_at: ${JSON.stringify(now.toISOString())}`
    ].join("\n");
    writeFileSync3(filePath, `---
${yaml}
---

${request.content ?? ""}
`, "utf-8");
    store.repositories.insertNote(request.articleId, filePath);
    store.repositories.logActivity(
      ACTIVITY_TYPES.NOTE,
      request.articleId,
      JSON.stringify({ notePath: filePath, title: request.title ?? null, content: request.content ?? null })
    );
    return { ok: true, articleId: request.articleId, notePath: filePath };
  }
  /** Notes attached to one article. */
  listNotes(articleId) {
    const notes = this.store.repositories.listNotesByArticle(articleId).map((note) => ({
      id: note.id,
      notePath: note.note_path,
      createdAt: note.created_at
    }));
    return { articleId, notes };
  }
};

// src/services/feedService.ts
import { existsSync as existsSync3, readFileSync as readFileSync2 } from "node:fs";
import { isAbsolute, join as join3 } from "node:path";
import { Service as Service3 } from "@deepseek-ai/cordis";

// src/rss/opml.ts
import { parseStringPromise } from "xml2js";
async function loadFromOPML(reader, opmlContent) {
  const xml = await parseStringPromise(opmlContent, {
    explicitArray: false,
    mergeAttrs: true,
    trim: true
  });
  const outlinesRoot = xml?.opml?.body?.outline;
  if (!outlinesRoot) return;
  const flat = [];
  const walk = (node) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const xmlUrl = node.xmlUrl;
    const name2 = node.title || node.text || (xmlUrl ? new URL(xmlUrl).hostname : "Unnamed Feed");
    if (xmlUrl) flat.push({ xmlUrl, name: name2 });
    if (node.outline) walk(node.outline);
  };
  walk(outlinesRoot);
  for (const item of flat) {
    try {
      await reader.addFeed(item.xmlUrl, item.name);
    } catch {
    }
  }
}

// src/rss/reader.ts
import Parser from "rss-parser";
var DEFAULT_STATS = {
  feeds_seen: 0,
  network_fetch: 0,
  cache_fallback: 0,
  head_not_modified: 0,
  conditional_not_modified: 0,
  min_interval_skip: 0,
  memory_cache_hit: 0,
  parse_error: 0
};
var MEMORY_CACHE_EXPIRY_MS = 5 * 60 * 1e3;
var BATCH_SIZE = 10;
var RssReader = class {
  constructor(repositories, fetchQueue, config) {
    this.repositories = repositories;
    this.fetchQueue = fetchQueue;
    this.config = config;
    this.parser = new Parser({
      timeout: 1e4,
      headers: { "User-Agent": config.userAgent || USER_AGENT }
    });
  }
  feeds = [];
  cache = /* @__PURE__ */ new Map();
  feedInFlight = /* @__PURE__ */ new Map();
  lastFetchStats = null;
  parser;
  /** Load the in-memory feed mirror from the feeds table. */
  loadFeeds() {
    this.feeds = this.repositories.listFeeds().map((row) => ({
      url: row.url,
      name: row.name ?? row.url
    }));
  }
  getLastFetchStats() {
    return this.lastFetchStats;
  }
  async addFeed(url, name2) {
    const normalizedUrl = new URL(url).toString();
    if (this.feeds.some((feed) => feed.url === normalizedUrl)) return false;
    this.repositories.upsertFeed(normalizedUrl, (name2 ?? "").trim());
    this.feeds.push({ url: normalizedUrl, name: (name2 || normalizedUrl).trim() });
    return true;
  }
  buildFeedHeaders(cached) {
    const headers = {
      "User-Agent": this.config.userAgent || USER_AGENT
    };
    if (cached?.etag) headers["If-None-Match"] = cached.etag;
    if (cached?.last_modified) headers["If-Modified-Since"] = cached.last_modified;
    return headers;
  }
  getHeaderMeta(res) {
    return {
      status: res.status,
      content_type: res.headers.get("content-type"),
      etag: res.headers.get("etag"),
      last_modified: res.headers.get("last-modified")
    };
  }
  isUnchangedByValidators(cached, meta) {
    if (meta.etag && cached?.etag) return meta.etag.trim() === cached.etag.trim();
    if (meta.last_modified && cached?.last_modified) return meta.last_modified.trim() === cached.last_modified.trim();
    return false;
  }
  async checkFeedFreshnessWithHead(url, cached) {
    if (!this.config.feedHeadCheck || !cached) {
      return { checked: false, unchanged: false, reason: "head_disabled" };
    }
    try {
      const res = await queuedFetch(this.fetchQueue, url, {
        method: "HEAD",
        headers: this.buildFeedHeaders(cached),
        timeoutMs: this.config.feedHeadTimeoutMs,
        retries: 0
      });
      const meta = this.getHeaderMeta(res);
      if (this.isUnchangedByValidators(cached, meta)) {
        this.repositories.updateCacheMeta(url, { kind: "rss", status: meta.status, content_type: meta.content_type, etag: meta.etag, last_modified: meta.last_modified });
        return { checked: true, unchanged: true, reason: "head_not_modified", status: res.status, meta };
      }
      if (meta.etag || meta.last_modified) {
        return { checked: true, unchanged: false, reason: "head_modified", status: res.status, meta };
      }
      return { checked: true, unchanged: false, reason: "head_no_validators", status: res.status, meta };
    } catch (error) {
      const status = error.status;
      if (status === 304) {
        return {
          checked: true,
          unchanged: true,
          reason: "head_not_modified",
          status: 304,
          meta: { status: 304, content_type: null, etag: cached.etag ?? null, last_modified: cached.last_modified ?? null }
        };
      }
      return {
        checked: false,
        unchanged: false,
        reason: status !== void 0 ? `head_fallback:${status}` : "head_fallback",
        error: error.message
      };
    }
  }
  async fetchWithCache(url, kind) {
    const normalizedUrl = new URL(url).toString();
    const cached = this.repositories.getCache(normalizedUrl);
    const headFreshness = await this.checkFeedFreshnessWithHead(normalizedUrl, cached ?? null);
    if (headFreshness.unchanged && cached?.body) {
      return {
        status: headFreshness.status ?? cached.status ?? 304,
        body: cached.body,
        fromCache: true,
        reason: "head_not_modified"
      };
    }
    const headers = this.buildFeedHeaders(cached ?? null);
    try {
      const res = await queuedFetch(this.fetchQueue, normalizedUrl, { headers });
      const body = new Uint8Array(await res.arrayBuffer());
      this.repositories.upsertCache({
        url: normalizedUrl,
        kind,
        status: res.status,
        content_type: res.headers.get("content-type"),
        etag: res.headers.get("etag"),
        last_modified: res.headers.get("last-modified"),
        body
      });
      return { status: res.status, body, fromCache: false, reason: "network_fetch" };
    } catch (error) {
      const status = error.status;
      if (status === 304 && cached?.body) {
        return { status: 304, body: cached.body, fromCache: true, reason: "conditional_not_modified" };
      }
      if (cached?.body) {
        return {
          status: cached.status ?? 200,
          body: cached.body,
          fromCache: true,
          reason: "cache_fallback",
          error: error.message
        };
      }
      throw error;
    }
  }
  /**
   * Parse one feed, applying the cache layers. Returns null on parse errors.
   */
  async parseFeed(url, options = {}) {
    const normalizedUrl = new URL(url).toString();
    const stats = options.stats;
    const inFlight = this.feedInFlight.get(normalizedUrl);
    if (inFlight) return inFlight;
    const run = (async () => {
      try {
        const cachedMem = this.cache.get(normalizedUrl);
        if (!options.force && cachedMem && Date.now() - cachedMem.timestamp < MEMORY_CACHE_EXPIRY_MS) {
          if (stats) stats.memory_cache_hit = (stats.memory_cache_hit ?? 0) + 1;
          return cachedMem.data;
        }
        const syncState = this.repositories.getSyncState(normalizedUrl);
        if (!options.force && syncState?.last_checked_at) {
          const ageMs = Date.now() - (/* @__PURE__ */ new Date(`${syncState.last_checked_at}Z`)).getTime();
          const cachedBody = this.repositories.getCache(normalizedUrl)?.body;
          if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < this.config.feedMinSyncIntervalMs && cachedBody) {
            const parsed2 = await this.parseXml(Buffer.from(cachedBody).toString("utf-8"), normalizedUrl);
            this.cache.set(normalizedUrl, { data: parsed2, timestamp: Date.now() });
            this.repositories.logFeedSync(normalizedUrl, { status: syncState.last_status ?? 200, fromCache: true, reason: "min_interval_skip" });
            if (stats) stats.min_interval_skip = (stats.min_interval_skip ?? 0) + 1;
            return parsed2;
          }
        }
        const { body, status, fromCache, reason } = await this.fetchWithCache(normalizedUrl, "rss");
        const parsed = await this.parseXml(Buffer.from(body).toString("utf-8"), normalizedUrl);
        this.cache.set(normalizedUrl, { data: parsed, timestamp: Date.now() });
        const cachedMeta = this.repositories.getCache(normalizedUrl);
        this.repositories.logFeedSync(normalizedUrl, {
          status: status ?? 200,
          fromCache,
          reason: reason ?? (fromCache ? "cache_fallback" : "network_fetch"),
          etag: cachedMeta?.etag ?? null,
          lastModified: cachedMeta?.last_modified ?? null
        });
        if (stats) {
          const statReason = reason ?? (fromCache ? "cache_fallback" : "network_fetch");
          stats[statReason] = (stats[statReason] ?? 0) + 1;
        }
        if (options.verbose) console.log(`[feed] ${reason ?? "network_fetch"} status=${status ?? 200} ${normalizedUrl}`);
        return parsed;
      } catch (error) {
        this.repositories.logFeedSync(normalizedUrl, {
          status: error.status ?? null,
          fromCache: false,
          reason: `error:${error.message}`
        });
        if (stats) stats.parse_error = (stats.parse_error ?? 0) + 1;
        if (options.verbose) console.log(`[feed] parse_error ${normalizedUrl}: ${error.message}`);
        console.error(`Error parsing ${normalizedUrl}:`, error.message);
        return null;
      }
    })();
    this.feedInFlight.set(normalizedUrl, run);
    try {
      return await run;
    } finally {
      this.feedInFlight.delete(normalizedUrl);
    }
  }
  async parseXml(xml, feedUrl) {
    const feed = await this.parser.parseString(xml);
    return {
      title: feed?.title || "Untitled Feed",
      description: feed?.description,
      link: feed?.link,
      items: (feed?.items ?? []).map((item) => ({
        title: item.title || "Untitled",
        link: item.link,
        guid: item.guid,
        pubDate: item.pubDate || item.isoDate,
        content: item["content:encoded"] || item.content,
        contentSnippet: item.contentSnippet,
        author: item.author || item.creator,
        feedUrl
      }))
    };
  }
  /**
   * Fetch every feed (batched) and return merged items sorted by pubDate.
   */
  async getAllArticles(limit, options = {}) {
    const allArticles = [];
    const stats = options.stats ?? { ...DEFAULT_STATS };
    for (let index = 0; index < this.feeds.length; index += BATCH_SIZE) {
      const batch = this.feeds.slice(index, index + BATCH_SIZE);
      const results = await Promise.all(batch.map((feed) => {
        stats.feeds_seen += 1;
        return this.parseFeed(feed.url, { ...options, stats });
      }));
      results.forEach((parsed, idx) => {
        if (!parsed) return;
        const feed = batch[idx];
        for (const item of parsed.items) {
          allArticles.push({ ...item, feedTitle: parsed.title, feedName: feed.name });
        }
      });
      if (allArticles.length >= (limit ?? 50) * 3) break;
    }
    const sorted = allArticles.sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime()).slice(0, (limit ?? 50) * 2);
    this.lastFetchStats = stats;
    return sorted;
  }
  /** Articles published within [date 00:00, date 23:59]. */
  async getArticlesByDate(date, daysWindow = 1) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + daysWindow);
    endDate.setHours(23, 59, 59, 999);
    const allArticles = await this.getAllArticles(100);
    return allArticles.filter((article) => {
      if (!article.pubDate) return false;
      const articleDate = new Date(article.pubDate);
      return articleDate >= targetDate && articleDate <= endDate;
    });
  }
};

// src/rss/ssrf.ts
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
function isPrivateIp(ip) {
  if (isIP(ip) === 4) {
    const parts = ip.split(".").map((n) => parseInt(n, 10));
    const a = parts[0];
    const b = parts[1];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
    return false;
  }
  if (isIP(ip) === 6) {
    const value = ip.toLowerCase();
    if (value === "::1") return true;
    if (value.startsWith("fe80:")) return true;
    if (value.startsWith("fc") || value.startsWith("fd")) return true;
    return false;
  }
  return true;
}
async function validateHttpUrl(url, allowPrivate) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, reason: "Only http/https URLs are allowed" };
  }
  if (allowPrivate) return { ok: true, reason: "" };
  try {
    const addrs = await lookup(parsed.hostname, { all: true });
    if (addrs.some((addr) => isPrivateIp(addr.address))) {
      return { ok: false, reason: "Blocked private network address (set allowPrivateFeeds=true to allow)" };
    }
  } catch {
    return { ok: false, reason: "DNS lookup failed" };
  }
  return { ok: true, reason: "" };
}

// src/services/feedService.ts
var FeedService = class extends Service3 {
  static inject = ["rssStore"];
  reader;
  opmlFiles;
  allowPrivateFeeds;
  constructor(ctx, config) {
    super(ctx, "rssFeed");
    const store = ctx.rssStore;
    this.allowPrivateFeeds = config.allowPrivateFeeds;
    this.opmlFiles = config.opmlFiles;
    this.reader = new RssReader(store.repositories, store.fetchQueue, {
      allowPrivateFeeds: config.allowPrivateFeeds,
      feedMinSyncIntervalMs: config.feedMinSyncIntervalMs,
      feedHeadCheck: config.feedHeadCheck,
      feedHeadTimeoutMs: config.feedHeadTimeoutMs,
      userAgent: config.userAgent
    });
    this.reader.loadFeeds();
    this.bootstrapFeeds(config);
  }
  /** Import OPML files; fall back to default feeds when none are present. */
  bootstrapFeeds(config) {
    let imported = 0;
    for (const file of this.opmlFiles) {
      const resolved = isAbsolute(file) ? file : join3(process.cwd(), file);
      if (!existsSync3(resolved)) continue;
      try {
        const content = readFileSync2(resolved, "utf-8");
        void loadFromOPML(this.reader, content).then(() => {
          this.onFeedsChanged();
        });
        imported += 1;
      } catch (error) {
        console.warn(`[openbook-rss] failed to import OPML ${file}:`, error.message);
      }
    }
    if (imported === 0 && this.reader.feeds.length === 0) {
      for (const feed of config.defaultFeeds.length > 0 ? config.defaultFeeds : DEFAULT_FEEDS) {
        void this.addFeed(feed.url, feed.name);
      }
    }
  }
  onFeedsChanged() {
    this.reader.loadFeeds();
  }
  /** List feeds with their latest sync metadata. */
  listFeeds() {
    return this.reader.feeds.map((feed) => {
      const state = this.readerSyncState(feed.url);
      return {
        ...feed,
        lastCheckedAt: state?.last_checked_at ?? null,
        lastStatus: state?.last_status ?? null
      };
    });
  }
  readerSyncState(feedUrl) {
    const store = this.getStore();
    return store.repositories.getSyncState(feedUrl) ?? null;
  }
  getStore() {
    return this.ctx.rssStore;
  }
  /** Add one feed after SSRF validation; returns false when already present. */
  async addFeed(url, name2) {
    const validated = await validateHttpUrl(url, this.allowPrivateFeeds);
    if (!validated.ok) return { ok: false, reason: `Feed URL rejected: ${validated.reason}` };
    await this.reader.addFeed(url, name2);
    return { ok: true };
  }
  /** Reload the feed mirror from the database (used after OPML import). */
  reload() {
    this.reader.loadFeeds();
  }
  feedCount() {
    return this.reader.feeds.length;
  }
};

// src/services/rssApi.ts
import { existsSync as existsSync4, readFileSync as readFileSync3 } from "node:fs";
import { TypertRemoteService, Remote } from "@deepseek-ai/dsh-typert-protocol";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
var _discussArticle_dec, _setReading_dec, _orphanArticles_dec, _warmSync_dec, _syncStatus_dec, _exportReview_dec, _activity_dec, _listNotes_dec, _createNote_dec, _updateState_dec, _materialize_dec, _getArticle_dec, _searchArticles_dec, _listArticlesByFeed_dec, _listArticlesByDate_dec, _listArticles_dec, _addFeed_dec, _listFeeds_dec, _a, _init;
var RssApi = class extends (_a = TypertRemoteService, _listFeeds_dec = [Remote], _addFeed_dec = [Remote], _listArticles_dec = [Remote], _listArticlesByDate_dec = [Remote], _listArticlesByFeed_dec = [Remote], _searchArticles_dec = [Remote], _getArticle_dec = [Remote], _materialize_dec = [Remote], _updateState_dec = [Remote], _createNote_dec = [Remote], _listNotes_dec = [Remote], _activity_dec = [Remote], _exportReview_dec = [Remote], _syncStatus_dec = [Remote], _warmSync_dec = [Remote], _orphanArticles_dec = [Remote], _setReading_dec = [Remote], _discussArticle_dec = [Remote], _a) {
  constructor(ctx) {
    super(ctx, "rssApi");
    __runInitializers(_init, 5, this);
  }
  get store() {
    return this.ctx.rssStore;
  }
  get feeds() {
    return this.ctx.rssFeed;
  }
  get articles() {
    return this.ctx.rssArticle;
  }
  get activities() {
    return this.ctx.rssActivity;
  }
  get sync() {
    return this.ctx.rssSync;
  }
  /**
   * Resolve the session's agent through the global service store. `ctx.get()`
   * bypasses the inject-sensitive ctx property proxy — the `agents` registry is
   * a framework service this remote surface did not declare, and `@Remote`
   * invocations run outside any fiber that declared it.
   */
  resolveAgent(sessionId) {
    const agents = this.ctx.get("agents");
    if (agents === void 0) return void 0;
    return agents.get(sessionId);
  }
  listFeeds() {
    return this.feeds.listFeeds();
  }
  async addFeed(url, name2) {
    return this.feeds.addFeed(url, name2);
  }
  listArticles(limit) {
    return this.articles.listArticlesRecent(limit ?? 50);
  }
  listArticlesByDate(date) {
    return this.articles.listArticlesByDate(date);
  }
  listArticlesByFeed(feedUrl, limit) {
    return this.articles.listArticlesByFeed(feedUrl, limit ?? 200);
  }
  searchArticles(query, limit) {
    return this.articles.searchArticles(query, limit ?? 50);
  }
  getArticle(articleId) {
    return this.articles.getArticle(articleId);
  }
  async materialize(request) {
    return this.articles.materializeArticle(request);
  }
  async updateState(request) {
    return this.articles.updateArticleState(request);
  }
  createNote(request) {
    return this.articles.createNote(request);
  }
  listNotes(articleId) {
    return this.articles.listNotes(articleId);
  }
  activity(limit, offset) {
    return this.activities.listActivity({ limit, offset });
  }
  exportReview(days) {
    return this.activities.exportMarkdown(days ?? 7);
  }
  syncStatus() {
    return this.sync.getSyncStatus();
  }
  async warmSync(limit, timeoutMs, reason, sessionId) {
    const session = sessionId ? this.ctx.sessions.get(sessionId) ?? null : null;
    return this.sync.warmSync({
      limit: limit ?? 50,
      timeoutMs: timeoutMs ?? 0,
      reason: reason ?? "manual",
      session
    });
  }
  orphanArticles() {
    return this.articles.findOrphanArticles();
  }
  setReading(request) {
    const agent = this.resolveAgent(request.sessionId);
    if (agent === void 0) return { ok: false, reason: "session not found" };
    const article = this.articles.getArticle(request.articleId);
    if (article === null) return { ok: false, reason: "article not found" };
    const text = [
      `[OpenBook] Currently reading: "${article.title ?? "Untitled"}"`,
      `Source: ${article.feedName}${article.pubDate ? ` \xB7 ${article.pubDate}` : ""}`,
      article.link ? `Link: ${article.link}` : ""
    ].filter(Boolean).join("\n");
    agent.inject(createUserMessage({
      content: [{ type: "text", text }],
      source: { kind: "plugin", plugin: "openbook-rss" }
    }));
    return { ok: true };
  }
  discussArticle(request) {
    const agent = this.resolveAgent(request.sessionId);
    if (agent === void 0) return { ok: false, reason: "session not found" };
    const article = this.articles.getArticle(request.articleId);
    if (article === null) return { ok: false, reason: "article not found" };
    const body = readArticleContent(article, 8e3);
    const lines = [
      `[OpenBook] Discussing an article from the RSS reader.`,
      `Title: ${article.title ?? "Untitled"}`,
      `Source: ${article.feedName}${article.pubDate ? ` \xB7 ${article.pubDate}` : ""}`,
      article.link ? `Link: ${article.link}` : ""
    ];
    if (request.highlight && request.highlight.trim() !== "") {
      lines.push("", `Highlighted passage the user selected:`, `> ${request.highlight.trim()}`);
    }
    if (request.prompt && request.prompt.trim() !== "") {
      lines.push("", `The user asks: ${request.prompt.trim()}`);
    }
    lines.push("", `Article content:`, body);
    agent.followup(createUserMessage({
      content: [{ type: "text", text: lines.filter((l) => l !== void 0).join("\n") }],
      source: { kind: "plugin", plugin: "openbook-rss" }
    }));
    return { ok: true };
  }
};
_init = __decoratorStart(_a);
__decorateElement(_init, 1, "listFeeds", _listFeeds_dec, RssApi);
__decorateElement(_init, 1, "addFeed", _addFeed_dec, RssApi);
__decorateElement(_init, 1, "listArticles", _listArticles_dec, RssApi);
__decorateElement(_init, 1, "listArticlesByDate", _listArticlesByDate_dec, RssApi);
__decorateElement(_init, 1, "listArticlesByFeed", _listArticlesByFeed_dec, RssApi);
__decorateElement(_init, 1, "searchArticles", _searchArticles_dec, RssApi);
__decorateElement(_init, 1, "getArticle", _getArticle_dec, RssApi);
__decorateElement(_init, 1, "materialize", _materialize_dec, RssApi);
__decorateElement(_init, 1, "updateState", _updateState_dec, RssApi);
__decorateElement(_init, 1, "createNote", _createNote_dec, RssApi);
__decorateElement(_init, 1, "listNotes", _listNotes_dec, RssApi);
__decorateElement(_init, 1, "activity", _activity_dec, RssApi);
__decorateElement(_init, 1, "exportReview", _exportReview_dec, RssApi);
__decorateElement(_init, 1, "syncStatus", _syncStatus_dec, RssApi);
__decorateElement(_init, 1, "warmSync", _warmSync_dec, RssApi);
__decorateElement(_init, 1, "orphanArticles", _orphanArticles_dec, RssApi);
__decorateElement(_init, 1, "setReading", _setReading_dec, RssApi);
__decorateElement(_init, 1, "discussArticle", _discussArticle_dec, RssApi);
__decoratorMetadata(_init, RssApi);
__publicField(RssApi, "inject", ["rssStore", "rssFeed", "rssArticle", "rssActivity", "rssSync", "agents"]);
function readArticleContent(article, maxChars) {
  let text = "";
  if (article.markdownPath && existsSync4(article.markdownPath)) {
    try {
      text = readFileSync3(article.markdownPath, "utf-8").replace(/^---\n[\s\S]*?\n---\n*/, "");
    } catch {
      text = "";
    }
  }
  if (text.trim() === "" && article.content) {
    text = article.content.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  }
  if (text.trim() === "" && article.contentSnippet) {
    text = article.contentSnippet;
  }
  text = text.replace(/\s{3,}/g, "\n\n").trim();
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars)}

[content truncated]`;
  }
  return text === "" ? "(no readable content available)" : text;
}

// src/services/rssStore.ts
import { mkdirSync as mkdirSync4, readFileSync as readFileSync4, writeFileSync as writeFileSync4 } from "node:fs";
import { join as join4 } from "node:path";
import { Service as Service4 } from "@deepseek-ai/cordis";

// src/db/database.ts
import { mkdirSync as mkdirSync3 } from "node:fs";
import { dirname as dirname2 } from "node:path";
import { DatabaseSync } from "node:sqlite";

// src/db/schema.ts
var MIGRATIONS = [
  // v1: initial schema
  `
  CREATE TABLE feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE fetch_cache (
    url TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    status INTEGER,
    content_type TEXT,
    etag TEXT,
    last_modified TEXT,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    body BLOB
  );
  CREATE INDEX IF NOT EXISTS idx_fetch_cache_kind_time ON fetch_cache(kind, fetched_at);

  CREATE TABLE feed_sync_state (
    feed_url TEXT PRIMARY KEY,
    last_checked_at TEXT,
    last_status INTEGER,
    etag TEXT,
    last_modified TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(feed_url) REFERENCES feeds(url) ON DELETE CASCADE
  );

  CREATE TABLE feed_sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feed_url TEXT NOT NULL,
    status INTEGER,
    from_cache INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(feed_url) REFERENCES feeds(url) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_feed_sync_log_feed_time ON feed_sync_log(feed_url, fetched_at DESC);

  CREATE TABLE articles (
    id TEXT PRIMARY KEY,
    feed_url TEXT NOT NULL,
    guid TEXT,
    link TEXT,
    title TEXT,
    author TEXT,
    published_at TEXT,
    content_html TEXT,
    content_snippet TEXT,
    markdown_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(feed_url) REFERENCES feeds(url) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_articles_feed_time ON articles(feed_url, published_at);
  CREATE INDEX IF NOT EXISTS idx_articles_link ON articles(link);

  CREATE TABLE article_state (
    article_id TEXT PRIMARY KEY,
    is_read INTEGER NOT NULL DEFAULT 0,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
  );

  CREATE TABLE article_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id TEXT NOT NULL,
    note_path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_article_notes_article ON article_notes(article_id);

  CREATE TABLE activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    article_id TEXT,
    payload_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_activity_log_time ON activity_log(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_activity_log_article ON activity_log(article_id);
  `
];
var GUARDED_UNIQUE_INDEXES = [
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_feed_guid_unique
    ON articles(feed_url, guid)
    WHERE guid IS NOT NULL AND guid != ''`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_feed_link_unguided_unique
    ON articles(feed_url, link)
    WHERE link IS NOT NULL AND link != '' AND (guid IS NULL OR guid = '')`
];
function migrate(db) {
  const table = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='_schema_version'`
  ).get();
  if (table === void 0) {
    db.exec("CREATE TABLE _schema_version (version INTEGER NOT NULL)");
    db.prepare("INSERT INTO _schema_version (version) VALUES (0)").run();
  }
  const row = db.prepare("SELECT version FROM _schema_version").get();
  let version = row.version;
  for (let index = version; index < MIGRATIONS.length; index++) {
    const sql = MIGRATIONS[index];
    if (sql === void 0) continue;
    db.exec(sql);
    version = index + 1;
  }
  if (version !== row.version) {
    db.prepare("UPDATE _schema_version SET version=?").run(version);
  }
  for (const sql of GUARDED_UNIQUE_INDEXES) {
    try {
      db.exec(sql);
    } catch (error) {
      console.warn("[openbook-rss] skipped unique index due to existing duplicates:", error.message);
    }
  }
}

// src/db/database.ts
function openRssDatabase(dbPath) {
  mkdirSync3(dirname2(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  return db;
}
function withTransaction(db, body) {
  db.exec("BEGIN");
  try {
    const result = body();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

// src/db/repositories.ts
function rows(value) {
  return value;
}
var Repositories = class {
  constructor(db) {
    this.db = db;
    this.buildStatements();
  }
  // feeds -------------------------------------------------------------------
  stmtListFeeds;
  stmtUpsertFeed;
  stmtCheckFeed;
  stmtCountFeeds;
  // fetch_cache -------------------------------------------------------------
  stmtGetCache;
  stmtUpsertCache;
  stmtUpdateCacheMeta;
  // feed_sync_state/log -----------------------------------------------------
  stmtGetSyncState;
  stmtUpsertSyncState;
  stmtInsertSyncLog;
  stmtCountArticles;
  stmtSyncSummary;
  // articles ----------------------------------------------------------------
  stmtUpsertArticle;
  stmtGetArticle;
  stmtGetArticleByLink;
  stmtListRecent;
  stmtListByDate;
  stmtListByFeed;
  stmtSearchArticles;
  // article_state -----------------------------------------------------------
  stmtSetState;
  stmtGetState;
  // article_notes -----------------------------------------------------------
  stmtInsertNote;
  stmtListNotes;
  // activity_log ------------------------------------------------------------
  stmtLogActivity;
  stmtGetActivity;
  stmtActivitySince;
  buildStatements() {
    this.stmtListFeeds = this.db.prepare("SELECT * FROM feeds ORDER BY id ASC");
    this.stmtUpsertFeed = this.db.prepare(`
      INSERT INTO feeds(url, name) VALUES (?, ?)
      ON CONFLICT(url) DO UPDATE SET name=excluded.name
    `);
    this.stmtCheckFeed = this.db.prepare("SELECT 1 AS ok FROM feeds WHERE url=?");
    this.stmtCountFeeds = this.db.prepare("SELECT COUNT(*) AS c FROM feeds");
    this.stmtGetCache = this.db.prepare(
      "SELECT url, kind, status, content_type, etag, last_modified, fetched_at, body FROM fetch_cache WHERE url=?"
    );
    this.stmtUpsertCache = this.db.prepare(`
      INSERT INTO fetch_cache(url, kind, status, content_type, etag, last_modified, fetched_at, body)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
      ON CONFLICT(url) DO UPDATE SET
        kind=excluded.kind,
        status=excluded.status,
        content_type=excluded.content_type,
        etag=excluded.etag,
        last_modified=excluded.last_modified,
        fetched_at=datetime('now'),
        body=excluded.body
    `);
    this.stmtUpdateCacheMeta = this.db.prepare(`
      UPDATE fetch_cache
      SET
        kind=COALESCE(?, kind),
        status=COALESCE(?, status),
        content_type=COALESCE(?, content_type),
        etag=COALESCE(?, etag),
        last_modified=COALESCE(?, last_modified),
        fetched_at=datetime('now')
      WHERE url=?
    `);
    this.stmtGetSyncState = this.db.prepare("SELECT * FROM feed_sync_state WHERE feed_url=?");
    this.stmtUpsertSyncState = this.db.prepare(`
      INSERT INTO feed_sync_state(feed_url, last_checked_at, last_status, etag, last_modified, updated_at)
      VALUES (?, datetime('now'), ?, ?, ?, datetime('now'))
      ON CONFLICT(feed_url) DO UPDATE SET
        last_checked_at=datetime('now'),
        last_status=excluded.last_status,
        etag=COALESCE(excluded.etag, feed_sync_state.etag),
        last_modified=COALESCE(excluded.last_modified, feed_sync_state.last_modified),
        updated_at=datetime('now')
    `);
    this.stmtInsertSyncLog = this.db.prepare(
      "INSERT INTO feed_sync_log(feed_url, status, from_cache, reason) VALUES (?, ?, ?, ?)"
    );
    this.stmtCountArticles = this.db.prepare("SELECT COUNT(*) AS c FROM articles");
    this.stmtSyncSummary = this.db.prepare(`
      SELECT
        COUNT(DISTINCT feed_url) AS feeds_checked,
        SUM(CASE WHEN reason='network_fetch' THEN 1 ELSE 0 END) AS network_fetch_count,
        SUM(CASE WHEN reason='cache_fallback' THEN 1 ELSE 0 END) AS cache_fallback_count,
        SUM(CASE WHEN reason='head_not_modified' THEN 1 ELSE 0 END) AS head_not_modified_count,
        SUM(CASE WHEN reason='conditional_not_modified' THEN 1 ELSE 0 END) AS conditional_not_modified_count,
        SUM(CASE WHEN reason='min_interval_skip' THEN 1 ELSE 0 END) AS min_interval_skip_count
      FROM feed_sync_log
      WHERE fetched_at >= datetime(?)
    `);
    this.stmtUpsertArticle = this.db.prepare(`
      INSERT INTO articles(id, feed_url, guid, link, title, author, published_at, content_html, content_snippet, markdown_path, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        author=excluded.author,
        published_at=excluded.published_at,
        content_html=excluded.content_html,
        content_snippet=excluded.content_snippet,
        markdown_path=COALESCE(excluded.markdown_path, articles.markdown_path),
        updated_at=datetime('now')
    `);
    this.stmtGetArticle = this.db.prepare("SELECT * FROM articles WHERE id=?");
    this.stmtGetArticleByLink = this.db.prepare(`
      SELECT * FROM articles
      WHERE link=?
      ORDER BY (markdown_path IS NOT NULL) DESC, updated_at DESC
      LIMIT 1
    `);
    this.stmtListRecent = this.db.prepare(`
      SELECT ar.*, st.is_read, st.is_favorite
      FROM articles ar
      LEFT JOIN article_state st ON st.article_id = ar.id
      ORDER BY datetime(ar.published_at) DESC, datetime(ar.updated_at) DESC
      LIMIT ?
    `);
    this.stmtListByDate = this.db.prepare(`
      SELECT ar.*, st.is_read, st.is_favorite
      FROM articles ar
      LEFT JOIN article_state st ON st.article_id = ar.id
      WHERE datetime(ar.published_at) >= datetime(?)
        AND datetime(ar.published_at) <= datetime(?)
      ORDER BY datetime(ar.published_at) DESC, datetime(ar.updated_at) DESC
      LIMIT ?
    `);
    this.stmtListByFeed = this.db.prepare(`
      SELECT ar.*, st.is_read, st.is_favorite
      FROM articles ar
      LEFT JOIN article_state st ON st.article_id = ar.id
      WHERE ar.feed_url = ?
      ORDER BY datetime(ar.published_at) DESC, datetime(ar.updated_at) DESC
      LIMIT ?
    `);
    this.stmtSearchArticles = this.db.prepare(`
      SELECT ar.*, st.is_read, st.is_favorite
      FROM articles ar
      LEFT JOIN article_state st ON st.article_id = ar.id
      WHERE ar.title LIKE ? OR ar.content_snippet LIKE ? OR ar.link LIKE ?
      ORDER BY datetime(ar.published_at) DESC
      LIMIT ?
    `);
    this.stmtSetState = this.db.prepare(`
      INSERT INTO article_state(article_id, is_read, is_favorite, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(article_id) DO UPDATE SET
        is_read=excluded.is_read,
        is_favorite=excluded.is_favorite,
        updated_at=datetime('now')
    `);
    this.stmtGetState = this.db.prepare(
      "SELECT article_id, is_read, is_favorite, updated_at FROM article_state WHERE article_id=?"
    );
    this.stmtInsertNote = this.db.prepare(
      "INSERT INTO article_notes(article_id, note_path) VALUES (?, ?)"
    );
    this.stmtListNotes = this.db.prepare(
      "SELECT id, article_id, note_path, created_at FROM article_notes WHERE article_id=? ORDER BY id DESC"
    );
    this.stmtLogActivity = this.db.prepare(
      "INSERT INTO activity_log(type, article_id, payload_json) VALUES (?, ?, ?)"
    );
    this.stmtGetActivity = this.db.prepare(`
      SELECT a.id, a.type, a.article_id, a.payload_json, a.created_at,
             ar.title AS article_title, ar.link AS article_link, ar.feed_url AS feed_url,
             ar.markdown_path AS article_markdown_path
      FROM activity_log a
      LEFT JOIN articles ar ON ar.id = a.article_id
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `);
    this.stmtActivitySince = this.db.prepare(`
      SELECT a.id, a.type, a.article_id, a.payload_json, a.created_at,
             ar.title AS article_title, ar.link AS article_link, ar.feed_url AS feed_url
      FROM activity_log a
      LEFT JOIN articles ar ON ar.id = a.article_id
      WHERE a.created_at >= ?
      ORDER BY a.created_at DESC
      LIMIT 2000
    `);
  }
  // feeds -------------------------------------------------------------------
  listFeeds() {
    return rows(this.stmtListFeeds.all());
  }
  upsertFeed(url, name2) {
    this.stmtUpsertFeed.run(url, name2);
  }
  feedExists(url) {
    return this.stmtCheckFeed.get(url) !== void 0;
  }
  ensureFeedExists(url, name2) {
    if (!this.feedExists(url)) this.stmtUpsertFeed.run(url, name2);
  }
  countFeeds() {
    return this.stmtCountFeeds.get().c;
  }
  // fetch_cache -------------------------------------------------------------
  getCache(url) {
    return this.stmtGetCache.get(url);
  }
  upsertCache(row) {
    this.stmtUpsertCache.run(
      row.url,
      row.kind,
      row.status,
      row.content_type,
      row.etag,
      row.last_modified,
      row.body
    );
  }
  updateCacheMeta(url, meta) {
    this.stmtUpdateCacheMeta.run(
      meta.kind,
      meta.status,
      meta.content_type,
      meta.etag,
      meta.last_modified,
      url
    );
  }
  // feed_sync_state/log -----------------------------------------------------
  getSyncState(feedUrl) {
    return this.stmtGetSyncState.get(feedUrl);
  }
  logFeedSync(feedUrl, options = {}) {
    this.stmtUpsertSyncState.run(
      feedUrl,
      options.status ?? null,
      options.etag ?? null,
      options.lastModified ?? null
    );
    this.stmtInsertSyncLog.run(feedUrl, options.status ?? null, options.fromCache ? 1 : 0, options.reason ?? null);
  }
  countArticles() {
    return this.stmtCountArticles.get().c;
  }
  syncSummarySince(startedAtIso) {
    const row = this.stmtSyncSummary.get(startedAtIso);
    return {
      feeds_checked: row.feeds_checked ?? 0,
      network_fetch_count: row.network_fetch_count ?? 0,
      cache_fallback_count: row.cache_fallback_count ?? 0,
      head_not_modified_count: row.head_not_modified_count ?? 0,
      conditional_not_modified_count: row.conditional_not_modified_count ?? 0,
      min_interval_skip_count: row.min_interval_skip_count ?? 0
    };
  }
  // articles ----------------------------------------------------------------
  upsertArticles(articles) {
    withTransaction(this.db, () => {
      for (const a of articles) {
        this.stmtUpsertArticle.run(
          a.id,
          a.feed_url,
          a.guid,
          a.link,
          a.title,
          a.author,
          a.published_at,
          a.content_html,
          a.content_snippet,
          a.markdown_path
        );
      }
    });
  }
  getArticleById(articleId) {
    return this.stmtGetArticle.get(articleId);
  }
  getArticleByLink(link) {
    return this.stmtGetArticleByLink.get(link);
  }
  listArticlesRecent(limit) {
    return rows(this.stmtListRecent.all(limit));
  }
  listArticlesByDate(fromIso, toIso, limit = 500) {
    return rows(this.stmtListByDate.all(fromIso, toIso, limit));
  }
  listArticlesByFeed(feedUrl, limit = 200) {
    return rows(this.stmtListByFeed.all(feedUrl, limit));
  }
  searchArticles(query, limit = 50) {
    const pattern = `%${query}%`;
    return rows(this.stmtSearchArticles.all(pattern, pattern, pattern, limit));
  }
  // article_state -----------------------------------------------------------
  setArticleState(articleId, isRead, isFavorite) {
    this.stmtSetState.run(articleId, isRead, isFavorite);
  }
  getArticleState(articleId) {
    return this.stmtGetState.get(articleId);
  }
  // article_notes -----------------------------------------------------------
  insertNote(articleId, notePath) {
    this.stmtInsertNote.run(articleId, notePath);
  }
  listNotesByArticle(articleId) {
    return rows(this.stmtListNotes.all(articleId));
  }
  // activity_log ------------------------------------------------------------
  logActivity(type, articleId, payloadJson) {
    this.stmtLogActivity.run(type, articleId, payloadJson);
  }
  listActivity(limit, offset) {
    return rows(this.stmtGetActivity.all(limit, offset));
  }
  listActivitySince(isoDate) {
    return rows(this.stmtActivitySince.all(isoDate));
  }
};

// src/services/rssStore.ts
function layoutFor(dataDir) {
  return {
    dataDir,
    dbPath: join4(dataDir, "openbook.db"),
    jsonIndexPath: join4(dataDir, "index.json"),
    articlesDir: join4(dataDir, "articles"),
    notesDir: join4(dataDir, "notes")
  };
}
var RssStore = class extends Service4 {
  db;
  repositories;
  fetchQueue;
  dataDir;
  dbPath;
  jsonIndexPath;
  articlesDir;
  notesDir;
  constructor(ctx, config) {
    super(ctx, "rssStore");
    const layout = layoutFor(config.dataDir);
    this.dataDir = layout.dataDir;
    this.dbPath = layout.dbPath;
    this.jsonIndexPath = layout.jsonIndexPath;
    this.articlesDir = layout.articlesDir;
    this.notesDir = layout.notesDir;
    mkdirSync4(this.articlesDir, { recursive: true });
    mkdirSync4(this.notesDir, { recursive: true });
    this.db = openRssDatabase(this.dbPath);
    this.repositories = new Repositories(this.db);
    this.fetchQueue = new FetchQueue({
      concurrency: config.fetchConcurrency,
      intervalCap: config.fetchIntervalCap,
      intervalMs: config.fetchIntervalMs
    });
  }
  /** Read the JSON grep index, tolerating a missing or corrupt file. */
  readJsonIndex() {
    try {
      const raw = readFileSync4(this.jsonIndexPath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return { version: JSON_INDEX_VERSION, generated_at: null, feeds: [], articles: [] };
    }
  }
  /** Write the JSON grep index. */
  writeJsonIndex(index) {
    const out = {
      ...index,
      version: JSON_INDEX_VERSION,
      generated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeFileSync4(this.jsonIndexPath, JSON.stringify(out, null, 2), "utf-8");
  }
};

// src/services/syncService.ts
import { randomUUID } from "node:crypto";
import { Service as Service5 } from "@deepseek-ai/cordis";
function emptySyncState() {
  return {
    status: "idle",
    reason: null,
    startedAt: null,
    finishedAt: null,
    lastCount: 0,
    lastError: null,
    lastSummary: null,
    inFlight: null
  };
}
var SyncService = class extends Service5 {
  static inject = ["rssStore", "rssFeed", "rssArticle"];
  state = emptySyncState();
  constructor(ctx) {
    super(ctx, "rssSync");
  }
  get store() {
    return this.ctx.rssStore;
  }
  get feeds() {
    return this.ctx.rssFeed;
  }
  get articles() {
    return this.ctx.rssArticle;
  }
  /** Live status snapshot (serializable; safe for Remote calls). */
  getSyncStatus() {
    const state = this.state;
    return {
      status: state.status,
      reason: state.reason,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
      lastCount: state.lastCount,
      lastError: state.lastError,
      lastSummary: state.lastSummary,
      inFlight: state.inFlight !== null
    };
  }
  /**
   * Fetch feeds, persist new articles, and summarize. Re-entrant: a second
   * call while one run is in flight returns the in-flight run.
   */
  async warmSync(options = {}) {
    if (this.state.inFlight) return this.state.inFlight;
    const reason = options.reason ?? "manual";
    const limit = options.limit ?? 50;
    const timeoutMs = options.timeoutMs ?? 0;
    const session = options.session ?? null;
    const syncId = randomUUID();
    this.state.status = "running";
    this.state.reason = reason;
    this.state.startedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.state.finishedAt = null;
    this.state.lastError = null;
    session?.append("openbook-rss/sync-start", {
      syncId,
      reason,
      startedAt: this.state.startedAt,
      feedCount: this.feeds.reader.feeds.length
    });
    const countArticles = () => this.store.repositories.countArticles();
    const summarize = (beforeCount, afterCount) => {
      const counts = this.store.repositories.syncSummarySince(this.state.startedAt ?? "");
      return {
        ...counts,
        new_articles_count: Math.max(0, afterCount - beforeCount)
      };
    };
    const run = (async () => {
      const beforeCount = countArticles();
      try {
        const loadAndPersist = async () => {
          const articles = await this.feeds.reader.getAllArticles(limit, {
            verbose: options.verbose,
            force: options.force
          });
          await this.articles.processArticles(articles);
          for (const article of articles) {
            session?.append("openbook-rss/sync-progress", {
              syncId,
              feedUrl: article.feedUrl,
              feedTitle: article.feedTitle,
              status: 200,
              fromCache: false,
              reason: "persisted"
            });
          }
          return articles.length;
        };
        const count = timeoutMs > 0 ? await runWithTimeout(loadAndPersist, timeoutMs) : await loadAndPersist();
        const afterCount = countArticles();
        const summary = summarize(beforeCount, afterCount);
        const fetchStats = this.feeds.reader.getLastFetchStats();
        this.state.status = "success";
        this.state.lastCount = count;
        this.state.lastSummary = summary;
        session?.append("openbook-rss/sync-end", { syncId, status: "success", count, summary });
        return {
          ok: true,
          status: "success",
          reason,
          count,
          startedAt: this.state.startedAt ?? "",
          summary,
          fetchStats
        };
      } catch (error) {
        const timedOut = error.message === "openbook_rss_sync_timeout";
        this.state.status = timedOut ? "timeout" : "error";
        this.state.lastError = error.message;
        this.state.lastSummary = null;
        session?.append("openbook-rss/sync-end", {
          syncId,
          status: timedOut ? "timeout" : "error",
          count: 0,
          summary: summarize(beforeCount, countArticles()),
          error: this.state.lastError
        });
        return {
          ok: false,
          status: this.state.status,
          reason,
          count: 0,
          startedAt: this.state.startedAt ?? "",
          error: this.state.lastError
        };
      } finally {
        this.state.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
        this.state.inFlight = null;
      }
    })();
    this.state.inFlight = run;
    return run;
  }
};
async function runWithTimeout(task, timeoutMs) {
  const timer = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("openbook_rss_sync_timeout")), timeoutMs);
  });
  return Promise.race([task(), timer]);
}

// src/typert-contribution.ts
import { z } from "zod";
var feedInfoSchema = z.object({
  url: z.string(),
  name: z.string(),
  lastCheckedAt: z.string().nullable(),
  lastStatus: z.number().nullable()
});
var articleSchema = z.object({
  id: z.string(),
  feedUrl: z.string(),
  feedName: z.string(),
  title: z.string().nullable(),
  link: z.string().nullable(),
  guid: z.string().nullable(),
  pubDate: z.string().nullable(),
  author: z.string().nullable(),
  content: z.string().nullable(),
  contentSnippet: z.string().nullable(),
  markdownPath: z.string().nullable(),
  isRead: z.boolean(),
  isFavorite: z.boolean()
});
var summarySchema = z.object({
  feeds_checked: z.number(),
  network_fetch_count: z.number(),
  cache_fallback_count: z.number(),
  head_not_modified_count: z.number(),
  conditional_not_modified_count: z.number(),
  min_interval_skip_count: z.number(),
  new_articles_count: z.number()
});
var syncStatusSchema = z.object({
  status: z.enum(["idle", "running", "success", "timeout", "error"]),
  reason: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  lastCount: z.number(),
  lastError: z.string().nullable(),
  lastSummary: summarySchema.nullable(),
  inFlight: z.boolean()
});
var syncResultSchema = z.object({
  ok: z.boolean(),
  status: z.string(),
  reason: z.string(),
  count: z.number(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  summary: summarySchema.optional(),
  error: z.string().optional(),
  fetchStats: z.record(z.string(), z.number()).nullable().optional()
});
var materializeResultSchema = z.object({
  ok: z.boolean(),
  articleId: z.string().optional(),
  markdownPath: z.string().optional(),
  skipped: z.boolean().optional(),
  reason: z.string().optional(),
  error: z.string().optional()
});
var stateUpdateResultSchema = z.object({
  ok: z.boolean(),
  articleId: z.string(),
  isRead: z.boolean(),
  isFavorite: z.boolean(),
  skipped: z.boolean().optional(),
  reason: z.string().optional()
});
var noteListSchema = z.object({
  articleId: z.string(),
  notes: z.array(z.object({
    id: z.number(),
    notePath: z.string(),
    createdAt: z.string()
  }))
});
var activityItemSchema = z.object({
  id: z.number(),
  type: z.string(),
  articleId: z.string().nullable(),
  createdAt: z.string(),
  payload: z.record(z.string(), z.unknown()),
  article: z.object({
    id: z.string(),
    title: z.string().nullable(),
    link: z.string().nullable(),
    feedUrl: z.string().nullable(),
    markdownPath: z.string().nullable()
  }).nullable()
});
var activityPageSchema = z.object({
  limit: z.number(),
  offset: z.number(),
  items: z.array(activityItemSchema)
});
var addFeedResultSchema = z.object({
  ok: z.boolean(),
  reason: z.string().optional()
});
var noteCreateResultSchema = z.object({
  ok: z.boolean(),
  articleId: z.string(),
  notePath: z.string()
});
var materializeRequestSchema = z.object({
  url: z.string(),
  feedUrl: z.string().optional(),
  title: z.string().optional(),
  publishedAt: z.string().optional()
});
var stateUpdateRequestSchema = z.object({
  articleId: z.string(),
  isRead: z.boolean().optional(),
  isFavorite: z.boolean().optional()
});
var noteCreateRequestSchema = z.object({
  articleId: z.string(),
  title: z.string().optional(),
  content: z.string().optional()
});
var ackResultSchema = z.object({
  ok: z.boolean(),
  reason: z.string().optional()
});
var setReadingRequestSchema = z.object({
  sessionId: z.string(),
  articleId: z.string()
});
var discussRequestSchema = z.object({
  sessionId: z.string(),
  articleId: z.string(),
  prompt: z.string().optional(),
  highlight: z.string().optional()
});
var json = (name2, schema) => ({
  name: name2,
  wire: name2,
  source: "json",
  codec: { mode: "strict", typeSymbol: `@openbook/dsh-rss-reader#${name2}`, schema }
});
var resultOf = (method, schema) => ({
  mode: "strict",
  typeSymbol: `@openbook/dsh-rss-reader#${method}:result`,
  schema
});
var descriptor = (method, parameters, resultSchema) => ({
  id: `@openbook/dsh-rss-reader#rssApi/${method}`,
  service: "rssApi",
  namespace: "rssApi",
  method,
  invocation: { kind: "direct" },
  parameters,
  result: resultOf(method, resultSchema),
  sourceLocation: { file: "src/services/rssApi.ts", line: 0, column: 0 }
});
var RSS_API_CONTRIBUTION = {
  package: "@openbook/dsh-rss-reader",
  descriptors: [
    descriptor("listFeeds", [], z.array(feedInfoSchema)),
    descriptor("addFeed", [json("url", z.string()), json("name", z.string().optional())], addFeedResultSchema),
    descriptor("listArticles", [json("limit", z.number().optional())], z.array(articleSchema)),
    descriptor("listArticlesByDate", [json("date", z.string())], z.array(articleSchema)),
    descriptor("listArticlesByFeed", [json("feedUrl", z.string()), json("limit", z.number().optional())], z.array(articleSchema)),
    descriptor("searchArticles", [json("query", z.string()), json("limit", z.number().optional())], z.array(articleSchema)),
    descriptor("getArticle", [json("articleId", z.string())], articleSchema.nullable()),
    descriptor("materialize", [json("request", materializeRequestSchema)], materializeResultSchema),
    descriptor("updateState", [json("request", stateUpdateRequestSchema)], stateUpdateResultSchema),
    descriptor("createNote", [json("request", noteCreateRequestSchema)], noteCreateResultSchema),
    descriptor("listNotes", [json("articleId", z.string())], noteListSchema),
    descriptor("activity", [json("limit", z.number().optional()), json("offset", z.number().optional())], activityPageSchema),
    descriptor("exportReview", [json("days", z.number().optional())], z.string()),
    descriptor("syncStatus", [], syncStatusSchema),
    descriptor("warmSync", [json("limit", z.number().optional()), json("timeoutMs", z.number().optional()), json("reason", z.string().optional()), json("sessionId", z.string().optional())], syncResultSchema),
    descriptor("orphanArticles", [], z.array(articleSchema)),
    descriptor("setReading", [json("request", setReadingRequestSchema)], ackResultSchema),
    descriptor("discussArticle", [json("request", discussRequestSchema)], ackResultSchema)
  ]
};

// src/index.ts
var name = PLUGIN_NAME;
var inject = ["commands", "tools", "typert"];
function apply(ctx, config) {
  ctx.typert.remotes.register(RSS_API_CONTRIBUTION);
  new RssStore(ctx, config);
  new FeedService(ctx, config);
  new ArticleService(ctx, config);
  new ActivityService(ctx);
  new SyncService(ctx);
  new RssApi(ctx);
  registerRssTools(ctx);
  registerBookTools(ctx);
  registerCommands(ctx);
  if (config.startupSync) {
    setImmediate(() => {
      void ctx.rssSync.warmSync({
        limit: config.startupSyncLimit,
        reason: "startup"
      }).catch((error) => {
        console.error("[openbook-rss] startup sync failed:", error.message);
      });
    });
  }
}
export {
  Config,
  apply,
  inject,
  name
};
