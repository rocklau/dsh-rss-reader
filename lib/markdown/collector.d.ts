import type { FetchQueue } from '../rss/httpClient.ts';
/**
 * Download images referenced by a materialized markdown file into a sibling
 * `<basename>-assets/` directory and rewrite the markdown to local paths.
 * MD5-hash dedupe keeps repeated URLs as one file.
 */
export declare function downloadResources(fetchQueue: FetchQueue, markdownPath: string, articleId: string): Promise<void>;
