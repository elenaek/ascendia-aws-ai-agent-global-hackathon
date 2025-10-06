'use client'

import { useState } from 'react'
import { Wrench, ChevronDown, ChevronUp, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolUseDisplayProps {
  id: string
  name: string
  input: Record<string, unknown> | string
  status: 'running' | 'completed'
  className?: string
}

export function ToolUseDisplay({ name, input, status, className }: ToolUseDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const isRunning = status === 'running'
  const hasInput = typeof input === 'object' ? Object.keys(input).length > 0 : Boolean(input)

  return (
    <div className={cn("flex gap-3 items-start", className)}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isRunning ? 'bg-yellow-500/20' : 'bg-green-500/20'
      )}>
        {isRunning ? (
          <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
        ) : (
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
      </div>
      <div className={cn(
        "rounded-lg border overflow-hidden max-w-[80%] flex-1",
        isRunning
          ? 'bg-yellow-500/10 border-yellow-500/20'
          : 'bg-green-500/10 border-green-500/20'
      )}>
        {/* Header - Always visible */}
        <div
          className={cn(
            "flex items-center justify-between p-3 transition-colors",
            hasInput && "cursor-pointer hover:bg-opacity-20",
            isRunning ? "hover:bg-yellow-500/5" : "hover:bg-green-500/5"
          )}
          onClick={() => hasInput && setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Wrench className={cn(
              "w-3.5 h-3.5",
              isRunning ? 'text-yellow-600' : 'text-green-600'
            )} />
            <span className={cn(
              "text-xs font-semibold",
              isRunning ? 'text-yellow-600' : 'text-green-600'
            )}>
              {isRunning ? '🔧 Using tool' : '✓ Tool used'}: <span className="font-mono">{name}</span>
            </span>
          </div>
          {hasInput && !isRunning && (
            <button
              className={cn(
                "transition-colors",
                isRunning ? "text-yellow-600 hover:text-yellow-700" : "text-green-600 hover:text-green-700"
              )}
              aria-label={isExpanded ? "Collapse input" : "Expand input"}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Collapsible Input Display */}
        {hasInput && !isRunning && isExpanded && (
          <div className={cn(
            "border-t p-3",
            isRunning ? "border-yellow-500/20 bg-yellow-500/5" : "border-green-500/20 bg-green-500/5"
          )}>
            <div className="text-xs text-muted-foreground mb-1 font-semibold">Input:</div>
            <pre className="text-xs bg-black/10 dark:bg-white/5 rounded p-2 overflow-x-auto">
              <code className="text-foreground/90 whitespace-pre-wrap break-words">
                {typeof input === 'object'
                  ? JSON.stringify(input, null, 2)
                  : String(input)
                }
              </code>
            </pre>
          </div>
        )}

        {/* Running state message */}
        {isRunning && (
          <div className="border-t border-yellow-500/20 p-2 bg-yellow-500/5">
            <div className="text-xs text-yellow-700 dark:text-yellow-400 italic flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Executing...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
