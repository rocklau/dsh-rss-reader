/** Shared RSS content: the tab bar plus reader/notes/status bodies. */
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { RssDataApi } from '../api.ts'
import { NotesView } from './NotesView.tsx'
import { ReaderView } from './ReaderView.tsx'
import { StatusView } from './StatusView.tsx'

export type RssTab = 'reader' | 'notes' | 'status'

const TABS: Array<{ id: RssTab; label: string }> = [
  { id: 'reader', label: 'Reader' },
  { id: 'notes', label: 'Notes' },
  { id: 'status', label: 'Status' },
]

export interface RssContentProps {
  api: RssDataApi
  /** Current session id (for ambient context + discuss); undefined when no session is open. */
  sessionId?: string
  /** Optional extra toolbar node rendered beside the tabs (e.g. the panel close button). */
  toolbar?: ReactNode
}

/** The OpenBook reading surface: tab bar plus the active tab's body. */
export function RssContent({ api, sessionId, toolbar }: RssContentProps) {
  const [tab, setTab] = useState<RssTab>('reader')
  const [revision, setRevision] = useState(0)

  return (
    <div className="openbook-rss">
      <div className="ob-tabs">
        {TABS.map(item => (
          <button key={item.id} className={`ob-tab ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
        {toolbar !== undefined && <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>{toolbar}</span>}
      </div>
      {tab === 'reader' && <ReaderView key={revision} api={api} sessionId={sessionId} onSyncDone={() => setRevision(r => r + 1)} />}
      {tab === 'notes' && <NotesView api={api} />}
      {tab === 'status' && <StatusView api={api} />}
    </div>
  )
}
