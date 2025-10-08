'use client'

import { useUIStore } from '@/stores/ui-store'
import { DynamicCompetitorCard } from './dynamic-competitor-card'
import { InsightCard } from './insight-card'
import { CompetitorCarousel } from './competitor-carousel'
import { InsightCarousel } from './insight-carousel'
import { CompetitorContextPayload, InsightPayload } from '@/types/websocket-messages'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DynamicUIOverlay() {
  const { activeCards, removeCard, progressIndicators, highlightedElements } = useUIStore()

  return (
    <>
      {/* Competitor Carousel Modal */}
      <CompetitorCarousel />
      {/* Insight Carousel Modal */}
      <InsightCarousel />
      {/* Dynamic Cards - Fixed position in bottom right */}
      <div
        id="dynamic-ui-overlay"
        className={cn(
          "fixed bottom-6 right-6 z-50 space-y-4 max-w-md pointer-events-none",
          highlightedElements.has('dynamic-ui-overlay') && 'element-highlighted'
        )}
      >
        <div className="pointer-events-auto space-y-4">
          <AnimatePresence mode="popLayout">
            {activeCards.map((card) => {
              if (card.type === 'competitor_context') {
                return (
                  <DynamicCompetitorCard
                    key={card.id}
                    data={card.data as CompetitorContextPayload}
                    onClose={() => removeCard(card.id)}
                  />
                )
              } else if (card.type === 'insight') {
                return (
                  <InsightCard
                    key={card.id}
                    data={card.data as InsightPayload}
                    onClose={() => removeCard(card.id)}
                  />
                )
              }
              return null
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress Indicators - Fixed position in top right, below header */}
      {progressIndicators.length > 0 && (
        <div className="fixed top-20 right-6 z-40 space-y-2 max-w-sm">
          <AnimatePresence mode="popLayout">
            {progressIndicators.map((progress) => (
              <motion.div
                key={progress.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-background/95 backdrop-blur-sm border border-primary/30 rounded-lg p-3 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{progress.message}</p>
                    {progress.percentage !== undefined && (
                      <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  )
}
