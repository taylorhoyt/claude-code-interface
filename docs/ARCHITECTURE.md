# Architecture

Claude Code Interface is a thin GUI around the **Claude Code CLI**. It does not call the Anthropic API directly; it spawns `claude -p` with streaming JSON output and renders the resulting event stream. Sessions are keyed by the CLI’s session IDs so `--resume` works for multi-turn conversations.

---

## Design principles

1. **No chat bubbles** — Assistant output is a document: structured prose, markdown, code blocks. The right side is a workspace, not an alternating thread.

2. **Commission at the top** — The user’s current message is the prominent “commission”; the ongoing task is the focus, not one item in a long scroll.

3. **Thinking is visible** — Reasoning streams into a distinct, collapsible block (e.g. “── Thinking [3.2s] ▶ ──”). It’s first-class, not hidden behind a spinner.

4. **Tool calls inline** — When the model reads a file or runs a command, that event appears in the timeline where it happened (e.g. “◆ Read src/auth.ts 12ms”). No separate sidebar; causality is preserved.

5. **Input is a prompt** — Full-width, monospace input at the bottom. ⌘Enter sends. The mental model is “you’re at a prompt,” not a chat textbox.

6. **Context as information** — (Planned) A visual indicator of remaining context, since that’s real information the user needs.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Shell | Electron |
| Main process | Node (TypeScript), spawns `claude` |
| Renderer | React 18 + TypeScript |
| Build | electron-vite, Vite 5 |
| State | Zustand (single store) |
| Styling | CSS variables, no UI framework |
| Markdown/code | react-markdown, remark-gfm, rehype-highlight, shiki (code blocks) |

No Agent SDK, no direct Anthropic API usage — only the CLI.

---

## Process model

```
┌─────────────────────────────────────────────────────────────────┐
│  Main process (Node)                                             │
│  - Creates BrowserWindow, loads renderer                          │
│  - registerCliHandlers(win): IPC for cc:send, cc:abort, cc:get-  │
│    log-dir; spawns claude, parses stdout line-by-line, sends      │
│    structured events to renderer via win.webContents.send         │
└─────────────────────────────────────────────────────────────────┘
                              │
                    preload (contextBridge)
                              │
┌─────────────────────────────────────────────────────────────────┐
│  Renderer (React)                                                │
│  - window.cc.send(payload), window.cc.abort(), window.cc.onEvent  │
│  - Zustand store: sessions, turns, events; persistence to disk    │
│  - UI: SessionList | Workspace (Header + MessageFeed + InputArea) │
└─────────────────────────────────────────────────────────────────┘
```

- **Main** owns the single `claude` child process. Only one request runs at a time; a new send kills the previous process.
- **Preload** exposes a minimal `cc` API to the renderer; no Node or Electron APIs leak.
- **Renderer** is a pure React app that subscribes to `cc:event` and updates the store; the store drives the UI.

---

## CLI integration

### Invocation

For each user message the main process:

1. **Clears env for nested-session check** — Deletes `CLAUDECODE` and `CLAUDE_CODE_SESSION_ID` from `process.env` before spawning. The CLI refuses to run when it thinks it’s inside another Claude Code session (e.g. when the app is launched from Cursor/Claude Code). Unsetting these allows the subprocess to run.

2. **Spawns**  
   `claude -p <prompt> --output-format stream-json --verbose --include-partial-messages --model <model> --permission-mode <mode> [--resume <sessionId>]`  
   with `cwd` set to the workspace directory.  
   **Important:** `--verbose` is required when using `--output-format stream-json` with `-p`; otherwise the CLI errors.

3. **Stdio** — `stdio: ['ignore', 'pipe', 'pipe']` so stdin is not an open pipe (avoids hangs). Because stdin is not a TTY, the CLI may not run tools in `default` permission mode without approve/reject; the app supports a **bypass** permission mode so tools can run without interactive approval in this setup.

4. **Stdout** — NDJSON, one event per line. Read with `readline.createInterface(proc.stdout)`.

5. **Logging** — Every line is appended to `~/.claude/claude-code-interface/logs/<timestamp>.jsonl`. Env (before/after), args, raw stdout snippets, stderr, and process exit code are also logged for debugging.

### Event format (stream-json)

- **Top-level types:** `system`, `stream_event`, `assistant`, `user`, `result`, `rate_limit_event`, etc.
- **Streaming:** All API streaming events are wrapped:  
  `{ "type": "stream_event", "event": { "type": "content_block_delta", "delta": { ... } } }`  
  The parser in `cli.ts` unwraps `stream_event` and handles `content_block_start`, `content_block_delta`, `content_block_stop`, `message_start`, `message_delta`, `message_stop` inside `event`.
- **Deltas:** `content_block_delta` can contain `text_delta`, `thinking_delta`, `input_json_delta` (tool input), etc.
- **Checkpoints:** `assistant` events carry partial completion snapshots (full thinking block, full text block, or tool_use block with full input).
- **Tool results:** `user` messages can include `tool_result`; the parser maps these to `tool_end` with duration and status.
- **Completion:** `result` carries `session_id`, success/error, and optional summary. The parser emits `done` (and optionally `error`) and passes `sessionId` so the renderer can store it for `--resume`.

