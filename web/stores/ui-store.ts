import { create } from 'zustand'
import {
  CompetitorContextPayload,
  InsightPayload,
  NotificationPayload,
  ProgressPayload,
} from '@/types/websocket-messages'

export interface DynamicCard {
  id: string
  type: 'competitor_context' | 'insight'
  data: CompetitorContextPayload | InsightPayload
  timestamp: number
}

export interface NotificationItem extends NotificationPayload {
  id: string
  timestamp: number
}

export interface ProgressItem extends ProgressPayload {
  id: string
  timestamp: number
}

interface UIState {
  // Dynamic cards displayed on the dashboard
  activeCards: DynamicCard[]

  // Notifications (toasts)
  notifications: NotificationItem[]

  // Progress indicators
  progressIndicators: ProgressItem[]

  // Highlighted elements
  highlightedElements: Set<string>

  // Actions
  addCard: (type: 'competitor_context' | 'insight', data: CompetitorContextPayload | InsightPayload) => void
  removeCard: (id: string) => void
  clearCards: () => void

  addNotification: (notification: NotificationPayload) => void
  removeNotification: (id: string) => void

  addProgress: (progress: ProgressPayload) => void
  removeProgress: (id: string) => void
  clearProgress: () => void

  highlightElement: (elementId: string, duration?: number) => void
  unhighlightElement: (elementId: string) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  activeCards: [],
  notifications: [],
  progressIndicators: [],
  highlightedElements: new Set(),

  addCard: (type, data) => {
    const id = crypto.randomUUID()
    const card: DynamicCard = {
      id,
      type,
      data,
      timestamp: Date.now(),
    }

    set((state) => ({
      activeCards: [...state.activeCards, card],
    }))

    // Auto-remove card after 30 seconds
    setTimeout(() => {
      get().removeCard(id)
    }, 30000)
  },

  removeCard: (id) =>
    set((state) => ({
      activeCards: state.activeCards.filter((card) => card.id !== id),
    })),

  clearCards: () => set({ activeCards: [] }),

  addNotification: (notification) => {
    const id = crypto.randomUUID()
    const item: NotificationItem = {
      ...notification,
      id,
      timestamp: Date.now(),
    }

    set((state) => ({
      notifications: [...state.notifications, item],
    }))

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      get().removeNotification(id)
    }, 5000)
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  addProgress: (progress) => {
    const id = crypto.randomUUID()
    const item: ProgressItem = {
      ...progress,
      id,
      timestamp: Date.now(),
    }

    set((state) => ({
      progressIndicators: [...state.progressIndicators, item],
    }))
  },

  removeProgress: (id) =>
    set((state) => ({
      progressIndicators: state.progressIndicators.filter((p) => p.id !== id),
    })),

  clearProgress: () => set({ progressIndicators: [] }),

  highlightElement: (elementId, duration = 2000) => {
    set((state) => ({
      highlightedElements: new Set(state.highlightedElements).add(elementId),
    }))

    // Auto-remove highlight after duration
    setTimeout(() => {
      get().unhighlightElement(elementId)
    }, duration)
  },

  unhighlightElement: (elementId) =>
    set((state) => {
      const newSet = new Set(state.highlightedElements)
      newSet.delete(elementId)
      return { highlightedElements: newSet }
    }),
}))
