'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Sparkles, Zap, TrendingUp } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Redirect authenticated users to onboarding first
      router.push('/onboarding')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-primary text-glow animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo and Title */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-bold text-primary text-glow animate-glow-pulse">
              Ascendia
            </h1>
            <p className="text-2xl md:text-3xl text-foreground">
              AI-Powered Business Intelligence
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Unlock competitive insights, analyze market trends, and make
              data-driven decisions with the power of AI.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => router.push('/auth')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 glow"
            >
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/auth')}
              className="border-primary/30 hover:bg-primary/10 text-lg px-8"
            >
              Sign In
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-6 mt-20">
            <div className="p-6 bg-panel border border-primary/20 rounded-lg glow">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                AI Analysis
              </h3>
              <p className="text-muted-foreground">
                Leverage advanced AI to analyze competitors and market trends in
                real-time.
              </p>
            </div>

            <div className="p-6 bg-panel border border-primary/20 rounded-lg glow">
              <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Market Insights
              </h3>
              <p className="text-muted-foreground">
                Get actionable insights about your market position and growth
                opportunities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
