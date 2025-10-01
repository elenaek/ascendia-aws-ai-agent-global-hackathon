'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { ChatInterface } from '@/components/dashboard/chat-interface'
import { CompetitorsPanel } from '@/components/dashboard/competitors-panel'
import { InsightsPanel } from '@/components/dashboard/insights-panel'
import { Header } from '@/components/dashboard/header'
import { Vortex } from '@/components/ui/vortex'

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()
  const { company } = useAnalyticsStore()

  useEffect(() => {
    // If not authenticated, redirect to auth
    if (!isLoading && !isAuthenticated) {
      router.push('/auth')
      return
    }

    // If authenticated but no company data cached, redirect to auth to check DDB
    if (!isLoading && isAuthenticated && !company) {
      console.log('No company data cached, redirecting to auth to check DDB')
      router.push('/auth')
    }
  }, [isAuthenticated, isLoading, company, router])


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
      <Vortex
        backgroundColor="black"
        rangeY={800}
        particleCount={100}
      >
        <main className="container mx-auto p-6 space-y-6">
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Chat Interface */}
            <div className="lg:col-span-2">
              <ChatInterface />
            </div>

            {/* Right Column - Analytics Panels */}
            <div className="space-y-6">
              <CompetitorsPanel />
              <InsightsPanel />
            </div>
          </div>
        </main>
      </Vortex>
    </div>
  )
}
