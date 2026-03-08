import React, { useRef, useEffect } from 'react'
import { useStore, selectActiveSession } from '../store'
import MessageFeed from './MessageFeed'
import InputArea from './InputArea'
import Header from './Header'

interface WorkspaceProps {
  onSend: (prompt: string) => Promise<void>
}

export default function Workspace({ onSend }: WorkspaceProps): React.JSX.Element {
  const session = useStore(selectActiveSession)
  const isStreaming = useStore((s) => s.isStreaming)
  const feedRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  })

  if (!session) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg-base)'
      }}>
        <Header />
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          color: 'var(--text-faint)'
        }}>
          <div style={{ fontSize: 32, opacity: 0.3 }}>◈</div>
          <div style={{ fontSize: 13 }}>Start a new session to begin</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', opacity: 0.7 }}>⌘N</div>
        </div>
        <InputArea onSend={onSend} disabled={false} />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg-base)'
    }}>
      <Header />

      {session.turns.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          color: 'var(--text-faint)'
        }}>
          <div style={{ fontSize: 24, opacity: 0.25 }}>◈</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>What are we working on?</div>
        </div>
      ) : (
        <div
          ref={feedRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 0'
          }}
        >
          <MessageFeed turns={session.turns} />
        </div>
      )}

      <InputArea onSend={onSend} disabled={isStreaming} />
    </div>
  )
}
