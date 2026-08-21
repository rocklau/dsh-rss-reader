/**
 * Conversation node assembling OpenBook sync runs from the durable
 * rss/sync-* session events into one chat card.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ConversationNodeDefinition } from '@deepseek-ai/dsh-client-runtime/client';
import type { RssArticleMaterializedData } from '../events.ts';
import type { RssSyncSummary } from '../types.ts';
/** Rendered chat card data. */
export interface RssSyncChatData {
    reason: string;
    status: 'running' | 'success' | 'timeout' | 'error';
    startedAt: string;
    feedCount: number;
    checked: number;
    count: number;
    summary: RssSyncSummary | null;
    error?: string;
}
declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
    interface ChatNodeDataMap {
        'rss/sync': RssSyncChatData;
    }
}
declare module '@deepseek-ai/dsh-client-runtime/client' {
    interface ConversationStepDataMap {
        'rss/sync': RssSyncChatData;
    }
}
interface RssSyncState extends RssSyncChatData {
    anchorSeq: number;
}
export declare const rssSyncDefinition: ConversationNodeDefinition<RssSyncState>;
/** Register the sync node definition. */
export declare function registerSyncNode(ctx: Context): void;
/** Event payload types re-exported for the renderer. */
export type { RssArticleMaterializedData };
