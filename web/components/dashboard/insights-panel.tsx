'use client'

import { Card } from '@/components/ui/card'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { Lightbulb, TrendingUp, AlertCircle } from 'lucide-react'

export function InsightsPanel() {
  const { insights, swotAnalysis, isLoadingInsights } = useAnalyticsStore()

  return (
    <div className="space-y-6">
      {/* Key Insights */}
      <Card className="p-4 bg-panel border-primary/20 glow">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-primary">Key Insights</h3>
        </div>

        {isLoadingInsights ? (
          <div className="text-center py-8 text-primary animate-pulse">
            Generating insights...
          </div>
        ) : insights.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No insights available yet. Start a conversation to generate insights.
          </p>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
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
