'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useChatStore } from '@/stores/chat-store'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { useUIStore } from '@/stores/ui-store'
import { Send, Bot, User, Brain, Loader2, ChevronDown, ChevronUp, Wrench, Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sendMessageToAgentStreaming, type CompanyInfo, getSessionId, setSessionId, resetSession } from '@/lib/agentcore-client'
import { ThinkingDisplay } from './thinking-display'
import { ToolUseDisplay } from './tool-use-display'
import { MessageContent } from './message-content'
import { toast } from 'sonner'

const SESSION_STORAGE_KEY = 'agentcore-session-id'

// Error detection and user-friendly messaging
interface ErrorInfo {
  title: string
  message: string
  suggestion: string
  type: 'connection' | 'timeout' | 'rate-limit' | 'unknown'
}

function detectErrorType(error: unknown): ErrorInfo {
  const errorStr = String(error).toLowerCase()
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : errorStr

  // Connection/Protocol errors
  if (errorMessage.includes('connection') ||
      errorMessage.includes('network') ||
      errorMessage.includes('premature') ||
      errorMessage.includes('protocolerror')) {
    return {
      title: 'Connection Interrupted',
      message: 'The connection to the AI service was interrupted while generating your response.',
      suggestion: 'This can happen with long or complex analyses. Please try asking again, or break your question into smaller parts.',
      type: 'connection'
    }
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return {
      title: 'Response Timeout',
      message: 'The analysis took longer than expected and timed out.',
      suggestion: 'Try breaking your request into smaller, more specific questions.',
      type: 'timeout'
    }
  }

  // Rate limit errors
  if (errorMessage.includes('rate') ||
      errorMessage.includes('throttl') ||
      errorMessage.includes('too many')) {
    return {
      title: 'Too Many Requests',
      message: 'You\'ve made too many requests in a short time.',
      suggestion: 'Please wait a moment before trying again.',
      type: 'rate-limit'
    }
  }

  // Default unknown error
  return {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred while processing your request.',
    suggestion: 'Please try again. If the problem persists, try refreshing the page.',
    type: 'unknown'
  }
}

