import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Context } from '@deepseek-ai/cordis'
import Commands from '@deepseek-ai/dsh-commands'
import Tools from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import TypertRegistry from '@deepseek-ai/dsh-typert-registry'
import Gateway from '@deepseek-ai/dsh-api-gateway'
import { testDirectory } from './fixtures.mjs'
import * as plugin from '../lib/index.js'

async function host(t, options = {}) {
  const ctx = new Context()
  const injected = []
  const followed = []
  const agent = {
    id: 'rss-test-session',
    inject: message => injected.push(message),
    followup: message => followed.push(message),
  }
  ctx.provide('agents', { get: id => id === agent.id ? agent : undefined })
  await ctx.plugin(TypertRegistry)
  await ctx.plugin(SystemPrompt, {})
  await ctx.plugin(Tools, {})
  await ctx.plugin(Commands)
  await ctx.plugin(Gateway, {})
  const dataDir = testDirectory(t)
  const fiber = await ctx.plugin(plugin, {
    dataDir, allowPrivateFeeds: true, startupSync: false,
    opmlFiles: [], defaultFeeds: [],
    ...options,
  })
  assert.ok(existsSync(`${dataDir}/openbook.db`))
  const db = ctx.rssStore.db
  t.after(async () => { await ctx.fiber.dispose(); db.close() })
  const invoke = (method, args = {}) => ctx.typertGateway.invoke({ namespace: 'rssApi', method, args })
  return { ctx, fiber, agent, injected, followed, invoke }
}

test('current Gateway accepts optional arguments and validates RSS requests', async t => {
  const { ctx, invoke } = await host(t)
  assert.deepEqual(await invoke('listFeeds'), [])
  assert.deepEqual(await invoke('listArticles'), [])
  assert.equal((await invoke('syncStatus')).status, 'idle')
  assert.deepEqual(await invoke('setReading', { request: { sessionId: 'missing', articleId: 'missing' } }),
    { ok: false, reason: 'session not found' })
  await assert.rejects(invoke('listArticles', { limit: 'invalid' }),
    error => error.code === 'gateway/input-invalid' && error.field === 'limit')
  await assert.rejects(invoke('getArticle'), /missing.*articleId/)
  await assert.rejects(invoke('listFeeds', { extra: true }), /unexpected.*extra/)
  assert.ok(ctx.typert.local.get('rssApi/discussArticle'))
})

test('article reading and discussion queue identified messages on current live Agents', async t => {
  const { ctx, agent, injected, followed, invoke } = await host(t)
  const articleId = 'a'.repeat(64)
  ctx.rssStore.repositories.upsertFeed('https://example.com/feed', 'Example')
  ctx.rssStore.repositories.upsertArticles([{
    id: articleId, feed_url: 'https://example.com/feed', guid: 'article', link: 'https://example.com/article',
    title: 'Article title', author: null, published_at: null,
    content_html: '<p>Readable body</p>', content_snippet: 'Readable body', markdown_path: null,
  }])
  assert.deepEqual(await invoke('setReading', { request: { sessionId: agent.id, articleId } }), { ok: true })
  assert.deepEqual(await invoke('discussArticle', { request: {
    sessionId: agent.id, articleId, prompt: 'Summarize', highlight: 'Readable',
  } }), { ok: true })
  assert.equal(injected.length, 1)
  assert.equal(followed.length, 1)
  assert.equal(injected[0].source.kind, 'openbook-rss')
  assert.equal(followed[0].role, 'user')
  assert.ok(followed[0].id)
  assert.ok(Object.isFrozen(followed[0]))
  assert.match(followed[0].content[0].text, /Summarize/)
  assert.match(followed[0].content[0].text, /Readable body/)
  assert.match(followed[0].content[0].text, /> Readable/)
  assert.equal(injected[0].content[0].text.includes('Article title'), true)
})

test('current tool and command registries execute RSS handlers and unwind registrations', async t => {
  const { ctx, fiber, agent } = await host(t)
  const list = ctx.tools.get('rss_list_feeds')
  assert.equal(await list.execute({}, {}), 'No feeds configured.')
  const search = ctx.tools.get('rss_search')
  assert.equal(await search.execute({ query: 'missing' }, {}), 'No articles match "missing".')
  await assert.rejects(search.execute({}, {}), /query/)
  assert.equal(ctx.commands.list(agent).length, 15)
  assert.deepEqual(await ctx.commands.find(agent, 'feeds').handler({ rawInput: '', agent }),
    { kind: 'success', text: 'No feeds configured.' })
  assert.ok(ctx.tools.get('book_index'))
  assert.ok(ctx.commands.find(agent, 'doctor'))
  await fiber.dispose()
  assert.equal(ctx.tools.get('rss_list_feeds'), undefined)
  assert.equal(ctx.commands.find(agent, 'feeds'), undefined)
  assert.equal(ctx.typert.local.get('rssApi/listFeeds'), undefined)
})

test('unloading before the startup callback prevents startup sync', async t => {
  const { ctx, fiber } = await host(t, { startupSync: true })
  assert.equal(ctx.rssSync.getSyncStatus().status, 'idle')
  let calls = 0
  ctx.rssSync.warmSync = async () => { calls += 1 }
  await fiber.dispose()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls, 0)
})

