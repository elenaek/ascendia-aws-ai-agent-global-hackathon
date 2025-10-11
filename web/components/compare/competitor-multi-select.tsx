'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Competitor {
  id: string
  name: string
  category: 'Direct Competitors' | 'Indirect Competitors' | 'Potential Competitors'
  website?: string
  description?: string
}

interface CompanyOption {
  id: string
  name: string
  description?: string
}

interface CompetitorMultiSelectProps {
  competitors: Competitor[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  maxSelections?: number
  userCompany?: CompanyOption | null
}

export function CompetitorMultiSelect({
  competitors,
  selectedIds,
  onSelectionChange,
  maxSelections = 3,
  userCompany
}: CompetitorMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedCompetitors = competitors.filter(c => selectedIds.includes(c.id))
  const isCompanySelected = !!(userCompany && selectedIds.includes(userCompany.id))

  const handleToggle = (competitorId: string) => {
    if (selectedIds.includes(competitorId)) {
      onSelectionChange(selectedIds.filter(id => id !== competitorId))
    } else if (selectedIds.length < maxSelections) {
      onSelectionChange([...selectedIds, competitorId])
    }
  }

  const handleRemove = (competitorId: string) => {
    onSelectionChange(selectedIds.filter(id => id !== competitorId))
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Direct Competitors':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'Indirect Competitors':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'Potential Competitors':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'Your Company':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      default:
        return 'bg-primary/20 text-primary border-primary/30'
    }
  }

  const totalSelections = selectedIds.length
  const itemWord = totalSelections === 1 ? 'item' : 'items'

  // Group competitors by category
  const directCompetitors = competitors.filter(c => c.category === 'Direct Competitors')
  const indirectCompetitors = competitors.filter(c => c.category === 'Indirect Competitors')
  const potentialCompetitors = competitors.filter(c => c.category === 'Potential Competitors')

  const CompetitorGroup = ({ title, competitors }: { title: string; competitors: Competitor[] }) => {
    if (competitors.length === 0) return null

    return (
      <div className="mb-4">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{title}</div>
        <div className="space-y-1">
          {competitors.map((competitor) => {
            const isSelected = selectedIds.includes(competitor.id)
            const isDisabled = !isSelected && selectedIds.length >= maxSelections

            return (
              <div
                key={competitor.id}
                className={cn(
                  "flex items-start gap-2 px-2 py-2 rounded-md hover:bg-primary/5 cursor-pointer transition-colors",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => !isDisabled && handleToggle(competitor.id)}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={isDisabled}
                  className="mt-0.5"
                  onCheckedChange={() => !isDisabled && handleToggle(competitor.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">{competitor.name}</span>
                  </div>
                  {competitor.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {competitor.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Dropdown Trigger */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between border-primary/30 hover:border-primary/50 hover:bg-primary/5"
          >
            <span className="text-sm">
              {totalSelections === 0
                ? 'Select companies to compare'
                : `${totalSelections} ${itemWord} selected`}
            </span>
            <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[400px] max-h-[400px] overflow-y-auto bg-card border-primary/20"
          align="start"
        >
          <div className="p-2">
            <div className="mb-3 px-2 py-1 bg-primary/10 rounded-md">
              <p className="text-xs text-muted-foreground">
                Select up to {maxSelections} companies to compare
              </p>
            </div>

            {/* Your Company Section */}
            {userCompany && (
              <div className="mb-4">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Your Company</div>
                <div className="space-y-1">
                  <div
                    className={cn(
                      "flex items-start gap-2 px-2 py-2 rounded-md hover:bg-primary/5 cursor-pointer transition-colors",
                      !isCompanySelected && selectedIds.length >= maxSelections && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => {
                      if (isCompanySelected || selectedIds.length < maxSelections) {
                        handleToggle(userCompany.id)
                      }
                    }}
                  >
                    <Checkbox
                      checked={isCompanySelected}
                      disabled={!isCompanySelected && selectedIds.length >= maxSelections}
                      className="mt-0.5"
                      onCheckedChange={() => {
                        if (isCompanySelected || selectedIds.length < maxSelections) {
                          handleToggle(userCompany.id)
                        }
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">{userCompany.name}</span>
                      </div>
                      {userCompany.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {userCompany.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <CompetitorGroup
              title="Direct Competitors"
              competitors={directCompetitors}
            />
            <CompetitorGroup
              title="Indirect Competitors"
              competitors={indirectCompetitors}
            />
            <CompetitorGroup
              title="Potential Competitors"
              competitors={potentialCompetitors}
            />

            {competitors.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No competitors available
              </p>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Selected Items Display */}
      {totalSelections > 0 && (
        <div className="flex flex-wrap gap-2">
          {/* Show company if selected */}
          {isCompanySelected && userCompany && (
            <Badge
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5",
                getCategoryColor('Your Company')
              )}
              variant="outline"
            >
              <span className="text-xs font-medium">{userCompany.name}</span>
              <button
                onClick={() => handleRemove(userCompany.id)}
                className="hover:bg-white/10 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {/* Show selected competitors */}
          {selectedCompetitors.map((competitor) => (
            <Badge
              key={competitor.id}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5",
                getCategoryColor(competitor.category)
              )}
              variant="outline"
            >
              <span className="text-xs font-medium">{competitor.name}</span>
              <button
                onClick={() => handleRemove(competitor.id)}
                className="hover:bg-white/10 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
