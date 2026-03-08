import React, { useEffect, useRef } from 'react'
import { useStore } from './store'
import SessionList from './components/SessionList'
import Workspace from './components/Workspace'
import type { CliEvent } from './env'

export default function App(): React.JSX.Element {
  const {
    activeSessionId,
    isStreaming,
    createSession,
    addTurn,
    appendTextDelta,
    appendThinkingDelta,
    setThinkingFull,
    setTextFull,
    addToolStart,
    completeToolCall,
    completeTurn,
    abortTurn,
    setStreaming
  } = useStore()

  // Track active turn for event routing
  const activeTurnRef = useRef<{ sessionId: string; turnId: string } | null>(null)

  useEffect(() => {
    const unsub = window.cc.onEvent((event: CliEvent) => {
      const ctx = activeTurnRef.current
      if (!ctx) return

      switch (event.type) {
        case 'text_delta':
          appendTextDelta(ctx.sessionId, ctx.turnId, event.delta)
          break
        case 'thinking_delta':
          appendThinkingDelta(ctx.sessionId, ctx.turnId, event.delta)
          break
        case 'text_full':
          setTextFull(ctx.sessionId, ctx.turnId, event.text)
          break
        case 'thinking_full':
          setThinkingFull(ctx.sessionId, ctx.turnId, event.text)
          break
        case 'tool_start':
          addToolStart(ctx.sessionId, ctx.turnId, {
            id: event.id,
            name: event.name,
            colorType: event.colorType as 'read' | 'write' | 'bash' | 'other',
            summary: event.summary
          })
          break
        case 'tool_end':
          completeToolCall(ctx.sessionId, ctx.turnId, event.id, event.durationMs, event.status)
          break
        case 'done':
          completeTurn(ctx.sessionId, ctx.turnId, event.sessionId)
          activeTurnRef.current = null
          break
        case 'process_closed':
          completeTurn(ctx.sessionId, ctx.turnId)
          activeTurnRef.current = null
          break
        case 'aborted':
          abortTurn(ctx.sessionId, ctx.turnId)
          activeTurnRef.current = null
          break
        case 'error':
          appendTextDelta(ctx.sessionId, ctx.turnId, `\n\n_Error: ${event.message}_`)
          completeTurn(ctx.sessionId, ctx.turnId)
          activeTurnRef.current = null
          break
      }
    })
    return unsub
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        createSession()
      }
      if (e.key === 'Escape' && isStreaming) {
        window.cc.abort()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isStreaming, createSession])

  const handleSend = async (prompt: string): Promise<void> => {
    const state = useStore.getState()
    let sessionId = state.activeSessionId
    if (!sessionId) {
      sessionId = createSession()
    }

    const session = useStore.getState().sessions.find((s) => s.localId === sessionId)
    if (!session) return

    const turnId = addTurn(sessionId, prompt)
    activeTurnRef.current = { sessionId, turnId }

    await window.cc.send({
      prompt,
      sessionId: session.claudeSessionId,
      model: state.model,
      permissionMode: state.permissionMode,
      cwd: state.cwd
    })
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `var(--sidebar-width) 1fr`,
      gridTemplateRows: '1fr',
      height: '100vh',
      background: 'var(--bg-base)',
      overflow: 'hidden'
    }}>
      <SessionList />
      <Workspace onSend={handleSend} />
    </div>
  )
}
