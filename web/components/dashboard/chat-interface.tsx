'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chat-store'
import { Send, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChatInterface() {
  const { messages, isLoading, addMessage, setLoading } = useChatStore()
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

    // Simulate AI response (in production, this would call AWS Bedrock AgentCore)
    setLoading(true)
    setTimeout(() => {
      addMessage({
        role: 'assistant',
        content: 'This is a placeholder response. In production, this would be powered by AWS Bedrock AgentCore.',
      })
      setLoading(false)
    }, 1000)
  }

  return (
    <Card className="h-[calc(100vh-12rem)] bg-panel border-primary/20 glow flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-primary/20">
        <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
          <Bot className="w-5 h-5" />
          AI Business Analyst
        </h2>
        <p className="text-sm text-muted-foreground">
          Ask me anything about your competitors and market insights
        </p>
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
                  Welcome to Ascendia AI
                </h3>
                <p className="text-muted-foreground max-w-md">
                  I'm your AI business analyst. Ask me to analyze competitors,
                  generate insights, or explore market opportunities.
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

                <div
                  className={cn(
                    'rounded-lg p-3 max-w-[80%]',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce delay-100" />
                    <div className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}

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
            placeholder="Ask about competitors, insights, or market analysis..."
            disabled={isLoading}
            className="flex-1 bg-background border-primary/30 focus:border-primary"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  )
}
