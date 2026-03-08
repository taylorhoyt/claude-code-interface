import React, { useState } from 'react'

interface ThinkingBlockProps {
  text: string
  complete: boolean
  durationMs?: number
}

export default function ThinkingBlock({ text, complete, durationMs }: ThinkingBlockProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)

  const seconds = durationMs ? (durationMs / 1000).toFixed(1) : null
  const timeLabel = seconds ? ` [${seconds}s]` : ''

  return (
    <div style={{ marginBottom: 6 }}>
      {/* Toggle row */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '2px 0',
          color: 'var(--text-faint)',
          fontSize: 11,
          cursor: 'pointer',
          letterSpacing: '0.02em',
          background: 'none',
          border: 'none'
        }}
      >
        <div style={{
          flex: 1,
          height: 1,
          background: 'var(--thinking-border)',
          opacity: 0.3
        }} />
        <span style={{ color: 'var(--thinking-border)', opacity: 0.8, whiteSpace: 'nowrap' }}>
          {complete ? `── Thinking${timeLabel}` : '── Thinking'}
          {!complete && <span style={{ animation: 'none' }}>…</span>}
        </span>
        <span style={{
          color: 'var(--thinking-border)',
          opacity: 0.6,
          fontSize: 10,
          transform: expanded ? 'rotate(90deg)' : 'none',
          display: 'inline-block',
          transition: 'transform var(--transition-fast)'
        }}>
          ▶
        </span>
        <div style={{
          flex: 1,
          height: 1,
          background: 'var(--thinking-border)',
          opacity: 0.3
        }} />
      </button>

      {/* Expanded content */}
      {expanded && text && (
        <div style={{
          margin: '6px 0 8px 0',
          padding: '10px 14px',
          background: 'var(--thinking-bg)',
          borderLeft: '3px solid var(--thinking-border)',
          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          color: 'var(--text-muted)',
          fontSize: 12,
          fontStyle: 'italic',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: 400,
          overflowY: 'auto'
        }}>
          {text}
        </div>
      )}
    </div>
  )
}
