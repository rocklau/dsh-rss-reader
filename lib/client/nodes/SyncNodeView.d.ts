import type { ChatNode } from '@deepseek-ai/dsh-client-ui-chat/client';
export interface SyncNodeViewProps {
    node: ChatNode<'rss/sync'>;
}
/** One OpenBook sync run card in the chat flow. */
export declare const SyncNodeView: import("react").MemoExoticComponent<({ node }: SyncNodeViewProps) => import("react").JSX.Element>;
