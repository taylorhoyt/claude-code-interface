/// <reference types="vite/client" />

export type CliEvent =
  | { type: 'text_delta'; delta: string }
  | { type: 'text_full'; text: string }
  | { type: 'thinking_delta'; delta: string }
  | { type: 'thinking_full'; text: string }
  | { type: 'tool_start'; id: string; name: string; colorType: string; summary: string; input: Record<string, unknown> }
  | { type: 'tool_input_delta'; delta: string }
  | { type: 'tool_end'; id: string; durationMs?: number; status: 'done' | 'error' }
  | { type: 'usage'; inputTokens: number; outputTokens: number; cacheRead?: number; cacheCreate?: number }
  | { type: 'done'; sessionId?: string }
  | { type: 'error'; message: string }
  | { type: 'aborted' }
  | { type: 'process_closed'; code: number | null }

export type SendPayload = {
  prompt: string
  sessionId?: string
  model: string
  permissionMode: string
  cwd: string
}

declare global {
  interface Window {
    cc: {
      send: (payload: SendPayload) => Promise<void>
      abort: () => Promise<void>
      getLogDir: () => Promise<string>
      onEvent: (handler: (event: CliEvent) => void) => () => void
    }
  }
}
