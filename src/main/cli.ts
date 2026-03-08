import { BrowserWindow, ipcMain } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import * as readline from 'readline'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'

const LOG_DIR = path.join(os.homedir(), '.claude', 'claude-code-interface', 'logs')

let activeProcess: ChildProcess | null = null

function sendEvent(win: BrowserWindow, event: object): void {
  if (!win.isDestroyed()) {
    win.webContents.send('cc:event', event)
  }
}

function getToolColor(name: string): string {
  const n = name.toLowerCase()
  if (n === 'read' || n === 'glob' || n === 'grep') return 'read'
  if (n === 'write' || n === 'edit' || n === 'multiedit') return 'write'
  if (n === 'bash') return 'bash'
  return 'other'
}

function summarizeToolInput(name: string, input: Record<string, unknown>): string {
  const n = name.toLowerCase()
  if (n === 'read') return String(input.file_path || input.path || '')
  if (n === 'write' || n === 'edit' || n === 'multiedit') return String(input.file_path || input.path || '')
  if (n === 'bash') return String(input.command || '').slice(0, 80)
  if (n === 'glob') return String(input.pattern || '')
  if (n === 'grep') return `"${input.pattern}" ${String(input.path || '')}`
  return JSON.stringify(input).slice(0, 80)
}

function parseStreamEvent(line: string, win: BrowserWindow, logStream: fs.WriteStream): void {
  if (!line.trim()) return
  logStream.write(line + '\n')

  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(line)
  } catch {
    return
  }

  const type = obj.type as string

  // ── system init ────────────────────────────────────────────────
  if (type === 'system') return

  // ── stream_event wrapper ───────────────────────────────────────
  // All Claude API streaming events come wrapped:
  // { type: "stream_event", event: { type: "content_block_delta", ... } }
  if (type === 'stream_event') {
    const ev = obj.event as Record<string, unknown>
    const evType = ev?.type as string

    if (evType === 'content_block_start') {
      const block = ev.content_block as Record<string, unknown>
      if (block?.type === 'tool_use') {
        sendEvent(win, {
          type: 'tool_start',
          id: block.id,
          name: block.name,
          colorType: getToolColor(String(block.name)),
          summary: '',   // filled in when input_json_delta events arrive
          input: {}
        })
      }
    }

    if (evType === 'content_block_delta') {
      const delta = ev.delta as Record<string, unknown>
      if (delta?.type === 'text_delta') {
        sendEvent(win, { type: 'text_delta', delta: delta.text })
      } else if (delta?.type === 'thinking_delta') {
        sendEvent(win, { type: 'thinking_delta', delta: delta.thinking })
      } else if (delta?.type === 'input_json_delta') {
        sendEvent(win, { type: 'tool_input_delta', delta: delta.partial_json })
      }
    }

    return
  }

  // ── assistant (partial completion checkpoints) ─────────────────
  // Emitted when each content block finishes streaming.
  // thinking block → thinking_full; text block → text_full; tool_use → tool_start
  if (type === 'assistant') {
    const message = (obj.message || {}) as Record<string, unknown>
    const content = (message.content || []) as Array<Record<string, unknown>>

    for (const block of content) {
      if (block.type === 'thinking') {
        sendEvent(win, { type: 'thinking_full', text: block.thinking })
      } else if (block.type === 'text') {
        sendEvent(win, { type: 'text_full', text: block.text })
      } else if (block.type === 'tool_use') {
        const input = (block.input || {}) as Record<string, unknown>
        sendEvent(win, {
          type: 'tool_start',
          id: block.id,
          name: block.name,
          colorType: getToolColor(String(block.name)),
          summary: summarizeToolInput(String(block.name), input),
          input
        })
      }
    }
    return
  }

  // ── user (tool results) ────────────────────────────────────────
  if (type === 'user') {
    const message = (obj.message || {}) as Record<string, unknown>
    const content = (message.content || []) as Array<Record<string, unknown>>
    const toolUseResult = obj.toolUseResult as Record<string, unknown> | undefined

    for (const block of content) {
      if (block.type === 'tool_result') {
        sendEvent(win, {
          type: 'tool_end',
          id: block.tool_use_id,
          durationMs: toolUseResult?.totalDurationMs,
          status: 'done'
        })
      }
    }
    return
  }

  // ── result (final) ─────────────────────────────────────────────
  if (type === 'result') {
    const sessionId = obj.session_id as string | undefined
    if (obj.is_error) {
      sendEvent(win, { type: 'error', message: String(obj.result || 'Unknown error') })
    }
    sendEvent(win, { type: 'done', sessionId })
    return
  }

  // rate_limit_event and anything else — ignore
}

