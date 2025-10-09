'use client'

import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { useUIStore } from '@/stores/ui-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ExternalLink, Building2, Activity, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useState } from 'react'

const ITEMS_PER_PAGE = 3

interface Competitor {
  id: string
  name: string
  category: 'Direct Competitors' | 'Indirect Competitors' | 'Potential Competitors'
  website?: string
  description?: string
}

export function CompetitorsPanel() {
  const { competitors, isLoadingCompetitors, company, removeCompetitor } = useAnalyticsStore()
  const { highlightedElements } = useUIStore()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [competitorToDelete, setCompetitorToDelete] = useState<Competitor | null>(null)
  const [directPage, setDirectPage] = useState(0)
  const [indirectPage, setIndirectPage] = useState(0)
  const [potentialPage, setPotentialPage] = useState(0)

  const directCompetitors = competitors.filter((c) => c.category === 'Direct Competitors')
  const indirectCompetitors = competitors.filter((c) => c.category === 'Indirect Competitors')
  const potentialCompetitors = competitors.filter((c) => c.category === 'Potential Competitors')

  const handleDeleteClick = (competitor: Competitor) => {
    setCompetitorToDelete(competitor)
  }

  const handleConfirmDelete = async () => {
    if (!competitorToDelete) return

    setDeletingId(competitorToDelete.id)
    try {
      const success = await removeCompetitor(competitorToDelete.id)
      if (success) {
        toast.success(`${competitorToDelete.name} removed from your competitors`)
        setCompetitorToDelete(null)
      } else {
        toast.error('Failed to remove competitor')
      }
    } catch {
      toast.error('Failed to remove competitor')
    } finally {
      setDeletingId(null)
    }
  }

  const handleCancelDelete = () => {
    setCompetitorToDelete(null)
  }

  const CompetitorsList = ({
    competitors,
    currentPage,
    onPageChange
  }: {
    competitors: Competitor[]
    currentPage: number
    onPageChange: (page: number) => void
  }) => {
    const totalPages = Math.ceil(competitors.length / ITEMS_PER_PAGE)
    const startIndex = currentPage * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const paginatedCompetitors = competitors.slice(startIndex, endIndex)

    return (
      <>
        <div className="space-y-2 min-h-[180px]">
          {competitors.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              {company
                ? `No competitors found for ${company.company_name} in this category`
                : 'No competitors found in this category'}
            </p>
          ) : (
            paginatedCompetitors.map((competitor) => (
              <div
                key={competitor.id}
                className="p-2 bg-background/50 rounded-md border border-primary/10 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Building2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-foreground">{competitor.name}</h4>
                      {competitor.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {competitor.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {competitor.website && (
                      <a
                        href={competitor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(competitor)}
                      disabled={deletingId === competitor.id}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-primary/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="h-7 px-2 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Prev
            </Button>
            <span className="text-[11px] text-muted-foreground">
              {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
              className="h-7 px-2 text-xs"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <Card
        id="competitors-panel"
        className={cn(
          "p-3 bg-panel border-primary/20 glow",
          highlightedElements.has('competitors-panel') && 'element-highlighted'
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-base font-semibold text-primary">My Competitors</h3>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary text-[11px]">
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
              <CompetitorsList
                competitors={directCompetitors}
                currentPage={directPage}
                onPageChange={setDirectPage}
              />
            </TabsContent>

            <TabsContent value="indirect" className="mt-4">
              <CompetitorsList
                competitors={indirectCompetitors}
                currentPage={indirectPage}
                onPageChange={setIndirectPage}
              />
            </TabsContent>

            <TabsContent value="potential" className="mt-4">
              <CompetitorsList
                competitors={potentialCompetitors}
                currentPage={potentialPage}
                onPageChange={setPotentialPage}
              />
            </TabsContent>
          </Tabs>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!competitorToDelete} onOpenChange={(open) => !open && handleCancelDelete()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove Competitor
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-semibold text-foreground">{competitorToDelete?.name}</span> from your competitors list?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              disabled={!!deletingId}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={!!deletingId}
            >
              {deletingId ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
