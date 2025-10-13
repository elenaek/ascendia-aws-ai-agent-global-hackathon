'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { StreamingText } from './streaming-text'

interface MessageContentProps {
  content: string
  role: 'user' | 'assistant'
  className?: string
  isStreaming?: boolean
}

export function MessageContent({ content, role, className, isStreaming = false }: MessageContentProps) {
  const isUser = role === 'user'

  if (isUser) {
    // User messages - simple text display
    return (
      <div className={cn("text-sm whitespace-pre-wrap break-words", className)}>
        {content}
      </div>
    )
  }

  // Assistant messages - markdown rendering with optional streaming animation
  return (
    <div className={cn("text-sm prose prose-sm dark:prose-invert max-w-none", className)}>
      <StreamingText targetText={content} isStreaming={isStreaming}>
        {(displayedText) => (
          <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom component rendering for better styling
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc mb-2 ml-2 space-y-1 gap-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal mb-2 ml-2 space-y-1 gap-2">{children}</ol>,
          li: ({ children }) => <li className="ml-2 gap-2">{children}</li>,
          code: (props) => {
            const { inline, children, ...rest } = props as { inline?: boolean; children?: React.ReactNode; [key: string]: unknown }
            if (inline) {
              return (
                <code
                  className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-mono"
                  {...rest}
                >
                  {children}
                </code>
              )
            }
            return (
              <code
                className="block bg-black/10 dark:bg-white/5 p-3 rounded my-2 overflow-x-auto text-xs font-mono"
                {...rest}
              >
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="my-2">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/30 pl-4 italic my-2">
              {children}
            </blockquote>
          ),
          h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mb-1 mt-2">{children}</h3>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse border border-border">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-muted px-3 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2">
              {children}
            </td>
          ),
          hr: () => <hr className="my-4 border-border" />,
          strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {displayedText}
      </ReactMarkdown>
        )}
      </StreamingText>
    </div>
  )
}
