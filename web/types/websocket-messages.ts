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

export type WebSocketMessagePayload =
  | CompetitorContextPayload
  | CompetitorCarouselPayload
  | InsightPayload
  | NotificationPayload
  | UpdateCompetitorPanelPayload
  | ProgressPayload
  | HighlightElementPayload

export interface WebSocketMessage {
  type: MessageType
  payload: WebSocketMessagePayload
  timestamp: number
}
