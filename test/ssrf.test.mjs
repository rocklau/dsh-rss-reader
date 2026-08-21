import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isPrivateIp } from '../lib/internal.js'

test('isPrivateIp blocks private ranges', () => {
  assert.equal(isPrivateIp('10.0.0.1'), true)
  assert.equal(isPrivateIp('127.0.0.1'), true)
  assert.equal(isPrivateIp('169.254.169.254'), true)
  assert.equal(isPrivateIp('172.16.0.1'), true)
  assert.equal(isPrivateIp('172.31.255.255'), true)
  assert.equal(isPrivateIp('192.168.1.1'), true)
  assert.equal(isPrivateIp('0.0.0.0'), true)
  assert.equal(isPrivateIp('::1'), true)
  assert.equal(isPrivateIp('fe80::1'), true)
  assert.equal(isPrivateIp('fc00::1'), true)
  assert.equal(isPrivateIp('fd00::1'), true)
})

test('isPrivateIp allows public ranges', () => {
  assert.equal(isPrivateIp('8.8.8.8'), false)
  assert.equal(isPrivateIp('1.1.1.1'), false)
  assert.equal(isPrivateIp('172.32.0.1'), false)
  assert.equal(isPrivateIp('2001:4860:4860::8888'), false)
  assert.equal(isPrivateIp('not-an-ip'), true)
})
