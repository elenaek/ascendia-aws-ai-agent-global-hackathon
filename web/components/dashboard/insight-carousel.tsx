'use client'

import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Lightbulb, Sparkles, AlertCircle, X, Minimize2, Trash2 } from 'lucide-react'
import { IconArrowNarrowRight } from '@tabler/icons-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/stores/ui-store'
import { InsightPayload } from '@/types/websocket-messages'
import { useState, useRef, useEffect, useMemo } from 'react'

interface InsightSlideProps {
  insight: InsightPayload
  index: number
  current: number
  handleSlideClick: (index: number) => void
  onRemove: () => void
}

const InsightSlide = ({
  insight,
  index,
  current,
  handleSlideClick,
  onRemove,
}: InsightSlideProps) => {
  const slideRef = useRef<HTMLLIElement>(null)
  const xRef = useRef(0)
  const yRef = useRef(0)
  const frameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const animate = () => {
      if (!slideRef.current) return

      const x = xRef.current
      const y = yRef.current

      slideRef.current.style.setProperty('--x', `${x}px`)
      slideRef.current.style.setProperty('--y', `${y}px`)

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const handleMouseMove = (event: React.MouseEvent) => {
    const el = slideRef.current
    if (!el) return

    const r = el.getBoundingClientRect()
    xRef.current = event.clientX - (r.left + Math.floor(r.width / 2))
    yRef.current = event.clientY - (r.top + Math.floor(r.height / 2))
  }

  const handleMouseLeave = () => {
    xRef.current = 0
    yRef.current = 0
  }

  const getSeverityConfig = (severity?: string) => {
    switch (severity) {
      case 'success':
        return {
          icon: Sparkles,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30',
          gradientFrom: 'from-green-500/10',
          gradientTo: 'to-green-500/10',
        }
      case 'warning':
        return {
          icon: AlertCircle,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
          gradientFrom: 'from-yellow-500/10',
          gradientTo: 'to-yellow-500/10',
        }
      case 'info':
      default:
        return {
          icon: Lightbulb,
          color: 'text-cyan-400',
          bgColor: 'bg-cyan-500/10',
          borderColor: 'border-cyan-500/30',
          badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
          gradientFrom: 'from-cyan-500/10',
          gradientTo: 'to-cyan-500/10',
        }
    }
  }

  const config = getSeverityConfig(insight.severity)
  const Icon = config.icon

  return (
    <div className="[perspective:1200px] [transform-style:preserve-3d]">
      <li
        ref={slideRef}
        className="flex flex-1 flex-col items-center justify-center relative text-center opacity-100 transition-all duration-300 ease-in-out w-[70vmin] h-[70vmin] mx-[4vmin] z-10"
        onClick={() => handleSlideClick(index)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform:
            current !== index
              ? 'scale(0.98) rotateX(8deg)'
              : 'scale(1) rotateX(0deg)',
          transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          transformOrigin: 'bottom',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div
          className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${config.gradientFrom} via-background ${config.gradientTo} border ${config.borderColor} rounded-2xl overflow-hidden transition-all ease-out glow`}
          style={{
            transform:
              current === index
                ? 'translate3d(calc(var(--x) / 30), calc(var(--y) / 30), 0)'
                : 'none',
            opacity: current === index ? 1 : 0.6,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            WebkitFontSmoothing: 'antialiased',
            willChange: 'transform',
          }}
        >
          {/* Background gradient effect */}
          <div className={`absolute inset-0 bg-gradient-to-br ${config.bgColor} via-transparent to-secondary/5`} />

          {/* Content */}
          <div className="relative h-full flex flex-col p-8">
            {/* Remove Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-destructive/80 hover:bg-destructive flex items-center justify-center transition-all hover:scale-110 shadow-lg"
              title="Remove from carousel"
            >
              <X className="w-4 h-4 text-destructive-foreground" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-16 h-16 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0 animate-glow-pulse`}>
                <Icon className={`w-8 h-8 ${config.color}`} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {insight.title}
                </h3>
                {insight.category && (
                  <Badge className={config.badgeColor} variant="outline">
                    {insight.category}
                  </Badge>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto mb-6">
              <div className="text-left">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {insight.content}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom indicator */}
          <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradientFrom} via-primary ${config.gradientTo} animate-pulse`} />
        </div>
      </li>
    </div>
  )
}

interface CarouselControlProps {
  type: string
  title: string
  handleClick: () => void
  disabled?: boolean
}

const CarouselControl = ({ type, title, handleClick, disabled }: CarouselControlProps) => {
  return (
    <button
      className={`w-10 h-10 flex items-center mx-2 justify-center bg-primary/20 border-2 border-primary/30 rounded-full focus:border-primary focus:outline-none hover:-translate-y-0.5 active:translate-y-0.5 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
        type === 'previous' ? 'rotate-180' : ''
      }`}
      title={title}
      onClick={handleClick}
      disabled={disabled}
    >
      <IconArrowNarrowRight className="text-primary" />
    </button>
  )
}

export function InsightCarousel() {
  const {
    insightsCarousel,
    hideInsightsCarousel,
    minimizeInsightsCarousel,
    removeInsightFromCarousel,
  } = useUIStore()
  const [current, setCurrent] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const { visible, minimized, insights } = insightsCarousel

  // Extract unique categories
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>()
    insights.forEach((insight) => {
      if (insight.category) {
        uniqueCategories.add(insight.category)
      }
    })
    return Array.from(uniqueCategories).sort()
  }, [insights])

  // Filter insights by selected category
  const filteredInsights = useMemo(() => {
    if (selectedCategory === 'all') {
      return insights
    }
    return insights.filter((insight) => insight.category === selectedCategory)
  }, [insights, selectedCategory])

  // Reset current index when carousel becomes visible
  useEffect(() => {
    if (visible) {
      setCurrent(insightsCarousel.currentIndex)
      setSelectedCategory('all')
    }
  }, [visible, insightsCarousel.currentIndex])

  // Sync current index when insights array changes (e.g., when items are removed)
  useEffect(() => {
    if (current >= filteredInsights.length && filteredInsights.length > 0) {
      setCurrent(filteredInsights.length - 1)
    }
  }, [filteredInsights.length, current])

  // Reset to first item when category changes
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    setCurrent(0)
  }

  if (!visible || insights.length === 0) {
    return null
  }

  const handlePreviousClick = () => {
    const previous = current - 1
    setCurrent(previous < 0 ? filteredInsights.length - 1 : previous)
  }

  const handleNextClick = () => {
    const next = current + 1
    setCurrent(next === filteredInsights.length ? 0 : next)
  }

  const handleSlideClick = (index: number) => {
    if (current !== index) {
      setCurrent(index)
    }
  }

  return (
    <AnimatePresence>
      {visible && !minimized && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={hideInsightsCarousel}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Carousel Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 flex flex-col items-center justify-center z-[70] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action buttons */}
            <div className="absolute top-6 right-6 flex gap-2 z-10 items-center">
              {/* Category Filter */}
              {categories.length > 0 && (
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-[140px] h-9 text-sm bg-background/80 backdrop-blur-sm border-primary/30">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="z-[80]">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <button
                onClick={hideInsightsCarousel}
                className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-full bg-background/80 backdrop-blur-sm border border-primary/30 hover:bg-destructive/10 hover:border-destructive/30"
                aria-label="Clear all"
                title="Clear all insights"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={minimizeInsightsCarousel}
                className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full bg-background/80 backdrop-blur-sm border border-primary/30 hover:bg-primary/10"
                aria-label="Minimize"
                title="Minimize"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 text-center"
            >
              <h2 className="text-3xl font-bold text-primary text-glow mb-2">
                Key Insights
              </h2>
              <p className="text-muted-foreground">
                AI-generated insights for your business
              </p>
            </motion.div>

            {/* Carousel */}
            <div className="relative w-[70vmin] h-[70vmin]">
              {filteredInsights.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground text-center">
                    No insights found for category &ldquo;{selectedCategory}&rdquo;
                  </p>
                </div>
              ) : (
                <ul
                  className="absolute flex mx-[-4vmin] transition-transform duration-1000 ease-in-out"
                  style={{
                    transform: `translateX(-${current * (100 / filteredInsights.length)}%)`,
                  }}
                >
                  {filteredInsights.map((insight, index) => (
                    <InsightSlide
                      key={index}
                      insight={insight}
                      index={index}
                      current={current}
                      handleSlideClick={handleSlideClick}
                      onRemove={() => {
                        // Find the original index in the unfiltered array
                        const originalIndex = insights.findIndex(i => i === insight)
                        if (originalIndex !== -1) {
                          removeInsightFromCarousel(originalIndex)
                        }
                      }}
                    />
                  ))}
                </ul>
              )}

              {/* Navigation Controls */}
              {filteredInsights.length > 0 && (
                <div className="absolute flex justify-center items-center w-full top-[calc(100%+1rem)]">
                  <CarouselControl
                    type="previous"
                    title="Go to previous insight"
                    handleClick={handlePreviousClick}
                    disabled={filteredInsights.length === 1}
                  />

                  <span className="text-sm text-muted-foreground font-medium min-w-[60px] text-center mx-4">
                    {current + 1} of {filteredInsights.length}
                    {selectedCategory !== 'all' && ` (${filteredInsights.length} filtered)`}
                  </span>

                  <CarouselControl
                    type="next"
                    title="Go to next insight"
                    handleClick={handleNextClick}
                    disabled={filteredInsights.length === 1}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
