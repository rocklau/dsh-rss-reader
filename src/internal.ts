/**
 * Internal API surface for tests and diagnostics. Not part of the plugin
 * contract; the package main entry stays name/inject/Config/apply only.
 */
export { stableId, safeFileName, parseSourceUrlFromFrontmatter } from './utils.ts'
export { isPrivateIp, validateHttpUrl } from './rss/ssrf.ts'
export { FetchQueue, queuedFetch, FetchError } from './rss/httpClient.ts'
export { RssReader } from './rss/reader.ts'
export type { ParsedFeed, RssItem, FetchStats, FeedHandle } from './rss/reader.ts'
export { loadFromOPML } from './rss/opml.ts'
export { htmlToMarkdown } from './markdown/htmlToMd.ts'
export { downloadResources } from './markdown/collector.ts'
export { openRssDatabase, withTransaction } from './db/database.ts'
export { migrate } from './db/schema.ts'
export { Repositories } from './db/repositories.ts'
export type { ArticleRow, ArticleUpsert, FeedRow } from './db/repositories.ts'
