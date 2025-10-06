'use client'

import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Building2, Activity } from 'lucide-react'

interface Competitor {
  id: string
  name: string
  category: 'Direct Competitors' | 'Indirect Competitors' | 'Potential Competitors'
  website?: string
  description?: string
}

export function CompetitorsPanel() {
  const { competitors, isLoadingCompetitors, company } = useAnalyticsStore()

  const directCompetitors = competitors.filter((c) => c.category === 'Direct Competitors')
  const indirectCompetitors = competitors.filter((c) => c.category === 'Indirect Competitors')
  const potentialCompetitors = competitors.filter((c) => c.category === 'Potential Competitors')

  const CompetitorsList = ({ competitors }: { competitors: Competitor[] }) => (
    <div className="space-y-3">
      {competitors.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          {company
            ? `No competitors found for ${company.company_name} in this category`
            : 'No competitors found in this category'}
        </p>
      ) : (
        competitors.map((competitor) => (
          <div
            key={competitor.id}
            className="p-3 bg-background/50 rounded-lg border border-primary/10 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-foreground">{competitor.name}</h4>
                  {competitor.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {competitor.description}
                    </p>
                  )}
                </div>
              </div>
              {competitor.website && (
                <a
                  href={competitor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )

  return (
    <Card className="p-4 bg-panel border-primary/20 glow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-primary">Competitors</h3>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary">
          {competitors.length} Total
        </Badge>
      </div>

      {isLoadingCompetitors ? (
        <div className="text-center py-8 text-primary animate-pulse">
          Loading competitors...
        </div>
      ) : (
        <Tabs defaultValue="direct" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-background">
            <TabsTrigger value="direct" className="text-xs">
              Direct ({directCompetitors.length})
            </TabsTrigger>
            <TabsTrigger value="indirect" className="text-xs">
              Indirect ({indirectCompetitors.length})
            </TabsTrigger>
            <TabsTrigger value="potential" className="text-xs">
              Potential ({potentialCompetitors.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="mt-4">
            <CompetitorsList competitors={directCompetitors} />
          </TabsContent>

          <TabsContent value="indirect" className="mt-4">
            <CompetitorsList competitors={indirectCompetitors} />
          </TabsContent>

          <TabsContent value="potential" className="mt-4">
            <CompetitorsList competitors={potentialCompetitors} />
          </TabsContent>
        </Tabs>
      )}
    </Card>
  )
}
