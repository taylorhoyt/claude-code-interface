import React from 'react'
import { useStore } from '../store'

export default function SessionList(): React.JSX.Element {
  const { sessions, activeSessionId, createSession, setActiveSession, deleteSession } = useStore()

  const grouped = groupByDate(sessions)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      userSelect: 'none'
    }}>
      {/* Header / drag region */}
      <div style={{
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        paddingTop: 8,
        paddingLeft: 72,
        WebkitAppRegion: 'drag' as unknown as React.CSSProperties['WebkitAppRegion'],
        flexShrink: 0
      }}>
        <span style={{ color: 'var(--text-faint)', fontSize: 11, letterSpacing: '0.1em' }}>
          SESSIONS
        </span>
      </div>

      {/* New session button */}
      <div style={{ padding: '0 10px 8px' }}>
        <button
          onClick={() => createSession()}
          style={{
            width: '100%',
            padding: '6px 10px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all var(--transition-fast)',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)'
            e.currentTarget.style.borderColor = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>⊕</span>
          <span>New session</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.5 }}>⌘N</span>
        </button>
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 12px' }}>
        {sessions.length === 0 && (
          <div style={{
            padding: '20px 12px',
            color: 'var(--text-faint)',
            fontSize: 12,
            textAlign: 'center',
            lineHeight: 1.8
          }}>
            No sessions yet.<br />
            Start a new one.
          </div>
        )}
        {grouped.map(({ label, items }) => (
          <div key={label}>
            <div style={{
              padding: '10px 6px 4px',
              fontSize: 10,
              color: 'var(--text-faint)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              {label}
            </div>
            {items.map((session) => (
              <SessionItem
                key={session.localId}
                title={session.title}
                isActive={session.localId === activeSessionId}
                onClick={() => setActiveSession(session.localId)}
                onDelete={() => deleteSession(session.localId)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function SessionItem({
  title,
  isActive,
  onClick,
  onDelete
}: {
  title: string
  isActive: boolean
  onClick: () => void
  onDelete: () => void
}): React.JSX.Element {
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '5px 8px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        background: isActive ? 'var(--bg-elevated)' : hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        marginBottom: 1,
        gap: 6,
        transition: 'background var(--transition-fast)'
      }}
    >
      <span style={{
        flex: 1,
        fontSize: 12,
        color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {title}
      </span>
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          style={{
            flexShrink: 0,
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 3,
            color: 'var(--text-faint)',
            fontSize: 12,
            transition: 'color var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-faint)'}
        >
          ×
        </button>
      )}
    </div>
  )
}

function groupByDate(sessions: Array<{ localId: string; title: string; createdAt: number }>): Array<{ label: string; items: typeof sessions }> {
  const now = Date.now()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const lastWeek = new Date(today)
  lastWeek.setDate(today.getDate() - 7)

  const buckets: Record<string, typeof sessions> = {
    Today: [],
    Yesterday: [],
    'Last 7 days': [],
    Older: []
  }

  for (const session of sessions) {
    const d = new Date(session.createdAt)
    if (d >= today) buckets['Today'].push(session)
    else if (d >= yesterday) buckets['Yesterday'].push(session)
    else if (d >= lastWeek) buckets['Last 7 days'].push(session)
    else buckets['Older'].push(session)
  }

  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}
