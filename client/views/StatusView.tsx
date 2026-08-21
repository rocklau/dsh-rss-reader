/** Status sub-view: sync state, statistics, and the activity stream (the Agent JSON view's successor). */
import { useEffect, useState } from 'react'
import type { ActivityItem, SyncStatus } from '../types.ts'

export interface StatusViewProps {
  api: {
    syncStatus: () => Promise<SyncStatus>
    activity: (limit: number) => Promise<{ items: ActivityItem[] }>
    listFeeds: () => Promise<Array<{ url: string; name: string }>>
  }
}

export function StatusView({ api }: StatusViewProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [items, setItems] = useState<ActivityItem[]>([])
  const [feedCount, setFeedCount] = useState(0)

  useEffect(() => {
    void api.syncStatus().then(setStatus).catch(() => setStatus(null))
    void api.activity(50).then(result => setItems(result.items)).catch(() => setItems([]))
    void api.listFeeds().then(feeds => setFeedCount(feeds.length)).catch(() => setFeedCount(0))
  }, [api])

  const summary = status?.lastSummary
  const stats = [
    { label: 'Feeds', value: feedCount },
    { label: 'Last sync', value: status?.lastCount ?? 0 },
    { label: 'New articles', value: summary?.new_articles_count ?? 0 },
    { label: 'Feeds checked', value: summary?.feeds_checked ?? 0 },
    { label: 'Network fetches', value: summary?.network_fetch_count ?? 0 },
    { label: 'Cache fallbacks', value: summary?.cache_fallback_count ?? 0 },
    { label: 'HTTP 304', value: (summary?.head_not_modified_count ?? 0) + (summary?.conditional_not_modified_count ?? 0) },
  ]

  return (
    <div className="ob-status-view">
      <div className="ob-stat-grid">
        {stats.map(stat => (
          <div key={stat.label} className="ob-stat">
            <div className="ob-stat-value">{stat.value}</div>
            <div className="ob-stat-label">{stat.label}</div>
          </div>
        ))}
        <div className="ob-stat">
          <div className="ob-stat-value" style={{ color: status?.status === 'error' ? '#c0392b' : status?.status === 'running' ? 'var(--ob-accent)' : undefined }}>
            {status?.status ?? '—'}
          </div>
          <div className="ob-stat-label">Sync status{status?.inFlight ? ' (running)' : ''}</div>
        </div>
      </div>
      {status?.lastError && <div className="ob-note-card" style={{ color: '#c0392b' }}>Last error: {status.lastError}</div>}
      {status?.startedAt && <div className="ob-status" style={{ marginBottom: 8 }}>Last run: {new Date(status.startedAt).toLocaleString()}</div>}
      <div className="ob-activity">
        <div className="ob-sidebar-title">Recent activity</div>
        {items.map(item => (
          <div key={item.id} className="ob-activity-row">
            <strong>[{item.type}]</strong> {String(item.article?.title ?? item.payload.title ?? item.articleId ?? '')}
            <span className="ob-status"> · {new Date(item.createdAt).toLocaleString()}</span>
          </div>
        ))}
        {items.length === 0 && <div className="ob-empty">No activity yet.</div>}
      </div>
    </div>
  )
}
