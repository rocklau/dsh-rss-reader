import type { ChatNode } from '@deepseek-ai/dsh-client-ui-conversation/client';
export interface SyncNodeViewProps {
    node: ChatNode<'rss/sync'>;
}
/** One OpenBook sync run card in the chat flow. */
export declare const SyncNodeView: import("react").NamedExoticComponent<SyncNodeViewProps>;
