/** Chat renderer for one rss/sync node: a compact sync-run card. */
import { memo } from 'react'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { RssSyncChatData } from './syncDefinition.ts'

export interface SyncNodeViewProps {
  node: ChatNode<'rss/sync'>
}

const STATUS_LABEL: Record<RssSyncChatData['status'], string> = {
  running: '⟳ running',
  success: '✓ done',
  timeout: '⏱ timeout',
  error: '✗ failed',
}

/** One OpenBook sync run card in the chat flow. */
export const SyncNodeView = memo(function SyncNodeView({ node }: SyncNodeViewProps) {
  const data = node.data as RssSyncChatData
  const summary = data.summary
  return (
    <div
      style={{
        border: '1px solid var(--ob-border, #e4e1d8)',
        borderRadius: 8,
        padding: '10px 12px',
        margin: '4px 0',
        background: 'var(--ob-panel, #ffffff)',
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: data.status === 'error' ? '#c0392b' : 'inherit' }}>
          📡 RSS sync · {data.reason}
        </strong>
        <span style={{ opacity: 0.7 }}>{STATUS_LABEL[data.status]}</span>
      </div>
      <div style={{ marginTop: 4, color: '#666' }}>
        feeds={data.feedCount} checked={data.checked} articles={data.count}
        {data.error !== undefined && <span style={{ color: '#c0392b' }}> · {data.error}</span>}
      </div>
      {summary !== null && data.status !== 'running' && (
        <div style={{ marginTop: 4, color: '#666' }}>
          new={summary.new_articles_count} fetch={summary.network_fetch_count} cached={summary.cache_fallback_count} 304={summary.head_not_modified_count + summary.conditional_not_modified_count}
        </div>
      )}
      <div style={{ marginTop: 2, opacity: 0.5 }}>{new Date(data.startedAt).toLocaleString()}</div>
    </div>
  )
})
