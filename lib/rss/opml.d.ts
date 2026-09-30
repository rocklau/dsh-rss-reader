import type { RssReader } from './reader.ts';
/**
 * Load feeds from an OPML document. Nested outlines are flattened; each
 * entry with an xmlUrl becomes a feed.
 * @param reader - reader to add feeds into.
 * @param opmlContent - raw OPML XML.
 */
export declare function loadFromOPML(reader: RssReader, opmlContent: string): Promise<void>;
