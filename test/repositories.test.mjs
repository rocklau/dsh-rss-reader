import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openRssDatabase, Repositories, withTransaction } from '../lib/internal.js'

test('migrations create the full schema', () => {
  const dir = mkdtempSync(join(tmpdir(), 'openbook-db-'))
  const db = openRssDatabase(join(dir, 'test.db'))
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all().map((r) => r.name)
  for (const expected of ['feeds', 'fetch_cache', 'feed_sync_state', 'feed_sync_log', 'articles', 'article_state', 'article_notes', 'activity_log']) {
    assert.ok(tables.includes(expected), `missing table ${expected}`)
  }
  db.close()
})

test('repositories round-trip feeds, articles, state, notes, activity', () => {
  const dir = mkdtempSync(join(tmpdir(), 'openbook-repo-'))
  const db = openRssDatabase(join(dir, 'test.db'))
  const repos = new Repositories(db)

  repos.upsertFeed('https://example.com/rss', 'Example')
  assert.equal(repos.feedExists('https://example.com/rss'), true)
  assert.equal(repos.countFeeds(), 1)

  repos.upsertArticles([{
    id: 'a'.repeat(64),
    feed_url: 'https://example.com/rss',
    guid: 'g1',
    link: 'https://example.com/post/1',
    title: 'First',
    author: 'Author',
    published_at: '2026-08-01T00:00:00.000Z',
    content_html: '<p>hi</p>',
    content_snippet: 'hi',
    markdown_path: null,
  }])

  const recent = repos.listArticlesRecent(10)
  assert.equal(recent.length, 1)
  assert.equal(recent[0].title, 'First')

  const byDate = repos.listArticlesByDate('2026-08-01T00:00:00.000Z', '2026-08-01T23:59:59.999Z', 10)
  assert.equal(byDate.length, 1)

  repos.setArticleState('a'.repeat(64), 1, 1)
  const state = repos.getArticleState('a'.repeat(64))
  assert.equal(state.is_read, 1)
  assert.equal(state.is_favorite, 1)

  repos.insertNote('a'.repeat(64), '/tmp/note.md')
  assert.equal(repos.listNotesByArticle('a'.repeat(64)).length, 1)

  repos.logActivity('state', 'a'.repeat(64), '{"isRead":true}')
  const activity = repos.listActivity(10, 0)
  assert.equal(activity.length, 1)
  assert.equal(activity[0].type, 'state')

  const search = repos.searchArticles('First', 10)
  assert.equal(search.length, 1)

  // upsert is idempotent on the stable id
  repos.upsertArticles([{
    id: 'a'.repeat(64),
    feed_url: 'https://example.com/rss',
    guid: 'g1',
    link: 'https://example.com/post/1',
    title: 'First updated',
    author: null,
    published_at: null,
    content_html: null,
    content_snippet: null,
    markdown_path: null,
  }])
  assert.equal(repos.listArticlesRecent(10).length, 1)
  assert.equal(repos.listArticlesRecent(10)[0].title, 'First updated')
  db.close()
})

test('withTransaction rolls back on throw', () => {
  const dir = mkdtempSync(join(tmpdir(), 'openbook-tx-'))
  const db = openRssDatabase(join(dir, 'test.db'))
  const repos = new Repositories(db)
  assert.throws(() => withTransaction(db, () => {
    repos.upsertFeed('https://example.com/rss', 'X')
    throw new Error('boom')
  }))
  assert.equal(repos.countFeeds(), 0)
  db.close()
})
