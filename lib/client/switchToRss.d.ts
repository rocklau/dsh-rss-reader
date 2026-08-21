/**
 * Switch the session view ring to the RSS tab (the reverse of
 * switchToChat). Used by the sidebar "go to RSS" shortcut.
 *
 * The view ring only renders for a non-blank session, so when a session is
 * opened just before this runs the tablist may not exist yet; the switch is
 * retried for a short window to ride out that render delay. Best-effort: it
 * stops silently once the RSS tab is activated or retries are exhausted.
 */
/** Activate the RSS tab, retrying briefly while the view ring renders. */
export declare function switchToRssTab(attempts?: number, intervalMs?: number): void;
