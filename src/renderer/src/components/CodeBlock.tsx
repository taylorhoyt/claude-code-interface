import React, { useEffect, useState } from 'react'
import { codeToHtml } from 'shiki'

interface CodeBlockProps {
  code: string
  language: string
}

export default function CodeBlock({ code, language }: CodeBlockProps): React.JSX.Element {
  const [html, setHtml] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    codeToHtml(code, {
      lang: language,
      theme: 'tokyo-night'
    }).then((result) => {
      if (!cancelled) setHtml(result)
    }).catch(() => {
      // Fallback: render as plain text if language not found
      if (!cancelled) setHtml('')
    })
    return () => { cancelled = true }
  }, [code, language])

  if (!html) {
    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        margin: '8px 0',
        overflowX: 'auto'
      }}>
        <pre style={{ margin: 0 }}>
          <code style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--text-code)',
            lineHeight: 1.6
          }}>
            {code}
          </code>
        </pre>
      </div>
    )
  }

  return (
    <div style={{
      margin: '8px 0',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      border: '1px solid var(--border)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '5px 12px',
        background: '#0d0f1a',
        borderBottom: '1px solid var(--border)'
      }}>
        <span style={{
          fontSize: 10,
          color: 'var(--text-faint)',
          letterSpacing: '0.06em'
        }}>
          {language}
        </span>
        <CopyButton code={code} />
      </div>
      <div
        style={{ overflowX: 'auto', fontSize: 12, lineHeight: 1.6 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

function CopyButton({ code }: { code: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const copy = (): void => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={copy}
      style={{
        marginLeft: 'auto',
        fontSize: 10,
        color: copied ? 'var(--tool-write)' : 'var(--text-faint)',
        padding: '1px 6px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        transition: 'color var(--transition-fast)'
      }}
      onMouseEnter={(e) => { if (!copied) e.currentTarget.style.color = 'var(--text-muted)' }}
      onMouseLeave={(e) => { if (!copied) e.currentTarget.style.color = 'var(--text-faint)' }}
    >
      {copied ? '✓ copied' : 'copy'}
    </button>
  )
}
