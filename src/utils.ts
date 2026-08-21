import { createHash } from 'node:crypto'

/**
 * Stable article id: sha256 of `${feedUrl}::${guidOrLink}`.
 * @param feedUrl - normalized feed URL.
 * @param guidOrLink - item guid, link, or title fallback.
 * @returns hex digest, 64 chars.
 */
export function stableId(feedUrl: string, guidOrLink: string): string {
  return createHash('sha256').update(`${feedUrl}::${guidOrLink || ''}`).digest('hex')
}

/**
 * Slugify a string for safe file names.
 * @param name - raw title or file base name.
 * @returns lowercased kebab-case slug, max 120 chars.
 */
export function safeFileName(name: string): string {
  const slug = String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-._]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 120)
  return slug || 'untitled'
}

/**
 * Parse the `url:` front-matter line of a materialized markdown file.
 * @param markdown - full markdown content.
 * @returns the source URL, or null when absent or unparseable.
 */
export function parseSourceUrlFromFrontmatter(markdown: string): string | null {
  const match = markdown.match(/^---\n([\s\S]+?)\n---/)
  if (!match) return null
  const urlLine = match[1]!.split('\n').find(line => line.startsWith('url: '))
  if (!urlLine) return null
  try {
    return JSON.parse(urlLine.slice(5).trim()) as string
  } catch {
    return null
  }
}
