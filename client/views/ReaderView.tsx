/** Reader sub-view: feed sidebar, article list with date navigation, the reading
 * pane, and the chat-integration bar (ambient reading context + discuss + highlight). */
import { useEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import type { ArticleView, FeedInfo } from '../types.ts'
import { switchToChatTab } from '../switchToChat.ts'

/** Preset discuss commands shown as quick buttons. */
const PRESETS: Array<{ label: string; prompt: string }> = [
  { label: '总结', prompt: '请用中文总结这篇文章的核心内容和要点。' },
  { label: '翻译', prompt: '请把这篇文章翻译成中文。' },
  { label: '提取要点', prompt: '请提取这篇文章的关键要点，用列表给出。' },
]

export interface ReaderViewProps {
  api: {
    listFeeds: () => Promise<FeedInfo[]>
    listArticlesRecent: (limit: number) => Promise<ArticleView[]>
    listArticlesByDate: (date: string) => Promise<ArticleView[]>
    listArticlesByFeed: (feedUrl: string) => Promise<ArticleView[]>
    getArticle: (articleId: string) => Promise<ArticleView | null>
    updateState: (request: { articleId: string; isRead?: boolean; isFavorite?: boolean }) => Promise<unknown>
    createNote: (request: { articleId: string; title?: string; content?: string }) => Promise<unknown>
    materialize: (request: { url: string; title?: string }) => Promise<unknown>
    listNotes: (articleId: string) => Promise<{ notes: Array<{ notePath: string; createdAt: string }> }>
    warmSync: (limit?: number, timeoutMs?: number, reason?: string) => Promise<unknown>
    setReading: (request: { sessionId: string; articleId: string }) => Promise<{ ok: boolean; reason?: string }>
    discussArticle: (request: { sessionId: string; articleId: string; prompt?: string; highlight?: string }) => Promise<{ ok: boolean; reason?: string }>
  }
  /** Current session id for chat integration; undefined when no session is open. */
  sessionId?: string
  onSyncDone: () => void
}

const fmtDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function ReaderView({ api, sessionId, onSyncDone }: ReaderViewProps) {
  const [feeds, setFeeds] = useState<FeedInfo[]>([])
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null)
  const [date, setDate] = useState(() => new Date())
  const [articles, setArticles] = useState<ArticleView[]>([])
  const [selected, setSelected] = useState<ArticleView | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [notes, setNotes] = useState<Array<{ notePath: string; createdAt: string }>>([])
  const [feedback, setFeedback] = useState('')
  const [query, setQuery] = useState('')
  const [question, setQuestion] = useState('')
  const [highlight, setHighlight] = useState('')
  const [discussing, setDiscussing] = useState(false)
  const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const lastReadingId = useRef<string | null>(null)

  useEffect(() => {
    void api.listFeeds().then(setFeeds).catch(() => setFeeds([]))
  }, [api])

  useEffect(() => {
    setLoading(true)
    const load = selectedFeed !== null
      ? api.listArticlesByFeed(selectedFeed)
      : api.listArticlesByDate(fmtDate(date))
    void load
      .then(list => {
        setArticles(list)
        setSelected(prev => {
          if (prev === null) return null
          const fresh = list.find(article => article.id === prev.id)
          return fresh ?? null
        })
      })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [api, selectedFeed, date])

  useEffect(() => {
    if (selected === null) return
    setNotes([])
    setHighlight('')
    void api.listNotes(selected.id).then(result => setNotes(result.notes)).catch(() => setNotes([]))
  }, [api, selected])

  // Ambient awareness: tell the session's agent which article is being read
  // (once per article id). agent.inject() parks the context without a reply.
  useEffect(() => {
    if (selected === null || sessionId === undefined) return
    if (lastReadingId.current === selected.id) return
    lastReadingId.current = selected.id
    void api.setReading({ sessionId, articleId: selected.id }).catch(() => undefined)
  }, [api, sessionId, selected])

  const openArticle = async (article: ArticleView) => {
    setSelected(article)
    if (article.isRead) return
    const fresh = await api.getArticle(article.id)
    setSelected(fresh ?? article)
    await api.updateState({ articleId: article.id, isRead: true })
    setArticles(list => list.map(item => item.id === article.id ? { ...item, isRead: true } : item))
  }

  const toggleFavorite = async (article: ArticleView) => {
    const next = !article.isFavorite
    setSelected({ ...article, isFavorite: next })
    setArticles(list => list.map(item => item.id === article.id ? { ...item, isFavorite: next } : item))
    await api.updateState({ articleId: article.id, isFavorite: next })
  }

  const saveNote = async () => {
    if (selected === null || noteText.trim() === '') return
    const result = await api.createNote({ articleId: selected.id, content: noteText })
    const path = (result as { notePath?: string }).notePath ?? ''
    setNotes(list => [...list, { notePath: path, createdAt: new Date().toISOString() }])
    setNoteText('')
    setFeedback('Note saved')
  }

  const discuss = async (prompt: string) => {
    if (selected === null || sessionId === undefined) return
    setDiscussing(true)
    try {
      const result = await api.discussArticle({
        sessionId,
        articleId: selected.id,
        prompt: prompt.trim() === '' ? undefined : prompt,
        highlight: highlight.trim() === '' ? undefined : highlight,
      })
      setFeedback(result.ok ? '已发送到对话 →' : `发送失败：${result.reason ?? ''}`)
      if (result.ok) {
        setQuestion('')
        setHighlight('')
        // Bring the user back to the Chat tab so they see the agent's reply.
        switchToChatTab()
      }
    } catch (error) {
      setFeedback(`发送失败：${(error as Error).message}`)
    } finally {
      setDiscussing(false)
    }
  }

  // Capture a text selection inside the article body as a highlight range.
  const onBodyMouseUp = () => {
    const selection = window.getSelection()
    const text = selection === null ? '' : selection.toString().trim()
    if (text === '') return
    if (bodyRef.current !== null && selection !== null && selection.anchorNode !== null) {
      if (bodyRef.current.contains(selection.anchorNode)) {
        setHighlight(text)
      }
    }
  }

  const runSync = async () => {
    setSyncing(true)
    setFeedback('Syncing feeds…')
    try {
      const result = (await api.warmSync(50, 0, 'ui')) as { ok?: boolean; count?: number }
      setFeedback(result.ok ? `Sync done: ${result.count ?? 0} articles` : 'Sync finished')
      const freshFeeds = await api.listFeeds()
      setFeeds(freshFeeds)
      onSyncDone()
    } finally {
      setSyncing(false)
    }
  }

  const runSearch = (value: string) => {
    setQuery(value)
    if (queryTimer.current !== null) clearTimeout(queryTimer.current)
    if (value.trim() === '') return
    queryTimer.current = setTimeout(() => {
      setLoading(true)
      void api.listArticlesRecent(200).then(all => {
        const q = value.trim().toLowerCase()
        setArticles(all.filter(article =>
          article.title?.toLowerCase().includes(q) || article.contentSnippet?.toLowerCase().includes(q),
        ))
      }).catch(() => setArticles([])).finally(() => setLoading(false))
    }, 300)
  }

  const html = useMemo(() => {
    if (selected === null) return ''
    if (!selected.content) return ''
    return DOMPurify.sanitize(selected.content)
  }, [selected])

  const canDiscuss = selected !== null && sessionId !== undefined

  return (
    <div className="ob-body">
      {/* Column 1: feeds */}
      <aside className="ob-sidebar">
        <div className="ob-sidebar-title">Feeds</div>
        <button className={`ob-feed ${selectedFeed === null ? 'active' : ''}`} onClick={() => setSelectedFeed(null)}>
          All feeds
        </button>
        {feeds.map(feed => (
          <button
            key={feed.url}
            className={`ob-feed ${selectedFeed === feed.url ? 'active' : ''}`}
            onClick={() => setSelectedFeed(feed.url)}
          >
            {feed.name}
            <span className="ob-feed-meta">{new URL(feed.url).hostname}</span>
          </button>
        ))}
        <button className="ob-feed" onClick={runSync} disabled={syncing}>
          {syncing ? 'Syncing…' : '⟳ Sync now'}
        </button>
      </aside>

      {/* Column 2: article list */}
      <section className="ob-list">
        <div className="ob-list-header">
          <input
            type="text"
            placeholder="Search…"
            value={query}
            onChange={event => runSearch(event.target.value)}
            style={{ border: '1px solid var(--ob-border)', borderRadius: 6, padding: '5px 8px', fontSize: 12 }}
          />
          <div className="ob-date-nav">
            <button className="ob-btn" title="Previous day" onClick={() => setDate(prev => new Date(prev.getTime() - 86400000))}>‹</button>
            <button className="ob-btn" title="Next day" onClick={() => setDate(prev => new Date(prev.getTime() + 86400000))}>›</button>
          </div>
        </div>
        <div style={{ padding: '4px 12px', color: 'var(--ob-muted)', fontSize: 11 }}>
          {selectedFeed !== null ? selectedFeed : fmtDate(date)} · {articles.length} articles
        </div>
        {loading && <div className="ob-empty">Loading…</div>}
        {!loading && articles.map(article => (
          <button
            key={article.id}
            className={`ob-item ${selected?.id === article.id ? 'active' : ''} ${article.isRead ? '' : 'unread'}`}
            onClick={() => void openArticle(article)}
          >
            <div className="ob-item-title">{article.title ?? 'Untitled'}</div>
            <div className="ob-item-meta">
              <span className="ob-item-dot">{article.isFavorite ? '★' : ''}</span>
              <span>{article.feedName}</span>
              {article.pubDate ? <span>{new Date(article.pubDate).toLocaleDateString()}</span> : null}
            </div>
          </button>
        ))}
        {!loading && articles.length === 0 && <div className="ob-empty">No articles for this view.</div>}
      </section>

      {/* Column 3: reader */}
      <section className="ob-reader">
        {selected === null && <div className="ob-empty"><h3>Select an article</h3><p>Pick an item to read, highlight, and take notes.</p></div>}
        {selected !== null && (
          <>
            <h1>{selected.title ?? 'Untitled'}</h1>
            <div className="ob-article-meta">
              <span>{selected.feedName}</span>
              {selected.pubDate ? <span>{new Date(selected.pubDate).toLocaleString()}</span> : null}
              {selected.author ? <span>{selected.author}</span> : null}
              {selected.link ? <a href={selected.link} target="_blank" rel="noreferrer" style={{ color: 'var(--ob-accent)' }}>Original ↗</a> : null}
              <button className="ob-btn" onClick={() => void toggleFavorite(selected)}>
                {selected.isFavorite ? '★ Favorited' : '☆ Favorite'}
              </button>
              <button className="ob-btn" onClick={() => void api.materialize({ url: selected.link ?? '', title: selected.title ?? undefined })}>
                Save as Markdown
              </button>
            </div>

            {/* Chat-integration bar */}
            <div className="ob-note-editor" style={{ borderTop: 'none', paddingTop: 0, marginTop: 4 }}>
              {!canDiscuss && (
                <div className="ob-status">打开一个会话后，就能让 AI 总结/讨论正在读的文章。</div>
              )}
              {canDiscuss && (
                <>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--ob-muted)' }}>💬 让 AI 聊聊这篇：</span>
                    {PRESETS.map(preset => (
                      <button key={preset.label} className="ob-btn" disabled={discussing} onClick={() => void discuss(preset.prompt)}>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {highlight !== '' && (
                    <div className="ob-note-card" style={{ marginTop: 6 }}>
                      <div className="ob-note-meta">已选中片段（将一并发送）</div>
                      <div style={{ fontSize: 12 }}>{highlight.length > 160 ? `${highlight.slice(0, 160)}…` : highlight}</div>
                      <button className="ob-btn" style={{ marginTop: 4 }} onClick={() => setHighlight('')}>✕ 清除片段</button>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <input
                      type="text"
                      placeholder="或输入你的问题…"
                      value={question}
                      onChange={event => setQuestion(event.target.value)}
                      onKeyDown={event => { if (event.key === 'Enter') void discuss(question) }}
                      style={{ flex: 1, border: '1px solid var(--ob-border)', borderRadius: 6, padding: '5px 8px', fontSize: 12 }}
                    />
                    <button className="ob-btn primary" disabled={discussing || question.trim() === ''} onClick={() => void discuss(question)}>
                      {discussing ? '发送中…' : '发送'}
                    </button>
                  </div>
                  <div className="ob-status" style={{ marginTop: 4 }}>{feedback.startsWith('已发送') ? feedback : ''}</div>
                </>
              )}
            </div>

            {html !== '' && <div ref={bodyRef} className="ob-article-body" onMouseUp={onBodyMouseUp} dangerouslySetInnerHTML={{ __html: html }} />}
            {html === '' && <div className="ob-empty">No full text. <a href={selected.link ?? ''} target="_blank" rel="noreferrer">Open original ↗</a></div>}
            <div className="ob-note-editor">
              <textarea
                placeholder="Write a note or highlight…"
                value={noteText}
                onChange={event => setNoteText(event.target.value)}
              />
              <div className="ob-note-actions">
                <span className="ob-status">{feedback.startsWith('已发送') ? '' : feedback}</span>
                <button className="ob-btn primary" onClick={() => void saveNote()} disabled={noteText.trim() === ''}>Save note</button>
              </div>
              {notes.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {notes.map(note => (
                    <div key={note.notePath} className="ob-note-card">
                      <div className="ob-note-meta">{new Date(note.createdAt).toLocaleString()}</div>
                      <div style={{ fontSize: 12, wordBreak: 'break-all' }}>{note.notePath}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