function clientModule() {
  const require = createRequire(import.meta.url)
  let client
  const styles = new Set()
  const document = {
    createElement: () => {
      const tag = { dataset: {}, remove: () => styles.delete(tag) }
      return tag
    },
    head: { appendChild: tag => styles.add(tag) },
    querySelectorAll: () => [],
  }
  runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load: entry => { client = entry.factory(require) } } },
    document, console, setTimeout, clearTimeout,
  })
  return { client, styles }
}

test('built browser plugin preserves historical sync cards and awaits Remote cleanup', async t => {
  const { client, styles } = clientModule()
  assert.ok(client.inject.includes('uiConversation'))
  assert.ok(client.inject.includes('uiSession'))
  assert.ok(!client.inject.includes('conversationEvents'))
  const ctx = new Context()
  const entries = []
  const definitions = []
  let resolveMount
  let resolveEntered
  let contribution
  let unmounted = 0
  const pending = new Promise(resolve => { resolveMount = resolve })
  const entered = new Promise(resolve => { resolveEntered = resolve })
  ctx.provide('remote', {
    rssApi: {},
    $mount: remote => { contribution = remote; return pending },
  })
  ctx.provide('remote.rssApi', {})
  ctx.provide('slots', {
    inject: (_name, callback) => callback(),
    register: (options, component) => { entries.push({ options, component }); return () => {} },
  })
  ctx.provide('uiConversation', { events: { register: definition => {
    definitions.push(definition)
    resolveEntered()
    return () => {}
  } } })
  ctx.provide('uiSession', { adapter: { current: { getSnapshot: () => ({ key: undefined }) } } })
  ctx.provide('uiWorkspace', { openSession: () => {} })
  ctx.provide('sessions', { list: { getSnapshot: () => ({ ids: [], byId: {} }) } })
  const fiber = ctx.plugin(client)
  t.after(() => {
    resolveMount(async () => { unmounted += 1 })
    return ctx.fiber.dispose()
  })
  await entered
  assert.equal(definitions[0].kind, 'rss/sync')
  const definition = definitions[0]
  const start = {
    type: 'openbook-rss/sync-start', seq: 4,
    data: { syncId: 'historical-run', reason: 'manual', startedAt: '2026-09-01T00:00:00Z', feedCount: 1 },
  }
  assert.equal(definition.match(start).id, 'historical-run')
  assert.equal(definition.match(start).role, 'start')
  let state = definition.start({}, { event: start })
  const progress = {
    type: 'openbook-rss/sync-progress', seq: 5,
    data: { syncId: 'historical-run', feedUrl: 'https://example.com/feed', feedTitle: 'Example',
      status: 200, fromCache: false, reason: 'network' },
  }
  state = definition.update({ state }, { event: progress })
  const summary = {
    feeds_checked: 1, network_fetch_count: 1, cache_fallback_count: 0,
    head_not_modified_count: 0, conditional_not_modified_count: 0,
    min_interval_skip_count: 0, new_articles_count: 3,
  }
  const end = {
    type: 'openbook-rss/sync-end', seq: 6,
    data: { syncId: 'historical-run', status: 'success', count: 3, summary },
  }
  assert.equal(definition.match(end).role, 'update')
  state = definition.update({ state }, { event: end })
  const node = definition.buildViewNode({ state, key: 'historical-run', id: 'historical-run', matches: [] })
  assert.equal(node.anchorSeq, 4)
  assert.equal(node.data.status, 'success')
  assert.equal(node.data.checked, 1)
  assert.equal(node.data.count, 3)
  const renderer = entries.find(entry => entry.options.key === 'rss/sync')
  const html = renderToStaticMarkup(createElement(renderer.component, { node }))
  assert.match(html, /RSS sync/)
  assert.match(html, /✓ done/)
  assert.match(html, /articles=3/)
  assert.match(html, /new=3/)
  assert.ok(entries.some(entry => entry.options.name === 'conversation.view'))
  assert.ok(entries.some(entry => entry.options.key === 'rss/sync'))
  const limit = contribution.descriptors.find(d => d.method === 'listArticles').parameters[0]
  assert.equal(limit.acceptsUndefined, true)
  assert.equal(limit.codec.create().parse(undefined), undefined)
  const disposing = fiber.dispose()
  resolveMount(async () => { unmounted += 1 })
  await disposing
  assert.equal(unmounted, 1)
  assert.equal(styles.size, 0)
})

test('every public export has a built runtime and declaration artifact', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(pkg.peerDependencies['@deepseek-ai/cordis'], '4.0.4')
  assert.equal(pkg.peerDependencies['@deepseek-ai/schemastery'], '3.18.4')
  for (const [name, version] of Object.entries(pkg.peerDependencies)) {
    assert.equal(pkg.peerDependenciesMeta[name].optional, true, `${name}: provided by active Harness`)
    if (name.startsWith('@deepseek-ai/dsh-')) assert.equal(version, '0.2.0-rc.2', name)
  }
  assert.deepEqual(Object.keys(pkg.dependencies).sort(),
    ['dompurify', 'jsdom', 'rss-parser', 'turndown', 'xml2js', 'zod'])
  for (const [name, value] of Object.entries(pkg.exports)) {
    if (typeof value === 'string') continue
    assert.ok(existsSync(new URL(`../${value.default}`, import.meta.url)), `${name}: runtime`)
    assert.ok(existsSync(new URL(`../${value.types}`, import.meta.url)), `${name}: declarations`)
  }
  const client = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.ok(!client.includes('dsh-client-runtime'))
})
