# Claude Code Interface

A desktop GUI for **Claude Code** — it wraps the `claude` CLI and renders streaming output as a focused workspace instead of a chat. Licensed under [MIT](LICENSE).

**Design:** No chat bubbles. The current task (commission) stays at the top. Thinking is visible in a collapsible block. Tool calls appear inline in the timeline. The input is a full-width prompt. Sessions map to Claude Code’s session IDs so `--resume` works for follow-ups.

**Stack:** Electron + React + TypeScript. No Anthropic SDK — the app spawns `claude -p` with `--output-format stream-json` and parses NDJSON events. Sessions persist locally.

---

## Requirements

- **Claude Code CLI** installed and on your `PATH` (e.g. `claude --version` works).
- Run the app **outside** any Claude Code session. If you launch it from inside Claude Code, the CLI detects a nested session and exits; the app unsets `CLAUDECODE` when spawning, so it works when the app is started from a normal terminal or the dock.

---

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is in `out/`. Run the app via the built `main` entry (e.g. `electron .` from the project root, or package with electron-builder if configured).

---

## Scripts

| Script | Purpose |
|--------|--------|
| `npm run dev` | Start Electron with Vite dev server and HMR. |
| `npm run build` | Production build (main, preload, renderer). |
| `npm run preview` | Vite preview (renderer only). |
| `npm run lint` | ESLint. |

**CLI verification (run in a normal terminal, not inside Claude Code):**

```bash
node scripts/test-cli.js "say hello in one word"
```

Prints each NDJSON line and event type; use this to confirm the CLI and `stream-json` format. Requires `--verbose` for `--output-format stream-json` when using `-p`.

---

## Permission mode

The header has a **permission mode** selector (default, plan, accept edits, bypass). With **default**, the CLI may block tool execution when stdin is not a TTY (e.g. when the app uses `stdio: ['ignore', 'pipe', 'pipe']`). Use **bypass** if you want tools to run without approve/reject in this environment. Approve/reject for individual tool calls is planned.

---

## Troubleshooting

- **Nothing comes back after sending a message**  
  - Ensure you’re not running the app from inside a Claude Code session.  
  - Ensure `claude` is on your `PATH`.  
  - Check `~/.claude/claude-code-interface/logs/` for the latest `.jsonl`; it logs env, args, raw stdout, stderr, and close code.  
  - Run `node scripts/test-cli.js "hello"` in a normal terminal to confirm the CLI and event format.

- **`Request Autofill.enable failed` in the console**  
  Benign Electron/DevTools noise; safe to ignore.

- **Stream format or parsing issues**  
  Raw CLI output is in `~/.claude/claude-code-interface/logs/`. Compare with the event handling in `src/main/cli.ts` (e.g. `stream_event` wrapper, `content_block_delta`, `result`).

---

## Docs

- [Architecture](docs/architecture.md) — process model, CLI integration, state, and UI structure.
- [Planned features](docs/PLANNED_FEATURES.md) — approve/reject, context meter, logging, and backlog.
