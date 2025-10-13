'use client'

import { useState } from 'react'
import { Wrench, ChevronDown, ChevronUp, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolUseDisplay } from './tool-use-display'

interface ToolUse {
  id: string
  name: string
  input: Record<string, unknown> | string
  status: 'running' | 'completed'
}

interface ToolUsesContainerProps {
  toolUses: ToolUse[]
  isStreaming?: boolean
  className?: string
}

export function ToolUsesContainer({ toolUses, isStreaming = false, className }: ToolUsesContainerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!toolUses || toolUses.length === 0) {
    return null
  }

  const completedCount = toolUses.filter(t => t.status === 'completed').length
  const runningCount = toolUses.filter(t => t.status === 'running').length
  const allCompleted = completedCount === toolUses.length

  // Determine the theme color based on status
  const themeColor = allCompleted ? 'green' : 'yellow'

  return (
    <div className={cn("flex gap-3 items-start", className)}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        allCompleted ? 'bg-green-500/20' : 'bg-yellow-500/20'
      )}>
        {allCompleted ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
        )}
      </div>
      <div className={cn(
        "rounded-lg border overflow-hidden max-w-[80%] flex-1",
        allCompleted
          ? 'bg-green-500/10 border-green-500/20'
          : 'bg-yellow-500/10 border-yellow-500/20'
      )}>
        {/* Header - Always visible */}
        <div
          className={cn(
            "flex items-center justify-between p-3 cursor-pointer transition-colors",
            allCompleted ? "hover:bg-green-500/5" : "hover:bg-yellow-500/5"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Wrench className={cn(
              "w-3.5 h-3.5",
              allCompleted ? 'text-green-600' : 'text-yellow-600'
            )} />
            <span className={cn(
              "text-xs font-semibold",
              allCompleted ? 'text-green-600' : 'text-yellow-600'
            )}>
              {allCompleted
                ? `✓ ${toolUses.length} tool${toolUses.length > 1 ? 's' : ''} used`
                : runningCount > 0
                  ? `🔧 Using ${toolUses.length} tool${toolUses.length > 1 ? 's' : ''}...`
                  : `🔧 ${toolUses.length} tool${toolUses.length > 1 ? 's' : ''}`
              }
            </span>
            {/* Tool count badge */}
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold",
              allCompleted
                ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
            )}>
              {toolUses.length}
            </span>
          </div>
          <button
            className={cn(
              "transition-colors",
              allCompleted
                ? "text-green-600 hover:text-green-700"
                : "text-yellow-600 hover:text-yellow-700"
            )}
            aria-label={isExpanded ? "Collapse tools" : "Expand tools"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Collapsible Tool List */}
        {isExpanded && (
          <div className={cn(
            "border-t p-2 space-y-2",
            allCompleted
              ? "border-green-500/20 bg-green-500/5"
              : "border-yellow-500/20 bg-yellow-500/5"
          )}>
            {toolUses.map((tool) => (
              <div key={tool.id} className="pl-0">
                <ToolUseDisplay
                  id={tool.id}
                  name={tool.name}
                  input={tool.input}
                  status={tool.status}
                  className="gap-2"
                />
              </div>
            ))}
          </div>
        )}

        {/* Running state summary */}
        {!allCompleted && runningCount > 0 && !isExpanded && (
          <div className="border-t border-yellow-500/20 p-2 bg-yellow-500/5">
            <div className="text-xs text-yellow-700 dark:text-yellow-400 italic flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{runningCount} running, {completedCount} completed</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