export function registerCliHandlers(win: BrowserWindow): void {
  fs.mkdirSync(LOG_DIR, { recursive: true })

  ipcMain.handle('cc:send', async (_, payload: {
    prompt: string
    sessionId?: string
    model: string
    permissionMode: string
    cwd: string
  }) => {
    if (activeProcess) {
      activeProcess.kill()
      activeProcess = null
    }

    const { prompt, sessionId, model, permissionMode, cwd } = payload

    const args: string[] = [
      '-p', prompt,
      '--output-format', 'stream-json',
      '--verbose',                          // required for stream-json
      '--include-partial-messages',
      '--model', model,
      '--permission-mode', permissionMode
    ]

    if (sessionId) {
      args.push('--resume', sessionId)
    }

    const logPath = path.join(LOG_DIR, `${Date.now()}.jsonl`)
    const logStream = fs.createWriteStream(logPath, { flags: 'a' })

    const env = { ...process.env }
    // Diagnose: log what CLAUDECODE is in this process before deletion
    logStream.write(`[ENV_BEFORE] CLAUDECODE=${env['CLAUDECODE'] ?? '<not set>'}\n`)
    logStream.write(`[ENV_BEFORE] CLAUDE_CODE_SESSION_ID=${env['CLAUDE_CODE_SESSION_ID'] ?? '<not set>'}\n`)
    logStream.write(`[CWD] ${cwd || os.homedir()}\n`)
    logStream.write(`[ARGS] ${JSON.stringify(args)}\n`)
    console.log('[claude-code-interface] CLAUDECODE in env:', env['CLAUDECODE'] ?? '<not set>')
    console.log('[claude-code-interface] spawning:', args.join(' '))

    delete env['CLAUDECODE']
    delete env['CLAUDE_CODE_SESSION_ID']
    logStream.write(`[ENV_AFTER] CLAUDECODE=${env['CLAUDECODE'] ?? '<not set>'}\n`)

    // Use stdio: ['ignore', 'pipe', 'pipe'] so stdin is /dev/null (not a hanging open pipe)
    const proc = spawn('claude', args, {
      cwd: cwd || os.homedir(),
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    activeProcess = proc

    proc.on('error', (err) => {
      console.error('[claude-code-interface] spawn error:', err.message)
      logStream.write(`[SPAWN ERROR] ${err.message}\n`)
      logStream.end()
      activeProcess = null
      sendEvent(win, { type: 'error', message: `Failed to start claude: ${err.message}` })
      sendEvent(win, { type: 'done' })
    })

    // Raw data listener (bypasses readline — catches anything from stdout)
    proc.stdout!.on('data', (data: Buffer) => {
      logStream.write(`[STDOUT_RAW] ${data.toString().slice(0, 200)}\n`)
    })

    const rl = readline.createInterface({ input: proc.stdout! })
    rl.on('line', (line) => parseStreamEvent(line, win, logStream))

    proc.stderr!.on('data', (data: Buffer) => {
      const text = data.toString()
      logStream.write(`[STDERR] ${text}`)
      console.log('[claude-code-interface] stderr:', text.trim().slice(0, 200))
    })

    proc.on('close', (code) => {
      console.log('[claude-code-interface] process closed, code:', code)
      logStream.write(`[CLOSE] code=${code}\n`)
      logStream.end()
      activeProcess = null
      sendEvent(win, { type: 'process_closed', code })
    })
  })

  ipcMain.handle('cc:abort', async () => {
    if (activeProcess) {
      activeProcess.kill('SIGINT')
      activeProcess = null
      sendEvent(win, { type: 'aborted' })
    }
  })

  ipcMain.handle('cc:get-log-dir', async () => LOG_DIR)
}
