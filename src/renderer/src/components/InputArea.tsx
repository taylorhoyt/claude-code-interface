import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'

interface InputAreaProps {
  onSend: (prompt: string) => Promise<void>
  disabled: boolean
}

export default function InputArea({ onSend, disabled }: InputAreaProps): React.JSX.Element {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isStreaming = useStore((s) => s.isStreaming)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = (): void => {
    const prompt = value.trim()
    if (!prompt || disabled) return
    setValue('')
    onSend(prompt)
  }

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      padding: '12px 32px 16px',
      background: 'var(--bg-base)',
      flexShrink: 0
    }}>
      <div style={{
        background: 'var(--bg-input)',
        border: `1px solid ${disabled ? 'var(--border-subtle)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'border-color var(--transition-fast)'
      }}
        onFocus={() => {}}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? 'Working…' : 'Message…'}
          rows={1}
          style={{
            resize: 'none',
            overflow: 'hidden',
            width: '100%',
            background: 'none',
            border: 'none',
            outline: 'none',
            color: disabled ? 'var(--text-faint)' : 'var(--text-primary)',
            fontSize: 13,
            lineHeight: 1.6,
            fontFamily: 'var(--font-mono)',
            minHeight: '1.6em',
            maxHeight: 200
          }}
        />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8
        }}>
          {isStreaming ? (
            <button
              onClick={() => window.cc.abort()}
              style={{
                padding: '4px 12px',
                background: 'rgba(201, 107, 107, 0.15)',
                border: '1px solid rgba(201, 107, 107, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: '#c96b6b',
                fontSize: 11,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              ⎋ Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!value.trim()}
              style={{
                padding: '4px 12px',
                background: value.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
                border: `1px solid ${value.trim() ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                color: value.trim() ? 'white' : 'var(--text-faint)',
                fontSize: 11,
                cursor: value.trim() ? 'pointer' : 'default',
                transition: 'all var(--transition-fast)'
              }}
            >
              Send ⌘↵
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
