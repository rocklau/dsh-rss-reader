/** Shared constants for the OpenBook RSS Reader plugin. */

export const PLUGIN_NAME = 'openbook-rss'

export const USER_AGENT =
  'OpenBook RSS Reader (+https://github.com/rocklau/OpenBook)'

/** Activity feed kinds (durable rows in activity_log). */
export const ACTIVITY_TYPES = {
  STATE: 'state',
  NOTE: 'note',
  MATERIALIZE: 'materialize',
} as const

export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES]

/** Default feeds used when no OPML files are present. */
export const DEFAULT_FEEDS: readonly { url: string; name: string }[] = [
  { url: 'https://news.ycombinator.com/rss', name: 'Hacker News' },
  { url: 'https://www.reddit.com/r/programming/.rss', name: 'r/programming' },
  { url: 'https://techcrunch.com/feed/', name: 'TechCrunch' },
]

/** JSON index format version (data/index.json). */
export const JSON_INDEX_VERSION = 1
