/**
 * Switch the session view ring back to the Chat tab.
 *
 * The chat store (`setView`) is private to ui-conversation and there is no
 * public client API to change the active conversation view, so we activate
 * the Chat tab through the rendered tab ring. The view ring is the tablist
 * that contains our own "RSS" tab; within it Chat is the default view
 * (id 'chat', order 0). Best-effort: silently no-ops when the ring is absent.
 */
export function switchToChatTab(): void {
  if (typeof document === 'undefined') return

  const tablists = Array.from(document.querySelectorAll('[role="tablist"]'))
  if (tablists.length === 0) return

  const tabsOf = (list: Element) =>
    Array.from(list.querySelectorAll('[role="tab"]')) as HTMLButtonElement[]

  // The conversation view ring is the tablist that contains our RSS tab.
  const ring = tablists.find(list => tabsOf(list).some(tab => (tab.textContent ?? '').trim() === 'RSS'))
  const scope = ring ?? tablists[0]
  if (scope === undefined) return

  const tabs = tabsOf(scope)
  if (tabs.length === 0) return

  // Chat is the default view. Prefer a locale-independent label match, then
  // fall back to the first tab (chat registers with the lowest order).
  const chatTab = tabs.find(tab => /^(chat|对话|聊天)$/i.test((tab.textContent ?? '').trim())) ?? tabs[0]
  chatTab?.click()
}
