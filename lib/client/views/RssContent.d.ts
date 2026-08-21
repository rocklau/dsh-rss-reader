import type { ReactNode } from 'react';
import type { RssDataApi } from '../api.ts';
export type RssTab = 'reader' | 'notes' | 'status';
export interface RssContentProps {
    api: RssDataApi;
    /** Current session id (for ambient context + discuss); undefined when no session is open. */
    sessionId?: string;
    /** Optional extra toolbar node rendered beside the tabs (e.g. the panel close button). */
    toolbar?: ReactNode;
}
/** The OpenBook reading surface: tab bar plus the active tab's body. */
export declare function RssContent({ api, sessionId, toolbar }: RssContentProps): import("react").JSX.Element;
