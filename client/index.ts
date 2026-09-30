/**
 * OpenBook RSS Reader browser plugin.
 *
 * Mounts the host Remote API, injects the reader styles, and registers three
 * surfaces:
 * 1. the RSS reading page as a `conversation.view` tab (the single RSS
 *    reader — one surface, no competing docked panel);
 * 2. a `sidebar.footer.action` "go to RSS" shortcut that jumps straight to
 *    that tab (opening a non-blank session first when needed);
 * 3. the rss/sync conversation node plus its chat renderer.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the conversation slot declarations (conversation.view,
// conversation.chat.node) and the sidebar footer seat (sidebar.footer.action)
// into the client program.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { createRssDataApi } from './api.ts'
import { registerSyncNode } from './nodes/syncDefinition.ts'
import { SyncNodeView } from './nodes/SyncNodeView.tsx'
import TYPERT_REMOTE from './remote.ts'
import { RSS_CSS } from './styles.ts'
import { switchToRssTab } from './switchToRss.ts'
import { RssGoButton, type RssGoButtonInjected } from './views/RssGoButton.tsx'
import { RssView, type RssViewInjected } from './views/RssView.tsx'

export const inject = ['remote', 'slots', 'uiConversation', 'uiSession', 'sessions', 'uiWorkspace']

/**
 * Required services: the client remote gateway, the slot/conversation
 * registries, and the session list service.
 *
 * The host `rssApi` namespace is mounted by `ctx.remote.$mount()`, which
 * registers it as the `remote.rssApi` service. Data-loading surfaces wait on
 * that service via `ctx.inject([...])` and build the view data API from the
 * typed namespace.
 */
export function apply(ctx: Context): void {
  const gateway = ctx.remote
  ctx.effect(() => gateway.$mount(TYPERT_REMOTE), 'openbook-rss:remote')

  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = '@openbook/dsh-rss-reader'
    tag.dataset.pluginCss = 'openbook-rss'
    tag.textContent = RSS_CSS
    document.head.appendChild(tag)
    return () => {
      tag.remove()
    }
  }, 'openbook-rss:styles')

  // Session catalog and selected UI binding have independent owners.
  const sessions = ctx.sessions
  const goToRss = (): void => {
    const state = sessions.list.getSnapshot()
    const currentKey = ctx.uiSession.adapter.current.getSnapshot().key
    const current = state.ids.find(id => id === currentKey)
    const currentOk = current !== undefined && state.byId[current]?.blank === false
    if (!currentOk) {
      const target = state.ids.find(id => state.byId[id]?.blank === false) ?? state.ids[0]
      if (target !== undefined && target !== current) ctx.uiWorkspace.openSession(target)
    }
    switchToRssTab()
  }
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'openbook-rss',
    order: 10,
    inject: (): RssGoButtonInjected => ({ goToRss }),
  }, RssGoButton))

  ctx.inject(['remote.rssApi', 'slots'], (scope: Context) => {
    const remoteNs = scope.remote.rssApi
    if (remoteNs === undefined) throw new Error('openbook-rss: rssApi namespace service missing')
    const api = createRssDataApi(remoteNs)

    scope.slots.inject('conversation.view', () => scope.slots.register({
      name: 'conversation.view',
      id: 'openbook-rss',
      order: 20,
      label: () => 'RSS',
      inject: (): RssViewInjected => ({ api }),
    }, RssView))
  })

  // Historical sync events remain renderable without Remote requests.
  registerSyncNode(ctx)
  ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
    name: 'conversation.chat.node',
    key: 'rss/sync',
    inject: () => ({}),
  }, SyncNodeView))
}
