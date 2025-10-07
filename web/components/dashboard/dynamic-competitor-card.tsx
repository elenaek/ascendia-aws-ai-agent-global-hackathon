'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, ExternalLink, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { CompetitorContextPayload } from '@/types/websocket-messages'

interface DynamicCompetitorCardProps {
  data: CompetitorContextPayload
  onClose: () => void
}

export function DynamicCompetitorCard({ data, onClose }: DynamicCompetitorCardProps) {
  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'Direct Competitors':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'Indirect Competitors':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'Potential Competitors':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-primary/20 text-primary border-primary/30'
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <Card className="bg-gradient-to-br from-purple-500/10 via-background to-blue-500/10 border-primary/30 glow overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-primary/20 flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 animate-glow-pulse">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-foreground truncate">
                    {data.company_name}
                  </h3>
                  {data.category && (
                    <Badge className={getCategoryColor(data.category)} variant="outline">
                      {data.category}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-primary font-medium">{data.product_name}</p>
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
          <div className="p-4 space-y-3">
            {data.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {data.description}
              </p>
            )}

            {data.website && (
              <a
                href={`https://${data.website.replace(/^https?:\/\//, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors group"
              >
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                <span className="underline underline-offset-2">{data.website}</span>
              </a>
            )}
          </div>

          {/* Footer indicator */}
          <div className="h-1 bg-gradient-to-r from-purple-500 via-primary to-blue-500 animate-pulse" />
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
