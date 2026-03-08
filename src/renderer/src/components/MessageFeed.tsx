import React from 'react'
import { Turn } from '../store'
import UserMessage from './UserMessage'
import AssistantTurn from './AssistantTurn'

interface MessageFeedProps {
  turns: Turn[]
}

export default function MessageFeed({ turns }: MessageFeedProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {turns.map((turn, i) => (
        <React.Fragment key={turn.id}>
          <UserMessage message={turn.userMessage} />
          <AssistantTurn
            events={turn.events}
            isStreaming={turn.isStreaming}
          />
          {i < turns.length - 1 && (
            <div style={{
              margin: '8px 32px',
              borderTop: '1px solid var(--border-subtle)'
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
