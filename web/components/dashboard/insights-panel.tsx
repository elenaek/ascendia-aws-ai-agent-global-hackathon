'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { useUIStore } from '@/stores/ui-store'
import { Lightbulb, TrendingUp, AlertCircle, ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useMemo } from 'react'

const INSIGHTS_PER_PAGE = 3

export function InsightsPanel() {
  const { insights, swotAnalysis, isLoadingInsights, company } = useAnalyticsStore()
  const { highlightedElements, insightsCarousel, expandInsightsCarousel, removeInsightFromCarousel, hideInsightsCarousel } = useUIStore()
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Get insights from carousel
  const carouselInsights = insightsCarousel.insights || []

  // Extract unique categories
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>()
    carouselInsights.forEach((insight) => {
      if (insight.category) {
        uniqueCategories.add(insight.category)
      }
    })
    return Array.from(uniqueCategories).sort()
  }, [carouselInsights])

  // Filter insights by selected category
  const filteredInsights = useMemo(() => {
    if (selectedCategory === 'all') {
      return carouselInsights
    }
    return carouselInsights.filter((insight) => insight.category === selectedCategory)
  }, [carouselInsights, selectedCategory])

  // Reset to first page when category changes
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    setCurrentPage(0)
  }

  // Pagination
  const totalPages = Math.ceil(filteredInsights.length / INSIGHTS_PER_PAGE)
  const startIndex = currentPage * INSIGHTS_PER_PAGE
  const endIndex = startIndex + INSIGHTS_PER_PAGE
  const paginatedInsights = filteredInsights.slice(startIndex, endIndex)

  // Check if we have any insights to display
  const hasCarouselInsights = carouselInsights.length > 0
  const hasStoredInsights = insights.length > 0
  const hasAnyInsights = hasCarouselInsights || hasStoredInsights

  const getCategoryBadge = (category?: string, severity?: string) => {
    if (!category) return null

    const getBadgeColor = (severity?: string) => {
      switch (severity) {
        case 'success':
          return 'bg-green-500/20 text-green-400 border-green-500/30'
        case 'warning':
          return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        case 'info':
        default:
          return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
      }
    }

    return (
      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getBadgeColor(severity))}>
        {category}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Insights */}
      <Card
        id="insights-panel"
        className={cn(
          "p-3 bg-panel border-primary/20 glow",
          highlightedElements.has('insights-panel') && 'element-highlighted'
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h3 className="text-base font-semibold text-primary">Key Insights</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Total Badge */}
            {hasCarouselInsights && (
              <Badge variant="outline" className="border-primary/30 text-primary text-[11px]">
                {carouselInsights.length} Total
              </Badge>
            )}

            {/* Category Filter - only show if there are categories */}
            {hasCarouselInsights && categories.length > 0 && (
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-[140px] h-7 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category} className="text-xs">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Clear All Button */}
            {hasCarouselInsights && (
              <Button
                variant="ghost"
                size="sm"
                onClick={hideInsightsCarousel}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Clear all insights"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {isLoadingInsights ? (
          <div className="text-center py-8 text-primary animate-pulse">
            Generating insights...
          </div>
        ) : !hasAnyInsights ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            {company
              ? `No insights available for ${company.company_name} yet. Start a conversation to generate insights.`
              : 'No insights available yet. Start a conversation to generate insights.'}
          </p>
        ) : (
          <>
            <div className="space-y-2 min-h-[180px]">
              {/* Carousel Insights (from agent) */}
              {hasCarouselInsights && (
                <>
                  {filteredInsights.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      No insights found for category &ldquo;{selectedCategory}&rdquo;
                    </p>
                  ) : (
                    paginatedInsights.map((insight, index) => {
                    const getSeverityColor = (severity?: string) => {
                      switch (severity) {
                        case 'success':
                          return 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10'
                        case 'warning':
                          return 'border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10'
                        case 'info':
                        default:
                          return 'border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10'
                      }
                    }

                    // Find the original index in the unfiltered carousel insights array
                    const originalIndex = carouselInsights.findIndex(i => i === insight)

                    return (
                      <div
                        key={`carousel-${startIndex + index}`}
                        className={cn(
                          "p-2 rounded-md border transition-all hover:shadow-md relative group",
                          getSeverityColor(insight.severity)
                        )}
                      >
                        <div
                          className="flex items-start gap-2 cursor-pointer"
                          onClick={() => expandInsightsCarousel(originalIndex >= 0 ? originalIndex : 0)}
                          title="Click to view full details"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="text-sm font-medium text-foreground">{insight.title}</p>
                              {getCategoryBadge(insight.category, insight.severity)}
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {insight.content.length > 100
                                ? `${insight.content.substring(0, 100)}...`
                                : insight.content}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (originalIndex >= 0) {
                              removeInsightFromCarousel(originalIndex)
                            }
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/80 hover:bg-destructive flex items-center justify-center transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                          title="Remove insight"
                        >
                          <X className="w-3 h-3 text-destructive-foreground" />
                        </button>
                      </div>
                    )
                  })
                  )}
                </>
              )}

              {/* Stored Insights (historical) */}
              {hasStoredInsights && insights.map((insight, index) => (
                <div
                  key={`stored-${index}`}
                  className="p-2 bg-background/50 rounded-md border border-primary/10"
                >
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-cyber-green flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{insight}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls for Carousel Insights */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-primary/10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="h-7 px-2 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Prev
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  {currentPage + 1} of {totalPages}
                  {selectedCategory !== 'all' && ` (${filteredInsights.length} filtered)`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages - 1}
                  className="h-7 px-2 text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* SWOT Analysis */}
      {swotAnalysis && (
        <Card className="p-3 bg-panel border-primary/20 glow">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-primary" />
            <h3 className="text-base font-semibold text-primary">SWOT Analysis</h3>
          </div>

          <div className="space-y-3">
            {/* Strengths */}
            <div>
              <h4 className="text-xs font-semibold text-cyber-green mb-1.5">
                Strengths
              </h4>
              <ul className="space-y-0.5">
                {swotAnalysis.strengths.map((item, index) => (
                  <li
                    key={index}
                    className="text-[11px] text-muted-foreground pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-cyber-green"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div>
              <h4 className="text-xs font-semibold text-destructive mb-1.5">
                Weaknesses
              </h4>
              <ul className="space-y-0.5">
                {swotAnalysis.weaknesses.map((item, index) => (
                  <li
                    key={index}
                    className="text-[11px] text-muted-foreground pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-destructive"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Opportunities */}
            <div>
              <h4 className="text-xs font-semibold text-primary mb-1.5">
                Opportunities
              </h4>
              <ul className="space-y-0.5">
                {swotAnalysis.opportunities.map((item, index) => (
                  <li
                    key={index}
                    className="text-[11px] text-muted-foreground pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-primary"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Threats */}
            <div>
              <h4 className="text-xs font-semibold text-cyber-pink mb-1.5">
                Threats
              </h4>
              <ul className="space-y-0.5">
                {swotAnalysis.threats.map((item, index) => (
                  <li
                    key={index}
                    className="text-[11px] text-muted-foreground pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-cyber-pink"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
