import { getAccessToken } from './auth-utils'

// Configuration
const REGION_NAME = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
const AGENT_ARN = process.env.NEXT_PUBLIC_AGENTCORE_ARN || '';

// Generate a session ID for the conversation
function generateSessionId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

let sessionId: string | null = null

export interface AgentCoreResponse {
  result: string
}

export interface StreamCallbacks {
  onChunk?: (text: string) => void
  onThinking?: (isThinking: boolean) => void
  onThinkingContent?: (text: string) => void
  onError?: (error: Error) => void
  onComplete?: () => void
}

export interface CompanyInfo {
  _id?: string
  id?: string
  company_name: string
  company_url: string
  company_description: string
  unique_value_proposition: string
  stage_of_company: string
  types_of_products: Array<{
    product_name: string
    product_description: string
  }>
  pricing_model?: string
  number_of_employees?: number
  revenue?: number
  who_are_our_customers?: string
}

/**
 * Send a message to the AgentCore endpoint
 * @param prompt - The user's message
 * @param companyInfo - The company information to provide context
 * @returns The agent's response
 */
export async function sendMessageToAgent(
  prompt: string,
  companyInfo: CompanyInfo | null
): Promise<string> {
  // Get the current user's access token
  const accessToken = await getAccessToken()
  if (!accessToken) {
    throw new Error('User not authenticated')
  }

  // Generate or reuse session ID
  if (!sessionId) {
    sessionId = generateSessionId()
  }

  // URL encode the agent ARN
  const escapedAgentArn = encodeURIComponent(AGENT_ARN)

  // Construct the URL
  const url = `https://bedrock-agentcore.${REGION_NAME}.amazonaws.com/runtimes/${escapedAgentArn}/invocations?qualifier=DEFAULT`

  // Prepare the request body
  const requestBody = {
    prompt,
    company_information: companyInfo ? {
      _id: companyInfo._id || companyInfo.id,
      company_name: companyInfo.company_name,
      company_url: companyInfo.company_url,
      company_description: companyInfo.company_description,
      unique_value_proposition: companyInfo.unique_value_proposition,
      stage_of_company: companyInfo.stage_of_company,
      types_of_products: companyInfo.types_of_products,
      pricing_model: companyInfo.pricing_model || 'not specified',
      number_of_employees: companyInfo.number_of_employees || 0,
      revenue: companyInfo.revenue || 0,
      who_are_our_customers: companyInfo.who_are_our_customers || 'not specified'
    } : null
  }

  // Set up headers
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': sessionId
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AgentCore error response:', errorText)
      throw new Error(`AgentCore request failed: ${response.status}`)
    }

    const data: AgentCoreResponse = await response.json()
    return data.result || 'No response from agent'
  } catch (error) {
    console.error('Error calling AgentCore:', error)
    throw error
  }
}

/**
 * Send a message to the AgentCore endpoint with streaming support
 * @param prompt - The user's message
 * @param companyInfo - The company information to provide context
 * @param callbacks - Callbacks for streaming events
 * @returns Promise that resolves when streaming is complete
 */
