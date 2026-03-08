#!/bin/bash
# test-stream-format.sh — Quick raw output inspection.
# Run in a terminal OUTSIDE Claude Code.
#
# Usage:
#   bash scripts/test-stream-format.sh "say hello in one word"

PROMPT="${1:-say hello in one word}"

echo "────────────────────────────────────────"
echo "luminous test-stream-format.sh"
echo "────────────────────────────────────────"
echo "CLAUDECODE before unset: ${CLAUDECODE:-<not set>}"

# Unset the env var that blocks nested Claude Code sessions
unset CLAUDECODE
unset CLAUDE_CODE_SESSION_ID

echo "Running: claude -p \"$PROMPT\" --output-format stream-json"
echo "────────────────────────────────────────"

claude -p "$PROMPT" \
  --output-format stream-json \
  --verbose \
  --include-partial-messages \
  --model claude-sonnet-4-6 \
  --permission-mode default

EXIT_CODE=$?
echo ""
echo "────────────────────────────────────────"
echo "Exit code: $EXIT_CODE"
