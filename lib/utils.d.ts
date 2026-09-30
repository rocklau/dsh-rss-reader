/**
 * Stable article id: sha256 of `${feedUrl}::${guidOrLink}`.
 * @param feedUrl - normalized feed URL.
 * @param guidOrLink - item guid, link, or title fallback.
 * @returns hex digest, 64 chars.
 */
export declare function stableId(feedUrl: string, guidOrLink: string): string;
/**
 * Slugify a string for safe file names.
 * @param name - raw title or file base name.
 * @returns lowercased kebab-case slug, max 120 chars.
 */
export declare function safeFileName(name: string): string;
/**
 * Parse the `url:` front-matter line of a materialized markdown file.
 * @param markdown - full markdown content.
 * @returns the source URL, or null when absent or unparseable.
 */
export declare function parseSourceUrlFromFrontmatter(markdown: string): string | null;
