/**
 * Client for consuming Bedrock AgentCore streaming responses via HTTP/SSE
 * Ported from Python shared/bedrock_agentcore_stream/client.py
 */

import { StreamEvent, EventType } from './types'
import { StreamEventParser, MessageAssembler } from './parser'

export interface ClientOptions {
  endpointUrl: string
  agentId?: string
  apiKey?: string
  authToken?: string
  headers?: Record<string, string>
  sessionId?: string
  timeout?: number
}

export interface InvokeOptions {
  prompt: string
  sessionId?: string
  additionalParams?: Record<string, unknown>
}

export interface StreamCallbacks {
  onEvent?: (event: StreamEvent) => void
  onContent?: (text: string) => void
  onThinking?: (text: string) => void
  onToolUse?: (toolData: unknown) => void
  onError?: (error: Error) => void
  onComplete?: () => void
}

/**
 * Client for consuming AWS Bedrock AgentCore streaming responses via HTTP/SSE
 */
export class BedrockAgentCoreStreamClient {
  private endpointUrl: string
  private agentId?: string
  private timeout: number
  private headers: Record<string, string>
  private parser: StreamEventParser

  constructor(options: ClientOptions) {
    this.endpointUrl = options.endpointUrl.replace(/\/$/, '')
    this.agentId = options.agentId
    this.timeout = options.timeout || 30000

    // Setup headers
    this.headers = options.headers || {}

    // Add authentication headers if provided
    if (options.apiKey) {
      this.headers['X-API-Key'] = options.apiKey
    }
    if (options.authToken) {
      this.headers['Authorization'] = `Bearer ${options.authToken}`
    }
    if (options.sessionId) {
      this.headers['X-Amzn-Bedrock-AgentCore-Runtime-Session-Id'] = options.sessionId
    }

    // Set content type for SSE
    this.headers['Accept'] = 'application/json'
    this.headers['Cache-Control'] = 'no-cache'

    this.parser = new StreamEventParser()
  }

  /**
   * Invoke the AgentCore agent via HTTP with SSE streaming response
   */
  async *invokeAgentStream(options: InvokeOptions): AsyncGenerator<StreamEvent, void, unknown> {
    try {
      // Prepare request payload
      const payload: Record<string, unknown> = {
        prompt: options.prompt,
        stream: true
      }

      if (options.sessionId) {
        payload.session_id = options.sessionId
      }

      if (this.agentId) {
        payload.agent_id = this.agentId
      }

      if (options.additionalParams) {
        Object.assign(payload, options.additionalParams)
      }

      // Make the HTTP request with streaming
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Check for HTTP errors
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Process the SSE stream
      yield* this.processSSEStream(response)
    } catch (error) {
      console.error('HTTP request error:', error)
      yield {
        type: EventType.ERROR,
        data: {
          error: error instanceof Error ? error.message : String(error),
          error_type: 'http_error'
        },
        timestamp: Date.now()
      }
    }
  }

  /**
   * Process an SSE stream from the HTTP response
   */
  private async *processSSEStream(response: Response): AsyncGenerator<StreamEvent, void, unknown> {
    if (!response.body) {
      throw new Error('No response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // Split by newlines to get complete lines
        const lines = buffer.split('\n')
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) {
            continue
          }

          // SSE format: lines start with "data: "
          if (line.startsWith('data: ')) {
            const data = line.substring(6) // Strip "data: " prefix

            // Parse the JSON line
            const event = this.parser.parseJsonLine(data)
            if (event) {
              yield event
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Invoke agent with callbacks for different event types
   */
  async invokeWithCallbacks(options: InvokeOptions, callbacks: StreamCallbacks): Promise<void> {
    const assembler = new MessageAssembler()

    try {
      for await (const event of this.invokeAgentStream(options)) {
        // Call generic event callback
        callbacks.onEvent?.(event)

        // Call specific callbacks based on event type
        if (event.type === EventType.CONTENT_BLOCK_DELTA && callbacks.onContent) {
          const delta = event.data.delta as { text?: string } | undefined
          const text = delta?.text
          if (text) {
            callbacks.onContent(text)
          }
        } else if (event.type === EventType.THINKING_DELTA && callbacks.onThinking) {
          const delta = event.data.delta as { text?: string } | undefined
          const text = delta?.text
          if (text) {
            callbacks.onThinking(text)
          }
        } else if (event.type === EventType.TOOL_USE_STOP && callbacks.onToolUse) {
          callbacks.onToolUse(event.data)
        } else if (event.type === EventType.ERROR && callbacks.onError) {
          const errorMsg = (event.data.error as string) || 'Unknown error'
          callbacks.onError(new Error(errorMsg))
        }

        // Assemble the complete message
        const message = assembler.processEvent(event)
        if (message && callbacks.onComplete) {
          callbacks.onComplete()
          return
        }
      }

      // If we get here without a complete message, still call onComplete
      callbacks.onComplete?.()
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Test the connection to the AgentCore endpoint
   */
  async testConnection(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(this.endpointUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      return response.status < 500
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }
}
