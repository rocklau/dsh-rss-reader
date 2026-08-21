/**
 * Real-composition e2e for the OpenBook RSS plugin's Remote API.
 *
 * Follows the dsh testing convention for product-visible plugins: boot the
 * real app process (real entry path) with the plugin loaded, then invoke the
 * rpc endpoints over the SAME unary transport the web client uses and assert
 * they respond. This guards the "HTTP 404" regression where the gateway fails
 * to claim a late-loading plugin's endpoints.
 *
 * Self-contained: spawns `pnpm dsh web --no-open` in its own process group,
 * waits for readiness, runs the assertions, then kills the group. Skips
 * cleanly when the dsh source checkout is unavailable.
 *
 * Run with: npm run test:e2e
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, openSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Path to a DeepSeek Harness source checkout (the real composition host).
// Required for this e2e; the test skips cleanly when it is not configured.
const DSH_SOURCE = process.env.DSH_SOURCE_DIR || ''
const BASE = process.env.DSH_E2E_BASE || 'http://127.0.0.1:3080'
const BOOT_TIMEOUT_MS = 120000

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function waitForReady(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/`, { method: 'GET' })
      if (res.ok) {
        const bundle = await fetch(`${BASE}/plugins/@openbook%2Fdsh-rss-reader/client.js`)
        if (bundle.ok) return true
      }
    } catch {
      // not up yet
    }
    await sleep(1000)
  }
  return false
}

/** Invoke one rpc endpoint over the exact unary transport the web client uses. */
async function rpc(endpoint, args = {}) {
  const rpcId = randomUUID()
  const response = await fetch(`${BASE}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method: endpoint, payload: { args } }),
  })
  return { status: response.status, ok: response.ok, body: response.ok ? await response.json() : await response.text() }
}

test('rssApi endpoints are claimed by the gateway and respond over the real transport', { timeout: BOOT_TIMEOUT_MS + 60000 }, async t => {
  if (DSH_SOURCE === '' || !existsSync(DSH_SOURCE)) {
    t.skip('set DSH_SOURCE_DIR to a deepseek-harness source checkout to run this real-composition e2e')
    return
  }

  // Redirect the dsh process output to a file (no parent-side pipes, so the
  // test runner's event loop drains once the group is killed).
  const bootLogPath = join(tmpdir(), `openbook-e2e-dsh-${randomUUID()}.log`)
  const logFd = openSync(bootLogPath, 'w')

  const child = spawn('pnpm', ['dsh', 'web', '--no-open'], {
    cwd: DSH_SOURCE,
    detached: true, // own process group so we can kill the whole tree
    stdio: ['ignore', logFd, logFd],
    env: { ...process.env },
  })

  const killTree = () => {
    if (child.pid === undefined) return
    try { process.kill(-child.pid, 'SIGKILL') } catch { /* already gone */ }
  }
  t.after(killTree)

  const ready = await waitForReady(BOOT_TIMEOUT_MS)
  if (!ready) {
    killTree()
    assert.fail(`dsh web did not become ready with the plugin bundle served (see ${bootLogPath})`)
  }

  // listFeeds: a no-arg read endpoint must be claimed and return the feed list.
  const feeds = await rpc('rssApi/listFeeds')
  assert.equal(feeds.status, 200, `rssApi/listFeeds returned HTTP ${feeds.status} (404 = gateway did not claim the endpoint) — ${typeof feeds.body === 'string' ? feeds.body : ''}`)
  assert.ok(Array.isArray(feeds.body?.result?.value), 'listFeeds result is an array')

  // syncStatus: another claimed endpoint returning the sync snapshot.
  const status = await rpc('rssApi/syncStatus')
  assert.equal(status.status, 200, `rssApi/syncStatus returned HTTP ${status.status}`)
  assert.ok(status.body?.result?.value?.status, 'syncStatus result has a status field')

  // setReading with a bogus session is still a CLAIMED endpoint (HTTP 200) that
  // answers with a business reason, not a transport 404.
  const reading = await rpc('rssApi/setReading', { request: { sessionId: 'nonexistent', articleId: 'nonexistent' } })
  assert.equal(reading.status, 200, `rssApi/setReading returned HTTP ${reading.status} (endpoint not claimed)`)

  // The discuss buttons (总结/翻译/提取要点/发送) all call discussArticle; prove
  // it is CLAIMED (HTTP 200 even for a bogus session) so the UI never hits 404.
  const discuss = await rpc('rssApi/discussArticle', { request: { sessionId: 'nonexistent', articleId: 'nonexistent' } })
  assert.equal(discuss.status, 200, `rssApi/discussArticle returned HTTP ${discuss.status} (endpoint not claimed)`)
  const reason = discuss.body?.result?.value?.reason
  assert.equal(reason, 'session not found', `discussArticle answered a business reason, got: ${reason}`)

  killTree()
})