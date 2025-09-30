'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { useOnboardingStore } from '@/stores/onboarding-store'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { setCompany } = useAnalyticsStore()
  const { setOnboarded, isOnboarded } = useOnboardingStore()

  const [formData, setFormData] = useState({
    companyName: '',
    companyWebsite: '',
    companyDescription: '',
  })

  // If already onboarded, redirect to dashboard
  useEffect(() => {
    if (isOnboarded) {
      router.push('/dashboard')
    }
    // If not authenticated, redirect to auth
    if (!isAuthenticated) {
      router.push('/auth')
    }
  }, [isOnboarded, isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
        console.log('Starting onboarding completion...')
        console.log('Current user:', user)
        console.log('Form data:', formData)

        // Set company info only (don't update user since they're already authenticated)
        const companyData = {
          id: crypto.randomUUID(),
          name: formData.companyName,
          website: formData.companyWebsite,
          description: formData.companyDescription,
        }

        console.log('Setting company data:', companyData)
        setCompany(companyData)

        // Mark onboarding as complete
        console.log('Marking onboarding as complete...')
        setOnboarded(user?.email || 'User')

        console.log('Onboarding complete, redirecting to dashboard...')
        // Navigate to dashboard
        router.push('/dashboard')
    } catch (error) {
      console.error('Error during onboarding:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary text-glow mb-2">
            Welcome to Ascendia
          </h1>
          <p className="text-muted-foreground">
            Let's get you set up
          </p>
        </div>

        <Card className="p-6 bg-panel border-primary/20 glow">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-foreground">
                Company Name
              </Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Your company name"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                required
                className="bg-background border-primary/30 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyWebsite" className="text-foreground">
                Company Website
              </Label>
              <Input
                id="companyWebsite"
                type="url"
                placeholder="https://example.com"
                value={formData.companyWebsite}
                onChange={(e) =>
                  setFormData({ ...formData, companyWebsite: e.target.value })
                }
                required
                className="bg-background border-primary/30 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyDescription" className="text-foreground">
                Company Description
              </Label>
              <Input
                id="companyDescription"
                type="text"
                placeholder="Brief description of your company"
                value={formData.companyDescription}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    companyDescription: e.target.value,
                  })
                }
                className="bg-background border-primary/30 focus:border-primary"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Complete Setup
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
