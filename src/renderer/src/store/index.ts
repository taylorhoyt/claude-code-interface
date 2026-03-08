import { create } from 'zustand'

export type ToolColorType = 'read' | 'write' | 'bash' | 'other'

export type TurnEvent =
  | { type: 'thinking'; text: string; durationMs?: number; complete: boolean }
  | { type: 'tool_call'; id: string; name: string; colorType: ToolColorType; summary: string; durationMs?: number; status: 'pending' | 'done' | 'error' }
  | { type: 'text'; content: string }

export interface Turn {
  id: string
  userMessage: string
  events: TurnEvent[]
  isStreaming: boolean
  startedAt: number
}

export interface Session {
  localId: string
  claudeSessionId?: string
  title: string
  cwd: string
  model: string
  permissionMode: string
  turns: Turn[]
  createdAt: number
  updatedAt: number
}

export interface AppState {
  sessions: Session[]
  activeSessionId: string | null
  model: string
  permissionMode: string
  cwd: string
  isStreaming: boolean

  // Actions
  createSession: () => string
  setActiveSession: (id: string) => void
  deleteSession: (id: string) => void

  addTurn: (sessionId: string, userMessage: string) => string
  setStreaming: (streaming: boolean) => void

  appendTextDelta: (sessionId: string, turnId: string, delta: string) => void
  appendThinkingDelta: (sessionId: string, turnId: string, delta: string) => void
  setThinkingFull: (sessionId: string, turnId: string, text: string) => void
  setTextFull: (sessionId: string, turnId: string, text: string) => void
  addToolStart: (sessionId: string, turnId: string, tool: { id: string; name: string; colorType: ToolColorType; summary: string }) => void
  completeToolCall: (sessionId: string, turnId: string, toolId: string, durationMs?: number, status?: 'done' | 'error') => void
  completeTurn: (sessionId: string, turnId: string, claudeSessionId?: string) => void
  abortTurn: (sessionId: string, turnId: string) => void

  setModel: (model: string) => void
  setPermissionMode: (mode: string) => void
  setCwd: (cwd: string) => void
}

