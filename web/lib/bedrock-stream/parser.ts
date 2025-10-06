/**
 * Parser for Bedrock AgentCore streaming events
 * Ported from Python shared/bedrock_agentcore_stream/parser.py
 */

import { StreamEvent, EventType, ContentBlock, Message } from './types'

/**
 * Parser for JSON-LD (JSON Lines Delimited) stream from Bedrock AgentCore
 */
export class StreamEventParser {
  private buffer: string = ""
  private inReasoningBlock: boolean = false
  private inToolUseBlock: boolean = false

  /**
   * Parse a single JSON line into a StreamEvent object
   */
  parseJsonLine(line: string): StreamEvent | null {
    if (!line.trim()) {
      return null
    }

    let data: any
    try {
      data = JSON.parse(line)
    } catch (e) {
      // If it's not valid JSON (e.g., debug lines), skip it
      return null
    }

    // Debug: log all parsed events
    // console.log('Parsed event:', JSON.stringify(data, null, 2))

    // Skip if data is a string (debug output that was JSON-encoded)
    if (typeof data === 'string') {
      return null
    }

    // Handle different types of JSON objects
    if ('event' in data) {
      // This is a streaming event
      const eventData = data.event

      // Determine event type based on the key in the event object
      if ('messageStart' in eventData) {
        return {
          type: EventType.MESSAGE_START,
          data: eventData.messageStart,
          rawEvent: line,
          timestamp: Date.now()
        }
      } else if ('contentBlockDelta' in eventData) {
        const deltaData = eventData.contentBlockDelta
        const deltaInner = deltaData.delta || {}

        // Check for reasoning content (thinking)
        if ('reasoningContent' in deltaInner) {
          const reasoningData = deltaInner.reasoningContent
          return {
            type: EventType.THINKING_DELTA,
            data: { delta: { text: reasoningData.text || "" } },
            rawEvent: line,
            timestamp: Date.now()
          }
        }
        // Check if this is a tool use delta
        else if ('toolUse' in deltaInner) {
          const toolUseData = deltaInner.toolUse
          return {
            type: EventType.TOOL_USE_DELTA,
            data: {
              delta: { input: toolUseData.input || "" }
            },
            rawEvent: line,
            timestamp: Date.now()
          }
        }
        // Regular text content
        else {
          return {
            type: EventType.CONTENT_BLOCK_DELTA,
            data: deltaData,
            rawEvent: line,
            timestamp: Date.now()
          }
        }
      } else if ('contentBlockStart' in eventData) {
        const blockData = eventData.contentBlockStart
        const startData = blockData.start || {}

        // Check for reasoning content block (thinking)
        if ('reasoningContent' in startData) {
          this.inReasoningBlock = true
          return {
            type: EventType.THINKING_START,
            data: {},
            rawEvent: line,
            timestamp: Date.now()
          }
        }
        // Check if this is a tool use block
        else if ('toolUse' in startData) {
          const toolUse = startData.toolUse
          this.inToolUseBlock = true
          return {
            type: EventType.TOOL_USE_START,
            data: {
              id: toolUse.toolUseId,
              name: toolUse.name
            },
            rawEvent: line,
            timestamp: Date.now()
          }
        }
        // Regular text content block
        else {
          return {
            type: EventType.CONTENT_BLOCK_START,
            data: blockData,
            rawEvent: line,
            timestamp: Date.now()
          }
        }
      } else if ('contentBlockStop' in eventData) {
        const stopData = eventData.contentBlockStop

        // Check if we're ending a reasoning block
        if (this.inReasoningBlock) {
          this.inReasoningBlock = false
          return {
            type: EventType.THINKING_STOP,
            data: {},
            rawEvent: line,
            timestamp: Date.now()
          }
        }
        // Check if we're ending a tool use block
        else if (this.inToolUseBlock) {
          this.inToolUseBlock = false
          return {
            type: EventType.TOOL_USE_STOP,
            data: {},
            rawEvent: line,
            timestamp: Date.now()
          }
        }
        // Regular content block stop
        else {
          return {
            type: EventType.CONTENT_BLOCK_STOP,
            data: stopData,
            rawEvent: line,
            timestamp: Date.now()
          }
        }
      } else if ('messageStop' in eventData) {
        return {
          type: EventType.MESSAGE_STOP,
          data: eventData.messageStop,
          rawEvent: line,
          timestamp: Date.now()
        }
      } else if ('metadata' in eventData) {
        // Metadata event with usage and metrics
        return {
          type: EventType.UNKNOWN,
          data: eventData.metadata,
          rawEvent: line,
          timestamp: Date.now()
        }
      } else {
        // Unknown event type
        return {
          type: EventType.UNKNOWN,
          data: eventData,
          rawEvent: line,
          timestamp: Date.now()
        }
      }
    } else if ('message' in data) {
      // Final message object (summary, not another stop event)
      // Treat as unknown to avoid duplicate MESSAGE_STOP displays
      return {
        type: EventType.UNKNOWN,
        data: data.message,
        rawEvent: line,
        timestamp: Date.now()
      }
    } else if ('result' in data) {
      // Final result object (AgentCore specific)
      return {
        type: EventType.UNKNOWN,
        data: data,
        rawEvent: line,
        timestamp: Date.now()
      }
    } else if ('init_event_loop' in data || 'start' in data || 'start_event_loop' in data) {
      // Initialization events
      return {
        type: EventType.UNKNOWN,
        data: data,
        rawEvent: line,
        timestamp: Date.now()
      }
    } else if ('data' in data) {
      // Debug/trace data from the agent
      return {
        type: EventType.UNKNOWN,
        data: data,
        rawEvent: line,
        timestamp: Date.now()
      }
    }

    return null
  }