export function ChatInterface() {
  const {
    messages,
    isLoading,
    isThinking,
    thinkingContent,
    toolUses,
    showCompletedThinking,
    showCompletedToolUses,
    currentStreamingId,
    addMessage,
    appendToMessage,
    setLoading,
    setThinking,
    appendThinkingContent,
    setStreamingId,
    toggleShowCompletedThinking,
    toggleShowCompletedToolUses,
    saveToolUsesToMessage,
    addToolUse,
    updateToolUse,
    clearToolUses,
    clearMessages
  } = useChatStore()
  const { company } = useAnalyticsStore()
  const { highlightedElements } = useUIStore()
  const [input, setInput] = useState('')
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set())
  const [showClearDialog, setShowClearDialog] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Restore session ID from localStorage on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem(SESSION_STORAGE_KEY)
    if (savedSessionId) {
      setSessionId(savedSessionId)
      console.log('Restored session ID from storage:', savedSessionId)
    }
  }, [])

  // Save session ID to localStorage whenever a message is sent
  useEffect(() => {
    const currentSessionId = getSessionId()
    if (currentSessionId && messages.length > 0) {
      localStorage.setItem(SESSION_STORAGE_KEY, currentSessionId)
    }
  }, [messages.length])

  const toggleThinking = (messageId: string) => {
    setExpandedThinking(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  const handleClearMessagesClick = () => {
    if (messages.length === 0) return
    setShowClearDialog(true)
  }

  const handleConfirmClear = () => {
    clearMessages()
    setExpandedThinking(new Set())
    setShowClearDialog(false)
    // Clear session ID to start a fresh conversation
    resetSession()
    localStorage.removeItem(SESSION_STORAGE_KEY)
    console.log('Session reset - new conversation will start with fresh memory')
  }

  const handleCancelClear = () => {
    setShowClearDialog(false)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isThinking, thinkingContent, toolUses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage,
    })

    // Add empty assistant message that will be filled by streaming
    const assistantMessageId = addMessage({
      role: 'assistant',
      content: '',
    })

    // Call AWS Bedrock AgentCore with streaming
    setLoading(true)
    setStreamingId(assistantMessageId)
    clearToolUses() // Clear previous tool uses

    try {
      // Convert analytics store company format to AgentCore format
      const companyInfo: CompanyInfo | null = company ? {
        _id: company.id,
        company_name: company.company_name,
        company_url: company.company_url,
        company_description: company.company_description,
        unique_value_proposition: company.unique_value_proposition,
        stage_of_company: company.stage_of_company,
        types_of_products: company.types_of_products.map(p => ({
          product_name: p.product_name,
          product_description: p.product_description
        })),
        // Map new fields to agent format
        pricing_model: company.pricing_model || 'not specified',
        number_of_employees: company.number_of_employees ? parseInt(company.number_of_employees) || 0 : 0,
        revenue: company.revenue ? parseFloat(company.revenue) || 0 : 0,
        who_are_our_customers: company.target_customers || 'not specified'
      } : null

      await sendMessageToAgentStreaming(userMessage, companyInfo, {
        onChunk: (text) => {
          appendToMessage(assistantMessageId, text)
          // Auto-scroll as content streams in
          scrollToBottom()
        },
        onThinking: (isThinkingNow) => {
          setThinking(isThinkingNow)
        },
        onThinkingContent: (text) => {
          appendThinkingContent(text)
        },
        onToolUseStart: (toolData) => {
          addToolUse({ id: toolData.id, name: toolData.name, input: {} })
        },
        onToolUseComplete: (toolData) => {
          updateToolUse(toolData.id, { status: 'completed', input: toolData.input as Record<string, unknown> | string })
        },
        onError: (error) => {
          console.error('Streaming error:', error)

          // Detect error type and get user-friendly messages
          const errorInfo = detectErrorType(error)

          // Show toast notification with error details
          toast.error(errorInfo.title, {
            description: errorInfo.suggestion,
            duration: 6000,
          })

          // Add formatted error message to chat
          const errorMessage = `\n\n⚠️ **${errorInfo.title}**\n\n${errorInfo.message}\n\n💡 ${errorInfo.suggestion}`
          appendToMessage(assistantMessageId, errorMessage)

          // Clean up state to re-enable chat input
          saveToolUsesToMessage(assistantMessageId)
          setLoading(false)
          setThinking(false)
          setStreamingId(null)
        },
        onComplete: () => {
          // Save tool uses to the message before clearing
          saveToolUsesToMessage(assistantMessageId)
          setLoading(false)
          setThinking(false)
          setStreamingId(null)
        }
      })
    } catch (error) {
      console.error('Error sending message:', error)

      // Detect error type and get user-friendly messages
      const errorInfo = detectErrorType(error)

      // Show toast notification with error details
      toast.error(errorInfo.title, {
        description: errorInfo.suggestion,
        duration: 6000,
      })

      // Add formatted error message to chat
      const errorMessage = `\n\n⚠️ **${errorInfo.title}**\n\n${errorInfo.message}\n\n💡 ${errorInfo.suggestion}`
      appendToMessage(assistantMessageId, errorMessage)

      setLoading(false)
      setThinking(false)
      setStreamingId(null)
    }
  }

  return (
    <Card
      id="chat-interface"
      className={cn(
        "h-[calc(100vh-12rem)] bg-panel border-primary/20 glow flex flex-col",
        highlightedElements.has('chat-interface') && 'element-highlighted'
      )}
    >
      {/* Chat Header */}
      <div className="p-4 border-b border-primary/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
              <Bot className="w-5 h-5" />
              AI Business Analyst
            </h2>
            <p className="text-sm text-muted-foreground">
              {company
                ? `Analyzing competitive landscape for ${company.company_name}`
                : 'Ask me anything about your competitors and market insights'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleShowCompletedThinking}
              className={cn(
                "flex items-center gap-2 transition-colors",
                showCompletedThinking
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-600 hover:bg-cyan-500/30"
                  : "border-primary/30 text-muted-foreground hover:text-foreground"
              )}
              title={showCompletedThinking ? "Hide completed thinking" : "Show completed thinking"}
            >
              <Brain className="w-4 h-4" />
              <span className="text-xs">Thinking</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleShowCompletedToolUses}
              className={cn(
                "flex items-center gap-2 transition-colors",
                showCompletedToolUses
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-600 hover:bg-purple-500/30"
                  : "border-primary/30 text-muted-foreground hover:text-foreground"
              )}
              title={showCompletedToolUses ? "Hide completed tool calls" : "Show completed tool calls"}
            >
              <Wrench className="w-4 h-4" />
              <span className="text-xs">Tools</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearMessagesClick}
              disabled={messages.length === 0}
              className="flex items-center gap-2 border-primary/30 text-muted-foreground hover:text-destructive hover:border-destructive/40 disabled:opacity-50"
              title="Clear all messages"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-xs">Clear</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className="space-y-4">
              <div className="text-primary text-glow text-6xl">
                <Bot className="w-16 h-16 mx-auto animate-glow-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {company
                    ? `Welcome back, ${company.company_name}!`
                    : 'Welcome to Ascendia AI'}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {company
                    ? `I'm your AI business analyst, ready to help you with your company ${company.company_name}. I can help you understand the competitive landscape, analyze your ${company.stage_of_company} company's position, identify competitors for your product${company.types_of_products.length > 1 ? 's' : ''}, and provide strategic insights.`
                    : "I'm your AI business analyst. Ask me to analyze competitors, generate insights, or explore market opportunities."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3 items-start',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className={cn(
                    "w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0",
                    !message.content && isLoading && "animate-pulse"
                  )}>
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}

                <div className="flex flex-col gap-2 max-w-[80%]">
                  {/* Show thinking block if exists and toggle is enabled */}
                  {message.role === 'assistant' && message.thinking && showCompletedThinking && (
                    <div className="bg-cyan-500/10 rounded-lg border border-cyan-500/20 overflow-hidden">
                      <div
                        className="flex items-center justify-between p-2 border-b border-cyan-500/20 cursor-pointer hover:bg-cyan-500/5 transition-colors"
                        onClick={() => toggleThinking(message.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Brain className="w-3.5 h-3.5 text-cyan-600" />
                          <span className="text-xs text-cyan-600 font-semibold">💭 Thought Process</span>
                        </div>
                        <button
                          className="text-cyan-600 hover:text-cyan-700 transition-colors"
                          aria-label={expandedThinking.has(message.id) ? "Collapse thinking" : "Expand thinking"}
                        >
                          {expandedThinking.has(message.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {expandedThinking.has(message.id) && (
                        <div className="p-3 bg-cyan-500/5">
                          <div className="text-xs text-gray-400 italic whitespace-pre-wrap break-words font-mono">
                            {message.thinking}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show tool uses for this message (only if toggle is enabled) */}
                  {message.role === 'assistant' && message.toolUses && showCompletedToolUses && message.toolUses.map((tool) => (
                    <ToolUseDisplay
                      key={tool.id}
                      id={tool.id}
                      name={tool.name}
                      input={tool.input}
                      status={tool.status}
                    />
                  ))}

                  {/* Hide message bubble when currently streaming (will be shown after ToolUseDisplay) */}
                  {!(message.role === 'assistant' && message.id === currentStreamingId && isLoading) && (
                    <div
                      className={cn(
                        'rounded-lg p-3',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      )}
                    >
                      {message.role === 'assistant' && !message.content.trim() && isLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      ) : (
                        <>

                          <MessageContent
                            content={message.content}
                            role={message.role}
                          />
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary" />
                  </div>
                )}
              </div>
            ))}

            {/* Show thinking and tool uses for currently streaming message */}
            <ThinkingDisplay
              isThinking={isThinking}
              thinkingContent={thinkingContent}
            />

            {/* Only show global tool uses during streaming (not saved to message yet) */}
            {isLoading && toolUses.map((tool) => (
              <ToolUseDisplay
                key={tool.id}
                id={tool.id}
                name={tool.name}
                input={tool.input}
                status={tool.status}
              />
            ))}

            {/* Show streaming message content at the bottom */}
            {isLoading && currentStreamingId && (() => {
              const streamingMessage = messages.find(m => m.id === currentStreamingId)
              return streamingMessage && (
                <div className="flex gap-3 items-start justify-start">
                  {/* <div className={cn(
                    "w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0",
                    !streamingMessage.content.trim() && "animate-pulse"
                  )}>
                    <Bot className="w-4 h-4 text-primary" />
                  </div> */}
                  <div className="flex flex-col gap-2 max-w-[80%]">
                    <div className="rounded-lg p-3 bg-muted text-foreground">
                      {!streamingMessage.content.trim() ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      ) : (
                        <>
                          <MessageContent
                            content={streamingMessage.content}
                            role="assistant"
                          />
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(streamingMessage.timestamp).toLocaleTimeString()}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-primary/20">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={company
              ? `Ask about competitors for ${company.types_of_products[0]?.product_name || 'your products'}...`
              : "Ask about competitors, insights, or market analysis..."}
            disabled={isLoading}
            className="flex-1 bg-background border-primary/30 focus:border-primary"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>

      {/* Clear Messages Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={(open) => !open && handleCancelClear()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Clear All Messages
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all messages? This will remove the entire conversation history and start a new session with fresh memory. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelClear}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmClear}
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
