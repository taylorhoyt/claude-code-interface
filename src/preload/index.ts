import { contextBridge, ipcRenderer } from 'electron'

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

const cc = {
  send: (payload: SendPayload): Promise<void> =>
    ipcRenderer.invoke('cc:send', payload),

  abort: (): Promise<void> =>
    ipcRenderer.invoke('cc:abort'),

  getLogDir: (): Promise<string> =>
    ipcRenderer.invoke('cc:get-log-dir'),

  onEvent: (handler: (event: CliEvent) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, event: CliEvent): void => handler(event)
    ipcRenderer.on('cc:event', listener)
    return () => ipcRenderer.removeListener('cc:event', listener)
  }
}

contextBridge.exposeInMainWorld('cc', cc)

declare global {
  interface Window {
    cc: typeof cc
  }
}
