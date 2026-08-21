/** Notes sub-view: the activity-driven waterfall of notes, highlights, and favorites. */
import { useEffect, useState } from 'react'
import type { ActivityItem } from '../types.ts'

export interface NotesViewProps {
  api: {
    activity: (limit: number) => Promise<{ items: ActivityItem[] }>
    listArticlesByFeed: (feedUrl: string) => Promise<unknown[]>
  }
}

const FILTERS = ['All', 'Today', 'Week', 'Favorites', 'Highlights'] as const
type Filter = (typeof FILTERS)[number]

export function NotesView({ api }: NotesViewProps) {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [filter, setFilter] = useState<Filter>('All')
  const [visible, setVisible] = useState(30)

  useEffect(() => {
    void api.activity(300).then(result => setItems(result.items)).catch(() => setItems([]))
  }, [api])

  const filtered = items.filter(item => {
    if (filter === 'All') return true
    const time = new Date(item.createdAt)
    const now = new Date()
    if (filter === 'Today') return time.toDateString() === now.toDateString()
    if (filter === 'Week') return now.getTime() - time.getTime() < 7 * 86400000
    if (filter === 'Favorites') return item.type === 'state' && item.payload.isFavorite === true
    if (filter === 'Highlights') return item.type === 'note'
    return true
  })

  return (
    <div className="ob-notes">
      <div className="ob-toolbar" style={{ border: 'none', padding: '0 0 12px' }}>
        {FILTERS.map(name => (
          <button key={name} className={`ob-btn ${filter === name ? 'primary' : ''}`} onClick={() => { setFilter(name); setVisible(30) }}>
            {name}
          </button>
        ))}
      </div>
      {filtered.length === 0 && <div className="ob-empty">Nothing here yet. Save notes or favorite articles while reading.</div>}
      {filtered.slice(0, visible).map(item => (
        <div key={item.id} className="ob-note-card">
          <div className="ob-note-title">
            {item.type === 'note' ? '📝 ' : item.type === 'state' ? '⭐ ' : '📄 '}
            {String(item.article?.title ?? item.payload.title ?? item.articleId ?? '—')}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            {item.type === 'note' && <div>{String(item.payload.content ?? '')}</div>}
            {item.type === 'state' && <div>read={item.payload.isRead ? 'yes' : 'no'} · favorite={item.payload.isFavorite ? 'yes' : 'no'}</div>}
            {item.type === 'materialize' && <div>materialized → {String(item.payload.markdownPath ?? item.article?.markdownPath ?? '')}</div>}
          </div>
          <div className="ob-note-meta">
            {new Date(item.createdAt).toLocaleString()}
            {item.article?.link ? <a href={item.article.link} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: 'var(--ob-accent)' }}>原文 ↗</a> : null}
          </div>
        </div>
      ))}
      {visible < filtered.length && (
        <button className="ob-btn" style={{ width: '100%', marginTop: 8 }} onClick={() => setVisible(v => v + 30)}>
          Load more ({filtered.length - visible} remaining)
        </button>
      )}
    </div>
  )
}
