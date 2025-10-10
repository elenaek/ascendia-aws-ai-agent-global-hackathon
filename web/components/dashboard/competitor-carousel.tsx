'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, ExternalLink, X, Plus, Minimize2, Check, Trash2, MapPin, Users, Calendar, Target, Lightbulb, Globe } from 'lucide-react'
import { IconArrowNarrowRight } from '@tabler/icons-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/stores/ui-store'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { CompetitorContextPayload } from '@/types/websocket-messages'
import { toast } from 'sonner'
import { useState, useRef, useEffect, useMemo } from 'react'

interface CompetitorSlideProps {
  competitor: CompetitorContextPayload
  index: number
  current: number
  handleSlideClick: (index: number) => void
  onAddCompetitor: () => void
  onRemove: () => void
  isSaving: boolean
  isAlreadyAdded: boolean
}

const CompetitorSlide = ({
  competitor,
  index,
  current,
  handleSlideClick,
  onAddCompetitor,
  onRemove,
  isSaving,
  isAlreadyAdded,
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

            {/* Content Tabs */}
            <div className="flex-1 overflow-auto mb-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="products">Products</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  {competitor.description && (
                    <div className="text-left">
                      <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {competitor.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-left">
                    {competitor.company_headquarters_location && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-primary" />
                          <h4 className="text-xs font-semibold text-foreground">Headquarters</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">{competitor.company_headquarters_location}</p>
                      </div>
                    )}

                    {competitor.number_of_employees !== undefined && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-primary" />
                          <h4 className="text-xs font-semibold text-foreground">Employees</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">{competitor.number_of_employees.toLocaleString()}</p>
                      </div>
                    )}

                    {competitor.founding_or_established_date && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-primary" />
                          <h4 className="text-xs font-semibold text-foreground">Founded</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">{competitor.founding_or_established_date}</p>
                      </div>
                    )}

                    {(competitor.website_url || competitor.website) && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Globe className="w-4 h-4 text-primary" />
                          <h4 className="text-xs font-semibold text-foreground">Website</h4>
                        </div>
                        <a
                          href={`https://${(competitor.website_url || competitor.website)!.replace(/^https?:\/\//, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors group"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="underline underline-offset-2">{competitor.website_url || competitor.website}</span>
                          <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                      </div>
                    )}
                  </div>

                  {competitor.additional_office_locations && competitor.additional_office_locations.length > 0 && (
                    <div className="text-left">
                      <h4 className="text-sm font-semibold text-foreground mb-2">Additional Locations</h4>
                      <div className="flex flex-wrap gap-2">
                        {competitor.additional_office_locations.map((location, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {location}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Products Tab */}
                <TabsContent value="products" className="space-y-3">
                  {competitor.products && competitor.products.length > 0 ? (
                    competitor.products.map((product, idx) => (
                      <div key={idx} className="text-left p-3 rounded-lg bg-primary/5 border border-primary/20">
                        {product.product_name && (
                          <h4 className="text-sm font-semibold text-foreground mb-1">{product.product_name}</h4>
                        )}
                        {product.product_description && (
                          <p className="text-xs text-muted-foreground mb-2">{product.product_description}</p>
                        )}
                        {product.product_url && (
                          <a
                            href={`https://${product.product_url.replace(/^https?:\/\//, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors group"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            <span className="underline underline-offset-2">{product.product_url}</span>
                          </a>
                        )}
                        {!product.product_name && !product.product_description && !product.product_url && (
                          <p className="text-xs text-muted-foreground italic">Product details unavailable</p>
                        )}
                      </div>
                    ))
                  ) : competitor.product_name ? (
                    <div className="text-left p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <h4 className="text-sm font-semibold text-foreground mb-1">{competitor.product_name}</h4>
                      {competitor.description && (
                        <p className="text-xs text-muted-foreground mb-2">{competitor.description}</p>
                      )}
                      {competitor.website && (
                        <a
                          href={`https://${competitor.website.replace(/^https?:\/\//, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors group"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          <span className="underline underline-offset-2">{competitor.website}</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">No product information available</p>
                  )}
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-4">
                  {competitor.mission_statement && (
                    <div className="text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-primary" />
                        <h4 className="text-sm font-semibold text-foreground">Mission</h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{competitor.mission_statement}</p>
                    </div>
                  )}

                  {competitor.vision_statement && (
                    <div className="text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-primary" />
                        <h4 className="text-sm font-semibold text-foreground">Vision</h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{competitor.vision_statement}</p>
                    </div>
                  )}

                  {competitor.company_culture_and_values && (
                    <div className="text-left">
                      <h4 className="text-sm font-semibold text-foreground mb-2">Culture & Values</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{competitor.company_culture_and_values}</p>
                    </div>
                  )}

                  {competitor.notes && (
                    <div className="text-left">
                      <h4 className="text-sm font-semibold text-foreground mb-2">Notes</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed italic">{competitor.notes}</p>
                    </div>
                  )}

                  {competitor.sources && competitor.sources.length > 0 && (
                    <div className="text-left">
                      <h4 className="text-sm font-semibold text-foreground mb-2">Sources</h4>
                      <div className="space-y-1">
                        {competitor.sources.map((source, idx) => (
                          <a
                            key={idx}
                            href={source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors group"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                            <span className="underline underline-offset-2 truncate">{source}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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
                  disabled={isSaving || isAlreadyAdded}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAlreadyAdded ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  {isAlreadyAdded ? 'Already Added' : isSaving ? 'Adding...' : 'Add to My Competitors'}
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
    removeCompetitorFromCarousel,
  } = useUIStore()
  const { addCompetitor, competitors: existingCompetitors } = useAnalyticsStore()
  const [current, setCurrent] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const { visible, minimized, competitors } = competitorCarousel

  // Extract unique categories
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>()
    competitors.forEach((competitor) => {
      if (competitor.category) {
        uniqueCategories.add(competitor.category)
      }
    })
    return Array.from(uniqueCategories).sort()
  }, [competitors])

  // Filter competitors by selected category
  const filteredCompetitors = useMemo(() => {
    if (selectedCategory === 'all') {
      return competitors
    }
    return competitors.filter((competitor) => competitor.category === selectedCategory)
  }, [competitors, selectedCategory])

  // Reset current index and added indices when carousel becomes visible
  useEffect(() => {
    if (visible) {
      setCurrent(0)
      setAddedIndices(new Set())
      setSelectedCategory('all')
    }
  }, [visible])

  // Sync current index when competitors array changes (e.g., when items are removed)
  useEffect(() => {
    if (current >= filteredCompetitors.length && filteredCompetitors.length > 0) {
      setCurrent(filteredCompetitors.length - 1)
    }
  }, [filteredCompetitors.length, current])

  // Reset to first item when category changes
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    setCurrent(0)
  }

  if (!visible || competitors.length === 0) {
    return null
  }

  const handlePreviousClick = () => {
    const previous = current - 1
    setCurrent(previous < 0 ? filteredCompetitors.length - 1 : previous)
  }

  const handleNextClick = () => {
    const next = current + 1
    setCurrent(next === filteredCompetitors.length ? 0 : next)
  }

  const handleSlideClick = (index: number) => {
    if (current !== index) {
      setCurrent(index)
    }
  }

  // Check if a competitor already exists in the user's list
  const isCompetitorAlreadyAdded = (index: number) => {
    // Find the original index in the unfiltered array
    const competitor = filteredCompetitors[index]
    const originalIndex = competitors.findIndex(c => c === competitor)

    if (addedIndices.has(originalIndex)) return true

    return existingCompetitors.some(
      (existing) => existing.name.toLowerCase() === competitor.company_name.toLowerCase()
    )
  }

  const handleAddCompetitor = async () => {
    const currentCompetitor = filteredCompetitors[current]
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
          // Extended CompetitorOverview fields
          website_url: currentCompetitor.website_url,
          company_headquarters_location: currentCompetitor.company_headquarters_location,
          number_of_employees: currentCompetitor.number_of_employees,
          founding_or_established_date: currentCompetitor.founding_or_established_date,
          mission_statement: currentCompetitor.mission_statement,
          vision_statement: currentCompetitor.vision_statement,
          company_culture_and_values: currentCompetitor.company_culture_and_values,
          additional_office_locations: currentCompetitor.additional_office_locations,
          products: currentCompetitor.products,
          notes: currentCompetitor.notes,
          sources: currentCompetitor.sources,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save competitor')
      }

      const result = await response.json()

      // Add to local store
      addCompetitor(result.data)

      // Mark this competitor as added in the carousel (use original index)
      const originalIndex = competitors.findIndex(c => c === currentCompetitor)
      if (originalIndex !== -1) {
        setAddedIndices(prev => new Set(prev).add(originalIndex))
      }

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
      {visible && !minimized && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={hideCompetitorCarousel}
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
                    <SelectTrigger className="w-[180px] h-9 text-sm bg-background/80 backdrop-blur-sm border-primary/30">
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
                  onClick={hideCompetitorCarousel}
                  className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-full bg-background/80 backdrop-blur-sm border border-primary/30 hover:bg-destructive/10 hover:border-destructive/30"
                  aria-label="Clear all"
                  title="Clear all competitors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={minimizeCompetitorCarousel}
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
                Competitor Analysis
              </h2>
              <p className="text-muted-foreground">
                Browse and add competitors to your database
              </p>
            </motion.div>

            {/* Carousel */}
            <div className="relative w-[70vmin] h-[70vmin]">
              {filteredCompetitors.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground text-center">
                    No competitors found for category &ldquo;{selectedCategory}&rdquo;
                  </p>
                </div>
              ) : (
                <ul
                  className="absolute flex mx-[-4vmin] transition-transform duration-1000 ease-in-out"
                  style={{
                    transform: `translateX(-${current * (100 / filteredCompetitors.length)}%)`,
                  }}
                >
                  {filteredCompetitors.map((competitor, index) => (
                    <CompetitorSlide
                      key={index}
                      competitor={competitor}
                      index={index}
                      current={current}
                      handleSlideClick={handleSlideClick}
                      onAddCompetitor={handleAddCompetitor}
                      onRemove={() => {
                        // Find the original index in the unfiltered array
                        const originalIndex = competitors.findIndex(c => c === competitor)
                        if (originalIndex !== -1) {
                          removeCompetitorFromCarousel(originalIndex)
                        }
                      }}
                      isSaving={isSaving}
                      isAlreadyAdded={isCompetitorAlreadyAdded(index)}
                    />
                  ))}
                </ul>
              )}

              {/* Navigation Controls */}
              {filteredCompetitors.length > 0 && (
                <div className="absolute flex justify-center items-center w-full top-[calc(100%+1rem)]">
                  <CarouselControl
                    type="previous"
                    title="Go to previous competitor"
                    handleClick={handlePreviousClick}
                    disabled={filteredCompetitors.length === 1}
                  />

                  <span className="text-sm text-muted-foreground font-medium min-w-[60px] text-center mx-4">
                    {current + 1} of {filteredCompetitors.length}
                    {selectedCategory !== 'all' && ` (${filteredCompetitors.length} filtered)`}
                  </span>

                  <CarouselControl
                    type="next"
                    title="Go to next competitor"
                    handleClick={handleNextClick}
                    disabled={filteredCompetitors.length === 1}
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
