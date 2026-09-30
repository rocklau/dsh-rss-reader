import { test } from 'node:test'
import assert from 'node:assert/strict'
import { testDirectory } from './fixtures.mjs'
import { Context } from '@deepseek-ai/cordis'

test('plugin loads into a cordis context and registers services, tools, commands', async t => {
  const plugin = await import('../lib/index.js')
  const { name, Config, apply } = plugin

  assert.equal(name, 'openbook-rss')
  assert.ok(Config, 'Config schema exported')
  assert.equal(typeof apply, 'function')

  const dataDir = testDirectory(t)
  const ctx = new Context()

  // stub the injected services the plugin body needs
  const tools = []
  const commands = []
  const registeredContributions = []
  ctx.provide('tools', { register: def => { tools.push(def); return () => {} } })
  ctx.provide('commands', { register: def => { commands.push(def); return () => {} } })
  ctx.provide('typert', {
    register: contribution => { registeredContributions.push(contribution); return () => {} },
    local: { get: () => undefined, hasSeen: () => false },
  })

  await ctx.plugin(plugin, {
    dataDir,
    allowPrivateFeeds: true,
    startupSync: false,
    opmlFiles: [],
    defaultFeeds: [],
  })
  const db = ctx.rssStore.db
  t.after(async () => { await ctx.fiber.dispose(); db.close() })

  assert.ok(ctx.rssStore, 'rssStore service registered')
  assert.ok(ctx.rssFeed, 'rssFeed service registered')
  assert.ok(ctx.rssArticle, 'rssArticle service registered')
  assert.ok(ctx.rssActivity, 'rssActivity service registered')
  assert.ok(ctx.rssSync, 'rssSync service registered')
  assert.ok(ctx.rssApi, 'rssApi service registered')

  assert.ok(tools.some(t => t.name === 'rss_list_feeds'), 'rss tools registered')
  assert.ok(tools.some(t => t.name === 'book_index'), 'book tools registered')
  assert.ok(commands.some(c => c.name === 'feeds'), '/feeds command registered')
  assert.ok(commands.some(c => c.name === 'book'), '/book command registered')
  assert.ok(commands.some(c => c.name === 'doctor'), '/doctor command registered')

  // the data dir was created and the db is queryable
  const feeds = ctx.rssFeed.listFeeds()
  assert.ok(Array.isArray(feeds))

  // the rssApi Remote contribution was registered into the typert registry so
  // the gateway claims the endpoints via ctx.typert.local (no 404 on load order)
  assert.equal(registeredContributions.length, 1, 'rssApi contribution registered')
  const endpoints = registeredContributions[0].invocations.map(d => `${d.namespace}/${d.method}`)
  assert.ok(endpoints.includes('rssApi/listFeeds'), 'listFeeds endpoint declared')
  assert.ok(endpoints.includes('rssApi/discussArticle'), 'discussArticle endpoint declared')
  assert.ok(endpoints.includes('rssApi/setReading'), 'setReading endpoint declared')
})

test('warmSync never writes into the session log', async t => {
  const plugin = await import('../lib/index.js')
  const dataDir = testDirectory(t)
  const ctx = new Context()

  ctx.provide('tools', { register: () => () => {} })
  ctx.provide('commands', { register: () => () => {} })
  ctx.provide('typert', {
    register: () => () => {},
    local: { get: () => undefined, hasSeen: () => false },
  })

  await ctx.plugin(plugin, {
    dataDir,
    allowPrivateFeeds: true,
    startupSync: false,
    opmlFiles: [],
    defaultFeeds: [],
  })
  const db = ctx.rssStore.db
  t.after(async () => { await ctx.fiber.dispose(); db.close() })

  // Sync telemetry stays outside the Session log.
  const appends = []
  const result = await ctx.rssSync.warmSync({
    reason: 'test',
    session: { append: (...args) => appends.push(args) },
  })
  assert.equal(result.ok, true, 'sync succeeds on an empty store')
  assert.deepEqual(appends, [], 'warmSync must not append any openbook-rss/* events')
})
