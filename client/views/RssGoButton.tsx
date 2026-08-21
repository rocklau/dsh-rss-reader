/** RssGoButton: one-click sidebar shortcut that jumps to the RSS conversation-view tab. */
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'

export interface RssGoButtonInjected {
  goToRss: () => void
}

type RssGoButtonProps = InjectFace<RssGoButtonInjected> & { wide: boolean }

/** One sidebar.footer.action entry: jump straight to the RSS reading tab. */
export function RssGoButton({ wide, goToRss }: RssGoButtonProps) {
  return (
    <button
      onClick={goToRss}
      title="Open the RSS reader"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        border: 'none',
        background: 'transparent',
        color: 'inherit',
        padding: wide ? '8px 12px' : '8px',
        cursor: 'pointer',
        borderRadius: 6,
        fontSize: 13,
      }}
    >
      <span>📡</span>
      {wide && <span>RSS</span>}
    </button>
  )
}