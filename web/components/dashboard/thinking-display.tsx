'use client'

import { useState } from 'react'
import { Brain, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThinkingDisplayProps {
  isThinking: boolean
  thinkingContent: string
  className?: string
}

export function ThinkingDisplay({ isThinking, thinkingContent, className }: ThinkingDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (!isThinking && !thinkingContent) {
    return null
  }

  return (
    <div className={cn("flex gap-3 items-start", className)}>
      <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
        <Brain className="w-4 h-4 text-cyan-500 animate-pulse" />
      </div>
      <div className="bg-cyan-500/10 rounded-lg border border-cyan-500/20 overflow-hidden max-w-[80%] flex-1">
        {/* Header - Always visible */}
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-cyan-500/5 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-cyan-600 font-semibold">
              {isThinking ? '🤔 Thinking...' : '💭 Thought Process'}
            </span>
            {isThinking && (
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse delay-100" />
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse delay-200" />
              </div>
            )}
          </div>
          {thinkingContent && (
            <button
              className="text-cyan-600 hover:text-cyan-700 transition-colors"
              aria-label={isExpanded ? "Collapse thinking" : "Expand thinking"}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Collapsible Content */}
        {thinkingContent && isExpanded && (
          <div className="border-t border-cyan-500/20 p-3 bg-cyan-500/5">
            <div className="text-xs text-cyan-900 dark:text-cyan-100 italic whitespace-pre-wrap break-words font-mono">
              {thinkingContent}
            </div>
          </div>
        )}

        {/* Footer line (like CLI) */}
        {!isThinking && thinkingContent && isExpanded && (
          <div className="border-t border-cyan-500/30 h-px" />
        )}
      </div>
    </div>
  )
}
