'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, ExternalLink, X, Plus, Minimize2, Maximize2 } from 'lucide-react'
import { IconArrowNarrowRight } from '@tabler/icons-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/stores/ui-store'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { CompetitorContextPayload } from '@/types/websocket-messages'
import { toast } from 'sonner'
import { useState, useRef, useEffect } from 'react'

interface CompetitorSlideProps {
  competitor: CompetitorContextPayload
  index: number
  current: number
  handleSlideClick: (index: number) => void
  onAddCompetitor: () => void
  isSaving: boolean
}

const CompetitorSlide = ({
  competitor,
  index,
  current,
  handleSlideClick,
  onAddCompetitor,
  isSaving,
}: CompetitorSlideProps) => {
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
          className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-500/10 via-background to-blue-500/10 border border-primary/30 rounded-2xl overflow-hidden transition-all ease-out glow"
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
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

          {/* Content */}
          <div className="relative h-full flex flex-col p-8">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 animate-glow-pulse">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {competitor.company_name}
                </h3>
                <p className="text-sm text-primary font-medium mb-2">
                  {competitor.product_name}
                </p>
                {competitor.category && (
                  <Badge className={getCategoryColor(competitor.category)} variant="outline">
                    {competitor.category}
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="flex-1 overflow-auto mb-6">
              {competitor.description && (
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {competitor.description}
                  </p>
                </div>
              )}

              {competitor.website && (
                <div className="mt-4 text-left">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Website</h4>
                  <a
                    href={`https://${competitor.website.replace(/^https?:\/\//, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    <span className="underline underline-offset-2">{competitor.website}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Add Button - Only show on active slide */}
            {current === index && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddCompetitor()
                  }}
                  disabled={isSaving}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isSaving ? 'Adding...' : 'Add to My Competitors'}
                </Button>
              </motion.div>
            )}
          </div>

          {/* Bottom indicator */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-primary to-blue-500 animate-pulse" />
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

export function CompetitorCarousel() {
  const {
    competitorCarousel,
    hideCompetitorCarousel,
    minimizeCompetitorCarousel,
    expandCompetitorCarousel
  } = useUIStore()
  const { addCompetitor } = useAnalyticsStore()
  const [current, setCurrent] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  const { visible, minimized, competitors } = competitorCarousel

  // Reset current index when carousel becomes visible
  useEffect(() => {
    if (visible) {
      setCurrent(0)
    }
  }, [visible])

  if (!visible || competitors.length === 0) {
    return null
  }

  const handlePreviousClick = () => {
    const previous = current - 1
    setCurrent(previous < 0 ? competitors.length - 1 : previous)
  }

  const handleNextClick = () => {
    const next = current + 1
    setCurrent(next === competitors.length ? 0 : next)
  }

  const handleSlideClick = (index: number) => {
    if (current !== index) {
      setCurrent(index)
    }
  }

  const handleAddCompetitor = async () => {
    const currentCompetitor = competitors[current]
    setIsSaving(true)
    try {
      const { authenticatedFetch } = await import('@/lib/auth-utils')

      const response = await authenticatedFetch('/api/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_name: currentCompetitor.company_name,
          product_name: currentCompetitor.product_name,
          website: currentCompetitor.website,
          description: currentCompetitor.description,
          category: currentCompetitor.category,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save competitor')
      }

      const result = await response.json()

      // Add to local store
      addCompetitor(result.data)

      toast.success(`${currentCompetitor.company_name} added to your competitors!`)
    } catch (error) {
      console.error('Error adding competitor:', error)
      toast.error('Failed to add competitor')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Minimized Floating Button */}
          {minimized && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={expandCompetitorCarousel}
              className="fixed bottom-6 right-6 z-[70] bg-gradient-to-br from-purple-500 to-primary text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 glow group"
              title="Expand competitor carousel"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6" />
                <span className="text-sm font-medium">
                  {competitors.length} Competitors
                </span>
                <Maximize2 className="w-4 h-4 ml-1 opacity-70 group-hover:opacity-100" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
                {competitors.length}
              </div>
            </motion.button>
          )}

          {/* Backdrop - only show when not minimized */}
          {!minimized && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={hideCompetitorCarousel}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
          )}

          {/* Carousel Container - only show when not minimized */}
          {!minimized && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="fixed inset-0 flex flex-col items-center justify-center z-[70] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close and Minimize buttons */}
              <div className="absolute top-6 right-6 flex gap-2 z-10">
                <button
                  onClick={minimizeCompetitorCarousel}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full bg-background/80 backdrop-blur-sm border border-primary/30 hover:bg-primary/10"
                  aria-label="Minimize"
                  title="Minimize"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={hideCompetitorCarousel}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full bg-background/80 backdrop-blur-sm border border-primary/30 hover:bg-primary/10"
                  aria-label="Close"
                  title="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 text-center"
            >
              <h2 className="text-3xl font-bold text-primary text-glow mb-2">
                Competitor Analysis
              </h2>
              <p className="text-muted-foreground">
                Browse and add competitors to your database
              </p>
            </motion.div>

            {/* Carousel */}
            <div className="relative w-[70vmin] h-[70vmin]">
              <ul
                className="absolute flex mx-[-4vmin] transition-transform duration-1000 ease-in-out"
                style={{
                  transform: `translateX(-${current * (100 / competitors.length)}%)`,
                }}
              >
                {competitors.map((competitor, index) => (
                  <CompetitorSlide
                    key={index}
                    competitor={competitor}
                    index={index}
                    current={current}
                    handleSlideClick={handleSlideClick}
                    onAddCompetitor={handleAddCompetitor}
                    isSaving={isSaving}
                  />
                ))}
              </ul>

              {/* Navigation Controls */}
              <div className="absolute flex justify-center items-center w-full top-[calc(100%+1rem)]">
                <CarouselControl
                  type="previous"
                  title="Go to previous competitor"
                  handleClick={handlePreviousClick}
                  disabled={competitors.length === 1}
                />

                <span className="text-sm text-muted-foreground font-medium min-w-[60px] text-center mx-4">
                  {current + 1} of {competitors.length}
                </span>

                <CarouselControl
                  type="next"
                  title="Go to next competitor"
                  handleClick={handleNextClick}
                  disabled={competitors.length === 1}
                />
              </div>
            </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  )
}
