import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Competitor {
  id: string
  name: string
  category: 'Direct Competitors' | 'Indirect Competitors' | 'Potential Competitors'
  website?: string
  description?: string
}

interface Product {
  product_name: string
  product_url: string
  product_description: string
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
