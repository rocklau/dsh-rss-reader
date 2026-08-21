/**
 * Host-side Typert Remote contribution for the rssApi service.
 *
 * The gateway claims an endpoint via `ctx.typert.local.get(endpoint)` before it
 * falls back to scanning `@Remote` markers (srcClaims). That fallback is cached
 * on first use, so a late-loading plugin can be missed and its endpoints 404.
 * Registering the contribution here puts every rssApi endpoint into
 * `ctx.typert.local` up front, making the claim reliable regardless of load
 * order.
 *
 * WIRE CONTRACT — keep in sync with client/remote.ts `TYPERT_REMOTE` and the
 * `@Remote` methods in src/services/rssApi.ts. The descriptors and schemas must
 * match the client's contribution exactly.
 */
import { z } from 'zod'
import type {
  InvocationDescriptor,
  InvocationParameterDescriptor,
  TypertCodec,
  TypertRemoteContribution,
  TypertSchema,
} from '@deepseek-ai/dsh-typert-protocol'

const feedInfoSchema = z.object({
  url: z.string(),
  name: z.string(),
  lastCheckedAt: z.string().nullable(),
  lastStatus: z.number().nullable(),
})

const articleSchema = z.object({
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
  isFavorite: z.boolean(),
})

const summarySchema = z.object({
  feeds_checked: z.number(),
  network_fetch_count: z.number(),
  cache_fallback_count: z.number(),
  head_not_modified_count: z.number(),
  conditional_not_modified_count: z.number(),
  min_interval_skip_count: z.number(),
  new_articles_count: z.number(),
})

const syncStatusSchema = z.object({
  status: z.enum(['idle', 'running', 'success', 'timeout', 'error']),
  reason: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  lastCount: z.number(),
  lastError: z.string().nullable(),
  lastSummary: summarySchema.nullable(),
  inFlight: z.boolean(),
})

const syncResultSchema = z.object({
  ok: z.boolean(),
  status: z.string(),
  reason: z.string(),
  count: z.number(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  summary: summarySchema.optional(),
  error: z.string().optional(),
  fetchStats: z.record(z.string(), z.number()).nullable().optional(),
})

const materializeResultSchema = z.object({
  ok: z.boolean(),
  articleId: z.string().optional(),
  markdownPath: z.string().optional(),
  skipped: z.boolean().optional(),
  reason: z.string().optional(),
  error: z.string().optional(),
})

const stateUpdateResultSchema = z.object({
  ok: z.boolean(),
  articleId: z.string(),
  isRead: z.boolean(),
  isFavorite: z.boolean(),
  skipped: z.boolean().optional(),
  reason: z.string().optional(),
})

const noteListSchema = z.object({
  articleId: z.string(),
  notes: z.array(z.object({
    id: z.number(),
    notePath: z.string(),
    createdAt: z.string(),
  })),
})

const activityItemSchema = z.object({
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
    markdownPath: z.string().nullable(),
  }).nullable(),
})

const activityPageSchema = z.object({
  limit: z.number(),
  offset: z.number(),
  items: z.array(activityItemSchema),
})

const addFeedResultSchema = z.object({
  ok: z.boolean(),
  reason: z.string().optional(),
})

const noteCreateResultSchema = z.object({
  ok: z.boolean(),
  articleId: z.string(),
  notePath: z.string(),
})

const materializeRequestSchema = z.object({
  url: z.string(),
  feedUrl: z.string().optional(),
  title: z.string().optional(),
  publishedAt: z.string().optional(),
})

const stateUpdateRequestSchema = z.object({
  articleId: z.string(),
  isRead: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
})

const noteCreateRequestSchema = z.object({
  articleId: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
})

const ackResultSchema = z.object({
  ok: z.boolean(),
  reason: z.string().optional(),
})

const setReadingRequestSchema = z.object({
  sessionId: z.string(),
  articleId: z.string(),
})

const discussRequestSchema = z.object({
  sessionId: z.string(),
  articleId: z.string(),
  prompt: z.string().optional(),
  highlight: z.string().optional(),
})

const json = <T>(name: string, schema: TypertSchema<T>): InvocationParameterDescriptor => ({
  name,
  wire: name,
  source: 'json',
  codec: { mode: 'strict', typeSymbol: `@openbook/dsh-rss-reader#${name}`, schema },
})

const resultOf = <T>(method: string, schema: TypertSchema<T>): TypertCodec => ({
  mode: 'strict',
  typeSymbol: `@openbook/dsh-rss-reader#${method}:result`,
  schema,
})

const descriptor = (
  method: string,
  parameters: readonly InvocationParameterDescriptor[],
  resultSchema: TypertSchema<unknown>,
): InvocationDescriptor => ({
  id: `@openbook/dsh-rss-reader#rssApi/${method}`,
  service: 'rssApi',
  namespace: 'rssApi',
  method,
  invocation: { kind: 'direct' },
  parameters,
  result: resultOf(method, resultSchema),
  sourceLocation: { file: 'src/services/rssApi.ts', line: 0, column: 0 },
})

/** Host-registered rssApi contribution; mirrors client/remote.ts. */
export const RSS_API_CONTRIBUTION: TypertRemoteContribution = {
  package: '@openbook/dsh-rss-reader',
  descriptors: [
    descriptor('listFeeds', [], z.array(feedInfoSchema)),
    descriptor('addFeed', [json('url', z.string()), json('name', z.string().optional())], addFeedResultSchema),
    descriptor('listArticles', [json('limit', z.number().optional())], z.array(articleSchema)),
    descriptor('listArticlesByDate', [json('date', z.string())], z.array(articleSchema)),
    descriptor('listArticlesByFeed', [json('feedUrl', z.string()), json('limit', z.number().optional())], z.array(articleSchema)),
    descriptor('searchArticles', [json('query', z.string()), json('limit', z.number().optional())], z.array(articleSchema)),
    descriptor('getArticle', [json('articleId', z.string())], articleSchema.nullable()),
    descriptor('materialize', [json('request', materializeRequestSchema)], materializeResultSchema),
    descriptor('updateState', [json('request', stateUpdateRequestSchema)], stateUpdateResultSchema),
    descriptor('createNote', [json('request', noteCreateRequestSchema)], noteCreateResultSchema),
    descriptor('listNotes', [json('articleId', z.string())], noteListSchema),
    descriptor('activity', [json('limit', z.number().optional()), json('offset', z.number().optional())], activityPageSchema),
    descriptor('exportReview', [json('days', z.number().optional())], z.string()),
    descriptor('syncStatus', [], syncStatusSchema),
    descriptor('warmSync', [json('limit', z.number().optional()), json('timeoutMs', z.number().optional()), json('reason', z.string().optional()), json('sessionId', z.string().optional())], syncResultSchema),
    descriptor('orphanArticles', [], z.array(articleSchema)),
    descriptor('setReading', [json('request', setReadingRequestSchema)], ackResultSchema),
    descriptor('discussArticle', [json('request', discussRequestSchema)], ackResultSchema),
  ],
}
