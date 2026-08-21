// src/utils.ts
import { createHash } from "node:crypto";
function stableId(feedUrl, guidOrLink) {
  return createHash("sha256").update(`${feedUrl}::${guidOrLink || ""}`).digest("hex");
}
function safeFileName(name) {
  const slug = String(name).trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-._]/g, "").replace(/-+/g, "-").slice(0, 120);
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

// src/rss/reader.ts
import Parser from "rss-parser";

// src/constants.ts
var USER_AGENT = "OpenBook RSS Reader (+https://github.com/rocklau/OpenBook)";

// src/rss/reader.ts
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
  async addFeed(url, name) {
    const normalizedUrl = new URL(url).toString();
    if (this.feeds.some((feed) => feed.url === normalizedUrl)) return false;
    this.repositories.upsertFeed(normalizedUrl, (name ?? "").trim());
    this.feeds.push({ url: normalizedUrl, name: (name || normalizedUrl).trim() });
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
    const name = node.title || node.text || (xmlUrl ? new URL(xmlUrl).hostname : "Unnamed Feed");
    if (xmlUrl) flat.push({ xmlUrl, name });
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

// src/markdown/collector.ts
import { createHash as createHash2 } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, posix } from "node:path";
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
  writeFileSync(join(assetsDir, filename), Buffer.from(await res.arrayBuffer()));
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
    writeFileSync(markdownPath, updatedContent, "utf-8");
  } else {
    console.log(`[Collector] Skipped markdown rewrite for ${articleId}: no content changes`);
  }
}

// src/db/database.ts
import { mkdirSync as mkdirSync2 } from "node:fs";
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
  mkdirSync2(dirname2(dbPath), { recursive: true });
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
  upsertFeed(url, name) {
    this.stmtUpsertFeed.run(url, name);
  }
  feedExists(url) {
    return this.stmtCheckFeed.get(url) !== void 0;
  }
  ensureFeedExists(url, name) {
    if (!this.feedExists(url)) this.stmtUpsertFeed.run(url, name);
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
export {
  FetchError,
  FetchQueue,
  Repositories,
  RssReader,
  downloadResources,
  htmlToMarkdown,
  isPrivateIp,
  loadFromOPML,
  migrate,
  openRssDatabase,
  parseSourceUrlFromFrontmatter,
  queuedFetch,
  safeFileName,
  stableId,
  validateHttpUrl,
  withTransaction
};
