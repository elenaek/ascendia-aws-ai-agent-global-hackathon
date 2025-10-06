import { getAccessToken } from './auth-utils'
import { BedrockAgentCoreStreamClient } from './bedrock-stream/client'
import { StreamDisplayHandler } from './bedrock-stream/display-handler'
import { EventType, getEventText } from './bedrock-stream/types'

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
  onToolUseStart?: (toolData: { id: string; name: string }) => void
  onToolUseComplete?: (toolData: { id: string; name: string; input: unknown }) => void
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

  // Create streaming client
  const client = new BedrockAgentCoreStreamClient({
    endpointUrl: url,
    authToken: accessToken,
    sessionId: sessionId,
  })

  // Create display handler for thinking tag detection
  const displayHandler = new StreamDisplayHandler(true)

  // Track tool use state
  const currentToolUses = new Map<string, { id: string; name: string; input: string }>()
  const pendingToolCompletions: Array<{ id: string; name: string; input: unknown }> = []

  try {
    // Stream events from AgentCore
    for await (const event of client.invokeAgentStream({
      prompt,
      additionalParams: requestBody.company_information ? { company_information: requestBody.company_information } : undefined
    })) {
      // Handle content blocks with thinking tag detection
      if (event.type === EventType.CONTENT_BLOCK_START) {
        // console.log('CONTENT_BLOCK_START')
        // Complete any pending tools when AI starts responding
        if (pendingToolCompletions.length > 0) {
          // console.log('Completing pending tools:', pendingToolCompletions.length)
          for (const tool of pendingToolCompletions) {
            callbacks.onToolUseComplete?.(tool)
          }
          pendingToolCompletions.length = 0
        }
        displayHandler.reset()
      } else if (event.type === EventType.CONTENT_BLOCK_DELTA) {
        // console.log('CONTENT_BLOCK_DELTA', event.data)
        // Complete any pending tools when AI starts responding
        if (pendingToolCompletions.length > 0) {
          // console.log('Completing pending tools:', pendingToolCompletions.length)
          for (const tool of pendingToolCompletions) {
            callbacks.onToolUseComplete?.(tool)
          }
          pendingToolCompletions.length = 0
        }
        const text = getEventText(event)
        if (text) {
          displayHandler.handleContentDelta(text, {
            onNormalContent: (content) => {
              callbacks.onChunk?.(content)
            },
            onThinkingStart: () => {
              callbacks.onThinking?.(true)
            },
            onThinkingContent: (content) => {
              callbacks.onThinkingContent?.(content)
            },
            onThinkingEnd: () => {
              callbacks.onThinking?.(false)
            }
          })
        }
      }
      // Handle tool use events
      else if (event.type === EventType.TOOL_USE_START) {
        // console.log('TOOL_USE_START', event.data)
        const toolId = event.data.id as string
        const toolName = event.data.name as string
        currentToolUses.set(toolId, { id: toolId, name: toolName, input: '' })
        callbacks.onToolUseStart?.({ id: toolId, name: toolName })
      } else if (event.type === EventType.TOOL_USE_DELTA) {
        // console.log('TOOL_USE_DELTA')
        // Accumulate tool input - find the current tool
        if (currentToolUses.size > 0) {
          const lastTool = Array.from(currentToolUses.values()).pop()
          if (lastTool) {
            const delta = event.data.delta as { input?: string } | undefined
            const deltaInput = delta?.input || ''
            lastTool.input += deltaInput
          }
        }
      } else if (event.type === EventType.TOOL_USE_STOP) {
        // console.log('TOOL_USE_STOP')
        // Prepare tool completion but don't mark as complete yet - wait for AI response
        if (currentToolUses.size > 0) {
          const lastTool = Array.from(currentToolUses.values()).pop()
          if (lastTool) {
            try {
              const parsedInput = lastTool.input ? JSON.parse(lastTool.input) : {}
              pendingToolCompletions.push({ id: lastTool.id, name: lastTool.name, input: parsedInput })
            } catch {
              pendingToolCompletions.push({ id: lastTool.id, name: lastTool.name, input: lastTool.input })
            }
            currentToolUses.delete(lastTool.id)
          }
        }
      }
      // Handle errors
      else if (event.type === EventType.ERROR) {
        // console.log('ERROR', event.data)
        const errorMsg = (event.data.error as string) || 'Unknown error'
        callbacks.onError?.(new Error(errorMsg))
        return
      }
      // Handle message stop
      else if (event.type === EventType.MESSAGE_STOP) {
        // console.log('MESSAGE_STOP', event.data)
        // Only complete if this is the final stop (end_turn), not intermediate stops (tool_use)
        const stopReason = event.data.stopReason as string | undefined
        if (stopReason === 'end_turn') {
          callbacks.onComplete?.()
          return
        }
        // For tool_use stops, continue processing the stream
      }
      // Log unhandled events
      else {
        // console.log('Unhandled event type:', event.type, event.data)
      }
    }

    // If we get here without a MESSAGE_STOP, still call onComplete
    callbacks.onComplete?.()
  } catch (error) {
    console.error('Error calling AgentCore:', error)
    callbacks.onError?.(error as Error)
    throw error
  }
}

/**
 * Reset the conversation session
 */
export function resetSession() {
  sessionId = null
}