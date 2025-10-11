/**
 * WebSocket message types for dynamic UI updates
 */

export type MessageType =
  | 'show_competitor_context'
  | 'show_insight'
  | 'show_notification'
  | 'update_competitor_panel'
  | 'show_progress'
  | 'highlight_element'
  | 'show_graph'

// Pricing information for competitor products
export interface CompetitorPricing {
  pricing: string
  pricing_model: string
}

// Distribution channel information
export interface DistributionChannel {
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

// Target audience information
export interface TargetAudience {
  target_audience_description: string
  target_sectors: string[]
  typical_segment_size: 'SMB' | 'Enterprise' | 'Startups'
  key_decision_makers: string[]
}

// Customer sentiment about competitor products
export interface CompetitorProductCustomerSentiment {
  key_themes: string[]
  overall_sentiment: string
  strengths: string[]
  weaknesses: string[]
}

export interface CompetitorProduct {
  product_name?: string
  product_url?: string
  product_description?: string
  // Extended CompetitorAnalysis fields
  pricing?: CompetitorPricing[]
  distribution_channel?: DistributionChannel
  target_audience?: TargetAudience
  customer_sentiment?: CompetitorProductCustomerSentiment
}

export interface CompetitorContextPayload {
  // Core fields (backward compatible)
  company_name: string
  product_name?: string
  website?: string
  description?: string
  category?: 'Direct Competitors' | 'Indirect Competitors' | 'Potential Competitors'

  // Extended CompetitorOverview fields
  website_url?: string
  company_headquarters_location?: string
  number_of_employees?: number
  founding_or_established_date?: string
  mission_statement?: string
  vision_statement?: string
  company_culture_and_values?: string
  additional_office_locations?: string[]
  products?: CompetitorProduct[]
  notes?: string
  sources?: string[]
}

// For multiple competitors displayed in carousel
export interface CompetitorCarouselPayload {
  competitors: CompetitorContextPayload[]
}

export interface InsightPayload {
  title: string
  content: string
  severity?: 'info' | 'success' | 'warning'
  category?: string
}

export interface NotificationPayload {
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

export interface CompetitorData {
  id: string
  name: string
  category: 'Direct Competitors' | 'Indirect Competitors' | 'Potential Competitors'
  website?: string
  description?: string
}

export interface UpdateCompetitorPanelPayload {
  competitors: CompetitorData[]
  category?: 'Direct Competitors' | 'Indirect Competitors' | 'Potential Competitors'
}

export interface ProgressPayload {
  message: string
  percentage?: number
}

export interface HighlightElementPayload {
  element_id: string
  duration?: number
}

export type GraphType = 'bar' | 'line' | 'scatter' | 'radar' | 'pie' | 'doughnut' | 'bubble'

export interface GraphDataPoint {
  x?: number | string
  y?: number | string
  label?: string
}

export interface GraphDataset {
  label: string
  data: (number | GraphDataPoint)[]
  backgroundColor?: string | string[]
  borderColor?: string | string[]
  borderWidth?: number
  pointRadius?: number | number[]
  pointHoverRadius?: number
}

export interface GraphData {
  labels?: string[]
  datasets: GraphDataset[]
}

export interface GraphAxisTitle {
  display?: boolean
  text: string  // Required for charts with axes
}

export interface GraphAxis {
  title?: GraphAxisTitle
  min?: number
  max?: number
}

export interface GraphOptions {
  responsive?: boolean
  maintainAspectRatio?: boolean
  plugins?: {
    legend?: {
      display?: boolean
      position?: 'top' | 'bottom' | 'left' | 'right'
    }
    title?: {
      display?: boolean
      text?: string
    }
    tooltip?: {
      enabled?: boolean
    }
  }
  scales?: {
    x?: GraphAxis
    y?: GraphAxis
  }
}

export interface GraphPayload {
  title: string
  graphType: GraphType
  data: GraphData
  options?: GraphOptions
  category?: string
  description?: string
}

export interface GraphCarouselPayload {
  graphs: GraphPayload[]
}

export type WebSocketMessagePayload =
  | CompetitorContextPayload
  | CompetitorCarouselPayload
  | InsightPayload
  | NotificationPayload
  | UpdateCompetitorPanelPayload
  | ProgressPayload
  | HighlightElementPayload
  | GraphPayload
  | GraphCarouselPayload

export interface WebSocketMessage {
  type: MessageType
  payload: WebSocketMessagePayload
  timestamp: number
}
