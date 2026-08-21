/**
 * Switch the session view ring to the RSS tab (the reverse of
 * switchToChat). Used by the sidebar "go to RSS" shortcut.
 *
 * The view ring only renders for a non-blank session, so when a session is
 * opened just before this runs the tablist may not exist yet; the switch is
 * retried for a short window to ride out that render delay. Best-effort: it
 * stops silently once the RSS tab is activated or retries are exhausted.
 */

function findRssTab(): HTMLButtonElement | undefined {
  const tablists = Array.from(document.querySelectorAll('[role="tablist"]'))
  for (const list of tablists) {
    const tabs = Array.from(list.querySelectorAll('[role="tab"]')) as HTMLButtonElement[]
    const rss = tabs.find(tab => (tab.textContent ?? '').trim() === 'RSS')
    if (rss !== undefined) return rss
  }
  return undefined
}

/** Activate the RSS tab, retrying briefly while the view ring renders. */
export function switchToRssTab(attempts = 10, intervalMs = 150): void {
  if (typeof document === 'undefined') return
  const rss = findRssTab()
  if (rss !== undefined) {
    if (rss.getAttribute('aria-selected') !== 'true') rss.click()
    return
  }
  if (attempts > 1) {
    setTimeout(() => switchToRssTab(attempts - 1, intervalMs), intervalMs)
  }
}
