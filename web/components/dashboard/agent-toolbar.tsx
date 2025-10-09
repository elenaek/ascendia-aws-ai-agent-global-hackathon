'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Lightbulb, X } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

interface ToolbarItemProps {
  icon: React.ReactNode
  label: string
  badge?: number
  onClick: () => void
  onClose?: () => void
  isActive?: boolean
  isHighlighted?: boolean
}

const ToolbarItem = ({ icon, label, badge, onClick, onClose, isActive, isHighlighted }: ToolbarItemProps) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="relative group"
    >
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200",
          "bg-background/80 backdrop-blur-sm border border-primary/30",
          "hover:bg-primary/10 hover:border-primary/50 hover:shadow-lg",
          isActive && "bg-primary/20 border-primary/60 shadow-md",
          isHighlighted && "element-highlighted"
        )}
        title={label}
      >
        <div className="relative">
          {icon}
          {badge !== undefined && badge > 0 && (
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground animate-pulse">
              {badge}
            </div>
          )}
        </div>
        <span className="text-xs font-medium text-foreground">{label}</span>
      </button>

      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
          title="Close"
        >
          <X className="w-2.5 h-2.5 text-destructive-foreground" />
        </button>
      )}
    </motion.div>
  )
}

export function AgentToolbar() {
  const {
    competitorCarousel,
    expandCompetitorCarousel,
    hideCompetitorCarousel,
    insightsCarousel,
    expandInsightsCarousel,
    hideInsightsCarousel,
    highlightedToolbarItems,
  } = useUIStore()

  // Determine which items should be shown in the toolbar
  const hasCompetitors = competitorCarousel.visible && competitorCarousel.minimized
  const hasInsights = insightsCarousel.visible && insightsCarousel.minimized
  const hasAnyItems = hasCompetitors || hasInsights

  if (!hasAnyItems) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-0 right-0 z-[50] pointer-events-none">
      <div className="container mx-auto px-6 pointer-events-auto">
        <div className="bg-background/95 backdrop-blur-md border border-primary/30 rounded-lg shadow-lg px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Agent Updates
            </span>
            <div className="h-4 w-px bg-primary/30" />

            <div className="flex items-center gap-2 flex-1">
              <AnimatePresence mode="popLayout">
                {/* Competitors Item */}
                {hasCompetitors && (
                  <ToolbarItem
                    key="competitors"
                    icon={<Building2 className="w-4 h-4 text-primary" />}
                    label="Competitors"
                    badge={competitorCarousel.competitors.length}
                    onClick={() => expandCompetitorCarousel()}
                    onClose={hideCompetitorCarousel}
                    isActive={false}
                    isHighlighted={highlightedToolbarItems.has('competitors')}
                  />
                )}

                {hasInsights && (
                  <ToolbarItem
                    key="insights"
                    icon={<Lightbulb className="w-4 h-4 text-cyan-400" />}
                    label="Insights"
                    badge={insightsCarousel.insights.length}
                    onClick={() => expandInsightsCarousel()}
                    onClose={hideInsightsCarousel}
                    isActive={false}
                    isHighlighted={highlightedToolbarItems.has('insights')}
                  />
                )}

                {/* Placeholder: Graphs - Future feature */}
                {/* <ToolbarItem
                  key="graphs"
                  icon={<BarChart3 className="w-4 h-4 text-blue-400" />}
                  label="Graphs"
                  badge={0}
                  onClick={() => {}}
                /> */}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
