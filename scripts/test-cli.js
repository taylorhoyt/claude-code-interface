#!/usr/bin/env node
/**
 * test-cli.js — Run this in a terminal OUTSIDE Claude Code to verify the CLI integration.
 *
 * Usage:
 *   node scripts/test-cli.js "say hello in one word"
 *
 * What it does:
 *   - Replicates the exact spawn logic from src/main/cli.ts
 *   - Removes CLAUDECODE from env so the nested-session check is bypassed
 *   - Prints every raw stdout line with its line number
 *   - Parses each line as JSON and prints the event type
 *   - Exits PASS / FAIL based on whether a 'result' event arrived
 */

const { spawn } = require('child_process')
const readline = require('readline')

const prompt = process.argv[2] || 'say hello in one word'
const model = process.argv[3] || 'claude-sonnet-4-6'

console.log('─'.repeat(60))
console.log('claude-code-interface test-cli.js')
console.log('─'.repeat(60))
console.log(`prompt: "${prompt}"`)
console.log(`model:  ${model}`)
console.log('─'.repeat(60))

const args = [
  '-p', prompt,
  '--output-format', 'stream-json',
  '--verbose',
  '--include-partial-messages',
  '--model', model,
  '--permission-mode', 'default'
]

console.log('spawn: claude', args.join(' '))
console.log('─'.repeat(60))

// Remove the env vars that block nested sessions
const env = { ...process.env }
delete env['CLAUDECODE']
delete env['CLAUDE_CODE_SESSION_ID']

const proc = spawn('claude', args, { env })

let lineCount = 0
let gotResult = false
let sessionId = null
const eventCounts = {}

proc.on('error', (err) => {
  console.error('\n[SPAWN ERROR]', err.message)
  console.error('Is "claude" on your PATH? Run: which claude')
  process.exit(1)
})

const rl = readline.createInterface({ input: proc.stdout })

rl.on('line', (line) => {
  lineCount++
  console.log(`\n[LINE ${lineCount}] ${line.slice(0, 200)}${line.length > 200 ? '...' : ''}`)

  let obj
  try {
    obj = JSON.parse(line)
  } catch {
    console.log('  → (not JSON)')
    return
  }

  const type = obj.type
  eventCounts[type] = (eventCounts[type] || 0) + 1
  console.log(`  → type: ${type}`)

  if (type === 'assistant' && obj.message) {
    const content = obj.message.content || []
    for (const block of content) {
      console.log(`     content block: ${block.type}`)
      if (block.type === 'text') {
        console.log(`     text preview: "${String(block.text).slice(0, 100)}"`)
      }
    }
    if (obj.message.usage) {
      const u = obj.message.usage
      console.log(`     usage: in=${u.input_tokens} out=${u.output_tokens} cache_read=${u.cache_read_input_tokens}`)
    }
  }

  if (type === 'content_block_delta') {
    const d = obj.delta
    if (d?.type === 'text_delta') console.log(`     text_delta: "${String(d.text).slice(0, 80)}"`)
    if (d?.type === 'thinking_delta') console.log(`     thinking_delta (${String(d.thinking || '').length} chars)`)
  }

  if (type === 'result') {
    gotResult = true
    sessionId = obj.session_id
    console.log(`     session_id: ${sessionId}`)
    console.log(`     is_error:   ${obj.is_error}`)
    if (obj.result) console.log(`     result:     "${String(obj.result).slice(0, 100)}"`)
  }
})

proc.stderr.on('data', (data) => {
  process.stderr.write(`[STDERR] ${data}`)
})

proc.on('close', (code) => {
  console.log('\n' + '─'.repeat(60))
  console.log(`Process exited with code: ${code}`)
  console.log(`Lines received: ${lineCount}`)
  console.log('Event type counts:', eventCounts)

  if (gotResult) {
    console.log(`\n✓ PASS — got 'result' event, session_id: ${sessionId}`)
  } else if (lineCount > 0) {
    console.log('\n⚠ PARTIAL — got output but no result event. Parser may need fixing.')
  } else {
    console.log('\n✗ FAIL — no output received.')
    if (code === 0) {
      console.log('  Process exited cleanly but produced nothing.')
      console.log('  Possible causes:')
      console.log('  1. CLAUDECODE env var still set (check: echo $CLAUDECODE)')
      console.log('  2. Running inside Claude Code — open a fresh terminal')
    }
  }
  console.log('─'.repeat(60))
})
