import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import CodeBlock from './CodeBlock'

interface AssistantTextProps {
  content: string
  showCursor: boolean
}

export default function AssistantText({ content, showCursor }: AssistantTextProps): React.JSX.Element {
  return (
    <div style={{ marginTop: 8 }}>
      <div className="prose">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '')
              const isBlock = !!(node?.position?.start.line !== node?.position?.end.line || match)
              if (isBlock || match) {
                return (
                  <CodeBlock
                    code={String(children).replace(/\n$/, '')}
                    language={match?.[1] ?? 'text'}
                  />
                )
              }
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
      {showCursor && (
        <span style={{
          display: 'inline-block',
          width: 7,
          height: 13,
          background: 'var(--accent)',
          marginLeft: 2,
          verticalAlign: 'text-bottom',
          animation: 'blink 1s step-end infinite',
          borderRadius: 1
        }} />
      )}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
