/**
 * Type definitions for Bedrock AgentCore streaming events
 * Ported from Python shared/bedrock_agentcore_stream/types.py
 */

/**
 * Types of events in the Bedrock AgentCore stream
 */
export enum EventType {
  MESSAGE_START = "message_start",
  MESSAGE_DELTA = "message_delta",
  MESSAGE_STOP = "message_stop",
  CONTENT_BLOCK_START = "content_block_start",
  CONTENT_BLOCK_DELTA = "content_block_delta",
  CONTENT_BLOCK_STOP = "content_block_stop",
  THINKING_START = "thinking_start",
  THINKING_DELTA = "thinking_delta",
  THINKING_STOP = "thinking_stop",
  TOOL_USE_START = "tool_use_start",
  TOOL_USE_DELTA = "tool_use_delta",
  TOOL_USE_STOP = "tool_use_stop",
  TOOL_RESULT = "tool_result",
  ERROR = "error",
  PING = "ping",
  UNKNOWN = "unknown",
}

/**
 * Represents a single event in the stream
 */
export interface StreamEvent {
  type: EventType
  data: Record<string, unknown>
  rawEvent?: string
  timestamp?: number
}

/**
 * Helper functions for StreamEvent
 */
export class StreamEventHelpers {
  /**
   * Check if this is a content event
   */
  static isContent(event: StreamEvent): boolean {
    return [
      EventType.CONTENT_BLOCK_START,
      EventType.CONTENT_BLOCK_DELTA,
      EventType.CONTENT_BLOCK_STOP,
    ].includes(event.type)
  }

  /**
   * Check if this is a thinking event
   */
  static isThinking(event: StreamEvent): boolean {
    return [
      EventType.THINKING_START,
      EventType.THINKING_DELTA,
      EventType.THINKING_STOP,
    ].includes(event.type)
  }

  /**
   * Check if this is a tool use event
   */
  static isToolUse(event: StreamEvent): boolean {
    return [
      EventType.TOOL_USE_START,
      EventType.TOOL_USE_DELTA,
      EventType.TOOL_USE_STOP,
      EventType.TOOL_RESULT,
    ].includes(event.type)
  }

  /**
   * Extract text content from the event if available
   */
  static getText(event: StreamEvent): string | null {
    if (event.type === EventType.CONTENT_BLOCK_DELTA) {
      const delta = event.data.delta as { text?: string } | undefined
      return delta?.text ?? ""
    } else if (event.type === EventType.THINKING_DELTA) {
      const delta = event.data.delta as { text?: string } | undefined
      return delta?.text ?? ""
    } else if (event.type === EventType.MESSAGE_DELTA) {
      const delta = event.data.delta as { text?: string } | undefined
      return delta?.text ?? ""
    } else if (StreamEventHelpers.isContent(event) && "content" in event.data) {
      const content = event.data.content as { text?: string } | undefined
      if (typeof content === "object" && content !== null) {
        return content.text ?? ""
      }
    }
    return null
  }
}

/**
 * Represents a content block in the stream
 */
export interface ContentBlock {
  type: string // "text", "tool_use", etc.
  text?: string
  toolName?: string
  toolInput?: Record<string, unknown> | string
  toolUseId?: string
}

/**
 * Represents a complete message assembled from stream events
 */
export interface Message {
  role: string
  content: ContentBlock[]
  thinking?: string
  model?: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
  stopReason?: string
}

/**
 * Type guard to check if event is a content event
 */
export function isContentEvent(event: StreamEvent): boolean {
  return StreamEventHelpers.isContent(event)
}

/**
 * Type guard to check if event is a thinking event
 */
export function isThinkingEvent(event: StreamEvent): boolean {
  return StreamEventHelpers.isThinking(event)
}

/**
 * Type guard to check if event is a tool use event
 */
export function isToolUseEvent(event: StreamEvent): boolean {
  return StreamEventHelpers.isToolUse(event)
}

/**
 * Get text from event (convenience function)
 */
export function getEventText(event: StreamEvent): string | null {
  return StreamEventHelpers.getText(event)
}
