# Planned features

Features we intend to add. Not committed to a timeline.

---

## Approve / reject tool calls

With `--permission-mode default`, the CLI may block tool execution when stdin is not a TTY (the app uses non-interactive stdio). Today you can switch to **bypass** so tools run without approval.

**Planned:** Per–tool-call approve/reject in the UI. When the CLI asks for permission (e.g. edit a file, run a command), show a control in the timeline to Approve or Reject and send that decision into the CLI. Likely requires a different integration approach (e.g. feeding approval into the process or a CLI mode that supports it).

---

## Context meter

A visible indicator of how much context remains (e.g. tokens or “context budget” left). Depends on the CLI or stream exposing usage/limits; would be shown in the header or near the input.

---

## Logging options

Right now every run writes raw NDJSON and diagnostics to `~/.claude/claude-code-interface/logs/`. **Planned:** make logging optional or configurable, and/or add log rotation so production use doesn’t grow unbounded.

---

## Other ideas (backlog)

- **Multiple concurrent runs** — Today only one `claude` process runs at a time; a new send aborts the previous. Allowing multiple sessions to run in parallel would require process/session management and UI changes.
- **Session title from first reply** — Auto-set session title from the first assistant turn (e.g. first line or a summary) instead of “New session”.
- **Export / share** — Export a session or turn as markdown or shareable link.
