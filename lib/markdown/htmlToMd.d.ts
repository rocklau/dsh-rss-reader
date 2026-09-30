/**
 * Convert article HTML to Markdown. Strips script/style/iframe/noscript and
 * prefers the `<article>` element; falls back to `<body>`.
 * @param html - raw HTML.
 * @param baseUrl - base URL for relative image/link resolution.
 * @returns trimmed markdown.
 */
export declare function htmlToMarkdown(html: string, { baseUrl }?: {
    baseUrl?: string;
}): string;
