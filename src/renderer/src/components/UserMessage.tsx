import React from 'react'

interface UserMessageProps {
  message: string
}

export default function UserMessage({ message }: UserMessageProps): React.JSX.Element {
  return (
    <div style={{
      padding: '12px 32px',
      marginBottom: 4
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '10px 14px',
        display: 'inline-block',
        maxWidth: '100%'
      }}>
        <div style={{
          fontSize: 10,
          color: 'var(--text-faint)',
          marginBottom: 5,
          letterSpacing: '0.08em'
        }}>
          YOU
        </div>
        <div style={{
          color: 'var(--text-primary)',
          fontSize: 13,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.6
        }}>
          {message}
        </div>
      </div>
    </div>
  )
}
