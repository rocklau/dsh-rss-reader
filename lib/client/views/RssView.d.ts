/** RssView: the OpenBook standalone reading page registered as a conversation.view tab. */
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots';
import type { RssDataApi } from '../api.ts';
export interface RssViewInjected {
    api: RssDataApi;
}
/** Main OpenBook reading page (three-column reader + notes + status). */
export declare function RssView({ api, sessionId }: ConvViewProps & InjectFace<RssViewInjected>): import("react").JSX.Element;