export async function sendMessageToAgentStreaming(
  prompt: string,
  companyInfo: CompanyInfo | null,
  callbacks: StreamCallbacks
): Promise<void> {
  // Get the current user's access token
  const accessToken = await getAccessToken()
  if (!accessToken) {
    throw new Error('User not authenticated')
  }

  // Generate or reuse session ID
  if (!sessionId) {
    sessionId = generateSessionId()
  }

  // URL encode the agent ARN
  const escapedAgentArn = encodeURIComponent(AGENT_ARN)

  // Construct the URL with streaming parameter
  const url = `https://bedrock-agentcore.${REGION_NAME}.amazonaws.com/runtimes/${escapedAgentArn}/invocations?qualifier=DEFAULT&stream=true`

  // Prepare the request body
  const requestBody = {
    prompt,
    company_information: companyInfo ? {
      _id: companyInfo._id || companyInfo.id,
      company_name: companyInfo.company_name,
      company_url: companyInfo.company_url,
      company_description: companyInfo.company_description,
      unique_value_proposition: companyInfo.unique_value_proposition,
      stage_of_company: companyInfo.stage_of_company,
      types_of_products: companyInfo.types_of_products,
      pricing_model: companyInfo.pricing_model || 'not specified',
      number_of_employees: companyInfo.number_of_employees || 0,
      revenue: companyInfo.revenue || 0,
      who_are_our_customers: companyInfo.who_are_our_customers || 'not specified'
    } : null
  }

  // Set up headers
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': sessionId,
    'Accept': 'text/event-stream'
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AgentCore error response:', errorText)
      throw new Error(`AgentCore request failed: ${response.status}`)
    }

    // Check if response is actually streaming
    const contentType = response.headers.get('content-type')

    // If not streaming, fall back to regular JSON response
    if (!contentType?.includes('event-stream') && !contentType?.includes('text/event-stream')) {
      const data = await response.json()

      // Handle the response based on its structure
      let resultText = ''
      if (typeof data === 'string') {
        resultText = data
      } else if (data.result) {
        resultText = data.result
      } else if (data.body) {
        resultText = data.body
      } else {
        // If we get the full object, try to extract the text
        resultText = JSON.stringify(data)
      }

      // Send the full text at once
      callbacks.onChunk?.(resultText)

      callbacks.onComplete?.()
      return
    }

    // Process the streaming response
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('No response body')
    }

    let buffer = ''
    let isInThinking = false
    let thinkingBuffer = ''
    let eventBuffer = ''  // Buffer for incomplete JSON events

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Process any remaining buffered content
        if (buffer.trim()) {
          console.log('Processing remaining buffer:', buffer)
        }
        callbacks.onComplete?.()
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk

      // Process SSE events - handle both complete and partial lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''  // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim() === '') {
          // Empty line - might signal end of an SSE event
          continue
        }

        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()

          if (data === '[DONE]') {
            callbacks.onComplete?.()
            return
          }

          // Parse Python string representations for thinking events
          if (data.startsWith('"') && data.includes("'data':")) {
            // Check if this is a thinking event
            if (data.includes("'data': 'thinking'") && data.includes("'delta': {'text':")) {
              // Extract the thinking text using regex
              const match = data.match(/'delta':\s*\{'text':\s*'([^']*)'/);
              if (match && match[1]) {
                callbacks.onThinkingContent?.(match[1])
              }
            }
            continue
          }

          try {
            const parsed = JSON.parse(data)

            // Skip lifecycle events
            if (parsed.init_event_loop || parsed.start || parsed.start_event_loop || parsed.end_event_loop) {
              continue
            }

            // Handle events with nested event structure (this is what we're getting)
            if (parsed.event?.contentBlockDelta?.delta?.text) {
              const text = parsed.event.contentBlockDelta.delta.text
              const result = processStreamChunk(text, isInThinking, thinkingBuffer, callbacks)
              isInThinking = result.isInThinking
              thinkingBuffer = result.thinkingBuffer
              continue
            }

            // Handle text generation events with 'data' field (Strands format)
            if ('data' in parsed && typeof parsed.data === 'string' && parsed.data.trim()) {
              const text = parsed.data
              const result = processStreamChunk(text, isInThinking, thinkingBuffer, callbacks)
              isInThinking = result.isInThinking
              thinkingBuffer = result.thinkingBuffer
              continue
            }

            // Handle message stop event
            if (parsed.event?.messageStop) {
              callbacks.onComplete?.()
              return
            }

            // Handle other event types silently
            if (parsed.event?.messageStart || parsed.event?.contentBlockStop) {
              continue
            }

            // Skip other event types without logging
          } catch (e) {
            // Silently skip unparseable data (likely Python string representations)
            // These are debug outputs from the backend that we can safely ignore
          }
        }
      }
    }
  } catch (error) {
    console.error('Error calling AgentCore:', error)
    callbacks.onError?.(error as Error)
    throw error
  }
}

/**
 * Process a streaming chunk and handle thinking tags
 */
function processStreamChunk(
  text: string,
  isInThinking: boolean,
  thinkingBuffer: string,
  callbacks: StreamCallbacks
): { isInThinking: boolean; thinkingBuffer: string } {
  let currentText = text
  let inThinking = isInThinking
  let buffer = thinkingBuffer

  // Check for thinking tag start
  const thinkingStartIndex = currentText.indexOf('<thinking>')
  const thinkingEndIndex = currentText.indexOf('</thinking>')

  if (thinkingStartIndex !== -1 && !inThinking) {
    // Output text before thinking tag
    const beforeThinking = currentText.substring(0, thinkingStartIndex)
    if (beforeThinking) {
      callbacks.onChunk?.(beforeThinking)
    }

    inThinking = true
    callbacks.onThinking?.(true)
    buffer = currentText.substring(thinkingStartIndex + 10) // Skip '<thinking>'

    // Check if thinking ends in the same chunk
    if (thinkingEndIndex > thinkingStartIndex) {
      inThinking = false
      callbacks.onThinking?.(false)
      const afterThinking = currentText.substring(thinkingEndIndex + 11) // Skip '</thinking>'
      if (afterThinking) {
        callbacks.onChunk?.(afterThinking)
      }
      buffer = ''
    }
  } else if (thinkingEndIndex !== -1 && inThinking) {
    // Thinking ends
    inThinking = false
    callbacks.onThinking?.(false)
    const afterThinking = currentText.substring(thinkingEndIndex + 11) // Skip '</thinking>'
    if (afterThinking) {
      callbacks.onChunk?.(afterThinking)
    }
    buffer = ''
  } else if (inThinking) {
    // Still in thinking mode, buffer the content
    buffer += currentText
  } else {
    // Normal text, output it
    callbacks.onChunk?.(currentText)
  }

  return { isInThinking: inThinking, thinkingBuffer: buffer }
}

/**
 * Reset the conversation session
 */
export function resetSession() {
  sessionId = null
}