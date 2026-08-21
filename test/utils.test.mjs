import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stableId, safeFileName, parseSourceUrlFromFrontmatter } from '../lib/internal.js'

test('stableId is deterministic and feed-scoped', () => {
  const a = stableId('https://example.com/rss', 'guid-1')
  const b = stableId('https://example.com/rss', 'guid-1')
  const c = stableId('https://other.com/rss', 'guid-1')
  assert.equal(a, b)
  assert.notEqual(a, c)
  assert.match(a, /^[0-9a-f]{64}$/)
})

test('safeFileName slugifies and caps length', () => {
  assert.equal(safeFileName('Hello World!'), 'hello-world')
  assert.equal(safeFileName('  Multiple   Spaces  '), 'multiple-spaces')
  assert.equal(safeFileName('😀emoji'), 'emoji')
  assert.equal(safeFileName('a'.repeat(200)).length <= 120, true)
  assert.equal(safeFileName('///'), 'untitled')
})

test('parseSourceUrlFromFrontmatter reads the url line', () => {
  const md = '---\ntitle: "X"\nurl: "https://example.com/a"\n---\n\nbody'
  assert.equal(parseSourceUrlFromFrontmatter(md), 'https://example.com/a')
  assert.equal(parseSourceUrlFromFrontmatter('no frontmatter'), null)
})
