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
import type {} from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the conversation slot declarations (conversation.view,
// conversation.chat.node) and the sidebar footer seat (sidebar.footer.action)
// into the client program.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { createRssDataApi, type RssApiFace } from './api.ts'
import { registerSyncNode } from './nodes/syncDefinition.ts'
import { SyncNodeView } from './nodes/SyncNodeView.tsx'
import TYPERT_REMOTE from './remote.ts'
import { RSS_CSS } from './styles.ts'
import { switchToRssTab } from './switchToRss.ts'
import { RssGoButton, type RssGoButtonInjected } from './views/RssGoButton.tsx'
import { RssView, type RssViewInjected } from './views/RssView.tsx'

export const inject = ['remote', 'slots', 'conversationEvents', 'sessions']

/**
 * Required services: the client remote gateway, the slot/conversation
 * registries, and the session list service.
 *
 * The host `rssApi` namespace is mounted by `ctx.remote.$mount()`, which
 * registers it as the `remote.rssApi` service. Data-loading surfaces wait on
 * that service via `ctx.inject([...])`, then obtain the namespace through
 * `scope.get('remote.rssApi')` (which bypasses the inject-sensitive ctx
 * property proxy) and build the view data API from it.
 */
export function apply(ctx: Context): void {
  // 1. Mount the host Remote API; it registers the `remote.rssApi` service.
  const gateway = ctx.remote
  let remoteDispose: (() => Promise<void>) | undefined
  void gateway.$mount(TYPERT_REMOTE).then(dispose => {
    remoteDispose = dispose
  })
  ctx.effect(() => () => {
    void remoteDispose?.()
    remoteDispose = undefined
  }, 'openbook-rss:remote-unmount')

  // 2. Inject the reader stylesheet; remove it on unload.
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

  // 3. Sidebar "go to RSS" shortcut. Captures the sessions service eagerly
  //    (the ctx property proxy only resolves inside this fiber).
  const sessions = ctx.sessions
  const goToRss = (): void => {
    const state = sessions.list.getSnapshot() as {
      current?: string
      ids: readonly string[]
      byId: Record<string, { blank?: boolean } | undefined>
    }
    const current = state.current
    const currentOk = current !== undefined && state.byId[current]?.blank === false
    if (!currentOk) {
      const target = state.ids.find(id => state.byId[id]?.blank === false) ?? state.ids[0]
      if (target !== undefined && target !== current) sessions.open(target as never)
    }
    switchToRssTab()
  }
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'openbook-rss',
    order: 10,
    inject: (): RssGoButtonInjected => ({ goToRss }),
  }, RssGoButton))

  // 4. Reading page as a conversation.view tab (per-session). Waits for the
  //    mounted rssApi namespace service before registering.
  ctx.inject(['remote.rssApi', 'slots'], (scope: Context) => {
    const remoteNs = scope.get('remote.rssApi') as RssApiFace | undefined
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

  // 5. Conversation node: one card per rss/sync run (no remote needed).
  registerSyncNode(ctx)
  ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
    name: 'conversation.chat.node',
    key: 'rss/sync',
    inject: () => ({}),
  }, SyncNodeView))
}
