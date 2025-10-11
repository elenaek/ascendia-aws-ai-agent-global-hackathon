'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { Header } from '@/components/dashboard/header'
import { DetailedCompanyCard } from '@/components/compare/detailed-company-card'
import { CompetitorMultiSelect } from '@/components/compare/competitor-multi-select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Vortex } from '@/components/ui/vortex'
import { Eye, Scale, AlertCircle } from 'lucide-react'

export default function ComparePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const { company, competitors, isLoadingCompetitors, fetchCompetitors } = useAnalyticsStore()
  const [selectedCompetitorIds, setSelectedCompetitorIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'single' | 'compare'>('single')
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    // If not authenticated, redirect to auth
    if (!authLoading && !isAuthenticated) {
      router.push('/auth')
      return
    }

    // If authenticated but no company data cached, redirect to auth to check DDB
    if (!authLoading && isAuthenticated && !company) {
      router.push('/auth')
    }
  }, [isAuthenticated, authLoading, company, router])

  // Fetch competitors on mount when authenticated
  useEffect(() => {
    if (isAuthenticated && company && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchCompetitors()
    }
  }, [isAuthenticated, company, fetchCompetitors])

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-primary text-glow animate-pulse">Redirecting...</div>
      </div>
    )
  }

  const selectedCompetitors = competitors.filter(c => selectedCompetitorIds.includes(c.id))
  const isCompanySelected = company && selectedCompetitorIds.includes(company.id)

  // Map competitor data to include extended fields
  const enrichedCompetitors = selectedCompetitors.map(c => {
    // Access the full competitor object from the store which has extended fields
    const fullCompetitor = competitors.find(comp => comp.id === c.id)
    return {
      ...c,
      ...fullCompetitor
    }
  })

  // Prepare items to display in comparison grid
  const comparisonItems = []

  // Add user's company if selected
  if (isCompanySelected && company) {
    comparisonItems.push({
      type: 'company' as const,
      data: {
        id: company.id,
        company_name: company.company_name,
        company_url: company.company_url,
        company_description: company.company_description,
        unique_value_proposition: company.unique_value_proposition,
        revenue: company.revenue,
        stage_of_company: company.stage_of_company,
        pricing_model: company.pricing_model,
        target_customers: company.target_customers,
        number_of_employees: company.number_of_employees,
        types_of_products: company.types_of_products,
      }
    })
  }

  // Add selected competitors
  enrichedCompetitors.forEach(competitor => {
    comparisonItems.push({
      type: 'competitor' as const,
      data: {
        id: competitor.id,
        company_name: competitor.name,
        company_url: competitor.website,
        company_description: competitor.description,
        category: competitor.category,
        // Extended fields from API
        website_url: competitor.website_url,
        company_headquarters_location: competitor.company_headquarters_location,
        number_of_employees: competitor.number_of_employees,
        founding_or_established_date: competitor.founding_or_established_date,
        mission_statement: competitor.mission_statement,
        vision_statement: competitor.vision_statement,
        company_culture_and_values: competitor.company_culture_and_values,
        additional_office_locations: competitor.additional_office_locations,
        products: competitor.products,
        notes: competitor.notes,
        sources: competitor.sources,
      }
    })
  })

  return (
    <div className="min-h-screen bg-background">
      <Vortex
        backgroundColor="black"
        rangeY={800}
        particleCount={50}
        baseHue={190}
        baseSpeed={0.1}
        rangeSpeed={0.8}
        baseRadius={0.8}
        rangeRadius={1.5}
        containerClassName="min-h-screen"
      >
        <Header />
        <main className="container mx-auto p-6 space-y-6 pb-12">
          {/* Page Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-primary text-glow">Compare</h1>
            <p className="text-muted-foreground">
              Analyze your company and competitors side-by-side
            </p>
          </div>

          {/* View Toggle Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'single' | 'compare')} className="w-full">
            <div className="flex justify-center mb-6">
              <TabsList className="bg-background border border-primary/30">
                <TabsTrigger value="single" className="gap-2">
                  <Eye className="w-4 h-4" />
                  Single View
                </TabsTrigger>
                <TabsTrigger value="compare" className="gap-2">
                  <Scale className="w-4 h-4" />
                  Compare View
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Single View Tab */}
            <TabsContent value="single" className="space-y-6">
              {company ? (
                <div className="max-w-4xl mx-auto">
                  <DetailedCompanyCard
                    data={{
                      id: company.id,
                      company_name: company.company_name,
                      company_url: company.company_url,
                      company_description: company.company_description,
                      unique_value_proposition: company.unique_value_proposition,
                      revenue: company.revenue,
                      stage_of_company: company.stage_of_company,
                      pricing_model: company.pricing_model,
                      target_customers: company.target_customers,
                      number_of_employees: company.number_of_employees,
                      types_of_products: company.types_of_products,
                    }}
                    isUserCompany={true}
                  />
                </div>
              ) : (
                <Card className="p-12 text-center bg-gradient-to-br from-purple-500/10 via-background to-blue-500/10 border-primary/30">
                  <AlertCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Company Data</h3>
                  <p className="text-muted-foreground">
                    Please complete your company profile in the dashboard first.
                  </p>
                </Card>
              )}
            </TabsContent>

            {/* Compare View Tab */}
            <TabsContent value="compare" className="space-y-6">
              {/* Competitor Selection */}
              <div className="max-w-2xl mx-auto">
                <Card className="p-6 bg-gradient-to-br from-purple-500/10 via-background to-blue-500/10 border-primary/30">
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    Select Companies to Compare
                  </h2>
                  {isLoadingCompetitors ? (
                    <div className="text-center py-8 text-primary animate-pulse">
                      Loading competitors...
                    </div>
                  ) : (
                    <CompetitorMultiSelect
                      competitors={competitors}
                      selectedIds={selectedCompetitorIds}
                      onSelectionChange={setSelectedCompetitorIds}
                      maxSelections={3}
                      userCompany={company ? {
                        id: company.id,
                        name: company.company_name,
                        description: company.company_description
                      } : null}
                    />
                  )}
                </Card>
              </div>

              {/* Comparison Grid */}
              {comparisonItems.length > 0 ? (
                <div className={`grid gap-6 ${
                  comparisonItems.length === 1
                    ? 'grid-cols-1 max-w-4xl mx-auto'
                    : comparisonItems.length === 2
                    ? 'grid-cols-1 lg:grid-cols-2'
                    : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
                }`}>
                  {comparisonItems.map((item) => (
                    <DetailedCompanyCard
                      key={item.data.id}
                      data={item.data}
                      isUserCompany={item.type === 'company'}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center bg-gradient-to-br from-purple-500/10 via-background to-blue-500/10 border-primary/30">
                  <Scale className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Companies Selected</h3>
                  <p className="text-muted-foreground">
                    Select up to 3 companies from the dropdown above to compare them side-by-side.
                  </p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </Vortex>
    </div>
  )
}
