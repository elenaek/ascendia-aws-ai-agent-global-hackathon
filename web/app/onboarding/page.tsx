'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useAnalyticsStore } from '@/stores/analytics-store'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { setCompany, company } = useAnalyticsStore()

  const [formData, setFormData] = useState({
    company_name: '',
    company_url: '',
    company_description: '',
    unique_value_proposition: '',
    stage_of_company: 'startup',
    types_of_products: [{
      product_name: '',
      product_url: '',
      product_description: ''
    }]
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check authentication and existing company data
  useEffect(() => {
    // If not authenticated, redirect to auth
    if (!isAuthenticated) {
      router.push('/auth')
      return
    }

    // If company already exists in cache, redirect to dashboard
    if (company) {
      router.push('/dashboard')
      return
    }
  }, [isAuthenticated, company, router])

  const addProduct = () => {
    setFormData({
      ...formData,
      types_of_products: [
        ...formData.types_of_products,
        {
          product_name: '',
          product_url: '',
          product_description: ''
        }
      ]
    })
  }

  const removeProduct = (index: number) => {
    setFormData({
      ...formData,
      types_of_products: formData.types_of_products.filter((_, i) => i !== index)
    })
  }

  const updateProduct = (index: number, field: string, value: string) => {
    const updatedProducts = [...formData.types_of_products]
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value
    }
    setFormData({
      ...formData,
      types_of_products: updatedProducts
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent multiple submissions
    if (isSubmitting) return

    try {
        setIsSubmitting(true)
        // console.log('Starting onboarding completion...')
        // console.log('Current user:', user)
        // console.log('Form data:', formData)

        if (!user?.id) {
          console.error('No user ID found')
          setIsSubmitting(false)
          return
        }

        // Save to DynamoDB via API
        // console.log('Saving company data to database...')
        const { authenticatedFetch } = await import('@/lib/auth-utils')

        const response = await authenticatedFetch('/api/company', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          throw new Error('Failed to save company data')
        }

        const result = await response.json()
        // console.log('Company data saved:', result)

        // Set company info in local state
        const companyData = {
          id: result.data.company_id, // Use the identity ID from the response
          ...formData
        }

        // console.log('Setting company data in cache:', companyData)
        setCompany(companyData)

        // console.log('Onboarding complete, redirecting to dashboard...')
        // Navigate to dashboard
        router.push('/dashboard')
    } catch (error) {
      console.error('Error during onboarding:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary text-glow mb-2">
            Welcome to Ascendia
          </h1>
          <p className="text-muted-foreground">
            Tell us about your company to get started
          </p>
        </div>

        <Card className="p-8 bg-panel border-primary/20 glow">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Basic Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="company_name" className="text-foreground">
                  Company Name *
                </Label>
                <Input
                  id="company_name"
                  type="text"
                  placeholder="Your company name"
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  required
                  className="bg-background border-primary/30 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_url" className="text-foreground">
                  Company Website *
                </Label>
                <Input
                  id="company_url"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.company_url}
                  onChange={(e) =>
                    setFormData({ ...formData, company_url: e.target.value })
                  }
                  required
                  className="bg-background border-primary/30 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_description" className="text-foreground">
                Company Description *
              </Label>
              <Textarea
                id="company_description"
                placeholder="Describe what your company does..."
                value={formData.company_description}
                onChange={(e) =>
                  setFormData({ ...formData, company_description: e.target.value })
                }
                required
                className="bg-background border-primary/30 focus:border-primary min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unique_value_proposition" className="text-foreground">
                Unique Value Proposition *
              </Label>
              <Textarea
                id="unique_value_proposition"
                placeholder="What makes your company unique? What problem do you solve better than others?"
                value={formData.unique_value_proposition}
                onChange={(e) =>
                  setFormData({ ...formData, unique_value_proposition: e.target.value })
                }
                required
                className="bg-background border-primary/30 focus:border-primary min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage_of_company" className="text-foreground">
                Company Stage *
              </Label>
              <Select
                value={formData.stage_of_company}
                onValueChange={(value) =>
                  setFormData({ ...formData, stage_of_company: value })
                }
              >
                <SelectTrigger className="bg-background border-primary/30 focus:border-primary">
                  <SelectValue placeholder="Select your company stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idea Stage</SelectItem>
                  <SelectItem value="startup">Startup</SelectItem>
                  <SelectItem value="growth">Growth Stage</SelectItem>
                  <SelectItem value="expansion">Expansion</SelectItem>
                  <SelectItem value="mature">Mature</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Products Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-foreground text-lg">
                  Products & Services *
                </Label>
                <Button
                  type="button"
                  onClick={addProduct}
                  variant="outline"
                  size="sm"
                  className="border-primary/30 hover:bg-primary/10"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Product
                </Button>
              </div>

              <div className="space-y-4">
                {formData.types_of_products.map((product, index) => (
                  <Card key={index} className="p-4 bg-background/50 border-primary/20">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-foreground">
                          Product {index + 1}
                        </h4>
                        {formData.types_of_products.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeProduct(index)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Product Name *
                          </Label>
                          <Input
                            type="text"
                            placeholder="e.g., AI Analytics Platform"
                            value={product.product_name}
                            onChange={(e) =>
                              updateProduct(index, 'product_name', e.target.value)
                            }
                            required
                            className="bg-background border-primary/30 focus:border-primary"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Product URL
                          </Label>
                          <Input
                            type="url"
                            placeholder="https://product-page.com"
                            value={product.product_url}
                            onChange={(e) =>
                              updateProduct(index, 'product_url', e.target.value)
                            }
                            className="bg-background border-primary/30 focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Product Description *
                        </Label>
                        <Textarea
                          placeholder="Describe this product or service..."
                          value={product.product_description}
                          onChange={(e) =>
                            updateProduct(index, 'product_description', e.target.value)
                          }
                          required
                          className="bg-background border-primary/30 focus:border-primary min-h-[60px]"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up your company...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
