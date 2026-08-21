import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openRssDatabase, Repositories, FetchQueue, RssReader } from '../lib/internal.js'

const RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>http://127.0.0.1:PORT/</link>
    <description>A fixture feed</description>
    <item>
      <title>First item</title>
      <link>http://127.0.0.1:PORT/post/1</link>
      <guid>fixture-1</guid>
      <pubDate>Wed, 01 Aug 2026 10:00:00 GMT</pubDate>
      <author>Alice</author>
    </item>
    <item>
      <title>Second item</title>
      <link>http://127.0.0.1:PORT/post/2</link>
      <guid>fixture-2</guid>
      <pubDate>Thu, 02 Aug 2026 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`

test('RssReader fetches, caches, and honors the min-interval skip', async () => {
  let hits = 0
  const server = createServer((req, res) => {
    hits += 1
    res.setHeader('content-type', 'application/rss+xml')
    res.end(RSS_XML.replaceAll('PORT', String(server.address().port)))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const url = `http://127.0.0.1:${port}/rss`

  const dir = mkdtempSync(join(tmpdir(), 'openbook-reader-'))
  const db = openRssDatabase(join(dir, 'test.db'))
  const repos = new Repositories(db)
  const queue = new FetchQueue({ concurrency: 2, intervalCap: 100, intervalMs: 10 })
  const reader = new RssReader(repos, queue, {
    allowPrivateFeeds: true,
    feedMinSyncIntervalMs: 600000, // 10 min: forces the min-interval path
    feedHeadCheck: false,
    feedHeadTimeoutMs: 1000,
    userAgent: 'openbook-test/1.0',
  })

  await reader.addFeed(url, 'Test Feed')
  assert.equal(reader.feeds.length, 1)

  const first = await reader.parseFeed(url)
  assert.ok(first)
  assert.equal(first.title, 'Test Feed')
  assert.equal(first.items.length, 2)
  assert.equal(first.items[0].title, 'First item')

  // second parse within the min interval: served from the cache, no network hit
  const before = hits
  const second = await reader.parseFeed(url)
  assert.equal(second.items.length, 2)
  assert.equal(hits, before, 'min_interval_skip must not hit the network')

  // force bypasses the interval
  await reader.parseFeed(url, { force: true })
  assert.equal(hits, before + 1)

  // getAllArticles returns items merged across feeds
  const all = await reader.getAllArticles(10)
  assert.equal(all.length, 2)
  assert.ok(all.every(a => a.feedTitle === 'Test Feed'))

  db.close()
  await new Promise(resolve => server.close(resolve))
})
