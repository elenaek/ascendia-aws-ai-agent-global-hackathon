'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { useChatStore } from '@/stores/chat-store'
import { useUIStore } from '@/stores/ui-store'
import { ChatInterface } from '@/components/dashboard/chat-interface'
import { CompetitorsPanel } from '@/components/dashboard/competitors-panel'
import { InsightsPanel } from '@/components/dashboard/insights-panel'
import { Header } from '@/components/dashboard/header'
import { AgentToolbar } from '@/components/dashboard/agent-toolbar'
import { Vortex } from '@/components/ui/vortex'
import { DynamicUIOverlay } from '@/components/dashboard/dynamic-ui-overlay'
import { useWebSocketUI } from '@/hooks/useWebSocketUI'

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()
  const { company, fetchCompetitors } = useAnalyticsStore()
  const { isLoading: isChatLoading } = useChatStore()
  const { competitorCarousel } = useUIStore()

  // Connect to WebSocket when agent is responding
  useWebSocketUI({ enabled: isChatLoading })

  useEffect(() => {
    // If not authenticated, redirect to auth
    if (!isLoading && !isAuthenticated) {
      router.push('/auth')
      return
    }

    // If authenticated but no company data cached, redirect to auth to check DDB
    if (!isLoading && isAuthenticated && !company) {
      // console.log('No company data cached, redirecting to auth to check DDB')
      router.push('/auth')
    }
  }, [isAuthenticated, isLoading, company, router])

  // Fetch competitors on mount when authenticated
  useEffect(() => {
    if (isAuthenticated && company) {
      fetchCompetitors()
    }
  }, [isAuthenticated, company, fetchCompetitors])


  if (!isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-primary text-glow animate-pulse">Redirecting...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AgentToolbar />
      <Vortex
        backgroundColor="black"
        rangeY={400}
        particleCount={50}
        baseHue={190}
        baseSpeed={0.1}
        rangeSpeed={0.8}
        baseRadius={0.8}
        rangeRadius={1.5}
        paused={competitorCarousel.visible && !competitorCarousel.minimized}
      >
        <main className="container mx-auto p-6 space-y-6">
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-1">
            {/* Left Column - Chat Interface */}
            <div className="lg:col-span-2">
              <ChatInterface />
            </div>

            {/* Right Column - Analytics Panels */}
            <div className="space-y-2">
              <CompetitorsPanel />
              <InsightsPanel />
            </div>
          </div>
        </main>
      </Vortex>

      {/* Dynamic UI Overlay - Cards and Progress */}
      <DynamicUIOverlay />
    </div>
  )
}
