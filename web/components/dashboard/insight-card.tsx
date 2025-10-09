'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, Sparkles, AlertCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { InsightPayload } from '@/types/websocket-messages'

interface InsightCardProps {
  data: InsightPayload
  onClose: () => void
}

export function InsightCard({ data, onClose }: InsightCardProps) {
  const getSeverityConfig = (severity?: string) => {
    switch (severity) {
      case 'success':
        return {
          icon: Sparkles,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30',
        }
      case 'warning':
        return {
          icon: AlertCircle,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        }
      case 'info':
      default:
        return {
          icon: Lightbulb,
          color: 'text-cyan-400',
          bgColor: 'bg-cyan-500/10',
          borderColor: 'border-cyan-500/30',
          badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        }
    }
  }

  const config = getSeverityConfig(data.severity)
  const Icon = config.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <Card className={`${config.bgColor} ${config.borderColor} border-2 overflow-hidden`}>
          {/* Header */}
          <div className="p-4 border-b border-primary/20 flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div
                className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0 animate-pulse`}
              >
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-foreground">
                    {data.title}
                  </h3>
                  {data.category && (
                    <Badge className={config.badgeColor} variant="outline">
                      {data.category}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted/50"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {data.content}
            </p>
          </div>

          {/* Footer indicator */}
          <div className={`h-1 ${config.bgColor} animate-pulse`} />
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
