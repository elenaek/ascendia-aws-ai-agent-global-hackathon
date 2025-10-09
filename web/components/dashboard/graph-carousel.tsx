'use client'

import { useUIStore } from '@/stores/ui-store'
import { GraphCard } from './graph-card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Minimize2, BarChart3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export function GraphCarousel() {
  const {
    graphsCarousel,
    minimizeGraphsCarousel,
    expandGraphsCarousel,
    nextGraph,
    prevGraph,
    removeGraphFromCarousel,
  } = useUIStore()

  const { visible, minimized, graphs, currentIndex } = graphsCarousel

  if (!visible) return null

  const currentGraph = graphs[currentIndex]
  const hasMultipleGraphs = graphs.length > 1

  // Minimized floating button
  if (minimized) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed bottom-6 right-6 z-50"
        id="graph-carousel-minimized"
      >
        <Button
          onClick={() => expandGraphsCarousel()}
          className="h-12 w-12 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg border-2 border-purple-400/50 relative group"
        >
          <BarChart3 className="w-6 h-6 text-white" />
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center text-[10px] font-bold text-black border-2 border-background">
            {graphs.length}
          </div>
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-background/95 backdrop-blur-sm border border-primary/30 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            <p className="text-xs text-foreground font-medium">View Graphs ({graphs.length})</p>
          </div>
        </Button>
      </motion.div>
    )
  }

  // Full carousel view
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={minimizeGraphsCarousel}
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="relative w-full max-w-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-purple-400" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Analysis Graphs</h2>
                <p className="text-xs text-muted-foreground">
                  Graph {currentIndex + 1} of {graphs.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={minimizeGraphsCarousel}
                className="text-muted-foreground hover:text-foreground"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Graph Card */}
          <AnimatePresence mode="wait">
            {currentGraph && (
              <GraphCard
                key={currentIndex}
                data={currentGraph}
                onClose={() => removeGraphFromCarousel(currentIndex)}
              />
            )}
          </AnimatePresence>

          {/* Navigation */}
          {hasMultipleGraphs && (
            <div className="flex items-center justify-between mt-4 px-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevGraph}
                className="border-primary/30 hover:bg-primary/10"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              {/* Indicator dots */}
              <div className="flex items-center gap-2">
                {graphs.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => expandGraphsCarousel(index)}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all',
                      index === currentIndex
                        ? 'bg-purple-400 w-6'
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    )}
                    aria-label={`Go to graph ${index + 1}`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={nextGraph}
                className="border-primary/30 hover:bg-primary/10"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
