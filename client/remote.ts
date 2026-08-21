/**
 * Client Remote surface for the OpenBook host API.
 *
 * The host side (src/services/rssApi.ts) exposes a TypertRemoteService named
 * `rssApi`. This file mirrors the wire contract by hand (the typert generator
 * normally emits these descriptors): a TypertRemoteContribution the client
 * mounts via `ctx.remote.$mount(...)`, plus the type-level declarations that
 * give `ctx.remote.rssApi.*` its signatures.
 */
import { z } from 'zod'
import type {
  InvocationDescriptor,
  InvocationParameterDescriptor,
  RemoteResult,
  TypertClientRemote,
  TypertCodec,
  TypertRemoteContribution,
  TypertSchema,
} from '@deepseek-ai/dsh-typert-protocol'
import type {
  ActivityItem,
  ArticleView,
  FeedInfo,
  MaterializeResult,
  StateUpdateResult,
  SyncResult,
  SyncStatus,
} from './types.ts'

/* ------------------------------------------------------------------ schemas */

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

/* ------------------------------------------------------------- descriptor */

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

export const TYPERT_REMOTE: TypertRemoteContribution = {
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

export default TYPERT_REMOTE

/* -------------------------------------------------------------- typings */

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteNamespace$727373417069 {
    listFeeds: () => Promise<RemoteResult<FeedInfo[]>>
    addFeed: (url: string, name?: string) => Promise<RemoteResult<{ ok: boolean; reason?: string }>>
    listArticles: (limit?: number) => Promise<RemoteResult<ArticleView[]>>
    listArticlesByDate: (date: string) => Promise<RemoteResult<ArticleView[]>>
    listArticlesByFeed: (feedUrl: string, limit?: number) => Promise<RemoteResult<ArticleView[]>>
    searchArticles: (query: string, limit?: number) => Promise<RemoteResult<ArticleView[]>>
    getArticle: (articleId: string) => Promise<RemoteResult<ArticleView | null>>
    materialize: (request: { url: string; feedUrl?: string; title?: string; publishedAt?: string }) => Promise<RemoteResult<MaterializeResult>>
    updateState: (request: { articleId: string; isRead?: boolean; isFavorite?: boolean }) => Promise<RemoteResult<StateUpdateResult>>
    createNote: (request: { articleId: string; title?: string; content?: string }) => Promise<RemoteResult<{ ok: boolean; articleId: string; notePath: string }>>
    listNotes: (articleId: string) => Promise<RemoteResult<{ articleId: string; notes: Array<{ id: number; notePath: string; createdAt: string }> }>>
    activity: (limit?: number, offset?: number) => Promise<RemoteResult<{ limit: number; offset: number; items: ActivityItem[] }>>
    exportReview: (days?: number) => Promise<RemoteResult<string>>
    syncStatus: () => Promise<RemoteResult<SyncStatus>>
    warmSync: (limit?: number, timeoutMs?: number, reason?: string, sessionId?: string) => Promise<RemoteResult<SyncResult>>
    orphanArticles: () => Promise<RemoteResult<ArticleView[]>>
    setReading: (request: { sessionId: string; articleId: string }) => Promise<RemoteResult<{ ok: boolean; reason?: string }>>
    discussArticle: (request: { sessionId: string; articleId: string; prompt?: string; highlight?: string }) => Promise<RemoteResult<{ ok: boolean; reason?: string }>>
  }

  interface TypertRemoteMap {
    'rssApi/listFeeds': TypertRemoteNamespace$727373417069['listFeeds']
    'rssApi/addFeed': TypertRemoteNamespace$727373417069['addFeed']
    'rssApi/listArticles': TypertRemoteNamespace$727373417069['listArticles']
    'rssApi/listArticlesByDate': TypertRemoteNamespace$727373417069['listArticlesByDate']
    'rssApi/listArticlesByFeed': TypertRemoteNamespace$727373417069['listArticlesByFeed']
    'rssApi/searchArticles': TypertRemoteNamespace$727373417069['searchArticles']
    'rssApi/getArticle': TypertRemoteNamespace$727373417069['getArticle']
    'rssApi/materialize': TypertRemoteNamespace$727373417069['materialize']
    'rssApi/updateState': TypertRemoteNamespace$727373417069['updateState']
    'rssApi/createNote': TypertRemoteNamespace$727373417069['createNote']
    'rssApi/listNotes': TypertRemoteNamespace$727373417069['listNotes']
    'rssApi/activity': TypertRemoteNamespace$727373417069['activity']
    'rssApi/exportReview': TypertRemoteNamespace$727373417069['exportReview']
    'rssApi/syncStatus': TypertRemoteNamespace$727373417069['syncStatus']
    'rssApi/warmSync': TypertRemoteNamespace$727373417069['warmSync']
    'rssApi/orphanArticles': TypertRemoteNamespace$727373417069['orphanArticles']
    'rssApi/setReading': TypertRemoteNamespace$727373417069['setReading']
    'rssApi/discussArticle': TypertRemoteNamespace$727373417069['discussArticle']
  }

  interface TypertRemoteNamespaceMap {
    rssApi: TypertRemoteNamespace$727373417069
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Client Remote API gateway (provided by the web shell). */
    remote: TypertClientRemote
  }
}
