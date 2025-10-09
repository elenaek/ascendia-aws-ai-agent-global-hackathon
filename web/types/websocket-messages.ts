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

export interface CompetitorContextPayload {
  company_name: string
  product_name: string
  website?: string
  description?: string
  category?: 'Direct Competitors' | 'Indirect Competitors' | 'Potential Competitors'
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
