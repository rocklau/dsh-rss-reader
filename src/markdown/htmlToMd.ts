import { JSDOM } from 'jsdom'
import TurndownService from 'turndown'

/**
 * Convert article HTML to Markdown. Strips script/style/iframe/noscript and
 * prefers the `<article>` element; falls back to `<body>`.
 * @param html - raw HTML.
 * @param baseUrl - base URL for relative image/link resolution.
 * @returns trimmed markdown.
 */
export function htmlToMarkdown(html: string, { baseUrl }: { baseUrl?: string } = {}): string {
  const dom = new JSDOM(html, { url: baseUrl || 'https://example.com' })
  const document = dom.window.document

  document.querySelectorAll('script,style,noscript,iframe').forEach(node => node.remove())

  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  })

  turndown.addRule('image', {
    filter: 'img',
    replacement(_content, node) {
      const alt = node.getAttribute('alt') || ''
      const src = node.getAttribute('src') || ''
      if (!src) return ''
      return `![${alt}](${src})`
    },
  })

  const main = document.querySelector('article') ?? document.body
  return turndown.turndown(main).trim()
}
