import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Competitor {
  id: string
  name: string
  category: 'Direct Competitors' | 'Indirect Competitors' | 'Potential Competitors'
  website?: string
  description?: string
  // Extended CompetitorOverview fields
  website_url?: string
  company_headquarters_location?: string
  number_of_employees?: number
  founding_or_established_date?: string
  mission_statement?: string
  vision_statement?: string
  company_culture_and_values?: string
  additional_office_locations?: string[]
  products?: Product[]
  notes?: string
  sources?: string[]
}

interface CompetitorPricing {
  pricing: string
  pricing_model: string
}

interface DistributionChannel {
  distribution_model: 'Direct to Customer' | 'Business to Business' | 'Business to Consumer' | 'Retail or Wholesale Partners' | 'Other or Hybrid Models'
  distribution_model_justification: string
  target_channels: Array<
    | 'Company Website or Online Store'
    | 'Retail Stores or Physical Locations'
    | 'Distributor or Reseller Networks'
    | 'Sales Representatives or Account Managers'
    | 'Marketplaces'
    | 'Partner Integrations or APIs'
    | 'Social Media or Content Marketing'
    | 'Trade Shows or Events'
  >
}

interface TargetAudience {
  target_audience_description: string
  target_sectors: string[]
  typical_segment_size: 'SMB' | 'Enterprise' | 'Startups'
  key_decision_makers: string[]
}

interface CompetitorProductCustomerSentiment {
  key_themes: string[]
  overall_sentiment: string
  strengths: string[]
  weaknesses: string[]
}

interface Product {
  product_name: string
  product_url: string
  product_description: string
  // Extended CompetitorAnalysis fields
  pricing?: CompetitorPricing[]
  distribution_channel?: DistributionChannel
  target_audience?: TargetAudience
  customer_sentiment?: CompetitorProductCustomerSentiment
}

interface CompanyInfo {
  id: string
  company_name: string
  company_url: string
  company_description: string
  unique_value_proposition: string
  stage_of_company: string
  revenue: string
  number_of_employees: string
  pricing_model: string
  target_customers: string
  types_of_products: Product[]
}

interface AnalyticsState {
  company: CompanyInfo | null
  competitors: Competitor[]
  insights: string[]
  swotAnalysis: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  } | null
  isLoadingCompetitors: boolean
  isLoadingInsights: boolean
  setCompany: (company: CompanyInfo) => void
  setCompetitors: (competitors: Competitor[]) => void
  addCompetitor: (competitor: Competitor) => void
  removeCompetitor: (competitorId: string) => Promise<boolean>
  setInsights: (insights: string[]) => void
  setSwotAnalysis: (swot: AnalyticsState['swotAnalysis']) => void
  setLoadingCompetitors: (loading: boolean) => void
  setLoadingInsights: (loading: boolean) => void
  fetchCompetitors: () => Promise<void>
  clearAll: () => void
}

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set) => ({
      company: null,
      competitors: [],
      insights: [],
      swotAnalysis: null,
      isLoadingCompetitors: false,
      isLoadingInsights: false,
      setCompany: (company) => set({ company }),
      setCompetitors: (competitors) => set({ competitors }),
      addCompetitor: (competitor) => set((state) => ({
        competitors: [...state.competitors, competitor]
      })),
      removeCompetitor: async (competitorId: string) => {
        try {
          const { authenticatedFetch } = await import('@/lib/auth-utils')
          const response = await authenticatedFetch(`/api/competitors/${competitorId}`, {
            method: 'DELETE',
          })

          if (response.ok) {
            set((state) => ({
              competitors: state.competitors.filter((c) => c.id !== competitorId)
            }))
            return true
          }
          return false
        } catch (error) {
          console.error('Error removing competitor:', error)
          return false
        }
      },
      setInsights: (insights) => set({ insights }),
      setSwotAnalysis: (swot) => set({ swotAnalysis: swot }),
      setLoadingCompetitors: (loading) => set({ isLoadingCompetitors: loading }),
      setLoadingInsights: (loading) => set({ isLoadingInsights: loading }),
      fetchCompetitors: async () => {
        set({ isLoadingCompetitors: true })
        try {
          const { authenticatedFetch } = await import('@/lib/auth-utils')
          const response = await authenticatedFetch('/api/competitors', {
            method: 'GET',
          })

          if (response.ok) {
            const result = await response.json()
            set({ competitors: result.data || [] })
          }
        } catch (error) {
          console.error('Error fetching competitors:', error)
        } finally {
          set({ isLoadingCompetitors: false })
        }
      },
      clearAll: () => set({
        company: null,
        competitors: [],
        insights: [],
        swotAnalysis: null,
        isLoadingCompetitors: false,
        isLoadingInsights: false,
      }),
    }),
    {
      name: 'analytics-storage',
      partialize: (state) => ({
        company: state.company,
        // We can choose to persist competitors and insights too if needed
        competitors: state.competitors,
        insights: state.insights,
        swotAnalysis: state.swotAnalysis,
      }),
    }
  )
)