### Parser → renderer events

`cli.ts` normalizes the stream into a small set of event types sent over IPC:

| Internal event   | Meaning |
|------------------|--------|
| `thinking_delta` | Append to current thinking buffer |
| `thinking_full`  | Set full thinking text (e.g. from `assistant` checkpoint) |
| `text_delta`     | Append to current text buffer |
| `text_full`      | Set full text (e.g. from `assistant` checkpoint) |
| `tool_start`     | New tool call (id, name, colorType, summary, input) |
| `tool_input_delta` | Streaming tool input JSON (parser may accumulate for summary) |
| `tool_end`       | Tool finished (id, durationMs, status) |
| `done`           | Turn finished; optional `sessionId` for resume |
| `error`          | Error message (e.g. spawn failure, CLI error) |
| `aborted`        | User stopped the run |
| `process_closed` | Process exited (code); used to complete turn if no `result` event |

The renderer never sees raw NDJSON; it only sees these normalized events.

---

## State (Zustand)

Single store in `src/renderer/src/store/index.ts`.

- **Sessions** — List of sessions; each has `localId`, optional `claudeSessionId` (for `--resume`), `title`, `cwd`, `model`, `permissionMode`, `turns`, timestamps.
- **Active session** — `activeSessionId` points to the current session.
- **Turns** — Each turn has `id`, `userMessage`, `events[]`, `isStreaming`, `startedAt`. Events are ordered: `thinking` | `tool_call` | `text`.
- **Global** — `model`, `permissionMode`, `cwd`, `isStreaming`.

Actions: create/delete session, set active session, add turn, append deltas, set thinking/text full, add tool start, complete tool/turn, abort turn, set model/permission/cwd. The store is persisted (see `persist.ts`) and rehydrated on load.

---

## UI structure

- **SessionList** — Left sidebar. Sessions grouped by date; click to switch; delete on hover. Uses `localId` for list key and `claudeSessionId` when sending `--resume`.
- **Workspace** — Main area:
  - **Header** — CWD (shortened), permission mode dropdown (default / plan / accept edits / bypass), model dropdown (e.g. Sonnet 4.6, Opus 4.6, Haiku 4.5).
  - **MessageFeed** — Scrollable list of user + assistant turns. User message shown as commission-style block; assistant turns use **AssistantTurn**.
- **AssistantTurn** — Renders events in order: **ThinkingBlock** (collapsible, “── Thinking [duration] ▶ ──”), **ToolCallLine** (◆ icon, name, summary, duration, color by type, pending animation), **AssistantText** (markdown + **CodeBlock** with shiki, copy button).
- **InputArea** — Full-width textarea, ⌘Enter to send; while streaming it shows a Stop button. Uses `window.cc.send({ prompt, sessionId, model, permissionMode, cwd })` and subscribes to `window.cc.onEvent()` to drive the store.

Visual tokens: deep dark background (`#0d0d14`), warm white text, indigo thinking block, amber/accent for tool calls and highlights.

---

## Persistence

- **Sessions/turns** — Zustand middleware (or subscribe) writes to disk (e.g. electron-store or file) so that sessions and conversation history survive restarts. Exact path and format are defined in `src/renderer/src/store/persist.ts`.
- **Preferences** — Model, permission mode, and cwd can be persisted as part of the same store or a separate preferences slice.

---

## Known limitations and planned work

- **Approve/reject** — With `--permission-mode default` and non-TTY stdin, the CLI may block on tool execution. The app currently supports switching to **bypass** mode. Full approve/reject per tool call (send user decisions back into the CLI) is planned and will require a different integration approach (e.g. feeding approval into the process or using a CLI mode that supports it).
- **Single process** — Only one `claude` run at a time; new send aborts the previous.
- **Context meter** — Not yet implemented; intended to show remaining context from usage/limits if the CLI exposes it in the stream.
- **Raw logs** — Always written to `~/.claude/claude-code-interface/logs/` for debugging; consider optional or rotatable logs for production.

---

## File map

| Path | Role |
|------|------|
| `src/main/index.ts` | Electron entry; create window, load renderer, register CLI handlers. |
| `src/main/cli.ts` | Spawn claude, parse NDJSON, map to IPC events; `cc:send`, `cc:abort`, `cc:get-log-dir`. |
| `src/preload/index.ts` | contextBridge: `window.cc.send`, `abort`, `getLogDir`, `onEvent`. |
| `src/renderer/src/App.tsx` | Root: SessionList + Workspace; subscribes to `cc:event`, dispatches to store; sends on submit. |
| `src/renderer/src/store/index.ts` | Zustand store (sessions, turns, events, actions). |
| `src/renderer/src/store/persist.ts` | Persist store to disk; load on init. |
| `src/renderer/src/components/*` | SessionList, Header, Workspace, MessageFeed, UserMessage, AssistantTurn, ThinkingBlock, ToolCallLine, AssistantText, CodeBlock, InputArea, StreamingCursor. |
| `scripts/test-cli.js` | Standalone script to run the same CLI invocation and print event types (for verification outside the app). |