function newLocalId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const useStore = create<AppState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  model: 'claude-sonnet-4-6',
  permissionMode: 'default',
  cwd: typeof process !== 'undefined' ? (process.env.HOME || '/') : '/',
  isStreaming: false,

  createSession: () => {
    const id = newLocalId()
    const { model, permissionMode, cwd } = get()
    const session: Session = {
      localId: id,
      title: 'New session',
      cwd,
      model,
      permissionMode,
      turns: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    set((s) => ({
      sessions: [session, ...s.sessions],
      activeSessionId: id
    }))
    return id
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  deleteSession: (id) =>
    set((s) => {
      const remaining = s.sessions.filter((sess) => sess.localId !== id)
      const nextActive = s.activeSessionId === id
        ? (remaining[0]?.localId ?? null)
        : s.activeSessionId
      return { sessions: remaining, activeSessionId: nextActive }
    }),

  addTurn: (sessionId, userMessage) => {
    const turnId = newLocalId()
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.localId !== sessionId ? sess : {
          ...sess,
          title: sess.turns.length === 0 ? userMessage.slice(0, 60) : sess.title,
          updatedAt: Date.now(),
          turns: [...sess.turns, {
            id: turnId,
            userMessage,
            events: [],
            isStreaming: true,
            startedAt: Date.now()
          }]
        }
      ),
      isStreaming: true
    }))
    return turnId
  },

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  appendTextDelta: (sessionId, turnId, delta) =>
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.localId !== sessionId ? sess : {
          ...sess,
          turns: sess.turns.map((turn) => {
            if (turn.id !== turnId) return turn
            const events = [...turn.events]
            const lastIdx = events.length - 1
            const last = events[lastIdx]
            if (last?.type === 'text') {
              events[lastIdx] = { ...last, content: last.content + delta }
            } else {
              events.push({ type: 'text', content: delta })
            }
            return { ...turn, events }
          })
        }
      )
    })),

  appendThinkingDelta: (sessionId, turnId, delta) =>
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.localId !== sessionId ? sess : {
          ...sess,
          turns: sess.turns.map((turn) => {
            if (turn.id !== turnId) return turn
            const events = [...turn.events]
            const lastIdx = events.length - 1
            const last = events[lastIdx]
            if (last?.type === 'thinking' && !last.complete) {
              events[lastIdx] = { ...last, text: last.text + delta }
            } else {
              events.push({ type: 'thinking', text: delta, complete: false })
            }
            return { ...turn, events }
          })
        }
      )
    })),

  setThinkingFull: (sessionId, turnId, text) =>
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.localId !== sessionId ? sess : {
          ...sess,
          turns: sess.turns.map((turn) => {
            if (turn.id !== turnId) return turn
            const events = [...turn.events]
            const lastIdx = events.length - 1
            const last = events[lastIdx]
            if (last?.type === 'thinking') {
              events[lastIdx] = { ...last, text, complete: true }
            } else {
              events.push({ type: 'thinking', text, complete: true })
            }
            return { ...turn, events }
          })
        }
      )
    })),

  setTextFull: (sessionId, turnId, text) =>
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.localId !== sessionId ? sess : {
          ...sess,
          turns: sess.turns.map((turn) => {
            if (turn.id !== turnId) return turn
            const events = [...turn.events]
            const lastIdx = events.length - 1
            const last = events[lastIdx]
            if (last?.type === 'text') {
              events[lastIdx] = { ...last, content: text }
            } else {
              events.push({ type: 'text', content: text })
            }
            return { ...turn, events }
          })
        }
      )
    })),

  addToolStart: (sessionId, turnId, tool) =>
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.localId !== sessionId ? sess : {
          ...sess,
          turns: sess.turns.map((turn) =>
            turn.id !== turnId ? turn : {
              ...turn,
              events: [...turn.events, {
                type: 'tool_call',
                id: tool.id,
                name: tool.name,
                colorType: tool.colorType as ToolColorType,
                summary: tool.summary,
                status: 'pending'
              }]
            }
          )
        }
      )
    })),

  completeToolCall: (sessionId, turnId, toolId, durationMs, status = 'done') =>
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.localId !== sessionId ? sess : {
          ...sess,
          turns: sess.turns.map((turn) =>
            turn.id !== turnId ? turn : {
              ...turn,
              events: turn.events.map((e) =>
                e.type === 'tool_call' && e.id === toolId
                  ? { ...e, status, durationMs }
                  : e
              )
            }
          )
        }
      )
    })),

  completeTurn: (sessionId, turnId, claudeSessionId) =>
    set((s) => ({
      isStreaming: false,
      sessions: s.sessions.map((sess) => {
        if (sess.localId !== sessionId) return sess
        return {
          ...sess,
          claudeSessionId: claudeSessionId ?? sess.claudeSessionId,
          updatedAt: Date.now(),
          turns: sess.turns.map((turn) =>
            turn.id !== turnId ? turn : { ...turn, isStreaming: false }
          )
        }
      })
    })),

  abortTurn: (sessionId, turnId) =>
    set((s) => ({
      isStreaming: false,
      sessions: s.sessions.map((sess) =>
        sess.localId !== sessionId ? sess : {
          ...sess,
          turns: sess.turns.map((turn) =>
            turn.id !== turnId ? turn : { ...turn, isStreaming: false }
          )
        }
      )
    })),

  setModel: (model) => set({ model }),
  setPermissionMode: (permissionMode) => set({ permissionMode }),
  setCwd: (cwd) => set({ cwd })
}))

// Selector helpers
export const selectActiveSession = (s: AppState): Session | undefined =>
  s.sessions.find((sess) => sess.localId === s.activeSessionId)