  /**
   * Parse a stream of JSON-LD data into StreamEvent objects
   */
  *parseStream(chunks: Iterable<string>): Generator<StreamEvent, void, unknown> {
    for (const chunk of chunks) {
      this.buffer += chunk
      const lines = this.buffer.split('\n')

      // Keep the last incomplete line in the buffer
      if (!this.buffer.endsWith('\n')) {
        this.buffer = lines[lines.length - 1]
        lines.pop()
      } else {
        this.buffer = ""
      }

      for (const line of lines) {
        const event = this.parseJsonLine(line)
        if (event) {
          yield event
        }
      }
    }
  }

  /**
   * Parse static content (bytes or string) into StreamEvent objects
   */
  parseStatic(content: string | Uint8Array): StreamEvent[] {
    let text: string
    if (content instanceof Uint8Array) {
      text = new TextDecoder().decode(content)
    } else {
      text = content
    }

    const lines = text.split('\n')
    const events: StreamEvent[] = []

    for (const line of lines) {
      const event = this.parseJsonLine(line)
      if (event) {
        events.push(event)
      }
    }

    return events
  }
}

/**
 * Assembles complete messages from stream events
 */
export class MessageAssembler {
  private currentMessage: Partial<Message> | null = null
  private currentContent: Partial<ContentBlock> | null = null
  private currentBlockType: string | null = null
  private thinkingBuffer: string[] = []
  private contentBuffer: string[] = []
  private toolBuffer: Record<string, Partial<ContentBlock>> = {}
  private currentToolId: string | null = null

  /**
   * Process a stream event and update internal state
   * Returns a complete message if MESSAGE_STOP is encountered
   */
  processEvent(event: StreamEvent): Message | null {
    if (event.type === EventType.MESSAGE_START) {
      // Initialize new message
      this.currentMessage = {
        role: event.data.role || "assistant",
        content: [],
        thinking: undefined,
        model: event.data.model,
        usage: undefined
      }
      this.thinkingBuffer = []
      this.contentBuffer = []
    } else if (event.type === EventType.THINKING_DELTA) {
      // Accumulate thinking text
      const text = event.data.delta?.text || ""
      this.thinkingBuffer.push(text)
    } else if (event.type === EventType.THINKING_STOP) {
      // Finalize thinking
      if (this.currentMessage && this.thinkingBuffer.length > 0) {
        this.currentMessage.thinking = this.thinkingBuffer.join('')
      }
    } else if (event.type === EventType.CONTENT_BLOCK_START) {
      // Initialize new content block
      this.currentBlockType = "text"
      this.currentContent = {
        type: "text",
        text: ""
      }
    } else if (event.type === EventType.CONTENT_BLOCK_DELTA) {
      // Accumulate content text
      if (this.currentContent) {
        const text = event.data.delta?.text || ""
        if (this.currentContent.type === "text") {
          this.currentContent.text = (this.currentContent.text || "") + text
        }
      }
    } else if (event.type === EventType.CONTENT_BLOCK_STOP) {
      // Finalize content block - check what type it was
      if (this.currentBlockType === "tool_use" && this.currentToolId) {
        // This was a tool use block, finalize it
        const toolId = this.currentToolId
        if (toolId in this.toolBuffer && this.currentMessage) {
          const toolData = this.toolBuffer[toolId]
          try {
            if (toolData.toolInput && typeof toolData.toolInput === 'string') {
              toolData.toolInput = JSON.parse(toolData.toolInput as any)
            }
          } catch (e) {
            // Keep as string if not valid JSON
          }
          this.currentMessage.content?.push(toolData as ContentBlock)
          delete this.toolBuffer[toolId]
        }
        this.currentToolId = null
      } else if (this.currentMessage && this.currentContent) {
        // Regular text content block
        this.currentMessage.content?.push(this.currentContent as ContentBlock)
      }

      this.currentContent = null
      this.currentBlockType = null
    } else if (event.type === EventType.TOOL_USE_START) {
      // Initialize tool use
      this.currentBlockType = "tool_use"
      const toolId = event.data.id
      this.toolBuffer[toolId] = {
        type: "tool_use",
        toolUseId: toolId,
        toolName: event.data.name,
        toolInput: {} as any
      }
      // Store reference to current tool
      this.currentToolId = toolId
    } else if (event.type === EventType.TOOL_USE_DELTA) {
      // Accumulate tool input - use currentToolId since deltas don't include id
      if (this.currentToolId && this.currentToolId in this.toolBuffer) {
        const deltaInput = event.data.delta?.input || ""
        const currentInput = this.toolBuffer[this.currentToolId].toolInput
        this.toolBuffer[this.currentToolId].toolInput =
          (typeof currentInput === 'string' ? currentInput : '') + deltaInput
      }
    } else if (event.type === EventType.TOOL_USE_STOP) {
      // Finalize tool use - use currentToolId since stop events don't have id
      if (this.currentToolId) {
        const toolId = this.currentToolId
        if (toolId in this.toolBuffer && this.currentMessage) {
          const toolData = this.toolBuffer[toolId]
          try {
            if (toolData.toolInput && typeof toolData.toolInput === 'string') {
              toolData.toolInput = JSON.parse(toolData.toolInput as any)
            }
          } catch (e) {
            // Keep as string if not valid JSON
          }
          this.currentMessage.content?.push(toolData as ContentBlock)
          delete this.toolBuffer[toolId]
        }
        // Clear the currentToolId
        this.currentToolId = null
      }
    } else if (event.type === EventType.MESSAGE_STOP) {
      // Finalize message
      if (this.currentMessage) {
        this.currentMessage.usage = event.data.usage
        this.currentMessage.stopReason = event.data.stop_reason
        return this.currentMessage as Message
      }
    }

    return null
  }
}
