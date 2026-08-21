/**
 * Conversation node assembling OpenBook sync runs from the durable
 * rss/sync-* session events into one chat card.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {
  ConversationLocation,
  ConversationNodeContext,
  ConversationNodeDefinition,
} from '@deepseek-ai/dsh-client-runtime/client'
import type {
  RssArticleMaterializedData,
  RssSyncEndData,
  RssSyncProgressData,
  RssSyncStartData,
} from '../events.ts'
import type { RssSyncSummary } from '../types.ts'

/** Rendered chat card data. */
export interface RssSyncChatData {
  reason: string
  status: 'running' | 'success' | 'timeout' | 'error'
  startedAt: string
  feedCount: number
  checked: number
  count: number
  summary: RssSyncSummary | null
  error?: string
}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ChatNodeDataMap {
    'rss/sync': RssSyncChatData
  }
}

declare module '@deepseek-ai/dsh-client-runtime/client' {
  interface ConversationStepDataMap {
    'rss/sync': RssSyncChatData
  }
}

interface RssSyncState extends RssSyncChatData {
  anchorSeq: number
}

function locationOf(context: ConversationNodeContext): ConversationLocation {
  return context.start?.location ?? context.matches[0]?.location ?? { kind: 'unresolved' }
}

function viewData(state: RssSyncState): RssSyncChatData {
  return {
    reason: state.reason,
    status: state.status,
    startedAt: state.startedAt,
    feedCount: state.feedCount,
    checked: state.checked,
    count: state.count,
    summary: state.summary,
    ...(state.error === undefined ? {} : { error: state.error }),
  }
}

export const rssSyncDefinition: ConversationNodeDefinition<RssSyncState> = {
  kind: 'rss/sync',
  target: 'chat',
  match: (event) => {
    if (event.type === 'openbook-rss/sync-start') {
      const data = event.data as RssSyncStartData
      return { id: data.syncId, role: 'start' }
    }
    if (event.type === 'openbook-rss/sync-progress' || event.type === 'openbook-rss/sync-end') {
      const data = event.data as RssSyncProgressData | RssSyncEndData
      return { id: data.syncId, role: 'update' }
    }
    return null
  },
  start: (context, match) => {
    if (match.event.type !== 'openbook-rss/sync-start') throw new Error('rss/sync requires openbook-rss/sync-start')
    const data = match.event.data as RssSyncStartData
    return {
      anchorSeq: match.event.seq,
      reason: data.reason,
      status: 'running',
      startedAt: data.startedAt,
      feedCount: data.feedCount,
      checked: 0,
      count: 0,
      summary: null,
    }
  },
  update: (context, match) => {
    if (match.event.type === 'openbook-rss/sync-progress') {
      const data = match.event.data as RssSyncProgressData
      return { ...context.state, checked: context.state.checked + 1 }
    }
    if (match.event.type === 'openbook-rss/sync-end') {
      const data = match.event.data as RssSyncEndData
      return {
        ...context.state,
        status: data.status,
        count: data.count,
        summary: data.summary,
        ...(data.error === undefined ? {} : { error: data.error }),
      }
    }
    return context.state
  },
  buildViewNode: context => {
    if (context.state === undefined) return null
    return {
      key: context.key,
      kind: 'rss/sync',
      id: context.id,
      target: 'chat',
      anchorSeq: context.state.anchorSeq,
      location: locationOf(context),
      visibility: 'visible',
      data: viewData(context.state),
    }
  },
}

/** Register the sync node definition. */
export function registerSyncNode(ctx: Context): void {
  ctx.conversationEvents.register(rssSyncDefinition)
}

/** Event payload types re-exported for the renderer. */
export type { RssArticleMaterializedData }
