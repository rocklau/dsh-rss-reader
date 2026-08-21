/** RssView: the OpenBook standalone reading page registered as a conversation.view tab. */
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { RssDataApi } from '../api.ts'
import { RssContent } from './RssContent.tsx'

export interface RssViewInjected {
  api: RssDataApi
}

/** Main OpenBook reading page (three-column reader + notes + status). */
export function RssView({ api, sessionId }: ConvViewProps & InjectFace<RssViewInjected>) {
  return <RssContent api={api} sessionId={sessionId === undefined ? undefined : String(sessionId)} />
}
