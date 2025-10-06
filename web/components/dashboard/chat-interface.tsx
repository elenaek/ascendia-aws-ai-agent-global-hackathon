'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chat-store'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { Send, Bot, User, Brain, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sendMessageToAgentStreaming, type CompanyInfo } from '@/lib/agentcore-client'
import { ThinkingDisplay } from './thinking-display'
import { ToolUseDisplay } from './tool-use-display'
import { MessageContent } from './message-content'

export function ChatInterface() {
  const {
    messages,
    isLoading,
    isThinking,
    thinkingContent,
    toolUses,
    showCompletedThinking,
    addMessage,
    appendToMessage,
    setLoading,
    setThinking,
    appendThinkingContent,
    setStreamingId,
    toggleShowCompletedThinking,
    addToolUse,
    updateToolUse,
    clearToolUses
  } = useChatStore()
  const { company } = useAnalyticsStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
        // Add default values for optional fields if needed
        pricing_model: 'not specified',
        number_of_employees: 0,
        revenue: 0,
        who_are_our_customers: 'not specified'
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
          updateToolUse(toolData.id, { status: 'completed', input: toolData.input })
        },
        onError: (error) => {
          console.error('Streaming error:', error)
          appendToMessage(assistantMessageId, '\n\nSorry, I encountered an error while processing your request.')
        },
        onComplete: () => {
          setLoading(false)
          setThinking(false)
          setStreamingId(null)
        }
      })
    } catch (error) {
      console.error('Error sending message:', error)
      appendToMessage(assistantMessageId, 'Sorry, I encountered an error while processing your request. Please try again.')
      setLoading(false)
      setThinking(false)
      setStreamingId(null)
    }
  }

  return (
    <Card className="h-[calc(100vh-12rem)] bg-panel border-primary/20 glow flex flex-col">
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
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}

                <div className="flex flex-col gap-2 max-w-[80%]">
                  {/* Show thinking block if exists and toggle is enabled */}
                  {message.role === 'assistant' && message.thinking && showCompletedThinking && (
                    <div className="bg-cyan-500/10 rounded-lg border border-cyan-500/20 overflow-hidden">
                      <div className="flex items-center gap-2 p-2 border-b border-cyan-500/20">
                        <Brain className="w-3.5 h-3.5 text-cyan-600" />
                        <span className="text-xs text-cyan-600 font-semibold">💭 Thought Process</span>
                      </div>
                      <div className="p-3 bg-cyan-500/5">
                        <div className="text-xs text-cyan-900 dark:text-cyan-100 italic whitespace-pre-wrap break-words font-mono">
                          {message.thinking}
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className={cn(
                      'rounded-lg p-3',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    <MessageContent
                      content={message.content}
                      role={message.role}
                    />
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary" />
                  </div>
                )}
              </div>
            ))}

            <ThinkingDisplay
              isThinking={isThinking}
              thinkingContent={thinkingContent}
            />

            {toolUses.map((tool) => (
              <ToolUseDisplay
                key={tool.id}
                id={tool.id}
                name={tool.name}
                input={tool.input}
                status={tool.status}
              />
            ))}

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
    </Card>
  )
}
