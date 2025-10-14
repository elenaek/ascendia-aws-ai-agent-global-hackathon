/**
 * React hook for managing WebSocket connection for dynamic UI updates
 */

import { useEffect, useRef, useState } from 'react'
import { WebSocketClient } from '@/lib/websocket-client'
import { useUIStore } from '@/stores/ui-store'
import { WebSocketMessage } from '@/types/websocket-messages'
import { toast } from 'sonner'
import type {
  CompetitorContextPayload,
  InsightPayload,
  NotificationPayload,
  UpdateCompetitorPanelPayload,
  ProgressPayload,
  HighlightElementPayload,
  GraphPayload,
} from '@/types/websocket-messages'

interface UseWebSocketUIOptions {
  /** Whether to connect to WebSocket (typically when agent is responding) */
  enabled: boolean
}

export function useWebSocketUI({ enabled }: UseWebSocketUIOptions) {
  const wsClient = useRef<WebSocketClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const {
    addCard,
    addNotification,
    addProgress,
    clearProgress,
    highlightElement,
    showCompetitorCarousel,
    showInsightsCarousel,
    showGraphsCarousel,
  } = useUIStore()

  useEffect(() => {
    // Only connect when enabled (during agent response)
    if (!enabled) {
      // Disconnect if currently connected
      if (wsClient.current) {
        wsClient.current.disconnect()
        wsClient.current = null
        setIsConnected(false)
      }
      return
    }

    // Create WebSocket client if not already created
    if (!wsClient.current) {
      wsClient.current = new WebSocketClient({
        onMessage: (message: WebSocketMessage) => {
          handleWebSocketMessage(message)
        },
        onConnect: () => {
          console.log('WebSocket UI connected')
          setIsConnected(true)
          setError(null)
        },
        onDisconnect: () => {
          console.log('WebSocket UI disconnected')
          setIsConnected(false)
          // Clear progress indicators when disconnected
          clearProgress()
        },
        onError: (err: Error) => {
          console.error('WebSocket UI error:', err)
          setError(err)
        },
      })

      // Connect
      wsClient.current.connect()
    }

    // Cleanup on unmount
    return () => {
      if (wsClient.current) {
        wsClient.current.disconnect()
        wsClient.current = null
      }
    }
  }, [enabled])

  /**
   * Handle incoming WebSocket messages and route to appropriate UI actions
   */
  const handleWebSocketMessage = (message: WebSocketMessage) => {
    try {
      switch (message.type) {
        case 'show_competitor_context': {
          const payload = message.payload as CompetitorContextPayload | { competitors: CompetitorContextPayload[] }

          // Check if payload contains multiple competitors (carousel mode)
          if ('competitors' in payload && Array.isArray(payload.competitors)) {
            showCompetitorCarousel(payload.competitors)
          } else {
            // Single competitor - also use carousel
            showCompetitorCarousel([payload as CompetitorContextPayload])
          }
          break
        }

        case 'show_insight': {
          const payload = message.payload as InsightPayload | { insights: InsightPayload[] }

          // Check if payload contains multiple insights (carousel mode)
          if ('insights' in payload && Array.isArray(payload.insights)) {
            showInsightsCarousel(payload.insights)
          } else {
            // Single insight - also use carousel
            showInsightsCarousel([payload as InsightPayload])
          }
          break
        }

        case 'show_notification': {
          const payload = message.payload as NotificationPayload
          // Use sonner toast for notifications
          switch (payload.type) {
            case 'success':
              toast.success(payload.message)
              break
            case 'error':
              toast.error(payload.message)
              break
            case 'warning':
              toast.warning(payload.message)
              break
            case 'info':
            default:
              toast.info(payload.message)
              break
          }
          // Also store in notifications array for custom display if needed
          addNotification(payload)
          break
        }

        case 'update_competitor_panel': {
          const payload = message.payload as UpdateCompetitorPanelPayload
          // This would trigger a refresh of the competitors panel
          // For now, we'll show a notification
          toast.info(`Updated ${payload.competitors.length} competitors`)
          // TODO: Implement competitor panel refresh
          break
        }

        case 'show_progress': {
          const payload = message.payload as ProgressPayload
          addProgress(payload)
          break
        }

        case 'highlight_element': {
          const payload = message.payload as HighlightElementPayload
          highlightElement(payload.element_id, 5000)
          break
        }

        case 'show_graph': {
          const payload = message.payload as GraphPayload | { graphs: GraphPayload[] }

          // Check if payload contains multiple graphs (carousel mode)
          if ('graphs' in payload && Array.isArray(payload.graphs)) {
            showGraphsCarousel(payload.graphs)
          } else {
            // Single graph - also use carousel
            showGraphsCarousel([payload as GraphPayload])
          }
          break
        }

        default:
          console.warn('Unknown WebSocket message type:', message)
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error)
    }
  }

  return {
    isConnected,
    error,
  }
}
