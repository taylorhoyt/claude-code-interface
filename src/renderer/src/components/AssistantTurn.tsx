import React from 'react'
import { TurnEvent } from '../store'
import ThinkingBlock from './ThinkingBlock'
import ToolCallLine from './ToolCallLine'
import AssistantText from './AssistantText'
import StreamingCursor from './StreamingCursor'

interface AssistantTurnProps {
  events: TurnEvent[]
  isStreaming: boolean
}

export default function AssistantTurn({ events, isStreaming }: AssistantTurnProps): React.JSX.Element {
  if (events.length === 0 && isStreaming) {
    return (
      <div style={{ padding: '8px 32px' }}>
        <StreamingCursor />
      </div>
    )
  }

  const lastEvent = events[events.length - 1]
  const isLastText = lastEvent?.type === 'text'

  return (
    <div style={{ padding: '4px 32px 12px' }}>
      {events.map((event, i) => {
        if (event.type === 'thinking') {
          return (
            <ThinkingBlock
              key={i}
              text={event.text}
              complete={event.complete}
              durationMs={event.durationMs}
            />
          )
        }
        if (event.type === 'tool_call') {
          return (
            <ToolCallLine
              key={event.id}
              name={event.name}
              colorType={event.colorType}
              summary={event.summary}
              status={event.status}
              durationMs={event.durationMs}
            />
          )
        }
        if (event.type === 'text') {
          const isLast = i === events.length - 1
          return (
            <AssistantText
              key={i}
              content={event.content}
              showCursor={isStreaming && isLast}
            />
          )
        }
        return null
      })}
    </div>
  )
}
