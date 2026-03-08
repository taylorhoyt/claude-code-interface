import React from 'react'
import { ToolColorType } from '../store'

const COLOR_MAP: Record<ToolColorType, string> = {
  read: 'var(--tool-read)',
  write: 'var(--tool-write)',
  bash: 'var(--tool-bash)',
  other: 'var(--tool-other)'
}

interface ToolCallLineProps {
  name: string
  colorType: ToolColorType
  summary: string
  status: 'pending' | 'done' | 'error'
  durationMs?: number
}

export default function ToolCallLine({
  name,
  colorType,
  summary,
  status,
  durationMs
}: ToolCallLineProps): React.JSX.Element {
  const color = COLOR_MAP[colorType] ?? 'var(--tool-other)'
  const seconds = durationMs != null ? (durationMs / 1000).toFixed(1) : null

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '2px 0',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      lineHeight: 1.5,
      opacity: status === 'pending' ? 0.7 : 1,
      transition: 'opacity var(--transition-fast)'
    }}>
      {/* Diamond glyph */}
      <span style={{ color, flexShrink: 0, fontSize: 10 }}>◆</span>

      {/* Tool name */}
      <span style={{ color: 'var(--text-muted)', flexShrink: 0, minWidth: 40 }}>
        {name}
      </span>

      {/* Summary / path */}
      <span style={{
        color: 'var(--text-primary)',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {summary}
      </span>

      {/* Status / timing */}
      <span style={{
        color: status === 'error' ? '#c96b6b' : 'var(--text-faint)',
        flexShrink: 0,
        fontSize: 11,
        marginLeft: 4
      }}>
        {status === 'pending' && <PendingDots />}
        {status === 'done' && seconds && `${seconds}s`}
        {status === 'error' && '✗'}
      </span>
    </div>
  )
}

function PendingDots(): React.JSX.Element {
  const [dots, setDots] = React.useState(1)
  React.useEffect(() => {
    const interval = setInterval(() => setDots((d) => (d % 3) + 1), 400)
    return () => clearInterval(interval)
  }, [])
  return <span style={{ opacity: 0.5 }}>{'·'.repeat(dots)}</span>
}
