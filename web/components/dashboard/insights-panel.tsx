'use client'

import { Card } from '@/components/ui/card'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { useUIStore } from '@/stores/ui-store'
import { Lightbulb, TrendingUp, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function InsightsPanel() {
  const { insights, swotAnalysis, isLoadingInsights, company } = useAnalyticsStore()
  const { highlightedElements, insightsCarousel, expandInsightsCarousel } = useUIStore()

  // Get insights from carousel
  const carouselInsights = insightsCarousel.insights || []

  // Check if we have any insights to display
  const hasCarouselInsights = carouselInsights.length > 0
  const hasStoredInsights = insights.length > 0
  const hasAnyInsights = hasCarouselInsights || hasStoredInsights

  return (
    <div className="space-y-6">
      {/* Key Insights */}
      <Card
        id="insights-panel"
        className={cn(
          "p-4 bg-panel border-primary/20 glow",
          highlightedElements.has('insights-panel') && 'element-highlighted'
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-primary">Key Insights</h3>
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
          <div className="space-y-3">
            {/* Carousel Insights (from agent) */}
            {hasCarouselInsights && (
              <>
                {carouselInsights.map((insight, index) => {
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

                  return (
                    <div
                      key={`carousel-${index}`}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                        getSeverityColor(insight.severity)
                      )}
                      onClick={expandInsightsCarousel}
                      title="Click to view full details"
                    >
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground mb-1">{insight.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {insight.content.length > 100
                              ? `${insight.content.substring(0, 100)}...`
                              : insight.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Stored Insights (historical) */}
            {hasStoredInsights && insights.map((insight, index) => (
              <div
                key={`stored-${index}`}
                className="p-3 bg-background/50 rounded-lg border border-primary/10"
              >
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-cyber-green flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{insight}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* SWOT Analysis */}
      {swotAnalysis && (
        <Card className="p-4 bg-panel border-primary/20 glow">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-primary">SWOT Analysis</h3>
          </div>

          <div className="space-y-4">
            {/* Strengths */}
            <div>
              <h4 className="text-sm font-semibold text-cyber-green mb-2">
                Strengths
              </h4>
              <ul className="space-y-1">
                {swotAnalysis.strengths.map((item, index) => (
                  <li
                    key={index}
                    className="text-xs text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-cyber-green"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div>
              <h4 className="text-sm font-semibold text-destructive mb-2">
                Weaknesses
              </h4>
              <ul className="space-y-1">
                {swotAnalysis.weaknesses.map((item, index) => (
                  <li
                    key={index}
                    className="text-xs text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-destructive"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Opportunities */}
            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">
                Opportunities
              </h4>
              <ul className="space-y-1">
                {swotAnalysis.opportunities.map((item, index) => (
                  <li
                    key={index}
                    className="text-xs text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-primary"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Threats */}
            <div>
              <h4 className="text-sm font-semibold text-cyber-pink mb-2">
                Threats
              </h4>
              <ul className="space-y-1">
                {swotAnalysis.threats.map((item, index) => (
                  <li
                    key={index}
                    className="text-xs text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-cyber-pink"
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
