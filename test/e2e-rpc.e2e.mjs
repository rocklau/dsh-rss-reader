/** Read-only RPC checks against an explicitly supplied, already-running Harness. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const base = process.env.DSH_E2E_BASE

async function rpc(endpoint, args = {}) {
  const rpcId = randomUUID()
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.DSH_E2E_COOKIE ? { cookie: process.env.DSH_E2E_COOKIE } : {}),
    },
    body: JSON.stringify({ type: 'client-request', rpcId, method: endpoint, payload: { args } }),
    signal: AbortSignal.timeout(15000),
  })
  assert.equal(response.status, 200, `${endpoint}: HTTP ${response.status}`)
  const envelope = await response.json()
  assert.equal(envelope.rpcId, rpcId)
  assert.equal(envelope.result.ok, true, `${endpoint}: RPC failed`)
  return envelope.result.value
}

test('installed RSS endpoints respond over the current authenticated unary transport', async t => {
  if (!base) {
    t.skip('set DSH_E2E_BASE and, when needed, DSH_E2E_COOKIE for an already-running authenticated Host')
    return
  }
  assert.ok(Array.isArray(await rpc('rssApi/listFeeds')))
  assert.ok((await rpc('rssApi/syncStatus')).status)
  assert.deepEqual(await rpc('rssApi/setReading', {
    request: { sessionId: 'rss-e2e-missing-session', articleId: 'missing' },
  }), { ok: false, reason: 'session not found' })
})
