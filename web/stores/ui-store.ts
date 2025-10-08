import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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

  // Competitor carousel state
  competitorCarousel: {
    visible: boolean
    minimized: boolean
    competitors: CompetitorContextPayload[]
    currentIndex: number
  }

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

  // Carousel actions
  showCompetitorCarousel: (competitors: CompetitorContextPayload[]) => void
  hideCompetitorCarousel: () => void
  minimizeCompetitorCarousel: () => void
  expandCompetitorCarousel: () => void
  nextCompetitor: () => void
  prevCompetitor: () => void
  removeCompetitorFromCarousel: (index: number) => void

  // Clear all persisted agent updates
  clearAllAgentUpdates: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
  activeCards: [],
  notifications: [],
  progressIndicators: [],
  highlightedElements: new Set(),
  competitorCarousel: {
    visible: false,
    minimized: false,
    competitors: [],
    currentIndex: 0,
  },

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

  showCompetitorCarousel: (competitors) =>
    set((state) => {
      // If carousel is already visible, append new competitors (avoiding duplicates by company_name)
      if (state.competitorCarousel.visible) {
        const existingCompetitors = state.competitorCarousel.competitors
        const existingNames = new Set(
          existingCompetitors.map((c) => c.company_name.toLowerCase())
        )

        // Only add competitors that don't already exist
        const newCompetitors = competitors.filter(
          (c) => !existingNames.has(c.company_name.toLowerCase())
        )

        return {
          competitorCarousel: {
            ...state.competitorCarousel,
            competitors: [...existingCompetitors, ...newCompetitors],
          },
        }
      }

      // If carousel is not visible, show it with the new competitors
      return {
        competitorCarousel: {
          visible: true,
          minimized: false,
          competitors,
          currentIndex: 0,
        },
      }
    }),

  hideCompetitorCarousel: () =>
    set({
      competitorCarousel: {
        visible: false,
        minimized: false,
        competitors: [],
        currentIndex: 0,
      },
    }),

  minimizeCompetitorCarousel: () =>
    set((state) => ({
      competitorCarousel: {
        ...state.competitorCarousel,
        minimized: true,
      },
    })),

  expandCompetitorCarousel: () =>
    set((state) => ({
      competitorCarousel: {
        ...state.competitorCarousel,
        minimized: false,
      },
    })),

  nextCompetitor: () =>
    set((state) => {
      const { competitors, currentIndex } = state.competitorCarousel
      const nextIndex = currentIndex + 1 >= competitors.length ? 0 : currentIndex + 1
      return {
        competitorCarousel: {
          ...state.competitorCarousel,
          currentIndex: nextIndex,
        },
      }
    }),

  prevCompetitor: () =>
    set((state) => {
      const { competitors, currentIndex } = state.competitorCarousel
      const prevIndex = currentIndex - 1 < 0 ? competitors.length - 1 : currentIndex - 1
      return {
        competitorCarousel: {
          ...state.competitorCarousel,
          currentIndex: prevIndex,
        },
      }
    }),

  removeCompetitorFromCarousel: (index) =>
    set((state) => {
      const { competitors, currentIndex } = state.competitorCarousel
      const newCompetitors = competitors.filter((_, i) => i !== index)

      // If no more competitors, hide the carousel
      if (newCompetitors.length === 0) {
        return {
          competitorCarousel: {
            visible: false,
            minimized: false,
            competitors: [],
            currentIndex: 0,
          },
        }
      }

      // Adjust currentIndex if needed
      let newCurrentIndex = currentIndex
      if (index < currentIndex) {
        // Removed item was before current, shift index down
        newCurrentIndex = currentIndex - 1
      } else if (index === currentIndex) {
        // Removed item was current, stay at same index (or go to previous if at end)
        newCurrentIndex = currentIndex >= newCompetitors.length ? newCompetitors.length - 1 : currentIndex
      }

      return {
        competitorCarousel: {
          ...state.competitorCarousel,
          competitors: newCompetitors,
          currentIndex: newCurrentIndex,
        },
      }
    }),

  clearAllAgentUpdates: () =>
    set({
      competitorCarousel: {
        visible: false,
        minimized: false,
        competitors: [],
        currentIndex: 0,
      },
    }),
    }),
    {
      name: 'agent-updates-storage',
      partialize: (state) => ({
        competitorCarousel: state.competitorCarousel,
      }),
    }
  )
)
