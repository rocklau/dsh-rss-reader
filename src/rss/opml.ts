import { parseStringPromise } from 'xml2js'
import type { RssReader } from './reader.ts'

interface OutlineNode {
  xmlUrl?: string
  title?: string
  text?: string
  outline?: OutlineNode | OutlineNode[]
}

/**
 * Load feeds from an OPML document. Nested outlines are flattened; each
 * entry with an xmlUrl becomes a feed.
 * @param reader - reader to add feeds into.
 * @param opmlContent - raw OPML XML.
 */
export async function loadFromOPML(reader: RssReader, opmlContent: string): Promise<void> {
  const xml = await parseStringPromise(opmlContent, {
    explicitArray: false,
    mergeAttrs: true,
    trim: true,
  })

  const outlinesRoot = xml?.opml?.body?.outline as OutlineNode | OutlineNode[] | undefined
  if (!outlinesRoot) return

  const flat: { xmlUrl: string; name: string }[] = []
  const walk = (node: OutlineNode | OutlineNode[]): void => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    const xmlUrl = node.xmlUrl
    const name = node.title || node.text || (xmlUrl ? new URL(xmlUrl).hostname : 'Unnamed Feed')
    if (xmlUrl) flat.push({ xmlUrl, name })
    if (node.outline) walk(node.outline)
  }

  walk(outlinesRoot)

  for (const item of flat) {
    try {
      await reader.addFeed(item.xmlUrl, item.name)
    } catch {
      // ignore individual invalid feeds
    }
  }
}
