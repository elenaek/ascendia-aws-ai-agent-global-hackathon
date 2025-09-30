import { create } from 'zustand'

interface Competitor {
  id: string
  name: string
  category: 'Direct Competitors' | 'Indirect Competitors' | 'Potential Competitors'
  website?: string
  description?: string
}

interface CompanyInfo {
  id: string
  name: string
  website: string
  description?: string
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
  setInsights: (insights: string[]) => void
  setSwotAnalysis: (swot: AnalyticsState['swotAnalysis']) => void
  setLoadingCompetitors: (loading: boolean) => void
  setLoadingInsights: (loading: boolean) => void
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  company: null,
  competitors: [],
  insights: [],
  swotAnalysis: null,
  isLoadingCompetitors: false,
  isLoadingInsights: false,
  setCompany: (company) => set({ company }),
  setCompetitors: (competitors) => set({ competitors }),
  setInsights: (insights) => set({ insights }),
  setSwotAnalysis: (swot) => set({ swotAnalysis: swot }),
  setLoadingCompetitors: (loading) => set({ isLoadingCompetitors: loading }),
  setLoadingInsights: (loading) => set({ isLoadingInsights: loading }),
}))
