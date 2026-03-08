import React, { useState } from 'react'
import { useStore, selectActiveSession } from '../store'

const MODELS = [
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { id: 'claude-opus-4-6', label: 'Opus 4.6' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' }
]

const PERMISSION_MODES = [
  { id: 'default', label: 'default' },
  { id: 'plan', label: 'plan' },
  { id: 'acceptEdits', label: 'accept edits' },
  { id: 'bypassPermissions', label: 'bypass' }
]

export default function Header(): React.JSX.Element {
  const { model, setModel, permissionMode, setPermissionMode, cwd } = useStore()
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [showModeMenu, setShowModeMenu] = useState(false)

  const currentModel = MODELS.find((m) => m.id === model)
  const currentMode = PERMISSION_MODES.find((m) => m.id === permissionMode)

  const shortCwd = cwd.replace(/^\/Users\/[^/]+/, '~')

  return (
    <div
      style={{
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        gap: 12,
        flexShrink: 0,
        WebkitAppRegion: 'drag' as unknown as React.CSSProperties['WebkitAppRegion'],
        position: 'relative',
        zIndex: 10
      }}
    >
      {/* CWD */}
      <span style={{
        fontSize: 11,
        color: 'var(--text-faint)',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {shortCwd}
      </span>

      {/* Permission mode */}
      <div style={{ position: 'relative', WebkitAppRegion: 'no-drag' as unknown as React.CSSProperties['WebkitAppRegion'] }}>
        <button
          onClick={() => { setShowModeMenu(!showModeMenu); setShowModelMenu(false) }}
          style={{
            padding: '3px 8px',
            background: permissionMode !== 'default' ? 'rgba(107,140,218,0.15)' : 'var(--bg-elevated)',
            border: `1px solid ${permissionMode !== 'default' ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)',
            color: permissionMode !== 'default' ? 'var(--accent)' : 'var(--text-muted)',
            fontSize: 11,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          {currentMode?.label ?? permissionMode}
        </button>
        {showModeMenu && (
          <DropMenu
            items={PERMISSION_MODES}
            current={permissionMode}
            onSelect={(id) => { setPermissionMode(id); setShowModeMenu(false) }}
            onClose={() => setShowModeMenu(false)}
          />
        )}
      </div>

      {/* Model selector */}
      <div style={{ position: 'relative', WebkitAppRegion: 'no-drag' as unknown as React.CSSProperties['WebkitAppRegion'] }}>
        <button
          onClick={() => { setShowModelMenu(!showModelMenu); setShowModeMenu(false) }}
          style={{
            padding: '3px 8px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
            fontSize: 11,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          {currentModel?.label ?? model} ▾
        </button>
        {showModelMenu && (
          <DropMenu
            items={MODELS}
            current={model}
            onSelect={(id) => { setModel(id); setShowModelMenu(false) }}
            onClose={() => setShowModelMenu(false)}
          />
        )}
      </div>
    </div>
  )
}

function DropMenu({
  items,
  current,
  onSelect,
  onClose
}: {
  items: { id: string; label: string }[]
  current: string
  onSelect: (id: string) => void
  onClose: () => void
}): React.JSX.Element {
  useOutsideClick(onClose)

  return (
    <div style={{
      position: 'absolute',
      top: 'calc(100% + 4px)',
      right: 0,
      minWidth: 140,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      zIndex: 100,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
    }}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item.id)}
          style={{
            padding: '7px 12px',
            fontSize: 12,
            color: item.id === current ? 'var(--accent)' : 'var(--text-primary)',
            background: item.id === current ? 'rgba(107,140,218,0.1)' : 'transparent',
            cursor: 'pointer',
            transition: 'background var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            if (item.id !== current) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          }}
          onMouseLeave={(e) => {
            if (item.id !== current) e.currentTarget.style.background = 'transparent'
          }}
        >
          {item.label}
        </div>
      ))}
    </div>
  )
}

function useOutsideClick(handler: () => void): void {
  const ref = React.useRef<boolean>(false)
  React.useEffect(() => {
    ref.current = false
    const onClick = (): void => {
      if (ref.current) { ref.current = false; return }
      handler()
    }
    // Delay to avoid immediate close
    const timer = setTimeout(() => document.addEventListener('click', onClick), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', onClick)
    }
  }, [handler])
}
